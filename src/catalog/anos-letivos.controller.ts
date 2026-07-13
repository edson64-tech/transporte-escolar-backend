import { Controller, Get, Post, Put, Delete, Param, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';

@ApiTags('anos-letivos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERADOR)
@Controller('catalog/anos-letivos')
export class AnosLetivosController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os anos letivos com contagens.' })
  async listar() {
    const anos: any[] = await this.prisma.ano_lectivo.findMany({ orderBy: { ano_inicio: 'asc' } });
    const resultado = [] as any[];
    for (const a of anos) {
      const contratos = await this.prisma.contratos_servico.count({ where: { ano_lectivo_id: a.ano_lectivo_id } });
      const mensalidades = await this.prisma.mensalidades.count({ where: { ano_lectivo_id: a.ano_lectivo_id } });
      resultado.push({ ...a, contratos, mensalidades });
    }
    return resultado;
  }

  @Post()
  @ApiOperation({ summary: 'Cria um ano letivo (inativo).' })
  async criar(@Body() d: any) {
    if (!d?.nome || !d?.ano_inicio) throw new BadRequestException('nome e ano_inicio são obrigatórios');
    return this.prisma.ano_lectivo.create({
      data: { nome: String(d.nome), ano_inicio: Number(d.ano_inicio),
        data_inicio: d.data_inicio ? new Date(d.data_inicio) : new Date(Number(d.ano_inicio), 8, 1),
        data_fim: d.data_fim ? new Date(d.data_fim) : new Date(Number(d.ano_inicio) + 1, 6, 31),
        ativo: false },
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Edita nome/datas de um ano letivo.' })
  async editar(@Param('id') id: string, @Body() d: any) {
    const dados: any = {};
    if (d.nome) dados.nome = String(d.nome);
    if (d.ano_inicio) dados.ano_inicio = Number(d.ano_inicio);
    if (d.data_inicio) dados.data_inicio = new Date(d.data_inicio);
    if (d.data_fim) dados.data_fim = new Date(d.data_fim);
    return this.prisma.ano_lectivo.update({ where: { ano_lectivo_id: id }, data: dados });
  }

  @Put(':id/ativar')
  @ApiOperation({ summary: 'Ativa este ano (desativa os outros). Copia meses+preços do ano anterior se estiver vazio.' })
  async ativar(@Param('id') id: string) {
    const alvo: any = await this.prisma.ano_lectivo.findUnique({ where: { ano_lectivo_id: id } });
    if (!alvo) throw new BadRequestException('Ano não encontrado');

    // cópia automática de meses+preços se o ano estiver vazio
    const temMeses = await this.prisma.precos_mes.count({ where: { ano_lectivo_id: id } });
    if (temMeses === 0) {
      const fonte: any = await this.prisma.ano_lectivo.findFirst({
        where: { ano_lectivo_id: { not: id } },
        orderBy: { ano_inicio: 'desc' },
      });
      if (fonte) {
        const meses: any[] = await this.prisma.precos_mes.findMany({ where: { ano_lectivo_id: fonte.ano_lectivo_id } });
        for (const m of meses) {
          await this.prisma.precos_mes.create({ data: { ano_lectivo_id: id, mes: m.mes, fator: m.fator, ordem: m.ordem, ativo: m.ativo } });
        }
        const precos: any[] = await this.prisma.precos_rota.findMany({ where: { ano_lectivo_id: fonte.ano_lectivo_id } });
        for (const p of precos) {
          await this.prisma.precos_rota.create({ data: { ano_lectivo_id: id, rota_id: p.rota_id, viagens_dia: p.viagens_dia, preco_mensal: p.preco_mensal } });
        }
      }
    }

    await this.prisma.ano_lectivo.updateMany({ data: { ativo: false } });
    await this.prisma.ano_lectivo.update({ where: { ano_lectivo_id: id }, data: { ativo: true } });
    return { ok: true, copiou_precos: temMeses === 0 };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Apaga um ano letivo (só se não tiver dados associados).' })
  async apagar(@Param('id') id: string) {
    const contratos = await this.prisma.contratos_servico.count({ where: { ano_lectivo_id: id } });
    const mensalidades = await this.prisma.mensalidades.count({ where: { ano_lectivo_id: id } });
    if (contratos > 0 || mensalidades > 0) {
      throw new BadRequestException(
        `Não pode ser apagado: tem ${contratos} contrato(s) e ${mensalidades} mensalidade(s) associados.`);
    }
    const alvo: any = await this.prisma.ano_lectivo.findUnique({ where: { ano_lectivo_id: id } });
    if (alvo?.ativo) throw new BadRequestException('Não pode apagar o ano letivo ATIVO.');
    await this.prisma.precos_mes.deleteMany({ where: { ano_lectivo_id: id } });
    await this.prisma.precos_rota.deleteMany({ where: { ano_lectivo_id: id } });
    await this.prisma.ano_lectivo.delete({ where: { ano_lectivo_id: id } });
    return { ok: true };
  }

  @Put('precos/:preco_rota_id')
  @ApiOperation({ summary: 'Edita o preço mensal de uma rota/viagens.' })
  async editarPreco(@Param('preco_rota_id') id: string, @Body() d: any) {
    const valor = Number(d?.preco_mensal);
    if (!valor || valor <= 0) throw new BadRequestException('preco_mensal inválido');
    return this.prisma.precos_rota.update({ where: { preco_rota_id: id }, data: { preco_mensal: valor } });
  }
}
