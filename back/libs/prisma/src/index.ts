export * from './prisma.module';
export * from './prisma.service';
// 모델·Prisma 네임스페이스 타입도 @app/prisma 에서 바로 쓰도록 재노출
export * from '../generated/prisma/client';
