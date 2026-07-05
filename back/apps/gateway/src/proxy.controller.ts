import { All, Controller, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { EnvironmentVariables } from '@app/config';
import { UpstreamService } from './upstream.service';

/**
 * 단일 진입점. 경로 prefix로 각 서비스에 REST 프록시.
 *   /queue/*        -> queue-service
 *   /reservations/* -> reservation-service
 *   /events/*       -> reservation-service (event 흡수)
 * 운영에서는 K8s Ingress가 이 역할을 대체할 수도 있음(여기선 BFF 데모).
 *
 * 다운스트림 호출은 UpstreamService(타임아웃·재시도·서킷브레이커)를 통해 나간다.
 */
@Controller()
export class ProxyController {
  private readonly routes: { prefix: string; target: string }[];

  constructor(
    private readonly upstream: UpstreamService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    const queueUrl = config.get('QUEUE_URL', { infer: true }) ?? 'http://localhost:3101';
    const reservationUrl =
      config.get('RESERVATION_URL', { infer: true }) ?? 'http://localhost:3102';
    this.routes = [
      { prefix: '/queue', target: queueUrl },
      { prefix: '/reservations', target: reservationUrl },
      { prefix: '/events', target: reservationUrl },
    ];
  }

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const route = this.routes.find((r) => req.path.startsWith(r.prefix));
    if (!route) return res.status(404).json({ message: 'no route' });

    const result = await this.upstream.forward(route.target, {
      method: req.method as AxiosMethod,
      url: route.target + req.originalUrl,
      data: req.body,
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-entry-token': req.headers['x-entry-token'],
      },
    });
    res.status(result.status).json(result.data);
  }
}

type AxiosMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
