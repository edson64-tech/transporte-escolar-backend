import { Controller, Post, Param, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { memoryStorage } from 'multer';

const fileFilter = (_req, file: Express.Multer.File, cb: Function) => {
  const allow = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allow.includes(file.mimetype)) return cb(new BadRequestException('Formato inválido.'), false);
  cb(null, true);
};

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('aluno/:aluno_id')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), fileFilter, limits: { fileSize: 3 * 1024 * 1024 } }))
  uploadAluno(@Param('aluno_id') alunoId: string, @UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadFotoAluno(alunoId, file);
  }

  @Post('motorista/:motorista_id')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), fileFilter, limits: { fileSize: 3 * 1024 * 1024 } }))
  uploadMotorista(@Param('motorista_id') motoristaId: string, @UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadFotoMotorista(motoristaId, file);
  }
}
