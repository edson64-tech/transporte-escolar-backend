import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashChave } from './crypto.util';

@Injectable()
export class AgenteGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const chave = req.headers['x-agent-key'];
    if (!chave) throw new UnauthorizedException('X-Agent-Key em falta');
    const agente = await this.prisma.erp_agentes.findFirst({
      where: { chave_hash: hashChave(String(chave)), ativo: true },
    });
    if (!agente) throw new UnauthorizedException('Chave de agente inválida');
    req.agente = agente;
    return true;
  }
}
