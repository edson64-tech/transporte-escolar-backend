import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MotoristasCrudService {
  constructor(private prisma: PrismaService) {}

  private selectSafe = {
    motorista_id: true, nome: true, telefone: true,
    numero_carta: true, validade_carta: true, numero_bi: true,
    idade: true, foto_url: true, viatura_id: true,
    ativo: true, criado_em: true, atualizado_em: true,
  };

  async listar(page = 1, limit = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { nome: { contains: search, mode: 'insensitive' as const } },
            { telefone: { contains: search } },
            { numero_carta: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.motoristas.findMany({
        where,
        select: this.selectSafe,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { criado_em: 'desc' },
      }),
      this.prisma.motoristas.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async obter(motorista_id: string) {
    return this.prisma.motoristas.findUnique({
      where: { motorista_id },
      select: this.selectSafe,
    });
  }

  async criar(dados: any) {
    return this.prisma.motoristas.create({
      data: dados,
      select: this.selectSafe,
    });
  }

  async atualizar(motorista_id: string, dados: any) {
    return this.prisma.motoristas.update({
      where: { motorista_id },
      data: { ...dados, atualizado_em: new Date() },
      select: this.selectSafe,
    });
  }

  async remover(motorista_id: string) {
    await this.prisma.motoristas.delete({ where: { motorista_id } });
    return { sucesso: true, motorista_id };
  }
}
