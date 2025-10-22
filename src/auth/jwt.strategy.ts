import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email?: string;
  telefone?: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-mude-isso',
    });
  }

  async validate(payload: JwtPayload) {
    // Validar se usuário ainda existe
    let user: any = null;

    if (payload.role === 'motorista') {
      user = await this.prisma.motoristas.findUnique({
        where: { motorista_id: payload.sub },
        select: { motorista_id: true, nome: true, telefone: true, ativo: true },
      });

      if (!user || !user.ativo) {
        throw new UnauthorizedException('Motorista inativo ou não encontrado');
      }
    } else if (payload.role === 'encarregado') {
      user = await this.prisma.encarregados.findUnique({
        where: { encarregado_id: payload.sub },
        select: { encarregado_id: true, nome: true, telefone: true },
      });
    } else if (payload.role === 'admin') {
      user = await this.prisma.utilizadores.findUnique({
        where: { utilizador_id: payload.sub },
        select: { utilizador_id: true, nome: true, email: true, ativo: true },
      });

      if (!user || !user.ativo) {
        throw new UnauthorizedException('Usuário inativo ou não encontrado');
      }
    }

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      telefone: payload.telefone,
      role: payload.role,
      ...user,
    };
  }
}
