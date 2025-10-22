import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt';

@Injectable()
export class UtilizadoresService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.utilizadores.findMany({
      include: { perfis: true },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.utilizadores.findUnique({
      where: { utilizador_id: id },
      include: { perfis: true },
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
    });
  }

  async update(id: string, data: any) {
    const user = await this.findOne(id);
    const updateData: any = {
      nome: data.nome ?? user.nome,
      email: data.email ?? user.email,
      telefone: data.telefone ?? user.telefone,
      perfil_id: data.perfil_id ?? user.perfil_id,
    };
    if (data.senha) updateData.senha_hash = await bcrypt.hash(data.senha, 10);
    return this.prisma.utilizadores.update({ where: { utilizador_id: id }, data: updateData });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.utilizadores.update({
      where: { utilizador_id: id },
      data: { ativo: false },
    });
  }
}
