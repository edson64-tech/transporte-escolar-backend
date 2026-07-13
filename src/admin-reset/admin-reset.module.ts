import { Module } from '@nestjs/common';
import { AdminResetController } from './admin-reset.controller';
import { AdminResetService } from './admin-reset.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminResetController],
  providers: [AdminResetService],
})
export class AdminResetModule {}
