import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EtaService } from './eta.service';

@ApiTags('ETA')
@Controller('eta')
export class EtaController {
  constructor(private readonly etaService: EtaService) {}

  @Get('viagem/:viagem_id/aluno/:aluno_id')
  obterEtaAluno(
    @Param('viagem_id') viagem_id: string,
    @Param('aluno_id') aluno_id: string,
  ) {
    return this.etaService.obterEtaAluno(viagem_id, aluno_id);
  }

  @Get('viagem/:viagem_id/todas')
  obterEtasViagem(@Param('viagem_id') viagem_id: string) {
    return this.etaService.obterEtasViagem(viagem_id);
  }
}
