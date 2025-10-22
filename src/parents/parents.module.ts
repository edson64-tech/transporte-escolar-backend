import { Module } from '@nestjs/common';
import { ParentsController } from './parents.controller';
import { ParentsService } from './parents.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ParentsController],
  providers: [ParentsService, PrismaService],
})
export class ParentsModule {}
