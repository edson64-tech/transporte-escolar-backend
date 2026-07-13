import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { ViaturasService } from './viaturas.service';

@ApiTags('Viaturas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('viaturas')
export class ViaturasController {
  constructor(private readonly svc: ViaturasService) {}

  @Get()
  async findAll() {
    return this.svc.list(); // ✅ CORRIGIDO: list() em vez de findAll()
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.svc.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.svc.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
