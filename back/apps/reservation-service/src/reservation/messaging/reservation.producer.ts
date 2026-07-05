import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA } from '@app/kafka';
import { TOPICS, ReservationRequested } from '@app/contracts';

@Injectable()
export class ReservationProducer implements OnModuleInit {
  private producer: Producer;
  constructor(@Inject(KAFKA) kafka: Kafka) {
    this.producer = kafka.producer();
  }
  async onModuleInit() {
    await this.producer.connect();
  }

  emit(payload: ReservationRequested) {
    return this.producer.send({
      topic: TOPICS.RESERVATION_REQUESTED,
      messages: [{ key: `${payload.eventId}:${payload.seatId}`, value: JSON.stringify(payload) }],
    });
  }
}
