import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminResetService {
  constructor(private prisma: PrismaService) {}

  async reset(nivel: number, confirmar: string) {
    // Proteção 1: palavra de confirmação obrigatória
    if (confirmar !== 'APAGAR_TUDO') {
      throw new BadRequestException(
        'Confirmação inválida. Envie { "confirmar": "APAGAR_TUDO", "nivel": 1 ou 2 }',
      );
    }
    // Proteção 2: nível válido
    if (nivel !== 1 && nivel !== 2) {
      throw new BadRequestException('Nível inválido. Use 1 (só alunos) ou 2 (migração completa).');
    }

    const rel: Record<string, number> = {};

    // Tudo numa transação: se algo falhar, faz rollback (nada se perde)
    await this.prisma.$transaction(async (tx) => {
      // ===== NÍVEL 1: dados de alunos e dependências =====
      rel['aluno_viagem'] = (await tx.aluno_viagem.deleteMany({})).count;
      rel['pagamentos'] = (await tx.pagamentos.deleteMany({})).count;
      rel['ajustes_mensalidade'] = (await tx.ajustes_mensalidade.deleteMany({})).count;
      rel['excecoes_mensalidade'] = (await tx.excecoes_mensalidade.deleteMany({})).count;
      rel['movimentos_mensalidade'] = (await tx.movimentos_mensalidade.deleteMany({})).count;
      rel['mensalidades'] = (await tx.mensalidades.deleteMany({})).count;
      rel['ocorrencias'] = (await tx.ocorrencias.deleteMany({})).count;
      rel['autorizacoes_entrega'] = (await tx.autorizacoes_entrega.deleteMany({})).count;
      rel['anexos_aluno'] = (await tx.anexos_aluno.deleteMany({})).count;
      rel['contratos_servico'] = (await tx.contratos_servico.deleteMany({})).count;
      rel['adesoes_servico'] = (await tx.adesoes_servico.deleteMany({})).count;
      rel['encarregados_alunos'] = (await tx.encarregados_alunos.deleteMany({})).count;
      rel['encarregados_token'] = (await tx.encarregados_token.deleteMany({})).count;
      rel['alunos'] = (await tx.alunos.deleteMany({})).count;
      rel['encarregados'] = (await tx.encarregados.deleteMany({})).count;
      rel['pessoas_autorizadas'] = (await tx.pessoas_autorizadas.deleteMany({})).count;

      // ===== NÍVEL 2: estrutura (rotas, viagens, frota) =====
      if (nivel === 2) {
        rel['precos_rota'] = (await tx.precos_rota.deleteMany({})).count;
        rel['partidas_programadas'] = (await tx.partidas_programadas.deleteMany({})).count;
        rel['gps_viagem'] = (await tx.gps_viagem.deleteMany({})).count;
        rel['alertas_motorista'] = (await tx.alertas_motorista.deleteMany({})).count;
        rel['viagens'] = (await tx.viagens.deleteMany({})).count;
        rel['rotas'] = (await tx.rotas.deleteMany({})).count;
        rel['servicos'] = (await tx.servicos.deleteMany({})).count;

        // Painéis: NÃO apagar — apenas desassociar da viatura
        const desassoc = await tx.paineis.updateMany({ data: { viatura_id: null } });
        rel['paineis_desassociados'] = desassoc.count;

        rel['vigilantes'] = (await tx.vigilantes.deleteMany({})).count;
        rel['motoristas'] = (await tx.motoristas.deleteMany({})).count;
        rel['viaturas'] = (await tx.viaturas.deleteMany({})).count;
      }
    }, { timeout: 60000 });

    return {
      ok: true,
      nivel,
      mensagem: nivel === 1
        ? 'Reset Nível 1 concluído (dados de alunos apagados).'
        : 'Reset Nível 2 concluído (migração completa apagada).',
      apagados: rel,
      preservados: ['escolas', 'ano_lectivo', 'tipo_inscricao', 'planos',
        'artigos_servico', 'precos_mes', 'integracoes', 'storage_config',
        'utilizadores', 'paineis'],
    };
  }
}
