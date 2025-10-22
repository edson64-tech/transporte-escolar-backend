import { Module } from '@nestjs/common';
import { OcorrenciasService } from './ocorrencias.service';
import { OcorrenciasController } from './ocorrencias.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [OcorrenciasController],
  providers: [OcorrenciasService, PrismaService],
})
export class OcorrenciasModule {}
