# Agenda — Anotações rápidas visíveis + Patrocínio (Defensoria × Particular)

**Data:** 2026-06-02
**Contexto:** OMBUDS / agenda — painel lateral de detalhe do evento (`EventDetailSheet`).

## Problema

No painel lateral da agenda (o "sheet"), o rodapé permite digitar uma **anotação rápida**
que é salva em `audiencias.anotacoesRapidas` (array JSONB), mas **nada exibe as notas de
volta** — a nota some após enviada.

Além disso, não há como registrar se o assistido naquele caso está **patrocinado pela
Defensoria Pública ou por advogado particular** (e qual). O schema de `processos` só
registra a parte/advogado **contrários** (`parteContraria`, `advogadoContrario`).

## Escopo

Duas features, ambas confinadas ao painel lateral da agenda + schema:

1. Exibir as anotações rápidas no painel, com opção de apagar.
2. Selecionar o tipo de patrocínio do processo (Defensoria × Particular) e o nome do
   advogado quando particular.

**Fora de escopo (YAGNI):** filtros/colunas na lista da agenda, badge no card do evento,
propagação para a planilha Google Sheets.

---

## Feature 1 — Exibir anotações rápidas no painel

### Dados
- Já existe `audiencias.anotacoesRapidas: jsonb` — `Array<{ texto: string; timestamp: string; autorId: number }>` (default `[]`).
- `addQuickNote` (em `src/lib/trpc/routers/audiencias.ts`) já grava no array e invalida
  `getAudienciaContext`.

### Backend
- `getAudienciaContext` passa a retornar `audiencia.anotacoesRapidas`.
- Para exibir o **nome do autor**, resolver `autorId → users.nome`. Implementação:
  o procedure já tem acesso a `users`; retornar um mapa `autoresById` (id → nome) cobrindo
  os `autorId` presentes nas notas, OU enriquecer cada nota com `autorNome`. Preferir
  enriquecer cada nota com `autorNome` no retorno (sem alterar o que é gravado no JSONB).
- Nova mutation `removeQuickNote`:
  - input: `{ audienciaId: number, timestamp: string }`
  - lê `anotacoesRapidas`, remove a entrada cujo `timestamp` bate, persiste o array filtrado,
    atualiza `updatedAt`. (timestamp ISO é único o suficiente como chave.)
  - retorna `{ removed: boolean }`.
- `useAudienciaStatusActions` ganha `removeNote` (mutation com toast + invalidate igual aos demais).

### UI (`event-detail-sheet.tsx`)
- Nova `CollapsibleSection id="anotacoes-rapidas" label="Anotações rápidas"` com `count`,
  posicionada **logo após "Resumo Executivo"**, `defaultOpen`.
- Lista ordenada **mais recente primeiro** (`timestamp` desc).
- Cada item exibe: `texto`, `autorNome`, timestamp relativo (ex.: "há 2h"; usar o helper de
  tempo relativo já existente no projeto, ou `Intl`/date-fns conforme o padrão da base).
- Ícone de lixeira no hover → chama `removeNote.mutate({ audienciaId, timestamp })`.
- Quando vazia: `EmptyHint` ("Nenhuma anotação ainda").
- Adicionar/remover refletem na hora (invalidate de `getAudienciaContext`).

---

## Feature 2 — Patrocínio: Defensoria × Advogado particular

Escopo: **por processo** (vale para todas as audiências daquele processo; também útil na
página do processo no futuro).

### Schema (`src/lib/db/schema/core.ts`, tabela `processos`)
- `tipoPatrocinio` varchar(20) NOT NULL default `'DEFENSORIA'` — valores `DEFENSORIA | PARTICULAR`.
- `advogadoParticular` text NULL — preenchido só quando `PARTICULAR`.
- Migração drizzle (`npm run db:generate`) + `npm run db:push`.

### Backend
- `getAudienciaContext` retorna `processo.tipoPatrocinio` e `processo.advogadoParticular`.
- Nova mutation em `processos` router: `setPatrocinio`
  - input: `{ processoId: number, tipoPatrocinio: "DEFENSORIA" | "PARTICULAR", advogadoParticular?: string | null }`
  - regra: se `tipoPatrocinio === "DEFENSORIA"`, gravar `advogadoParticular = null`.
  - atualiza `updatedAt`; retorna a linha atualizada.
- Hook/uso no painel invalida `getAudienciaContext` após salvar.

### UI (`event-detail-sheet.tsx`, zona de metadados do processo, perto do nº dos autos)
- Toggle segmentado **Defensoria | Particular** (componente existente de toggle/segmented;
  fallback: dois botões com estado ativo).
- Ao selecionar **Particular**, exibir input "Nome do advogado".
- Persistir ao trocar o toggle e ao sair (blur) do input.
- Quando `PARTICULAR`, mostrar badge discreto no header: "⚖ Particular — {advogadoParticular}".
  Quando Defensoria, sem badge (estado padrão).

---

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `src/lib/db/schema/core.ts` | +`tipoPatrocinio`, +`advogadoParticular` em `processos` |
| `drizzle/` (nova migração) | colunas novas |
| `src/lib/trpc/routers/audiencias.ts` | `getAudienciaContext` retorna `anotacoesRapidas` (enriquecido c/ `autorNome`) + `processo.tipoPatrocinio`/`advogadoParticular`; nova `removeQuickNote` |
| `src/lib/trpc/routers/processos.ts` | nova `setPatrocinio` |
| `src/hooks/use-audiencia-status-actions.ts` | +`removeNote` |
| `src/components/agenda/event-detail-sheet.tsx` | nova seção "Anotações rápidas"; controle de patrocínio + badge |
| `__tests__/` | testes unitários das mutations novas (removeQuickNote, setPatrocinio) |

## Critérios de aceite

1. Ao enviar uma anotação rápida, ela aparece imediatamente na seção "Anotações rápidas"
   do painel, com autor e horário relativo, mais recente no topo.
2. Apagar uma anotação a remove do painel e do banco imediatamente.
3. O toggle de patrocínio salva no processo; ao reabrir o painel o estado persiste.
4. Selecionar "Particular" exige/permite informar o nome do advogado; selecionar
   "Defensoria" limpa o nome do advogado.
5. Badge "Particular — {advogado}" visível no header quando aplicável.
6. Nenhuma regressão no carregamento do painel (mesmo `getAudienciaContext`).
