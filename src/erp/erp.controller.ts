import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { ErpService } from './erp.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('erp')
export class ErpController {
  constructor(private readonly svc: ErpService) {}

  // Empresas
  @Post('empresas') criarEmpresa(@Body() dto: any) { return this.svc.criarEmpresa(dto); }
  @Get('empresas') listarEmpresas() { return this.svc.listarEmpresas(); }
  @Put('empresas/:id') atualizarEmpresa(@Param('id') id: string, @Body() dto: any) { return this.svc.atualizarEmpresa(id, dto); }

  // Agentes
  @Post('agentes') criarAgente(@Body() b: { nome: string }) { return this.svc.criarAgente(b.nome); }
  @Get('agentes') listarAgentes() { return this.svc.listarAgentes(); }

  // Fila
  @Get('jobs') listarJobs(@Query('estado') estado?: string) { return this.svc.listarJobs(estado); }
  @Post('empresas/:id/testar-ligacao') testar(@Param('id') id: string) { return this.svc.enfileirarTesteLigacao(id); }

  // Emissão manual (mensalidade + empresa)
  @Post('fatura-multipla')
  emitirMultipla(@Body() b: { mensalidade_ids: string[]; empresa_id: string }) {
    return this.svc.emitirFaturaPorCobrancas(b.mensalidade_ids, b.empresa_id);
  }

  @Post('fatura/:mensalidade_id/:empresa_id')
  emitir(@Param('mensalidade_id') m: string, @Param('empresa_id') e: string) {
    return this.svc.emitirFaturaPorMensalidade(m, e);
  }
}
