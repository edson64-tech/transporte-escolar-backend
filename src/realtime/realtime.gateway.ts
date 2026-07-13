import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('gps:position')
  handleGpsPosition(
    @MessageBody() data: { viagem_id: string; lat: number; lng: number },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `viagem:${data.viagem_id}`;
    client.broadcast.to(room).emit('gps:updated', {
      viagem_id: data.viagem_id,
      latitude: data.lat,
      longitude: data.lng,
      timestamp: new Date(),
    });
  }
}
