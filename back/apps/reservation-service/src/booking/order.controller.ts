import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthUser, CurrentUser, JwtAuthGuard } from '@app/common';
import { BookingService } from './booking.service';
import { OrderResultDto, OrderViewDto } from './dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly booking: BookingService) {}

  @Get()
  @ApiOperation({ summary: '내 주문 목록', description: '마이페이지. 로그인 사용자의 주문들.' })
  @ApiOkResponse({ type: [OrderViewDto] })
  list(@CurrentUser() user: AuthUser) {
    return this.booking.listOrders(user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: '주문 조회',
    description: '주문 상태(PENDING/CONFIRMED/FAILED) 폴링. 소유자만.',
  })
  @ApiOkResponse({ type: OrderViewDto })
  @ApiNotFoundResponse({ description: '주문 없음' })
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.booking.getOrder(id, user.userId);
  }

  @Post(':id/retry')
  @HttpCode(200)
  @ApiOperation({
    summary: '결제 재시도',
    description:
      '실패한 주문을 다시 결제. 좌석 선점(hold)이 유효할 때만. 카드 변경 후 재시도 시나리오.',
  })
  @ApiOkResponse({ type: OrderResultDto })
  retry(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.booking.retryPayment(id, user.userId);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary: '예매 취소',
    description: '확정된 주문을 관람 전 취소. 좌석 복원(SOLD→AVAILABLE) + 환불 기록.',
  })
  @ApiOkResponse({ type: OrderViewDto })
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.booking.cancelOrder(id, user.userId);
  }
}
