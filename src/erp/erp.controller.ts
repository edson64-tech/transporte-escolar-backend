import { Controller, Post, Param } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
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

  @Post('fatura/:mensalidade_id')
  async emitir(@Param('mensalidade_id') mensalidadeId: string) {
    return this.svc.emitirFaturaPorMensalidade(mensalidadeId);
  }
}
