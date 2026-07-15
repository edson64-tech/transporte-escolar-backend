import { Module } from '@nestjs/common';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { UploadService } from '../upload/upload.service';
import { FichaPdfService } from '../inscricoes/ficha-pdf.service';

@Module({
  imports: [StorageModule],
  controllers: [ParentsController],
  providers: [ParentsService, PrismaService, UploadService, FichaPdfService],
})
export class ParentsModule {}
