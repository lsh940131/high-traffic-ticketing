import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';
import { EnvironmentVariables } from '@app/config';

// 입장 토큰(JWT) 검증 가드. gateway 및 reservation-service에서 재사용.
@Injectable()
export class EntryTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers['x-entry-token'];
    if (!token) throw new UnauthorizedException('no entry token');
    try {
      req.entry = verify(token, this.config.get('JWT_SECRET', { infer: true }));
      return true;
    } catch {
      throw new UnauthorizedException('invalid entry token');
    }
  }
}
