import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HubPagamentosService {
  private readonly logger = new Logger('HubPagamentos');
  constructor(private prisma: PrismaService) {}

  // Gera o próximo CÓDIGO DE ALUNO da escola e a REFERÊNCIA
  // Regra: 5 (gama) + 3 dígitos únicos + código completo do aluno (5 díg)
  async gerarCodigoEReferencia(escolaDigito: number): Promise<{ codigo: string; referencia: string }> {
    if (!escolaDigito || escolaDigito < 1 || escolaDigito > 9) escolaDigito = 1;
    const prefixo = String(escolaDigito);
    const ultimo = await this.prisma.alunos.findFirst({
      where: { codigo_aluno: { startsWith: prefixo } },
      orderBy: { codigo_aluno: 'desc' },
      select: { codigo_aluno: true },
    });
    let seq = 0;
    if (ultimo?.codigo_aluno && /^\d{5}$/.test(ultimo.codigo_aluno)) {
      seq = parseInt(ultimo.codigo_aluno.slice(1), 10);
    }
    const codigo = prefixo + String(seq + 1).padStart(4, '0');

    // meio de 3 dígitos aleatório, verificando unicidade da referência completa
    for (let i = 0; i < 30; i++) {
      const meio = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      const referencia = '5' + meio + codigo;
      const existe = await this.prisma.alunos.findFirst({
        where: { referencia_pagamento: referencia },
        select: { aluno_id: true },
      });
      if (!existe) return { codigo, referencia };
    }
    throw new Error('Não foi possível gerar referência única');
  }

  // Regista uma referência fixa no Hub (Charging, valor 0)
  async criarReferenciaNoHub(params: {
    referencia: string;
    codigoCliente: string;
    nomeCliente?: string;
    telefoneCliente?: string;
  }) {
    const { referencia, codigoCliente, nomeCliente, telefoneCliente } = params;

    // Validar formato: 9 dígitos
    if (!/^\d{9}$/.test(referencia)) {
      throw new BadRequestException('Referência deve ter exatamente 9 dígitos');
    }

    const base = process.env.HUB_BASE_URL || 'https://api.payments.ao';
    const resp = await fetch(base + '/reference/register', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.HUB_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        referenceType: 'Charging',
        reference: referencia,
        valorEsperado: 0,
        codigoCliente,
        codigoArtigo: 'MENSALIDADE-TRANSP',
        nomeCliente: nomeCliente || undefined,
        telefoneCliente: telefoneCliente || undefined,
      }),
    });

    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      this.logger.warn(`Hub rejeitou referência ${referencia}: ${resp.status} ${JSON.stringify(corpo).substring(0, 200)}`);
      throw new BadRequestException(
        corpo?.message || `Hub rejeitou a referência (HTTP ${resp.status})`,
      );
    }

    this.logger.log(`Referência ${referencia} registada no Hub (estado: ${corpo?.estado})`);
    return {
      refPagamento: corpo?.refPagamento || referencia,
      entidade: corpo?.izipay?.entity || '10015',
      estado: corpo?.estado,
      hub_id: corpo?.id,
    };
  }
}
