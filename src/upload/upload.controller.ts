import { Controller, Post, Param, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { memoryStorage } from 'multer';

const fileFilter = (_req, file: Express.Multer.File, cb: Function) => {
  const allow = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allow.includes(file.mimetype)) return cb(new BadRequestException('Formato inválido.'), false);
  cb(null, true);
};

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPERADOR)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('aluno/:aluno_id')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), fileFilter, limits: { fileSize: 3 * 1024 * 1024 } }))
  uploadAluno(@Param('aluno_id') alunoId: string, @UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadFotoAluno(alunoId, file);
  }

  @Post('assinatura/:aluno_id')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadAssinatura(@Param('aluno_id') alunoId: string, @UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadAssinaturaAluno(alunoId, file);
  }

  @Post('motorista/:motorista_id')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), fileFilter, limits: { fileSize: 3 * 1024 * 1024 } }))
  uploadMotorista(@Param('motorista_id') motoristaId: string, @UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadFotoMotorista(motoristaId, file);
  }
}
