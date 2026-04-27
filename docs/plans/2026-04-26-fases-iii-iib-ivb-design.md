# Fases III + II-B + IV-B · Design Consolidado

**Data:** 2026-04-26
**Escopo:** 3 fases entregues sequencialmente, versões mínimas viáveis. Sem brainstorming explícito — decisões pré-tomadas com base no roadmap original. Refinamento de UX rica em iterações futuras.

---

## Fase III · Delitos / Tipificações (Camada 1)

**Objetivo:** Estruturar tipo penal + qualificadoras pra cruzar teses defensivas. Reusar aba "delitos" da hierarquia (hoje é stub).

### Schema

```sql
CREATE TABLE delitos_catalogo (
  id              serial PRIMARY KEY,
  codigo_lei      varchar(40),                    -- ex: "CP", "11.340", "11.343"
  artigo          varchar(40),                    -- ex: "121", "157", "33"
  paragrafo       varchar(20),
  inciso          varchar(20),
  descricao_curta varchar(120) NOT NULL,          -- "Homicídio simples"
  descricao_longa text,
  natureza        varchar(40),                    -- "acao-publica-incondicionada" | "condicionada" | "privada"
  hediondo        boolean DEFAULT false,
  pena_min_anos   numeric(4,1),                   -- 1.0 = 1 ano
  pena_max_anos   numeric(4,1),
  area_sugerida   varchar(40),                    -- JURI, VVD, etc (string livre)
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX delitos_catalogo_codigo_artigo ON delitos_catalogo(codigo_lei, artigo);
CREATE INDEX delitos_catalogo_descricao_trgm ON delitos_catalogo USING gin(descricao_curta gin_trgm_ops);

CREATE TABLE tipificacoes (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  delito_id                int NOT NULL REFERENCES delitos_catalogo(id),
  qualificadoras           jsonb DEFAULT '[]',
  majorantes               jsonb DEFAULT '[]',
  minorantes               jsonb DEFAULT '[]',
  modalidade               varchar(20) DEFAULT 'consumada',  -- consumada | tentada
  observacoes              text,
  fonte                    varchar(30) NOT NULL DEFAULT 'manual',
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX tipificacoes_processo ON tipificacoes(processo_id);
CREATE INDEX tipificacoes_delito ON tipificacoes(delito_id);
```

### Catálogo seed (~30 delitos comuns)

Pré-popular via migration. Cobre Júri (homicídio + qualificadoras), VVD (lesão LMP, descumprimento MPU, ameaça), tráfico (33 caput + 33 §1º + 35), roubo (157 + qualificadoras), furto, estupro de vulnerável, etc.

### tRPC

- `delitos.listCatalogo({ search?, area? })` — busca trgm
- `delitos.getCatalogoById({ id })`
- `tipificacoes.listByProcesso({ processoId })`
- `tipificacoes.create({ processoId, delitoId, qualificadoras?, modalidade? })`
- `tipificacoes.update({ id, patch })`
- `tipificacoes.delete({ id })`

### UI

- `/admin/delitos` — catálogo simples (lista + busca, sem CRUD edit em III)
- `tab-delitos.tsx` (já é stub) → vira lista de tipificações + botão "vincular delito" via popover

### Fora de escopo

- Qualificadoras taxonomicamente estruturadas (taxonomia genérica via jsonb por agora)
- Auto-extração de delito de `enrichment_data`
- Cruzamento estratégico ("todos meus 121 §2º com feminicídio")

---

## Fase II-B · Lugares Apresentação

**Objetivo:** Ligar inteligência sobre fundação II-A. Banner + dot em chip de lugar. Sem mini-mapa (escopo grande, valor incremental).

### Materialized view

```sql
CREATE MATERIALIZED VIEW lugares_intel_signals AS
SELECT
  l.id AS lugar_id,
  COUNT(DISTINCT pl.processo_id) FILTER (WHERE pl.processo_id IS NOT NULL)::int AS total_processos,
  COUNT(DISTINCT pl.processo_id) FILTER (WHERE pl.created_at >= now() - INTERVAL '12 months')::int AS recentes_12m,
  jsonb_object_agg(pl.tipo, COUNT(*)) FILTER (WHERE pl.tipo IS NOT NULL) AS tipos_count,
  l.bairro,
  -- Bairro recorrente: count de outros lugares no mesmo bairro
  (SELECT COUNT(DISTINCT processo_id)
   FROM participacoes_lugar pl2
   JOIN lugares l2 ON l2.id = pl2.lugar_id
   WHERE l2.bairro = l.bairro AND l.bairro IS NOT NULL)::int AS bairro_total
FROM lugares l
LEFT JOIN participacoes_lugar pl ON pl.lugar_id = l.id
WHERE l.merged_into IS NULL
GROUP BY l.id, l.bairro;
```

### Helpers

- `computeLugarDotLevel(signal)` — `none | normal | amber | red`
- `shouldShowBairroBanner(signals)` — true se bairro tem ≥3 casos em 12m

### UI

- `LugarChip` ganha `dotLevel` opcional + `IntelDot` (reusa de I-B)
- `BannerBairroRecorrente` no sheet processo / aba lugares: "Bairro X tem 5 casos recorrentes"

### Fora de escopo

- Mini-mapa visual (Leaflet/Mapbox) — fica pra fase dedicada
- Integração com `/admin/cadastro/mapa` existente
- Flag "endereço comum testemunha-vítima" (precisa de dado de endereço de testemunhas — ainda não temos)

---

## Fase IV-B · Cronologia Apresentação

**Objetivo:** Timeline visual + flags + badges sobre fundação IV-A.

### Helpers (puros)

- `computePrisaoStatus(prisoes)` → `{ ativa, diasPreso, tipo }` ou null
- `detectExcessoPrazoPreventiva(prisoes, dataDenuncia?)` → flag baseada em jurisprudência STJ (limite ~80 dias)
- `detectFlagranteSemCustodia(prisoes, marcos)` → flag se há flagrante sem audiência de custódia em 24h
- `detectPrescricaoIminente(marcos, delitos)` → STUB inicial (precisa Fase III completa)

### Componentes

- `ProcessoTimeline` — timeline horizontal SVG-free com pontos por marco/prisão
- `BadgePresoHaXDias` — pequeno badge vermelho no header do caso/processo
- `BannerCronologiaFlags` — alerta se há flag ativa

### Integração

- Aba "Cronologia" do caso (Nível 2): timeline horizontal no topo
- Header do `CasoLayout`: badge "preso há X dias" se aplicável
- `SituacaoAtualBlock` (já existe de IV-A) ganha mais flags

### Fora de escopo

- Flags que dependem de Fase III (qualificadoras → prescrição precisa)
- Animações elaboradas
- Edit de marcos via timeline

---

## Estratégia de execução

1. **III** primeiro (Camada 1, independente)
2. **II-B** depois (depende de II-A pronta)
3. **IV-B** por último (depende de IV-A + Hierarquia)

Cada fase: spec mínimo + plan ~7-10 tasks + execução subagent-driven. Testes TDD onde fizer sentido (helpers, parsers). UI em versões mínimas viáveis. Commits pequenos, frequentes. Iteração futura refina UX.
