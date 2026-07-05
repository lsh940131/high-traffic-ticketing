import { Module } from '@nestjs/common';
import { AppConfigModule } from '@app/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { ReservationController } from './reservation.controller';
import { ReservationProducer } from './messaging/reservation.producer';
import { InventoryService } from '../inventory/inventory.service';
import { EventController } from '../event/event.controller';

@Module({
  imports: [AppConfigModule, RedisModule, KafkaModule],
  controllers: [ReservationController, EventController],
  providers: [ReservationProducer, InventoryService],
})
export class ReservationServiceModule {}
