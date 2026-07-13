-- CreateTable eta_calculos
CREATE TABLE "eta_calculos" (
    "eta_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "viagem_id" UUID,
    "aluno_id" UUID,
    "viatura_lat" DECIMAL(10,8),
    "viatura_lng" DECIMAL(11,8),
    "aluno_lat" DECIMAL(10,8),
    "aluno_lng" DECIMAL(11,8),
    "distancia_km" DECIMAL(10,2),
    "tempo_minutos" INTEGER,
    "alerta_enviado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eta_calculos_pkey" PRIMARY KEY ("eta_id")
);

-- CreateTable rotas_otimizadas
CREATE TABLE "rotas_otimizadas" (
    "rota_otimizada_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "rota_id" UUID,
    "algoritmo" VARCHAR(50),
    "ordem_alunos" TEXT,
    "distancia_total_km" DECIMAL(10,2),
    "ativa" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rotas_otimizadas_pkey" PRIMARY KEY ("rota_otimizada_id")
);

CREATE INDEX "ix_eta_calculos_viagem" ON "eta_calculos"("viagem_id");
CREATE INDEX "ix_eta_calculos_aluno" ON "eta_calculos"("aluno_id");
CREATE INDEX "ix_rotas_otimizadas_rota" ON "rotas_otimizadas"("rota_id");
