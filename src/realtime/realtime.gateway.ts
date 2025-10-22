import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: (process.env.ALLOWED_ORIGINS || '*').split(','),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() io: Server;

  handleConnection(client: any) {}
  handleDisconnect(client: any) {}

  emitPainelUpdate(payload: {
    rota: string;
    viagem_codigo: string;
    status: 'previsto' | 'partiu' | 'atrasado' | 'chegou';
    horario_previsto?: string;
    horario_real?: string;
    mensagem?: string;
  }) {
    this.io.to('painel:partidas').emit('painel:update', payload);
    this.io.to(`rota:${payload.rota}`).emit('painel:update', payload);
  }
}
