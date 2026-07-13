import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CobrancaService {
  private readonly logger = new Logger('CobrancaService');
  constructor(private prisma: PrismaService) {}

  // Cron: corre todos os dias as 6h. So age se o interruptor estiver ativo.
  @Cron('0 6 * * *')
  async cronDiario() {
    const p = await this.prisma.parametros_sistema.findUnique({ where: { chave: 'cobranca_cron_ativo' } });
    if (!p || p.valor !== 'true') {
      this.logger.log('Cron de cobranca DESLIGADO (cobranca_cron_ativo != true). Nada feito.');
      return;
    }
    this.logger.log('Cron de cobranca ATIVO — a processar calendario...');
    const rel = await this.processarCalendario();
    this.logger.log('Cron processou: ' + JSON.stringify(rel.acoes));
  }

  // Lê os dias do calendário da tabela parametros_sistema
  private async lerCalendario() {
    const params = await this.prisma.parametros_sistema.findMany({
      where: { chave: { startsWith: 'cobranca_' } },
    });
    const get = (k: string, def: number) => {
      const p = params.find((x) => x.chave === k);
      return p ? parseInt(p.valor, 10) : def;
    };
    const getStr = (k: string, def: string) => {
      const p = params.find((x) => x.chave === k);
      return p ? p.valor : def;
    };
    return {
      diaNota: get('cobranca_dia_nota', 1),
      diaLembrete: get('cobranca_dia_lembrete', 5),
      diaAviso: get('cobranca_dia_aviso', 8),
      diaPrazo: get('cobranca_dia_prazo', 10),
      diaCorte: get('cobranca_dia_corte', 11),
      reativacao: getStr('cobranca_reativacao', 'automatica'),
    };
  }

  // Regista uma notificação (fica pendente para envio quando as integrações estiverem ativas)
  private async registarNotificacao(canal: string, destino: string, mensagem: string) {
    if (!destino) return;
    await this.prisma.notificacoes_envio.create({
      data: {
        notificacao_uuid: (globalThis as any).crypto.randomUUID(),
        canal, destinatario: destino, mensagem, status: 'pendente',
      },
    });
  }

  // Processa o calendário para uma data (real ou simulada para teste)
  async processarCalendario(dataSimulada?: string) {
    const hoje = dataSimulada ? new Date(dataSimulada) : new Date();
    const dia = hoje.getDate();
    const mes = hoje.getMonth() + 1;
    const cal = await this.lerCalendario();

    const rel: any = { data: hoje.toISOString().slice(0, 10), dia, mes, acoes: [] };

    // Mensalidades pendentes do mês corrente
    const pendentes = await this.prisma.mensalidades.findMany({
      where: { mes, status: 'pendente' },
      include: { alunos: true },
    });

    if (dia === cal.diaNota) {
      for (const m of pendentes) {
        const ref = m.referencia || m.alunos.referencia_pagamento || '';
        await this.registarNotificacao('sms', ref,
          `Cobranca transporte: mensalidade de ${Number(m.valor_previsto).toLocaleString('pt-PT')} AOA. Ref: ${ref}`);
      }
      rel.acoes.push({ tipo: 'nota_emitida', qtd: pendentes.length });
    }
    else if (dia === cal.diaLembrete) {
      for (const m of pendentes) {
        const ref = m.referencia || m.alunos.referencia_pagamento || '';
        await this.registarNotificacao('sms', ref, `Lembrete: mensalidade em falta. Ref: ${ref}`);
      }
      rel.acoes.push({ tipo: 'lembrete', qtd: pendentes.length });
    }
    else if (dia === cal.diaAviso) {
      for (const m of pendentes) {
        const ref = m.referencia || m.alunos.referencia_pagamento || '';
        await this.registarNotificacao('sms', ref, `AVISO: pague ate dia ${cal.diaPrazo} ou o servico sera cortado dia ${cal.diaCorte}. Ref: ${ref}`);
      }
      rel.acoes.push({ tipo: 'aviso_corte', qtd: pendentes.length });
    }
    else if (dia === cal.diaCorte) {
      let cortados = 0;
      for (const m of pendentes) {
        await this.prisma.alunos.update({
          where: { aluno_id: m.aluno_id },
          data: { ativo: false, motivo_estado: 'corte_pagamento' },
        });
        await this.prisma.mensalidades.update({
          where: { mensalidade_id: m.mensalidade_id },
          data: { status: 'atrasado' },
        });
        cortados++;
      }
      rel.acoes.push({ tipo: 'corte', qtd: cortados });
    }
    else {
      rel.acoes.push({ tipo: 'nada', nota: 'Dia sem acao no calendario' });
    }
    return rel;
  }

  // Marca uma mensalidade como paga; reativa o aluno se estava cortado
  async marcarPago(mensalidadeId: string) {
    const m = await this.prisma.mensalidades.findUnique({ where: { mensalidade_id: mensalidadeId } });
    if (!m) throw new NotFoundException('Mensalidade nao encontrada');

    await this.prisma.mensalidades.update({
      where: { mensalidade_id: mensalidadeId },
      data: { status: 'pago' },
    });

    const cal = await this.lerCalendario();
    const aluno = await this.prisma.alunos.findUnique({ where: { aluno_id: m.aluno_id } });
    let reativado = false;
    if (aluno && aluno.motivo_estado === 'corte_pagamento' && cal.reativacao === 'automatica') {
      await this.prisma.alunos.update({
        where: { aluno_id: m.aluno_id },
        data: { ativo: true, motivo_estado: 'normal' },
      });
      reativado = true;
    }
    return { ok: true, mensalidade_id: mensalidadeId, status: 'pago', aluno_reativado: reativado };
  }

  // Dashboard de cortes: alunos cortados por pagamento
  async dashboardCortes() {
    const cortados = await this.prisma.alunos.findMany({
      where: { motivo_estado: 'corte_pagamento' },
      select: { aluno_id: true, codigo_aluno: true, nome: true, referencia_pagamento: true },
    });
    return { total: cortados.length, alunos: cortados };
  }
}
