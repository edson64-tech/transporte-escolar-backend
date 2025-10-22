import { Module } from '@nestjs/common';
import { MotoristasController } from './motoristas.controller';
import { MotoristasService } from './motoristas.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MotoristasController],
  providers: [MotoristasService, PrismaService],
  exports: [MotoristasService],
})
export class MotoristasModule {}
