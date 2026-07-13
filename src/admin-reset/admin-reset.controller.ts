import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminResetService } from './admin-reset.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@ApiTags('admin-reset')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/reset')
export class AdminResetController {
  constructor(private readonly service: AdminResetService) {}

  @Post()
  @ApiOperation({ summary: 'Apaga dados migrados (Nível 1: alunos; Nível 2: migração completa). Requer confirmação.' })
  async reset(@Body() body: { confirmar: string; nivel: number }) {
    return this.service.reset(Number(body?.nivel), body?.confirmar);
  }
}
