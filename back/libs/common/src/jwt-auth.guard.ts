import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { verify } from 'jsonwebtoken';
import { EnvironmentVariables } from '@app/config';

export interface AuthUser {
  userId: string;
  email: string;
}

/**
 * 로그인 AT(JWT) 검증 가드.
 * Authorization: Bearer <token> 을 읽어 서명 검증 → req.user 에 사용자 주입.
 * 입장 토큰(EntryTokenGuard)과 별개: 이건 "신원 증명"용.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException('로그인이 필요합니다.');
    try {
      const payload = verify(token, this.config.get('JWT_SECRET', { infer: true })) as {
        sub: string;
        email: string;
      };
      req.user = { userId: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }
  }
}

/** @CurrentUser() 로 검증된 사용자 주입. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    return req.user as AuthUser;
  },
);
