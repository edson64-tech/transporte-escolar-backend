import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@ApiTags('email')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('email')
export class EmailController {
  constructor(private readonly service: EmailService) {}

  @Get('config')
  @ApiOperation({ summary: 'Configuração de email atual (senha mascarada).' })
  async getConfig() { return this.service.getConfig(); }

  @Put('config')
  @ApiOperation({ summary: 'Gravar a configuração SMTP.' })
  async setConfig(@Body() body: any) { return this.service.setConfig(body); }

  @Post('testar')
  @ApiOperation({ summary: 'Envia um email de teste para validar a configuração.' })
  async testar(@Body() body: { para: string }) { return this.service.testar(body?.para); }
}
