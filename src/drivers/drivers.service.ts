import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 📍 1. POSIÇÃO GPS - VERSÃO POSTGIS PROFISSIONAL
  // ============================================================
  async reportarPosicao(viagemCodigo: string, lat: number, lng: number) {
    // Validações
    if (!viagemCodigo) {
      throw new NotFoundException('Código da viagem é obrigatório');
    }
    if (lat < -90 || lat > 90) {
      throw new NotFoundException('Latitude inválida (deve estar entre -90 e 90)');
    }
    if (lng < -180 || lng > 180) {
      throw new NotFoundException('Longitude inválida (deve estar entre -180 e 180)');
    }

    // Buscar viagem usando Prisma (seguro)
    const viagem = await this.prisma.viagens.findFirst({
      where: { codigo: viagemCodigo },
      select: { viagem_id: true }
    });

    if (!viagem) {
      throw new NotFoundException(`Viagem não encontrada: ${viagemCodigo}`);
    }

    // ✅ Inserir GPS - trigger cria geometry automaticamente
    const result: any[] = await this.prisma.$queryRaw`
      INSERT INTO public.gps_viagem (
        viagem_id, 
        latitude, 
        longitude, 
        velocidade, 
        estado,
        timestamp
      )
      VALUES (
        ${viagem.viagem_id}::uuid,
        ${lat},
        ${lng},
        0,
        'em_rota',
        NOW()
      )
      RETURNING 
        gps_id, 
        latitude, 
        longitude,
        ST_AsGeoJSON(geom) as geom_json
    `;

    return {
      ok: true,
      gps_id: result[0]?.gps_id,
      latitude: result[0]?.latitude,
      longitude: result[0]?.longitude,
      geom: result[0]?.geom_json ? JSON.parse(result[0].geom_json) : null,
    };
  }

  // ============================================================
  // 🔑 2. LOGIN DE MOTORISTA
  // ============================================================
  async login(telefone: string, senha: string) {
    if (!telefone || !senha) {
      throw new UnauthorizedException('Telefone e senha são obrigatórios');
    }

    const motorista = await this.prisma.motoristas.findFirst({
      where: { telefone },
    });

    if (!motorista) {
      throw new UnauthorizedException('Motorista não encontrado');
    }

    if (!motorista.ativo) {
      throw new UnauthorizedException('Motorista inativo');
    }

    if (motorista.senha && motorista.senha !== senha) {
      throw new UnauthorizedException('Senha incorreta');
    }

    return {
      motorista_id: motorista.motorista_id,
      nome: motorista.nome,
      telefone: motorista.telefone,
      viatura_id: motorista.viatura_id,
      foto_url: motorista.foto_url,
    };
  }

  // ============================================================
  // 📅 3. LISTAR AGENDA DE VIAGENS DO MOTORISTA
  // ============================================================
  async getAgenda(motorista_id: string) {
    if (!motorista_id) {
      throw new NotFoundException('motorista_id é obrigatório');
    }

    const viagens = await this.prisma.viagens.findMany({
      where: { motorista_id },
      include: {
        rotas: true,
        servicos: true,
      },
      orderBy: { data: 'asc' },
    });

    if (!viagens.length) {
      throw new NotFoundException('Nenhuma viagem programada para este motorista.');
    }

    return viagens;
  }

  // ============================================================
  // ▶️ 4. INICIAR VIAGEM
  // ============================================================
  async startViagem(viagem_id: string) {
    if (!viagem_id) {
      throw new NotFoundException('viagem_id é obrigatório');
    }

    try {
      return await this.prisma.viagens.update({
        where: { viagem_id },
        data: { data: new Date() },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Viagem não encontrada');
      }
      throw error;
    }
  }

  // ============================================================
  // ⏹️ 5. FINALIZAR VIAGEM
  // ============================================================
  async stopViagem(viagem_id: string) {
    if (!viagem_id) {
      throw new NotFoundException('viagem_id é obrigatório');
    }

    try {
      return await this.prisma.viagens.update({
        where: { viagem_id },
        data: { data: new Date() },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Viagem não encontrada');
      }
      throw error;
    }
  }

  // ============================================================
  // 👦 6. REGISTAR EMBARQUE OU DESEMBARQUE
  // ============================================================
  async registarEmbarque(data: {
    aluno_id: string;
    viagem_id: string;
    embarque: boolean;
    latitude?: number;
    longitude?: number;
  }) {
    if (!data.aluno_id || !data.viagem_id) {
      throw new NotFoundException('aluno_id e viagem_id são obrigatórios');
    }

    const aluno = await this.prisma.alunos.findUnique({
      where: { aluno_id: data.aluno_id },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    const viagem = await this.prisma.viagens.findUnique({
      where: { viagem_id: data.viagem_id },
    });

    if (!viagem) {
      throw new NotFoundException('Viagem não encontrada');
    }

    return await this.prisma.aluno_viagem.create({
      data: {
        aluno_id: data.aluno_id,
        viagem_id: data.viagem_id,
        status_embarque: data.embarque ? 'embarcado' : 'desembarcado',
        data_registro: new Date(),
      },
    });
  }

  // ============================================================
  // 🔔 7. BUSCAR ALERTAS PENDENTES
  // ============================================================
  async getAlerts(motorista_id: string) {
    if (!motorista_id) {
      return [];
    }

    return await this.prisma.alertas_motorista.findMany({
      where: {
        motorista_id,
        enviado: false,
      },
      orderBy: { criado_em: 'desc' },
    });
  }

  // ============================================================
  // ✅ 8. MARCAR ALERTA COMO LIDO
  // ============================================================
  async markAlertSent(alerta_id: string) {
    if (!alerta_id) {
      throw new NotFoundException('alerta_id é obrigatório');
    }

    try {
      await this.prisma.alertas_motorista.update({
        where: { alerta_id },
        data: { enviado: true, lido: true },
      });
      return { ok: true, alerta_id };
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Alerta não encontrado');
      }
      throw error;
    }
  }

  // ============================================================
  // 📍 9. BUSCAR MOTORISTAS PRÓXIMOS (NOVO - POSTGIS)
  // ============================================================
  async buscarMotoristasProximos(lat: number, lng: number, raioKm: number = 5) {
    const raioMetros = raioKm * 1000;

    const result: any[] = await this.prisma.$queryRaw`
      SELECT DISTINCT ON (m.motorista_id)
        m.motorista_id,
        m.nome,
        m.telefone,
        m.viatura_id,
        g.latitude,
        g.longitude,
        ST_Distance(
          g.geom::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) / 1000 as distancia_km
      FROM public.motoristas m
      JOIN public.viagens v ON v.motorista_id = m.motorista_id
      JOIN public.gps_viagem g ON g.viagem_id = v.viagem_id
      WHERE m.ativo = true
        AND g.geom IS NOT NULL
        AND ST_DWithin(
          g.geom::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${raioMetros}
        )
      ORDER BY m.motorista_id, g.timestamp DESC
    `;

    return result.map(r => ({
      motorista_id: r.motorista_id,
      nome: r.nome,
      telefone: r.telefone,
      viatura_id: r.viatura_id,
      posicao_atual: {
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
      },
      distancia_km: Number(r.distancia_km).toFixed(2),
    }));
  }
}
