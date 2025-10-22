-- CreateTable
CREATE TABLE "aluno_viagem" (
    "aluno_viagem_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "aluno_id" UUID,
    "viagem_id" UUID,
    "assento_numero" INTEGER,
    "status_embarque" VARCHAR(20) DEFAULT 'pendente',
    "data_registro" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aluno_viagem_pkey" PRIMARY KEY ("aluno_viagem_id")
);

-- CreateTable
CREATE TABLE "alunos" (
    "aluno_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "foto" VARCHAR(255),
    "encarregado_id" UUID,
    "referencia_pagamento" VARCHAR(30) NOT NULL,
    "geom" geometry,
    "status" VARCHAR(20) DEFAULT 'ativo',
    "codigo_aluno" TEXT,
    "cod_artigo" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "home_lat" DOUBLE PRECISION,
    "home_lng" DOUBLE PRECISION,
    "home_geom" geometry,
    "foto_url" TEXT,
    "foto_public_id" TEXT,

    CONSTRAINT "alunos_pkey" PRIMARY KEY ("aluno_id")
);

-- CreateTable
CREATE TABLE "encarregados" (
    "encarregado_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(100),
    "senha" VARCHAR(255) NOT NULL,

    CONSTRAINT "encarregados_pkey" PRIMARY KEY ("encarregado_id")
);

-- CreateTable
CREATE TABLE "escolas" (
    "escola_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "endereco" TEXT,

    CONSTRAINT "escolas_pkey" PRIMARY KEY ("escola_id")
);

-- CreateTable
CREATE TABLE "gps_viagem" (
    "gps_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "viagem_id" UUID,
    "motorista_id" UUID,
    "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "geom" geometry,
    "velocidade" DECIMAL(5,2),
    "estado" VARCHAR(20) DEFAULT 'em_rota',

    CONSTRAINT "gps_viagem_pkey" PRIMARY KEY ("gps_id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "notificacao_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "titulo" VARCHAR(100),
    "mensagem" TEXT,
    "tipo_destinatario" VARCHAR(20),
    "rota_id" UUID,
    "viagem_id" UUID,
    "aluno_id" UUID,
    "programacao_tipo" VARCHAR(20),
    "data_hora" TIMESTAMP(6),
    "status" VARCHAR(20) DEFAULT 'pendente',
    "uuid_publico" UUID DEFAULT uuid_generate_v4(),
    "canal" TEXT DEFAULT 'whatsapp',
    "prioridade" SMALLINT DEFAULT 3,
    "cron_expr" TEXT,
    "dias_semana" SMALLINT[],
    "servico_id" UUID,
    "auto_criar_envios" BOOLEAN DEFAULT true,
    "meta" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("notificacao_id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "pagamento_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "aluno_id" UUID,
    "ano_letivo" VARCHAR(10) NOT NULL,
    "mes" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_pagamento" TIMESTAMP(6),
    "referencia" VARCHAR(30),
    "status" VARCHAR(20) DEFAULT 'pendente',

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("pagamento_id")
);

-- CreateTable
CREATE TABLE "rotas" (
    "rota_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "codigo" VARCHAR(10) NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "escola_id" UUID,
    "preco_1_viagem" DECIMAL(10,2),
    "preco_2_viagens" DECIMAL(10,2),
    "campus_id" UUID,

    CONSTRAINT "rotas_pkey" PRIMARY KEY ("rota_id")
);

-- CreateTable
CREATE TABLE "servicos" (
    "servico_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "letra" CHAR(1) NOT NULL,
    "descricao" VARCHAR(100),
    "hora_inicio" TIME(6) NOT NULL,

    CONSTRAINT "servicos_pkey" PRIMARY KEY ("servico_id")
);

-- CreateTable
CREATE TABLE "viagens" (
    "viagem_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "codigo" VARCHAR(20) NOT NULL,
    "rota_id" UUID,
    "servico_id" UUID,
    "viatura_id" UUID,
    "motorista_id" UUID,
    "vigilante_id" UUID,
    "data" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viagens_pkey" PRIMARY KEY ("viagem_id")
);

-- CreateTable
CREATE TABLE "adesoes_servico" (
    "adesao_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "aluno_id" UUID NOT NULL,
    "ano_lectivo_id" UUID NOT NULL,
    "rota_id" UUID,
    "viagens_dia" INTEGER NOT NULL DEFAULT 1,
    "services_escolhidos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adesoes_servico_pkey" PRIMARY KEY ("adesao_id")
);

-- CreateTable
CREATE TABLE "ajustes_mensalidade" (
    "ajuste_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "aluno_id" UUID NOT NULL,
    "artigo_id" UUID,
    "mes_ref" DATE NOT NULL,
    "tipo_movimento_id" UUID NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "motivo" TEXT,
    "data_lancamento" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "utilizador" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajustes_mensalidade_pkey" PRIMARY KEY ("ajuste_id")
);

-- CreateTable
CREATE TABLE "ano_lectivo" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(50) NOT NULL,
    "ano_inicio" INTEGER NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE NOT NULL,
    "ativo" BOOLEAN DEFAULT true,
    "ano_lectivo_id" UUID NOT NULL DEFAULT uuid_generate_v4(),

    CONSTRAINT "ano_lectivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artigos_servico" (
    "artigo_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "codigo" VARCHAR(30) NOT NULL,
    "descricao" VARCHAR(120) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artigos_servico_pkey" PRIMARY KEY ("artigo_id")
);

-- CreateTable
CREATE TABLE "auditoria_acoes" (
    "audit_id" BIGSERIAL NOT NULL,
    "tabela" VARCHAR(100) NOT NULL,
    "registro_pk" VARCHAR(200) NOT NULL,
    "acao" VARCHAR(20) NOT NULL,
    "diff" JSONB,
    "user_id" UUID,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_acoes_pkey" PRIMARY KEY ("audit_id")
);

-- CreateTable
CREATE TABLE "cais" (
    "cais_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "campus_id" UUID,
    "nome" VARCHAR(50) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cais_pkey" PRIMARY KEY ("cais_id")
);

-- CreateTable
CREATE TABLE "campi" (
    "campus_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "escola_id" UUID NOT NULL,
    "nome" VARCHAR(100) NOT NULL,
    "endereco" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campi_pkey" PRIMARY KEY ("campus_id")
);

-- CreateTable
CREATE TABLE "contratos_servico" (
    "contrato_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "aluno_id" UUID NOT NULL,
    "ano_lectivo_id" UUID NOT NULL,
    "rota_id" UUID NOT NULL,
    "viagens_dia" INTEGER NOT NULL,
    "tipo_servico" TEXT NOT NULL DEFAULT 'recolha',
    "plano_codigo" TEXT,
    "preco_mensal" DECIMAL(12,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_inicio" DATE NOT NULL DEFAULT CURRENT_DATE,
    "data_fim" DATE,
    "corte_dia" INTEGER NOT NULL DEFAULT 10,
    "cobranca_dia" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contratos_servico_pkey" PRIMARY KEY ("contrato_id")
);

-- CreateTable
CREATE TABLE "encarregados_alunos" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "aluno_id" UUID NOT NULL,
    "encarregado_id" UUID NOT NULL,
    "relacao" VARCHAR(50),
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encarregados_alunos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "excecoes_mensalidade" (
    "excecao_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "aluno_id" UUID NOT NULL,
    "artigo_id" UUID,
    "mes_ref" DATE NOT NULL,
    "tipo_excecao_id" UUID NOT NULL,
    "dias_usados" INTEGER,
    "valor_manual" DECIMAL(12,2),
    "observacao" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "excecoes_mensalidade_pkey" PRIMARY KEY ("excecao_id")
);

-- CreateTable
CREATE TABLE "import_logs" (
    "import_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tipo" TEXT NOT NULL,
    "filename" TEXT,
    "total_linhas" INTEGER,
    "ok" INTEGER,
    "falhas" INTEGER,
    "detalhes" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("import_id")
);

-- CreateTable
CREATE TABLE "mensalidades" (
    "mensalidade_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "aluno_id" UUID NOT NULL,
    "ano_lectivo_id" UUID NOT NULL,
    "mes" INTEGER NOT NULL,
    "viagens_dia" INTEGER NOT NULL DEFAULT 1,
    "valor_previsto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pendente',
    "vencimento" DATE,
    "referencia" VARCHAR(100),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensalidades_pkey" PRIMARY KEY ("mensalidade_id")
);

-- CreateTable
CREATE TABLE "movimentos_mensalidade" (
    "movimento_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "mensalidade_id" UUID NOT NULL,
    "origem" VARCHAR(20) NOT NULL DEFAULT 'sistema',
    "ref_origem_id" UUID,
    "tipo_movimento_id" UUID,
    "valor" DECIMAL(12,2) NOT NULL,
    "descricao" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_mensalidade_pkey" PRIMARY KEY ("movimento_id")
);

-- CreateTable
CREATE TABLE "notificacoes_envio" (
    "envio_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "notificacao_uuid" UUID NOT NULL,
    "canal" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "provider_message_id" TEXT,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "enviado_em" TIMESTAMP(6),
    "entregue_em" TIMESTAMP(6),
    "lido_em" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_envio_pkey" PRIMARY KEY ("envio_id")
);

-- CreateTable
CREATE TABLE "pagamentos_izipay" (
    "id" SERIAL NOT NULL,
    "entidade" VARCHAR(100),
    "pagamento_id" INTEGER,
    "data" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "pago" BOOLEAN DEFAULT false,
    "referencia" VARCHAR(50),
    "id_terminal" VARCHAR(50),
    "id_transacao" VARCHAR(100),
    "tipo_terminal" VARCHAR(50),
    "local_terminal" VARCHAR(100),
    "periodo_contabilistico" VARCHAR(20),
    "tarifa_emis" DECIMAL(10,2),
    "tarifa_izipay" DECIMAL(10,2),
    "estado" VARCHAR(30),
    "criado_em" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "data_emissao" TIMESTAMP(6),
    "data_validade" TIMESTAMP(6),
    "company" VARCHAR(100),
    "reference_payment_id" UUID,
    "reference" TEXT,
    "value_cents" INTEGER,
    "payed_at" TIMESTAMP(6),
    "reference_action_type_id" INTEGER,
    "payload" JSONB,
    "attempts" INTEGER DEFAULT 0,
    "status" VARCHAR(20) DEFAULT 'pending',
    "finish_at" TIMESTAMP(6),
    "errors" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "run_master_at" TIMESTAMP(6),

    CONSTRAINT "pagamentos_izipay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_sistema" (
    "chave" VARCHAR(80) NOT NULL,
    "valor" VARCHAR(200) NOT NULL,
    "descricao" TEXT,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parametros_sistema_pkey" PRIMARY KEY ("chave")
);

-- CreateTable
CREATE TABLE "partidas_programadas" (
    "partida_prog_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "data_ref" DATE NOT NULL,
    "viagem_id" UUID NOT NULL,
    "servico_id" UUID NOT NULL,
    "rota_id" UUID NOT NULL,
    "hora_prevista" TIME(6) NOT NULL,
    "cais_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'planejada',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uuid_publico" UUID DEFAULT uuid_generate_v4(),
    "data" DATE DEFAULT CURRENT_DATE,
    "horario_previsto" TIME(6),
    "observacao" TEXT,

    CONSTRAINT "partidas_programadas_pkey" PRIMARY KEY ("partida_prog_id")
);

-- CreateTable
CREATE TABLE "partidas_reais" (
    "partida_real_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "partida_prog_id" UUID NOT NULL,
    "hora_real" TIMESTAMP(6),
    "atraso_min" INTEGER,
    "obs" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uuid_publico" UUID DEFAULT uuid_generate_v4(),
    "partida_id" UUID,
    "viagem_id" UUID,
    "data" DATE DEFAULT CURRENT_DATE,
    "partida_em" TIMESTAMP(6),
    "chegada_em" TIMESTAMP(6),
    "cancelada" BOOLEAN DEFAULT false,
    "motivo_cancelamento" TEXT,

    CONSTRAINT "partidas_reais_pkey" PRIMARY KEY ("partida_real_id")
);

-- CreateTable
CREATE TABLE "planos" (
    "plano_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(80) NOT NULL,
    "viagens_dia" INTEGER NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planos_pkey" PRIMARY KEY ("plano_id")
);

-- CreateTable
CREATE TABLE "precos_rota" (
    "preco_rota_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "rota_id" UUID NOT NULL,
    "ano_lectivo_id" UUID NOT NULL,
    "viagens_dia" INTEGER NOT NULL,
    "preco_mensal" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "precos_rota_pkey" PRIMARY KEY ("preco_rota_id")
);

-- CreateTable
CREATE TABLE "tipo_estado" (
    "tipo_estado_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "estado" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipo_estado_pkey" PRIMARY KEY ("tipo_estado_id")
);

-- CreateTable
CREATE TABLE "tipo_excecao" (
    "tipo_excecao_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "descricao" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipo_excecao_pkey" PRIMARY KEY ("tipo_excecao_id")
);

-- CreateTable
CREATE TABLE "tipo_inscricao" (
    "tipo_inscricao_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "descricao" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipo_inscricao_pkey" PRIMARY KEY ("tipo_inscricao_id")
);

-- CreateTable
CREATE TABLE "tipo_movimento" (
    "tipo_movimento_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "descricao" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipo_movimento_pkey" PRIMARY KEY ("tipo_movimento_id")
);

-- CreateTable
CREATE TABLE "transacoes_izipay" (
    "id" SERIAL NOT NULL,
    "company" VARCHAR(100) NOT NULL,
    "reference_payment_id" UUID NOT NULL,
    "reference" VARCHAR(50),
    "value" DECIMAL(12,2),
    "payed_at" TIMESTAMP(6),
    "reference_action_type_id" INTEGER,
    "client_id" VARCHAR(50),
    "client_name" VARCHAR(200),
    "client_type_id" INTEGER,
    "item_id" VARCHAR(50),
    "state" INTEGER,
    "section" VARCHAR(10),
    "tarifa_suplitel" DECIMAL(10,2),
    "attempts" INTEGER DEFAULT 0,
    "status" VARCHAR(30) DEFAULT 'pending',
    "finish_at" TIMESTAMP(6),
    "errors" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "run_master_at" TIMESTAMP(6),

    CONSTRAINT "transacoes_izipay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_config" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "cloud_name" TEXT,
    "api_key" TEXT,
    "api_secret" TEXT,
    "bucket_name" TEXT,
    "base_folder" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis" (
    "perfil_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(50) NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfis_pkey" PRIMARY KEY ("perfil_id")
);

-- CreateTable
CREATE TABLE "permissoes" (
    "permissao_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(50) NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissoes_pkey" PRIMARY KEY ("permissao_id")
);

-- CreateTable
CREATE TABLE "perfil_permissoes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "perfil_id" UUID NOT NULL,
    "permissao_id" UUID NOT NULL,

    CONSTRAINT "perfil_permissoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilizadores" (
    "utilizador_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100),
    "telefone" VARCHAR(20),
    "senha_hash" VARCHAR(255) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "perfil_id" UUID,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "utilizadores_pkey" PRIMARY KEY ("utilizador_id")
);

-- CreateTable
CREATE TABLE "tokens_api" (
    "token_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "utilizador_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "tipo" VARCHAR(20) NOT NULL DEFAULT 'jwt',
    "expiracao" TIMESTAMP(3),
    "valido" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_api_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "ocorrencias" (
    "ocorrencia_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "tipo" VARCHAR(50) NOT NULL,
    "descricao" TEXT,
    "data" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "foto_url" TEXT,
    "foto_public_id" TEXT,
    "motorista_id" UUID,
    "vigilante_id" UUID,
    "viatura_id" UUID,
    "aluno_id" UUID,
    "viagem_id" UUID,
    "estado" VARCHAR(20) DEFAULT 'pendente',
    "prioridade" VARCHAR(20) DEFAULT 'normal',
    "resolvido" BOOLEAN NOT NULL DEFAULT false,
    "criado_por_id" UUID,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocorrencias_pkey" PRIMARY KEY ("ocorrencia_id")
);

-- CreateTable
CREATE TABLE "viaturas" (
    "viatura_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "matricula" VARCHAR(20) NOT NULL,
    "marca" VARCHAR(50) NOT NULL,
    "modelo" VARCHAR(50),
    "ano" INTEGER,
    "combustivel" VARCHAR(20),
    "lotacao" INTEGER DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viaturas_pkey" PRIMARY KEY ("viatura_id")
);

-- CreateTable
CREATE TABLE "motoristas" (
    "motorista_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "senha" VARCHAR(100),
    "numero_carta" VARCHAR(50) NOT NULL,
    "validade_carta" TIMESTAMP(3),
    "numero_bi" VARCHAR(30),
    "idade" INTEGER,
    "foto_url" TEXT,
    "foto_public_id" TEXT,
    "viatura_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motoristas_pkey" PRIMARY KEY ("motorista_id")
);

-- CreateTable
CREATE TABLE "vigilantes" (
    "vigilante_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nome" VARCHAR(100) NOT NULL,
    "numero_bi" VARCHAR(30),
    "idade" INTEGER,
    "foto_url" TEXT,
    "foto_public_id" TEXT,
    "viatura_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vigilantes_pkey" PRIMARY KEY ("vigilante_id")
);

-- CreateTable
CREATE TABLE "encarregados_token" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "encarregado_id" UUID NOT NULL,
    "token" VARCHAR(300) NOT NULL,
    "plataforma" VARCHAR(20),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encarregados_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comunicados" (
    "comunicado_id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "titulo" VARCHAR(140) NOT NULL,
    "mensagem" TEXT NOT NULL,
    "publico_alvo" VARCHAR(20) DEFAULT 'pais',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "data_publicacao" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comunicados_pkey" PRIMARY KEY ("comunicado_id")
);

-- CreateTable
CREATE TABLE "comunicados_leitura" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "comunicado_id" UUID NOT NULL,
    "encarregado_id" UUID NOT NULL,
    "lido_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comunicados_leitura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ux_aluno_viagem" ON "aluno_viagem"("aluno_id", "viagem_id");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_referencia_pagamento_key" ON "alunos"("referencia_pagamento");

-- CreateIndex
CREATE UNIQUE INDEX "alunos_codigo_aluno_key" ON "alunos"("codigo_aluno");

-- CreateIndex
CREATE UNIQUE INDEX "encarregados_telefone_key" ON "encarregados"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "encarregados_email_key" ON "encarregados"("email");

-- CreateIndex
CREATE INDEX "ix_gps_viagem_ts" ON "gps_viagem"("viagem_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_uuid_publico_key" ON "notificacoes"("uuid_publico");

-- CreateIndex
CREATE INDEX "ix_notif_aluno" ON "notificacoes"("aluno_id");

-- CreateIndex
CREATE INDEX "ix_notif_prog" ON "notificacoes"("programacao_tipo", "data_hora");

-- CreateIndex
CREATE INDEX "ix_notif_rota" ON "notificacoes"("rota_id");

-- CreateIndex
CREATE INDEX "ix_notif_status" ON "notificacoes"("status");

-- CreateIndex
CREATE INDEX "ix_notif_viagem" ON "notificacoes"("viagem_id");

-- CreateIndex
CREATE INDEX "ix_notificacoes_status" ON "notificacoes"("status");

-- CreateIndex
CREATE INDEX "ix_pagamento_aluno_mes" ON "pagamentos"("aluno_id", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "rotas_codigo_key" ON "rotas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "viagens_codigo_key" ON "viagens"("codigo");

-- CreateIndex
CREATE INDEX "ix_adesao_aluno_ano" ON "adesoes_servico"("aluno_id", "ano_lectivo_id");

-- CreateIndex
CREATE INDEX "ix_ajuste_aluno_mes" ON "ajustes_mensalidade"("aluno_id", "mes_ref");

-- CreateIndex
CREATE UNIQUE INDEX "ux_ano_lectivo_uuid" ON "ano_lectivo"("ano_lectivo_id");

-- CreateIndex
CREATE UNIQUE INDEX "artigos_servico_codigo_key" ON "artigos_servico"("codigo");

-- CreateIndex
CREATE INDEX "ix_auditoria_tabela" ON "auditoria_acoes"("tabela", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "cais_campus_id_nome_key" ON "cais"("campus_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "campi_escola_id_nome_key" ON "campi"("escola_id", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_servico_aluno_id_ano_lectivo_id_key" ON "contratos_servico"("aluno_id", "ano_lectivo_id");

-- CreateIndex
CREATE UNIQUE INDEX "encarregados_alunos_aluno_id_encarregado_id_key" ON "encarregados_alunos"("aluno_id", "encarregado_id");

-- CreateIndex
CREATE INDEX "ix_exc_aluno_mes" ON "excecoes_mensalidade"("aluno_id", "mes_ref");

-- CreateIndex
CREATE INDEX "ix_mensalidade_aluno_mes" ON "mensalidades"("aluno_id", "ano_lectivo_id", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "ux_mensalidade_unique" ON "mensalidades"("aluno_id", "ano_lectivo_id", "mes");

-- CreateIndex
CREATE INDEX "ix_mov_mensalidade" ON "movimentos_mensalidade"("mensalidade_id");

-- CreateIndex
CREATE INDEX "ix_envio_dest" ON "notificacoes_envio"("destinatario");

-- CreateIndex
CREATE INDEX "ix_envio_notif" ON "notificacoes_envio"("notificacao_uuid");

-- CreateIndex
CREATE INDEX "ix_envio_status" ON "notificacoes_envio"("status");

-- CreateIndex
CREATE INDEX "ix_notif_envio_created" ON "notificacoes_envio"("created_at");

-- CreateIndex
CREATE INDEX "ix_notif_envio_status" ON "notificacoes_envio"("status");

-- CreateIndex
CREATE UNIQUE INDEX "partidas_programadas_uuid_publico_key" ON "partidas_programadas"("uuid_publico");

-- CreateIndex
CREATE INDEX "ix_partidas_programadas" ON "partidas_programadas"("data_ref", "hora_prevista");

-- CreateIndex
CREATE UNIQUE INDEX "partidas_programadas_data_ref_viagem_id_key" ON "partidas_programadas"("data_ref", "viagem_id");

-- CreateIndex
CREATE UNIQUE INDEX "ux_partida_real_prog" ON "partidas_reais"("partida_prog_id");

-- CreateIndex
CREATE UNIQUE INDEX "partidas_reais_uuid_publico_key" ON "partidas_reais"("uuid_publico");

-- CreateIndex
CREATE UNIQUE INDEX "ux_planos_nome" ON "planos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "precos_rota_rota_id_ano_lectivo_id_viagens_dia_key" ON "precos_rota"("rota_id", "ano_lectivo_id", "viagens_dia");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_estado_estado_key" ON "tipo_estado"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_excecao_descricao_key" ON "tipo_excecao"("descricao");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_inscricao_descricao_key" ON "tipo_inscricao"("descricao");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_movimento_descricao_key" ON "tipo_movimento"("descricao");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_nome_key" ON "perfis"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "permissoes_nome_key" ON "permissoes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_permissoes_perfil_id_permissao_id_key" ON "perfil_permissoes"("perfil_id", "permissao_id");

-- CreateIndex
CREATE UNIQUE INDEX "utilizadores_email_key" ON "utilizadores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilizadores_telefone_key" ON "utilizadores"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_api_token_key" ON "tokens_api"("token");

-- CreateIndex
CREATE UNIQUE INDEX "viaturas_matricula_key" ON "viaturas"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "motoristas_telefone_key" ON "motoristas"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "ux_encarregado_token" ON "encarregados_token"("encarregado_id", "token");

-- CreateIndex
CREATE UNIQUE INDEX "ux_comunicado_lido" ON "comunicados_leitura"("comunicado_id", "encarregado_id");

-- AddForeignKey
ALTER TABLE "aluno_viagem" ADD CONSTRAINT "aluno_viagem_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("aluno_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "aluno_viagem" ADD CONSTRAINT "aluno_viagem_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagens"("viagem_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "alunos" ADD CONSTRAINT "alunos_encarregado_id_fkey" FOREIGN KEY ("encarregado_id") REFERENCES "encarregados"("encarregado_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "gps_viagem" ADD CONSTRAINT "gps_viagem_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagens"("viagem_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("aluno_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campi"("campus_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("escola_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("rota_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("servico_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_viatura_id_fkey" FOREIGN KEY ("viatura_id") REFERENCES "viaturas"("viatura_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adesoes_servico" ADD CONSTRAINT "adesoes_servico_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("aluno_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "adesoes_servico" ADD CONSTRAINT "adesoes_servico_ano_lectivo_id_fkey" FOREIGN KEY ("ano_lectivo_id") REFERENCES "ano_lectivo"("ano_lectivo_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "adesoes_servico" ADD CONSTRAINT "adesoes_servico_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("rota_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ajustes_mensalidade" ADD CONSTRAINT "ajustes_mensalidade_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("aluno_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ajustes_mensalidade" ADD CONSTRAINT "ajustes_mensalidade_artigo_id_fkey" FOREIGN KEY ("artigo_id") REFERENCES "artigos_servico"("artigo_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ajustes_mensalidade" ADD CONSTRAINT "ajustes_mensalidade_tipo_movimento_id_fkey" FOREIGN KEY ("tipo_movimento_id") REFERENCES "tipo_movimento"("tipo_movimento_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cais" ADD CONSTRAINT "cais_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "campi"("campus_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "campi" ADD CONSTRAINT "campi_escola_id_fkey" FOREIGN KEY ("escola_id") REFERENCES "escolas"("escola_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contratos_servico" ADD CONSTRAINT "contratos_servico_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("aluno_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contratos_servico" ADD CONSTRAINT "contratos_servico_ano_lectivo_id_fkey" FOREIGN KEY ("ano_lectivo_id") REFERENCES "ano_lectivo"("ano_lectivo_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contratos_servico" ADD CONSTRAINT "contratos_servico_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("rota_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "encarregados_alunos" ADD CONSTRAINT "encarregados_alunos_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("aluno_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "encarregados_alunos" ADD CONSTRAINT "encarregados_alunos_encarregado_id_fkey" FOREIGN KEY ("encarregado_id") REFERENCES "encarregados"("encarregado_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "excecoes_mensalidade" ADD CONSTRAINT "excecoes_mensalidade_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("aluno_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "excecoes_mensalidade" ADD CONSTRAINT "excecoes_mensalidade_artigo_id_fkey" FOREIGN KEY ("artigo_id") REFERENCES "artigos_servico"("artigo_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "excecoes_mensalidade" ADD CONSTRAINT "excecoes_mensalidade_tipo_excecao_id_fkey" FOREIGN KEY ("tipo_excecao_id") REFERENCES "tipo_excecao"("tipo_excecao_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mensalidades" ADD CONSTRAINT "mensalidades_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("aluno_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mensalidades" ADD CONSTRAINT "mensalidades_ano_lectivo_id_fkey" FOREIGN KEY ("ano_lectivo_id") REFERENCES "ano_lectivo"("ano_lectivo_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "movimentos_mensalidade" ADD CONSTRAINT "movimentos_mensalidade_mensalidade_id_fkey" FOREIGN KEY ("mensalidade_id") REFERENCES "mensalidades"("mensalidade_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partidas_programadas" ADD CONSTRAINT "partidas_programadas_cais_id_fkey" FOREIGN KEY ("cais_id") REFERENCES "cais"("cais_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partidas_programadas" ADD CONSTRAINT "partidas_programadas_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("rota_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partidas_programadas" ADD CONSTRAINT "partidas_programadas_servico_id_fkey" FOREIGN KEY ("servico_id") REFERENCES "servicos"("servico_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partidas_programadas" ADD CONSTRAINT "partidas_programadas_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagens"("viagem_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "partidas_reais" ADD CONSTRAINT "partidas_reais_partida_prog_id_fkey" FOREIGN KEY ("partida_prog_id") REFERENCES "partidas_programadas"("partida_prog_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "precos_rota" ADD CONSTRAINT "precos_rota_ano_lectivo_id_fkey" FOREIGN KEY ("ano_lectivo_id") REFERENCES "ano_lectivo"("ano_lectivo_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "precos_rota" ADD CONSTRAINT "precos_rota_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("rota_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "perfil_permissoes" ADD CONSTRAINT "perfil_permissoes_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("perfil_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_permissoes" ADD CONSTRAINT "perfil_permissoes_permissao_id_fkey" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("permissao_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilizadores" ADD CONSTRAINT "utilizadores_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("perfil_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_api" ADD CONSTRAINT "tokens_api_utilizador_id_fkey" FOREIGN KEY ("utilizador_id") REFERENCES "utilizadores"("utilizador_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("motorista_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_vigilante_id_fkey" FOREIGN KEY ("vigilante_id") REFERENCES "vigilantes"("vigilante_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_viatura_id_fkey" FOREIGN KEY ("viatura_id") REFERENCES "viaturas"("viatura_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "alunos"("aluno_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagens"("viagem_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencias" ADD CONSTRAINT "ocorrencias_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "utilizadores"("utilizador_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_viatura_id_fkey" FOREIGN KEY ("viatura_id") REFERENCES "viaturas"("viatura_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vigilantes" ADD CONSTRAINT "vigilantes_viatura_id_fkey" FOREIGN KEY ("viatura_id") REFERENCES "viaturas"("viatura_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encarregados_token" ADD CONSTRAINT "encarregados_token_encarregado_id_fkey" FOREIGN KEY ("encarregado_id") REFERENCES "encarregados"("encarregado_id") ON DELETE CASCADE ON UPDATE CASCADE;
