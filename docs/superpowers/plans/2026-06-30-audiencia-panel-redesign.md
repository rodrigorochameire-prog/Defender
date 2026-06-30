# Audiência Panel Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the EventDetailSheet into 5 new tabs (Imputação / Depoimentos / Laudos e documentos / Estratégia e teses / Execução), fix deponent card visual (faixa top, straight borders, semantic colors), and integrate intimação status into each deponent card.

**Architecture:** Pure UI and mapping changes — no DB migrations. The `AreaMae` type is the single source of truth for tab identity; all consumers are TypeScript-typed so renaming it will surface every callsite at compile time. Visual changes are isolated to three components: `DepoenteCardV2`, `PessoaAvatar`, and `DepoentesSecao`.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-06-30-audiencia-panel-redesign.md`

---

## File Map

| File | Change type |
|------|-------------|
| `src/components/agenda/sheet/areas-mae.ts` | Rewrite mappings — new AreaMae, labels, SECAO_TO_AREA |
| `src/components/agenda/sheet/areas-mae.test.ts` | Update all literals to new area names |
| `src/components/agenda/sheet/area-tabs.test.tsx` | Update tab labels and area literals |
| `src/components/agenda/sheet/secoes-manifest.ts` | Reorder SECOES_INSTRUCAO espinha only |
| `src/components/agenda/sheet/secoes-manifest.test.ts` | Update if espinha order is asserted |
| `src/components/agenda/sheet/prova-oral-console.tsx` | Rename export ProvaOralConsole → DepoimentosConsole |
| `src/components/agenda/event-detail-sheet.tsx` | Default tab + "prova-oral" ref + import rename + certidaoComunicacao wiring |
| `src/components/shared/pessoa-avatar.tsx` | Fix DEFAULT_TONE + add 4 entries to PAPEL_AVATAR_MAP |
| `src/components/agenda/sheet/depoente-card-v2.tsx` | Faixa top, rounded-none, intimação line, certidão expander |
| `src/components/agenda/sheet/secoes/DepoentesSecao.tsx` | Grouped by Acusação / Defesa |

---

## Task 1: Update `areas-mae.ts` — new AreaMae and mappings

**Files:**
- Modify: `src/components/agenda/sheet/areas-mae.ts`

- [ ] **Step 1: Update the test first so it fails**

In `src/components/agenda/sheet/areas-mae.test.ts`, replace every area literal with the new names. Full diff:

```ts
// Line 15 — was:
expect(AREA_ORDER).toEqual(["resumo", "estrategia", "prova-oral", "documentos", "execucao"]);
// becomes:
expect(AREA_ORDER).toEqual(["imputacao", "depoimentos", "laudos-docs", "estrategia", "execucao"]);

// Line 39 — was:
expect(areaDaSecao("depoentes")).toBe("prova-oral");
expect(areaDaSecao("teses")).toBe("estrategia");
expect(areaDaSecao("documentos")).toBe("documentos");
expect(areaDaSecao("ata")).toBe("execucao");
expect(areaDaSecao("resumo")).toBe("resumo");
// becomes:
expect(areaDaSecao("depoentes")).toBe("imputacao");
expect(areaDaSecao("teses")).toBe("estrategia");
expect(areaDaSecao("documentos")).toBe("laudos-docs");
expect(areaDaSecao("ata")).toBe("execucao");
expect(areaDaSecao("resumo")).toBe("imputacao");

// Line 47-50 — was:
const visiveis: SecaoId[] = ["resumo", "depoentes", "teses", "depoimentos", "documentos"];
expect(secoesDaArea("prova-oral", visiveis)).toEqual(["depoentes", "depoimentos"]);
expect(secoesDaArea("resumo", visiveis)).toEqual(["resumo"]);
expect(secoesDaArea("execucao", visiveis)).toEqual([]);
// becomes:
const visiveis: SecaoId[] = ["resumo", "depoentes", "teses", "depoimentos", "documentos"];
expect(secoesDaArea("imputacao", visiveis)).toEqual(["resumo", "depoentes"]);
expect(secoesDaArea("depoimentos", visiveis)).toEqual(["depoimentos"]);
expect(secoesDaArea("execucao", visiveis)).toEqual([]);

// Lines 62-93 (computeWorkspaceTabs tests) — replace all "resumo"/"prova-oral"/"documentos" area literals:
// "resumo" → "imputacao", "prova-oral" → "depoimentos", "documentos" → "laudos-docs"
// Specifically, on line 67: expect(r.areaCounts.resumo).toBe(1) → expect(r.areaCounts.imputacao).toBe(1)
// Line 68: expect(r.areaCounts["prova-oral"]).toBe(2) → expect(r.areaCounts.depoimentos).toBe(2)
// Line 69: expect(r.areaCounts.documentos).toBe(1) → expect(r.areaCounts["laudos-docs"]).toBe(1)
// Line 72: expect(r.areasComConteudo).toEqual(["resumo", "prova-oral", "documentos"]) →
//           expect(r.areasComConteudo).toEqual(["imputacao", "depoimentos", "laudos-docs"])
// Line 76 activeTab: "resumo" → "imputacao"
// Line 80 activeTab arg: "prova-oral" → "depoimentos"
// Line 82 expect tabAtiva: "prova-oral" → "depoimentos"
// Line 83 espinhaDaTab: ["depoentes"] stays (just maps to imputacao now)
// Line 91 activeTab: "estrategia" stays (still vazia in new scheme)
// Line 93 expect tabAtiva: "prova-oral" → "imputacao" (first with content = imputacao for input ["depoentes","documentos"])
// Line 98 activeTab: "documentos" → "laudos-docs"
// Line 103: espinhaDaTab — fatos maps to imputacao now, so expect []: expect(r.espinhaDaTab).toEqual([])
//            contextoDaTab — laudos maps to laudos-docs, so expect []: expect(r.contextoDaTab).toEqual([])
// Line 108 activeTab: "resumo" → "imputacao"
// Line 115 expect tabAtiva: "resumo" → "imputacao"
```

- [ ] **Step 2: Confirm test fails**

```bash
npx vitest run src/components/agenda/sheet/areas-mae.test.ts
```

Expected: multiple failures with "expected X to be Y".

- [ ] **Step 3: Rewrite `areas-mae.ts`**

Replace the entire file content with:

```ts
import type { SecaoId } from "./secoes-manifest";

export type AreaMae = "imputacao" | "depoimentos" | "laudos-docs" | "estrategia" | "execucao";

export const AREA_ORDER: AreaMae[] = ["imputacao", "depoimentos", "laudos-docs", "estrategia", "execucao"];

export const AREA_LABELS: Record<AreaMae, string> = {
  imputacao: "Imputação",
  depoimentos: "Depoimentos",
  "laudos-docs": "Laudos e documentos",
  estrategia: "Estratégia e teses",
  execucao: "Execução",
};

export const SECAO_TO_AREA: Record<SecaoId, AreaMae> = {
  // IMPUTAÇÃO — contexto do caso, denúncia, rol de testemunhas
  resumo: "imputacao",
  "resumo-audiencia": "imputacao",
  "motivo-designacao": "imputacao",
  sintese: "imputacao",
  imputacao: "imputacao",
  fatos: "imputacao",
  depoentes: "imputacao",

  // DEPOIMENTOS — oitiva, intimação, depoimento IP e juízo
  depoimentos: "depoimentos",
  intimacao: "depoimentos",

  // LAUDOS E DOCUMENTOS — provas técnicas, relatos, medidas
  laudos: "laudos-docs",
  documentos: "laudos-docs",
  "relato-vitima": "laudos-docs",
  medidas: "laudos-docs",
  versao: "laudos-docs",
  midia: "laudos-docs",

  // ESTRATÉGIA E TESES — preparação jurídica
  dossie: "estrategia",
  "analise-ia": "estrategia",
  contradicoes: "estrategia",
  teses: "estrategia",
  "requerimento-defesa": "estrategia",

  // EXECUÇÃO — condução ao vivo e medidas processuais
  ata: "execucao",
  "anotacoes-rapidas": "execucao",
  investigacao: "execucao",
  pendencias: "execucao",
  preventiva: "execucao",
  cautelares: "execucao",
};

export function areaDaSecao(id: SecaoId): AreaMae {
  return SECAO_TO_AREA[id];
}

export function secoesDaArea(area: AreaMae, visiveis: SecaoId[]): SecaoId[] {
  return visiveis.filter((id) => SECAO_TO_AREA[id] === area);
}

export interface WorkspaceTabState {
  areasComConteudo: AreaMae[];
  tabAtiva: AreaMae;
  espinhaDaTab: SecaoId[];
  contextoDaTab: SecaoId[];
  areaCounts: Record<AreaMae, number>;
}

export function computeWorkspaceTabs(args: {
  secoesVisiveis: SecaoId[];
  espinhaVisiveis: SecaoId[];
  contextoIds: SecaoId[];
  activeTab: AreaMae;
}): WorkspaceTabState {
  const { secoesVisiveis, espinhaVisiveis, contextoIds, activeTab } = args;

  const areaCounts = AREA_ORDER.reduce((acc, a) => {
    acc[a] = secoesVisiveis.filter((id) => SECAO_TO_AREA[id] === a).length;
    return acc;
  }, {} as Record<AreaMae, number>);

  const areasComConteudo = AREA_ORDER.filter((a) => areaCounts[a] > 0);
  const tabAtiva: AreaMae = areasComConteudo.includes(activeTab)
    ? activeTab
    : (areasComConteudo[0] ?? "imputacao");

  return {
    areaCounts,
    areasComConteudo,
    tabAtiva,
    espinhaDaTab: espinhaVisiveis.filter((id) => SECAO_TO_AREA[id] === tabAtiva),
    contextoDaTab: contextoIds.filter((id) => SECAO_TO_AREA[id] === tabAtiva),
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/components/agenda/sheet/areas-mae.test.ts
```

Expected: all green.

- [ ] **Step 5: Typecheck (catches all AreaMae consumers)**

```bash
npm run typecheck 2>&1 | head -40
```

The TypeScript compiler will surface every file referencing old area names. Note each error location — you will fix them in subsequent tasks.

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/sheet/areas-mae.ts src/components/agenda/sheet/areas-mae.test.ts
git commit -m "refactor(areas-mae): new AreaMae — imputacao/depoimentos/laudos-docs/estrategia/execucao"
```

---

## Task 2: Update `secoes-manifest.ts` — reorder SECOES_INSTRUCAO

**Files:**
- Modify: `src/components/agenda/sheet/secoes-manifest.ts`

- [ ] **Step 1: Apply the canonical SECOES_INSTRUCAO order unconditionally**

In `secoes-manifest.ts`, replace the `SECOES_INSTRUCAO` array with the definitive order from the spec (§4.5). Do not grep-and-decide — apply it regardless of what's currently there:

```ts
export const SECOES_INSTRUCAO: SecaoId[] = [
  // Espinha (7)
  "resumo",        // narrativa do caso — topo da aba Imputação
  "imputacao",
  "fatos",
  "depoentes",
  "depoimentos",
  "laudos",
  "documentos",
  // Preparação
  "dossie",
  "teses",
  // Contexto (colapsado via GRUPO_CONTEXTO_INSTRUCAO)
  "contradicoes", "versao", "relato-vitima", "sintese",
  "investigacao", "pendencias", "medidas", "ata",
  "anotacoes-rapidas", "analise-ia", "midia",
];
```

- [ ] **Step 2: Check secoes-manifest test**

```bash
npx vitest run src/components/agenda/sheet/secoes-manifest.test.ts
```

If it passes without changes: done. If it fails because of order assertions: update the test to reflect the new order.

- [ ] **Step 3: Commit (only if any change was needed)**

```bash
git add src/components/agenda/sheet/secoes-manifest.ts src/components/agenda/sheet/secoes-manifest.test.ts
git commit -m "refactor(secoes-manifest): resumo first in SECOES_INSTRUCAO espinha"
```

---

## Task 3: Update `prova-oral-console.tsx` and `event-detail-sheet.tsx`

**Files:**
- Modify: `src/components/agenda/sheet/prova-oral-console.tsx`
- Modify: `src/components/agenda/event-detail-sheet.tsx`

- [ ] **Step 1: Rename export in `prova-oral-console.tsx`**

Open the file and change the exported function name:

```ts
// was:
export function ProvaOralConsole({ resumo }: { resumo: ... }) {
// becomes:
export function DepoimentosConsole({ resumo }: { resumo: ... }) {
```

Keep the filename as-is (`prova-oral-console.tsx`) — renaming the file would require updating more imports and is unnecessary.

- [ ] **Step 2: Update `event-detail-sheet.tsx`**

Three targeted changes:

**2a. Import rename (near top of file, around line 18):**
```ts
// was:
import { ProvaOralConsole } from "@/components/agenda/sheet/prova-oral-console";
// becomes:
import { DepoimentosConsole } from "@/components/agenda/sheet/prova-oral-console";
```

**2b. Default tab state (line 222):**
```ts
// was:
const [activeTab, setActiveTab] = useState<AreaMae>("resumo");
// becomes:
const [activeTab, setActiveTab] = useState<AreaMae>("imputacao");
```

**2c. Hardcoded area check (around line 1493) — also rename `resumoProvaOral` import:**

```ts
// was:
import { resumoProvaOral } from "@/lib/agenda/depoente-status";
// becomes:
import { resumoDepoimentos } from "@/lib/agenda/depoente-status";
```

In `src/lib/agenda/depoente-status.ts`, add an alias export (or rename the function — check if it's used elsewhere first with `grep -r "resumoProvaOral" src/`):

```ts
// If used only in event-detail-sheet, rename the function directly:
export function resumoDepoimentos(...) { ... }  // was resumoProvaOral

// If used elsewhere, add alias and keep original:
export { resumoProvaOral as resumoDepoimentos };
```

Update the callsite in `event-detail-sheet.tsx`:
```ts
// was:
{!isLoading && tabAtiva === "prova-oral" && depoentesStatus.length > 0 && (
  <ProvaOralConsole resumo={resumoProvaOral(depoentesStatus)} />
)}
// becomes:
{!isLoading && tabAtiva === "depoimentos" && depoentesStatus.length > 0 && (
  <DepoimentosConsole resumo={resumoDepoimentos(depoentesStatus)} />
)}
```

**2d. Wire `certidaoComunicacao` into the `depoentes` memo**

The `depoentes` array (used by `DepoenteCardV2`) is built in `event-detail-sheet.tsx` around line 389. `testemunhasDB` entries already carry `certidaoComunicacao` from the DB, but `testemunhasAcusacao`/`testemunhasDefesa` (from AI analysis) do not. Add a name-based merge to populate the field for all entries.

Find the `certidaoPorNome` map already built inside `depoentesStatus` (lines ~413–417) and extract it as its own `useMemo` ABOVE both `depoentes` and `depoentesStatus`:

```ts
// Insert this BEFORE the depoentes useMemo (around line 389):
const certidaoPorNome = useMemo(() => {
  const norm = (s: unknown) =>
    typeof s === "string"
      ? s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()
      : "";
  const m = new Map<string, string>();
  for (const t of testemunhasDB as any[]) {
    const teor = t?.certidaoComunicacao as string | undefined;
    const key = norm(t?.nome);
    if (key && typeof teor === "string" && teor.trim()) m.set(key, teor);
  }
  return m;
}, [testemunhasDB]);
```

Then update the `depoentes` useMemo to enrich each entry:

```ts
const depoentes = useMemo(() => {
  const norm = (s: unknown) =>
    typeof s === "string"
      ? s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()
      : "";
  const all = [
    ...testemunhasDB.map((t: any) => ({ ...t, _source: "db" })),
    ...testemunhasAcusacao.map((t: any) => ({ ...t, lado: "acusacao", tipo: "ACUSACAO" })),
    ...testemunhasDefesa.map((t: any) => ({ ...t, lado: "defesa", tipo: "DEFESA" })),
  ];
  const seen = new Set<string>();
  return all
    .filter((d) => {
      const key = (d.nome ?? "").toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((d: any) => {
      const certidao =
        d?.certidao_comunicacao ?? d?.certidaoComunicacao ?? certidaoPorNome.get(norm(d?.nome));
      return certidao ? { ...d, certidaoComunicacao: certidao } : d;
    });
}, [testemunhasDB, testemunhasAcusacao, testemunhasDefesa, certidaoPorNome]);
```

Finally, update `depoentesStatus` to use the extracted `certidaoPorNome` instead of rebuilding it internally (remove the duplicate map-building code from that memo).

After this change, `d.certidaoComunicacao` in the DepoenteCardV2 call will be populated whenever the data is available.

- [ ] **Step 3: Update `area-tabs.test.tsx`**

Replace the test file content with updated tab label assertions:

```ts
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AreaTabs } from "./area-tabs";
import { AREA_ORDER } from "./areas-mae";

afterEach(() => cleanup());

describe("AreaTabs", () => {
  it("renderiza um tab por área informada, com rótulo legível", () => {
    render(<AreaTabs areas={AREA_ORDER} active="imputacao" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Imputação/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Depoimentos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Laudos e documentos/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Estratégia e teses/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Execução/i })).toBeInTheDocument();
  });

  it("marca o tab ativo com aria-selected", () => {
    render(<AreaTabs areas={AREA_ORDER} active="depoimentos" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /Depoimentos/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Imputação/i })).toHaveAttribute("aria-selected", "false");
  });

  it("dispara onChange com a área ao clicar", () => {
    const onChange = vi.fn();
    render(<AreaTabs areas={AREA_ORDER} active="imputacao" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /Laudos e documentos/i }));
    expect(onChange).toHaveBeenCalledWith("laudos-docs");
  });

  it("mostra contagem por área quando fornecida", () => {
    render(
      <AreaTabs
        areas={["imputacao", "depoimentos"]}
        active="imputacao"
        onChange={() => {}}
        counts={{ "depoimentos": 3 }}
      />
    );
    expect(screen.getByRole("tab", { name: /Depoimentos/i })).toHaveTextContent("3");
  });

  it("só renderiza as áreas passadas (esconde modos vazios)", () => {
    render(<AreaTabs areas={["imputacao", "execucao"]} active="imputacao" onChange={() => {}} />);
    expect(screen.queryByRole("tab", { name: /Estratégia/i })).toBeNull();
    expect(screen.getByRole("tab", { name: /Execução/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/components/agenda/sheet/area-tabs.test.tsx
```

Expected: all green.

- [ ] **Step 5: Full typecheck**

```bash
npm run typecheck 2>&1 | grep -v "node_modules" | head -30
```

Expected: zero errors (or only errors in later tasks).

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/sheet/prova-oral-console.tsx \
        src/components/agenda/event-detail-sheet.tsx \
        src/components/agenda/sheet/area-tabs.test.tsx
git commit -m "refactor(sheet): rename ProvaOralConsole→DepoimentosConsole, default tab imputacao"
```

---

## Task 4: Fix `PessoaAvatar` semantic colors

**Files:**
- Modify: `src/components/shared/pessoa-avatar.tsx`

- [ ] **Step 1: Fix `DEFAULT_TONE` (line 45)**

```ts
// was:
const DEFAULT_TONE: PapelTone = { ...NEUTRAL_BG, text: "text-violet-700", ring: "ring-violet-300/60 dark:ring-violet-700/40", darkText: "dark:text-violet-300" };

// becomes:
const DEFAULT_TONE: PapelTone = { ...NEUTRAL_BG, text: "text-neutral-500", ring: "ring-neutral-200/70 dark:ring-neutral-700/50", darkText: "dark:text-neutral-300" };
```

- [ ] **Step 2: Add 4 entries to `PAPEL_AVATAR_MAP`**

After the existing `PERITO` entry (or at the end of the map), add:

```ts
const PAPEL_AVATAR_MAP: Record<string, PapelTone> = {
  REU:        { ...NEUTRAL_BG, text: "text-neutral-500", ring: "ring-neutral-200/70 dark:ring-neutral-700/50", darkText: "dark:text-neutral-300" },
  CORREU:     { ...NEUTRAL_BG, text: "text-neutral-500", ring: "ring-neutral-200/70 dark:ring-neutral-700/50", darkText: "dark:text-neutral-300" },
  VITIMA:     { ...NEUTRAL_BG, text: "text-rose-700",    ring: "ring-rose-300/60 dark:ring-rose-700/40",       darkText: "dark:text-rose-300" },
  OFENDIDO:   { ...NEUTRAL_BG, text: "text-rose-700",    ring: "ring-rose-300/60 dark:ring-rose-700/40",       darkText: "dark:text-rose-300" },
  TESTEMUNHA: { ...NEUTRAL_BG, text: "text-blue-700",    ring: "ring-blue-300/60 dark:ring-blue-700/40",       darkText: "dark:text-blue-300" },
  // NEW:
  ACUSACAO:     { ...NEUTRAL_BG, text: "text-rose-700",    ring: "ring-rose-300/60 dark:ring-rose-700/40",       darkText: "dark:text-rose-300" },
  INTERROGANDO: { ...NEUTRAL_BG, text: "text-emerald-700", ring: "ring-emerald-300/60 dark:ring-emerald-700/40", darkText: "dark:text-emerald-300" },
  INFORMANTE:   { ...NEUTRAL_BG, text: "text-neutral-500", ring: "ring-neutral-200/70 dark:ring-neutral-700/50", darkText: "dark:text-neutral-300" },
  PERITO:       { ...NEUTRAL_BG, text: "text-indigo-700",  ring: "ring-indigo-300/60 dark:ring-indigo-700/40",   darkText: "dark:text-indigo-300" },
};
```

Note: `DEFESA` is handled in the `DepoenteCardV2` by passing `papel="DEFESA"` — which will hit the existing `DEFAULT_TONE` (neutral). To make defesa avatars emerald, add `DEFESA` too:

```ts
  DEFESA: { ...NEUTRAL_BG, text: "text-emerald-700", ring: "ring-emerald-300/60 dark:ring-emerald-700/40", darkText: "dark:text-emerald-300" },
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck 2>&1 | grep "pessoa-avatar" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/pessoa-avatar.tsx
git commit -m "fix(pessoa-avatar): semantic colors — rose=acusação, emerald=defesa/interrogatório, neutral default"
```

---

## Task 5: Redesign `DepoenteCardV2`

**Files:**
- Modify: `src/components/agenda/sheet/depoente-card-v2.tsx`

This task has the most visual changes. Work methodically through each sub-step.

- [ ] **Step 1: Add `certidaoComunicacao` to `DepoenteV2` interface**

```ts
export interface DepoenteV2 {
  id?: number;
  nome: string;
  tipo?: "ACUSACAO" | "DEFESA" | "COMUM" | "INFORMANTE" | "PERITO" | "VITIMA";
  status?: "ARROLADA" | "INTIMADA" | "OUVIDA" | "DESISTIDA" | "NAO_LOCALIZADA" | "CARTA_PRECATORIA";
  lado?: string;
  qualidade?: string;
  papel?: string;
  versaoDelegacia?: string | null;
  versaoJuizo?: string | null;
  sinteseJuizo?: string | null;
  perguntasSugeridas?: string | null;
  ouvidoEm?: Date | string | null;
  redesignadoPara?: string | null;
  audioDriveFileId?: string | null;
  certidaoComunicacao?: string | null;  // ADD THIS
}
```

- [ ] **Step 2: Replace `ladoBorder` with `topBarColor` map**

Remove:
```ts
const ladoBorder = {
  acusacao: "border-l-rose-300/70",
  defesa: "border-l-emerald-300/70",
  neutro: "border-l-neutral-200",
}[lado];
```

Add:
```ts
const topBarColor = {
  acusacao: "bg-rose-300/70",
  defesa: "bg-emerald-300/70",
  neutro: "bg-neutral-200",
}[lado];

const papelParaAvatar = { acusacao: "ACUSACAO", defesa: "DEFESA", neutro: undefined }[lado] as string | undefined;
```

- [ ] **Step 3: Add intimação status helper below `qualidadeLabel`**

```ts
function intimacaoLabel(status?: string): { text: string; color: string } | null {
  switch (status) {
    case "INTIMADA":        return { text: "Intimada",                        color: "text-emerald-600 dark:text-emerald-400" };
    case "ARROLADA":        return { text: "Não intimada",                    color: "text-rose-600 dark:text-rose-400" };
    case "NAO_LOCALIZADA":  return { text: "Não intimada — não localizada",   color: "text-rose-600 dark:text-rose-400" };
    case "CARTA_PRECATORIA":return { text: "Carta precatória expedida",       color: "text-amber-600 dark:text-amber-400" };
    case "DESISTIDA":       return { text: "Desistência comunicada",          color: "text-neutral-400 dark:text-neutral-500" };
    default:                return null;
  }
}
```

- [ ] **Step 4: Update the card wrapper — remove `rounded-lg` and `border-l-[3px]`, add faixa top**

The outer `<div>` currently is:
```tsx
<div
  data-lado={lado}
  className={cn(
    "rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 border-l-[3px] overflow-hidden",
    ladoBorder
  )}
>
```

Change to:
```tsx
<div
  data-lado={lado}
  className="border border-neutral-200/60 dark:border-neutral-700/60 overflow-hidden"
>
  {/* Semantic top bar */}
  <div className={cn("h-[3px] w-full", topBarColor)} />
```

- [ ] **Step 5: Update `PessoaAvatar` call — pass `papel` semantically**

Find the `<PessoaAvatar>` call inside the card header and add the `papel` prop:

```tsx
<PessoaAvatar
  nome={depoente.nome}
  photoUrl={avatarUrl}
  papel={papelParaAvatar}  // ADD: drives rose/emerald/neutral ring
  size="sm"
/>
```

- [ ] **Step 6: Update card button — remove `rounded-md` → `rounded-none` (or remove entirely)**

The header `<button>`:
```tsx
// was className ending: "hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20"
// no change needed here — buttons inside use rounded-md, change those in step 7
```

- [ ] **Step 7: Add intimação line and certidão expander to card body**

In the card body `<div className="px-3 pb-3 ...">`, insert BEFORE the DELEGACIA block:

```tsx
{/* Intimação status */}
{(() => {
  const intim = intimacaoLabel(depoente.status);
  return intim ? (
    <div>
      <p className={cn("text-[10px] font-medium leading-snug", intim.color)}>{intim.text}</p>
      {depoente.certidaoComunicacao && (
        <CertidaoExpander teor={depoente.certidaoComunicacao} />
      )}
    </div>
  ) : null;
})()}
```

Add `CertidaoExpander` (copy the identical component from `DepoentesSecao.tsx` — same implementation, just local):

```tsx
function CertidaoExpander({ teor }: { teor: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 hover:text-emerald-600 dark:text-neutral-400 cursor-pointer"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        <FileText className="h-3 w-3" />
        {open ? "Ocultar certidão de comunicação" : "Ver certidão de comunicação"}
      </button>
      {open && (
        <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded ring-1 ring-neutral-200 p-2 text-[10.5px] leading-relaxed text-neutral-600 dark:text-neutral-400 dark:ring-neutral-800">
          {teor}
        </p>
      )}
    </div>
  );
}
```

Add `FileText` to the lucide imports at the top.

- [ ] **Step 8: Straighten action buttons — remove `rounded-md` → no radius**

Each action button currently has `rounded-md`. Remove it (no class = square corners with Tailwind's default reset):

```tsx
// was: className="text-[10px] font-medium px-2 py-1 rounded-md bg-emerald-50 ..."
// becomes: className="text-[10px] font-medium px-2 py-1 bg-emerald-50 ..."
```

Apply to all 4 action buttons (Marcar ouvido, Redesignar, + Pergunta, Áudio).

- [ ] **Step 9: Typecheck**

```bash
npm run typecheck 2>&1 | grep "depoente-card" | head -10
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/agenda/sheet/depoente-card-v2.tsx
git commit -m "feat(depoente-card): faixa top semântica, bordas retas, intimação + certidão integradas"
```

---

## Task 6: Rewrite `DepoentesSecao` — grouped by Acusação / Defesa

**Files:**
- Modify: `src/components/agenda/sheet/secoes/DepoentesSecao.tsx`

The section moves to the Imputação tab and shows a lightweight grouped list. The certidão expander is removed (it now lives in the DepoenteCardV2).

- [ ] **Step 1: Replace the component**

```tsx
"use client";

import { cn } from "@/lib/utils";

const TIPO_DEP_LABEL: Record<string, string> = {
  ofendida: "vítima",
  vitima: "vítima",
  testemunha_acusacao: "test. acusação",
  acusacao: "test. acusação",
  testemunha_defesa: "test. defesa",
  defesa: "test. defesa",
  informante: "informante",
  interrogando: "interrogatório",
  perito: "perito",
};

function ladoDepoente(tipo: string | undefined): "acusacao" | "defesa" {
  const t = (tipo ?? "").toLowerCase();
  if (t === "vitima" || t === "ofendida" || t === "acusacao" || t === "testemunha_acusacao") return "acusacao";
  return "defesa"; // defesa, testemunha_defesa, interrogando, informante, perito → defesa block
}

interface DepoenteRow {
  nome?: string;
  tipo?: string;
  [k: string]: unknown;
}

export function DepoentesSecao({ depoentes }: { depoentes: DepoenteRow[] }) {
  if (!depoentes?.length) {
    return <p className="text-xs italic text-neutral-400 dark:text-neutral-500">Rol de testemunhas não disponível.</p>;
  }

  // Sort: within acusação — vitima/ofendida first (art. 400 CPP); within defesa — interrogando last
  const acusacao = depoentes.filter((d) => ladoDepoente(d.tipo) === "acusacao").sort((a, b) => {
    const isVitima = (d: DepoenteRow) => ["vitima", "ofendida"].includes((d.tipo ?? "").toLowerCase());
    return isVitima(b) ? 1 : isVitima(a) ? -1 : 0;
  });
  const defesa = depoentes.filter((d) => ladoDepoente(d.tipo) === "defesa").sort((a, b) => {
    const isInterrog = (d: DepoenteRow) => (d.tipo ?? "").toLowerCase() === "interrogando";
    return isInterrog(a) ? 1 : isInterrog(b) ? -1 : 0;
  });

  function Block({ title, items, color }: { title: string; items: DepoenteRow[]; color: string }) {
    if (!items.length) return null;
    return (
      <div className="flex-1 min-w-0">
        <div className={cn("text-[9px] font-semibold tracking-wide uppercase mb-1.5", color)}>
          {title} ({items.length})
        </div>
        <ul className="space-y-1.5">
          {items.map((d, i) => {
            const tipo = (d.tipo ?? "").toLowerCase();
            const label = TIPO_DEP_LABEL[tipo];
            return (
              <li key={`${i}-${d.nome ?? ""}`}>
                <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-200">{d.nome ?? "—"}</span>
                {label && (
                  <span className="ml-1.5 text-[9.5px] text-neutral-400 dark:text-neutral-500">{label}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex gap-4 flex-wrap">
      <Block title="Acusação" items={acusacao} color="text-rose-600 dark:text-rose-400" />
      <Block title="Defesa" items={defesa} color="text-emerald-600 dark:text-emerald-400" />
    </div>
  );
}
```

Note: the `onAbrirDepoimento` prop from the old component is removed — it won't be passed anymore since the section is in the Imputação tab (light view only). If the callsite in `event-detail-sheet.tsx` still passes it, TypeScript will warn — remove the prop from the callsite.

- [ ] **Step 2: Remove `onAbrirDepoimento` from callsite**

In `event-detail-sheet.tsx`, find the `<DepoentesSecao>` usage (around line 845) and remove the `onAbrirDepoimento` prop:

```tsx
// was:
<DepoentesSecao depoentes={depoentesStatus} onAbrirDepoimento={abrirDepoimentoNoPonto} />
// becomes:
<DepoentesSecao depoentes={depoentesStatus} />
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck 2>&1 | grep -v node_modules | head -20
```

Expected: zero errors.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/secoes/DepoentesSecao.tsx \
        src/components/agenda/event-detail-sheet.tsx
git commit -m "feat(depoentes-secao): agrupamento por Acusação/Defesa (aba Imputação)"
```

---

## Task 7: Final validation

- [ ] **Step 1: Full typecheck**

```bash
npm run typecheck 2>&1 | grep -v node_modules
```

Expected: zero errors.

- [ ] **Step 2: Full lint**

```bash
npm run lint 2>&1 | grep -v node_modules | head -30
```

Expected: zero errors.

- [ ] **Step 3: Full test suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 4: Smoke test in browser**

Start dev server:
```bash
npm run dev:turbo
```

Open an AIJ audiência in the sheet and verify:
1. First tab that opens is "Imputação" (not "Resumo")
2. Imputação tab shows: resumo narrativo → imputação → denúncia → testemunhas por Acusação/Defesa
3. Depoimentos tab shows cards with faixa rose/emerald on top, straight borders, intimação line
4. No purple avatars — acusação=rose ring, defesa=emerald ring
5. Laudos e documentos tab shows laudos periciais + documentos
6. Estratégia e teses tab shows teses + dossiê

Open a Custódia audiência and verify it still renders without crash.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(audiencia-panel): redesign completo — imputação/depoimentos/laudos/estratégia tabs

- Nova estrutura AreaMae (5 abas semânticas)
- DepoentesSecao agrupada por Acusação/Defesa
- DepoenteCardV2: faixa top semântica, bordas retas, intimação integrada
- PessoaAvatar: rose/emerald/neutral (sem roxo)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
