import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Executa a cada 5 minutos
  @Cron(CronExpression.EVERY_5_MINUTES)
  async verificarAlertasMotoristas() {
    this.logger.log('⏰ Verificando alertas de motoristas...');

    // Lê o parâmetro de minutos configurado no sistema
    const parametro = await this.prisma.parametros_sistema.findFirst({
      where: { chave: 'alerta_motorista_minutos' },
    });

    const minutosAlerta = parametro ? parseInt(parametro.valor, 10) : 20;

    const agora = new Date();
    const intervalo = new Date(agora.getTime() + minutosAlerta * 60000);

    // 🔍 Busca viagens que começam dentro do intervalo definido
    const viagens = await this.prisma.viagens.findMany({
      where: {
        data: { gte: agora, lte: intervalo },
      },
    });

    for (const viagem of viagens) {
      if (!viagem.motorista_id) continue;

      // Verifica se o alerta já existe
      const alertaExistente = await this.prisma.alertas_motorista.findFirst({
        where: {
          motorista_id: viagem.motorista_id,
          viagem_id: viagem.viagem_id,
          tipo_alerta: 'inicio_viagem',
        },
      });

      // Se ainda não existir, cria um novo alerta
      if (!alertaExistente) {
        await this.prisma.alertas_motorista.create({
          data: {
            motorista_id: viagem.motorista_id,
            viagem_id: viagem.viagem_id,
            mensagem: `🚍 Sua viagem ${viagem.codigo} começa em ${minutosAlerta} minutos.`,
            tipo_alerta: 'inicio_viagem',
            enviado: false,
            lido: false,
          },
        });

        this.logger.log(
          `🔔 Alerta criado para motorista ${viagem.motorista_id} (viagem ${viagem.codigo})`
        );
      }
    }
  }
}
