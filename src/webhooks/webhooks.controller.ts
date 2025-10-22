import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private prisma: PrismaService) {}

  @Post('izipay')
  @HttpCode(200)
  async izipay(@Body() body: any) {
    // adapta estes campos ao payload real:
    const id = body?.id ?? body?.payload?.body?.id ?? Math.floor(Date.now()/1000);
    const reference = body?.reference ?? body?.payload?.body?.serviceReference ?? null;
    const value_cents = body?.value ?? body?.payload?.body?.amount ?? null;
    const payed_at = body?.payed_at ?? body?.payload?.body?.registredDate ?? new Date().toISOString();
    const status = body?.status ?? (body?.payload?.body?.state === 1 ? 'success' : 'pending');

    await this.prisma.$executeRawUnsafe(`
      INSERT INTO pagamentos_izipay (id, reference, value_cents, payed_at, status, payload, created_at, updated_at)
      VALUES (${Number(id)}, ${reference ? `'${reference}'` : 'NULL'}, ${value_cents ?? 'NULL'},
              ${payed_at ? `'${payed_at}'` : 'NULL'}, '${status}', ${`'${JSON.stringify(body).replace(/'/g,"''")}'`}::jsonb, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        reference = EXCLUDED.reference,
        value_cents = EXCLUDED.value_cents,
        payed_at = EXCLUDED.payed_at,
        status = EXCLUDED.status,
        payload = EXCLUDED.payload,
        updated_at = NOW();
    `);

    // A trigger fn_aplicar_pagamento_izipay já trata da conciliação.
    return { ok: true };
  }
}
