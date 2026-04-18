# Pessoas · Fase I-B · Apresentação de Inteligência — Design

**Data:** 2026-04-18
**Status:** Design aprovado — aguardando plano de implementação
**Escopo:** Ligar as luzes. Sobre a fundação silenciosa da Fase I-A, introduzir os sinais de inteligência contextual — dots nos chips, peek em hover, banner de correlação, integração com sheet da agenda (agora liberada). Calibrado para "no momento e lugar certos, sem poluição".
**Pré-requisito:** Fase I-A implementada e com backfill executado.
**Fases seguintes:** II Extração IA · III Perfis Juiz/Promotor · IV Testemunha inteligente · V Rede social.

---

## Princípio central

Informação bruta no banco ≠ inteligência. Inteligência = **dado oportuno, no lugar certo, com peso certo**. A Fase I-B define a gramática visual que o defensor aprende a interpretar em segundos e que nunca vira ruído.

Oito princípios que regem todas as decisões deste spec:

1. **Ausência comunica.** Se não há dot, não há sinal relevante — essa é informação útil ("não detectei nada para alarmar").
2. **Pull antes de push.** Hover/click preferíveis a alertas. Banner é o único empurrão, e só com alto valor.
3. **Threshold rigoroso.** Melhor não mostrar do que mostrar fraco.
4. **Relevância decai com tempo.** Caso de 2024 vale mais que de 2018 na hora de decidir se sinaliza.
5. **Same-scope primeiro.** Mesma comarca > mesmo estado > outros.
6. **Ambiguidade com humildade.** "Provavelmente a mesma pessoa" é diferente de "é a mesma pessoa" — UI precisa distinguir.
7. **Consistência visual.** Uma vez chip, sempre chip. Um papel, sempre a mesma cor. Aprender uma vez, usar em toda a app.
8. **Dismissibilidade.** O que empurra precisa poder ser silenciado. O defensor controla o fluxo.

## Arquitetura do sinal

### Materialized view `pessoas_intel_signals`

Tudo que o chip/peek/banner mostra vem de uma view materializada precomputada — performance é não-negociável em páginas com muitos chips.

```sql
CREATE MATERIALIZED VIEW pessoas_intel_signals AS
SELECT
  p.id AS pessoa_id,
  p.workspace_id,

  -- Contagens básicas (sempre disponíveis)
  COUNT(DISTINCT pp.processo_id) AS total_casos,
  COUNT(DISTINCT pp.processo_id) FILTER (
    WHERE pp.created_at >= now() - INTERVAL '6 months'
  ) AS casos_recentes_6m,
  COUNT(DISTINCT pp.processo_id) FILTER (
    WHERE pp.created_at >= now() - INTERVAL '12 months'
  ) AS casos_recentes_12m,

  -- Papéis (agregados)
  jsonb_object_agg(pp.papel, cnt) AS papeis_count,
  (
    SELECT pp2.papel FROM participacoes_processo pp2
    WHERE pp2.pessoa_id = p.id
    GROUP BY pp2.papel
    ORDER BY COUNT(*) DESC LIMIT 1
  ) AS papel_primario,

  -- Lados (pra testemunhas)
  COUNT(*) FILTER (WHERE pp.lado = 'acusacao') AS lado_acusacao,
  COUNT(*) FILTER (WHERE pp.lado = 'defesa') AS lado_defesa,

  -- Datas
  MAX(pp.created_at) AS last_seen_at,
  MIN(pp.created_at) AS first_seen_at,

  -- Ambiguidade
  EXISTS(
    SELECT 1 FROM pessoas p2
    WHERE p2.id != p.id
      AND p2.nome_normalizado = p.nome_normalizado
      AND p2.merged_into IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM pessoas_distincts_confirmed pdc
        WHERE (pdc.pessoa_a_id, pdc.pessoa_b_id) = (LEAST(p.id, p2.id), GREATEST(p.id, p2.id))
      )
  ) AS ambiguity_flag,

  -- Placeholders para fases seguintes (sempre 0/null em I-B)
  0 AS contradicoes_conhecidas,   -- IV
  0 AS consistencias_detectadas,  -- IV
  false AS high_value_flag         -- III/IV/V

FROM pessoas p
LEFT JOIN LATERAL (
  SELECT papel, COUNT(*) AS cnt
  FROM participacoes_processo
  WHERE pessoa_id = p.id
  GROUP BY papel
) AS papel_agg ON true
LEFT JOIN participacoes_processo pp ON pp.pessoa_id = p.id
WHERE p.merged_into IS NULL
GROUP BY p.id, p.workspace_id;

CREATE UNIQUE INDEX pessoas_intel_signals_pk ON pessoas_intel_signals(pessoa_id);
CREATE INDEX pessoas_intel_signals_workspace ON pessoas_intel_signals(workspace_id);
```

Refresh:
- **Trigger** `AFTER INSERT/UPDATE/DELETE ON participacoes_processo` com `NOTIFY pessoas_intel_dirty` — debounced 5s via background worker.
- **Cron diário 03:00** — `REFRESH MATERIALIZED VIEW CONCURRENTLY pessoas_intel_signals` (garantia).
- Cliente: tRPC retorna signal em conjunto com a pessoa; staleness aceitável de minutos (fresh ≠ real-time).

### `IntelSignal` — contrato TS

```ts
export interface IntelSignal {
  pessoaId: number;
  totalCasos: number;
  casosRecentes6m: number;
  casosRecentes12m: number;
  papeisCount: Record<string, number>;
  papelPrimario: PapelParticipacao | null;
  ladoAcusacao: number;
  ladoDefesa: number;
  lastSeenAt: Date | null;
  firstSeenAt: Date | null;
  sameComarcaCount: number;  // computado lado-cliente baseado na comarca atual
  ambiguityFlag: boolean;
  contradicoesConhecidas: number;  // 0 em I-B, preenchido em IV
  consistenciasDetectadas: number; // 0 em I-B, preenchido em IV
  highValueFlag: boolean;          // false em I-B
}
```

### Dot level — decision tree

```ts
import { PAPEIS_ROTATIVOS } from "./intel-config";

export type DotLevel = "none" | "subtle" | "normal" | "emerald" | "amber" | "red";

export function computeDotLevel(s: IntelSignal): DotLevel {
  // Papéis estáveis (juiz, promotor, desembargador, servidor) NUNCA sinalizam.
  // Titularidade fixa em comarca única = sinal vira ruído.
  // Pessoa ainda existe e é clicável, mas sem dot.
  if (s.papelPrimario && !PAPEIS_ROTATIVOS.has(s.papelPrimario)) return "none";

  // Amber vence tudo (indica risco/atenção)
  if (s.contradicoesConhecidas >= 1) return "amber";

  // Red: alto valor específico (definido em IV/V; sempre false em I-B)
  if (s.highValueFlag) return "red";

  // Emerald: consistência comprovada em múltiplos casos (Fase IV)
  if (s.totalCasos >= 5 && s.consistenciasDetectadas >= 3) return "emerald";

  // Normal: recorrência significativa
  if (s.totalCasos >= 3) return "normal";

  // Subtle: 2 casos — sinal fraco mas presente
  if (s.totalCasos >= 2) return "subtle";

  // Primeira aparição → nenhum sinal
  return "none";
}
```

**Em Fase I-B**, só "none", "subtle" e "normal" aparecem organicamente (amber/emerald/red exigem dados das fases III/IV/V). Mas o componente implementa todos os níveis desde o início — assim I-B não precisa ser re-trabalhada quando as outras fases chegam.

**Papéis estáveis sempre retornam "none"** — justificativa: em comarca única, juiz/promotor/desembargador/servidor são os mesmos em todo processo. Sinalizar todos com "normal" seria ruído constante. Se o OMBUDS migrar pra uso multi-comarca, admin habilita esses papéis em `PAPEIS_ROTATIVOS` (uma linha de config por workspace).

### Regras de relevância contextual (client-side)

Quando o chip aparece dentro de um processo aberto, o peek e o banner usam o contexto para **promover** sinais relevantes:

- `sameComarcaCount` computed client-side via cross-reference com `processos.comarca` atual.
- Se `sameComarcaCount >= 2` e `totalCasos >= 3`, a pessoa entra na lista de candidatas ao banner com prioridade alta.
- Se `processo atual tem mesmo assistido de outro caso da pessoa`, a pessoa vira "depôs contra este mesmo assistido antes" (copy especial).

## Componentes

### `IntelDot` (novo)

Átomo visual do sinal.

```tsx
interface IntelDotProps {
  level: DotLevel;
  size?: "xs" | "sm";       // 4px | 6px
  pulse?: boolean;          // opcional, pra "recém-ativada"
  "aria-label"?: string;
}
```

Visual:
- `none` → nada renderizado
- `subtle` → círculo `3px` neutral-300, opacity 0.6
- `normal` → círculo `4px` neutral-500
- `emerald` → círculo `4px` emerald-500
- `amber` → círculo `4px` amber-500 + borda opcional
- `red` → círculo `4px` rose-600 + pulse leve

Aria-label automático por level:
- none → sem aria
- subtle → "Duas aparições anteriores"
- normal → "{N} casos anteriores"
- emerald → "Consistência comprovada em múltiplos casos"
- amber → "Contradição registrada em caso anterior"
- red → "Alto valor estratégico"

### `PessoaChip` v2 (upgrade do I-A)

```tsx
interface PessoaChipProps {
  // mesmos props do I-A
  pessoaId?: number;
  nome?: string;
  papel?: string;
  size?: "xs" | "sm" | "md";
  clickable?: boolean;
  onClick?: (p: PessoaResumo) => void;

  // NOVO em I-B
  contextProcessoId?: number;  // permite computar sameComarcaCount
  contextAssistidoId?: number; // permite detectar "depoente vs mesmo assistido"
  showDot?: boolean;           // default true
  showPeek?: boolean;          // default true
  ambiguityMark?: boolean;     // default true — mostra "?" quando ambiguidade
}
```

Visual:

```
[👤] Maria Silva  •         ← dot subtle + nome
[👤] PM João Souza  ⚠       ← amber
[👤] João da Silva  ?       ← ambiguidade (ainda não mesclado com homônimo)
```

Comportamento:
- `showDot=true` (default): mostra `IntelDot` com `level=computeDotLevel(signal)`
- Hover → `PessoaPeek` aparece após delay de 250ms; esconde 100ms após mouseleave
- Click → abre `PessoaSheet`

Performance:
- Hook `usePessoaSignalsForPage(names: string[])` faz batch lookup — uma query por página agrupa todos os chips.
- Cache tRPC per-session; staleTime 5min.

### `PessoaPeek` (novo)

Card flutuante que aparece no hover.

Layout (~200×auto, max 240×160):

```
┌─────────────────────────────────────────┐
│ [avatar pequeno]  Maria Silva           │
│                   testemunha            │
├─────────────────────────────────────────┤
│ 3 casos · 2 como acusação, 1 defesa    │
│ Última aparição: nov/2025               │
│ Mesma comarca: 2 casos ✦                │
│                                         │
│ ⚠ Contradição em caso #832              │ ← só se amber
│                                         │
│ [?] Possível duplicata — ver merge →    │ ← só se ambiguityFlag
├─────────────────────────────────────────┤
│ Clique para abrir dossiê →              │
└─────────────────────────────────────────┘
```

Regras de conteúdo:
- Linha 1: nome + papel primário
- Linha 2: contagem total + distribuição por lado (se papel=testemunha/vitima/informante)
- Linha 3: última aparição em "MMM/aaaa"
- Linha 4 (se `sameComarcaCount >= 1`): "Mesma comarca: N casos ✦" destacado
- Linha 5 (se amber): bloco de contradição — Fase IV
- Linha 6 (se ambiguityFlag): chamada pra merge-queue

Comportamento:
- Aparece 250ms após mouseenter (evita flash acidental em movimento)
- Desaparece 100ms após mouseleave
- Fica aberto se mouse entra no card (permite ler)
- Posicionamento inteligente: prefere abaixo+direita; escolhe outro lado se colaria fora da viewport
- Fade-in 120ms; fade-out 80ms

Mobile:
- Tap no chip abre peek inline abaixo; segundo tap abre sheet
- OR: chip em mobile pula direto pro sheet (mais simples; a definir no teste com usuário)

### `BannerInteligencia` (novo)

Banner discreto no topo de páginas contextuais quando há correlação forte.

Layout collapsed:

```
┌────────────────────────────────────────────────────────────┐
│ 🔎  Inteligência detectada (3)                    [▾] [×]  │
└────────────────────────────────────────────────────────────┘
```

Expanded (click "▾"):

```
┌──────────────────────────────────────────────────────────────┐
│ 🔎  Inteligência detectada (3)                      [▴] [×]  │
├──────────────────────────────────────────────────────────────┤
│ • PM João Souza  •                                            │
│   5 casos (2 na Comarca de Camaçari)                         │
│                                                               │
│ • Maria Silva  ⚠                                              │
│   Já depôs contra este assistido em outro caso (#8001234)    │
│                                                               │
│ • Dr. Pedro Alencar                                           │
│   14 casos no mesmo tribunal · padrão decisório → Fase III   │
└──────────────────────────────────────────────────────────────┘
```

Threshold (quando aparecer):
```ts
function shouldShowBanner(signals: IntelSignal[], context: Context): boolean {
  const highValue = signals.filter(s => {
    // Papéis estáveis nunca entram no banner (juiz/promotor/servidor são constantes em comarca única)
    if (s.papelPrimario && !PAPEIS_ROTATIVOS.has(s.papelPrimario)) return false;

    return (
      s.contradicoesConhecidas >= 1 ||                          // alto valor (Fase IV)
      (s.totalCasos >= 3 && s.sameComarcaCount >= 2) ||         // recorrência na comarca
      (s.depoenteContraAssistidoAtual)                          // pessoa contra mesmo assistido
    );
  });
  return highValue.length >= 1;
}
```

Em I-B só o segundo critério ativa organicamente. Critérios 1 e 3 ligam em fases posteriores. Papéis estáveis **nunca** entram — respeitando a realidade de comarca única onde juiz/promotor são titulares fixos.

Dismissibilidade:
- `[×]` grava `banner-inteligencia-dismissed-{contextType}-{contextId}` em localStorage com `expireAt = now + 30 dias`
- Não reaparece até expirar ou até novo sinal relevante ser detectado (contagem mudou)
- `[▾]` expande sem fechar (expanded state também persiste em localStorage)

Conteúdo por item:
- Chip `PessoaChip` da pessoa + IntelDot
- 1 linha de justificativa específica e curta (<60 chars)
- Click no item → abre `PessoaSheet`

Onde o banner aparece:
- **Topo do sheet da agenda** (`event-detail-sheet.tsx`) — acima do ToC
- **Topo de `/admin/processos/[id]`** — abaixo do header
- **Topo do modal de Registro de Audiência** — abaixo das tabs

Onde **não** aparece:
- `/admin/assistidos/[id]` — próprio assistido já é o "centro"
- `/admin/pessoas/[id]` — a página toda é sobre essa pessoa
- Dashboards e listagens

### `PessoaSheet` v2 (upgrade)

Em cima do I-A, I-B adiciona:

- Header ganha `IntelDot` e linha de resumo ("3 casos · testemunha")
- Tab "Visão geral" ganha mini-cards de destaques contextuais
- Tab "Processos" ganha filtro por papel e ordenação por recência
- Nova seção "Em comum com o caso atual" (quando aberto de dentro de um processo) listando outros processos da pessoa que compartilham assistido, comarca, tipo penal, etc

### Aba "Pessoas" em `/admin/processos/[id]`

Layout agrupado por classe de papel, com **grupo Judicial desdestacado** (titularidade estável):

```
┌──────────────────────────────────────────────────────────────┐
│ Pessoas deste processo (12)                                   │
├──────────────────────────────────────────────────────────────┤
│  ▸ Judicial (2) · titulares estáveis            [tom claro]  │
│     Dr. Pedro Alencar · Dra. Ana Costa                        │
│                                                               │
│  ▾ POLICIAL / INVESTIGAÇÃO (3)                                │
│     [👤] PM João Souza  •  ⚠                                  │
│         5 casos · 1 contradição registrada                    │
│     [👤] PM Carlos Lima  ●                                    │
│         7 casos · sem contradições                            │
│     [👤] Dr. Silva (delegado)                                 │
│                                                               │
│  ▾ PERITOS / TÉCNICOS (2)                                     │
│     [👤] Dr. Fernando (perito criminal)  •                    │
│     [👤] Dra. Lúcia (médica legista)                          │
│                                                               │
│  ▾ DEPOENTES (4)                                              │
│     [👤] Maria Silva (vítima)  •                              │
│         Já depôs contra este assistido em #8001234 ✦          │
│     [👤] João Santos (testemunha)  •                          │
│         2 casos                                               │
│     [👤] Pedro Alves (informante)                             │
│     [👤] Carmen Lúcia (testemunha defesa)                     │
│                                                               │
│  ▾ DEFESA (1)                                                 │
│     [👤] Carlos Lima (co-réu)                                 │
└──────────────────────────────────────────────────────────────┘
```

Grupos colapsáveis (reusa `CollapsibleSection` da agenda). Cada linha é:
- `PessoaChip` + mini-frase de inteligência (só se `dotLevel !== "none"`)
- Click → abre `PessoaSheet`
- Ações rápidas no hover: "editar papel", "remover participação", "criar testemunha vinculada" (se aplicável)

**Grupo Judicial** recebe tratamento especial:
- Tom claro (`opacity: 0.75`, tipografia `font-weight: 500` em vez de `600`, cor `text-neutral-500`)
- Colapsado por default (`▸`)
- Subtitle explicativo "titulares estáveis"
- Conteúdo resumido: só nomes em linha única quando colapsado ("Dr. Pedro Alencar · Dra. Ana Costa")
- Se expandido, chips sem dot e sem mini-frase — só o chip clicável puro

Ordem dos grupos: **Policial → Peritos → Depoentes → Defesa → Judicial (por último, discreto)**. A prioridade visual vai para o que tem valor de cruzamento.

Em workspaces multi-comarca futuros, `PAPEIS_ROTATIVOS` pode incluir juiz/promotor e esse grupo automaticamente ganha destaque como os outros.

## Integração com agenda (liberada)

Agenda voltou a ser editável. A Fase I-B integra `PessoaChip` onde hoje tem string de nome — **pequenas edições cirúrgicas, uma por vez, commit atômico**.

Pontos de integração no sheet (`event-detail-sheet.tsx`):

1. **Depoentes no bloco**: `DepoenteCardV2` renderiza nome do depoente. Wrap com `PessoaChip` quando a testemunha já tiver `participacao.pessoa_id` resolvido.
2. **Juiz do header**: campo `evento.juiz` ou `ctx.processo.juiz` vira `PessoaChip`.
3. **Promotor**: idem.
4. **Versão do Acusado**: textos de "delegacia" e "juízo" mencionam policiais/peritos — passa por IA em Fase II para virar chips inline, mas em I-B fica plain text até ter dado.
5. **`BannerInteligencia`** acima do `SheetToC` quando threshold atinge.

Pontos de integração no modal de Registro (`registro-modal.tsx` + tabs):

1. **Aba Depoentes**: já tem cards; wrap nome com chip quando `participacao` existir.
2. **Aba Briefing**: textos analíticos podem ter chips inline (Fase II extrai).
3. **Aba Resultado**: campos Juiz/MP são inputs; quando o valor bate com pessoa existente, UI mostra ícone de pessoa vinculada.
4. **Header do modal**: Juiz e MP inline — viram `PessoaChip`.

Regra de ouro da integração: **se a string ainda não está vinculada a `pessoa`, mostra como texto puro com ícone "link" pequeno**. Click no ícone abre `VincularPessoaPopover` (similar ao `VincularAudioPopover` da Fase 4 da agenda).

### `VincularPessoaPopover` (novo)

Popover que aparece quando o defensor clica em "linkar" ao lado de uma string de nome.

```
┌──────────────────────────────────────┐
│ Vincular "Maria Silva" a uma pessoa  │
├──────────────────────────────────────┤
│ Busque ou crie:                      │
│ [🔍 Maria Silva________]              │
├──────────────────────────────────────┤
│ ○ Maria Silva  #42  ◀ provável       │
│   3 casos · Camaçari                 │
│                                       │
│ ○ Maria Silva  #87                   │
│   1 caso · Salvador                  │
│                                       │
│ ○ Criar nova "Maria Silva"           │
└──────────────────────────────────────┘
```

Comportamento:
- Busca fuzzy em `pessoas` via `trpc.pessoas.searchForAutocomplete`
- Rank por similarity + mesma comarca + papel compatível
- Sugere confidence; maior = "provável" badge
- Selecionar → cria `participacao_processo` com `fonte=manual, confidence=1.0`
- "Criar nova" → cria pessoa + participação em um fluxo só

## Ambiguidade — UI de humildade

Quando `ambiguityFlag=true` no sinal, a UI comunica incerteza:

- Chip: `?` pequeno ao lado do dot (não uma cor, um símbolo)
- Peek: linha "Possível duplicata — ver merge-queue →"
- Sheet: banner amarelo no topo "Há outras pessoas com nome similar — confirme a correspondência em merge-queue"
- Dashboards futuros: barras de confidence explícitas

Nunca escondemos a incerteza. Também nunca fingimos certeza que o sistema não tem.

## Copy e microtexto

### Peek

| Situação | Linha 2 |
|---|---|
| 0 casos (não deveria aparecer) | (sem peek) |
| 1 caso (não sinaliza) | (sem peek) |
| 2 casos | "2 casos · último: {mmm/aa}" |
| 3+ casos | "{N} casos · {X} como acusação, {Y} como defesa" |
| ≥2 casos na mesma comarca | "+linha: ✦ {N} casos em {comarca}" |
| Depoente contra mesmo assistido (I-B especial) | "Já depôs contra este assistido em caso #{id}" |

### Banner

| Pessoa | Linha |
|---|---|
| Recorrência na comarca | "{N} casos ({M} em {comarca})" |
| Mesmo assistido já antes | "Já apareceu em outro caso deste assistido" |
| Contradição conhecida (IV) | "Contradição registrada em {caso}" |
| Alta presença (juiz/promotor) | "{N} casos no mesmo {tribunal\|MP}" |

### Aria-labels

Todos os dots têm aria descritivo. `PessoaChip` tem role="button" quando clicable. Banner tem `role="region"` com label.

## Thresholds configuráveis

Todos os números mágicos ficam em um arquivo de configuração:

```ts
// src/lib/pessoas/intel-config.ts
export const INTEL_CONFIG = {
  dot: {
    subtleMin: 2,
    normalMin: 3,
    emeraldMin: 5,
    emeraldConsistencyMin: 3, // Fase IV
  },
  banner: {
    showIf: {
      contradicoes: 1,
      totalCasosPlusComarca: { casos: 3, comarca: 2 },
    },
    maxItems: 3,
    dismissDurationDays: 30,
  },
  peek: {
    delayMs: 250,
    fadeOutMs: 100,
    showOnTouch: false, // mobile vai direto pro sheet
  },
  staleness: {
    signalTTLSeconds: 300, // 5min cache client
    cronHour: 3,
  },
};
```

Fácil ajustar após experiência real.

## Animações e motion

| Elemento | Transição |
|---|---|
| Peek fade-in | 120ms ease-out, 250ms delay |
| Peek fade-out | 80ms ease-in |
| Banner slide-down | 200ms ease-out (só no primeiro load) |
| Banner dismiss | 180ms slide-up + fade |
| Dot activation (primeira vez) | 1 pulse 400ms + parar |
| Chip hover | 150ms bg + border |

Todas respeitam `prefers-reduced-motion`.

## Acessibilidade

- **Dot**: aria-label descritivo automático por level
- **Peek**: focusable via keyboard; aparece também em focus-within; `esc` fecha
- **Banner**: `role="region"`, dismiss com `esc`, items navegáveis por tab
- **Chip**: role="button" quando clickable; `aria-describedby` aponta para peek quando visível
- Contraste 4.5:1 em todas as combinações de tom
- Screen reader: cada chip lê "Pessoa: {nome}, {papel}, {N} casos anteriores" quando focado

## Performance

### Lookup em lote

Hook `usePessoaSignalsForPage(names: string[], pessoaIds: number[])`:

- Agrega todos os lookups da página em uma só query tRPC `pessoas.getBatchSignals({ names, ids, contextProcessoId? })`
- Server: resolve via single query com `IN`
- Retorna `Map<string | number, IntelSignal>`
- Cliente usa Suspense/staleTime pra evitar re-fetches

### Chip rendering

- Chip é componente leve, memoizado
- Dot é puro SVG inline (1 elemento)
- Peek lazy (mount só no hover)

### Banner

- Single query pra todos os sinais do contexto; server retorna só os que passam threshold
- Fallback: se query falha, banner simplesmente não aparece (graceful)

## Testes

### Unit
- `intel-config.test.ts` — thresholds
- `dot-level.test.ts` — 20 casos (matriz total × contradições × consistências)
- `banner-threshold.test.ts` — 12 cenários

### Component
- `IntelDot.test.tsx` — 6 levels + aria
- `PessoaChip.test.tsx` — dot aparece conforme signal, peek on hover, click abre sheet
- `PessoaPeek.test.tsx` — posicionamento, conteúdo por nível, fade in/out
- `BannerInteligencia.test.tsx` — threshold, dismiss, localStorage
- `VincularPessoaPopover.test.tsx` — busca, rank, criar nova

### Integration
- Sheet de processo com mocks retorna banner correto quando signals high-value
- Página `/admin/processos/[id]` renderiza aba Pessoas com grupos corretos
- Dismissibilidade persiste entre reloads

### Regression
- Sheet da agenda renderiza corretamente após integração (testes existentes verdes)
- Modal de Registro idem

### Manual (checklist)
- Dot aparece/desaparece conforme thresholds
- Peek timing (250ms delay, não-flashy)
- Banner só quando há sinal alto; dismiss funciona
- Chip com ambiguidade mostra "?"
- Integração não quebra agenda
- `prefers-reduced-motion` desabilita animações
- Performance: página com 30+ chips carrega sem lag

## Padrão Defender v5

- IntelDot: puro SVG circle de 3-4px
- Cores por papel seguem paleta definida em I-A
- Peek: `bg-white dark:bg-neutral-900`, border neutral-200, shadow-md, rounded-lg, padding 12px
- Banner: `bg-neutral-50 dark:bg-neutral-900/50`, border-l-2 emerald quando ativo; `rounded-xl`; padding 12-16px
- Chips inline: mesmo tamanho que texto ao redor, não quebram a linha

## Não-escopo I-B

- Dashboard `/admin/inteligencia` → Fase III+
- Extração IA de pessoas a partir de texto → Fase II
- Padrão decisório de juiz/promotor → Fase III
- Confiabilidade de testemunha (contradições) → Fase IV (mas a UI já prevê e renderiza quando o dado chegar)
- Grafo de rede social → Fase V
- Alertas proativos cross-case → Fase V

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Dots aparecem demais no começo (muitos casos = todos normal) | Threshold subtle=2, normal=3; cronicamente ajustar via `INTEL_CONFIG` |
| Peek atrapalha leitura (flashing) | Delay 250ms + fade suave; não aparece em touch |
| Banner ignorado e depois extrañado | Dismiss por 30 dias; reaparece quando count muda |
| Ambiguidade confunde defensor | "?" explícito + copy "provável duplicata" + botão direto pro merge |
| Agenda quebra após integração | Commits cirúrgicos, 1 por vez, tests regression após cada |
| Performance em página com 30+ chips | Hook batch, signals cacheados, materialized view |
| LGPD: dots revelam info sensível em lugares públicos | Dots só visíveis a usuários com escopo do workspace |
| Nome comum gera false positive em matching | Ambiguity flag + merge-queue + "mesmo contexto" pra sugestões |

## Critérios de aceitação I-B

1. Materialized view `pessoas_intel_signals` criada + refresh funcional (trigger + cron).
2. `IntelDot` renderiza 6 levels com aria-labels corretos.
3. `PessoaChip` v2 mostra dot quando signal presente; peek on hover com delay 250ms.
4. `PessoaPeek` renderiza conteúdo correto por nível; posicionamento inteligente.
5. `BannerInteligencia` aparece apenas quando threshold atinge; dismiss por 30 dias persiste.
6. Banner aparece em: sheet da agenda, processo detail, modal de registro. Não aparece em assistido nem catálogo de pessoas.
7. Integração com sheet da agenda: depoentes, juiz, promotor viram chips quando vinculados.
8. Integração com modal de Registro: idem nas tabs relevantes.
9. Aba "Pessoas" em `/admin/processos/[id]` agrupa por classe de papel, usa chips, mostra linha de intel.
10. `VincularPessoaPopover` resolve linkagem de string não-vinculada a pessoa existente/nova.
11. Ambiguidade (`ambiguityFlag=true`) renderiza "?" em chip e linha em peek.
12. Todos os thresholds via `INTEL_CONFIG` configurável.
13. `prefers-reduced-motion` desabilita animações.
14. Testes unit + component + integration + regression verdes.
15. Regressão zero: todos os testes existentes das Fases 1-4 da agenda continuam verdes.

## Plano de rollout

Ordem rígida de implementação (commits atômicos):

1. Materialized view + refresh trigger
2. `INTEL_CONFIG` + helpers puros (dot-level, banner-threshold)
3. `IntelDot` + tests
4. `PessoaChip` v2 (upgrade sem quebrar v1) + tests
5. `PessoaPeek` + tests
6. `BannerInteligencia` + tests + dismissibilidade
7. Integração sheet agenda — depoentes (1 commit)
8. Integração sheet agenda — juiz/promotor (1 commit)
9. Integração sheet agenda — banner (1 commit)
10. Integração modal registro — tabs depoentes (1 commit)
11. Integração modal registro — header juiz/MP (1 commit)
12. Integração processo detail — aba Pessoas (1 commit)
13. `VincularPessoaPopover` + tests (1 commit)
14. Manual verification + ajustes finos

Cada commit passa tests antes do próximo. Se qualquer regressão na agenda, rollback imediato e investiga.
