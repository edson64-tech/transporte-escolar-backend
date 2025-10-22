import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';


export type StorageProvider = 'cloudinary' | 'aws_s3' | 'firebase' | 'local';

@Injectable()
export class StorageService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.storage_config.findMany({ orderBy: { id: 'asc' } });
  }

  async getActiveConfig() {
    const cfg = await this.prisma.storage_config.findFirst({ where: { is_active: true } });
    if (!cfg) throw new NotFoundException('Nenhuma configuração de storage ativa.');
    return cfg;
  }

  async addConfig(data: {
    provider: StorageProvider;
    cloud_name?: string;
    api_key?: string;
    api_secret?: string;
    bucket_name?: string;
    base_folder?: string;
  }) {
    // validações mínimas por provider
    if (data.provider === 'cloudinary') {
      if (!data.cloud_name || !data.api_key || !data.api_secret) {
        throw new BadRequestException('Cloudinary requer cloud_name, api_key e api_secret.');
      }
    }
    return this.prisma.storage_config.create({ data: { ...data, is_active: false } });
  }

  async setActive(provider: StorageProvider) {
    const exists = await this.prisma.storage_config.findFirst({ where: { provider } });
    if (!exists) throw new NotFoundException(`Provider ${provider} não encontrado.`);

    await this.prisma.storage_config.updateMany({ data: { is_active: false }, where: { } });
    await this.prisma.storage_config.updateMany({ data: { is_active: true }, where: { provider } });

    return this.getActiveConfig();
  }

  async update(id: number, data: Partial<{
    cloud_name: string;
    api_key: string;
    api_secret: string;
    bucket_name: string;
    base_folder: string;
    is_active: boolean;
  }>) {
    const cfg = await this.prisma.storage_config.findUnique({ where: { id } });
    if (!cfg) throw new NotFoundException('Config não encontrada.');
    return this.prisma.storage_config.update({ where: { id }, data });
  }
}
