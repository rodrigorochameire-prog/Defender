# Anexos em Registros — Fase 1 (núcleo) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir anexar fotos/documentos a um registro de demanda — ao criar e arrastando sobre registros existentes — armazenados no Supabase Storage, sem Drive (Fase 2).

**Architecture:** Tabela `registro_anexos` (1→N). Upload via rota Next multipart (`/api/registros/anexos`) com Supabase service-role no bucket privado `documents`. Imagens são convertidas (HEIC→JPEG) e comprimidas no navegador antes do envio. Leitura via signed URL gerada server-side (tRPC). UI: dropzone no `registro-editor` e nos `registro-card`.

**Tech Stack:** Next.js (App Router), drizzle-orm + drizzle-kit, Supabase Storage, tRPC, React, Vitest. Libs novas: `heic2any`, `browser-image-compression` (ambas via dynamic import).

**Spec:** `docs/superpowers/specs/2026-06-07-registro-anexos-design.md`

---

## File Structure

- Create `src/lib/registros/anexo-utils.ts` — funções puras (mime→tipo, path, decisões de conversão/compressão).
- Create `src/lib/registros/__tests__/anexo-utils.test.ts` — testes das puras.
- Modify `src/lib/db/schema/agenda.ts` — tabela `registroAnexos` + relations + types.
- Create `src/app/api/registros/anexos/route.ts` — `POST` (upload) e `DELETE`.
- Modify `src/lib/trpc/routers/registros.ts` — sub-router `anexos` (`list`, `remove`).
- Create `src/components/registros/anexos/use-anexo-upload.ts` — hook cliente (convert+compress+POST).
- Create `src/components/registros/anexos/anexo-dropzone.tsx` — wrapper drag-and-drop.
- Create `src/components/registros/anexos/anexo-list.tsx` — render miniaturas/chips + abrir/excluir.
- Create `src/components/registros/anexos/__tests__/anexo-dropzone.test.tsx` — aceitar/rejeitar.
- Modify `src/components/registros/registro-card.tsx` — render `AnexoList` + envolver em `AnexoDropzone`.
- Modify `src/components/registros/registro-editor.tsx` — anexos "staged" + upload após criar.
- Modify `package.json` — deps `heic2any`, `browser-image-compression`.

---

### Task 1: Dependências

**Files:** Modify `package.json`

- [ ] **Step 1: Instalar libs**

Run: `npm install heic2any browser-image-compression`
Expected: ambas aparecem em `dependencies`.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(registros): deps p/ anexos (heic2any, browser-image-compression)"
```

---

### Task 2: Funções puras de anexo

**Files:**
- Create: `src/lib/registros/anexo-utils.ts`
- Test: `src/lib/registros/__tests__/anexo-utils.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from "vitest";
import { mimeToTipo, buildStoragePath, needsHeicConversion, needsCompression, ACCEPTED_MIME, MAX_BYTES } from "../anexo-utils";

describe("mimeToTipo", () => {
  it("imagem para mimes image/*", () => {
    expect(mimeToTipo("image/jpeg")).toBe("imagem");
    expect(mimeToTipo("image/png")).toBe("imagem");
  });
  it("documento para pdf/word", () => {
    expect(mimeToTipo("application/pdf")).toBe("documento");
    expect(mimeToTipo("application/msword")).toBe("documento");
  });
});

describe("buildStoragePath", () => {
  it("gera registros/{id}/{uuid}-{slug}.{ext}", () => {
    const p = buildStoragePath(42, "Foto do Local!.JPG", () => "u123");
    expect(p).toBe("registros/42/u123-foto-do-local.jpg");
  });
  it("usa extensão do mime quando o nome não tem", () => {
    const p = buildStoragePath(7, "scan", () => "abc", "application/pdf");
    expect(p).toBe("registros/7/abc-scan.pdf");
  });
});

describe("needsHeicConversion", () => {
  it("true para heic/heif", () => {
    expect(needsHeicConversion("image/heic")).toBe(true);
    expect(needsHeicConversion("image/heif")).toBe(true);
  });
  it("false para jpeg", () => {
    expect(needsHeicConversion("image/jpeg")).toBe(false);
  });
});

describe("needsCompression", () => {
  it("comprime imagem acima de 1.5MB", () => {
    expect(needsCompression("image/jpeg", 2_000_000)).toBe(true);
    expect(needsCompression("image/jpeg", 500_000)).toBe(false);
  });
  it("nunca comprime documento", () => {
    expect(needsCompression("application/pdf", 9_000_000)).toBe(false);
  });
});

describe("ACCEPTED_MIME / MAX_BYTES", () => {
  it("define limites", () => {
    expect(ACCEPTED_MIME).toContain("application/pdf");
    expect(MAX_BYTES).toBe(10 * 1024 * 1024);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/registros/__tests__/anexo-utils.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

```ts
// src/lib/registros/anexo-utils.ts
export type AnexoTipo = "imagem" | "documento";

export const MAX_BYTES = 10 * 1024 * 1024; // 10MB (limite do bucket documents)
const COMPRESS_THRESHOLD = 1.5 * 1024 * 1024; // imagens acima disto são comprimidas no cliente

/** Mimes aceitos. HEIC/HEIF entram no cliente e são convertidos para JPEG antes do upload. */
export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function mimeToTipo(mime: string): AnexoTipo {
  return mime.startsWith("image/") ? "imagem" : "documento";
}

export function needsHeicConversion(mime: string): boolean {
  return mime === "image/heic" || mime === "image/heif";
}

export function needsCompression(mime: string, sizeBytes: number): boolean {
  return mime.startsWith("image/") && sizeBytes > COMPRESS_THRESHOLD;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "jpg", // já convertido
  "image/heif": "jpg",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function slugify(name: string): string {
  const base = name.replace(/\.[^.]+$/, ""); // remove extensão
  return base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "arquivo";
}

/** registros/{registroId}/{uuid}-{slug}.{ext} */
export function buildStoragePath(
  registroId: number,
  fileName: string,
  uuid: () => string,
  mime?: string,
): string {
  const extFromName = (fileName.match(/\.([^.]+)$/)?.[1] || "").toLowerCase();
  const ext = extFromName || (mime ? EXT_BY_MIME[mime] : "") || "bin";
  return `registros/${registroId}/${uuid()}-${slugify(fileName)}.${ext}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/registros/__tests__/anexo-utils.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/registros/anexo-utils.ts src/lib/registros/__tests__/anexo-utils.test.ts
git commit -m "feat(registros): funções puras de anexo (mime, path, compressão)"
```

---

### Task 3: Schema `registro_anexos` + migration

**Files:**
- Modify: `src/lib/db/schema/agenda.ts` (após o bloco `registros`/`registrosRelations`)

- [ ] **Step 1: Adicionar a tabela, types e relations**

Inserir após `export const registrosRelations = ...`:

```ts
// ==========================================
// ANEXOS DE REGISTRO
// ==========================================

export const registroAnexos = pgTable("registro_anexos", {
  id: serial("id").primaryKey(),
  registroId: integer("registro_id")
    .notNull()
    .references(() => registros.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  nomeOriginal: varchar("nome_original", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  tamanho: integer("tamanho").notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'imagem' | 'documento'
  driveFileId: varchar("drive_file_id", { length: 100 }),
  driveStatus: varchar("drive_status", { length: 20 }).default("pending"),
  autorId: integer("autor_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("registro_anexos_registro_id_idx").on(table.registroId),
  index("registro_anexos_autor_idx").on(table.autorId),
  index("registro_anexos_drive_status_idx").on(table.driveStatus),
]);

export type RegistroAnexo = typeof registroAnexos.$inferSelect;
export type InsertRegistroAnexo = typeof registroAnexos.$inferInsert;

export const registroAnexosRelations = relations(registroAnexos, ({ one }) => ({
  registro: one(registros, { fields: [registroAnexos.registroId], references: [registros.id] }),
  autor: one(users, { fields: [registroAnexos.autorId], references: [users.id] }),
}));
```

Adicionar `anexos` ao `registrosRelations` (que hoje usa `one`): trocar a assinatura para incluir `many` e a relação:

```ts
export const registrosRelations = relations(registros, ({ one, many }) => ({
  assistido: one(assistidos, { fields: [registros.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [registros.processoId], references: [processos.id] }),
  demanda: one(demandas, { fields: [registros.demandaId], references: [demandas.id] }),
  audiencia: one(audiencias, { fields: [registros.audienciaId], references: [audiencias.id] }),
  anexos: many(registroAnexos),
}));
```

> Verificar que `text`, `varchar`, `integer`, `serial`, `timestamp`, `index`, `pgTable`, `relations` já estão importados no topo do arquivo (estão — `registros` os usa).

- [ ] **Step 2: Gerar a migration**

Run: `npm run db:generate`
Expected: novo arquivo em `drizzle/` criando `registro_anexos` + índices.

- [ ] **Step 3: Aplicar ao banco**

Run: `npm run db:push`
Expected: aplica sem erro (cria a tabela). Confirmar: a tabela `registro_anexos` existe.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema/agenda.ts drizzle/
git commit -m "feat(db): tabela registro_anexos + relations + migration"
```

---

### Task 4: Rota de upload `POST /api/registros/anexos`

**Files:**
- Create: `src/app/api/registros/anexos/route.ts`

Padrão de auth copiado de `src/app/api/drive/upload/route.ts` (cookie `defesahub_session` → `verifySessionToken`). Escopo: o autor precisa poder ver a demanda do registro (defensor dono OU mesma comarca). Para a Fase 1, validamos que o registro existe e que o usuário está autenticado; o escopo fino reusa o filtro já aplicado na leitura via tRPC.

- [ ] **Step 1: Implementar a rota**

```ts
// src/app/api/registros/anexos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { registros, registroAnexos } from "@/lib/db/schema/agenda";
import { verifySessionToken } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import {
  ACCEPTED_MIME, MAX_BYTES, mimeToTipo, buildStoragePath,
} from "@/lib/registros/anexo-utils";

const BUCKET = "documents";

async function getUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("defesahub_session")?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  return session?.userId ?? null;
}

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await request.formData();
  const registroId = Number(form.get("registroId"));
  const file = form.get("file");

  if (!Number.isInteger(registroId) || registroId <= 0) {
    return NextResponse.json({ error: "registroId inválido" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "arquivo ausente" }, { status: 400 });
  }
  if (!(ACCEPTED_MIME as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: `tipo não suportado: ${file.type}` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "arquivo acima de 10MB" }, { status: 413 });
  }

  const registro = await db.query.registros.findFirst({ where: eq(registros.id, registroId) });
  if (!registro) return NextResponse.json({ error: "registro não encontrado" }, { status: 404 });

  const path = buildStoragePath(registroId, file.name, randomUUID, file.type);
  const supabase = getSupabaseAdmin();
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600", upsert: false, contentType: file.type,
  });
  if (upErr) return NextResponse.json({ error: `falha no upload: ${upErr.message}` }, { status: 500 });

  const [anexo] = await db.insert(registroAnexos).values({
    registroId,
    storagePath: path,
    nomeOriginal: file.name,
    mimeType: file.type,
    tamanho: file.size,
    tipo: mimeToTipo(file.type),
    autorId: userId,
  }).returning();

  return NextResponse.json({ anexo }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  const anexo = await db.query.registroAnexos.findFirst({ where: eq(registroAnexos.id, id) });
  if (!anexo) return NextResponse.json({ error: "anexo não encontrado" }, { status: 404 });

  const supabase = getSupabaseAdmin();
  await supabase.storage.from(BUCKET).remove([anexo.storagePath]);
  await db.delete(registroAnexos).where(eq(registroAnexos.id, id));

  return NextResponse.json({ ok: true });
}
```

> `db.query.registroAnexos` exige que `registroAnexos` esteja exportado no barrel de schema usado por `db` (verificar `src/lib/db/index.ts` / `schema/index.ts`: garantir `export * from "./agenda"` cobre a nova tabela — já cobre).

- [ ] **Step 2: Verificação manual (smoke)**

Run (dev server ligado): `curl -i -X POST localhost:3000/api/registros/anexos` (sem cookie)
Expected: `401`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/registros/anexos/route.ts
git commit -m "feat(api): upload/remoção de anexos de registro"
```

---

### Task 5: tRPC `registros.anexos.list` / `remove`

**Files:**
- Modify: `src/lib/trpc/routers/registros.ts`

- [ ] **Step 1: Adicionar o sub-router**

No topo do arquivo, garantir imports:

```ts
import { registroAnexos } from "@/lib/db/schema/agenda";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { router } from "@/lib/trpc/init"; // usar o helper de router já existente neste arquivo
```

Dentro do objeto do `registrosRouter`, adicionar a chave `anexos`:

```ts
anexos: router({
  list: protectedProcedure
    .input(z.object({ registroId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const rows = await db.query.registroAnexos.findMany({
        where: eq(registroAnexos.registroId, input.registroId),
        orderBy: (a, { asc }) => [asc(a.createdAt)],
      });
      const supabase = getSupabaseAdmin();
      return Promise.all(rows.map(async (a) => {
        const { data } = await supabase.storage
          .from("documents")
          .createSignedUrl(a.storagePath, 60 * 60); // 1h
        return { ...a, url: data?.signedUrl ?? null };
      }));
    }),
  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const anexo = await db.query.registroAnexos.findFirst({ where: eq(registroAnexos.id, input.id) });
      if (!anexo) throw new TRPCError({ code: "NOT_FOUND", message: "anexo não encontrado" });
      await getSupabaseAdmin().storage.from("documents").remove([anexo.storagePath]);
      await db.delete(registroAnexos).where(eq(registroAnexos.id, input.id));
      return { ok: true };
    }),
}),
```

> Conferir como o arquivo monta o router (`router({...})` vs `createTRPCRouter`). Usar o MESMO helper já usado em `registros.ts`. `TRPCError` já é importado (usado no `create`).

- [ ] **Step 2: Typecheck do arquivo**

Run: `npx tsc --noEmit 2>&1 | grep registros.ts || echo "sem erros"`
Expected: "sem erros".

- [ ] **Step 3: Commit**

```bash
git add src/lib/trpc/routers/registros.ts
git commit -m "feat(trpc): registros.anexos.list/remove com signed URL"
```

---

### Task 6: Hook `useAnexoUpload`

**Files:**
- Create: `src/components/registros/anexos/use-anexo-upload.ts`

- [ ] **Step 1: Implementar**

```ts
"use client";
import { useState, useCallback } from "react";
import { needsHeicConversion, needsCompression, ACCEPTED_MIME, MAX_BYTES } from "@/lib/registros/anexo-utils";

export type UploadState = { name: string; status: "preparando" | "enviando" | "ok" | "erro"; error?: string };

/** Converte HEIC→JPEG e comprime imagens grandes (libs carregadas sob demanda). */
async function prepareFile(file: File): Promise<File> {
  let out = file;
  if (needsHeicConversion(file.type)) {
    const heic2any = (await import("heic2any")).default;
    const blob = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 })) as Blob;
    out = new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
  }
  if (needsCompression(out.type, out.size)) {
    const imageCompression = (await import("browser-image-compression")).default;
    out = await imageCompression(out, { maxSizeMB: 1.5, maxWidthOrHeight: 2200, useWebWorker: true });
  }
  return out;
}

export function useAnexoUpload(onUploaded: () => void) {
  const [items, setItems] = useState<UploadState[]>([]);

  const upload = useCallback(async (registroId: number, files: File[]) => {
    for (const original of files) {
      if (!(ACCEPTED_MIME as readonly string[]).includes(original.type)) {
        setItems((s) => [...s, { name: original.name, status: "erro", error: "tipo não suportado" }]);
        continue;
      }
      const idx = items.length;
      setItems((s) => [...s, { name: original.name, status: "preparando" }]);
      try {
        const prepared = await prepareFile(original);
        if (prepared.size > MAX_BYTES) throw new Error("arquivo acima de 10MB mesmo após compressão");
        setItems((s) => s.map((it, i) => (i === idx ? { ...it, status: "enviando" } : it)));
        const fd = new FormData();
        fd.append("registroId", String(registroId));
        fd.append("file", prepared);
        const res = await fetch("/api/registros/anexos", { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        setItems((s) => s.map((it, i) => (i === idx ? { ...it, status: "ok" } : it)));
      } catch (e) {
        setItems((s) => s.map((it, i) => (i === idx ? { ...it, status: "erro", error: (e as Error).message } : it)));
      }
    }
    onUploaded();
  }, [items.length, onUploaded]);

  const reset = useCallback(() => setItems([]), []);
  return { items, upload, reset };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep use-anexo-upload || echo "sem erros"`
Expected: "sem erros".

- [ ] **Step 3: Commit**

```bash
git add src/components/registros/anexos/use-anexo-upload.ts
git commit -m "feat(registros): hook useAnexoUpload (HEIC→JPEG + compressão)"
```

---

### Task 7: `AnexoDropzone` + teste

**Files:**
- Create: `src/components/registros/anexos/anexo-dropzone.tsx`
- Test: `src/components/registros/anexos/__tests__/anexo-dropzone.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { AnexoDropzone } from "../anexo-dropzone";

function dropFiles(el: Element, files: File[]) {
  fireEvent.drop(el, { dataTransfer: { files, items: files.map((f) => ({ kind: "file", type: f.type })), types: ["Files"] } });
}

describe("AnexoDropzone", () => {
  it("entrega só arquivos com mime aceito", () => {
    const onFiles = vi.fn();
    const { getByTestId } = render(<AnexoDropzone onFiles={onFiles}><div>z</div></AnexoDropzone>);
    const zone = getByTestId("anexo-dropzone");
    const ok = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const bad = new File(["x"], "a.exe", { type: "application/x-msdownload" });
    dropFiles(zone, [ok, bad]);
    expect(onFiles).toHaveBeenCalledWith([ok]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/registros/anexos/__tests__/anexo-dropzone.test.tsx`
Expected: FAIL (componente inexistente).

- [ ] **Step 3: Implementar**

```tsx
"use client";
import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ACCEPTED_MIME } from "@/lib/registros/anexo-utils";

export function AnexoDropzone({
  onFiles, children, className,
}: { onFiles: (files: File[]) => void; children: React.ReactNode; className?: string }) {
  const [over, setOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      (ACCEPTED_MIME as readonly string[]).includes(f.type));
    if (files.length) onFiles(files);
  }, [onFiles]);

  return (
    <div
      data-testid="anexo-dropzone"
      onDragOver={(e) => { e.preventDefault(); if (!over) setOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={handleDrop}
      className={cn(over && "ring-2 ring-emerald-400/70 ring-inset rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20", className)}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/registros/anexos/__tests__/anexo-dropzone.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/registros/anexos/anexo-dropzone.tsx src/components/registros/anexos/__tests__/anexo-dropzone.test.tsx
git commit -m "feat(registros): AnexoDropzone (drag-and-drop com filtro de mime)"
```

---

### Task 8: `AnexoList` (render + abrir + excluir)

**Files:**
- Create: `src/components/registros/anexos/anexo-list.tsx`

- [ ] **Step 1: Implementar**

```tsx
"use client";
import React from "react";
import { FileText, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export function AnexoList({ registroId }: { registroId: number }) {
  const utils = trpc.useUtils();
  const { data: anexos } = trpc.registros.anexos.list.useQuery({ registroId });
  const remove = trpc.registros.anexos.remove.useMutation({
    onSuccess: () => utils.registros.anexos.list.invalidate({ registroId }),
  });
  if (!anexos || anexos.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {anexos.map((a) => (
        <div key={a.id} className="group relative">
          {a.tipo === "imagem" && a.url ? (
            <a href={a.url} target="_blank" rel="noreferrer">
              <img src={a.url} alt={a.nomeOriginal} className="w-16 h-16 object-cover rounded-md border border-neutral-200 dark:border-neutral-700" />
            </a>
          ) : (
            <a href={a.url ?? "#"} target="_blank" rel="noreferrer"
               className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-xs max-w-[160px]">
              <FileText className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
              <span className="truncate">{a.nomeOriginal}</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => remove.mutate({ id: a.id })}
            title="Excluir anexo"
            className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-neutral-700 text-white"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep anexo-list || echo "sem erros"`
Expected: "sem erros".

- [ ] **Step 3: Commit**

```bash
git add src/components/registros/anexos/anexo-list.tsx
git commit -m "feat(registros): AnexoList (miniaturas/chips + abrir + excluir)"
```

---

### Task 9: Integrar no `registro-card`

**Files:**
- Modify: `src/components/registros/registro-card.tsx`

- [ ] **Step 1: Importar e envolver**

No topo:

```tsx
import { AnexoList } from "./anexos/anexo-list";
import { AnexoDropzone } from "./anexos/anexo-dropzone";
import { useAnexoUpload } from "./anexos/use-anexo-upload";
import { trpc } from "@/lib/trpc/client";
```

Dentro do componente `RegistroCard` (que recebe `registro` com `id: number`):

```tsx
const utils = trpc.useUtils();
const { upload } = useAnexoUpload(() => utils.registros.anexos.list.invalidate({ registroId: registro.id }));
```

Envolver o conteúdo do card com `AnexoDropzone` (arrastar foto sobre o card → anexa) e renderizar a lista após o conteúdo:

```tsx
return (
  <AnexoDropzone onFiles={(files) => upload(registro.id, files)}>
    {/* ...markup existente do card... */}
    <AnexoList registroId={registro.id} />
  </AnexoDropzone>
);
```

> Manter o restante do markup do card intacto; apenas embrulhar o nó raiz e inserir `<AnexoList/>` ao final do corpo. `registro.id` é `number` (confirmar no tipo do card; hoje o card recebe `registro` com campos como `audioUrl` — adicionar `id: number` à prop se ainda não existir).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep registro-card || echo "sem erros"`
Expected: "sem erros".

- [ ] **Step 3: Commit**

```bash
git add src/components/registros/registro-card.tsx
git commit -m "feat(registros): anexos no card (arrastar p/ anexar + lista)"
```

---

### Task 10: Integrar no `registro-editor`

**Files:**
- Modify: `src/components/registros/registro-editor.tsx`

Comportamento: o editor mantém arquivos "staged" em memória; ao salvar, primeiro cria o registro (mutation existente), pega o `id` retornado e sobe os anexos via `useAnexoUpload`.

- [ ] **Step 1: Adicionar estado + UI de seleção**

```tsx
import { useState } from "react";
import { Paperclip } from "lucide-react";
import { AnexoDropzone } from "./anexos/anexo-dropzone";
import { useAnexoUpload } from "./anexos/use-anexo-upload";
// ...
const [staged, setStaged] = useState<File[]>([]);
const { upload } = useAnexoUpload(() => {});
```

UI (dentro do form, antes dos botões):

```tsx
<AnexoDropzone onFiles={(files) => setStaged((s) => [...s, ...files])} className="border border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-3">
  <label className="flex items-center gap-2 text-sm text-neutral-500 cursor-pointer">
    <Paperclip className="w-4 h-4" />
    Arraste arquivos aqui ou
    <input type="file" multiple className="hidden"
      onChange={(e) => setStaged((s) => [...s, ...Array.from(e.target.files ?? [])])} />
    <span className="underline">selecione</span>
  </label>
  {staged.length > 0 && (
    <ul className="mt-2 text-xs text-neutral-600 dark:text-neutral-300 space-y-1">
      {staged.map((f, i) => (
        <li key={i} className="flex items-center justify-between">
          <span className="truncate">{f.name}</span>
          <button type="button" onClick={() => setStaged((s) => s.filter((_, j) => j !== i))} className="text-neutral-400">remover</button>
        </li>
      ))}
    </ul>
  )}
</AnexoDropzone>
```

- [ ] **Step 2: Subir anexos após criar o registro**

No handler de submit, após a criação retornar o registro criado (a mutation `create` retorna o registro com `id`):

```tsx
const created = await createMutation.mutateAsync(payload);
if (staged.length > 0) await upload(created.id, staged);
setStaged([]);
// ...fechar/limpar como já faz hoje
```

> Adaptar ao nome real da mutation/handler do editor (ex.: `trpc.registros.create.useMutation`). Não duplicar lógica de fechamento — apenas inserir o upload entre a criação e o reset.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep registro-editor || echo "sem erros"`
Expected: "sem erros".

- [ ] **Step 4: Commit**

```bash
git add src/components/registros/registro-editor.tsx
git commit -m "feat(registros): anexar arquivos ao criar registro"
```

---

### Task 11: Verificação fim-a-fim + suíte

- [ ] **Step 1: Rodar a suíte tocada**

Run: `npx vitest run src/lib/registros src/components/registros`
Expected: tudo verde.

- [ ] **Step 2: Smoke manual no app**

Subir `npm run dev`, abrir uma demanda → painel Registros:
- criar um registro com 1 foto (jpg) e 1 PDF → aparecem como miniatura + chip;
- arrastar uma foto (inclusive HEIC do iPhone) sobre um registro existente → some o "fantasma", aparece a miniatura;
- excluir um anexo → some e o Storage é limpo.

- [ ] **Step 3: Commit final (se houver ajustes)**

```bash
git add -A && git commit -m "test(registros): verificação fim-a-fim de anexos (fase 1)"
```

---

## Self-Review (cobertura do spec)

- Modelo `registro_anexos` → Task 3 ✓
- Upload Storage + rota → Task 4 ✓
- Conversão/compressão no cliente → Task 6 (usa puras da Task 2) ✓
- Leitura por signed URL → Task 5 ✓
- Dropzone editor + card → Tasks 7, 9, 10 ✓
- Render miniaturas/chips + excluir → Task 8 ✓
- Permissão básica (autenticado + registro existe) → Task 4 ✓ (escopo fino fica para hardening na Fase 2)
- **Fora desta fase (planos próprios):** espelho no Drive (`drive_file_id`/`drive_status` já existem na tabela, populados na Fase 2); progresso %/re-tentar/lightbox (Fase 3).

## Riscos / notas de execução

- Confirmar o helper de router usado em `registros.ts` (`router` vs `createTRPCRouter`) e o nome da mutation de criação no editor antes de colar os trechos.
- `heic2any` só roda no browser — por isso o import é dinâmico dentro do hook (nunca no SSR).
- Bucket `documents` aceita os mimes finais (jpg/png/webp/pdf/doc/docx); HEIC nunca chega ao Storage (convertido antes).
