import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as stream from 'stream';
import { cifrar, decifrar, gerarChaveAgente, hashChave } from './crypto.util';

@Injectable()
export class ErpService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  private async uploadPdfCloudinary(buffer: Buffer, publicId: string): Promise<UploadApiResponse> {
    const cfg = await this.storage.getActiveConfig();
    cloudinary.config({ cloud_name: cfg.cloud_name!, api_key: cfg.api_key!, api_secret: cfg.api_secret!, secure: true });
    const baseFolder = cfg.base_folder ?? 'transporte-escolar';
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const pass = new stream.PassThrough();
      const up = cloudinary.uploader.upload_stream(
        { folder: `${baseFolder}/faturas`, public_id: publicId, overwrite: true, resource_type: 'raw', format: 'pdf' },
        (err, res) => (err ? reject(err) : resolve(res as UploadApiResponse)),
      );
      pass.end(buffer);
      pass.pipe(up);
    });
  }

  // ---------- EMPRESAS (painel) ----------
  criarEmpresa(dto: any) {
    return this.prisma.erp_empresas.create({
      data: { ...dto, api_password: cifrar(dto.api_password) },
    });
  }

  listarEmpresas() {
    return this.prisma.erp_empresas
      .findMany({ orderBy: { criado_em: 'asc' } })
      .then((l) => l.map(({ api_password, ...e }) => e));
  }

  async atualizarEmpresa(id: string, dto: any) {
    const data = { ...dto, atualizado_em: new Date() };
    if (dto.api_password) data.api_password = cifrar(dto.api_password);
    return this.prisma.erp_empresas.update({ where: { empresa_id: id }, data });
  }

  // ---------- AGENTES (painel) ----------
  async criarAgente(nome: string) {
    const chave = gerarChaveAgente();
    const a = await this.prisma.erp_agentes.create({
      data: { nome, chave_hash: hashChave(chave) },
    });
    // a chave só se mostra UMA vez
    return { agente_id: a.agente_id, nome: a.nome, chave };
  }

  listarAgentes() {
    return this.prisma.erp_agentes.findMany({
      select: { agente_id: true, nome: true, versao: true, ultimo_heartbeat: true, ativo: true, criado_em: true },
      orderBy: { criado_em: 'asc' },
    });
  }

  // ---------- FILA (painel) ----------
  listarJobs(estado?: string) {
    return this.prisma.erp_jobs.findMany({
      where: estado ? { estado } : {},
      orderBy: { criado_em: 'desc' },
      take: 100,
    });
  }

  async enfileirarTesteLigacao(empresaId: string) {
    return this.criarJob('testar_ligacao', empresaId, {});
  }

  // ---------- EMISSÃO (chamada manual admin; depois o webhook usa o mesmo) ----------
  async emitirFaturaPorMensalidade(mensalidadeId: string, empresaId: string) {
    const m: any = await this.prisma.mensalidades.findFirst({ where: { mensalidade_id: mensalidadeId } as any });
    if (!m) throw new NotFoundException('Mensalidade não encontrada');
    const aluno: any = await this.prisma.alunos.findFirst({ where: { aluno_id: m.aluno_id } as any });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');

    const existente = await this.prisma.erp_documentos.findFirst({ where: { mensalidade_id: mensalidadeId } });
    if (existente && existente.estado !== 'falhado')
      throw new BadRequestException(`Documento já ${existente.estado} para esta cobrança (${existente.numero_documento || 'sem número'})`);

    const emp = await this.prisma.erp_empresas.findUnique({ where: { empresa_id: empresaId } });
    if (!emp) throw new NotFoundException('Empresa ERP não encontrada');

    const payload = {
      mensalidade_id: mensalidadeId,
      cliente: {
        cod_cliente: aluno.cod_cliente || (emp as any).cod_cliente_default || null,
        codigo_aluno: aluno.codigo_aluno,
        nome: aluno.faturacao_nome || aluno.nome,
        nif: aluno.faturacao_nif || aluno.num_documento || 'Consumidor Final',
      },
      linha: {
        artigo: aluno.cod_artigo || (emp as any).cod_artigo_default,
        descricao: (() => {
          const mesTxt = m.tipo === 'taxa_inscricao' ? 'Taxa de inscrição' : ('Mensalidade ' + (m.mes ?? '')).trim();
          const ref = aluno.referencia_pagamento ? ' | Ref. Multicaixa: ' + aluno.referencia_pagamento : '';
          return (mesTxt + ref + ' | Referente a: ' + aluno.nome).slice(0, 100);
        })(),
        valor: Number(m.valor_previsto ?? m.valor ?? 0),
      },
    };
    if (!payload.cliente.cod_cliente) throw new BadRequestException('Sem cliente: defina o cod_cliente do aluno ou o Cliente por defeito da empresa');
    if (!payload.linha.artigo) throw new BadRequestException('Sem artigo: defina o cod_artigo do aluno ou o Artigo por defeito da empresa');

    const job = await this.criarJob('emitir_documento', empresaId, payload);
    await this.prisma.erp_documentos.upsert({
      where: { mensalidade_id: mensalidadeId },
      create: { mensalidade_id: mensalidadeId, aluno_id: m.aluno_id, empresa_id: empresaId, job_id: job.job_id, valor: payload.linha.valor },
      update: { estado: 'pendente', erro: null, job_id: job.job_id, empresa_id: empresaId },
    });
    return { ok: true, job_id: job.job_id };
  }

  // ---------- AGENTE ----------
  async heartbeat(agenteId: string, versao?: string) {
    await this.prisma.erp_agentes.update({
      where: { agente_id: agenteId },
      data: { ultimo_heartbeat: new Date(), ...(versao ? { versao } : {}) },
    });
    return { ok: true };
  }

  async buscarJobs(agenteId: string) {
    const minhas = await this.prisma.erp_empresas.findMany({
      where: { agente_id: agenteId, ativa: true } as any,
      select: { empresa_id: true },
    });
    const ids = minhas.map((e) => e.empresa_id);
    if (!ids.length) return [];

    // RESGATE DE ÓRFÃOS: em_curso há >10 min (agente morreu a meio) volta a pendente
    await this.prisma.erp_jobs.updateMany({
      where: {
        estado: 'em_curso',
        empresa_id: { in: ids },
        iniciado_em: { lt: new Date(Date.now() - 10 * 60 * 1000) },
      },
      data: { estado: 'pendente' },
    });

    const candidatos = await this.prisma.erp_jobs.findMany({
      where: { estado: 'pendente', empresa_id: { in: ids } },
      orderBy: { criado_em: 'asc' },
      take: 10,
    });
    const resultado = [] as any[];
    for (const j of candidatos) {
      // LEVANTAMENTO ATÓMICO: só ganha quem transitar pendente->em_curso;
      // se outro processo levou o job entretanto, count=0 e saltamos
      const ganho = await this.prisma.erp_jobs.updateMany({
        where: { job_id: j.job_id, estado: 'pendente' },
        data: { estado: 'em_curso', agente_id: agenteId, iniciado_em: new Date(), tentativas: { increment: 1 } },
      });
      if (ganho.count === 0) continue;
      const e = await this.prisma.erp_empresas.findUnique({ where: { empresa_id: j.empresa_id } });
      resultado.push({
        job_id: j.job_id,
        tipo: j.tipo,
        payload: j.payload,
        empresa: e && {
          codigo_empresa: e.codigo_empresa,
          instancia: e.instancia,
          linha: e.linha,
          username: e.api_username,
          password: decifrar(e.api_password),
          serie: e.serie,
          tipo_documento: e.tipo_documento,
          cod_iva_default: e.cod_iva_default,
          cod_cliente_default: (e as any).cod_cliente_default ?? null,
          cod_artigo_default: (e as any).cod_artigo_default ?? null,
          modo_teste: e.modo_teste,
        },
      });
    }
    return resultado;
  }

  async entregarResultado(agenteId: string, jobId: string, body: { sucesso: boolean; resultado?: any; erro?: string; pdf_base64?: string }) {
    const job = await this.prisma.erp_jobs.findUnique({ where: { job_id: jobId } });
    if (!job || job.agente_id !== agenteId) throw new NotFoundException('Job não encontrado para este agente');

    if (body.sucesso) {
      await this.prisma.erp_jobs.update({
        where: { job_id: jobId },
        data: { estado: 'concluido', resultado: body.resultado ?? {}, concluido_em: new Date(), erro: null },
      });
      if (job.tipo === 'emitir_documento') {
        await this.prisma.erp_documentos.updateMany({
          where: { job_id: jobId },
          data: {
            estado: 'emitido',
            numero_documento: body.resultado?.numero_documento ?? null,
            emitido_em: new Date(),
          },
        });
        if (body.pdf_base64) {
          try {
            const buf = Buffer.from(body.pdf_base64, 'base64');
            const nome = (body.resultado?.numero_documento || jobId).toString().replace(/[^A-Za-z0-9._-]+/g, '_');
            const up = await this.uploadPdfCloudinary(buf, nome);
            await this.prisma.erp_documentos.updateMany({
              where: { job_id: jobId },
              data: { pdf_url: up.secure_url, pdf_public_id: up.public_id },
            });
          } catch (e: any) {
            await this.prisma.erp_documentos.updateMany({
              where: { job_id: jobId },
              data: { erro: 'PDF upload falhou: ' + String(e?.message || e) },
            });
          }
        }
      }
    } else {
      const esgotado = job.tentativas >= job.max_tentativas;
      await this.prisma.erp_jobs.update({
        where: { job_id: jobId },
        data: { estado: esgotado ? 'falhado' : 'pendente', erro: body.erro ?? 'erro não especificado', ...(esgotado ? { concluido_em: new Date() } : {}) },
      });
      if (esgotado && job.tipo === 'emitir_documento') {
        await this.prisma.erp_documentos.updateMany({ where: { job_id: jobId }, data: { estado: 'falhado', erro: body.erro ?? null } });
      }
    }
    return { ok: true };
  }

  private criarJob(tipo: string, empresaId: string, payload: any) {
    return this.prisma.erp_jobs.create({ data: { tipo, empresa_id: empresaId, payload } });
  }
}
