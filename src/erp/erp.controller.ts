import { Controller, Post, Param } from '@nestjs/common';
import { ErpService } from './erp.service';

@Controller('erp')
export class ErpController {
  constructor(private readonly svc: ErpService) {}

  @Post('fatura/:mensalidade_id')
  async emitir(@Param('mensalidade_id') mensalidadeId: string) {
    return this.svc.emitirFaturaPorMensalidade(mensalidadeId);
  }
}
