import { Module } from '@nestjs/common';
import { IntegracoesService } from './integracoes.service';
import { IntegracoesController } from './integracoes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [IntegracoesService],
  controllers: [IntegracoesController],
  exports: [IntegracoesService],
})
export class IntegracoesModule {}
