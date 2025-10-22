import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ImportsService {
  constructor(private prisma: PrismaService) {}

  template(tipo: string): { filename: string; buffer: Buffer } {
    const map: Record<string, string[]> = {
      alunos: ['nome','codigo_aluno','cod_artigo','referencia_pagamento','home_lat','home_lng','ativo'],
      encarregados: ['nome','telefone','email'],
      motoristas: ['nome','telefone','matricula'],
      vigilantes: ['nome','telefone'],
      precos: ['rota_codigo','ano_lectivo','viagens_dia','tipo_servico','plano_codigo','preco_mensal','ativo'],
      contratos: ['aluno_ref','ano_lectivo','rota_codigo','viagens_dia','tipo_servico','plano_codigo','preco_mensal','cobranca_dia','corte_dia','ativo'],
      pagamentos: ['aluno_ref','valor','data','observacao'],
    };
    if (!map[tipo]) throw new BadRequestException('Tipo inválido');

    const ws = XLSX.utils.aoa_to_sheet([map[tipo]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    return { filename: `template_${tipo}.xlsx`, buffer };
  }

  async process(tipo: string, file: Express.Multer.File) {
    if (!file?.buffer) throw new BadRequestException('Ficheiro não recebido');
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null });
    let ok = 0, falhas = 0, detalhes: any[] = [];

    try {
      if (tipo === 'alunos') {
        for (const r of rows) {
          try {
            const data: any = {
              nome: r.nome,
              codigo_aluno: r.codigo_aluno,
              cod_artigo: r.cod_artigo,
              referencia_pagamento: r.referencia_pagamento,
              ativo: r.ativo !== null ? !!r.ativo : true,
              home_lat: r.home_lat,
              home_lng: r.home_lng,
            };
            await this.prisma.alunos.upsert({
              where: { referencia_pagamento: data.referencia_pagamento } as any,
              update: data,
              create: data,
            } as any);
            ok++;
          } catch (e: any) {
            falhas++; detalhes.push({ row: r, error: e?.message });
          }
        }
      } else if (tipo === 'precos') {
        for (const r of rows) {
          try {
            const rota = await this.prisma.rotas.findFirst({ where: { codigo: r.rota_codigo } as any } as any);
            const ano = await this.prisma.ano_lectivo.findFirst({ where: { nome: r.ano_lectivo } as any } as any);
            if (!rota || !ano) throw new Error('Rota/Ano inválidos');
            await this.prisma.precos_rota.upsert({
              where: {
                rota_id_ano_lectivo_id_viagens_dia_plano_codigo: {
                  rota_id: (rota as any).rota_id,
                  ano_lectivo_id: (ano as any).ano_lectivo_id,
                  viagens_dia: Number(r.viagens_dia),
                  plano_codigo: r.plano_codigo || '',
                } as any,
              } as any,
              update: {
                tipo_servico: r.tipo_servico || 'recolha',
                preco_mensal: Number(r.preco_mensal),
                ativo: r.ativo !== null ? !!r.ativo : true,
                updated_at: new Date(),
              },
              create: {
                rota_id: (rota as any).rota_id,
                ano_lectivo_id: (ano as any).ano_lectivo_id,
                viagens_dia: Number(r.viagens_dia),
                tipo_servico: r.tipo_servico || 'recolha',
                plano_codigo: r.plano_codigo || null,
                preco_mensal: Number(r.preco_mensal),
                ativo: r.ativo !== null ? !!r.ativo : true,
              } as any,
            } as any);
            ok++;
          } catch (e: any) {
            falhas++; detalhes.push({ row: r, error: e?.message });
          }
        }
      } else if (tipo === 'contratos') {
        for (const r of rows) {
          try {
            const aluno = await this.prisma.alunos.findFirst({ where: { referencia_pagamento: r.aluno_ref } as any } as any);
            const rota  = await this.prisma.rotas.findFirst({ where: { codigo: r.rota_codigo } as any } as any);
            const ano   = await this.prisma.ano_lectivo.findFirst({ where: { nome: r.ano_lectivo } as any } as any);
            if (!aluno || !rota || !ano) throw new Error('Aluno/Rota/Ano inválidos');
            await this.prisma.contratos_servico.upsert({
              where: { aluno_id_ano_lectivo_id: { aluno_id: (aluno as any).aluno_id, ano_lectivo_id: (ano as any).ano_lectivo_id } as any } as any,
              update: {
                viagens_dia: Number(r.viagens_dia),
                tipo_servico: r.tipo_servico || 'recolha',
                plano_codigo: r.plano_codigo || null,
                preco_mensal: Number(r.preco_mensal),
                cobranca_dia: r.cobranca_dia ? Number(r.cobranca_dia) : 1,
                corte_dia: r.corte_dia ? Number(r.corte_dia) : 10,
                ativo: r.ativo !== null ? !!r.ativo : true,
                updated_at: new Date(),
              },
              create: {
                aluno_id: (aluno as any).aluno_id,
                ano_lectivo_id: (ano as any).ano_lectivo_id,
                rota_id: (rota as any).rota_id,
                viagens_dia: Number(r.viagens_dia),
                tipo_servico: r.tipo_servico || 'recolha',
                plano_codigo: r.plano_codigo || null,
                preco_mensal: Number(r.preco_mensal),
                cobranca_dia: r.cobranca_dia ? Number(r.cobranca_dia) : 1,
                corte_dia: r.corte_dia ? Number(r.corte_dia) : 10,
                ativo: r.ativo !== null ? !!r.ativo : true,
              } as any,
            } as any);
            ok++;
          } catch (e: any) {
            falhas++; detalhes.push({ row: r, error: e?.message });
          }
        }
      } else {
        throw new BadRequestException('Importação deste tipo ainda não implementada');
      }
    } finally {
      await this.prisma.import_logs.create({
        data: {
          tipo, filename: 'upload.xlsx',
          total_linhas: rows.length,
          ok, falhas,
          detalhes: detalhes as any,
        } as any,
      });
    }
    return { ok, falhas };
  }
}
