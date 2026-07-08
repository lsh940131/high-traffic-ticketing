import { Module } from '@nestjs/common';
import { CommonModule } from '@app/common';
import { AppConfigModule } from '@app/config';
import { PrismaModule } from '@app/prisma';
import { ConcertController } from '../concert/concert.controller';
import { ConcertService } from '../concert/concert.service';

/**
 * reservation-service 루트 모듈.
 * 현재: 공연 카탈로그 읽기(/concerts) + 공통기반(/health, /metrics, /docs).
 * 예매 쓰기 경로(hold→reservation→payment)는 새 스키마(ticket.status·outbox) 기준으로 이후 구현.
 */
@Module({
  imports: [CommonModule.forRoot('reservation-service'), AppConfigModule, PrismaModule],
  controllers: [ConcertController],
  providers: [ConcertService],
})
export class ReservationServiceModule {}
