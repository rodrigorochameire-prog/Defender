# Anexos em Registros — Fase 2 (espelho no Drive) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps usam checkbox.

**Goal:** Espelhar cada anexo de registro na pasta do assistido no Google Drive (subpasta `Registros/`), de forma assíncrona e best-effort, sem bloquear o upload no app.

**Architecture:** Após gravar o anexo (rota de upload), dispara `mirrorAnexoToDrive(anexoId)` em fire-and-forget. O util resolve a pasta do assistido (campo `driveFolderId`, com fallback para `createOrFindAssistidoFolder`), cria/encontra a subpasta `Registros/`, baixa os bytes do Supabase Storage e envia via `uploadFileBuffer`, atualizando `driveFileId` + `driveStatus` (`synced`/`error`). A UI mostra o status e permite re-tentar.

**Tech Stack:** Next.js, drizzle, Supabase Storage, Google Drive service (`@/lib/services/google-drive`), tRPC, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-07-registro-anexos-design.md` (seção 3).

**Pré-condição:** Fase 1 já em `main` (tabela `registro_anexos` com colunas `drive_file_id`/`drive_status` existentes; rota `/api/registros/anexos`; `registros.anexos.list/remove`).

## Building blocks existentes (confirmados)
- `uploadFileBuffer(buffer: Buffer, fileName: string, mimeType: string, folderId: string, description?: string): Promise<...>` — retorna info do arquivo (tem `id`).
- `criarOuEncontrarPasta(nome: string, parentFolderId: string): Promise<DriveFolder | null>` — `DriveFolder` tem `.id`.
- `createOrFindAssistidoFolder(atribuicao: "JURI"|"VVD"|"EP"|"SUBSTITUICAO"|"GRUPO_JURI", nome: string): Promise<DriveFolder | null>`.
- `assistidos` tem `driveFolderId: text` e `atribuicaoPrimaria` (enum: JURI, VIOLENCIA_DOMESTICA, EXECUCAO_PENAL, SUBSTITUICAO, CRIMINAL, FAMILIA, CIVEL, ...).
- Storage download: `getSupabaseAdmin().storage.from("documents").download(path)` → `{ data: Blob | null }`.

## File Structure
- Create `src/lib/registros/atribuicao-folder-key.ts` — mapeia `atribuicaoPrimaria` → chave de pasta (ou null). Puro.
- Create `src/lib/registros/__tests__/atribuicao-folder-key.test.ts`.
- Create `src/lib/registros/mirror-anexo-to-drive.ts` — util servidor (best-effort).
- Modify `src/app/api/registros/anexos/route.ts` — dispara o mirror após inserir.
- Modify `src/lib/trpc/routers/registros.ts` — `anexos.retryMirror`.
- Modify `src/components/registros/anexos/anexo-list.tsx` — badge de status + re-tentar.

---

### Task 1: Mapa de atribuição → chave de pasta (TDD)

**Files:** Create `src/lib/registros/atribuicao-folder-key.ts` + test `src/lib/registros/__tests__/atribuicao-folder-key.test.ts`.

- [ ] **Step 1: Teste que falha**

```ts
import { describe, it, expect } from "vitest";
import { atribuicaoToFolderKey } from "../atribuicao-folder-key";

describe("atribuicaoToFolderKey", () => {
  it("mapeia as 4 atribuições com pasta", () => {
    expect(atribuicaoToFolderKey("JURI")).toBe("JURI");
    expect(atribuicaoToFolderKey("VIOLENCIA_DOMESTICA")).toBe("VVD");
    expect(atribuicaoToFolderKey("EXECUCAO_PENAL")).toBe("EP");
    expect(atribuicaoToFolderKey("SUBSTITUICAO")).toBe("SUBSTITUICAO");
  });
  it("retorna null para atribuições sem pasta dedicada", () => {
    expect(atribuicaoToFolderKey("CRIMINAL")).toBeNull();
    expect(atribuicaoToFolderKey("FAMILIA")).toBeNull();
    expect(atribuicaoToFolderKey(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/lib/registros/__tests__/atribuicao-folder-key.test.ts` → FAIL.

- [ ] **Step 3: Implementar**

```ts
// src/lib/registros/atribuicao-folder-key.ts
export type FolderKey = "JURI" | "VVD" | "EP" | "SUBSTITUICAO" | "GRUPO_JURI";

const MAP: Record<string, FolderKey> = {
  JURI: "JURI",
  VIOLENCIA_DOMESTICA: "VVD",
  EXECUCAO_PENAL: "EP",
  SUBSTITUICAO: "SUBSTITUICAO",
};

/** Atribuição primária do assistido → chave de pasta do Drive (ou null se não há pasta dedicada). */
export function atribuicaoToFolderKey(atribuicao: string | null | undefined): FolderKey | null {
  if (!atribuicao) return null;
  return MAP[atribuicao] ?? null;
}
```

- [ ] **Step 4: Rodar e ver passar** — mesmo comando → PASS.
- [ ] **Step 5: Commit** — `git add src/lib/registros/atribuicao-folder-key.ts src/lib/registros/__tests__/atribuicao-folder-key.test.ts && git commit -m "feat(registros): mapa atribuição→pasta do Drive"`

---

### Task 2: Util `mirrorAnexoToDrive`

**Files:** Create `src/lib/registros/mirror-anexo-to-drive.ts`.

- [ ] **Step 1: Implementar**

```ts
// src/lib/registros/mirror-anexo-to-drive.ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { registroAnexos, registros } from "@/lib/db/schema/agenda";
import { assistidos } from "@/lib/db/schema/core";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { atribuicaoToFolderKey } from "./atribuicao-folder-key";
import {
  uploadFileBuffer,
  criarOuEncontrarPasta,
  createOrFindAssistidoFolder,
} from "@/lib/services/google-drive";

/**
 * Espelha um anexo na pasta do assistido no Drive (subpasta "Registros").
 * Best-effort: nunca lança; atualiza drive_status para 'synced' ou 'error'.
 */
export async function mirrorAnexoToDrive(anexoId: number): Promise<void> {
  try {
    const anexo = await db.query.registroAnexos.findFirst({ where: eq(registroAnexos.id, anexoId) });
    if (!anexo) return;

    const registro = await db.query.registros.findFirst({ where: eq(registros.id, anexo.registroId) });
    if (!registro?.assistidoId) throw new Error("registro sem assistido");

    const assistido = await db.query.assistidos.findFirst({ where: eq(assistidos.id, registro.assistidoId) });
    if (!assistido) throw new Error("assistido não encontrado");

    // 1. Resolver a pasta do assistido.
    let assistidoFolderId = assistido.driveFolderId ?? null;
    if (!assistidoFolderId) {
      const key = atribuicaoToFolderKey(assistido.atribuicaoPrimaria);
      if (!key) throw new Error(`sem pasta e atribuição sem mapa: ${assistido.atribuicaoPrimaria}`);
      const folder = await createOrFindAssistidoFolder(key, assistido.nome);
      if (!folder?.id) throw new Error("createOrFindAssistidoFolder retornou null");
      assistidoFolderId = folder.id;
    }

    // 2. Subpasta "Registros".
    const registrosFolder = await criarOuEncontrarPasta("Registros", assistidoFolderId);
    if (!registrosFolder?.id) throw new Error("não foi possível criar/achar subpasta Registros");

    // 3. Baixar os bytes do Storage.
    const supabase = getSupabaseAdmin();
    const { data: blob } = await supabase.storage.from("documents").download(anexo.storagePath);
    if (!blob) throw new Error("falha ao baixar do Storage");
    const buffer = Buffer.from(await blob.arrayBuffer());

    // 4. Enviar ao Drive.
    const uploaded = await uploadFileBuffer(
      buffer,
      anexo.nomeOriginal,
      anexo.mimeType,
      registrosFolder.id,
      `Anexo do registro #${anexo.registroId}`,
    );
    const driveFileId = (uploaded as { id?: string } | null)?.id ?? null;

    await db.update(registroAnexos)
      .set({ driveFileId, driveStatus: driveFileId ? "synced" : "error" })
      .where(eq(registroAnexos.id, anexoId));
  } catch (err) {
    console.error(`[mirrorAnexoToDrive] anexo ${anexoId}:`, err);
    await db.update(registroAnexos)
      .set({ driveStatus: "error" })
      .where(eq(registroAnexos.id, anexoId))
      .catch(() => {});
  }
}
```

> Confirmar antes de commitar: o retorno real de `uploadFileBuffer` (campo `id`); se for outro nome (ex.: `fileId`), ajustar. Confirmar `db.query.assistidos` disponível (schema barrel exporta core).

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit 2>&1 | grep "mirror-anexo-to-drive" || echo "ok"` → "ok".
- [ ] **Step 3: Commit** — `git add src/lib/registros/mirror-anexo-to-drive.ts && git commit -m "feat(registros): mirrorAnexoToDrive (espelho best-effort no Drive)"`

---

### Task 3: Disparar o mirror no upload

**Files:** Modify `src/app/api/registros/anexos/route.ts`.

- [ ] **Step 1:** Importar `import { mirrorAnexoToDrive } from "@/lib/registros/mirror-anexo-to-drive";`. No `POST`, logo após obter `anexo` do insert e ANTES do `return`, adicionar:

```ts
  // espelho no Drive — fire-and-forget, não bloqueia a resposta
  if (anexo) void mirrorAnexoToDrive(anexo.id);
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit 2>&1 | grep "api/registros/anexos" || echo "ok"` → "ok".
- [ ] **Step 3: Commit** — `git add src/app/api/registros/anexos/route.ts && git commit -m "feat(api): dispara espelho no Drive após upload de anexo"`

---

### Task 4: tRPC `anexos.retryMirror`

**Files:** Modify `src/lib/trpc/routers/registros.ts` (dentro do sub-router `anexos`).

- [ ] **Step 1:** Importar `import { mirrorAnexoToDrive } from "@/lib/registros/mirror-anexo-to-drive";`. Adicionar dentro de `anexos: router({ ... })`, ao lado de `list`/`remove`:

```ts
  retryMirror: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.update(registroAnexos).set({ driveStatus: "pending" }).where(eq(registroAnexos.id, input.id));
      void mirrorAnexoToDrive(input.id);
      return { ok: true };
    }),
```

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit 2>&1 | grep "routers/registros" || echo "ok"` → "ok".
- [ ] **Step 3: Commit** — `git add src/lib/trpc/routers/registros.ts && git commit -m "feat(trpc): registros.anexos.retryMirror"`

---

### Task 5: Badge de status + re-tentar na `AnexoList`

**Files:** Modify `src/components/registros/anexos/anexo-list.tsx`.

- [ ] **Step 1:** Importar ícones e a mutation. No topo, adicionar `Cloud, CloudOff, Loader2` de `lucide-react`. Adicionar a mutation de retry:

```tsx
const retry = trpc.registros.anexos.retryMirror.useMutation({
  onSuccess: () => utils.registros.anexos.list.invalidate({ registroId }),
});
```

Dentro do `.map((a) => ...)`, ao lado do botão de excluir, adicionar o indicador de status do Drive (a `list` já retorna `a.driveStatus`):

```tsx
{a.driveStatus === "synced" && <Cloud className="w-3 h-3 text-emerald-500 absolute -bottom-1 -right-1" />}
{a.driveStatus === "pending" && <Loader2 className="w-3 h-3 text-neutral-400 animate-spin absolute -bottom-1 -right-1" />}
{a.driveStatus === "error" && (
  <button type="button" title="Falha no Drive — re-tentar" onClick={() => retry.mutate({ id: a.id })}
    className="absolute -bottom-1 -right-1">
    <CloudOff className="w-3 h-3 text-amber-500" />
  </button>
)}
```

> Ajustar posicionamento conforme o layout do card do anexo (o container do item já é `relative`).

- [ ] **Step 2: Typecheck** — `npx tsc --noEmit 2>&1 | grep "anexo-list" || echo "ok"` → "ok".
- [ ] **Step 3: Commit** — `git add src/components/registros/anexos/anexo-list.tsx && git commit -m "feat(registros): status do Drive + re-tentar na lista de anexos"`

---

### Task 6: Verificação + PR

- [ ] **Step 1:** `npx vitest run src/lib/registros src/components/registros` → tudo verde.
- [ ] **Step 2:** `npx tsc --noEmit 2>&1 | grep -E "registros/(atribuicao-folder-key|mirror-anexo-to-drive)|anexo-list|routers/registros|api/registros/anexos" || echo "sem erros na feature"`.
- [ ] **Step 3:** Push + PR (base main).

## Self-Review (cobertura)
- Resolver pasta do assistido (driveFolderId + fallback) → Task 2 ✓
- Subpasta Registros → Task 2 ✓
- Download Storage + uploadFileBuffer → Task 2 ✓
- Atualizar driveFileId/driveStatus → Task 2 ✓
- Disparo não-bloqueante no upload → Task 3 ✓
- Re-tentar → Task 4 + 5 ✓
- Status na UI → Task 5 ✓

## Riscos
- O upload real ao Drive depende de OAuth válido — só verificável de fato com um upload pós-deploy (testes cobrem o mapa puro e o tsc; o caminho Drive é best-effort e não quebra o app).
- `uploadFileBuffer` retorno: confirmar o nome do campo de id antes de commitar a Task 2.
