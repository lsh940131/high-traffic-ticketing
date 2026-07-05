import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS } from '@app/redis';
import { EnvironmentVariables } from '@app/config';

/** 전략①: Redis Sorted Set 기반 가상 대기열. */
@Injectable()
export class QueueService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  private waitingKey = (e: string) => `queue:${e}:waiting`;
  private activeKey = (e: string) => `queue:${e}:active`;

  async enter(eventId: string, userId: string) {
    const key = this.waitingKey(eventId);
    if (!(await this.redis.zscore(key, userId)))
      await this.redis.zadd(key, 'NX', Date.now(), userId);
    return this.status(eventId, userId);
  }

  async status(eventId: string, userId: string) {
    if (await this.redis.sismember(this.activeKey(eventId), userId)) {
      const entryToken = await this.jwt.signAsync(
        { eventId, userId, scope: 'entry' },
        { expiresIn: '10m' },
      );
      return { status: 'READY' as const, rank: 0, total: 0, etaSeconds: 0, entryToken };
    }
    const rank = (await this.redis.zrank(this.waitingKey(eventId), userId)) ?? 0;
    const total = await this.redis.zcard(this.waitingKey(eventId));
    const perSec = this.config.get('QUEUE_ADMIT_BATCH', { infer: true }) / 5;
    return { status: 'WAITING' as const, rank, total, etaSeconds: Math.ceil(rank / perSec) };
  }

  async admitBatch(eventId: string) {
    const capacity = this.config.get('QUEUE_ACTIVE_CAPACITY', { infer: true });
    const batch = this.config.get('QUEUE_ADMIT_BATCH', { infer: true });
    const room = Math.max(0, capacity - (await this.redis.scard(this.activeKey(eventId))));
    const n = Math.min(room, batch);
    if (n === 0) return 0;
    const popped = await this.redis.zpopmin(this.waitingKey(eventId), n);
    const ids = popped.filter((_, i) => i % 2 === 0);
    if (ids.length) await this.redis.sadd(this.activeKey(eventId), ...ids);
    return ids.length;
  }
}
