import { Module } from '@nestjs/common';
import { OtimizacaoService } from './otimizacao.service';
import { OtimizacaoController } from './otimizacao.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OtimizacaoService],
  controllers: [OtimizacaoController],
  exports: [OtimizacaoService],
})
export class OtimizacaoModule {}
