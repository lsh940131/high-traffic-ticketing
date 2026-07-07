import { randomUUID } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Params } from 'nestjs-pino';

/**
 * nestjs-pino 설정 팩토리.
 *  - request-id: 요청에 x-request-id 있으면 그대로(게이트웨이가 전파), 없으면 생성 -> 응답 헤더로 echo.
 *  - autoLogging: 요청/응답 자동 로깅. /metrics, /health 폴링은 제외(노이즈 제거).
 *  - dev는 pino-pretty, prod는 JSON 그대로.
 */
export function pinoParams(serviceName: string): Params {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    pinoHttp: {
      name: serviceName,
      level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
      genReqId: (req: IncomingMessage, res: ServerResponse): string => {
        const header = req.headers['x-request-id'];
        const id = (Array.isArray(header) ? header[0] : header) || randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      customProps: () => ({ service: serviceName }),
      redact: ['req.headers.authorization', 'req.headers["x-entry-token"]'],
      autoLogging: {
        ignore: (req: IncomingMessage) => {
          const url = req.url ?? '';
          return url.startsWith('/metrics') || url.startsWith('/health');
        },
      },
      transport: isProd
        ? undefined
        : { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:standard' } },
    },
  };
}
