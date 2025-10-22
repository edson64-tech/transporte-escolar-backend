import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Pais/Encarregados (App Pais)')
@Controller('parents')
export class ParentsController {
  constructor(private readonly svc: ParentsService) {}

  // ✅ CORRIGIDO: Usar TELEFONE em vez de email
  @Get('students')
  @ApiOperation({ summary: 'Lista alunos do encarregado (por telefone)' })
  @ApiQuery({ 
    name: 'telefone', 
    required: true,
    example: '923456789',
    description: 'Telefone do encarregado'
  })
  async myStudents(@Query('telefone') telefone: string) {
    return this.svc.myStudents(telefone);
  }

  @Get('live/:aluno_id')
  @ApiOperation({ summary: 'Última posição GPS do aluno em tempo real' })
  async live(@Param('aluno_id') id: string) {
    return this.svc.live(id);
  }

  @Get('billing/:aluno_id')
  @ApiOperation({ summary: 'Histórico financeiro do aluno' })
  async billing(@Param('aluno_id') id: string) {
    return this.svc.billing(id);
  }

  @Post('inscricao')
  @ApiOperation({ summary: 'Criar nova inscrição/adesão de aluno' })
  async criarInscricao(@Body() body: any) {
    return this.svc.criarInscricao(body);
  }

  @Get('inscricoes')
  @ApiOperation({ summary: 'Listar inscrições do encarregado' })
  @ApiQuery({ name: 'encarregado_id', required: true })
  async listarInscricoes(@Query('encarregado_id') encarregado_id: string) {
    return this.svc.listarInscricoes(encarregado_id);
  }

  @Get('alunos-proximos')
  @ApiOperation({ summary: 'Buscar alunos próximos de uma localização (PostGIS)' })
  @ApiQuery({ name: 'lat', required: true, example: -8.8383 })
  @ApiQuery({ name: 'lng', required: true, example: 13.2344 })
  @ApiQuery({ name: 'raio', required: false, example: 2, description: 'Raio em KM' })
  async buscarAlunosProximos(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('raio') raio?: string,
  ) {
    return this.svc.buscarAlunosProximos(
      parseFloat(lat),
      parseFloat(lng),
      raio ? parseFloat(raio) : 2
    );
  }
}
