import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA, ensureTopics } from '@app/kafka';
import { REDIS } from '@app/redis';
import { TOPICS, ReservationRequested } from '@app/contracts';
import { PaymentService } from '../payment.service';

/**
 * 전략③: reservation.requested 소비 → 결제 → 결과 저장.
 * 멱등성: reservationId 처리 마커(SET NX)로 중복 소비 방지.
 */
@Injectable()
export class ReservationConsumer implements OnModuleInit {
  constructor(
    @Inject(KAFKA) private readonly kafka: Kafka,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly payment: PaymentService,
  ) {}

  async onModuleInit() {
    // 없는 토픽 subscribe 시 UNKNOWN_TOPIC_OR_PARTITION으로 죽으므로 선제 생성(멱등).
    await ensureTopics(this.kafka, [TOPICS.RESERVATION_REQUESTED]);
    const consumer = this.kafka.consumer({ groupId: 'payment-workers' });
    await consumer.connect();
    await consumer.subscribe({ topic: TOPICS.RESERVATION_REQUESTED, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        await this.handle(JSON.parse(message.value!.toString()));
      },
    });
  }

  private async handle(evt: ReservationRequested) {
    const fresh = await this.redis.set(`processed:${evt.reservationId}`, '1', 'EX', 3600, 'NX');
    if (!fresh) return;
    const save = (state: string, extra: object = {}) =>
      this.redis.set(
        `reservation:${evt.reservationId}`,
        JSON.stringify({ state, ...extra }),
        'EX',
        3600,
      );

    const orderNo = `ORD-${evt.reservationId.slice(0, 8)}`;
    const pay = await this.payment.charge(orderNo, 0);
    if (!pay.ok) return save('FAILED', { reason: '결제 실패' });

    // 좌석 SOLD 확정 (Redis 공유). DB 영속화는 TODO(Prisma).
    await this.redis.hset(`event:${evt.eventId}:seats`, evt.seatId, 'SOLD');
    await save('CONFIRMED', { orderNo, paymentTxId: pay.txId });
  }
}
