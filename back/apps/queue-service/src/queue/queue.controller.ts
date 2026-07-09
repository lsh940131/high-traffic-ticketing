import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, JwtAuthGuard } from '@app/common';
import { QueueService } from './queue.service';
import { QueueStatusDto } from './dto';

@ApiTags('queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  @Post(':concertId/enter')
  @ApiOperation({
    summary: '대기열 입장',
    description: '로그인 사용자를 대기열에 등록하고 현재 상태 반환. 정원 여유 시 즉시 READY.',
  })
  @ApiOkResponse({ type: QueueStatusDto })
  enter(@Param('concertId') concertId: string, @CurrentUser() user: AuthUser) {
    return this.queue.enter(concertId, user.userId);
  }

  @Get(':concertId/status')
  @ApiOperation({
    summary: '대기열 상태',
    description: 'rank/total/eta 또는 READY(입장 토큰). 프론트 폴링용.',
  })
  @ApiOkResponse({ type: QueueStatusDto })
  status(@Param('concertId') concertId: string, @CurrentUser() user: AuthUser) {
    return this.queue.status(concertId, user.userId);
  }

  @Post(':concertId/leave')
  @HttpCode(200)
  @ApiOperation({ summary: '대기 포기', description: '대기열/활성에서 제거.' })
  leave(@Param('concertId') concertId: string, @CurrentUser() user: AuthUser) {
    return this.queue.leave(concertId, user.userId);
  }
}
