import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
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
import { CurrentUser, JwtAuthGuard, type AuthUser } from '@app/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '회원가입', description: '이메일·비밀번호로 계정을 생성한다.' })
  @ApiCreatedResponse({ description: '가입 성공 — 생성된 유저 요약(id·name·email) 반환' })
  @ApiBadRequestResponse({ description: '입력값 검증 실패 — 이메일 형식, 비밀번호 8자 미만 등' })
  @ApiConflictResponse({ description: '이미 가입된 이메일' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: '로그인',
    description: '이메일·비밀번호 검증 후 AT(JWT, 30분)를 발급한다.',
  })
  @ApiOkResponse({ description: '로그인 성공 — accessToken + 유저 요약 반환' })
  @ApiBadRequestResponse({ description: '입력값 검증 실패' })
  @ApiUnauthorizedResponse({ description: '이메일 또는 비밀번호 불일치' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
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
