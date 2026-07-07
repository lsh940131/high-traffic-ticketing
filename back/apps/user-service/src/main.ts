import { bootstrapService } from '@app/common';
import { UserServiceModule } from './user/user-service.module';

void bootstrapService(UserServiceModule, {
  name: 'user-service',
  port: Number(process.env.PORT ?? 3104),
});
