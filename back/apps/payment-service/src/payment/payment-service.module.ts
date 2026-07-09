import { Module } from '@nestjs/common';
import { CommonModule } from '@app/common';
import { AppConfigModule } from '@app/config';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { KafkaModule } from '@app/kafka';
import { PaymentService } from './payment.service';
import { OrderConsumer } from './messaging/order.consumer';

@Module({
  imports: [
    CommonModule.forRoot('payment-service'),
    AppConfigModule,
    PrismaModule,
    RedisModule,
    KafkaModule,
  ],
  providers: [PaymentService, OrderConsumer],
})
export class PaymentServiceModule {}
