import { Global, Module } from '@nestjs/common';
import { Kafka } from 'kafkajs';

export const KAFKA = Symbol('KAFKA');

@Global()
@Module({
  providers: [
    {
      provide: KAFKA,
      useFactory: () =>
        new Kafka({
          clientId: process.env.SERVICE_NAME ?? 'ticketing',
          brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
        }),
    },
  ],
  exports: [KAFKA],
})
export class KafkaModule {}
