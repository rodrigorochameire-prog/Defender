# Atos por tipo + doca à esquerda (Fase 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps usam checkbox (`- [ ]`).

**Goal:** Expor os atos dos autos por tipo (denúncia, depoimentos, laudos, ata…) no sheet (agenda + demanda), com clique abrindo o PDF **na página do ato** numa **doca à esquerda** que mantém o sheet ativo (sem overlay que tapa tudo). Mais botão "Sistematizar".

**Architecture:** Reusa `SectionsViewer` (já agrupa `drive_document_sections` por tipo) numa nova aba "Atos"; `AutosPreviewPane` ganha `initialPage` (→ `#page=N` no proxy); os sheets ganham um modo "doca à esquerda" (alargam e dividem em [PDF | conteúdo]); "Sistematizar" chama `documentSections.triggerClassification`.

**Tech Stack:** Next.js, tRPC, Drizzle, React/Tailwind, Radix Sheet.

**Spec:** `docs/plans/2026-06-11-autos-atos-por-tipo-design.md` (Fase 2 + seção "Expandir à esquerda").

---

### Task 1: `initialPage` no visualizador (deep-link à página)

**Files:** Modify `src/components/pdf/autos-preview-pane.tsx`; Modify `src/components/agenda/registro-audiencia/shared/document-preview-dialog.tsx`

- [ ] **Step 1: `AutosPreviewPane` aceita `initialPage`**

Adicionar à interface `Props`: `initialPage?: number;`. Na montagem do `previewUrl` (modo proxy), anexar `#page` quando houver:

```tsx
const previewUrl =
  viewSource === "app"
    ? `/api/drive/proxy?fileId=${fileId}${initialPage ? `#page=${initialPage}` : ""}`
    : `https://drive.google.com/file/d/${fileId}/preview${initialPage ? `#page=${initialPage}` : ""}`;
```

(Recebê-lo no destructuring dos props: `initialPage`.)

- [ ] **Step 2: `DocumentPreviewDialog` aceita `initialPage`** (para o caso overlay continuar abrindo na página)

Adicionar `initialPage?: number;` aos `Props`; quando `isPdf && viewSource === "app"`, `bodyUrl = proxyUrl + (initialPage ? \`#page=${initialPage}\` : "")`.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "autos-preview-pane|document-preview-dialog"` → vazio.

- [ ] **Step 4: Commit**

```bash
git add src/components/pdf/autos-preview-pane.tsx src/components/agenda/registro-audiencia/shared/document-preview-dialog.tsx
git commit -m "feat(pdf): initialPage (#page) no visualizador inline

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `SectionsViewer` aceita `onOpenSection` (override do clique)

**Files:** Modify `src/components/drive/SectionsViewer.tsx`

- [ ] **Step 1: Adicionar prop opcional e usá-la no clique**

Na interface `SectionsViewerProps` adicionar: `onOpenSection?: (section: { fileDriveId: string | null; paginaInicio: number; titulo: string; tipo: string }) => void;`.
No corpo, onde está `handleOpenSection`, no início da função: se `onOpenSection` foi passado, chamar `onOpenSection(s)` e retornar (não abrir o `SectionDetailSheet`):

```tsx
const handleOpenSection = (s: any) => {
  if (onOpenSection) {
    onOpenSection({ fileDriveId: s.fileDriveId, paginaInicio: s.paginaInicio, titulo: s.titulo, tipo: s.tipo });
    return;
  }
  // ...comportamento atual (abrir SectionDetailSheet)...
};
```

(Receber `onOpenSection` no destructuring dos props.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep SectionsViewer` → vazio.

- [ ] **Step 3: Commit**

```bash
git add src/components/drive/SectionsViewer.tsx
git commit -m "feat(sections): SectionsViewer aceita onOpenSection p/ docar PDF na página

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Aba "Atos" + "Sistematizar" no `DocumentosBlock`, com callback de doca

**Files:** Modify `src/components/agenda/sheet/documentos-block.tsx`

Contexto: `DocumentosBlock({ processoId, assistidoId })` tem abas `autos | assistido`. Vamos adicionar a aba `atos` e um callback `onDockPdf` (vindo do sheet pai) para docar o PDF.

- [ ] **Step 1: Estender `Props` e `TabKey`**

```tsx
type TabKey = "autos" | "assistido" | "atos";
interface Props {
  processoId: number | null;
  assistidoId: number | null;
  onDockPdf?: (fileDriveId: string, page?: number) => void; // doca à esquerda no sheet pai
}
```

(Receber `onDockPdf` no destructuring.)

- [ ] **Step 2: Adicionar o botão da aba "Atos"** (ao lado de Autos/Assistido), habilitado quando `processoId`:

```tsx
<button type="button" role="tab" aria-selected={tab === "atos"} disabled={!processoId}
  onClick={() => { setTab("atos"); setOpenId(null); }}
  className={cn("px-3 py-1.5 text-[11px] font-medium border-b-2 cursor-pointer transition-colors",
    tab === "atos" ? "border-foreground text-foreground" : "border-transparent text-neutral-500 hover:text-neutral-700",
    !processoId && "opacity-40 cursor-not-allowed")}>
  Atos
</button>
```

- [ ] **Step 3: Renderizar a aba "Atos"** (no bloco de conteúdo, novo ramo). Importar no topo: `import { SectionsViewer } from "@/components/drive/SectionsViewer";` e `import { autosScore } from "@/lib/autos-pick";` (não necessário) — basta `SectionsViewer`. Também `import { trpc } ...` já existe.

Adicionar, junto às queries, a contagem de seções e o id do PDF de autos para "Sistematizar":

```tsx
const sectionsQ = trpc.drive.sectionsByProcesso.useQuery({ processoId: processoId ?? 0 }, { enabled: !!processoId && tab === "atos" });
const temSecoes = ((sectionsQ.data as any[]) ?? []).length > 0;
// id (serial) do PDF "deste processo" para sistematizar (vem de autosDoProcesso já usado na aba Autos)
const autosFileId: number | null = (autosGrupos.desteProcesso[0] as any)?.id ?? null;
const triggerClassif = trpc.documentSections.triggerClassification.useMutation({
  onSuccess: () => { toast.success("Sistematização iniciada — atualize em instantes."); if (processoId) utils.drive.sectionsByProcesso.invalidate({ processoId }); },
  onError: (e) => toast.error(e.message ?? "Falha ao sistematizar"),
});
```

No JSX, adicionar o ramo da aba (no ternário de conteúdo, transformar em encadeado):

```tsx
{tab === "atos" ? (
  processoId ? (
    temSecoes ? (
      <SectionsViewer
        processoId={processoId}
        onOpenSection={(s) => { if (s.fileDriveId && onDockPdf) onDockPdf(s.fileDriveId, s.paginaInicio); }}
      />
    ) : (
      <div className="py-6 text-center space-y-2">
        <p className="text-[11px] text-neutral-400 italic">Autos ainda não sistematizados por tipo.</p>
        {autosFileId && (
          <button type="button" disabled={triggerClassif.isPending}
            onClick={() => triggerClassif.mutate({ driveFileId: autosFileId })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-[11px] font-medium cursor-pointer disabled:opacity-50">
            {triggerClassif.isPending ? "Sistematizando…" : "Sistematizar"}
          </button>
        )}
      </div>
    )
  ) : (
    <p className="text-[11px] text-neutral-400 italic py-4 text-center">Sem processo vinculado.</p>
  )
) : tab === "autos" ? (
  /* ...bloco de grupos da aba Autos já existente... */
) : (
  /* ...bloco da aba Assistido já existente... */
)}
```

> Nota: `SectionsViewer` aceita só `processoId` (sem `assistidoId`); ele já busca `sectionsByProcesso`. `toast` e `utils` já estão no arquivo.

- [ ] **Step 4: Typecheck + compile**

Run: `npx tsc --noEmit 2>&1 | grep documentos-block` → vazio.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/agenda` → 200.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/documentos-block.tsx
git commit -m "feat(atos): aba Atos (sistematização por tipo) + Sistematizar + callback de doca

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Doca à esquerda no `event-detail-sheet` (agenda)

**Files:** Modify `src/components/agenda/event-detail-sheet.tsx`

Objetivo: quando um ato é clicado (ou ao expandir), o sheet **alarga** e mostra o PDF numa coluna à esquerda, mantendo o conteúdo do sheet à direita e ativo.

- [ ] **Step 1: Estado da doca**

No componente, adicionar:

```tsx
const [docaAutos, setDocaAutos] = useState<{ fileId: string; page?: number } | null>(null);
```

Importar: `import { AutosPreviewPane } from "@/components/pdf/autos-preview-pane";`

- [ ] **Step 2: Passar `onDockPdf` ao `DocumentosBlock`**

Onde o `DocumentosBlock` é renderizado (dentro da seção Documentos), passar:

```tsx
<DocumentosBlock
  processoId={...}
  assistidoId={...}
  onDockPdf={(fileId, page) => setDocaAutos({ fileId, page })}
/>
```

- [ ] **Step 3: Alargar o SheetContent e dividir o corpo quando docado**

No `SheetContent`, tornar a largura condicional (acrescentar quando `docaAutos`):

```tsx
className={cn(
  "p-0 flex flex-col gap-0 border-l-0 outline-none bg-white dark:bg-neutral-950 rounded-l-2xl sm:rounded-l-none shadow-2xl [&>button:first-of-type]:hidden",
  docaAutos ? "w-full sm:w-[96vw] sm:max-w-none" : "w-full sm:w-[600px] md:w-[780px] lg:w-[920px] xl:w-[1040px]",
)}
```

(Usar `cn` — já importado no projeto; se não, `import { cn } from "@/lib/utils"`.)

Envolver o corpo do sheet num flex-row quando docado: a coluna esquerda é o PDF, a direita é o conteúdo atual do sheet. Estrutura:

```tsx
<div className="flex-1 flex min-h-0">
  {docaAutos && (
    <div className="hidden sm:flex flex-col min-w-0 flex-1 border-r border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between px-2 py-1 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-[11px] font-medium text-neutral-500">Autos</span>
        <button type="button" onClick={() => setDocaAutos(null)}
          className="text-[11px] text-neutral-500 hover:text-foreground cursor-pointer px-2 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
          Recolher ⇥
        </button>
      </div>
      <AutosPreviewPane
        files={[{ driveFileId: docaAutos.fileId }]}
        initialId={docaAutos.fileId}
        initialPage={docaAutos.page}
        className="flex-1 min-h-0"
        bodyClassName="flex-1 min-h-0"
      />
    </div>
  )}
  <div className={cn("flex flex-col min-h-0 overflow-y-auto", docaAutos ? "w-full sm:w-[460px] sm:shrink-0" : "flex-1")}>
    {/* ...todo o conteúdo atual do sheet (header interno, abas, blocos)... */}
  </div>
</div>
```

> Importante: NÃO é um segundo modal — é a mesma `SheetContent`. O sheet continua plenamente interativo (abas, registro). Em telas pequenas (`sm` abaixo), a doca fica oculta e o conteúdo ocupa tudo (o clique no ato pode cair no overlay como fallback — fora de escopo do mobile aqui).

- [ ] **Step 4: Resetar a doca ao trocar de evento/fechar**

Onde o sheet reage a mudança de `evento`/fechamento, adicionar `setDocaAutos(null)` (ex.: no `useEffect` que limpa estado quando o evento muda, ou no onOpenChange de fechar).

- [ ] **Step 5: Typecheck + compile**

Run: `npx tsc --noEmit 2>&1 | grep event-detail-sheet` → vazio.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/agenda` → 200.

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/event-detail-sheet.tsx
git commit -m "feat(atos): doca de autos à esquerda no sheet da agenda (sheet segue ativo)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Aba "Atos" + doca à esquerda no `DemandaQuickPreview`

**Files:** Modify `src/components/demandas-premium/DemandaQuickPreview.tsx`

- [ ] **Step 1: Estado da doca + reset**

```tsx
const [docaAutos, setDocaAutos] = useState<{ fileId: string; page?: number } | null>(null);
```
Resetar quando `demanda?.id`/`open` mudam (no `useEffect` existente que zera estado).

- [ ] **Step 2: Card "Ver autos" passa a docar à esquerda (em vez do overlay)**

No `onClick` do card "Ver autos", trocar `setPreviewFileId(primaryAutos.driveFileId)` por:
```tsx
onClick={() => setDocaAutos({ fileId: primaryAutos.driveFileId })}
```
(Manter o `DocumentPreviewDialog`/`previewFileId` para os chips de PDF, que continuam abrindo em overlay — ou, se preferir consistência, também docar; nesta task, só o card "Ver autos" doca.)

- [ ] **Step 3: Aba "Atos" no bloco Recursos**

Adicionar, abaixo do card "Ver autos", um cabeçalho "Atos" com o `SectionsViewer` (quando há `processoId`), com `onOpenSection` docando:
```tsx
{demanda.processoId && (
  <SectionsViewer
    processoId={demanda.processoId}
    onOpenSection={(s) => { if (s.fileDriveId) setDocaAutos({ fileId: s.fileDriveId, page: s.paginaInicio }); }}
  />
)}
```
Importar `SectionsViewer`.

- [ ] **Step 4: Render da doca no SheetContent**

Alargar o `SheetContent` quando `docaAutos` (mesma técnica da Task 4: `cn(...)`, `w-[96vw]` quando docado) e envolver o conteúdo num flex-row com `AutosPreviewPane` à esquerda + botão "Recolher" + conteúdo à direita. Importar `AutosPreviewPane`.

- [ ] **Step 5: Typecheck + compile**

Run: `npx tsc --noEmit 2>&1 | grep DemandaQuickPreview` → vazio.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/demandas` → 200.

- [ ] **Step 6: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "feat(atos): aba Atos + doca de autos à esquerda no sheet da demanda

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verificação final (browser, sessão mintada)
- Agenda: abrir evento de processo sistematizado (16 VVD têm seções) → aba **Atos** lista por tipo; clicar um ato → o sheet **alarga e o PDF aparece à esquerda na página do ato**, e a aba/registro à direita continuam clicáveis. "Recolher" volta à largura normal.
- Processo sem seções → botão **Sistematizar** dispara e mostra "Sistematizando…".
- Demanda: card "Ver autos" doca à esquerda; aba Atos idem.

## Self-review (preenchido)
- **Cobertura:** aba Atos (T3/T5), deep-link `#page` (T1), `onOpenSection` (T2), doca à esquerda não-modal (T4/T5), Sistematizar (T3). ✓
- **Placeholders:** os blocos "…conteúdo atual do sheet…" referem-se a mover o JSX já existente para dentro da coluna direita — instrução explícita, não placeholder de lógica nova.
- **Tipos:** `onDockPdf(fileDriveId, page?)`, `docaAutos {fileId,page?}`, `AutosPreviewPane` `initialId/initialPage`, `SectionsViewer onOpenSection` — consistentes entre tasks.
- **Ambiguidade:** mobile (`<sm`) não recebe a doca (decisão explícita na T4).
