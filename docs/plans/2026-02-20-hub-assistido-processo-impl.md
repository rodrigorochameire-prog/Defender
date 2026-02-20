# Hub Assistido & Processo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Substituir mock data nas páginas `/admin/assistidos/[id]` e `/admin/processos/[id]` por queries tRPC enriquecidas, adicionando SubpastaExplorer, TimelineDocumental e DemandasTabela read-only com dados reais.

**Architecture:** Queries enriquecidas com `Promise.all` nos routers existentes. Sub-componentes construídos como Client Components que recebem slices do objeto enriquecido via props. Árvore do Drive construída no cliente a partir dos dados já no banco.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, Supabase PostgreSQL, Tailwind CSS, shadcn/ui, date-fns, Lucide React

**Design Doc:** `docs/plans/2026-02-20-hub-assistido-processo-design.md`

---

## Task 1: Enriquecer `assistidos.getById`

**Files:**
- Modify: `src/lib/trpc/routers/assistidos.ts`

**Step 1: Localizar o procedure `getById` atual**

```bash
grep -n "getById" src/lib/trpc/routers/assistidos.ts
```

**Step 2: Substituir o `getById` por versão enriquecida**

Encontrar o bloco `getById` e substituir pelo seguinte (adaptar imports se necessário):

```typescript
getById: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const workspaceId = ctx.session.user.workspaceId;

    const [baseRows, processosRows, audienciasRows, demandasRows, driveFilesRows] =
      await Promise.all([
        // Base
        ctx.db
          .select()
          .from(assistidos)
          .where(and(eq(assistidos.id, input.id), eq(assistidos.workspaceId, workspaceId)))
          .limit(1),

        // Processos vinculados via assistidos_processos
        ctx.db
          .select({
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            vara: processos.vara,
            assunto: processos.assunto,
            fase: processos.fase,
            situacao: processos.situacao,
            papel: assistidosProcessos.papel,
          })
          .from(assistidosProcessos)
          .innerJoin(processos, eq(assistidosProcessos.processoId, processos.id))
          .where(
            and(
              eq(assistidosProcessos.assistidoId, input.id),
              isNull(processos.deletedAt),
            ),
          ),

        // Audiências
        ctx.db
          .select({
            id: audiencias.id,
            dataAudiencia: audiencias.dataAudiencia,
            tipo: audiencias.tipo,
            local: audiencias.local,
            status: audiencias.status,
            processoId: audiencias.processoId,
          })
          .from(audiencias)
          .where(eq(audiencias.assistidoId, input.id))
          .orderBy(desc(audiencias.dataAudiencia)),

        // Demandas — todos defensores
        ctx.db
          .select({
            id: demandas.id,
            ato: demandas.ato,
            tipoAto: demandas.tipoAto,
            status: demandas.status,
            prazo: demandas.prazo,
            processoId: demandas.processoId,
            defensorId: demandas.defensorId,
            defensorNome: users.name,
          })
          .from(demandas)
          .leftJoin(users, eq(demandas.defensorId, users.id))
          .where(
            and(
              eq(demandas.assistidoId, input.id),
              isNull(demandas.deletedAt),
            ),
          )
          .orderBy(asc(demandas.prazo)),

        // Drive files
        ctx.db
          .select({
            id: driveFiles.id,
            name: driveFiles.name,
            mimeType: driveFiles.mimeType,
            webViewLink: driveFiles.webViewLink,
            lastModifiedTime: driveFiles.lastModifiedTime,
            isFolder: driveFiles.isFolder,
            parentFileId: driveFiles.parentFileId,
            driveFolderId: driveFiles.driveFolderId,
          })
          .from(driveFiles)
          .where(eq(driveFiles.assistidoId, input.id))
          .orderBy(desc(driveFiles.lastModifiedTime))
          .limit(100),
      ]);

    if (baseRows.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Assistido não encontrado" });
    }

    return {
      ...baseRows[0],
      processos: processosRows,
      audiencias: audienciasRows,
      demandas: demandasRows,
      driveFiles: driveFilesRows,
    };
  }),
```

**Step 3: Verificar imports no topo do arquivo**

Garantir que estão importados: `assistidosProcessos`, `processos`, `audiencias`, `demandas`, `driveFiles`, `users`, `desc`, `asc`, `and`, `isNull`, `TRPCError`. Adicionar os que faltarem.

**Step 4: Verificar build**

```bash
npm run build 2>&1 | tail -30
```

Expected: sem erros de TypeScript no router.

**Step 5: Commit**

```bash
git add src/lib/trpc/routers/assistidos.ts
git commit -m "feat(assistidos): enriquecer getById com processos, demandas, audiencias e drive"
```

---

## Task 2: Enriquecer `processos.getById`

**Files:**
- Modify: `src/lib/trpc/routers/processos.ts`

**Step 1: Localizar o procedure `getById` atual**

```bash
grep -n "getById" src/lib/trpc/routers/processos.ts
```

**Step 2: Substituir pelo `getById` enriquecido**

```typescript
getById: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const workspaceId = ctx.session.user.workspaceId;

    const [baseRows, assistidosRows, audienciasRows, demandasRows, driveFilesRows] =
      await Promise.all([
        // Base
        ctx.db
          .select()
          .from(processos)
          .where(and(eq(processos.id, input.id), eq(processos.workspaceId, workspaceId)))
          .limit(1),

        // Partes (assistidos vinculados)
        ctx.db
          .select({
            id: assistidos.id,
            nome: assistidos.nome,
            cpf: assistidos.cpf,
            papel: assistidosProcessos.papel,
            isPrincipal: assistidosProcessos.isPrincipal,
            statusPrisional: assistidos.statusPrisional,
          })
          .from(assistidosProcessos)
          .innerJoin(assistidos, eq(assistidosProcessos.assistidoId, assistidos.id))
          .where(
            and(
              eq(assistidosProcessos.processoId, input.id),
              isNull(assistidos.deletedAt),
            ),
          ),

        // Audiências
        ctx.db
          .select({
            id: audiencias.id,
            dataAudiencia: audiencias.dataAudiencia,
            tipo: audiencias.tipo,
            local: audiencias.local,
            status: audiencias.status,
            resultado: audiencias.resultado,
          })
          .from(audiencias)
          .where(eq(audiencias.processoId, input.id))
          .orderBy(desc(audiencias.dataAudiencia)),

        // Demandas — todos defensores
        ctx.db
          .select({
            id: demandas.id,
            ato: demandas.ato,
            tipoAto: demandas.tipoAto,
            status: demandas.status,
            prazo: demandas.prazo,
            assistidoId: demandas.assistidoId,
            assistidoNome: assistidos.nome,
            defensorId: demandas.defensorId,
            defensorNome: users.name,
          })
          .from(demandas)
          .leftJoin(users, eq(demandas.defensorId, users.id))
          .leftJoin(assistidos, eq(demandas.assistidoId, assistidos.id))
          .where(
            and(
              eq(demandas.processoId, input.id),
              isNull(demandas.deletedAt),
            ),
          )
          .orderBy(asc(demandas.prazo)),

        // Drive files
        ctx.db
          .select({
            id: driveFiles.id,
            name: driveFiles.name,
            mimeType: driveFiles.mimeType,
            webViewLink: driveFiles.webViewLink,
            lastModifiedTime: driveFiles.lastModifiedTime,
            isFolder: driveFiles.isFolder,
            parentFileId: driveFiles.parentFileId,
            driveFolderId: driveFiles.driveFolderId,
          })
          .from(driveFiles)
          .where(eq(driveFiles.processoId, input.id))
          .orderBy(desc(driveFiles.lastModifiedTime))
          .limit(100),
      ]);

    if (baseRows.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Processo não encontrado" });
    }

    const base = baseRows[0];

    // Processos vinculados (mesmo caso)
    const processosVinculados = base.casoId
      ? await ctx.db
          .select({ id: processos.id, numeroAutos: processos.numeroAutos, vara: processos.vara, assunto: processos.assunto })
          .from(processos)
          .where(
            and(
              eq(processos.casoId, base.casoId),
              ne(processos.id, input.id),
              isNull(processos.deletedAt),
            ),
          )
      : [];

    return {
      ...base,
      assistidos: assistidosRows,
      audiencias: audienciasRows,
      demandas: demandasRows,
      driveFiles: driveFilesRows,
      processosVinculados,
    };
  }),
```

**Step 3: Verificar imports** — adicionar `ne` do drizzle-orm se necessário.

**Step 4: Verificar build**

```bash
npm run build 2>&1 | tail -30
```

**Step 5: Commit**

```bash
git add src/lib/trpc/routers/processos.ts
git commit -m "feat(processos): enriquecer getById com partes, demandas, audiencias e drive"
```

---

## Task 3: Criar componentes compartilhados (Drive)

**Files:**
- Create: `src/components/hub/SubpastaExplorer.tsx`
- Create: `src/components/hub/TimelineDocumental.tsx`

**Step 1: Criar `SubpastaExplorer.tsx`**

```tsx
"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type DriveFile = {
  id: number;
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  isFolder: boolean | null;
  parentFileId: number | null;
  driveFolderId: string | null;
};

function buildTree(files: DriveFile[]): { roots: DriveFile[]; children: Map<number, DriveFile[]> } {
  const children = new Map<number, DriveFile[]>();
  const roots: DriveFile[] = [];

  for (const f of files) {
    if (f.parentFileId == null) {
      roots.push(f);
    } else {
      const list = children.get(f.parentFileId) ?? [];
      list.push(f);
      children.set(f.parentFileId, list);
    }
  }

  return { roots, children };
}

function FileNode({
  file,
  children,
  allChildren,
  depth = 0,
}: {
  file: DriveFile;
  children: DriveFile[];
  allChildren: Map<number, DriveFile[]>;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isFolder = file.isFolder;
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer group",
          { "cursor-default": !isFolder && !file.webViewLink }
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => {
          if (isFolder && hasChildren) setExpanded((e) => !e);
          else if (file.webViewLink) window.open(file.webViewLink, "_blank");
        }}
      >
        {isFolder ? (
          <>
            {hasChildren ? (
              expanded ? <ChevronDown className="h-3 w-3 text-zinc-400 shrink-0" /> : <ChevronRight className="h-3 w-3 text-zinc-400 shrink-0" />
            ) : (
              <span className="w-3 shrink-0" />
            )}
            {expanded ? (
              <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            ) : (
              <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 shrink-0" />
            <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          </>
        )}
        <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate flex-1">{file.name}</span>
        {!isFolder && file.webViewLink && (
          <ExternalLink className="h-3 w-3 text-zinc-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
        )}
      </div>
      {isFolder && expanded && hasChildren && (
        <div>
          {children.map((child) => (
            <FileNode
              key={child.id}
              file={child}
              children={allChildren.get(child.id) ?? []}
              allChildren={allChildren}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SubpastaExplorer({ files }: { files: DriveFile[] }) {
  const { roots, children } = buildTree(files);

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400">
        <Folder className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-[11px]">Nenhum arquivo no Drive</p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      {roots.map((f) => (
        <FileNode
          key={f.id}
          file={f}
          children={children.get(f.id) ?? []}
          allChildren={children}
        />
      ))}
    </div>
  );
}
```

**Step 2: Criar `TimelineDocumental.tsx`**

```tsx
"use client";

import { FileText, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type DriveFile = {
  id: number;
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  lastModifiedTime: string | null;
  isFolder: boolean | null;
  driveFolderId: string | null;
};

function groupByMonth(files: DriveFile[]): Map<string, DriveFile[]> {
  const map = new Map<string, DriveFile[]>();
  for (const f of files) {
    const key = f.lastModifiedTime
      ? format(parseISO(f.lastModifiedTime), "MMMM yyyy", { locale: ptBR })
      : "Sem data";
    const list = map.get(key) ?? [];
    list.push(f);
    map.set(key, list);
  }
  return map;
}

export function TimelineDocumental({ files }: { files: DriveFile[] }) {
  const onlyFiles = files.filter((f) => !f.isFolder);

  if (onlyFiles.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-[11px]">Nenhum documento na timeline</p>
      </div>
    );
  }

  const grouped = groupByMonth(onlyFiles);

  return (
    <div className="max-h-96 overflow-y-auto space-y-4">
      {Array.from(grouped.entries()).map(([month, monthFiles]) => (
        <div key={month}>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide px-1 mb-1.5">
            {month}
          </p>
          <div className="space-y-0.5">
            {monthFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800 group cursor-pointer"
                onClick={() => f.webViewLink && window.open(f.webViewLink, "_blank")}
              >
                <FileText className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate flex-1">
                  {f.name}
                </span>
                {f.lastModifiedTime && (
                  <span className="text-[10px] text-zinc-400 shrink-0">
                    {format(parseISO(f.lastModifiedTime), "dd/MM HH'h'mm", { locale: ptBR })}
                  </span>
                )}
                {f.webViewLink && (
                  <ExternalLink className="h-3 w-3 text-zinc-300 group-hover:text-emerald-500 shrink-0 transition-colors" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Verificar build**

```bash
npm run build 2>&1 | tail -20
```

**Step 4: Commit**

```bash
git add src/components/hub/SubpastaExplorer.tsx src/components/hub/TimelineDocumental.tsx
git commit -m "feat(hub): criar SubpastaExplorer e TimelineDocumental"
```

---

## Task 4: Reescrever página `/admin/assistidos/[id]`

**Files:**
- Modify: `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`

**Step 1: Ler o arquivo atual**

```bash
wc -l src/app/(dashboard)/admin/assistidos/[id]/page.tsx
```

**Step 2: Reescrever a página**

Substituir todo o conteúdo da página. A nova versão deve:

1. Usar `"use client"` no topo
2. Importar `trpc` e chamar `trpc.assistidos.getById.useQuery({ id })`
3. Mostrar loading skeleton enquanto `isLoading`
4. Mostrar `NOT_FOUND` se não encontrar
5. Implementar tabs com `useState<"processos" | "demandas" | "drive" | "audiencias">`
6. Cada tab recebe o slice correto do objeto enriquecido

```tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { ArrowLeft, Lock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubpastaExplorer } from "@/components/hub/SubpastaExplorer";
import { TimelineDocumental } from "@/components/hub/TimelineDocumental";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Tab = "processos" | "demandas" | "drive" | "audiencias";

export default function AssistidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("processos");

  const { data, isLoading, error } = trpc.assistidos.getById.useQuery(
    { id: Number(id) },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-zinc-200 rounded w-48" />
        <div className="h-4 bg-zinc-100 rounded w-32" />
        <div className="h-32 bg-zinc-100 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-zinc-500">
        <p className="text-sm">Assistido não encontrado.</p>
        <button onClick={() => router.back()} className="mt-2 text-xs text-emerald-600 hover:underline">
          ← Voltar
        </button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "processos", label: "Processos", count: data.processos.length },
    { key: "demandas", label: "Demandas", count: data.demandas.length },
    { key: "drive", label: "Drive", count: data.driveFiles.length },
    { key: "audiencias", label: "Audiências", count: data.audiencias.length },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {data.nome}
              {data.statusPrisional === "preso" && (
                <Lock className="h-3.5 w-3.5 text-rose-500" />
              )}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {data.cpf && (
                <span className="text-[11px] text-zinc-400 font-mono">{data.cpf}</span>
              )}
              {data.statusPrisional && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                  data.statusPrisional === "preso"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-zinc-100 text-zinc-600"
                )}>
                  {data.statusPrisional}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-100 dark:border-zinc-800 px-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors",
              tab === t.key
                ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "processos" && (
          <div className="space-y-2">
            {data.processos.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhum processo vinculado</p>
            ) : (
              data.processos.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/admin/processos/${p.id}`)}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:border-emerald-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-600">{p.numeroAutos ?? "Sem número"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                      p.papel === "REU" ? "bg-rose-100 text-rose-700"
                        : p.papel === "CORREU" ? "bg-amber-100 text-amber-700"
                        : p.papel === "VITIMA" ? "bg-blue-100 text-blue-700"
                        : "bg-zinc-100 text-zinc-600"
                    )}>
                      {p.papel?.toLowerCase() ?? "réu"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">{p.vara ?? ""}</p>
                  {p.assunto && <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{p.assunto}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "demandas" && (
          <div className="space-y-1.5">
            {data.demandas.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhuma demanda vinculada</p>
            ) : (
              data.demandas.map((d) => (
                <div key={d.id} className="flex items-center gap-2 border border-zinc-100 rounded px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate">{d.ato ?? d.tipoAto ?? "Demanda"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {d.defensorNome && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
                          {d.defensorNome}
                        </span>
                      )}
                      {d.prazo && (
                        <span className="text-[9px] text-zinc-400">
                          {format(new Date(d.prazo), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                    d.status === "5_FILA" ? "bg-zinc-100 text-zinc-500"
                      : d.status === "3_CONCLUIDO" ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  )}>
                    {d.status?.replace("5_", "").replace("3_", "") ?? "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "drive" && (
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Arquivos
              </p>
              <SubpastaExplorer files={data.driveFiles} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
                Timeline documental
              </p>
              <TimelineDocumental files={data.driveFiles} />
            </div>
          </div>
        )}

        {tab === "audiencias" && (
          <div className="space-y-2">
            {data.audiencias.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhuma audiência registrada</p>
            ) : (
              data.audiencias.map((a) => (
                <div key={a.id} className="border border-zinc-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-700">{a.tipo ?? "Audiência"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      a.dataAudiencia && new Date(a.dataAudiencia) < new Date()
                        ? "bg-zinc-100 text-zinc-500"
                        : "bg-emerald-100 text-emerald-700"
                    )}>
                      {a.dataAudiencia && new Date(a.dataAudiencia) < new Date() ? "Realizada" : "Futura"}
                    </span>
                  </div>
                  {a.dataAudiencia && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {format(new Date(a.dataAudiencia), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })}
                    </p>
                  )}
                  {a.local && <p className="text-[11px] text-zinc-400">{a.local}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Verificar build**

```bash
npm run build 2>&1 | tail -30
```

**Step 4: Commit**

```bash
git add src/app/(dashboard)/admin/assistidos/[id]/page.tsx
git commit -m "feat(assistidos): substituir mock data por hub real com tabs integradas"
```

---

## Task 5: Reescrever página `/admin/processos/[id]`

**Files:**
- Modify: `src/app/(dashboard)/admin/processos/[id]/page.tsx`

**Step 1: Substituir a página por versão com dados reais**

Mesma estrutura da Task 4, adaptada para processo:

```tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";
import { ArrowLeft, Lock, Scale, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubpastaExplorer } from "@/components/hub/SubpastaExplorer";
import { TimelineDocumental } from "@/components/hub/TimelineDocumental";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Tab = "partes" | "demandas" | "drive" | "audiencias" | "vinculados";

export default function ProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("partes");

  const { data, isLoading, error } = trpc.processos.getById.useQuery(
    { id: Number(id) },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-6 bg-zinc-200 rounded w-64" />
        <div className="h-4 bg-zinc-100 rounded w-40" />
        <div className="h-32 bg-zinc-100 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-zinc-500">
        <p className="text-sm">Processo não encontrado.</p>
        <button onClick={() => router.back()} className="mt-2 text-xs text-emerald-600 hover:underline">
          ← Voltar
        </button>
      </div>
    );
  }

  const showVinculados = data.processosVinculados.length > 0;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "partes", label: "Partes", count: data.assistidos.length },
    { key: "demandas", label: "Demandas", count: data.demandas.length },
    { key: "drive", label: "Drive", count: data.driveFiles.length },
    { key: "audiencias", label: "Audiências", count: data.audiencias.length },
    ...(showVinculados ? [{ key: "vinculados" as Tab, label: "Vinculados", count: data.processosVinculados.length }] : []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 mb-3 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
            <Scale className="h-5 w-5 text-zinc-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              {data.numeroAutos ?? "Sem número"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {data.vara && <span className="text-[11px] text-zinc-400">{data.vara}</span>}
              {data.assunto && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  {data.assunto}
                </span>
              )}
              {data.situacao && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {data.situacao}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-zinc-100 dark:border-zinc-800 px-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors",
              tab === t.key
                ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            )}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "partes" && (
          <div className="space-y-2">
            {data.assistidos.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhuma parte vinculada</p>
            ) : (
              data.assistidos.map((a) => (
                <div
                  key={a.id}
                  onClick={() => router.push(`/admin/assistidos/${a.id}`)}
                  className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">{a.nome}</span>
                        {a.statusPrisional === "preso" && (
                          <Lock className="h-3 w-3 text-rose-500 shrink-0" />
                        )}
                      </div>
                      {a.cpf && <p className="text-[10px] font-mono text-zinc-400">{a.cpf}</p>}
                    </div>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                      a.papel === "REU" ? "bg-rose-100 text-rose-700"
                        : a.papel === "CORREU" ? "bg-amber-100 text-amber-700"
                        : a.papel === "VITIMA" ? "bg-blue-100 text-blue-700"
                        : "bg-zinc-100 text-zinc-600"
                    )}>
                      {a.papel?.toLowerCase() ?? "réu"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "demandas" && (
          <div className="space-y-1.5">
            {data.demandas.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhuma demanda</p>
            ) : (
              data.demandas.map((d) => (
                <div key={d.id} className="flex items-center gap-2 border border-zinc-100 rounded px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-700 truncate">{d.ato ?? d.tipoAto ?? "Demanda"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {d.defensorNome && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-zinc-100 text-zinc-600 rounded-full">
                          {d.defensorNome}
                        </span>
                      )}
                      {d.assistidoNome && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                          {d.assistidoNome}
                        </span>
                      )}
                      {d.prazo && (
                        <span className="text-[9px] text-zinc-400">
                          {format(new Date(d.prazo), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "drive" && (
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Arquivos</p>
              <SubpastaExplorer files={data.driveFiles} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Timeline documental</p>
              <TimelineDocumental files={data.driveFiles} />
            </div>
          </div>
        )}

        {tab === "audiencias" && (
          <div className="space-y-2">
            {data.audiencias.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Nenhuma audiência registrada</p>
            ) : (
              data.audiencias.map((a) => (
                <div key={a.id} className="border border-zinc-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-700">{a.tipo ?? "Audiência"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      a.dataAudiencia && new Date(a.dataAudiencia) < new Date()
                        ? "bg-zinc-100 text-zinc-500"
                        : "bg-emerald-100 text-emerald-700"
                    )}>
                      {a.dataAudiencia && new Date(a.dataAudiencia) < new Date() ? "Realizada" : "Futura"}
                    </span>
                  </div>
                  {a.dataAudiencia && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {format(new Date(a.dataAudiencia), "dd/MM/yyyy 'às' HH'h'mm", { locale: ptBR })}
                    </p>
                  )}
                  {a.local && <p className="text-[11px] text-zinc-400">{a.local}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "vinculados" && (
          <div className="space-y-2">
            {data.processosVinculados.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/admin/processos/${p.id}`)}
                className="border border-zinc-200 rounded-lg p-3 hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all"
              >
                <p className="text-[11px] font-mono text-zinc-700">{p.numeroAutos ?? "Sem número"}</p>
                {p.vara && <p className="text-[11px] text-zinc-400 mt-0.5">{p.vara}</p>}
                {p.assunto && <p className="text-[10px] text-zinc-400 truncate">{p.assunto}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verificar build**

```bash
npm run build 2>&1 | tail -30
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/processos/[id]/page.tsx
git commit -m "feat(processos): substituir mock data por hub real com tabs integradas"
```

---

## Task 6: Verificação final

**Step 1: Build limpo**

```bash
npm run build 2>&1 | grep -E "error|Error|warning" | head -20
```

Expected: sem erros de TypeScript ou build.

**Step 2: Verificar páginas via curl**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/assistidos/1
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin/processos/1
```

Expected: 200 (ou 307 se redirecionar para login — normal em ambiente local sem sessão).

**Step 3: Commit final de docs**

```bash
git add docs/plans/
git commit -m "docs: design doc e plano hub assistido/processo"
```

**Step 4: Push**

```bash
git push origin main
```

---

## Checklist Final

- [ ] `assistidos.getById` retorna processos, demandas, audiencias, driveFiles
- [ ] `processos.getById` retorna assistidos (partes), demandas, audiencias, driveFiles, processosVinculados
- [ ] `SubpastaExplorer` constrói árvore do Drive no cliente
- [ ] `TimelineDocumental` agrupa arquivos por mês
- [ ] Página assistido: tabs Processos | Demandas | Drive | Audiências com dados reais
- [ ] Página processo: tabs Partes | Demandas | Drive | Audiências | Vinculados (condicional)
- [ ] Navegação bidirecional: assistido → processo → assistido
- [ ] Loading skeletons enquanto carrega
- [ ] Empty states para cada tab
- [ ] Build sem erros
