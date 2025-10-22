import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  // 📍 Última posição de um aluno
  async live(alunoId: string) {
    // aluno_id é UUID (string) no teu schema
    const ultimaPos = await this.prisma.$queryRaw<Array<{
      aluno_id: string;
      latitude: number | null;
      longitude: number | null;
      data_registro: Date;
    }>>`
      SELECT av.aluno_id, av.latitude, av.longitude, av.data_registro
      FROM public.aluno_viagem av
      WHERE av.aluno_id = ${alunoId}
      ORDER BY av.data_registro DESC
      LIMIT 1
    `;

    return ultimaPos[0] || null;
  }

  // 👨‍👩‍👧 Lista os alunos do encarregado (via e-mail)
  async myStudents(email: string) {
    // 1) Buscar encarregado pelo e-mail
    const enc = await this.prisma.encarregados.findUnique({
      where: { email: email || '' },
      select: { encarregado_id: true },
    });

    if (!enc) return [];

    // 2) Buscar alunos que têm esse encarregado_id
    return this.prisma.alunos.findMany({
      where: { encarregado_id: enc.encarregado_id },
      select: {
        aluno_id: true,
        nome: true,
        foto: true,
        referencia_pagamento: true,
        status: true,
        home_lat: true,
        home_lng: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  // 💰 Histórico financeiro
  async billing(alunoId: string) {
    return this.prisma.pagamentos.findMany({
      where: { aluno_id: alunoId },
      orderBy: { data_pagamento: 'desc' },
      select: {
        pagamento_id: true,
        ano_letivo: true,
        mes: true,
        valor: true,
        data_pagamento: true,
        status: true,
        referencia: true,
      },
    });
  }

  // 📝 Criar nova inscrição (adesão)
  async criarInscricao(data: any) {
    const {
      // se já existir aluno, vem aluno_id; caso contrário criamos um
      aluno_id,
      nome_aluno,
      encarregado_id,
      ano_lectivo_id,
      rota_id,
      viagens_dia,
      services_escolhidos,
      latitude,
      longitude,
      endereco,    // (guardaremos por enquanto em alunos.endereco se você depois criar o campo)
      foto_url,
    } = data;

    // validações mínimas
    if (!encarregado_id) throw new NotFoundException('encarregado_id é obrigatório');
    if (!ano_lectivo_id) throw new NotFoundException('ano_lectivo_id é obrigatório');

    // ✅ Verifica se o aluno existe, senão cria
    let aluno: any = null;

    if (aluno_id) {
      aluno = await this.prisma.alunos.findUnique({ where: { aluno_id } });
    }

    if (!aluno) {
      aluno = await this.prisma.alunos.create({
        data: {
          nome: nome_aluno || 'Aluno sem nome',
          foto: foto_url || null,
          referencia_pagamento: `REF${Date.now()}`,
          encarregado_id,
          // se quiser guardar endereço textual num campo (se existir):
          // endereco: endereco || null,
          // os campos home_lat/home_lng existem no teu schema:
          home_lat: latitude ?? null,
          home_lng: longitude ?? null,
        },
      });

      // Se quiser sincronizar também o campo PostGIS 'home_geom' (ou 'geom' se preferir)
      // como no schema eles existem como Unsupported, fazemos via SQL bruto
      if (latitude != null && longitude != null) {
        await this.prisma.$executeRawUnsafe(`
          UPDATE public.alunos
          SET home_geom = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
          WHERE aluno_id = '${aluno.aluno_id}';
        `);
      }
    }

    if (!aluno) throw new Error('Erro ao criar aluno.');

    // ✅ Cria a adesão (inscrição)
    const adesao = await this.prisma.adesoes_servico.create({
      data: {
        aluno_id: aluno.aluno_id,
        ano_lectivo_id,
        rota_id: rota_id || null,
        viagens_dia: viagens_dia ?? 1,
        services_escolhidos: Array.isArray(services_escolhidos) ? services_escolhidos : [],
        status: 'pendente',
      },
      include: {
        alunos: true,
        rotas: true,
        ano_lectivo: true,
      },
    });

    return {
      mensagem: 'Inscrição enviada com sucesso. Aguardando aprovação administrativa.',
      adesao,
    };
  }

  // 📋 Listar inscrições de um encarregado
  async listarInscricoes(encarregado_id: string) {
    if (!encarregado_id) return [];

    return this.prisma.adesoes_servico.findMany({
      where: {
        alunos: { encarregado_id },
      },
      include: {
        alunos: { select: { aluno_id: true, nome: true, foto: true } },
        rotas: true,
        ano_lectivo: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}
