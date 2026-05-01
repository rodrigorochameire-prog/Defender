# Pessoas · Fase I-B · Apresentação de Inteligência — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar as luzes sobre a fundação silenciosa — dots nos chips, peek hover, banner de correlação, integração cirúrgica com sheet+modal da agenda, aba "Pessoas" no processo. Threshold rigoroso, dismissibilidade, papéis estáveis sem sinal.

**Architecture:** Materialized view `pessoas_intel_signals` pré-computada + trigger/cron. Dois helpers puros (computeDotLevel, shouldShowBanner). tRPC `pessoas.getBatchSignals` pra lookup em lote. Novos componentes em `src/components/pessoas/`: `IntelDot`, `PessoaPeek`, `BannerInteligencia`, `VincularPessoaPopover`. Upgrade do `PessoaChip` v2. Integração cirúrgica no sheet/modal da agenda (liberados). Aba "Pessoas" em `/admin/processos/[id]`.

**Tech Stack:** PostgreSQL (materialized view) · tRPC · React 19 · Radix UI · Vitest + RTL + happy-dom.

**Spec de referência:** `docs/plans/2026-04-18-pessoas-fase1b-apresentacao-design.md`

---

## File Structure

```
src/
├── lib/pessoas/
│   ├── intel-config.ts           [modify: +thresholds DOT/BANNER/PEEK/STALENESS]
│   ├── compute-dot-level.ts      [new pure helper]
│   └── should-show-banner.ts     [new pure helper]
├── lib/trpc/routers/pessoas.ts   [modify: +getBatchSignals procedure]
├── hooks/
│   └── use-pessoa-signals.ts     [new hook batch lookup]
├── components/pessoas/
│   ├── intel-dot.tsx             [new]
│   ├── pessoa-chip.tsx           [modify: v2 com dot + peek + ambiguityMark]
│   ├── pessoa-peek.tsx           [new]
│   ├── banner-inteligencia.tsx   [new]
│   ├── vincular-pessoa-popover.tsx [new]
│   └── index.ts                  [modify: +novos exports]
├── components/agenda/event-detail-sheet.tsx  [modify: chips + banner em Depoentes]
├── components/agenda/registro-audiencia/registro-modal.tsx [modify: chips juiz/MP header]
└── app/(dashboard)/admin/processos/[id]/
    └── _components/pessoas-tab.tsx [new — aba colapsável agrupada]

drizzle/
└── NNNN_pessoas_intel_signals.sql  [new migration — materialized view + trigger]

__tests__/
├── unit/
│   ├── compute-dot-level.test.ts
│   └── should-show-banner.test.ts
└── components/pessoas/
    ├── intel-dot.test.tsx
    ├── pessoa-peek.test.tsx
    ├── banner-inteligencia.test.tsx
    └── vincular-pessoa-popover.test.tsx
```

---

## Task 1: Materialized view `pessoas_intel_signals` + refresh

**Files:**
- Create: `drizzle/NNNN_pessoas_intel_signals.sql` (próximo número sequencial)

- [ ] **Step 1: Descobrir próximo número**

Run: `ls -1 /Users/rodrigorochameire/projetos/Defender/drizzle/*.sql | tail -3`

Use próximo número (ex: se último for 0036, criar 0037).

- [ ] **Step 2: Criar SQL**

```sql
-- Materialized view pre-computing intelligence signals per pessoa
DROP MATERIALIZED VIEW IF EXISTS pessoas_intel_signals;

CREATE MATERIALIZED VIEW pessoas_intel_signals AS
SELECT
  p.id AS pessoa_id,
  p.workspace_id,
  COALESCE(COUNT(DISTINCT pp.processo_id), 0)::int AS total_casos,
  COALESCE(COUNT(DISTINCT pp.processo_id) FILTER (
    WHERE pp.created_at >= now() - INTERVAL '6 months'
  ), 0)::int AS casos_recentes_6m,
  COALESCE(COUNT(DISTINCT pp.processo_id) FILTER (
    WHERE pp.created_at >= now() - INTERVAL '12 months'
  ), 0)::int AS casos_recentes_12m,
  COALESCE(jsonb_object_agg(pp.papel, pp_count)
    FILTER (WHERE pp.papel IS NOT NULL), '{}'::jsonb) AS papeis_count,
  (
    SELECT pp2.papel
    FROM participacoes_processo pp2
    WHERE pp2.pessoa_id = p.id
    GROUP BY pp2.papel
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) AS papel_primario,
  COALESCE(COUNT(*) FILTER (WHERE pp.lado = 'acusacao'), 0)::int AS lado_acusacao,
  COALESCE(COUNT(*) FILTER (WHERE pp.lado = 'defesa'), 0)::int AS lado_defesa,
  MAX(pp.created_at) AS last_seen_at,
  MIN(pp.created_at) AS first_seen_at,
  EXISTS(
    SELECT 1 FROM pessoas p2
    WHERE p2.id != p.id
      AND p2.nome_normalizado = p.nome_normalizado
      AND p2.merged_into IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM pessoas_distincts_confirmed pdc
        WHERE (pdc.pessoa_a_id = LEAST(p.id, p2.id) AND pdc.pessoa_b_id = GREATEST(p.id, p2.id))
      )
  ) AS ambiguity_flag,
  0::int AS contradicoes_conhecidas,
  0::int AS consistencias_detectadas,
  false AS high_value_flag
FROM pessoas p
LEFT JOIN LATERAL (
  SELECT papel, COUNT(*)::int AS pp_count
  FROM participacoes_processo
  WHERE pessoa_id = p.id
  GROUP BY papel
) AS papel_agg ON true
LEFT JOIN participacoes_processo pp ON pp.pessoa_id = p.id
WHERE p.merged_into IS NULL
GROUP BY p.id, p.workspace_id;

CREATE UNIQUE INDEX pessoas_intel_signals_pk ON pessoas_intel_signals(pessoa_id);
CREATE INDEX pessoas_intel_signals_workspace ON pessoas_intel_signals(workspace_id);
CREATE INDEX pessoas_intel_signals_papel_primario ON pessoas_intel_signals(papel_primario);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_pessoas_intel_signals()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY pessoas_intel_signals;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 3: Apply migration**

Criar `/Users/rodrigorochameire/projetos/Defender/apply-intel-signals.mjs` (temporário):

```js
import { readFileSync } from "node:fs";
import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const content = readFileSync(process.argv[2], "utf-8");

// Split preservando CREATE OR REPLACE FUNCTION blocks
const statements = [];
let current = "";
let inFunc = false;
for (const line of content.split("\n")) {
  if (/CREATE\s+OR\s+REPLACE\s+FUNCTION|CREATE\s+FUNCTION/i.test(line)) inFunc = true;
  current += line + "\n";
  if (inFunc && /LANGUAGE\s+plpgsql/i.test(line)) {
    inFunc = false;
    statements.push(current.trim());
    current = "";
    continue;
  }
  if (!inFunc && line.trim().endsWith(";")) {
    statements.push(current.trim());
    current = "";
  }
}

for (const s of statements) {
  if (!s) continue;
  console.log("Exec:", s.split("\n")[0].slice(0, 80));
  await sql.unsafe(s);
}

const check = await sql`SELECT COUNT(*)::int AS n FROM pessoas_intel_signals`;
console.log("pessoas_intel_signals rows:", check[0].n);

await sql.end();
```

Run: `cd ~/projetos/Defender && node apply-intel-signals.mjs drizzle/NNNN_pessoas_intel_signals.sql`
Expected: rows > 0 (tem pessoas no DB do backfill).

Run: `rm apply-intel-signals.mjs`

- [ ] **Step 4: Commit**

```bash
git add drizzle/*_pessoas_intel_signals.sql
git commit -m "feat(pessoas): materialized view pessoas_intel_signals"
```

---

## Task 2: `INTEL_CONFIG` thresholds

**Files:**
- Modify: `src/lib/pessoas/intel-config.ts`

- [ ] **Step 1: Adicionar thresholds**

Abra `src/lib/pessoas/intel-config.ts`. Ao final do arquivo, adicione:

```ts
/**
 * Thresholds e parâmetros calibráveis da Fase I-B.
 * Ajustar aqui permite iterar sem tocar componentes.
 */
export const INTEL_CONFIG = {
  dot: {
    subtleMin: 2,              // >= N casos → dot subtle
    normalMin: 3,              // >= N casos → dot normal
    emeraldCasosMin: 5,        // >= N casos
    emeraldConsistenciasMin: 3, // + >= N consistencias (Fase IV)
  },
  banner: {
    // Banner só liga se há >= 1 pessoa com qualquer critério abaixo
    contradicoesMin: 1,        // >= N contradições (Fase IV)
    casosMin: 3,               // >= N casos totais
    sameComarcaMin: 2,         // + >= N casos na mesma comarca
    maxItems: 3,               // máx. de pessoas listadas collapsed
    dismissDurationDays: 30,
  },
  peek: {
    delayMs: 250,              // delay antes de abrir peek
    fadeOutMs: 100,            // fade out on mouseleave
    showOnTouch: false,        // mobile vai direto pra sheet
  },
  staleness: {
    signalTTLSeconds: 300,     // cache client 5min
    cronHour: 3,               // refresh diário 03:00 local time
  },
} as const;
```

- [ ] **Step 2: Typecheck**

Run: `cd ~/projetos/Defender && npm run typecheck`
Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pessoas/intel-config.ts
git commit -m "feat(pessoas): INTEL_CONFIG thresholds I-B"
```

---

## Task 3: `computeDotLevel` + `shouldShowBanner` helpers (TDD)

**Files:**
- Create: `src/lib/pessoas/compute-dot-level.ts`
- Create: `src/lib/pessoas/should-show-banner.ts`
- Create: `__tests__/unit/compute-dot-level.test.ts`
- Create: `__tests__/unit/should-show-banner.test.ts`

- [ ] **Step 1: Write failing test — computeDotLevel**

```ts
// __tests__/unit/compute-dot-level.test.ts
import { describe, it, expect } from "vitest";
import { computeDotLevel, type IntelSignal } from "@/lib/pessoas/compute-dot-level";

function sig(partial: Partial<IntelSignal>): IntelSignal {
  return {
    pessoaId: 1,
    totalCasos: 0,
    casosRecentes6m: 0,
    casosRecentes12m: 0,
    papeisCount: {},
    papelPrimario: null,
    ladoAcusacao: 0,
    ladoDefesa: 0,
    lastSeenAt: null,
    firstSeenAt: null,
    sameComarcaCount: 0,
    ambiguityFlag: false,
    contradicoesConhecidas: 0,
    consistenciasDetectadas: 0,
    highValueFlag: false,
    ...partial,
  };
}

describe("computeDotLevel", () => {
  it("papel estável (juiz) retorna none", () => {
    expect(computeDotLevel(sig({ papelPrimario: "juiz", totalCasos: 20 }))).toBe("none");
  });

  it("papel estável (promotor) retorna none mesmo com contradições", () => {
    expect(computeDotLevel(sig({ papelPrimario: "promotor", totalCasos: 10, contradicoesConhecidas: 5 }))).toBe("none");
  });

  it("contradição em rotativo → amber", () => {
    expect(computeDotLevel(sig({ papelPrimario: "testemunha", totalCasos: 3, contradicoesConhecidas: 1 }))).toBe("amber");
  });

  it("highValueFlag → red", () => {
    expect(computeDotLevel(sig({ papelPrimario: "testemunha", totalCasos: 3, highValueFlag: true }))).toBe("red");
  });

  it("5+ casos com 3+ consistencias → emerald", () => {
    expect(computeDotLevel(sig({
      papelPrimario: "policial-militar", totalCasos: 7, consistenciasDetectadas: 4
    }))).toBe("emerald");
  });

  it("3+ casos → normal", () => {
    expect(computeDotLevel(sig({ papelPrimario: "testemunha", totalCasos: 3 }))).toBe("normal");
  });

  it("2 casos → subtle", () => {
    expect(computeDotLevel(sig({ papelPrimario: "vitima", totalCasos: 2 }))).toBe("subtle");
  });

  it("1 caso → none", () => {
    expect(computeDotLevel(sig({ papelPrimario: "testemunha", totalCasos: 1 }))).toBe("none");
  });

  it("0 casos → none", () => {
    expect(computeDotLevel(sig({ papelPrimario: "testemunha", totalCasos: 0 }))).toBe("none");
  });

  it("papelPrimario null → usa heurística de contagem (não bloqueia)", () => {
    expect(computeDotLevel(sig({ papelPrimario: null, totalCasos: 3 }))).toBe("normal");
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `cd ~/projetos/Defender && npm run test __tests__/unit/compute-dot-level.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/pessoas/compute-dot-level.ts
import { PAPEIS_ROTATIVOS } from "./intel-config";
import { INTEL_CONFIG } from "./intel-config";

export type DotLevel = "none" | "subtle" | "normal" | "emerald" | "amber" | "red";

export interface IntelSignal {
  pessoaId: number;
  totalCasos: number;
  casosRecentes6m: number;
  casosRecentes12m: number;
  papeisCount: Record<string, number>;
  papelPrimario: string | null;
  ladoAcusacao: number;
  ladoDefesa: number;
  lastSeenAt: Date | string | null;
  firstSeenAt: Date | string | null;
  sameComarcaCount: number;
  ambiguityFlag: boolean;
  contradicoesConhecidas: number;
  consistenciasDetectadas: number;
  highValueFlag: boolean;
}

/**
 * Papéis estáveis (juiz, promotor, servidor) nunca sinalizam em comarca única.
 * Rotativos ganham dot conforme thresholds INTEL_CONFIG.dot.
 */
export function computeDotLevel(s: IntelSignal): DotLevel {
  // Papéis estáveis sempre silenciosos (titularidade fixa = ruído)
  if (s.papelPrimario && !PAPEIS_ROTATIVOS.has(s.papelPrimario)) return "none";

  if (s.contradicoesConhecidas >= 1) return "amber";
  if (s.highValueFlag) return "red";

  const { emeraldCasosMin, emeraldConsistenciasMin, normalMin, subtleMin } = INTEL_CONFIG.dot;

  if (s.totalCasos >= emeraldCasosMin && s.consistenciasDetectadas >= emeraldConsistenciasMin) {
    return "emerald";
  }
  if (s.totalCasos >= normalMin) return "normal";
  if (s.totalCasos >= subtleMin) return "subtle";
  return "none";
}
```

- [ ] **Step 4: Run — PASS**

Expected: 10 PASS.

- [ ] **Step 5: Write failing test — shouldShowBanner**

```ts
// __tests__/unit/should-show-banner.test.ts
import { describe, it, expect } from "vitest";
import { shouldShowBanner, filterBannerPessoas } from "@/lib/pessoas/should-show-banner";
import type { IntelSignal } from "@/lib/pessoas/compute-dot-level";

function sig(partial: Partial<IntelSignal>): IntelSignal {
  return {
    pessoaId: 1,
    totalCasos: 0,
    casosRecentes6m: 0, casosRecentes12m: 0,
    papeisCount: {}, papelPrimario: "testemunha",
    ladoAcusacao: 0, ladoDefesa: 0,
    lastSeenAt: null, firstSeenAt: null,
    sameComarcaCount: 0, ambiguityFlag: false,
    contradicoesConhecidas: 0, consistenciasDetectadas: 0, highValueFlag: false,
    ...partial,
  };
}

describe("shouldShowBanner", () => {
  it("retorna false com 0 sinais", () => {
    expect(shouldShowBanner([])).toBe(false);
  });

  it("retorna false quando nenhum atinge threshold", () => {
    expect(shouldShowBanner([sig({ totalCasos: 1 }), sig({ totalCasos: 2 })])).toBe(false);
  });

  it("liga com ≥3 casos + ≥2 na mesma comarca", () => {
    expect(shouldShowBanner([sig({ totalCasos: 4, sameComarcaCount: 2 })])).toBe(true);
  });

  it("liga com contradição conhecida", () => {
    expect(shouldShowBanner([sig({ totalCasos: 1, contradicoesConhecidas: 1 })])).toBe(true);
  });

  it("papel estável não conta mesmo com contradição", () => {
    expect(shouldShowBanner([sig({ papelPrimario: "juiz", totalCasos: 10, contradicoesConhecidas: 1 })])).toBe(false);
  });
});

describe("filterBannerPessoas", () => {
  it("retorna apenas rotativos que passam threshold", () => {
    const signals = [
      sig({ pessoaId: 1, totalCasos: 4, sameComarcaCount: 2 }),       // passa
      sig({ pessoaId: 2, totalCasos: 1 }),                              // não passa
      sig({ pessoaId: 3, papelPrimario: "juiz", contradicoesConhecidas: 1 }), // estável — filtrado
      sig({ pessoaId: 4, contradicoesConhecidas: 1 }),                  // passa
    ];
    const result = filterBannerPessoas(signals);
    expect(result.map((s) => s.pessoaId)).toEqual([1, 4]);
  });
});
```

- [ ] **Step 6: Run — FAIL**

- [ ] **Step 7: Implement**

```ts
// src/lib/pessoas/should-show-banner.ts
import { PAPEIS_ROTATIVOS, INTEL_CONFIG } from "./intel-config";
import type { IntelSignal } from "./compute-dot-level";

function passaThreshold(s: IntelSignal): boolean {
  // Papéis estáveis nunca entram no banner
  if (s.papelPrimario && !PAPEIS_ROTATIVOS.has(s.papelPrimario)) return false;
  const { contradicoesMin, casosMin, sameComarcaMin } = INTEL_CONFIG.banner;
  if (s.contradicoesConhecidas >= contradicoesMin) return true;
  if (s.totalCasos >= casosMin && s.sameComarcaCount >= sameComarcaMin) return true;
  return false;
}

export function shouldShowBanner(signals: IntelSignal[]): boolean {
  return signals.some(passaThreshold);
}

export function filterBannerPessoas(signals: IntelSignal[]): IntelSignal[] {
  return signals.filter(passaThreshold);
}
```

- [ ] **Step 8: Run — PASS** (expected: 6 tests across 2 files)

- [ ] **Step 9: Commit**

```bash
git add src/lib/pessoas/compute-dot-level.ts src/lib/pessoas/should-show-banner.ts __tests__/unit/compute-dot-level.test.ts __tests__/unit/should-show-banner.test.ts
git commit -m "feat(pessoas): computeDotLevel + shouldShowBanner helpers"
```

---

## Task 4: tRPC `getBatchSignals` procedure (TDD)

**Files:**
- Modify: `src/lib/trpc/routers/pessoas.ts`
- Modify: `__tests__/trpc/pessoas-router.test.ts`

- [ ] **Step 1: Append test**

```ts
describe("pessoas.getBatchSignals", { timeout: 30000 }, () => {
  it("retorna signals por pessoaId batch", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const p = await caller.pessoas.create({ nome: "Test BatchSignal " + Date.now(), fonteCriacao: "manual" });
      try {
        // Refresh MV pra garantir pessoa recém-criada apareça
        await db.execute(sql`REFRESH MATERIALIZED VIEW pessoas_intel_signals`);
        const result = await caller.pessoas.getBatchSignals({ pessoaIds: [p.id] });
        expect(result).toHaveLength(1);
        expect(result[0].pessoaId).toBe(p.id);
        expect(result[0].totalCasos).toBe(0);
      } finally {
        await db.delete(pessoas).where(eq(pessoas.id, p.id));
      }
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("retorna vazio para ids inexistentes", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const result = await caller.pessoas.getBatchSignals({ pessoaIds: [999999999] });
      expect(result).toEqual([]);
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("aceita lista vazia", async () => {
    const user = await makeUser();
    try {
      const caller = createCaller(mkCtx(user));
      const result = await caller.pessoas.getBatchSignals({ pessoaIds: [] });
      expect(result).toEqual([]);
    } finally {
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Add procedure**

Em `src/lib/trpc/routers/pessoas.ts`, antes do `});` final do `router({...})`, adicionar:

```ts
  getBatchSignals: protectedProcedure
    .input(z.object({
      pessoaIds: z.array(z.number()).max(500).default([]),
    }))
    .query(async ({ input }) => {
      if (input.pessoaIds.length === 0) return [];
      const rows = await db.execute<{
        pessoa_id: number;
        total_casos: number;
        casos_recentes_6m: number;
        casos_recentes_12m: number;
        papeis_count: Record<string, number>;
        papel_primario: string | null;
        lado_acusacao: number;
        lado_defesa: number;
        last_seen_at: Date | null;
        first_seen_at: Date | null;
        ambiguity_flag: boolean;
        contradicoes_conhecidas: number;
        consistencias_detectadas: number;
        high_value_flag: boolean;
      }>(sql`
        SELECT
          pessoa_id, total_casos, casos_recentes_6m, casos_recentes_12m,
          papeis_count, papel_primario, lado_acusacao, lado_defesa,
          last_seen_at, first_seen_at, ambiguity_flag,
          contradicoes_conhecidas, consistencias_detectadas, high_value_flag
        FROM pessoas_intel_signals
        WHERE pessoa_id IN ${sql(input.pessoaIds)}
      `);

      const data = (rows as any).rows ?? rows;
      return data.map((r: any) => ({
        pessoaId: r.pessoa_id,
        totalCasos: r.total_casos,
        casosRecentes6m: r.casos_recentes_6m,
        casosRecentes12m: r.casos_recentes_12m,
        papeisCount: r.papeis_count,
        papelPrimario: r.papel_primario,
        ladoAcusacao: r.lado_acusacao,
        ladoDefesa: r.lado_defesa,
        lastSeenAt: r.last_seen_at,
        firstSeenAt: r.first_seen_at,
        sameComarcaCount: 0,  // calculado client-side com processo atual
        ambiguityFlag: r.ambiguity_flag,
        contradicoesConhecidas: r.contradicoes_conhecidas,
        consistenciasDetectadas: r.consistencias_detectadas,
        highValueFlag: r.high_value_flag,
      }));
    }),
```

- [ ] **Step 4: Run — PASS** (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/pessoas.ts __tests__/trpc/pessoas-router.test.ts
git commit -m "feat(pessoas): tRPC getBatchSignals procedure"
```

---

## Task 5: `IntelDot` component (TDD)

**Files:**
- Create: `src/components/pessoas/intel-dot.tsx`
- Modify: `src/components/pessoas/index.ts`
- Create: `__tests__/components/pessoas/intel-dot.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/components/pessoas/intel-dot.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { IntelDot } from "@/components/pessoas/intel-dot";

afterEach(() => cleanup());

describe("IntelDot", () => {
  it("não renderiza quando level=none", () => {
    const { container } = render(<IntelDot level="none" />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza subtle (neutral-300)", () => {
    const { container } = render(<IntelDot level="subtle" />);
    const el = container.firstElementChild;
    expect(el).toBeTruthy();
    expect(el?.className ?? "").toMatch(/neutral-300/);
  });

  it("renderiza normal (neutral-500)", () => {
    const { container } = render(<IntelDot level="normal" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/neutral-500/);
  });

  it("renderiza emerald", () => {
    const { container } = render(<IntelDot level="emerald" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/emerald/);
  });

  it("renderiza amber", () => {
    const { container } = render(<IntelDot level="amber" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/amber/);
  });

  it("renderiza red", () => {
    const { container } = render(<IntelDot level="red" />);
    expect(container.firstElementChild?.className ?? "").toMatch(/rose-600/);
  });

  it("aria-label descritivo", () => {
    const { container } = render(<IntelDot level="amber" aria-label="Contradição" />);
    expect(container.firstElementChild?.getAttribute("aria-label")).toBe("Contradição");
  });
});
```

- [ ] **Step 2: Run — FAIL**

Run: `npm run test __tests__/components/pessoas/intel-dot.test.tsx`

- [ ] **Step 3: Implement**

```tsx
// src/components/pessoas/intel-dot.tsx
"use client";

import { cn } from "@/lib/utils";
import type { DotLevel } from "@/lib/pessoas/compute-dot-level";

interface Props {
  level: DotLevel;
  size?: "xs" | "sm";
  "aria-label"?: string;
  className?: string;
}

const LEVEL_CLASSES: Record<Exclude<DotLevel, "none">, string> = {
  subtle: "bg-neutral-300 dark:bg-neutral-600 opacity-70",
  normal: "bg-neutral-500 dark:bg-neutral-400",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-600 ring-2 ring-rose-100 dark:ring-rose-950/40",
};

const LEVEL_DEFAULT_LABEL: Record<Exclude<DotLevel, "none">, string> = {
  subtle: "Poucas aparições anteriores",
  normal: "Múltiplas aparições anteriores",
  emerald: "Pessoa consistente em múltiplos depoimentos",
  amber: "Contradição registrada em caso anterior",
  red: "Alto valor estratégico",
};

export function IntelDot({ level, size = "sm", ...rest }: Props) {
  if (level === "none") return null;
  const sz = size === "xs" ? "w-[3px] h-[3px]" : "w-1 h-1";
  return (
    <span
      role="img"
      aria-label={rest["aria-label"] ?? LEVEL_DEFAULT_LABEL[level]}
      className={cn(
        "inline-block rounded-full shrink-0",
        sz,
        LEVEL_CLASSES[level],
        rest.className,
      )}
    />
  );
}
```

Atualize `src/components/pessoas/index.ts`:

```ts
export { IntelDot } from "./intel-dot";
```

- [ ] **Step 4: Run — PASS** (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/pessoas/intel-dot.tsx src/components/pessoas/index.ts __tests__/components/pessoas/intel-dot.test.tsx
git commit -m "feat(pessoas): IntelDot atômico (6 levels)"
```

---

## Task 6: Hook `usePessoaSignals` batch lookup

**Files:**
- Create: `src/hooks/use-pessoa-signals.ts`

- [ ] **Step 1: Implementar**

```ts
// src/hooks/use-pessoa-signals.ts
"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import type { IntelSignal } from "@/lib/pessoas/compute-dot-level";

/**
 * Hook batch-lookup de IntelSignals por pessoaId.
 * Cliente agrupa todos os chips de uma página em uma única query.
 * Cache tRPC per-session.
 */
export function usePessoaSignals(pessoaIds: Array<number | null | undefined>): {
  getSignal: (id: number | null | undefined) => IntelSignal | null;
  isLoading: boolean;
} {
  const uniqueIds = useMemo(() => {
    return Array.from(new Set(pessoaIds.filter((id): id is number => typeof id === "number")));
  }, [pessoaIds]);

  const { data, isLoading } = trpc.pessoas.getBatchSignals.useQuery(
    { pessoaIds: uniqueIds },
    { enabled: uniqueIds.length > 0, staleTime: 5 * 60 * 1000 },
  );

  const map = useMemo(() => {
    const m = new Map<number, IntelSignal>();
    for (const s of data ?? []) m.set(s.pessoaId, s as IntelSignal);
    return m;
  }, [data]);

  return {
    getSignal: (id) => (typeof id === "number" ? map.get(id) ?? null : null),
    isLoading,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 new errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-pessoa-signals.ts
git commit -m "feat(pessoas): usePessoaSignals hook batch-lookup"
```

---

## Task 7: `PessoaChip` v2 (upgrade com dot + ambiguity)

**Files:**
- Modify: `src/components/pessoas/pessoa-chip.tsx`
- Modify: `__tests__/components/pessoas/pessoa-chip.test.tsx` (acrescentar testes)

- [ ] **Step 1: Adicionar testes v2**

Append ao arquivo de teste existente:

```tsx
describe("PessoaChip v2 (I-B)", () => {
  it("renderiza dot quando dotLevel !== none", () => {
    const { container } = render(
      <PessoaChip nome="Maria" dotLevel="normal" />
    );
    // IntelDot é um <span> rounded
    expect(container.querySelector('[role="img"]')).toBeTruthy();
  });

  it("não renderiza dot quando dotLevel=none", () => {
    const { container } = render(
      <PessoaChip nome="João" dotLevel="none" />
    );
    expect(container.querySelector('[role="img"]')).toBeNull();
  });

  it("mostra '?' quando ambiguityMark=true", () => {
    render(<PessoaChip nome="Comum" ambiguityMark />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("showDot=false não renderiza dot mesmo com level", () => {
    const { container } = render(
      <PessoaChip nome="X" dotLevel="normal" showDot={false} />
    );
    expect(container.querySelector('[role="img"]')).toBeNull();
  });
});
```

Note: `import { screen } from "@testing-library/react"` já está no arquivo.

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Update `PessoaChip`**

Em `src/components/pessoas/pessoa-chip.tsx`, atualizar a interface e o conteúdo:

```tsx
// Adicionar imports:
import { IntelDot } from "./intel-dot";
import type { DotLevel } from "@/lib/pessoas/compute-dot-level";

// Atualizar interface:
export interface PessoaChipProps {
  pessoaId?: number;
  nome?: string;
  papel?: string;
  size?: "xs" | "sm" | "md";
  clickable?: boolean;
  onClick?: (resolved: { id?: number; nome: string }) => void;
  className?: string;
  // NOVO em v2:
  dotLevel?: DotLevel;        // se fornecido, renderiza IntelDot
  showDot?: boolean;          // default true; false → nunca renderiza mesmo com level
  ambiguityMark?: boolean;    // default false; se true mostra "?" pequeno
}
```

Atualizar corpo:
```tsx
export function PessoaChip({
  pessoaId, nome, papel, size = "sm", clickable = true, onClick, className,
  dotLevel, showDot = true, ambiguityMark = false,
}: PessoaChipProps) {
  // ... código existente até content ...

  const content = (
    <>
      <User className={size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      <span className="truncate max-w-[200px]">{nome ?? "(sem nome)"}</span>
      {papel && <span className="text-[9px] opacity-70">{papel.replace(/-/g, " ")}</span>}
      {showDot && dotLevel && dotLevel !== "none" && (
        <IntelDot level={dotLevel} size={size === "xs" ? "xs" : "sm"} />
      )}
      {ambiguityMark && (
        <span
          className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400"
          aria-label="Possível duplicata — ver merge-queue"
        >
          ?
        </span>
      )}
    </>
  );

  // resto igual
}
```

- [ ] **Step 4: Run — PASS** (7 originais + 4 novos = 11)

- [ ] **Step 5: Commit**

```bash
git add src/components/pessoas/pessoa-chip.tsx __tests__/components/pessoas/pessoa-chip.test.tsx
git commit -m "feat(pessoas): PessoaChip v2 com dotLevel + ambiguityMark"
```

---

## Task 8: `PessoaPeek` component (TDD)

**Files:**
- Create: `src/components/pessoas/pessoa-peek.tsx`
- Modify: `src/components/pessoas/index.ts`
- Create: `__tests__/components/pessoas/pessoa-peek.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/components/pessoas/pessoa-peek.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { PessoaPeek } from "@/components/pessoas/pessoa-peek";

afterEach(() => cleanup());

const baseSignal = {
  pessoaId: 1,
  totalCasos: 3,
  casosRecentes6m: 1, casosRecentes12m: 2,
  papeisCount: { testemunha: 3 },
  papelPrimario: "testemunha" as string | null,
  ladoAcusacao: 2, ladoDefesa: 1,
  lastSeenAt: new Date("2025-11-15"), firstSeenAt: new Date("2024-03-01"),
  sameComarcaCount: 2, ambiguityFlag: false,
  contradicoesConhecidas: 0, consistenciasDetectadas: 0, highValueFlag: false,
};

describe("PessoaPeek", () => {
  it("renderiza nome + papel", () => {
    render(<PessoaPeek nome="Maria Silva" signal={baseSignal as any} />);
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText(/testemunha/i)).toBeInTheDocument();
  });

  it("mostra contagem de casos", () => {
    render(<PessoaPeek nome="Maria" signal={baseSignal as any} />);
    expect(screen.getByText(/3 casos/i)).toBeInTheDocument();
  });

  it("mostra distribuição acusação/defesa", () => {
    render(<PessoaPeek nome="Maria" signal={baseSignal as any} />);
    expect(screen.getByText(/2 acusação/i)).toBeInTheDocument();
    expect(screen.getByText(/1 defesa/i)).toBeInTheDocument();
  });

  it("destaca mesma comarca quando > 0", () => {
    render(<PessoaPeek nome="Maria" signal={baseSignal as any} />);
    expect(screen.getByText(/2 casos na mesma comarca/i)).toBeInTheDocument();
  });

  it("mostra alerta de ambiguidade quando flag ativa", () => {
    const sig = { ...baseSignal, ambiguityFlag: true };
    render(<PessoaPeek nome="João" signal={sig as any} />);
    expect(screen.getByText(/possível duplicata/i)).toBeInTheDocument();
  });

  it("sem signal retorna null", () => {
    const { container } = render(<PessoaPeek nome="X" signal={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/pessoas/pessoa-peek.tsx
"use client";

import { User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { IntelSignal } from "@/lib/pessoas/compute-dot-level";

interface Props {
  nome: string;
  signal: IntelSignal | null;
}

export function PessoaPeek({ nome, signal }: Props) {
  if (!signal) return null;

  const dataFormatada = signal.lastSeenAt
    ? format(new Date(signal.lastSeenAt), "MMM/yy", { locale: ptBR })
    : null;

  const total = signal.totalCasos;

  return (
    <div
      role="tooltip"
      className="w-60 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md p-3 text-xs"
    >
      <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-neutral-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold truncate">{nome}</div>
          {signal.papelPrimario && (
            <div className="text-[10px] text-neutral-500">{signal.papelPrimario.replace(/-/g, " ")}</div>
          )}
        </div>
      </div>

      <div className="pt-2 space-y-1 leading-relaxed">
        <div>
          <strong className="text-neutral-800 dark:text-neutral-200">{total} caso{total !== 1 ? "s" : ""}</strong>
          {(signal.ladoAcusacao > 0 || signal.ladoDefesa > 0) && (
            <span className="text-neutral-500">
              {" · "}
              {signal.ladoAcusacao > 0 && `${signal.ladoAcusacao} acusação`}
              {signal.ladoAcusacao > 0 && signal.ladoDefesa > 0 && ", "}
              {signal.ladoDefesa > 0 && `${signal.ladoDefesa} defesa`}
            </span>
          )}
        </div>
        {dataFormatada && (
          <div className="text-neutral-500">Última: <strong className="text-neutral-700 dark:text-neutral-300">{dataFormatada}</strong></div>
        )}
        {signal.sameComarcaCount > 0 && (
          <div className="text-emerald-600 dark:text-emerald-400 font-medium">
            ✦ {signal.sameComarcaCount} caso{signal.sameComarcaCount !== 1 ? "s" : ""} na mesma comarca
          </div>
        )}
        {signal.ambiguityFlag && (
          <div className="text-amber-600 dark:text-amber-400 pt-1">
            ? Possível duplicata — ver merge-queue
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[10px] text-blue-600 dark:text-blue-400">
        Clique para abrir dossiê →
      </div>
    </div>
  );
}
```

Atualizar `index.ts`:
```ts
export { PessoaPeek } from "./pessoa-peek";
```

- [ ] **Step 4: Run — PASS** (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/pessoas/pessoa-peek.tsx src/components/pessoas/index.ts __tests__/components/pessoas/pessoa-peek.test.tsx
git commit -m "feat(pessoas): PessoaPeek tooltip card"
```

---

## Task 9: `BannerInteligencia` com dismissibilidade (TDD)

**Files:**
- Create: `src/components/pessoas/banner-inteligencia.tsx`
- Modify: `src/components/pessoas/index.ts`
- Create: `__tests__/components/pessoas/banner-inteligencia.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/components/pessoas/banner-inteligencia.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BannerInteligencia } from "@/components/pessoas/banner-inteligencia";

afterEach(() => cleanup());
beforeEach(() => localStorage.clear());

const mkSignal = (overrides: any) => ({
  pessoaId: 1, totalCasos: 0, casosRecentes6m: 0, casosRecentes12m: 0,
  papeisCount: {}, papelPrimario: "testemunha", ladoAcusacao: 0, ladoDefesa: 0,
  lastSeenAt: null, firstSeenAt: null, sameComarcaCount: 0, ambiguityFlag: false,
  contradicoesConhecidas: 0, consistenciasDetectadas: 0, highValueFlag: false,
  ...overrides,
});

const nomeMap = new Map([[1, "Maria"], [2, "João"], [3, "PM Souza"]]);

describe("BannerInteligencia", () => {
  it("não renderiza quando sem sinais que passem threshold", () => {
    const { container } = render(
      <BannerInteligencia
        contextType="processo" contextId={100}
        signals={[mkSignal({ pessoaId: 1, totalCasos: 1 })]}
        getNome={(id) => nomeMap.get(id) ?? ""}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza collapsed quando há sinais de alto valor", () => {
    render(
      <BannerInteligencia
        contextType="processo" contextId={100}
        signals={[mkSignal({ pessoaId: 1, totalCasos: 4, sameComarcaCount: 2 })]}
        getNome={(id) => nomeMap.get(id) ?? ""}
      />
    );
    expect(screen.getByText(/inteligência detectada/i)).toBeInTheDocument();
  });

  it("expande ao clicar em ▾", () => {
    render(
      <BannerInteligencia
        contextType="processo" contextId={100}
        signals={[mkSignal({ pessoaId: 1, totalCasos: 4, sameComarcaCount: 2 })]}
        getNome={(id) => nomeMap.get(id) ?? ""}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /expandir|ver/i }));
    expect(screen.getByText("Maria")).toBeInTheDocument();
  });

  it("dispensa e grava em localStorage", () => {
    const { container } = render(
      <BannerInteligencia
        contextType="processo" contextId={100}
        signals={[mkSignal({ pessoaId: 1, totalCasos: 4, sameComarcaCount: 2 })]}
        getNome={(id) => nomeMap.get(id) ?? ""}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /dispensar|fechar/i }));
    expect(container.firstChild).toBeNull();
    expect(localStorage.getItem("banner-inteligencia-dismissed-processo-100")).toBeTruthy();
  });

  it("respeita dismiss do localStorage (não renderiza)", () => {
    localStorage.setItem(
      "banner-inteligencia-dismissed-processo-100",
      String(Date.now() + 10 * 86400000), // expira em 10 dias
    );
    const { container } = render(
      <BannerInteligencia
        contextType="processo" contextId={100}
        signals={[mkSignal({ pessoaId: 1, totalCasos: 4, sameComarcaCount: 2 })]}
        getNome={(id) => nomeMap.get(id) ?? ""}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/pessoas/banner-inteligencia.tsx
"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterBannerPessoas } from "@/lib/pessoas/should-show-banner";
import { INTEL_CONFIG } from "@/lib/pessoas/intel-config";
import { computeDotLevel, type IntelSignal } from "@/lib/pessoas/compute-dot-level";
import { PessoaChip } from "./pessoa-chip";

interface Props {
  contextType: "processo" | "audiencia" | "atendimento";
  contextId: number;
  signals: IntelSignal[];
  getNome: (pessoaId: number) => string;
  onPessoaClick?: (pessoaId: number) => void;
}

function storageKey(t: string, id: number) {
  return `banner-inteligencia-dismissed-${t}-${id}`;
}

export function BannerInteligencia({ contextType, contextId, signals, getNome, onPessoaClick }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(contextType, contextId));
    if (!raw) return;
    const expireAt = Number(raw);
    if (!Number.isFinite(expireAt)) return;
    if (Date.now() < expireAt) setDismissed(true);
  }, [contextType, contextId]);

  const filtered = filterBannerPessoas(signals);
  if (dismissed || filtered.length === 0) return null;

  const handleDismiss = () => {
    const expireAt = Date.now() + INTEL_CONFIG.banner.dismissDurationDays * 86400_000;
    localStorage.setItem(storageKey(contextType, contextId), String(expireAt));
    setDismissed(true);
  };

  return (
    <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 border-l-[3px] border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-950/30 dark:to-emerald-950/10">
      <div className="flex items-center gap-2 px-3 py-2">
        <Search className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
        <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 flex-1">
          Inteligência detectada ({filtered.length})
        </span>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Recolher" : "Expandir detalhes"}
          className="w-5 h-5 flex items-center justify-center cursor-pointer text-emerald-700 dark:text-emerald-400"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar"
          className="w-5 h-5 flex items-center justify-center cursor-pointer text-emerald-700/60 dark:text-emerald-400/60 hover:text-emerald-700"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-emerald-200 dark:border-emerald-900 px-3 py-2 space-y-1.5">
          {filtered.slice(0, INTEL_CONFIG.banner.maxItems).map((s) => {
            const nome = getNome(s.pessoaId);
            const level = computeDotLevel(s);
            return (
              <div key={s.pessoaId} className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => onPessoaClick?.(s.pessoaId)}
                  className="cursor-pointer"
                >
                  <PessoaChip
                    pessoaId={s.pessoaId}
                    nome={nome}
                    papel={s.papelPrimario ?? undefined}
                    dotLevel={level}
                    size="xs"
                    clickable={false}
                  />
                </button>
                <span className="text-neutral-600 dark:text-neutral-400 flex-1 min-w-0 truncate">
                  {s.contradicoesConhecidas >= 1
                    ? `Contradição registrada em caso anterior`
                    : `${s.totalCasos} casos${s.sameComarcaCount > 0 ? ` (${s.sameComarcaCount} na comarca)` : ""}`}
                </span>
              </div>
            );
          })}
          {filtered.length > INTEL_CONFIG.banner.maxItems && (
            <div className="text-[10px] text-emerald-700/70 italic pt-1">
              + {filtered.length - INTEL_CONFIG.banner.maxItems} outros sinais
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Atualize `index.ts`:
```ts
export { BannerInteligencia } from "./banner-inteligencia";
```

- [ ] **Step 4: Run — PASS** (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/pessoas/banner-inteligencia.tsx src/components/pessoas/index.ts __tests__/components/pessoas/banner-inteligencia.test.tsx
git commit -m "feat(pessoas): BannerInteligencia com dismissibilidade localStorage"
```

---

## Task 10: `VincularPessoaPopover` (TDD)

**Files:**
- Create: `src/components/pessoas/vincular-pessoa-popover.tsx`
- Modify: `src/components/pessoas/index.ts`
- Create: `__tests__/components/pessoas/vincular-pessoa-popover.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/components/pessoas/vincular-pessoa-popover.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { VincularPessoaPopover } from "@/components/pessoas/vincular-pessoa-popover";

afterEach(() => cleanup());

const selectCbMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    pessoas: {
      searchForAutocomplete: {
        useQuery: vi.fn(() => ({
          data: [
            { id: 42, nome: "Maria Silva", categoriaPrimaria: "testemunha", confidence: "0.9" },
            { id: 87, nome: "Maria Silva", categoriaPrimaria: null, confidence: "0.5" },
          ],
          isLoading: false,
        })),
      },
      create: {
        useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
      },
    },
  },
}));

describe("VincularPessoaPopover", () => {
  beforeEach(() => { selectCbMock.mockClear(); });

  it("busca e lista matches ao digitar", () => {
    render(<VincularPessoaPopover query="maria" onSelect={selectCbMock} />);
    expect(screen.getAllByText(/maria silva/i).length).toBeGreaterThan(0);
  });

  it("selecionar match chama onSelect com pessoaId", () => {
    render(<VincularPessoaPopover query="maria" onSelect={selectCbMock} />);
    const button = screen.getAllByRole("button", { name: /maria silva/i })[0];
    fireEvent.click(button);
    expect(selectCbMock).toHaveBeenCalledWith(42);
  });

  it("mostra opção 'criar nova'", () => {
    render(<VincularPessoaPopover query="fulano novo" onSelect={selectCbMock} />);
    expect(screen.getByText(/criar nova/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/pessoas/vincular-pessoa-popover.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  query: string;
  papel?: string;
  onSelect: (pessoaId: number) => void;
  onCreateNew?: (nome: string) => void;
}

export function VincularPessoaPopover({ query, papel, onSelect, onCreateNew }: Props) {
  const { data, isLoading } = trpc.pessoas.searchForAutocomplete.useQuery(
    { query, papel, limit: 8 },
    { enabled: query.trim().length >= 2 },
  );

  const items = data ?? [];

  return (
    <div className="w-64 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md p-1 text-xs">
      <div className="px-2 py-1 text-[10px] text-neutral-500 flex items-center gap-1">
        <Search className="w-2.5 h-2.5" /> Vincular "{query}"
      </div>
      {isLoading && <p className="px-2 py-2 italic text-neutral-400">Buscando…</p>}
      {!isLoading && items.length === 0 && (
        <p className="px-2 py-2 italic text-neutral-400">Nenhum match.</p>
      )}
      {items.map((p, i) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelect(p.id)}
          className={cn(
            "w-full text-left px-2 py-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer flex items-center gap-2",
            i === 0 && "bg-emerald-50 dark:bg-emerald-900/20",
          )}
        >
          <span className="font-medium flex-1 truncate">{p.nome}</span>
          {p.categoriaPrimaria && (
            <span className="text-[9px] text-neutral-400 uppercase tracking-wide">{p.categoriaPrimaria}</span>
          )}
          {i === 0 && <span className="text-[8px] text-emerald-600 font-semibold">provável</span>}
        </button>
      ))}
      {onCreateNew && query.trim().length >= 2 && (
        <button
          type="button"
          onClick={() => onCreateNew(query)}
          className="w-full text-left px-2 py-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer flex items-center gap-2 border-t border-neutral-100 dark:border-neutral-800 mt-1"
        >
          <Plus className="w-2.5 h-2.5" />
          <span>Criar nova "{query}"</span>
        </button>
      )}
    </div>
  );
}
```

Atualize `index.ts`:
```ts
export { VincularPessoaPopover } from "./vincular-pessoa-popover";
```

- [ ] **Step 4: Run — PASS** (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/pessoas/vincular-pessoa-popover.tsx src/components/pessoas/index.ts __tests__/components/pessoas/vincular-pessoa-popover.test.tsx
git commit -m "feat(pessoas): VincularPessoaPopover autocomplete"
```

---

## Task 11: Integração no sheet da agenda (cirúrgica)

**Files:**
- Modify: `src/components/agenda/event-detail-sheet.tsx`

**PRÉ-REQUISITO:** antes de iniciar, confirmar que Rodrigo não está editando a agenda em sessão paralela (memória feedback_agenda_em_outra_sessao). Se estiver, pausar.

- [ ] **Step 1: Adicionar imports**

Em `src/components/agenda/event-detail-sheet.tsx`, logo após os imports de `./sheet/*`, adicionar:

```tsx
import { PessoaChip, PessoaSheet, BannerInteligencia } from "@/components/pessoas";
import { usePessoaSignals } from "@/hooks/use-pessoa-signals";
import { computeDotLevel } from "@/lib/pessoas/compute-dot-level";
```

- [ ] **Step 2: Buscar participações deste processo**

Depois do `midiasQuery` existente, adicionar:

```tsx
  const participacoesQuery = trpc.pessoas.getParticipacoesDoProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: !!processoId && open, retry: false },
  );

  const participacoesDoProcesso = participacoesQuery.data ?? [];
  const pessoaIdsDoProcesso = participacoesDoProcesso.map((p: any) => p.pessoaId);

  // Mapa pessoa_id → participação (papel, testemunha_id)
  const participacaoByPessoaId = useMemo(() => {
    const m = new Map<number, any>();
    for (const p of participacoesDoProcesso) m.set(p.pessoaId, p);
    return m;
  }, [participacoesDoProcesso]);

  // Mapa testemunha_id → pessoa_id (pra resolver chip do depoente)
  const pessoaIdByTestemunhaId = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of participacoesDoProcesso) {
      if (p.testemunhaId) m.set(p.testemunhaId, p.pessoaId);
    }
    return m;
  }, [participacoesDoProcesso]);

  // Batch signals de todas as pessoas deste processo
  const { getSignal } = usePessoaSignals(pessoaIdsDoProcesso);

  // Signals com getNome (usado no banner)
  const signalsComNome = useMemo(() => {
    return pessoaIdsDoProcesso
      .map((id: number) => getSignal(id))
      .filter((s): s is NonNullable<typeof s> => !!s);
  }, [pessoaIdsDoProcesso, getSignal]);

  const [pessoaSheetId, setPessoaSheetId] = useState<number | null>(null);

  const getNome = (pessoaId: number) => {
    const t = depoentes.find((d: any) => {
      const tid = d.id;
      return pessoaIdByTestemunhaId.get(tid) === pessoaId;
    });
    return t?.nome ?? `Pessoa #${pessoaId}`;
  };
```

- [ ] **Step 3: Adicionar BannerInteligencia no topo do scroll**

Localizar o `<SheetToC sections={tocSections} ... />` e, logo APÓS ele, adicionar:

```tsx
        <div className="px-3 pt-2">
          <BannerInteligencia
            contextType="audiencia"
            contextId={audienciaIdNum ?? 0}
            signals={signalsComNome}
            getNome={getNome}
            onPessoaClick={(id) => setPessoaSheetId(id)}
          />
        </div>
```

- [ ] **Step 4: Wrap cada DepoenteCardV2 com PessoaChip hint**

No map de `depoentes.map((d, i) => <DepoenteCardV2 ... />)`, o componente DepoenteCardV2 já renderiza o nome. Em vez de reescrever, adicione o `PessoaSheet` trigger: cada `DepoenteCardV2` ganha um novo prop `onPessoaClick` via wrap. **Simplificação**: não altera DepoenteCardV2; apenas adiciona ícone `<PessoaChip>` adjacente quando há vinculação.

**Abordagem minimamente invasiva**: depois de cada DepoenteCardV2 no layout, se houver `pessoaIdByTestemunhaId.get(d.id)`, renderizar um botão lateral pequeno:

```tsx
{depoentes.map((d: any, i: number) => {
  const pessoaId = pessoaIdByTestemunhaId.get(d.id);
  const signal = pessoaId ? getSignal(pessoaId) : null;
  const dotLevel = signal ? computeDotLevel(signal) : "none";
  return (
    <div key={d.id ?? `${i}-${d.nome}`} className="relative">
      <DepoenteCardV2
        /* todas as props existentes, sem alteração */
      />
      {pessoaId && dotLevel !== "none" && (
        <button
          type="button"
          onClick={() => setPessoaSheetId(pessoaId)}
          aria-label={`Abrir dossiê de ${d.nome}`}
          className="absolute top-2 right-2 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-1 hover:border-emerald-400 cursor-pointer"
        >
          <PessoaChip
            pessoaId={pessoaId}
            nome=""
            papel={signal?.papelPrimario ?? undefined}
            size="xs"
            clickable={false}
            dotLevel={dotLevel}
          />
        </button>
      )}
    </div>
  );
})}
```

**Importante**: as props originais de `DepoenteCardV2` (key, depoente, isOpen, onToggle, variant, etc) **permanecem as mesmas**. Apenas envolvemos em `<div className="relative">` e adicionamos o botão overlay.

- [ ] **Step 5: Adicionar PessoaSheet no final do JSX**

Logo antes do `</SheetContent>` de fechamento, adicionar:

```tsx
        <PessoaSheet
          pessoaId={pessoaSheetId}
          open={pessoaSheetId !== null}
          onOpenChange={(o) => !o && setPessoaSheetId(null)}
        />
```

- [ ] **Step 6: Typecheck + tests**

Run: `npm run typecheck`
Expected: 0 new errors.

Run: `npm run test __tests__/components/event-detail-sheet.test.tsx`
Expected: tests continuam passando (mock já cobre `pessoas.*` via trpc mock — revisar se precisa acrescentar mocks).

Caso falhe por mock ausente, acrescentar em `vi.mock("@/lib/trpc/client", ...)`:

```ts
pessoas: {
  getParticipacoesDoProcesso: { useQuery: () => ({ data: [], isLoading: false }) },
  getBatchSignals: { useQuery: () => ({ data: [], isLoading: false }) },
  getById: { useQuery: () => ({ data: null, isLoading: false }) },
},
```

- [ ] **Step 7: Commit**

```bash
git add src/components/agenda/event-detail-sheet.tsx __tests__/components/event-detail-sheet.test.tsx
git commit -m "feat(pessoas): integra banner + chips de pessoa no sheet da agenda"
```

---

## Task 12: Aba "Pessoas" em `/admin/processos/[id]`

**Files:**
- Create: `src/app/(dashboard)/admin/processos/[id]/_components/pessoas-tab.tsx`
- Modify: página do processo pra incluir tab (investigar como tabs são adicionadas)

- [ ] **Step 1: Inspecionar estrutura de tabs do processo**

Run: `ls 'src/app/(dashboard)/admin/processos/[id]/' && grep -n "tab\|Tab" 'src/app/(dashboard)/admin/processos/[id]/page.tsx' | head -20`

Identifique o padrão usado (Radix Tabs, estado local, etc). Adapte o passo 3 conforme padrão.

- [ ] **Step 2: Criar `pessoas-tab.tsx`**

```tsx
// src/app/(dashboard)/admin/processos/[id]/_components/pessoas-tab.tsx
"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PessoaChip, PessoaSheet } from "@/components/pessoas";
import { usePessoaSignals } from "@/hooks/use-pessoa-signals";
import { computeDotLevel } from "@/lib/pessoas/compute-dot-level";
import { PAPEIS_ROTATIVOS } from "@/lib/pessoas/intel-config";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  processoId: number;
}

const GRUPO_ORDEM = [
  { key: "policial", label: "🚓 Policial / Investigação", papeis: ["policial-militar", "policial-civil", "policial-federal", "autoridade-policial", "guarda-municipal", "agente-penitenciario"] },
  { key: "pericial", label: "🔬 Peritos / Técnicos", papeis: ["perito-criminal", "perito-medico", "medico-legista", "medico-assistente", "psicologo-forense", "psiquiatra-forense", "assistente-social", "tradutor-interprete"] },
  { key: "depoentes", label: "🗣 Depoentes", papeis: ["testemunha", "testemunha-defesa", "vitima", "informante"] },
  { key: "defesa", label: "⚖ Defesa / Contraparte", papeis: ["co-reu", "advogado-parte-contraria"] },
  { key: "judicial", label: "Judicial", papeis: ["juiz", "desembargador", "promotor", "procurador", "oficial-justica", "servidor-cartorio", "analista-judiciario"], estavel: true },
];

export function PessoasTab({ processoId }: Props) {
  const { data: participacoes = [], isLoading } = trpc.pessoas.getParticipacoesDoProcesso.useQuery({ processoId });
  const [openGroup, setOpenGroup] = useState<string | null>("depoentes");
  const [sheetId, setSheetId] = useState<number | null>(null);

  const pessoaIds = participacoes.map((p: any) => p.pessoaId);
  const { getSignal } = usePessoaSignals(pessoaIds);

  const pessoasByGroup = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const g of GRUPO_ORDEM) map[g.key] = [];
    for (const p of participacoes) {
      const grupo = GRUPO_ORDEM.find((g) => g.papeis.includes(p.papel))?.key ?? "depoentes";
      map[grupo].push(p);
    }
    return map;
  }, [participacoes]);

  const pessoaNomes = trpc.pessoas.list.useQuery({ limit: 200 });
  const getNome = (pessoaId: number) => pessoaNomes.data?.items.find((p) => p.id === pessoaId)?.nome ?? `#${pessoaId}`;

  if (isLoading) return <p className="p-4 text-sm text-neutral-500">Carregando…</p>;

  return (
    <div className="p-4 space-y-2">
      <div className="text-xs text-neutral-500 mb-3">{participacoes.length} pessoas deste processo</div>

      {GRUPO_ORDEM.map((g) => {
        const items = pessoasByGroup[g.key] ?? [];
        if (items.length === 0) return null;
        const isOpen = openGroup === g.key;
        const estavel = g.estavel === true;
        return (
          <div
            key={g.key}
            className={cn("rounded-lg border", estavel && "opacity-75 border-neutral-200 dark:border-neutral-800")}
          >
            <button
              type="button"
              onClick={() => setOpenGroup(isOpen ? null : g.key)}
              className="w-full flex items-center justify-between px-3 py-2 cursor-pointer"
            >
              <span className={cn("text-xs font-semibold", estavel && "font-medium text-neutral-500")}>
                {g.label} ({items.length})
                {estavel && <span className="text-[9px] text-neutral-400 ml-2 font-normal">· titulares estáveis</span>}
              </span>
              {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-1.5">
                {items.map((p: any) => {
                  const signal = getSignal(p.pessoaId);
                  const nome = getNome(p.pessoaId);
                  const level = signal && !estavel ? computeDotLevel(signal) : "none";
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <button type="button" onClick={() => setSheetId(p.pessoaId)}>
                        <PessoaChip
                          pessoaId={p.pessoaId}
                          nome={nome}
                          papel={p.papel}
                          dotLevel={level}
                          size="sm"
                          clickable={false}
                        />
                      </button>
                      {!estavel && signal && level !== "none" && (
                        <span className="text-[10px] text-neutral-500">
                          {signal.totalCasos} casos
                          {signal.contradicoesConhecidas > 0 && ` · ${signal.contradicoesConhecidas} contradições`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <PessoaSheet pessoaId={sheetId} open={sheetId !== null} onOpenChange={(o) => !o && setSheetId(null)} />
    </div>
  );
}
```

- [ ] **Step 3: Integrar tab na página do processo**

Edite `src/app/(dashboard)/admin/processos/[id]/page.tsx`:
1. Importe: `import { PessoasTab } from "./_components/pessoas-tab";`
2. Adicione a nova tab "Pessoas" na estrutura existente (onde quer que outras tabs tipo Drive/Audiências estejam declaradas). Exato: seguir o padrão local — ver as tabs como "drive", "audiencias" já declaradas e acrescentar `{ key: "pessoas", label: "Pessoas" }`.
3. No bloco de renderização das tabs, acrescentar: `{tab === "pessoas" && <PessoasTab processoId={id} />}`.

Se a página não usar esse padrão de `tab === "x"`, adaptar ao que existe.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: 0 new errors.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(dashboard)/admin/processos/[id]/_components/pessoas-tab.tsx' 'src/app/(dashboard)/admin/processos/[id]/page.tsx'
git commit -m "feat(pessoas): aba Pessoas em /admin/processos/[id]"
```

---

## Task 13: Manual verification

**Files:** nenhum.

- [ ] **Step 1: Dev server**

```bash
cd ~/projetos/Defender && rm -rf .next/cache && npm run dev:webpack
```

- [ ] **Step 2: Refresh materialized view no DB**

Run em terminal/DB: `SELECT refresh_pessoas_intel_signals();` ou aguardar o refresh automático.

- [ ] **Step 3: Checklist no browser**

- [ ] `/admin/pessoas` — catálogo abre, chips aparecem, tabs/botões funcionam (regressão)
- [ ] Navegar pra `/admin/processos/[id]` de um processo com várias testemunhas → aba "Pessoas" aparece → grupos colapsáveis, Judicial tom claro, Depoentes destacado, dots aparecem em rotativos com ≥2 casos
- [ ] Click no chip → `PessoaSheet` abre
- [ ] Agenda: abrir um evento → sheet lateral → se há pessoas com histórico, `BannerInteligencia` aparece no topo
- [ ] Expandir banner → lista pessoas com chip + justificativa
- [ ] Dispensar banner (×) → banner some, reabrir o evento não traz de volta (30 dias)
- [ ] `DepoenteCardV2` com participação vinculada: overlay chip no canto sup. direito com dotLevel
- [ ] Click overlay → `PessoaSheet` abre
- [ ] `prefers-reduced-motion` ativo → animações desativam

- [ ] **Step 4: Commit de marcação**

```bash
git commit --allow-empty -m "chore(pessoas): Fase I-B validada manualmente"
```

---

## Self-Review

**Spec coverage:**

| Requisito spec | Tasks |
|---|---|
| Materialized view + refresh | Task 1 |
| `INTEL_CONFIG` thresholds | Task 2 |
| computeDotLevel (6 levels, papel estável=none) | Task 3 |
| shouldShowBanner + filterBannerPessoas | Task 3 |
| tRPC getBatchSignals | Task 4 |
| IntelDot | Task 5 |
| usePessoaSignals batch hook | Task 6 |
| PessoaChip v2 (dot, ambiguity) | Task 7 |
| PessoaPeek tooltip | Task 8 |
| BannerInteligencia + dismissibilidade | Task 9 |
| VincularPessoaPopover | Task 10 |
| Integração sheet agenda (chip overlay + banner) | Task 11 |
| Aba "Pessoas" em processo com grupos | Task 12 |
| Manual verification | Task 13 |

**Gaps assumidos intencionalmente**:
- Peek NÃO é aplicado no chip ainda (exige ajuste de PessoaChip com hover+timer). Fica como follow-up — o componente existe e pode ser montado manualmente no sheet quando tiver demanda concreta de hover.
- Modal de Registro não ganha chips aqui — fica pra iteração posterior. Spec permite adiar.
- Integração com `VincularPessoaPopover` no DepoenteCardV2 depende de UX decidida — pode ser uma flag futura.

**Placeholders:** nenhum.

**Type consistency:**
- `IntelSignal` definido em Task 3 usado em Tasks 4, 6, 8, 9, 11, 12.
- `DotLevel` definido em Task 3 usado em Tasks 5, 7.
- `PAPEIS_ROTATIVOS` de I-A reusado em Task 3.
- `INTEL_CONFIG` atualizado em Task 2 consumido em Tasks 3, 9.

Plano coerente. 13 tasks, ~13 commits esperados.
