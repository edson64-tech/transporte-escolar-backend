import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronEtaService {
  private readonly logger = new Logger(CronEtaService.name);

  constructor(private prisma: PrismaService) {}

  // A cada 30s: verifica ETAs <= 5 min e cria alertas
  @Cron(CronExpression.EVERY_30_SECONDS)
  async verificarEtasEcriarAlertas() {
    try {
      const doisMinutosAtras = new Date(Date.now() - 2 * 60000);

      // ETAs recentes, próximos, sem alerta enviado
      const etas = await this.prisma.eta_calculos.findMany({
        where: {
          criado_em: { gte: doisMinutosAtras },
          alerta_enviado: false,
          tempo_minutos: { lte: 5, gt: 0 },
        },
        take: 50,
      });

      if (etas.length === 0) return;

      for (const eta of etas) {
        if (!eta.viagem_id || !eta.aluno_id) continue;

        // Motorista da viagem
        const viagem = await this.prisma.viagens.findUnique({
          where: { viagem_id: eta.viagem_id },
          select: { motorista_id: true, codigo: true },
        });
        if (!viagem?.motorista_id) continue;

        // Nome do aluno
        const aluno = await this.prisma.alunos.findUnique({
          where: { aluno_id: eta.aluno_id },
          select: { nome: true },
        });

        // Criar alerta (motorista_id e viagem_id obrigatórios - confirmados)
        await this.prisma.alertas_motorista.create({
          data: {
            motorista_id: viagem.motorista_id,
            viagem_id: eta.viagem_id,
            mensagem: `Proximidade: ${aluno?.nome || 'Aluno'} a ${eta.tempo_minutos} min`,
            tipo_alerta: 'eta_proximidade',
            enviado: false,
          },
        });

        // Marcar ETA como alertado
        await this.prisma.eta_calculos.update({
          where: { eta_id: eta.eta_id },
          data: { alerta_enviado: true },
        });

        this.logger.log(
          `Alerta criado [${viagem.codigo}]: ${aluno?.nome} a ${eta.tempo_minutos}min`,
        );
      }
    } catch (erro: any) {
      this.logger.error(`Cron ETA: ${erro.message}`);
    }
  }
}
