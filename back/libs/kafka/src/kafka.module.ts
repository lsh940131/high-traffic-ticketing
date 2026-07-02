import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka } from 'kafkajs';
import { EnvironmentVariables } from '@app/config';

export const KAFKA = Symbol('KAFKA');

@Global()
@Module({
  providers: [
    {
      provide: KAFKA,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        new Kafka({
          clientId: process.env.SERVICE_NAME ?? 'ticketing',
          brokers: config.get('KAFKA_BROKERS', { infer: true }).split(','),
        }),
    },
  ],
  exports: [KAFKA],
})
export class KafkaModule {}
