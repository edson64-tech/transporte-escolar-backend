import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private prisma: PrismaService) {}

  @Post('izipay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook IziPay para receber notificações de pagamento' })
  @ApiResponse({ status: 200, description: 'Webhook processado com sucesso' })
  async izipay(@Body() body: any) {
    // Extrair dados do payload
    const id = body?.id ?? body?.payload?.body?.id ?? Math.floor(Date.now() / 1000);
    const reference = body?.reference ?? body?.payload?.body?.serviceReference ?? null;
    const value_cents = body?.value ?? body?.payload?.body?.amount ?? null;
    const payed_at = body?.payed_at ?? body?.payload?.body?.registredDate ?? null;
    const status = body?.status ?? (body?.payload?.body?.state === 1 ? 'success' : 'pending');

    try {
      // ✅ CORRIGIDO: Usar Prisma em vez de raw SQL
      await this.prisma.pagamentos_izipay.upsert({
        where: { id: Number(id) },
        update: {
          reference,
          value_cents,
          payed_at: payed_at ? new Date(payed_at) : null,
          status,
          payload: body,
          updated_at: new Date(),
        },
        create: {
          id: Number(id),
          reference,
          value_cents,
          payed_at: payed_at ? new Date(payed_at) : null,
          status,
          payload: body,
        },
      });

      // A trigger fn_aplicar_pagamento_izipay já trata da conciliação automática
      return { ok: true, message: 'Pagamento processado com sucesso' };
    } catch (error: any) {
      console.error('Erro ao processar webhook IziPay:', error);
      return { ok: false, error: 'Erro ao processar pagamento' };
    }
  }
}
