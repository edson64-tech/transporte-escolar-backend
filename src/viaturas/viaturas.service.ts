import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ViaturasService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.viaturas.findMany({
      include: {
        motoristas: true,
        vigilantes: true,
        viagens: true,
        ocorrencias: true,
      },
      orderBy: { criado_em: 'desc' }, // ✅ nome certo conforme teu schema
    });
  }

  async findOne(id: string) {
    const viatura = await this.prisma.viaturas.findUnique({
      where: { viatura_id: id },
      include: {
        motoristas: true,
        vigilantes: true,
        viagens: true,
        ocorrencias: true,
      },
    });

    if (!viatura) throw new NotFoundException('Viatura não encontrada.');
    return viatura;
  }

  async create(data: any) {
    return this.prisma.viaturas.create({
      data: {
        matricula: data.matricula,
        marca: data.marca,
        modelo: data.modelo,
        ano: data.ano,
        combustivel: data.combustivel,
        lotacao: data.lotacao,
        ativo: true,
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.viaturas.update({
      where: { viatura_id: id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.viaturas.update({
      where: { viatura_id: id },
      data: { ativo: false }, // ✅ campo correto do Prisma
    });
  }
}
