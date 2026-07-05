import { Module } from '@nestjs/common';
import { AppConfigModule } from '@app/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { PaymentService } from './payment.service';
import { ReservationConsumer } from './messaging/reservation.consumer';

@Module({
  imports: [AppConfigModule, RedisModule, KafkaModule],
  providers: [PaymentService, ReservationConsumer],
})
export class PaymentServiceModule {}
