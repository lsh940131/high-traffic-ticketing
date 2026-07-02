import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.validation';

/**
 * 전역 설정 모듈. 각 서비스가 imports에 넣기만 하면:
 *  - 호스트 개발: back/.env 로드
 *  - k8s: .env 없음 → 주입된 process.env 사용 (ConfigMap/Secret)
 *  - 부팅 시 env 스키마 검증(실패하면 기동 중단)
 * ConfigService<EnvironmentVariables>로 타입 접근 가능.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'], // 호스트 개발용. 클러스터엔 파일이 없어도 무방.
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
