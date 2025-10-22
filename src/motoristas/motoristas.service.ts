import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MotoristasService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.motoristas.findMany({
      include: { viaturas: true, ocorrencias: true },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.motoristas.findUnique({
      where: { motorista_id: id },
      include: { viaturas: true, ocorrencias: true },
    });
    if (!r) throw new NotFoundException('Motorista não encontrado.');
    return r;
    }

  create(body: any) {
    return this.prisma.motoristas.create({ data: body });
  }

  async update(id: string, body: any) {
    await this.findOne(id);
    return this.prisma.motoristas.update({ where: { motorista_id: id }, data: body });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.motoristas.update({ where: { motorista_id: id }, data: { ativo: false } });
  }
}
