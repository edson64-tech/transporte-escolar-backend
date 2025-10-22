import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ErpService {
  constructor(private prisma: PrismaService) {}

  /**
   * Emite fatura no ERP alvo.
   * Integração parametrizável via .env e tabela de parametros_sistema.
   */
  async emitirFaturaPorMensalidade(mensalidadeId: string) {
    const m = await this.prisma.mensalidades.findFirst({
      where: { mensalidade_id: mensalidadeId } as any,
    } as any);
    if (!m) throw new BadRequestException('Mensalidade não encontrada');

    const aluno = await this.prisma.alunos.findFirst({
      where: { aluno_id: (m as any).aluno_id } as any,
    } as any);

    // Exemplo de carga minima para ERP
    const payload = {
      cliente_codigo: (aluno as any)?.codigo_aluno || (aluno as any)?.referencia_pagamento,
      artigo: (aluno as any)?.cod_artigo || 'SERV-TRANS',
      descricao: `Mensalidade ${ (m as any).mes }/${new Date().getFullYear()}`,
      valor: (m as any).valor_previsto,
      referencia_interna: mensalidadeId,
    };

    // Aqui chama o conector (Primavera/Vendus/SDKData/Outro)
    // No momento: simulação (gravar numa tabela de "pagamentos" como fatura gerada)
    await this.prisma.pagamentos.create({
      data: {
        aluno_id: (m as any).aluno_id,
        valor: (m as any).valor_previsto,
        estado: 'emitido',
        observacao: JSON.stringify({ erp_payload: payload }),
      } as any,
    });

    return { ok: true, message: 'Fatura emitida (simulada). Integração real plugável.' };
  }
}
