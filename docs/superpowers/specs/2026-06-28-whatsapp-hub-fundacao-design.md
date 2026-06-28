# Hub de Comunicação WhatsApp — Fundação (M0+M1+M2)

**Data:** 2026-06-28
**Branch:** `feat/whatsapp-hub-fundacao`
**Status:** Design aprovado, aguardando revisão de spec

## Contexto e problema

A feature de WhatsApp do OMBUDS está **construída de forma extensa mas dormente há ~3 meses**. Investigação em 2026-06-27/28 confirmou:

- **Frontend completo**: 5 páginas (`/admin/whatsapp` + `chat`, `templates`, `importar`, `vincular`) + ~20 componentes.
- **Backend completo**: `src/lib/trpc/routers/whatsapp-chat.ts` (42 procedures), service `src/lib/services/evolution-api.ts` (1.325 linhas), webhook `src/app/api/webhooks/evolution/route.ts`.
- **Dados reais (Supabase)**: instância "ombuds" `status=disconnected`, 214 contatos com **0 vinculados a assistidos**, 14.766 mensagens **100% importadas** (backup do iPhone — fluxo ao vivo nunca validado), **0 ações** registradas.
- **Causa-raiz da queda (Railway, projeto `magnificent-charm`)**: deploy do `evolution-api` **FAILED em 2026-03-22**; Postgres dedicado teve deployment **REMOVED em 2026-06-04** (limpeza de recursos dormentes). **Não é billing** (`enrichment-engine` e `ombuds-ai-backend` seguem no ar). **Volume `postgres-volume` intacto** (READY, 237 MB) → recuperável.

**Decisões estratégicas tomadas no brainstorm:**
1. Visão de destino: **Hub único de comunicação** com assistidos, integrado a demandas/audiências/Drive.
2. Backbone de mensageria: **religar Evolution (WhatsApp Web não-oficial) e blindar** — conversa livre total, risco de ban gerenciado. (Meta Cloud oficial rejeitada por proibir mensagem livre fora de janela de 24h, inviabilizando conversa de mão dupla.)
3. Entrega fatiada em camadas que sempre sobem vivas, para **não recriar o elefante dormente**.

Este spec cobre a **Fundação** do hub: **M0 (infra resiliente) + M1 (tempo real + vínculo) + M2 (conversa vira caso)**. Camadas posteriores (M3 cockpit, M4 triagem IA, M5 multi-telefone/demandas, e — feature grande à parte — automação de respostas) ficam no roadmap, fora deste spec.

## Objetivos

- Religar o WhatsApp de forma **resiliente** (nunca mais cair em silêncio por 3 meses).
- Mensagens chegando **em tempo real** (não polling de 15s).
- Telefone **auto-vinculado** ao assistido com normalização brasileira correta.
- Conversa atendida virando **registro de atendimento** honesto no dossiê.

### Não-objetivos (explícito)

- Automação de respostas / auto-reply (feature grande, fica para depois do M5).
- Cockpit jurídico no chat (M3), triagem IA (M4), multi-telefone/família/demandas (M5).
- Migração para Meta Cloud API.
- Notificações de saída em massa (parte de M5).

---

## M0 · Infra resiliente

### Religar (ordem obrigatória)

1. **Redeploy do serviço Postgres** no Railway (volume `postgres-volume` intacto → dados da Evolution voltam).
2. **Redeploy do `evolution-api`** (imagem `evoapicloud/evolution-api:v2.3.7`). Logs do deploy falhado de 22/mar já foram expurgados; subir fresco e ler logs novos. Hipótese principal: falha era dependência do Postgres no boot.
3. **Reconectar**: re-escanear QR (o device foi deslogado pelo WhatsApp após 3 meses de inatividade). Usa `getQRCode` (tRPC) + componente `ConnectionStatus` existentes, ou o Manager UI da Evolution.

### Blindar

- **Healthcheck cron**: cron da Vercel (a cada 5 min) → rota interna que consulta `connectionState` da Evolution. Se ≠ `"open"`: grava `evolution_config.status` e, **na transição open→down**, dispara alerta in-app. Se for desconexão de WhatsApp (não crash de container), tenta reconectar via API.
- **Status visível**: componente `DisconnectBanner` (já existe) passa a refletir `evolution_config.status` em tempo real (via Supabase Realtime de M1).
- **Auto-restart**: Railway já tem `restartPolicy=ON_FAILURE` (10 retries) para o container; o cron cobre "container vivo, WhatsApp desconectado".
- **Alerta**: **somente in-app** (banner + indicador de status). Sem e-mail/Telegram/SMS nesta fase (decisão do usuário). Disparar apenas na transição de estado, nunca a cada tick (evitar tempestade de alertas).

### Componentes M0

- Rota cron `src/app/api/cron/whatsapp-healthcheck/route.ts` (nova) + entrada de cron na config Vercel.
- Reuso: `evolution-api.ts` (`getConnectionStatus`), `evolution_config` (coluna `status`), `DisconnectBanner`, `whatsapp_connection_log`.

---

## M1 · Tempo real + vínculo

### Tempo real (zero infra nova — Supabase Realtime já é padrão do app)

- Padrão estabelecido: 6 lugares usam `postgres_changes` (`use-realtime-demanda-eventos.ts`, `use-realtime-file-status.ts`, etc.).
- No webhook (`route.ts:256`, onde está o TODO de SSE/WebSocket), a mensagem já é gravada em `whatsapp_chat_messages`. Não é preciso "disparar" nada extra: o Realtime emite o `postgres_changes` automaticamente no INSERT.
- **Novo hook `use-realtime-whatsapp-messages.ts`** (espelha `use-realtime-demanda-eventos.ts`): assina `whatsapp_chat_messages` (filtro por `contactId`) para a janela de chat, e `whatsapp_contacts` para a lista de conversas. Substitui o polling de 15s em `ChatWindow` e `ConversationList`.
- **Migration**: adicionar `whatsapp_chat_messages` e `whatsapp_contacts` à publication `supabase_realtime` (as tabelas realtime atuais já estão; estas podem não estar). Espelhar o script idempotente existente `scripts/apply-demanda-eventos-migration.ts` → novo `scripts/apply-whatsapp-realtime-migration.ts` com `ALTER PUBLICATION supabase_realtime ADD TABLE ...` guardado por checagem de existência. Deve rodar **antes** do deploy do M1.

### Vínculo telefone↔assistido

- **Util `normalizeBrPhone(raw): string | null`** (novo, ex. `src/lib/utils/phone-br.ts`): normalização brasileira real — trata DDI 55 presente/ausente, DDD, e **9º dígito** (celular vs fixo). Produz chave canônica comparável. Retorna `null` quando não consegue normalizar com segurança (falha segura). Substitui o `normalizePhone` ingênuo de `vincular/page.tsx:42` (que só compara "últimos 8 dígitos" cru e gera falsos positivos).
- **Matcher** `matchAssistidoByPhone(phone)`: compara contra `assistidos.telefone` e `assistidos.telefoneContato` (`core.ts:108-109`) usando a chave canônica.
  - **Política de auto-vínculo (decisão do usuário): auto SOMENTE em match único exato normalizado.** Ambiguidade (2+ assistidos batem, ou match parcial) → **não** vincula; vira sugestão na UI `/vincular`. Nunca auto-vincula número compartilhado/família (proteção de sigilo).
- **Em tempo real**: todo novo contato criado no webhook passa pelo matcher.
- **Backfill único**: mutation tRPC `whatsappChat.backfillPhoneLinks` (admin-only, idempotente). Varre contatos com `assistidoId IS NULL`, aplica o matcher, auto-vincula os match únicos exatos, e retorna `{ linked, ambiguous, failed }`. Re-rodável sem efeito colateral. Acionável por botão na página `/vincular`.
- A página `/vincular` reusa o mesmo util (matcher consistente em todo lugar).

### Componentes M1

- `src/lib/utils/phone-br.ts` (novo): `normalizeBrPhone` + `matchAssistidoByPhone`.
- `src/hooks/use-realtime-whatsapp-messages.ts` (novo).
- Migration: publication realtime das 2 tabelas.
- Edições: webhook (chama matcher no contato novo), `ChatWindow`/`ConversationList` (consomem o hook), `vincular/page.tsx` (usa o util novo), mutation de backfill.

---

## M2 · Conversa vira caso

Reusa o modelo `registros` (`src/lib/db/schema/agenda.ts:179`), que já tem `assistidoId`, `tipo`, `interlocutor`, `conteudo`, e links opcionais para `processoId`/`casoId`/`demandaId`/`audienciaId`.

### Pré-requisito de schema: coluna `origem` em `registros`

O modelo `registros` (`agenda.ts:179`) **não tem** hoje um campo de origem. É necessário adicioná-lo para chavear o find-or-create e permitir filtrar atendimentos por canal:

- **Migration**: `ALTER TABLE registros ADD COLUMN origem varchar(20) NOT NULL DEFAULT 'manual'`. Valores: `"manual" | "whatsapp" | "solar" | "audio"`.
- Atualizar o input schema de `registros.create` (`registros.ts:378`) para aceitar `origem` (default `"manual"`), mantendo compatibilidade com o botão manual existente.

### Conversa → atendimento (regra honesta)

**Gatilho do atendimento automático = o defensor responder, não o assistido pingar.**

- Inbound de assistido vinculado **sem resposta** → **nenhum** `registros` criado. O contato permanece na lista **"Aguardando resposta"** (`listPendingContacts`, já existente) — funcionando como worklist de quem espera. (Semanticamente correto: não houve atendimento.)
- **Onde o gatilho roda**: no caminho tRPC `sendMessage` (`whatsapp-chat.ts:861`), **não** no webhook. O evento `SEND_MESSAGE` do webhook é no-op (`route.ts:122`); o outbound real do defensor sempre passa pelo `sendMessage`. Após enviar com sucesso para um contato com `assistidoId != null`, executa o find-or-create.
- **Definição de "dia"**: fuso **America/Sao_Paulo**. O limite do dia é meia-noite local (normalizar `dataRegistro` para o dia local de SP ao comparar).
- **Find-or-create** (transacional, para evitar corrida): busca um `registros` com `(assistidoId, origem='whatsapp', dataRegistro no dia local de SP)`. Se não existe, cria `tipo:"atendimento"`, `interlocutor:"assistido"`, `origem:"whatsapp"`, ligado ao `processoId`/`demandaId` ativo do assistido (se houver). Se já existe, **não cria outro** e não faz nada (o segundo+ outbound do dia é no-op para `registros`).
- **Conteúdo é snapshot, não transcrição**: `conteudo` é definido **uma vez** na criação, como marcador leve (ex.: `"Atendimento via WhatsApp"`), **não** acumula cada mensagem (evita crescimento ilimitado). As mensagens em si vivem em `whatsapp_chat_messages`; o `lastMessageAt` do contato cobre o "última atividade".
- Reusa `registros.create` (`registros.ts:378`) — o mesmo que o botão manual `whatsapp-cockpit-card.tsx:45` já chama.

### Ações viram peça do dossiê

As procedures `saveToCase`, `createNoteFromMessage`, `extractData`/`applyExtractedData` já existem em `whatsapp-chat.ts` mas nunca foram usadas (`whatsapp_message_actions` = 0). M2 faz elas **gravarem de verdade**:

- Ao salvar mensagem no caso: cria o `whatsapp_message_actions` E um `registros` ligado ao `processoId`/`demandaId` ativo do assistido — visível na timeline do perfil e na demanda.

### Componentes M2

- Migration: coluna `origem` em `registros` + atualização do input de `registros.create`.
- Lógica de find-or-create do atendimento no caminho tRPC `sendMessage` (transacional, fuso SP).
- Edições nas procedures de ação (`saveToCase`, `createNoteFromMessage`, `applyExtractedData`) para gravar `registros` ligados ao processo/demanda.
- Reuso: `registros` schema + `registros.create`, `listPendingContacts`, `whatsapp_message_actions`.

---

## Tratamento de erros e casos de borda

- **Idempotência do webhook**: `waMessageId` tem índice único → upsert/dedupe (WhatsApp reenvia eventos).
- **Envio com Evolution caída**: erro explícito na UI, sem perda silenciosa (try/catch já existe no service).
- **Realtime cai e volta**: client Supabase reconecta sozinho; no reconnect, refetch para preencher buracos (padrão dos hooks atuais).
- **Normalização de telefone**: 9º dígito ausente, fixo, internacional, número curto → util retorna `null` (falha **segura**, nunca match errado).
- **Atendimento rolante**: `find-or-create` por `(assistidoId, dia, origem=whatsapp)` evita duplicatas em concorrência.
- **Alerta sem tempestade**: cron dispara apenas na transição open→down.
- **Backfill idempotente**: re-rodável; auto-vincula só únicos; loga ambíguos.
- **Auto-vínculo falso-positivo**: confiança = match único exato normalizado; unlink manual fácil; nunca número compartilhado/família.
- **Validação do `status`**: opcionalmente adicionar CHECK em `evolution_config.status` (`'connected'|'disconnected'|'connecting'|'error'|'waiting_qr'`) para travar valores no banco (nice-to-have).

## Estratégia de testes

- **Unit**: `normalizeBrPhone` (tabela ampla de casos BR: com/sem 55, com/sem 9º dígito, fixo, DDD, lixo); `matchAssistidoByPhone` (único/ambíguo/nenhum); find-or-create do atendimento.
- **Webhook**: handler com payloads `MESSAGES_UPSERT` reais (texto e mídia) + idempotência (mesmo `waMessageId` 2x).
- **Realtime**: teste de integração — INSERT em `whatsapp_chat_messages` empurra para o chat aberto.
- **E2E manual (checklist)**: religar → QR → enviar/receber ao vivo → auto-vínculo de número conhecido → responder → registro de atendimento aparece no perfil do assistido.

## Roadmap posterior (fora deste spec)

- **M3** — Cockpit jurídico no chat (processos/prazos/audiências/Drive ao lado da conversa; componentes `ContextPanel` já existem, falta dados reais).
- **M4** — Triagem IA das mensagens recebidas (classificar dúvida/documento/urgência, sugerir ato), reusando enrichment engine.
- **M5** — Multi-telefone/família, vínculo a demandas/audiências, notificações de saída confiáveis com entrega/leitura.
- **Depois (feature grande à parte)** — Automação de respostas.

## Referências de código

- Webhook: `src/app/api/webhooks/evolution/route.ts` (TODO realtime na linha 256).
- Service Evolution: `src/lib/services/evolution-api.ts`.
- Router: `src/lib/trpc/routers/whatsapp-chat.ts` (42 procedures).
- Schema ativo: `drizzle/schema.ts` (NÃO `src/lib/db/schema/comunicacao.ts`, dessincronizado).
- `registros`: `src/lib/db/schema/agenda.ts:179`; mutation `src/lib/trpc/routers/registros.ts:378`.
- Telefones do assistido: `src/lib/db/schema/core.ts:108-109`.
- Padrão Realtime: `src/hooks/use-realtime-demanda-eventos.ts`.
- Página de vínculo: `src/app/(dashboard)/admin/whatsapp/vincular/page.tsx`.
- Cockpit no perfil: `src/app/(dashboard)/admin/assistidos/[id]/_components/whatsapp-cockpit-card.tsx`.
- Railway: projeto `magnificent-charm` (id `23e14f23-cb2c-4d01-b5b7-31d05e3b946b`), env production, svc `evolution-api` (`f64bc833-...`), svc `Postgres` (`f7432fa8-...`).
