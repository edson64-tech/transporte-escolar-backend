import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminExtrasService {
  constructor(private prisma: PrismaService) {}

  // Notificações (array direto, mais recentes primeiro)
  async listarNotificacoes() {
    return this.prisma.notificacoes.findMany({
      orderBy: { data_hora: 'desc' },
      take: 200,
    });
  }

  // Parâmetros do sistema (array direto)
  async listarParametros() {
    const sistema = await this.prisma.parametros_sistema.findMany({
      orderBy: { chave: 'asc' },
    });
    const alertas = await this.prisma.parametros_alertas.findMany({
      orderBy: { nome: 'asc' },
    });
    // Unificar formato: chave/valor/descricao
    return [
      ...sistema.map(p => ({
        chave: p.chave,
        valor: p.valor,
        descricao: p.descricao,
        origem: 'sistema',
        atualizado_em: p.updated_at,
      })),
      ...alertas.map(p => ({
        chave: p.nome,
        valor: p.valor,
        descricao: p.descricao,
        origem: 'alertas',
        atualizado_em: p.atualizado_em,
      })),
    ];
  }

  // Atualizar parâmetro (sistema ou alertas)
  async atualizarParametro(chave: string, valor: string) {
    const sistema = await this.prisma.parametros_sistema.findUnique({ where: { chave } });
    if (sistema) {
      return this.prisma.parametros_sistema.update({
        where: { chave },
        data: { valor, updated_at: new Date() },
      });
    }
    const alerta = await this.prisma.parametros_alertas.findUnique({ where: { nome: chave } });
    if (alerta) {
      return this.prisma.parametros_alertas.update({
        where: { nome: chave },
        data: { valor, atualizado_em: new Date() },
      });
    }
    return { erro: 'Parâmetro não encontrado', chave };
  }

  // Auditoria ações (BigInt → Number para JSON)
  async listarAcoes() {
    const acoes = await this.prisma.auditoria_acoes.findMany({
      orderBy: { criado_em: 'desc' },
      take: 200,
    });
    return acoes.map(a => ({ ...a, audit_id: Number(a.audit_id) }));
  }

  // Auditoria acessos (sem tabela ainda - array vazio)
  async listarAcessos() {
    return [];
  }
}
