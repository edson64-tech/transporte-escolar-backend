import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HubPagamentosService } from './hub-pagamentos.service';

@Injectable()
export class InscricoesService {
  constructor(private prisma: PrismaService, private hub: HubPagamentosService) {}

  // Converte texto legivel para MAIUSCULAS (preserva null/vazio)
  private maiusc(v: any): any {
    if (v == null) return v;
    if (typeof v !== 'string') return v;
    return v.trim().toUpperCase();
  }

  // Verifica se um aluno já existe pelo número de documento
  async verificarDocumento(doc: string) {
    if (!doc || !doc.trim()) throw new BadRequestException('Documento em falta');
    const aluno = await this.prisma.alunos.findFirst({
      where: { num_documento: doc.trim() },
      include: { encarregados: true },
    });
    if (!aluno) {
      return { existe: false, modo: 'nova_inscricao' };
    }
    return {
      existe: true,
      modo: 'reconfirmacao',
      aluno: {
        aluno_id: aluno.aluno_id,
        nome: aluno.nome,
        codigo_aluno: aluno.codigo_aluno,
        num_documento: aluno.num_documento,
        tipo_documento: aluno.tipo_documento,
        referencia_pagamento: aluno.referencia_pagamento,
        cod_artigo: aluno.cod_artigo,
        foto_url: aluno.foto_url,
        encarregado: aluno.encarregados
          ? { nome: aluno.encarregados.nome, telefone: aluno.encarregados.telefone }
          : null,
      },
    };
  }

  // Verifica se um encarregado já existe pelo contacto; devolve os filhos associados
  // Pesquisa alunos existentes por NOME, CÓDIGO ou REFERÊNCIA
  // (para reconfirmar os migrados que ainda não têm documento registado)
  async pesquisarAluno(q: string) {
    if (!q || q.trim().length < 3) return { resultados: [] };
    const termo = q.trim();
    const alunos = await this.prisma.alunos.findMany({
      where: {
        OR: [
          { nome: { contains: termo.toUpperCase() } },
          { codigo_aluno: { equals: termo } },
          { referencia_pagamento: { equals: termo } },
        ],
      },
      take: 10,
      orderBy: { nome: 'asc' },
      select: {
        aluno_id: true, nome: true, codigo_aluno: true,
        num_documento: true, referencia_pagamento: true,
        encarregados: { select: { nome: true, telefone: true } },
        contratos_servico: {
          orderBy: { created_at: 'desc' }, take: 1,
          select: { viagens_dia: true, rotas: { select: { codigo: true, nome: true } } },
        },
      },
    });
    return {
      resultados: alunos.map((a) => ({
        aluno_id: a.aluno_id,
        nome: a.nome,
        codigo_aluno: a.codigo_aluno,
        num_documento: a.num_documento,
        referencia_pagamento: a.referencia_pagamento,
        tem_documento: !!a.num_documento,
        encarregado: a.encarregados ? { nome: a.encarregados.nome, telefone: a.encarregados.telefone } : null,
        rota_atual: a.contratos_servico?.[0]?.rotas ? `${a.contratos_servico[0].rotas.codigo} - ${a.contratos_servico[0].rotas.nome}` : null,
        viagens_atual: a.contratos_servico?.[0]?.viagens_dia ?? null,
      })),
    };
  }

  // Consulta completa da inscrição (para a página de detalhe do aluno)
  async detalheInscricao(alunoId: string) {
    const aluno: any = await this.prisma.alunos.findUnique({
      where: { aluno_id: alunoId },
      include: {
        encarregados: true,
        contratos_servico: { include: { rotas: true }, orderBy: { created_at: 'desc' }, take: 1 },
        adesoes_servico: { orderBy: { created_at: 'desc' }, take: 1 },
        anexos_aluno: { orderBy: { criado_em: 'desc' } },
        autorizacoes_entrega: { where: { ativo: true }, include: { pessoas_autorizadas: true } },
        mensalidades: { orderBy: { vencimento: 'asc' } },
      },
    });
    if (!aluno) throw new BadRequestException('Aluno não encontrado');
    const contrato = aluno.contratos_servico?.[0] || null;
    const pendentes = (aluno.mensalidades || []).filter((m: any) => ['pendente', 'atrasado'].includes(m.status));
    const totalPendente = pendentes.reduce((s: number, m: any) => s + Number(m.valor_previsto), 0);
    return {
      aluno: {
        aluno_id: aluno.aluno_id, nome: aluno.nome, codigo_aluno: aluno.codigo_aluno,
        num_documento: aluno.num_documento, referencia_pagamento: aluno.referencia_pagamento,
        ativo: aluno.ativo, motivo_estado: aluno.motivo_estado, foto_url: aluno.foto_url,
        data_nascimento: aluno.data_nascimento, sexo: aluno.sexo, naturalidade: aluno.naturalidade,
        sala: aluno.sala, turma: aluno.turma, classe: aluno.classe, morada: aluno.morada,
        nome_pai: aluno.nome_pai, contacto_pai: aluno.contacto_pai,
        nome_mae: aluno.nome_mae, contacto_mae: aluno.contacto_mae,
        endereco_recolha: aluno.endereco_recolha, endereco_regresso: aluno.endereco_regresso,
        faturacao_nif: aluno.faturacao_nif, faturacao_nome: aluno.faturacao_nome,
      },
      encarregado: aluno.encarregados ? { nome: aluno.encarregados.nome, telefone: aluno.encarregados.telefone, email: aluno.encarregados.email } : null,
      contrato: contrato ? { rota: contrato.rotas ? contrato.rotas.codigo + ' - ' + contrato.rotas.nome : null, viagens_dia: contrato.viagens_dia, estado: contrato.estado } : null,
      servicos: aluno.adesoes_servico?.[0]?.services_escolhidos || [],
      anexos: (aluno.anexos_aluno || []).map((a: any) => ({ tipo: a.tipo, nome: a.nome_ficheiro, url: a.url, criado_em: a.criado_em })),
      autorizados: (aluno.autorizacoes_entrega || []).map((a: any) => ({ autorizacao_id: a.autorizacao_id, nome: a.pessoas_autorizadas?.nome, bi: a.pessoas_autorizadas?.bi, telefone: a.pessoas_autorizadas?.telefone, parentesco: a.parentesco })),
      financeiro: {
        total_pendente: totalPendente,
        cobrancas: (aluno.mensalidades || []).map((m: any) => ({ tipo: m.tipo, mes: m.mes, valor: Number(m.valor_previsto), status: m.status, vencimento: m.vencimento })),
      },
    };
  }

  async verificarEncarregado(contacto: string) {
    if (!contacto || !contacto.trim()) throw new BadRequestException('Contacto em falta');
    const enc = await this.prisma.encarregados.findFirst({
      where: { telefone: contacto.trim() },
      include: { alunos: { select: { aluno_id: true, nome: true, codigo_aluno: true, num_documento: true } } },
    });
    if (!enc) {
      return { existe: false };
    }
    return {
      existe: true,
      encarregado: {
        encarregado_id: enc.encarregado_id,
        nome: enc.nome,
        telefone: enc.telefone,
        email: enc.email,
      },
      filhos: enc.alunos,
    };
  }

  // Inscrição completa: cria/liga encarregado + aluno + contrato + mensalidades + taxa
  async inscricaoCompleta(d: any) {
    // Validações mínimas
    if (!d.num_documento) throw new BadRequestException('Número de documento é obrigatório');
    if (!d.nome_aluno) throw new BadRequestException('Nome do aluno é obrigatório');
    if (!d.encarregado_contacto) throw new BadRequestException('Contacto do encarregado é obrigatório');
    if (!d.rota_id) throw new BadRequestException('Rota é obrigatória');
    if (!d.viagens_dia) throw new BadRequestException('Nº de viagens é obrigatório');
    if (!d.referencia_pagamento) throw new BadRequestException('Referência multicaixa é obrigatória');
    if (!d.tipo_inscricao) throw new BadRequestException('Tipo de inscrição (nova/reconfirmacao) é obrigatório');

    const ano = await this.prisma.ano_lectivo.findFirst({ where: { ativo: true } });
    if (!ano) throw new BadRequestException('Sem ano letivo ativo');

    // Preço da rota
    const rota = await this.prisma.rotas.findUnique({ where: { rota_id: d.rota_id } });
    if (!rota) throw new NotFoundException('Rota não encontrada');
    const preco = d.viagens_dia === 1 ? rota.preco_1_viagem : rota.preco_2_viagens;
    if (preco == null) throw new BadRequestException('Rota sem preço definido');

    // Taxa de inscrição
    const tipoDesc = d.tipo_inscricao === 'nova' ? 'Nova Inscrição' : 'Re-Inscrição';
    const tipoInsc = await this.prisma.tipo_inscricao.findFirst({ where: { descricao: tipoDesc } });

    // Meses ativos para gerar mensalidades
    const meses = await this.prisma.precos_mes.findMany({
      where: { ano_lectivo_id: ano.ano_lectivo_id, ativo: true }, orderBy: { ordem: 'asc' },
    });

    // Registar a referência no Hub (só para referências novas da gama 3XXXXXXXX)
    // Se o Hub rejeitar (ex: duplicada), a inscrição PARA aqui — nada é gravado.
    // NOVA inscrição (sem aluno_id e documento inexistente): o SERVIDOR gera
    // código+referência e regista no Hub ANTES de gravar (fonte da verdade).
    let hubInfo: any = null;
    if (!d.aluno_id) {
      const jaExistePorDoc = await this.prisma.alunos.findFirst({
        where: { num_documento: String(d.num_documento) },
      });
      if (!jaExistePorDoc) {
        const escolaDig = Number(d.escola) || 1;
        const gerado = await this.hub.gerarCodigoEReferencia(escolaDig);
        d.codigo_aluno = gerado.codigo;
        d.referencia_pagamento = gerado.referencia;
        hubInfo = await this.hub.criarReferenciaNoHub({
          referencia: gerado.referencia,
          codigoCliente: gerado.codigo,
          nomeCliente: this.maiusc(d.nome_aluno),
          telefoneCliente: d.encarregado_contacto,
        });
      }
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      // 1. Encarregado (liga ao existente ou cria)
      let encarregadoId = d.encarregado_id;
      if (!encarregadoId) {
        const encExiste = await tx.encarregados.findFirst({ where: { telefone: d.encarregado_contacto } });
        if (encExiste) {
          encarregadoId = encExiste.encarregado_id;
        } else {
          // proteção: o email é único — se já pertence a outro encarregado, erro claro
          let emailNovo = d.encarregado_email || null;
          if (emailNovo) {
            const emailUsado = await tx.encarregados.findFirst({ where: { email: emailNovo } });
            if (emailUsado) {
              throw new BadRequestException(
                `O email ${emailNovo} já está associado ao encarregado ${emailUsado.nome} (tel. ${emailUsado.telefone}). ` +
                `Se é a mesma pessoa, use esse contacto; senão, indique outro email ou deixe vazio.`,
              );
            }
          }
          const novoEnc = await tx.encarregados.create({
            data: {
              nome: this.maiusc(d.encarregado_nome) || 'ENCARREGADO',
              telefone: d.encarregado_contacto,
              email: emailNovo,
              senha: 'temp_' + d.encarregado_contacto,
            },
          });
          encarregadoId = novoEnc.encarregado_id;
        }
      }

      // 2. Aluno (liga ao existente por documento, ou cria)
      // Prioridade: aluno_id explícito (escolhido na pesquisa — migrados sem documento)
      let aluno: any = null;
      if (d.aluno_id) {
        aluno = await tx.alunos.findUnique({ where: { aluno_id: d.aluno_id } });
        if (!aluno) throw new BadRequestException('Aluno indicado não existe');
        // proteção: se o documento digitado pertence a OUTRO aluno, bloquear
        const docDeOutro = await tx.alunos.findFirst({
          where: { num_documento: d.num_documento, NOT: { aluno_id: d.aluno_id } },
        });
        if (docDeOutro) throw new BadRequestException('Este documento já pertence a outro aluno: ' + docDeOutro.nome);
      } else {
        aluno = await tx.alunos.findFirst({ where: { num_documento: d.num_documento } });
      }
      if (aluno) {
        aluno = await tx.alunos.update({
          where: { aluno_id: aluno.aluno_id },
          data: {
            nome: this.maiusc(d.nome_aluno),
            num_documento: d.num_documento,
            encarregado_id: encarregadoId,
            referencia_pagamento: d.referencia_pagamento,
            tipo_documento: d.tipo_documento || null,
            e_creche: d.e_creche === true,
            data_nascimento: d.data_nascimento ? new Date(d.data_nascimento) : null,
            faturacao_nif: d.faturacao_nif || null,
            faturacao_nome: this.maiusc(d.faturacao_nome) || null,
            faturacao_email: d.faturacao_email || null,
            sexo: d.sexo || null,
            naturalidade: this.maiusc(d.naturalidade) || null,
            sala: this.maiusc(d.sala) || null,
            turma: this.maiusc(d.turma) || null,
            classe: this.maiusc(d.classe) || null,
            morada: this.maiusc(d.morada) || null,
            nome_pai: this.maiusc(d.nome_pai) || null,
            contacto_pai: d.contacto_pai || null,
            nome_mae: this.maiusc(d.nome_mae) || null,
            contacto_mae: d.contacto_mae || null,
            endereco_recolha: this.maiusc(d.endereco_recolha) || null,
            endereco_regresso: this.maiusc(d.endereco_regresso) || null,
            recolha_lat: d.recolha_lat ?? null, recolha_lng: d.recolha_lng ?? null,
            regresso_lat: d.regresso_lat ?? null, regresso_lng: d.regresso_lng ?? null,
            foto_url: d.foto_url ?? aluno.foto_url,
          },
        });
      } else {
        aluno = await tx.alunos.create({
          data: {
            nome: this.maiusc(d.nome_aluno),
            codigo_aluno: d.codigo_aluno,
            num_documento: d.num_documento,
            tipo_documento: d.tipo_documento || null,
            referencia_pagamento: d.referencia_pagamento,
            encarregado_id: encarregadoId,
            e_creche: d.e_creche === true,
            data_nascimento: d.data_nascimento ? new Date(d.data_nascimento) : null,
            faturacao_nif: d.faturacao_nif || null,
            faturacao_nome: this.maiusc(d.faturacao_nome) || null,
            faturacao_email: d.faturacao_email || null,
            sexo: d.sexo || null,
            naturalidade: this.maiusc(d.naturalidade) || null,
            sala: this.maiusc(d.sala) || null,
            turma: this.maiusc(d.turma) || null,
            classe: this.maiusc(d.classe) || null,
            morada: this.maiusc(d.morada) || null,
            nome_pai: this.maiusc(d.nome_pai) || null,
            contacto_pai: d.contacto_pai || null,
            nome_mae: this.maiusc(d.nome_mae) || null,
            contacto_mae: d.contacto_mae || null,
            endereco_recolha: this.maiusc(d.endereco_recolha) || null,
            endereco_regresso: this.maiusc(d.endereco_regresso) || null,
            recolha_lat: d.recolha_lat ?? null, recolha_lng: d.recolha_lng ?? null,
            regresso_lat: d.regresso_lat ?? null, regresso_lng: d.regresso_lng ?? null,
            foto_url: d.foto_url ?? null,
          },
        });
      }

      // 3. Contrato (substitui o do ano se já existir)
      await tx.contratos_servico.deleteMany({ where: { aluno_id: aluno.aluno_id, ano_lectivo_id: ano.ano_lectivo_id } });
      const contrato = await tx.contratos_servico.create({
        data: {
          aluno_id: aluno.aluno_id, ano_lectivo_id: ano.ano_lectivo_id,
          rota_id: d.rota_id, viagens_dia: d.viagens_dia,
          tipo_servico: d.viagens_dia === 2 ? 'ambos' : 'recolha',
          preco_mensal: preco, cobranca_dia: 1, corte_dia: 10,
        },
      });

      // 4. Adesão (com serviços escolhidos)
      await tx.adesoes_servico.create({
        data: {
          aluno_id: aluno.aluno_id, ano_lectivo_id: ano.ano_lectivo_id,
          rota_id: d.rota_id, viagens_dia: d.viagens_dia,
          services_escolhidos: d.services_escolhidos || [],
          status: 'ativo',
        },
      });

      // 5. Cobranças: TAXA DE INSCRIÇÃO + mensalidades a partir do mês de início
      await tx.mensalidades.deleteMany({ where: { aluno_id: aluno.aluno_id, ano_lectivo_id: ano.ano_lectivo_id } });

      // 5a. A taxa (a 1ª cobrança do aluno, vence hoje — paga no ato)
      const valorTaxa = tipoInsc ? Number(tipoInsc.valor) : 0;
      if (valorTaxa > 0) {
        await tx.mensalidades.create({
          data: {
            aluno_id: aluno.aluno_id, ano_lectivo_id: ano.ano_lectivo_id,
            mes: 8, viagens_dia: d.viagens_dia,
            tipo: 'taxa_inscricao',
            valor_previsto: valorTaxa,
            status: 'pendente',
            vencimento: new Date(),
            referencia: d.referencia_pagamento,
          },
        });
      }

      // 5b. Mensalidades do mês de início em diante (com meio-mês 50%)
      const mesInicio = Number(d.mes_inicio) || 9;         // default: setembro
      const diaInicio = Number(d.dia_inicio) || 1;          // dia de entrada no serviço
      const ordemInicio = mesInicio >= 9 ? mesInicio - 9 : mesInicio + 3; // Set=0 ... Jul=10
      let nMens = 0;
      let valorPrimeiroMes = 0;
      for (const m of meses) {
        const ordemM = m.mes >= 9 ? m.mes - 9 : m.mes + 3;
        if (ordemM < ordemInicio) continue;                 // meses antes da entrada: não cobra
        const anoDoMes = m.mes >= 9 ? ano.ano_inicio : ano.ano_inicio + 1;
        let valor = Number(preco) * Number(m.fator);
        if (ordemM === ordemInicio && diaInicio >= 16) valor = valor * 0.5;  // entrada dia 16-31: 50%
        if (ordemM === ordemInicio) valorPrimeiroMes = valor;
        await tx.mensalidades.create({
          data: {
            aluno_id: aluno.aluno_id, ano_lectivo_id: ano.ano_lectivo_id,
            mes: m.mes, viagens_dia: d.viagens_dia,
            tipo: 'mensalidade',
            valor_previsto: valor,
            status: 'pendente',
            vencimento: new Date(anoDoMes, m.mes - 1, 1),
            referencia: d.referencia_pagamento,
          },
        });
        nMens++;
      }

      // 5c. O aluno fica INATIVO até pagar taxa + 1º mês (webhook ativa)
      await tx.alunos.update({
        where: { aluno_id: aluno.aluno_id },
        data: { ativo: false, motivo_estado: 'aguarda_pagamento' },
      });

      return {
        aluno_id: aluno.aluno_id, nome: aluno.nome,
        contrato_id: contrato.contrato_id,
        mensalidades_geradas: nMens,
        taxa_inscricao: valorTaxa || null,
        primeiro_mes: valorPrimeiroMes,
        total_a_pagar: valorTaxa + valorPrimeiroMes,
        tipo: tipoDesc,
      };
    });

    return { ok: true, ...resultado, hub: hubInfo };
  }
}
