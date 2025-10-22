import { Module } from '@nestjs/common';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';


@Module({
  imports: [StorageModule],
  controllers: [UploadController],
  providers: [UploadService, PrismaService],
})
export class UploadModule {}
