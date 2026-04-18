# Briefing Polish + Document Preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polir todas as seções expandidas da aba Briefing do modal (cockpit de audiência) e adicionar preview de laudos/termos de depoimento direto do Drive via matching heurístico.

**Architecture:** Mudança concentrada em `tab-briefing.tsx` (refactor das 9 seções + fetching do Drive). Dois arquivos novos: um helper puro de matching de nome de arquivo (testável sem React) e um `DocumentPreviewDialog` que envolve o `DrivePreviewIframe` existente. `DepoenteCard` ganha prop opcional `onVerTermo`. Sem mutations, schema ou tRPC novos — consome `trpc.drive.filesByProcesso` e `trpc.audiencias.addQuickNote` já existentes.

**Tech Stack:** Next.js 15, React, Tailwind, shadcn/ui (Dialog, Checkbox, Popover), lucide-react, Vitest + happy-dom (component tests quando necessário).

**Spec:** `docs/superpowers/specs/2026-04-18-briefing-polish-doc-preview.md`

---

## File Structure

| Arquivo | Responsabilidade | Mudança |
|---|---|---|
| `src/lib/agenda/match-document.ts` | Matching heurístico de arquivo do Drive por nome de depoente / descrição de laudo | **Novo** |
| `src/lib/agenda/__tests__/match-document.test.ts` | Unit tests do helper | **Novo** |
| `src/components/agenda/registro-audiencia/shared/document-preview-dialog.tsx` | Dialog full-screen envolvendo `DrivePreviewIframe` | **Novo** |
| `src/components/agenda/registro-audiencia/shared/depoente-card.tsx` | Adiciona prop `onVerTermo?` + botão inline | Modify |
| `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx` | Refactor completo das 9 seções + integração Drive + preview state | Modify |

---

## Task 1: Helper `matchTermoDepoente` + `matchLaudo` com testes

**Files:**
- Create: `src/lib/agenda/match-document.ts`
- Test: `src/lib/agenda/__tests__/match-document.test.ts`

- [ ] **Step 1: Criar arquivo de teste**

Create `src/lib/agenda/__tests__/match-document.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  normalizeName,
  matchTermoDepoente,
  matchLaudo,
} from "../match-document";

type File = { driveFileId: string; name: string; mimeType?: string | null };

describe("normalizeName", () => {
  it("remove acentos", () => {
    expect(normalizeName("João da Silva")).toBe("joao da silva");
  });

  it("minúsculas e whitespace normalizado", () => {
    expect(normalizeName("  JOÃO  DA   SILVA  ")).toBe("joao da silva");
  });

  it("remove pontuação", () => {
    expect(normalizeName("Termo_Joao.Silva-01.pdf")).toBe("termo joao silva 01 pdf");
  });
});

describe("matchTermoDepoente", () => {
  const files: File[] = [
    { driveFileId: "a", name: "Termo de Depoimento - Joao da Silva.pdf" },
    { driveFileId: "b", name: "Laudo Balistico.pdf" },
    { driveFileId: "c", name: "Oitiva_Maria_Souza.pdf" },
    { driveFileId: "d", name: "Documento_Qualquer.pdf" },
  ];

  it("casa termo com nome completo do depoente", () => {
    expect(matchTermoDepoente("João da Silva", files)).toBe("a");
  });

  it("casa oitiva quando nome do arquivo usa underscore", () => {
    expect(matchTermoDepoente("Maria Souza", files)).toBe("c");
  });

  it("retorna null sem keyword termo/depoimento/oitiva", () => {
    expect(matchTermoDepoente("Documento Qualquer", files)).toBeNull();
  });

  it("retorna null para nome com só tokens curtos", () => {
    expect(matchTermoDepoente("J. A.", files)).toBeNull();
  });

  it("retorna null quando depoente não aparece em nenhum termo", () => {
    expect(matchTermoDepoente("Carlos Mendes", files)).toBeNull();
  });
});

describe("matchLaudo", () => {
  const files: File[] = [
    { driveFileId: "a", name: "Laudo Balistico 001.pdf" },
    { driveFileId: "b", name: "Laudo DNA.pdf" },
    { driveFileId: "c", name: "Pericia Necropsia.pdf" },
    { driveFileId: "d", name: "Termo de Depoimento.pdf" },
  ];

  it("casa laudo balístico pelo tipo na descrição", () => {
    expect(matchLaudo("Laudo balístico da arma", files)).toBe("a");
  });

  it("casa laudo com keyword pericia", () => {
    expect(matchLaudo("Necropsia da vítima", files)).toBe("c");
  });

  it("casa laudo genérico sem tipo específico (primeiro laudo disponível)", () => {
    expect(matchLaudo("Laudo técnico", files)).toBe("a");
  });

  it("retorna null quando nenhum arquivo tem keyword laudo/pericia/exame", () => {
    expect(matchLaudo("Balística", [{ driveFileId: "x", name: "Notas.pdf" }])).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

```bash
cd ~/projetos/Defender && npx vitest run src/lib/agenda/__tests__/match-document.test.ts
```

Expected: falha porque `match-document.ts` ainda não existe.

- [ ] **Step 3: Implementar helper**

Create `src/lib/agenda/match-document.ts`:

```ts
export interface DriveFile {
  driveFileId: string;
  name: string;
  mimeType?: string | null;
}

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TERMO_KEYWORDS = ["termo", "depoimento", "oitiva"];
const LAUDO_KEYWORDS = ["laudo", "pericia", "exame"];
const LAUDO_TYPE_HINTS = [
  "dna",
  "balistica",
  "balistico",
  "necropsia",
  "toxicologico",
  "psiquiatrico",
  "cadaverico",
  "grafotecnico",
];

export function matchTermoDepoente(
  depoenteNome: string,
  files: DriveFile[],
): string | null {
  const nome = normalizeName(depoenteNome);
  if (!nome) return null;
  const tokens = nome.split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) return null;

  const candidates = files.filter((f) => {
    const n = normalizeName(f.name);
    const hasTermoKeyword = TERMO_KEYWORDS.some((k) => n.includes(k));
    if (!hasTermoKeyword) return false;
    return tokens.every((t) => n.includes(t));
  });

  if (candidates.length === 0) return null;
  return candidates[0].driveFileId;
}

export function matchLaudo(
  laudoDescricao: string,
  files: DriveFile[],
): string | null {
  const desc = normalizeName(laudoDescricao);
  if (!desc) return null;

  const typeInDesc = LAUDO_TYPE_HINTS.find((t) => desc.includes(t));

  const candidates = files.filter((f) => {
    const n = normalizeName(f.name);
    const hasLaudoKeyword = LAUDO_KEYWORDS.some((k) => n.includes(k));
    if (!hasLaudoKeyword) return false;
    if (typeInDesc && !n.includes(typeInDesc)) return false;
    return true;
  });

  if (candidates.length === 0) return null;
  return candidates[0].driveFileId;
}
```

- [ ] **Step 4: Rodar teste — deve passar**

```bash
cd ~/projetos/Defender && npx vitest run src/lib/agenda/__tests__/match-document.test.ts
```

Expected: PASS (12 testes).

- [ ] **Step 5: Typecheck**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "match-document" | head -5
```

Expected: vazio.

- [ ] **Step 6: Commit**

```bash
cd ~/projetos/Defender
git add src/lib/agenda/match-document.ts src/lib/agenda/__tests__/match-document.test.ts
git commit -m "feat(agenda): helpers matchTermoDepoente e matchLaudo para vincular docs do Drive"
```

---

## Task 2: `DocumentPreviewDialog` component

**Files:**
- Create: `src/components/agenda/registro-audiencia/shared/document-preview-dialog.tsx`

- [ ] **Step 1: Implementar componente**

Create the file with:

```tsx
"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DrivePreviewIframe } from "@/components/agenda/sheet/drive-preview-iframe";
import { X } from "lucide-react";

interface Props {
  driveFileId: string | null;
  title?: string;
  onClose: () => void;
}

export function DocumentPreviewDialog({ driveFileId, title = "Documento", onClose }: Props) {
  const open = !!driveFileId;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="!max-w-none w-[95vw] h-[95vh] flex flex-col p-0 gap-0 bg-white dark:bg-neutral-950 overflow-hidden"
        hideClose
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Visualização de documento do Drive em modo imersivo.
        </DialogDescription>
        <div className="bg-neutral-900 dark:bg-neutral-950 text-white px-4 py-2.5 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold truncate">{title}</span>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-7 h-7 rounded hover:bg-neutral-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 overflow-hidden p-2">
          {driveFileId && (
            <div className="w-full h-full">
              <DrivePreviewIframe
                driveFileId={driveFileId}
                height={window.innerHeight * 0.9}
                title={title}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

> **Nota sobre `window.innerHeight`**: usar dentro de `useEffect` seria mais seguro para SSR. Como este modal só abre após interação do usuário (`open={!!driveFileId}`), a renderização é sempre client-side — `window` existe. Se o typecheck reclamar, adicionar `typeof window !== "undefined" ? window.innerHeight * 0.9 : 720`.

- [ ] **Step 2: Typecheck**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "document-preview-dialog" | head -5
```

Expected: vazio.

- [ ] **Step 3: Commit**

```bash
cd ~/projetos/Defender
git add src/components/agenda/registro-audiencia/shared/document-preview-dialog.tsx
git commit -m "feat(agenda): DocumentPreviewDialog full-screen envolvendo DrivePreviewIframe"
```

---

## Task 3: Refactor base do tab-briefing — zinc→neutral, CollapsibleSection, Drive query, preview state

**Files:**
- Modify: `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx`

Esta task prepara o terreno para as refinaments depois. Não altera layout das seções — só substitui componente base, normaliza paleta, e adiciona as novas dependências.

- [ ] **Step 1: Substituir `SectionCard` local por `CollapsibleSection` do sheet**

No topo do arquivo, adicionar import:

```ts
import { CollapsibleSection } from "@/components/agenda/sheet/collapsible-section";
```

Remover a função `SectionCard` local (linhas ~34-77).

Substituir todas as ocorrências de `<SectionCard label="..." icon={...} defaultOpen={...}>...</SectionCard>` por `<CollapsibleSection id="kebab-case-label" label="..." defaultOpen={...}>...</CollapsibleSection>`. 

**Mapping obrigatório (id kebab-case):**
- `Resumo Executivo` → `id="resumo-executivo"`
- `Imputacao` → `id="imputacao"`
- `Fatos (Denuncia)` → `id="fatos"`
- `Elementos` → `id="elementos"`
- `Versao do Acusado` → `id="versao-acusado"`
- `Investigacao Defensiva` → `id="investigacao"`
- `Depoentes` → `id="depoentes"`
- `Contradicoes` → `id="contradicoes"`
- `Pendencias` → `id="pendencias"`
- `Teses` → `id="teses"`

> `CollapsibleSection` não aceita prop `icon` — ícones de lucide-react que hoje vão em `icon={Icon}` ficam visualmente fora. Aceitar a perda: o label já comunica. Se quiser manter ícone, adicionar antes do label dentro do `children`. Para este refactor, remover `icon` prop.

- [ ] **Step 2: Find/replace `zinc` → `neutral` no arquivo**

Apenas classes Tailwind. Não tocar em:
- Cores semânticas (blue-, emerald-, rose-, amber-) — manter.
- String literals fora de `className`.

Padrões de replace (global, dentro do arquivo):
- `zinc-50` → `neutral-50`
- `zinc-100` → `neutral-100`
- `zinc-200` → `neutral-200`
- `zinc-300` → `neutral-300`
- `zinc-400` → `neutral-400`
- `zinc-500` → `neutral-500`
- `zinc-600` → `neutral-600`
- `zinc-700` → `neutral-700`
- `zinc-800` → `neutral-800`
- `zinc-900` → `neutral-900`

**Atenção:** opacity suffixes (`zinc-200/80`, `zinc-900/30`) também viram `neutral-200/80`, `neutral-900/30`.

- [ ] **Step 3: Adicionar query de arquivos do Drive**

Dentro do componente `TabBriefing`, logo após `const { data: ctx, isLoading } = trpc.audiencias.getAudienciaContext.useQuery(...)` (linha ~130):

```ts
const processoId = ctx?.processo?.id ?? null;
const filesByProcessoQuery = trpc.drive.filesByProcesso.useQuery(
  { processoId: processoId ?? 0 },
  { enabled: !!processoId },
);
const driveFiles = filesByProcessoQuery.data ?? [];
```

- [ ] **Step 4: Adicionar state do preview e import dos helpers**

No topo:

```ts
import { useState } from "react"; // se ainda não tiver
import { matchTermoDepoente, matchLaudo } from "@/lib/agenda/match-document";
import { DocumentPreviewDialog } from "../shared/document-preview-dialog";
```

Dentro do componente:

```ts
const [previewDoc, setPreviewDoc] = useState<{ id: string; title: string } | null>(null);
```

No fim do `return (...)` do componente (antes do `</div>` final que fecha o container):

```tsx
<DocumentPreviewDialog
  driveFileId={previewDoc?.id ?? null}
  title={previewDoc?.title}
  onClose={() => setPreviewDoc(null)}
/>
```

- [ ] **Step 5: Typecheck**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "tab-briefing" | head -10
```

Expected: vazio. Se houver erro de `CollapsibleSection` requer `id`, corrigir os que faltaram.

- [ ] **Step 6: Smoke test visual**

```bash
# servidor já está rodando (bloco 2). Se não:
# cd ~/projetos/Defender && npx next dev --port 3000 > /tmp/defender-dev.log 2>&1 &

open -a "Google Chrome" "http://localhost:3000/admin/agenda"
```

Abrir modal, tab Briefing. Confirmar:
- Seções renderizam sem quebrar.
- Cores consistentes com resto do app (neutros, não zinc).
- Nenhum ícone de `SectionCard` antigo sobrando (aceita: label sem ícone).

- [ ] **Step 7: Commit**

```bash
cd ~/projetos/Defender
git add src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx
git commit -m "refactor(agenda): tab-briefing usa CollapsibleSection, paleta neutral, Drive query e preview state"
```

---

## Task 4: Versão do Acusado — side-by-side

**Files:**
- Modify: `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx` (bloco "Versao do Acusado")

- [ ] **Step 1: Substituir conteúdo da seção**

Localizar a `CollapsibleSection id="versao-acusado"`. Substituir todo o `children` por:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  {/* Coluna 1: Delegacia */}
  <div className="rounded-lg bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 p-3 flex flex-col">
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-2 h-2 rounded-full bg-blue-500" />
      <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-500">
        Delegacia
      </span>
    </div>
    {versaoDelegacia ? (
      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
        {versaoDelegacia}
      </p>
    ) : (
      <p className="text-xs text-neutral-400 italic">
        Versão na delegacia não extraída.
      </p>
    )}
  </div>

  {/* Coluna 2: Atendimentos Defensoria */}
  <div className="rounded-lg bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 p-3 flex flex-col max-h-96 overflow-y-auto">
    <div className="flex items-center gap-1.5 mb-2 sticky top-0 bg-white dark:bg-neutral-900 pb-1">
      <div className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-500">
        Defensoria ({atendimentos.length})
      </span>
    </div>
    {atendimentos.length > 0 ? (
      <div className="space-y-2.5">
        {atendimentos.map((at: any, i: number) => (
          <div key={at.id ?? i} className="rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              {at.data && (
                <span className="text-[10px] text-neutral-400 font-mono">
                  {format(new Date(at.data as string), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
              {at.tipo && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-neutral-300 dark:border-neutral-600">
                  {at.tipo}
                </Badge>
              )}
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
              {at.resumo ?? at.transcricaoResumo ?? (typeof at.pontosChave === "string" ? at.pontosChave : JSON.stringify(at.pontosChave)) ?? "Sem resumo"}
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-neutral-400 italic">
        Nenhum atendimento registrado — agende entrevista.
      </p>
    )}
  </div>
</div>
```

- [ ] **Step 2: Typecheck**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "tab-briefing" | head -5
```

Expected: vazio.

- [ ] **Step 3: Smoke test**

Abrir tab Briefing → expandir "Versão do Acusado". Confirmar:
- Em desktop (`md+`): 2 colunas lado-a-lado.
- Em mobile: 1 coluna empilhada.
- Coluna Defensoria com scroll se atendimentos > 3.

- [ ] **Step 4: Commit**

```bash
cd ~/projetos/Defender
git add src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx
git commit -m "refactor(agenda): Versão do Acusado em grid side-by-side (Delegacia | Defensoria)"
```

---

## Task 5: Depoentes — toggle + grupos + linha compacta + "Ver termo"

**Files:**
- Modify: `src/components/agenda/registro-audiencia/shared/depoente-card.tsx`
- Modify: `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx` (bloco "Depoentes")

- [ ] **Step 1: Adicionar prop `onVerTermo` ao DepoenteCard**

Abrir `src/components/agenda/registro-audiencia/shared/depoente-card.tsx`. Localizar a interface `Props` do `DepoenteCard` (não o `InfoBlock`). Adicionar:

```ts
onVerTermo?: () => void;
```

Dentro do componente, na variante `full`, adicionar no header (ao lado do nome) um botão condicional:

```tsx
{onVerTermo && (
  <button
    type="button"
    onClick={onVerTermo}
    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
    title="Abrir termo de depoimento"
  >
    <FileText className="w-3 h-3" /> Termo
  </button>
)}
```

Adicionar `FileText` ao import de `lucide-react` no topo desse arquivo.

- [ ] **Step 2: Criar helper de agrupamento no tab-briefing.tsx**

No topo do arquivo (antes de `export function TabBriefing`):

```ts
type DepoenteStatus = "ouvidos" | "ausentes" | "a-ouvir";
type DepoenteLado = "acusacao" | "defesa" | "comum";

function getDepoenteStatus(d: any): DepoenteStatus {
  if (d.ouvidoEm || d.jaOuvido === true) return "ouvidos";
  if (d.presente === false) return "ausentes";
  return "a-ouvir";
}

function getDepoenteLado(d: any): DepoenteLado {
  if (d.lado === "acusacao" || d.tipo === "VITIMA" || d.tipo === "ACUSACAO") return "acusacao";
  if (d.lado === "defesa" || d.tipo === "DEFESA") return "defesa";
  return "comum";
}

const STATUS_ORDER: DepoenteStatus[] = ["a-ouvir", "ouvidos", "ausentes"];
const LADO_ORDER: DepoenteLado[] = ["acusacao", "defesa", "comum"];

const STATUS_LABEL: Record<DepoenteStatus, string> = {
  "a-ouvir": "A ouvir",
  "ouvidos": "Ouvidos",
  "ausentes": "Ausentes",
};

const LADO_LABEL: Record<DepoenteLado, string> = {
  acusacao: "Acusação",
  defesa: "Defesa",
  comum: "Comum",
};

const LADO_BADGE_CLASS: Record<DepoenteLado, string> = {
  acusacao: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  defesa: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  comum: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};
```

- [ ] **Step 3: Substituir o conteúdo da seção Depoentes**

Localizar a `CollapsibleSection id="depoentes"`. Substituir todo o conteúdo por:

```tsx
{depoentes.length > 0 ? (
  <DepoentesBlock depoentes={depoentes} driveFiles={driveFiles} onPreview={setPreviewDoc} />
) : (
  <EmptyHint text="Nenhum depoente cadastrado." />
)}
```

E adicionar antes do `export function TabBriefing` um sub-componente `DepoentesBlock`:

```tsx
function DepoentesBlock({
  depoentes,
  driveFiles,
  onPreview,
}: {
  depoentes: any[];
  driveFiles: { driveFileId: string; name: string; mimeType?: string | null }[];
  onPreview: (p: { id: string; title: string }) => void;
}) {
  const [vista, setVista] = useState<"status" | "lado">("status");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const grupos = useMemo(() => {
    if (vista === "status") {
      const map: Record<DepoenteStatus, any[]> = { "a-ouvir": [], ouvidos: [], ausentes: [] };
      depoentes.forEach((d) => map[getDepoenteStatus(d)].push(d));
      return STATUS_ORDER
        .map((k) => ({ key: k, label: STATUS_LABEL[k], items: map[k] }))
        .filter((g) => g.items.length > 0);
    } else {
      const map: Record<DepoenteLado, any[]> = { acusacao: [], defesa: [], comum: [] };
      depoentes.forEach((d) => map[getDepoenteLado(d)].push(d));
      return LADO_ORDER
        .map((k) => ({ key: k, label: LADO_LABEL[k], items: map[k] }))
        .filter((g) => g.items.length > 0);
    }
  }, [depoentes, vista]);

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="inline-flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5 text-[11px]">
        <button
          type="button"
          onClick={() => setVista("status")}
          className={cn(
            "px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors",
            vista === "status"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          Por status
        </button>
        <button
          type="button"
          onClick={() => setVista("lado")}
          className={cn(
            "px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors",
            vista === "lado"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          Por lado
        </button>
      </div>

      {/* Grupos */}
      <div className="space-y-2">
        {grupos.map((grupo) => (
          <details key={grupo.key} open className="group">
            <summary className="cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
              <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-0 -rotate-90" />
              <span>{grupo.label}</span>
              <span className="text-neutral-400 font-normal">({grupo.items.length})</span>
            </summary>
            <div className="mt-1.5 space-y-1">
              {grupo.items.map((d: any, i: number) => {
                const depId = d.id ?? `${d.nome}-${i}`;
                const iniciais = (d.nome ?? "?")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase();
                const lado = getDepoenteLado(d);
                const intimado = !!d.intimado || d.statusIntimacao === "intimado";
                const ouvido = !!d.ouvidoEm || d.jaOuvido === true;
                const termoId = matchTermoDepoente(d.nome ?? "", driveFiles);
                const expanded = expandedId === depId;
                const lado2 = d.lado ?? (d.tipo === "ACUSACAO" || d.tipo === "VITIMA" ? "acusacao" : d.tipo === "DEFESA" ? "defesa" : null);
                const tipoNormalized = d.tipo === "ACUSACAO" || d.tipo === "DEFESA" || d.tipo === "COMUM" ? "testemunha" : (d.tipo ?? "testemunha");

                return (
                  <div key={depId} className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 overflow-hidden">
                    <div
                      onClick={() => setExpandedId(expanded ? null : depId)}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">{iniciais}</span>
                      </div>
                      <span className="flex-1 text-sm font-medium truncate">{d.nome}</span>
                      <Badge className={cn("text-[9px] px-1.5 py-0", LADO_BADGE_CLASS[lado])}>
                        {LADO_LABEL[lado]}
                      </Badge>
                      <Mail className={cn("w-3 h-3", intimado ? "text-emerald-500" : "text-neutral-300 dark:text-neutral-700")} />
                      <Check className={cn("w-3 h-3", ouvido ? "text-emerald-500" : "text-neutral-300 dark:text-neutral-700")} />
                      {termoId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview({ id: termoId, title: `Termo — ${d.nome}` });
                          }}
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" /> Termo
                        </button>
                      )}
                      <ChevronDown className={cn("w-3.5 h-3.5 text-neutral-400 transition-transform", expanded && "rotate-180")} />
                    </div>
                    {expanded && (
                      <div className="border-t border-neutral-200 dark:border-neutral-800 p-2 bg-white dark:bg-neutral-950">
                        <DepoenteCard
                          dep={{ ...d, lado: lado2, tipo: tipoNormalized }}
                          variant="full"
                          onVerTermo={termoId ? () => onPreview({ id: termoId, title: `Termo — ${d.nome}` }) : undefined}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
```

Ajustar os imports no topo:

```ts
import { useMemo, useState } from "react";
import { ChevronDown, Mail, Check, FileText, /* ... outros ... */ } from "lucide-react";
```

(Manter os imports existentes que já estão em uso; adicionar `Mail`, `Check`, `FileText` se não estiverem.)

- [ ] **Step 4: Typecheck**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep -E "tab-briefing|depoente-card" | head -15
```

Expected: vazio. Se aparecer erro sobre `onVerTermo` no `DepoenteCard`, voltar no Step 1.

- [ ] **Step 5: Smoke test**

Abrir Briefing → expandir "Depoentes". Confirmar:
- Toggle `[Por status] [Por lado]` no topo funcionando.
- Default vista "status" com grupos `A ouvir`/`Ouvidos`/`Ausentes` conforme dados.
- Cada linha: avatar iniciais + nome + badge lado (rosa/azul/neutro) + ícones envelope/check + botão "Termo" se match + chevron.
- Clicar na linha expande com DepoenteCard rico abaixo.

- [ ] **Step 6: Commit**

```bash
cd ~/projetos/Defender
git add src/components/agenda/registro-audiencia/shared/depoente-card.tsx src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx
git commit -m "feat(agenda): Briefing/Depoentes com toggle status/lado, linha compacta, preview do termo"
```

---

## Task 6: Pendências — cards com checkbox + prioridade + "Abordar"

**Files:**
- Modify: `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx` (bloco "Pendencias")

- [ ] **Step 1: Adicionar hook de persistência local**

No topo do arquivo (fora do componente), adicionar:

```ts
function getPendenciaKey(audienciaId: number | null, texto: string): string {
  const hash = texto.toLowerCase().trim().slice(0, 40);
  return `pendencia-resolvida:${audienciaId ?? "no-aud"}:${hash}`;
}

function isPendenciaResolvida(audienciaId: number | null, texto: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(getPendenciaKey(audienciaId, texto)) === "1";
}

function setPendenciaResolvida(audienciaId: number | null, texto: string, resolvida: boolean): void {
  if (typeof window === "undefined") return;
  const key = getPendenciaKey(audienciaId, texto);
  if (resolvida) window.localStorage.setItem(key, "1");
  else window.localStorage.removeItem(key);
}
```

- [ ] **Step 2: Importar Checkbox e hook de actions**

No topo do arquivo:

```ts
import { Checkbox } from "@/components/ui/checkbox";
import { useAudienciaStatusActions } from "@/hooks/use-audiencia-status-actions";
```

- [ ] **Step 3: Adicionar hook de actions dentro do componente**

Dentro de `TabBriefing`, logo após `const driveFiles = filesByProcessoQuery.data ?? [];`:

```ts
const actions = useAudienciaStatusActions(audienciaId);
```

- [ ] **Step 4: Substituir o conteúdo da seção Pendências**

Localizar a `CollapsibleSection id="pendencias"`. Substituir TODO o conteúdo por:

```tsx
{pendencias.length > 0 ? (
  <PendenciasBlock
    pendencias={pendencias}
    audienciaId={audienciaId}
    onAbordar={(texto) => {
      if (!audienciaId) return;
      actions.addNote.mutate({ audienciaId, texto: `Pendência: ${texto}` });
      setPendenciaResolvida(audienciaId, texto, true);
    }}
  />
) : (
  <EmptyHint text="Nenhuma pendência registrada." />
)}
```

E adicionar o sub-componente `PendenciasBlock` antes de `export function TabBriefing`:

```tsx
const PRIORIDADE_CLASS: Record<string, string> = {
  alta: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  baixa: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700",
};

const PRIORIDADE_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

function normalizePrioridade(raw: unknown): "alta" | "media" | "baixa" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "alta" || s === "high") return "alta";
  if (s === "baixa" || s === "low") return "baixa";
  return "media";
}

function PendenciasBlock({
  pendencias,
  audienciaId,
  onAbordar,
}: {
  pendencias: any[];
  audienciaId: number | null;
  onAbordar: (texto: string) => void;
}) {
  const items = useMemo(
    () =>
      pendencias.map((p: any) => ({
        texto: typeof p === "string" ? p : (p.descricao ?? p.pendencia ?? p.titulo ?? JSON.stringify(p)),
        prioridade: normalizePrioridade(typeof p === "object" ? p.prioridade : null),
      })),
    [pendencias]
  );

  // Re-render trigger when localStorage muda. Hook trivial.
  const [tick, setTick] = useState(0);

  return (
    <ul className="space-y-2">
      {items.map((p, i) => {
        const resolvido = isPendenciaResolvida(audienciaId, p.texto);
        return (
          <li
            key={i}
            className="flex items-start gap-2.5 p-3 rounded-lg bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 hover:ring-neutral-300"
          >
            <Checkbox
              checked={resolvido}
              onCheckedChange={(c) => {
                setPendenciaResolvida(audienciaId, p.texto, c === true);
                setTick((t) => t + 1);
              }}
              className="mt-0.5"
              aria-label={resolvido ? "Marcar como pendente" : "Marcar como resolvida"}
            />
            <p className={cn("flex-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300", resolvido && "line-through opacity-60")}>
              {p.texto}
            </p>
            <Badge className={cn("text-[10px] px-1.5 py-0 border", PRIORIDADE_CLASS[p.prioridade])}>
              {PRIORIDADE_LABEL[p.prioridade]}
            </Badge>
            {!resolvido && audienciaId && (
              <button
                type="button"
                onClick={() => onAbordar(p.texto)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer flex-shrink-0"
                title="Criar anotação rápida e marcar como resolvida"
              >
                Abordar
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
```

> **Nota:** o componente usa `useState((t) => t + 1)` como trigger de re-render após mexer em `localStorage`. É feio mas pragmático — alternativa seria `useSyncExternalStore`, excesso de engenharia para 5 pendências. Aceitar.

- [ ] **Step 5: Typecheck**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "tab-briefing" | head -10
```

Expected: vazio. Se Checkbox não existir, instalar via: `npx shadcn@latest add checkbox` (mas memory confirma shadcn está instalado — Checkbox está lá).

- [ ] **Step 6: Smoke test**

Abrir Briefing → expandir "Pendências". Confirmar:
- Cada pendência renderiza como card.
- Clicar checkbox → texto strikethrough + opacidade 60%. Refresh da página mantém o state (localStorage).
- Clicar "Abordar" → toast "Anotação salva" + marca como resolvida + botão some.
- Se não houver `audienciaId`, botão "Abordar" não aparece.

- [ ] **Step 7: Commit**

```bash
cd ~/projetos/Defender
git add src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx
git commit -m "feat(agenda): Pendências com checkbox, prioridade e ação Abordar"
```

---

## Task 7: Polish das outras seções

**Files:**
- Modify: `src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx`

- [ ] **Step 1: Resumo Executivo — FreshnessBadge + split de parágrafos**

Adicionar import:
```ts
import { FreshnessBadge } from "@/components/agenda/sheet/freshness-badge";
```

Localizar a `CollapsibleSection id="resumo-executivo"`. Substituir conteúdo por:

```tsx
<>
  {ctx?.processo?.analyzedAt && (
    <div className="flex justify-end mb-2">
      <FreshnessBadge analyzedAt={ctx.processo.analyzedAt} />
    </div>
  )}
  <div className="space-y-2">
    {resumoExecutivo.split(/\n\n+/).map((p, i) => (
      <p key={i} className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
        {p}
      </p>
    ))}
  </div>
</>
```

- [ ] **Step 2: Imputação — badges quando array/lista**

Localizar `CollapsibleSection id="imputacao"`. Substituir conteúdo por:

```tsx
{(() => {
  if (!imputacao) return <EmptyHint text="Imputação não extraída — rode a análise IA." />;
  const items = Array.isArray(imputacao)
    ? imputacao
    : typeof imputacao === "string" && /[;,]/.test(imputacao)
      ? imputacao.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
      : null;
  if (items && items.length > 1) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((c, i) => (
          <Badge key={i} variant="outline" className="text-xs px-2 py-0.5">
            {typeof c === "string" ? c : String(c)}
          </Badge>
        ))}
      </div>
    );
  }
  return (
    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
      {typeof imputacao === "string" ? imputacao : String(imputacao)}
    </p>
  );
})()}
```

- [ ] **Step 3: Fatos (Denúncia) — split de parágrafos**

Localizar `CollapsibleSection id="fatos"`. No bloco onde `fatos` é renderizado, substituir:

```tsx
<p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
  {fatos}
</p>
```

por:

```tsx
<div className="space-y-2">
  {fatos.split(/\n\n+/).map((p, i) => (
    <p key={i} className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
      {p}
    </p>
  ))}
</div>
```

Manter o bloco `teoriaFatos` (abaixo) inalterado — só trocar cores `zinc` se ainda houver.

- [ ] **Step 4: Elementos / Laudos — ícone por tipo + botão "Ver laudo"**

Adicionar imports:
```ts
import { Dna, Target, HeartPulse, FlaskConical, Brain, FileText, ClipboardList } from "lucide-react";
```

Adicionar helper antes do `export function TabBriefing`:

```ts
function iconeLaudo(nome: string): React.ComponentType<{ className?: string }> {
  const n = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\bdna\b/.test(n)) return Dna;
  if (/balistic/.test(n)) return Target;
  if (/necropsia|cadaveric/.test(n)) return HeartPulse;
  if (/toxicolog/.test(n)) return FlaskConical;
  if (/psiquiatric/.test(n)) return Brain;
  return ClipboardList;
}
```

Dentro do bloco `Elementos / Laudos`, localizar o `<li>` que renderiza cada laudo. Substituir sua estrutura interna por:

```tsx
{laudos.map((l: any, i: number) => {
  const text = typeof l === "string" ? l : l.nome ?? l.titulo ?? l.descricao ?? JSON.stringify(l);
  const detalhes = typeof l === "object" ? l.resultado ?? l.conclusao ?? l.detalhes : null;
  const Icon = iconeLaudo(text);
  const laudoId = matchLaudo(text, driveFiles);
  return (
    <li key={i} className="rounded-lg bg-white dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 px-3 py-2">
      <div className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
        <Icon className="w-3.5 h-3.5 text-neutral-500 mt-0.5 flex-shrink-0" />
        <span className="flex-1">{text}</span>
        {laudoId && (
          <button
            type="button"
            onClick={() => setPreviewDoc({ id: laudoId, title: `Laudo — ${text}` })}
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer flex-shrink-0"
          >
            <FileText className="w-3 h-3" /> Ver
          </button>
        )}
      </div>
      {detalhes && (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 pl-5 leading-relaxed">
          {detalhes}
        </p>
      )}
    </li>
  );
})}
```

- [ ] **Step 5: Investigação Defensiva — truncar resultado com "Ver mais"**

Adicionar no topo (se ainda não estiver):
```ts
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
```

Adicionar state no componente:
```ts
const [expandedInvestigacao, setExpandedInvestigacao] = useState<{ titulo: string; texto: string } | null>(null);
```

Dentro da seção Investigação, no `<li>` que renderiza cada diligência, localizar o `<p>` do resultado:

```tsx
{d.resultado && (
  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed whitespace-pre-wrap">
    {d.resultado}
  </p>
)}
```

Substituir por:

```tsx
{d.resultado && (
  <div className="mt-1">
    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap line-clamp-3">
      {d.resultado}
    </p>
    {d.resultado.length > 200 && (
      <button
        type="button"
        onClick={() => setExpandedInvestigacao({ titulo: d.titulo, texto: d.resultado })}
        className="text-[10px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 underline cursor-pointer mt-0.5"
      >
        Ver mais
      </button>
    )}
  </div>
)}
```

No final do return do componente (ao lado do `DocumentPreviewDialog`), adicionar:

```tsx
<Dialog open={!!expandedInvestigacao} onOpenChange={(o) => !o && setExpandedInvestigacao(null)}>
  <DialogContent className="max-w-2xl">
    <DialogTitle>{expandedInvestigacao?.titulo}</DialogTitle>
    <DialogDescription className="sr-only">Detalhes da diligência</DialogDescription>
    <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
      {expandedInvestigacao?.texto}
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 6: Teses — cards em vez de badges**

Localizar `CollapsibleSection id="teses"`. Substituir conteúdo por:

```tsx
{teses.length > 0 ? (
  <div className="space-y-2">
    {teses.map((t: any, i: number) => {
      const titulo = typeof t === "string" ? t : t.tese ?? t.titulo ?? t.descricao ?? JSON.stringify(t);
      const justificativa = typeof t === "object" ? t.justificativa ?? t.fundamentos : null;
      return (
        <div key={i} className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 p-2.5">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed">
            {titulo}
          </p>
          {justificativa && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed mt-1">
              {justificativa}
            </p>
          )}
        </div>
      );
    })}
  </div>
) : (
  <EmptyHint text="Teses não extraídas." />
)}
```

Se existir bloco `teoriaDireito` renderizado após as teses, manter como está (apenas garantir que cores são `neutral-*`).

- [ ] **Step 7: Typecheck**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep "tab-briefing" | head -20
```

Expected: vazio.

- [ ] **Step 8: Smoke test**

Abrir Briefing com audiência que tenha análise IA. Passar por cada seção expandida:
- Resumo Executivo: badge "Hoje"/"Nd" aparece no canto se `analyzedAt`, parágrafos separados.
- Imputação: se múltiplos crimes, vira badges; senão texto.
- Fatos: parágrafos com espaço entre.
- Elementos: laudos com ícone por tipo (DNA, balístico, etc.) + botão "Ver" se match no Drive.
- Investigação: textos grandes com "Ver mais" abrindo Dialog.
- Teses: cards com título + justificativa.

- [ ] **Step 9: Commit**

```bash
cd ~/projetos/Defender
git add src/components/agenda/registro-audiencia/tabs/tab-briefing.tsx
git commit -m "refactor(agenda): polish Resumo/Imputação/Fatos/Elementos/Investigação/Teses"
```

---

## Task 8: Verificação final + deploy

- [ ] **Step 1: Rodar todos os testes**

```bash
cd ~/projetos/Defender && npx vitest run
```

Expected: 0 falhas nos testes novos. Regressões? Verificar apenas se algum teste existente quebrou com mudanças.

- [ ] **Step 2: Typecheck completo dos arquivos tocados**

```bash
cd ~/projetos/Defender && npx tsc --noEmit 2>&1 | grep -E "match-document|document-preview-dialog|depoente-card|tab-briefing" | head -20
```

Expected: vazio.

- [ ] **Step 3: Smoke test visual completo**

Abrir `http://localhost:3000/admin/agenda`. Clicar num evento de audiência (preferir Caso Garrido — é a referência; memory menciona `project_garrido_juri`). Clicar "Registrar" para abrir modal. Aba Briefing:

1. Resumo Executivo expande, mostra FreshnessBadge.
2. Imputação expande, renderização correta.
3. Fatos expande com parágrafos separados.
4. Elementos expande, laudos com ícone correto, botão "Ver" abre preview iframe.
5. Versão do Acusado expande em 2 colunas (desktop).
6. Investigação Defensiva: resultado longo → "Ver mais" abre Dialog.
7. Depoentes: toggle status/lado, linha compacta, "Ver termo" abre preview.
8. Contradições: paleta neutral+emerald/rose.
9. Pendências: checkbox persiste, "Abordar" cria nota.
10. Teses: cards com título + justificativa.

Alternar dark mode → tudo legível.

- [ ] **Step 4: Push**

```bash
cd ~/projetos/Defender
git log --oneline -15
git push origin main
```

- [ ] **Step 5: Atualizar memória do projeto**

Editar `/Users/rodrigorochameire/.claude/projects/-Users-rodrigorochameire/memory/project_redesign_agenda.md`, adicionar seção **Bloco 3** descrevendo:
- Briefing polido: Versão side-by-side, Depoentes com toggle/grupos/linha compacta, Pendências com checkbox/prioridade/Abordar
- Outras seções: ícones por tipo de laudo, split de parágrafos, FreshnessBadge no Resumo
- Feature nova: `match-document.ts` + `DocumentPreviewDialog` vinculando termos e laudos do Drive por matching heurístico
- Sem schema/mutations novos; usa `trpc.drive.filesByProcesso` e `addQuickNote` existentes
- Range de commits: `<first>` → `<last>` (preencher após push)

Atualizar também `MEMORY.md` (linha de `project_redesign_agenda.md`) para mencionar bloco 3.

---

## Self-Review

**Spec coverage:**
- ✅ Parte 1 (Versão do Acusado side-by-side) → Task 4
- ✅ Parte 2 (Depoentes mix B+C+A) → Task 5
- ✅ Parte 3 (Pendências checkbox+prioridade+ação) → Task 6
- ✅ Parte 4 (polish outras seções) → Task 7
- ✅ Parte 5 (preview doc-fonte) → Tasks 1, 2, 3 (integration), 5 (termo), 7 (laudo)
- ✅ `SectionCard` → `CollapsibleSection` → Task 3 Step 1
- ✅ `zinc` → `neutral` → Task 3 Step 2

**Placeholder scan:** sem TBD/TODO. Todos os snippets têm código completo. Todos os comandos têm output esperado.

**Type consistency:**
- `DepoenteStatus` / `DepoenteLado` definidos no Task 5 e reusados com `STATUS_ORDER`/`LADO_ORDER` consistentes.
- `DriveFile` exportado no Task 1, consumido no Task 3 (`driveFiles` typed inferido do tRPC) e usado em `matchTermoDepoente`/`matchLaudo` nos Tasks 5 e 7.
- `DocumentPreviewDialog` props `{ driveFileId, title, onClose }` usados no Task 3 Step 4 e consumidos nos Tasks 5/7.
- `onVerTermo` adicionado ao `DepoenteCard` no Task 5 Step 1, consumido no Task 5 Step 3.

**Observação:** o `useState<{ id: string; title: string } | null>` de `previewDoc` no Task 3 Step 4 alinha com as chamadas `setPreviewDoc({ id: termoId, title: ... })` nos Tasks 5 e 7.

**Risco conhecido:** `window.innerHeight` no `DocumentPreviewDialog` precisa de guard SSR (documentado no Task 2 Step 1).
