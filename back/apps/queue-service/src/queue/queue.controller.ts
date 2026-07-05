import { Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { QueueService } from './queue.service';

@Controller('queue')
export class QueueController {
  constructor(private readonly queue: QueueService) {}

  @Post(':eventId/enter')
  enter(@Param('eventId') eventId: string, @Headers('x-user-id') userId = 'anon') {
    return this.queue.enter(eventId, userId);
  }

  @Get(':eventId/status')
  status(@Param('eventId') eventId: string, @Headers('x-user-id') userId = 'anon') {
    return this.queue.status(eventId, userId);
  }
}
