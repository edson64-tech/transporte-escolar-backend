import { Module } from '@nestjs/common';
import { AdminExtrasService } from './admin-extras.service';
import { AdminExtrasController } from './admin-extras.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AdminExtrasService],
  controllers: [AdminExtrasController],
})
export class AdminExtrasModule {}
