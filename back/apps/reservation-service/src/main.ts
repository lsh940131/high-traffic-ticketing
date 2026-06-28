import { NestFactory } from '@nestjs/core';
import { ReservationServiceModule } from './reservation-service.module';

async function bootstrap() {
  process.env.SERVICE_NAME = 'reservation-service';
  const app = await NestFactory.create(ReservationServiceModule);
  await app.listen(process.env.PORT ?? 3102);
}
bootstrap();
