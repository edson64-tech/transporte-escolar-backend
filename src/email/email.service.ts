import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(private prisma: PrismaService) {}

  // Config atual (senha mascarada para o frontend)
  async getConfig() {
    const cfg = await this.prisma.email_config.findFirst({ orderBy: { atualizado_em: 'desc' } });
    if (!cfg) return { configurado: false };
    return {
      configurado: true,
      smtp_host: cfg.smtp_host,
      smtp_porta: cfg.smtp_porta,
      smtp_seguro: cfg.smtp_seguro,
      smtp_user: cfg.smtp_user,
      smtp_senha: cfg.smtp_senha ? '********' : null,
      remetente_nome: cfg.remetente_nome,
      remetente_email: cfg.remetente_email,
      ativo: cfg.ativo,
    };
  }

  // Gravar config (senha vazia/mascarada = preserva a existente)
  async setConfig(d: any) {
    if (!d.smtp_host) throw new BadRequestException('smtp_host é obrigatório');
    const atual = await this.prisma.email_config.findFirst({ orderBy: { atualizado_em: 'desc' } });
    let senha = d.smtp_senha;
    if (!senha || senha === '********') senha = atual?.smtp_senha || null;

    const dados = {
      smtp_host: d.smtp_host,
      smtp_porta: Number(d.smtp_porta) || 587,
      smtp_seguro: d.smtp_seguro === true,
      smtp_user: d.smtp_user || null,
      smtp_senha: senha,
      remetente_nome: d.remetente_nome || 'Assistance24 Transporte Escolar',
      remetente_email: d.remetente_email || null,
      ativo: d.ativo !== false,
      atualizado_em: new Date(),
    };
    if (atual) {
      await this.prisma.email_config.update({ where: { config_id: atual.config_id }, data: dados });
    } else {
      await this.prisma.email_config.create({ data: dados });
    }
    return { ok: true };
  }

  private async transporter() {
    const cfg = await this.prisma.email_config.findFirst({ orderBy: { atualizado_em: 'desc' } });
    if (!cfg || !cfg.ativo) throw new BadRequestException('Email não configurado ou inativo');
    return {
      cfg,
      t: nodemailer.createTransport({
        host: cfg.smtp_host,
        port: cfg.smtp_porta,
        secure: cfg.smtp_seguro,
        auth: cfg.smtp_user ? { user: cfg.smtp_user, pass: cfg.smtp_senha || '' } : undefined,
      }),
    };
  }

  // Envio genérico + registo em notificacoes_envio
  async enviar(para: string, assunto: string, html: string, anexos?: { filename: string; content: Buffer }[]) {
    const { cfg, t } = await this.transporter();
    let estado = 'enviado';
    let erro: string | null = null;
    try {
      await t.sendMail({
        from: `"${cfg.remetente_nome}" <${cfg.remetente_email || cfg.smtp_user}>`,
        to: para,
        subject: assunto,
        html,
        attachments: anexos,
      });
    } catch (e: any) {
      estado = 'falhou';
      erro = e?.message || 'erro desconhecido';
    }
    try {
      await this.prisma.$executeRaw`
        INSERT INTO notificacoes_envio (notificacao_uuid, canal, destinatario, mensagem, status, erro, enviado_em, tentativas)
        VALUES (uuid_generate_v4(), 'email', ${para}, ${assunto}, ${estado}, ${erro}, CURRENT_TIMESTAMP, 1)
      `;
    } catch { /* registo é best-effort */ }
    if (estado === 'falhou') throw new BadRequestException('Falha no envio: ' + erro);
    return { ok: true };
  }

  async testar(para: string) {
    if (!para) throw new BadRequestException('Indique o email de destino');
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px">
        <h2 style="color:#1a3c8b">Assistance24 — Transporte Escolar</h2>
        <p>Este é um <b>email de teste</b> da configuração de envio.</p>
        <p>Se o recebeu, a parametrização SMTP está a funcionar. ✅</p>
        <hr><small>Enviado em ${new Date().toLocaleString('pt-PT')}</small>
      </div>`;
    return this.enviar(para, 'Teste de configuração de email — Assistance24', html);
  }
}
