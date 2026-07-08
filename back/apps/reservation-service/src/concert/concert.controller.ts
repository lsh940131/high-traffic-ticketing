import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConcertService } from './concert.service';
import { ConcertDetailDto, ConcertListItemDto } from './dto';

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
}
