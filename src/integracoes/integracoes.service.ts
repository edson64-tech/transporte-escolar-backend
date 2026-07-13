import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IntegracoesService {
  constructor(private prisma: PrismaService) {}

  // Mostra só os últimos 4 caracteres de um segredo, resto mascarado
  private mascarar(valor?: string | null): string | null {
    if (!valor) return null;
    if (valor.length <= 4) return '••••';
    return '••••••••' + valor.slice(-4);
  }

  // Indica se o campo tem valor guardado (sem revelar)
  private temValor(valor?: string | null): boolean {
    return !!valor && valor.length > 0;
  }

  // LISTAR — nunca devolve chaves em texto
  async listar() {
    const todas = await this.prisma.integracoes.findMany({
      orderBy: { canal: 'asc' },
    });
    return todas.map((i) => ({
      integracao_id: i.integracao_id,
      canal: i.canal,
      nome: i.nome,
      url_base: i.url_base,
      modo_auth: i.modo_auth,
      remetente: i.remetente,
      ativo: i.ativo,
      // Segredos: só máscara + flag de "está definido"
      api_key_mascarada: this.mascarar(i.api_key),
      api_key_definida: this.temValor(i.api_key),
      auth_extra_mascarada: this.mascarar(i.auth_extra),
      auth_extra_definida: this.temValor(i.auth_extra),
      config_extra: i.config_extra,
      atualizado_em: i.atualizado_em,
    }));
  }

  // OBTER um canal (também mascarado)
  async obter(canal: string) {
    const i = await this.prisma.integracoes.findUnique({ where: { canal } });
    if (!i) throw new NotFoundException('Integração não encontrada.');
    return {
      integracao_id: i.integracao_id,
      canal: i.canal,
      nome: i.nome,
      url_base: i.url_base,
      modo_auth: i.modo_auth,
      remetente: i.remetente,
      ativo: i.ativo,
      api_key_mascarada: this.mascarar(i.api_key),
      api_key_definida: this.temValor(i.api_key),
      auth_extra_mascarada: this.mascarar(i.auth_extra),
      auth_extra_definida: this.temValor(i.auth_extra),
      config_extra: i.config_extra,
      atualizado_em: i.atualizado_em,
    };
  }

  // GRAVAR — recebe valores reais. Só atualiza segredos se foram enviados
  // (campo vazio/ausente = manter o que já está guardado)
  async gravar(canal: string, dados: any) {
    const existe = await this.prisma.integracoes.findUnique({ where: { canal } });
    if (!existe) throw new NotFoundException('Integração não encontrada.');

    const update: any = { atualizado_em: new Date() };
    if (dados.nome !== undefined) update.nome = dados.nome;
    if (dados.url_base !== undefined) update.url_base = dados.url_base;
    if (dados.modo_auth !== undefined) update.modo_auth = dados.modo_auth;
    if (dados.remetente !== undefined) update.remetente = dados.remetente;
    if (dados.config_extra !== undefined) update.config_extra = dados.config_extra;
    // Segredos: só sobrescreve se vier um valor não-vazio
    if (dados.api_key) update.api_key = dados.api_key;
    if (dados.auth_extra) update.auth_extra = dados.auth_extra;

    await this.prisma.integracoes.update({ where: { canal }, data: update });
    return this.obter(canal); // devolve mascarado
  }

  async ativar(canal: string) {
    const existe = await this.prisma.integracoes.findUnique({ where: { canal } });
    if (!existe) throw new NotFoundException('Integração não encontrada.');
    // Não deixa ativar sem credencial definida
    if (!this.temValor(existe.api_key)) {
      return { erro: 'Não é possível ativar: falta configurar a credencial (api_key).', canal };
    }
    await this.prisma.integracoes.update({
      where: { canal },
      data: { ativo: true, atualizado_em: new Date() },
    });
    return this.obter(canal);
  }

  async desativar(canal: string) {
    const existe = await this.prisma.integracoes.findUnique({ where: { canal } });
    if (!existe) throw new NotFoundException('Integração não encontrada.');
    await this.prisma.integracoes.update({
      where: { canal },
      data: { ativo: false, atualizado_em: new Date() },
    });
    return this.obter(canal);
  }
}
