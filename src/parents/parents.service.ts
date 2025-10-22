import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 📍 ÚLTIMA POSIÇÃO DE UM ALUNO - VERSÃO POSTGIS PROFISSIONAL
  // ============================================================
  async live(alunoId: string) {
    if (!alunoId) {
      throw new BadRequestException('aluno_id é obrigatório');
    }

    // ✅ Query otimizada com PostGIS
    const result: any[] = await this.prisma.$queryRaw`
      SELECT 
        av.viagem_id,
        av.aluno_id,
        g.gps_id,
        g.latitude as bus_lat,
        g.longitude as bus_lng,
        g.velocidade,
        g.timestamp,
        a.home_lat,
        a.home_lng,
        ST_Distance(
          g.geom::geography,
          a.home_geom::geography
        ) as distancia_metros,
        CASE 
          WHEN g.velocidade > 0 THEN 
            ST_Distance(g.geom::geography, a.home_geom::geography) / (g.velocidade * 1000.0 / 3600.0) / 60.0
          ELSE 
            ST_Distance(g.geom::geography, a.home_geom::geography) / (20.0 * 1000.0 / 3600.0) / 60.0
        END as eta_minutos
      FROM public.aluno_viagem av
      JOIN public.viagens v ON v.viagem_id = av.viagem_id
      JOIN public.gps_viagem g ON g.viagem_id = v.viagem_id
      JOIN public.alunos a ON a.aluno_id = av.aluno_id
      WHERE av.aluno_id = ${alunoId}::uuid
        AND av.status_embarque = 'embarcado'
        AND g.geom IS NOT NULL
        AND a.home_geom IS NOT NULL
      ORDER BY g.timestamp DESC
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return null;
    }

    const data = result[0];

    return {
      viagem_id: data.viagem_id,
      aluno_id: data.aluno_id,
      bus: {
        latitude: Number(data.bus_lat),
        longitude: Number(data.bus_lng),
        velocidade: data.velocidade ? Number(data.velocidade) : null,
      },
      timestamp: data.timestamp,
      distancia_metros: data.distancia_metros ? Math.round(Number(data.distancia_metros)) : null,
      eta_minutos: data.eta_minutos ? Math.round(Number(data.eta_minutos)) : null,
    };
  }

  // ============================================================
  // 👨‍👩‍👧 LISTA OS ALUNOS DO ENCARREGADO (VIA TELEFONE) - CORRIGIDO
  // ============================================================
  async myStudents(telefone: string) {
    if (!telefone) {
      return [];
    }

    // ✅ CORRIGIDO: Buscar encarregado pelo TELEFONE
    const encarregado = await this.prisma.encarregados.findUnique({
      where: { telefone },
      select: { encarregado_id: true },
    });

    if (!encarregado) {
      return [];
    }

    // Buscar alunos que têm esse encarregado_id
    return await this.prisma.alunos.findMany({
      where: { encarregado_id: encarregado.encarregado_id },
      select: {
        aluno_id: true,
        nome: true,
        foto: true,
        foto_url: true,
        referencia_pagamento: true,
        status: true,
        home_lat: true,
        home_lng: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  // ============================================================
  // 💰 HISTÓRICO FINANCEIRO
  // ============================================================
  async billing(alunoId: string) {
    if (!alunoId) {
      throw new BadRequestException('aluno_id é obrigatório');
    }

    return await this.prisma.pagamentos.findMany({
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

  // ============================================================
  // 📝 CRIAR NOVA INSCRIÇÃO (ADESÃO)
  // ============================================================
  async criarInscricao(data: {
    aluno_id?: string;
    nome_aluno?: string;
    encarregado_id: string;
    ano_lectivo_id: string;
    rota_id?: string;
    viagens_dia?: number;
    services_escolhidos?: string[];
    latitude?: number;
    longitude?: number;
    endereco?: string;
    foto_url?: string;
  }) {
    const {
      aluno_id,
      nome_aluno,
      encarregado_id,
      ano_lectivo_id,
      rota_id,
      viagens_dia,
      services_escolhidos,
      latitude,
      longitude,
      foto_url,
    } = data;

    // Validações
    if (!encarregado_id) {
      throw new BadRequestException('encarregado_id é obrigatório');
    }
    if (!ano_lectivo_id) {
      throw new BadRequestException('ano_lectivo_id é obrigatório');
    }

    const encarregadoExiste = await this.prisma.encarregados.findUnique({
      where: { encarregado_id }
    });

    if (!encarregadoExiste) {
      throw new NotFoundException('Encarregado não encontrado');
    }

    const anoLectivoExiste = await this.prisma.ano_lectivo.findUnique({
      where: { ano_lectivo_id }
    });

    if (!anoLectivoExiste) {
      throw new NotFoundException('Ano letivo não encontrado');
    }

    let aluno: any = null;

    if (aluno_id) {
      aluno = await this.prisma.alunos.findUnique({ 
        where: { aluno_id } 
      });
    }

    // ✅ Criar aluno - trigger sincroniza home_geom automaticamente
    if (!aluno) {
      aluno = await this.prisma.alunos.create({
        data: {
          nome: nome_aluno || 'Aluno sem nome',
          foto_url: foto_url || null,
          referencia_pagamento: `REF${Date.now()}`,
          encarregado_id,
          home_lat: latitude ?? null,
          home_lng: longitude ?? null,
        },
      });
    }

    const adesao = await this.prisma.adesoes_servico.create({
      data: {
        aluno_id: aluno.aluno_id,
        ano_lectivo_id,
        rota_id: rota_id || null,
        viagens_dia: viagens_dia ?? 1,
        services_escolhidos: services_escolhidos || [],
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

  // ============================================================
  // 📋 LISTAR INSCRIÇÕES DE UM ENCARREGADO
  // ============================================================
  async listarInscricoes(encarregado_id: string) {
    if (!encarregado_id) {
      return [];
    }

    return await this.prisma.adesoes_servico.findMany({
      where: {
        alunos: { encarregado_id },
      },
      include: {
        alunos: { 
          select: { 
            aluno_id: true, 
            nome: true, 
            foto: true,
            foto_url: true 
          } 
        },
        rotas: true,
        ano_lectivo: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ============================================================
  // 🗺️ BUSCAR ALUNOS PRÓXIMOS (NOVO - POSTGIS)
  // ============================================================
  async buscarAlunosProximos(lat: number, lng: number, raioKm: number = 2) {
    const raioMetros = raioKm * 1000;

    const result: any[] = await this.prisma.$queryRaw`
      SELECT 
        a.aluno_id,
        a.nome,
        a.home_lat as latitude,
        a.home_lng as longitude,
        a.referencia_pagamento,
        ST_Distance(
          a.home_geom::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) / 1000 as distancia_km
      FROM public.alunos a
      WHERE a.ativo = true
        AND a.home_geom IS NOT NULL
        AND ST_DWithin(
          a.home_geom::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${raioMetros}
        )
      ORDER BY distancia_km
      LIMIT 50
    `;

    return result.map(r => ({
      aluno_id: r.aluno_id,
      nome: r.nome,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      referencia_pagamento: r.referencia_pagamento,
      distancia_km: Number(r.distancia_km).toFixed(2),
    }));
  }
}
