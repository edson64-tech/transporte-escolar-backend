-- CreateTable
CREATE TABLE "alertas_motorista" (
    "alerta_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "motorista_id" UUID NOT NULL,
    "viagem_id" UUID NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'aviso',
    "lido" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alertas_motorista_pkey" PRIMARY KEY ("alerta_id")
);

-- AddForeignKey
ALTER TABLE "alertas_motorista" ADD CONSTRAINT "alertas_motorista_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("motorista_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas_motorista" ADD CONSTRAINT "alertas_motorista_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagens"("viagem_id") ON DELETE CASCADE ON UPDATE CASCADE;
