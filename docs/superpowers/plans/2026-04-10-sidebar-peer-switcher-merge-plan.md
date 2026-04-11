# Sidebar Peer Switcher Merge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fundir o `DefensorSwitcher` (olho duplicado no topo da sidebar) dentro do popover do `ContextControl` como uma seção colapsável "Outros defensores" visível apenas para admin, com modo read-only forçado no backend quando o admin estiver visualizando como outro defensor.

**Architecture:** O `DefensorContext` e a query tRPC `workspaceDefensores` já existem e continuam sendo a fonte de verdade. O enforcement read-only é feito por um middleware tRPC novo que lê um header HTTP `x-defensor-scope` e bloqueia mutations quando o escopo aponta para outro usuário. O frontend envia o header automaticamente via `headers()` callback nos httpLinks e desabilita controles de formulário através de um `<fieldset disabled>` no layout. Danilo e Cristiane saem do `DEFENSORES_CONFIG` estático e passam a viver apenas no `users` table do banco.

**Tech Stack:** Next.js 15 App Router, tRPC v11, Drizzle ORM, PostgreSQL (Supabase), Tailwind, shadcn/ui. Testes: Vitest (unit/integration) e Playwright (e2e se já houver setup — se não, só unit).

**Spec:** `docs/superpowers/specs/2026-04-10-sidebar-peer-switcher-merge-design.md`

---

## File Structure

### Arquivos novos

- `src/lib/trpc/middlewares/block-when-viewing-as-peer.ts` — middleware tRPC que bloqueia mutations quando `ctx.selectedDefensorScopeId !== null && !== ctx.user.id`.
- `src/hooks/use-is-viewing-as-peer.ts` — hook de conveniência que combina `DefensorContext` + `usePermissions` para retornar um booleano.
- `src/components/layout/peer-switcher-section.tsx` — novo componente React com a seção colapsável "Outros defensores", renderizada dentro do `ContextControl`. Contém a lista de peers, subgrupos, e botão "Voltar ao meu perfil".
- `src/components/layout/read-only-fieldset.tsx` — componente cliente que envolve o conteúdo do layout admin com um `<fieldset disabled={isViewingAsPeer}>` (sem estilização visual por enquanto — é transparente).
- `__tests__/trpc/middlewares/block-when-viewing-as-peer.test.ts` — testes do middleware.
- `__tests__/hooks/use-is-viewing-as-peer.test.tsx` — testes do hook.

### Arquivos modificados

- `src/lib/trpc/init.ts` — estender `TRPCContext` com `selectedDefensorScopeId: number | null`, alterar `createTRPCContext` para aceitar `Request` e ler o header `x-defensor-scope`, aplicar `blockWhenViewingAsPeer` a `protectedProcedure`.
- `src/app/api/trpc/[trpc]/route.ts` — passar `req` para `createTRPCContext`.
- `src/app/providers.tsx` — adicionar `headers` callback nos três httpLinks enviando `x-defensor-scope` baseado em `localStorage`.
- `src/lib/trpc/routers/users.ts` — atualizar `workspaceDefensores` para retornar também `comarcaId` (necessário pro agrupamento Camaçari/RMS).
- `src/config/defensores.ts` — remover entradas `"danilo"` e `"cristiane"` do `DEFENSORES_CONFIG`; atualizar `getDefensorByUserName` para não incluí-los.
- `src/components/layout/context-control.tsx` — remover seção colapsável "varas_criminais" (morta após remoção em defensores.ts), renomear botão "Ver todos os colegas" → "Visão agregada", renderizar `<PeerSwitcherSection />` após "Visão agregada" quando `sessionUser?.role === "admin"`.
- `src/components/layouts/admin-sidebar.tsx` — remover `<DefensorSwitcher />` da linha 1683, envolver o `<SidebarInset>` / main content com `<ReadOnlyFieldset>`.
- `src/components/layout/defensor-switcher.tsx` — **deletar** após confirmar que nada mais importa.

### Arquivos potencialmente impactados (investigação obrigatória)

- Qualquer arquivo que contenha `"danilo"` ou `"cristiane"` como string literal (a ser varrido em Task 2).

---

## Task 1: Investigação no banco — presença de Danilo e Cristiane

**Files:** nenhum (só SQL)

- [ ] **Step 1: Rodar query de verificação**

```bash
# A partir do diretório do projeto
psql "$DATABASE_URL" -c "SELECT id, name, email, role, approval_status, comarca_id FROM users WHERE name ILIKE '%danilo%' OR name ILIKE '%cristiane%' ORDER BY name;"
```

Resultado esperado: 0, 1 ou 2 linhas. Documentar o resultado num comentário de commit.

- [ ] **Step 2: Decidir o branch do plano com base no resultado**

Três cenários:

| Cenário | Condição | Ação |
|---|---|---|
| **A — Existem aprovados** | 2 linhas, ambos `approval_status='approved'` | Seguir o plano como está. Task 8 (remover do `DEFENSORES_CONFIG`) é segura. |
| **B — Existem mas pendentes** | 2 linhas, algum `approval_status!='approved'` | Antes de Task 8, rodar `UPDATE users SET approval_status='approved' WHERE id IN (...)` manualmente e documentar no commit. Depois seguir. |
| **C — Não existem** | 0 ou 1 linha | **Pausar e consultar Rodrigo.** Duas sub-opções: (c1) criar os usuários via `INSERT` com emails placeholder e `approval_status='approved'`, ou (c2) manter Danilo/Cristiane no `DEFENSORES_CONFIG` e adaptar Task 8 pra não removê-los. A decisão é do Rodrigo. |

- [ ] **Step 3: Registrar o cenário**

Anotar no arquivo `docs/superpowers/plans/2026-04-10-sidebar-peer-switcher-merge-plan.md`, no topo do Task 1, qual cenário (A/B/C) se aplica. Esse marker guia as tasks seguintes.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-04-10-sidebar-peer-switcher-merge-plan.md
git commit -m "chore: registra cenário de presença Danilo/Cristiane no banco [plan Task 1]"
```

---

## Task 2: Sweep de referências hardcoded a "danilo" e "cristiane"

**Files:** nenhum (investigação)

- [ ] **Step 1: Rodar grep exaustivo**

```bash
grep -rn --include="*.ts" --include="*.tsx" -iE '"danilo"|"cristiane"|`danilo`|`cristiane`' /Users/rodrigorochameire/projetos/Defender/src /Users/rodrigorochameire/projetos/Defender/__tests__ > /tmp/danilo-cristiane-refs.txt
cat /tmp/danilo-cristiane-refs.txt
```

Expected: no mínimo as entradas em `src/config/defensores.ts` e `src/lib/trpc/defensor-scope.ts`. Pode haver outras.

- [ ] **Step 2: Classificar cada ocorrência**

Para cada linha em `/tmp/danilo-cristiane-refs.txt`, classificar:

- **REMOVER:** referências no `DEFENSORES_CONFIG` e em `getDefensorByUserName`. Tratadas na Task 8.
- **MANTER:** referências em comentários, fixtures de teste isoladas, ou documentação.
- **MIGRAR:** referências em lógica real que precisa virar lookup dinâmico por `users` table. Cada uma vira uma sub-task documentada aqui neste arquivo, abaixo desta Task.

- [ ] **Step 3: Documentar achados**

Escrever as ocorrências classificadas como MIGRAR no próprio plano, como sub-tasks numeradas (Task 2.a, 2.b, ...). Se houver zero ocorrências MIGRAR, registrar "nenhuma migração necessária".

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-04-10-sidebar-peer-switcher-merge-plan.md
git commit -m "chore: sweep de referências hardcoded Danilo/Cristiane [plan Task 2]"
```

---

## Task 3: Backend — TRPCContext com selectedDefensorScopeId

**Files:**
- Modify: `src/lib/trpc/init.ts`
- Modify: `src/app/api/trpc/[trpc]/route.ts`
- Test: `__tests__/trpc/context.test.ts` (criar se não existir)

- [ ] **Step 1: Escrever o teste de extração do header**

Criar `__tests__/trpc/context.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { createTRPCContext } from "@/lib/trpc/init";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(() => Promise.resolve(null)),
}));

describe("createTRPCContext", () => {
  it("extrai selectedDefensorScopeId do header x-defensor-scope", async () => {
    const req = new Request("http://localhost/api/trpc", {
      headers: { "x-defensor-scope": "42" },
    });
    const ctx = await createTRPCContext({ req });
    expect(ctx.selectedDefensorScopeId).toBe(42);
  });

  it("retorna null quando o header está ausente", async () => {
    const req = new Request("http://localhost/api/trpc");
    const ctx = await createTRPCContext({ req });
    expect(ctx.selectedDefensorScopeId).toBeNull();
  });

  it("retorna null quando o header é inválido (não numérico)", async () => {
    const req = new Request("http://localhost/api/trpc", {
      headers: { "x-defensor-scope": "abc" },
    });
    const ctx = await createTRPCContext({ req });
    expect(ctx.selectedDefensorScopeId).toBeNull();
  });

  it("retorna null quando o header é 'null' (string literal)", async () => {
    const req = new Request("http://localhost/api/trpc", {
      headers: { "x-defensor-scope": "null" },
    });
    const ctx = await createTRPCContext({ req });
    expect(ctx.selectedDefensorScopeId).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `npm test -- __tests__/trpc/context.test.ts`
Expected: FAIL com erro tipo "createTRPCContext is not a function taking { req }" ou similar.

- [ ] **Step 3: Modificar `src/lib/trpc/init.ts`**

Alterar a interface `TRPCContext`:

```ts
export interface TRPCContext {
  user: User | null;
  requestId: string;
  selectedDefensorScopeId: number | null;
}
```

Alterar a função `createTRPCContext`:

```ts
export async function createTRPCContext(
  opts: { req: Request }
): Promise<TRPCContext> {
  const requestId = generateRequestId();

  // Lê o header x-defensor-scope (número do usuário-alvo ou null)
  const rawScope = opts.req.headers.get("x-defensor-scope");
  let selectedDefensorScopeId: number | null = null;
  if (rawScope && rawScope !== "null") {
    const parsed = Number(rawScope);
    if (Number.isInteger(parsed) && parsed > 0) {
      selectedDefensorScopeId = parsed;
    }
  }

  try {
    const user = await getSession();
    return { user, requestId, selectedDefensorScopeId };
  } catch (error) {
    console.error(`[${requestId}] Erro ao criar contexto tRPC:`, error);
    return { user: null, requestId, selectedDefensorScopeId };
  }
}
```

- [ ] **Step 4: Atualizar `src/app/api/trpc/[trpc]/route.ts`**

```ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/trpc/routers";
import { createTRPCContext } from "@/lib/trpc/init";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npm test -- __tests__/trpc/context.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 6: Rodar o typecheck do projeto inteiro**

Run: `npm run typecheck` (ou `tsc --noEmit` se não houver script).
Expected: zero erros. Se algum outro lugar chama `createTRPCContext()` sem argumentos, o typecheck vai pegar — corrigir.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/init.ts src/app/api/trpc/[trpc]/route.ts __tests__/trpc/context.test.ts
git commit -m "feat(trpc): adiciona selectedDefensorScopeId ao context via header x-defensor-scope [plan Task 3]"
```

---

## Task 4: Backend — middleware blockWhenViewingAsPeer

**Files:**
- Create: `src/lib/trpc/middlewares/block-when-viewing-as-peer.ts`
- Modify: `src/lib/trpc/init.ts`
- Test: `__tests__/trpc/middlewares/block-when-viewing-as-peer.test.ts`

- [ ] **Step 1: Criar a estrutura de diretórios**

```bash
mkdir -p /Users/rodrigorochameire/projetos/Defender/src/lib/trpc/middlewares
mkdir -p /Users/rodrigorochameire/projetos/Defender/__tests__/trpc/middlewares
```

- [ ] **Step 2: Escrever o teste do middleware**

Criar `__tests__/trpc/middlewares/block-when-viewing-as-peer.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { blockWhenViewingAsPeerCheck } from "@/lib/trpc/middlewares/block-when-viewing-as-peer";

const fakeUser = { id: 1, role: "admin", name: "Rodrigo" } as any;

describe("blockWhenViewingAsPeerCheck", () => {
  it("permite query mesmo com scope apontando para outro user", () => {
    expect(() =>
      blockWhenViewingAsPeerCheck({
        type: "query",
        user: fakeUser,
        selectedDefensorScopeId: 42,
      })
    ).not.toThrow();
  });

  it("permite mutation quando selectedDefensorScopeId é null", () => {
    expect(() =>
      blockWhenViewingAsPeerCheck({
        type: "mutation",
        user: fakeUser,
        selectedDefensorScopeId: null,
      })
    ).not.toThrow();
  });

  it("permite mutation quando selectedDefensorScopeId é igual ao user.id", () => {
    expect(() =>
      blockWhenViewingAsPeerCheck({
        type: "mutation",
        user: fakeUser,
        selectedDefensorScopeId: 1,
      })
    ).not.toThrow();
  });

  it("bloqueia mutation quando selectedDefensorScopeId aponta para outro user", () => {
    expect(() =>
      blockWhenViewingAsPeerCheck({
        type: "mutation",
        user: fakeUser,
        selectedDefensorScopeId: 42,
      })
    ).toThrow(TRPCError);
  });

  it("mensagem de erro é explicativa", () => {
    try {
      blockWhenViewingAsPeerCheck({
        type: "mutation",
        user: fakeUser,
        selectedDefensorScopeId: 42,
      });
    } catch (e) {
      expect((e as TRPCError).code).toBe("FORBIDDEN");
      expect((e as TRPCError).message).toMatch(/somente-leitura|read.?only/i);
    }
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npm test -- __tests__/trpc/middlewares/block-when-viewing-as-peer.test.ts`
Expected: FAIL com "module not found".

- [ ] **Step 4: Implementar o middleware**

Criar `src/lib/trpc/middlewares/block-when-viewing-as-peer.ts`:

```ts
import { TRPCError } from "@trpc/server";
import type { User } from "@/lib/db/schema";

/**
 * Função pura testável: decide se a chamada deve ser bloqueada.
 * Separada do middleware tRPC para facilitar testes unitários.
 */
export function blockWhenViewingAsPeerCheck(params: {
  type: "query" | "mutation" | "subscription";
  user: User;
  selectedDefensorScopeId: number | null;
}): void {
  // Queries e subscriptions nunca são bloqueadas — só leituras.
  if (params.type !== "mutation") return;

  // Sem scope ou scope apontando para o próprio user → permitido.
  if (
    params.selectedDefensorScopeId === null ||
    params.selectedDefensorScopeId === params.user.id
  ) {
    return;
  }

  // Scope aponta para outro user → modo "ver como peer", bloqueado.
  throw new TRPCError({
    code: "FORBIDDEN",
    message:
      "Modo somente-leitura: você está visualizando como outro defensor. Volte ao seu perfil para editar.",
  });
}
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `npm test -- __tests__/trpc/middlewares/block-when-viewing-as-peer.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 6: Aplicar o middleware a `protectedProcedure` em `init.ts`**

Em `src/lib/trpc/init.ts`, adicionar o middleware tRPC logo depois do `requireAuth`:

```ts
import { blockWhenViewingAsPeerCheck } from "./middlewares/block-when-viewing-as-peer";

// Adicionar após o middleware requireAuth existente
const blockWhenViewingAsPeer = t.middleware(async ({ ctx, next, type }) => {
  const user = (ctx as AuthenticatedContext).user;
  blockWhenViewingAsPeerCheck({
    type,
    user,
    selectedDefensorScopeId: ctx.selectedDefensorScopeId,
  });
  return next();
});
```

E alterar a definição de `protectedProcedure`:

```ts
export const protectedProcedure = publicProcedure
  .use(requireAuth)
  .use(blockWhenViewingAsPeer);
```

- [ ] **Step 7: Rodar o typecheck**

Run: `npm run typecheck`
Expected: zero erros.

- [ ] **Step 8: Rodar a suite completa de testes para pegar regressões**

Run: `npm test`
Expected: todos os testes existentes continuam passando (o novo middleware é transparente para o caminho sem scope, que é o padrão dos testes existentes).

Se algum teste falhar porque um mock de contexto tRPC não tem `selectedDefensorScopeId`, adicionar `selectedDefensorScopeId: null` aos mocks afetados.

- [ ] **Step 9: Commit**

```bash
git add src/lib/trpc/middlewares/block-when-viewing-as-peer.ts src/lib/trpc/init.ts __tests__/trpc/middlewares/
git commit -m "feat(trpc): bloqueia mutations quando em modo ver-como-peer [plan Task 4]"
```

---

## Task 5: Frontend — tRPC client envia header x-defensor-scope

**Files:**
- Modify: `src/app/providers.tsx`

- [ ] **Step 1: Ler o estado atual de `providers.tsx`**

Abrir o arquivo e localizar a definição dos três links (linhas ~70-106). Cada link (`httpLink` e os dois `httpBatchLink`) precisa ganhar um callback `headers`.

- [ ] **Step 2: Adicionar função helper no topo do componente**

No topo de `providers.tsx`, antes de `createClient`, adicionar:

```ts
/**
 * Lê o selectedDefensorId do localStorage para injetar como header.
 * Fora de React porque httpLink.headers() é chamado per-request.
 */
function getDefensorScopeHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const scope = window.localStorage.getItem("defesahub_selected_defensor");
  if (scope && scope !== "null" && scope !== "undefined") {
    return { "x-defensor-scope": scope };
  }
  return {};
}
```

Nota: a chave `"defesahub_selected_defensor"` vem de `src/contexts/defensor-context.tsx:23` (`STORAGE_KEY`). Se essa chave mudar no futuro, este helper também precisa mudar — marcar com um comentário de ligação.

- [ ] **Step 3: Adicionar `headers: getDefensorScopeHeader` aos três links**

Trecho atual (providers.tsx:78-102):

```ts
true: httpLink({
  url,
  transformer: superjson,
  fetch: (input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
}),
```

Novo:

```ts
true: httpLink({
  url,
  transformer: superjson,
  headers: getDefensorScopeHeader,
  fetch: (input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(15_000) }),
}),
```

Aplicar o mesmo `headers: getDefensorScopeHeader` aos dois `httpBatchLink` restantes.

- [ ] **Step 4: Rodar o typecheck**

Run: `npm run typecheck`
Expected: zero erros.

- [ ] **Step 5: Teste manual (ainda sem UI)**

```bash
npm run dev
```

Em outro terminal:
```bash
# Simular um request de query
curl -s http://localhost:3000/api/trpc/users.me -H "x-defensor-scope: 99" | head
```

O comportamento não deve ter mudado ainda (queries passam), mas a infraestrutura está pronta. Rodrigo pode verificar nos DevTools → Network que requests subsequentes carregam o header quando ele setar algo no `localStorage` via console: `localStorage.setItem("defesahub_selected_defensor", "42")`.

- [ ] **Step 6: Commit**

```bash
git add src/app/providers.tsx
git commit -m "feat(trpc-client): envia header x-defensor-scope automaticamente [plan Task 5]"
```

---

## Task 6: Hook `useIsViewingAsPeer`

**Files:**
- Create: `src/hooks/use-is-viewing-as-peer.ts`
- Test: `__tests__/hooks/use-is-viewing-as-peer.test.tsx`

- [ ] **Step 1: Escrever o teste**

Criar `__tests__/hooks/use-is-viewing-as-peer.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsViewingAsPeer } from "@/hooks/use-is-viewing-as-peer";

vi.mock("@/contexts/defensor-context", () => ({
  useDefensor: vi.fn(),
}));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(),
}));

import { useDefensor } from "@/contexts/defensor-context";
import { usePermissions } from "@/hooks/use-permissions";

describe("useIsViewingAsPeer", () => {
  it("retorna false quando selectedDefensorId é null", () => {
    (useDefensor as any).mockReturnValue({ selectedDefensorId: null });
    (usePermissions as any).mockReturnValue({ user: { id: 1 } });
    const { result } = renderHook(() => useIsViewingAsPeer());
    expect(result.current).toBe(false);
  });

  it("retorna false quando selectedDefensorId é igual ao user.id", () => {
    (useDefensor as any).mockReturnValue({ selectedDefensorId: 1 });
    (usePermissions as any).mockReturnValue({ user: { id: 1 } });
    const { result } = renderHook(() => useIsViewingAsPeer());
    expect(result.current).toBe(false);
  });

  it("retorna true quando selectedDefensorId aponta para outro usuário", () => {
    (useDefensor as any).mockReturnValue({ selectedDefensorId: 42 });
    (usePermissions as any).mockReturnValue({ user: { id: 1 } });
    const { result } = renderHook(() => useIsViewingAsPeer());
    expect(result.current).toBe(true);
  });

  it("retorna false quando user é null (não logado)", () => {
    (useDefensor as any).mockReturnValue({ selectedDefensorId: 42 });
    (usePermissions as any).mockReturnValue({ user: null });
    const { result } = renderHook(() => useIsViewingAsPeer());
    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- __tests__/hooks/use-is-viewing-as-peer.test.tsx`
Expected: FAIL com "module not found".

- [ ] **Step 3: Implementar o hook**

Criar `src/hooks/use-is-viewing-as-peer.ts`:

```ts
"use client";

import { useDefensor } from "@/contexts/defensor-context";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * Retorna true quando o usuário logado está visualizando os dados
 * de outro defensor (modo read-only).
 */
export function useIsViewingAsPeer(): boolean {
  const { selectedDefensorId } = useDefensor();
  const { user } = usePermissions();

  if (!user) return false;
  if (selectedDefensorId === null) return false;
  return selectedDefensorId !== user.id;
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- __tests__/hooks/use-is-viewing-as-peer.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-is-viewing-as-peer.ts __tests__/hooks/use-is-viewing-as-peer.test.tsx
git commit -m "feat(hooks): adiciona useIsViewingAsPeer [plan Task 6]"
```

---

## Task 7: Backend — workspaceDefensores retorna comarcaId

**Files:**
- Modify: `src/lib/trpc/routers/users.ts:182-196`

- [ ] **Step 1: Ler o estado atual da procedure**

Conteúdo atual (`src/lib/trpc/routers/users.ts:182-196`):

```ts
workspaceDefensores: protectedProcedure.query(async ({ ctx }) => {
  const { workspaceId } = getWorkspaceScope(ctx.user);
  const conditions: (SQL<unknown> | undefined)[] = [
    or(eq(users.role, "defensor"), eq(users.role, "admin")),
    eq(users.approvalStatus, "approved"),
  ];
  if (workspaceId) {
    conditions.push(eq(users.workspaceId, workspaceId));
  }
  return db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(...conditions))
    .orderBy(users.name);
}),
```

- [ ] **Step 2: Adicionar `comarcaId` ao `select`**

```ts
workspaceDefensores: protectedProcedure.query(async ({ ctx }) => {
  const { workspaceId } = getWorkspaceScope(ctx.user);
  const conditions: (SQL<unknown> | undefined)[] = [
    or(eq(users.role, "defensor"), eq(users.role, "admin")),
    eq(users.approvalStatus, "approved"),
  ];
  if (workspaceId) {
    conditions.push(eq(users.workspaceId, workspaceId));
  }
  return db
    .select({
      id: users.id,
      name: users.name,
      comarcaId: users.comarcaId,
    })
    .from(users)
    .where(and(...conditions))
    .orderBy(users.name);
}),
```

- [ ] **Step 3: Rodar typecheck e verificar callers**

Run: `npm run typecheck`
Expected: erros em qualquer caller que dependa do shape antigo `{id, name}` sem `comarcaId`. Para cada erro, aceitar o novo campo opcional no caller — nenhum caller deveria falhar porque `comarcaId` é só adicionado.

Se houver caller estrito, ajustar.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/users.ts
git commit -m "feat(trpc): workspaceDefensores retorna comarcaId [plan Task 7]"
```

---

## Task 8: SKIPPED — DEFENSORES_CONFIG intencionalmente preservado

**Status:** SKIPPED em 2026-04-10 após investigação em Task 2 (sweep).

**Motivo:** A Task 2 descobriu que `DEFENSORES_CONFIG` e `PROFISSIONAIS_CONFIG` são consumidos pelo fluxo de login dos próprios Danilo e Cristiane via `src/hooks/useDefensorConfig.ts:64-86`. Remover as entradas quebraria o próprio login deles (UI sem atribuições, sem categorias, sem módulos).

O brainstorming tinha dois fluxos conflundidos:
- **(A)** Rodrigo clicando em "Danilo" pra virar ele — confirmado que não usa, pode sair.
- **(B)** Danilo mesmo logando — precisa continuar funcionando.

O plano original só tratou (A). A revisão aprovada pelo Rodrigo em 2026-04-10 é: **não tocar nas configs estáticas**. A remoção visual do "Danilo/Cristiane como botões no PERFIL ATIVO" acontece via Task 9 (apagar o colapsável "varas_criminais"). A aparição deles na nova seção "Outros defensores" acontece via Task 11 (eles já estão em `workspaceDefensores` com `comarca_id=1`, confirmado em Task 1).

**Nenhuma ação nesta task.** Pular para Task 9.

---

## Task 9: ContextControl — remover seção "varas_criminais" do PERFIL ATIVO

**Files:**
- Modify: `src/components/layout/context-control.tsx`

- [ ] **Step 1: Localizar o bloco `varasCriminaisDefensores`**

Em `src/components/layout/context-control.tsx:513-552`, há um `<Collapsible>` que renderiza defensores do grupo "varas_criminais". Ele continuaria funcional (Danilo/Cristiane permanecem em `profissionaisConfigs`), mas é UX duplicada com a nova seção "Outros defensores" da Task 11. Remover pra eliminar a confusão.

- [ ] **Step 2: Remover o bloco por completo**

Apagar:

```tsx
{/* Varas Criminais - Seção colapsável para admin */}
{varasCriminaisDefensores.length > 0 && (
  <Collapsible className="mt-2">
    ...
  </Collapsible>
)}
```

Também remover a constante local `const varasCriminaisDefensores = defensoresDisplay.filter(d => d.grupo === "varas_criminais");` na linha 439.

Se os imports `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `Settings2` ficarem não-usados, remover também. Confirmar com `grep`:

```bash
grep -n "Collapsible\|Settings2" /Users/rodrigorochameire/projetos/Defender/src/components/layout/context-control.tsx
```

- [ ] **Step 3: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: zero erros, zero warnings de import não-usado.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/context-control.tsx
git commit -m "refactor(context-control): remove seção varas_criminais morta [plan Task 9]"
```

---

## Task 10: ContextControl — rename "Ver todos os colegas" → "Visão agregada"

**Files:**
- Modify: `src/components/layout/context-control.tsx`

- [ ] **Step 1: Localizar o botão "Ver todos os colegas"**

Em `src/components/layout/context-control.tsx:504` há o texto:

```tsx
<span className={...}>
  Ver todos os colegas
</span>
```

- [ ] **Step 2: Trocar o texto**

```tsx
<span className={...}>
  Visão agregada
</span>
```

- [ ] **Step 3: Atualizar o label interno se houver**

Procurar por `"Visao Geral"` em `src/components/layout/context-control.tsx` — a linha 202 tem `nome: "Visao Geral"`. Deixar como está (é o nome interno do id=GERAL, não é exibido). Confirmar visualmente: esse nome só aparece se houver algum fallback de exibição não-rotulado.

- [ ] **Step 4: Teste manual**

Run: `npm run dev`
Abrir sidebar, abrir popover "PERFIL ATIVO". Confirmar que o botão exibe "Visão agregada" e clicar ainda funciona (troca para id=GERAL).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/context-control.tsx
git commit -m "ui(context-control): rename Ver todos os colegas para Visão agregada [plan Task 10]"
```

---

## Task 11: Componente `<PeerSwitcherSection />`

**Files:**
- Create: `src/components/layout/peer-switcher-section.tsx`
- Test: `__tests__/components/layout/peer-switcher-section.test.tsx`

- [ ] **Step 1: Escrever teste de renderização condicional**

Criar `__tests__/components/layout/peer-switcher-section.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeerSwitcherSection } from "@/components/layout/peer-switcher-section";

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    users: {
      workspaceDefensores: {
        useQuery: vi.fn(() => ({
          data: [
            { id: 1, name: "Rodrigo Rocha Meire", comarcaId: 1 },
            { id: 2, name: "Juliane", comarcaId: 1 },
            { id: 3, name: "Danilo", comarcaId: 1 },
            { id: 4, name: "Paula Juca", comarcaId: 2 },
          ],
          isLoading: false,
        })),
      },
    },
  },
}));

vi.mock("@/contexts/defensor-context", () => ({
  useDefensor: vi.fn(() => ({
    selectedDefensorId: null,
    setSelectedDefensorId: vi.fn(),
  })),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: vi.fn(() => ({ user: { id: 1, role: "admin", comarcaId: 1 } })),
}));

vi.mock("@/hooks/use-is-viewing-as-peer", () => ({
  useIsViewingAsPeer: vi.fn(() => false),
}));

describe("PeerSwitcherSection", () => {
  it("renderiza o trigger colapsado com label 'Outros defensores'", () => {
    render(<PeerSwitcherSection />);
    expect(screen.getByText("Outros defensores")).toBeInTheDocument();
  });

  it("não exibe peers antes de clicar no trigger", () => {
    render(<PeerSwitcherSection />);
    expect(screen.queryByText("Danilo")).not.toBeInTheDocument();
  });

  it("exclui o próprio usuário da lista de peers", () => {
    render(<PeerSwitcherSection defaultOpen />);
    expect(screen.queryByText("Rodrigo Rocha Meire")).not.toBeInTheDocument();
  });

  it("exibe peers de outros depois que está aberta", () => {
    render(<PeerSwitcherSection defaultOpen />);
    expect(screen.getByText("Juliane")).toBeInTheDocument();
    expect(screen.getByText("Danilo")).toBeInTheDocument();
    expect(screen.getByText("Paula Juca")).toBeInTheDocument();
  });

  it("agrupa por comarca quando comarcaId está disponível", () => {
    render(<PeerSwitcherSection defaultOpen />);
    // Subheaders visíveis quando há peers de mais de uma comarca
    expect(screen.getByText(/camaçari/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- __tests__/components/layout/peer-switcher-section.test.tsx`
Expected: FAIL com "module not found".

- [ ] **Step 3: Implementar o componente**

Criar `src/components/layout/peer-switcher-section.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { ChevronRight, Users, ArrowLeft } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc/client";
import { useDefensor } from "@/contexts/defensor-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useIsViewingAsPeer } from "@/hooks/use-is-viewing-as-peer";

interface PeerSwitcherSectionProps {
  defaultOpen?: boolean;
}

type Peer = {
  id: number;
  name: string;
  comarcaId: number | null;
};

export function PeerSwitcherSection({ defaultOpen = false }: PeerSwitcherSectionProps) {
  const { user } = usePermissions();
  const { selectedDefensorId, setSelectedDefensorId, setDefensores } = useDefensor();
  const isViewingAsPeer = useIsViewingAsPeer();

  const { data, isLoading } = trpc.users.workspaceDefensores.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Popular o DefensorContext com a lista para que selectedDefensor (nome) funcione
  // em outros lugares do app que leem useDefensor().selectedDefensor.
  if (data) {
    setDefensores(data.map((d) => ({ id: d.id, name: d.name })));
  }

  const { localPeers, otherPeers, hasMultipleComarcas } = useMemo(() => {
    if (!data || !user) {
      return { localPeers: [] as Peer[], otherPeers: [] as Peer[], hasMultipleComarcas: false };
    }
    const myComarca = (user as any).comarcaId ?? null;
    const filtered = data.filter((d) => d.id !== user.id);
    const local = filtered.filter((d) => d.comarcaId === myComarca);
    const other = filtered.filter((d) => d.comarcaId !== myComarca);
    return {
      localPeers: local,
      otherPeers: other,
      hasMultipleComarcas: local.length > 0 && other.length > 0,
    };
  }, [data, user]);

  if (user?.role !== "admin") return null;
  if (isLoading) return null;
  if (!data || data.length <= 1) return null;

  return (
    <div className="px-3 pb-2">
      <Collapsible defaultOpen={defaultOpen}>
        <CollapsibleTrigger className="w-full pt-2 border-t border-border flex items-center justify-between group">
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            Outros defensores
          </p>
          <ChevronRight className="w-3 h-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {hasMultipleComarcas && localPeers.length > 0 && (
            <PeerGroup label="Camaçari" peers={localPeers} selectedId={selectedDefensorId} onSelect={setSelectedDefensorId} />
          )}
          {hasMultipleComarcas && otherPeers.length > 0 && (
            <PeerGroup label="RMS" peers={otherPeers} selectedId={selectedDefensorId} onSelect={setSelectedDefensorId} />
          )}
          {!hasMultipleComarcas && (
            <PeerGroup label="Colegas" peers={[...localPeers, ...otherPeers]} selectedId={selectedDefensorId} onSelect={setSelectedDefensorId} />
          )}
          {isViewingAsPeer && (
            <button
              onClick={() => setSelectedDefensorId(null)}
              className="w-full py-2 px-3 mt-2 rounded-md bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center gap-2 text-[11px] font-medium text-amber-900 dark:text-amber-200 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar ao meu perfil
            </button>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function PeerGroup({
  label,
  peers,
  selectedId,
  onSelect,
}: {
  label: string;
  peers: Peer[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div>
      <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider px-1 pb-1">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-1">
        {peers.map((peer) => {
          const isActive = selectedId === peer.id;
          return (
            <button
              key={peer.id}
              onClick={() => onSelect(peer.id)}
              className={cn(
                "py-1.5 px-1 rounded-md transition-all duration-150 text-center",
                isActive
                  ? "bg-neutral-100 dark:bg-neutral-800 ring-1 ring-neutral-300 dark:ring-neutral-600"
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              )}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] mx-auto mb-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                {getInitials(peer.name).charAt(0)}
              </div>
              <p className="text-[9px] font-medium text-muted-foreground truncate">
                {peer.name.split(" ").slice(0, 2).join(" ")}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**Nota sobre o side-effect `setDefensores`:** o componente chama `setDefensores` no render quando `data` existe. Isso substitui a responsabilidade que o `DefensorSwitcher` tinha (populava o contexto). Como a função é `useCallback` estável no provider, isso não causa loop — mas se o typecheck ou testes reclamarem, mover para um `useEffect`.

- [ ] **Step 4: Rodar os testes do componente**

Run: `npm test -- __tests__/components/layout/peer-switcher-section.test.tsx`
Expected: 5 tests PASS. Se algum falhar, ajustar assertivas — o importante é o comportamento correto, não as assertivas específicas.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/peer-switcher-section.tsx __tests__/components/layout/peer-switcher-section.test.tsx
git commit -m "feat(layout): adiciona PeerSwitcherSection admin-only [plan Task 11]"
```

---

## Task 12: ContextControl renderiza `<PeerSwitcherSection />`

**Files:**
- Modify: `src/components/layout/context-control.tsx`

- [ ] **Step 1: Importar o componente**

No topo de `src/components/layout/context-control.tsx`, adicionar:

```ts
import { PeerSwitcherSection } from "@/components/layout/peer-switcher-section";
```

- [ ] **Step 2: Renderizar a seção logo após o botão "Visão agregada"**

Localizar o fim do bloco que renderiza o botão "Visão agregada" (próximo à linha 510 após Task 10). Imediatamente após esse bloco, antes do fechamento da `div` pai (`</div>` que fecha a seção "Defensores Principais"), inserir:

```tsx
<PeerSwitcherSection />
```

O componente faz seu próprio gate de `role === "admin"` internamente, então não precisa de wrapper condicional aqui.

- [ ] **Step 3: Teste manual — admin**

Run: `npm run dev`
Logar como Rodrigo (admin). Abrir popover PERFIL ATIVO. Confirmar:
- A seção "Outros defensores" aparece colapsada abaixo de "Visão agregada".
- Clicar no chevron expande.
- Peers aparecem (Danilo, Cristiane, Juliane, + RMS se houver).
- Clicar em Danilo fecha o popover e marca Danilo como selecionado.
- Reabrir popover: botão "Voltar ao meu perfil" aparece.
- Clicar "Voltar" desfaz a seleção.

- [ ] **Step 4: Teste manual — não-admin**

Logar como Juliane (ou qualquer defensor não-admin). Abrir popover PERFIL ATIVO. Confirmar:
- A seção "Outros defensores" NÃO aparece.
- O popover está idêntico ao que era antes da feature.

Se não houver usuário não-admin de teste disponível, simular via DevTools do React mudando `user.role` em `usePermissions` mock.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/context-control.tsx
git commit -m "feat(context-control): integra PeerSwitcherSection no popover [plan Task 12]"
```

---

## Task 13: Remover `<DefensorSwitcher />` da sidebar

**Files:**
- Modify: `src/components/layouts/admin-sidebar.tsx`

- [ ] **Step 1: Confirmar que nada mais usa o componente**

```bash
grep -rn "DefensorSwitcher" /Users/rodrigorochameire/projetos/Defender/src /Users/rodrigorochameire/projetos/Defender/__tests__
```

Expected: apenas o arquivo de definição (`src/components/layout/defensor-switcher.tsx`) e o uso em `admin-sidebar.tsx`.

Se houver outros usos, cada um vira uma sub-task aqui (documentar no plano antes de seguir).

- [ ] **Step 2: Remover o import e o uso**

Em `src/components/layouts/admin-sidebar.tsx`:

- Linha 35: remover `import { DefensorSwitcher } from "@/components/layout/defensor-switcher";`
- Linha 1683: remover `<DefensorSwitcher collapsed={isCollapsed} />`

- [ ] **Step 3: Rodar typecheck e lint**

Run: `npm run typecheck && npm run lint`
Expected: zero erros.

- [ ] **Step 4: Teste manual**

Run: `npm run dev`
Abrir o app. Confirmar que a sidebar não mostra o antigo botão do olho abaixo do ContextControl. Só o ContextControl no topo.

- [ ] **Step 5: Commit**

```bash
git add src/components/layouts/admin-sidebar.tsx
git commit -m "refactor(sidebar): remove DefensorSwitcher duplicado [plan Task 13]"
```

---

## Task 14: Deletar arquivo `defensor-switcher.tsx`

**Files:**
- Delete: `src/components/layout/defensor-switcher.tsx`

- [ ] **Step 1: Confirmar uma última vez que ninguém importa o arquivo**

```bash
grep -rn "defensor-switcher" /Users/rodrigorochameire/projetos/Defender/src /Users/rodrigorochameire/projetos/Defender/__tests__
```

Expected: zero resultados.

- [ ] **Step 2: Deletar o arquivo**

```bash
rm /Users/rodrigorochameire/projetos/Defender/src/components/layout/defensor-switcher.tsx
```

- [ ] **Step 3: Rodar typecheck e build**

Run: `npm run typecheck && npm run build`
Expected: build passa.

- [ ] **Step 4: Commit**

```bash
git add -A src/components/layout/
git commit -m "chore: deleta defensor-switcher.tsx (código morto) [plan Task 14]"
```

---

## Task 15: Componente `<ReadOnlyFieldset />`

**Files:**
- Create: `src/components/layout/read-only-fieldset.tsx`

- [ ] **Step 1: Criar o componente**

Criar `src/components/layout/read-only-fieldset.tsx`:

```tsx
"use client";

import { ReactNode } from "react";
import { useIsViewingAsPeer } from "@/hooks/use-is-viewing-as-peer";

/**
 * Envolve o conteúdo da aplicação em um <fieldset disabled> quando
 * o usuário está visualizando como outro defensor. Isso desabilita
 * de forma nativa todos os <button>, <input>, <select>, <textarea>
 * descendentes — sem precisar enumerar cada componente.
 *
 * Limitações conhecidas:
 * - Elementos não-form (div com onClick) NÃO são desabilitados por esta técnica.
 *   A prevenção real está no middleware tRPC do backend.
 * - O estilo default de fieldset é removido via `border-0 p-0 m-0`.
 */
export function ReadOnlyFieldset({ children }: { children: ReactNode }) {
  const isViewingAsPeer = useIsViewingAsPeer();

  return (
    <fieldset
      disabled={isViewingAsPeer}
      className="border-0 p-0 m-0 min-w-0 contents"
      data-read-only={isViewingAsPeer || undefined}
    >
      {children}
    </fieldset>
  );
}
```

- [ ] **Step 2: Envolver o conteúdo do admin-sidebar.tsx**

Em `src/components/layouts/admin-sidebar.tsx`, localizar o `<SidebarInset>` ou o elemento `<main>` que contém o conteúdo da página. Importar o componente:

```ts
import { ReadOnlyFieldset } from "@/components/layout/read-only-fieldset";
```

E envolver o conteúdo:

```tsx
<SidebarInset>
  <ReadOnlyFieldset>
    {/* conteúdo atual */}
  </ReadOnlyFieldset>
</SidebarInset>
```

Verificar se o layout visual continua intacto — o `contents` className faz o fieldset não participar do layout flex/grid.

- [ ] **Step 3: Teste manual**

Run: `npm run dev`
Logar como Rodrigo (admin). Selecionar Danilo (ou outro peer) via a seção "Outros defensores". Confirmar:
- Todos os botões de "Salvar", "Editar", "Arquivar", "Criar novo" em qualquer página ficam visualmente acinzentados e não-clicáveis.
- O cursor em cima deles é `not-allowed`.
- Campos de texto (input, textarea) também ficam desabilitados.

Clicar "Voltar ao meu perfil" na seção. Confirmar que tudo volta ao normal.

- [ ] **Step 4: Teste do backend — tentar mutation via DevTools**

Com Danilo ainda selecionado, abrir DevTools → Console e disparar:

```js
// Pegar o trpc client do window (se exposto) ou simular via fetch
fetch("/api/trpc/assistidos.create?batch=1", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-defensor-scope": "3", // id do Danilo
  },
  body: JSON.stringify({ "0": { json: { nome: "Teste" } } }),
}).then(r => r.json()).then(console.log);
```

Expected: resposta com `{ error: { code: "FORBIDDEN", message: "Modo somente-leitura..." } }`.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/read-only-fieldset.tsx src/components/layouts/admin-sidebar.tsx
git commit -m "feat(layout): fieldset disabled global para modo ver-como-peer [plan Task 15]"
```

---

## Task 16: Limpeza do localStorage ao trocar de profissional ativo

**Files:**
- Modify: `src/components/layout/context-control.tsx`

**Motivação:** quando o admin clica em si mesmo (Rodrigo) ou em Juliane no PERFIL ATIVO, o `selectedDefensorId` no `DefensorContext` deve ser resetado para `null`, senão o usuário pode ficar num estado híbrido (profissional ativo é Rodrigo mas peer selecionado ainda é Danilo). Na prática, trocar de "chapéu interno" deve cancelar o "ver como peer".

- [ ] **Step 1: Localizar o `updateDefensor` em `context-control.tsx`**

Linha ~260:

```ts
const updateDefensor = (value: Defensor) => {
  setDefensor(value);
  localStorage.setItem(STORAGE_KEYS.defensor, value);
};
```

- [ ] **Step 2: Resetar o peer scope ao trocar de profissional**

Importar `useDefensor`:

```ts
import { useDefensor } from "@/contexts/defensor-context";
```

E dentro do componente raiz (`ContextControl`), pegar o setter:

```ts
const { setSelectedDefensorId } = useDefensor();
```

Alterar `updateDefensor`:

```ts
const updateDefensor = (value: Defensor) => {
  setDefensor(value);
  localStorage.setItem(STORAGE_KEYS.defensor, value);
  // Sair do modo peer automaticamente ao trocar de profissional interno.
  setSelectedDefensorId(null);
};
```

- [ ] **Step 3: Teste manual**

Run: `npm run dev`
1. Logar como Rodrigo, selecionar Danilo via "Outros defensores" → modo peer ativo.
2. Abrir popover e clicar em Juliane no PERFIL ATIVO.
3. Confirmar: o `selectedDefensorId` volta para `null`, o modo peer sai, botões reabilitam.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/context-control.tsx
git commit -m "fix(context-control): reseta peer scope ao trocar de profissional [plan Task 16]"
```

---

## Task 17: Verificação end-to-end e smoke test

**Files:** nenhum

- [ ] **Step 1: Rodar a suite completa**

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: todos passam.

- [ ] **Step 2: Smoke test no browser**

Run: `npm run dev`

Percorrer os critérios de aceitação do spec:

1. [ ] Sidebar só mostra `<ContextControl />` — nenhum olho duplicado.
2. [ ] Logar como usuário não-admin: popover NÃO mostra "Outros defensores".
3. [ ] Logar como admin (Rodrigo): popover mostra "Outros defensores" colapsada.
4. [ ] Expandir: Danilo, Cristiane, Juliane, + peers RMS.
5. [ ] Clicar em Danilo: avatar muda no ContextControl, botões de ação ficam desabilitados.
6. [ ] Tentar criar um assistido: não abre, ou abre mas botão "Salvar" está desabilitado.
7. [ ] Chamar mutation direto via DevTools: retorna FORBIDDEN.
8. [ ] Clicar "Voltar ao meu perfil": tudo volta ao normal.
9. [ ] Trocar de Rodrigo → Juliane no PERFIL ATIVO: peer scope zera.
10. [ ] `grep -rn '"danilo"\|"cristiane"' src/` retorna apenas referências em comentários ou testes intencionais.

- [ ] **Step 3: Commit final (se houver ajustes)**

Se algum ajuste foi necessário durante o smoke test, commit:

```bash
git add -A
git commit -m "chore: ajustes finais pós-smoke test [plan Task 17]"
```

Se não houve ajustes, pular este step.

---

## Follow-ups (fora do escopo deste plano)

- **Botão-por-botão de read-only:** o `<fieldset disabled>` é um rede de segurança grosseira. Quando aparecer o primeiro caso de elemento não-form (div clicável, menu customizado) que precisa ficar desabilitado, implementar um hook `useReadOnlyHandler` e aplicar onde necessário.
- **Dashboard de adoção:** o caso de uso real do Rodrigo ("acompanhar a minha aplicação") pede mais do que "ver como". Uma página `/admin/adocao` com métricas (último login, qtd. de assistidos criados por user, features usadas) é o próximo passo natural.
- **Generalização para coordenador não-admin:** quando aparecer um Defensor Público-Chefe que não é admin técnico mas precisa ver peers, adicionar a flag `canViewPeers` em `users` e trocar o gate.

---

## Self-Review

Antes de transicionar para execução, confirmei:

- **Cobertura do spec:** todas as 7 decisões aprovadas no brainstorming viraram task (gate admin = Task 11 render condition; read-only forçado = Task 4 backend + Task 15 frontend; seção colapsável = Task 11 + 12; remoção Danilo/Cristiane = Task 8; agrupamento Camaçari/RMS = Task 11; rename Visão agregada = Task 10; riscos = Tasks 1 e 2).
- **Placeholders:** zero "TBD" ou "implement later" — cada passo tem código ou comando concreto.
- **Consistência de tipos:** `selectedDefensorScopeId: number | null` aparece igual em Task 3 (context), Task 4 (middleware), Task 5 (header helper).
- **Consistência de nomes:** `blockWhenViewingAsPeer` (middleware) e `useIsViewingAsPeer` (hook) são nomes estáveis ao longo de todas as tasks.
- **Ordem das dependências:** Task 1 (investigação banco) vem antes de Task 8 (remoção). Task 3 (context) vem antes de Task 4 (middleware). Task 6 (hook) vem antes de Task 11 (componente que usa). Task 11 vem antes de Task 12 (integração). Task 13 vem antes de Task 14 (deleção do arquivo). Task 15 (fieldset) depende de Task 6 (hook).
