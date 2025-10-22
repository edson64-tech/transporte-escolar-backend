import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // 🚀 Endpoint usado pelo dashboard do frontend
  @Get('dashboard/hoje')
  getDashboardHoje() {
    return {
      rotas_ativas: 5,
      viagens_em_curso: 2,
      ocorrencias_pendentes: 1,
      pagamentos_pendentes: 3,
      viagens_programadas: 10,
      alunos_transportados: 125,
    };
  }
}
