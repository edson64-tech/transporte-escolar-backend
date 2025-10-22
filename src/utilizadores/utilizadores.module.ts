import { Module } from '@nestjs/common';
import { UtilizadoresService } from './utilizadores.service';
import { UtilizadoresController } from './utilizadores.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [UtilizadoresController],
  providers: [UtilizadoresService, PrismaService],
  exports: [UtilizadoresService],
})
export class UtilizadoresModule {}
