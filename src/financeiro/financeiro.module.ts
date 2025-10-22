import { Module } from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';
import { FinanceiroController } from './financeiro.controller';

@Module({
  providers: [FinanceiroService],
  controllers: [FinanceiroController]
})
export class FinanceiroModule {}
