import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { AdminExtrasService } from './admin-extras.service';

@ApiTags('Admin Extras')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller()
export class AdminExtrasController {
  constructor(private readonly service: AdminExtrasService) {}

  @Get('notificacoes')
  notificacoes() {
    return this.service.listarNotificacoes();
  }

  @Get('parametros')
  parametros() {
    return this.service.listarParametros();
  }

  @Put('parametros/:chave')
  atualizarParametro(@Param('chave') chave: string, @Body() body: any) {
    return this.service.atualizarParametro(chave, body?.valor);
  }

  @Get('auditoria/acoes')
  acoes() {
    return this.service.listarAcoes();
  }

  @Get('auditoria/acessos')
  acessos() {
    return this.service.listarAcessos();
  }
}
