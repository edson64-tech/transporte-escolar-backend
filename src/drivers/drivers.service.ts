import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 📍 1. POSIÇÃO GPS - CORRIGIDO (SEM SQL INJECTION)
  // ============================================================
  async reportarPosicao(viagemCodigo: string, lat: number, lng: number) {
    // ✅ CORRIGIDO: Usar Prisma ORM em vez de raw SQL
    const viagem = await this.prisma.viagens.findFirst({
      where: { codigo: viagemCodigo },
      select: { viagem_id: true }
    });

    if (!viagem) {
      throw new NotFoundException(`Viagem não encontrada para código: ${viagemCodigo}`);
    }

    const gps = await this.prisma.gps_viagem.create({
      data: {
        viagem_id: viagem.viagem_id,
        latitude: lat,
        longitude: lng,
        velocidade: 0,
        estado: 'em_rota',
      }
    });

    return { ok: true, gps_id: gps.gps_id };
  }

  // ============================================================
  // 🔑 2. LOGIN DE MOTORISTA
  // ============================================================
  async login(telefone: string, senha: string) {
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
    };
  }

  // ============================================================
  // 📅 3. LISTAR AGENDA DE VIAGENS DO MOTORISTA
  // ============================================================
  async getAgenda(motorista_id: string) {
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
    try {
      return await this.prisma.viagens.update({
        where: { viagem_id },
        data: {
          data: new Date(),
        },
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
    try {
      return await this.prisma.viagens.update({
        where: { viagem_id },
        data: {
          data: new Date(),
        },
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
}
