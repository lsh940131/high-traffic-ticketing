import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA, ensureTopics } from '@app/kafka';
import { TOPICS } from '@app/contracts';
import { PrismaService, OutboxStatus } from '@app/prisma';

/**
 * 트랜잭셔널 아웃박스 릴레이: Outbox PENDING → Kafka 발행 → SENT.
 * "DB 커밋 ↔ 이벤트 발행"을 분리해 dual-write 유실/유령을 방지.
 */
@Injectable()
export class OutboxRelay implements OnModuleInit, OnModuleDestroy {
  private readonly producer: Producer;
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(KAFKA) private readonly kafka: Kafka,
    private readonly prisma: PrismaService,
  ) {
    this.producer = kafka.producer();
  }

  async onModuleInit() {
    await ensureTopics(this.kafka, Object.values(TOPICS));
    await this.producer.connect();
    this.timer = setInterval(() => {
      this.flush().catch(() => {});
    }, 1000);
  }

  async flush() {
    const pending = await this.prisma.outbox.findMany({
      where: { status: OutboxStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    for (const ev of pending) {
      await this.producer.send({
        topic: ev.eventType,
        messages: [{ key: ev.aggregateId, value: JSON.stringify(ev.payload) }],
      });
      await this.prisma.outbox.update({
        where: { id: ev.id },
        data: { status: OutboxStatus.SENT, sentAt: new Date() },
      });
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
