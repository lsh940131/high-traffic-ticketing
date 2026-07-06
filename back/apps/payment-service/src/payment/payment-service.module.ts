import { Module } from '@nestjs/common';
import { CommonModule } from '@app/common';
import { AppConfigModule } from '@app/config';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { PaymentService } from './payment.service';
import { ReservationConsumer } from './messaging/reservation.consumer';

@Module({
  imports: [CommonModule.forRoot('payment-service'), AppConfigModule, RedisModule, KafkaModule],
  providers: [PaymentService, ReservationConsumer],
})
export class PaymentServiceModule {}
