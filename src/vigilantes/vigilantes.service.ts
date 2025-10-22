import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VigilantesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.vigilantes.findMany({
      include: { viaturas: true, ocorrencias: true },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.vigilantes.findUnique({
      where: { vigilante_id: id },
      include: { viaturas: true, ocorrencias: true },
    });
    if (!r) throw new NotFoundException('Vigilante não encontrado.');
    return r;
  }

  create(body: any) {
    return this.prisma.vigilantes.create({ data: body });
  }

  async update(id: string, body: any) {
    await this.findOne(id);
    return this.prisma.vigilantes.update({ where: { vigilante_id: id }, data: body });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vigilantes.update({ where: { vigilante_id: id }, data: { ativo: false } });
  }
}
