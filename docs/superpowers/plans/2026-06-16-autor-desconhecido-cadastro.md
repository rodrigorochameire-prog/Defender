# Cadastro de autor não identificado — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar o tratamento de autor não identificado no OMBUDS — nunca fundir cadastros (sempre novo assistido por CNJ + flag), nome placeholder enriquecido pelo scrape, e backfill/desfusão dos existentes.

**Architecture:** Helpers puros de detecção/nomenclatura (`autor-desconhecido.ts`) consumidos por: a regra de match (`assistido-match.ts`), os dois caminhos de import (`pje-import.ts` + webhook `openclaw`), um serviço de enriquecimento disparado no `importFromPje` (enrichment.ts), e um script de backfill com desfusão.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, Postgres (Supabase), Vitest. Migrações via `drizzle-kit`. Worker local usa `enrichment-engine/.venv` para scripts de DB.

---

## Estrutura de arquivos

**Criar:**
- `src/lib/autor-desconhecido.ts` — helpers puros (detecção + nomenclatura).
- `src/lib/__tests__/autor-desconhecido.test.ts` — testes dos helpers.
- `src/lib/services/enriquecer-autor-desconhecido.ts` — upgrade do nome a partir da metadata do processo.
- `scripts/backfill-autor-desconhecido.ts` — backfill + desfusão (idempotente, `--dry-run`).

**Modificar:**
- `drizzle/schema.ts` — coluna `autorNaoIdentificado` em `assistidos`.
- `src/lib/assistido-match.ts` — guarda never-merge.
- `src/lib/__tests__/assistido-match.test.ts` — caso novo.
- `src/lib/services/pje-import.ts` — bloco de resolução do assistido (never-merge + criação com placeholder/flag).
- `src/app/api/webhooks/openclaw/route.ts` — placeholder/flag + reconhecimento do legado.
- `src/lib/trpc/routers/enrichment.ts` — gatilho do enriquecimento + persistir `parte_contraria`.

---

## Task 1: Migração — flag `autor_nao_identificado`

**Files:**
- Modify: `drizzle/schema.ts` (tabela `assistidos`, ~3436-3503)
- Migration: gerada por `drizzle-kit`

- [ ] **Step 1: Adicionar a coluna ao schema**

Em `drizzle/schema.ts`, dentro de `export const assistidos = pgTable("assistidos", { ... })`, adicionar (junto aos demais campos, antes do bloco de índices):
```ts
  autorNaoIdentificado: boolean("autor_nao_identificado").default(false).notNull(),
```
Garantir que `boolean` está importado de `drizzle-orm/pg-core` (já deve estar; se não, adicionar ao import existente).

⚠️ **Dois schemas:** o projeto pode ter a tabela `assistidos` definida em mais de um lugar (`drizzle/schema.ts` e/ou `src/lib/db/schema/*.ts`). Conferir qual é o schema que `src/lib/db` (usado por `enrichment.ts`/`pje-import.ts`) realmente importa — `grep -rn "pgTable(\"assistidos\"" src drizzle` — e adicionar a coluna em TODOS os que definem `assistidos`, para o tipo Drizzle (`assistido.autorNaoIdentificado`) existir nas Tasks 4 e 6.

- [ ] **Step 2: Gerar a migração**

Run: `npm run db:generate`
Expected: cria um arquivo em `drizzle/` com `ALTER TABLE "assistidos" ADD COLUMN "autor_nao_identificado" boolean DEFAULT false NOT NULL;`

- [ ] **Step 3: Acrescentar índice parcial à migração gerada**

No arquivo de migração recém-criado (o `.sql` mais novo em `drizzle/`), acrescentar ao final:
```sql
CREATE INDEX IF NOT EXISTS "assistidos_autor_nao_id_idx" ON "assistidos" ("autor_nao_identificado") WHERE "autor_nao_identificado";
```

- [ ] **Step 4: Aplicar a migração**

Run: `npm run db:push`
Expected: aplica sem erro; `\d assistidos` mostra a coluna nova.

- [ ] **Step 5: Typecheck + commit**

Run: `npm run typecheck` (sem erro novo em schema.ts)
```bash
git add drizzle/schema.ts drizzle/
git commit -m "feat(assistidos): coluna autor_nao_identificado"
```

---

## Task 2: Helpers puros — `autor-desconhecido.ts`

**Files:**
- Create: `src/lib/autor-desconhecido.ts`
- Test: `src/lib/__tests__/autor-desconhecido.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// src/lib/__tests__/autor-desconhecido.test.ts
import { describe, it, expect } from "vitest";
import {
  isAutorDesconhecido, placeholderAutorDesconhecido, siglaProcedimento,
  extrairNumeroDesconhecido, nomeAutorDesconhecido,
} from "../autor-desconhecido";

describe("isAutorDesconhecido", () => {
  it.each([
    ["Desconhecido 1", true],
    ["Não Identificado", true],
    ["⚠ A identificar — 0001234-56.2024.8.05.0039", true],
    ["Autor Incerto", true],
    ["Ignorado", true],
    ["Maria Eliana Santos", false],
    ["", false],
    [null, false],
  ])("'%s' → %s", (nome, esperado) => {
    expect(isAutorDesconhecido(nome as any)).toBe(esperado);
  });
});

describe("placeholderAutorDesconhecido", () => {
  it("ancora no CNJ", () => {
    expect(placeholderAutorDesconhecido("8013994-84.2024.8.05.0039"))
      .toBe("Desconhecido — 8013994-84.2024.8.05.0039");
  });
});

describe("siglaProcedimento", () => {
  it.each([
    ["PRODUÇÃO ANTECIPADA DE PROVAS CRIMINAL", "PAP"],
    ["Inquérito Policial", "IP"],
    ["Ação Penal", "AP"],
    ["Medidas Protetivas de Urgência", "MPU"],
    ["Execução da Pena", "EP"],
  ])("'%s' → %s", (classe, sigla) => {
    expect(siglaProcedimento(classe)).toBe(sigla);
  });
  it("fallback = classe trimada quando desconhecida", () => {
    expect(siglaProcedimento("Algo Estranho")).toBe("Algo Estranho");
  });
  it("null quando vazia", () => {
    expect(siglaProcedimento(null)).toBeNull();
  });
});

describe("extrairNumeroDesconhecido", () => {
  it.each([
    ["Desconhecido 1 (REQUERIDO)", 1],
    ["Desconhecido 2", 2],
    ["Não Identificado", null],
    [null, null],
  ])("'%s' → %s", (s, n) => {
    expect(extrairNumeroDesconhecido(s as any)).toBe(n);
  });
});

describe("nomeAutorDesconhecido", () => {
  const cnj = "8013994-84.2024.8.05.0039";
  it("completo: N + tipo + (sigla · comarca)", () => {
    expect(nomeAutorDesconhecido({
      cnj, classe: "PRODUÇÃO ANTECIPADA DE PROVAS CRIMINAL", assunto: "Estupro",
      comarca: "Camaçari", poloPassivo: "Desconhecido 1 (REQUERIDO)",
    })).toBe("Desconhecido 1 — Estupro (PAP · Camaçari)");
  });
  it("sem assunto: usa a sigla como tipo, comarca em parênteses", () => {
    expect(nomeAutorDesconhecido({ cnj, classe: "Inquérito Policial", comarca: "Camaçari" }))
      .toBe("Desconhecido — IP (Camaçari)");
  });
  it("sem tipo nenhum → placeholder", () => {
    expect(nomeAutorDesconhecido({ cnj })).toBe("Desconhecido — " + cnj);
  });
  it("desempate acrescenta o sequencial do CNJ", () => {
    expect(nomeAutorDesconhecido({
      cnj, classe: "PRODUÇÃO ANTECIPADA DE PROVAS CRIMINAL", assunto: "Estupro",
      comarca: "Camaçari", poloPassivo: "Desconhecido 1 (REQUERIDO)", desempate: true,
    })).toBe("Desconhecido 1 — Estupro (PAP · Camaçari) · 8013994");
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run src/lib/__tests__/autor-desconhecido.test.ts`
Expected: FAIL — `Cannot find module '../autor-desconhecido'`.

- [ ] **Step 3: Implementar**

```ts
// src/lib/autor-desconhecido.ts

function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

const RE_DESCONHECIDO = /desconhecid|nao identificad|incerto|ignorad|a identificar/;

export function isAutorDesconhecido(s: string | null | undefined): boolean {
  if (!s) return false;
  return RE_DESCONHECIDO.test(normalizar(s));
}

export function placeholderAutorDesconhecido(cnj: string): string {
  return `Desconhecido — ${cnj.trim()}`;
}

const CATALOGO_SIGLA: Array<[RegExp, string]> = [
  [/produc.*antecipada/, "PAP"],
  [/inquerito/, "IP"],
  [/acao penal/, "AP"],
  [/medidas? protetiv|maria da penha|11\.?340/, "MPU"],
  [/execucao/, "EP"],
];

export function siglaProcedimento(classe: string | null | undefined): string | null {
  if (!classe || !classe.trim()) return null;
  const n = normalizar(classe);
  for (const [re, sigla] of CATALOGO_SIGLA) if (re.test(n)) return sigla;
  return classe.trim();
}

export function extrairNumeroDesconhecido(poloPassivo: string | null | undefined): number | null {
  if (!poloPassivo) return null;
  const m = normalizar(poloPassivo).match(/desconhecid\w*\s+(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export interface NomeAutorArgs {
  cnj: string;
  classe?: string | null;
  assunto?: string | null;
  comarca?: string | null;
  poloPassivo?: string | null;
  desempate?: boolean;
}

export function nomeAutorDesconhecido(a: NomeAutorArgs): string {
  const n = extrairNumeroDesconhecido(a.poloPassivo);
  const cabeca = "Desconhecido" + (n ? ` ${n}` : "");
  const sigla = siglaProcedimento(a.classe);
  const assunto = a.assunto?.trim() || null;
  const comarca = a.comarca?.trim() || null;

  // tipo = assunto (preferido) ou a sigla do procedimento
  const tipo = assunto || sigla;
  if (!tipo) return placeholderAutorDesconhecido(a.cnj);

  // parênteses: sigla só entra se ela NÃO foi usada como tipo; comarca sempre que houver
  const parens = [assunto ? sigla : null, comarca].filter(Boolean) as string[];
  let nome = `${cabeca} — ${tipo}`;
  if (parens.length) nome += ` (${parens.join(" · ")})`;
  if (a.desempate) nome += ` · ${a.cnj.split("-")[0]}`;
  return nome;
}
```

- [ ] **Step 4: Rodar e confirmar PASS**

Run: `npx vitest run src/lib/__tests__/autor-desconhecido.test.ts`
Expected: todos PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/autor-desconhecido.ts src/lib/__tests__/autor-desconhecido.test.ts
git commit -m "feat(assistidos): helpers puros de autor não identificado (detecção + nome)"
```

---

## Task 3: Guarda never-merge no match

**Files:**
- Modify: `src/lib/assistido-match.ts`
- Test: `src/lib/__tests__/assistido-match.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final do `describe("classificarMatchNome", ...)` em `assistido-match.test.ts`:
```ts
  it("autor desconhecido NUNCA casa (nem com outro desconhecido)", () => {
    expect(classificarMatchNome("Desconhecido — 8013994-84.2024.8.05.0039", "Não Identificado").tipo).toBe("new");
    expect(classificarMatchNome("Não Identificado", "Não Identificado").tipo).toBe("new");
    expect(classificarMatchNome("⚠ A identificar — X", "Maria Silva").tipo).toBe("new");
  });
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run src/lib/__tests__/assistido-match.test.ts`
Expected: FAIL no caso novo (hoje "Não Identificado"×"Não Identificado" daria "exact").

- [ ] **Step 3: Implementar a guarda**

Em `src/lib/assistido-match.ts`, adicionar o import no topo:
```ts
import { isAutorDesconhecido } from "./autor-desconhecido";
```
E no início de `classificarMatchNome` (logo após a abertura da função, antes de `const a = ...`):
```ts
  if (isAutorDesconhecido(nomeImport) || isAutorDesconhecido(nomeExistente)) {
    return { tipo: "new", similarity: 0 };
  }
```

- [ ] **Step 4: Rodar e confirmar PASS**

Run: `npx vitest run src/lib/__tests__/assistido-match.test.ts`
Expected: todos PASS (inclusive os antigos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/assistido-match.ts src/lib/__tests__/assistido-match.test.ts
git commit -m "feat(assistidos): match nunca funde autor não identificado"
```

---

## Task 4: Import `pje-import.ts` — never-merge + criação com placeholder/flag

**Files:**
- Modify: `src/lib/services/pje-import.ts`

- [ ] **Step 1: Ler o bloco de resolução do assistido**

Ler `src/lib/services/pje-import.ts` na função `importarDemandas`, do passo 1b (desempate por CNJ, ~204) até a criação do assistido (~301). Identificar:
- a variável da flag do parser por linha (`row.assistidoNaoIdentificado`);
- o passo do `ilike` por nome (`db.query.assistidos.findFirst({ where: ilike(...) })`, ~232-252);
- o `db.insert(assistidos).values({ nome: row.assistido.trim(), ... })` (~264-301).

- [ ] **Step 2: Adicionar o import dos helpers**

No topo de `pje-import.ts`:
```ts
import { placeholderAutorDesconhecido } from "@/lib/autor-desconhecido";
```

- [ ] **Step 3: Pular o reuso por nome quando autor desconhecido**

Envolver o passo do `ilike` (o `findFirst` por nome, ~232-252) na condição de NÃO ser autor desconhecido:
```ts
if (!assistido && !row.assistidoNaoIdentificado) {
  // ...bloco existente do ilike por nome (mantido intacto)...
}
```
(O desempate por CNJ ~204-230 permanece — ele reusa o assistido do PRÓPRIO processo, garantindo idempotência por CNJ.)

- [ ] **Step 4: Criar com placeholder + flag**

No `db.insert(assistidos).values({...})` (~264-301), tornar o nome e a flag condicionais:
```ts
const ehDesconhecido = !!row.assistidoNaoIdentificado;
const nomeNovo = ehDesconhecido
  ? placeholderAutorDesconhecido(row.processoNumero)
  : row.assistido.trim();
// no .values({...}):
//   nome: nomeNovo,
//   autorNaoIdentificado: ehDesconhecido,
//   observacoes: ehDesconhecido ? `Importado do PJe com autor não identificado. Processo ${row.processoNumero}.` : <valor atual>,
```
Ajustar o objeto `.values({...})` existente para usar `nomeNovo`, acrescentar `autorNaoIdentificado: ehDesconhecido,` e o `observacoes` condicional. Não alterar o restante do insert (Drive folder, statusPrisional, etc.).

- [ ] **Step 5: Typecheck + suíte**

Run: `npm run typecheck && npx vitest run`
Expected: sem erro novo; suíte verde (as falhas pré-existentes de ambiente `.claude/worktrees` permanecem iguais — confirmar que nada novo quebrou em pje-import).

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/pje-import.ts
git commit -m "feat(import): autor não identificado nunca funde — cria por CNJ com flag"
```

---

## Task 5: Webhook `openclaw` — placeholder/flag + reconhecer legado

**Files:**
- Modify: `src/app/api/webhooks/openclaw/route.ts`

- [ ] **Step 1: Ler o bloco (~78-200)**

Ler a rota: o trecho que monta o nome do placeholder (`"⚠ A identificar — {CNJ}"`, ~127-129), o `INSERT INTO assistidos` (~131-146), e o "rename ao identificar" (~117-122, que checa `nome.startsWith(ASSISTIDO_A_IDENTIFICAR)`).

- [ ] **Step 2: Importar os helpers**

```ts
import { placeholderAutorDesconhecido, isAutorDesconhecido } from "@/lib/autor-desconhecido";
```

- [ ] **Step 3: Usar o placeholder unificado + flag na criação**

Onde monta o nome do desconhecido (~127-129), trocar o literal por `placeholderAutorDesconhecido(numeroProcesso)`. No insert do assistido (~131-146), acrescentar `autor_nao_identificado: true` (ou `autorNaoIdentificado: true`, conforme o estilo — SQL cru ou drizzle no arquivo).

- [ ] **Step 4: Reconhecer placeholder legado no rename**

No "rename ao identificar" (~117-122), trocar a checagem `nome.startsWith(ASSISTIDO_A_IDENTIFICAR)` por `isAutorDesconhecido(nomeAtual)` — assim reconhece tanto `"⚠ A identificar — …"` quanto `"Desconhecido — …"` antes de sobrescrever com o nome real.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: sem erro novo no arquivo.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/webhooks/openclaw/route.ts
git commit -m "feat(openclaw): unifica placeholder de autor não identificado + reconhece legado"
```

---

## Task 6: Enriquecimento do nome + persistir polo passivo

**Files:**
- Create: `src/lib/services/enriquecer-autor-desconhecido.ts`
- Modify: `src/lib/trpc/routers/enrichment.ts` (mutation `importFromPje`, ~1106-1118)
- Test: `src/lib/__tests__/enriquecer-autor-desconhecido.test.ts`

- [ ] **Step 1: Teste do serviço (com db mockado)**

```ts
// src/lib/__tests__/enriquecer-autor-desconhecido.test.ts
import { describe, it, expect, vi } from "vitest";
import { computarNomeEnriquecido } from "../services/enriquecer-autor-desconhecido";

describe("computarNomeEnriquecido", () => {
  it("compõe o nome descritivo do processo + assistido desconhecido", () => {
    const out = computarNomeEnriquecido({
      autorNaoIdentificado: true,
      numeroAutos: "8013994-84.2024.8.05.0039",
      classeProcessual: "PRODUÇÃO ANTECIPADA DE PROVAS CRIMINAL",
      assunto: "Estupro", comarca: "Camaçari",
      parteContraria: "Desconhecido 1 (REQUERIDO)",
    });
    expect(out).toBe("Desconhecido 1 — Estupro (PAP · Camaçari)");
  });
  it("não enriquece quando o assistido não é autor desconhecido", () => {
    expect(computarNomeEnriquecido({
      autorNaoIdentificado: false, numeroAutos: "X", assunto: "Estupro",
    })).toBeNull();
  });
  it("não enriquece sem tipo (placeholder permanece) → null", () => {
    expect(computarNomeEnriquecido({
      autorNaoIdentificado: true, numeroAutos: "X",
    })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run src/lib/__tests__/enriquecer-autor-desconhecido.test.ts`
Expected: FAIL — módulo/função inexistente.

- [ ] **Step 3: Implementar o serviço (função pura + wrapper de DB)**

```ts
// src/lib/services/enriquecer-autor-desconhecido.ts
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { processos, assistidos } from "@/lib/db/schema"; // ajustar ao caminho real do schema usado no projeto
import { nomeAutorDesconhecido, placeholderAutorDesconhecido } from "@/lib/autor-desconhecido";

export interface DadosEnriquecimento {
  autorNaoIdentificado: boolean;
  numeroAutos: string;
  classeProcessual?: string | null;
  assunto?: string | null;
  comarca?: string | null;
  parteContraria?: string | null;
}

/** Função PURA: retorna o nome descritivo, ou null se não deve enriquecer
 *  (não é autor desconhecido, ou não há tipo suficiente → mantém placeholder). */
export function computarNomeEnriquecido(d: DadosEnriquecimento): string | null {
  if (!d.autorNaoIdentificado) return null;
  const nome = nomeAutorDesconhecido({
    cnj: d.numeroAutos, classe: d.classeProcessual, assunto: d.assunto,
    comarca: d.comarca, poloPassivo: d.parteContraria,
  });
  // se degradou para o placeholder, não há ganho — não renomeia
  if (nome === placeholderAutorDesconhecido(d.numeroAutos)) return null;
  return nome;
}

/** Aplica o enriquecimento ao assistido do processo (no-op se não aplicável). */
export async function enriquecerNomeAutorDesconhecido(processoId: number): Promise<void> {
  const proc = await db.query.processos.findFirst({ where: eq(processos.id, processoId) });
  if (!proc?.assistidoId) return;
  const assistido = await db.query.assistidos.findFirst({ where: eq(assistidos.id, proc.assistidoId) });
  if (!assistido?.autorNaoIdentificado) return;

  const novo = computarNomeEnriquecido({
    autorNaoIdentificado: assistido.autorNaoIdentificado,
    numeroAutos: proc.numeroAutos,
    classeProcessual: proc.classeProcessual,
    assunto: proc.assunto,
    comarca: proc.comarca,
    parteContraria: proc.parteContraria,
  });
  if (!novo || novo === assistido.nome) return;
  await db.update(assistidos).set({ nome: novo, updatedAt: new Date() }).where(eq(assistidos.id, assistido.id));
}
```
> Ajustar os imports (`@/lib/db`, caminho do schema) aos que `enrichment.ts` já usa no projeto.

- [ ] **Step 4: Rodar o teste da função pura + confirmar PASS**

Run: `npx vitest run src/lib/__tests__/enriquecer-autor-desconhecido.test.ts`
Expected: PASS (o teste exercita só `computarNomeEnriquecido`, sem DB).

- [ ] **Step 5: Persistir polo passivo + disparar o enriquecimento no `importFromPje`**

Em `src/lib/trpc/routers/enrichment.ts`, no `updateData` da mutation `importFromPje` (~1106-1118), acrescentar a captura do polo passivo ANTES do `db.update`:
```ts
if (Array.isArray(proc.partes)) {
  const pc = proc.partes.filter((p: any) => p.polo === "passivo").map((p: any) => p.nome).join("; ");
  if (pc) updateData.parteContraria = pc;
}
```
E LOGO APÓS o bloco `if (Object.keys(updateData).length > 0) { await db.update(...) }`, chamar o enriquecimento:
```ts
try {
  const { enriquecerNomeAutorDesconhecido } = await import("@/lib/services/enriquecer-autor-desconhecido");
  await enriquecerNomeAutorDesconhecido(input.processoId);
} catch (e) {
  console.warn(`[enrich] autor-desconhecido falhou p/ processo ${input.processoId}:`, e);
}
```

- [ ] **Step 6: Typecheck + suíte**

Run: `npm run typecheck && npx vitest run src/lib/__tests__/enriquecer-autor-desconhecido.test.ts`
Expected: sem erro novo; teste verde.

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/enriquecer-autor-desconhecido.ts src/lib/__tests__/enriquecer-autor-desconhecido.test.ts src/lib/trpc/routers/enrichment.ts
git commit -m "feat(enrich): persiste polo passivo e enriquece nome de autor não identificado"
```

---

## Task 7: Backfill + desfusão

**Files:**
- Create: `scripts/backfill-autor-desconhecido.ts`

- [ ] **Step 1: Implementar o script (com `--dry-run`)**

```ts
// scripts/backfill-autor-desconhecido.ts
// Uso: tsx scripts/backfill-autor-desconhecido.ts --dry-run   (ou sem flag p/ aplicar)
import "dotenv/config";
import postgres from "postgres";
import { isAutorDesconhecido, placeholderAutorDesconhecido, nomeAutorDesconhecido } from "../src/lib/autor-desconhecido";

const DRY = process.argv.includes("--dry-run");
const sql = postgres(process.env.DATABASE_URL!.replace(/^"|"$/g, ""), { prepare: false, ssl: "require" });

function log(m: string) { console.log(m); }

async function main() {
  const assistidos = await sql<{ id: number; nome: string; autor_nao_identificado: boolean }[]>`
    SELECT id, nome, autor_nao_identificado FROM assistidos WHERE deleted_at IS NULL`;
  const alvos = assistidos.filter((a) => a.autor_nao_identificado || isAutorDesconhecido(a.nome));
  log(`alvos: ${alvos.length}${DRY ? " (DRY-RUN)" : ""}`);

  for (const a of alvos) {
    const procs = await sql<{ id: number; numero_autos: string; classe_processual: string | null; assunto: string | null; comarca: string | null; parte_contraria: string | null }[]>`
      SELECT id, numero_autos, classe_processual, assunto, comarca, parte_contraria
      FROM processos WHERE assistido_id = ${a.id} AND deleted_at IS NULL ORDER BY id`;

    if (procs.length === 0) {
      log(`  #${a.id} "${a.nome}" — sem processo, só marca flag`);
      if (!DRY) await sql`UPDATE assistidos SET autor_nao_identificado = true, updated_at = now() WHERE id = ${a.id}`;
      continue;
    }

    // 1º processo fica com este assistido; renomeia
    const nomeFor = (p: typeof procs[number]) =>
      nomeAutorDesconhecido({ cnj: p.numero_autos, classe: p.classe_processual, assunto: p.assunto, comarca: p.comarca, poloPassivo: p.parte_contraria })
      || placeholderAutorDesconhecido(p.numero_autos);

    const p0 = procs[0];
    const nome0 = nomeFor(p0);
    log(`  #${a.id} → "${nome0}" (proc ${p0.numero_autos})`);
    if (!DRY) await sql`UPDATE assistidos SET nome = ${nome0}, autor_nao_identificado = true, updated_at = now() WHERE id = ${a.id}`;

    // processos extras (fusão) → desfundir: novo assistido por processo
    for (const p of procs.slice(1)) {
      const nomeN = nomeFor(p);
      log(`    DESFUNDIR proc ${p.numero_autos} → novo assistido "${nomeN}"`);
      if (!DRY) {
        const [novo] = await sql<{ id: number }[]>`
          INSERT INTO assistidos (nome, autor_nao_identificado, created_at, updated_at)
          VALUES (${nomeN}, true, now(), now()) RETURNING id`;
        await sql`UPDATE processos SET assistido_id = ${novo.id}, updated_at = now() WHERE id = ${p.id}`;
        await sql`UPDATE demandas SET assistido_id = ${novo.id}, updated_at = now() WHERE processo_id = ${p.id}`;
      }
    }
  }
  await sql.end();
  log("fim.");
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Rodar o DRY-RUN e conferir o plano**

Run: `npx tsx scripts/backfill-autor-desconhecido.ts --dry-run`
Expected: imprime os alvos, os renomes propostos e as desfusões — SEM escrever. Conferir manualmente que: o nosso `#2232` aparece como `Desconhecido — 8013994-…` ou descritivo (se já tiver assunto/comarca), e que assistidos fundidos (se houver) mostram desfusão por CNJ.

- [ ] **Step 3: Commit do script (execução real fica a critério do usuário)**

```bash
git add scripts/backfill-autor-desconhecido.ts
git commit -m "feat(backfill): normaliza e desfunde cadastros de autor não identificado (dry-run)"
```

> A **execução real** (`sem --dry-run`) é decisão do usuário, após revisar o dry-run — mexe em dados de produção.

---

## Notas de verificação final

- `npm run typecheck` limpo.
- `npx vitest run src/lib/__tests__/autor-desconhecido.test.ts src/lib/__tests__/assistido-match.test.ts src/lib/__tests__/enriquecer-autor-desconhecido.test.ts` — verde.
- Dois CNJs de autor desconhecido importados geram dois assistidos distintos (flag true), nomes placeholder; após `importFromPje`, viram descritivos.
- Dry-run do backfill revisado antes de qualquer execução real.
