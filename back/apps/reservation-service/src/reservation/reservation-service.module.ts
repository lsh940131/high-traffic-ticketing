import { Module } from '@nestjs/common';
import { CommonModule } from '@app/common';
import { AppConfigModule } from '@app/config';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { ConcertController } from '../concert/concert.controller';
import { ConcertService } from '../concert/concert.service';
import { BookingController } from '../booking/booking.controller';
import { OrderController } from '../booking/order.controller';
import { BookingService } from '../booking/booking.service';
import { OutboxRelay } from '../booking/messaging/outbox.relay';

/**
 * reservation-service 루트 모듈.
 *  - 카탈로그: /concerts, /concerts/:id, seatmap, seats?block
 *  - 예매 쓰기: /reservations/hold, /reservations(주문+outbox), /orders
 *  - Outbox relay 워커 → Kafka
 */
@Module({
  imports: [
    CommonModule.forRoot('reservation-service'),
    AppConfigModule,
    PrismaModule,
    RedisModule,
    KafkaModule,
  ],
  controllers: [ConcertController, BookingController, OrderController],
  providers: [ConcertService, BookingService, OutboxRelay],
})
export class ReservationServiceModule {}
