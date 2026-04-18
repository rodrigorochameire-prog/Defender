# Agenda Fase 3 · Histórico Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar `tab-historico.tsx` com duas sub-abas ("Em edição" WYSIWYG + "Anteriores" timeline compacta accordion), reduzindo 296→~140 linhas e introduzindo 4 componentes focados (sub-tabs, preview card, timeline card, completude badge) + 1 helper de status.

**Architecture:** Zero mutations/queries novas — reorganização visual pura sobre `form.registro` e `form.registrosAnteriores` já carregados. Card de preview é unificado entre "Em edição" (variant="preview") e timeline expandida (variant="saved").

**Tech Stack:** React 19 · TypeScript · Tailwind · Radix (Tabs, Collapsible) · Vitest + RTL + happy-dom.

**Spec de referência:** `docs/plans/2026-04-16-agenda-fase3-historico-design.md`

---

## File Structure

```
src/components/agenda/registro-audiencia/
├── historico/
│   ├── status-tone.ts              [new pure helper]
│   ├── count-completude.ts         [new pure helper]
│   ├── completude-badge.tsx        [new]
│   ├── historico-sub-tabs.tsx      [new]
│   ├── registro-preview-card.tsx   [new]
│   └── timeline-card.tsx           [new]
├── tabs/tab-historico.tsx          [modify: 296 → ~140 lines]
└── registro-modal.tsx              [modify: reuse countCompletude from new helper]

__tests__/
├── unit/
│   ├── status-tone.test.ts         [new]
│   └── count-completude.test.ts    [new]
└── components/
    ├── completude-badge.test.tsx   [new]
    ├── historico-sub-tabs.test.tsx [new]
    ├── registro-preview-card.test.tsx [new]
    ├── timeline-card.test.tsx      [new]
    └── tab-historico.test.tsx      [new — regression]
```

---

## Task 1: `status-tone` pure helper (TDD)

**Files:**
- Create: `src/components/agenda/registro-audiencia/historico/status-tone.ts`
- Create: `__tests__/unit/status-tone.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/unit/status-tone.test.ts
import { describe, it, expect } from "vitest";
import { statusTone } from "@/components/agenda/registro-audiencia/historico/status-tone";

describe("statusTone", () => {
  it("concluída sentenciada → emerald/Sentenciada/✓", () => {
    expect(statusTone({ realizada: true, resultado: "sentenciado" })).toEqual({
      tone: "emerald",
      label: "Sentenciada",
      shortLabel: "✓",
    });
  });

  it("concluída genérica → emerald/Concluída/✓", () => {
    expect(statusTone({ realizada: true, resultado: "instrucao_encerrada" })).toEqual({
      tone: "emerald",
      label: "Concluída",
      shortLabel: "✓",
    });
  });

  it("redesignada via resultado → rose/Redesignada/RED", () => {
    expect(statusTone({ resultado: "redesignada" })).toEqual({
      tone: "rose",
      label: "Redesignada",
      shortLabel: "RED",
    });
  });

  it("redesignada via status → rose", () => {
    expect(statusTone({ status: "redesignada" })).toEqual({
      tone: "rose",
      label: "Redesignada",
      shortLabel: "RED",
    });
  });

  it("suspensa → amber/Suspensa/SUS", () => {
    expect(statusTone({ resultado: "suspensa" })).toEqual({
      tone: "amber",
      label: "Suspensa",
      shortLabel: "SUS",
    });
  });

  it("decretoRevelia truthy → neutral/Decreto Revelia/REV", () => {
    expect(statusTone({ decretoRevelia: true })).toEqual({
      tone: "neutral",
      label: "Decreto Revelia",
      shortLabel: "REV",
    });
  });

  it("desistencia truthy → slate/Desistência/DES", () => {
    expect(statusTone({ resultado: "desistencia" })).toEqual({
      tone: "slate",
      label: "Desistência",
      shortLabel: "DES",
    });
  });

  it("default (vazio) → neutral/Pendente/—", () => {
    expect(statusTone({})).toEqual({
      tone: "neutral",
      label: "Pendente",
      shortLabel: "—",
    });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd ~/projetos/Defender && npm run test __tests__/unit/status-tone.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/components/agenda/registro-audiencia/historico/status-tone.ts
export type StatusTone = "emerald" | "rose" | "amber" | "neutral" | "slate";

export interface StatusTonInput {
  realizada?: boolean;
  status?: string;
  resultado?: string;
  decretoRevelia?: boolean;
}

export interface StatusToneOutput {
  tone: StatusTone;
  label: string;
  shortLabel: string;
}

export function statusTone(input: StatusTonInput): StatusToneOutput {
  const { realizada, status, resultado, decretoRevelia } = input;

  if (resultado === "redesignada" || status === "redesignada") {
    return { tone: "rose", label: "Redesignada", shortLabel: "RED" };
  }

  if (resultado === "suspensa" || status === "suspensa") {
    return { tone: "amber", label: "Suspensa", shortLabel: "SUS" };
  }

  if (decretoRevelia) {
    return { tone: "neutral", label: "Decreto Revelia", shortLabel: "REV" };
  }

  if (resultado === "desistencia" || status === "desistencia") {
    return { tone: "slate", label: "Desistência", shortLabel: "DES" };
  }

  if (realizada === true) {
    if (resultado === "sentenciado") {
      return { tone: "emerald", label: "Sentenciada", shortLabel: "✓" };
    }
    return { tone: "emerald", label: "Concluída", shortLabel: "✓" };
  }

  return { tone: "neutral", label: "Pendente", shortLabel: "—" };
}

export const TONE_BG: Record<StatusTone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  neutral: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export const TONE_BORDER: Record<StatusTone, string> = {
  emerald: "border-l-emerald-400 dark:border-l-emerald-500",
  rose: "border-l-rose-400 dark:border-l-rose-500",
  amber: "border-l-amber-400 dark:border-l-amber-500",
  neutral: "border-l-neutral-300 dark:border-l-neutral-600",
  slate: "border-l-slate-400 dark:border-l-slate-500",
};
```

- [ ] **Step 4: Run — expect 8 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/registro-audiencia/historico/status-tone.ts __tests__/unit/status-tone.test.ts
git commit -m "feat(agenda): statusTone helper + TONE_BG/BORDER maps"
```

---

## Task 2: `countCompletude` pure helper (TDD)

**Files:**
- Create: `src/components/agenda/registro-audiencia/historico/count-completude.ts`
- Create: `__tests__/unit/count-completude.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// __tests__/unit/count-completude.test.ts
import { describe, it, expect } from "vitest";
import { countCompletude } from "@/components/agenda/registro-audiencia/historico/count-completude";

describe("countCompletude", () => {
  const empty = {
    resultado: "",
    assistidoCompareceu: undefined,
    anotacoesGerais: "",
    depoentes: [],
  };

  it("retorna 1 quando só status está preenchido", () => {
    expect(countCompletude(empty, "agendada")).toBe(1);
  });

  it("retorna 5 quando tudo preenchido", () => {
    expect(countCompletude(
      { resultado: "instrucao_encerrada", assistidoCompareceu: true, anotacoesGerais: "abc", depoentes: [{ id: "1", nome: "João" }] },
      "concluida"
    )).toBe(5);
  });

  it("assistidoCompareceu=false ainda conta como preenchido", () => {
    expect(countCompletude(
      { resultado: "", assistidoCompareceu: false, anotacoesGerais: "", depoentes: [] },
      "concluida"
    )).toBe(2); // status + compareceu
  });

  it("depoentes vazio não conta", () => {
    expect(countCompletude(empty, "concluida")).toBe(1);
  });

  it("depoentes com 1 item conta", () => {
    expect(countCompletude(
      { ...empty, depoentes: [{ id: "1", nome: "Maria" }] },
      "concluida"
    )).toBe(2);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/unit/count-completude.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/components/agenda/registro-audiencia/historico/count-completude.ts
interface RegistroCompletude {
  resultado?: string;
  assistidoCompareceu?: boolean;
  anotacoesGerais?: string;
  depoentes?: Array<unknown>;
}

export const COMPLETUDE_TOTAL = 5;

export function countCompletude(
  registro: RegistroCompletude,
  statusAudiencia?: string
): number {
  let count = 0;
  if (statusAudiencia) count++;
  if (registro.resultado) count++;
  if (registro.assistidoCompareceu !== undefined) count++;
  if (registro.anotacoesGerais) count++;
  if ((registro.depoentes?.length ?? 0) > 0) count++;
  return count;
}
```

- [ ] **Step 4: Run — expect 5 PASS**

- [ ] **Step 5: Refactor `registro-modal.tsx` to reuse**

Em `src/components/agenda/registro-audiencia/registro-modal.tsx`, substituir o cálculo inline:

```tsx
  const completudeItems = [
    form.statusAudiencia,
    form.registro.resultado,
    form.registro.assistidoCompareceu !== undefined,
    form.registro.anotacoesGerais,
    form.registro.depoentes.length > 0,
  ].filter(Boolean).length;
```

Por:

```tsx
  import { countCompletude } from "./historico/count-completude";
  ...
  const completudeItems = countCompletude(form.registro, form.statusAudiencia);
```

E no footer o texto `{completudeItems}/5 preenchidos` continua igual.

- [ ] **Step 6: Typecheck + test suite**

Run: `npm run typecheck` — expect 0 new errors.
Run: `npm run test __tests__/unit/count-completude.test.ts` — 5 PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/agenda/registro-audiencia/historico/count-completude.ts __tests__/unit/count-completude.test.ts src/components/agenda/registro-audiencia/registro-modal.tsx
git commit -m "feat(agenda): countCompletude helper + reuso no modal"
```

---

## Task 3: `CompletudeBadge` component (TDD)

**Files:**
- Create: `src/components/agenda/registro-audiencia/historico/completude-badge.tsx`
- Create: `__tests__/components/completude-badge.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/components/completude-badge.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CompletudeBadge } from "@/components/agenda/registro-audiencia/historico/completude-badge";

afterEach(() => cleanup());

describe("CompletudeBadge", () => {
  it("mostra X/Y quando incompleto", () => {
    render(<CompletudeBadge count={3} total={5} />);
    expect(screen.getByText(/3\/5/i)).toBeInTheDocument();
  });

  it("mostra ✓ Completo quando count === total", () => {
    render(<CompletudeBadge count={5} total={5} />);
    expect(screen.getByText(/completo/i)).toBeInTheDocument();
  });

  it("classe emerald quando completo", () => {
    const { container } = render(<CompletudeBadge count={5} total={5} />);
    expect(container.firstElementChild?.className ?? "").toMatch(/emerald/);
  });

  it("classe neutral quando incompleto", () => {
    const { container } = render(<CompletudeBadge count={2} total={5} />);
    expect(container.firstElementChild?.className ?? "").toMatch(/neutral/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/components/completude-badge.test.tsx`

- [ ] **Step 3: Implement**

```tsx
// src/components/agenda/registro-audiencia/historico/completude-badge.tsx
"use client";

import { cn } from "@/lib/utils";

interface Props {
  count: number;
  total: number;
  className?: string;
}

export function CompletudeBadge({ count, total, className }: Props) {
  const completo = count === total;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-semibold tabular-nums",
        completo
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
        className
      )}
    >
      {completo ? "✓ Completo" : `${count}/${total}`}
    </span>
  );
}
```

- [ ] **Step 4: Run — expect 4 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/registro-audiencia/historico/completude-badge.tsx __tests__/components/completude-badge.test.tsx
git commit -m "feat(agenda): CompletudeBadge visual"
```

---

## Task 4: `HistoricoSubTabs` component (TDD)

**Files:**
- Create: `src/components/agenda/registro-audiencia/historico/historico-sub-tabs.tsx`
- Create: `__tests__/components/historico-sub-tabs.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/components/historico-sub-tabs.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HistoricoSubTabs } from "@/components/agenda/registro-audiencia/historico/historico-sub-tabs";

afterEach(() => cleanup());

describe("HistoricoSubTabs", () => {
  it("renderiza ambas as tabs", () => {
    render(<HistoricoSubTabs active="edicao" anterioresCount={2} completudeCount={3} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /em edição/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /anteriores/i })).toBeInTheDocument();
  });

  it("mostra contador de anteriores", () => {
    render(<HistoricoSubTabs active="edicao" anterioresCount={4} completudeCount={3} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /anteriores/i }).textContent).toContain("4");
  });

  it("mostra badge de completude na tab Em edição", () => {
    render(<HistoricoSubTabs active="edicao" anterioresCount={0} completudeCount={3} onChange={() => {}} />);
    const emEdicaoTab = screen.getByRole("tab", { name: /em edição/i });
    expect(emEdicaoTab.textContent).toContain("3/5");
  });

  it("badge emerald quando completo", () => {
    render(<HistoricoSubTabs active="edicao" anterioresCount={0} completudeCount={5} onChange={() => {}} />);
    const emEdicaoTab = screen.getByRole("tab", { name: /em edição/i });
    expect(emEdicaoTab.textContent).toContain("Completo");
  });

  it("tab ativa tem aria-selected=true", () => {
    render(<HistoricoSubTabs active="anteriores" anterioresCount={2} completudeCount={3} onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: /anteriores/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /em edição/i })).toHaveAttribute("aria-selected", "false");
  });

  it("chama onChange ao clicar", () => {
    const onChange = vi.fn();
    render(<HistoricoSubTabs active="edicao" anterioresCount={2} completudeCount={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: /anteriores/i }));
    expect(onChange).toHaveBeenCalledWith("anteriores");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/components/historico-sub-tabs.test.tsx`

- [ ] **Step 3: Implement**

```tsx
// src/components/agenda/registro-audiencia/historico/historico-sub-tabs.tsx
"use client";

import { cn } from "@/lib/utils";
import { CompletudeBadge } from "./completude-badge";
import { COMPLETUDE_TOTAL } from "./count-completude";

interface Props {
  active: "edicao" | "anteriores";
  anterioresCount: number;
  completudeCount: number;
  onChange: (tab: "edicao" | "anteriores") => void;
}

export function HistoricoSubTabs({ active, anterioresCount, completudeCount, onChange }: Props) {
  return (
    <div role="tablist" className="flex gap-0 border-b border-neutral-200 dark:border-neutral-800">
      <button
        type="button"
        role="tab"
        aria-selected={active === "edicao"}
        onClick={() => onChange("edicao")}
        className={cn(
          "px-3 py-1.5 text-[11px] font-semibold border-b-2 cursor-pointer transition-colors flex items-center gap-1.5",
          active === "edicao"
            ? "border-foreground text-foreground"
            : "border-transparent text-neutral-500 hover:text-neutral-700"
        )}
      >
        Em edição
        <CompletudeBadge count={completudeCount} total={COMPLETUDE_TOTAL} />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "anteriores"}
        onClick={() => onChange("anteriores")}
        className={cn(
          "px-3 py-1.5 text-[11px] font-semibold border-b-2 cursor-pointer transition-colors",
          active === "anteriores"
            ? "border-foreground text-foreground"
            : "border-transparent text-neutral-500 hover:text-neutral-700"
        )}
      >
        Anteriores
        {anterioresCount > 0 && (
          <span className="ml-1 text-[9px] text-neutral-400 tabular-nums">{anterioresCount}</span>
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect 6 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/registro-audiencia/historico/historico-sub-tabs.tsx __tests__/components/historico-sub-tabs.test.tsx
git commit -m "feat(agenda): HistoricoSubTabs com CompletudeBadge"
```

---

## Task 5: `RegistroPreviewCard` component (TDD)

**Files:**
- Create: `src/components/agenda/registro-audiencia/historico/registro-preview-card.tsx`
- Create: `__tests__/components/registro-preview-card.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/components/registro-preview-card.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RegistroPreviewCard } from "@/components/agenda/registro-audiencia/historico/registro-preview-card";

afterEach(() => cleanup());

const baseRegistro = {
  eventoId: "evt-1",
  dataRealizacao: "2026-04-02",
  realizada: true,
  assistidoCompareceu: true,
  resultado: "instrucao_encerrada",
  depoentes: [],
  atendimentoReuAntes: "",
  estrategiasDefesa: "",
  manifestacaoMP: "",
  manifestacaoDefesa: "",
  decisaoJuiz: "",
  encaminhamentos: "",
  anotacoesGerais: "",
  registradoPor: "",
  dataRegistro: "",
};

describe("RegistroPreviewCard", () => {
  it("variant preview: wrapper emerald", () => {
    const { container } = render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="preview" />
    );
    expect(container.firstElementChild?.className ?? "").toMatch(/emerald/);
  });

  it("variant saved: wrapper branco/neutral", () => {
    const { container } = render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="saved" />
    );
    expect(container.firstElementChild?.className ?? "").not.toMatch(/bg-emerald-50/);
  });

  it("mostra resultado quando preenchido", () => {
    render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="saved" />
    );
    expect(screen.getByText(/instrucao_encerrada/i)).toBeInTheDocument();
  });

  it("oculta manifestacaoMP quando vazio", () => {
    render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="saved" />
    );
    expect(screen.queryByText(/ministério público/i)).toBeNull();
  });

  it("mostra manifestacaoMP quando preenchido", () => {
    const r = { ...baseRegistro, manifestacaoMP: "Pela condenação" };
    render(
      <RegistroPreviewCard registro={r as any} statusAudiencia="concluida" variant="saved" />
    );
    expect(screen.getByText(/pela condenação/i)).toBeInTheDocument();
  });

  it("presença compareceu mostra badge verde", () => {
    render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="saved" />
    );
    expect(screen.getByText(/presente/i)).toBeInTheDocument();
  });

  it("variant preview mostra label EM EDIÇÃO", () => {
    render(
      <RegistroPreviewCard registro={baseRegistro as any} statusAudiencia="concluida" variant="preview" />
    );
    expect(screen.getByText(/em edição/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/components/registro-preview-card.test.tsx`

- [ ] **Step 3: Implement**

```tsx
// src/components/agenda/registro-audiencia/historico/registro-preview-card.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar, Gavel, MapPin, UserCheck, UserX, Users, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoBlock, DepoenteCard } from "../shared/depoente-card";
import { statusTone, TONE_BG } from "./status-tone";
import type { RegistroAudienciaData } from "../types";

interface Props {
  registro: RegistroAudienciaData & {
    historicoId?: string;
    dataRegistro?: string;
    horarioInicio?: string;
    local?: string;
  };
  statusAudiencia?: string;
  variant: "preview" | "saved";
}

export function RegistroPreviewCard({ registro, statusAudiencia, variant }: Props) {
  const tone = statusTone({
    realizada: registro.realizada,
    status: statusAudiencia,
    resultado: registro.resultado,
  });

  const wrapperClass = variant === "preview"
    ? "bg-emerald-50/50 border-2 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800"
    : "bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80";

  const presente = registro.assistidoCompareceu;

  return (
    <div className={cn("rounded-xl overflow-hidden", wrapperClass)}>
      <div className="bg-neutral-50/50 dark:bg-neutral-900/50 p-3 border-b border-neutral-200/80 dark:border-neutral-800/80 flex items-center gap-2 flex-wrap">
        {variant === "preview" && (
          <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0">EM EDIÇÃO</Badge>
        )}
        {registro.dataRealizacao && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(registro.dataRealizacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </div>
        )}
        {registro.horarioInicio && (
          <span className="text-[11px] text-neutral-500">às {registro.horarioInicio}</span>
        )}
        <Badge className={cn("ml-auto text-[10px]", TONE_BG[tone.tone])}>{tone.label}</Badge>
      </div>

      <div className="p-4 space-y-3">
        {registro.local && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
            <MapPin className="w-3.5 h-3.5" />
            {registro.local}
          </div>
        )}

        {registro.resultado && (
          <InfoBlock icon={Gavel} label="Resultado" borderColor="border-l-neutral-400 dark:border-l-neutral-600">
            <Badge variant="outline" className="text-xs capitalize mt-1">{registro.resultado}</Badge>
          </InfoBlock>
        )}

        {registro.motivoNaoRealizacao && (
          <InfoBlock icon={AlertTriangle} label="Motivo da não realização" borderColor="border-l-amber-500">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{registro.motivoNaoRealizacao}</p>
          </InfoBlock>
        )}

        {registro.dataRedesignacao && (
          <InfoBlock icon={Calendar} label="Audiência Redesignada" borderColor="border-l-neutral-400">
            {registro.motivoRedesignacao && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                <span className="font-semibold">Motivo:</span> {registro.motivoRedesignacao}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-semibold">Nova data:</span>
              {new Date(registro.dataRedesignacao).toLocaleDateString("pt-BR")}
              {registro.horarioRedesignacao && ` às ${registro.horarioRedesignacao}`}
            </div>
          </InfoBlock>
        )}

        <InfoBlock icon={Users} label="Presença do Assistido" borderColor="border-l-neutral-400">
          <Badge
            className={
              presente
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 mt-1"
                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 mt-1"
            }
          >
            {presente ? (
              <><UserCheck className="w-3 h-3 mr-1" />Presente</>
            ) : (
              <><UserX className="w-3 h-3 mr-1" />Ausente</>
            )}
          </Badge>
        </InfoBlock>

        {registro.depoentes?.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Depoentes ({registro.depoentes.length})
            </Label>
            {registro.depoentes.map((dep) => (
              <DepoenteCard key={dep.id || dep.nome} dep={dep} />
            ))}
          </div>
        )}

        {(registro.manifestacaoMP || registro.manifestacaoDefesa || registro.decisaoJuiz) && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Manifestações e Decisões</Label>
            {registro.manifestacaoMP && (
              <InfoBlock icon={Gavel} label="Ministério Público" borderColor="border-l-rose-400">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{registro.manifestacaoMP}</p>
              </InfoBlock>
            )}
            {registro.manifestacaoDefesa && (
              <InfoBlock icon={Gavel} label="Defesa" borderColor="border-l-emerald-500">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{registro.manifestacaoDefesa}</p>
              </InfoBlock>
            )}
            {registro.decisaoJuiz && (
              <InfoBlock icon={Gavel} label="Decisão Judicial" borderColor="border-l-blue-500">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{registro.decisaoJuiz}</p>
              </InfoBlock>
            )}
          </div>
        )}

        {registro.encaminhamentos && (
          <InfoBlock icon={Gavel} label="Encaminhamentos" borderColor="border-l-neutral-400">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{registro.encaminhamentos}</p>
          </InfoBlock>
        )}

        {registro.anotacoesGerais && (
          <InfoBlock icon={Gavel} label="Anotações" borderColor="border-l-neutral-400">
            <p className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{registro.anotacoesGerais}</p>
          </InfoBlock>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect 7 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/registro-audiencia/historico/registro-preview-card.tsx __tests__/components/registro-preview-card.test.tsx
git commit -m "feat(agenda): RegistroPreviewCard unificado"
```

---

## Task 6: `TimelineCard` component (TDD)

**Files:**
- Create: `src/components/agenda/registro-audiencia/historico/timeline-card.tsx`
- Create: `__tests__/components/timeline-card.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// __tests__/components/timeline-card.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { TimelineCard } from "@/components/agenda/registro-audiencia/historico/timeline-card";

afterEach(() => cleanup());

const concluida = {
  historicoId: "h1",
  eventoId: "e1",
  dataRealizacao: "2026-04-02",
  realizada: true,
  resultado: "instrucao_encerrada",
  assistidoCompareceu: true,
  depoentes: [{ id: "1", nome: "João" }, { id: "2", nome: "Maria" }],
  manifestacaoMP: "",
  manifestacaoDefesa: "",
  decisaoJuiz: "",
  encaminhamentos: "",
  anotacoesGerais: "",
  atendimentoReuAntes: "",
  estrategiasDefesa: "",
  registradoPor: "",
  dataRegistro: "",
} as any;

const redesignada = {
  ...concluida,
  historicoId: "h2",
  realizada: false,
  resultado: "redesignada",
  motivoRedesignacao: "ausência juiz",
  dataRedesignacao: "2026-05-01",
};

describe("TimelineCard", () => {
  it("fechado mostra data e status badge", () => {
    render(<TimelineCard registro={concluida} isOpen={false} onToggle={() => {}} />);
    expect(screen.getByText(/abril|abr|04\/02|02\/04|02 de abril/i)).toBeInTheDocument();
    expect(screen.getByText(/concluída/i)).toBeInTheDocument();
  });

  it("fechado: highlight para concluída mostra resultado + ouvidos", () => {
    render(<TimelineCard registro={concluida} isOpen={false} onToggle={() => {}} />);
    expect(screen.getByText(/instrucao_encerrada|2 depoentes/i)).toBeInTheDocument();
  });

  it("fechado: highlight para redesignada mostra motivo", () => {
    render(<TimelineCard registro={redesignada} isOpen={false} onToggle={() => {}} />);
    expect(screen.getByText(/ausência juiz/i)).toBeInTheDocument();
  });

  it("aberto renderiza RegistroPreviewCard", () => {
    render(<TimelineCard registro={concluida} isOpen={true} onToggle={() => {}} />);
    // RegistroPreviewCard rendering: has detail like Presença
    expect(screen.getAllByText(/presença|presente/i).length).toBeGreaterThan(0);
  });

  it("chama onToggle no click", () => {
    const onToggle = vi.fn();
    render(<TimelineCard registro={concluida} isOpen={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalled();
  });

  it("border-left emerald para concluída", () => {
    const { container } = render(<TimelineCard registro={concluida} isOpen={false} onToggle={() => {}} />);
    expect(container.firstElementChild?.className ?? "").toMatch(/border-l-emerald/);
  });

  it("border-left rose para redesignada", () => {
    const { container } = render(<TimelineCard registro={redesignada} isOpen={false} onToggle={() => {}} />);
    expect(container.firstElementChild?.className ?? "").toMatch(/border-l-rose/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// src/components/agenda/registro-audiencia/historico/timeline-card.tsx
"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusTone, TONE_BG, TONE_BORDER } from "./status-tone";
import { RegistroPreviewCard } from "./registro-preview-card";
import type { RegistroAudienciaData } from "../types";

interface Props {
  registro: RegistroAudienciaData & { historicoId?: string; horarioInicio?: string };
  isOpen: boolean;
  onToggle: () => void;
}

function highlightFor(r: Props["registro"]): string {
  if (r.resultado === "redesignada" && r.motivoRedesignacao) return `Motivo: ${r.motivoRedesignacao}`;
  if (r.resultado === "suspensa" && r.motivoNaoRealizacao) return `Motivo: ${r.motivoNaoRealizacao}`;
  if (r.realizada && r.resultado) {
    const n = r.depoentes?.length ?? 0;
    const ouvidos = r.depoentes?.filter((d) => (d as any).presente || (d as any).jaOuvido === "ambos").length ?? 0;
    return `${r.resultado} · ${n} depoente${n !== 1 ? "s" : ""}${ouvidos ? ` (${ouvidos} ouvidos)` : ""}`;
  }
  return "";
}

export function TimelineCard({ registro, isOpen, onToggle }: Props) {
  const tone = statusTone({
    realizada: registro.realizada,
    resultado: registro.resultado,
  });
  const highlight = highlightFor(registro);
  const dataStr = registro.dataRealizacao
    ? new Date(registro.dataRealizacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <div className={cn(
      "rounded-lg bg-neutral-50/50 dark:bg-neutral-900/30 border border-neutral-200/60 dark:border-neutral-800/60 border-l-[3px] overflow-hidden",
      TONE_BORDER[tone.tone],
      isOpen && "bg-white dark:bg-neutral-900"
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
            {dataStr}
            {registro.horarioInicio && <span className="text-neutral-400 font-normal">{registro.horarioInicio}</span>}
          </div>
          {highlight && (
            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{highlight}</div>
          )}
        </div>
        <Badge className={cn("text-[9px] px-1.5 py-0", TONE_BG[tone.tone])}>{tone.label}</Badge>
        {isOpen
          ? <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          : <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />}
      </button>
      {isOpen && (
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
          <RegistroPreviewCard registro={registro as any} statusAudiencia={undefined} variant="saved" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run — expect 7 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/registro-audiencia/historico/timeline-card.tsx __tests__/components/timeline-card.test.tsx
git commit -m "feat(agenda): TimelineCard accordion compacto"
```

---

## Task 7: Refactor `tab-historico.tsx`

**Files:**
- Modify: `src/components/agenda/registro-audiencia/tabs/tab-historico.tsx`

- [ ] **Step 1: Verify current state**

Run: `wc -l src/components/agenda/registro-audiencia/tabs/tab-historico.tsx`
Expected: 296.

- [ ] **Step 2: Rewrite file**

Substituir o conteúdo completo de `src/components/agenda/registro-audiencia/tabs/tab-historico.tsx` por:

```tsx
"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { HistoricoSubTabs } from "../historico/historico-sub-tabs";
import { RegistroPreviewCard } from "../historico/registro-preview-card";
import { TimelineCard } from "../historico/timeline-card";
import { countCompletude } from "../historico/count-completude";
import type { RegistroAudienciaData } from "../types";

interface Props {
  registrosAnteriores: any[];
  registroAtual: RegistroAudienciaData;
  statusAtual?: string;
}

export function TabHistorico({ registrosAnteriores, registroAtual, statusAtual }: Props) {
  const [subTab, setSubTab] = useState<"edicao" | "anteriores">(
    registrosAnteriores.length === 0 ? "edicao" : "anteriores"
  );
  const [openIdx, setOpenIdx] = useState<number | null>(
    registrosAnteriores.length > 0 ? 0 : null
  );

  const completudeCount = countCompletude(registroAtual, statusAtual);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white dark:text-neutral-900" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Histórico de Audiências
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {registrosAnteriores.length} registro{registrosAnteriores.length !== 1 ? "s" : ""} salvo{registrosAnteriores.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <HistoricoSubTabs
        active={subTab}
        onChange={setSubTab}
        anterioresCount={registrosAnteriores.length}
        completudeCount={completudeCount}
      />

      {subTab === "edicao" && (
        <RegistroPreviewCard
          registro={registroAtual}
          statusAudiencia={statusAtual}
          variant="preview"
        />
      )}

      {subTab === "anteriores" && (
        <>
          {registrosAnteriores.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 p-8 text-center">
              <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Nenhum registro ainda</p>
              <p className="text-xs text-neutral-500 mt-1">Preencha as abas e clique em Salvar Registro.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {registrosAnteriores.map((reg, idx) => (
                <TimelineCard
                  key={reg.historicoId ?? idx}
                  registro={reg}
                  isOpen={openIdx === idx}
                  onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify reduction**

Run: `wc -l src/components/agenda/registro-audiencia/tabs/tab-historico.tsx`
Expected: entre 75 e 105 linhas.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: 0 new errors.

- [ ] **Step 5: Run full test suite**

Run: `npm run test`
Expected: todos os tests passam (Fase 1 + 2 + 3).

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/registro-audiencia/tabs/tab-historico.tsx
git commit -m "refactor(agenda): tab-historico usa sub-tabs + componentes novos"
```

---

## Task 8: Regression test `tab-historico`

**Files:**
- Create: `__tests__/components/tab-historico.test.tsx`

- [ ] **Step 1: Write test**

```tsx
// __tests__/components/tab-historico.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TabHistorico } from "@/components/agenda/registro-audiencia/tabs/tab-historico";

afterEach(() => cleanup());

const atualVazio = {
  eventoId: "e1",
  dataRealizacao: "",
  realizada: true,
  assistidoCompareceu: undefined,
  resultado: "",
  depoentes: [],
  manifestacaoMP: "",
  manifestacaoDefesa: "",
  decisaoJuiz: "",
  encaminhamentos: "",
  anotacoesGerais: "",
  atendimentoReuAntes: "",
  estrategiasDefesa: "",
  registradoPor: "",
  dataRegistro: "",
} as any;

const anterior = {
  historicoId: "h1",
  ...atualVazio,
  dataRealizacao: "2026-04-02",
  resultado: "instrucao_encerrada",
  assistidoCompareceu: true,
  realizada: true,
  depoentes: [{ id: "1", nome: "João" }],
};

describe("TabHistorico", () => {
  it("sem anteriores: default sub-tab Em edição", () => {
    render(<TabHistorico registrosAnteriores={[]} registroAtual={atualVazio} statusAtual="" />);
    expect(screen.getByRole("tab", { name: /em edição/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/nenhum registro ainda/i)).toBeInTheDocument();
  });

  it("com anteriores: default sub-tab Anteriores, primeiro aberto", () => {
    render(<TabHistorico registrosAnteriores={[anterior]} registroAtual={atualVazio} statusAtual="agendada" />);
    expect(screen.getByRole("tab", { name: /anteriores/i })).toHaveAttribute("aria-selected", "true");
    // Card aberto renderiza RegistroPreviewCard com Presença
    expect(screen.getAllByText(/presença|presente/i).length).toBeGreaterThan(0);
  });

  it("'Registro Atual' antigo não aparece fora de Em edição (regressão Fase 3)", () => {
    render(<TabHistorico registrosAnteriores={[anterior]} registroAtual={atualVazio} statusAtual="agendada" />);
    expect(screen.queryByText(/^registro atual$/i)).toBeNull();
  });

  it("contador de registros no header", () => {
    render(<TabHistorico registrosAnteriores={[anterior, anterior]} registroAtual={atualVazio} statusAtual="agendada" />);
    expect(screen.getByText(/2 registros salvos/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run**

Run: `npm run test __tests__/components/tab-historico.test.tsx`
Expected: 4 PASS.

- [ ] **Step 3: Commit**

```bash
git add __tests__/components/tab-historico.test.tsx
git commit -m "test(agenda): regressão Fase 3 — tab-historico sub-tabs + preview"
```

---

## Task 9: Manual verification

**Files:** nenhum.

- [ ] **Step 1: Subir dev server**

Run: `cd ~/projetos/Defender && rm -rf .next/cache && npm run dev:webpack`

- [ ] **Step 2: Checklist no browser**

Em `http://localhost:3000/admin/agenda`, abrir evento e depois "Abrir Registro Completo" → aba Histórico:

- [ ] 2 sub-tabs: "Em edição" e "Anteriores (N)"
- [ ] Se já tem anteriores: sub-tab "Anteriores" default, primeiro card aberto
- [ ] Se não tem: sub-tab "Em edição" default
- [ ] Em edição: wrapper emerald + badge "EM EDIÇÃO" + badge completude na tab
- [ ] Preencher campos nas outras abas → badge completude sobe (3/5 → 4/5 → 5/5)
- [ ] Badge "✓ Completo" em verde quando 5/5
- [ ] Em Anteriores: cards compactos (data + status + 1 highlight)
- [ ] Click em card → expande inline (só 1 aberto)
- [ ] Border-left colorida por status (emerald/rose/amber/neutral/slate)
- [ ] Registro Atual duplicado (card emerald misturado na timeline) NÃO aparece mais

- [ ] **Step 3: Commit de marcação**

```bash
git commit --allow-empty -m "chore(agenda): Fase 3 validada manualmente"
```

---

## Self-Review

**Spec coverage:**

| Requisito | Task |
|---|---|
| 2 sub-tabs "Em edição" / "Anteriores (N)" | Task 4, Task 7 |
| Preview WYSIWYG em "Em edição" | Task 5 (RegistroPreviewCard variant=preview), Task 7 (wire-up) |
| Timeline compacta | Task 6 (TimelineCard estado fechado) |
| Accordion inline (1 aberto) | Task 6 (open prop), Task 7 (state) |
| Border-left colorida por status | Task 6 (TONE_BORDER) |
| Badge de completude | Task 2 (helper), Task 3 (badge), Task 4 (usa na tab) |
| RegistroPreviewCard unificado | Task 5 |
| Status tone derivado | Task 1 |
| Default "Anteriores" se houver; "Em edição" caso contrário | Task 7 |
| Card mais recente aberto por default | Task 7 (`openIdx = 0`) |
| "Registro Atual" antigo some | Task 7 (novo código não renderiza), Task 8 (regressão) |
| Countcompletude reusado no modal | Task 2 |
| Tests unitários | Tasks 1, 2, 3, 4, 5, 6 |
| Regressão | Task 8 |
| tab-historico: 296 → ~140 linhas | Task 7 |
| Zero mutations/queries novas | confirmado em todas tasks (só reorganização visual) |

**Placeholders:** nenhum "TBD/TODO/similar to above". Código completo em cada step.

**Type consistency:**
- `StatusTone` definido em Task 1 usado em Tasks 5, 6.
- `COMPLETUDE_TOTAL` definido em Task 2 usado em Task 4.
- `RegistroPreviewCard` props em Task 5 consumidos por Tasks 6, 7.
- `TimelineCard` props em Task 6 consumidos por Task 7.
- `countCompletude` signature consistente entre Task 2 e uso no modal (Task 2 Step 5).

Plano coerente e executável. 9 tasks, ~9 commits.
