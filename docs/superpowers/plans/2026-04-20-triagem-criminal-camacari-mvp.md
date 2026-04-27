# Triagem Criminal Camaçari — Plano de Implementação MVP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar a Dil (servidora da triagem criminal) a registrar atendimentos numa planilha Google Sheets que sincroniza automaticamente com OMBUDS, criando registros na tabela nova `atendimentos_triagem` que os 4 defensores criminais avaliam em página dedicada `/triagem` sem poluir o kanban de demandas.

**Architecture:** Planilha Google Sheets com 12 abas (5 operacionais + 2 auto-QUERY + 5 referência) com Apps Script `onEdit` que envia `POST /api/triagem/atendimento`. Backend cria registro em `atendimentos_triagem` (tabela nova, separada de `demandas`). Página `/triagem` em Next.js App Router lista cards filtráveis com ações Promover/Resolver/Devolver/Arquivar. Crons diários sincronizam Cowork.Coberturas → aba Escala e Cowork.Agenda → aba Plenários (Drizzle reads → Apps Script `setValues`). Drive estrutura criada manualmente com 4 modelos `.docx` no MVP.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Drizzle ORM, PostgreSQL (Supabase), Vitest, Tailwind, Radix UI, Google Apps Script, Google Sheets API v4, Vercel Cron.

**Spec:** `docs/superpowers/specs/2026-04-20-triagem-criminal-camacari-design.md`

---

## File Structure

### Criar (novos arquivos)

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/db/schema/triagem.ts` | Schema Drizzle: tabela `atendimentos_triagem` + types |
| `drizzle/00XX_atendimentos_triagem.sql` | Migration (gerada pelo `db:generate`) |
| `src/lib/services/triagem.ts` | Lógica de domínio: criar, validar, promover, auto-resolver |
| `src/lib/services/triagem-escala.ts` | Regra de plantão mensal + leitura Cowork.Coberturas |
| `src/app/api/triagem/atendimento/route.ts` | `POST` cria atendimento |
| `src/app/api/triagem/atendimento/[id]/route.ts` | `PATCH` ações (resolver/devolver/arquivar/reatribuir) |
| `src/app/api/triagem/atendimento/[id]/promover/route.ts` | `POST` promove a demanda |
| `src/app/api/triagem/atendimentos/route.ts` | `GET` lista paginada com filtros |
| `src/app/api/cowork/escala/route.ts` | `GET` retorna escala por mês (lê Coberturas + plantão) |
| `src/app/api/cron/triagem-sync-planilha/route.ts` | Cron diário: reescreve abas Escala + Plenários |
| `src/app/triagem/page.tsx` | Página listagem |
| `src/components/triagem/atendimento-card.tsx` | Card individual de atendimento |
| `src/components/triagem/atendimento-actions.tsx` | Dropdown de ações (Promover/Resolver/etc) |
| `src/components/triagem/triagem-filters.tsx` | Filtros (Hoje/Pendentes/Todos + busca) |
| `src/components/triagem/triagem-badge.tsx` | Badge no header com contagem |
| `src/components/dashboard/atendimentos-pendentes-card.tsx` | Card lateral no dashboard |
| `docs/triagem-script.gs` | Template Apps Script da planilha |
| `scripts/triagem-setup-spreadsheet.ts` | Script tsx que cria a spreadsheet com 12 abas |
| `__tests__/services/triagem.test.ts` | Testes do service triagem |
| `__tests__/services/triagem-escala.test.ts` | Testes do service escala |
| `__tests__/api/triagem-atendimento.test.ts` | Testes endpoint POST/PATCH |
| `__tests__/api/triagem-promover.test.ts` | Testes endpoint promover |
| `docs/runbooks/triagem-treinamento-dil.md` | Roteiro de treinamento da Dil |

### Modificar (arquivos existentes)

| Arquivo | Mudança |
|---|---|
| `src/lib/db/schema/index.ts` | Re-exportar tudo de `./triagem` |
| `src/components/layout/Header.tsx` (ou equivalente) | Adicionar `<TriagemBadge />` |
| `src/app/dashboard/page.tsx` (ou equivalente) | Adicionar `<AtendimentosPendentesCard />` |
| `vercel.json` | Adicionar cron `triagem-sync-planilha` (06:00 BRT) |
| `.env.example` | Adicionar `TRIAGEM_SPREADSHEET_ID` |

---

## Decisões de implementação assumidas

Baseadas no spec (Seção 10 — decisões pendentes resolvidas com defaults):

1. **Nome interno:** `triagem` (módulo) e `TCC-AAAA-NNNN` (protocolo)
2. **Orientação geral sem processo** → cai em **1ª Crime** por convenção da Dil
3. **Stats** fica fora do MVP (Fase 2)
4. **Defensores** identificados por `users.id` (lookup por nome no service `triagem-escala.ts`)
5. **Plantão mensal Júri/EP/VVD** codificado como tabela `escala_revezamento` (versão simplificada — pode evoluir)
6. **Auto-resolução**: ativada quando `documento_entregue ≠ 'Nenhum'` E (`demanda_livre IS NULL` OU `demanda_livre` < 30 caracteres)
7. **Cron 06:00 BRT** = `09:00 UTC`

---

# Onda A — Backend (banco + serviços + endpoints)

### Task 1: Schema Drizzle + migration

**Files:**
- Create: `src/lib/db/schema/triagem.ts`
- Modify: `src/lib/db/schema/index.ts`
- Migration: `drizzle/00XX_atendimentos_triagem.sql` (gerada)

- [ ] **Step 1.1: Criar schema**

```typescript
// src/lib/db/schema/triagem.ts
import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, demandas } from "./core";

export const atendimentosTriagem = pgTable("atendimentos_triagem", {
  id: serial("id").primaryKey(),
  tccRef: varchar("tcc_ref", { length: 20 }).notNull().unique(),
  area: varchar("area", { length: 20 }).notNull(),
  defensorAlvoId: integer("defensor_alvo_id").references(() => users.id),

  assistidoNome: text("assistido_nome").notNull(),
  assistidoTelefone: varchar("assistido_telefone", { length: 30 }),
  assistidoCpf: varchar("assistido_cpf", { length: 14 }),

  compareceu: varchar("compareceu", { length: 20 }).notNull().default("proprio"),
  familiarNome: text("familiar_nome"),
  familiarTelefone: varchar("familiar_telefone", { length: 30 }),
  familiarGrau: varchar("familiar_grau", { length: 30 }),

  processoCnj: varchar("processo_cnj", { length: 25 }),
  situacao: varchar("situacao", { length: 50 }),
  vara: varchar("vara", { length: 30 }),

  urgencia: boolean("urgencia").notNull().default(false),
  urgenciaMotivo: varchar("urgencia_motivo", { length: 50 }),

  documentoEntregue: varchar("documento_entregue", { length: 50 }).default("Nenhum"),
  demandaLivre: text("demanda_livre"),

  status: varchar("status", { length: 30 }).notNull().default("pendente_avaliacao"),
  promovidoParaDemandaId: integer("promovido_para_demanda_id").references(() => demandas.id),
  delegadoPara: varchar("delegado_para", { length: 30 }),
  motivoDevolucao: text("motivo_devolucao"),
  motivoOverride: text("motivo_override"),

  protocoloSolar: varchar("protocolo_solar", { length: 50 }),

  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  criadoPorAppsScript: varchar("criado_por_apps_script", { length: 100 }),
  abaPlanilha: varchar("aba_planilha", { length: 20 }),
  linhaPlanilha: integer("linha_planilha"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  decididoEm: timestamp("decidido_em"),
  decididoPorId: integer("decidido_por_id").references(() => users.id),
}, (table) => [
  index("triagem_status_idx").on(table.status),
  index("triagem_defensor_alvo_idx").on(table.defensorAlvoId),
  index("triagem_area_idx").on(table.area),
  index("triagem_urgencia_idx").on(table.urgencia),
  index("triagem_created_at_idx").on(table.createdAt),
  index("triagem_processo_cnj_idx").on(table.processoCnj),
]);

export type AtendimentoTriagem = typeof atendimentosTriagem.$inferSelect;
export type InsertAtendimentoTriagem = typeof atendimentosTriagem.$inferInsert;

export const atendimentosTriagemRelations = relations(atendimentosTriagem, ({ one }) => ({
  defensorAlvo: one(users, {
    fields: [atendimentosTriagem.defensorAlvoId],
    references: [users.id],
    relationName: "defensorAlvo",
  }),
  decididoPor: one(users, {
    fields: [atendimentosTriagem.decididoPorId],
    references: [users.id],
    relationName: "decididoPor",
  }),
  promovidoParaDemanda: one(demandas, {
    fields: [atendimentosTriagem.promovidoParaDemandaId],
    references: [demandas.id],
  }),
}));
```

- [ ] **Step 1.2: Re-exportar no index**

```typescript
// src/lib/db/schema/index.ts — adicionar linha
export * from "./triagem";
```

- [ ] **Step 1.3: Gerar migration**

Run: `npm run db:generate`
Expected: novo arquivo `drizzle/00XX_atendimentos_triagem.sql` criado contendo `CREATE TABLE atendimentos_triagem ...`

- [ ] **Step 1.4: Aplicar migration**

Run: `npm run db:push`
Expected: confirmação `[✓] Changes applied` e tabela criada no Supabase.

- [ ] **Step 1.5: Verificar tabela existe**

Run: `npx tsx -e "import {db} from '@/lib/db'; import {atendimentosTriagem} from '@/lib/db/schema'; (async()=>{const r=await db.select().from(atendimentosTriagem).limit(1); console.log('OK', r);})()"`
Expected: `OK []`

- [ ] **Step 1.6: Commit**

```bash
git add src/lib/db/schema/triagem.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat(triagem): add atendimentos_triagem table for criminal triage workflow"
```

---

### Task 2: Service de domínio — criação e validação

**Files:**
- Create: `src/lib/services/triagem.ts`
- Test: `__tests__/services/triagem.test.ts`

- [ ] **Step 2.1: Escrever teste falhante — geração de TCC ref**

```typescript
// __tests__/services/triagem.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { generateTccRef, normalizePayload, shouldAutoResolve } from "@/lib/services/triagem";

describe("generateTccRef", () => {
  it("formata ano + número sequencial com 4 dígitos", () => {
    expect(generateTccRef(2026, 1)).toBe("TCC-2026-0001");
    expect(generateTccRef(2026, 124)).toBe("TCC-2026-0124");
    expect(generateTccRef(2026, 9999)).toBe("TCC-2026-9999");
  });

  it("rejeita ano fora do intervalo razoável", () => {
    expect(() => generateTccRef(1999, 1)).toThrow(/ano inválido/i);
    expect(() => generateTccRef(2100, 1)).toThrow(/ano inválido/i);
  });
});

describe("normalizePayload", () => {
  it("preenche compareceu='proprio' como default", () => {
    const p = normalizePayload({ assistido_nome: "João" });
    expect(p.compareceu).toBe("proprio");
  });

  it("trata urgência=string como boolean", () => {
    expect(normalizePayload({ assistido_nome: "X", urgencia: "Mandado prisão" }).urgencia).toBe(true);
    expect(normalizePayload({ assistido_nome: "X", urgencia: "Não" }).urgencia).toBe(false);
    expect(normalizePayload({ assistido_nome: "X", urgencia: "" }).urgencia).toBe(false);
  });

  it("preserva urgenciaMotivo quando urgencia=true", () => {
    const p = normalizePayload({ assistido_nome: "X", urgencia: "Mandado prisão" });
    expect(p.urgenciaMotivo).toBe("Mandado prisão");
  });

  it("rejeita CNJ inválido", () => {
    expect(() => normalizePayload({ assistido_nome: "X", processo_cnj: "12345" }))
      .toThrow(/CNJ/i);
  });

  it("aceita CNJ no formato correto (20 dígitos com pontuação removida)", () => {
    const p = normalizePayload({
      assistido_nome: "X",
      processo_cnj: "8001234-56.2026.8.05.0039",
    });
    expect(p.processoCnj).toBe("80012345620268050039");
  });
});

describe("shouldAutoResolve", () => {
  it("auto-resolve quando documento entregue e demanda livre vazia", () => {
    expect(shouldAutoResolve({
      documentoEntregue: "Decl. União Estável",
      demandaLivre: null,
    })).toBe(true);
  });

  it("auto-resolve quando documento entregue e demanda livre curta", () => {
    expect(shouldAutoResolve({
      documentoEntregue: "Destit. Adv",
      demandaLivre: "só assinatura",
    })).toBe(true);
  });

  it("não auto-resolve quando demanda livre é substantiva", () => {
    expect(shouldAutoResolve({
      documentoEntregue: "Decl. União Estável",
      demandaLivre: "Esposa quer fazer visita ao preso, mas também precisa de orientação sobre divórcio e guarda dos filhos.",
    })).toBe(false);
  });

  it("não auto-resolve sem documento entregue", () => {
    expect(shouldAutoResolve({
      documentoEntregue: "Nenhum",
      demandaLivre: null,
    })).toBe(false);
  });
});
```

- [ ] **Step 2.2: Run tests, verify failure**

Run: `npm test -- triagem.test.ts`
Expected: FAIL com `Cannot find module '@/lib/services/triagem'`

- [ ] **Step 2.3: Implementar service**

```typescript
// src/lib/services/triagem.ts
import { z } from "zod";

export function generateTccRef(year: number, seq: number): string {
  if (year < 2020 || year > 2099) {
    throw new Error(`Ano inválido: ${year}`);
  }
  return `TCC-${year}-${String(seq).padStart(4, "0")}`;
}

const URGENCIA_NAO = new Set(["Não", "Nao", "", "false", "0"]);

export interface NormalizedPayload {
  assistidoNome: string;
  assistidoTelefone?: string;
  assistidoCpf?: string;
  compareceu: "proprio" | "familiar" | "outro";
  familiarNome?: string;
  familiarTelefone?: string;
  familiarGrau?: string;
  processoCnj?: string;
  situacao?: string;
  vara?: string;
  urgencia: boolean;
  urgenciaMotivo?: string;
  documentoEntregue: string;
  demandaLivre?: string;
}

const COMPARECEU_VALID = new Set(["proprio", "familiar", "outro"]);

export function normalizePayload(raw: Record<string, unknown>): NormalizedPayload {
  const nome = String(raw.assistido_nome ?? "").trim();
  if (!nome) throw new Error("assistido_nome é obrigatório");

  const compareceuRaw = String(raw.compareceu ?? "proprio").toLowerCase();
  const compareceu = COMPARECEU_VALID.has(compareceuRaw)
    ? (compareceuRaw as "proprio" | "familiar" | "outro")
    : "proprio";

  const urgenciaRaw = String(raw.urgencia ?? "Não");
  const urgencia = !URGENCIA_NAO.has(urgenciaRaw);

  let processoCnj: string | undefined;
  if (raw.processo_cnj) {
    const digits = String(raw.processo_cnj).replace(/\D/g, "");
    if (digits.length !== 20) {
      throw new Error(`CNJ inválido: precisa ter 20 dígitos, recebido ${digits.length}`);
    }
    processoCnj = digits;
  }

  return {
    assistidoNome: nome,
    assistidoTelefone: raw.telefone ? String(raw.telefone) : undefined,
    assistidoCpf: raw.cpf ? String(raw.cpf) : undefined,
    compareceu,
    familiarNome: raw.familiar_nome ? String(raw.familiar_nome) : undefined,
    familiarTelefone: raw.familiar_telefone ? String(raw.familiar_telefone) : undefined,
    familiarGrau: raw.familiar_grau ? String(raw.familiar_grau) : undefined,
    processoCnj,
    situacao: raw.situacao ? String(raw.situacao) : undefined,
    vara: raw.vara ? String(raw.vara) : undefined,
    urgencia,
    urgenciaMotivo: urgencia ? urgenciaRaw : undefined,
    documentoEntregue: String(raw.documento_entregue ?? "Nenhum"),
    demandaLivre: raw.demanda ? String(raw.demanda) : undefined,
  };
}

export interface AutoResolveInput {
  documentoEntregue: string;
  demandaLivre: string | null | undefined;
}

export function shouldAutoResolve({ documentoEntregue, demandaLivre }: AutoResolveInput): boolean {
  if (documentoEntregue === "Nenhum" || !documentoEntregue) return false;
  const len = (demandaLivre ?? "").trim().length;
  return len < 30;
}
```

- [ ] **Step 2.4: Run tests, verify pass**

Run: `npm test -- triagem.test.ts`
Expected: All pass (green) — 9 tests passing.

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/services/triagem.ts __tests__/services/triagem.test.ts
git commit -m "feat(triagem): add domain service with payload normalization and auto-resolve rules"
```

---

### Task 3: Endpoint POST /api/triagem/atendimento

**Files:**
- Create: `src/app/api/triagem/atendimento/route.ts`
- Test: `__tests__/api/triagem-atendimento.test.ts`
- Modify: `src/lib/services/triagem.ts` (adicionar `createAtendimento`)

- [ ] **Step 3.1: Adicionar `createAtendimento` ao service**

```typescript
// src/lib/services/triagem.ts (anexar ao final)
import { db } from "@/lib/db";
import { atendimentosTriagem } from "@/lib/db/schema";
import { sql, eq, desc } from "drizzle-orm";

export interface CreateAtendimentoInput {
  aba: "Juri" | "VVD" | "EP" | "Crime1" | "Crime2";
  linha: number;
  payload: Record<string, unknown>;
  appsScriptId?: string;
}

export interface CreateAtendimentoResult {
  atendimentoId: number;
  tccRef: string;
  status: string;
  triagemUrl: string;
}

const AREA_MAP: Record<string, string> = {
  Juri: "Juri",
  VVD: "VVD",
  EP: "EP",
  Crime1: "Crime1",
  Crime2: "Crime2",
};

export async function createAtendimento(input: CreateAtendimentoInput): Promise<CreateAtendimentoResult> {
  const area = AREA_MAP[input.aba];
  if (!area) throw new Error(`Aba inválida: ${input.aba}`);

  const normalized = normalizePayload(input.payload);

  const year = new Date().getFullYear();
  const seqResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(atendimentosTriagem)
    .where(sql`extract(year from ${atendimentosTriagem.createdAt}) = ${year}`);
  const seq = (seqResult[0]?.count ?? 0) + 1;
  const tccRef = generateTccRef(year, seq);

  const initialStatus = shouldAutoResolve({
    documentoEntregue: normalized.documentoEntregue,
    demandaLivre: normalized.demandaLivre ?? null,
  })
    ? "resolvido"
    : "pendente_avaliacao";

  const [row] = await db.insert(atendimentosTriagem).values({
    tccRef,
    area,
    assistidoNome: normalized.assistidoNome,
    assistidoTelefone: normalized.assistidoTelefone,
    assistidoCpf: normalized.assistidoCpf,
    compareceu: normalized.compareceu,
    familiarNome: normalized.familiarNome,
    familiarTelefone: normalized.familiarTelefone,
    familiarGrau: normalized.familiarGrau,
    processoCnj: normalized.processoCnj,
    situacao: normalized.situacao,
    vara: normalized.vara,
    urgencia: normalized.urgencia,
    urgenciaMotivo: normalized.urgenciaMotivo,
    documentoEntregue: normalized.documentoEntregue,
    demandaLivre: normalized.demandaLivre,
    status: initialStatus,
    abaPlanilha: input.aba,
    linhaPlanilha: input.linha,
    criadoPorAppsScript: input.appsScriptId,
    decididoEm: initialStatus === "resolvido" ? new Date() : null,
  }).returning();

  return {
    atendimentoId: row.id,
    tccRef: row.tccRef,
    status: row.status,
    triagemUrl: `/triagem?id=${row.id}`,
  };
}
```

- [ ] **Step 3.2: Escrever teste do endpoint**

```typescript
// __tests__/api/triagem-atendimento.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/triagem/atendimento/route";
import { db } from "@/lib/db";
import { atendimentosTriagem } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SECRET = process.env.SHEETS_WEBHOOK_SECRET ?? "test-secret";

function makeRequest(body: object, auth = `Bearer ${SECRET}`): Request {
  return new Request("http://localhost/api/triagem/atendimento", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: auth },
    body: JSON.stringify(body),
  });
}

describe("POST /api/triagem/atendimento", () => {
  const createdIds: number[] = [];

  afterEach(async () => {
    if (createdIds.length > 0) {
      for (const id of createdIds) {
        await db.delete(atendimentosTriagem).where(eq(atendimentosTriagem.id, id));
      }
      createdIds.length = 0;
    }
  });

  it("rejeita sem auth", async () => {
    const res = await POST(makeRequest({ aba: "Juri", linha: 4, payload: { assistido_nome: "X" } }, "Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("rejeita aba inválida", async () => {
    const res = await POST(makeRequest({ aba: "Cível", linha: 4, payload: { assistido_nome: "X" } }));
    expect(res.status).toBe(400);
  });

  it("cria atendimento e retorna TCC ref + URL", async () => {
    const res = await POST(makeRequest({
      aba: "Juri",
      linha: 4,
      payload: { assistido_nome: "João Silva", telefone: "71999990000", urgencia: "Mandado prisão" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.tccRef).toMatch(/^TCC-\d{4}-\d{4}$/);
    expect(body.triagemUrl).toContain("/triagem?id=");
    createdIds.push(body.atendimentoId);

    const [row] = await db.select().from(atendimentosTriagem).where(eq(atendimentosTriagem.id, body.atendimentoId));
    expect(row.assistidoNome).toBe("João Silva");
    expect(row.urgencia).toBe(true);
    expect(row.status).toBe("pendente_avaliacao");
  });

  it("auto-resolve quando documento entregue + demanda vazia", async () => {
    const res = await POST(makeRequest({
      aba: "Crime1",
      linha: 5,
      payload: { assistido_nome: "Maria Santos", documento_entregue: "Decl. União Estável" },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("resolvido");
    createdIds.push(body.atendimentoId);
  });
});
```

- [ ] **Step 3.3: Run tests, verify failure**

Run: `npm test -- triagem-atendimento.test.ts`
Expected: FAIL com `Cannot find module '@/app/api/triagem/atendimento/route'`

- [ ] **Step 3.4: Implementar endpoint**

```typescript
// src/app/api/triagem/atendimento/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAtendimento } from "@/lib/services/triagem";

const ABAS_VALIDAS = new Set(["Juri", "VVD", "EP", "Crime1", "Crime2"]);

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  if (!secret) {
    return NextResponse.json({ error: "Servidor não configurado" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: { aba?: string; linha?: number; payload?: Record<string, unknown>; apps_script_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.aba || !ABAS_VALIDAS.has(body.aba)) {
    return NextResponse.json({ error: `aba inválida: ${body.aba}` }, { status: 400 });
  }
  if (typeof body.linha !== "number") {
    return NextResponse.json({ error: "linha é obrigatória" }, { status: 400 });
  }
  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ error: "payload é obrigatório" }, { status: 400 });
  }

  try {
    const result = await createAtendimento({
      aba: body.aba as "Juri" | "VVD" | "EP" | "Crime1" | "Crime2",
      linha: body.linha,
      payload: body.payload,
      appsScriptId: body.apps_script_id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    console.error("[Triagem] criar atendimento falhou:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
```

- [ ] **Step 3.5: Run tests, verify pass**

Run: `npm test -- triagem-atendimento.test.ts`
Expected: All pass — 4 tests.

- [ ] **Step 3.6: Commit**

```bash
git add src/lib/services/triagem.ts src/app/api/triagem/atendimento/route.ts __tests__/api/triagem-atendimento.test.ts
git commit -m "feat(triagem): add POST /api/triagem/atendimento endpoint with auth and validation"
```

---

### Task 4: Service e endpoint GET /api/triagem/atendimentos

**Files:**
- Modify: `src/lib/services/triagem.ts` (adicionar `listAtendimentos`)
- Create: `src/app/api/triagem/atendimentos/route.ts`
- Test: append em `__tests__/api/triagem-atendimento.test.ts`

- [ ] **Step 4.1: Adicionar service de listagem**

```typescript
// src/lib/services/triagem.ts (anexar ao final)
import { and, gte, lte } from "drizzle-orm";

export interface ListAtendimentosFilter {
  defensorId?: number;
  status?: string;
  area?: string;
  desde?: Date;
  ate?: Date;
  limit?: number;
  offset?: number;
}

export async function listAtendimentos(f: ListAtendimentosFilter = {}) {
  const conds = [];
  if (f.defensorId) conds.push(eq(atendimentosTriagem.defensorAlvoId, f.defensorId));
  if (f.status) conds.push(eq(atendimentosTriagem.status, f.status));
  if (f.area) conds.push(eq(atendimentosTriagem.area, f.area));
  if (f.desde) conds.push(gte(atendimentosTriagem.createdAt, f.desde));
  if (f.ate) conds.push(lte(atendimentosTriagem.createdAt, f.ate));

  const where = conds.length > 0 ? and(...conds) : undefined;

  return db
    .select()
    .from(atendimentosTriagem)
    .where(where)
    .orderBy(desc(atendimentosTriagem.createdAt))
    .limit(f.limit ?? 50)
    .offset(f.offset ?? 0);
}

export async function countPendentesPorDefensor(defensorId: number): Promise<number> {
  const r = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(atendimentosTriagem)
    .where(and(
      eq(atendimentosTriagem.defensorAlvoId, defensorId),
      eq(atendimentosTriagem.status, "pendente_avaliacao"),
    ));
  return r[0]?.count ?? 0;
}
```

- [ ] **Step 4.2: Escrever teste**

```typescript
// __tests__/api/triagem-atendimento.test.ts (anexar ao final do describe)
import { GET } from "@/app/api/triagem/atendimentos/route";

describe("GET /api/triagem/atendimentos", () => {
  it("rejeita sem auth", async () => {
    const req = new Request("http://localhost/api/triagem/atendimentos");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("retorna lista filtrada por status", async () => {
    const req = new Request("http://localhost/api/triagem/atendimentos?status=pendente_avaliacao", {
      headers: { authorization: `Bearer ${SECRET}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.atendimentos)).toBe(true);
  });
});
```

- [ ] **Step 4.3: Implementar endpoint**

```typescript
// src/app/api/triagem/atendimentos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listAtendimentos } from "@/lib/services/triagem";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const defensorId = url.searchParams.get("defensor_id");
  const atendimentos = await listAtendimentos({
    defensorId: defensorId ? Number(defensorId) : undefined,
    status: url.searchParams.get("status") ?? undefined,
    area: url.searchParams.get("area") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 50),
    offset: Number(url.searchParams.get("offset") ?? 0),
  });

  return NextResponse.json({ atendimentos });
}
```

- [ ] **Step 4.4: Run tests**

Run: `npm test -- triagem-atendimento.test.ts`
Expected: All 6 tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/services/triagem.ts src/app/api/triagem/atendimentos/route.ts __tests__/api/triagem-atendimento.test.ts
git commit -m "feat(triagem): add GET /api/triagem/atendimentos with filters"
```

---

### Task 5: Service e endpoint Promover

**Files:**
- Modify: `src/lib/services/triagem.ts` (adicionar `promoverAtendimento`)
- Create: `src/app/api/triagem/atendimento/[id]/promover/route.ts`
- Create: `__tests__/api/triagem-promover.test.ts`

- [ ] **Step 5.1: Escrever teste falhante**

```typescript
// __tests__/api/triagem-promover.test.ts
import { describe, it, expect, afterEach } from "vitest";
import { POST } from "@/app/api/triagem/atendimento/[id]/promover/route";
import { db } from "@/lib/db";
import { atendimentosTriagem, demandas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAtendimento } from "@/lib/services/triagem";

const SECRET = process.env.SHEETS_WEBHOOK_SECRET ?? "test-secret";

describe("POST /api/triagem/atendimento/:id/promover", () => {
  const createdIds: { atendimento: number; demanda: number | null }[] = [];

  afterEach(async () => {
    for (const { atendimento, demanda } of createdIds) {
      if (demanda) await db.delete(demandas).where(eq(demandas.id, demanda));
      await db.delete(atendimentosTriagem).where(eq(atendimentosTriagem.id, atendimento));
    }
    createdIds.length = 0;
  });

  it("promove atendimento e cria demanda 5_TRIAGEM", async () => {
    const created = await createAtendimento({
      aba: "Juri",
      linha: 5,
      payload: { assistido_nome: "Promotest 1" },
    });

    const req = new Request(`http://localhost/api/triagem/atendimento/${created.atendimentoId}/promover`, {
      method: "POST",
      headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
      body: JSON.stringify({ defensorId: 1 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: String(created.atendimentoId) }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.demandaId).toBeGreaterThan(0);

    const [a] = await db.select().from(atendimentosTriagem).where(eq(atendimentosTriagem.id, created.atendimentoId));
    expect(a.status).toBe("promovido");
    expect(a.promovidoParaDemandaId).toBe(body.demandaId);
    createdIds.push({ atendimento: created.atendimentoId, demanda: body.demandaId });
  });

  it("rejeita promover atendimento já resolvido", async () => {
    const created = await createAtendimento({
      aba: "Crime1",
      linha: 5,
      payload: { assistido_nome: "Já resolvido", documento_entregue: "Decl. União Estável" },
    });

    const req = new Request(`http://localhost/api/triagem/atendimento/${created.atendimentoId}/promover`, {
      method: "POST",
      headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
      body: JSON.stringify({ defensorId: 1 }),
    });
    const res = await POST(req, { params: Promise.resolve({ id: String(created.atendimentoId) }) });
    expect(res.status).toBe(409);
    createdIds.push({ atendimento: created.atendimentoId, demanda: null });
  });
});
```

- [ ] **Step 5.2: Implementar service de promoção**

```typescript
// src/lib/services/triagem.ts (anexar ao final)
import { demandas } from "@/lib/db/schema";

export interface PromoverInput {
  atendimentoId: number;
  defensorId: number;
  delegarPara?: string;
  decididoPorId?: number;
}

export interface PromoverResult {
  demandaId: number;
  ombudsUrl: string;
}

const AREA_TO_DEMANDA_AREA: Record<string, string> = {
  Juri: "JURI",
  VVD: "VVD",
  EP: "EXECUCAO_PENAL",
  Crime1: "SUBSTITUICAO",
  Crime2: "SUBSTITUICAO",
};

export async function promoverAtendimento(input: PromoverInput): Promise<PromoverResult> {
  const [atendimento] = await db
    .select()
    .from(atendimentosTriagem)
    .where(eq(atendimentosTriagem.id, input.atendimentoId));

  if (!atendimento) throw new Error("Atendimento não encontrado");
  if (atendimento.status !== "pendente_avaliacao" && atendimento.status !== "devolvido") {
    const err = new Error(`Atendimento não pode ser promovido (status atual: ${atendimento.status})`);
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const observacoes = [
    `[${atendimento.tccRef}]`,
    atendimento.demandaLivre,
    atendimento.compareceu === "familiar" && atendimento.familiarNome
      ? `Compareceu: ${atendimento.familiarNome} (${atendimento.familiarGrau ?? "familiar"})`
      : null,
  ].filter(Boolean).join(" | ");

  const [novaDemanda] = await db.insert(demandas).values({
    assistidoNome: atendimento.assistidoNome,
    numeroAutos: atendimento.processoCnj,
    ato: atendimento.situacao ?? "Atendimento triagem",
    providencias: observacoes,
    status: "5_TRIAGEM",
    atribuicao: AREA_TO_DEMANDA_AREA[atendimento.area] ?? "SUBSTITUICAO",
    defensorId: input.defensorId,
    dataEntrada: atendimento.createdAt,
  }).returning();

  await db.update(atendimentosTriagem)
    .set({
      status: "promovido",
      promovidoParaDemandaId: novaDemanda.id,
      delegadoPara: input.delegarPara,
      decididoEm: new Date(),
      decididoPorId: input.decididoPorId,
    })
    .where(eq(atendimentosTriagem.id, input.atendimentoId));

  return {
    demandaId: novaDemanda.id,
    ombudsUrl: `/demandas-premium/${novaDemanda.id}`,
  };
}
```

- [ ] **Step 5.3: Implementar endpoint**

```typescript
// src/app/api/triagem/atendimento/[id]/promover/route.ts
import { NextRequest, NextResponse } from "next/server";
import { promoverAtendimento } from "@/lib/services/triagem";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const atendimentoId = Number(id);
  if (!Number.isFinite(atendimentoId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: { defensorId?: number; delegarPara?: string; decididoPorId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.defensorId) {
    return NextResponse.json({ error: "defensorId é obrigatório" }, { status: 400 });
  }

  try {
    const result = await promoverAtendimento({
      atendimentoId,
      defensorId: body.defensorId,
      delegarPara: body.delegarPara,
      decididoPorId: body.decididoPorId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const status = (e as { statusCode?: number }).statusCode ?? 400;
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ error: msg }, { status });
  }
}
```

- [ ] **Step 5.4: Run tests**

Run: `npm test -- triagem-promover.test.ts`
Expected: 2 tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add src/lib/services/triagem.ts src/app/api/triagem/atendimento/[id]/promover/route.ts __tests__/api/triagem-promover.test.ts
git commit -m "feat(triagem): add atendimento -> demanda promotion endpoint"
```

---

### Task 6: Endpoint PATCH (resolver/devolver/arquivar/reatribuir)

**Files:**
- Modify: `src/lib/services/triagem.ts` (adicionar `aplicarAcao`)
- Create: `src/app/api/triagem/atendimento/[id]/route.ts`
- Test: anexar em `__tests__/api/triagem-promover.test.ts`

- [ ] **Step 6.1: Adicionar service**

```typescript
// src/lib/services/triagem.ts (anexar)
export type AcaoAtendimento = "resolver" | "devolver" | "arquivar" | "reatribuir";

export interface AplicarAcaoInput {
  atendimentoId: number;
  acao: AcaoAtendimento;
  motivo?: string;
  novoDefensorId?: number;
  decididoPorId?: number;
}

const ACAO_TO_STATUS: Record<AcaoAtendimento, string> = {
  resolver: "resolvido",
  devolver: "devolvido",
  arquivar: "arquivado",
  reatribuir: "pendente_avaliacao",
};

export async function aplicarAcao(input: AplicarAcaoInput): Promise<{ ok: true; novoStatus: string }> {
  const novoStatus = ACAO_TO_STATUS[input.acao];
  if (!novoStatus) throw new Error(`Ação inválida: ${input.acao}`);

  const updates: Record<string, unknown> = {
    status: novoStatus,
    decididoEm: new Date(),
    decididoPorId: input.decididoPorId,
  };

  if (input.acao === "devolver") {
    if (!input.motivo) throw new Error("motivo é obrigatório ao devolver");
    updates.motivoDevolucao = input.motivo;
  }
  if (input.acao === "reatribuir") {
    if (!input.novoDefensorId) throw new Error("novoDefensorId é obrigatório ao reatribuir");
    updates.defensorAlvoId = input.novoDefensorId;
    updates.motivoOverride = input.motivo;
    updates.decididoEm = null; // volta a ser pendente
  }

  await db.update(atendimentosTriagem)
    .set(updates)
    .where(eq(atendimentosTriagem.id, input.atendimentoId));

  return { ok: true, novoStatus };
}
```

- [ ] **Step 6.2: Implementar endpoint**

```typescript
// src/app/api/triagem/atendimento/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { aplicarAcao, type AcaoAtendimento } from "@/lib/services/triagem";

const ACOES_VALIDAS: AcaoAtendimento[] = ["resolver", "devolver", "arquivar", "reatribuir"];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const atendimentoId = Number(id);
  if (!Number.isFinite(atendimentoId)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const body = await req.json().catch(() => null) as
    | { acao?: string; motivo?: string; novoDefensorId?: number; decididoPorId?: number }
    | null;
  if (!body || !ACOES_VALIDAS.includes(body.acao as AcaoAtendimento)) {
    return NextResponse.json({ error: "ação inválida" }, { status: 400 });
  }

  try {
    const result = await aplicarAcao({
      atendimentoId,
      acao: body.acao as AcaoAtendimento,
      motivo: body.motivo,
      novoDefensorId: body.novoDefensorId,
      decididoPorId: body.decididoPorId,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
```

- [ ] **Step 6.3: Adicionar testes**

```typescript
// __tests__/api/triagem-promover.test.ts (anexar)
import { PATCH } from "@/app/api/triagem/atendimento/[id]/route";

describe("PATCH /api/triagem/atendimento/:id", () => {
  const ids: number[] = [];

  afterEach(async () => {
    for (const id of ids) await db.delete(atendimentosTriagem).where(eq(atendimentosTriagem.id, id));
    ids.length = 0;
  });

  it("resolve um atendimento", async () => {
    const c = await createAtendimento({ aba: "VVD", linha: 5, payload: { assistido_nome: "Test resolver" } });
    ids.push(c.atendimentoId);

    const req = new Request(`http://localhost/api/triagem/atendimento/${c.atendimentoId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
      body: JSON.stringify({ acao: "resolver" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: String(c.atendimentoId) }) });
    expect(res.status).toBe(200);
    const [a] = await db.select().from(atendimentosTriagem).where(eq(atendimentosTriagem.id, c.atendimentoId));
    expect(a.status).toBe("resolvido");
  });

  it("rejeita devolver sem motivo", async () => {
    const c = await createAtendimento({ aba: "EP", linha: 5, payload: { assistido_nome: "Test devolver" } });
    ids.push(c.atendimentoId);
    const req = new Request(`http://localhost/api/triagem/atendimento/${c.atendimentoId}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${SECRET}`, "content-type": "application/json" },
      body: JSON.stringify({ acao: "devolver" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: String(c.atendimentoId) }) });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 6.4: Run tests**

Run: `npm test -- triagem-promover.test.ts`
Expected: 4 tests pass total.

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/services/triagem.ts src/app/api/triagem/atendimento/[id]/route.ts __tests__/api/triagem-promover.test.ts
git commit -m "feat(triagem): add PATCH endpoint for resolve/devolver/arquivar/reatribuir actions"
```

---

### Task 7: Service e endpoint Escala

**Files:**
- Create: `src/lib/services/triagem-escala.ts`
- Create: `src/app/api/cowork/escala/route.ts`
- Test: `__tests__/services/triagem-escala.test.ts`

A regra de plantão mensal **é codificada em código** (não em tabela) na versão MVP. Se mudar futuramente, basta editar essa função e fazer deploy.

- [ ] **Step 7.1: Escrever teste**

```typescript
// __tests__/services/triagem-escala.test.ts
import { describe, it, expect } from "vitest";
import { defensoresPlantaoNoMes, defensorTitularPorVara } from "@/lib/services/triagem-escala";

describe("defensoresPlantaoNoMes", () => {
  // Convenção: mês par (Jan/Mar/Mai/Jul/Set/Nov) — Rodrigo Júri+EP, Juliane VVD
  //            mês ímpar (Fev/Abr/Jun/Ago/Out/Dez) — invertido

  it("janeiro 2026 (mês 1) — Júri/EP Rodrigo, VVD Juliane", () => {
    const r = defensoresPlantaoNoMes(2026, 1);
    expect(r.juri).toBe("Rodrigo");
    expect(r.ep).toBe("Rodrigo");
    expect(r.vvd).toBe("Juliane");
  });

  it("abril 2026 (mês 4 — par) — Júri/EP Juliane, VVD Rodrigo", () => {
    const r = defensoresPlantaoNoMes(2026, 4);
    expect(r.juri).toBe("Juliane");
    expect(r.ep).toBe("Juliane");
    expect(r.vvd).toBe("Rodrigo");
  });
});

describe("defensorTitularPorVara", () => {
  it("retorna Cristiane para 1ª Vara Crime", () => {
    expect(defensorTitularPorVara("1ª Crime")).toBe("Cristiane");
  });
  it("retorna Danilo para 2ª Vara Crime", () => {
    expect(defensorTitularPorVara("2ª Crime")).toBe("Danilo");
  });
});
```

- [ ] **Step 7.2: Implementar service**

```typescript
// src/lib/services/triagem-escala.ts
export interface PlantaoMes {
  juri: "Rodrigo" | "Juliane";
  ep: "Rodrigo" | "Juliane";
  vvd: "Rodrigo" | "Juliane";
}

/**
 * Convenção atual (MVP):
 * - Meses ímpares (1,3,5,7,9,11): Rodrigo Júri+EP, Juliane VVD
 * - Meses pares (2,4,6,8,10,12): invertido
 *
 * Substituições (férias/licenças) virão da Cowork.Coberturas em fase 2.
 * Por enquanto, só a regra básica.
 */
export function defensoresPlantaoNoMes(_year: number, month: number): PlantaoMes {
  const isPar = month % 2 === 0;
  return isPar
    ? { juri: "Juliane", ep: "Juliane", vvd: "Rodrigo" }
    : { juri: "Rodrigo", ep: "Rodrigo", vvd: "Juliane" };
}

export function defensorTitularPorVara(vara: string): string | null {
  const map: Record<string, string> = {
    "1ª Crime": "Cristiane",
    "1a Crime": "Cristiane",
    "2ª Crime": "Danilo",
    "2a Crime": "Danilo",
  };
  return map[vara] ?? null;
}

export interface EscalaMes {
  ano: number;
  mes: number;
  juri: string;
  ep: string;
  vvd: string;
  vara1Crime: string;
  vara2Crime: string;
  substituicoes: { defensor: string; tipo: string; inicio: string; fim: string; substituto?: string }[];
}

export function montarEscalaMes(year: number, month: number): EscalaMes {
  const p = defensoresPlantaoNoMes(year, month);
  return {
    ano: year,
    mes: month,
    juri: p.juri,
    ep: p.ep,
    vvd: p.vvd,
    vara1Crime: "Cristiane",
    vara2Crime: "Danilo",
    substituicoes: [], // Fase 2: ler de Cowork.Coberturas
  };
}
```

- [ ] **Step 7.3: Implementar endpoint**

```typescript
// src/app/api/cowork/escala/route.ts
import { NextRequest, NextResponse } from "next/server";
import { montarEscalaMes } from "@/lib/services/triagem-escala";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const ano = Number(url.searchParams.get("ano") ?? new Date().getFullYear());
  const mes = Number(url.searchParams.get("mes") ?? new Date().getMonth() + 1);

  return NextResponse.json(montarEscalaMes(ano, mes));
}
```

- [ ] **Step 7.4: Run tests**

Run: `npm test -- triagem-escala`
Expected: 4 tests pass.

- [ ] **Step 7.5: Commit**

```bash
git add src/lib/services/triagem-escala.ts src/app/api/cowork/escala/route.ts __tests__/services/triagem-escala.test.ts
git commit -m "feat(triagem): add escala service with monthly plantao rule for Juri/EP/VVD"
```

---

# Onda B — UI OMBUDS

### Task 8: Página /triagem (lista + filtros)

**Files:**
- Create: `src/app/triagem/page.tsx`

- [ ] **Step 8.1: Implementar página com server component**

```tsx
// src/app/triagem/page.tsx
import { listAtendimentos } from "@/lib/services/triagem";
import { AtendimentoCard } from "@/components/triagem/atendimento-card";
import { TriagemFilters } from "@/components/triagem/triagem-filters";

interface PageProps {
  searchParams: Promise<{ status?: string; area?: string; busca?: string }>;
}

export default async function TriagemPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const atendimentos = await listAtendimentos({
    status: sp.status === "todos" ? undefined : (sp.status ?? "pendente_avaliacao"),
    area: sp.area === "todas" ? undefined : sp.area,
    limit: 100,
  });

  // Filtragem por busca textual (nome ou processo) no servidor
  const filtrados = sp.busca
    ? atendimentos.filter(a =>
        a.assistidoNome.toLowerCase().includes(sp.busca!.toLowerCase()) ||
        (a.processoCnj ?? "").includes(sp.busca!)
      )
    : atendimentos;

  return (
    <main className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Triagem Criminal</h1>
        <p className="text-sm text-muted-foreground">
          Atendimentos registrados pela equipe de triagem para sua avaliação
        </p>
      </header>

      <TriagemFilters current={sp} />

      <div className="mt-6 grid gap-3">
        {filtrados.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Nenhum atendimento encontrado.
          </div>
        ) : (
          filtrados.map(a => <AtendimentoCard key={a.id} atendimento={a} />)
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 8.2: Commit (página depende de componentes a criar nos próximos passos)**

```bash
git add src/app/triagem/page.tsx
git commit -m "feat(triagem): add /triagem page with server-side filtering"
```

---

### Task 9: Componente AtendimentoCard com ações

**Files:**
- Create: `src/components/triagem/atendimento-card.tsx`
- Create: `src/components/triagem/atendimento-actions.tsx`

- [ ] **Step 9.1: Implementar card**

```tsx
// src/components/triagem/atendimento-card.tsx
import type { AtendimentoTriagem } from "@/lib/db/schema";
import { AtendimentoActions } from "./atendimento-actions";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pendente_avaliacao: { label: "Aguardando", className: "bg-amber-100 text-amber-900" },
  promovido: { label: "Promovido", className: "bg-blue-100 text-blue-900" },
  resolvido: { label: "Resolvido", className: "bg-green-100 text-green-900" },
  devolvido: { label: "Devolvido", className: "bg-orange-100 text-orange-900" },
  arquivado: { label: "Arquivado", className: "bg-zinc-200 text-zinc-700" },
};

const AREA_LABELS: Record<string, string> = {
  Juri: "Júri",
  VVD: "VVD",
  EP: "EP",
  Crime1: "1ª Crime",
  Crime2: "2ª Crime",
};

export function AtendimentoCard({ atendimento: a }: { atendimento: AtendimentoTriagem }) {
  const status = STATUS_LABELS[a.status] ?? STATUS_LABELS.pendente_avaliacao;
  return (
    <article className={`rounded-lg border p-4 ${a.urgencia ? "bg-rose-50 border-rose-200" : "bg-card"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{a.tccRef}</span>
            <span>·</span>
            <span>{AREA_LABELS[a.area] ?? a.area}</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(a.createdAt), { locale: ptBR, addSuffix: true })}</span>
            {a.urgencia && <span className="text-rose-700 font-semibold">⚡ {a.urgenciaMotivo}</span>}
          </div>
          <h3 className="mt-1 font-medium">{a.assistidoNome}</h3>
          {a.processoCnj && (
            <p className="text-xs text-muted-foreground font-mono">{a.processoCnj}</p>
          )}
          {a.situacao && <p className="text-sm mt-1">{a.situacao}</p>}
          {a.demandaLivre && <p className="text-sm mt-1 italic">"{a.demandaLivre}"</p>}
          {a.compareceu === "familiar" && a.familiarNome && (
            <p className="text-xs mt-1 text-muted-foreground">
              Compareceu: {a.familiarNome} ({a.familiarGrau ?? "familiar"})
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${status.className}`}>
            {status.label}
          </span>
          {a.status === "pendente_avaliacao" && <AtendimentoActions atendimentoId={a.id} />}
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 9.2: Implementar dropdown de ações**

```tsx
// src/components/triagem/atendimento-actions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AtendimentoActions({ atendimentoId }: { atendimentoId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function call(path: string, body: object) {
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: path.includes("promover") ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Falhou");
      toast.success("OK");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading}>Ações</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => call(`/api/triagem/atendimento/${atendimentoId}/promover`, { defensorId: 1 })}>
          Promover a demanda
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => call(`/api/triagem/atendimento/${atendimentoId}`, { acao: "resolver" })}>
          Resolver na triagem
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          const motivo = window.prompt("Motivo da devolução à Dil:");
          if (motivo) call(`/api/triagem/atendimento/${atendimentoId}`, { acao: "devolver", motivo });
        }}>
          Devolver à Dil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => call(`/api/triagem/atendimento/${atendimentoId}`, { acao: "arquivar" })}>
          Arquivar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

> **Nota crítica:** o `defensorId: 1` no `Promover` é placeholder. Quando o sistema de auth estiver no contexto desta implementação, substituir por `session.user.id`. Verificar antes de marcar a Task como completa.

- [ ] **Step 9.3: Implementar filtros**

```tsx
// src/components/triagem/triagem-filters.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function TriagemFilters({ current }: { current: { status?: string; area?: string; busca?: string } }) {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (value && value !== "todos" && value !== "todas") next.set(key, value);
    else next.delete(key);
    router.push(`/triagem?${next.toString()}`);
  }

  const statuses = [
    { v: "pendente_avaliacao", l: "Pendentes" },
    { v: "promovido", l: "Promovidos" },
    { v: "resolvido", l: "Resolvidos" },
    { v: "devolvido", l: "Devolvidos" },
    { v: "todos", l: "Todos" },
  ];
  const areas = [
    { v: "todas", l: "Todas áreas" },
    { v: "Juri", l: "Júri" },
    { v: "VVD", l: "VVD" },
    { v: "EP", l: "EP" },
    { v: "Crime1", l: "1ª Crime" },
    { v: "Crime2", l: "2ª Crime" },
  ];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex gap-1">
        {statuses.map(s => (
          <button
            key={s.v}
            onClick={() => update("status", s.v)}
            className={`text-xs rounded px-2 py-1 border ${(current.status ?? "pendente_avaliacao") === s.v ? "bg-foreground text-background" : ""}`}
          >
            {s.l}
          </button>
        ))}
      </div>
      <select
        value={current.area ?? "todas"}
        onChange={e => update("area", e.target.value)}
        className="text-xs border rounded px-2 py-1"
      >
        {areas.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
      </select>
      <input
        type="search"
        placeholder="Buscar nome ou processo..."
        defaultValue={current.busca ?? ""}
        onBlur={e => update("busca", e.target.value)}
        className="text-xs border rounded px-2 py-1 flex-1 min-w-[200px]"
      />
    </div>
  );
}
```

- [ ] **Step 9.4: Smoke test no browser**

Run: `npm run dev` (em background) e abrir `http://localhost:3000/triagem`
Expected: página renderiza, "Nenhum atendimento encontrado." se DB vazio. Sem erro de console.

- [ ] **Step 9.5: Commit**

```bash
git add src/components/triagem/
git commit -m "feat(triagem): add AtendimentoCard, ações dropdown and filters UI"
```

---

### Task 10: Badge de contagem no header

**Files:**
- Create: `src/components/triagem/triagem-badge.tsx`
- Modify: arquivo do header (encontrar via grep antes — ex: `src/components/layout/Header.tsx` ou `src/components/sidebar/...`)

- [ ] **Step 10.1: Identificar arquivo do header**

Run grep:
```
Use Grep tool: pattern="header|topbar|navbar" path="src/components" type="tsx" -l
```

Expected: lista de componentes; escolher o que renderiza no layout principal (`src/app/layout.tsx` referencia).

- [ ] **Step 10.2: Implementar badge**

```tsx
// src/components/triagem/triagem-badge.tsx
import { countPendentesPorDefensor } from "@/lib/services/triagem";
import { Bell } from "lucide-react";
import Link from "next/link";

export async function TriagemBadge({ defensorId }: { defensorId: number }) {
  const count = await countPendentesPorDefensor(defensorId);
  if (count === 0) return null;

  return (
    <Link href="/triagem" className="relative inline-flex items-center gap-1 text-sm hover:opacity-80">
      <Bell className="h-4 w-4" />
      <span className="hidden sm:inline">Triagem</span>
      <span className="rounded-full bg-rose-500 text-white text-[10px] font-semibold px-1.5 py-0.5 leading-none">
        {count}
      </span>
    </Link>
  );
}
```

- [ ] **Step 10.3: Inserir no Header**

Edit no arquivo do header identificado em 10.1. Encontrar área de itens à direita (geralmente onde fica o avatar ou notificações), inserir:

```tsx
import { TriagemBadge } from "@/components/triagem/triagem-badge";
// ...
{session?.user?.id && <TriagemBadge defensorId={session.user.id} />}
```

(adaptar conforme o sistema de auth existente — pode ser `auth()`, `useSession()`, ou variável injetada).

- [ ] **Step 10.4: Smoke test no browser**

Recarregar app. Se houver atendimentos pendentes, badge aparece com contagem.

- [ ] **Step 10.5: Commit**

```bash
git add src/components/triagem/triagem-badge.tsx [arquivo-do-header]
git commit -m "feat(triagem): add header badge with pending count"
```

---

### Task 11: Card lateral no dashboard

**Files:**
- Create: `src/components/dashboard/atendimentos-pendentes-card.tsx`
- Modify: arquivo do dashboard (ex: `src/app/dashboard/page.tsx`)

- [ ] **Step 11.1: Implementar card**

```tsx
// src/components/dashboard/atendimentos-pendentes-card.tsx
import { listAtendimentos } from "@/lib/services/triagem";
import Link from "next/link";

export async function AtendimentosPendentesCard({ defensorId }: { defensorId: number }) {
  const atendimentos = await listAtendimentos({
    defensorId,
    status: "pendente_avaliacao",
    limit: 5,
  });

  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Triagem — pendentes</h3>
        <Link href="/triagem" className="text-xs text-muted-foreground hover:underline">
          Ver todos →
        </Link>
      </header>
      {atendimentos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum atendimento aguardando.</p>
      ) : (
        <ul className="space-y-2">
          {atendimentos.map(a => (
            <li key={a.id} className="text-sm">
              <Link href={`/triagem?id=${a.id}`} className="hover:underline">
                <span className="font-mono text-xs text-muted-foreground">{a.tccRef}</span>{" "}
                <span className="font-medium">{a.assistidoNome}</span>
                {a.urgencia && <span className="ml-1 text-rose-600">⚡</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 11.2: Inserir no dashboard**

Identificar via grep a página atual do dashboard, e adicionar `<AtendimentosPendentesCard defensorId={...} />` na sidebar/grid.

- [ ] **Step 11.3: Commit**

```bash
git add src/components/dashboard/atendimentos-pendentes-card.tsx [arquivo-do-dashboard]
git commit -m "feat(triagem): add pending atendimentos card on dashboard"
```

---

# Onda C — Apps Script + Planilha

### Task 12: Apps Script triagem-script.gs

**Files:**
- Create: `docs/triagem-script.gs`

- [ ] **Step 12.1: Implementar template completo**

```javascript
// docs/triagem-script.gs
/**
 * TRIAGEM CRIMINAL — Apps Script de Captura → OMBUDS
 *
 * INSTALAÇÃO:
 * 1. Abrir a planilha "Triagem Criminal — DP Camaçari"
 * 2. Extensões → Apps Script
 * 3. Substituir conteúdo por este arquivo
 * 4. Configurar Script Properties (chave 🔧 no menu lateral):
 *      - SHEETS_WEBHOOK_SECRET = mesmo valor do .env do OMBUDS
 *      - OMBUDS_BASE_URL = ex: https://ombuds.vercel.app
 * 5. Salvar (Ctrl+S)
 * 6. Executar `instalarTriggers` uma vez
 * 7. Autorizar permissões
 */

const ABAS_OPERACIONAIS = ["Juri", "VVD", "EP", "1ª Crime", "2ª Crime"];

const ABA_TO_API = {
  "Juri":      "Juri",
  "VVD":       "VVD",
  "EP":        "EP",
  "1ª Crime":  "Crime1",
  "2ª Crime":  "Crime2",
};

// Colunas comuns (1-indexed). Ajustar se layout mudar.
const COL = {
  TCC:                1,
  DATA:               2,
  ASSISTIDO_NOME:     3,
  TELEFONE:           4,
  COMPARECEU:         5,
  SITUACAO:           6,
  PROCESSO:           7,
  DEFENSOR_SUGERIDO:  8,
  DEFENSOR_ATRIBUIDO: 9,
  URGENCIA:           10,
  DOC_ENTREGUE:       11,
  DEMANDA:            12,
  PROTOCOLO_SOLAR:    13,
  STATUS_SYNC:        14,
};

// ==================================================
// TRIGGER PRINCIPAL
// ==================================================

function onEditTrigger(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const aba = sheet.getName();

  if (ABAS_OPERACIONAIS.indexOf(aba) === -1) return;
  const row = e.range.getRow();
  if (row <= 2) return; // header + totalizador

  // Só dispara quando a Dil terminar de preencher os campos mínimos
  const nome = sheet.getRange(row, COL.ASSISTIDO_NOME).getValue();
  if (!nome) return;

  const statusAtual = sheet.getRange(row, COL.STATUS_SYNC).getValue();
  if (typeof statusAtual === "string" && statusAtual.indexOf("✓") === 0) return; // já sincronizado

  // Só envia quando a coluna DEMANDA for preenchida (heurística de "terminei de digitar")
  if (e.range.getColumn() !== COL.DEMANDA && e.range.getColumn() !== COL.URGENCIA) {
    return; // espera o último campo
  }

  enviarAtendimento(sheet, aba, row);
}

// ==================================================
// ENVIO PARA OMBUDS
// ==================================================

function enviarAtendimento(sheet, aba, row) {
  const props = PropertiesService.getScriptProperties();
  const SECRET = props.getProperty("SHEETS_WEBHOOK_SECRET");
  const BASE = props.getProperty("OMBUDS_BASE_URL") || "https://ombuds.vercel.app";

  if (!SECRET) {
    sheet.getRange(row, COL.STATUS_SYNC).setValue("❌ SECRET ausente");
    return;
  }

  const payload = {
    aba: ABA_TO_API[aba],
    linha: row,
    apps_script_id: ScriptApp.getScriptId(),
    payload: {
      assistido_nome:  sheet.getRange(row, COL.ASSISTIDO_NOME).getValue(),
      telefone:        sheet.getRange(row, COL.TELEFONE).getValue(),
      compareceu:      String(sheet.getRange(row, COL.COMPARECEU).getValue() || "Próprio").toLowerCase(),
      situacao:        sheet.getRange(row, COL.SITUACAO).getValue(),
      processo_cnj:    sheet.getRange(row, COL.PROCESSO).getValue(),
      urgencia:        sheet.getRange(row, COL.URGENCIA).getValue() || "Não",
      documento_entregue: sheet.getRange(row, COL.DOC_ENTREGUE).getValue() || "Nenhum",
      demanda:         sheet.getRange(row, COL.DEMANDA).getValue(),
    },
  };

  try {
    const res = UrlFetchApp.fetch(BASE + "/api/triagem/atendimento", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    const body = JSON.parse(res.getContentText() || "{}");

    if (code === 200) {
      sheet.getRange(row, COL.TCC).setValue(body.tccRef);
      const link = '=HYPERLINK("' + BASE + body.triagemUrl + '","✓ #" & "' + body.atendimentoId + '")';
      sheet.getRange(row, COL.STATUS_SYNC).setFormula(link);
    } else {
      sheet.getRange(row, COL.STATUS_SYNC).setValue("❌ " + (body.error || code));
    }
  } catch (err) {
    sheet.getRange(row, COL.STATUS_SYNC).setValue("❌ " + err.message);
  }
}

// ==================================================
// MENU CUSTOMIZADO
// ==================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⚡ Triagem")
    .addItem("Reprocessar pendências (linha atual)", "reprocessarLinhaAtual")
    .addItem("Reprocessar pendências (todas as abas)", "reprocessarTodasPendencias")
    .addSeparator()
    .addItem("Sincronizar Escala agora", "sincronizarEscalaAgora")
    .addItem("Sincronizar Plenários agora", "sincronizarPlenariosAgora")
    .addToUi();
}

function reprocessarLinhaAtual() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const aba = sheet.getName();
  if (ABAS_OPERACIONAIS.indexOf(aba) === -1) {
    SpreadsheetApp.getUi().alert("Posicione-se em uma das abas operacionais.");
    return;
  }
  enviarAtendimento(sheet, aba, sheet.getActiveRange().getRow());
}

function reprocessarTodasPendencias() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let processadas = 0;
  ABAS_OPERACIONAIS.forEach(function (aba) {
    const sheet = ss.getSheetByName(aba);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    for (let r = 2; r < data.length; r++) {
      const status = String(data[r][COL.STATUS_SYNC - 1] || "");
      const nome = data[r][COL.ASSISTIDO_NOME - 1];
      if (nome && status.indexOf("❌") === 0) {
        enviarAtendimento(sheet, aba, r + 1);
        processadas++;
      }
    }
  });
  SpreadsheetApp.getUi().alert("Reprocessadas: " + processadas);
}

function sincronizarEscalaAgora() {
  _sincronizarAba("escala", "Escala");
}

function sincronizarPlenariosAgora() {
  _sincronizarAba("plenarios", "Plenários");
}

function _sincronizarAba(tipo, nomeAba) {
  const props = PropertiesService.getScriptProperties();
  const SECRET = props.getProperty("SHEETS_WEBHOOK_SECRET");
  const BASE = props.getProperty("OMBUDS_BASE_URL") || "https://ombuds.vercel.app";
  const url = BASE + "/api/cron/triagem-sync-planilha?tipo=" + tipo;
  UrlFetchApp.fetch(url, {
    method: "post",
    headers: { Authorization: "Bearer " + SECRET },
    muteHttpExceptions: true,
  });
  SpreadsheetApp.getUi().alert("Sincronização de " + nomeAba + " disparada.");
}

// ==================================================
// INSTALAÇÃO DE TRIGGERS
// ==================================================

function instalarTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("onEditTrigger").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  SpreadsheetApp.getUi().alert("Trigger onEdit instalado.");
}
```

- [ ] **Step 12.2: Commit**

```bash
git add docs/triagem-script.gs
git commit -m "feat(triagem): add Apps Script template for Google Sheets capture"
```

---

### Task 13: Script de setup da spreadsheet

Cria a planilha programaticamente via Sheets API com 12 abas, headers, validações dropdown, formatação, fórmulas.

**Files:**
- Create: `scripts/triagem-setup-spreadsheet.ts`

- [ ] **Step 13.1: Implementar script**

```typescript
// scripts/triagem-setup-spreadsheet.ts
import { google } from "googleapis";
import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"];

async function getAuth(): Promise<JWT> {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "{}");
  return new google.auth.JWT(key.client_email, undefined, key.private_key, SCOPES);
}

const ABAS_OPERACIONAIS = ["Juri", "VVD", "EP", "1ª Crime", "2ª Crime"];
const ABAS_AUTO = ["Hoje", "Pendências"];
const ABAS_REF = ["Escala", "Plenários", "Documentos prontos", "Cheat Sheet", "Stats"];

const HEADERS_COMUNS = [
  "#TCC", "Data/hora", "Assistido", "Telefone", "Compareceu",
  "Situação", "Nº Processo", "Defensor sugerido", "Defensor atribuído",
  "Urgência", "Doc. entregue", "Demanda", "Protocolo Solar", "Status sync",
];

const URGENCIA_OPTS = ["Não", "Mandado prisão", "Audiência ≤7d", "Pedido expresso"];
const COMPARECEU_OPTS = ["Próprio", "Familiar", "Outro"];
const DOC_OPTS = ["Nenhum", "União Estável", "Destit. Adv", "Decl. Hipossuficiência", "Outro"];

async function main() {
  const auth = await getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: "Triagem Criminal — DP Camaçari" },
      sheets: [...ABAS_OPERACIONAIS, ...ABAS_AUTO, ...ABAS_REF].map((title, i) => ({
        properties: { title, index: i, gridProperties: { rowCount: 2000, columnCount: 20, frozenRowCount: 1 } },
      })),
    },
  });

  const spreadsheetId = created.data.spreadsheetId!;
  console.log(`✅ Planilha criada: ${spreadsheetId}`);
  console.log(`   URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}`);

  // Popular headers nas abas operacionais
  const requests: object[] = [];
  for (const aba of ABAS_OPERACIONAIS) {
    const sheetId = created.data.sheets!.find(s => s.properties?.title === aba)!.properties!.sheetId!;
    requests.push({
      updateCells: {
        rows: [{ values: HEADERS_COMUNS.map(h => ({ userEnteredValue: { stringValue: h }, userEnteredFormat: { textFormat: { bold: true } } })) }],
        fields: "userEnteredValue,userEnteredFormat.textFormat.bold",
        start: { sheetId, rowIndex: 0, columnIndex: 0 },
      },
    });
    // Validation Compareceu (col E = index 4)
    requests.push(makeValidation(sheetId, 4, COMPARECEU_OPTS));
    // Validation Urgência (col J = index 9)
    requests.push(makeValidation(sheetId, 9, URGENCIA_OPTS));
    // Validation Doc entregue (col K = index 10)
    requests.push(makeValidation(sheetId, 10, DOC_OPTS));
    // BasicFilter
    requests.push({
      setBasicFilter: { filter: { range: { sheetId, startRowIndex: 0, endRowIndex: 2000, startColumnIndex: 0, endColumnIndex: 14 } } },
    });
  }

  // Aba Hoje — fórmula QUERY
  const hojeId = created.data.sheets!.find(s => s.properties?.title === "Hoje")!.properties!.sheetId!;
  requests.push({
    updateCells: {
      rows: [{ values: [{ userEnteredValue: { formulaValue:
        `=QUERY({Juri!A2:N; VVD!A2:N; EP!A2:N; '1ª Crime'!A2:N; '2ª Crime'!A2:N}, "where Col2 >= date '"&TEXT(TODAY(),"yyyy-MM-dd")&"' order by Col2 desc", 0)`
      } }] }],
      fields: "userEnteredValue",
      start: { sheetId: hojeId, rowIndex: 0, columnIndex: 0 },
    },
  });

  // Aba Pendências — QUERY de erros + sem solar
  const pendId = created.data.sheets!.find(s => s.properties?.title === "Pendências")!.properties!.sheetId!;
  requests.push({
    updateCells: {
      rows: [{ values: [{ userEnteredValue: { formulaValue:
        `=QUERY({Juri!A2:N; VVD!A2:N; EP!A2:N; '1ª Crime'!A2:N; '2ª Crime'!A2:N}, "where Col14 contains '❌' or (Col10 != 'Não' and Col10 is not null and Col13 is null)", 0)`
      } }] }],
      fields: "userEnteredValue",
      start: { sheetId: pendId, rowIndex: 0, columnIndex: 0 },
    },
  });

  await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });

  console.log(`✅ Setup completo. Configure TRIAGEM_SPREADSHEET_ID=${spreadsheetId} no .env`);
}

function makeValidation(sheetId: number, columnIndex: number, opts: string[]) {
  return {
    setDataValidation: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 2000, startColumnIndex: columnIndex, endColumnIndex: columnIndex + 1 },
      rule: {
        condition: { type: "ONE_OF_LIST", values: opts.map(o => ({ userEnteredValue: o })) },
        showCustomUi: true,
        strict: false,
      },
    },
  };
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 13.2: Adicionar script ao package.json**

Edit `package.json` scripts:
```json
"triagem:setup-sheet": "tsx scripts/triagem-setup-spreadsheet.ts"
```

- [ ] **Step 13.3: Executar setup**

Run: `npm run triagem:setup-sheet`
Expected: console imprime `✅ Planilha criada: <id>` e `✅ Setup completo`. Anotar o ID.

- [ ] **Step 13.4: Adicionar TRIAGEM_SPREADSHEET_ID ao .env.example**

Edit `.env.example`:
```
# Triagem Criminal Camaçari
TRIAGEM_SPREADSHEET_ID=
```

E configurar no `.env.local` com o ID real.

- [ ] **Step 13.5: Commit**

```bash
git add scripts/triagem-setup-spreadsheet.ts package.json .env.example
git commit -m "feat(triagem): add spreadsheet setup script with 12 tabs and validations"
```

---

### Task 14: Documentação de instalação Apps Script

**Files:**
- Create: `docs/runbooks/triagem-instalacao-apps-script.md`

- [ ] **Step 14.1: Escrever runbook**

```markdown
# Instalação do Apps Script — Triagem Criminal

## Pré-requisitos
- Spreadsheet "Triagem Criminal — DP Camaçari" já criada (rodar `npm run triagem:setup-sheet`)
- Acesso de Editor à planilha
- Mesmo `SHEETS_WEBHOOK_SECRET` que está no `.env.local` do OMBUDS

## Passos

1. Abrir a planilha no Google Sheets
2. Menu **Extensões → Apps Script**
3. Apagar o conteúdo padrão de `Code.gs`
4. Colar o conteúdo de `docs/triagem-script.gs`
5. **Configurar Script Properties:**
   - Ícone de engrenagem (esquerda) → "Propriedades do script"
   - Adicionar:
     - `SHEETS_WEBHOOK_SECRET` = mesmo valor do .env do OMBUDS
     - `OMBUDS_BASE_URL` = `https://ombuds.vercel.app` (ou URL de prod)
6. Salvar (Ctrl+S)
7. Executar `instalarTriggers` no menu superior (▶️)
8. Autorizar permissões solicitadas
9. Recarregar a planilha — menu "⚡ Triagem" deve aparecer

## Verificação

1. Ir na aba "Juri"
2. Linha 2: preencher Nome="Teste", Telefone="71999999999", Demanda="Atendimento de teste"
3. Coluna "Status sync" deve mostrar `✓ #N` em segundos
4. Conferir em OMBUDS `/triagem` que aparece o atendimento

## Troubleshooting

- `❌ SECRET ausente` → reconfigurar Script Properties
- `❌ 401` → SECRET errado
- `❌ 400 ...` → validar campos obrigatórios (nome)
- Sem reação → verificar se trigger foi instalado (deve haver 1 em "Triggers" na sidebar)
```

- [ ] **Step 14.2: Commit**

```bash
git add docs/runbooks/triagem-instalacao-apps-script.md
git commit -m "docs(triagem): add Apps Script installation runbook"
```

---

# Onda D — Sync, Crons e Drive

### Task 15: Cron sync de Escala + Plenários para a planilha

**Files:**
- Create: `src/app/api/cron/triagem-sync-planilha/route.ts`
- Modify: `vercel.json` (adicionar cron)

- [ ] **Step 15.1: Implementar endpoint**

```typescript
// src/app/api/cron/triagem-sync-planilha/route.ts
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { JWT } from "google-auth-library";
import { montarEscalaMes } from "@/lib/services/triagem-escala";

async function getSheetsClient() {
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? "{}");
  const auth = new google.auth.JWT(key.client_email, undefined, key.private_key, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
  return google.sheets({ version: "v4", auth });
}

async function sincronizarEscala() {
  const spreadsheetId = process.env.TRIAGEM_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("TRIAGEM_SPREADSHEET_ID não configurado");

  const sheets = await getSheetsClient();
  const now = new Date();
  const meses = [-1, 0, 1].map(offset => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return montarEscalaMes(d.getFullYear(), d.getMonth() + 1);
  });

  const rows: (string | number)[][] = [
    ["Mês", "Júri", "EP", "VVD", "1ª Crime", "2ª Crime", "Substituições"],
    ...meses.map(m => [
      `${String(m.mes).padStart(2, "0")}/${m.ano}`,
      m.juri, m.ep, m.vvd, m.vara1Crime, m.vara2Crime,
      m.substituicoes.map(s => `${s.defensor} (${s.tipo})`).join("; ") || "—",
    ]),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Escala!A1:G",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

async function sincronizarPlenarios() {
  // Fase 2: ler de audiencias com tipo='plenario_juri' das próximas 60 dias
  // MVP: deixar a aba vazia ou com placeholder
  const spreadsheetId = process.env.TRIAGEM_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("TRIAGEM_SPREADSHEET_ID não configurado");
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Plenários!A1:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        ["Data", "Réu", "Processo", "Defensor designado", "Status"],
        ["—", "—", "—", "—", "Sincronização Plenários — Fase 2"],
      ],
    },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Vercel Cron envia GET sem auth padrão; aceitar tanto cron header quanto bearer
  const cronAuth = req.headers.get("x-vercel-cron") === "1";
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.SHEETS_WEBHOOK_SECRET ?? "";
  if (!cronAuth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");

  try {
    if (tipo === "escala") await sincronizarEscala();
    else if (tipo === "plenarios") await sincronizarPlenarios();
    else {
      await sincronizarEscala();
      await sincronizarPlenarios();
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro";
    console.error("[Triagem Cron] falhou:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Vercel Cron usa GET por default
export const GET = POST;
```

- [ ] **Step 15.2: Adicionar cron no vercel.json**

Edit `vercel.json`. Adicionar dentro de `crons`:
```json
{
  "path": "/api/cron/triagem-sync-planilha",
  "schedule": "0 9 * * *"
}
```

- [ ] **Step 15.3: Smoke test (manual)**

Rodar local com auth manual:
```bash
curl -X POST http://localhost:3000/api/cron/triagem-sync-planilha \
  -H "Authorization: Bearer $SHEETS_WEBHOOK_SECRET"
```
Expected: `{"ok":true}` e abas "Escala" + "Plenários" da planilha atualizadas.

- [ ] **Step 15.4: Commit**

```bash
git add src/app/api/cron/triagem-sync-planilha/route.ts vercel.json
git commit -m "feat(triagem): add daily cron syncing escala and plenários to spreadsheet"
```

---

### Task 16: Setup do Drive compartilhado

Esta task é majoritariamente manual — criar pastas e modelos no Google Drive. Documentar passos pra reprodutibilidade.

**Files:**
- Create: `docs/runbooks/triagem-setup-drive.md`

- [ ] **Step 16.1: Criar runbook**

```markdown
# Setup do Drive — Triagem Criminal Camaçari

## Estrutura de pastas

Criar dentro da pasta da 9ª Defensoria (Drive compartilhado):

```
📁 Triagem Criminal — DP Camaçari/
├── 📁 1. Modelos prontos para entrega/
├── 📁 2. Formulários internos/
├── 📁 3. Modelos de petição/
├── 📁 4. Documentos gerados/
│   └── 📁 [ano]/[mês]/[dia]/   ← Apps Script ou skill cria sob demanda
├── 📁 5. Referências/
└── 📁 6. Histórico/
```

## Permissões

- **Dil (Dilcélia):** Editor em pastas 1-4, Visualizador em 5-6
- **Defensores (4):** Editor em todas
- **Amanda, Emilly, Taissa:** Editor em 1-4

Configurar no Drive:
1. Selecionar pasta raiz "Triagem Criminal — DP Camaçari"
2. Compartilhar → Adicionar pessoas
3. Para cada pessoa, escolher nível conforme tabela acima

## Modelos do MVP (4 arquivos)

Arquivos em `.docx` com placeholders entre `{{ }}`:

### 1.1 — Declaração de União Estável

Local: `1. Modelos prontos para entrega/1.1 Declaração de União Estável.docx`

Conteúdo base (texto que vai dentro do .docx — usar template existente da 9ª DP, adaptando para incluir):
- `{{NOME_COMPANHEIRA}}` — nome de quem assina
- `{{CPF_COMPANHEIRA}}`
- `{{NOME_PRESO}}`
- `{{CPF_PRESO}}`
- `{{TEMPO_UNIAO}}`
- `{{UNIDADE_PRISIONAL}}` (opcional)

### 1.2 — Destituição de Advogado

Conteúdo:
- `{{NOME_ASSISTIDO}}`, `{{CPF}}`, `{{NUMERO_PROCESSO}}`
- `{{NOME_ADVOGADO_ANTIGO}}`, `{{OAB_ADVOGADO}}`

### 1.3 — Declaração de Hipossuficiência

Conteúdo: padrão DPE-BA com `{{NOME_ASSISTIDO}}` e `{{CPF}}`.

### 1.6 — Atestado de comparecimento à DP

Conteúdo:
- `{{NOME_ASSISTIDO}}`, `{{CPF}}`
- `{{DATA_ATENDIMENTO}}`, `{{HORA_INICIO}}`, `{{HORA_FIM}}`
- Assinatura: servidora da triagem

## Verificação

- [ ] Pasta raiz visível para Dil, defensores e colaboradoras
- [ ] 4 modelos uploadados em `1. Modelos prontos para entrega/`
- [ ] Pasta `4. Documentos gerados/2026-04/` criada (vazia, será populada)

## Anotar no .env.local (opcional, para Fase 2)
```
TRIAGEM_DRIVE_FOLDER_ID=<id-da-pasta-raiz>
```
```

- [ ] **Step 16.2: Commit**

```bash
git add docs/runbooks/triagem-setup-drive.md
git commit -m "docs(triagem): add Drive structure setup runbook"
```

---

# Onda E — Documentação e treinamento

### Task 17: Roteiro de treinamento da Dil

**Files:**
- Create: `docs/runbooks/triagem-treinamento-dil.md`

- [ ] **Step 17.1: Escrever roteiro**

```markdown
# Treinamento — Equipe de Triagem Criminal (Dil)

**Duração:** ~2h (1h teoria + 1h prática)
**Material:** PPT da Juliane + planilha "Triagem Criminal" + acesso Drive

## Bloco 1 — Conceitos (15 min)

1. Quem somos: 4 defensores criminais + Dil
2. Áreas: Júri, EP, VVD (Rodrigo/Juliane revezam) + 1ª Crime (Cristiane) + 2ª Crime (Danilo)
3. Solar continua sendo obrigatório — planilha é COMPLEMENTAR e ajuda a equipe
4. Diferença entre "atendimento da triagem" (responsabilidade da Dil) e "demanda do defensor" (responsabilidade do defensor)

## Bloco 2 — Material da Juliane (15 min)

Recapitular slides do PPT:
- Citação → Resposta à acusação (10 dias)
- Audiência designada → defensor prepara
- Sentença → alegações finais
- Mandado de prisão → URGENTE
- Júri art. 422 (5 dias)
- Cadastro Solar pelo nome do assistido SEMPRE
- 4 modelos prontos pra entrega

## Bloco 3 — Planilha Triagem Criminal (30 min)

### As 12 abas
1. **Júri, VVD, EP, 1ª Crime, 2ª Crime** — Dil registra atendimentos
2. **Hoje** — vê o que registrou hoje (auto)
3. **Pendências** — vê erros e itens sem Solar (auto)
4. **Escala** — sabe qual defensor está hoje
5. **Plenários** — calendário do júri
6. **Documentos prontos** — catálogo de modelos
7. **Cheat Sheet** — resumo visual
8. **Stats** — estatísticas (Fase 2)

### Como registrar um atendimento
1. Identificar a área pelo tipo de caso (vide Cheat Sheet)
2. Abrir aba correspondente
3. Inserir linha nova (vai pra última linha vazia)
4. Preencher na ordem: Nome → Telefone → Compareceu → Situação → Processo → Urgência → Doc entregue → Demanda
5. Coluna "Status sync" mostra ✓ #N quando deu certo
6. Cadastrar no Solar e copiar protocolo de volta na coluna "Protocolo Solar"

### Sinalizações visuais
- Linha rosa = urgência
- Célula verde = sync ok
- Célula vermelha = sync com erro (clicar e reprocessar)
- Italic azul no nome = assistido recorrente

## Bloco 4 — Drive de modelos (10 min)

- Pasta `Triagem Criminal — DP Camaçari/1. Modelos prontos`
- 4 modelos disponíveis:
  - União Estável
  - Destituição Advogado
  - Hipossuficiência
  - Atestado comparecimento

Procedimento:
1. Identificar necessidade (ex: esposa quer visitar preso)
2. Abrir o modelo, salvar cópia
3. Imprimir, colher assinatura
4. Escanear, salvar em `4. Documentos gerados/[ano]/[mês]/[dia]/`
5. Marcar na planilha "Doc entregue = União Estável" → atendimento auto-resolve

## Bloco 5 — Encaminhamentos especiais (15 min)

- **Mandado de prisão em aberto:** atendimento URGENTE, marcar "Urgência = Mandado prisão", avisar defensor no WhatsApp
- **Audiência marcada:** marcar Urgência se for ≤7 dias
- **Pedido expresso de defensor específico:** override da sugestão, registrar no campo motivo
- **Caso sem processo:** registrar em 1ª Crime por convenção (a menos que seja claramente Júri/VVD/EP)

## Bloco 6 — Prática (60 min)

Cenários ao vivo (5 cada):
1. Esposa do preso quer fazer visita → entregar União Estável, registrar como Resolvido
2. Assistido com citação 1ª Vara Crime → registrar em 1ª Crime, encaminhar Cristiane
3. Mãe trazendo intimação de plenário do filho → urgente, registrar Júri, ver quem está de plantão na aba Escala
4. Mandado de prisão em aberto → URGENTE, comunicar defensor pelo WhatsApp
5. ANPP (Fase 2) — só registrar e encaminhar; defensor avalia

## Apoio contínuo

- Grupo WhatsApp dos defensores: dúvidas em tempo real
- Cheat Sheet (aba 11): primeira consulta antes de perguntar
- Devolutivas: defensor pode marcar "Devolver" com motivo — Dil ajusta na aba "Pendências"
```

- [ ] **Step 17.2: Commit**

```bash
git add docs/runbooks/triagem-treinamento-dil.md
git commit -m "docs(triagem): add Dil training runbook with 6 blocks"
```

---

## Validação final

- [ ] **Step 18.1: Rodar typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 18.2: Rodar todos os testes**

Run: `npm test`
Expected: todos os testes da triagem passando.

- [ ] **Step 18.3: Smoke test end-to-end**

1. Abrir planilha
2. Preencher uma linha de teste
3. Verificar que aparece em `/triagem` no OMBUDS
4. Promover a demanda
5. Verificar demanda criada em `/demandas-premium`
6. Verificar que aba Escala foi sincronizada (executar cron manualmente)

- [ ] **Step 18.4: Deploy**

Run: `vercel --prod`
Expected: deploy ok, cron registrado.

- [ ] **Step 18.5: Commit final + tag**

```bash
git tag triagem-mvp-v1
git push origin main --tags
```

---

## Self-Review (já feita pelo planner)

**Cobertura do spec:**
- ✅ Seção 2 (estrutura planilha) → Tasks 12, 13
- ✅ Seção 3 (integração OMBUDS) → Tasks 1-7
- ✅ Seção 4 (Cowork Coberturas → Escala) → Tasks 7, 15
- ✅ Seção 5 (Drive + modelos) → Task 16
- ✅ Roadmap MVP completo → Tasks 1-17
- ⏭️ Fase 2 e Fase 3 → Planos separados (não cobertos aqui)

**Não-cobertos intencionalmente (Fase 2):**
- Skill `dpe-ba-triagem-docs`
- Botão "Promover e delegar"
- Mural automático para urgências
- WhatsApp Business
- Acordo VVD com cartório

**Type consistency:** verificado — `tccRef`, `defensorAlvoId`, `assistidoNome` consistentes entre schema, service e endpoints.

**Placeholders:** apenas em locais onde dependem do contexto do dev (arquivo do Header em Task 10, defensorId real em Task 9). Documentados explicitamente como "identificar via grep" ou "substituir por session.user.id".

---

## Próximos passos depois deste plano

1. **Validar com a Juliane** (ela escreveu o material da Dil — boa pessoa pra revisar UX da planilha antes de a Dil mexer)
2. **Treinar a Dil** (1 sessão de 2h conforme Bloco 1-6 acima)
3. **Operação assistida 2 semanas** (você ou Juliane acompanham os primeiros dias)
4. **Brainstorm + spec da Fase 2** com base nos atritos observados
