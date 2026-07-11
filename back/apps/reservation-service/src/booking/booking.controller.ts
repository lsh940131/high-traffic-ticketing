import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthUser, CurrentUser, EntryTokenGuard, JwtAuthGuard } from '@app/common';
import { BookingService } from './booking.service';
import { HoldRequestDto, HoldResultDto, OrderResultDto, TicketsRequestDto } from './dto';

// 입장토큰 payload에서 concertId를 꺼낸다(대기열 통과한 그 공연으로 고정).
function concertOf(req: Request): string {
  const entry = (req as Request & { entry?: { concertId?: string } }).entry;
  return entry?.concertId ?? '';
}

@ApiTags('booking')
@ApiBearerAuth()
@ApiHeader({ name: 'x-entry-token', description: '대기열 입장 토큰', required: true })
@UseGuards(JwtAuthGuard, EntryTokenGuard)
@Controller('reservations')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Post('hold')
  @HttpCode(200)
  @ApiOperation({
    summary: '좌석 선점(hold)',
    description: '선택 좌석을 Redis에 원자적으로 선점(TTL). 1인 최대 2매. 대기열 입장 토큰 필요.',
  })
  @ApiOkResponse({ type: HoldResultDto })
  hold(@Body() dto: HoldRequestDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.booking.hold(concertOf(req), user.userId, dto);
  }

  @Post('hold/release')
  @HttpCode(200)
  @ApiOperation({
    summary: '좌석 선점 해제',
    description: '좌석 선택 취소 시 내 hold를 즉시 반환(TTL 대기 없이). 내 소유 좌석만.',
  })
  release(@Body() dto: TicketsRequestDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.booking.releaseHold(concertOf(req), user.userId, dto.ticketIds);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: '예매 생성(주문)',
    description: '선점한 좌석으로 주문(PENDING) 생성 + Outbox 기록. 결제는 비동기 → 상태 폴링.',
  })
  @ApiOkResponse({ type: OrderResultDto })
  reserve(@Body() dto: TicketsRequestDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.booking.reserve(concertOf(req), user.userId, dto.ticketIds);
  }
}
