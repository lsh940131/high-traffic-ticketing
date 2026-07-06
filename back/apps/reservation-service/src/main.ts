import { bootstrapService } from '@app/common';
import { ReservationServiceModule } from './reservation/reservation-service.module';

void bootstrapService(ReservationServiceModule, {
  name: 'reservation-service',
  port: Number(process.env.PORT ?? 3102),
});
