import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ViaturasService } from './viaturas.service';

@ApiTags('Viaturas')
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
