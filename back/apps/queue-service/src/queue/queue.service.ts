import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { readFileSync } from 'fs';
import { join } from 'path';
import { REDIS } from '@app/redis';
import { EnvironmentVariables } from '@app/config';
import { QueueStatusDto } from './dto';

/**
 * 전략①: Redis 기반 가상 대기열 (정원 기반 입장).
 *  - waiting: ZSET(score=seq) → FIFO. rank/total 조회.
 *  - active : ZSET(score=슬롯 만료 ms) → 부킹존. 정원(capacity)만큼만 유지.
 *  - 입장 펌프(admit.lua): 만료 슬롯 회수 + 여유만큼 앞에서 입장(원자적, 정원 초과 방지).
 *  - ETA = rank ÷ 처리율, 처리율 = capacity / slotTtl (Little's law).
 */
@Injectable()
export class QueueService implements OnModuleInit {
  private admitSha = '';
  private readonly admitScript = readFileSync(join(__dirname, 'lua', 'admit.lua'), 'utf8');
  private readonly registryKey = 'queues:active';

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onModuleInit() {
    this.admitSha = (await this.redis.script('LOAD', this.admitScript)) as string;
  }

  private waitingKey = (c: string) => `queue:${c}:waiting`;
  private activeKey = (c: string) => `queue:${c}:active`;
  private seqKey = (c: string) => `queue:${c}:seq`;

  private get capacity() {
    return this.config.get('QUEUE_ACTIVE_CAPACITY', { infer: true });
  }
  private get batch() {
    return this.config.get('QUEUE_ADMIT_BATCH', { infer: true });
  }
  private get slotTtlSec() {
    return this.config.get('QUEUE_SLOT_TTL_SEC', { infer: true });
  }

  /** 대기열 등록(멱등). 정원 여유 시 즉시 입장까지 시도 후 상태 반환. */
  async enter(concertId: string, userId: string): Promise<QueueStatusDto> {
    const inActive = await this.redis.zscore(this.activeKey(concertId), userId);
    const inWaiting = await this.redis.zscore(this.waitingKey(concertId), userId);
    if (!inActive && !inWaiting) {
      const seq = await this.redis.incr(this.seqKey(concertId));
      await this.redis.zadd(this.waitingKey(concertId), 'NX', seq, userId);
      await this.redis.sadd(this.registryKey, concertId);
    }
    await this.pump(concertId);
    return this.status(concertId, userId);
  }

  /** 현재 상태. READY면 입장 토큰(JWT) 발급. */
  async status(concertId: string, userId: string): Promise<QueueStatusDto> {
    const now = Date.now();
    const activeScore = await this.redis.zscore(this.activeKey(concertId), userId);
    if (activeScore && Number(activeScore) > now) {
      const expiresAt = Number(activeScore);
      const remainingSec = Math.max(1, Math.ceil((expiresAt - now) / 1000));
      const entryToken = await this.jwt.signAsync(
        { concertId, userId, scope: 'entry' },
        { expiresIn: remainingSec },
      );
      return {
        status: 'READY',
        rank: 0,
        total: await this.redis.zcard(this.waitingKey(concertId)),
        etaSeconds: 0,
        entryToken,
        expiresAt: new Date(expiresAt).toISOString(),
      };
    }

    const rank = await this.redis.zrank(this.waitingKey(concertId), userId);
    if (rank === null) return { status: 'EXPIRED', rank: 0, total: 0, etaSeconds: 0 };

    const total = await this.redis.zcard(this.waitingKey(concertId));
    const ratePerSec = this.capacity / this.slotTtlSec; // 슬롯 순환 처리율
    return { status: 'WAITING', rank, total, etaSeconds: Math.ceil(rank / ratePerSec) };
  }

  /** 대기 포기: 대기열/활성에서 제거. */
  async leave(concertId: string, userId: string) {
    await this.redis.zrem(this.waitingKey(concertId), userId);
    await this.redis.zrem(this.activeKey(concertId), userId);
    return { ok: true };
  }

  /** 입장 펌프(원자적). 반환: 이번에 입장한 수. */
  async pump(concertId: string): Promise<number> {
    const args = [
      String(Date.now()),
      String(this.capacity),
      String(this.slotTtlSec * 1000),
      String(this.batch),
    ];
    try {
      const n = await this.redis.evalsha(
        this.admitSha,
        2,
        this.waitingKey(concertId),
        this.activeKey(concertId),
        ...args,
      );
      return Number(n);
    } catch (e) {
      // Redis 재시작 등으로 스크립트 캐시 유실 시 재로딩 후 1회 재시도
      if (String(e).includes('NOSCRIPT')) {
        this.admitSha = (await this.redis.script('LOAD', this.admitScript)) as string;
        const n = await this.redis.evalsha(
          this.admitSha,
          2,
          this.waitingKey(concertId),
          this.activeKey(concertId),
          ...args,
        );
        return Number(n);
      }
      throw e;
    }
  }

  /** 워커가 주기 호출: 등록된 모든 큐 펌프 + 빈 큐 정리. */
  async pumpAll() {
    const ids = await this.redis.smembers(this.registryKey);
    for (const id of ids) {
      await this.pump(id);
      const waiting = await this.redis.zcard(this.waitingKey(id));
      const active = await this.redis.zcard(this.activeKey(id));
      if (waiting === 0 && active === 0) await this.redis.srem(this.registryKey, id);
    }
  }
}
