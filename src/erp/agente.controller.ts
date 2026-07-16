import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AgenteGuard } from './agente.guard';
import { ErpService } from './erp.service';

@UseGuards(AgenteGuard)
@Controller('erp/agente')
export class AgenteController {
  constructor(private readonly svc: ErpService) {}

  @Post('heartbeat')
  heartbeat(@Req() req: any, @Body() body: { versao?: string }) {
    return this.svc.heartbeat(req.agente.agente_id, body?.versao);
  }

  @Get('empresas')
  empresas(@Req() req: any) {
    return this.svc.empresasDoAgente(req.agente.agente_id);
  }

  @Get('jobs')
  jobs(@Req() req: any) {
    return this.svc.buscarJobs(req.agente.agente_id);
  }

  @Post('jobs/:id/resultado')
  resultado(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { sucesso: boolean; resultado?: any; erro?: string; pdf_base64?: string },
  ) {
    return this.svc.entregarResultado(req.agente.agente_id, id, body);
  }
}
