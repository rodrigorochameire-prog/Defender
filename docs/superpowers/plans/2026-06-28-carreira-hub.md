# Carreira Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a role-switched "Carreira Hub" cockpit page that aggregates the existing functional/administrative data (vida_funcional_eventos, substituicoes, afastamentos) into one panoramic day-to-day view, refined to Padrão Defender v5.

**Architecture:** A read-only aggregation layer. All derivation logic lives in pure functions under `src/lib/carreira/` (unit-tested with vitest); a thin `carreira` tRPC router fetches rows and calls those functions; a client page reads the current user's role (`trpc.auth.me`) and renders either the personal cockpit or the admin cobertura rollup. No new schema, no migration, no new mutations — the hub reads and delegates to existing create flows.

**Tech Stack:** Next.js 15 (App Router, client components), tRPC, Drizzle ORM (Postgres), Tailwind + Padrão Defender v5 tokens, vitest.

## Global Constraints

- **No new schema / no migration.** Read-only over existing tables.
- **Privacy boundary (NON-NEGOTIABLE):** personal funcional data is private to the defensor. `meuPanorama` MUST use `getVidaFuncionalScope(ctx.user)` (admin = own only). `coberturaRollup` MUST be an `adminProcedure` and expose only operational data (afastamentos + substituições) — NEVER another defensor's férias/diárias/pedidos detail, and NEVER `valorCents`.
- **Dates as ISO strings.** All date fields are `YYYY-MM-DD` strings. Compare lexicographically; for window math use the provided `addDaysISO` helper. Do NOT use `date-fns format()` on raw values (project gotcha: throws on invalid dates).
- **Soft-delete:** every read of `vida_funcional_eventos` filters `isNull(deletedAt)`.
- **Reuse existing data sources.** afastamentos are already fetched by `coberturaRouter`/`coberturasRouter`; do not duplicate mutation logic — the carreira router only reads.
- **Padrão Defender v5:** use `CollapsiblePageHeader`, tokens from `@/lib/config/design-tokens` (`TYPO`, `SPACE`, `CARD_STYLE`, `COLORS`), and DS primitives (`StatusChip`, `EmptyState`) from `@/components/ds`.
- **Status vocabularies (exact):** events → `previsto | em_curso | concluido | pendente | arquivado`. substituições → `em_andamento | concluida | oficiada | paga`.

---

### Task 1: Personal panorama — pure logic

**Files:**
- Create: `src/lib/carreira/panorama.ts`
- Test: `src/lib/carreira/__tests__/panorama.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  - `type EventoLite = { id: number; tipo: string; cluster: "progressao"|"ausencias"|"contraprestacao"|"administrativo"; titulo: string; status: string; dataEvento: string; dataFim: string | null; prazo: string | null; valorCents: number | null }`
  - `type SubLite = { id: number; status: string }`
  - `type ClusterSummary = { total: number; emCurso: number; pendentes: number; itens: Array<{ id: number; tipo: string; titulo: string; status: string; dataEvento: string; prazo: string | null; valorCents: number | null }> }`
  - `type MeuPanorama = { kpis: { proximoPrazo: { titulo: string; prazo: string; tipo: string } | null; substituicoesAtivas: number; pedidosPendentes: number; feriasAgendadas: number }; agoraProximos: Array<{ id: number; tipo: string; cluster: string; titulo: string; status: string; dataEvento: string; dataFim: string | null; prazo: string | null }>; clusters: { ausencias: ClusterSummary; contraprestacao: ClusterSummary; progressao: ClusterSummary; administrativo: ClusterSummary } }`
  - `function addDaysISO(iso: string, days: number): string`
  - `function buildMeuPanorama(input: { eventos: EventoLite[]; substituicoes: SubLite[] }, today: string): MeuPanorama`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/carreira/__tests__/panorama.test.ts
import { describe, it, expect } from "vitest";
import { addDaysISO, buildMeuPanorama, type EventoLite } from "../panorama";

const TODAY = "2026-06-28";

function ev(p: Partial<EventoLite>): EventoLite {
  return {
    id: 1, tipo: "FERIAS", cluster: "ausencias", titulo: "x", status: "previsto",
    dataEvento: TODAY, dataFim: null, prazo: null, valorCents: null, ...p,
  };
}

describe("addDaysISO", () => {
  it("adds days across month boundary in UTC", () => {
    expect(addDaysISO("2026-06-28", 90)).toBe("2026-09-26");
    expect(addDaysISO("2026-01-31", 1)).toBe("2026-02-01");
  });
});

describe("buildMeuPanorama", () => {
  it("counts substituições ativas as those not paga", () => {
    const r = buildMeuPanorama(
      { eventos: [], substituicoes: [
        { id: 1, status: "em_andamento" }, { id: 2, status: "oficiada" }, { id: 3, status: "paga" },
      ] },
      TODAY,
    );
    expect(r.kpis.substituicoesAtivas).toBe(2);
  });

  it("counts pedidos administrativos pendentes (SOLICITACAO_ADM, pendente|em_curso)", () => {
    const r = buildMeuPanorama({ eventos: [
      ev({ id: 1, tipo: "SOLICITACAO_ADM", cluster: "administrativo", status: "pendente" }),
      ev({ id: 2, tipo: "SOLICITACAO_ADM", cluster: "administrativo", status: "em_curso" }),
      ev({ id: 3, tipo: "SOLICITACAO_ADM", cluster: "administrativo", status: "concluido" }),
    ], substituicoes: [] }, TODAY);
    expect(r.kpis.pedidosPendentes).toBe(2);
  });

  it("counts férias agendadas (FERIAS, previsto|em_curso, not ended)", () => {
    const r = buildMeuPanorama({ eventos: [
      ev({ id: 1, tipo: "FERIAS", status: "previsto", dataFim: "2026-07-10" }),
      ev({ id: 2, tipo: "FERIAS", status: "em_curso", dataFim: null }),
      ev({ id: 3, tipo: "FERIAS", status: "concluido", dataFim: "2026-01-10" }),
      ev({ id: 4, tipo: "FERIAS", status: "previsto", dataFim: "2026-01-01" }), // already ended
    ], substituicoes: [] }, TODAY);
    expect(r.kpis.feriasAgendadas).toBe(2);
  });

  it("picks the nearest upcoming prazo", () => {
    const r = buildMeuPanorama({ eventos: [
      ev({ id: 1, tipo: "SOLICITACAO_ADM", cluster: "administrativo", status: "pendente", prazo: "2026-08-01", titulo: "B" }),
      ev({ id: 2, tipo: "SOLICITACAO_ADM", cluster: "administrativo", status: "pendente", prazo: "2026-07-05", titulo: "A" }),
    ], substituicoes: [] }, TODAY);
    expect(r.kpis.proximoPrazo).toEqual({ titulo: "A", prazo: "2026-07-05", tipo: "SOLICITACAO_ADM" });
  });

  it("agoraProximos includes em_curso now and items within 90-day window, sorted", () => {
    const r = buildMeuPanorama({ eventos: [
      ev({ id: 1, status: "em_curso", dataEvento: "2026-05-01", titulo: "ongoing" }),
      ev({ id: 2, status: "previsto", dataEvento: "2026-07-10", titulo: "soon" }),
      ev({ id: 3, status: "previsto", dataEvento: "2027-01-01", titulo: "far" }), // outside window
    ], substituicoes: [] }, TODAY);
    const ids = r.agoraProximos.map((e) => e.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).not.toContain(3);
  });

  it("summarizes clusters with total/emCurso/pendentes", () => {
    const r = buildMeuPanorama({ eventos: [
      ev({ id: 1, cluster: "ausencias", status: "em_curso" }),
      ev({ id: 2, cluster: "ausencias", status: "pendente" }),
      ev({ id: 3, cluster: "contraprestacao", status: "concluido" }),
    ], substituicoes: [] }, TODAY);
    expect(r.clusters.ausencias.total).toBe(2);
    expect(r.clusters.ausencias.emCurso).toBe(1);
    expect(r.clusters.ausencias.pendentes).toBe(1);
    expect(r.clusters.contraprestacao.total).toBe(1);
    expect(r.clusters.progressao.total).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/carreira/__tests__/panorama.test.ts`
Expected: FAIL — cannot find module `../panorama`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/carreira/panorama.ts
export type Cluster = "progressao" | "ausencias" | "contraprestacao" | "administrativo";

export type EventoLite = {
  id: number;
  tipo: string;
  cluster: Cluster;
  titulo: string;
  status: string;
  dataEvento: string;      // YYYY-MM-DD
  dataFim: string | null;
  prazo: string | null;
  valorCents: number | null;
};

export type SubLite = { id: number; status: string };

export type ClusterSummary = {
  total: number;
  emCurso: number;
  pendentes: number;
  itens: Array<Pick<EventoLite, "id" | "tipo" | "titulo" | "status" | "dataEvento" | "prazo" | "valorCents">>;
};

export type MeuPanorama = {
  kpis: {
    proximoPrazo: { titulo: string; prazo: string; tipo: string } | null;
    substituicoesAtivas: number;
    pedidosPendentes: number;
    feriasAgendadas: number;
  };
  agoraProximos: Array<Pick<EventoLite, "id" | "tipo" | "cluster" | "titulo" | "status" | "dataEvento" | "dataFim" | "prazo">>;
  clusters: Record<Cluster, ClusterSummary>;
};

const UPCOMING_WINDOW_DAYS = 90;
const CLUSTERS: Cluster[] = ["progressao", "ausencias", "contraprestacao", "administrativo"];

/** Add days to a YYYY-MM-DD string in UTC; returns YYYY-MM-DD. */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function emptyCluster(): ClusterSummary {
  return { total: 0, emCurso: 0, pendentes: 0, itens: [] };
}

export function buildMeuPanorama(
  input: { eventos: EventoLite[]; substituicoes: SubLite[] },
  today: string,
): MeuPanorama {
  const { eventos, substituicoes } = input;
  const cutoff = addDaysISO(today, UPCOMING_WINDOW_DAYS);

  // KPIs
  const substituicoesAtivas = substituicoes.filter((s) => s.status !== "paga").length;

  const pedidosPendentes = eventos.filter(
    (e) => e.tipo === "SOLICITACAO_ADM" && (e.status === "pendente" || e.status === "em_curso"),
  ).length;

  const feriasAgendadas = eventos.filter(
    (e) =>
      e.tipo === "FERIAS" &&
      (e.status === "previsto" || e.status === "em_curso") &&
      (e.dataFim === null || e.dataFim >= today),
  ).length;

  const comPrazo = eventos
    .filter((e) => e.prazo !== null && e.prazo >= today && e.status !== "concluido" && e.status !== "arquivado")
    .sort((a, b) => (a.prazo! < b.prazo! ? -1 : a.prazo! > b.prazo! ? 1 : 0));
  const proximoPrazo = comPrazo.length
    ? { titulo: comPrazo[0].titulo, prazo: comPrazo[0].prazo!, tipo: comPrazo[0].tipo }
    : null;

  // Agora & próximos: em_curso now, OR upcoming dataEvento within window
  const agoraProximos = eventos
    .filter(
      (e) =>
        e.status === "em_curso" ||
        (e.dataEvento >= today && e.dataEvento <= cutoff) ||
        (e.prazo !== null && e.prazo >= today && e.prazo <= cutoff),
    )
    .sort((a, b) => (a.dataEvento < b.dataEvento ? -1 : a.dataEvento > b.dataEvento ? 1 : 0))
    .map((e) => ({
      id: e.id, tipo: e.tipo, cluster: e.cluster, titulo: e.titulo,
      status: e.status, dataEvento: e.dataEvento, dataFim: e.dataFim, prazo: e.prazo,
    }));

  // Cluster summaries
  const clusters = Object.fromEntries(CLUSTERS.map((c) => [c, emptyCluster()])) as Record<Cluster, ClusterSummary>;
  for (const e of eventos) {
    const c = clusters[e.cluster];
    if (!c) continue;
    c.total += 1;
    if (e.status === "em_curso") c.emCurso += 1;
    if (e.status === "pendente") c.pendentes += 1;
    c.itens.push({ id: e.id, tipo: e.tipo, titulo: e.titulo, status: e.status, dataEvento: e.dataEvento, prazo: e.prazo, valorCents: e.valorCents });
  }
  for (const c of CLUSTERS) {
    clusters[c].itens.sort((a, b) => (a.dataEvento < b.dataEvento ? 1 : a.dataEvento > b.dataEvento ? -1 : 0));
  }

  return { kpis: { proximoPrazo, substituicoesAtivas, pedidosPendentes, feriasAgendadas }, agoraProximos, clusters };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/carreira/__tests__/panorama.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/carreira/panorama.ts src/lib/carreira/__tests__/panorama.test.ts
git commit -m "feat(carreira): lógica pura do panorama pessoal (KPIs, agora&próximos, clusters)"
```

---

### Task 2: Cobertura rollup — pure logic

**Files:**
- Create: `src/lib/carreira/cobertura-rollup.ts`
- Test: `src/lib/carreira/__tests__/cobertura-rollup.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces:
  - `type AfastamentoLite = { id: number; defensorId: number; substitutoId: number; dataInicio: string; dataFim: string | null; ativo: boolean; tipo: string }`
  - `type SubstituicaoLite = { id: number; defensorId: number | null; afastamentoId: number | null; unidadeSubstituida: string; status: string; oficioNumero: string | null; relatorioPath: string | null; seiProtocolo: string | null }`
  - `type UserLite = { id: number; name: string }`
  - `type CoberturaRollup = { kpis: { afastadosHoje: number; substituicoesAbertas: number; semCobertura: number; gratificacoesAOficiar: number; gratificacoesAPagar: number }; cobertura: Array<{ afastamentoId: number; defensorAfastado: string; periodo: string; substituicaoId: number | null; defensorSubstituto: string; statusGratificacao: string | null }>; pendencias: Array<{ substituicaoId: number; defensorSubstituto: string; unidadeSubstituida: string; status: string; faltando: string[] }>; porDefensor: Array<{ defensorId: number; nome: string; substituicoesAbertas: number; afastamentoAtivo: boolean }> }`
  - `function faltandoSteps(s: SubstituicaoLite): string[]`
  - `function buildCoberturaRollup(input: { afastamentos: AfastamentoLite[]; substituicoes: SubstituicaoLite[]; users: UserLite[] }, today: string): CoberturaRollup`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/carreira/__tests__/cobertura-rollup.test.ts
import { describe, it, expect } from "vitest";
import { buildCoberturaRollup, faltandoSteps, type AfastamentoLite, type SubstituicaoLite, type UserLite } from "../cobertura-rollup";

const TODAY = "2026-06-28";
const users: UserLite[] = [
  { id: 1, name: "Ana" }, { id: 2, name: "Bruno" }, { id: 3, name: "Carla" },
];

function af(p: Partial<AfastamentoLite>): AfastamentoLite {
  return { id: 1, defensorId: 1, substitutoId: 2, dataInicio: "2026-06-01", dataFim: "2026-07-15", ativo: true, tipo: "FERIAS", ...p };
}
function sub(p: Partial<SubstituicaoLite>): SubstituicaoLite {
  return { id: 1, defensorId: 2, afastamentoId: null, unidadeSubstituida: "7ª DP", status: "em_andamento", oficioNumero: null, relatorioPath: null, seiProtocolo: null, ...p };
}

describe("faltandoSteps", () => {
  it("lists the missing gratification steps", () => {
    expect(faltandoSteps(sub({}))).toEqual(["ofício", "relatório", "SEI"]);
    expect(faltandoSteps(sub({ oficioNumero: "12", relatorioPath: "/r", seiProtocolo: "X" }))).toEqual([]);
  });
});

describe("buildCoberturaRollup", () => {
  it("counts afastados hoje (active, today within period)", () => {
    const r = buildCoberturaRollup({
      afastamentos: [
        af({ id: 1, dataInicio: "2026-06-01", dataFim: "2026-07-15" }),       // contains today
        af({ id: 2, dataInicio: "2026-01-01", dataFim: "2026-02-01" }),       // past
        af({ id: 3, dataInicio: "2026-06-10", dataFim: null, ativo: true }),  // open-ended, started
      ],
      substituicoes: [], users,
    }, TODAY);
    expect(r.kpis.afastadosHoje).toBe(2);
  });

  it("semCobertura = active afastamentos with no linked substituição", () => {
    const r = buildCoberturaRollup({
      afastamentos: [af({ id: 1 }), af({ id: 2 })],
      substituicoes: [sub({ id: 9, afastamentoId: 1 })], // covers afastamento 1 only
      users,
    }, TODAY);
    expect(r.kpis.semCobertura).toBe(1);
  });

  it("cobertura row links substituto and gratification status", () => {
    const r = buildCoberturaRollup({
      afastamentos: [af({ id: 1, defensorId: 1, substitutoId: 2 })],
      substituicoes: [sub({ id: 9, afastamentoId: 1, status: "oficiada" })],
      users,
    }, TODAY);
    expect(r.cobertura[0]).toMatchObject({
      afastamentoId: 1, defensorAfastado: "Ana", defensorSubstituto: "Bruno",
      substituicaoId: 9, statusGratificacao: "oficiada",
    });
  });

  it("cobertura statusGratificacao null when no linked substituição", () => {
    const r = buildCoberturaRollup({ afastamentos: [af({ id: 1 })], substituicoes: [], users }, TODAY);
    expect(r.cobertura[0].statusGratificacao).toBeNull();
    expect(r.cobertura[0].substituicaoId).toBeNull();
  });

  it("kpis: gratificacoes a oficiar (concluida) and a pagar (oficiada)", () => {
    const r = buildCoberturaRollup({
      afastamentos: [],
      substituicoes: [sub({ id: 1, status: "concluida" }), sub({ id: 2, status: "oficiada" }), sub({ id: 3, status: "paga" })],
      users,
    }, TODAY);
    expect(r.kpis.gratificacoesAOficiar).toBe(1);
    expect(r.kpis.gratificacoesAPagar).toBe(1);
    expect(r.kpis.substituicoesAbertas).toBe(2); // not paga
  });

  it("pendencias lists open substituições with missing steps", () => {
    const r = buildCoberturaRollup({
      afastamentos: [],
      substituicoes: [sub({ id: 1, defensorId: 2, status: "concluida", oficioNumero: "10" })],
      users,
    }, TODAY);
    expect(r.pendencias[0]).toMatchObject({ substituicaoId: 1, defensorSubstituto: "Bruno", faltando: ["relatório", "SEI"] });
  });

  it("porDefensor counts open substituições and active afastamento per user", () => {
    const r = buildCoberturaRollup({
      afastamentos: [af({ id: 1, defensorId: 1, ativo: true, dataInicio: "2026-06-01", dataFim: "2026-07-15" })],
      substituicoes: [sub({ id: 1, defensorId: 2, status: "em_andamento" })],
      users,
    }, TODAY);
    const ana = r.porDefensor.find((d) => d.defensorId === 1)!;
    const bruno = r.porDefensor.find((d) => d.defensorId === 2)!;
    expect(ana.afastamentoAtivo).toBe(true);
    expect(bruno.substituicoesAbertas).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/carreira/__tests__/cobertura-rollup.test.ts`
Expected: FAIL — cannot find module `../cobertura-rollup`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/carreira/cobertura-rollup.ts
export type AfastamentoLite = {
  id: number; defensorId: number; substitutoId: number;
  dataInicio: string; dataFim: string | null; ativo: boolean; tipo: string;
};

export type SubstituicaoLite = {
  id: number; defensorId: number | null; afastamentoId: number | null;
  unidadeSubstituida: string; status: string;
  oficioNumero: string | null; relatorioPath: string | null; seiProtocolo: string | null;
};

export type UserLite = { id: number; name: string };

export type CoberturaRollup = {
  kpis: {
    afastadosHoje: number;
    substituicoesAbertas: number;
    semCobertura: number;
    gratificacoesAOficiar: number;
    gratificacoesAPagar: number;
  };
  cobertura: Array<{
    afastamentoId: number; defensorAfastado: string; periodo: string;
    substituicaoId: number | null; defensorSubstituto: string; statusGratificacao: string | null;
  }>;
  pendencias: Array<{
    substituicaoId: number; defensorSubstituto: string; unidadeSubstituida: string;
    status: string; faltando: string[];
  }>;
  porDefensor: Array<{ defensorId: number; nome: string; substituicoesAbertas: number; afastamentoAtivo: boolean }>;
};

/** Gratification steps still missing on a substituição. */
export function faltandoSteps(s: SubstituicaoLite): string[] {
  const f: string[] = [];
  if (!s.oficioNumero) f.push("ofício");
  if (!s.relatorioPath) f.push("relatório");
  if (!s.seiProtocolo) f.push("SEI");
  return f;
}

function isActiveToday(a: AfastamentoLite, today: string): boolean {
  if (!a.ativo) return false;
  if (a.dataInicio > today) return false;
  if (a.dataFim !== null && a.dataFim < today) return false;
  return true;
}

export function buildCoberturaRollup(
  input: { afastamentos: AfastamentoLite[]; substituicoes: SubstituicaoLite[]; users: UserLite[] },
  today: string,
): CoberturaRollup {
  const { afastamentos, substituicoes, users } = input;
  const nameOf = (id: number | null) => (id === null ? "" : users.find((u) => u.id === id)?.name ?? `#${id}`);

  const subsByAfastamento = new Map<number, SubstituicaoLite>();
  for (const s of substituicoes) {
    if (s.afastamentoId !== null && !subsByAfastamento.has(s.afastamentoId)) {
      subsByAfastamento.set(s.afastamentoId, s);
    }
  }

  const activeAfastamentos = afastamentos.filter((a) => a.ativo);

  const afastadosHoje = afastamentos.filter((a) => isActiveToday(a, today)).length;
  const substituicoesAbertas = substituicoes.filter((s) => s.status !== "paga").length;
  const semCobertura = activeAfastamentos.filter((a) => !subsByAfastamento.has(a.id)).length;
  const gratificacoesAOficiar = substituicoes.filter((s) => s.status === "concluida").length;
  const gratificacoesAPagar = substituicoes.filter((s) => s.status === "oficiada").length;

  const cobertura = activeAfastamentos
    .slice()
    .sort((a, b) => (a.dataInicio < b.dataInicio ? 1 : a.dataInicio > b.dataInicio ? -1 : 0))
    .map((a) => {
      const linked = subsByAfastamento.get(a.id) ?? null;
      return {
        afastamentoId: a.id,
        defensorAfastado: nameOf(a.defensorId),
        periodo: `${a.dataInicio} – ${a.dataFim ?? "em aberto"}`,
        substituicaoId: linked?.id ?? null,
        defensorSubstituto: nameOf(a.substitutoId),
        statusGratificacao: linked?.status ?? null,
      };
    });

  const pendencias = substituicoes
    .filter((s) => s.status !== "paga")
    .map((s) => ({
      substituicaoId: s.id,
      defensorSubstituto: nameOf(s.defensorId),
      unidadeSubstituida: s.unidadeSubstituida,
      status: s.status,
      faltando: faltandoSteps(s),
    }));

  const porDefensor = users.map((u) => ({
    defensorId: u.id,
    nome: u.name,
    substituicoesAbertas: substituicoes.filter((s) => s.defensorId === u.id && s.status !== "paga").length,
    afastamentoAtivo: afastamentos.some((a) => a.defensorId === u.id && isActiveToday(a, today)),
  }));

  return {
    kpis: { afastadosHoje, substituicoesAbertas, semCobertura, gratificacoesAOficiar, gratificacoesAPagar },
    cobertura, pendencias, porDefensor,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/carreira/__tests__/cobertura-rollup.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/carreira/cobertura-rollup.ts src/lib/carreira/__tests__/cobertura-rollup.test.ts
git commit -m "feat(carreira): lógica pura do rollup de cobertura (afastamentos × substituições)"
```

---

### Task 3: `carreira` tRPC router + registration

**Files:**
- Create: `src/lib/trpc/routers/carreira.ts`
- Modify: `src/lib/trpc/routers/index.ts` (import + register under `carreira`)
- Test: `src/lib/trpc/routers/__tests__/carreira-router.test.ts` (structural — guards the privacy contract by reading source, matching the existing `header-cobertura.test.ts` pattern)

**Interfaces:**
- Consumes: `buildMeuPanorama`, `EventoLite`, `SubLite` (Task 1); `buildCoberturaRollup`, `AfastamentoLite`, `SubstituicaoLite`, `UserLite` (Task 2); `getVidaFuncionalScope`; schema tables `vidaFuncionalEventos`, `substituicoes`, `afastamentos`, `users`.
- Produces: `carreiraRouter` with `meuPanorama` (protected query) and `coberturaRollup` (admin query); registered as `appRouter.carreira`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/trpc/routers/__tests__/carreira-router.test.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROUTERS = join(process.cwd(), "src/lib/trpc/routers");
const read = (rel: string) => readFileSync(join(ROUTERS, rel), "utf8");

describe("carreira router — privacy contract", () => {
  const src = read("carreira.ts");

  it("meuPanorama uses getVidaFuncionalScope (no god-view)", () => {
    expect(src).toContain("getVidaFuncionalScope");
  });

  it("filters soft-deleted eventos", () => {
    expect(src).toMatch(/isNull\([^)]*deletedAt\)/);
  });

  it("coberturaRollup is an adminProcedure", () => {
    expect(src).toMatch(/coberturaRollup:\s*adminProcedure/);
  });

  it("coberturaRollup never selects valorCents (no sensitive value leak)", () => {
    // coberturaRollup must not touch the eventos value column.
    const idx = src.indexOf("coberturaRollup");
    expect(idx).toBeGreaterThan(-1);
    expect(src.slice(idx)).not.toContain("valorCents");
  });

  it("is registered in the appRouter", () => {
    const index = read("index.ts");
    expect(index).toContain("carreiraRouter");
    expect(index).toMatch(/carreira:\s*carreiraRouter/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/trpc/routers/__tests__/carreira-router.test.ts`
Expected: FAIL — `carreira.ts` does not exist.

- [ ] **Step 3: Write the router**

```ts
// src/lib/trpc/routers/carreira.ts
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { vidaFuncionalEventos, substituicoes, afastamentos, users } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { buildMeuPanorama, type EventoLite, type SubLite } from "@/lib/carreira/panorama";
import {
  buildCoberturaRollup,
  type AfastamentoLite,
  type SubstituicaoLite,
  type UserLite,
} from "@/lib/carreira/cobertura-rollup";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const carreiraRouter = router({
  /** Cockpit pessoal — privado ao defensor (admin sem god-view). */
  meuPanorama: protectedProcedure.query(async ({ ctx }) => {
    const scope = getVidaFuncionalScope(ctx.user);

    const eventosRows = await db
      .select()
      .from(vidaFuncionalEventos)
      .where(and(isNull(vidaFuncionalEventos.deletedAt), inArray(vidaFuncionalEventos.defensorId, scope)))
      .orderBy(desc(vidaFuncionalEventos.dataEvento));

    const subsRows = await db
      .select({ id: substituicoes.id, status: substituicoes.status })
      .from(substituicoes)
      .where(inArray(substituicoes.defensorId, scope));

    const eventos: EventoLite[] = eventosRows.map((e) => ({
      id: e.id, tipo: e.tipo, cluster: e.cluster, titulo: e.titulo, status: e.status,
      dataEvento: e.dataEvento, dataFim: e.dataFim, prazo: e.prazo, valorCents: e.valorCents,
    }));
    const subs: SubLite[] = subsRows.map((s) => ({ id: s.id, status: s.status ?? "em_andamento" }));

    return buildMeuPanorama({ eventos, substituicoes: subs }, todayISO());
  }),

  /** Rollup operacional de cobertura — admin, somente dados operacionais. */
  coberturaRollup: adminProcedure.query(async () => {
    const afRows = await db.select().from(afastamentos);
    const subRows = await db
      .select({
        id: substituicoes.id,
        defensorId: substituicoes.defensorId,
        afastamentoId: substituicoes.afastamentoId,
        unidadeSubstituida: substituicoes.unidadeSubstituida,
        status: substituicoes.status,
        oficioNumero: substituicoes.oficioNumero,
        relatorioPath: substituicoes.relatorioPath,
        seiProtocolo: substituicoes.seiProtocolo,
      })
      .from(substituicoes);
    const userRows = await db.select({ id: users.id, name: users.name }).from(users);

    const af: AfastamentoLite[] = afRows.map((a) => ({
      id: a.id, defensorId: a.defensorId, substitutoId: a.substitutoId,
      dataInicio: a.dataInicio, dataFim: a.dataFim, ativo: a.ativo, tipo: a.tipo,
    }));
    const sub: SubstituicaoLite[] = subRows.map((s) => ({
      id: s.id, defensorId: s.defensorId, afastamentoId: s.afastamentoId,
      unidadeSubstituida: s.unidadeSubstituida, status: s.status ?? "em_andamento",
      oficioNumero: s.oficioNumero, relatorioPath: s.relatorioPath, seiProtocolo: s.seiProtocolo,
    }));
    const us: UserLite[] = userRows.map((u) => ({ id: u.id, name: u.name ?? `#${u.id}` }));

    return buildCoberturaRollup({ afastamentos: af, substituicoes: sub, users: us }, todayISO());
  }),
});
```

- [ ] **Step 4: Register the router in `index.ts`**

Add the import near the other router imports (alongside `vidaFuncionalRouter`):

```ts
import { carreiraRouter } from "./carreira";
```

Add the entry inside the `appRouter` object (alongside `vidaFuncional: vidaFuncionalRouter`):

```ts
  carreira: carreiraRouter,
```

- [ ] **Step 5: Run the router test + typecheck**

Run: `npx vitest run src/lib/trpc/routers/__tests__/carreira-router.test.ts`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no new errors in `src/lib/carreira/` or `src/lib/trpc/routers/carreira.ts`. (If the project's `tsc --noEmit` is slow/noisy, scope the check mentally to the new files — they must compile against the imported schema column names.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/trpc/routers/carreira.ts src/lib/trpc/routers/index.ts src/lib/trpc/routers/__tests__/carreira-router.test.ts
git commit -m "feat(carreira): router de agregação (meuPanorama + coberturaRollup admin)"
```

---

### Task 4: Personal cockpit view

**Files:**
- Create: `src/app/(dashboard)/admin/carreira/_components/carreira-cockpit.tsx`

**Interfaces:**
- Consumes: `trpc.carreira.meuPanorama` (Task 3); `CollapsiblePageHeader`; `StatusChip`, `EmptyState` from `@/components/ds`; tokens from `@/lib/config/design-tokens`.
- Produces: `export function CarreiraCockpit()` — the personal cockpit, default-exported nothing (named export used by the page in Task 6).

- [ ] **Step 1: Write the component**

```tsx
// src/app/(dashboard)/admin/carreira/_components/carreira-cockpit.tsx
"use client";

import Link from "next/link";
import { CalendarClock, Briefcase, FileText, Plane } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { cn } from "@/lib/utils";

const CLUSTER_LABEL: Record<string, string> = {
  ausencias: "Ausências & designações",
  contraprestacao: "Contraprestação & compensação",
  progressao: "Progressão na carreira",
  administrativo: "Administrativo",
};

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.08]">
      <Icon className="w-4 h-4 text-white/70" />
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">{value}</div>
        <div className="text-[11px] text-white/60">{label}</div>
      </div>
    </div>
  );
}

export function CarreiraCockpit() {
  const { data, isLoading } = trpc.carreira.meuPanorama.useQuery();

  const kpis = data?.kpis;
  const stats = (
    <div className="flex flex-wrap items-center gap-2">
      <Kpi icon={CalendarClock} label="Próximo prazo" value={kpis?.proximoPrazo?.prazo ?? "—"} />
      <Kpi icon={Briefcase} label="Substituições ativas" value={kpis?.substituicoesAtivas ?? 0} />
      <Kpi icon={FileText} label="Pedidos pendentes" value={kpis?.pedidosPendentes ?? 0} />
      <Kpi icon={Plane} label="Férias agendadas" value={kpis?.feriasAgendadas ?? 0} />
    </div>
  );

  return (
    <CollapsiblePageHeader title="Carreira — meu dia a dia" icon={Briefcase}>
      {stats}
      <div className="p-4 space-y-4">
        {/* Agora & Próximos */}
        <section className={cn(CARD_STYLE.base, "p-4")}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Agora & próximos</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !data || data.agoraProximos.length === 0 ? (
            <EmptyState title="Nada ativo ou agendado nos próximos 90 dias" />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.agoraProximos.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.titulo}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {CLUSTER_LABEL[e.cluster] ?? e.cluster} · {e.prazo ? `prazo ${e.prazo}` : e.dataEvento}
                    </div>
                  </div>
                  <StatusChip status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Cluster cards */}
        <section className="grid gap-4 md:grid-cols-2">
          {(["ausencias", "contraprestacao", "progressao", "administrativo"] as const).map((c) => {
            const summary = data?.clusters[c];
            return (
              <div key={c} className={cn(CARD_STYLE.base, "p-4")}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={TYPO.h3}>{CLUSTER_LABEL[c]}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    {summary?.total ?? 0} · {summary?.emCurso ?? 0} em curso · {summary?.pendentes ?? 0} pendentes
                  </span>
                </div>
                {!summary || summary.itens.length === 0 ? (
                  <EmptyState title="Sem registros" />
                ) : (
                  <ul className="space-y-1">
                    {summary.itens.slice(0, 5).map((it) => (
                      <li key={it.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{it.titulo}</span>
                        <StatusChip status={it.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        {/* Trajetória link-out (full timeline lives in the dedicated page; promoted component wired in Task 6) */}
        <section className={cn(CARD_STYLE.base, "p-4")}>
          <div className="flex items-center justify-between">
            <h2 className={TYPO.h3}>Trajetória</h2>
            <Link href="/admin/carreira/vida-funcional" className="text-sm text-emerald-600 hover:underline">
              Ver linha do tempo completa →
            </Link>
          </div>
        </section>
      </div>
    </CollapsiblePageHeader>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors for `carreira-cockpit.tsx`. If `StatusChip`'s prop is not `status`, open `src/components/ds/status-chip.tsx`, read its `StatusChipProps`, and pass the correct prop (do not invent one).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/admin/carreira/_components/carreira-cockpit.tsx"
git commit -m "feat(carreira): cockpit pessoal (KPIs, agora&próximos, cards de cluster)"
```

---

### Task 5: Management cobertura view

**Files:**
- Create: `src/app/(dashboard)/admin/carreira/_components/cobertura-rollup-view.tsx`

**Interfaces:**
- Consumes: `trpc.carreira.coberturaRollup` (Task 3); `CollapsiblePageHeader`; `StatusChip`, `EmptyState`; tokens.
- Produces: `export function CoberturaRollupView()`.

- [ ] **Step 1: Write the component**

```tsx
// src/app/(dashboard)/admin/carreira/_components/cobertura-rollup-view.tsx
"use client";

import { Users, Briefcase, AlertTriangle, FileSignature } from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { StatusChip, EmptyState } from "@/components/ds";
import { trpc } from "@/lib/trpc/client";
import { CARD_STYLE, TYPO } from "@/lib/config/design-tokens";
import { cn } from "@/lib/utils";

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.08]">
      <Icon className="w-4 h-4 text-white/70" />
      <div className="leading-tight">
        <div className="text-sm font-semibold text-white">{value}</div>
        <div className="text-[11px] text-white/60">{label}</div>
      </div>
    </div>
  );
}

export function CoberturaRollupView() {
  const { data, isLoading } = trpc.carreira.coberturaRollup.useQuery();
  const k = data?.kpis;

  const stats = (
    <div className="flex flex-wrap items-center gap-2">
      <Kpi icon={Users} label="Afastados hoje" value={k?.afastadosHoje ?? 0} />
      <Kpi icon={Briefcase} label="Substituições abertas" value={k?.substituicoesAbertas ?? 0} />
      <Kpi icon={AlertTriangle} label="Sem cobertura" value={k?.semCobertura ?? 0} />
      <Kpi icon={FileSignature} label="A oficiar / a pagar" value={`${k?.gratificacoesAOficiar ?? 0} / ${k?.gratificacoesAPagar ?? 0}`} />
    </div>
  );

  return (
    <CollapsiblePageHeader title="Carreira — cobertura da regional" icon={Users}>
      {stats}
      <div className="p-4 space-y-4">
        {/* Cobertura */}
        <section className={cn(CARD_STYLE.base, "p-4")}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Cobertura ativa</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !data || data.cobertura.length === 0 ? (
            <EmptyState title="Nenhuma cobertura ativa" />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.cobertura.map((c) => (
                <li key={c.afastamentoId} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.defensorAfastado} → {c.defensorSubstituto}</div>
                    <div className="text-[11px] text-muted-foreground">{c.periodo}</div>
                  </div>
                  {c.statusGratificacao ? <StatusChip status={c.statusGratificacao} /> : <span className="text-[11px] text-amber-600">sem gratificação</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pendências */}
        <section className={cn(CARD_STYLE.base, "p-4")}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Pendências operacionais</h2>
          {!data || data.pendencias.length === 0 ? (
            <EmptyState title="Sem pendências" />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {data.pendencias.map((p) => (
                <li key={p.substituicaoId} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.defensorSubstituto} · {p.unidadeSubstituida}</div>
                    <div className="text-[11px] text-muted-foreground">falta: {p.faltando.length ? p.faltando.join(", ") : "—"}</div>
                  </div>
                  <StatusChip status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Por defensor */}
        <section className={cn(CARD_STYLE.base, "p-4")}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Por defensor</h2>
          {!data || data.porDefensor.length === 0 ? (
            <EmptyState title="Sem dados" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-muted-foreground">
                  <th className="py-1">Defensor</th>
                  <th className="py-1">Subst. abertas</th>
                  <th className="py-1">Afastado</th>
                </tr>
              </thead>
              <tbody>
                {data.porDefensor.map((d) => (
                  <tr key={d.defensorId} className="border-t border-neutral-100">
                    <td className="py-1">{d.nome}</td>
                    <td className="py-1">{d.substituicoesAbertas}</td>
                    <td className="py-1">{d.afastamentoAtivo ? "sim" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </CollapsiblePageHeader>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors for `cobertura-rollup-view.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/admin/carreira/_components/cobertura-rollup-view.tsx"
git commit -m "feat(carreira): view de cobertura da regional (admin)"
```

---

### Task 6: Page with role switch + reuse the trajetória timeline

**Files:**
- Create: `src/app/(dashboard)/admin/carreira/page.tsx`
- Create: `src/components/carreira/trajetoria-timeline.tsx` (promoted from the route-private copy)
- Modify: `src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx` (re-point its import)
- Modify: `src/app/(dashboard)/admin/carreira/_components/carreira-cockpit.tsx` (swap the link-out section for the real timeline)
- Delete: `src/app/(dashboard)/admin/carreira/vida-funcional/_components/trajetoria-timeline.tsx`

**Interfaces:**
- Consumes: `trpc.auth.me` (returns the current user incl. `role`); `CarreiraCockpit` (Task 4); `CoberturaRollupView` (Task 5); `TrajetoriaTimeline`.
- Produces: default-exported `CarreiraPage` at route `/admin/carreira`; shared `TrajetoriaTimeline` at `@/components/carreira/trajetoria-timeline`.

- [ ] **Step 1: Promote the timeline component (move file verbatim)**

Copy the existing file `src/app/(dashboard)/admin/carreira/vida-funcional/_components/trajetoria-timeline.tsx` to `src/components/carreira/trajetoria-timeline.tsx` **unchanged** (its imports are all shared: `@/lib/utils`, `@/components/shared/timeline`, `@/lib/vida-funcional/tipo-cluster`). Then delete the original.

```bash
mkdir -p src/components/carreira
git mv "src/app/(dashboard)/admin/carreira/vida-funcional/_components/trajetoria-timeline.tsx" src/components/carreira/trajetoria-timeline.tsx
```

- [ ] **Step 2: Re-point the existing importer**

In `src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx`, change:

```ts
import { TrajetoriaTimeline } from "./trajetoria-timeline";
```

to:

```ts
import { TrajetoriaTimeline } from "@/components/carreira/trajetoria-timeline";
```

- [ ] **Step 3: Run the existing vida-funcional suite to confirm no regression**

Run: `npx vitest run src/app/\(dashboard\)/admin/header-cobertura.test.ts`
Expected: PASS (this guards the canonical header; the move must not break it).

Run: `npx tsc --noEmit`
Expected: no new errors — the import path resolves and `vida-funcional-view.tsx` still compiles.

- [ ] **Step 4: Swap the cockpit's link-out for the real timeline**

In `src/app/(dashboard)/admin/carreira/_components/carreira-cockpit.tsx`, add the import:

```ts
import { TrajetoriaTimeline } from "@/components/carreira/trajetoria-timeline";
```

Replace the entire "Trajetória link-out" `<section>` (added in Task 4) with:

```tsx
        {/* Trajetória — reutiliza o timeline promovido a compartilhado */}
        <section className={cn(CARD_STYLE.base, "p-4")}>
          <h2 className={cn(TYPO.h3, "mb-3")}>Trajetória</h2>
          <TrajetoriaTimeline
            eventos={(data?.agoraProximos ?? []).map((e) => ({
              id: e.id, tipo: e.tipo, titulo: e.titulo, dataEvento: e.dataEvento, driveFolderId: null,
            }))}
            isLoading={isLoading}
          />
        </section>
```

(`TrajetoriaTimeline` expects `EventoLite = { id; tipo; titulo; dataEvento; driveFolderId }` — map the panorama items to that shape. The full marcos/operacional timeline still lives in the dedicated vida-funcional page; this panel is a compact in-cockpit view.)

- [ ] **Step 5: Write the page with role switch**

```tsx
// src/app/(dashboard)/admin/carreira/page.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { CarreiraCockpit } from "./_components/carreira-cockpit";
import { CoberturaRollupView } from "./_components/cobertura-rollup-view";

export default function CarreiraPage() {
  const { data: me, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  // Admin/coordenador → rollup operacional; demais → cockpit pessoal.
  if (me?.role === "admin") {
    return <CoberturaRollupView />;
  }
  return <CarreiraCockpit />;
}
```

- [ ] **Step 6: Verify build + typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. Confirm `trpc.auth.me` returns an object with a `role` field (it does — `auth.me` returns `ctx.user`); if the client type is `unknown`, use `trpc.auth.profile` instead, which returns `{ role }` explicitly.

- [ ] **Step 7: Run the full carreira test set**

Run: `npx vitest run src/lib/carreira src/lib/trpc/routers/__tests__/carreira-router.test.ts`
Expected: PASS (all pure-logic + structural tests).

- [ ] **Step 8: Commit**

```bash
git add "src/app/(dashboard)/admin/carreira/page.tsx" \
        src/components/carreira/trajetoria-timeline.tsx \
        "src/app/(dashboard)/admin/carreira/_components/carreira-cockpit.tsx" \
        "src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx"
git commit -m "feat(carreira): página com role-switch + timeline promovida a compartilhada"
```

---

### Task 7: Manual smoke check + plan close-out

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server (Turbopack — project requirement for the PDF/react stack)**

Run: `npm run dev:turbo`
Expected: server boots without "Export … doesn't exist" errors.

- [ ] **Step 2: Visit the page as a defensor**

Open `http://localhost:3000/admin/carreira`. Expected: the personal cockpit renders with the four KPI chips, an "Agora & próximos" panel (or its empty state), four cluster cards, and a Trajetória panel.

- [ ] **Step 3: Visit the page as an admin**

With an admin session, open `/admin/carreira`. Expected: the cobertura rollup renders (afastados hoje / substituições abertas / sem cobertura / a oficiar-a pagar), the cobertura list, pendências, and the per-defensor table.

- [ ] **Step 4: Confirm the privacy boundary**

As a non-admin, confirm the page never shows the cobertura rollup (only the personal cockpit). The `coberturaRollup` procedure is admin-gated server-side, so even a forced call returns FORBIDDEN.

- [ ] **Step 5: Final commit (if any doc/tweak)**

```bash
git add -A && git commit -m "chore(carreira): smoke check do Hub panorâmico" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- §3 route + read-only aggregation router → Tasks 3, 6. ✓
- §4 `meuPanorama` contract (KPIs, agoraProximos, clusters) → Task 1 (logic) + Task 3 (wiring). ✓
- §4 `coberturaRollup` contract (afastamentos LEFT JOIN substituições, semCobertura, statusGratificacao) → Task 2 + Task 3. ✓
- §2 privacy boundary (getVidaFuncionalScope, admin-gated rollup, no valorCents leak) → enforced in Task 3, guarded by Task 3 structural test. ✓
- §5 UI (personal cockpit + management rollup, Padrão Defender v5, EmptyState) → Tasks 4, 5, 6. ✓
- §5 Trajetória reuse via promoting `trajetoria-timeline.tsx` → Task 6. ✓
- §6 tests (scope/admin gating structural, aggregation correctness, soft-delete, cobertura join edge) → Tasks 1, 2, 3. ✓
- §7 out-of-scope respected: no new schema, no mutations. ✓

**Placeholder scan:** no TBDs; every code step shows full code. The two "if the prop differs, read the source" notes (StatusChip, auth.me typing) are defensive fallbacks against unverified third-party prop names, not placeholders for the task's own logic.

**Type consistency:** `EventoLite`/`SubLite` defined in Task 1 and imported by Task 3; `AfastamentoLite`/`SubstituicaoLite`/`UserLite`/`CoberturaRollup` defined in Task 2 and imported by Task 3. `buildMeuPanorama`/`buildCoberturaRollup` signatures match between definition and call sites. Status string literals match the Global Constraints vocabulary throughout.
