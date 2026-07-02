import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { readFileSync } from 'fs';
import { join } from 'path';
import { REDIS } from '@app/redis';
import { EnvironmentVariables } from '@app/config';

export type HoldResult = 'OK' | 'SOLD_OUT' | 'ALREADY_TAKEN';

/** 전략②: Lua 원자 연산으로 재고 차감 → 오버셀 방지. */
@Injectable()
export class InventoryService implements OnModuleInit {
  private sha = '';
  private readonly script = readFileSync(join(__dirname, 'lua', 'decr-stock.lua'), 'utf8');
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onModuleInit() {
    this.sha = (await this.redis.script('LOAD', this.script)) as string;
  }

  async holdSeat(eventId: string, seatId: string, userId: string): Promise<HoldResult> {
    const ttl = this.config.get('SEAT_HOLD_TTL_SEC', { infer: true });
    const res = (await this.redis.evalsha(
      this.sha,
      2,
      `event:${eventId}:stock`,
      `event:${eventId}:seats`,
      seatId,
      userId,
      String(ttl),
    )) as number;
    return res === 1 ? 'OK' : res === 0 ? 'SOLD_OUT' : 'ALREADY_TAKEN';
  }

  confirmSeat(eventId: string, seatId: string) {
    return this.redis.hset(`event:${eventId}:seats`, seatId, 'SOLD');
  }
  seedStock(eventId: string, count: number) {
    return this.redis.set(`event:${eventId}:stock`, count);
  }
}
