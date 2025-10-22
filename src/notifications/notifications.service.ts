import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Canal = 'whatsapp' | 'sms' | 'email';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async agendarEnvioImediato(opts: {
    titulo: string;
    mensagem: string;
    canal: Canal;
    aluno_id?: string;
    rota_id?: string;
    viagem_id?: string;
  }) {
    const n = await this.prisma.notificacoes.create({
      data: {
        titulo: opts.titulo,
        mensagem: opts.mensagem,
        canal: opts.canal,
        programacao_tipo: 'imediata',
        status: 'pendente',
        aluno_id: opts.aluno_id || null,
        rota_id: opts.rota_id || null,
        viagem_id: opts.viagem_id || null,
      } as any,
    } as any);

    // cria um envio pendente (fila) — destinatário resolvido por worker (pai do aluno)
    await this.prisma.notificacoes_envio.create({
      data: {
        notificacao_uuid: (n as any).uuid_publico,
        canal: opts.canal,
        destinatario: '', // será resolvido por worker (pai do aluno)
        mensagem: opts.mensagem,
        status: 'pendente',
        tentativas: 0,
      } as any,
    } as any);

    return { ok: true, uuid: (n as any).uuid_publico };
  }
}
