import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppConfigModule } from '@app/config';
import { ProxyController } from './proxy.controller';

@Module({
  imports: [AppConfigModule, HttpModule],
  controllers: [ProxyController],
})
export class GatewayModule {}
