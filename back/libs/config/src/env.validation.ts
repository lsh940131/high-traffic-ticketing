import { plainToInstance, Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, validateSync } from 'class-validator';

/**
 * 환경변수 스키마. 부팅 시 검증(fail-fast) + 타입 접근의 단일 소스.
 * 출처는 환경마다 다르지만(호스트 .env / k8s ConfigMap) 스키마는 동일하다.
 */
export class EnvironmentVariables {
  // ── 필수: 연결 문자열 + 시크릿 (없으면 부팅 실패) ──
  @IsString() @IsNotEmpty() REDIS_URL!: string;
  @IsString() @IsNotEmpty() KAFKA_BROKERS!: string;
  @IsString() @IsNotEmpty() DATABASE_URL!: string;
  @IsString() @IsNotEmpty() JWT_SECRET!: string;

  // ── 튜너블: 기본값 있음 (ConfigMap에 없어도 됨) ──
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  SEAT_HOLD_TTL_SEC: number = 300;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  QUEUE_ADMIT_BATCH: number = 500;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  QUEUE_ACTIVE_CAPACITY: number = 2000;

  // ── gateway 전용 업스트림 (다른 서비스엔 없음 → 선택) ──
  @IsOptional() @IsString() QUEUE_URL?: string;
  @IsOptional() @IsString() RESERVATION_URL?: string;
  @IsOptional() @IsString() USER_URL?: string;

  // ── 런타임 ──
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() PORT?: number;
  @IsOptional() @IsString() NODE_ENV?: string;
}

/** @nestjs/config `validate` 훅. 검증 실패 시 부팅을 막는다. */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `- ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`환경변수 검증 실패\n${detail}`);
  }
  return validated;
}
