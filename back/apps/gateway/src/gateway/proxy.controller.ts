import { All, Controller, NotFoundException, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { EnvironmentVariables } from '@app/config';
import { UpstreamService } from './upstream/upstream.service';

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

  // 프록시 대상 prefix만 바인딩. 게이트웨이 자신의 /metrics·/health·/docs를
  // 삼키지 않도록 '*' 전체 와일드카드는 쓰지 않는다.
  @All(['queue', 'queue/*', 'reservations', 'reservations/*', 'events', 'events/*'])
  async proxy(@Req() req: Request, @Res() res: Response) {
    const route = this.routes.find((r) => req.path.startsWith(r.prefix));
    if (!route) throw new NotFoundException('no route');

    const result = await this.upstream.forward(route.target, {
      method: req.method as AxiosMethod,
      url: route.target + req.originalUrl,
      data: req.body,
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-entry-token': req.headers['x-entry-token'],
        // 다운스트림에 요청 상관관계 전파 (게이트웨이가 발급한 id)
        'x-request-id': (req as Request & { id?: string }).id,
      },
    });
    res.status(result.status).json(result.data);
  }
}

type AxiosMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
