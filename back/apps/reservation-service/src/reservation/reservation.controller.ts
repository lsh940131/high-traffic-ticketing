import { Body, Controller, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { REDIS } from '@app/redis';
import { EntryTokenGuard } from '@app/common';
import { CreateReservationDto } from '@app/contracts';
import { ReservationProducer } from './messaging/reservation.producer';
import { InventoryService } from '../inventory/inventory.service';

/** 전략②③: 좌석 hold(재고 동시성) + 예매 요청 Kafka 발행. */
@Controller('reservations')
export class ReservationController {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly producer: ReservationProducer,
    private readonly inventory: InventoryService,
  ) {}

  // 좌석 임시 점유 (입장 토큰 필요)
  @Post('hold')
  @UseGuards(EntryTokenGuard)
  hold(@Body() dto: { eventId: string; seatId: string; userId?: string }) {
    return this.inventory.holdSeat(dto.eventId, dto.seatId, dto.userId ?? 'anon');
  }

  // 예매 확정 요청 → 비동기 처리(202)
  @Post()
  @HttpCode(202)
  @UseGuards(EntryTokenGuard)
  async create(@Body() dto: CreateReservationDto) {
    const reservationId = randomUUID();
    await this.redis.set(
      `reservation:${reservationId}`,
      JSON.stringify({ state: 'PROCESSING' }),
      'EX',
      3600,
    );
    await this.producer.emit({
      reservationId,
      eventId: dto.eventId,
      seatId: dto.seatId,
      userId: dto.userId ?? 'anon',
    });
    return { reservationId };
  }

  @Get(':id')
  async result(@Param('id') id: string) {
    const raw = await this.redis.get(`reservation:${id}`);
    return raw
      ? { reservationId: id, ...JSON.parse(raw) }
      : { reservationId: id, state: 'PROCESSING' };
  }
}
