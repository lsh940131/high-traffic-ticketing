import { NestFactory } from '@nestjs/core';
import { QueueServiceModule } from './queue-service.module';

async function bootstrap() {
  process.env.SERVICE_NAME = 'queue-service';
  const app = await NestFactory.create(QueueServiceModule);
  await app.listen(process.env.PORT ?? 3101);
}
bootstrap();
