# Detalhes Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar a seção "Detalhes" em 3 blocos visuais, fixar o clipping do `InlineDropdown` via Portal, tornar o status prisional editável inline, adicionar Vara/órgão julgador, e introduzir um Bloco "Ações rápidas" (Agendar audiência, Adicionar prazo, Abrir no PJe).

**Architecture:** Mudança principal em `DemandaQuickPreview.tsx` (reorganização do JSX em 3 blocos). Fix transversal em `InlineDropdown` (Portal). Sem novas mutations (`assistidos.update` já aceita `statusPrisional`). Sem migration.

**Tech Stack:** TypeScript, React, Tailwind, Lucide, `react-dom/createPortal`, Vitest + happy-dom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-05-detalhes-redesign-design.md`

---

## File Structure

| File | Mudança |
|---|---|
| `src/components/shared/inline-dropdown.tsx` | Modify — usar `createPortal` pra renderizar o conteúdo fora do container parent |
| `src/components/demandas-premium/DemandaQuickPreview.tsx` | Modify — substituir bloco Detalhes (linhas ~1049–1302) pelos 3 cards A/B/C |
| `src/components/demandas-premium/demandas-premium-view.tsx` | Modify — passar callback `onAgendarAudiencia` e tratar status prisional |

Sem novos arquivos; sem migration.

---

## Task 1: Pre-flight schema check + helper de status prisional

**Context:** A spec mencionou "vara/órgão julgador" e "URL do PJe". Confirmado:
- `processos.vara: varchar(100)` existe (`src/lib/db/schema/core.ts:181`)
- `processos.numeroAutos` existe — usaremos pra montar URL do PJe
- `assistidos.statusPrisional` é `pgEnum` com valores `SOLTO, CADEIA_PUBLICA, PENITENCIARIA, COP, HOSPITAL_CUSTODIA, DOMICILIAR, MONITORADO` (`src/lib/db/schema/enums.ts:39`)
- `assistidos.update` (linha 808 do router) já aceita `statusPrisional` — sem mutation nova

**Files:**
- Create: `src/components/demandas-premium/status-prisional-config.ts` (helper de cores + labels)

- [ ] **Step 1: Criar o helper**

```ts
// src/components/demandas-premium/status-prisional-config.ts

export const STATUS_PRISIONAL_VALUES = [
  "SOLTO",
  "CADEIA_PUBLICA",
  "PENITENCIARIA",
  "COP",
  "HOSPITAL_CUSTODIA",
  "DOMICILIAR",
  "MONITORADO",
] as const;

export type StatusPrisional = typeof STATUS_PRISIONAL_VALUES[number];

interface Config {
  label: string;
  color: string; // tailwind text class
  bg: string;    // tailwind bg class
}

export const STATUS_PRISIONAL_CONFIG: Record<StatusPrisional, Config> = {
  SOLTO:             { label: "Solto",                color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  CADEIA_PUBLICA:    { label: "Cadeia Pública",       color: "text-rose-700 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-950/30" },
  PENITENCIARIA:     { label: "Penitenciária",        color: "text-rose-800 dark:text-rose-300",       bg: "bg-rose-100 dark:bg-rose-950/50" },
  COP:               { label: "COP",                   color: "text-rose-700 dark:text-rose-400",       bg: "bg-rose-50 dark:bg-rose-950/30" },
  HOSPITAL_CUSTODIA: { label: "Hospital de Custódia", color: "text-orange-700 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/30" },
  DOMICILIAR:        { label: "Domiciliar",            color: "text-amber-700 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/30" },
  MONITORADO:        { label: "Monitorado",            color: "text-orange-700 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-950/30" },
};

export const STATUS_PRISIONAL_OPTIONS = STATUS_PRISIONAL_VALUES.map((v) => ({
  value: v,
  label: STATUS_PRISIONAL_CONFIG[v].label,
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/components/demandas-premium/status-prisional-config.ts
git commit -m "feat(demandas): config de status prisional (label + cor)"
```

---

## Task 2: `InlineDropdown` via React Portal

**Context:** O dropdown clipa quando o container parent tem `overflow-hidden`. Solução: renderizar o painel do dropdown em `document.body` via `createPortal`, posicionando com `position: fixed` calculado a partir do `getBoundingClientRect()` do trigger.

**Files:**
- Modify: `src/components/shared/inline-dropdown.tsx`
- Create: `src/components/shared/__tests__/inline-dropdown.test.tsx`

- [ ] **Step 1: Escrever teste de render do painel (RED)**

Criar `src/components/shared/__tests__/inline-dropdown.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { InlineDropdown } from "../inline-dropdown";

afterEach(() => cleanup());

describe("InlineDropdown — Portal rendering", () => {
  it("renderiza opções no document.body (fora do parent overflow-hidden)", () => {
    const onChange = vi.fn();
    render(
      <div style={{ overflow: "hidden", width: 100, height: 50 }} data-testid="parent">
        <InlineDropdown
          value="A"
          displayValue={<span>A</span>}
          options={[
            { value: "A", label: "Alpha" },
            { value: "B", label: "Beta" },
            { value: "C", label: "Gamma" },
          ]}
          onChange={onChange}
        />
      </div>,
    );

    const trigger = screen.getByText("A");
    fireEvent.click(trigger);

    const beta = screen.getByText("Beta");
    const parent = screen.getByTestId("parent");

    // Beta existe e NÃO é descendente do parent overflow-hidden
    expect(beta).toBeInTheDocument();
    expect(parent.contains(beta)).toBe(false);
  });

  it("dispara onChange ao clicar opção", () => {
    const onChange = vi.fn();
    render(
      <InlineDropdown
        value="A"
        displayValue={<span>A</span>}
        options={[
          { value: "A", label: "Alpha" },
          { value: "B", label: "Beta" },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByText("A"));
    fireEvent.click(screen.getByText("Beta"));

    expect(onChange).toHaveBeenCalledWith("B");
  });
});
```

Rodar: `pnpm test src/components/shared/__tests__/inline-dropdown.test.tsx`
Esperado: FAIL — sem Portal hoje, o conteúdo é descendente do parent.

- [ ] **Step 2: Implementar Portal**

Em `src/components/shared/inline-dropdown.tsx`:

A. Adicionar imports no topo:

```tsx
import { createPortal } from "react-dom";
import { useLayoutEffect } from "react";
```

(Verificar se `useLayoutEffect` já está importado de `react`. Se sim, juntar.)

B. Adicionar state pra posição calculada, próximo aos states existentes:

```tsx
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
```

C. Substituir o `useEffect` que detecta `alignRight` por:

```tsx
  useLayoutEffect(() => {
    if (!isOpen || !ref.current) {
      setPosition(null);
      return;
    }
    const rect = ref.current.getBoundingClientRect();
    const DROPDOWN_MIN_WIDTH = 200;
    const VIEWPORT_PADDING = 16;
    const wouldOverflow = rect.left + DROPDOWN_MIN_WIDTH > window.innerWidth - VIEWPORT_PADDING;
    setAlignRight(wouldOverflow);
    setPosition({
      top: rect.bottom + 4, // 4px gap
      left: wouldOverflow ? rect.right - DROPDOWN_MIN_WIDTH : rect.left,
      width: Math.max(rect.width, DROPDOWN_MIN_WIDTH),
    });
  }, [isOpen]);
```

D. Localizar o JSX que renderiza a lista do dropdown (antiga `<div className="absolute ...">`). Envolver em `createPortal`:

ANTES (estrutura aproximada):
```tsx
{isOpen && (
  <div className={cn("absolute z-50 ...", alignRight ? "right-0" : "left-0")} style={{...}}>
    {/* search box, options, etc */}
  </div>
)}
```

DEPOIS:
```tsx
{isOpen && position && createPortal(
  <div
    className="fixed z-[10000] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl"
    style={{ top: position.top, left: position.left, minWidth: position.width }}
  >
    {/* search box, options, etc — exatamente o conteúdo que estava no div absolute */}
  </div>,
  document.body,
)}
```

A linha do click-outside permanece igual (`document.addEventListener("mousedown", ...)`) — o Portal continua sendo descendente lógico do React mas DOM-wise está em body. O `ref.current.contains` no listener vai retornar false ao clicar dentro do Portal — **esse é o problema!**

Solução: marcar o painel do Portal com um `data-inline-dropdown-portal` único e checar tanto o trigger quanto isso no `handleClickOutside`. Padrão:

```tsx
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      // Não fechar se clicou no trigger nem no portal
      if (ref.current?.contains(target)) return;
      const portalEl = document.querySelector("[data-inline-dropdown-portal='true']");
      if (portalEl?.contains(target)) return;
      setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside, { passive: true });
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
      };
    }
  }, [isOpen]);
```

E adicionar `data-inline-dropdown-portal="true"` no `<div>` do Portal.

- [ ] **Step 3: Rodar testes — verde**

```bash
pnpm test src/components/shared/__tests__/inline-dropdown.test.tsx
```

Esperado: ambos os testes verdes.

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "inline-dropdown\.tsx" | head -5
```

Esperado: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/inline-dropdown.tsx src/components/shared/__tests__/inline-dropdown.test.tsx
git commit -m "fix(inline-dropdown): renderizar painel via Portal pra escapar overflow:hidden"
```

---

## Task 3: Bloco A — Identificação (refatoração estrutural)

**Context:** Substituir o card único de Detalhes por 3 cards. Esta task implementa o **Bloco A** com Assistido + Atribuição + Tipo do processo + Vara/órgão julgador. Status prisional editável vem na Task 4.

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx`

- [ ] **Step 1: Localizar o bloco atual**

```bash
grep -n "Section label: Detalhes\|^            <h3.*Detalhes" src/components/demandas-premium/DemandaQuickPreview.tsx
```

Esperado: linha ~1051. O bloco atual vai até ~1302 (fim do `<div className="rounded-xl ...">` que contém Metadados).

- [ ] **Step 2: Substituir o bloco Detalhes pelos 3 cards**

Localizar o `{/* Section label: Detalhes ... */}` em `~1049` e substituir o range completo (~1049–1302) por:

```tsx
            {/* ===== DETALHES — 3 BLOCOS ===== */}
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-1 pt-1">
              Detalhes
            </h3>

            {/* Bloco A — Identificação */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden divide-y divide-neutral-200/40 dark:divide-neutral-800/40">
              {/* Assistido — copiar bloco existente do antigo Detalhes */}
              {/* Atribuição — copiar bloco existente */}
              {/* Tipo do processo — mover de Metadados pra cá */}
              {/* Status prisional — Task 4 substitui esse placeholder */}
              {demanda.estadoPrisional && (
                <div className="flex items-center px-3.5 sm:px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Lock className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Prisional</span>
                  <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                    {demanda.estadoPrisional}
                  </span>
                </div>
              )}
              {/* Vara/órgão julgador — novo */}
              {processo?.vara && (
                <div className="flex items-center px-3.5 sm:px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Vara</span>
                  <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400">
                    {processo.vara}
                  </span>
                </div>
              )}
            </div>

            {/* Bloco B — Cronologia (Task 5 finaliza a ordem) */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden divide-y divide-neutral-200/40 dark:divide-neutral-800/40">
              {/* preenche em Task 5 */}
            </div>

            {/* Bloco C — Ações rápidas (Task 6) */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden">
              {/* preenche em Task 6 */}
            </div>
```

**ATENÇÃO:** Por estarmos refatorando muito JSX, NÃO copiar de cabeça. Em vez disso:
1. Abra o arquivo, leia as linhas 1049–1302 atuais
2. Identifique cada bloco editable individual (Assistido, Atribuição, Tipo, Prisional)
3. Mova cada um pro seu bloco novo, MANTENDO o JSX exato (handlers, props, classes)
4. O Tipo do processo (linhas ~1260–1290) sai do `{metadataOpen && (...)}` e vira filho direto do Bloco A
5. O `<button>` do Metadados toggle e o conteúdo restante (Importado, Batch ID) somem desta task — Task 5 e Task 7 cuidam.

- [ ] **Step 3: Adicionar imports faltantes**

```bash
grep "import.*Building2" src/components/demandas-premium/DemandaQuickPreview.tsx
```

Se não tiver, adicionar `Building2` ao import existente do `lucide-react`.

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "DemandaQuickPreview\.tsx" | head -10
```

Esperado: 0 erros novos. Se acusar variável não-usada (ex: `metadataOpen`, `setMetadataOpen` se a Task 5 ainda não removeu), tudo bem ignorar — Task 5 limpa.

- [ ] **Step 5: Smoke test rápido**

```bash
pnpm dev
```

Abrir uma demanda no quick-preview. Validar:
- 3 cards visíveis (mesmo que Bloco B/C estejam vazios)
- Bloco A mostra Assistido, Atribuição, Tipo (editável!), Prisional, Vara
- Dropdown de Tipo abre sem clip (Task 2 fix)

- [ ] **Step 6: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "feat(demandas): Bloco A — Identificação (Assistido/Atribuição/Tipo/Prisional/Vara)"
```

---

## Task 4: Status prisional editável inline

**Context:** Substituir a linha read-only do Prisional no Bloco A por um `InlineDropdown`. A mutation `assistidos.update` já aceita `statusPrisional` — só precisa wirar.

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx`
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx` (passar callback)

- [ ] **Step 1: Adicionar prop `onStatusPrisionalChange` na interface**

Em `DemandaQuickPreview.tsx`, encontrar a interface `DemandaQuickPreviewProps` e adicionar:

```tsx
  /** Atualiza o status prisional do assistido vinculado à demanda */
  onStatusPrisionalChange?: (assistidoId: number, status: string) => void;
```

- [ ] **Step 2: Receber a prop no componente**

Na desestruturação do `function DemandaQuickPreview({ ... })`, adicionar `onStatusPrisionalChange`.

- [ ] **Step 3: Substituir a linha read-only de Prisional por InlineDropdown**

Localizar no Bloco A o snippet `{demanda.estadoPrisional && (...)}` e substituir por:

```tsx
              {demanda.assistidoId && onStatusPrisionalChange && (
                <div className="flex items-center px-3.5 sm:px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Lock className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Prisional</span>
                  <div className="flex-1 flex items-center justify-end">
                    <InlineDropdown
                      value={demanda.estadoPrisional?.toUpperCase() || "SOLTO"}
                      compact
                      displayValue={
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded transition-colors",
                          STATUS_PRISIONAL_CONFIG[(demanda.estadoPrisional?.toUpperCase() || "SOLTO") as StatusPrisional]?.bg,
                          STATUS_PRISIONAL_CONFIG[(demanda.estadoPrisional?.toUpperCase() || "SOLTO") as StatusPrisional]?.color,
                        )}>
                          {STATUS_PRISIONAL_CONFIG[(demanda.estadoPrisional?.toUpperCase() || "SOLTO") as StatusPrisional]?.label || "Solto"}
                        </span>
                      }
                      options={STATUS_PRISIONAL_OPTIONS}
                      onChange={(v) => onStatusPrisionalChange(demanda.assistidoId!, v)}
                    />
                  </div>
                </div>
              )}
```

- [ ] **Step 4: Adicionar imports**

No topo do `DemandaQuickPreview.tsx`, próximo aos outros imports da pasta:

```tsx
import { STATUS_PRISIONAL_CONFIG, STATUS_PRISIONAL_OPTIONS, type StatusPrisional } from "./status-prisional-config";
```

- [ ] **Step 5: Wire a mutation no `demandas-premium-view.tsx`**

Localizar onde outras mutations vivem (próximo a `createAudienciaMutation`, ~836). Adicionar:

```tsx
  const updateAssistidoMutation = trpc.assistidos.update.useMutation({
    onSuccess: () => {
      utils.demandas.list.invalidate();
      toast.success("Status prisional atualizado");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status prisional: " + error.message);
    },
  });

  const handleStatusPrisionalChange = (assistidoId: number, status: string) => {
    updateAssistidoMutation.mutate({
      id: assistidoId,
      statusPrisional: status as StatusPrisional,
    });
  };
```

E passar pra `<DemandaQuickPreview ... onStatusPrisionalChange={handleStatusPrisionalChange} />`. (Localizar via `grep -n "DemandaQuickPreview" src/components/demandas-premium/demandas-premium-view.tsx`.)

Adicionar import do tipo:

```tsx
import type { StatusPrisional } from "./status-prisional-config";
```

- [ ] **Step 6: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "demandas-premium" | head -5
```

Esperado: 0 erros novos.

- [ ] **Step 7: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(demandas): status prisional editável inline com cores por estado"
```

---

## Task 5: Bloco B — Cronologia (reorder + mover Importado/Atualizado pra fora do Metadados)

**Context:** A nova ordem é Expedição → Prazo → Próx. audiência → Importado → Atualizado. Eliminar o `metadataOpen` collapsible (já não tem mais conteúdo único — Tipo subiu pro Bloco A, Importado e Batch viram cidadãos do Bloco B; Batch ID some — não é informação de uso diário).

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx`

- [ ] **Step 1: Substituir o JSX do Bloco B (placeholder vazio da Task 3)**

```tsx
            {/* Bloco B — Cronologia */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden divide-y divide-neutral-200/40 dark:divide-neutral-800/40">
              {/* Expedição — antes do prazo */}
              {demanda.data && (
                <div className="flex items-center px-3.5 sm:px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Calendar className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Expedição</span>
                  <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {demanda.data}
                  </span>
                </div>
              )}

              {/* Prazo — copiar bloco editable + badge existente do antigo Detalhes */}
              {/* (mover o JSX do bloco "Prazo row" antigo pra cá; sem mudanças) */}

              {/* Importado — sai dos Metadados */}
              {demanda.dataInclusao && (
                <div className="flex items-center px-3.5 sm:px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Importado</span>
                  <span className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {(() => {
                      try {
                        const d = new Date(demanda.dataInclusao);
                        if (isNaN(d.getTime())) return demanda.dataInclusao;
                        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
                      } catch {
                        return demanda.dataInclusao;
                      }
                    })()}
                  </span>
                </div>
              )}

              {/* Atualizado — copiar bloco existente (formato relativo) do antigo Detalhes */}
            </div>
```

Mover o JSX completo de Prazo (antigo `{/* Prazo row */}` ~1138–1162) e de Atualizado (antigo `{/* Atualizado */}` ~1177–1199) pra essa posição. Sem mudanças neles.

- [ ] **Step 2: Remover o que sobrou do antigo Detalhes**

Remover:
- `{/* Metadados — collapsible */}` button (linha ~1215)
- O bloco `{metadataOpen && (...)}` inteiro (~1224–1300)
- O `useState` do `metadataOpen` no topo do componente (`const [metadataOpen, setMetadataOpen] = useState(false);`)
- Imports não-usados que possam sobrar (`ChevronRight`, `AlertCircle`) — verificar via `pnpm typecheck`

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "DemandaQuickPreview" | head -5
```

Esperado: 0 erros, 0 warnings de variável não-usada.

- [ ] **Step 4: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "feat(demandas): Bloco B — Cronologia (Expedição → Prazo → Importado → Atualizado)"
```

---

## Task 6: Bloco C — Ações rápidas

**Context:** Três botões side-by-side. "Agendar audiência" abre o `AudienciaConfirmModal`; "Adicionar prazo" foca o `InlineDatePicker` do prazo; "Abrir no PJe" abre URL nova aba. PJe URL é montada a partir de `processo.numeroAutos` (CNJ); padrão TJBA: `https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/listView.seam?numeroProcesso={cnj}`.

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx`
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx`

- [ ] **Step 1: Adicionar prop `onAgendarAudiencia` na interface**

Em `DemandaQuickPreviewProps`:

```tsx
  /** Abre o AudienciaConfirmModal pré-populado com a demanda */
  onAgendarAudiencia?: (demandaId: string) => void;
```

Receber na desestruturação do componente.

- [ ] **Step 2: Substituir o placeholder do Bloco C**

```tsx
            {/* Bloco C — Ações rápidas */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden">
              <div className="flex divide-x divide-neutral-200/40 dark:divide-neutral-800/40">
                {onAgendarAudiencia && (
                  <button
                    type="button"
                    onClick={() => onAgendarAudiencia(demanda.id)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Agendar audiência
                  </button>
                )}
                {onPrazoChange && (
                  <button
                    type="button"
                    onClick={() => {
                      // Foca no InlineDatePicker do Prazo via querySelector
                      const el = document.querySelector<HTMLButtonElement>(
                        `[data-prazo-trigger='${demanda.id}']`
                      );
                      el?.click();
                    }}
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    Adicionar prazo
                  </button>
                )}
                {processo?.numeroAutos && (
                  <a
                    href={`https://pje.tjba.jus.br/pje/Processo/ConsultaProcesso/listView.seam?numeroProcesso=${encodeURIComponent(processo.numeroAutos)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:text-purple-700 dark:hover:text-purple-400 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir no PJe
                  </a>
                )}
              </div>
            </div>
```

- [ ] **Step 3: Adicionar `data-prazo-trigger` no `InlineDatePicker` do Prazo**

No JSX do prazo (Bloco B, mover de antigo), adicionar `data-prazo-trigger={demanda.id}` no `<InlineDatePicker>` ou no botão interno dele. Se o `InlineDatePicker` não expõe forma de adicionar atributo no botão raiz, embrulhar em `<div data-prazo-trigger="...">`. Verificar a API do componente:

```bash
grep -n "InlineDatePicker" src/components/shared/inline-date-picker.tsx | head -5
```

Se não há forma simples, deixar o botão "Adicionar prazo" como **placeholder no-op** com toast `"Use o campo Prazo no card acima"` e sinalizar como `DONE_WITH_CONCERNS`. Em PR seguinte, evolui o componente.

- [ ] **Step 4: Adicionar imports faltantes**

`CalendarPlus`, `ExternalLink` do `lucide-react`.

- [ ] **Step 5: Wire callback no `demandas-premium-view.tsx`**

```tsx
  const handleAgendarAudiencia = (demandaId: string) => {
    const demanda = demandas.find((d) => d.id === demandaId);
    if (!demanda) return;
    setAudienciaModal({
      open: true,
      demandaId: parseInt(demandaId, 10),
      sources: [demanda.providencias ?? null, demanda.ato ?? null].filter(Boolean) as string[],
      assistidoNome: demanda.assistido,
      numeroAutos: undefined, // o modal já tem fallback
    });
  };
```

E passar pra `<DemandaQuickPreview ... onAgendarAudiencia={handleAgendarAudiencia} />`.

(Verificar shape de `audienciaModal` — adaptar ao state existente. Se algum campo não existir, ajustar.)

- [ ] **Step 6: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "demandas-premium" | head -5
```

Esperado: 0 erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(demandas): Bloco C — Ações rápidas (agendar audiência, prazo, PJe)"
```

---

## Task 7: UX polish — formato relativo Expedição + tooltip de data exata

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx`

- [ ] **Step 1: Substituir a linha de Expedição no Bloco B por formato relativo**

Localizar o `{/* Expedição */}` no Bloco B e substituir o `<span>` da data por:

```tsx
              {demanda.data && (
                <div className="flex items-center px-3.5 sm:px-4 py-2.5 gap-3">
                  <div className="w-5 h-5 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Calendar className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Expedição</span>
                  <span
                    className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums cursor-help"
                    title={demanda.data}
                  >
                    {(() => {
                      try {
                        const [d, m, y] = demanda.data.split("/").map(Number);
                        const date = new Date(y, m - 1, d);
                        if (isNaN(date.getTime())) return demanda.data;
                        const diff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
                        if (diff === 0) return "Hoje";
                        if (diff === 1) return "Ontem";
                        if (diff < 30) return `há ${diff} dias`;
                        if (diff < 365) return `há ${Math.floor(diff / 30)} mes${Math.floor(diff / 30) > 1 ? "es" : ""}`;
                        return `há ${Math.floor(diff / 365)} ano${Math.floor(diff / 365) > 1 ? "s" : ""}`;
                      } catch {
                        return demanda.data;
                      }
                    })()}
                  </span>
                </div>
              )}
```

(Pressuposto: `demanda.data` é string `DD/MM/YYYY`. Se for outro formato, ajustar parser. Confirmar com `grep -n "demanda.data" src/components/demandas-premium/DemandaQuickPreview.tsx | head -3`.)

- [ ] **Step 2: Mesma técnica para Importado**

Já tem formato curto (`DD/MMM/YYYY`); só adicionar `title=` com a data + horário completos:

```tsx
                  <span
                    className="flex-1 text-right text-xs text-neutral-500 dark:text-neutral-400 tabular-nums cursor-help"
                    title={(() => {
                      try {
                        const d = new Date(demanda.dataInclusao);
                        return d.toLocaleString("pt-BR");
                      } catch {
                        return demanda.dataInclusao;
                      }
                    })()}
                  >
                    {/* render mesma string que já está */}
                  </span>
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck 2>&1 | grep -E "DemandaQuickPreview" | head -5
```

Esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "feat(demandas): polish UX — datas relativas + tooltip de data exata"
```

---

## Task 8: Verificação final + push

**Files:** nenhum (operações git).

- [ ] **Step 1: Rodar todos os testes**

```bash
pnpm test 2>&1 | tail -20
```

Esperado: testes do `inline-dropdown` verdes; sem regressão em outros.

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck 2>&1 | tail -30
```

Esperado: 0 erros novos. Pré-existentes em `instancia-superior.ts` e `vvd.ts` não bloqueiam.

- [ ] **Step 3: Smoke test manual (10 min)**

```bash
pnpm dev
```

- Abrir uma demanda no quick-preview
- Conferir 3 cards (Identificação · Cronologia · Ações)
- Dropdown de Tipo de processo abre sem clip ✓
- Status prisional clicável → muda → cor atualiza ✓
- Vara aparece quando tem dado, esconde quando null ✓
- Botão "Agendar audiência" abre modal pré-populado ✓
- Botão "Abrir no PJe" abre nova aba com URL TJBA ✓
- Datas em formato relativo + tooltip OK ✓

- [ ] **Step 4: Push da branch**

```bash
git push origin feat/detalhes-redesign
```

- [ ] **Step 5: Decidir push direto pra main vs PR**

Mesmo padrão do PR-A: pedir confirmação ao usuário ANTES de push pra main.

```bash
# opção a: ff push
git push origin feat/detalhes-redesign:main
# opção b: PR
gh pr create --title "feat(demandas): redesign Detalhes em 3 blocos + fix dropdown clip" --body "..."
```

---

## Notas de execução

- **Pré-existente em main:** erros de typecheck em `instancia-superior.ts` e `vvd.ts` não relacionados.
- **PR-B (Calendar sync):** quando o PR-B mergear, o botão "Agendar audiência" desta PR já vai sincronizar com Calendar automaticamente — sem mudança aqui.
- **Drift do `InlineDropdown`:** o Portal afeta os 3 callers existentes (Atribuição, Tipo, Status). Smoke test manual cobre os 3.
- **`scripts/check_areas.mjs`** untracked no repo — não tocar.
