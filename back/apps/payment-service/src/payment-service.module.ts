import { Module } from '@nestjs/common';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { PaymentService } from './payment.service';
import { ReservationConsumer } from './reservation.consumer';

@Module({
  imports: [RedisModule, KafkaModule],
  providers: [PaymentService, ReservationConsumer],
})
export class PaymentServiceModule {}
