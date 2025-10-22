import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 📍 ÚLTIMA POSIÇÃO DE UM ALUNO - CORRIGIDO
  // ============================================================
  async live(alunoId: string) {
    if (!alunoId) {
      throw new BadRequestException('aluno_id é obrigatório');
    }

    // Buscar última viagem do aluno
    const ultimaViagemAluno = await this.prisma.aluno_viagem.findFirst({
      where: { 
        aluno_id: alunoId,
        status_embarque: 'embarcado'
      },
      orderBy: { data_registro: 'desc' },
      include: {
        viagens: {
          include: {
            gps_viagem: {
              orderBy: { timestamp: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!ultimaViagemAluno?.viagens?.gps_viagem?.[0]) {
      return null;
    }

    const gps = ultimaViagemAluno.viagens.gps_viagem[0];
    
    // Buscar dados do aluno para calcular distância
    const aluno = await this.prisma.alunos.findUnique({
      where: { aluno_id: alunoId },
      select: { home_lat: true, home_lng: true }
    });

    // Calcular distância simples (haversine simplificado)
    let distanciaMetros: number | null = null;
    let etaMinutos: number | null = null;

    if (aluno?.home_lat && aluno?.home_lng && gps.latitude && gps.longitude) {
      const R = 6371000; // Raio da Terra em metros
      const lat1 = aluno.home_lat * Math.PI / 180;
      const lat2 = Number(gps.latitude) * Math.PI / 180;
      const deltaLat = (Number(gps.latitude) - aluno.home_lat) * Math.PI / 180;
      const deltaLng = (Number(gps.longitude) - aluno.home_lng) * Math.PI / 180;

      const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      distanciaMetros = R * c;

      // ETA: velocidade em m/s (assumir 20 km/h = 5.5 m/s se velocidade não disponível)
      const velocidadeMS = gps.velocidade ? Number(gps.velocidade) * 1000 / 3600 : 5.5;
      etaMinutos = Math.round(distanciaMetros / velocidadeMS / 60);
    }

    return {
      viagem_id: ultimaViagemAluno.viagem_id,
      bus: {
        latitude: gps.latitude,
        longitude: gps.longitude,
        velocidade: gps.velocidade,
      },
      timestamp: gps.timestamp,
      distancia_metros: distanciaMetros ? Math.round(distanciaMetros) : null,
      eta_minutos: etaMinutos,
    };
  }

  // ============================================================
  // 👨‍👩‍👧 LISTA OS ALUNOS DO ENCARREGADO (VIA E-MAIL)
  // ============================================================
  async myStudents(email: string) {
    if (!email) {
      return [];
    }

    // Buscar encarregado pelo e-mail
    const encarregado = await this.prisma.encarregados.findUnique({
      where: { email },
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

    // Verificar se encarregado existe
    const encarregadoExiste = await this.prisma.encarregados.findUnique({
      where: { encarregado_id }
    });

    if (!encarregadoExiste) {
      throw new NotFoundException('Encarregado não encontrado');
    }

    // Verificar se ano letivo existe
    const anoLectivoExiste = await this.prisma.ano_lectivo.findUnique({
      where: { ano_lectivo_id }
    });

    if (!anoLectivoExiste) {
      throw new NotFoundException('Ano letivo não encontrado');
    }

    // Verificar se aluno existe
    let aluno: any = null;

    if (aluno_id) {
      aluno = await this.prisma.alunos.findUnique({ 
        where: { aluno_id } 
      });
    }

    // Se não existe, criar
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

    // Criar adesão
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
}
