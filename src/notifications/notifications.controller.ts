import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Post('route')
  async sendToRoute(@Body() b: { rota: string; title: string; message: string }) {
    return this.svc.agendarEnvioImediato({
      titulo: b.title,
      mensagem: b.message,
      canal: 'whatsapp',
      rota_id: b.rota,
    });
  }

  @Post('broadcast')
  async sendBroadcast(@Body() b: { title: string; message: string }) {
    return this.svc.agendarEnvioImediato({
      titulo: b.title,
      mensagem: b.message,
      canal: 'whatsapp',
    });
  }
}
