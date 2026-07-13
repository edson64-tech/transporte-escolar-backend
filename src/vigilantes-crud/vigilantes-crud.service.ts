import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VigilantesCrudService {
  constructor(private prisma: PrismaService) {}

  async listar(page = 1, limit = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { nome: { contains: search, mode: 'insensitive' as const } },
            { numero_bi: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.vigilantes.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { criado_em: 'desc' },
      }),
      this.prisma.vigilantes.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async obter(vigilante_id: string) {
    return this.prisma.vigilantes.findUnique({ where: { vigilante_id } });
  }

  async criar(dados: any) {
    return this.prisma.vigilantes.create({ data: dados });
  }

  async atualizar(vigilante_id: string, dados: any) {
    return this.prisma.vigilantes.update({
      where: { vigilante_id },
      data: { ...dados, atualizado_em: new Date() },
    });
  }

  async remover(vigilante_id: string) {
    await this.prisma.vigilantes.delete({ where: { vigilante_id } });
    return { sucesso: true, vigilante_id };
  }
}
