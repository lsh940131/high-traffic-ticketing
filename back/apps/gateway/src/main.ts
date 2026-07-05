import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway/gateway.module';

async function bootstrap() {
  process.env.SERVICE_NAME = 'gateway';
  const app = await NestFactory.create(GatewayModule);
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
