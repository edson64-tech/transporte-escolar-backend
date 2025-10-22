import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import * as stream from 'stream';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async uploadToCloudinary(buffer: Buffer, folder: string, publicId?: string) {
    const cfg = await this.storage.getActiveConfig();
    cloudinary.config({
      cloud_name: cfg.cloud_name!,
      api_key: cfg.api_key!,
      api_secret: cfg.api_secret!,
      secure: true,
    });

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const pass = new stream.PassThrough();
      const upload = cloudinary.uploader.upload_stream(
        { folder, public_id: publicId, overwrite: true, resource_type: 'image' },
        (err, res) => (err ? reject(err) : resolve(res as UploadApiResponse)),
      );
      pass.end(buffer);
      pass.pipe(upload);
    });
  }

  // Opcional: storage local como fallback (quando provider = 'local')
  private async uploadToLocal(buffer: Buffer, folder: string, name: string) {
    const uploadsDir = path.join(process.cwd(), 'uploads', folder);
    await fs.promises.mkdir(uploadsDir, { recursive: true });
    const filename = `${name}.jpg`;
    const full = path.join(uploadsDir, filename);
    await fs.promises.writeFile(full, buffer);
    const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
    return {
      secure_url: `${baseUrl}/uploads/${folder}/${filename}`,
      public_id: `local/${folder}/${filename}`,
    };
  }

  private async uploadImage(buffer: Buffer, folder: string, publicIdBase: string) {
    const cfg = await this.storage.getActiveConfig();
    const baseFolder = cfg.base_folder ?? 'transporte-escolar';
    const folderPath = `${baseFolder}/${folder}`;

    if (cfg.provider === 'cloudinary') {
      return this.uploadToCloudinary(buffer, folderPath, publicIdBase);
    }
    if (cfg.provider === 'local') {
      return this.uploadToLocal(buffer, folderPath, publicIdBase);
    }
    throw new InternalServerErrorException(`Provider ${cfg.provider} ainda não implementado.`);
  }

  async uploadFotoAluno(alunoId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Ficheiro não enviado');

    const res = await this.uploadImage(file.buffer, 'alunos', `aluno_${alunoId}`);
    await this.prisma.alunos.update({
      where: { aluno_id: alunoId },
      data: { foto_url: res.secure_url, foto_public_id: res.public_id },
    });
    return { aluno_id: alunoId, foto_url: res.secure_url, foto_public_id: res.public_id };
  }

  async uploadFotoMotorista(motoristaId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Ficheiro não enviado');

    const res = await this.uploadImage(file.buffer, 'motoristas', `motorista_${motoristaId}`);
    await this.prisma.motoristas.update({
      where: { motorista_id: motoristaId },
      data: { foto_url: res.secure_url, foto_public_id: res.public_id },
    });
    return { motorista_id: motoristaId, foto_url: res.secure_url, foto_public_id: res.public_id };
  }
}
