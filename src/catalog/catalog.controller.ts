import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('catalog')
export class CatalogController {
  constructor(private prisma: PrismaService) {}

  @Get('precos')
  async precos(
    @Query('rota') rota?: string,
    @Query('ano') anoNome?: string,
    @Query('viagens_dia') viagensDia?: string,
  ) {
    const where: any = { ativo: true };
    if (viagensDia) where.viagens_dia = Number(viagensDia);

    let rota_id: string | undefined;
    if (rota) {
      const r = await this.prisma.rotas.findFirst({ where: { codigo: rota } as any });
      if (r) rota_id = (r as any).rota_id;
    }
    if (rota_id) where.rota_id = rota_id;

    if (anoNome) {
      const al = await this.prisma.ano_lectivo.findFirst({ where: { nome: anoNome } as any });
      if (al) where.ano_lectivo_id = (al as any).ano_lectivo_id;
    }

    return this.prisma.precos_rota.findMany({
      where,
      orderBy: [{ created_at: 'desc' as const }],
    } as any);
  }

  @Get('contratos')
  async contratos(@Query('aluno_ref') alunoRef?: string) {
    if (!alunoRef) {
      return this.prisma.contratos_servico.findMany({ take: 100 } as any);
    }
    const aluno = await this.prisma.alunos.findFirst({
      where: { referencia_pagamento: alunoRef } as any,
    });
    if (!aluno) return [];
    return this.prisma.contratos_servico.findMany({
      where: { aluno_id: (aluno as any).aluno_id } as any,
    } as any);
  }
}
