import { Module } from '@nestjs/common';
import { ErpModule } from '../erp/erp.module';
import { WebhooksController } from './webhooks.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [ErpModule], controllers: [WebhooksController], providers: [PrismaService] })
export class WebhooksModule {}
