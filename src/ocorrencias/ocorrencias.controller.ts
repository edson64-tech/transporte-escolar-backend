import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { OcorrenciasService } from './ocorrencias.service';

@Controller('ocorrencias')
export class OcorrenciasController {
  constructor(private readonly svc: OcorrenciasService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
