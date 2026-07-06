import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CommonModule } from '@app/common';
import { AppConfigModule } from '@app/config';
import { ProxyController } from './proxy.controller';
import { UpstreamService } from './upstream/upstream.service';

@Module({
  imports: [CommonModule.forRoot('gateway'), AppConfigModule, HttpModule],
  controllers: [ProxyController],
  providers: [UpstreamService],
})
export class GatewayModule {}
