import { Module } from '@nestjs/common';
import { MotoristasCrudService } from './motoristas-crud.service';
import { MotoristasCrudController } from './motoristas-crud.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MotoristasCrudService],
  controllers: [MotoristasCrudController],
})
export class MotoristasCrudModule {}
