# Cronologia · Fase IV-A · Fundação Silenciosa — Design

**Data:** 2026-04-20
**Fase:** IV-A (fundação silenciosa de Cronologia Processual + Prisões/Cautelares)
**Depende de:** nada crítico (independente)
**Habilita:** IV-B (timeline visual + flags + badge prisional + integração sheet agenda)
**Esforço estimado:** 3-4 dias

---

## Visão

Fase IV é a **transformação temporal** — o processo deixa de ser foto e vira filme. Transforma prosa livre em marcos tipados (timeline) + estado prisional estruturado + cautelares vigentes. IV-A entrega a coleta silenciosa (schema + forms + backfill one-shot); IV-B traz timeline visual, flags e badge "preso há X dias".

Diferente das fases anteriores (Pessoas/Lugares = Camada 1 entidades cruzáveis), Fase IV é **Camada 2 atributos estruturados**: blocos tipados por processo, sem catálogo global, sem participações N:N, sem merge-queue.

## Princípios (herdados do Mapa Mestre)

1. **Coleta silenciosa antes de apresentação** — IV-A só colhe/estrutura; IV-B liga timeline + flags.
2. **Ausência comunica** — processo sem marcos = timeline vazia, sem tentar esconder lacunas.
3. **Confidence explícita** — entradas via backfill-IA recebem `confidence=0.7`; manuais `0.9+`.
4. **Threshold rigoroso** — nenhum flag em IV-A. Lista seca.

## Arquitetura

Três tabelas normalizadas ligadas a `processos` por FK + `ON DELETE CASCADE`:

- `marcos_processuais` — linha por evento temporal (fato, APF, denúncia, sentença, etc)
- `prisoes` — linha por episódio prisional (flagrante/preventiva/temporária/sentença)
- `cautelares` — linha por medida cautelar (monitoramento, contato, afastamento, etc)

Workspace ACL via **join em `processos`** (tabelas não denormalizam `workspace_id`). Autorização em cada create/update/delete valida que o `processoId` alvo pertence ao `ctx.user.workspaceId`.

**Não toca:**
- Sheet da agenda (IV-B)
- Modal de registro de audiência (IV-B+)
- Colunas legadas `processos.reu_preso`, `data_prisao`, `data_sentenca` (IV-B decide sync)
- Páginas de mapa, catálogo Pessoas/Lugares

---

## Schema

Migration SQL (próximo número sequencial — `0038_cronologia_fundacao.sql`):

```sql
-- Enums

CREATE TYPE marco_tipo AS ENUM (
  'fato',
  'apf',
  'audiencia-custodia',
  'denuncia',
  'recebimento-denuncia',
  'resposta-acusacao',
  'aij-designada',
  'aij-realizada',
  'memoriais',
  'sentenca',
  'recurso-interposto',
  'acordao-recurso',
  'transito-julgado',
  'execucao-inicio',
  'outro'
);

CREATE TYPE prisao_tipo AS ENUM (
  'flagrante',
  'temporaria',
  'preventiva',
  'decorrente-sentenca',
  'outro'
);

CREATE TYPE prisao_situacao AS ENUM (
  'ativa',
  'relaxada',
  'revogada',
  'extinta',
  'cumprida',
  'convertida-em-preventiva'
);

CREATE TYPE cautelar_tipo AS ENUM (
  'monitoramento-eletronico',
  'comparecimento-periodico',
  'recolhimento-noturno',
  'proibicao-contato',
  'proibicao-frequentar',
  'afastamento-lar',
  'fianca',
  'suspensao-porte-arma',
  'suspensao-habilitacao',
  'outro'
);

CREATE TYPE cautelar_status AS ENUM (
  'ativa',
  'cumprida',
  'descumprida',
  'revogada',
  'extinta'
);

-- Tables

CREATE TABLE marcos_processuais (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  tipo                     marco_tipo NOT NULL,
  data                     date NOT NULL,
  documento_referencia     text,
  observacoes              text,
  fonte                    varchar(30) NOT NULL,
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX marcos_processuais_processo ON marcos_processuais(processo_id);
CREATE INDEX marcos_processuais_data ON marcos_processuais(data);
CREATE INDEX marcos_processuais_tipo ON marcos_processuais(tipo);

CREATE TABLE prisoes (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  pessoa_id                int REFERENCES pessoas(id),
  tipo                     prisao_tipo NOT NULL,
  data_inicio              date NOT NULL,
  data_fim                 date,
  motivo                   text,
  unidade                  varchar(200),
  situacao                 prisao_situacao NOT NULL DEFAULT 'ativa',
  fonte                    varchar(30) NOT NULL,
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX prisoes_processo ON prisoes(processo_id);
CREATE INDEX prisoes_pessoa ON prisoes(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX prisoes_situacao ON prisoes(situacao);

CREATE TABLE cautelares (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  pessoa_id                int REFERENCES pessoas(id),
  tipo                     cautelar_tipo NOT NULL,
  data_inicio              date NOT NULL,
  data_fim                 date,
  detalhes                 text,
  status                   cautelar_status NOT NULL DEFAULT 'ativa',
  fonte                    varchar(30) NOT NULL,
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX cautelares_processo ON cautelares(processo_id);
CREATE INDEX cautelares_pessoa ON cautelares(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX cautelares_status ON cautelares(status);
```

**Decisões explicadas:**

- `ON DELETE CASCADE` — se processo é deletado, cronologia vai junto (atributo por natureza).
- `pessoa_id` opcional — default é o assistido principal do processo; FK explícita só quando precisa desambiguar (co-réu preso, cautelar sobre pessoa não-assistido).
- `fonte` + `confidence` — distingue backfill-IA (`0.7`) de entrada manual (`0.9+`).
- `unidade` em `prisoes` como texto livre — catálogo de unidades prisionais é escopo de Fase IX.
- Enum `prisao_situacao` inclui `convertida-em-preventiva` pra modelar fluxo comum flagrante → preventiva (linha original recebe data_fim e essa situação; nova linha preventiva é criada).

---

## Backfill one-shot

Script `scripts/backfill-cronologia.mjs`, idempotente, `--dry-run`.

**Fonte:** `atendimentos.enrichment_data` (jsonb) de processos que já passaram pela pipeline de análise IA. Best effort, tolerante a variações de schema.

### Pipeline

```
1. Seleciona atendimentos com enrichment_data não-vazio + processo_id
2. Pra cada atendimento, aplica 3 readers:
   - Reader A → marcos_processuais
   - Reader B → prisoes
   - Reader C → cautelares
3. Cada insert via ON CONFLICT DO NOTHING (idempotência)
```

### Reader A — Marcos

Caminhos heurísticos (tenta vários, pega o primeiro que tem dado):

```
enrichment_data.cronologia[]              → array {tipo, data, ...}
enrichment_data.linha_tempo[]             → idem
enrichment_data.marcos[]                  → idem
enrichment_data.timeline[]                → idem
```

Se arrays não existem, tenta campos esparsos:

| Campo no enrichment_data | Marco tipo |
|---|---|
| `data_fato` / `dataFato` / `fato_data` | `fato` |
| `data_apf` / `data_flagrante` | `apf` |
| `data_audiencia_custodia` | `audiencia-custodia` |
| `data_denuncia` / `dataDenuncia` | `denuncia` |
| `data_recebimento_denuncia` | `recebimento-denuncia` |
| `data_resposta_acusacao` | `resposta-acusacao` |
| `data_aij` / `data_audiencia_instrucao` | `aij-designada` |
| `data_memoriais` | `memoriais` |
| `data_sentenca` / `dataSentenca` | `sentenca` |
| `data_acordao` | `acordao-recurso` |
| `data_transito_julgado` / `dataTransito` | `transito-julgado` |

**Idempotência:** insert com `ON CONFLICT DO NOTHING` implícito via constraint lógica: não há UNIQUE porque múltiplos marcos do mesmo tipo podem existir (ex: 2 AIJs designadas). Idempotência via filtro prévio `SELECT WHERE processo_id=? AND tipo=? AND data=? AND fonte='backfill-ia'` antes de inserir. Conta como "existente" se match.

### Reader B — Prisões

```
enrichment_data.prisoes[]                 → array {tipo, data_inicio, ...}
enrichment_data.situacao_prisional        → objeto simples
```

Campos esparsos:

| Campo no enrichment_data | Prisão |
|---|---|
| `esta_preso` + `data_prisao` | `preventiva` / `ativa` |
| `data_flagrante` + `data_soltura?` | `flagrante` com data_fim |
| `data_prisao_preventiva` | `preventiva` |
| `unidade_prisional` / `unidade` | → `unidade` |

Idempotência: filtro `(processo_id, tipo, data_inicio, fonte='backfill-ia')` antes de insert.

### Reader C — Cautelares

```
enrichment_data.cautelares[]              → array direto
enrichment_data.medidas_cautelares[]      → idem
```

Campos esparsos:

| Campo | Cautelar |
|---|---|
| `tem_tornozeleira` | `monitoramento-eletronico` ativa |
| `mpu_ativa` / `medida_protetiva_ativa` | `proibicao-contato` ativa |
| `afastamento_lar_ativo` | `afastamento-lar` ativa |
| `fianca_paga` + `data_fianca` | `fianca` cumprida |

Idempotência: filtro `(processo_id, tipo, data_inicio, fonte='backfill-ia')`.

### Robustez

- **Parser de datas tolerante**: aceita ISO, BR `DD/MM/YYYY`, string parseable via `new Date()`. Data inválida → warning, skip.
- **Enum inválido**: skip + warning (não explode).
- **Confidence**: todo insert via backfill recebe `confidence=0.7` (vs `0.9` default manual).

### Counters

```
atendimentos processados:       N
marcos criados:                 N
marcos existentes:              N
prisões criadas:                N
prisões existentes:             N
cautelares criadas:             N
cautelares existentes:          N
warnings (data inválida):       N
warnings (enum inválido):       N
```

---

## tRPC router

`src/lib/trpc/routers/cronologia.ts`. Registrado como `cronologia` em `src/lib/trpc/routers/index.ts` (appRouter barrel).

Todas as procedures:
- São `protectedProcedure`
- Acessam `ctx.user.workspaceId ?? 1`
- Validam ACL via join em `processos` antes de mutação (ou fetch por processoId no query)

### Marcos

| Procedure | Input | Output |
|---|---|---|
| `listMarcos` | `{ processoId }` | marcos ordenados por `data` asc |
| `createMarco` | `{ processoId, tipo, data, documentoReferencia?, observacoes? }` | `{ id }` |
| `updateMarco` | `{ id, patch }` | `{ id, updated }` |
| `deleteMarco` | `{ id }` | `{ deleted }` |

### Prisões

| Procedure | Input | Output |
|---|---|---|
| `listPrisoes` | `{ processoId }` | prisões por `data_inicio` desc |
| `createPrisao` | `{ processoId, pessoaId?, tipo, dataInicio, dataFim?, motivo?, unidade?, situacao? }` | `{ id }` |
| `updatePrisao` | `{ id, patch }` | `{ id, updated }` |
| `deletePrisao` | `{ id }` | `{ deleted }` |

### Cautelares

| Procedure | Input | Output |
|---|---|---|
| `listCautelares` | `{ processoId }` | cautelares por `data_inicio` desc |
| `createCautelar` | `{ processoId, pessoaId?, tipo, dataInicio, dataFim?, detalhes?, status? }` | `{ id }` |
| `updateCautelar` | `{ id, patch }` | `{ id, updated }` |
| `deleteCautelar` | `{ id }` | `{ deleted }` |

### Agregado

| Procedure | Input | Output |
|---|---|---|
| `getCronologiaCompleta` | `{ processoId }` | `{ marcos, prisoes, cautelares }` — 3 selects em paralelo, evita 3 roundtrips do client |

### Autorização (pattern)

Para mutações que recebem `processoId`:

```ts
const [proc] = await db.select({ id: processos.id })
  .from(processos)
  .where(and(eq(processos.id, input.processoId), eq(processos.workspaceId, ctx.user.workspaceId ?? 1)))
  .limit(1);
if (!proc) throw new Error("Processo não encontrado");
```

Para updates/deletes que recebem só `id`:

```ts
const [row] = await db.select({ id: marcosProcessuais.id })
  .from(marcosProcessuais)
  .innerJoin(processos, eq(processos.id, marcosProcessuais.processoId))
  .where(and(
    eq(marcosProcessuais.id, input.id),
    eq(processos.workspaceId, ctx.user.workspaceId ?? 1),
  ))
  .limit(1);
if (!row) throw new Error("Marco não encontrado");
```

---

## UI

Nova aba **"Cronologia"** em `/admin/processos/[id]`, seguindo o padrão da aba "Pessoas" (I-B).

### Componentes (`src/app/(dashboard)/admin/processos/[id]/_components/`)

- `cronologia-tab.tsx` — root. Chama `trpc.cronologia.getCronologiaCompleta`. Renderiza 3 sub-seções colapsáveis (default todas abertas).
- `marcos-block.tsx` — lista + botão `[+ Novo]` + form inline expansível + linhas com `⋯` (editar/deletar)
- `prisoes-block.tsx` — mesmo padrão
- `cautelares-block.tsx` — mesmo padrão
- `marco-form.tsx` / `prisao-form.tsx` / `cautelar-form.tsx` — forms inline (não modal, não página nova)

### Layout referência

```
┌─────────────────────────────────────────────────────┐
│  [tabs: Geral · Pessoas · Cronologia · Drive · …]   │
├─────────────────────────────────────────────────────┤
│  Cronologia                                          │
│                                                      │
│  ▼ Marcos (5)                              [+ Novo] │
│    15/01/2025 · Fato                          ⋯    │
│    20/03/2025 · APF                           ⋯    │
│    22/03/2025 · Audiência de custódia         ⋯    │
│    14/05/2025 · Denúncia                      ⋯    │
│    20/08/2025 · Recebimento denúncia          ⋯    │
│                                                      │
│  ▼ Prisões (1)                             [+ Novo] │
│    20/03/2025 — hoje · Preventiva             ⋯    │
│    Conjunto Penal · Ativa                           │
│                                                      │
│  ▼ Cautelares (0)                          [+ Novo] │
│    Nenhuma.                                         │
└─────────────────────────────────────────────────────┘
```

### Comportamento

- `[+ Novo]` abre form inline abaixo do header do bloco
- Cada linha tem menu `⋯` com **Editar** e **Deletar**
- Edit → form inline aparece em modo edit na linha
- Delete → confirmação via `AlertDialog` Radix (mesmo padrão que pessoas/lugares usam)
- Campos obrigatórios: `tipo` + `data`/`data_inicio`
- Date inputs HTML5 nativos (`<input type="date">`) — sem datepicker custom
- `pessoaId` em prisões/cautelares vem de dropdown listando pessoas já participantes do processo (`trpc.pessoas.getParticipacoesDoProcesso`). Default: null (= assistido principal)

### Integração com `ProcessoTabs`

1. Adicionar `"cronologia"` em `MainTab` union type
2. Importar ícone `Clock` de lucide-react
3. `BASE_TABS`: nova entry `{ key: "cronologia", label: "Cronologia", icon: Clock }` após `"pessoas"`, antes de `"drive"`
4. Em `page.tsx`: `{tab === "cronologia" && <CronologiaTab processoId={data.id} />}`

---

## Testes (~30)

### Unit (`__tests__/unit/`)

- `backfill-cronologia-readers.test.ts` (10 testes):
  - `readMarcos` com `enrichment_data.cronologia[]` válido → array
  - `readMarcos` com campos esparsos (`data_fato`, `data_denuncia`) → múltiplos marcos
  - Data inválida BR/ISO/garbage → skipped + warning
  - Enum inválido → skipped + warning
  - Idempotência simulada: re-rodar mesma fonte = 0 novos
  - `readPrisoes` e `readCautelares` análogos

### tRPC (`__tests__/trpc/cronologia-router.test.ts`, ~14 testes):

- create/list/update/delete para cada bloco (marcos/prisoes/cautelares) = 12 testes
- `getCronologiaCompleta` retorna 3 listas coerentes em uma chamada
- ACL: processo de workspace diferente → 404/"não encontrado"

### Componentes (`__tests__/components/cronologia/`, ~5 testes):

- `marcos-block.test.tsx`:
  - Renderiza lista com mock trpc
  - Click `[+ Novo]` abre form
  - Submit form chama mutation
- `cronologia-tab.test.tsx`:
  - Renderiza 3 sub-seções com counts
  - Seção vazia mostra "Nenhum(a). [+ Novo]"

### Scripts (`__tests__/scripts/backfill-cronologia.test.ts`, ~2 testes)

- Fixture com 3 enrichment_data variadas → verifica insert counts
- Re-run → counters de "existentes" altos, "criados" zero

---

## LGPD

- **ACL via workspace join** — cada mutação valida `processos.workspace_id = ctx.user.workspaceId`
- **Sem audit log dedicado em IV-A** — dados de processo já são sensíveis mas não mais sensíveis que o resto; o padrão é consistente com outras tabelas filhas de processos. Audit log de flags calculados entra em IV-B se flag expor dado prisional a usuário externo ao caso
- **`pessoa_id` opcional** — quando presente, vincula a pessoa específica (permite filtro futuro por pessoa, mas em IV-A nenhuma UI explora isso)

---

## Entregáveis

1. `drizzle/0038_cronologia_fundacao.sql` — 3 tabelas + 4 enums + indexes
2. `src/lib/db/schema/cronologia.ts` — schema TS Drizzle + barrel re-export no `index.ts`
3. `src/lib/cronologia/readers.ts` — parser de enrichment_data (puro, testável)
4. `src/lib/trpc/routers/cronologia.ts` — 13 procedures + registrado em appRouter
5. `scripts/backfill-cronologia.mjs` — idempotente, --dry-run
6. `src/app/(dashboard)/admin/processos/[id]/_components/cronologia-tab.tsx` + 3 blocks + 3 forms
7. `src/components/processo/processo-tabs.tsx` modificado (nova aba)
8. `src/app/(dashboard)/admin/processos/[id]/page.tsx` modificado (render da aba)
9. ~30 testes
10. Commit docs: spec + plan

## Fora de escopo (IV-B ou depois)

- Timeline visual horizontal (componente `ProcessoTimeline`)
- Flags: excesso de prazo preventiva (STJ); flagrante sem audiência de custódia em 24h; cautelar descumprida sem incidente; prescrição intercorrente
- Badge "preso há X dias"
- Bloco "Situação prisional" no sheet da agenda
- Bloco cronologia no sheet da agenda ou modal de registro
- Sync bidirecional com colunas legadas (`processos.reu_preso`, `data_prisao`, `data_sentenca`)
- Pipeline live auto-extract (IA roda em cada novo atendimento)
- Anonimização/retenção LGPD avançada
- Export PDF da cronologia
