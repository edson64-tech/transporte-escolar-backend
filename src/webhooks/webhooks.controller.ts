import { Controller, Post, Req, Headers, HttpCode, UnauthorizedException, Logger } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ErpService } from '../erp/erp.service';
import * as crypto from 'crypto';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger('WebhooksHub');
  constructor(private prisma: PrismaService, private erp: ErpService) {}

  @Post('hub')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook do Hub de Pagamentos (pagamentos de referências). Segurança: HMAC-SHA256.' })
  async recebeHub(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') assinatura: string,
  ) {
    // 1. VALIDAR ASSINATURA sobre o corpo bruto (bytes exatos)
    const corpo = (req as any).rawBody as Buffer;
    if (!corpo) throw new UnauthorizedException('Corpo bruto indisponível');

    const esperado = 'sha256=' + crypto
      .createHmac('sha256', process.env.HUB_WEBHOOK_SECRET || '')
      .update(corpo)
      .digest('hex');

    const valida = !!assinatura
      && assinatura.length === esperado.length
      && crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperado));

    if (!valida) {
      this.logger.warn('Webhook Hub com assinatura INVÁLIDA — rejeitado');
      throw new UnauthorizedException('Assinatura inválida');
    }

    const payload = JSON.parse(corpo.toString('utf8'));
    const eventoId = String(payload?.id || '');
    const dados = payload?.data || {};
    const reference = String(dados?.reference || '');
    const amount = Number(dados?.amount || 0);

    // 2. IDEMPOTÊNCIA: já processámos este evento?
    if (eventoId) {
      const jaExiste = await this.prisma.hub_eventos.findUnique({ where: { evento_id: eventoId } });
      if (jaExiste) {
        this.logger.log(`Evento ${eventoId} já processado — ignorado (idempotência)`);
        return { recebido: true, duplicado: true };
      }
    }

    // 3. Registar o evento (mesmo que o aluno não seja encontrado, fica registado)
    await this.prisma.hub_eventos.create({
      data: {
        evento_id: eventoId || ('sem-id-' + Date.now()),
        event_type: payload?.event || null,
        reference: reference || null,
        amount: amount || null,
        payload: payload,
      },
    });

    // 4. Localizar o aluno pela referência
    const aluno = await this.prisma.alunos.findFirst({
      where: { referencia_pagamento: reference },
    });

    if (!aluno) {
      this.logger.warn(`Pagamento recebido para referência ${reference} mas nenhum aluno a tem. Registado em hub_eventos.`);
      return { recebido: true, aluno_encontrado: false };
    }

    // 5. Aplicar o pagamento em CASCATA: taxa primeiro, depois mensalidades por ordem
    const pendentes = await this.prisma.mensalidades.findMany({
      where: { aluno_id: aluno.aluno_id, status: { in: ['pendente', 'atrasado'] } },
      orderBy: [{ vencimento: 'asc' }],
    });
    // taxa_inscricao vem sempre primeiro (vencimento mais antigo garante, mas reforçamos)
    pendentes.sort((a, b) => {
      if (a.tipo === 'taxa_inscricao' && b.tipo !== 'taxa_inscricao') return -1;
      if (b.tipo === 'taxa_inscricao' && a.tipo !== 'taxa_inscricao') return 1;
      return new Date(a.vencimento as any).getTime() - new Date(b.vencimento as any).getTime();
    });

    let restante = amount;
    const pagas: string[] = [];
    const pagasIds: string[] = [];
    for (const m of pendentes) {
      const valor = Number(m.valor_previsto);
      if (restante + 0.01 < valor) break; // só marca pago se o valor cobrir a cobrança inteira
      await this.prisma.mensalidades.update({
        where: { mensalidade_id: m.mensalidade_id },
        data: { status: 'pago' },
      });
      restante -= valor;
      pagas.push(`${m.tipo === 'taxa_inscricao' ? 'TAXA' : 'mes ' + m.mes} (${valor})`);
      pagasIds.push(m.mensalidade_id);
    }
    const mensalidadePaga = pagas.length ? pagas.join(', ') : null;

    // 5b. ATIVAÇÃO: se estava a aguardar pagamento e a taxa + 1ª mensalidade estão pagas → ativa
    let ativado = false;
    if (aluno.motivo_estado === 'aguarda_pagamento') {
      const taxaPendente = await this.prisma.mensalidades.count({
        where: { aluno_id: aluno.aluno_id, tipo: 'taxa_inscricao', status: { in: ['pendente', 'atrasado'] } },
      });
      const primeiraMensalidade = await this.prisma.mensalidades.findFirst({
        where: { aluno_id: aluno.aluno_id, tipo: 'mensalidade' },
        orderBy: { vencimento: 'asc' },
      });
      const primeiraPaga = primeiraMensalidade?.status === 'pago';
      if (taxaPendente === 0 && primeiraPaga) {
        await this.prisma.alunos.update({
          where: { aluno_id: aluno.aluno_id },
          data: { ativo: true, motivo_estado: 'normal' },
        });
        ativado = true;
        this.logger.log(`Aluno ${aluno.codigo_aluno} ATIVADO (taxa + 1º mês pagos)`);
      }
    }

    // 6. Reativar o aluno se estava cortado (se a reativação for automática)
    let reativado = false;
    if (aluno.motivo_estado === 'corte_pagamento') {
      const p = await this.prisma.parametros_sistema.findUnique({ where: { chave: 'cobranca_reativacao' } });
      if (!p || p.valor === 'automatica') {
        await this.prisma.alunos.update({
          where: { aluno_id: aluno.aluno_id },
          data: { ativo: true, motivo_estado: 'normal' },
        });
        reativado = true;
      }
    }

    // 7. FATURACAO ERP: 1 pagamento = 1 fatura com todas as cobrancas quitadas agora
    if (pagasIds.length) {
      try {
        const empresaFat =
          (await this.prisma.erp_empresas.findFirst({ where: { ativa: true, modo_teste: false } as any, orderBy: { criado_em: 'asc' } })) ||
          (await this.prisma.erp_empresas.findFirst({ where: { ativa: true } as any, orderBy: { criado_em: 'asc' } }));
        if (empresaFat) {
          const r = await this.erp.emitirFaturaPorCobrancas(pagasIds, empresaFat.empresa_id);
          this.logger.log(`Fatura ERP enfileirada: job ${r.job_id} (${r.linhas} linha(s)) empresa=${empresaFat.codigo_empresa}`);
        } else {
          this.logger.log('Sem empresa ERP ativa - faturacao nao enfileirada');
        }
      } catch (e: any) {
        this.logger.error('Falha ao enfileirar fatura ERP (pagamento OK; retry/manual): ' + String(e?.message || e));
      }
    }

    this.logger.log(`Pagamento ${amount} AOA aplicado: aluno ${aluno.codigo_aluno}, mensalidade ${mensalidadePaga}, reativado=${reativado}`);
    return { recebido: true, aluno: aluno.codigo_aluno, cobrancas_pagas: mensalidadePaga, valor_sobrante: restante, aluno_ativado: ativado || reativado };
  }
}
