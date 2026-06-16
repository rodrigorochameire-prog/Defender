# Sheet de Demandas — colapsável + ToC + manifesto · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar o sheet lateral de Demandas (`DemandaQuickPreview`) em seções colapsáveis com índice (ToC) sticky e scroll-spy, dirigidas por um manifesto, reusando os componentes da Agenda — sem regressão na edição inline.

**Architecture:** Um manifesto (`secoes-manifest.ts`) declara ordem + visibilidade; um `secoesMap: Record<SecaoId, {label,temDado,count?,node}>` é a fonte única de ToC e corpo (`manifesto.filter(id => map[id].temDado)`). Seções pesadas viram componentes em `demandas-premium/sheet/secoes/`. O estado aberto/fechado é controlado pelo parent e persistido em localStorage namespaced.

**Tech Stack:** Next.js 15 + React + TypeScript, Radix Collapsible, vitest + @testing-library/react (happy-dom), Tailwind.

**Spec:** `docs/plans/2026-06-16-demandas-sheet-colapsavel-toc-manifesto-design.md`
**Branch:** `feat/demandas-sheet-colapsavel`

**Convenções deste plano:**
- Rodar um teste: `npx vitest run <caminho>`.
- Gate automático por tarefa: `npm run typecheck` e `npm run build` devem passar (os arquivos NOVOS são tipados; `DemandaQuickPreview.tsx` permanece `@ts-nocheck`).
- ⚠️ NÃO modificar `src/components/agenda/event-detail-sheet.tsx` nem `src/components/agenda/sheet/sheet-toc.tsx` (têm alterações concorrentes não commitadas).
- Sufixo de commit obrigatório:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/components/agenda/sheet/collapsible-section.tsx` | Seção colapsável genérica | **Modificar** (storageKey + modo controlado, retrocompatível) |
| `src/components/demandas-premium/sheet/types.ts` | Tipos `Processo`/`Demanda` compartilhados | **Criar** |
| `src/components/demandas-premium/sheet/secoes-manifest.ts` | `SecaoId`, ordem, `resolverManifesto`, `toToCSections`, `SecoesMap` | **Criar** |
| `src/components/demandas-premium/sheet/secoes/IdentificacaoSecao.tsx` | Bloco A (assistido/atribuição/tipo/prisional/vara) | **Criar** (mover JSX) |
| `src/components/demandas-premium/sheet/secoes/CronologiaSecao.tsx` | Bloco B (datas + prazo + providências) | **Criar** (mover JSX) |
| `src/components/demandas-premium/sheet/secoes/AutosSecao.tsx` | Autos destaque + SectionsViewer + Documentos Drive | **Criar** (mover JSX) |
| `src/components/demandas-premium/sheet/secoes/RecursosSecao.tsx` | Strips de mídias + PDFs | **Criar** (mover JSX) |
| `src/components/demandas-premium/DemandaQuickPreview.tsx` | Sheet: monta `secoesMap`, renderiza ToC + seções, estado controlado, scroll-spy | **Modificar** |

---

## Task 1: Estender `CollapsibleSection` (storageKey + modo controlado)

**Files:**
- Modify: `src/components/agenda/sheet/collapsible-section.tsx`
- Test: `src/components/agenda/sheet/__tests__/collapsible-section.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Create `src/components/agenda/sheet/__tests__/collapsible-section.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CollapsibleSection } from "../collapsible-section";

afterEach(() => { cleanup(); localStorage.clear(); });

describe("CollapsibleSection", () => {
  it("não-controlado: persiste no storageKey informado", () => {
    render(
      <CollapsibleSection id="s1" label="Seção" storageKey="demandas-sheet-sections-open">
        <p>conteúdo</p>
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByRole("button", { name: /Seção/i }));
    const raw = JSON.parse(localStorage.getItem("demandas-sheet-sections-open") || "{}");
    expect(raw.s1).toBe(true);
    expect(localStorage.getItem("agenda-sheet-sections-open")).toBeNull();
  });

  it("controlado: não escreve localStorage e chama onOpenChange", () => {
    const onOpenChange = vi.fn();
    render(
      <CollapsibleSection
        id="s2" label="Sec2" open={false} onOpenChange={onOpenChange}
        storageKey="demandas-sheet-sections-open"
      >
        <p>c</p>
      </CollapsibleSection>
    );
    fireEvent.click(screen.getByRole("button", { name: /Sec2/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(localStorage.getItem("demandas-sheet-sections-open")).toBeNull();
  });

  it("default storageKey continua sendo o da Agenda", () => {
    render(<CollapsibleSection id="s3" label="Sec3"><p>c</p></CollapsibleSection>);
    fireEvent.click(screen.getByRole("button", { name: /Sec3/i }));
    expect(localStorage.getItem("agenda-sheet-sections-open")).not.toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/components/agenda/sheet/__tests__/collapsible-section.test.tsx`
Expected: FAIL (o componente ainda não aceita `storageKey`/`open`/`onOpenChange`; o 1º teste falha porque hoje escreve sempre em `agenda-sheet-sections-open`).

- [ ] **Step 3: Implementar a mudança**

Substituir o conteúdo de `src/components/agenda/sheet/collapsible-section.tsx` por:

```tsx
"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_STORAGE_KEY = "agenda-sheet-sections-open";

function readState(storageKey: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "{}");
  } catch {
    return {};
  }
}

function writeState(storageKey: string, id: string, open: boolean) {
  if (typeof window === "undefined") return;
  const current = readState(storageKey);
  current[id] = open;
  localStorage.setItem(storageKey, JSON.stringify(current));
}

interface Props {
  id: string;
  label: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Namespace de persistência. Default = chave da Agenda (retrocompatível). */
  storageKey?: string;
  /** Modo controlado: quando definido, o parent é dono do estado e da persistência. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CollapsibleSection({
  id, label, count, defaultOpen = false, children, className,
  storageKey = DEFAULT_STORAGE_KEY, open: openProp, onOpenChange,
}: Props) {
  const controlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(() => {
    const persisted = readState(storageKey)[id];
    return persisted !== undefined ? persisted : defaultOpen;
  });
  const open = controlled ? (openProp as boolean) : internalOpen;

  useEffect(() => {
    if (controlled) return; // no modo controlado a persistência é do parent
    writeState(storageKey, id, internalOpen);
  }, [storageKey, id, internalOpen, controlled]);

  const handleOpenChange = (next: boolean) => {
    if (controlled) onOpenChange?.(next);
    else setInternalOpen(next);
  };

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={handleOpenChange}
      data-section-id={id}
      className={cn(
        "rounded-xl bg-white dark:bg-neutral-900 shadow-sm shadow-black/[0.04] border border-neutral-200/60 dark:border-neutral-800/60 overflow-hidden transition-shadow duration-200",
        className
      )}
    >
      <Collapsible.Trigger asChild>
        <button
          type="button"
          className="w-full px-4 py-3 flex items-center justify-between gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 tracking-wide uppercase">
              {label}
            </span>
            {count !== undefined && count > 0 && (
              <span className="text-[9px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                {count}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>
      </Collapsible.Trigger>
      <Collapsible.Content className="px-4 pb-4 pt-1 motion-reduce:animate-none">
        {children}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run src/components/agenda/sheet/__tests__/collapsible-section.test.tsx`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/collapsible-section.tsx src/components/agenda/sheet/__tests__/collapsible-section.test.tsx
git commit -m "feat(sheet): CollapsibleSection com storageKey + modo controlado

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Criar `secoes-manifest.ts` (+ `toToCSections`)

**Files:**
- Create: `src/components/demandas-premium/sheet/secoes-manifest.ts`
- Test: `src/components/demandas-premium/sheet/__tests__/secoes-manifest.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Create `src/components/demandas-premium/sheet/__tests__/secoes-manifest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  SECOES_DEMANDA, resolverManifesto, toToCSections, type SecoesMap,
} from "../secoes-manifest";

describe("secoes-manifest", () => {
  it("resolverManifesto retorna a ordem default começando por registros", () => {
    expect(resolverManifesto()).toEqual(SECOES_DEMANDA);
    expect(SECOES_DEMANDA[0]).toBe("registros");
    expect(SECOES_DEMANDA).toContain("autos");
  });

  it("toToCSections filtra seções sem dado e mapeia label/count na ordem do manifesto", () => {
    const map: SecoesMap = {
      registros: { label: "Registros", temDado: true, count: 3, node: null },
      "proxima-audiencia": { label: "Próxima audiência", temDado: false, node: null },
      identificacao: { label: "Identificação", temDado: true, node: null },
      cronologia: { label: "Cronologia & Prazo", temDado: true, node: null },
      oficio: { label: "Ofício sugerido", temDado: false, node: null },
      autos: { label: "Autos & Documentos", temDado: false, node: null },
      recursos: { label: "Recursos", temDado: false, node: null },
    };
    const toc = toToCSections(SECOES_DEMANDA, map);
    expect(toc.map((s) => s.id)).toEqual(["registros", "identificacao", "cronologia"]);
    expect(toc[0]).toEqual({ id: "registros", label: "Registros", count: 3 });
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npx vitest run src/components/demandas-premium/sheet/__tests__/secoes-manifest.test.ts`
Expected: FAIL ("Cannot find module ../secoes-manifest").

- [ ] **Step 3: Implementar o módulo**

Create `src/components/demandas-premium/sheet/secoes-manifest.ts`:

```ts
import type { ReactNode } from "react";

export type SecaoId =
  | "registros"
  | "proxima-audiencia"
  | "identificacao"
  | "cronologia"
  | "oficio"
  | "autos"
  | "recursos";

/** Ordem default do corpo do sheet de Demandas. */
export const SECOES_DEMANDA: SecaoId[] = [
  "registros",
  "proxima-audiencia",
  "identificacao",
  "cronologia",
  "oficio",
  "autos",
  "recursos",
];

/** v1: ordem única. Gancho para manifestos por atribuição no futuro. */
export function resolverManifesto(): SecaoId[] {
  return SECOES_DEMANDA;
}

export interface SecaoEntry {
  label: string;
  temDado: boolean;
  count?: number;
  node: ReactNode;
}

export type SecoesMap = Record<SecaoId, SecaoEntry>;

export interface ToCSection {
  id: string;
  label: string;
  count?: number;
}

/** ToC e corpo derivam disto — filtra seções sem dado, preserva a ordem. */
export function toToCSections(manifesto: SecaoId[], map: SecoesMap): ToCSection[] {
  return manifesto
    .filter((id) => map[id].temDado)
    .map((id) => ({ id, label: map[id].label, count: map[id].count }));
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run src/components/demandas-premium/sheet/__tests__/secoes-manifest.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/demandas-premium/sheet/secoes-manifest.ts src/components/demandas-premium/sheet/__tests__/secoes-manifest.test.ts
git commit -m "feat(demandas): manifesto de seções do sheet + toToCSections

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Criar `sheet/types.ts` (tipos compartilhados)

**Files:**
- Create: `src/components/demandas-premium/sheet/types.ts`

- [ ] **Step 1: Criar o arquivo de tipos**

Copiar as interfaces `Processo` e `Demanda` que hoje estão inline em `DemandaQuickPreview.tsx` (procurar `interface Processo {` e `interface Demanda {`) para `src/components/demandas-premium/sheet/types.ts`, exportando-as:

```ts
export interface Processo {
  tipo: string;
  numero: string;
  numeroAutos?: string;
}

export interface Demanda {
  id: string;
  assistido: string;
  assistidoId?: number | null;
  processoId?: number | null;
  status: string;
  substatus?: string;
  prazo: string;
  data: string;
  dataInclusao?: string;
  processos: Processo[];
  ato: string;
  providencias: string;
  atribuicao: string;
  atribuicaoEnum?: string | null;
  estadoPrisional?: string;
  prioridade?: string;
  arquivado?: boolean;
  importBatchId?: string | null;
  ordemOriginal?: number | null;
  photoUrl?: string | null;
  updatedAt?: string | null;
}
```

> Conferir contra o original e incluir QUALQUER campo extra que estiver na interface inline atual (não remover campos). `DemandaQuickPreview.tsx` é `@ts-nocheck`, então pode manter sua cópia inline; o que importa é que as seções tipadas importem deste arquivo.

- [ ] **Step 2: Gate**

Run: `npm run typecheck`
Expected: sem novos erros relacionados a este arquivo.

- [ ] **Step 3: Commit**

```bash
git add src/components/demandas-premium/sheet/types.ts
git commit -m "feat(demandas): tipos compartilhados do sheet (Demanda/Processo)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Tasks 4–7: Extrair as seções pesadas (refactor-move, sem mudar comportamento)

> **Natureza:** cada tarefa MOVE um bloco de JSX já existente de `DemandaQuickPreview.tsx`
> para um componente próprio e substitui o bloco no parent pela `<XSecao ... />`. O sheet deve
> renderizar **idêntico** após cada tarefa. A interface de props é código novo (mostrada abaixo);
> o corpo é o JSX atual, trocando referências inline (`demanda.*`, handlers, estado local) pelas
> props. Localizar os blocos pelos comentários-âncora indicados (as linhas podem ter deslocado).
>
> **Sobre tipos:** tipar as props com `Demanda` de `../types`. Se o corpo movido gerar muitos
> erros de tipo herdados do parent `@ts-nocheck` que não sejam correções rápidas, adicionar
> `// @ts-nocheck` no topo da seção (concessão pragmática, igual ao parent) e seguir — não entrar
> em refatoração de tipos. O gate é `npm run build` passar.

### Task 4: `IdentificacaoSecao`

**Files:**
- Create: `src/components/demandas-premium/sheet/secoes/IdentificacaoSecao.tsx`
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx` (bloco âncora `{/* Bloco A — Identificação */}`)

- [ ] **Step 1: Criar o componente com a interface de props**

```tsx
"use client";
import type { Demanda } from "../types";

interface Props {
  demanda: Demanda;
  onAtribuicaoChange: (id: string, atribuicao: string) => void;
  onTipoProcessoChange?: (id: string, tipo: string) => void;
  onAssistidoNomeChange?: (id: string, nome: string) => void;
  onStatusPrisionalChange?: (assistidoId: number, status: string) => void;
}

export function IdentificacaoSecao(props: Props) {
  // MOVER aqui o JSX do "Bloco A — Identificação" (a div com divide-y das rows:
  // Assistido editável, Atribuição, Tipo, Status prisional, Vara), trocando:
  //   demanda           -> props.demanda
  //   onAtribuicaoChange -> props.onAtribuicaoChange   (idem demais handlers)
  // Mover também o estado local de edição do nome (editingAssistidoNome/assistidoDraft)
  // do parent para dentro deste componente.
  return null; // substituir pelo JSX movido
}
```

- [ ] **Step 2: Substituir o bloco no parent**

No `DemandaQuickPreview.tsx`, trocar todo o bloco `{/* Bloco A — Identificação */}` por:

```tsx
<IdentificacaoSecao
  demanda={demanda}
  onAtribuicaoChange={onAtribuicaoChange}
  onTipoProcessoChange={onTipoProcessoChange}
  onAssistidoNomeChange={onAssistidoNomeChange}
  onStatusPrisionalChange={onStatusPrisionalChange}
/>
```
Adicionar o import: `import { IdentificacaoSecao } from "./sheet/secoes/IdentificacaoSecao";`. Remover do parent o estado `editingAssistidoNome`/`assistidoDraft` se não for mais usado fora desta seção.

- [ ] **Step 3: Gate + verificação visual**

Run: `npm run build`
Expected: PASS. Abrir o app (dev server) numa demanda → o bloco Identificação renderiza e edita igual a antes.

- [ ] **Step 4: Commit**

```bash
git add src/components/demandas-premium/sheet/secoes/IdentificacaoSecao.tsx src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "refactor(demandas): extrai IdentificacaoSecao do sheet

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 5: `CronologiaSecao`

**Files:**
- Create: `src/components/demandas-premium/sheet/secoes/CronologiaSecao.tsx`
- Modify: `DemandaQuickPreview.tsx` (bloco âncora `{/* Bloco B — Cronologia */}`)

- [ ] **Step 1: Componente + props**

```tsx
"use client";
import type { Demanda } from "../types";

interface Props {
  demanda: Demanda;
  onPrazoChange: (id: string, prazo: string) => void;
}

export function CronologiaSecao(props: Props) {
  // MOVER o JSX do "Bloco B — Cronologia" (rows: Expedição, Prazo editável + badge,
  // Importado, Atualizado, Providências com line-clamp). Usar a função calcularPrazoBadge:
  // mover calcularPrazoBadge para este arquivo OU exportá-la de um util e importar nos dois.
  return null; // substituir pelo JSX movido
}
```
> `calcularPrazoBadge` hoje vive no topo de `DemandaQuickPreview.tsx`. Mover para
> `src/components/demandas-premium/sheet/secoes/CronologiaSecao.tsx` (uso exclusivo aqui) e
> remover do parent se não for mais referenciada.

- [ ] **Step 2: Substituir no parent**

Trocar o bloco `{/* Bloco B — Cronologia */}` por:
```tsx
<CronologiaSecao demanda={demanda} onPrazoChange={onPrazoChange} />
```
Import: `import { CronologiaSecao } from "./sheet/secoes/CronologiaSecao";`.

- [ ] **Step 3: Gate + verificação**

Run: `npm run build` → PASS. App: bloco Cronologia + edição de prazo + badge funcionam.

- [ ] **Step 4: Commit**

```bash
git add src/components/demandas-premium/sheet/secoes/CronologiaSecao.tsx src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "refactor(demandas): extrai CronologiaSecao do sheet

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 6: `AutosSecao`

**Files:**
- Create: `src/components/demandas-premium/sheet/secoes/AutosSecao.tsx`
- Modify: `DemandaQuickPreview.tsx` (âncoras `{/* ===== AUTOS EM DESTAQUE ===== */}`, `{/* ATOS */}`/`SectionsViewer`, e o card "Documentos" do Drive)

- [ ] **Step 1: Componente + props**

```tsx
"use client";
import type { PreviewFile } from "@/components/agenda/registro-audiencia/shared/document-preview-dialog";

interface Props {
  primaryAutos: PreviewFile | null;
  previewFiles: PreviewFile[];
  autosAgrupados: any;            // shape de drive.autosDoProcesso
  driveFolder: any;              // shape de drive.getDemandaFolder
  driveFolderLoading: boolean;
  uploadingFiles: string[];
  docsOpen: boolean;
  onToggleDocs: () => void;
  onOpenDoca: (fileId: string, page?: number) => void;
  onOpenPreview: (fileId: string) => void;
  onUploadFiles: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateDriveFolder: () => void;
}

export function AutosSecao(props: Props) {
  // MOVER: (1) card "Autos em destaque" (botão que chama setDocaAutos -> props.onOpenDoca),
  // (2) o SectionsViewer de Atos (onOpenSection -> props.onOpenDoca),
  // (3) o card colapsável "Documentos" do Drive (lista + upload). Como a seção inteira já será
  //     colapsável por fora (CollapsibleSection), o "Documentos" interno pode deixar de ter seu
  //     próprio toggle e renderizar a lista direto (docsOpen deixa de controlar visibilidade;
  //     manter a query lazy controlada pelo open da seção — ver Task 8).
  return null; // substituir pelo JSX movido
}
```

- [ ] **Step 2: Substituir no parent**

Trocar os três blocos pela `<AutosSecao ... />`, passando os dados/handlers já existentes no parent (`primaryAutos`, `previewFiles`, `autosAgrupados`, `driveFolder`, `driveFolderLoading`, `uploadingFiles`, `setDocaAutos`, `setPreviewFileId`, `handleFileUpload`, `createDriveFolder.mutate`). Import correspondente.

- [ ] **Step 3: Gate + verificação**

Run: `npm run build` → PASS. App: abrir autos na doca, abrir preview, ver SectionsViewer, upload no Drive.

- [ ] **Step 4: Commit**

```bash
git add src/components/demandas-premium/sheet/secoes/AutosSecao.tsx src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "refactor(demandas): extrai AutosSecao do sheet

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### Task 7: `RecursosSecao`

**Files:**
- Create: `src/components/demandas-premium/sheet/secoes/RecursosSecao.tsx`
- Modify: `DemandaQuickPreview.tsx` (âncora `{/* ===== RECURSOS (Mídias + PDFs) ===== */}`)

- [ ] **Step 1: Componente + props**

```tsx
"use client";

interface Props {
  midiasFlat: any[];
  pdfFiles: any[];
  driveFolderUrl: string | null;
  onOpenPreview: (fileId: string) => void;
}

export function RecursosSecao(props: Props) {
  // MOVER os dois strips compactos (mídias áudio/vídeo até 8 + overflow; PDFs até 8 + overflow),
  // trocando setPreviewFileId/links Drive pelas props.
  return null; // substituir pelo JSX movido
}
```

- [ ] **Step 2: Substituir no parent + commit** (igual às anteriores)

Trocar o bloco por `<RecursosSecao midiasFlat={midiasFlat} pdfFiles={pdfFiles} driveFolderUrl={driveFolderUrl} onOpenPreview={setPreviewFileId} />`. Build → PASS. App: strips ok.

```bash
git add src/components/demandas-premium/sheet/secoes/RecursosSecao.tsx src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "refactor(demandas): extrai RecursosSecao do sheet

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Montar `secoesMap` + render colapsável + estado controlado/persistido

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx`

> Agora as seções viram colapsáveis, dirigidas pelo manifesto. As partes fixas (nav, hero,
> pipeline stepper, Ações Rápidas, barra inferior) permanecem como estão.

- [ ] **Step 1: Imports + estado de abertura**

No topo do componente, adicionar imports:
```tsx
import { CollapsibleSection } from "@/components/agenda/sheet/collapsible-section";
import {
  resolverManifesto, toToCSections, type SecaoId, type SecoesMap,
} from "./sheet/secoes-manifest";
import { IdentificacaoSecao } from "./sheet/secoes/IdentificacaoSecao";
import { CronologiaSecao } from "./sheet/secoes/CronologiaSecao";
import { AutosSecao } from "./sheet/secoes/AutosSecao";
import { RecursosSecao } from "./sheet/secoes/RecursosSecao";
```

Adicionar constante e estado controlado (dentro do componente, perto dos outros `useState`):
```tsx
const DEMANDAS_SECOES_KEY = "demandas-sheet-sections-open";

const [openMap, setOpenMap] = useState<Record<SecaoId, boolean>>(() => {
  let persisted: Record<string, boolean> = {};
  try {
    persisted = JSON.parse(localStorage.getItem(DEMANDAS_SECOES_KEY) || "{}");
  } catch { /* ignore */ }
  const def = (id: SecaoId, fallback: boolean) =>
    persisted[id] !== undefined ? persisted[id] : fallback;
  return {
    registros: def("registros", true),
    "proxima-audiencia": def("proxima-audiencia", true),
    identificacao: def("identificacao", false),
    cronologia: def("cronologia", false),
    oficio: def("oficio", false),
    autos: def("autos", false),
    recursos: def("recursos", false),
  };
});

const setSecaoOpen = useCallback((id: SecaoId, open: boolean) => {
  setOpenMap((prev) => {
    const next = { ...prev, [id]: open };
    try { localStorage.setItem(DEMANDAS_SECOES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
}, []);
```

- [ ] **Step 2: Construir `secoesMap`**

Logo após os dados derivados (perto de `oficioSugerido`/`previewFiles`), montar o mapa:
```tsx
const proxAud = proximaAudiencia ?? null;
const recursosCount = (midiasFlat?.length ?? 0) + (pdfFiles?.length ?? 0);

const secoesMap: SecoesMap = {
  registros: {
    label: "Registros",
    temDado: true,
    count: undefined, // contagem real vem da RegistrosTimeline; manter sem badge por ora
    node: (/* JSX atual do Card de Registros: RegistrosTimeline + Adicionar + editor */ null),
  },
  "proxima-audiencia": {
    label: "Próxima audiência",
    temDado: !!proxAud,
    node: (/* JSX atual do bloco de próxima audiência (mover de perto do rodapé p/ cá) */ null),
  },
  identificacao: {
    label: "Identificação",
    temDado: true,
    node: (
      <IdentificacaoSecao
        demanda={demanda}
        onAtribuicaoChange={onAtribuicaoChange}
        onTipoProcessoChange={onTipoProcessoChange}
        onAssistidoNomeChange={onAssistidoNomeChange}
        onStatusPrisionalChange={onStatusPrisionalChange}
      />
    ),
  },
  cronologia: {
    label: "Cronologia & Prazo",
    temDado: true,
    node: <CronologiaSecao demanda={demanda} onPrazoChange={onPrazoChange} />,
  },
  oficio: {
    label: "Ofício sugerido",
    temDado: !!oficioSugerido,
    node: (/* JSX atual do card Ofício sugerido */ null),
  },
  autos: {
    label: "Autos & Documentos",
    temDado: previewFiles.length > 0 || !!driveFolder,
    count: previewFiles.length || undefined,
    node: (
      <AutosSecao
        primaryAutos={primaryAutos}
        previewFiles={previewFiles}
        autosAgrupados={autosAgrupados}
        driveFolder={driveFolder}
        driveFolderLoading={driveFolderLoading}
        uploadingFiles={uploadingFiles}
        docsOpen={openMap.autos}
        onToggleDocs={() => setSecaoOpen("autos", !openMap.autos)}
        onOpenDoca={(fileId, page) => setDocaAutos({ fileId, page })}
        onOpenPreview={setPreviewFileId}
        onUploadFiles={handleFileUpload}
        onCreateDriveFolder={() => createDriveFolder.mutate({ demandaId: demanda.id })}
      />
    ),
  },
  recursos: {
    label: "Recursos",
    temDado: recursosCount > 0,
    count: recursosCount || undefined,
    node: (
      <RecursosSecao
        midiasFlat={midiasFlat}
        pdfFiles={pdfFiles}
        driveFolderUrl={driveFolderUrl}
        onOpenPreview={setPreviewFileId}
      />
    ),
  },
};

const manifesto = resolverManifesto();
const visibleSections = manifesto.filter((id) => secoesMap[id].temDado);
```
> Preencher os `node` marcados como `null` com o JSX atual correspondente (mover do corpo para
> cá). Importante: a query do Drive (`getDemandaFolder`) hoje tem `enabled: docsOpen`. Trocar a
> dependência para `enabled: openMap.autos && !!demanda?.id` (carrega ao abrir a seção Autos).

- [ ] **Step 3: Renderizar o corpo a partir de `visibleSections`**

Substituir os blocos antigos (que agora viraram `node`s) pelo loop, dentro da área de scroll,
abaixo do pipeline stepper (e antes das Ações Rápidas / barra inferior):
```tsx
<div className="px-4 sm:px-5 pb-4 space-y-3">
  {visibleSections.map((id) => (
    <CollapsibleSection
      key={id}
      id={id}
      label={secoesMap[id].label}
      count={secoesMap[id].count}
      storageKey={DEMANDAS_SECOES_KEY}
      open={openMap[id]}
      onOpenChange={(o) => setSecaoOpen(id, o)}
    >
      {secoesMap[id].node}
    </CollapsibleSection>
  ))}
</div>
```
Remover os blocos originais que foram para `secoesMap` (Registros, Próxima audiência, Ofício, e as `<XSecao/>` que estavam soltas). Manter fixos: hero, pipeline, Ações Rápidas, barra inferior.

- [ ] **Step 4: Gate + verificação**

Run: `npm run build` → PASS. App:
1. Abrir demanda → Registros (e Próxima audiência, se houver) abertos; resto fechado.
2. Colapsar/expandir; recarregar → estado persiste (chave `demandas-sheet-sections-open`).
3. Demanda sem ofício/mídia/autos → essas seções não aparecem.
4. Edição inline intacta dentro das seções.

- [ ] **Step 5: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "feat(demandas): corpo do sheet dirigido por manifesto + seções colapsáveis

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: ToC sticky + scroll-spy + pular-e-abrir

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx`

- [ ] **Step 1: Import + ref + activeId**

```tsx
import { SheetToC } from "@/components/agenda/sheet/sheet-toc";
```
Adicionar:
```tsx
const scrollRef = useRef<HTMLDivElement>(null);
const [activeSecao, setActiveSecao] = useState<string | undefined>();
const tocSections = toToCSections(manifesto, secoesMap);
```
Pôr `ref={scrollRef}` na div de scroll (`<div className="flex-1 overflow-y-auto">`).

- [ ] **Step 2: Scroll-spy (IntersectionObserver)**

```tsx
useEffect(() => {
  const root = scrollRef.current;
  if (!root) return;
  const els = root.querySelectorAll<HTMLElement>("[data-section-id]");
  if (!els.length) return;
  const obs = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      const first = visible[0]?.target.getAttribute("data-section-id");
      if (first) setActiveSecao(first);
    },
    { root, rootMargin: "-10% 0px -70% 0px", threshold: 0 }
  );
  els.forEach((el) => obs.observe(el));
  return () => obs.disconnect();
}, [visibleSections.length, open]); // re-observa quando o conjunto de seções muda
```

- [ ] **Step 3: onJump (abre + rola)**

```tsx
const handleJump = useCallback((id: string) => {
  setSecaoOpen(id as SecaoId, true);
  requestAnimationFrame(() => {
    scrollRef.current
      ?.querySelector(`[data-section-id="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}, [setSecaoOpen]);
```

- [ ] **Step 4: Renderizar o ToC (sticky, abaixo do pipeline stepper)**

Logo após o bloco do pipeline stepper e antes da área de seções:
```tsx
<SheetToC sections={tocSections} activeId={activeSecao} onJump={handleJump} />
```
> O `SheetToC` já é `sticky top-0`. Conferir que o container de scroll é o pai posicionado para
> o sticky funcionar; se necessário, envolver o ToC + seções num wrapper sem `overflow` extra.

- [ ] **Step 5: Gate + verificação**

Run: `npm run build` → PASS. App:
1. ToC aparece abaixo do pipeline com as pills das seções visíveis.
2. Rolar → a pill ativa acompanha (scroll-spy).
3. Clicar numa pill de seção fechada → rola e ABRE a seção.

- [ ] **Step 6: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "feat(demandas): ToC sticky com scroll-spy e pular-e-abrir no sheet

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Verificação final + suíte

**Files:** nenhum novo.

- [ ] **Step 1: Rodar a suíte de testes nova**

Run: `npx vitest run src/components/agenda/sheet/__tests__/collapsible-section.test.tsx src/components/demandas-premium/sheet/__tests__/secoes-manifest.test.ts`
Expected: PASS (todos).

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: sem novos erros; build PASS.

- [ ] **Step 3: Passada manual no app (checklist do spec)**

Abrir uma demanda e confirmar:
- [ ] Registros + Próxima audiência abertos na 1ª vez; resto fechado.
- [ ] Persistência por seção sobrevive a reload.
- [ ] ToC: scroll-spy + pular-e-abrir.
- [ ] Seções vazias somem (ToC enxuto).
- [ ] Edição inline (ato/status/atribuição/tipo/nº/nome/prisional/prazo) intacta.
- [ ] Doca de autos (resize) e modais (RegistroComAutos, DocumentPreview) ok.
- [ ] Sheet da Agenda inalterado (CollapsibleSection retrocompatível).

- [ ] **Step 4: Commit final (se houver ajustes) e abrir PR**

```bash
git add -A && git commit -m "chore(demandas): ajustes finais do sheet colapsável

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" || echo "nada a commitar"
```
Abrir PR de `feat/demandas-sheet-colapsavel` para `main` quando o usuário pedir.

---

## Self-review (cobertura do spec)

- Manifesto + `secoesMap` fonte única → Tasks 2, 8. ✓
- `CollapsibleSection` storageKey + controlado (sem escrita dupla) → Task 1. ✓
- Não tocar arquivos concorrentes (event-detail-sheet/sheet-toc) → respeitado (só estende collapsible-section, consome SheetToC). ✓
- 7 seções, ordem/default/visibilidade/count → Tasks 4–8 (tabela do spec replicada no `secoesMap`). ✓
- Fixos (hero/pipeline/ações/barra) preservados → Task 8 Step 3. ✓
- ToC sticky + scroll-spy + pular-e-abrir → Task 9. ✓
- Extração das seções pesadas para `sheet/secoes/` → Tasks 4–7. ✓
- Persistência namespaced `demandas-sheet-sections-open` → Tasks 1, 8. ✓
- Query do Drive lazy pelo open da seção Autos → Task 8 Step 2. ✓
- Verificação (typecheck/build/manual) → Task 10. ✓
