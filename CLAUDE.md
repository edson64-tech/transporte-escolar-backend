# CLAUDE.md — Sistema de Transporte Escolar Assistance24

> Manual do agente. Lê isto ANTES de qualquer tarefa. Este é um sistema EM PRODUÇÃO
> com base de dados real, pagamentos reais (Multicaixa/IZIPay) e um site público.

---

## 1. O QUE É ESTE SISTEMA

Plataforma completa de gestão de transporte escolar em Luanda, Angola, da empresa
**ASSISTANCE24, Lda** para o **Complexo Escolar Aurora Internacional** (escola 1) e
**Colégio Aurora** (escola 2). Cobre: inscrições de alunos, ciclo financeiro
(mensalidades pagas por referência Multicaixa), documentos oficiais (ficha, regulamento,
cartão PVC), assinatura digital remota, rotas/viagens/GPS/ETA, apps de motoristas e
pais (em construção), painéis de partidas.

**Prazos críticos:**
- **01-08-2026** — abertura das inscrições e pagamentos do ano letivo 2026/2027
- **15-08-2026** — integrador com o ERP Primavera (faturação) OBRIGATÓRIO

**Idioma de trabalho: português (Angola).** Valores em AOA/AKZ (kwanzas).

---

## 2. INFRAESTRUTURA

| Componente | Detalhe |
|---|---|
| Servidor | SRV-ESCOLAR, DigitalOcean, IP 46.101.47.91, Ubuntu 25.04 |
| Backend | `/root/transporte-escolar-backend` — NestJS 11 + Prisma + PostgreSQL |
| Processo | pm2: `backend-transporte` (porta 3000). ~~agente-ia~~ (removido) |
| API pública | https://api.escolar.assistance24.ao (nginx `sites-enabled/api-escolar`) |
| Painel admin | https://escolar.assistance24.ao (nginx `sites-enabled/admin-escolar` → `/var/www/admin-escolar`) |
| Fonte do frontend | `/root/admin-frontend` (React/Vite exportado do Lovable) |
| Deploy do frontend | zip novo do Lovable → `/tmp` → `/root/deploy-admin.sh` |
| Base de dados | PostgreSQL local, BD `transporte_escolar` (~60 tabelas, PostGIS) |
| Ficheiros/imagens | Cloudinary (cloud `dsl1w1nr8`) via `src/upload` + `storage_config` |
| Templates PDF | `/root/templates/`: `ficha_adesao.pdf` (2026), `regulamento.pdf` (v2, 4 págs), `cartao_frente.pdf` (CR80), + versões antigas preservadas |
| Swagger | https://api.escolar.assistance24.ao/docs |
| Hub de Pagamentos | https://api.payments.ao — entidade Multicaixa **10015** (IZIPay/EMIS) |

**Logins de teste** (⚠️ a senha do admin é temporária e DEVE ser trocada antes de 01-08):
- Admin: `geral@assistance24.ao` / `Assistance24`
- Operador: `operador1@assistance24.ao` / `Operador2026`
- ⚠️ NÃO existe `admin@assistance24.ao` (o browser do Edson auto-preenche este email errado)

---

## 3. PROTOCOLOS OBRIGATÓRIOS (NÃO NEGOCIÁVEIS)

### 3.1 Backup antes de QUALQUER alteração
```bash
# código:
tar -czf /root/backup-<tema>-$(date +%Y%m%d-%H%M).tar.gz src/<pasta>/
# base de dados (tabelas afetadas ou completa):
sudo -u postgres pg_dump -d transporte_escolar -t <tabela> > /root/backup-<tema>-$(date +%Y%m%d-%H%M).sql
```

### 3.2 Ritual de build do backend (sempre nesta ordem)
```bash
cd /root/transporte-escolar-backend
rm -f tsconfig.build.tsbuildinfo
./node_modules/.bin/tsc --project tsconfig.build.json --noEmit   # tem de vir LIMPO
npm run build
pm2 restart backend-transporte --update-env
sleep 3   # e testar com curl antes de dar por concluído
```

### 3.3 SQL sempre via
```bash
sudo -u postgres psql -d transporte_escolar
```

### 3.4 Prisma após mudanças de schema na BD
```bash
npx prisma db pull && npx prisma generate   # e depois o ritual de build
```

### 3.5 Deploy do frontend
```bash
# o utilizador edita no Lovable → exporta zip → sobe para /tmp → correr:
/root/deploy-admin.sh
```

### 3.6 Calibração de PDFs (fichas/cartões/regulamentos)
- SEMPRE por medição vetorial (PyMuPDF `get_drawings`/`get_text("words")`), nunca a olho.
- Templates com CropBox deslocada dão ~6pt de desvio: se um campo cair fora do sítio
  sem explicação, medir o PDF GERADO (posição real dos números vs traços) e corrigir
  empiricamente.
- Edições ao `ficha-pdf.service.ts` por script Python com âncoras: verificar SEMPRE
  com um print se cada replace foi de facto aplicado (vários falharam silenciosamente
  no passado).

### 3.7 Cuidados de terminal
- `!` dentro de `echo "..."` rebenta o bash (event not found) — evitar.
- Nomes de ficheiros com espaços/acentos (zips do Lovable, PDFs do designer): usar aspas
  ou wildcards.
- Outputs longos: acrescentar `| cat` para não prender no pager.

---

## 4. REGRAS DE NEGÓCIO CRÍTICAS

### 4.1 Identificadores (o sistema é o DONO — nunca aceitar do cliente)
- **Código do aluno**: 5 dígitos, o 1º é a escola (1=Complexo Aurora, 2=Colégio Aurora),
  os 4 seguintes sequenciais. Gerado server-side (`gerarCodigoEReferencia`).
- **Referência Multicaixa**: `5` (gama) + `XXX` (3 dígitos aleatórios únicos) + `CCCCC`
  (código completo do aluno). Ex: `5|221|10746`. Gerada server-side DENTRO do fluxo de
  inscrição, registada no Hub ANTES de gravar. Índice único na BD.
- A resposta do `POST /inscricoes/completa` devolve `codigo_aluno` e `referencia` REAIS
  (o frontend só mostra pré-visualizações).
- Reconfirmações mantêm código e referência existentes.

### 4.2 Ciclo financeiro da inscrição
- Taxas: **nova = 30.000 AOA**, **reconfirmação = 25.000 AOA** (tabela `tipo_inscricao`).
- A taxa é a 1ª cobrança do aluno (linha em `mensalidades` com `tipo='taxa_inscricao'`,
  `mes=8`, vence no dia).
- Mensalidades geradas do **mês de início** (default setembro) em diante; entrada dia
  1-15 paga 100% do 1º mês; **dia 16-31 paga 50%**.
- Meses com fator 0.50 no calendário: dezembro e abril (`precos_mes`).
- O aluno nasce `ativo=false, motivo_estado='aguarda_pagamento'`.
- O webhook do Hub aplica pagamentos em **cascata** (taxa → meses por ordem), só marca
  cobranças inteiras; quando taxa + 1º mês estão pagos → **ativação automática**
  (`ativo=true, motivo='normal'`).
- Pagamentos EXCLUSIVAMENTE por referência Multicaixa.

### 4.3 Webhook do Hub (`POST /webhooks/hub`)
- HMAC SHA-256 sobre o raw body, header `X-Hub-Signature-256: sha256=<hex>`,
  segredo em `.env` (`HUB_WEBHOOK_SECRET`).
- Idempotência pela tabela `hub_eventos` (evento_id único).

### 4.4 Ano letivo
- Tabela `ano_lectivo` — só UM ativo; as inscrições usam o ativo.
- **Ativar um ano vazio copia automaticamente `precos_mes` + `precos_rota` do ano
  anterior** (endpoint `PUT /catalog/anos-letivos/:id/ativar`). DELETE recusa anos com
  contratos/mensalidades. Ano atual ativo: **2026/2027**.

### 4.5 Regras da FASE 2 (decididas, NÃO implementadas — pós 01-08)
- Conta corrente: pagamentos a mais ficam como crédito (o webhook devolve `valor_sobrante`).
- Devoluções: devolve-se 60% do pago, abate-se 100% (taxa efetiva 40%). Adesões/taxas
  nunca são reembolsáveis.
- Troca de rota: taxa 10.000 AKZ, máx 1x por ano letivo, sujeita a vagas.
- Viagens: 1→2 permitido com vagas; **2→1 PROIBIDO**; sem trocas temporárias.
- Meses de pausa pagam 50%.
- Futuro: GPO/Multicaixa Express na app dos pais.

### 4.6 Serviços A-F
- A e B = recolhas (manhã); C, D, E, F = regressos. Na ficha, o serviço da recolha e o
  do regresso imprimem-se por endereço.

### 4.7 Documentos gerados (FichaPdfService)
- `GET /inscricoes/ficha/:aluno_id` — ficha de adesão 2026 preenchida (foto, código,
  B.I., referência no rodapé, X na rota por CÓDIGO da rota, serviços por endereço,
  coordenadas, assinatura).
- `GET /inscricoes/processo/:aluno_id` — PDF de 5 páginas: ficha + regulamento (3 págs)
  + Declaração de Autorização (autorizados com nome+BI, assinatura). Retângulos brancos
  tapam as caixas azuis na pág. 4 antes da assinatura.
- `GET /inscricoes/cartao/:aluno_id` — cartão PVC CR80 (foto cover com clip, nome
  auto-ajustado, serviços + código na meia-lua).
- Todos fazem upload ao Cloudinary como anexos (`ficha_adesao`, `processo_inscricao`,
  `cartao_aluno`).

### 4.8 Assinatura remota
- `POST /inscricoes/link-assinatura/:aluno_id` → token 48 hex, **7 dias, uso único**
  (tabela `tokens_assinatura`).
- Página pública do frontend `/assinar/:token` → controller público
  `publico/assinatura` (sem guards): o encarregado lê o processo, indica até 3 pessoas
  autorizadas (nome+BI → `pessoas_autorizadas` + `autorizacoes_entrega`), assina
  (canvas 600×120 → anexo `assinatura_encarregado`) → o processo regenera-se completo.
- O tablet de setembro usará os MESMOS endpoints.

---

## 5. MAPA DOS MÓDULOS (src/) E ESTADO

| Módulo | Estado | Notas |
|---|---|---|
| inscricoes | ✅ produção | O coração: verificação, inscrição completa, ficha/processo/cartão, assinatura pública, detalhe |
| webhooks | ✅ produção | Webhook do Hub (cascata + ativação) — validado com pagamento real |
| auth | ✅ produção | JWT 1h + `POST /auth/refresh`; perfis ADMIN/OPERADOR |
| catalog | ✅ produção | Preços, contratos, CRUD anos letivos |
| upload / storage | ✅ produção | Cloudinary (fotos, PDFs, assinaturas) |
| email | ✅ configurável | `email_config` na BD; Brevo por configurar/testar |
| cobranca | ✅ DESLIGADO (seguro) | Cron diário 6h com interruptor: `parametros_sistema.cobranca_cron_ativo` = **'false'** atualmente. Calendário configurado: nota dia 1, lembrete dia 5, aviso dia 8, prazo dia 10, CORTE dia 11, reativação automática. Ligar (valor='true') quando a operação arrancar (~setembro) |
| cron / eta / gps / otimizacao / realtime | 🔶 setembro | Tracking, ETA 30s, websockets, rotas otimizadas — infraestrutura das apps de operação. NÃO TOCAR sem plano |
| parents | 🔶 construído, SEM frontend | 66 endpoints prontos para a app dos pais (setembro) |
| drivers / motoristas / motoristas-crud | 🔶 setembro | API da app dos motoristas |
| vigilantes / vigilantes-crud / viaturas / ocorrencias | 🔶 setembro | Operação |
| perfis / utilizadores / permissoes | ✅ | RBAC |
| erp | 🔴 embrião | 1 endpoint — a base do integrador PRIMAVERA (o grande pendente!) |
| imports / integracoes / admin-* / billing / contracts / financeiro | 🔶 diversos | Migração e utilitários |

**Base de dados:** ~60 tabelas. Zona quente do financeiro: `mensalidades` (com `tipo`),
`alunos` (com `motivo_estado`, `faturacao_*`), `hub_eventos`, `precos_mes`, `precos_rota`,
`tipo_inscricao`. Zona de operação (setembro): `viagens`, `partidas_*`, `gps_viagem`,
`eta_calculos`, `aluno_viagem`, `paineis`, `cais`.

---

## 6. ZONAS DE PERIGO ☠️

1. **É PRODUÇÃO.** A BD tem 864 alunos reais sincronizados com o Hub. O site está
   público. Cada inscrição de teste cria uma REFERÊNCIA REAL na IZIPay/EMIS.
2. **Nunca alterar `referencia_pagamento` ou `codigo_aluno` de um aluno** — quebra o
   elo com o Hub e os pagamentos.
3. **Nunca apagar/editar `hub_eventos`** (idempotência dos pagamentos).
4. **Não mexer nos módulos de operação** (gps, eta, realtime, viagens, parents,
   drivers) sem tarefa explícita — servem as apps de setembro.
5. **Testes com alunos**: usar documentos `BI-TESTE-*`, e LIMPAR sempre no fim
   (mensalidades → adesões → contratos → anexos → autorizações → tokens → aluno →
   encarregado órfão). Registar as referências órfãs criadas no Hub para reportar.
6. Alunos manequim atuais: **EDSON 10746** e **JOEL 10747** (com refs órfãs no Hub
   522110746/578410747) — remover antes de 01-08.
7. **CORS** em `src/main.ts`: origens fixas + regex Lovable. Novos domínios têm de ser
   adicionados lá (e rebuild).
8. O certificado/nginx: `sites-enabled/api-escolar` (API) e `admin-escolar` (painel).
   O ficheiro `sites-available/api` é um site ANTIGO desativado — não reativar.

---

## 7. ESTADO ATUAL E PENDENTES

### Feito e validado
- Migração completa (rotas A-F, 864 alunos espelho do Hub, encarregados placeholder)
- Ciclo financeiro completo com ativação automática (testado com pagamento real)
- Identificadores server-side (gama 5) + índice único
- Ficha 2026 + processo 5 págs + cartão PVC calibrados vetorialmente
- Assinatura remota por link/QR (WhatsApp) + página pública
- Detalhe da inscrição (tabs, PdfViewerDialog, remover autorizados)
- Deploy em produção: https://escolar.assistance24.ao + deploy-admin.sh
- Ano letivo 2026/2027 ativo com preços copiados + CRUD com cópia automática
- Sessões: JWT 1h + /auth/refresh (backend); frontend 30min/refresh via prompt Lovable

### Pendentes imediatos
1. 🔐 **Trocar a senha do admin** (temporária e pública!) — antes de 01-08
2. Limpar EDSON 10746 + JOEL 10747 + avisar o Hub das refs órfãs da gama 5
3. Verificar/decidir o cron da cobrança 6h
4. Fix latente: import do AuthGuard no auth.controller (validar noEmit limpo)
5. og-image quadrada (WhatsApp corta o logo horizontal)
6. Prompts Lovable a aplicar/deployar: sessão 30min, edição do aluno (campos
   bloqueados), Prompt 14 (ano letivo + preços editáveis + filtro), meta tags OG
7. Brevo: conta + configurar em /email + teste
8. Contas dos operadores reais (aguarda nomes+emails)

### 🔴 O GRANDE BLOCO: INTEGRADOR PRIMAVERA (15-08!)
Perguntas por responder: versão do Primavera? onde está instalado? faturar
mensalidades/taxas/ambas? web services ativos?
Regra da fatura: NIF = `faturacao_nif` || `num_documento`; nome = `faturacao_nome` ||
nome do aluno; email = `faturacao_email` || email do encarregado. Faturas PDF → conta
corrente do aluno no Cloudinary.

### Setembro (Fase operação)
Apps Motorista/Pais (a API parents com 66 endpoints está pronta), painéis de partidas,
tablet de assinaturas (usa os endpoints da assinatura remota), app vigilante lê o QR do
cartão. + Regras da Fase 2 (secção 4.5).

---

## 8. COMO TESTAR

```bash
# token de admin:
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login/admin -H "Content-Type: application/json" \
  -d '{"email":"geral@assistance24.ao","senha":"<SENHA>"}' | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

# inscrição de teste (usar docs BI-TESTE-*; LIMPAR depois):
# ver secção 6.5 para o ritual de limpeza

# simular pagamento (webhook local):
printf '%s' '{"event":"payment.completed","id":"evt_teste_X","data":{"reference":"<REF>","amount":<VALOR>,"currency":"AOA"}}' > /tmp/wh.json
SECRET=$(grep HUB_WEBHOOK_SECRET .env | cut -d'=' -f2)
ASS="sha256=$(openssl dgst -sha256 -hmac "$SECRET" < /tmp/wh.json | awk '{print $2}')"
curl -s -X POST http://localhost:3000/webhooks/hub -H "Content-Type: application/json" -H "X-Hub-Signature-256: $ASS" --data-binary @/tmp/wh.json
```

Frontend: testar em https://escolar.assistance24.ao (admin e operador). PDFs abrem no
PdfViewerDialog (react-pdf com worker embutido no bundle). Nota: extensões de bloqueio
do browser causavam ERR_BLOCKED_BY_CLIENT — resolvido com o viewer embutido.

---

## 9. FLUXO DE TRABALHO COM O UTILIZADOR (Edson)

- O Edson valida cada etapa; explica-lhe as decisões em português claro, com opções.
- O frontend edita-se no Lovable (ou diretamente em /root/admin-frontend via git,
  quando o GitHub sync estiver ativo) → deploy com /root/deploy-admin.sh.
- Antes de tarefas grandes: propor plano, esperar OK.
- Depois de cada mudança: testar de facto (curl/browser) antes de reportar sucesso.

---

# ADENDO 13-15/07/2026 — INTEGRADOR ERP PRIMAVERA (ESTADO E REGRAS)

## Estado: MOTOR FUNCIONAL EM AMBIENTE DE TESTE
Emissão de Fatura-Recibo validada de ponta a ponta (FRs 310-316 na empresa de teste TRE),
com PDF devolvido à plataforma e subido ao Cloudinary. Falta: webhook automático, réplica
fiscal na a24, endurecimento (ver pendentes).

## Arquitetura (não alterar sem razão forte)
Plataforma (droplet) → fila `erp_jobs` → Agente Node.js no servidor do Primavera
(C:\Agente24, ligação APENAS de saída, sem VPN/portas) → WebAPI Primavera localhost:2018.
Tabelas: erp_empresas (credenciais cifradas AES-GCM, defaults de cliente/artigo/série/IVA,
amarrada a um agente via agente_id) · erp_agentes (chave só como hash SHA-256) ·
erp_jobs (fila, retries 5x, idempotência) · erp_documentos (UNIQUE mensalidade_id =
1 pagamento 1 fatura; pdf_url do Cloudinary).
Endpoints do agente: POST /erp/agente/heartbeat · GET /erp/agente/jobs ·
POST /erp/agente/jobs/:id/resultado — autenticados por header X-Agent-Key.
Painel: página "ERP Primavera" (3 separadores) em escolar.assistance24.ao.

## Empresas na plataforma
- TRE "Transporte Escolar (TESTE)" empresa_id=2fc72ff1-701b-4e6b-a226-52add3d4c69a
  serie=2026A, cliente default=CF, artigo default=01001, IVA=90, modo_teste=true
- a24 "Assistance24 (PRODUCAO)" empresa_id=52024036-6357-41cf-a48c-65ddb87b7593
  INATIVA até réplica fiscal (série/IVA/artigos reais do contabilista)
Agente de produção: agente_id=e0182a44-5d65-4a7f-abf0-918ebc1ae543, serve TRE e a24.
Chave do agente: instalada em C:\Agente24\config.json (Windows) — NUNCA colar em chats;
qualquer chave exposta roda-se (criar agente novo + desativar antigo).

## Utilizador do ERP
Utilizador dedicado `api` no Primavera, associado às empresas. Senha atual está QUEIMADA
(apareceu em chat) — TROCAR e atualizar no painel (Empresas → lápis). Idem senha do ealves.

## Agente Windows — v0.5 (fonte oficial: agente/agente.js neste repo)
Fluxo: heartbeat → busca jobs (só das SUAS empresas) → executa → devolve resultado+pdf_base64.
Emissão: POST /v2/Vendas/Docs/CreateSalesDocument. PDF: PrintDocumentToPDF devolve bytes
no corpo (mapa GcpVls02) + grava cópia em C:\Windows\Temp (o agente limpa).
v0.5 aplica identificação REAL do pagador no documento: Nome/NumContribuinte/Morada do
payload cliente sobrepõem-se ao consumidor final CF. Descrição da linha (montada no
backend): "Mensalidade X | Ref. Multicaixa: NNN | Referente a: NOME DO ALUNO".
Arranque manual: cd C:\Agente24 && node agente.js (janela aberta!). Promover a serviço
Windows (NSSM) está pendente.

## Lições Primavera (custo: horas — NÃO redescobrir)
- Payload: campo é "Tipodoc" (d minúsculo); "PrecUnit"; CodIva é o CÓDIGO da tabela
  (90=isento aqui), não a taxa — código inexistente dá HTTP 417 NullReference; ModoPag e
  CondPag OBRIGATÓRIOS em FR e o ModoPag tem de ser compatível com a conta de tesouraria
  da série; não enviar Cambio (ERP calcula); incluir Filial/Seccao/RegimeIva/
  TipoLancamento e na linha Unidade/Armazem/MovStock/TipoLinha.
- Diagnóstico de 417: gravar doc igual à mão no ERP e ler via GET /v2/Vendas/Docs/Edita/
  000/FR/2026A/N — espelhar os campos.
- Falso sucesso: 200 com Results.CreateDocument=false = série/entidade/artigo inexistente.
- PDF: NomePDF só aceita NOME de ficheiro (caminho completo → IIS 400).
- Token expira ~20 min; 1 token por empresa; utilizador tem de estar associado à empresa
  e a empresa "Em produtivo" (senão "Integration platform not open").
- Swagger da build: http://localhost:2018/WebApi/swagger/ui/index (docs/v2_vendas etc.)
- Documentação de referência: agente/INTEGRADOR_PRIMAVERA.md, agente/GUIA_API_PRIMAVERA_
  VENDAS.md e coleção Postman (se adicionados ao repo).

## Fluxos de trabalho ATUALIZADOS
- Frontend: código escreve-se NO SERVIDOR em /root/admin-frontend (clone git de
  school-ride-connect) → commit/push → aparece no Lovable (sync bidirecional).
  Deploy: /root/deploy-admin.sh (git pull + build + publica). FIM DOS ZIPS.
- Backend: /root/transporte-escolar-backend, repo transporte-escolar-backend, ritual:
  backup → alterar → tsc --noEmit → build → pm2 restart → testar → commit/push.
- Testes de emissão: INSERT direto em erp_jobs com payload
  {"cliente":{...},"linha":{"valor":N,"descricao":"..."}} para a empresa TRE.

## PENDENTES DO INTEGRADOR (ordem)
1. Timeout de jobs órfãos (em_curso >10min → pendente) + buscarJobs atómico
2. Webhook do Hub → fila, com MULTI-LINHA (decisão fechada: inscrição+mensalidade =
   1 fatura com 2 linhas; artigo por tipo — novo campo cod_artigo_taxa na empresa)
3. ModoPag/CondPag/mapa de impressão configuráveis por empresa (hoje hardcoded RTRF/1/
   GcpVls02 no agente) + campo Agente no formulário da empresa no painel
4. Backend enviar morada do encarregado no payload (agente já a aplica)
5. Agente como serviço Windows (NSSM) + instalador simples para técnicos
6. Fiscal a24 (contabilista): série real, código IVA real, modo pagamento Multicaixa +
   conta de tesouraria, obrigações AGT
7. Anular FRs de teste 310-316 na TRE; ativar a24; primeira fatura real
8. Pendentes antigos que continuam: senha admin do painel, refs órfãs ao Hub
   (522110746/578410747/576610748), Brevo/email, og-image, operadores
