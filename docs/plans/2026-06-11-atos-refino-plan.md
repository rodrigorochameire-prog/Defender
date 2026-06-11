# Refino dos Atos — Implementation Plan

> Subagent-driven. Branch `feat/atos-refino`.

**Goal:** Aprimorar a experiência de atos: (1) o visualizador pula para a página do ato **a cada clique** (não só na 1ª vez); (2) cards de ato com **dark mode**; (3) **aba "Atos"** no modal de registro de audiência (tela cheia) → clicar um ato pula o painel de PDF para a página.

**Tech:** Next.js, tRPC, React/Tailwind, Radix.

---

### Task 1: `AutosPreviewPane` reage a `initialId`/`initialPage` (pulo por clique)

**Files:** Modify `src/components/pdf/autos-preview-pane.tsx`

Hoje `selectedId` só é inicializado uma vez; mudar `initialId`/`initialPage` não troca o documento/página. E o `<iframe key={fileId}>` não recarrega quando só a página muda.

- [ ] **Step 1: Sincronizar `selectedId` quando `initialId` muda** — adicionar, após os `useEffect` existentes:

```tsx
useEffect(() => {
  if (initialId) setSelectedId(initialId);
}, [initialId]);
```

- [ ] **Step 2: Recarregar o iframe ao mudar a página/fonte** — trocar `key={fileId}` (linha ~163) por:

```tsx
key={`${fileId}:${initialPage ?? ""}:${viewSource}`}
```

- [ ] **Step 3: Resetar loading ao mudar a página** — incluir `initialPage` nas deps do effect de loading (linha ~60):

```tsx
}, [selectedId, viewSource, initialPage]);
```

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit 2>&1 | grep autos-preview-pane` → vazio.
```bash
git add src/components/pdf/autos-preview-pane.tsx
git commit -m "fix(pdf): visualizador reage a initialId/initialPage (pula por clique)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `SectionCard` com dark mode

**Files:** Modify `src/components/drive/SectionCard.tsx`

O card usa cores `zinc-*` fixas (sem `dark:`), o que destoa no tema escuro dos sheets. Adicionar variantes dark, preservando o layout.

- [ ] **Step 1: Adicionar variantes `dark:` às classes do container e textos**

No `<button ... className="...">` do card: `border-zinc-200` → `border-zinc-200 dark:border-neutral-800`; `hover:border-zinc-300` → `+ dark:hover:border-neutral-700`; `hover:bg-zinc-50/50` → `+ dark:hover:bg-neutral-800/40`.
No título (`text-zinc-800`) → `+ dark:text-neutral-100`. No resumo (`text-zinc-500`) → `+ dark:text-neutral-400`. Nos textos auxiliares/`text-zinc-400` → `+ dark:text-neutral-500`. Procure todas as ocorrências de `text-zinc-`/`border-zinc-`/`bg-zinc-` no arquivo e dê a contraparte `dark:` (mapeamento: zinc-800→neutral-100, zinc-700→neutral-200, zinc-600→neutral-300, zinc-500→neutral-400, zinc-400→neutral-500, zinc-200→neutral-800, zinc-50→neutral-800/40).

- [ ] **Step 2: Typecheck + lint + commit**

Run: `npx tsc --noEmit 2>&1 | grep SectionCard` → vazio. `npx eslint src/components/drive/SectionCard.tsx` → 0 errors.
```bash
git add src/components/drive/SectionCard.tsx
git commit -m "style(sections): SectionCard com suporte a dark mode

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Aba "Atos" no modal de registro de audiência

**Files:** Modify `src/components/agenda/registro-audiencia/hooks/use-registro-form.ts`; Modify `src/components/agenda/registro-audiencia/registro-modal.tsx`

Contexto: o modal já tem o painel `AutosPreviewPane` (aside esquerdo, `showAutos`, `previewFiles`, `evProcessoId`, `evAssistidoId`). Falta o navegador de Atos.

- [ ] **Step 1: Estender `TabKey`** em `hooks/use-registro-form.ts`:

```ts
export type TabKey = "briefing" | "depoentes" | "anotacoes" | "resultado" | "historico" | "atos";
```

- [ ] **Step 2: No `registro-modal.tsx`, importar `SectionsViewer` e um ícone** (`Layers` de lucide):

```ts
import { Layers } from "lucide-react"; // adicionar ao import existente de lucide
import { SectionsViewer } from "@/components/drive/SectionsViewer";
```

- [ ] **Step 3: Estado do ato selecionado** (perto dos outros `useState`):

```tsx
const [atoSel, setAtoSel] = useState<{ fileId: string; page?: number } | null>(null);
```

- [ ] **Step 4: Adicionar a aba "Atos" no `buildTabConfig`** (após `historico`):

```ts
tabs.push({ key: "atos", label: "Atos", icon: Layers });
```

- [ ] **Step 5: Guardar o ponto de completude** — onde o dot é renderizado (`completude.byTab[tab.key]`, ~linha 371), envolver para não acessar "atos":

```tsx
{tab.key !== "atos" && (
  <span
    className={`w-1.5 h-1.5 rounded-full ${completudeStateColor(completude.byTab[tab.key])}`}
    title={`Completude: ${COMPLETUDE_LABEL[completude.byTab[tab.key]]}`}
  />
)}
```

(Se o TS reclamar do índice, usar `completude.byTab[tab.key as Exclude<typeof tab.key, "atos">]` — mas com o guard `tab.key !== "atos"` o narrowing já resolve.)

- [ ] **Step 6: Renderizar o conteúdo da aba "Atos"** (no bloco de conteúdo, junto aos outros `form.activeTab === ...`):

```tsx
{form.activeTab === "atos" && (
  evProcessoId ? (
    <SectionsViewer
      processoId={evProcessoId}
      assistidoId={evAssistidoId ?? 0}
      onOpenSection={(s) => {
        if (s.fileDriveId) { setAtoSel({ fileId: s.fileDriveId, page: s.paginaInicio }); setShowAutos(true); }
      }}
    />
  ) : (
    <p className="text-xs text-muted-foreground p-4 text-center">Sem processo vinculado para sistematizar.</p>
  )
)}
```

- [ ] **Step 7: Passar o ato selecionado ao `AutosPreviewPane`** — no `<AutosPreviewPane files={previewFiles} ... />` do aside, acrescentar:

```tsx
initialId={atoSel?.fileId}
initialPage={atoSel?.page}
```

- [ ] **Step 8: Typecheck + compile + commit**

Run: `npx tsc --noEmit 2>&1 | grep -E "registro-modal|use-registro-form"` → vazio.
Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/agenda` → 200.
```bash
git add src/components/agenda/registro-audiencia/hooks/use-registro-form.ts src/components/agenda/registro-audiencia/registro-modal.tsx
git commit -m "feat(atos): aba Atos no modal de registro de audiência (clique pula o PDF p/ a página)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verificação final (browser)
- Agenda → modal de registro (tela cheia) de processo sistematizado → aba **Atos** lista por tipo; clicar um ato → o painel de PDF (esquerda) pula para a página do ato; o lado direito (abas) segue ativo.
- Sheet (demanda/agenda): clicar atos diferentes em sequência → o PDF docado troca de documento/página a cada clique (efeito da Task 1).
- Tema escuro: cards de ato legíveis (Task 2).

## Self-review
- Cobertura: pulo por clique (T1), dark mode (T2), aba Atos no modal (T3). ✓
- Sem placeholders; código completo.
- Tipos: `initialId/initialPage` (AutosPreviewPane), `atoSel {fileId,page?}`, `TabKey` com "atos", guard do dot de completude. Consistentes.
- Risco: extensão de `TabKey` toca o hook; o `count-completude.ts` tem TabKey próprio (5 chaves) — o guard `tab.key !== "atos"` evita acessar byTab com "atos".
