import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue.service';

/** 1초 주기로 등록된 모든 콘서트 큐를 펌프(만료 회수 + 정원만큼 입장). */
@Injectable()
export class QueueAdmissionWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  constructor(private readonly queue: QueueService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.queue.pumpAll().catch(() => {});
    }, 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
