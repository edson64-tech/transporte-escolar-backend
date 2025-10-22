import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // 💰 Retorna o saldo e situação financeira do aluno
  async getResumoFinanceiro(alunoId: string) {
    // total previsto (mensalidades emitidas)
    const totalPrevisto = await this.prisma.mensalidades.aggregate({
      where: { aluno_id: alunoId },
      _sum: { valor_previsto: true },
    });

    // total pago
    const totalPago = await this.prisma.pagamentos.aggregate({
      where: { aluno_id: alunoId, status: 'pago' },
      _sum: { valor: true },
    });

    const saldo =
     Number(totalPrevisto._sum?.valor_previsto ?? 0) -
     Number(totalPago._sum?.valor ?? 0);
        
    return {
      aluno_id: alunoId,
      total_previsto: Number(totalPrevisto._sum.valor_previsto ?? 0),
      total_pago: Number(totalPago._sum.valor ?? 0),
      saldo: Number(saldo),
      status: saldo <= 0 ? 'sem dívida' : 'pendente',
    };
  }

  // 🧾 Lista mensalidades detalhadas
  async listarMensalidades(alunoId: string) {
    return await this.prisma.mensalidades.findMany({
      where: { aluno_id: alunoId },
      orderBy: { mes: 'asc' },
      select: {
        mes: true,
        valor_previsto: true,
        status: true,
        vencimento: true,
        referencia: true,
      },
    });
  }

  // 🔍 Verifica se há pendências no mês atual
  async temPendencias(alunoId: string) {
    const pendente = await this.prisma.mensalidades.findFirst({
      where: {
        aluno_id: alunoId,
        status: { not: 'pago' },
      },
    });

    return { aluno_id: alunoId, pendente: !!pendente };
  }
}
