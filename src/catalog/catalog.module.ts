import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { AnosLetivosController } from './anos-letivos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CatalogController, AnosLetivosController],
})
export class CatalogModule {}
