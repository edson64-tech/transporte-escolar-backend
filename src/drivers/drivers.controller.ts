import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { DriversService } from './drivers.service';

@Controller('drivers')
export class DriversController {
  constructor(private readonly svc: DriversService) {}

  // ============================================================
  // 🔑 1. LOGIN DO MOTORISTA
  // ============================================================
  // POST /drivers/login  { telefone, senha }
  @Post('login')
  async login(@Body() body: { telefone: string; senha: string }) {
    return this.svc.login(body.telefone, body.senha);
  }

  // ============================================================
  // 📅 2. LISTAR AGENDA DE VIAGENS
  // ============================================================
  // GET /drivers/agenda/:motorista_id
  @Get('agenda/:motorista_id')
  async agenda(@Param('motorista_id') motorista_id: string) {
    return this.svc.getAgenda(motorista_id);
  }

  // ============================================================
  // ▶️ 3. INICIAR VIAGEM
  // ============================================================
  // PUT /drivers/start/:viagem_id
  @Put('start/:viagem_id')
  async start(@Param('viagem_id') viagem_id: string) {
    return this.svc.startViagem(viagem_id);
  }

  // ============================================================
  // ⏹️ 4. FINALIZAR VIAGEM
  // ============================================================
  // PUT /drivers/stop/:viagem_id
  @Put('stop/:viagem_id')
  async stop(@Param('viagem_id') viagem_id: string) {
    return this.svc.stopViagem(viagem_id);
  }

  // ============================================================
  // 👦 5. REGISTRAR EMBARQUE OU DESEMBARQUE
  // ============================================================
  // POST /drivers/embarque
  // { aluno_id, viagem_id, embarque, latitude, longitude }
  @Post('embarque')
  async embarque(@Body() body: any) {
    return this.svc.registarEmbarque(body);
  }

  // ============================================================
  // 📍 6. ATUALIZAÇÃO DE POSIÇÃO
  // ============================================================
  // POST /drivers/position  { viagemCodigo, lat, lng }
  @Post('position')
  async pos(@Body() body: { viagemCodigo: string; lat: number; lng: number }) {
    return this.svc.reportarPosicao(body.viagemCodigo, body.lat, body.lng);
  }

  // ============================================================
  // 🔔 7. ALERTAS DO MOTORISTA
  // ============================================================
  // GET /drivers/alerts/:motorista_id
  // Retorna alertas ainda não lidos/enviados
  @Get('alerts/:motorista_id')
  async getAlerts(@Param('motorista_id') motorista_id: string) {
    return this.svc.getAlerts(motorista_id);
  }

  // POST /drivers/alerts/:alerta_id/read
  // Marca o alerta como lido/enviado
  @Post('alerts/:alerta_id/read')
  async markAlertSent(@Param('alerta_id') alerta_id: string) {
    return this.svc.markAlertSent(alerta_id);
  }
}
