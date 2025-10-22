import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Motoristas (App Motorista)')
@Controller('drivers')
export class DriversController {
  constructor(private readonly svc: DriversService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login do motorista' })
  async login(@Body() body: { telefone: string; senha: string }) {
    return this.svc.login(body.telefone, body.senha);
  }

  @Get('agenda/:motorista_id')
  @ApiOperation({ summary: 'Listar agenda de viagens do motorista' })
  async agenda(@Param('motorista_id') motorista_id: string) {
    return this.svc.getAgenda(motorista_id);
  }

  @Put('start/:viagem_id')
  @ApiOperation({ summary: 'Iniciar viagem' })
  async start(@Param('viagem_id') viagem_id: string) {
    return this.svc.startViagem(viagem_id);
  }

  @Put('stop/:viagem_id')
  @ApiOperation({ summary: 'Finalizar viagem' })
  async stop(@Param('viagem_id') viagem_id: string) {
    return this.svc.stopViagem(viagem_id);
  }

  @Post('embarque')
  @ApiOperation({ summary: 'Registrar embarque/desembarque de aluno' })
  async embarque(@Body() body: any) {
    return this.svc.registarEmbarque(body);
  }

  @Post('position')
  @ApiOperation({ summary: 'Reportar posição GPS' })
  async pos(@Body() body: { viagemCodigo: string; lat: number; lng: number }) {
    return this.svc.reportarPosicao(body.viagemCodigo, body.lat, body.lng);
  }

  @Get('alerts/:motorista_id')
  @ApiOperation({ summary: 'Buscar alertas do motorista' })
  async getAlerts(@Param('motorista_id') motorista_id: string) {
    return this.svc.getAlerts(motorista_id);
  }

  @Post('alerts/:alerta_id/read')
  @ApiOperation({ summary: 'Marcar alerta como lido' })
  async markAlertSent(@Param('alerta_id') alerta_id: string) {
    return this.svc.markAlertSent(alerta_id);
  }

  // 🆕 NOVO ENDPOINT - Buscar motoristas próximos (PostGIS)
  @Get('proximos')
  @ApiOperation({ summary: 'Buscar motoristas próximos de uma localização' })
  @ApiQuery({ name: 'lat', required: true, example: -8.8383 })
  @ApiQuery({ name: 'lng', required: true, example: 13.2344 })
  @ApiQuery({ name: 'raio', required: false, example: 5, description: 'Raio em KM' })
  async buscarProximos(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('raio') raio?: string,
  ) {
    return this.svc.buscarMotoristasProximos(
      parseFloat(lat),
      parseFloat(lng),
      raio ? parseFloat(raio) : 5
    );
  }
}
