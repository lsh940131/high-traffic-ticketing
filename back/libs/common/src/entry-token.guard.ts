import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';

// 입장 토큰(JWT) 검증 가드. gateway 및 reservation-service에서 재사용.
@Injectable()
export class EntryTokenGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers['x-entry-token'];
    if (!token) throw new UnauthorizedException('no entry token');
    try {
      req.entry = verify(token, process.env.JWT_SECRET ?? 'dev');
      return true;
    } catch {
      throw new UnauthorizedException('invalid entry token');
    }
  }
}
