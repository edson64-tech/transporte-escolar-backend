import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Motoristas (App Motorista)')
@Controller('drivers')
export class DriversController {
  constructor(private readonly svc: DriversService) {}

  // ✅ LOGIN - PÚBLICO (sem proteção)
  @Post('login')
  @ApiOperation({ summary: 'Login do motorista' })
  async login(@Body() body: { telefone: string; senha: string }) {
    return this.svc.login(body.telefone, body.senha);
  }

  // 🔐 PROTEGIDO - Só motorista autenticado
  @Get('agenda/:motorista_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MOTORISTA)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar agenda de viagens do motorista' })
  async agenda(@Param('motorista_id') motorista_id: string) {
    return this.svc.getAgenda(motorista_id);
  }

  // 🔐 PROTEGIDO - Só motorista
  @Put('start/:viagem_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MOTORISTA)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar viagem' })
  async start(@Param('viagem_id') viagem_id: string) {
    return this.svc.startViagem(viagem_id);
  }

  // 🔐 PROTEGIDO - Só motorista
  @Put('stop/:viagem_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MOTORISTA)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finalizar viagem' })
  async stop(@Param('viagem_id') viagem_id: string) {
    return this.svc.stopViagem(viagem_id);
  }

  // 🔐 PROTEGIDO - Só motorista
  @Post('embarque')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MOTORISTA)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar embarque/desembarque de aluno' })
  async embarque(@Body() body: any) {
    return this.svc.registarEmbarque(body);
  }

  // 🔐 PROTEGIDO - Só motorista
  @Post('position')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MOTORISTA)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reportar posição GPS' })
  async pos(@Body() body: { viagemCodigo: string; lat: number; lng: number }) {
    return this.svc.reportarPosicao(body.viagemCodigo, body.lat, body.lng);
  }

  // 🔐 PROTEGIDO - Só motorista
  @Get('alerts/:motorista_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MOTORISTA)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar alertas do motorista' })
  async getAlerts(@Param('motorista_id') motorista_id: string) {
    return this.svc.getAlerts(motorista_id);
  }

  // 🔐 PROTEGIDO - Só motorista
  @Post('alerts/:alerta_id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MOTORISTA)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar alerta como lido' })
  async markAlertSent(@Param('alerta_id') alerta_id: string) {
    return this.svc.markAlertSent(alerta_id);
  }

  // ✅ PÚBLICO - Buscar motoristas próximos (PostGIS)
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
