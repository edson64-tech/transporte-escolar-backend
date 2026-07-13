import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { DriversModule } from './drivers/drivers.module';
import { ParentsModule } from './parents/parents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ImportsModule } from './imports/imports.module';
import { AdminResetModule } from './admin-reset/admin-reset.module';
import { CobrancaModule } from './cobranca/cobranca.module';
import { InscricoesModule } from './inscricoes/inscricoes.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { EmailModule } from './email/email.module';
import { CatalogModule } from './catalog/catalog.module';
import { ErpModule } from './erp/erp.module';
import { BillingModule } from './billing/billing.module';
import { UploadModule } from './upload/upload.module';
import { StorageModule } from './storage/storage.module';
import { UtilizadoresModule } from './utilizadores/utilizadores.module';
import { PerfisModule } from './perfis/perfis.module';
import { OcorrenciasModule } from './ocorrencias/ocorrencias.module';
import { ViaturasModule } from './viaturas/viaturas.module';
import { CronModule } from './cron/cron.module';
import { EtaModule } from './eta/eta.module';
import { OtimizacaoModule } from './otimizacao/otimizacao.module';
import { MotoristasCrudModule } from './motoristas-crud/motoristas-crud.module';
import { VigilantesCrudModule } from './vigilantes-crud/vigilantes-crud.module';
import { AdminExtrasModule } from './admin-extras/admin-extras.module';
import { IntegracoesModule } from './integracoes/integracoes.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    FinanceiroModule,
    DriversModule,
    ParentsModule,
    NotificationsModule,
    RealtimeModule,
    ImportsModule,
    AdminResetModule,
    CobrancaModule,
    InscricoesModule,
    WebhooksModule,
    EmailModule,
    CatalogModule,
    ErpModule,
    BillingModule,
    UploadModule,
    StorageModule,
    UtilizadoresModule,
    AuthModule,
    PerfisModule,
    OcorrenciasModule,
    ViaturasModule,
    CronModule,
    EtaModule,
    OtimizacaoModule,
    MotoristasCrudModule,
    VigilantesCrudModule,
    AdminExtrasModule,
    IntegracoesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
