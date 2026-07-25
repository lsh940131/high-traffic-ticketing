import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '@app/prisma';
import { LoginDto, RegisterDto } from './dto';

const AT_TTL = '15m'; // 액세스 토큰(단명)
const RT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 리프레시 토큰 7일

type PubUser = { id: string; name: string; email: string };
type AuthResult = { accessToken: string; refreshToken: string; user: PubUser };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** 회원가입: 이메일 중복 확인 → 비번 해시 → User 생성. */
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('이미 가입된 이메일입니다.');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
    });
    return { id: user.id, name: user.name, email: user.email };
  }

  /** 로그인: 검증 → AT(바디) + RT(쿠키용 원문) 발급. */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    return {
      accessToken: await this.signAt(user),
      refreshToken: await this.issueRt(user.id),
      user: this.pub(user),
    };
  }

  /**
   * RT 회전: 유효 RT면 폐기 후 새 AT+RT 발급.
   * 이미 폐기/만료된 RT 재사용 감지 시 → 해당 유저 RT 전체 폐기(탈취 대응).
   */
  async refresh(rawRt?: string): Promise<AuthResult> {
    if (!rawRt) throw new UnauthorizedException('리프레시 토큰이 없습니다.');
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawRt) },
    });
    const now = new Date();
    if (!token || token.revokedAt || token.expiresAt < now) {
      if (token) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: token.userId, revokedAt: null },
          data: { revokedAt: now },
        });
      }
      throw new UnauthorizedException('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
    await this.prisma.refreshToken.update({ where: { id: token.id }, data: { revokedAt: now } });
    const user = await this.prisma.user.findUnique({ where: { id: token.userId } });
    if (!user) throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    return {
      accessToken: await this.signAt(user),
      refreshToken: await this.issueRt(user.id),
      user: this.pub(user),
    };
  }

  /** 로그아웃: 해당 RT 폐기. */
  async logout(rawRt?: string) {
    if (rawRt) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: this.hash(rawRt), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { ok: true };
  }

  private signAt(user: { id: string; email: string }) {
    return this.jwt.signAsync({ sub: user.id, email: user.email }, { expiresIn: AT_TTL });
  }

  private async issueRt(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('hex'); // 불투명 랜덤 토큰
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: this.hash(raw), expiresAt: new Date(Date.now() + RT_TTL_MS) },
    });
    return raw;
  }

  private hash(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  private pub(user: PubUser): PubUser {
    return { id: user.id, name: user.name, email: user.email };
  }
}
