import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { EntryTokenGuard } from '@app/common';
import { ConcertService } from './concert.service';
import { BlockSeatsDto, ConcertDetailDto, ConcertListItemDto, SeatMapDto } from './dto';

@ApiTags('concerts')
@Controller('concerts')
export class ConcertController {
  constructor(private readonly concerts: ConcertService) {}

  @Get()
  @ApiOperation({
    summary: '공연 목록',
    description: '홈에 노출할 공연 목록(공연장·최저가·잔여좌석 포함). 공개 — 로그인 불필요.',
  })
  @ApiOkResponse({ type: [ConcertListItemDto], description: '공연 목록' })
  list() {
    return this.concerts.list();
  }

  @Get(':id')
  @ApiOperation({
    summary: '공연 상세',
    description: '공연 상세 정보 + 상세 안내 이미지 + 등급별 가격/잔여. 공개 — 로그인 불필요.',
  })
  @ApiOkResponse({ type: ConcertDetailDto, description: '공연 상세' })
  @ApiNotFoundResponse({ description: '해당 공연 없음' })
  detail(@Param('id') id: string) {
    return this.concerts.detail(id);
  }

  @Get(':id/seatmap')
  @UseGuards(EntryTokenGuard)
  @ApiHeader({ name: 'x-entry-token', description: '대기열 입장 토큰', required: true })
  @ApiOperation({
    summary: '좌석맵(블록 요약)',
    description:
      '블록(층×구역)별 잔여 + 등급 요약. 진입 시 1회. 개별 좌석은 블록 조회로. 입장 토큰 필요.',
  })
  @ApiOkResponse({ type: SeatMapDto, description: '좌석맵 요약' })
  @ApiNotFoundResponse({ description: '해당 공연 없음' })
  seatmap(@Param('id') id: string) {
    return this.concerts.seatmap(id);
  }

  @Get(':id/seats')
  @UseGuards(EntryTokenGuard)
  @ApiHeader({ name: 'x-entry-token', description: '대기열 입장 토큰', required: true })
  @ApiQuery({
    name: 'block',
    required: true,
    example: '103',
    description: '블록 ID (예: 103, STANDING)',
  })
  @ApiOperation({
    summary: '블록 좌석(on-demand)',
    description: '블록 클릭 시 그 블록 좌석 + 실시간 상태(AVAILABLE/HELD/SOLD). 입장 토큰 필요.',
  })
  @ApiOkResponse({ type: BlockSeatsDto, description: '블록 좌석' })
  @ApiNotFoundResponse({ description: '해당 공연/블록 없음' })
  seats(@Param('id') id: string, @Query('block') block: string) {
    return this.concerts.blockSeats(id, block);
  }
}
