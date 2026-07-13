import { Controller, Get, Post, Param, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, UserRole } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ImportsService } from './imports.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('import')
export class ImportsController {
  constructor(private svc: ImportsService) {}

  @Get('types')
  types() {
    return ['alunos','encarregados','motoristas','vigilantes','precos','contratos','pagamentos'];
  }

  @Get('templates/:tipo')
  template(@Param('tipo') tipo: string, @Res() res: Response) {
    const { filename, buffer } = this.svc.template(tipo);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(':tipo')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Param('tipo') tipo: string, @UploadedFile() file: Express.Multer.File) {
    return this.svc.process(tipo, file);
  }
}
