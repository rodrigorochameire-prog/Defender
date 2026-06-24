# Design — Bridge WhatsApp → Atendimento

> Registrar uma interação de WhatsApp como atendimento (`registros`).
> Data: 2026-06-23 · Status: proposta (aguarda decisão)

## TL;DR

A integração WhatsApp **já existe e é madura** — não há provider novo a decidir. O gap
é estreito: hoje uma mensagem pode virar *anotação/documento de processo*, mas **não vira
atendimento** (`registros`, `tipo='atendimento'`). Este doc projeta esse elo.

## O que já existe (não construir de novo)

| Camada | Estado |
|---|---|
| Provider | **Evolution API** (self-hosted, chat bidirecional, conexão por QR) + **Meta Cloud API** (notificações de saída) |
| Webhook inbound | `src/app/api/webhooks/evolution/route.ts` — ingere `MESSAGES_UPSERT`, faz upsert de contato, grava em `whatsappChatMessages`, dispara enrichment de urgência |
| Schema | `comunicacao.ts` — `whatsappContacts` (com `assistidoId` FK + `contactRelation`), `whatsappChatMessages` (direction in/out, type, content, media), `whatsappMessageActions` (target genérico: processo/demanda/assistido) |
| Vínculo a assistido | Página `/admin/whatsapp/vincular` + `whatsappChat.linkToAssistido` (sugere por telefone) |
| Contexto no chat | `ContextPanelProcesso` (próxima audiência, prazo aberto), `ContactDetailsPanel` (assistido, processos, stats) |
| Ações de mensagem | `saveMessageToProcess` (anotação/documento/evidência), `createNoteFromMessage`, `saveToCase` (lote), `generateSummary` (IA), `extractData` (endereços/telefones/datas/testemunhas) |

**Conclusão:** o telefone→assistido→processo já está resolvido. Falta só materializar o
atendimento.

## O gap

Não há FK de `whatsappChatMessages`/`whatsappContacts` para `registros`, nem procedure
`createAtendimentoFromMessage`. Nenhuma das ~50 procedures do `whatsapp-chat.ts` cria
`registros`.

## Proposta

### Decisão de modelagem: provenance via coluna (consistente com a Fase 3)

Adicionar a `registros` colunas de origem: `origemCanal` (varchar, ex.: `whatsapp`) +
`origemWhatsappContactId` (integer → whatsappContacts). Consultável/indexável — alimenta o
corte "por canal" no painel de Insights. Espelha o padrão de proveniência já usado nos
ofícios/diligências (`registro_id`).

### Fluxo "Registrar como atendimento"

Nova procedure `whatsappChat.registrarAtendimento`:

```
input: { contactId, messageIds?: number[], dataRegistro?, area?, subtipo?, gerarResumoIA? }
```

1. Resolve contato → exige `assistidoId` vinculado (senão, abre o fluxo `vincular` antes).
2. Monta `conteudo`:
   - se `messageIds` → concatena as mensagens selecionadas (autor + timestamp);
   - se `gerarResumoIA` → reusa `generateSummary` (fatos/pedidos) como `conteudo` + guarda bruto em `enrichmentData`.
3. Insere em `registros`:
   - `tipo='atendimento'`, `subtipo` (default `inicial`), `area`,
   - `assistidoId`/`processoId` do contato,
   - `interlocutor` ← `contactRelation` (proprio→assistido, familiar→familiar, …),
   - `dataRegistro` ← timestamp da última msg (ou `now`),
   - `status='realizado'`, `local='WhatsApp'`, `autorId=ctx.user`,
   - `origemCanal='whatsapp'`, `origemWhatsappContactId`.
4. Reusa `autoVincularAtendimentoADemandas` (já existe) → o atendimento aparece na timeline
   das demandas abertas do processo. **Ganho grátis**: zero código novo de vínculo.

### Superfícies de UI (reuso)

- **No chat** (`MessageActionModals` / `SelectionActionModals`): novo item "Registrar
  atendimento" ao lado de "Salvar no processo". Modal mínimo: área, subtipo, toggle "resumir
  com IA", data.
- **Slash command** `/atendimento` no `SlashCommandMenu`.
- **No atendimento** (detail sheet): quando `origemWhatsappContactId` presente, chip "via
  WhatsApp" + link para a conversa.

### Insights (liga na Fase 2)

Com a coluna de origem, `atendimentosInsights` ganha um corte "por canal" (presencial vs
WhatsApp) sem custo.

## Não-objetivos (YAGNI)

- Auto-registrar **toda** mensagem como atendimento (ruído; o registro é ato deliberado do defensor).
- Bot/auto-resposta.
- Migrar o provider ou tocar no webhook/ingestão (já funciona).

## Riscos

| Risco | Mitigação |
|---|---|
| Contato sem assistido vinculado | Gate: exige vínculo antes de registrar (reusa `vincular`) |
| Duplicar atendimento da mesma conversa | `origemWhatsappContactId` permite checar/avisar "já registrado em DD/MM" |
| Conteúdo sensível em `conteudo` | Mesma superfície de segurança dos `registros` atuais (RLS já cobre) |

## Esforço estimado

Migração (2 colunas + índice) XS · `registrarAtendimento` S (reusa summary + autoVínculo) ·
Modal + slash command + chip no sheet M. **Total: ~1 frente pequena.**

## Decisões pendentes (para o usuário)

1. Resumo IA **on por padrão** ou opt-in no modal?
2. `status` do atendimento WhatsApp = sempre `realizado`, ou permitir `agendado` (ex.: marcar retorno)?
