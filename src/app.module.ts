import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// núcleo
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

// módulos principais
import { FinanceiroModule } from './financeiro/financeiro.module';
import { DriversModule } from './drivers/drivers.module';
import { ParentsModule } from './parents/parents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ImportsModule } from './imports/imports.module';
import { CatalogModule } from './catalog/catalog.module';
import { ErpModule } from './erp/erp.module';
import { BillingModule } from './billing/billing.module';
import { UploadModule } from './upload/upload.module';
import { StorageModule } from './storage/storage.module';

// módulos de utilizadores
import { UtilizadoresModule } from './utilizadores/utilizadores.module';
import { PerfisModule } from './perfis/perfis.module';
import { OcorrenciasModule } from './ocorrencias/ocorrencias.module';
import { ViaturasModule } from './viaturas/viaturas.module';

// módulo do agendador (cron jobs)
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),

    // módulos de negócio
    FinanceiroModule,
    DriversModule,
    ParentsModule,
    NotificationsModule,
    WebhooksModule,
    RealtimeModule,
    ImportsModule,
    CatalogModule,
    ErpModule,
    BillingModule,
    UploadModule,
    StorageModule,
    UtilizadoresModule,
    PerfisModule,
    OcorrenciasModule,
    ViaturasModule,
    CronModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
