import { Module } from '@nestjs/common';
import { InscricoesController } from './inscricoes.controller';
import { InscricoesService } from './inscricoes.service';
import { HubPagamentosService } from './hub-pagamentos.service';
import { FichaPdfService } from './ficha-pdf.service';
import { AssinaturaPublicaController } from './assinatura-publica.controller';
import { UploadService } from '../upload/upload.service';
import { StorageService } from '../storage/storage.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InscricoesController, AssinaturaPublicaController],
  providers: [InscricoesService, HubPagamentosService, FichaPdfService, UploadService, StorageService],
})
export class InscricoesModule {}
