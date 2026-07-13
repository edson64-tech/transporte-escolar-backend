import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EtaService {
  private readonly logger = new Logger(EtaService.name);

  constructor(private prisma: PrismaService) {}

  // Distância Haversine em KM
  calcularDistanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ETA em minutos (velocidade média urbana Luanda: 25 km/h)
  calcularEtaMinutos(distanciaKm: number, velocidadeKmH = 25): number {
    return Math.round((distanciaKm / velocidadeKmH) * 60);
  }

  // Última posição GPS da viagem (raw: geom é PostGIS)
  async obterUltimaPosicao(viagem_id: string) {
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT gps_id, viagem_id, timestamp,
             ST_Y(geom::geometry) AS lat,
             ST_X(geom::geometry) AS lng
      FROM gps_viagem
      WHERE viagem_id = ${viagem_id}::uuid
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    return rows.length > 0 ? rows[0] : null;
  }

  // ETA de um aluno específico numa viagem
  async obterEtaAluno(viagem_id: string, aluno_id: string) {
    const posicao = await this.obterUltimaPosicao(viagem_id);
    if (!posicao) {
      return { erro: 'Sem dados GPS para esta viagem' };
    }

    const aluno = await this.prisma.alunos.findUnique({
      where: { aluno_id },
      select: { aluno_id: true, nome: true, home_lat: true, home_lng: true },
    });

    if (!aluno || aluno.home_lat == null || aluno.home_lng == null) {
      return { erro: 'Aluno sem coordenadas de casa definidas' };
    }

    const viaturaLat = Number(posicao.lat);
    const viaturaLng = Number(posicao.lng);
    if (!viaturaLat || !viaturaLng) {
      return { erro: 'Coordenadas GPS inválidas' };
    }

    const distanciaKm = this.calcularDistanciaKm(
      viaturaLat, viaturaLng,
      Number(aluno.home_lat), Number(aluno.home_lng),
    );
    const tempoMinutos = this.calcularEtaMinutos(distanciaKm);

    // Guardar cálculo
    await this.prisma.eta_calculos.create({
      data: {
        viagem_id,
        aluno_id,
        viatura_lat: viaturaLat,
        viatura_lng: viaturaLng,
        aluno_lat: Number(aluno.home_lat),
        aluno_lng: Number(aluno.home_lng),
        distancia_km: Math.round(distanciaKm * 100) / 100,
        tempo_minutos: tempoMinutos,
      },
    });

    return {
      aluno: aluno.nome,
      distancia_km: Math.round(distanciaKm * 100) / 100,
      tempo_minutos: tempoMinutos,
      atualizado_em: posicao.timestamp,
    };
  }

  // ETAs de todos os alunos da viagem
  async obterEtasViagem(viagem_id: string) {
    const alunosViagem = await this.prisma.aluno_viagem.findMany({
      where: { viagem_id },
      select: { aluno_id: true },
    });

    const resultados: any[] = [];
    for (const av of alunosViagem) {
      if (!av.aluno_id) continue;
      const eta = await this.obterEtaAluno(viagem_id, av.aluno_id);
      resultados.push({ aluno_id: av.aluno_id, ...eta });
    }
    return { viagem_id, total: resultados.length, etas: resultados };
  }
}
