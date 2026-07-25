import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser, JwtAuthGuard, type AuthUser } from '@app/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

const RT_COOKIE = 'rt';
const RT_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** 쿠키 헤더에서 값 파싱(cookie-parser 없이). */
function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** RT를 HttpOnly 쿠키로. JS 접근 불가, 브라우저가 자동 첨부. */
  private setRt(res: Response, token: string) {
    res.cookie(RT_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: RT_MAX_AGE,
    });
  }

  @Post('register')
  @ApiOperation({ summary: '회원가입', description: '이메일·비밀번호로 계정을 생성한다.' })
  @ApiCreatedResponse({ description: '가입 성공 — 유저 요약(id·name·email)' })
  @ApiBadRequestResponse({ description: '입력값 검증 실패' })
  @ApiConflictResponse({ description: '이미 가입된 이메일' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: '로그인',
    description: 'AT(JWT, 15분)는 바디로, RT(7일)는 HttpOnly 쿠키로 발급.',
  })
  @ApiOkResponse({ description: 'accessToken + user 반환 (+ Set-Cookie: rt)' })
  @ApiUnauthorizedResponse({ description: '이메일 또는 비밀번호 불일치' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto);
    this.setRt(res, refreshToken);
    return { accessToken, user };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: '토큰 갱신',
    description: 'RT 쿠키로 새 AT 발급 + RT 회전. AT 만료 시 프론트가 자동 호출.',
  })
  @ApiOkResponse({ description: '새 accessToken + user (+ 회전된 Set-Cookie: rt)' })
  @ApiUnauthorizedResponse({ description: 'RT 없음/만료/무효 — 재로그인 필요' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.refresh(readCookie(req, RT_COOKIE));
    this.setRt(res, refreshToken);
    return { accessToken, user };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: '로그아웃', description: 'RT 폐기 + 쿠키 삭제.' })
  @ApiOkResponse({ description: '{ ok: true }' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(readCookie(req, RT_COOKIE));
    res.clearCookie(RT_COOKIE, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보', description: 'AT로 인증된 사용자 정보를 반환한다.' })
  @ApiOkResponse({ description: '인증된 사용자 (userId·email)' })
  @ApiUnauthorizedResponse({ description: '토큰 없음 또는 무효' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
