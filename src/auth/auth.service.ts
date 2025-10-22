import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginMotoristaDto, LoginEncarregadoDto, LoginAdminDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ============================================================
  // 🚗 LOGIN MOTORISTA
  // ============================================================
  async loginMotorista(dto: LoginMotoristaDto) {
    const motorista = await this.prisma.motoristas.findUnique({
      where: { telefone: dto.telefone },
    });

    if (!motorista) {
      throw new UnauthorizedException('Telefone ou senha incorretos');
    }

    if (!motorista.ativo) {
      throw new UnauthorizedException('Motorista inativo. Contacte a administração.');
    }

    // Verificar senha
    const senhaValida = await this.verificarSenha(dto.senha, motorista.senha);

    if (!senhaValida) {
      throw new UnauthorizedException('Telefone ou senha incorretos');
    }

    const payload = {
      sub: motorista.motorista_id,
      telefone: motorista.telefone,
      role: 'motorista',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        motorista_id: motorista.motorista_id,
        nome: motorista.nome,
        telefone: motorista.telefone,
        viatura_id: motorista.viatura_id,
        foto_url: motorista.foto_url,
      },
    };
  }

  // ============================================================
  // 👨‍👩‍👧 LOGIN ENCARREGADO
  // ============================================================
  async loginEncarregado(dto: LoginEncarregadoDto) {
    const encarregado = await this.prisma.encarregados.findUnique({
      where: { telefone: dto.telefone },
    });

    if (!encarregado) {
      throw new UnauthorizedException('Telefone ou senha incorretos');
    }

    // Verificar senha
    const senhaValida = await this.verificarSenha(dto.senha, encarregado.senha);

    if (!senhaValida) {
      throw new UnauthorizedException('Telefone ou senha incorretos');
    }

    const payload = {
      sub: encarregado.encarregado_id,
      telefone: encarregado.telefone,
      role: 'encarregado',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        encarregado_id: encarregado.encarregado_id,
        nome: encarregado.nome,
        telefone: encarregado.telefone,
        email: encarregado.email,
      },
    };
  }

  // ============================================================
  // 👨‍💼 LOGIN ADMIN
  // ============================================================
  async loginAdmin(dto: LoginAdminDto) {
    // ✅ CORRIGIDO: Usar senha_hash e include perfis
    const admin = await this.prisma.utilizadores.findUnique({
      where: { email: dto.email },
      include: {
        perfis: {
          select: {
            perfil_id: true,
            nome: true,
            descricao: true,
          }
        }
      }
    });

    if (!admin) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    if (!admin.ativo) {
      throw new UnauthorizedException('Usuário inativo. Contacte o administrador.');
    }

    // ✅ CORRIGIDO: Usar senha_hash em vez de senha
    const senhaValida = await this.verificarSenha(dto.senha, admin.senha_hash);

    if (!senhaValida) {
      throw new UnauthorizedException('Email ou senha incorretos');
    }

    const payload = {
      sub: admin.utilizador_id,
      email: admin.email,
      role: 'admin',
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        utilizador_id: admin.utilizador_id,
        nome: admin.nome,
        email: admin.email,
        perfil: admin.perfis?.nome,
      },
    };
  }

  // ============================================================
  // 🔐 VERIFICAR SENHA (bcrypt ou texto simples)
  // ============================================================
  private async verificarSenha(senhaInput: string, senhaArmazenada: string | null): Promise<boolean> {
    if (!senhaArmazenada) {
      return false;
    }

    // Verificar se é bcrypt hash (começa com $2a$, $2b$, $2y$)
    if (senhaArmazenada.startsWith('$2')) {
      return bcrypt.compare(senhaInput, senhaArmazenada);
    }

    // Comparação texto simples (temporário - deve migrar para bcrypt)
    return senhaInput === senhaArmazenada;
  }

  // ============================================================
  // 🔑 GERAR HASH BCRYPT (para usar em seeds/cadastros)
  // ============================================================
  async hashPassword(senha: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(senha, salt);
  }

  // ============================================================
  // ✅ VALIDAR TOKEN
  // ============================================================
  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
