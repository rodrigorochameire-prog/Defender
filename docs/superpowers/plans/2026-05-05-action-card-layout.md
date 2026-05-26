# Action Card Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polir o `RegistroEditor` para reduzir cliques no caminho mais comum (default Ciência), evitar quebra em duas linhas (7 primários + popover "Mais ▾"), e adicionar atalhos de teclado.

**Architecture:** Mudanças localizadas em 2 arquivos principais — `src/components/registros/registro-editor.tsx` (nova prop `tiposPrimarios`, popover overflow, atalhos, polish) e `src/components/demandas-premium/DemandaQuickPreview.tsx` (passar `tipoDefault="ciencia"` + lista de primários). Sem mudanças de schema, tRPC, ou Drizzle.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind, Lucide icons, Vitest + Testing Library + happy-dom, Radix UI Popover (já em uso no projeto).

**Spec:** `docs/superpowers/specs/2026-05-05-action-card-layout-design.md`

---

## File Structure

| File | Mudança |
|---|---|
| `src/components/registros/registro-editor.tsx` | Modify — nova prop `tiposPrimarios`, popover "Mais ▾", atalhos, foco automático, tooltip com atalho, botão Salvar colorido |
| `src/components/demandas-premium/DemandaQuickPreview.tsx` | Modify (linha 1005) — `tipoDefault="ciencia"` + `tiposPrimarios={PRIMARIOS}` |
| `src/components/registros/__tests__/registros-timeline.test.tsx` | Modify — corrigir `toHaveLength(9)` → 12 (broken na main hoje) |
| `src/components/registros/__tests__/registro-editor.test.tsx` | Create — testes de comportamento do editor (overflow, atalhos, default) |

---

## Task 1: Pre-flight — corrigir teste quebrado no main

**Context:** O commit `57f3a204` adicionou 3 tipos (`busca`, `investigacao`, `transferencia`) ao `registro-tipo-config.ts` mas não atualizou o teste em `registros-timeline.test.tsx:37-52` que ainda assere `toHaveLength(9)`. Isso bloqueia `pnpm test` no main. Antes de qualquer outra mudança, fix.

**Files:**
- Modify: `src/components/registros/__tests__/registros-timeline.test.tsx:37-52`

- [ ] **Step 1: Rodar teste atual e confirmar falha**

```bash
pnpm test src/components/registros/__tests__/registros-timeline.test.tsx
```

Expected: FAIL — `expected length 12 to be 9`.

- [ ] **Step 2: Atualizar assertion para 12 tipos**

Substituir o bloco `it("includes the 9 canonical tipos", ...)`:

```tsx
  it("includes the 12 canonical tipos", () => {
    expect(TIPO_KEYS).toEqual(
      expect.arrayContaining([
        "atendimento",
        "diligencia",
        "anotacao",
        "ciencia",
        "providencia",
        "delegacao",
        "pesquisa",
        "elaboracao",
        "peticao",
        "busca",
        "investigacao",
        "transferencia",
      ]),
    );
    expect(TIPO_KEYS).toHaveLength(12);
  });
```

- [ ] **Step 3: Rodar teste e verificar pass**

```bash
pnpm test src/components/registros/__tests__/registros-timeline.test.tsx
```

Expected: PASS — todos os testes verdes.

- [ ] **Step 4: Commit**

```bash
git add src/components/registros/__tests__/registros-timeline.test.tsx
git commit -m "fix(test): assertion de 9 tipos desatualizada após commit 57f3a204 (agora 12)"
```

---

## Task 2: Adicionar prop `tiposPrimarios` ao `RegistroEditor` (sem overflow ainda)

**Context:** Permitir ao consumidor restringir quais tipos aparecem inline. Os não-primários ficarão num popover (Task 3).

**Files:**
- Modify: `src/components/registros/registro-editor.tsx`
- Create: `src/components/registros/__tests__/registro-editor.test.tsx`

- [ ] **Step 1: Escrever teste — só primários inline quando prop passada**

Criar `src/components/registros/__tests__/registro-editor.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { RegistroEditor } from "../registro-editor";

// tRPC client é stub via mock — não precisamos de provider real para
// asserts sobre rendering dos chips.
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    useUtils: () => ({ registros: { list: { invalidate: vi.fn() } } }),
    registros: {
      create: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
  },
}));

afterEach(() => cleanup());

describe("RegistroEditor — tiposPrimarios", () => {
  it("renderiza só os tipos primários inline quando a prop é passada", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        tipoDefault="ciencia"
        tiposPrimarios={["ciencia", "providencia", "anotacao"]}
      />,
    );
    // Inline: 3 botões com aria-label dos primários
    expect(screen.getByRole("button", { name: "Ciência" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Providência" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anotação" })).toBeInTheDocument();
    // Não inline: outros tipos não aparecem como botão direto
    expect(screen.queryByRole("button", { name: "Diligência" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pesquisa" })).toBeNull();
  });

  it("sem tiposPrimarios mantém comportamento atual (todos os 12)", () => {
    render(
      <RegistroEditor assistidoId={1} tipoDefault="ciencia" />,
    );
    expect(screen.getByRole("button", { name: "Atendimento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Diligência" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pesquisa" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e verificar falha**

```bash
pnpm test src/components/registros/__tests__/registro-editor.test.tsx
```

Expected: FAIL — primeiro teste falha porque hoje todos os 12 sempre aparecem; ou compile error porque `tiposPrimarios` não existe na interface.

- [ ] **Step 3: Adicionar a prop e filtrar a lista inline**

Em `src/components/registros/registro-editor.tsx`, adicionar `tiposPrimarios` à interface e usar para filtrar:

```tsx
interface Props {
  assistidoId: number;
  processoId?: number;
  demandaId?: number;
  audienciaId?: number;
  tipoDefault: TipoRegistro;
  tiposPermitidos?: TipoRegistro[];
  // Tipos mostrados inline. Os demais ficam num popover "Mais ▾" (Task 3).
  // Sem a prop, mostra todos os tipos permitidos inline (compat).
  tiposPrimarios?: TipoRegistro[];
  onSaved?: () => void;
  onCancel?: () => void;
}
```

E na desestruturação + cálculo de tipos:

```tsx
export function RegistroEditor({
  assistidoId,
  processoId,
  demandaId,
  audienciaId,
  tipoDefault,
  tiposPermitidos,
  tiposPrimarios,
  onSaved,
  onCancel,
}: Props) {
  // ...
  const tipos = tiposPermitidos ?? TIPO_KEYS;
  const inlineTipos = tiposPrimarios
    ? tipos.filter((t) => tiposPrimarios.includes(t))
    : tipos;
  // ...
```

E mudar o `tipos.map((t) => ...)` no JSX para `inlineTipos.map((t) => ...)`.

- [ ] **Step 4: Rodar e verificar pass**

```bash
pnpm test src/components/registros/__tests__/registro-editor.test.tsx
```

Expected: PASS — ambos os testes verdes.

- [ ] **Step 5: Commit**

```bash
git add src/components/registros/registro-editor.tsx src/components/registros/__tests__/registro-editor.test.tsx
git commit -m "feat(registros): prop tiposPrimarios filtra chips inline no editor"
```

---

## Task 3: Popover "Mais ▾" para tipos não-primários

**Context:** Quando `tiposPrimarios` está ativo e há tipos restantes, mostrar um chip "Mais ▾" que abre popover com os demais. Selecionar do popover passa a ser o tipo ativo (chip expandido inline) e o popover fecha.

**Verificação prévia:** confirmar que o projeto usa Radix `Popover`:

```bash
grep -l "@radix-ui/react-popover\|components/ui/popover" src/components | head -3
```

Esperado: pelo menos um arquivo. Se não, usar o componente em `src/components/ui/popover.tsx` (existe — usado em outras tabs).

**Files:**
- Modify: `src/components/registros/registro-editor.tsx`
- Modify: `src/components/registros/__tests__/registro-editor.test.tsx`

- [ ] **Step 1: Escrever teste — botão "Mais" aparece e abre lista**

Adicionar ao final do `describe("RegistroEditor — tiposPrimarios", ...)`:

```tsx
  it("mostra botão Mais quando há tipos não-primários", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        tipoDefault="ciencia"
        tiposPrimarios={["ciencia", "providencia"]}
      />,
    );
    expect(screen.getByRole("button", { name: /^Mais$/ })).toBeInTheDocument();
  });

  it("não mostra Mais quando todos os tipos já são primários", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        tipoDefault="ciencia"
        // todos os 12
        tiposPrimarios={[
          "atendimento", "diligencia", "anotacao", "ciencia", "providencia",
          "delegacao", "pesquisa", "elaboracao", "peticao",
          "busca", "investigacao", "transferencia",
        ]}
      />,
    );
    expect(screen.queryByRole("button", { name: /^Mais$/ })).toBeNull();
  });
```

- [ ] **Step 2: Rodar e verificar falha**

```bash
pnpm test src/components/registros/__tests__/registro-editor.test.tsx
```

Expected: FAIL — não tem botão "Mais" ainda.

- [ ] **Step 3: Implementar o botão + popover**

No topo do `registro-editor.tsx` adicionar imports:

```tsx
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

Antes do `return` calcular os secundários:

```tsx
  const secondaryTipos = tiposPrimarios
    ? tipos.filter((t) => !tiposPrimarios.includes(t))
    : [];
```

Após o `inlineTipos.map(...)` adicionar o botão "Mais":

```tsx
        {secondaryTipos.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Mais"
                title="Mais tipos"
                className="rounded-md w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={4}
              className="w-44 p-1"
            >
              {secondaryTipos.map((t) => {
                const cfg = REGISTRO_TIPOS[t];
                const Icon = cfg.Icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[12px] text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    {cfg.label}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        )}
```

Importante: quando o usuário escolhe um tipo do popover que NÃO está em `tiposPrimarios`, ele vira o tipo ativo. O chip ativo é renderizado *fora* dos primários inline. Ajustar: o `inlineTipos.map(...)` deve incluir o tipo ativo mesmo se não estiver em `tiposPrimarios`:

```tsx
  const inlineTipos = tiposPrimarios
    ? Array.from(new Set([
        ...tipos.filter((t) => tiposPrimarios.includes(t)),
        ...(tipos.includes(tipo) && !tiposPrimarios.includes(tipo) ? [tipo] : []),
      ]))
    : tipos;

  const secondaryTipos = tiposPrimarios
    ? tipos.filter((t) => !tiposPrimarios.includes(t) && t !== tipo)
    : [];
```

- [ ] **Step 4: Rodar testes**

```bash
pnpm test src/components/registros/__tests__/registro-editor.test.tsx
```

Expected: PASS — todos verdes.

- [ ] **Step 5: Commit**

```bash
git add src/components/registros/registro-editor.tsx src/components/registros/__tests__/registro-editor.test.tsx
git commit -m "feat(registros): popover Mais ▾ para tipos não-primários"
```

---

## Task 4: Atualizar `DemandaQuickPreview` — default Ciência + 7 primários

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx:1001-1008`

- [ ] **Step 1: Trocar default e adicionar lista de primários**

Substituir o bloco `<RegistroEditor ...>` (linhas ~1001-1008):

```tsx
                    <RegistroEditor
                      assistidoId={demanda.assistidoId}
                      processoId={demanda.processoId ?? undefined}
                      demandaId={Number(demanda.id)}
                      tipoDefault="ciencia"
                      tiposPrimarios={[
                        "ciencia",
                        "providencia",
                        "diligencia",
                        "atendimento",
                        "delegacao",
                        "anotacao",
                        "peticao",
                      ]}
                      onSaved={() => setNovoRegistroOpen(false)}
                      onCancel={() => setNovoRegistroOpen(false)}
                    />
```

- [ ] **Step 2: Verificar tipo do TS**

```bash
pnpm typecheck
```

Expected: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "feat(demandas): default Ciência + 7 tipos primários no editor da demanda"
```

---

## Task 5: Atalhos de teclado (1–7, ⌘↵, Esc)

**Context:** Quando o editor está aberto, `1`–`7` troca o tipo (na ordem dos primários, com fallback para todos se não houver primários); `⌘↵`/`Ctrl↵` salva; `Esc` cancela.

**Princípio:** atalhos só disparam se o foco NÃO estiver num input/textarea (exceto `⌘↵` e `Esc` que disparam em qualquer lugar dentro do editor).

**Files:**
- Modify: `src/components/registros/registro-editor.tsx`
- Modify: `src/components/registros/__tests__/registro-editor.test.tsx`

- [ ] **Step 1: Escrever teste — atalho 1 troca tipo**

Adicionar ao test file:

```tsx
import { fireEvent } from "@testing-library/react";

// ... dentro de describe("RegistroEditor — tiposPrimarios", ...)

  it("atalho '1' troca para o primeiro tipo primário", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        tipoDefault="providencia"
        tiposPrimarios={["ciencia", "providencia", "anotacao"]}
      />,
    );
    // Antes: providencia ativo
    expect(screen.getByRole("button", { name: "Providência", pressed: true })).toBeInTheDocument();
    // Dispara key '1' no document — fora de input/textarea
    fireEvent.keyDown(document.body, { key: "1" });
    expect(screen.getByRole("button", { name: "Ciência", pressed: true })).toBeInTheDocument();
  });

  it("atalho NÃO dispara quando foco está no textarea", () => {
    render(
      <RegistroEditor
        assistidoId={1}
        tipoDefault="ciencia"
        tiposPrimarios={["ciencia", "providencia"]}
      />,
    );
    const textarea = screen.getByPlaceholderText(/o que aconteceu/i);
    textarea.focus();
    fireEvent.keyDown(textarea, { key: "2" });
    // Continua em ciencia (não trocou para providencia)
    expect(screen.getByRole("button", { name: "Ciência", pressed: true })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Rodar e verificar falha**

```bash
pnpm test src/components/registros/__tests__/registro-editor.test.tsx
```

Expected: FAIL — atalhos não implementados ainda.

- [ ] **Step 3: Implementar useEffect com listener**

Após o `useState` no editor:

```tsx
import { useEffect, useRef, useState } from "react";

// ... dentro do componente, antes do return:

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditableField =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      // ⌘↵ / Ctrl↵ → salva (funciona dentro do textarea também)
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (conteudo.trim() && !create.isPending) {
          e.preventDefault();
          create.mutate({
            tipo,
            assistidoId,
            processoId,
            demandaId,
            audienciaId,
            titulo: titulo.trim() || undefined,
            conteudo: conteudo.trim(),
          });
        }
        return;
      }

      // Esc → cancela (em qualquer lugar)
      if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        onCancel();
        return;
      }

      // 1–7 → troca tipo primário (só fora de input/textarea)
      if (!inEditableField && /^[1-7]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        const lista = tiposPrimarios ?? tipos;
        const target = lista[idx];
        if (target) {
          e.preventDefault();
          setTipo(target);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [conteudo, titulo, tipo, tiposPrimarios, tipos, create, assistidoId, processoId, demandaId, audienciaId, onCancel]);
```

- [ ] **Step 4: Rodar e verificar pass**

```bash
pnpm test src/components/registros/__tests__/registro-editor.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/registros/registro-editor.tsx src/components/registros/__tests__/registro-editor.test.tsx
git commit -m "feat(registros): atalhos 1-7, ⌘↵, Esc no editor"
```

---

## Task 6: Polish — foco automático + tooltip com atalho + Salvar colorido

**Files:**
- Modify: `src/components/registros/registro-editor.tsx`

- [ ] **Step 1: Foco automático no textarea ao montar**

Adicionar `useRef` e `useEffect`:

```tsx
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);
```

E na `<textarea>`:

```tsx
        <textarea
          ref={textareaRef}
          value={conteudo}
          // ... resto igual
        />
```

- [ ] **Step 2: Tooltip com atalho**

No `inlineTipos.map(...)`, calcular o índice do atalho. Se o tipo está em `tiposPrimarios` (ou em `tipos` quando não há primários), índice 0–6 ganha atalho:

```tsx
        {inlineTipos.map((t) => {
          const cfg = REGISTRO_TIPOS[t];
          const Icon = cfg.Icon;
          const active = tipo === t;
          const lista = tiposPrimarios ?? tipos;
          const idx = lista.indexOf(t);
          const shortcut = idx >= 0 && idx < 7 ? ` (${idx + 1})` : "";
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              title={`${cfg.label}${shortcut}`}
              aria-label={cfg.label}
              // ... resto igual
```

- [ ] **Step 3: Botão Salvar colorido pelo tipo ativo**

Substituir o `<Button>` de Salvar:

```tsx
            <Button
              size="sm"
              disabled={!conteudo.trim() || create.isPending}
              onClick={() =>
                create.mutate({
                  tipo,
                  assistidoId,
                  processoId,
                  demandaId,
                  audienciaId,
                  titulo: titulo.trim() || undefined,
                  conteudo: conteudo.trim(),
                })
              }
              style={
                conteudo.trim() && !create.isPending
                  ? { backgroundColor: activeCfg.color, color: "white" }
                  : undefined
              }
              className="h-7 text-[11px] px-3 cursor-pointer transition-all"
            >
              {create.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
```

- [ ] **Step 4: Rodar todos os testes do registros**

```bash
pnpm test src/components/registros
```

Expected: PASS em todos.

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/registros/registro-editor.tsx
git commit -m "feat(registros): foco automático, tooltip com atalho, Salvar colorido pelo tipo"
```

---

## Task 7: Verificação final + push + PR

**Files:** nenhum (operações git).

- [ ] **Step 1: Build local**

```bash
pnpm build
```

Expected: build conclui sem erro. Ignorar warnings de outras áreas.

- [ ] **Step 2: Smoke test manual no dev server (5 min)**

```bash
pnpm dev
```

Abrir `http://localhost:3000`, navegar até uma demanda no quick-preview, clicar em "Adicionar registro" e validar:
- Default = chip "Ciência" expandido (cyan)
- 7 chips em uma única linha + chevron "Mais"
- Clicar em "Mais" abre popover com 5 tipos (Pesquisa, Elaboração, Busca, Investigação, Transferência)
- Selecionar do popover deixa o tipo expandido inline
- Atalhos 1–7 funcionam fora do textarea
- ⌘↵ salva
- Esc cancela
- Foco já está no textarea ao abrir

Se algo regredir, voltar ao task correspondente.

- [ ] **Step 3: Push da branch**

```bash
git push -u origin feat/action-card-layout
```

- [ ] **Step 4: Abrir PR**

```bash
gh pr create --title "feat(registros): action card — default Ciência, 7 primários + Mais ▾, atalhos" --body "$(cat <<'EOF'
## Summary
- Default do editor da demanda passa de Providência → **Ciência** (caso mais comum)
- Tipos primários (7 visíveis) + popover **Mais ▾** (5 restantes) — elimina o wrap em duas linhas
- Atalhos: `1`–`7` troca tipo (fora de input), `⌘↵` salva, `Esc` cancela
- Polish: foco automático no textarea, tooltip mostra atalho, botão Salvar fica colorido pelo tipo

Spec: \`docs/superpowers/specs/2026-05-05-action-card-layout-design.md\`

## Test plan
- [ ] Vercel preview renderiza editor com Ciência default
- [ ] 7 chips em linha única + chevron Mais
- [ ] Popover Mais lista os 5 tipos restantes
- [ ] Atalhos 1–7 trocam tipo, ⌘↵ salva, Esc cancela
- [ ] Foco automático no textarea
- [ ] Sem regressão em \`registro-audiencia/tab-anotacoes\` (continua usando default \`anotacao\` sem primários)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Anotar URL do PR**

Capturar a URL retornada pelo `gh pr create` e colar na conversa para o usuário.

---

## Notas de execução

- **CI no main falha por pnpm-lock missing** (memory `feedback_ci_main_pnpm_bug.md`) — não bloqueia merge; o check real é o Vercel preview.
- **CLAUDE.md do projeto** carrega regras AIOX. Para esse PR pequeno seguimos brainstorming → spec → plano → exec direta (não usar fluxo Story-Driven SDC).
- **`scripts/check_areas.mjs`** untracked no repo — não toca, é script ad-hoc.
- **PR-B (Calendar sync)** fica para depois — spec separada, não entra aqui.
