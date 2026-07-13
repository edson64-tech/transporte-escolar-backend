-- Tabela de integrações (SMS, WhatsApp, etc.)
CREATE TABLE IF NOT EXISTS integracoes (
    integracao_id   uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    canal           varchar(40) UNIQUE NOT NULL,   -- 'sms_izipay', 'whatsapp_twilio'
    nome            varchar(100),                   -- nome amigável p/ mostrar no frontend
    url_base        varchar(255),                   -- ex: https://sms-sandbox.izipay.ao
    modo_auth       varchar(20) DEFAULT 'api_key',  -- 'api_key' ou 'bearer'
    api_key         text,                           -- credencial principal (guardada cifrada na app)
    auth_extra      text,                           -- credencial secundária (ex: account_sid Twilio)
    remetente       varchar(60),                    -- sender / from
    config_extra    jsonb,                          -- campos livres por canal
    ativo           boolean DEFAULT false,
    criado_em       timestamp DEFAULT now(),
    atualizado_em   timestamp DEFAULT now()
);

-- Pré-popular com os 2 canais (vazios, à espera de credenciais)
INSERT INTO integracoes (canal, nome, url_base, modo_auth, ativo)
VALUES
  ('sms_izipay', 'SMS - IZI Pay', 'https://sms-sandbox.izipay.ao', 'api_key', false),
  ('whatsapp_twilio', 'WhatsApp - Twilio', 'https://api.twilio.com', 'bearer', false)
ON CONFLICT (canal) DO NOTHING;
