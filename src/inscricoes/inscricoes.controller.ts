import { Controller, Get, Post, Delete, Body, Query, Param, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InscricoesService } from './inscricoes.service';
import { HubPagamentosService } from './hub-pagamentos.service';
import { FichaPdfService } from './ficha-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@ApiTags('inscricoes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERADOR)
@Controller('inscricoes')
export class InscricoesController {
  constructor(private readonly service: InscricoesService, private readonly hub: HubPagamentosService, private readonly ficha: FichaPdfService) {}

  @Get('verificar-documento')
  @ApiOperation({ summary: 'Verifica se o aluno já existe pelo nº de documento (nova vs reconfirmação).' })
  @ApiQuery({ name: 'doc', required: true })
  async verificarDoc(@Query('doc') doc: string) {
    return this.service.verificarDocumento(doc);
  }

  @Delete('autorizado/:autorizacao_id')
  @ApiOperation({ summary: 'Remove (desativa) uma pessoa autorizada a receber o aluno.' })
  async removerAutorizado(@Param('autorizacao_id') autorizacaoId: string) {
    const a = await this.service['prisma'].autorizacoes_entrega.findUnique({ where: { autorizacao_id: autorizacaoId } });
    if (!a) throw new BadRequestException('Autorização não encontrada');
    await this.service['prisma'].autorizacoes_entrega.update({
      where: { autorizacao_id: autorizacaoId },
      data: { ativo: false },
    });
    return { ok: true };
  }

  @Get('detalhe/:aluno_id')
  @ApiOperation({ summary: 'Consulta completa da inscrição de um aluno (detalhe + anexos + financeiro).' })
  async detalhe(@Param('aluno_id') alunoId: string) {
    return this.service.detalheInscricao(alunoId);
  }

  @Get('pesquisar-aluno')
  @ApiOperation({ summary: 'Pesquisa alunos existentes por nome, código ou referência (reconfirmação dos migrados sem documento).' })
  @ApiQuery({ name: 'q', required: true })
  async pesquisar(@Query('q') q: string) {
    return this.service.pesquisarAluno(q);
  }

  @Get('verificar-encarregado')
  @ApiOperation({ summary: 'Verifica se o encarregado já existe pelo contacto; devolve os filhos associados.' })
  @ApiQuery({ name: 'contacto', required: true })
  async verificarEnc(@Query('contacto') contacto: string) {
    return this.service.verificarEncarregado(contacto);
  }

  @Get('proxima-referencia')
  @ApiOperation({ summary: 'Sugere a próxima referência multicaixa livre (gama 3XXXXXXXX).' })
  @ApiQuery({ name: 'escola', required: false })
  async proximaRef(@Query('escola') escola?: string) {
    const r = await this.hub.gerarCodigoEReferencia(parseInt(escola || '1', 10));
    return { codigo: r.codigo, referencia: r.referencia };
  }

  @Post('link-assinatura/:aluno_id')
  @ApiOperation({ summary: 'Gera um link de assinatura remota (7 dias, uso único).' })
  async gerarLink(@Param('aluno_id') alunoId: string) {
    const aluno = await this.service['prisma'].alunos.findUnique({ where: { aluno_id: alunoId } });
    if (!aluno) throw new BadRequestException('Aluno não encontrado');
    const token = require('crypto').randomBytes(24).toString('hex');
    const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.service['prisma'].tokens_assinatura.create({
      data: { token, aluno_id: alunoId, expira_em: expira },
    });
    return { ok: true, token, expira_em: expira, aluno: aluno.nome };
  }

  @Get('cartao/:aluno_id')
  @ApiOperation({ summary: 'Gera o cartão do aluno (PVC CR80) preenchido.' })
  async gerarCartao(@Param('aluno_id') alunoId: string, @Res() res: any) {
    const { pdf } = await this.ficha.gerarCartao(alunoId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="cartao_aluno.pdf"' });
    res.send(pdf);
  }

  @Get('processo/:aluno_id')
  @ApiOperation({ summary: 'Gera o PROCESSO completo (ficha + regulamento + declaração, assinado).' })
  async gerarProcesso(@Param('aluno_id') alunoId: string, @Res() res: any) {
    const { pdf } = await this.ficha.gerarProcesso(alunoId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="processo_inscricao.pdf"' });
    res.send(pdf);
  }

  @Get('ficha/:aluno_id')
  @ApiOperation({ summary: 'Gera a ficha de adesão em PDF preenchida (e grava no Cloudinary).' })
  async gerarFicha(@Param('aluno_id') alunoId: string, @Res() res: any) {
    const { pdf } = await this.ficha.gerarFicha(alunoId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="ficha_adesao.pdf"' });
    res.send(pdf);
  }

  @Post('completa')
  @ApiOperation({ summary: 'Inscrição completa: encarregado + aluno + contrato + mensalidades + taxa.' })
  async completa(@Body() body: any) {
    return this.service.inscricaoCompleta(body);
  }
}
