import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { VigilantesCrudService } from './vigilantes-crud.service';

@ApiTags('Vigilantes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('vigilantes')
export class VigilantesCrudController {
  constructor(private readonly service: VigilantesCrudService) {}

  @Get()
  listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listar(Number(page) || 1, Number(limit) || 20, search);
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.service.obter(id);
  }

  @Post()
  criar(@Body() dados: any) {
    return this.service.criar(dados);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() dados: any) {
    return this.service.atualizar(id, dados);
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.service.remover(id);
  }
}
