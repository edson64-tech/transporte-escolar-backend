import { 
  Controller, Get, Param, Query, Post, Body, UseGuards, Put, Delete, NotFoundException 
} from '@nestjs/common';
import { ParentsService } from './parents.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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

  @Get('students')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENCARREGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista alunos do encarregado (PROTEGIDO)' })
  @ApiQuery({ name: 'telefone', required: true, example: '923456789' })
  async myStudents(@Query('telefone') telefone: string) {
    return this.svc.myStudents(telefone);
  }

  @Get('live/:aluno_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENCARREGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tracking em tempo real do aluno (PROTEGIDO)' })
  async live(@Param('aluno_id') id: string) {
    return this.svc.live(id);
  }

  @Get('billing/:aluno_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENCARREGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Histórico financeiro (PROTEGIDO)' })
  async billing(@Param('aluno_id') id: string) {
    return this.svc.billing(id);
  }

  @Post('inscricao')
  @ApiOperation({ summary: 'Criar nova inscrição (PÚBLICO)' })
  async criarInscricao(@Body() body: any) {
    return this.svc.criarInscricao(body);
  }

  @Get('inscricoes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENCARREGADO)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar inscrições (PROTEGIDO)' })
  @ApiQuery({ name: 'encarregado_id', required: true })
  async listarInscricoes(@Query('encarregado_id') encarregado_id: string) {
    return this.svc.listarInscricoes(encarregado_id);
  }

  @Get('alunos-proximos')
  @ApiOperation({ summary: 'Buscar alunos próximos (PÚBLICO)' })
  @ApiQuery({ name: 'lat', required: true, example: -8.8383 })
  @ApiQuery({ name: 'lng', required: true, example: 13.2344 })
  @ApiQuery({ name: 'raio', required: false, example: 2 })
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
  // 🔐 MÓDULO 1: CRUD DE ALUNOS
  // ============================================================

  @Get('admin/alunos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar alunos (ADMIN)' })
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
      this.prisma.alunos.findMany({ where, skip, take, include: { encarregados: { select: { nome: true, telefone: true } } }, orderBy: { nome: 'asc' } }),
      this.prisma.alunos.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/alunos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes aluno (ADMIN)' })
  async adminGetAluno(@Param('id') id: string) {
    const aluno = await this.prisma.alunos.findUnique({
      where: { aluno_id: id },
      include: { encarregados: true, adesoes_servico: { include: { rotas: true } }, pagamentos: { take: 10, orderBy: { data_pagamento: 'desc' } } },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');
    return aluno;
  }

  @Post('admin/alunos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar aluno (ADMIN)' })
  async adminCreateAluno(@Body() data: any) {
    return await this.prisma.alunos.create({ data: { ...data, status: data.status || 'ativo', ativo: true }, include: { encarregados: { select: { nome: true } } } });
  }

  @Put('admin/alunos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar aluno (ADMIN)' })
  async adminUpdateAluno(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.alunos.findUnique({ where: { aluno_id: id } });
    if (!existe) throw new NotFoundException('Aluno não encontrado');
    return await this.prisma.alunos.update({ where: { aluno_id: id }, data });
  }

  @Delete('admin/alunos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desativar aluno (ADMIN)' })
  async adminDeleteAluno(@Param('id') id: string) {
    const existe = await this.prisma.alunos.findUnique({ where: { aluno_id: id } });
    if (!existe) throw new NotFoundException('Aluno não encontrado');
    return await this.prisma.alunos.update({ where: { aluno_id: id }, data: { ativo: false, status: 'inativo' } });
  }

  // ============================================================
  // 🔐 MÓDULO 2: CRUD DE ENCARREGADOS
  // ============================================================

  @Get('admin/encarregados')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar encarregados (ADMIN)' })
  async adminListEncarregados(@Query() query: any) {
    const { page = 1, limit = 50, search } = query;
    const where: any = {};
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telefone: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.encarregados.findMany({ where, skip, take, include: { alunos: { select: { nome: true, codigo_aluno: true } } }, orderBy: { nome: 'asc' } }),
      this.prisma.encarregados.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/encarregados/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes encarregado (ADMIN)' })
  async adminGetEncarregado(@Param('id') id: string) {
    const enc = await this.prisma.encarregados.findUnique({
      where: { encarregado_id: id },
      include: { alunos: { include: { adesoes_servico: { include: { rotas: true } }, pagamentos: { take: 5, orderBy: { data_pagamento: 'desc' } } } } },
    });
    if (!enc) throw new NotFoundException('Encarregado não encontrado');
    return enc;
  }

  @Post('admin/encarregados')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar encarregado (ADMIN)' })
  async adminCreateEncarregado(@Body() data: any) {
    if (data.senha) {
      const senha = data.senha;
      delete data.senha;
      data.senha = await bcrypt.hash(senha, 10);
    }
    return await this.prisma.encarregados.create({ data, include: { alunos: { select: { nome: true } } } });
  }

  @Put('admin/encarregados/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar encarregado (ADMIN)' })
  async adminUpdateEncarregado(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.encarregados.findUnique({ where: { encarregado_id: id } });
    if (!existe) throw new NotFoundException('Encarregado não encontrado');
    if (data.senha) {
      const senha = data.senha;
      delete data.senha;
      data.senha = await bcrypt.hash(senha, 10);
    }
    return await this.prisma.encarregados.update({ where: { encarregado_id: id }, data });
  }

  @Delete('admin/encarregados/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar encarregado (ADMIN)' })
  async adminDeleteEncarregado(@Param('id') id: string) {
    const existe = await this.prisma.encarregados.findUnique({ where: { encarregado_id: id } });
    if (!existe) throw new NotFoundException('Encarregado não encontrado');
    return await this.prisma.encarregados.delete({ where: { encarregado_id: id } });
  }

  // ============================================================
  // 🔐 MÓDULO 3: CRUD DE ROTAS
  // ============================================================

  @Get('admin/rotas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar rotas (ADMIN)' })
  async adminListRotas(@Query() query: any) {
    const { page = 1, limit = 50, search } = query;
    const where: any = {};
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.rotas.findMany({ where, skip, take, include: { escolas: { select: { nome: true } }, campi: { select: { nome: true } } }, orderBy: { nome: 'asc' } }),
      this.prisma.rotas.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/rotas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERADOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes rota (ADMIN)' })
  async adminGetRota(@Param('id') id: string) {
    const rota = await this.prisma.rotas.findUnique({
      where: { rota_id: id },
      include: { escolas: true, campi: true, adesoes_servico: { include: { alunos: { select: { nome: true, codigo_aluno: true } } } } },
    });
    if (!rota) throw new NotFoundException('Rota não encontrada');
    return rota;
  }

  @Post('admin/rotas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar rota (ADMIN)' })
  async adminCreateRota(@Body() data: any) {
    return await this.prisma.rotas.create({ data, include: { escolas: true, campi: true } });
  }

  @Put('admin/rotas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar rota (ADMIN)' })
  async adminUpdateRota(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.rotas.findUnique({ where: { rota_id: id } });
    if (!existe) throw new NotFoundException('Rota não encontrada');
    return await this.prisma.rotas.update({ where: { rota_id: id }, data });
  }

  @Delete('admin/rotas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar rota (ADMIN)' })
  async adminDeleteRota(@Param('id') id: string) {
    const existe = await this.prisma.rotas.findUnique({ where: { rota_id: id } });
    if (!existe) throw new NotFoundException('Rota não encontrada');
    return await this.prisma.rotas.delete({ where: { rota_id: id } });
  }

  // ============================================================
  // 🔐 MÓDULO 4: CRUD DE VIAGENS
  // ============================================================

  @Get('admin/viagens')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar viagens (ADMIN)' })
  async adminListViagens(@Query() query: any) {
    const { page = 1, limit = 50, data: dataFiltro } = query;
    const where: any = {};
    if (dataFiltro) where.data = new Date(dataFiltro);
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.viagens.findMany({ where, skip, take, include: { rotas: { select: { nome: true, codigo: true } }, viaturas: { select: { matricula: true, marca: true, modelo: true } } }, orderBy: { data: 'desc' } }),
      this.prisma.viagens.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/viagens/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes viagem (ADMIN)' })
  async adminGetViagem(@Param('id') id: string) {
    const viagem = await this.prisma.viagens.findUnique({
      where: { viagem_id: id },
      include: { rotas: true, viaturas: true, aluno_viagem: { include: { alunos: { select: { nome: true, codigo_aluno: true } } } } },
    });
    if (!viagem) throw new NotFoundException('Viagem não encontrada');
    return viagem;
  }

  @Post('admin/viagens')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar viagem (ADMIN)' })
  async adminCreateViagem(@Body() data: any) {
    return await this.prisma.viagens.create({ data, include: { rotas: true, viaturas: true } });
  }

  @Put('admin/viagens/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar viagem (ADMIN)' })
  async adminUpdateViagem(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.viagens.findUnique({ where: { viagem_id: id } });
    if (!existe) throw new NotFoundException('Viagem não encontrada');
    return await this.prisma.viagens.update({ where: { viagem_id: id }, data });
  }

  @Delete('admin/viagens/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar viagem (ADMIN)' })
  async adminDeleteViagem(@Param('id') id: string) {
    const existe = await this.prisma.viagens.findUnique({ where: { viagem_id: id } });
    if (!existe) throw new NotFoundException('Viagem não encontrada');
    return await this.prisma.viagens.delete({ where: { viagem_id: id } });
  }

  // ============================================================
  // 🔐 MÓDULO 5: CRUD DE ESCOLAS
  // ============================================================

  @Get('admin/escolas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar escolas (ADMIN)' })
  async adminListEscolas(@Query() query: any) {
    const { page = 1, limit = 50, search } = query;
    const where: any = {};
    if (search) where.nome = { contains: search, mode: 'insensitive' };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.escolas.findMany({ where, skip, take, include: { campi: { select: { nome: true } } }, orderBy: { nome: 'asc' } }),
      this.prisma.escolas.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/escolas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes escola (ADMIN)' })
  async adminGetEscola(@Param('id') id: string) {
    const escola = await this.prisma.escolas.findUnique({
      where: { escola_id: id },
      include: { campi: true, rotas: { include: { adesoes_servico: true } } },
    });
    if (!escola) throw new NotFoundException('Escola não encontrada');
    return escola;
  }

  @Post('admin/escolas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar escola (ADMIN)' })
  async adminCreateEscola(@Body() data: any) {
    return await this.prisma.escolas.create({ data, include: { campi: true } });
  }

  @Put('admin/escolas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar escola (ADMIN)' })
  async adminUpdateEscola(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.escolas.findUnique({ where: { escola_id: id } });
    if (!existe) throw new NotFoundException('Escola não encontrada');
    return await this.prisma.escolas.update({ where: { escola_id: id }, data });
  }

  @Delete('admin/escolas/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar escola (ADMIN)' })
  async adminDeleteEscola(@Param('id') id: string) {
    const existe = await this.prisma.escolas.findUnique({ where: { escola_id: id } });
    if (!existe) throw new NotFoundException('Escola não encontrada');
    return await this.prisma.escolas.delete({ where: { escola_id: id } });
  }

  // ============================================================
  // 🔐 MÓDULO 6: CRUD DE MENSALIDADES
  // ============================================================

  @Get('admin/mensalidades')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar mensalidades (ADMIN)' })
  async adminListMensalidades(@Query() query: any) {
    const { page = 1, limit = 50, aluno_id, status } = query;
    const where: any = {};
    if (aluno_id) where.aluno_id = aluno_id;
    if (status) where.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.mensalidades.findMany({ where, skip, take, include: { alunos: { select: { nome: true, codigo_aluno: true } }, ano_lectivo: { select: { nome: true, ativo: true } } }, orderBy: { mes: 'desc' } }),
      this.prisma.mensalidades.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/mensalidades/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes mensalidade (ADMIN)' })
  async adminGetMensalidade(@Param('id') id: string) {
    const mens = await this.prisma.mensalidades.findUnique({
      where: { mensalidade_id: id },
      include: { alunos: true, ano_lectivo: true, movimentos_mensalidade: true },
    });
    if (!mens) throw new NotFoundException('Mensalidade não encontrada');
    return mens;
  }

  @Post('admin/mensalidades')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar mensalidade (ADMIN)' })
  async adminCreateMensalidade(@Body() data: any) {
    return await this.prisma.mensalidades.create({ data: { ...data, status: data.status || 'pendente' }, include: { alunos: true, ano_lectivo: true } });
  }

  @Put('admin/mensalidades/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar mensalidade (ADMIN)' })
  async adminUpdateMensalidade(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.mensalidades.findUnique({ where: { mensalidade_id: id } });
    if (!existe) throw new NotFoundException('Mensalidade não encontrada');
    return await this.prisma.mensalidades.update({ where: { mensalidade_id: id }, data });
  }

  @Delete('admin/mensalidades/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar mensalidade (ADMIN)' })
  async adminDeleteMensalidade(@Param('id') id: string) {
    const existe = await this.prisma.mensalidades.findUnique({ where: { mensalidade_id: id } });
    if (!existe) throw new NotFoundException('Mensalidade não encontrada');
    return await this.prisma.mensalidades.delete({ where: { mensalidade_id: id } });
  }

  // ============================================================
  // 🔐 MÓDULO 7: CRUD DE PAGAMENTOS
  // ============================================================

  @Get('admin/pagamentos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar pagamentos (ADMIN)' })
  async adminListPagamentos(@Query() query: any) {
    const { page = 1, limit = 50, aluno_id, status } = query;
    const where: any = {};
    if (aluno_id) where.aluno_id = aluno_id;
    if (status) where.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.pagamentos.findMany({ where, skip, take, include: { alunos: { select: { nome: true, codigo_aluno: true } } }, orderBy: { data_pagamento: 'desc' } }),
      this.prisma.pagamentos.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/pagamentos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes pagamento (ADMIN)' })
  async adminGetPagamento(@Param('id') id: string) {
    const pag = await this.prisma.pagamentos.findUnique({ where: { pagamento_id: id }, include: { alunos: true } });
    if (!pag) throw new NotFoundException('Pagamento não encontrado');
    return pag;
  }

  @Post('admin/pagamentos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar pagamento (ADMIN)' })
  async adminCreatePagamento(@Body() data: any) {
    return await this.prisma.pagamentos.create({ data: { ...data, status: data.status || 'pendente' }, include: { alunos: true } });
  }

  @Put('admin/pagamentos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar pagamento (ADMIN)' })
  async adminUpdatePagamento(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.pagamentos.findUnique({ where: { pagamento_id: id } });
    if (!existe) throw new NotFoundException('Pagamento não encontrado');
    return await this.prisma.pagamentos.update({ where: { pagamento_id: id }, data });
  }

  @Delete('admin/pagamentos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar pagamento (ADMIN)' })
  async adminDeletePagamento(@Param('id') id: string) {
    const existe = await this.prisma.pagamentos.findUnique({ where: { pagamento_id: id } });
    if (!existe) throw new NotFoundException('Pagamento não encontrado');
    return await this.prisma.pagamentos.delete({ where: { pagamento_id: id } });
  }

  // ============================================================
  // 🔐 MÓDULO 8: CRUD DE ANO LETIVO
  // ============================================================

  @Get('admin/ano-letivo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar anos letivos (ADMIN)' })
  async adminListAnoLetivo(@Query() query: any) {
    const { page = 1, limit = 50 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.ano_lectivo.findMany({ skip, take, orderBy: { ano_inicio: 'desc' } }),
      this.prisma.ano_lectivo.count(),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/ano-letivo/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes ano letivo (ADMIN)' })
  async adminGetAnoLetivo(@Param('id') id: string) {
    const ano = await this.prisma.ano_lectivo.findUnique({
      where: { ano_lectivo_id: id },
      include: { mensalidades: { take: 10 }, adesoes_servico: { take: 10 } },
    });
    if (!ano) throw new NotFoundException('Ano letivo não encontrado');
    return ano;
  }

  @Post('admin/ano-letivo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar ano letivo (ADMIN)' })
  async adminCreateAnoLetivo(@Body() body: any) {
    const data: any = { ...body };
    if (!data.data_inicio) data.data_inicio = new Date(`${data.ano_inicio}-01-01`);
    if (!data.data_fim) data.data_fim = new Date(`${data.ano_inicio}-12-31`);
    delete data.ano_fim; // Campo não existe no schema
    return await this.prisma.ano_lectivo.create({ data });
  }

  @Put('admin/ano-letivo/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar ano letivo (ADMIN)' })
  async adminUpdateAnoLetivo(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.ano_lectivo.findUnique({ where: { ano_lectivo_id: id } });
    if (!existe) throw new NotFoundException('Ano letivo não encontrado');
    if (data.ano_inicio && !data.data_inicio) data.data_inicio = new Date(`${data.ano_inicio}-01-01`);
    if (data.ano_inicio && !data.data_fim) data.data_fim = new Date(`${data.ano_inicio}-12-31`);
    return await this.prisma.ano_lectivo.update({ where: { ano_lectivo_id: id }, data });
  }

  @Delete('admin/ano-letivo/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar ano letivo (ADMIN)' })
  async adminDeleteAnoLetivo(@Param('id') id: string) {
    const existe = await this.prisma.ano_lectivo.findUnique({ where: { ano_lectivo_id: id } });
    if (!existe) throw new NotFoundException('Ano letivo não encontrado');
    return await this.prisma.ano_lectivo.delete({ where: { ano_lectivo_id: id } });
  }

  // ============================================================
  // 🔐 MÓDULO 9: CRUD DE CONTRATOS DE SERVIÇO
  // ============================================================

  @Get('admin/contratos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar contratos (ADMIN)' })
  async adminListContratos(@Query() query: any) {
    const { page = 1, limit = 50, aluno_id, ativo } = query;
    const where: any = {};
    if (aluno_id) where.aluno_id = aluno_id;
    if (ativo !== undefined) where.ativo = ativo === 'true';
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.contratos_servico.findMany({ where, skip, take, include: { alunos: { select: { nome: true, codigo_aluno: true } }, rotas: { select: { nome: true, codigo: true } }, ano_lectivo: { select: { nome: true } } }, orderBy: { created_at: 'desc' } }),
      this.prisma.contratos_servico.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/contratos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes contrato (ADMIN)' })
  async adminGetContrato(@Param('id') id: string) {
    const contrato = await this.prisma.contratos_servico.findUnique({
      where: { contrato_id: id },
      include: { alunos: true, rotas: true, ano_lectivo: true },
    });
    if (!contrato) throw new NotFoundException('Contrato não encontrado');
    return contrato;
  }

  @Post('admin/contratos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar contrato (ADMIN)' })
  async adminCreateContrato(@Body() data: any) {
    return await this.prisma.contratos_servico.create({ data, include: { alunos: true, rotas: true, ano_lectivo: true } });
  }

  @Put('admin/contratos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar contrato (ADMIN)' })
  async adminUpdateContrato(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.contratos_servico.findUnique({ where: { contrato_id: id } });
    if (!existe) throw new NotFoundException('Contrato não encontrado');
    return await this.prisma.contratos_servico.update({ where: { contrato_id: id }, data });
  }

  @Delete('admin/contratos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar contrato (ADMIN)' })
  async adminDeleteContrato(@Param('id') id: string) {
    const existe = await this.prisma.contratos_servico.findUnique({ where: { contrato_id: id } });
    if (!existe) throw new NotFoundException('Contrato não encontrado');
    return await this.prisma.contratos_servico.delete({ where: { contrato_id: id } });
  }

  // ============================================================
  // 🔐 MÓDULO 10: CRUD DE ADESÕES DE SERVIÇO
  // ============================================================

  @Get('admin/adesoes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar adesões (ADMIN)' })
  async adminListAdesoes(@Query() query: any) {
    const { page = 1, limit = 50, aluno_id, status } = query;
    const where: any = {};
    if (aluno_id) where.aluno_id = aluno_id;
    if (status) where.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.adesoes_servico.findMany({ where, skip, take, include: { alunos: { select: { nome: true, codigo_aluno: true } }, rotas: { select: { nome: true, codigo: true } }, ano_lectivo: { select: { nome: true } } }, orderBy: { created_at: 'desc' } }),
      this.prisma.adesoes_servico.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/adesoes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes adesão (ADMIN)' })
  async adminGetAdesao(@Param('id') id: string) {
    const adesao = await this.prisma.adesoes_servico.findUnique({
      where: { adesao_id: id },
      include: { alunos: true, rotas: true, ano_lectivo: true },
    });
    if (!adesao) throw new NotFoundException('Adesão não encontrada');
    return adesao;
  }

  @Post('admin/adesoes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar adesão (ADMIN)' })
  async adminCreateAdesao(@Body() data: any) {
    return await this.prisma.adesoes_servico.create({ data, include: { alunos: true, rotas: true, ano_lectivo: true } });
  }

  @Put('admin/adesoes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar adesão (ADMIN)' })
  async adminUpdateAdesao(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.adesoes_servico.findUnique({ where: { adesao_id: id } });
    if (!existe) throw new NotFoundException('Adesão não encontrada');
    return await this.prisma.adesoes_servico.update({ where: { adesao_id: id }, data });
  }

  @Delete('admin/adesoes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar adesão (ADMIN)' })
  async adminDeleteAdesao(@Param('id') id: string) {
    const existe = await this.prisma.adesoes_servico.findUnique({ where: { adesao_id: id } });
    if (!existe) throw new NotFoundException('Adesão não encontrada');
    return await this.prisma.adesoes_servico.delete({ where: { adesao_id: id } });
  }

  // ============================================================
  // 🔐 MÓDULO 11: CRUD DE ARTIGOS DE SERVIÇO
  // ============================================================

  @Get('admin/artigos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar artigos (ADMIN)' })
  async adminListArtigos(@Query() query: any) {
    const { page = 1, limit = 50, search, ativo } = query;
    const where: any = {};
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (ativo !== undefined) where.ativo = ativo === 'true';
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.artigos_servico.findMany({ where, skip, take, orderBy: { codigo: 'asc' } }),
      this.prisma.artigos_servico.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/artigos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes artigo (ADMIN)' })
  async adminGetArtigo(@Param('id') id: string) {
    const artigo = await this.prisma.artigos_servico.findUnique({ where: { artigo_id: id } });
    if (!artigo) throw new NotFoundException('Artigo não encontrado');
    return artigo;
  }

  @Post('admin/artigos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar artigo (ADMIN)' })
  async adminCreateArtigo(@Body() data: any) {
    return await this.prisma.artigos_servico.create({ data });
  }

  @Put('admin/artigos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar artigo (ADMIN)' })
  async adminUpdateArtigo(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.artigos_servico.findUnique({ where: { artigo_id: id } });
    if (!existe) throw new NotFoundException('Artigo não encontrado');
    return await this.prisma.artigos_servico.update({ where: { artigo_id: id }, data });
  }

  @Delete('admin/artigos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar artigo (ADMIN)' })
  async adminDeleteArtigo(@Param('id') id: string) {
    const existe = await this.prisma.artigos_servico.findUnique({ where: { artigo_id: id } });
    if (!existe) throw new NotFoundException('Artigo não encontrado');
    return await this.prisma.artigos_servico.delete({ where: { artigo_id: id } });
  }

  // ============================================================
  // 🔐 MÓDULO 12: CRUD DE PREÇOS DE ROTA
  // ============================================================

  @Get('admin/precos-rota')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar preços de rota (ADMIN)' })
  async adminListPrecosRota(@Query() query: any) {
    const { page = 1, limit = 50, rota_id, ano_lectivo_id } = query;
    const where: any = {};
    if (rota_id) where.rota_id = rota_id;
    if (ano_lectivo_id) where.ano_lectivo_id = ano_lectivo_id;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    const [data, total] = await Promise.all([
      this.prisma.precos_rota.findMany({ where, skip, take, include: { rotas: { select: { nome: true, codigo: true } }, ano_lectivo: { select: { nome: true } } }, orderBy: { created_at: 'desc' } }),
      this.prisma.precos_rota.count({ where }),
    ]);
    return { data, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } };
  }

  @Get('admin/precos-rota/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detalhes preço rota (ADMIN)' })
  async adminGetPrecoRota(@Param('id') id: string) {
    const preco = await this.prisma.precos_rota.findUnique({
      where: { preco_rota_id: id },
      include: { rotas: true, ano_lectivo: true },
    });
    if (!preco) throw new NotFoundException('Preço de rota não encontrado');
    return preco;
  }

  @Post('admin/precos-rota')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar preço rota (ADMIN)' })
  async adminCreatePrecoRota(@Body() data: any) {
    return await this.prisma.precos_rota.create({ data, include: { rotas: true, ano_lectivo: true } });
  }

  @Put('admin/precos-rota/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar preço rota (ADMIN)' })
  async adminUpdatePrecoRota(@Param('id') id: string, @Body() data: any) {
    const existe = await this.prisma.precos_rota.findUnique({ where: { preco_rota_id: id } });
    if (!existe) throw new NotFoundException('Preço de rota não encontrado');
    return await this.prisma.precos_rota.update({ where: { preco_rota_id: id }, data });
  }

  @Delete('admin/precos-rota/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deletar preço rota (ADMIN)' })
  async adminDeletePrecoRota(@Param('id') id: string) {
    const existe = await this.prisma.precos_rota.findUnique({ where: { preco_rota_id: id } });
    if (!existe) throw new NotFoundException('Preço de rota não encontrado');
    return await this.prisma.precos_rota.delete({ where: { preco_rota_id: id } });
  }
}