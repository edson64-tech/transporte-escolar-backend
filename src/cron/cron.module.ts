import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { CronEtaService } from './cron-eta.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CronService, CronEtaService],
  exports: [CronService, CronEtaService],
})
export class CronModule {}
