import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { ParentsService } from './parents.service';

@Controller('parents')
export class ParentsController {
  constructor(private readonly svc: ParentsService) {}

  // 👨‍👩‍👧 Lista alunos do encarregado (via e-mail do encarregado)
  @Get('students')
  async myStudents(@Query('email') email: string) {
    return this.svc.myStudents(email);
  }

  // 📍 Última posição de um aluno
  @Get('live/:aluno_id')
  async live(@Param('aluno_id') id: string) {
    return this.svc.live(id);
  }

  // 💰 Histórico financeiro
  @Get('billing/:aluno_id')
  async billing(@Param('aluno_id') id: string) {
    return this.svc.billing(id);
  }

  // 📝 Criar nova inscrição (adesão)
  @Post('inscricao')
  async criarInscricao(@Body() body: any) {
    return this.svc.criarInscricao(body);
  }

  // 📋 Listar inscrições de um encarregado
  @Get('inscricoes')
  async listarInscricoes(@Query('encarregado_id') encarregado_id: string) {
    return this.svc.listarInscricoes(encarregado_id);
  }
}
