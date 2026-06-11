# Autos inteligentes (Fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Acabar com a aba "Autos" vazia: casar os PDFs do assistido com o processo da audiência/demanda, exibindo em 3 grupos (Deste processo / Correlacionados / Outros do assistido) e auto-vinculando só os de CNJ idêntico.

**Architecture:** Lógica de match pura e testável em `src/lib/match-autos.ts`; uma procedure tRPC `drive.autosDoProcesso` que busca os arquivos, classifica e faz o auto-vínculo confiante; UI consome essa procedure no `DocumentosBlock` (agenda) e no `DemandaQuickPreview`.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, Postgres (Supabase), vitest, React/Tailwind.

**Spec:** `docs/plans/2026-06-11-autos-atos-por-tipo-design.md`

---

### Task 1: Lógica de match (puro + testes)

**Files:**
- Create: `src/lib/match-autos.ts`
- Test: `src/lib/__tests__/match-autos.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/match-autos.test.ts
import { describe, it, expect } from "vitest";
import { extrairCNJ, classificarAutos } from "../match-autos";

const f = (id: number, name: string, extra: Partial<{ processoId: number | null }> = {}) => ({
  id, driveFileId: `d${id}`, name, mimeType: "application/pdf",
  processoId: extra.processoId ?? null,
});

describe("extrairCNJ", () => {
  it("extrai CNJ do nome do arquivo dos autos", () => {
    expect(extrairCNJ("8008255-33.2024.8.05.0039-178...-processo.pdf"))
      .toBe("8008255-33.2024.8.05.0039");
  });
  it("retorna null sem CNJ", () => {
    expect(extrairCNJ("Relatorio de analise.pdf")).toBeNull();
    expect(extrairCNJ(null)).toBeNull();
  });
});

describe("classificarAutos", () => {
  const base = {
    processoId: 187,
    processoCNJ: "8008255-33.2024.8.05.0039",
    correlatos: [{ cnj: "8006774-35.2024.8.05.0039", classe: "Prisão Temporária" }],
  };

  it("agrupa por CNJ: deste processo, correlacionado, outro", () => {
    const files = [
      f(1, "8008255-33.2024.8.05.0039-x-processo.pdf"),  // deste processo
      f(2, "IP 8006774-35.2024.8.05.0039-y-processo.pdf"), // correlacionado
      f(3, "8099999-99.2019.8.05.0039-antigo.pdf"),       // outro
      f(4, "Laudo sem cnj.pdf"),                           // outro (sem CNJ)
      f(5, "qualquer.pdf", { processoId: 187 }),           // deste processo (já vinculado)
    ];
    const r = classificarAutos({ ...base, files });
    expect(r.desteProcesso.map((x) => x.id).sort()).toEqual([1, 5]);
    expect(r.correlacionados).toHaveLength(1);
    expect(r.correlacionados[0].cnj).toBe("8006774-35.2024.8.05.0039");
    expect(r.correlacionados[0].files.map((x) => x.id)).toEqual([2]);
    expect(r.outros.map((x) => x.id).sort()).toEqual([3, 4]);
  });

  it("particiona: cada arquivo em exatamente um grupo", () => {
    const files = [f(1, "8008255-33.2024.8.05.0039.pdf"), f(2, "x.pdf"), f(3, "IP 8006774-35.2024.8.05.0039.pdf")];
    const r = classificarAutos({ ...base, files });
    const total = r.desteProcesso.length + r.correlacionados.reduce((n, g) => n + g.files.length, 0) + r.outros.length;
    expect(total).toBe(files.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/match-autos.test.ts`
Expected: FAIL ("Cannot find module '../match-autos'").

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/match-autos.ts
/** Casa os PDFs do assistido com o processo da audiência/demanda. Lógica pura. */

const CNJ_RE = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

export interface AutoFile {
  id: number;
  driveFileId: string;
  name?: string | null;
  mimeType?: string | null;
  webViewLink?: string | null;
  fileSize?: number | string | null;
  enrichmentStatus?: string | null;
  processoId?: number | null;
}

export interface Correlato {
  cnj: string;
  classe?: string | null;
}

export interface GrupoCorrelato<T> {
  cnj: string;
  classe?: string | null;
  files: T[];
}

export interface ClassificacaoAutos<T> {
  desteProcesso: T[];
  correlacionados: GrupoCorrelato<T>[];
  outros: T[];
}

export function extrairCNJ(nome: string | null | undefined): string | null {
  if (!nome) return null;
  const m = nome.match(CNJ_RE);
  return m ? m[0] : null;
}

const soDigitos = (s: string | null) => (s ? s.replace(/\D/g, "") : "");

export function classificarAutos<T extends AutoFile>(opts: {
  files: T[];
  processoId: number;
  processoCNJ: string | null;
  correlatos: Correlato[];
}): ClassificacaoAutos<T> {
  const alvo = soDigitos(opts.processoCNJ);
  const correlMap = new Map<string, Correlato>();
  for (const c of opts.correlatos) correlMap.set(soDigitos(c.cnj), c);

  const desteProcesso: T[] = [];
  const outros: T[] = [];
  const correlGroups = new Map<string, GrupoCorrelato<T>>();

  for (const file of opts.files) {
    const cnjFile = soDigitos(extrairCNJ(file.name));
    if (file.processoId === opts.processoId || (alvo && cnjFile === alvo)) {
      desteProcesso.push(file);
    } else if (cnjFile && correlMap.has(cnjFile)) {
      const meta = correlMap.get(cnjFile)!;
      const g = correlGroups.get(cnjFile) ?? { cnj: meta.cnj, classe: meta.classe, files: [] };
      g.files.push(file);
      correlGroups.set(cnjFile, g);
    } else {
      outros.push(file);
    }
  }

  return { desteProcesso, correlacionados: [...correlGroups.values()], outros };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/match-autos.test.ts`
Expected: PASS (todos os testes verdes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/match-autos.ts src/lib/__tests__/match-autos.test.ts
git commit -m "feat(autos): lógica de match CNJ (deste processo/correlacionados/outros)"
```

---

### Task 2: Procedure tRPC `drive.autosDoProcesso` (+ auto-vínculo)

**Files:**
- Modify: `src/lib/trpc/routers/drive.ts` (adicionar procedure perto de `filesByProcesso`; garantir imports)

- [ ] **Step 1: Garantir imports no topo de `src/lib/trpc/routers/drive.ts`**

Confirme que existem (adicione os que faltarem ao import existente):
- de `drizzle-orm`: `and`, `or`, `ne`, `inArray`, `eq`, `desc`
- do schema: `processos` (mesma origem de `driveFiles`; ex.: `import { driveFiles, processos } from "@/lib/db/schema"` conforme o padrão já usado no arquivo)

Run para checar o que já está importado: `grep -nE "from \"drizzle-orm\"|processos|driveFiles" src/lib/trpc/routers/drive.ts | head`

- [ ] **Step 2: Adicionar a procedure (logo após `filesByProcesso`)**

```ts
  autosDoProcesso: protectedProcedure
    .input(z.object({ processoId: z.number(), assistidoId: z.number().nullish() }))
    .query(async ({ input }) => {
      return safeAsync(async () => {
        const [proc] = await db
          .select({
            id: processos.id,
            numeroAutos: processos.numeroAutos,
            casoId: processos.casoId,
            assistidoId: processos.assistidoId,
            driveFolderId: processos.driveFolderId,
          })
          .from(processos)
          .where(eq(processos.id, input.processoId))
          .limit(1);

        if (!proc) return { desteProcesso: [], correlacionados: [], outros: [] };

        const assistidoId = input.assistidoId ?? proc.assistidoId ?? null;

        // Irmãos do mesmo caso = CNJs correlacionados (conexos do caso, não antecedentes)
        const correlatos = proc.casoId
          ? await db
              .select({ numeroAutos: processos.numeroAutos, classe: processos.classeProcessual })
              .from(processos)
              .where(and(eq(processos.casoId, proc.casoId), ne(processos.id, proc.id)))
          : [];

        // PDFs do assistido + os já vinculados a este processo
        const cond = assistidoId
          ? or(eq(driveFiles.assistidoId, assistidoId), eq(driveFiles.processoId, proc.id))
          : eq(driveFiles.processoId, proc.id);
        const files = await db
          .select()
          .from(driveFiles)
          .where(and(cond, eq(driveFiles.mimeType, "application/pdf")))
          .orderBy(desc(driveFiles.lastModifiedTime));

        const grupos = classificarAutos({
          files,
          processoId: proc.id,
          processoCNJ: proc.numeroAutos,
          correlatos: correlatos.map((c) => ({ cnj: c.numeroAutos, classe: c.classe })),
        });

        // Auto-vínculo silencioso: só "deste processo" ainda não vinculado
        const idsParaVincular = grupos.desteProcesso
          .filter((f) => f.processoId !== proc.id)
          .map((f) => f.id);
        if (idsParaVincular.length > 0) {
          try {
            await db.update(driveFiles).set({ processoId: proc.id }).where(inArray(driveFiles.id, idsParaVincular));
            if (!proc.driveFolderId) {
              const folderId = (grupos.desteProcesso.find((f) => (f as any).driveFolderId)?.["driveFolderId" as keyof typeof grupos.desteProcesso[number]] ?? null) as string | null;
              if (folderId) {
                await db.update(processos).set({ driveFolderId: folderId }).where(eq(processos.id, proc.id));
              }
            }
          } catch (e) {
            console.error("[autosDoProcesso] auto-vínculo falhou:", e);
          }
        }

        return grupos;
      }, "Erro ao listar autos do processo");
    }),
```

> Nota: `classificarAutos` precisa ser importado no topo: `import { classificarAutos } from "@/lib/match-autos";`. O retorno preserva todos os campos da linha `driveFiles` (incl. `driveFileId`, `driveFolderId`, `webViewLink`, `fileSize`, `enrichmentStatus`), pois `.select()` traz a linha completa.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "routers/drive.ts|match-autos" | head`
Expected: vazio (sem erros novos nesses arquivos).

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/drive.ts
git commit -m "feat(autos): procedure autosDoProcesso com auto-vínculo confiante (CNJ idêntico)"
```

---

### Task 3: UI — aba "Autos" do `DocumentosBlock` (agenda) em 3 grupos

**Files:**
- Modify: `src/components/agenda/sheet/documentos-block.tsx`

- [ ] **Step 1: Trocar a fonte da aba Autos para `autosDoProcesso`**

Substituir a query `autos` existente:

```ts
// antes:
// const autos = trpc.drive.filesByProcesso.useQuery({ processoId: processoId ?? 0 }, { enabled: !!processoId });
const autos = trpc.drive.autosDoProcesso.useQuery(
  { processoId: processoId ?? 0, assistidoId: assistidoId ?? undefined },
  { enabled: !!processoId },
);
```

E derivar a lista achatada da aba "autos" (para a busca/contagem existentes) a partir dos grupos, preservando a ordem Deste processo → Correlacionados → Outros:

```ts
const autosGrupos = (autos.data as
  | { desteProcesso: DriveFileLite[]; correlacionados: { cnj: string; classe?: string | null; files: DriveFileLite[] }[]; outros: DriveFileLite[] }
  | undefined) ?? { desteProcesso: [], correlacionados: [], outros: [] };
const autosList: DriveFileLite[] = [
  ...autosGrupos.desteProcesso,
  ...autosGrupos.correlacionados.flatMap((g) => g.files),
  ...autosGrupos.outros,
];
```

(Manter `assistidoList` como está, vindo de `filesByAssistido`.)

- [ ] **Step 2: Renderizar os 3 grupos quando a aba ativa for "autos"**

No bloco que renderiza `activeList` (a lista de `DocumentosItem`), quando `tab === "autos"` e há grupos, renderizar com cabeçalhos de grupo (colapsáveis). Substituir o `activeList.map(...)` por um helper:

```tsx
{tab === "autos" ? (
  <div className="space-y-2">
    {autosGrupos.desteProcesso.length > 0 && (
      <GrupoAutos titulo="Deste processo" files={autosGrupos.desteProcesso}
        openId={openId} setOpenId={setOpenId} onExpand={setExpanded} defaultOpen />
    )}
    {autosGrupos.correlacionados.map((g) => (
      <GrupoAutos key={g.cnj} titulo={`Correlacionado · ${g.classe ?? "Processo"} ${g.cnj}`}
        files={g.files} openId={openId} setOpenId={setOpenId} onExpand={setExpanded} />
    ))}
    {autosGrupos.outros.length > 0 && (
      <GrupoAutos titulo="Outros do assistido" files={autosGrupos.outros}
        openId={openId} setOpenId={setOpenId} onExpand={setExpanded} />
    )}
    {autosList.length === 0 && driveConnected && (
      <p className="text-[11px] text-neutral-400 italic py-4 text-center">
        Nenhum arquivo nesta pasta. Arraste um acima.
      </p>
    )}
  </div>
) : (
  /* aba Assistido: manter o map atual de activeList */
  activeList.length > 0 && (
    <div className="space-y-1.5">
      {activeList.map((fl) => (
        <DocumentosItem key={fl.driveFileId} file={fl}
          isOpen={openId === fl.driveFileId}
          onToggle={() => setOpenId(openId === fl.driveFileId ? null : fl.driveFileId)}
          onExpand={setExpanded} />
      ))}
    </div>
  )
)}
```

E adicionar o componente de grupo no fim do arquivo:

```tsx
function GrupoAutos({
  titulo, files, openId, setOpenId, onExpand, defaultOpen = false,
}: {
  titulo: string;
  files: DriveFileLite[];
  openId: string | null;
  setOpenId: (id: string | null) => void;
  onExpand: (f: DriveFileLite) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 cursor-pointer">
        <span>{titulo} <span className="text-neutral-400 font-normal">{files.length}</span></span>
        <span className="text-neutral-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="px-1.5 pb-1.5 space-y-1.5">
          {files.map((fl) => (
            <DocumentosItem key={fl.driveFileId} file={fl}
              isOpen={openId === fl.driveFileId}
              onToggle={() => setOpenId(openId === fl.driveFileId ? null : fl.driveFileId)}
              onExpand={onExpand} />
          ))}
        </div>
      )}
    </div>
  );
}
```

> `useState` já é importado no arquivo. A busca (`query`) sobre `rawList` continua funcionando para a aba Assistido; para Autos, a busca pode ser aplicada filtrando dentro de cada grupo numa iteração futura (fora do escopo desta task — manter simples).

- [ ] **Step 3: Typecheck + compile**

Run: `npx tsc --noEmit 2>&1 | grep documentos-block | head` → vazio.
Run (dev server no ar): `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/agenda` → 200.

- [ ] **Step 4: Verificação manual (browser, sessão mintada)**

Abrir o sheet de uma audiência de um dos casos com "Autos vazio" (ex.: Francisco Lima dos Santos Oliveira, proc 636; ou Erivelton, proc 2523) → a aba **Autos** agora mostra "Deste processo" (após auto-vínculo) e/ou "Outros do assistido". Confirmar que não fica mais "Nenhum arquivo".

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/documentos-block.tsx
git commit -m "feat(autos): aba Autos em 3 grupos (deste processo/correlacionados/outros) na sheet da agenda"
```

---

### Task 4: UI — `DemandaQuickPreview` usa `autosDoProcesso` para ordenar/rotular

**Files:**
- Modify: `src/components/demandas-premium/DemandaQuickPreview.tsx`

- [ ] **Step 1: Buscar autos agrupados quando há processoId**

Adicionar, perto da derivação de `previewFiles` (já existente):

```ts
const { data: autosAgrupados } = trpc.drive.autosDoProcesso.useQuery(
  { processoId: demanda?.processoId ?? 0, assistidoId: demanda?.assistidoId ?? undefined },
  { enabled: !!demanda?.processoId && open },
);
```

- [ ] **Step 2: Priorizar "Deste processo" no `previewFiles`**

Ajustar o `useMemo` de `previewFiles` para, quando houver `autosAgrupados`, usar a ordem Deste processo → Correlacionados → Outros (e cair no comportamento atual quando não houver):

```ts
const previewFiles: PreviewFile[] = useMemo(() => {
  const toPF = (f: any): PreviewFile => ({
    driveFileId: f.driveFileId, name: f.name, mimeType: f.mimeType,
    webViewLink: f.webViewLink, fileSize: f.fileSize, enrichmentStatus: f.enrichmentStatus,
  });
  if (autosAgrupados) {
    const ordered = [
      ...autosAgrupados.desteProcesso,
      ...autosAgrupados.correlacionados.flatMap((g: any) => g.files),
      ...autosAgrupados.outros,
    ];
    const seen = new Set<string>();
    const dedup = ordered.filter((f: any) => f.driveFileId && !seen.has(f.driveFileId) && seen.add(f.driveFileId));
    return dedup.map(toPF);
  }
  // fallback atual (autosFilesData + pdfFiles + rankAutos) permanece
  const autos = ((autosFilesData as any[]) ?? []).filter((f) => f.mimeType === "application/pdf");
  const merged = [...autos, ...pdfFiles];
  const seen = new Set<string>();
  const dedup: any[] = [];
  for (const f of merged) if (f.driveFileId && !seen.has(f.driveFileId)) { seen.add(f.driveFileId); dedup.push(f); }
  return rankAutos(dedup).map(toPF);
}, [autosAgrupados, autosFilesData, pdfFiles]);
```

O card "Ver autos" (já existente) continua usando `previewFiles[0]` como destaque — agora garantidamente o auto deste processo.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep DemandaQuickPreview | head` → vazio.

- [ ] **Step 4: Commit**

```bash
git add src/components/demandas-premium/DemandaQuickPreview.tsx
git commit -m "feat(autos): DemandaQuickPreview prioriza autos deste processo via autosDoProcesso"
```

---

## Fora desta fase (Plano 2 — Fase 2)
Aba "Atos" (sistematização por tipo reusando `SectionsViewer`) + deep-link `#page` no visualizador + botão "Sistematizar". Spec na seção Fase 2 do design.

## Self-review (preenchido)
- **Cobertura do spec (Fase 1):** match (Task 1) ✓, procedure + auto-vínculo confiante (Task 2) ✓, 3 grupos na UI agenda (Task 3) ✓, demanda prioriza deste processo (Task 4) ✓. Correlacionados via `casoId` ✓.
- **Placeholders:** nenhum; código completo em cada step.
- **Consistência de tipos:** `classificarAutos`/`AutoFile`/`ClassificacaoAutos` idênticos entre Task 1 (def) e Task 2/3/4 (uso); `desteProcesso/correlacionados/outros` consistentes.
- **Ambiguidade:** busca textual na aba Autos fica só na aba Assistido nesta fase (decisão explícita no Step 2 da Task 3).
