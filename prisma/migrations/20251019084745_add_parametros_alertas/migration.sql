-- CreateTable
CREATE TABLE "parametros_alertas" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "valor" VARCHAR(100) NOT NULL,
    "descricao" VARCHAR(255),
    "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parametros_alertas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parametros_alertas_nome_key" ON "parametros_alertas"("nome");
