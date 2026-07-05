import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import CircuitBreaker from 'opossum';

/**
 * 게이트웨이 안전장치: 다운스트림 호출을 타임아웃·재시도·서킷브레이커로 감싼다.
 *  - 타임아웃: 매달린(hung) 서비스가 게이트웨이 자원을 물지 않도록 1회 호출 상한.
 *  - 재시도: 네트워크 오류·타임아웃·502/503/504 같은 일시 오류만 백오프+지터로 제한 재시도.
 *  - 서킷브레이커: 특정 서비스가 계속 실패하면 회로를 열어 즉시 fallback → 연쇄 장애 차단.
 *    target(다운스트림 베이스 URL)별로 회로를 분리해, 죽은 서비스 하나만 열리게 한다.
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

export interface UpstreamResult {
  status: number;
  data: unknown;
}

@Injectable()
export class UpstreamService {
  private readonly logger = new Logger(UpstreamService.name);
  private readonly breakers = new Map<
    string,
    CircuitBreaker<[AxiosRequestConfig], UpstreamResult>
  >();

  constructor(private readonly http: HttpService) {}

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
        });
        if (RETRYABLE_STATUS.has(res.status)) {
          if (attempt < MAX_RETRIES) {
            await this.backoff(attempt);
            continue;
          }
          throw new Error(`upstream ${res.status}`);
        }
        return { status: res.status, data: res.data };
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
