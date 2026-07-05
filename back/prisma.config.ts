import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7: 연결 URL·마이그레이션 설정은 스키마가 아니라 이 파일에서 관리한다.
// 런타임 클라이언트는 @app/prisma 의 PrismaService(@prisma/adapter-pg)가 별도로 연결한다.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
