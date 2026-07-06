import { bootstrapService } from '@app/common';
import { PaymentServiceModule } from './payment/payment-service.module';

// 결제는 HTTP(헬스체크·metrics·docs)만 노출하고 핵심은 Kafka consumer로 동작
void bootstrapService(PaymentServiceModule, {
  name: 'payment-service',
  port: Number(process.env.PORT ?? 3103),
});
