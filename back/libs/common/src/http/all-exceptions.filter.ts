import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ApiError, buildMeta } from './envelope';

/** HTTP 상태 → 에러 코드 문자열 (404 → NOT_FOUND). */
function codeFromStatus(status: number): string {
  return (HttpStatus[status] as string | undefined) ?? 'ERROR';
}

/** 모든 예외를 에러 봉투로 통일 + 로깅. 각 서비스가 자기완결적으로 일관 응답. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    logger.setContext('ExceptionFilter');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'Internal server error';
    let details: unknown;
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const p = payload as { message?: unknown };
        if (Array.isArray(p.message)) {
          message = 'Validation failed';
          details = p.message;
        } else if (typeof p.message === 'string') {
          message = p.message;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const body: ApiError = {
      success: false,
      error: { code: codeFromStatus(status), message, ...(details ? { details } : {}) },
      meta: buildMeta(req),
    };

    if (status >= 500) {
      this.logger.error({ err: exception, path: req.originalUrl }, message);
    } else {
      this.logger.warn({ status, path: req.originalUrl }, message);
    }

    res.status(status).json(body);
  }
}
