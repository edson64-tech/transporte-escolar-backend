import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PerfisService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.perfis.findMany({
      include: { perfil_permissoes: { include: { permissoes: true } } },
    });
  }

  async findOne(id: string) {
    const perfil = await this.prisma.perfis.findUnique({
      where: { perfil_id: id },
      include: { perfil_permissoes: { include: { permissoes: true } } },
    });
    if (!perfil) throw new NotFoundException('Perfil não encontrado.');
    return perfil;
  }

  async create(data: any) {
    return this.prisma.perfis.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.perfis.update({ where: { perfil_id: id }, data });
  }

  async delete(id: string) {
    return this.prisma.perfis.delete({ where: { perfil_id: id } });
  }
}
