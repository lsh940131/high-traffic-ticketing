import { NestFactory } from '@nestjs/core';
import { PaymentServiceModule } from './payment-service.module';

async function bootstrap() {
  process.env.SERVICE_NAME = 'payment-service';
  // 결제는 HTTP 헬스체크만 노출하고 핵심은 Kafka consumer로 동작
  const app = await NestFactory.create(PaymentServiceModule);
  await app.listen(process.env.PORT ?? 3103);
}
bootstrap();
