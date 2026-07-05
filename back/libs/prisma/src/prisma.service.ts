import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { EnvironmentVariables } from '@app/config';
// 생성 클라이언트는 lib 내부 generated/ 에 위치(src 바깥, gitignore)
import { PrismaClient } from '../generated/prisma/client';

/**
 * Prisma 7: 네이티브 엔진 없이 driver adapter(@prisma/adapter-pg)로 연결한다.
 * 연결 URL은 스키마가 아니라 @app/config(DATABASE_URL)에서 주입.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
