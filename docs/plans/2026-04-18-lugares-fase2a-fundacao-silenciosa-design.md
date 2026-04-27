# Lugares · Fase II-A · Fundação Silenciosa — Design

**Data:** 2026-04-18
**Fase:** II-A (fundação silenciosa de Lugares)
**Depende de:** I-A (padrão arquitetural Pessoas)
**Habilita:** II-B (apresentação: flags + mini-mapa + sinalização)
**Esforço estimado:** 3-4 dias

---

## Visão

Transformar os endereços hoje dispersos em 6 tabelas (`processos.local_do_fato_*`, `processos.vvd_agressor_*`, `assistidos.endereco`, `atendimentos.endereco`, `radar_noticias.logradouro/bairro`) em uma entidade cruzável `lugares`, com participações N:N tipadas por natureza do vínculo. Silenciosa nesta fase — sem sinalização visual, sem flags de inteligência. A apresentação (banner, chip com dot, mini-mapa no sheet, integração com páginas de mapa existentes) é escopo de II-B.

## Princípios

Seguem os invariantes do [Mapa Mestre OMBUDS Inteligência](./2026-04-18-ombuds-mapa-mestre-inteligencia.md):

1. **Coleta silenciosa antes de apresentação** — II-A só colhe/estrutura; II-B liga as luzes.
2. **LGPD como feature** — endereços são sensíveis. ACL por workspace + audit log.
3. **Threshold rigoroso** — nenhuma sinalização em II-A. Catálogo consultável, nada mais.
4. **Ausência comunica** — sem pin no mapa = lugar sem geocoding. Não tenta esconder.

## Arquitetura

Camada 1 (entidade cruzável), espelhando fielmente I-A de Pessoas.

Três tabelas:

- `lugares` — catálogo global, um registro por localização distinta
- `participacoes_lugar` — N:N com processos (+ pessoa opcional), tipada
- `lugares_distincts_confirmed` — pares declarados distintos pelo humano (anti-falsos-positivos do merge-queue)

**Não toca legacy.** Colunas existentes (`processos.local_do_fato_endereco`, `assistidos.endereco`, etc) permanecem fonte de verdade nas UIs atuais. Backfill projeta; não migra. Escrever de volta nas UIs fica pra II-B.

**Não toca mapas existentes.** `/admin/cadastro/mapa` e `/admin/vvd/mapa` permanecem intactos. Integração visual é II-B.

---

## Schema

```sql
-- Catálogo global
CREATE TABLE lugares (
  id                               serial PRIMARY KEY,
  workspace_id                     int NOT NULL REFERENCES workspaces(id),
  logradouro                       text,
  numero                           varchar(30),
  complemento                      varchar(120),
  bairro                           varchar(120),
  cidade                           varchar(120) DEFAULT 'Camaçari',
  uf                               char(2) DEFAULT 'BA',
  cep                              varchar(9),
  latitude                         numeric(10,7),
  longitude                        numeric(10,7),
  endereco_completo                text,              -- string original renderizada
  endereco_normalizado             text NOT NULL,     -- dedupe key
  observacoes                      text,
  fonte_criacao                    varchar(40),       -- 'backfill' | 'manual' | 'ia-atendimento'
  confidence                       numeric(3,2) DEFAULT 0.9,
  merged_into                      int REFERENCES lugares(id),
  geocoded_at                      timestamptz,
  geocoding_source                 varchar(30),       -- 'nominatim' | 'origem' | 'manual' | 'nominatim-fail'
  created_at                       timestamptz DEFAULT now(),
  updated_at                       timestamptz DEFAULT now()
);

CREATE INDEX lugares_workspace ON lugares(workspace_id);
CREATE INDEX lugares_normalizado ON lugares(endereco_normalizado) WHERE merged_into IS NULL;
CREATE INDEX lugares_bairro_trgm ON lugares USING gin(bairro gin_trgm_ops);
CREATE INDEX lugares_logradouro_trgm ON lugares USING gin(logradouro gin_trgm_ops);
CREATE INDEX lugares_geo ON lugares(latitude, longitude) WHERE latitude IS NOT NULL;

-- Participações N:N
CREATE TYPE lugar_tipo_participacao AS ENUM (
  'local-do-fato',
  'endereco-assistido',
  'residencia-agressor',
  'trabalho-agressor',
  'local-atendimento',
  'radar-noticia'
);

CREATE TABLE participacoes_lugar (
  id                serial PRIMARY KEY,
  lugar_id          int NOT NULL REFERENCES lugares(id),
  processo_id       int REFERENCES processos(id),           -- nullable
  pessoa_id         int REFERENCES pessoas(id),              -- nullable
  tipo              lugar_tipo_participacao NOT NULL,
  data_relacionada  date,
  source_table      varchar(40),
  source_id         int,
  fonte             varchar(30) NOT NULL,
  confidence        numeric(3,2) DEFAULT 0.9,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (lugar_id, processo_id, tipo, source_table, source_id)
);

CREATE INDEX participacoes_lugar_lugar ON participacoes_lugar(lugar_id);
CREATE INDEX participacoes_lugar_processo ON participacoes_lugar(processo_id) WHERE processo_id IS NOT NULL;
CREATE INDEX participacoes_lugar_pessoa ON participacoes_lugar(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX participacoes_lugar_tipo ON participacoes_lugar(tipo);

-- Pares distintos (anti-merge)
CREATE TABLE lugares_distincts_confirmed (
  id              serial PRIMARY KEY,
  lugar_a_id      int NOT NULL,
  lugar_b_id      int NOT NULL,
  confirmed_by    int REFERENCES users(id),
  confirmed_at    timestamptz DEFAULT now(),
  UNIQUE (lugar_a_id, lugar_b_id),
  CHECK (lugar_a_id < lugar_b_id)
);

-- Audit log (LGPD)
CREATE TABLE lugares_access_log (
  id          bigserial PRIMARY KEY,
  lugar_id    int REFERENCES lugares(id),
  user_id     int REFERENCES users(id),
  action      varchar(40) NOT NULL,   -- 'get-by-id' | 'list-dump' | 'geocode' | 'get-participacoes'
  context     jsonb,
  ts          timestamptz DEFAULT now()
);

CREATE INDEX lugares_access_log_user_ts ON lugares_access_log(user_id, ts DESC);
CREATE INDEX lugares_access_log_lugar ON lugares_access_log(lugar_id);
```

**Decisões explicadas:**

- `complemento` separado de `numero` permite dedupe preciso (prédio vs apto; merge manual opcional)
- `endereco_completo` preserva string original; `endereco_normalizado` é dedupe key
- `source_table + source_id` rastreia origem, garante idempotência do backfill via UNIQUE
- `pessoa_id` opcional em participações vincula lugar a pessoa específica (ex: residencia-agressor → pessoa agressor)
- `lugares_access_log` não referencia nome/conteúdo — só metadata de acesso (LGPD)
- `CHECK (lugar_a_id < lugar_b_id)` força canonicalização dos pares distincts

---

## Normalização de endereço

Função pura `normalizarEndereco(s: string): string` em `src/lib/lugares/normalizar-endereco.ts`.

Pipeline:

1. **Lowercase + remove acentos** (NFD → ASCII, igual `normalizarNome`)
2. **Expande abreviações**:
   | De | Para |
   |---|---|
   | `r.` \| `r ` \| `rua` | `rua ` |
   | `av.` \| `av ` \| `avenida` | `avenida ` |
   | `tv.` \| `tv ` \| `travessa` | `travessa ` |
   | `pça` \| `praca` \| `praça` | `praca ` |
   | `estr.` \| `est.` \| `estrada` | `estrada ` |
   | `rod.` \| `rodovia` | `rodovia ` |
   | `al.` \| `alameda` | `alameda ` |
   | `nº` \| `n°` \| `n.` \| `no.` | (remove) |
   | `s/n` \| `sn` | `sn` |
3. **Remove pontuação** — `,`, `-`, `()`, `/`, `\`, `:` → espaço
4. **Collapse espaços múltiplos** → único
5. **Remove stopwords posicionais**:
   - CEP: regex `\d{5}-?\d{3}` → remove
   - `camacari`, `camaçari`, `ba`, `bahia`, `brasil` quando terminais
6. **Trim**

Casos de teste (na função):

| Entrada | normalizado |
|---|---|
| `"R. das Palmeiras, 123 - Centro, Camaçari/BA"` | `rua das palmeiras 123 centro` |
| `"Rua das Palmeiras nº 123 - Centro"` | `rua das palmeiras 123 centro` |
| `"AVENIDA PRESIDENTE JOÃO GOULART S/N"` | `avenida presidente joao goulart sn` |
| `"Pça da Matriz, 10, Camaçari - BA"` | `praca da matriz 10` |
| `"  "` / `"-"` / `"?"` / `"sem endereço"` | `""` (placeholder detectado) |

**`isPlaceholder(s)`** retorna true para:
- vazio, whitespace-only
- `"-"`, `"?"`, `"...`, `"n/c"`, `"na"`, `"nao informado"`, `"sem endereco"`, `"a confirmar"`, `"a extrair"`, `"desconhecido"`, `"nao consta"`
- strings com menos de 3 chars úteis após normalização

---

## Backfill

Script `scripts/backfill-lugares.mjs`, espelha `backfill-pessoas.mjs`. Idempotente via UNIQUE; suporta `--dry-run`.

Pipeline:

```
1/6 processos.local_do_fato_endereco (+ lat/lng)
    → lugar (geocoding_source='origem' se lat/lng presentes)
    → participacao tipo='local-do-fato', processo_id, source_table='processos'

2/6 processos.vvd_agressor_residencia_endereco (+ lat/lng)
    → lugar
    → participacao tipo='residencia-agressor', processo_id, source_table='processos_vvd_res'
    → pessoa_id: resolve via testemunhas(tipo='agressor') ou participacoes_processo(papel='reu')
      — melhor esforço; null se não resolve

3/6 processos.vvd_agressor_trabalho_endereco (+ lat/lng)
    → participacao tipo='trabalho-agressor', source_table='processos_vvd_trab'

4/6 assistidos.endereco + bairro + cidade
    → lugar (sem lat/lng inicial)
    → participacao tipo='endereco-assistido'
      processo_id: null
      pessoa_id: resolve via assistidos.userId → users → pessoas (melhor esforço)
      source_table='assistidos', source_id=assistido.id

5/6 atendimentos.endereco
    → participacao tipo='local-atendimento'
      processo_id: atendimento.processo_id (se houver)
      source_table='atendimentos'

6/6 radar_noticias.logradouro/bairro (+ latitude/longitude)
    → lugar
    → participacao tipo='radar-noticia'
      processo_id: null
      data_relacionada: radar_noticia.publicado_em
      source_table='radar_noticias'
```

**Dedupe durante backfill:**

`getOrCreateLugar({ endereco, lat?, lng?, bairro?, cidade?, fonte })`:
1. Se `isPlaceholder(endereco)` → retorna `null` (incrementa `warnings`)
2. `enderecoNorm = normalizarEndereco(endereco)`
3. `SELECT id FROM lugares WHERE endereco_normalizado = enderecoNorm AND merged_into IS NULL LIMIT 1`
4. Se existe → retorna existing (incrementa `lugaresExistentes`)
5. Se não existe mas `lat/lng` presentes:
   - Loga warning se houver lugar ≤30m sem mesma normalização (candidato a merge manual)
   - Cria novo lugar
6. INSERT + retorna new id

**Counters de relatório:**
```
Lugares criados:          N
Lugares existentes:       N
Participações criadas:    N
Participações existentes: N
Warnings (placeholder):   N
Warnings (proximidade):   N
```

**Restrições de re-run:** UNIQUE `(lugar_id, processo_id, tipo, source_table, source_id)` garante zero duplicação em re-run.

---

## tRPC router

`src/lib/trpc/routers/lugares.ts`, registrado em `appRouter`. Todas as procedures são `protectedProcedure` e filtram `workspace_id = ctx.user.workspaceId`.

**CRUD:**

| Procedure | Input | Output |
|---|---|---|
| `create` | `{ logradouro?, numero?, complemento?, bairro?, cidade?, uf?, cep?, enderecoCompleto?, observacoes?, fonte }` | `{ id }` |
| `update` | `{ id, patch }` | `{ id, updated }` — re-normaliza se endereço mudou; invalida geocoding se coord foi removida |
| `delete` | `{ id }` | `{ deleted }` — hard delete quando seguro; senão soft via `merged_into` |
| `list` | `{ search?, bairro?, cidade?, temCoord?, limit=50, offset=0 }` | `{ items, total }` paginado |
| `getById` | `{ id }` | lugar + counts agregados de participações |

**Participações:**

| Procedure | Input | Output |
|---|---|---|
| `getParticipacoesDoLugar` | `{ lugarId }` | lista com processo/pessoa joined |
| `getParticipacoesDoProcesso` | `{ processoId }` | lista de lugares do processo |
| `addParticipacao` | `{ lugarId, processoId?, pessoaId?, tipo, dataRelacionada? }` | `{ id }` |
| `removeParticipacao` | `{ id }` | `{ removed }` |

**Busca:**

| `searchForAutocomplete` | `{ query, bairro?, limit=8 }` | top-k via trgm em logradouro+bairro |

**Merge-queue:**

| `listDuplicates` | `{ limit=20, offset=0 }` | pares com mesmo normalizado OU coord ≤30m, excluindo confirmados distinct |
| `merge` | `{ keepId, mergeId }` | move participações, marca `merged_into`, copia campos faltantes |
| `markDistinct` | `{ aId, bId }` | insere em `lugares_distincts_confirmed` (canonicalizado) |

**Geocoder:**

| `geocode` | `{ id, force? }` | `{ lat?, lng?, source, failed? }` |

Lógica:
1. Se `lat/lng` já existe e `!force` → retorna coord atual (source: `'origem'` | `'manual'` | `'nominatim'`)
2. Monta query: `"{logradouro}, {numero}, {bairro}, {cidade}, {uf}, Brasil"` (ignora `null`)
3. Chama Nominatim: `https://nominatim.openstreetmap.org/search?q=...&format=json&limit=1&countrycodes=br`
4. Headers: `User-Agent: OMBUDS-Defender/1.0 (rodrigorochameire@gmail.com)`
5. Rate-limit server-side: fila simples, 1 req/s
6. Se sucesso: `UPDATE lugares SET latitude=?, longitude=?, geocoded_at=now(), geocoding_source='nominatim'`
7. Se falha (no match): `UPDATE lugares SET geocoded_at=now(), geocoding_source='nominatim-fail'` (evita retry infinito; `force=true` reseta)
8. Loga em `lugares_access_log` action='geocode'

**Abstração:** `src/lib/lugares/geocoder.ts` define interface `Geocoder { geocode(params): Promise<Result> }`; implementação concreta `nominatim.ts`. Router chama a interface, permite troca futura.

---

## UI

Silenciosa. Sem dot, sem peek, sem banner. Catálogo + detalhe + merge-queue.

**`/admin/lugares`** — catálogo

- Header: título + botão `+ Novo`
- Filtros: search, bairro (autocomplete), cidade (select), checkbox "só com coord"
- Tabela paginada (50/página):
  - Ícone 📍 ou 🗺 (se geocodado)
  - Endereço em linha única (truncado)
  - Bairro em badge neutro
  - Resumo: `3 processos · 2 local-do-fato · 1 assistido`
- Row click → `/admin/lugares/[id]`
- Footer: link "Merge-queue (N pares)"

**`/admin/lugares/[id]`** — detalhe

3 abas:

1. **Geral** — campos editáveis (logradouro, número, complemento, bairro, cidade, UF, CEP, observações), botão `Geocodar` (dispara Nominatim), status de geocoding (fonte + timestamp), badge de `confidence`
2. **Participações** — lista agrupada por `tipo`; cada item linka pro processo/pessoa
3. **Merge** — pares candidatos para esse lugar específico

**`/admin/lugares/nova`** — form criação manual (`LugarForm` compartilhado com edit)

**`/admin/lugares/merge-queue`** — lista global de pares candidatos com botões `[Mergear]` `[São distintos]`, espelha `/admin/pessoas/merge-queue`

**Componentes** (`src/components/lugares/`):

- `LugarChip` — pin icon + endereço truncado + bairro badge. Silencioso. Props: `lugarId`, `enderecoCompleto`, `bairro?`, `clickable?`, `size?` (xs|sm|md), `onClick?`
- `LugarSheet` — sheet lateral 4 abas: Geral, Participações, Coordenadas (mostra lat/lng se tem; botão Geocodar), Merge. Abre sobre qualquer página clicando chip
- `LugarForm` — form compartilhado create+edit
- `index.ts` — exports centralizados

**Sidebar** — adicionar em `CADASTROS_NAV` (`src/components/layouts/admin-sidebar.tsx`):
```ts
{ label: "Lugares", path: "/admin/lugares", icon: "MapPin" }
```

---

## LGPD

1. **ACL por workspace** — todas as procedures filtram `workspace_id = ctx.user.workspaceId`. Cross-workspace bloqueado.
2. **Audit log** — tabela `lugares_access_log` registra:
   - `get-by-id` (dossiê aberto)
   - `list-dump` (list sem filtro significativo — threshold: sem `search`, sem `bairro`, sem `cidade`)
   - `geocode` (chamada externa)
   - `get-participacoes` (consulta de vínculos)
3. **Nominatim compliance:**
   - Rate-limit server-side: 1 req/s (fila simples)
   - `User-Agent: OMBUDS-Defender/1.0 (rodrigorochameire@gmail.com)` obrigatório
   - Atribuição OSM visível quando mini-mapa aparecer em II-B
4. **Rotas privadas** — todas `protectedProcedure`; nenhuma API pública.

**Fora de escopo em II-A** (ficam pra II-B ou fase dedicada):
- Anonimização/masking de endereço em relatórios
- Retenção/expiração automática
- ACL granular por tipo (ex: `residencia-agressor` requer permissão extra)

---

## Testes

~40 testes, espelhando I-A:

**Unit** (`__tests__/unit/`):
- `normalizar-endereco.test.ts` — 12-15 casos (abreviações, pontuação, CEP, cidade default, placeholders, acentos, `isPlaceholder`)
- `geocoder.test.ts` — mock Nominatim, teste rate-limit, failure cache, force retry

**tRPC** (`__tests__/trpc/lugares-router.test.ts`):
- create / update / delete
- list com filtros (search, bairro, cidade, temCoord)
- getById + counts
- getParticipacoesDoLugar / getParticipacoesDoProcesso
- addParticipacao / removeParticipacao
- searchForAutocomplete (trgm)
- listDuplicates (normalizado + proximidade geo)
- merge (move participações, sets merged_into)
- markDistinct (canonicaliza par)
- geocode (happy path, skip-if-exists, force retry, failure cache)

**Componentes** (`__tests__/components/lugares/`):
- `LugarChip.test.tsx` (4 testes — silencioso, click, size xs/sm/md, bairro badge)
- `LugarSheet.test.tsx` (mock trpc, 4 abas renderizam corretamente)

**Backfill** (`__tests__/scripts/backfill-lugares.test.ts`):
- Fixtures de 6 fontes, verifica idempotência em re-run (contador `lugaresExistentes`/`participacoesExistentes` em segunda passagem).

---

## Entregáveis

1. Migrations SQL com 4 tabelas + enum + indexes
2. `src/lib/lugares/normalizar-endereco.ts` + testes
3. `src/lib/lugares/geocoder.ts` + `nominatim.ts` + testes
4. `src/lib/trpc/routers/lugares.ts` (~15 procedures) + testes
5. `scripts/backfill-lugares.mjs` + testes (idempotência)
6. `src/components/lugares/` (Chip, Sheet, Form, index) + testes
7. `/admin/lugares` (catálogo), `/admin/lugares/[id]`, `/admin/lugares/nova`, `/admin/lugares/merge-queue`
8. Sidebar link em `CADASTROS_NAV`
9. Audit log writes nas procedures relevantes

## Fora de escopo (II-B ou depois)

- Flags de inteligência (bairro recorrente, endereço comum testemunha-vítima)
- `LugarPeek` hover, `BannerInteligencia` de lugares, dot no chip
- Mini-mapa no sheet de processo
- Integração visual com `/admin/cadastro/mapa` e `/admin/vvd/mapa`
- Botão "vincular lugar" nas UIs de processo/assistido
- Geocoding batch em massa
- Anonimização/retenção LGPD avançada
