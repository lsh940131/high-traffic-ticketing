import { bootstrapService } from '@app/common';
import { QueueServiceModule } from './queue/queue-service.module';

void bootstrapService(QueueServiceModule, {
  name: 'queue-service',
  port: Number(process.env.PORT ?? 3101),
});
