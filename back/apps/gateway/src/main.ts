import { bootstrapService } from '@app/common';
import { GatewayModule } from './gateway/gateway.module';

void bootstrapService(GatewayModule, {
  name: 'gateway',
  port: Number(process.env.PORT ?? 3000),
  cors: true,
});
