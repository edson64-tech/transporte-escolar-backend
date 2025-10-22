import { Controller, Get, Post, Param, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ImportsService } from './imports.service';

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
