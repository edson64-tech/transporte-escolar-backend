import { Module } from '@nestjs/common';
import { ErpService } from './erp.service';
import { ErpController } from './erp.controller';
import { AgenteController } from './agente.controller';
import { AgenteGuard } from './agente.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ErpController, AgenteController],
  providers: [ErpService, AgenteGuard],
  exports: [ErpService],
})
export class ErpModule {}
