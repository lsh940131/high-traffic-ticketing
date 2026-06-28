import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@app/redis';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueAdmissionWorker } from './queue.worker';

@Module({
  imports: [RedisModule, JwtModule.register({ secret: process.env.JWT_SECRET ?? 'dev' })],
  controllers: [QueueController],
  providers: [QueueService, QueueAdmissionWorker],
})
export class QueueServiceModule {}
