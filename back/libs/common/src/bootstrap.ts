import type { INestApplication, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { setupSwagger } from './swagger/setup-swagger';

export interface BootstrapOptions {
  name: string;
  port: number;
  cors?: boolean;
}

/**
 * 모든 서비스 공용 부트스트랩.
 * main.ts는 이 한 줄만 호출: pino 로거 연결 · graceful shutdown · swagger · listen 일괄.
 */
export async function bootstrapService(
  appModule: Type<unknown>,
  opts: BootstrapOptions,
): Promise<INestApplication> {
  process.env.SERVICE_NAME = opts.name; // kafka clientId 등에서 사용 (모듈 생성 전 설정)
  const app = await NestFactory.create(appModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  if (opts.cors) app.enableCors();

  // Swagger는 운영에서 기본 off (문서 노출 = 공격면). 명시적으로만 켠다.
  //  - SWAGGER_ENABLED 있으면 그 값 우선, 없으면 prod가 아닐 때만 on
  const swaggerEnabled = process.env.SWAGGER_ENABLED
    ? process.env.SWAGGER_ENABLED === 'true'
    : process.env.NODE_ENV !== 'production';
  if (swaggerEnabled) setupSwagger(app, opts.name);

  await app.listen(opts.port);
  return app;
}
