# Agenda Fase 4 · Povoamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar empty states passivos por CTAs que enfileiram análise IA via `trpc.analise.criarTask` (já existente), adicionar link explícito `testemunhas.audioDriveFileId` substituindo a heurística da Fase 2, e mostrar badges de frescor (`processos.analyzedAt`).

**Architecture:** 1 coluna nova + 1 mutation tRPC nova + 3 componentes novos + 2 helpers + atualização do helper da Fase 2. Toda enfileiramento consome `trpc.analise.criarTask` e polling usa `trpc.audiencias.getAudienciaContext` refetch.

**Tech Stack:** React 19 · Next.js 15 · tRPC · Drizzle ORM · PostgreSQL · Radix Popover · Vitest + RTL + happy-dom.

**Spec de referência:** `docs/plans/2026-04-16-agenda-fase4-povoamento-design.md`

---

## File Structure

```
src/
├── lib/db/schema/agenda.ts                   [modify: +audioDriveFileId em testemunhas]
├── lib/trpc/routers/audiencias.ts            [modify: +vincularAudioDepoente mutation]
├── lib/agenda/
│   ├── freshness-label.ts                    [new pure helper]
│   └── match-depoente-audio.ts               [modify: +explicitAudioId param]
├── components/agenda/sheet/
│   ├── analyze-cta.tsx                       [new]
│   ├── freshness-badge.tsx                   [new]
│   └── vincular-audio-popover.tsx            [new]
├── components/agenda/sheet/depoente-card-v2.tsx  [modify: +botão vincular áudio]
└── components/agenda/event-detail-sheet.tsx  [modify: wire CTAs + freshness + explicit audio]

drizzle/
└── NNNN_testemunha_audio_link.sql            [new migration, applied via node script]

__tests__/
├── unit/
│   ├── freshness-label.test.ts               [new]
│   └── match-depoente-audio.test.ts          [modify: +2 novos casos]
├── components/
│   ├── analyze-cta.test.tsx                  [new]
│   ├── freshness-badge.test.tsx              [new]
│   └── vincular-audio-popover.test.tsx       [new]
└── trpc/audiencias-mutations.test.ts         [modify: +vincularAudioDepoente tests]
```

---

## Task 1: Schema migration — `testemunhas.audioDriveFileId`

**Files:**
- Modify: `src/lib/db/schema/agenda.ts`
- Create: `drizzle/NNNN_testemunha_audio_link.sql`

- [ ] **Step 1: Adicionar coluna ao schema Drizzle**

Em `src/lib/db/schema/agenda.ts`, no `pgTable("testemunhas", {...})`, depois de `sinteseJuizo: text("sintese_juizo"),` (adicionada em Fase 1), inserir:

```ts
  audioDriveFileId: varchar("audio_drive_file_id", { length: 100 }),
```

- [ ] **Step 2: Criar SQL manual**

Descobrir próximo número de migration:

Run: `ls -1 /Users/rodrigorochameire/projetos/Defender/drizzle/*.sql | tail -3`

Use o próximo número sequencial (ex: se último for `0028_*`, criar `0029_testemunha_audio_link.sql`).

Criar `drizzle/NNNN_testemunha_audio_link.sql` com conteúdo:

```sql
ALTER TABLE "testemunhas" ADD COLUMN IF NOT EXISTS "audio_drive_file_id" varchar(100);
```

- [ ] **Step 3: Aplicar no DB via script node**

Criar `/tmp/apply-testemunha-audio.mjs`:

```js
import { readFileSync } from "node:fs";
import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const file = process.argv[2];
const content = readFileSync(file, "utf-8");
const stmts = content.split(";").map(s => s.trim()).filter(Boolean);
for (const s of stmts) {
  console.log("Exec:", s.slice(0, 80));
  await sql.unsafe(s);
}
const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'testemunhas' AND column_name = 'audio_drive_file_id'
`;
console.log("Verified:", cols);
await sql.end();
```

Se `postgres` não estiver no node_modules, usar `pg` (ambos os padrões do Fase 1 funcionam).

Executar: `cd ~/projetos/Defender && node /tmp/apply-testemunha-audio.mjs drizzle/NNNN_testemunha_audio_link.sql`

Esperado: `[{ column_name: "audio_drive_file_id" }]` na saída.

- [ ] **Step 4: Limpar**

Run: `rm /tmp/apply-testemunha-audio.mjs`

- [ ] **Step 5: Typecheck**

Run: `cd ~/projetos/Defender && npm run typecheck`
Expected: 0 novos erros.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/agenda.ts drizzle/*_testemunha_audio_link.sql
git commit -m "feat(agenda): add testemunhas.audioDriveFileId column"
```

---

## Task 2: Mutation `vincularAudioDepoente` (TDD)

**Files:**
- Modify: `src/lib/trpc/routers/audiencias.ts`
- Modify: `__tests__/trpc/audiencias-mutations.test.ts`

- [ ] **Step 1: Adicionar teste**

Append ao `__tests__/trpc/audiencias-mutations.test.ts`:

```ts
describe("audiencias.vincularAudioDepoente", { timeout: 30000 }, () => {
  it("grava audioDriveFileId quando informado", async () => {
    const [user] = await db.insert(users).values({
      name: "User VAD",
      email: `vad-${Date.now()}@test.local`,
      workspaceId: 1,
    } as any).returning();
    const { testemunha, processo, assistido } = await seedTestemunha(user);
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.vincularAudioDepoente({
        depoenteId: testemunha.id,
        audioDriveFileId: "drive-file-abc",
      });
      const [row] = await db.select().from(testemunhas).where(eq(testemunhas.id, testemunha.id));
      expect(row.audioDriveFileId).toBe("drive-file-abc");
    } finally {
      await cleanupTestemunha({ testemunhaId: testemunha.id, processoId: processo.id, assistidoId: assistido.id });
      await db.delete(users).where(eq(users.id, user.id));
    }
  });

  it("desvincula quando audioDriveFileId é null", async () => {
    const [user] = await db.insert(users).values({
      name: "User VAD2",
      email: `vad2-${Date.now()}@test.local`,
      workspaceId: 1,
    } as any).returning();
    const { testemunha, processo, assistido } = await seedTestemunha(user);
    try {
      const caller = createCaller(mkCtx(user));
      await caller.audiencias.vincularAudioDepoente({
        depoenteId: testemunha.id,
        audioDriveFileId: "drive-abc",
      });
      await caller.audiencias.vincularAudioDepoente({
        depoenteId: testemunha.id,
        audioDriveFileId: null,
      });
      const [row] = await db.select().from(testemunhas).where(eq(testemunhas.id, testemunha.id));
      expect(row.audioDriveFileId).toBeNull();
    } finally {
      await cleanupTestemunha({ testemunhaId: testemunha.id, processoId: processo.id, assistidoId: assistido.id });
      await db.delete(users).where(eq(users.id, user.id));
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/trpc/audiencias-mutations.test.ts`
Expected: 2 novos FAIL.

- [ ] **Step 3: Implementar mutation**

Em `src/lib/trpc/routers/audiencias.ts`, adicionar (perto das outras mutations de depoente):

```ts
  vincularAudioDepoente: protectedProcedure
    .input(z.object({
      depoenteId: z.number(),
      audioDriveFileId: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(testemunhas)
        .set({
          audioDriveFileId: input.audioDriveFileId,
          updatedAt: new Date(),
        })
        .where(eq(testemunhas.id, input.depoenteId))
        .returning();
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Depoente não encontrado" });
      }
      return row;
    }),
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test __tests__/trpc/audiencias-mutations.test.ts`
Expected: todos anteriores + 2 novos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/audiencias.ts __tests__/trpc/audiencias-mutations.test.ts
git commit -m "feat(audiencias): vincularAudioDepoente mutation"
```

---

## Task 3: `freshnessLabel` helper (TDD)

**Files:**
- Create: `src/lib/agenda/freshness-label.ts`
- Create: `__tests__/unit/freshness-label.test.ts`

- [ ] **Step 1: Escrever teste**

```ts
// __tests__/unit/freshness-label.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { freshnessLabel } from "@/lib/agenda/freshness-label";

describe("freshnessLabel", () => {
  const NOW = new Date("2026-04-16T12:00:00Z");

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it("null retorna null", () => {
    expect(freshnessLabel(null)).toBeNull();
    expect(freshnessLabel(undefined)).toBeNull();
  });

  it("< 1h retorna agora / emerald", () => {
    const t = new Date(NOW.getTime() - 30 * 60 * 1000); // 30 min atrás
    expect(freshnessLabel(t)).toEqual({ label: "agora", tone: "emerald" });
  });

  it("< 24h retorna hoje / emerald", () => {
    const t = new Date(NOW.getTime() - 6 * 60 * 60 * 1000);
    expect(freshnessLabel(t)).toEqual({ label: "hoje", tone: "emerald" });
  });

  it("< 7d retorna Nd atrás / neutral", () => {
    const t = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(freshnessLabel(t)).toEqual({ label: "3d atrás", tone: "neutral" });
  });

  it("entre 7d e 30d retorna Nd atrás / amber", () => {
    const t = new Date(NOW.getTime() - 15 * 24 * 60 * 60 * 1000);
    expect(freshnessLabel(t)).toEqual({ label: "15d atrás", tone: "amber" });
  });

  it(">= 30d retorna Nd · reanalisar? / rose", () => {
    const t = new Date(NOW.getTime() - 45 * 24 * 60 * 60 * 1000);
    expect(freshnessLabel(t)).toEqual({ label: "45d · reanalisar?", tone: "rose" });
  });

  it("data inválida retorna null", () => {
    expect(freshnessLabel("not-a-date")).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/unit/freshness-label.test.ts`

- [ ] **Step 3: Implementar**

```ts
// src/lib/agenda/freshness-label.ts
export interface FreshnessOutput {
  label: string;
  tone: "emerald" | "neutral" | "amber" | "rose";
}

export function freshnessLabel(analyzedAt?: Date | string | null): FreshnessOutput | null {
  if (!analyzedAt) return null;
  const ts = new Date(analyzedAt).getTime();
  if (Number.isNaN(ts)) return null;
  const deltaMs = Date.now() - ts;
  const h = deltaMs / 3_600_000;
  const d = h / 24;

  if (h < 1) return { label: "agora", tone: "emerald" };
  if (h < 24) return { label: "hoje", tone: "emerald" };
  if (d < 7) return { label: `${Math.floor(d)}d atrás`, tone: "neutral" };
  if (d < 30) return { label: `${Math.floor(d)}d atrás`, tone: "amber" };
  return { label: `${Math.floor(d)}d · reanalisar?`, tone: "rose" };
}
```

- [ ] **Step 4: Run — expect 7 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda/freshness-label.ts __tests__/unit/freshness-label.test.ts
git commit -m "feat(agenda): freshnessLabel helper"
```

---

## Task 4: `FreshnessBadge` component (TDD)

**Files:**
- Create: `src/components/agenda/sheet/freshness-badge.tsx`
- Create: `__tests__/components/freshness-badge.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// __tests__/components/freshness-badge.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FreshnessBadge } from "@/components/agenda/sheet/freshness-badge";

afterEach(() => cleanup());

describe("FreshnessBadge", () => {
  const NOW = new Date("2026-04-16T12:00:00Z");

  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it("retorna null quando analyzedAt vazio", () => {
    const { container } = render(<FreshnessBadge analyzedAt={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza hoje com classe emerald", () => {
    const recent = new Date(NOW.getTime() - 60 * 60 * 1000);
    const { container } = render(<FreshnessBadge analyzedAt={recent.toISOString()} />);
    expect(screen.getByText("hoje")).toBeInTheDocument();
    expect(container.firstElementChild?.className ?? "").toMatch(/emerald/);
  });

  it("renderiza Nd atrás neutral (2d)", () => {
    const old = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);
    render(<FreshnessBadge analyzedAt={old} />);
    expect(screen.getByText(/2d atrás/i)).toBeInTheDocument();
  });

  it("renderiza reanalisar em rose quando > 30d", () => {
    const stale = new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000);
    const { container } = render(<FreshnessBadge analyzedAt={stale} />);
    expect(screen.getByText(/reanalisar/i)).toBeInTheDocument();
    expect(container.firstElementChild?.className ?? "").toMatch(/rose/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/components/freshness-badge.test.tsx`

- [ ] **Step 3: Implementar**

```tsx
// src/components/agenda/sheet/freshness-badge.tsx
"use client";

import { cn } from "@/lib/utils";
import { freshnessLabel } from "@/lib/agenda/freshness-label";

const TONE_CLASS = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  neutral: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
} as const;

interface Props {
  analyzedAt?: Date | string | null;
  className?: string;
}

export function FreshnessBadge({ analyzedAt, className }: Props) {
  const f = freshnessLabel(analyzedAt);
  if (!f) return null;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-0.5 text-[9px] font-medium tabular-nums",
        TONE_CLASS[f.tone],
        className
      )}
      title={new Date(analyzedAt as any).toLocaleString("pt-BR")}
    >
      {f.label}
    </span>
  );
}
```

- [ ] **Step 4: Run — expect 4 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/freshness-badge.tsx __tests__/components/freshness-badge.test.tsx
git commit -m "feat(agenda): FreshnessBadge por análise IA"
```

---

## Task 5: Update `matchDepoenteAudio` com explicitAudioId (TDD)

**Files:**
- Modify: `src/lib/agenda/match-depoente-audio.ts`
- Modify: `__tests__/unit/match-depoente-audio.test.ts`

- [ ] **Step 1: Adicionar testes para nova assinatura**

No final de `__tests__/unit/match-depoente-audio.test.ts`, adicionar:

```ts
describe("matchDepoenteAudio com explicitAudioId", () => {
  it("retorna explicitAudioId quando fornecido (prioridade)", () => {
    expect(matchDepoenteAudio("Fulano", midias, "explicit-xyz")).toBe("explicit-xyz");
  });

  it("cai para heurística quando explicitAudioId é null", () => {
    expect(matchDepoenteAudio("João Silva", midias, null)).toBe("m1");
  });

  it("cai para heurística quando explicitAudioId é undefined", () => {
    expect(matchDepoenteAudio("João Silva", midias, undefined)).toBe("m1");
  });
});
```

- [ ] **Step 2: Run — expect FAIL (3 novos)**

Run: `npm run test __tests__/unit/match-depoente-audio.test.ts`

- [ ] **Step 3: Atualizar implementação**

Em `src/lib/agenda/match-depoente-audio.ts`, modificar assinatura e corpo:

```ts
export function matchDepoenteAudio(
  depoenteNome: string,
  candidates: MediaFileCandidate[],
  explicitAudioId?: string | null
): string | null {
  if (explicitAudioId) return explicitAudioId;
  if (!depoenteNome || candidates.length === 0) return null;
  const nomeNorm = normalize(depoenteNome);
  const tokens = nomeNorm.split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) return null;

  for (const c of candidates) {
    if (!c.mimeType.startsWith("audio/")) continue;
    const nameNorm = normalize(c.name);
    if (tokens.some((t) => nameNorm.includes(t))) return c.driveFileId;
  }
  return null;
}
```

Manter `normalize` e `MediaFileCandidate` export como estão.

- [ ] **Step 4: Run — expect todos PASS**

Run: `npm run test __tests__/unit/match-depoente-audio.test.ts`
Expected: 5 originais + 3 novos = 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda/match-depoente-audio.ts __tests__/unit/match-depoente-audio.test.ts
git commit -m "feat(agenda): matchDepoenteAudio aceita explicitAudioId com prioridade"
```

---

## Task 6: `AnalyzeCTA` component (TDD)

**Files:**
- Create: `src/components/agenda/sheet/analyze-cta.tsx`
- Create: `__tests__/components/analyze-cta.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// __tests__/components/analyze-cta.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AnalyzeCTA } from "@/components/agenda/sheet/analyze-cta";

afterEach(() => cleanup());

const mutateMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    analise: {
      criarTask: { useMutation: vi.fn(() => ({ mutate: mutateMock, isPending: false })) },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

describe("AnalyzeCTA", () => {
  it("estado idle mostra botão Rodar análise IA", () => {
    render(<AnalyzeCTA assistidoId={1} processoId={2} analysisStatus={null} />);
    expect(screen.getByRole("button", { name: /rodar análise/i })).toBeInTheDocument();
  });

  it("chama criarTask ao clicar", () => {
    mutateMock.mockClear();
    render(<AnalyzeCTA assistidoId={1} processoId={2} analysisStatus={null} />);
    fireEvent.click(screen.getByRole("button", { name: /rodar análise/i }));
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ assistidoId: 1, processoId: 2 }),
      expect.anything()
    );
  });

  it("estado queued mostra Enfileirada sem botão", () => {
    render(<AnalyzeCTA assistidoId={1} processoId={2} analysisStatus="queued" />);
    expect(screen.getByText(/enfileirada/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rodar/i })).toBeNull();
  });

  it("estado processing mostra Analisando", () => {
    render(<AnalyzeCTA assistidoId={1} processoId={2} analysisStatus="processing" />);
    expect(screen.getByText(/analisando/i)).toBeInTheDocument();
  });

  it("estado failed mostra retry", () => {
    render(<AnalyzeCTA assistidoId={1} processoId={2} analysisStatus="failed" />);
    expect(screen.getByText(/falhou/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar/i })).toBeInTheDocument();
  });

  it("botão desabilitado quando assistidoId null", () => {
    render(<AnalyzeCTA assistidoId={null} processoId={null} analysisStatus={null} />);
    const btn = screen.getByRole("button", { name: /rodar/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/components/analyze-cta.test.tsx`

- [ ] **Step 3: Implementar**

```tsx
// src/components/agenda/sheet/analyze-cta.tsx
"use client";

import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface Props {
  assistidoId: number | null;
  processoId: number | null;
  casoId?: number | null;
  skill?: string;
  analysisStatus?: string | null;
  onTriggered?: () => void;
}

export function AnalyzeCTA({
  assistidoId, processoId, casoId, skill, analysisStatus, onTriggered,
}: Props) {
  const criarTask = trpc.analise.criarTask.useMutation({
    onSuccess: () => {
      toast.success("Análise enfileirada");
      onTriggered?.();
    },
    onError: (e) => toast.error(e.message ?? "Erro ao enfileirar análise"),
  });

  const trigger = () => {
    if (!assistidoId) return;
    criarTask.mutate({
      assistidoId,
      processoId: processoId ?? undefined,
      casoId: casoId ?? undefined,
      skill: skill ?? "analise-autos",
    });
  };

  if (analysisStatus === "queued") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-neutral-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
        <span>Enfileirada…</span>
      </div>
    );
  }

  if (analysisStatus === "processing") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-emerald-600">
        <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" />
        <span>Analisando…</span>
      </div>
    );
  }

  if (analysisStatus === "failed") {
    return (
      <div className="flex items-center gap-2 text-[11px]">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
        <span className="text-rose-600">Análise falhou</span>
        <button
          type="button"
          onClick={trigger}
          disabled={!assistidoId || criarTask.isPending}
          className="px-2 py-0.5 rounded-md border border-neutral-200 text-neutral-600 hover:border-neutral-400 cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={!assistidoId || criarTask.isPending}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Sparkles className="w-3 h-3" />
      Rodar análise IA
    </button>
  );
}
```

- [ ] **Step 4: Run — expect 6 PASS**

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/analyze-cta.tsx __tests__/components/analyze-cta.test.tsx
git commit -m "feat(agenda): AnalyzeCTA estados idle/queued/processing/failed"
```

---

## Task 7: `VincularAudioPopover` component (TDD)

**Files:**
- Create: `src/components/agenda/sheet/vincular-audio-popover.tsx`
- Create: `__tests__/components/vincular-audio-popover.test.tsx`

- [ ] **Step 1: Escrever teste**

```tsx
// __tests__/components/vincular-audio-popover.test.tsx
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { VincularAudioPopover } from "@/components/agenda/sheet/vincular-audio-popover";

afterEach(() => cleanup());

const midiasResp = {
  processos: [
    { processoId: 1, numeroAutos: "0001", files: [
      { driveFileId: "a1", name: "Oitiva João.mp3", mimeType: "audio/mp3" },
    ]},
  ],
  ungrouped: [
    { driveFileId: "a2", name: "Depoimento Maria.mp3", mimeType: "audio/mp3" },
    { driveFileId: "v1", name: "Vídeo ocorrência.mp4", mimeType: "video/mp4" },
  ],
  stats: { total: 3, transcribed: 0, analyzed: 0 },
};

const mutateMock = vi.fn();

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    drive: {
      midiasByAssistido: { useQuery: vi.fn(() => ({ data: midiasResp, isLoading: false })) },
    },
    audiencias: {
      vincularAudioDepoente: { useMutation: vi.fn(() => ({ mutate: mutateMock, isPending: false })) },
    },
    useUtils: () => ({ audiencias: { getAudienciaContext: { invalidate: vi.fn() } } }),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("VincularAudioPopover", () => {
  it("lista apenas áudios (vídeo fica de fora)", () => {
    render(<VincularAudioPopover depoenteId={1} currentAudioId={null} assistidoId={1} />);
    fireEvent.click(screen.getByRole("button", { name: /vincular áudio/i }));
    expect(screen.getByText(/oitiva joão/i)).toBeInTheDocument();
    expect(screen.getByText(/depoimento maria/i)).toBeInTheDocument();
    expect(screen.queryByText(/vídeo ocorrência/i)).toBeNull();
  });

  it("click num áudio dispara mutation com driveFileId", () => {
    mutateMock.mockClear();
    render(<VincularAudioPopover depoenteId={7} currentAudioId={null} assistidoId={1} />);
    fireEvent.click(screen.getByRole("button", { name: /vincular áudio/i }));
    fireEvent.click(screen.getByText(/oitiva joão/i));
    expect(mutateMock).toHaveBeenCalledWith(
      { depoenteId: 7, audioDriveFileId: "a1" },
      expect.anything()
    );
  });

  it("mostra opção Nenhum (desvincular) quando currentAudioId existe", () => {
    render(<VincularAudioPopover depoenteId={1} currentAudioId="a1" assistidoId={1} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/nenhum|desvincular/i)).toBeInTheDocument();
  });

  it("click em Nenhum dispara mutation com null", () => {
    mutateMock.mockClear();
    render(<VincularAudioPopover depoenteId={7} currentAudioId="a1" assistidoId={1} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText(/nenhum|desvincular/i));
    expect(mutateMock).toHaveBeenCalledWith(
      { depoenteId: 7, audioDriveFileId: null },
      expect.anything()
    );
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test __tests__/components/vincular-audio-popover.test.tsx`

- [ ] **Step 3: Implementar**

```tsx
// src/components/agenda/sheet/vincular-audio-popover.tsx
"use client";

import { useState } from "react";
import { Link2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  depoenteId: number;
  currentAudioId: string | null;
  assistidoId: number;
  onChange?: () => void;
}

export function VincularAudioPopover({ depoenteId, currentAudioId, assistidoId, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  const midias = trpc.drive.midiasByAssistido.useQuery(
    { assistidoId },
    { enabled: !!assistidoId && open }
  );

  const mutation = trpc.audiencias.vincularAudioDepoente.useMutation({
    onSuccess: () => {
      toast.success("Áudio vinculado");
      setOpen(false);
      onChange?.();
    },
    onError: (e) => toast.error(e.message ?? "Erro ao vincular"),
  });

  const audios = (() => {
    const data: any = midias.data;
    const all = [
      ...(data?.processos ?? []).flatMap((p: any) => p.files ?? []),
      ...(data?.ungrouped ?? []),
    ];
    return all.filter((f: any) => f.mimeType?.startsWith?.("audio/"));
  })();

  const select = (audioDriveFileId: string | null) => {
    mutation.mutate({ depoenteId, audioDriveFileId });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-[10px] font-medium px-2 py-1 rounded-md bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 cursor-pointer flex items-center gap-1"
        >
          <Link2 className="w-3 h-3" />
          {currentAudioId ? "Trocar áudio" : "Vincular áudio"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1">
        {midias.isLoading && (
          <p className="text-[10px] text-neutral-400 italic p-2 text-center">Carregando…</p>
        )}
        {!midias.isLoading && audios.length === 0 && (
          <p className="text-[10px] text-neutral-400 italic p-2 text-center">Nenhum áudio disponível</p>
        )}
        {audios.map((a: any) => (
          <button
            key={a.driveFileId}
            type="button"
            onClick={() => select(a.driveFileId)}
            disabled={mutation.isPending}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer text-[11px] flex items-center gap-2",
              currentAudioId === a.driveFileId && "bg-emerald-50 dark:bg-emerald-900/20"
            )}
          >
            <span className="flex-1 truncate">{a.name}</span>
            {currentAudioId === a.driveFileId && (
              <span className="text-[9px] text-emerald-600">atual</span>
            )}
          </button>
        ))}
        {currentAudioId && (
          <>
            <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1" />
            <button
              type="button"
              onClick={() => select(null)}
              disabled={mutation.isPending}
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/20 cursor-pointer text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-2"
            >
              <X className="w-3 h-3" />
              Nenhum (desvincular)
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 4: Run — expect 4 PASS**

- [ ] **Step 5: Verificar Popover existe**

Run: `ls src/components/ui/popover.tsx`
Se não existir, o user deve ter instalado Radix Popover mas sem wrapper shadcn. Opção: usar `@radix-ui/react-popover` direto:

```tsx
import * as Popover from "@radix-ui/react-popover";
```

E trocar `<Popover>` por `<Popover.Root>`, `<PopoverTrigger>` por `<Popover.Trigger>`, `<PopoverContent>` por `<Popover.Content>` com classes correspondentes. Ajustar import no arquivo de teste se precisar.

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/sheet/vincular-audio-popover.tsx __tests__/components/vincular-audio-popover.test.tsx
git commit -m "feat(agenda): VincularAudioPopover com mídias do assistido"
```

---

## Task 8: Update `DepoenteCardV2` + `event-detail-sheet.tsx`

**Files:**
- Modify: `src/components/agenda/sheet/depoente-card-v2.tsx`
- Modify: `src/components/agenda/event-detail-sheet.tsx`

### Step 1: Adicionar `VincularAudioPopover` no DepoenteCardV2

Em `src/components/agenda/sheet/depoente-card-v2.tsx`, dentro do bloco `{isOpen && (...)}`, no `<div className="flex flex-wrap gap-1.5 pt-1.5 ...">` (onde estão ✓ Marcar ouvido, ↷ Redesignar, + Pergunta, ▶ Áudio), adicionar o `VincularAudioPopover` como mais um chip. Adicionar prop `assistidoId?: number | null` à interface `Props` e `onVincularAudio?: (...) => void` (opcional — a popover dispara a mutation diretamente).

Na interface `Props` (perto de outros callbacks):
```tsx
  assistidoId?: number | null;
```

Adicionar import no topo:
```tsx
import { VincularAudioPopover } from "./vincular-audio-popover";
```

No bloco de ações (dentro do `{isOpen && (...)}`), após o botão "+ Pergunta", adicionar:
```tsx
            {depoente.id != null && props_assistidoId && (
              <VincularAudioPopover
                depoenteId={depoente.id}
                currentAudioId={depoente.audioDriveFileId ?? null}
                assistidoId={props_assistidoId}
              />
            )}
```

(Onde `props_assistidoId` é a nova prop — pegue-a do destructuring no topo do componente.)

Como o componente faz destructuring na assinatura, atualizar:
```tsx
export function DepoenteCardV2({ depoente, isOpen, onToggle, onMarcarOuvido, onRedesignar, onAdicionarPergunta, onAbrirAudio, assistidoId }: Props) {
```

### Step 2: Passar `assistidoId` do sheet

Em `src/components/agenda/event-detail-sheet.tsx`, localizar o map de `<DepoenteCardV2 ... />` e adicionar a prop:

```tsx
                        <DepoenteCardV2
                          key={d.id ?? `${i}-${d.nome}`}
                          depoente={{
                            ...d,
                            audioDriveFileId: matchDepoenteAudio(d.nome ?? "", allMediaCandidates, d.audioDriveFileId ?? null),
                          }}
                          isOpen={openDepoenteIdx === i}
                          onToggle={() => setOpenDepoenteIdx(openDepoenteIdx === i ? null : i)}
                          variant="sheet"
                          assistidoId={typeof assistidoId === "number" ? assistidoId : null}
                          onMarcarOuvido={(id, sintese) => actions.marcarOuvido.mutate({ depoenteId: id, sinteseJuizo: sintese })}
                          onRedesignar={(id) => actions.redesignarDep.mutate({ depoenteId: id })}
                          onAdicionarPergunta={() => toast.info("Em breve: abrir modal de perguntas")}
                          onAbrirAudio={/* existente */}
                        />
```

Note: `matchDepoenteAudio` agora recebe 3º argumento `d.audioDriveFileId ?? null` (campo que já existe na testemunha após Task 1).

### Step 3: Adicionar `AnalyzeCTA` nos empty states

No mesmo arquivo `event-detail-sheet.tsx`, localizar cada `EmptyHint` dentro das `CollapsibleSection`s (Imputação, Fatos, Versão, Laudos, Contradições, Pendências, Teses). Próximo a cada `<EmptyHint ... />`, adicionar `<AnalyzeCTA ... />`.

Exemplo em Imputação:
```tsx
                <CollapsibleSection id="imputacao" label="Imputação" defaultOpen>
                  {imputacao ? (
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{imputacao}</p>
                  ) : (
                    <div className="space-y-2">
                      <EmptyHint text="Imputação não extraída." />
                      <AnalyzeCTA
                        assistidoId={typeof assistidoId === "number" ? assistidoId : null}
                        processoId={typeof processoId === "number" ? processoId : null}
                        analysisStatus={(ctx?.processo as any)?.analysisStatus ?? null}
                      />
                    </div>
                  )}
                </CollapsibleSection>
```

Aplicar o MESMO padrão em Fatos, Versão do Acusado, Laudos, Contradições, Pendências, Teses. (7 seções total.)

### Step 4: Adicionar imports + FreshnessBadge

Adicionar no topo:
```tsx
import { AnalyzeCTA } from "./sheet/analyze-cta";
import { FreshnessBadge } from "./sheet/freshness-badge";
```

Colocar `<FreshnessBadge analyzedAt={analyzedAt} />` próximo ao `label` de cada `CollapsibleSection` derivada de análise. Como o `CollapsibleSection` não aceita trailing elements no header, simplifica: adicionar a badge DENTRO do conteúdo da seção, no topo. Exemplo:

```tsx
                <CollapsibleSection id="imputacao" label="Imputação" defaultOpen>
                  <div className="flex items-center justify-end mb-1">
                    <FreshnessBadge analyzedAt={analyzedAt} />
                  </div>
                  {imputacao ? ( ... ) : ( ... )}
                </CollapsibleSection>
```

Onde `analyzedAt = (ctx?.processo as any)?.analyzedAt ?? null` (computado perto dos outros derivados).

Aplicar em Imputação, Fatos, Versão, Laudos, Contradições, Pendências, Teses.

### Step 5: Polling automático

Depois da query `getAudienciaContext`, adicionar refetch controlado:

```tsx
  const analysisStatus = (ctx?.processo as any)?.analysisStatus ?? null;
  const shouldPoll = analysisStatus === "queued" || analysisStatus === "processing";

  useEffect(() => {
    if (!shouldPoll) return;
    const interval = setInterval(() => {
      // refetch implicit via invalidate + requery
      // Alternativa: usar refetchInterval diretamente na useQuery (mais limpo)
    }, 5000);
    return () => clearInterval(interval);
  }, [shouldPoll]);
```

Melhor: passar `refetchInterval` na própria useQuery:

Trocar:
```tsx
  const { data: ctx, isLoading } = trpc.audiencias.getAudienciaContext.useQuery(
    { audienciaId: audienciaIdNum ?? 0 },
    { enabled: !!audienciaIdNum && open, retry: false }
  );
```

Por:
```tsx
  const ctxQuery = trpc.audiencias.getAudienciaContext.useQuery(
    { audienciaId: audienciaIdNum ?? 0 },
    {
      enabled: !!audienciaIdNum && open,
      retry: false,
      refetchInterval: (query) => {
        const status = (query.state.data as any)?.processo?.analysisStatus;
        return (status === "queued" || status === "processing") ? 5000 : false;
      },
    }
  );
  const ctx = ctxQuery.data;
  const isLoading = ctxQuery.isLoading;
```

### Step 6: Typecheck + testes

Run: `npm run typecheck` → 0 new errors.
Run: `npm run test` → todos passam.

### Step 7: Commit

```bash
git add src/components/agenda/sheet/depoente-card-v2.tsx src/components/agenda/event-detail-sheet.tsx
git commit -m "feat(agenda): integra AnalyzeCTA + FreshnessBadge + VincularAudioPopover no sheet"
```

---

## Task 9: Regression test event-detail-sheet

**Files:**
- Modify: `__tests__/components/event-detail-sheet.test.tsx`

- [ ] **Step 1: Adicionar mocks novos e tests**

Append ao arquivo `__tests__/components/event-detail-sheet.test.tsx`, dentro do `vi.mock("@/lib/trpc/client", ...)` existente, adicionar:

```tsx
      analise: {
        criarTask: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
      vincularAudioDepoente: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
```

No `useUtils`:
```tsx
      audiencias: { getAudienciaContext: { invalidate: vi.fn() } },
```

Adicionar testes:

```tsx
  it("mostra AnalyzeCTA quando imputação vazia", () => {
    render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: /rodar análise/i })).toBeInTheDocument();
  });

  it("FreshnessBadge não renderiza quando analyzedAt é null", () => {
    render(<EventDetailSheet evento={evento} open={true} onOpenChange={() => {}} />);
    // Não deve haver badge "hoje" / "Xd atrás" quando nada analisado
    expect(screen.queryByText(/hoje|atrás|reanalisar/i)).toBeNull();
  });
```

- [ ] **Step 2: Run**

Run: `npm run test __tests__/components/event-detail-sheet.test.tsx`
Expected: existentes + 2 novos PASS.

- [ ] **Step 3: Commit**

```bash
git add __tests__/components/event-detail-sheet.test.tsx
git commit -m "test(agenda): regressão Fase 4 — AnalyzeCTA + FreshnessBadge"
```

---

## Task 10: Manual verification

**Files:** nenhum.

- [ ] **Step 1: Dev server**

```
cd ~/projetos/Defender && rm -rf .next/cache && npm run dev:webpack
```

- [ ] **Step 2: Checklist**

Em `http://localhost:3000/admin/agenda`, abrir evento:

- [ ] Em caso sem analysisData: blocos Imputação, Fatos, Versão, Laudos, Contradições, Pendências, Teses mostram "⚡ Rodar análise IA" (não mais texto passivo).
- [ ] Click no CTA → toast "Análise enfileirada" e UI muda pra "Enfileirada…".
- [ ] Após ~5s, se daemon estiver rodando, estado muda pra "Analisando…".
- [ ] Quando daemon completa, sheet atualiza sozinho (blocos se populam).
- [ ] Badge "hoje" aparece nos blocos derivados da análise recém-feita.
- [ ] DepoenteCardV2 aberto: botão "🔗 Vincular áudio" aparece.
- [ ] Click abre popover com lista de áudios do assistido.
- [ ] Click num áudio → toast "Áudio vinculado". Botão muda pra "Trocar áudio".
- [ ] Desvincular funciona.
- [ ] Botão "▶ Áudio" (Fase 2) agora reflete o link explícito.
- [ ] Em caso com análise antiga (>30d): badge rose "Nd · reanalisar?" aparece.

- [ ] **Step 3: Commit de marcação**

```bash
git commit --allow-empty -m "chore(agenda): Fase 4 validada manualmente"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| CTA em empty states (7 blocos) | Task 6 (componente), Task 8 (wire-up nos 7) |
| Polling 5s enquanto queued/processing | Task 8 (refetchInterval) |
| Retry em failed | Task 6 |
| Coluna `testemunhas.audio_drive_file_id` | Task 1 |
| Mutation `vincularAudioDepoente` | Task 2 |
| Popover de vincular áudio | Task 7 |
| Link explícito prioriza sobre heurística | Task 5 |
| `FreshnessBadge` 4 faixas | Tasks 3 (helper), 4 (componente) |
| Badge oculto quando null | Tasks 3, 4 |
| Integração no sheet + DepoenteCardV2 | Task 8 |
| Regressão | Task 9 |
| Manual | Task 10 |
| Zero regressão F1-F3 | verificado implicitamente em Task 9 (tests anteriores continuam passando) |

**Placeholders:** nenhum.

**Type consistency:**
- `FreshnessOutput` (Task 3) usado em Task 4.
- `explicitAudioId` (Task 5) consumido em Task 8.
- `audioDriveFileId` (Task 1 coluna) usado em Tasks 2, 5, 7, 8.
- Props `assistidoId`/`processoId`/`analysisStatus` de `AnalyzeCTA` (Task 6) consistentes com uso em Task 8.

Plano coerente. 10 tasks, ~10 commits.
