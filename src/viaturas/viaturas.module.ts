import { Module } from '@nestjs/common';
import { ViaturasController } from './viaturas.controller';
import { ViaturasService } from './viaturas.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ViaturasController],
  providers: [ViaturasService, PrismaService],
})
export class ViaturasModule {}
