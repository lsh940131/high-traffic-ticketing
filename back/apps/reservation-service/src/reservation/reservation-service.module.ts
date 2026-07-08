import { Module } from '@nestjs/common';
import { CommonModule } from '@app/common';
import { AppConfigModule } from '@app/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { PrismaModule } from '@app/prisma';
import { ReservationController } from './reservation.controller';
import { ReservationProducer } from './messaging/reservation.producer';
import { InventoryService } from '../inventory/inventory.service';
import { EventController } from '../event/event.controller';
import { ConcertController } from '../concert/concert.controller';
import { ConcertService } from '../concert/concert.service';

@Module({
  imports: [
    CommonModule.forRoot('reservation-service'),
    AppConfigModule,
    RedisModule,
    KafkaModule,
    PrismaModule,
  ],
  controllers: [ReservationController, EventController, ConcertController],
  providers: [ReservationProducer, InventoryService, ConcertService],
})
export class ReservationServiceModule {}
