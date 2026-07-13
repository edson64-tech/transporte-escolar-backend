import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface PontoAluno {
  aluno_id: string;
  nome: string;
  lat: number;
  lng: number;
}

@Injectable()
export class OtimizacaoService {
  private readonly logger = new Logger(OtimizacaoService.name);

  constructor(private prisma: PrismaService) {}

  private distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Alunos únicos da rota (via viagens -> aluno_viagem -> alunos)
  private async obterAlunosDaRota(rota_id: string): Promise<PontoAluno[]> {
    const viagens = await this.prisma.viagens.findMany({
      where: { rota_id },
      select: { viagem_id: true },
    });
    if (viagens.length === 0) return [];

    const viagemIds = viagens.map(v => v.viagem_id);

    const avs = await this.prisma.aluno_viagem.findMany({
      where: { viagem_id: { in: viagemIds } },
      select: { aluno_id: true },
    });

    const alunoIds = [...new Set(avs.map(a => a.aluno_id).filter(Boolean))] as string[];
    if (alunoIds.length === 0) return [];

    const alunos = await this.prisma.alunos.findMany({
      where: { aluno_id: { in: alunoIds } },
      select: { aluno_id: true, nome: true, home_lat: true, home_lng: true },
    });

    return alunos
      .filter(a => a.home_lat != null && a.home_lng != null)
      .map(a => ({
        aluno_id: a.aluno_id,
        nome: a.nome,
        lat: Number(a.home_lat),
        lng: Number(a.home_lng),
      }));
  }

  // Nearest Neighbor
  private nearestNeighbor(pontos: PontoAluno[], startLat?: number, startLng?: number) {
    if (pontos.length === 0) return { ordem: [] as PontoAluno[], distanciaTotal: 0 };

    const restantes = [...pontos];
    const ordem: PontoAluno[] = [];
    let distanciaTotal = 0;

    // Ponto inicial: o mais próximo do start (escola), ou o 1º
    let atualLat: number, atualLng: number;
    if (startLat != null && startLng != null) {
      atualLat = startLat;
      atualLng = startLng;
    } else {
      const primeiro = restantes.shift()!;
      ordem.push(primeiro);
      atualLat = primeiro.lat;
      atualLng = primeiro.lng;
    }

    while (restantes.length > 0) {
      let melhorIdx = 0;
      let melhorDist = Infinity;
      for (let i = 0; i < restantes.length; i++) {
        const d = this.distanciaKm(atualLat, atualLng, restantes[i].lat, restantes[i].lng);
        if (d < melhorDist) {
          melhorDist = d;
          melhorIdx = i;
        }
      }
      const escolhido = restantes.splice(melhorIdx, 1)[0];
      ordem.push(escolhido);
      distanciaTotal += melhorDist;
      atualLat = escolhido.lat;
      atualLng = escolhido.lng;
    }

    return { ordem, distanciaTotal };
  }

  // Otimizar rota e guardar
  async otimizarRota(rota_id: string, startLat?: number, startLng?: number) {
    const alunos = await this.obterAlunosDaRota(rota_id);

    if (alunos.length === 0) {
      return { erro: 'Rota sem alunos com coordenadas definidas', rota_id };
    }

    const { ordem, distanciaTotal } = this.nearestNeighbor(alunos, startLat, startLng);

    // Desativar otimizações anteriores desta rota
    await this.prisma.rotas_otimizadas.updateMany({
      where: { rota_id, ativa: true },
      data: { ativa: false },
    });

    // Guardar nova otimização
    const registo = await this.prisma.rotas_otimizadas.create({
      data: {
        rota_id,
        algoritmo: 'nearest_neighbor',
        ordem_alunos: JSON.stringify(
          ordem.map((a, i) => ({ posicao: i + 1, aluno_id: a.aluno_id, nome: a.nome })),
        ),
        distancia_total_km: Math.round(distanciaTotal * 100) / 100,
        ativa: true,
      },
    });

    this.logger.log(`Rota ${rota_id} otimizada: ${ordem.length} alunos, ${distanciaTotal.toFixed(1)}km`);

    return {
      rota_otimizada_id: registo.rota_otimizada_id,
      rota_id,
      algoritmo: 'nearest_neighbor',
      total_alunos: ordem.length,
      distancia_total_km: Math.round(distanciaTotal * 100) / 100,
      ordem: ordem.map((a, i) => ({ posicao: i + 1, aluno_id: a.aluno_id, nome: a.nome })),
    };
  }

  // Obter otimização ativa
  async obterOtimizacaoAtiva(rota_id: string) {
    const reg = await this.prisma.rotas_otimizadas.findFirst({
      where: { rota_id, ativa: true },
      orderBy: { criado_em: 'desc' },
    });
    if (!reg) return { erro: 'Sem otimização ativa para esta rota', rota_id };
    return {
      ...reg,
      ordem_alunos: reg.ordem_alunos ? JSON.parse(reg.ordem_alunos) : [],
    };
  }
}
