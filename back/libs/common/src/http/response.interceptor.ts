import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { map, Observable } from 'rxjs';
import { ApiSuccess, buildMeta } from './envelope';

// 성공 응답을 { success, data, meta } 봉투로 통일한다.
// /metrics(prometheus 텍스트)·/health(terminus 원형)는 감싸지 않는다.
const RAW_PATHS = ['/metrics', '/health'];

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T> | T> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T> | T> {
    const req = context.switchToHttp().getRequest<Request>();
    if (RAW_PATHS.some((p) => req.path.startsWith(p))) return next.handle();
    return next
      .handle()
      .pipe(map((data): ApiSuccess<T> => ({ success: true, data, meta: buildMeta(req) })));
  }
}
