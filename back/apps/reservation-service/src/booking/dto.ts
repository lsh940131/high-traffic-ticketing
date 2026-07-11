import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/** 좌석 선점/예매 요청. 1인 최대 2매. */
export class TicketsRequestDto {
  @ApiProperty({
    type: [String],
    description: '티켓 ID 목록(1~2)',
    example: ['00000000-0000-7000-8000-000000000000'],
  })
  @IsArray()
  @ArrayNotEmpty({ message: '좌석을 선택해주세요.' })
  @ArrayMaxSize(2, { message: '1인 최대 2매까지 선택할 수 있습니다.' })
  @IsUUID('all', { each: true, message: '유효하지 않은 티켓 ID입니다.' })
  ticketIds!: string[];
}

/** 선점 요청: 좌석(ticketIds) 또는 스탠딩 수량(standingQty) 중 하나. */
export class HoldRequestDto {
  @ApiPropertyOptional({ type: [String], description: '좌석 티켓 ID(1~2). 좌석 예매 시.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2, { message: '1인 최대 2매까지 선택할 수 있습니다.' })
  @IsUUID('all', { each: true, message: '유효하지 않은 티켓 ID입니다.' })
  ticketIds?: string[];

  @ApiPropertyOptional({ description: '스탠딩 수량(1~2). 스탠딩 예매 시.', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2, { message: '1인 최대 2매까지 예매할 수 있습니다.' })
  standingQty?: number;
}

/** 선점 결과. 만료까지 카운트다운. */
export class HoldResultDto {
  concertId!: string;
  ticketIds!: string[];
  /** 선점한 물리 좌석 ID들 */
  seatIds!: string[];
  /** 총액(원) */
  amount!: number;
  /** 선점 만료 시각 ISO(카운트다운 기준) */
  expiresAt!: string;
  /** 선점 유지 초 */
  holdSeconds!: number;
}

/** 예매 생성 결과(주문). 결제는 비동기 진행 → 상태 폴링. */
export class OrderResultDto {
  orderId!: string;
  orderNo!: string;
  amount!: number;
  /** PENDING(결제 처리중) */
  status!: string;
  ticketIds!: string[];
}

export class OrderItemDto {
  ticketId!: string;
  /** 좌석 표기(예: 1F 103구역 5열 12번 / 스탠딩) */
  seatLabel!: string;
  grade!: string;
  price!: number;
}

/** 주문 조회(마이페이지·상태 폴링). */
export class OrderViewDto {
  orderId!: string;
  orderNo!: string;
  concertName!: string;
  /** 주문 상태: PENDING/CONFIRMED/FAILED/CANCELLED */
  status!: string;
  /** 결제 상태: PENDING/APPROVED/FAILED (없으면 null) */
  paymentStatus!: string | null;
  /** 결제 실패 사유 코드(있을 때) */
  paymentFailCode!: string | null;
  /** 결제 실패 사용자 메시지(있을 때) — 프론트가 그대로 노출 */
  failReason!: string | null;
  amount!: number;
  items!: OrderItemDto[];
  createdAt!: Date;
}
