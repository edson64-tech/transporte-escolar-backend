import { Controller, Get, Put, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OtimizacaoService } from './otimizacao.service';

@ApiTags('Otimização')
@Controller('otimizacao')
export class OtimizacaoController {
  constructor(private readonly service: OtimizacaoService) {}

  @Put('rota/:rota_id')
  otimizar(
    @Param('rota_id') rota_id: string,
    @Query('start_lat') start_lat?: string,
    @Query('start_lng') start_lng?: string,
  ) {
    const lat = start_lat ? Number(start_lat) : undefined;
    const lng = start_lng ? Number(start_lng) : undefined;
    return this.service.otimizarRota(rota_id, lat, lng);
  }

  @Get('rota/:rota_id')
  obterAtiva(@Param('rota_id') rota_id: string) {
    return this.service.obterOtimizacaoAtiva(rota_id);
  }
}
