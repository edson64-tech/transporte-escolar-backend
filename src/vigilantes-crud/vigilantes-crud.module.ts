import { Module } from '@nestjs/common';
import { VigilantesCrudService } from './vigilantes-crud.service';
import { VigilantesCrudController } from './vigilantes-crud.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VigilantesCrudService],
  controllers: [VigilantesCrudController],
})
export class VigilantesCrudModule {}
