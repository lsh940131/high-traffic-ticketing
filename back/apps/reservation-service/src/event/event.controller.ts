import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InventoryService } from '../inventory/inventory.service';

/** event-service를 분리하기 전까지 reservation-service에 흡수된 카탈로그/재고 seed. */
@Controller('events')
export class EventController {
  constructor(private readonly inventory: InventoryService) {}

  // 이벤트 오픈: Redis에 재고 적재
  @Post(':id/open')
  open(@Param('id') id: string, @Body() body: { stock: number }) {
    return this.inventory.seedStock(id, body.stock).then(() => ({ ok: true }));
  }

  @Get(':id/seats')
  seats(@Param('id') _id: string) {
    // TODO: Redis seats 해시 + DB 조인. 데모용 placeholder.
    return [];
  }
}
