# Atendimentos na Agenda — Design

**Data:** 2026-05-26
**Branch:** `feat/atendimentos-agenda`
**Status:** Aprovado (design) — aguardando spec review

## Problema

A agenda do OMBUDS (`src/app/(dashboard)/admin/agenda/page.tsx`) mescla hoje apenas
duas fontes: `audiencias` + `calendar_events`. Os **atendimentos** — que já existem
como dado na tabela `registros` (ex-`atendimentos`, renomeada em 2026-04-29), com todo
o aparato de áudio/Plaud/transcrição/enrichment — **não aparecem na timeline**.

Pior: quando o usuário cria um "atendimento" pelo botão `+` da agenda, ele grava um
`calendar_events` burro (`eventType="atendimento"`), divorciado da tabela `registros`.
O `+` da agenda e a funcionalidade real de atendimentos vivem separados.

O objetivo é integrar atendimentos à agenda, com **marcação visual distinta** das
audiências, e religar o `+` da agenda à funcionalidade real de atendimentos.

## Decisões fechadas (brainstorming)

1. **Origem do dado:** OMBUDS é a fonte da verdade. Sem scraper reverso do SOLAR. O
   sync de saída que já existe (`solar-sync-config.ts` / `protocolarNoSolar`) continua
   cuidando do registro institucional no SOLAR.
2. **Escopo:** apenas atendimentos **agendados/futuros** (`status='agendado'`) entram na
   agenda — vira ferramenta de planejamento do dia. Atendimentos realizados ficam na
   ficha do assistido/processo, não poluem o calendário.
3. **Marcação:** a **cor** continua codificando a área (Júri=emerald, VVD=amber,
   EP=blue, Criminal=slate); a **forma** distingue a natureza (audiência = preenchido +
   barra sólida + `Gavel`; atendimento = vazado + barra tracejada + `Users`).
4. **Interação:** agendar + operar pela agenda. O `+` ganha o tipo "Atendimento"
   (grava em `registros`); "marcar como realizado" transiciona o status e conecta ao
   fluxo de áudio/transcrição/enrichment existente.

## Arquitetura

**Abordagem escolhida: terceira fonte na agregação client-side que já existe.**

Alternativas avaliadas e rejeitadas:

- **Endpoint unificado server-side** (`agenda.feed` mesclando as três tabelas). É a
  arquitetura "certa" no longo prazo, mas é refactor maior na agregação que já funciona.
  Fica registrado como evolução futura, fora do escopo agora.
- **Espelhar atendimento como `calendar_events`** (mirror row). Rejeitado: recria o
  problema de dupla-fonte que evitamos ao não puxar do SOLAR.

## Modelo de dados — sem migration

Reusa `registros` (`src/lib/db/schema/agenda.ts`). Nenhuma coluna nova. A semântica está
no ciclo de vida do `status`:

```
agendado  → aparece na agenda
realizado → sai da agenda, dispara fluxo de áudio/transcrição
cancelado → sai da agenda
```

A **área** (e portanto a cor) é derivada do vínculo opcional `processoId/casoId/demandaId`.
Atendimento sem processo vinculado → cor **neutra (zinc)**.

## Componentes e mudanças

### 1. Leitura — nova procedure `registros.listAgendados`

`src/lib/trpc/routers/registros.ts`. Escopo de defensor análogo ao do router `calendar`
(`getCalendarDefensorFilter`), mas via `registros.autorId` (+ parceiros de comarca via
`getParceirosIds`). Filtra `tipo='atendimento' AND status='agendado'` na faixa de datas
do mês visível. Retorna o registro + dados do processo/assistido vinculados (para derivar
área e exibir nomes).

```ts
listAgendados: protectedProcedure
  .input(z.object({ from: z.string(), to: z.string() }))
  .query(async ({ ctx, input }) => { /* defensor scope + tipo/status/date range */ })
```

### 2. Agregação — terceiro loop em `eventos` useMemo

`src/app/(dashboard)/admin/agenda/page.tsx` (~linha 758).

- Estender a união: `fonte?: "audiencias" | "calendar" | "registros"`.
- Adicionar `const { data: registrosData } = trpc.registros.listAgendados.useQuery({ from, to })`.
- Terceiro loop monta `AgendaItem` com `fonte:"registros"`, `tipo:"atendimento"`, deriva
  `atribuicaoKey` do processo vinculado via `mapAtribuicaoToKey` (fallback neutro quando
  sem processo), `rawId = registro.id`, `id = "registro-${id}"`.
- Incluir `registrosData` nas deps do `useMemo`.

### 3. Criação — ramificar `handleSaveNewEvento`

`src/app/(dashboard)/admin/agenda/page.tsx` (~linha 929). Hoje todo evento vai para
`createCalendarEvent`. Passa a ramificar:

```ts
if (eventoData.tipo === "atendimento") {
  await criarAtendimentoAgendado.mutateAsync({   // registros.create
    assistidoId, processoId,
    dataRegistro: buildIso(data, horarioInicio),
    tipo: "atendimento", status: "agendado",
    local, assunto: titulo, ...
  });
} else {
  await createCalendarEvent.mutateAsync({ ... });  // fluxo atual
}
```

Invalidar `registros.listAgendados` no `onSuccess`. (`registros.create` já existe e aceita
`dataRegistro`/`status`/vínculos; usar como está ou expor um alias fino `agendar`.)

### 4. Transição "marcar como realizado"

No card/sheet do item `fonte:"registros"`, ação **"Marcar como realizado"** →
`registros.update { status: "realizado" }`. Some da agenda na próxima invalidação e cai no
fluxo existente (`registro-completo-sheet`, vínculo Plaud, transcrição, enrichment). Sem
reinventar nada.

### 5. Renderização da marcação visual

Componente do card de evento da agenda (timeline/dia + month/week views):

- **Audiência** (`fonte` audiencias/calendar tipo audiência): cartão preenchido, barra
  lateral **sólida** na cor da área, ícone `Gavel`.
- **Atendimento** (`fonte:"registros"`): cartão **vazado** (fundo translúcido / `bg-*/10`),
  barra lateral **tracejada** (`border-l-2 border-dashed`), ícone `Users`.
- **Mês/semana (chips pequenos):** como o tracejado some em tamanho mínimo, atendimento
  ganha um **ponto/anel** com ícone `Users` no chip; cor segue a área.

Padrão Defender: ícones Lucide (`Gavel`, `Users`), sem emoji; `cursor-pointer`, hover com
transição suave; contraste WCAG AA mantido nos fundos translúcidos.

## Fora de escopo (YAGNI)

- Scraper de entrada do SOLAR.
- Atendimentos passados/realizados na agenda (ficam na ficha).
- Sync bidirecional — o push pro SOLAR existente cobre o registro institucional.
- Endpoint unificado `agenda.feed` (evolução futura).

## Testing

- **Unit:** `registros.listAgendados` — escopo de defensor (autor + parceiros), filtro
  `tipo/status`, faixa de datas inclusiva/exclusiva nas bordas.
- **Unit:** derivação de `atribuicaoKey`/cor a partir do processo vinculado e fallback
  neutro sem processo.
- **Unit:** ramificação de `handleSaveNewEvento` — `tipo==='atendimento'` grava em
  `registros` (não em `calendar_events`).
- **Integração/manual:** agendar atendimento pelo `+` → aparece na timeline com marcação
  tracejada/`Users` → "marcar como realizado" → some da agenda e abre o fluxo de áudio.
- **Visual:** marcação legível em timeline, mês e semana; chip de mês distinguível.

## Arquivos afetados (estimativa)

| Arquivo | Mudança |
|---|---|
| `src/lib/trpc/routers/registros.ts` | nova procedure `listAgendados` (+ talvez alias `agendar`) |
| `src/app/(dashboard)/admin/agenda/page.tsx` | união `fonte`, query, 3º loop, ramificação do create, ação "realizar" |
| componente de card/chip da agenda | tratamento visual tracejado/vazado + ícone `Users` |
| testes em `__tests__/` | cobertura das procedures e da ramificação |
