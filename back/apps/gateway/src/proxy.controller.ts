import { All, Controller, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';

/**
 * 단일 진입점. 경로 prefix로 각 서비스에 REST 프록시.
 *   /queue/*        -> queue-service
 *   /reservations/* -> reservation-service
 *   /events/*       -> reservation-service (event 흡수)
 * 운영에서는 K8s Ingress가 이 역할을 대체할 수도 있음(여기선 BFF 데모).
 */
@Controller()
export class ProxyController {
  private readonly routes: { prefix: string; target: string }[] = [
    { prefix: '/queue', target: process.env.QUEUE_URL ?? 'http://localhost:3101' },
    { prefix: '/reservations', target: process.env.RESERVATION_URL ?? 'http://localhost:3102' },
    { prefix: '/events', target: process.env.RESERVATION_URL ?? 'http://localhost:3102' },
  ];
  constructor(private readonly http: HttpService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const route = this.routes.find((r) => req.path.startsWith(r.prefix));
    if (!route) return res.status(404).json({ message: 'no route' });
    try {
      const r = await this.http.axiosRef.request({
        method: req.method as any,
        url: route.target + req.originalUrl,
        data: req.body,
        headers: { 'x-user-id': req.headers['x-user-id'], 'x-entry-token': req.headers['x-entry-token'] },
        validateStatus: () => true,
      });
      res.status(r.status).json(r.data);
    } catch {
      res.status(502).json({ message: 'upstream error' });
    }
  }
}
