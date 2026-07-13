import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IntegracoesService } from './integracoes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@ApiTags('Integrações')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('integracoes')
export class IntegracoesController {
  constructor(private readonly svc: IntegracoesService) {}

  @Get()
  listar() {
    return this.svc.listar();
  }

  @Get(':canal')
  obter(@Param('canal') canal: string) {
    return this.svc.obter(canal);
  }

  @Put(':canal')
  gravar(@Param('canal') canal: string, @Body() body: any) {
    return this.svc.gravar(canal, body);
  }

  @Put(':canal/ativar')
  ativar(@Param('canal') canal: string) {
    return this.svc.ativar(canal);
  }

  @Put(':canal/desativar')
  desativar(@Param('canal') canal: string) {
    return this.svc.desativar(canal);
  }
}
