import type { Request } from 'express';

/** 모든 응답 공통 메타. */
export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  path: string;
}

/** 성공 응답 봉투. */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/** 에러 응답 봉투. */
export interface ApiError {
  success: false;
  error: ApiErrorBody;
  meta: ResponseMeta;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

/** req.id(요청 상관관계)를 실은 메타 생성. pino-http가 req.id를 채운다. */
export function buildMeta(req: Request): ResponseMeta {
  return {
    requestId: (req as Request & { id?: string }).id ?? '',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  };
}
