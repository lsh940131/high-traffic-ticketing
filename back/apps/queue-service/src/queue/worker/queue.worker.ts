import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue.service';

/** 정원만큼 주기적으로 입장 처리. */
@Injectable()
export class QueueAdmissionWorker implements OnModuleInit {
  private readonly events = ['demo'];
  constructor(private readonly queue: QueueService) {}
  onModuleInit() {
    setInterval(() => this.events.forEach((e) => this.queue.admitBatch(e).catch(() => {})), 5000);
  }
}
