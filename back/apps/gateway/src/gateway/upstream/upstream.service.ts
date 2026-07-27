import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Agent } from 'node:http';
import CircuitBreaker from 'opossum';

/**
 * 게이트웨이 안전장치: 다운스트림 호출을 타임아웃·재시도·서킷브레이커로 감싼다.
 *  - 타임아웃: 매달린(hung) 서비스가 게이트웨이 자원을 물지 않도록 1회 호출 상한.
 *  - 재시도: 네트워크 오류·타임아웃·502/503/504 같은 일시 오류만 백오프+지터로 제한 재시도.
 *  - 서킷브레이커: 특정 서비스가 계속 실패하면 회로를 열어 즉시 fallback → 연쇄 장애 차단.
 *    target(다운스트림 베이스 URL)별로 회로를 분리해, 죽은 서비스 하나만 열리게 한다.
 *  - 커넥션 풀 회전: 아래 참고. 스케일아웃한 파드가 실제로 트래픽을 받게 한다.
 */

// 튜너블 기본값 (필요하면 env로 승격 가능)
const TIMEOUT_MS = 2000; // 다운스트림 1회 호출 상한
const MAX_RETRIES = 2; // 일시 오류 재시도 횟수 (총 시도 = 1 + MAX_RETRIES)
const RETRY_BASE_MS = 100; // 백오프 기준 (지수 + 지터)
const CB_ERROR_THRESHOLD = 50; // 실패율(%)이 이 값을 넘으면 회로 open
const CB_RESET_MS = 10_000; // open 유지 후 half-open으로 재시도까지
const CB_VOLUME_THRESHOLD = 5; // 표본이 이만큼 쌓여야 실패율 판정
const CB_ROLLING_MS = 10_000; // 실패율 집계 롤링 윈도우

const RETRYABLE_STATUS = new Set([502, 503, 504]);

/**
 * 커넥션 풀 회전 주기.
 *
 * 왜 필요한가 — k8s Service(ClusterIP)는 L4다. kube-proxy는 **TCP 커넥션을 맺는 순간 한 번**
 * 백엔드 파드를 고르고, 그 커넥션의 모든 요청은 끝까지 같은 파드로 간다. HTTP keep-alive는
 * 커넥션을 재사용하는 게 목적이고 Node 19+는 기본이 `keepAlive: true`다. 둘이 겹치면
 * **다운스트림을 스케일아웃해도 새 파드는 트래픽을 못 받는다** — 새 커넥션이 생기지 않으니까.
 * 실측: queue-service를 3→6으로 늘려도 기존 3개만 CPU 1.0을 태우고 신규 3개는 0.005였다.
 * (커넥션을 다시 맺게 하자 6개로 고르게 퍼지며 처리량 1,461 → 2,055 rps, +41%)
 *
 * 그래서 커넥션에 수명을 준다. keep-alive의 이득(핸드셰이크 제거)은 유지하면서,
 * 주기적으로 풀을 새로 맺어 그때마다 kube-proxy가 현재 파드 집합으로 재분배하게 한다.
 * 트레이드오프: 재분배까지 최대 이 주기만큼 걸린다.
 *
 * 정석은 L7 로드밸런싱(서비스 메시·Envoy)으로 요청 단위 분배를 하는 것이고,
 * 이건 의존성 없이 같은 문제를 덮는 실용적 대안이다.
 */
const AGENT_TTL_MS = Number(process.env.UPSTREAM_AGENT_TTL_MS ?? 30_000);
/** 교체된 옛 에이전트가 진행 중 요청을 끝낼 유예. 이 뒤에 소켓을 닫는다. */
const AGENT_DRAIN_MS = Number(process.env.UPSTREAM_AGENT_DRAIN_MS ?? 10_000);

export interface UpstreamResult {
  status: number;
  data: unknown;
  headers?: Record<string, unknown>;
}

@Injectable()
export class UpstreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UpstreamService.name);
  private readonly breakers = new Map<
    string,
    CircuitBreaker<[AxiosRequestConfig], UpstreamResult>
  >();

  /** 현재 요청이 쓰는 에이전트. 회전 시 통째로 교체된다. */
  private agent = UpstreamService.createAgent();
  private rotateTimer?: NodeJS.Timeout;

  constructor(private readonly http: HttpService) {}

  onModuleInit(): void {
    this.rotateTimer = setInterval(() => this.rotateAgent(), AGENT_TTL_MS);
    this.rotateTimer.unref(); // 이 타이머가 프로세스 종료를 막지 않게
  }

  onModuleDestroy(): void {
    if (this.rotateTimer) clearInterval(this.rotateTimer);
    this.agent.destroy();
  }

  private static createAgent(): Agent {
    return new Agent({
      keepAlive: true,
      // 기본값 'lifo'는 최근 쓴 소켓을 먼저 재사용해 소수 소켓(=소수 파드)에 쏠린다.
      // 'fifo'는 풀 전체를 돌려 쓰므로 백엔드 파드에도 고르게 퍼진다.
      scheduling: 'fifo',
    });
  }

  /**
   * 새 에이전트로 교체하고, 옛 에이전트는 유예 뒤에 정리한다.
   * `agent.destroy()`를 바로 부르면 **사용 중인 소켓까지 끊어** 진행 중 요청이 실패하므로,
   * 신규 요청만 새 풀로 보내고 옛 풀은 자연히 비워지게 둔다.
   */
  private rotateAgent(): void {
    const previous = this.agent;
    this.agent = UpstreamService.createAgent();
    setTimeout(() => previous.destroy(), AGENT_DRAIN_MS).unref();
  }

  /** target별 서킷을 lazily 생성·캐시. */
  private breakerFor(target: string): CircuitBreaker<[AxiosRequestConfig], UpstreamResult> {
    const existing = this.breakers.get(target);
    if (existing) return existing;

    const breaker = new CircuitBreaker<[AxiosRequestConfig], UpstreamResult>(
      (cfg) => this.callWithRetry(cfg),
      {
        // 재시도까지 포함한 전체 상한 (opossum 자체 타임아웃은 안전망)
        timeout: TIMEOUT_MS * (MAX_RETRIES + 1) + 1000,
        errorThresholdPercentage: CB_ERROR_THRESHOLD,
        resetTimeout: CB_RESET_MS,
        volumeThreshold: CB_VOLUME_THRESHOLD,
        rollingCountTimeout: CB_ROLLING_MS,
        name: target,
      },
    );

    // 회로가 열렸거나 액션이 실패하면 503으로 즉시 응답 (게이트웨이는 안 죽는다).
    breaker.fallback((_cfg: AxiosRequestConfig, err?: Error): UpstreamResult => ({
      status: 503,
      data: { message: 'upstream unavailable', target, reason: err?.message ?? 'circuit open' },
    }));
    breaker.on('open', () => this.logger.warn(`circuit OPEN → ${target}`));
    breaker.on('halfOpen', () => this.logger.log(`circuit half-open → ${target}`));
    breaker.on('close', () => this.logger.log(`circuit CLOSE → ${target}`));

    this.breakers.set(target, breaker);
    return breaker;
  }

  /** 컨트롤러 진입점. 항상 UpstreamResult로 resolve (fallback 덕분에 throw 안 함). */
  forward(target: string, cfg: AxiosRequestConfig): Promise<UpstreamResult> {
    return this.breakerFor(target).fire(cfg);
  }

  /**
   * 일시 오류만 제한 재시도.
   *  - 정상 응답(2xx/3xx/4xx/일반 5xx)은 그대로 반환 → 서킷 성공으로 집계.
   *  - 재시도 대상(네트워크 오류·타임아웃·502/503/504)은 소진 후 throw → 서킷 실패로 집계 + fallback.
   */
  private async callWithRetry(cfg: AxiosRequestConfig): Promise<UpstreamResult> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res: AxiosResponse = await this.http.axiosRef.request({
          ...cfg,
          timeout: TIMEOUT_MS,
          validateStatus: () => true,
          // 전역 agent 대신 회전하는 풀을 쓴다(위 AGENT_TTL_MS 설명 참고).
          // 다운스트림은 전부 클러스터 내부 http라 httpAgent만 지정한다.
          httpAgent: this.agent,
        });
        if (RETRYABLE_STATUS.has(res.status)) {
          if (attempt < MAX_RETRIES) {
            await this.backoff(attempt);
            continue;
          }
          throw new Error(`upstream ${res.status}`);
        }
        return {
          status: res.status,
          data: res.data,
          headers: res.headers as unknown as Record<string, unknown>,
        };
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          await this.backoff(attempt);
          continue;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('upstream request failed');
  }

  /** 지수 백오프 + 지터 (재시도 폭주로 다운스트림 더 죽이는 것 방지). */
  private backoff(attempt: number): Promise<void> {
    const delay = RETRY_BASE_MS * 2 ** attempt + Math.random() * RETRY_BASE_MS;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
