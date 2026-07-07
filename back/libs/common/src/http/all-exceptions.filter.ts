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
          message = typeof p.message[0] === 'string' ? p.message[0] : 'Validation failed';
          details = p.message;
        } else if (typeof p.message === 'string') {
          message = p.message;
        }
      }
    }
    // 5xx(비-HttpException)는 내부 에러 메시지를 클라이언트에 노출하지 않는다.
    // (message는 'Internal server error' 유지, 실제 원인은 서버 로그로만)

    const body: ApiError = {
      success: false,
      error: { code: codeFromStatus(status), message, ...(details ? { details } : {}) },
      meta: buildMeta(req),
    };

    if (status >= 500) {
      const detail = exception instanceof Error ? exception.message : message;
      this.logger.error({ err: exception, path: req.originalUrl }, detail);
    } else {
      this.logger.warn({ status, path: req.originalUrl }, message);
    }

    res.status(status).json(body);
  }
}
