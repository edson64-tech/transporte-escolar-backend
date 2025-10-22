import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentsService {
  constructor(private prisma: PrismaService) {}

  async myStudents(userEmail: string) {
    // mapeia user.email -> encarregados.email
    return this.prisma.$queryRawUnsafe(`
      SELECT a.aluno_id, a.nome, a.referencia_pagamento
      FROM encarregados e
      JOIN encarregados_alunos ea ON ea.encarregado_id = e.encarregado_id
      JOIN alunos a ON a.aluno_id = ea.aluno_id
      WHERE e.email = '${userEmail}'
      ORDER BY a.nome
    `);
  }

  async live(aluno_id: string) {
    // devolve última posição do bus e ETA por aproximação (exemplo simples)
    const pos: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT g.viagem_id, ST_Y(g.geom) AS lat, ST_X(g.geom) AS lng, g.velocidade, g.timestamp
      FROM gps_viagem g
      JOIN aluno_viagem av ON av.viagem_id = g.viagem_id
      WHERE av.aluno_id = '${aluno_id}'
      ORDER BY g.timestamp DESC LIMIT 1
    `);
    if (!pos.length) return { viagem_id: null, bus: null, eta_min: null, dist_m: null };

    // distância até casa do aluno (se tiver geom). Caso não, retorna só posição.
    const distRow: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT CASE WHEN a.geom IS NOT NULL THEN
        ST_DistanceSphere(a.geom, ST_SetSRID(ST_MakePoint(${pos[0].lng}, ${pos[0].lat}),4326))
      ELSE NULL END AS dist
      FROM alunos a WHERE a.aluno_id='${aluno_id}'
    `);
    const dist = distRow[0]?.dist ?? null;
    const velMS = pos[0].velocidade ? (pos[0].velocidade * 1000 / 3600) : 6; // fallback 6 m/s
    const etaMin = dist ? +(dist / velMS / 60).toFixed(1) : null;

    return { viagem_id: pos[0].viagem_id, bus: { lat: pos[0].lat, lng: pos[0].lng, vel: pos[0].velocidade }, eta_min: etaMin, dist_m: dist ?? null };
  }

  async billing(aluno_id: string) {
    return this.prisma.$queryRawUnsafe(`
      SELECT * FROM vw_conciliacao_mensalidades
      WHERE aluno_id='${aluno_id}'
      ORDER BY mes_ref DESC
    `);
  }
}
