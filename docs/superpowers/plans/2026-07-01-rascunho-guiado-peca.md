# Rascunho Guiado de Peça (2c.2/B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** Botão "Rascunhar peça" numa demanda com análise concluída (Júri/VVD, "cabe peça") → defensor digita linhas mestras → lane ai (skill `gerar-peca`) redige o `.docx` guiado pelas linhas + análise + reference da peça, em `Protocolar/`.

**Architecture:** Espelha de perto a Fase 2c (já no main): `rascunhoPeca.criar/status` (mirror de `analise-profunda.ts`), coluna de estado em `demandas` (mirror de `analise_profunda_status`), hook (mirror de `use-analise-profunda-job.ts`), botão no card (mirror do botão "Análise profunda"). Diferenças: sem lane browser (é só ai); input de **linhas mestras**; skill `gerar-peca`→`dpe-ba-pecas`; saída `.docx` em `Protocolar/`.

**Tech Stack:** Next.js 15 + tRPC + Drizzle + Vitest; Python/claude -p (Max daemon, skill dpe-ba-pecas).

## Global Constraints

- MVP: atrib ∈ {`JURI_CAMACARI`, `GRUPO_JURI`, `VVD_CAMACARI`}; `peca_sugerida` mapeável (memoriais/resposta_acusacao/apelacao/rese/contrarrazoes); `manifestacao_ep` FORA.
- Pré-requisito: `demandas.analise_profunda_status='concluida'` (da 2c).
- `claude_code_tasks` sem `demandaId` → linkar via `instrucaoAdicional` JSON (convenção existente).
- Estado: `demandas.rascunho_status varchar(20)` + `rascunho_task_id integer` + `rascunho_drive_url text`.
- Skill ai: `gerar-peca` (alias → `dpe-ba-pecas`), lane ai. Saída `.docx` Garamond 12pt + timbre DPE-BA em `Protocolar/`. **Não protocola.**
- **TEMPLATES a espelhar (já no main/worktree):** `src/lib/trpc/routers/analise-profunda.ts` (router+helpers+status derive-on-read), `src/hooks/use-analise-profunda-job.ts` (hook), o botão "Análise profunda" em `src/components/demandas-premium/kanban-premium.tsx` + a fiação em `demandas-premium-view.tsx`. Ler o analog ANTES de cada task e seguir seu padrão real (imports `../init`, etc.).
- Testes tRPC: contract (`readFileSync`+`toContain`/`toMatch`) + helpers puros unit. Rodar só o arquivo de teste da task.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/db/schema/core.ts` (modify) | +3 colunas em `demandas` |
| `drizzle/00NN_rascunho_peca.sql` (create) | migration |
| `src/lib/trpc/routers/rascunho-peca.ts` (create) | helpers puros + router `rascunhoPeca` |
| `src/lib/trpc/routers/index.ts` (modify) | registra `rascunhoPeca` |
| `.claude/skills-cowork/dpe-ba-pecas/SKILL.md` (modify) | linhas mestras + mapa peça→reference + fechar estado |
| `src/hooks/use-rascunho-peca-job.ts` (create) | hook |
| `src/components/demandas-premium/kanban-premium.tsx` + `demandas-premium-view.tsx` (modify) | botão + input de linhas mestras + badge |

---

### Task 1: Colunas de estado do rascunho (schema + migration)

**Files:** Modify `src/lib/db/schema/core.ts`; Create `drizzle/00NN_rascunho_peca.sql`; Test `src/lib/db/schema/__tests__/demandas-rascunho.test.ts`

**Interfaces:** Produces `demandas.rascunhoStatus` (`varchar(20)`), `rascunhoTaskId` (`integer`), `rascunhoDriveUrl` (`text`).

- [ ] **Step 1: Failing test** — mirror `demandas-analise-profunda.test.ts` (mesmo dir/padrão):

```ts
import { readFileSync } from "node:fs"; import { join } from "node:path";
import { describe, it, expect } from "vitest";
const src = readFileSync(join(process.cwd(), "src/lib/db/schema/core.ts"), "utf8");
describe("demandas — colunas de rascunho de peça", () => {
  it("rascunho_status varchar(20)", () => expect(src).toMatch(/rascunhoStatus:\s*varchar\("rascunho_status",\s*\{\s*length:\s*20\s*\}\)/));
  it("rascunho_task_id integer", () => expect(src).toMatch(/rascunhoTaskId:\s*integer\("rascunho_task_id"\)/));
  it("rascunho_drive_url text", () => expect(src).toMatch(/rascunhoDriveUrl:\s*text\("rascunho_drive_url"\)/));
});
```

- [ ] **Step 2:** `npx vitest run src/lib/db/schema/__tests__/demandas-rascunho.test.ts` → FAIL.
- [ ] **Step 3:** Em `core.ts`, logo após `analiseProfundaTaskId: integer("analise_profunda_task_id"),` (colunas da 2c), adicionar:

```ts
  // Fase 2c.2/B — rascunho de peça guiado por linhas mestras.
  rascunhoStatus: varchar("rascunho_status", { length: 20 }),
  rascunhoTaskId: integer("rascunho_task_id"),
  rascunhoDriveUrl: text("rascunho_drive_url"),
```
(`varchar`/`integer`/`text` já importados.)

- [ ] **Step 4:** test → PASS (3).
- [ ] **Step 5:** próximo número de migration (`ls drizzle/ | grep -E '^[0-9]{4}_' | sort | tail -1` → +1). Criar `drizzle/00NN_rascunho_peca.sql`:

```sql
ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "rascunho_status" varchar(20);
ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "rascunho_task_id" integer;
ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "rascunho_drive_url" text;
```

- [ ] **Step 6:** aplicar ao dev DB: `node --env-file=.env.local -e "import('postgres').then(async({default:p})=>{const sql=p(process.env.DATABASE_URL,{max:1});await sql.unsafe(require('fs').readFileSync('drizzle/00NN_rascunho_peca.sql','utf8'));console.log('applied');await sql.end();})"` → `applied`.
- [ ] **Step 7:** commit `feat(2c.2b): colunas demandas.rascunho_status/_task_id/_drive_url`.

---

### Task 2: Helpers puros do router (mapa peça→reference, elegibilidade, meta)

**Files:** Create `src/lib/trpc/routers/rascunho-peca.ts` (só helpers puros); Test `src/lib/trpc/routers/rascunho-peca.test.ts`

**Interfaces:** Produces:
- `PECA_SUGERIDA_TO_REFERENCE: Record<string, {vvd?: string; juri?: string}>`
- `refParaAtribuicao(pecaSugerida: string, atribuicao: string): string | null` — devolve a reference certa p/ a atribuição (Júri usa `.juri`, VVD/`*_CAMACARI` VVD usa `.vvd`).
- `isElegivelRascunho(input: {statusAnalise: string|null; pecaSugerida: string|null|undefined; atribuicao: string}): {ok:true}|{ok:false;motivo:string}`
- `buildRascunhoTaskMeta(input: {demandaId:number; pecaSugerida:string; atribuicao:string; linhasMestras:string}): string`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from "vitest";
import { PECA_SUGERIDA_TO_REFERENCE, refParaAtribuicao, isElegivelRascunho, buildRascunhoTaskMeta } from "./rascunho-peca";

describe("refParaAtribuicao", () => {
  it("memoriais VVD → vvd_alegacoes_finais", () => expect(refParaAtribuicao("memoriais","VVD_CAMACARI")).toBe("vvd_alegacoes_finais"));
  it("memoriais Júri → alegacoes_finais_juri", () => expect(refParaAtribuicao("memoriais","JURI_CAMACARI")).toBe("alegacoes_finais_juri"));
  it("resposta_acusacao Júri → null (sem RA no júri)", () => expect(refParaAtribuicao("resposta_acusacao","JURI_CAMACARI")).toBeNull());
  it("peça desconhecida → null", () => expect(refParaAtribuicao("xpto","VVD_CAMACARI")).toBeNull());
});
describe("isElegivelRascunho", () => {
  it("concluida + memoriais + VVD → ok", () => expect(isElegivelRascunho({statusAnalise:"concluida",pecaSugerida:"memoriais",atribuicao:"VVD_CAMACARI"})).toEqual({ok:true}));
  it("análise não concluída → rejeita", () => expect(isElegivelRascunho({statusAnalise:"analisando",pecaSugerida:"memoriais",atribuicao:"VVD_CAMACARI"}).ok).toBe(false));
  it("EP → rejeita (fora do MVP)", () => expect(isElegivelRascunho({statusAnalise:"concluida",pecaSugerida:"manifestacao_ep",atribuicao:"EXECUCAO_PENAL"}).ok).toBe(false));
  it("peça não mapeável p/ atribuição → rejeita", () => expect(isElegivelRascunho({statusAnalise:"concluida",pecaSugerida:"resposta_acusacao",atribuicao:"JURI_CAMACARI"}).ok).toBe(false));
});
describe("buildRascunhoTaskMeta", () => {
  it("serializa com linhasMestras", () => expect(JSON.parse(buildRascunhoTaskMeta({demandaId:1,pecaSugerida:"memoriais",atribuicao:"VVD_CAMACARI",linhasMestras:"foco na atipicidade"}))).toEqual({demandaId:1,pecaSugerida:"memoriais",atribuicao:"VVD_CAMACARI",linhasMestras:"foco na atipicidade",fonte:"fase2c2b"}));
});
```

- [ ] **Step 2:** run → FAIL (módulo ausente).
- [ ] **Step 3: Implement**

```ts
// src/lib/trpc/routers/rascunho-peca.ts
export const PECA_SUGERIDA_TO_REFERENCE: Record<string, { vvd?: string; juri?: string }> = {
  memoriais: { vvd: "vvd_alegacoes_finais", juri: "alegacoes_finais_juri" },
  resposta_acusacao: { vvd: "vvd_analise_para_ra" },
  apelacao: { vvd: "vvd_apelacao", juri: "apelacao_pos_juri" },
  rese: { vvd: "vvd_contrarrazoes_rese" },
  contrarrazoes: { vvd: "vvd_contrarrazoes_apelacao" },
};
const JURI_ATRIBS = new Set(["JURI_CAMACARI", "GRUPO_JURI"]);
const VVD_ATRIBS = new Set(["VVD_CAMACARI"]);

export function refParaAtribuicao(pecaSugerida: string, atribuicao: string): string | null {
  const m = PECA_SUGERIDA_TO_REFERENCE[pecaSugerida];
  if (!m) return null;
  if (JURI_ATRIBS.has(atribuicao)) return m.juri ?? null;
  if (VVD_ATRIBS.has(atribuicao)) return m.vvd ?? null;
  return null;
}

export function isElegivelRascunho(input: {
  statusAnalise: string | null; pecaSugerida: string | null | undefined; atribuicao: string;
}): { ok: true } | { ok: false; motivo: string } {
  if (input.statusAnalise !== "concluida")
    return { ok: false, motivo: "Análise profunda ainda não concluída." };
  if (!input.pecaSugerida)
    return { ok: false, motivo: "Demanda sem peça sugerida." };
  if (!refParaAtribuicao(input.pecaSugerida, input.atribuicao))
    return { ok: false, motivo: "Peça/atribuição fora do MVP (só Júri/VVD com peça mapeável)." };
  return { ok: true };
}

export function buildRascunhoTaskMeta(input: {
  demandaId: number; pecaSugerida: string; atribuicao: string; linhasMestras: string;
}): string {
  return JSON.stringify({
    demandaId: input.demandaId, pecaSugerida: input.pecaSugerida,
    atribuicao: input.atribuicao, linhasMestras: input.linhasMestras, fonte: "fase2c2b",
  });
}
```

- [ ] **Step 4:** run → PASS. **Step 5:** commit `feat(2c.2b): helpers do rascunho (mapa peça→reference, elegibilidade, meta)`.

---

### Task 3: Router `rascunhoPeca` (criar + status) + registro

**Files:** Modify `src/lib/trpc/routers/rascunho-peca.ts` (append router); Modify `src/lib/trpc/routers/index.ts`; Test `src/lib/trpc/routers/__tests__/rascunho-peca-router.test.ts`

**LER PRIMEIRO** `src/lib/trpc/routers/analise-profunda.ts` — este router é o mesmo padrão (imports `../init`, `db`, schema; `criar` valida+dedup+insere task lane ai; `status` derive-on-read). Espelhar.

**Interfaces:** Consumes Task 2 helpers; `claudeCodeTasks` (`src/lib/db/schema/casos.ts`); `demandas`, `processos`, `registros` (registros de `schema/agenda`). Produces `rascunhoPeca.criar({demandaId, linhasMestras})` → `{success, taskId, existing}`; `rascunhoPeca.status({demandaId})` → `{status, driveUrl, erro}`.

- [ ] **Step 1: Failing contract test**

```ts
import { readFileSync } from "node:fs"; import { join } from "node:path";
import { describe, it, expect } from "vitest";
const R = join(process.cwd(), "src/lib/trpc/routers"); const read = (f:string)=>readFileSync(join(R,f),"utf8");
describe("rascunhoPeca router — contract", () => {
  const src = read("rascunho-peca.ts");
  it("criar + status", () => { expect(src).toMatch(/criar:\s*protectedProcedure/); expect(src).toMatch(/status:\s*protectedProcedure/); });
  it("valida elegibilidade", () => expect(src).toContain("isElegivelRascunho"));
  it("lê analise_profunda_status como pré-req", () => expect(src).toContain("analiseProfundaStatus"));
  it("lê peca_sugerida do registro de análise", () => expect(src).toMatch(/peca_sugerida/));
  it("dedup em rascunhando", () => { expect(src).toContain('"rascunhando"'); expect(src).toMatch(/existing:\s*true/); });
  it("enfileira lane ai skill gerar-peca com meta", () => { expect(src).toContain('lane: "ai"'); expect(src).toContain('"gerar-peca"'); expect(src).toContain("buildRascunhoTaskMeta"); });
  it("status derive-on-read → pronto quando task ai completa", () => { expect(src).toContain('"pronto"'); expect(src).toMatch(/completed/); });
  it("registrado no appRouter", () => { const i = read("index.ts"); expect(i).toContain("rascunhoPecaRouter"); expect(i).toMatch(/rascunhoPeca:\s*rascunhoPecaRouter/); });
});
```

- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** (append ao `rascunho-peca.ts`, espelhando `analise-profunda.ts`). Esqueleto (ajustar imports/nomes reais conferindo o analog):

```ts
import { z } from "zod";
import { and, eq, isNull, isNotNull, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { demandas, processos } from "@/lib/db/schema/core";
import { registros } from "@/lib/db/schema/agenda";
import { claudeCodeTasks } from "@/lib/db/schema/casos";

export const rascunhoPecaRouter = router({
  criar: protectedProcedure
    .input(z.object({ demandaId: z.number().int(), linhasMestras: z.string().default("") }))
    .mutation(async ({ ctx, input }) => {
      const [d] = await db.select({
        id: demandas.id, assistidoId: demandas.assistidoId, processoId: demandas.processoId,
        statusAnalise: demandas.analiseProfundaStatus, rascunhoStatus: demandas.rascunhoStatus, rascunhoTaskId: demandas.rascunhoTaskId,
      }).from(demandas).where(and(eq(demandas.id, input.demandaId), isNull(demandas.deletedAt))).limit(1);
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada" });
      if (d.rascunhoStatus === "rascunhando") return { success: true as const, taskId: d.rascunhoTaskId ?? 0, existing: true };

      const [proc] = await db.select({ atribuicao: processos.atribuicao }).from(processos).where(eq(processos.id, d.processoId)).limit(1);
      const [reg] = await db.select({ enrichment: registros.enrichmentData }).from(registros)
        .where(and(eq(registros.demandaId, input.demandaId), eq(registros.tipo, "analise"), isNotNull(registros.enrichmentData)))
        .orderBy(desc(registros.id)).limit(1);
      const pecaSugerida = (reg?.enrichment as Record<string, unknown> | undefined)?.["peca_sugerida"] as string | null | undefined;

      const eleg = isElegivelRascunho({ statusAnalise: d.statusAnalise ?? null, pecaSugerida, atribuicao: String(proc?.atribuicao ?? "") });
      if (!eleg.ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: eleg.motivo });

      const [task] = await db.insert(claudeCodeTasks).values({
        assistidoId: d.assistidoId, processoId: d.processoId, skill: "gerar-peca", lane: "ai",
        prompt: `Rascunho de peça guiado — demanda ${input.demandaId}`,
        instrucaoAdicional: buildRascunhoTaskMeta({ demandaId: input.demandaId, pecaSugerida: pecaSugerida!, atribuicao: String(proc?.atribuicao ?? ""), linhasMestras: input.linhasMestras }),
        status: "pending", createdBy: ctx.user.id,
      }).returning({ id: claudeCodeTasks.id });

      await db.update(demandas).set({ rascunhoStatus: "rascunhando", rascunhoTaskId: task.id, rascunhoDriveUrl: null }).where(eq(demandas.id, input.demandaId));
      return { success: true as const, taskId: task.id, existing: false };
    }),

  status: protectedProcedure
    .input(z.object({ demandaId: z.number().int() }))
    .query(async ({ input }) => {
      const [d] = await db.select({ rascunhoStatus: demandas.rascunhoStatus, taskId: demandas.rascunhoTaskId, driveUrl: demandas.rascunhoDriveUrl })
        .from(demandas).where(eq(demandas.id, input.demandaId)).limit(1);
      if (!d) throw new TRPCError({ code: "NOT_FOUND", message: "Demanda não encontrada" });
      let status = d.rascunhoStatus ?? null; let erro: string | null = null;
      if (d.taskId && status === "rascunhando") {
        const [t] = await db.select({ ts: claudeCodeTasks.status, te: claudeCodeTasks.erro }).from(claudeCodeTasks).where(eq(claudeCodeTasks.id, d.taskId)).limit(1);
        if (t?.ts === "failed") { status = "erro"; erro = t.te ?? null; }
        else if (t?.ts === "completed") { status = "pronto"; await db.update(demandas).set({ rascunhoStatus: "pronto" }).where(eq(demandas.id, input.demandaId)); }
      }
      return { status, driveUrl: d.driveUrl ?? null, erro };
    }),
});
```

Em `index.ts`: import + `rascunhoPeca: rascunhoPecaRouter,`.

- [ ] **Step 4:** run contract + Task 2 test → PASS. `npx tsc --noEmit -p tsconfig.json 2>&1 | grep rascunho-peca || echo "sem erros"`.
- [ ] **Step 5:** commit `feat(2c.2b): router rascunhoPeca (criar/status) + registro`.

---

### Task 4: Skill `dpe-ba-pecas` — linhas mestras + mapa + fechar estado

**Files:** Modify `.claude/skills-cowork/dpe-ba-pecas/SKILL.md` (LER primeiro para preservar o existente); Test: source-assertion pytest `.claude/skills-cowork/dpe-ba-pecas/test_rascunho_instrucoes.py`

**Interfaces:** a task ai chega com `instrucaoAdicional` = JSON `{demandaId, pecaSugerida, atribuicao, linhasMestras, fonte:"fase2c2b"}`.

- [ ] **Step 1: Failing test** (assere que a SKILL.md documenta o contrato 2c2b):

```python
import sys; from pathlib import Path
SRC = (Path(__file__).parent / "SKILL.md").read_text()
def main():
    fails = 0
    for tok in ["linhasMestras", "peca_sugerida", "Protocolar", "rascunho_status", "demandaId"]:
        if tok not in SRC: print(f"FAIL: falta '{tok}'"); fails += 1
    print("OK" if not fails else f"{fails} FALHAS"); sys.exit(1 if fails else 0)
if __name__ == "__main__": main()
```

- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** Adicionar à `SKILL.md` uma seção "## Modo rascunho guiado (Fase 2c.2/B)" documentando: quando `instrucaoAdicional` tiver `fonte="fase2c2b"`, (a) usar `linhasMestras` como DIREÇÃO MESTRA da peça; (b) mapear `peca_sugerida`+`atribuicao` para a reference (memoriais→vvd_alegacoes_finais/alegacoes_finais_juri; resposta_acusacao→vvd_analise_para_ra; apelacao→vvd_apelacao/apelacao_pos_juri; rese→vvd_contrarrazoes_rese; contrarrazoes→vvd_contrarrazoes_apelacao); (c) ler `analysisData` + autos da pasta do assistido no Drive; (d) gerar `.docx` (Garamond 12pt, timbre DPE-BA) em `Protocolar/` (convenção v2); (e) ao concluir, gravar `demandas.rascunho_status='pronto'` + `rascunho_drive_url` (via REST, mesmo padrão do write dos outros skills) para o `demandaId`; NUNCA protocolar.

- [ ] **Step 4:** run → OK. **Step 5:** commit `docs(2c.2b): dpe-ba-pecas — modo rascunho guiado por linhas mestras`.

---

### Task 5: Hook + UI (botão "Rascunhar peça" + input de linhas mestras + badge)

**Files:** Create `src/hooks/use-rascunho-peca-job.ts`; Modify `src/components/demandas-premium/kanban-premium.tsx` + `demandas-premium-view.tsx`; Test `src/hooks/__tests__/use-rascunho-peca-job.test.ts`

**LER PRIMEIRO** `src/hooks/use-analise-profunda-job.ts` e o botão "Análise profunda" em `kanban-premium.tsx` — espelhar. O botão "Rascunhar peça" é irmão do "Análise profunda", habilitado quando `analise_profunda_status==='concluida'`. Ao clicar, abre um input de **linhas mestras** (um prompt/textarea simples — pode ser um `window.prompt` no MVP, ou um pequeno dialog se já houver primitivo `ResponsiveDialog`) → chama `iniciar(demandaId, linhasMestras)`.

**Interfaces:** `trpc.rascunhoPeca.criar/status`; produz `useRascunhoPecaJob()` → `{iniciar:(demandaId:number, linhasMestras:string)=>void; status; driveUrl; isRunning}`.

- [ ] **Step 1: Failing test** (contract, mirror use-analise-profunda-job.test.ts):

```ts
import { readFileSync } from "node:fs"; import { join } from "node:path";
import { describe, it, expect } from "vitest";
const src = readFileSync(join(process.cwd(),"src/hooks/use-rascunho-peca-job.ts"),"utf8");
describe("use-rascunho-peca-job", () => {
  it("chama criar", () => expect(src).toContain("rascunhoPeca.criar"));
  it("poll status com refetchInterval", () => { expect(src).toContain("rascunhoPeca.status"); expect(src).toContain("refetchInterval"); });
  it("invalida demandas.list ao pronto", () => expect(src).toMatch(/demandas\.list\.invalidate/));
});
```

- [ ] **Step 2:** run → FAIL. **Step 3:** escrever o hook espelhando `use-analise-profunda-job.ts` (mutation `rascunhoPeca.criar`; poll `rascunhoPeca.status` com `refetchInterval` enquanto `rascunhando`; em `pronto`→toast+invalidate+setDemandaId(null); em `erro`→toast). `iniciar(id, linhasMestras)` guarda `demandaId` e chama `criar.mutate({demandaId:id, linhasMestras})`.
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: UI** — em `kanban-premium.tsx`, adicionar `onRascunharPeca?: (id:number)=>void` + `rascunhoAtivo?: boolean` ao `KanbanAtoContext` (tipo+destructure+Provider), e um botão irmão do "Análise profunda" (ícone `FileText` do lucide), habilitado só quando a demanda tem `analise_profunda_status==='concluida'` (o card já recebe a demanda; usar `demanda.analiseProfundaStatus`). Em `demandas-premium-view.tsx`, instanciar `useRascunhoPecaJob()` e passar `onRascunharPeca={(id)=>{ const lm = window.prompt("Linhas mestras da peça (direção estratégica):","")||""; rp.iniciar(id, lm); }}` e `rascunhoAtivo={rp.isRunning}`. (Grep os locais reais; não confiar em nº de linha.)
- [ ] **Step 6:** `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "rascunho|kanban-premium|demandas-premium-view" || echo "sem erros"`. **Step 7:** commit `feat(2c.2b): hook + botão 'Rascunhar peça' (linhas mestras) no card`.

---

## Live Acceptance (pós-tasks)
1 demanda Júri/VVD com `analise_profunda_status='concluida'` → "Rascunhar peça" → digitar linhas mestras → `.docx` guiado aparece em `Protocolar/` → `rascunho_status='pronto'`, link no card.

## Self-Review
- Cobertura: §2 fluxo → Tasks 3+4; §3.1 helpers → Task 2; §3.2 estado → Task 1+3; UI → Task 5; skill → Task 4.
- Consistência: `rascunhoStatus`/`rascunhoTaskId`/`rascunhoDriveUrl` (T1) usados em T3/T5; helpers (T2) em T3; meta `fonte:"fase2c2b"` (T2) consumida pela skill (T4).
- Placeholders: nenhum; o `window.prompt` do MVP é intencional (input de linhas mestras leve; pode virar dialog depois).
