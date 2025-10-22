import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CatalogController],
})
export class CatalogModule {}
