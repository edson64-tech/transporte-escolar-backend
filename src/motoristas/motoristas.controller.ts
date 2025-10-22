import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { MotoristasService } from './motoristas.service';

@Controller('motoristas')
export class MotoristasController {
  constructor(private readonly svc: MotoristasService) {}

  @Get() list() { return this.svc.list(); }
  @Get(':id') find(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}
