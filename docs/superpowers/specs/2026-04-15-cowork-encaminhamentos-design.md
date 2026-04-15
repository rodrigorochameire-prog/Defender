# Cowork — Encaminhamentos entre Defensores

**Data:** 2026-04-15
**Autor:** Rodrigo Rocha Meire + Claude
**Status:** Design aprovado, pendente plano de implementação

---

## Contexto e Motivação

Hoje, os defensores do mesmo workspace (ex: Júri Camaçari) coordenam trabalho por WhatsApp, email e conversas de corredor. O OMBUDS tem a página **Cowork** com três primitivas pontuais — **Pareceres** (consulta rápida), **Mural** (notas broadcast) e **Coberturas** (substituição temporária) — mas falta um canal explícito e estruturado para **transferir demandas e compartilhar contexto** entre colegas.

**Caso concreto que motivou o design (15/04/2026):** a mãe de um assistido da Juliane ligou para Rodrigo pedindo atualização. Rodrigo anotou o recado na planilha Júri compartilhada (editando status da demanda), mas não havia como transmitir o contexto ("mãe ligou, quer atualização sobre audiência") para Juliane dentro do sistema. Resultado: a demanda ficou desalinhada entre planilha e Kanban, e o recado se perdeu.

Este design introduz **Encaminhamentos** como quarta primitiva do Cowork, focada em comunicação direcionada entre colegas sobre uma demanda, processo, assistido ou tema livre.

## Goals

- **G1.** Substituir WhatsApp/email como canal primário de coordenação entre defensores do mesmo workspace.
- **G2.** Preservar contexto sobre demandas alheias (recados, anotações, acompanhamento) sem criar ambiguidade de titularidade.
- **G3.** Oferecer um caminho formal para transferir demandas entre colegas, com aceite/recusa e histórico imutável.
- **G4.** Consolidar `pareceres` existente dentro do novo modelo (migração + redirect).
- **G5.** Integrar notificações multi-canal (in-app, WhatsApp via evolution-api, email futuro).

## Non-Goals

- **NG1.** Substituir Mural (broadcast sem destinatário) ou Coberturas (plano temporal de substituição). Ambos permanecem separados, integrados visualmente no Cowork.
- **NG2.** Permitir encaminhamento entre workspaces (futuro — requer modelo de permissão inter-workspace).
- **NG3.** Delegação a estagiário/servidor — abordada como extensão futura dentro da mesma primitiva, mas não escopo do MVP.
- **NG4.** Chat em tempo real. A thread é assíncrona com notificações; não há presença/typing indicators.

## Cenários de Uso (User Stories)

1. **Recado sobre caso alheio** — Rodrigo recebe ligação da mãe de Francisco (caso de Juliane). Ele abre o card de Francisco no Kanban, clica em "Encaminhar", escolhe tipo **Anotar**, escreve o recado, grava áudio da mãe como anexo, envia. Juliane recebe notificação in-app + WhatsApp, acessa o Cowork, marca como ciente. A anotação fica na timeline do card.

2. **Transferência por férias** — Cristiane vai entrar de férias. Ela seleciona 3 demandas no Kanban, clica em "Transferir em lote", escolhe Rodrigo como destinatário. Rodrigo recebe uma notificação por demanda; aceita duas e recusa uma (motivo: "sou impedido neste processo"). As duas aceitas mudam `defensor_id` para Rodrigo; a recusada volta para Cristiane com o motivo registrado.

3. **Pedido de parecer** — Danilo está com dúvida sobre aplicação do Tema 1.277 do STJ. Abre o card do caso, clica em "Pedir Parecer", escolhe Rodrigo, marca urgência "normal", anexa print da decisão. Rodrigo recebe, responde na thread. Ao responder, estado vira "respondido"; Danilo marca como resolvido. Dados migrados da tabela `pareceres`.

4. **Acompanhar caso alheio** — Um defensor quer acompanhar um caso conduzido por colega pela relevância do tema. Clica em "Acompanhar", envia pedido. O dono aceita → o solicitante passa a ver o card em modo read-only em seu Kanban com badge "Acompanhando". Alterações no card disparam notificação sutil.

5. **Tema livre** — "Alguém tem jurisprudência sobre X?". Rodrigo abre "+ Novo" na página Cowork (sem contexto de demanda), escolhe tipo Parecer, destinatários = todos do Júri, mensagem. Aparece na inbox dos colegas como thread colaborativa.

## Modelo de Dados

### Tabela `encaminhamentos`

```ts
export const encaminhamentos = pgTable("encaminhamentos", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull().references(() => workspaces.id),

  // Participantes
  remetenteId: integer("remetente_id").notNull().references(() => users.id),
  // destinatários via tabela `encaminhamento_destinatarios` (N:N)

  // Tipo e conteúdo
  tipo: varchar("tipo", { length: 20 }).notNull(),
  // 'transferir' | 'encaminhar' | 'acompanhar' | 'anotar' | 'parecer'

  titulo: varchar("titulo", { length: 200 }),  // opcional — auto-derivado do ato se não preenchido
  mensagem: text("mensagem").notNull(),

  // Contexto (opcional — tema livre não tem nenhum)
  demandaId: integer("demanda_id").references(() => demandas.id),
  processoId: integer("processo_id").references(() => processos.id),
  assistidoId: integer("assistido_id").references(() => assistidos.id),

  // Estado
  status: varchar("status", { length: 20 }).notNull().default("pendente"),
  // 'pendente' | 'ciente' | 'aceito' | 'recusado' | 'respondido' | 'concluido' | 'arquivado' | 'cancelado'
  urgencia: varchar("urgencia", { length: 10 }).notNull().default("normal"),  // 'normal' | 'urgente'

  // Notificação
  notificarOmbuds: boolean("notificar_ombuds").notNull().default(true),
  notificarWhatsapp: boolean("notificar_whatsapp").notNull().default(false),
  notificarEmail: boolean("notificar_email").notNull().default(false),

  // Auditoria
  concluidoEm: timestamp("concluido_em"),
  concluidoPorId: integer("concluido_por_id").references(() => users.id),
  motivoRecusa: text("motivo_recusa"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("enc_workspace_idx").on(table.workspaceId),
  index("enc_remetente_idx").on(table.remetenteId),
  index("enc_demanda_idx").on(table.demandaId),
  index("enc_status_idx").on(table.status),
  index("enc_created_idx").on(table.createdAt),
]);
```

### Tabela `encaminhamento_destinatarios`

```ts
export const encaminhamentoDestinatarios = pgTable("encaminhamento_destinatarios", {
  id: serial("id").primaryKey(),
  encaminhamentoId: integer("encaminhamento_id").notNull()
    .references(() => encaminhamentos.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  estadoPessoal: varchar("estado_pessoal", { length: 20 }).notNull().default("pendente"),
  // Para multi-destinatários em Anotar/Encaminhar, cada destinatário tem seu próprio
  // estado (lido, arquivado etc), independente do estado global do encaminhamento.
  lidoEm: timestamp("lido_em"),
  cienteEm: timestamp("ciente_em"),
}, (table) => [
  uniqueIndex("enc_dest_unique").on(table.encaminhamentoId, table.userId),
  index("enc_dest_user_idx").on(table.userId),
]);
```

### Tabela `encaminhamento_respostas`

```ts
export const encaminhamentoRespostas = pgTable("encaminhamento_respostas", {
  id: serial("id").primaryKey(),
  encaminhamentoId: integer("encaminhamento_id").notNull()
    .references(() => encaminhamentos.id, { onDelete: "cascade" }),
  autorId: integer("autor_id").notNull().references(() => users.id),
  mensagem: text("mensagem").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("enc_resp_enc_idx").on(table.encaminhamentoId),
]);
```

### Tabela `demandas_acompanhantes`

Criada quando um encaminhamento tipo **Acompanhar** é aceito. Permite que N defensores acompanhem read-only uma demanda cuja titularidade não é deles.

```ts
export const demandasAcompanhantes = pgTable("demandas_acompanhantes", {
  id: serial("id").primaryKey(),
  demandaId: integer("demanda_id").notNull()
    .references(() => demandas.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  origemEncaminhamentoId: integer("origem_encaminhamento_id")
    .references(() => encaminhamentos.id, { onDelete: "set null" }),
  notificarAlteracoes: boolean("notificar_alteracoes").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("dem_acomp_unique").on(table.demandaId, table.userId),
  index("dem_acomp_user_idx").on(table.userId),
]);
```

O Kanban do usuário acompanhante faz `UNION` entre `demandas WHERE defensor_id = me` (titular) e `demandas JOIN demandas_acompanhantes WHERE user_id = me` (acompanhando), marcando as segundas com flag visual "acompanhando" (borda tracejada, read-only).

### Tabela `encaminhamento_anexos`

```ts
export const encaminhamentoAnexos = pgTable("encaminhamento_anexos", {
  id: serial("id").primaryKey(),
  encaminhamentoId: integer("encaminhamento_id").references(() => encaminhamentos.id, { onDelete: "cascade" }),
  respostaId: integer("resposta_id").references(() => encaminhamentoRespostas.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'audio' | 'drive' | 'upload'
  driveFileId: varchar("drive_file_id", { length: 80 }),  // se vier do Drive
  storageUrl: text("storage_url"),  // se upload direto ao Supabase Storage
  nome: varchar("nome", { length: 200 }),
  sizeBytes: integer("size_bytes"),
  duracaoSeg: integer("duracao_seg"),  // pra áudio
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Regras de integridade

- `encaminhamentos.status` transitions válidas por tipo:
  - **Transferir:** `pendente → aceito | recusado` (aceite efetua UPDATE em `demandas.defensor_id`; recusa retorna ao remetente)
  - **Encaminhar:** `pendente → ciente`
  - **Acompanhar:** `pendente → aceito | recusado` (aceite cria entrada em `demandas_acompanhantes` — nova tabela, ver extensão)
  - **Anotar:** `pendente → ciente → arquivado`
  - **Parecer:** `pendente → respondido → concluido`
- `concluidoEm` e `concluidoPorId` preenchidos sempre que `status` passa a `aceito|recusado|respondido|concluido|cancelado`.
- `notificar_whatsapp` só efetiva se o destinatário tiver WhatsApp cadastrado no perfil (`users.phone`).

### Migração de `pareceres` existente

```sql
INSERT INTO encaminhamentos (
  workspace_id, remetente_id, tipo, titulo, mensagem,
  assistido_id, processo_id, status, urgencia,
  created_at, updated_at
)
SELECT
  1 AS workspace_id,  -- todos os pareceres atuais são do workspace 1
  solicitante_id,
  'parecer',
  NULL,
  pergunta,
  assistido_id,
  processo_id,
  CASE
    WHEN status = 'respondido' AND data_resposta IS NOT NULL THEN 'respondido'
    WHEN status = 'lido' THEN 'concluido'
    ELSE 'pendente'
  END,
  urgencia,
  data_solicitacao,
  COALESCE(data_resposta, data_solicitacao)
FROM pareceres;

-- Migrar respostas como resposta da thread
INSERT INTO encaminhamento_respostas (encaminhamento_id, autor_id, mensagem, created_at)
SELECT e.id, p.respondedor_id, p.resposta, p.data_resposta
FROM pareceres p
JOIN encaminhamentos e ON e.created_at = p.data_solicitacao AND e.remetente_id = p.solicitante_id
WHERE p.resposta IS NOT NULL;

-- Migrar destinatários
INSERT INTO encaminhamento_destinatarios (encaminhamento_id, user_id, estado_pessoal)
SELECT e.id, p.respondedor_id,
  CASE WHEN p.status = 'lido' THEN 'ciente' ELSE 'pendente' END
FROM pareceres p
JOIN encaminhamentos e ON e.created_at = p.data_solicitacao AND e.remetente_id = p.solicitante_id;
```

Tabela `pareceres` fica por **60 dias em modo somente-leitura** após o cutover, depois `DROP`.
Página `/admin/pareceres` vira redirect para `/admin/cowork?tab=encaminhamentos&tipo=parecer`.

## API (tRPC)

### Router `encaminhamentos`

```ts
export const encaminhamentosRouter = router({
  // Listagem
  listar: protectedProcedure
    .input(z.object({
      filtro: z.enum(["recebidos", "enviados", "arquivados"]),
      tipo: z.enum(["transferir", "encaminhar", "acompanhar", "anotar", "parecer"]).optional(),
      cursor: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  obter: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => { /* ... */ }),

  contadores: protectedProcedure.query(async ({ ctx }) => {
    // Retorna { recebidosPendentes, aguardaAceite, pareceresPendentes, total }
    // Usado para badges no header e sidebar
  }),

  // Criação
  criar: protectedProcedure
    .input(z.object({
      tipo: z.enum(["transferir", "encaminhar", "acompanhar", "anotar", "parecer"]),
      titulo: z.string().optional(),
      mensagem: z.string().min(1),
      destinatarioIds: z.array(z.number()).min(1),
      demandaId: z.number().optional(),
      processoId: z.number().optional(),
      assistidoId: z.number().optional(),
      urgencia: z.enum(["normal", "urgente"]).default("normal"),
      notificarOmbuds: z.boolean().default(true),
      notificarWhatsapp: z.boolean().default(false),
      notificarEmail: z.boolean().default(false),
      anexos: z.array(z.object({
        tipo: z.enum(["audio", "drive", "upload"]),
        driveFileId: z.string().optional(),
        storageUrl: z.string().optional(),
        nome: z.string(),
        sizeBytes: z.number().optional(),
        duracaoSeg: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Validar regras por tipo (ex: Transferir aceita só 1 destinatário)
      // 2. Criar encaminhamento + destinatários + anexos em transação
      // 3. Disparar Inngest: notificação in-app, WhatsApp se marcado, email se marcado
      // 4. Log audit
      // 5. Retornar id
    }),

  // Transições de estado
  marcarCiente: protectedProcedure
    .input(z.object({ id: z.number() })).mutation(/* ... */),

  aceitar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Para Transferir: UPDATE demandas.defensor_id = ctx.user.id
      // Para Acompanhar: INSERT demandas_acompanhantes
      // Notifica remetente
    }),

  recusar: protectedProcedure
    .input(z.object({ id: z.number(), motivo: z.string().min(1) }))
    .mutation(/* ... */),

  responder: protectedProcedure
    .input(z.object({
      id: z.number(),
      mensagem: z.string().min(1),
      anexos: z.array(/* ... */).optional(),
    }))
    .mutation(/* ... */),

  marcarConcluido: protectedProcedure
    .input(z.object({ id: z.number() })).mutation(/* ... */),

  arquivar: protectedProcedure
    .input(z.object({ id: z.number() })).mutation(/* ... */),

  cancelar: protectedProcedure
    .input(z.object({ id: z.number() })).mutation(/* ... */),
});
```

### Eventos Inngest

```ts
"cowork/encaminhamento.criado": { /* trigger notificações */ }
"cowork/encaminhamento.transicao": { /* log + re-trigger reorder sheet se Transferir aceito */ }
```

## UI — Componentes

### Página `/admin/cowork`

Redesenho da página existente. Usa `CollapsiblePageHeader` padrão Defender v5:
- **Row 1:** ícone `Users`, título "Cowork", stats inline ("X encaminhamentos · Y pareceres · Z aguardando aceite"), botões icon-only (Filter, Bell, Settings) + primary "+ Novo".
- **Row 2:** 4 pills (Encaminhamentos | Pareceres | Mural | Coberturas), divider, busca.

### Componentes novos (em `src/components/cowork/encaminhamentos/`)

- `EncaminhamentosInbox.tsx` — grid 380px/1fr (inbox + detalhe). Mini-card list pattern com barra lateral colorida por tipo.
- `EncaminhamentoCard.tsx` — item da lista.
- `EncaminhamentoDetalhe.tsx` — painel direito com header, contexto, mensagem, anexos, ações, thread.
- `NovoEncaminhamentoModal.tsx` — modal de criação em bloco único com 5 seções (ver mockup).
- `TipoEncaminhamentoSelector.tsx` — 5 pills com hint contextual.
- `DestinatarioPicker.tsx` — combobox multi com avatares.
- `AnexoButton.tsx` — grava áudio via MediaRecorder API + picker do Drive.
- `NotificacaoToggles.tsx` — 3 toggles (OMBUDS, WhatsApp, Email) com defaults por tipo.

### Entry points adicionais

- **Card do Kanban** — menu de 3 pontos ganha item "Encaminhar" que abre `NovoEncaminhamentoModal` com contexto pré-preenchido.
- **Página do Processo / Assistido** — botão "Cowork" no header abre modal com contexto pré-preenchido.

### Badges no Kanban

- Card de demanda ganha badge discreto quando tem encaminhamento ativo:
  - `Anotar` (post-it) → ícone pequeno `StickyNote` no canto do card
  - `Acompanhar` (por outrem) → ícone `Eye` + tooltip "N defensores acompanhando"
  - Card duplicado em read-only no kanban do observador, com borda tracejada e badge "Acompanhando"

## Notificações

Integração com `evolution-api` para WhatsApp (já existe em `src/lib/services/evolution-api.ts`).

**Default por tipo:**

| Tipo | OMBUDS | WhatsApp | Email |
|------|--------|----------|-------|
| Transferir | ✓ | ✓ | — |
| Parecer | ✓ | ✓ | — |
| Encaminhar | ✓ | — | — |
| Anotar | ✓ | — | — |
| Acompanhar | ✓ | — | — |

**Configurável pelo usuário** em `/admin/settings/notificacoes`: para cada tipo, liga/desliga canal por default.

**Mensagem WhatsApp** (template):
```
🔔 {remetente} {tipo_acao} no OMBUDS:
"{titulo_ou_preview}"
👉 {url_curta}
```

## Permissões

- **Transferir:** apenas `defensor_id` atual da demanda ou admin. Outros podem "sugerir transferência" (cria encaminhamento pendente que o dono aprova).
- **Encaminhar, Acompanhar, Anotar, Parecer:** qualquer usuário do workspace pode criar para qualquer outro.
- **Ver conteúdo:** apenas remetente e destinatários (linha `encaminhamento_destinatarios`). Ninguém mais.
- **Admin:** vê tudo para fins de auditoria.

## Rollout Plan

### Fase 1 — Backend + Migração (sem UI nova)
1. Migração Drizzle das novas tabelas.
2. Router tRPC `encaminhamentos` com endpoints completos.
3. Inngest events e triggers de notificação.
4. Migração one-shot `pareceres → encaminhamentos` em modo dual-write (gravar em ambos por 7 dias para rollback possível).

### Fase 2 — UI Nova
5. Componentes de UI (inbox, modal, badges no kanban).
6. Aba "Encaminhamentos" na página Cowork (feature-flagged para `rodrigo@` primeiro).
7. Entry points no card do Kanban.

### Fase 3 — Consolidação
8. Retirar feature flag — libera para todo workspace.
9. Redirect `/admin/pareceres → /admin/cowork?tab=encaminhamentos&tipo=parecer`.
10. Após 60 dias sem bugs (alinhado com janela somente-leitura de `pareceres`), drop tabela `pareceres`.

### Fase 4 — Extensões (futuro, fora do MVP)
- Delegação a estagiário/servidor (integra `pedido-trabalho-modal.tsx` existente).
- Encaminhamento inter-workspace (requer redesign de permissão).
- Busca full-text em encaminhamentos.
- Resposta via WhatsApp (cliente responde direto, webhook Evolution traz pra thread).

## Open Questions

1. ~~"Acompanhar" read-only duplicado~~ — **Decidido:** tabela dedicada `demandas_acompanhantes` (ver modelo de dados acima).
2. **Frequência de notificações em Acompanhar** — toda alteração do card vira notificação? Ou só transições relevantes (status, prazo)? *Decisão proposta: só transições relevantes; configurável.*
3. **Retry de notificação WhatsApp quando Evolution está fora** — bloquear criação do encaminhamento se WhatsApp falhar? *Decisão proposta: não — cria mesmo assim, marca retry no Inngest com backoff 5min/15min/1h.*

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Migração `pareceres` perde dados | Dual-write 7 dias + backup pré-migração + teste em dev com snapshot de prod |
| Spam de notificações WhatsApp | Rate-limit por usuário (máx 20 msgs/h via Evolution); batch digest opcional |
| Confusão com Mural | Copy clara no UX: "Mural = avisos da equipe sem destinatário; Encaminhamento = mensagem direcionada" |
| Defensor recusa transferência por engano | Recusa exige justificativa (motivo obrigatório); pode ser revertida pelo remetente em 24h |
| Performance da inbox com muitos itens | Pagination cursor-based + índices; lazy-load anexos; cache de contadores por 30s |

## Métricas de Sucesso

- **Adoção:** ≥ 5 encaminhamentos criados/semana por defensor ativo em 30 dias.
- **Substituição de canais externos:** 2/3 dos defensores relatam redução de WhatsApp/email em pesquisa após 60 dias.
- **Transferências:** ≥ 80% das transferências têm decisão (aceite/recusa) em ≤ 48h.
- **Pareceres:** tempo médio de resposta ≤ 24h (manter ou melhorar o baseline do sistema atual).

## Referências

- Mockups: `.superpowers/brainstorm/71186-1776282140/content/inbox-cowork-v2.html`, `modal-create.html`
- Padrão Defender v5: `.claude/skills/padrao-defender/SKILL.md`
- Skill sync-planilha: `feedback_sync_planilha.md`, `feedback_import_dedup_priority.md`
- Esquema Cowork atual: `src/lib/db/schema/cowork.ts`
- Notificações: `src/lib/services/evolution-api.ts`, Inngest functions
