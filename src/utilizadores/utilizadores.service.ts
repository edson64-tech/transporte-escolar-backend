import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtilizadoresService {
  constructor(private readonly prisma: PrismaService) {}

  // Campos seguros — NUNCA inclui senha_hash
  private selectSafe = {
    utilizador_id: true,
    nome: true,
    email: true,
    telefone: true,
    perfil_id: true,
    ativo: true,
    perfis: {
      select: { perfil_id: true, nome: true, descricao: true },
    },
  };

  async list() {
    return this.prisma.utilizadores.findMany({
      select: this.selectSafe,
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.utilizadores.findUnique({
      where: { utilizador_id: id },
      select: this.selectSafe,
    });
    if (!user) throw new NotFoundException('Utilizador não encontrado.');
    return user;
  }

  async create(data: any) {
    const hash = await bcrypt.hash(data.senha, 10);
    return this.prisma.utilizadores.create({
      data: {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        senha_hash: hash,
        perfil_id: data.perfil_id,
      },
      select: this.selectSafe,
    });
  }

  async update(id: string, data: any) {
    // Verificar existência (sem expor hash)
    const existe = await this.prisma.utilizadores.findUnique({
      where: { utilizador_id: id },
      select: { utilizador_id: true },
    });
    if (!existe) throw new NotFoundException('Utilizador não encontrado.');

    const updateData: any = {};
    if (data.nome !== undefined) updateData.nome = data.nome;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.telefone !== undefined) updateData.telefone = data.telefone;
    if (data.perfil_id !== undefined) updateData.perfil_id = data.perfil_id;
    if (data.senha) updateData.senha_hash = await bcrypt.hash(data.senha, 10);

    return this.prisma.utilizadores.update({
      where: { utilizador_id: id },
      data: updateData,
      select: this.selectSafe,
    });
  }

  async delete(id: string) {
    const existe = await this.prisma.utilizadores.findUnique({
      where: { utilizador_id: id },
      select: { utilizador_id: true },
    });
    if (!existe) throw new NotFoundException('Utilizador não encontrado.');

    return this.prisma.utilizadores.update({
      where: { utilizador_id: id },
      data: { ativo: false },
      select: this.selectSafe,
    });
  }
}
