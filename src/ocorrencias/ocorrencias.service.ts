import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OcorrenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.ocorrencias.findMany({
      orderBy: { data: 'desc' },
      include: {
        motoristas: true,
        vigilantes: true,
        viaturas: true,
        alunos: true,
      },
    });
  }

  async findOne(id: string) {
    const ocorrencia = await this.prisma.ocorrencias.findUnique({
      where: { ocorrencia_id: id },
      include: { motoristas: true, vigilantes: true, viaturas: true, alunos: true },
    });
    if (!ocorrencia) throw new NotFoundException('Ocorrência não encontrada.');
    return ocorrencia;
  }

  async create(data: any) {
    return this.prisma.ocorrencias.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.ocorrencias.update({ where: { ocorrencia_id: id }, data });
  }

  async delete(id: string) {
    return this.prisma.ocorrencias.delete({ where: { ocorrencia_id: id } });
  }
}
