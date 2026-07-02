import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule, EnvironmentVariables } from '@app/config';
import { RedisModule } from '@app/redis';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueAdmissionWorker } from './queue.worker';

@Module({
  imports: [
    AppConfigModule,
    RedisModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
      }),
    }),
  ],
  controllers: [QueueController],
  providers: [QueueService, QueueAdmissionWorker],
})
export class QueueServiceModule {}
