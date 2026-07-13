import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CobrancaService } from './cobranca.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@ApiTags('cobranca')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('cobranca')
export class CobrancaController {
  constructor(private readonly service: CobrancaService) {}

  @Post('processar')
  @ApiOperation({ summary: 'Processa o calendário de cobrança. Aceita data simulada para teste (YYYY-MM-DD).' })
  async processar(@Body() body: { data_simulada?: string }) {
    return this.service.processarCalendario(body?.data_simulada);
  }

  @Post('pagar/:mensalidadeId')
  @ApiOperation({ summary: 'Marca uma mensalidade como paga (reativa o aluno se estava cortado).' })
  async pagar(@Param('mensalidadeId') id: string) {
    return this.service.marcarPago(id);
  }

  @Get('dashboard-cortes')
  @ApiOperation({ summary: 'Lista de alunos cortados por falta de pagamento.' })
  async cortes() {
    return this.service.dashboardCortes();
  }
}
