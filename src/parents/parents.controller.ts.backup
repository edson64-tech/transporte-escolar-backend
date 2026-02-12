import { Controller, Get, Param, Query, Post, Body, UseGuards } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Pais/Encarregados (App Pais)')
@Controller('parents')
export class ParentsController {
  constructor(private readonly svc: ParentsService) {}

  // 🔐 PROTEGIDO - Só encarregado autenticado
  @Get('students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENCARREGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista alunos do encarregado (PROTEGIDO)' })
  @ApiQuery({ 
    name: 'telefone', 
    required: true,
    example: '923456789',
    description: 'Telefone do encarregado'
  })
  async myStudents(@Query('telefone') telefone: string) {
    return this.svc.myStudents(telefone);
  }

  // 🔐 PROTEGIDO - Só encarregado
  @Get('live/:aluno_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENCARREGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tracking em tempo real do aluno (PROTEGIDO)' })
  async live(@Param('aluno_id') id: string) {
    return this.svc.live(id);
  }

  // 🔐 PROTEGIDO - Só encarregado
  @Get('billing/:aluno_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENCARREGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Histórico financeiro (PROTEGIDO)' })
  async billing(@Param('aluno_id') id: string) {
    return this.svc.billing(id);
  }

  // ✅ PÚBLICO - Criar inscrição (primeiro acesso)
  @Post('inscricao')
  @ApiOperation({ summary: 'Criar nova inscrição (PÚBLICO)' })
  async criarInscricao(@Body() body: any) {
    return this.svc.criarInscricao(body);
  }

  // 🔐 PROTEGIDO - Só encarregado
  @Get('inscricoes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENCARREGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar inscrições (PROTEGIDO)' })
  @ApiQuery({ name: 'encarregado_id', required: true })
  async listarInscricoes(@Query('encarregado_id') encarregado_id: string) {
    return this.svc.listarInscricoes(encarregado_id);
  }

  // ✅ PÚBLICO - Buscar alunos próximos
  @Get('alunos-proximos')
  @ApiOperation({ summary: 'Buscar alunos próximos (PÚBLICO)' })
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
