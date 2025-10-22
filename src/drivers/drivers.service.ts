import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // 🚍 1. POSIÇÃO GPS - mantém o que já tinhas
  // ============================================================
  async reportarPosicao(viagemCodigo: string, lat: number, lng: number) {
    const viagem: any[] = await this.prisma.$queryRawUnsafe(`
      SELECT viagem_id FROM public.viagens WHERE codigo = '${viagemCodigo}' LIMIT 1;
    `);

    if (!viagem || viagem.length === 0) {
      throw new Error(`Viagem não encontrada para código: ${viagemCodigo}`);
    }

    const viagemId = viagem[0].viagem_id;

    const res: any[] = await this.prisma.$queryRawUnsafe(`
      INSERT INTO public.gps_viagem (viagem_id, latitude, longitude, velocidade, estado)
      VALUES ('${viagemId}', ${lat}, ${lng}, 0, 'em_rota')
      RETURNING gps_id;
    `);

    return { ok: true, gps_id: res[0]?.gps_id ?? null };
  }

  // ============================================================
  // 🔑 2. LOGIN DE MOTORISTA
  // ============================================================
  async login(telefone: string, senha: string) {
    const motorista = await this.prisma.motoristas.findFirst({
      where: { telefone },
    });

    if (!motorista) throw new UnauthorizedException('Motorista não encontrado');
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
      orderBy: { data: 'asc' }, // o teu schema usa campo 'data'
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
    return this.prisma.viagens.update({
      where: { viagem_id },
      data: {
        data: new Date(), // só atualiza a data de início
      },
    });
  }

  // ============================================================
  // ⏹️ 5. FINALIZAR VIAGEM
  // ============================================================
  async stopViagem(viagem_id: string) {
    return this.prisma.viagens.update({
      where: { viagem_id },
      data: {
        data: new Date(), // registra hora final também
      },
    });
  }

  // ============================================================
  // 👦 6. REGISTAR EMBARQUE OU DESEMBARQUE
  // ============================================================
  async registarEmbarque(data: any) {
    const aluno = await this.prisma.alunos.findUnique({
      where: { aluno_id: data.aluno_id },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');

    return this.prisma.aluno_viagem.create({
      data: {
        aluno_id: data.aluno_id,
        viagem_id: data.viagem_id,
        status_embarque: data.embarque ? 'embarcado' : 'desembarcado',
        data_registro: new Date(),
      },
    });
  }
  // 🔔 Buscar alertas pendentes
  async getAlerts(motorista_id: string) {
    return this.prisma.alertas_motorista.findMany({
      where: {
        motorista_id,
        enviado: false,
      },
      orderBy: { criado_em: 'desc' },
    });
  }

  // ✅ Marcar alerta como lido
  async markAlertSent(alerta_id: string) {
    await this.prisma.alertas_motorista.update({
      where: { alerta_id },
      data: { enviado: true },
    });
    return { ok: true, alerta_id };
  }

}
