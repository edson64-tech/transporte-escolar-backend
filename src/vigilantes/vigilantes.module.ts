import { Module } from '@nestjs/common';
import { VigilantesController } from './vigilantes.controller';
import { VigilantesService } from './vigilantes.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [VigilantesController],
  providers: [VigilantesService, PrismaService],
})
export class VigilantesModule {}
