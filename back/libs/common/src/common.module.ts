import { DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from './health/health.controller';
import { AllExceptionsFilter } from './http/all-exceptions.filter';
import { ResponseInterceptor } from './http/response.interceptor';
import { pinoParams } from './logging/logger.config';

/**
 * 모든 서비스가 forRoot(serviceName)로 임포트하는 공통 기반 모듈.
 * 여기 한 곳에 두고 4개 서비스가 한 줄로 적용 → DRY + 각 서비스 자기완결적 일관성.
 *  - 구조적 로깅(nestjs-pino) + request-id
 *  - /metrics(prometheus), /health(terminus)
 *  - 전역 예외 필터(에러 봉투) + 전역 인터셉터(성공 봉투)
 */
@Module({})
export class CommonModule {
  static forRoot(serviceName: string): DynamicModule {
    return {
      module: CommonModule,
      imports: [
        LoggerModule.forRoot(pinoParams(serviceName)),
        PrometheusModule.register({ defaultMetrics: { enabled: true } }),
        TerminusModule,
      ],
      controllers: [HealthController],
      providers: [
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
      ],
      exports: [LoggerModule],
    };
  }
}
