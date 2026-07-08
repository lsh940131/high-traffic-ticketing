import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConcertService } from './concert.service';
import { ConcertListItemDto } from './dto';

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
}
