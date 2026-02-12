import { Controller, Get, Param, Query, Post, Body, UseGuards, Put, Delete, NotFoundException } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Pais/Encarregados (App Pais)')
@Controller('parents')
export class ParentsController {
  constructor(
    private readonly svc: ParentsService,
    private readonly prisma: PrismaService
  ) {}

  // ============================================================
  // 📱 ENDPOINTS DO APP MÓVEL (PROTEGIDOS)
  // ============================================================

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

  // ============================================================
  // 🔐 ENDPOINTS ADMINISTRATIVOS - CRUD DE ALUNOS
  // ============================================================

  @Get('admin/alunos')
  @ApiOperation({ summary: 'Listar todos os alunos (ADMIN)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async adminListAlunos(@Query() query: any) {
    const { page = 1, limit = 50, search } = query;
    const where: any = {};
    
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { codigo_aluno: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      this.prisma.alunos.findMany({
        where,
        skip,
        take,
        include: {
          encarregados: {
            select: { nome: true, telefone: true, email: true },
          },
        },
        orderBy: { nome: 'asc' },
      }),
      this.prisma.alunos.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  @Get('admin/alunos/:id')
  @ApiOperation({ summary: 'Ver detalhes de um aluno (ADMIN)' })
  async adminGetAluno(@Param('id') id: string) {
    const aluno = await this.prisma.alunos.findUnique({
      where: { aluno_id: id },
      include: {
        encarregados: true,
        adesoes_servico: {
          include: { rotas: true },
        },
        pagamentos: {
          take: 10,
          orderBy: { data_pagamento: 'desc' },
        },
      },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    return aluno;
  }

  @Post('admin/alunos')
  @ApiOperation({ summary: 'Criar novo aluno (ADMIN)' })
  async adminCreateAluno(@Body() data: any) {
    return await this.prisma.alunos.create({
      data: {
        ...data,
        status: data.status || 'ativo',
        ativo: true,
      },
      include: {
        encarregados: {
          select: { nome: true, telefone: true },
        },
      },
    });
  }

  @Put('admin/alunos/:id')
  @ApiOperation({ summary: 'Atualizar aluno (ADMIN)' })
  async adminUpdateAluno(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.alunos.findUnique({
      where: { aluno_id: id },
    });

    if (!existe) {
      throw new NotFoundException('Aluno não encontrado');
    }

    return await this.prisma.alunos.update({
      where: { aluno_id: id },
      data,
    });
  }

  @Delete('admin/alunos/:id')
  @ApiOperation({ summary: 'Desativar aluno (ADMIN)' })
  async adminDeleteAluno(@Param('id') id: string) {
    const existe = await this.prisma.alunos.findUnique({
      where: { aluno_id: id },
    });

    if (!existe) {
      throw new NotFoundException('Aluno não encontrado');
    }

    return await this.prisma.alunos.update({
      where: { aluno_id: id },
      data: { ativo: false, status: 'inativo' },
    });
  }
}
