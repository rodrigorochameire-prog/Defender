# Admin Observatory — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Criar a página `/admin/observatory` com 5 blocos: Alertas Críticos, Resumo Rápido, Adoção por Defensor, Volume de Trabalho e Saúde Técnica.

**Architecture:** Um único router tRPC `observatory` com 5 `adminProcedure` queries, cada uma retornando dados para um bloco da página. A página usa `useQuery` com `refetchInterval` para polling nos blocos de alertas e saúde técnica. Sem novas tabelas — toda informação já existe no schema.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, Recharts (já instalado), Tailwind + shadcn/ui, Lucide icons

---

## Task 1: Router `observatory` — queries de Alertas e Resumo Rápido

**Files:**
- Create: `src/lib/trpc/routers/observatory.ts`
- Modify: `src/lib/trpc/routers/index.ts`

**Step 1: Criar o arquivo do router**

```typescript
// src/lib/trpc/routers/observatory.ts
import { router, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";

export const observatoryRouter = router({

  // ─── ALERTAS CRÍTICOS ───────────────────────────────────────────
  getAlertas: adminProcedure.query(async () => {
    const [whatsappDesconectados, defensoresInativos, convitesExpirados] =
      await Promise.all([
        // WhatsApp instâncias desconectadas
        db.execute(sql`
          SELECT id, instance_name, status, created_by_id
          FROM evolution_config
          WHERE status != 'connected' AND is_active = true
        `),
        // Defensores sem login há >7 dias (via activity_logs)
        db.execute(sql`
          SELECT u.id, u.name, u.comarca_id,
            MAX(al.created_at) as ultimo_acesso
          FROM users u
          LEFT JOIN activity_logs al ON al.user_id = u.id
          WHERE u.deleted_at IS NULL
            AND u.role IN ('defensor', 'estagiario', 'servidor')
            AND u.approval_status = 'approved'
          GROUP BY u.id, u.name, u.comarca_id
          HAVING MAX(al.created_at) < NOW() - INTERVAL '7 days'
            OR MAX(al.created_at) IS NULL
        `),
        // Convites pendentes há >14 dias
        db.execute(sql`
          SELECT id, email, created_at
          FROM user_invitations
          WHERE used_at IS NULL
            AND expires_at > NOW()
            AND created_at < NOW() - INTERVAL '14 days'
        `),
      ]);

    return {
      whatsappDesconectados: whatsappDesconectados.rows as Array<{
        id: number; instance_name: string; status: string; created_by_id: number;
      }>,
      defensoresInativos: defensoresInativos.rows as Array<{
        id: number; name: string; comarca_id: number; ultimo_acesso: string | null;
      }>,
      convitesExpirados: convitesExpirados.rows as Array<{
        id: number; email: string; created_at: string;
      }>,
    };
  }),

  // ─── RESUMO RÁPIDO (sempre últimos 30 dias) ────────────────────
  getResumoRapido: adminProcedure.query(async () => {
    const [atual, anterior] = await Promise.all([
      db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM atendimentos WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as atendimentos,
          (SELECT COUNT(*) FROM demandas WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as demandas,
          (SELECT COUNT(*) FROM processos WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as processos,
          (SELECT COUNT(*) FROM assistidos WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as assistidos_novos,
          (SELECT COUNT(*) FROM agent_analyses WHERE created_at >= NOW() - INTERVAL '30 days') as analises_ia,
          (SELECT COUNT(DISTINCT user_id) FROM activity_logs WHERE created_at >= NOW() - INTERVAL '3 days') as defensores_ativos
      `),
      db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM atendimentos WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as atendimentos,
          (SELECT COUNT(*) FROM demandas WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as demandas,
          (SELECT COUNT(*) FROM processos WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as processos,
          (SELECT COUNT(*) FROM assistidos WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' AND deleted_at IS NULL) as assistidos_novos,
          (SELECT COUNT(*) FROM agent_analyses WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') as analises_ia
      `),
    ]);

    const a = atual.rows[0] as Record<string, string>;
    const p = anterior.rows[0] as Record<string, string>;

    const pct = (now: number, prev: number) =>
      prev === 0 ? null : Math.round(((now - prev) / prev) * 100);

    return {
      atendimentos: { total: Number(a.atendimentos), variacao: pct(Number(a.atendimentos), Number(p.atendimentos)) },
      demandas: { total: Number(a.demandas), variacao: pct(Number(a.demandas), Number(p.demandas)) },
      processos: { total: Number(a.processos), variacao: pct(Number(a.processos), Number(p.processos)) },
      assistidosNovos: { total: Number(a.assistidos_novos), variacao: pct(Number(a.assistidos_novos), Number(p.assistidos_novos)) },
      analises_ia: { total: Number(a.analises_ia), variacao: pct(Number(a.analises_ia), Number(p.analises_ia)) },
      defensoresAtivos: { total: Number(a.defensores_ativos), variacao: null },
    };
  }),
});

export type ObservatoryRouter = typeof observatoryRouter;
```

**Step 2: Registrar no router index**

Em `src/lib/trpc/routers/index.ts`, adicionar após o import de `comarcasRouter`:

```typescript
import { observatoryRouter } from "./observatory";
```

E no objeto do router, adicionar:
```typescript
observatory: observatoryRouter,
```

**Step 3: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
```

Esperado: sem erros.

**Step 4: Testar queries no banco**

```bash
node -e "
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
async function run() {
  const r = await sql\`SELECT COUNT(*) as atendimentos FROM atendimentos WHERE created_at >= NOW() - INTERVAL '30 days'\`;
  console.log('Atendimentos 30d:', r[0].atendimentos);
  const w = await sql\`SELECT id, instance_name, status FROM evolution_config WHERE status != 'connected' AND is_active = true\`;
  console.log('WA desconectados:', JSON.stringify(w));
  await sql.end();
}
run().catch(e => console.error(e.message));
"
```

**Step 5: Commit**

```bash
git add src/lib/trpc/routers/observatory.ts src/lib/trpc/routers/index.ts
git commit -m "feat(observatory): router tRPC com getAlertas e getResumoRapido"
```

---

## Task 2: Queries de Adoção, Volume e Saúde Técnica

**Files:**
- Modify: `src/lib/trpc/routers/observatory.ts`

**Step 1: Adicionar input schema de período**

No topo do arquivo, após os imports, adicionar:

```typescript
const periodoInput = z.object({
  inicio: z.string().optional(), // ISO date string, ex: "2026-02-01"
  fim: z.string().optional(),    // ISO date string, ex: "2026-03-01"
}).optional();

// Helper: retorna cláusula de período ou últimos 30 dias
function periodoClause(campo: string, periodo?: z.infer<typeof periodoInput>) {
  if (periodo?.inicio && periodo?.fim) {
    return sql.raw(`${campo} >= '${periodo.inicio}'::timestamp AND ${campo} < '${periodo.fim}'::timestamp`);
  }
  return sql.raw(`${campo} >= NOW() - INTERVAL '30 days'`);
}
```

**Step 2: Adicionar `getAdocao` ao router**

```typescript
getAdocao: adminProcedure
  .input(periodoInput)
  .query(async ({ input }) => {
    const inicio = input?.inicio ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fim = input?.fim ?? new Date().toISOString().split('T')[0];

    const rows = await db.execute(sql`
      SELECT
        u.id,
        u.name,
        u.role,
        u.comarca_id,
        c.nome as comarca_nome,
        MAX(al.created_at) as ultimo_acesso,
        COUNT(DISTINCT at.id) FILTER (WHERE at.created_at >= ${inicio}::timestamp AND at.created_at < ${fim}::timestamp) as atendimentos,
        COUNT(DISTINCT dm.id) FILTER (WHERE dm.created_at >= ${inicio}::timestamp AND dm.created_at < ${fim}::timestamp) as demandas,
        COUNT(DISTINCT pr.id) FILTER (WHERE pr.created_at >= ${inicio}::timestamp AND pr.created_at < ${fim}::timestamp) as processos,
        -- Onboarding
        CASE WHEN ui.used_at IS NOT NULL THEN true ELSE false END as convite_aceito,
        CASE WHEN MAX(al2.created_at) IS NOT NULL THEN true ELSE false END as primeiro_login,
        COUNT(DISTINCT at2.id) > 0 as primeiro_atendimento,
        COUNT(DISTINCT dm2.id) > 0 as primeira_demanda,
        -- Features
        CASE WHEN ec.id IS NOT NULL THEN true ELSE false END as tem_whatsapp,
        COUNT(DISTINCT aa.id) FILTER (WHERE aa.created_at >= ${inicio}::timestamp AND aa.created_at < ${fim}::timestamp) > 0 as usou_ia
      FROM users u
      LEFT JOIN comarcas c ON c.id = u.comarca_id
      LEFT JOIN activity_logs al ON al.user_id = u.id
      LEFT JOIN activity_logs al2 ON al2.user_id = u.id
      LEFT JOIN atendimentos at ON at.atendido_por_id = u.id AND at.deleted_at IS NULL
      LEFT JOIN atendimentos at2 ON at2.atendido_por_id = u.id AND at2.deleted_at IS NULL
      LEFT JOIN demandas dm ON dm.defensor_id = u.id AND dm.deleted_at IS NULL AND dm.created_at >= ${inicio}::timestamp AND dm.created_at < ${fim}::timestamp
      LEFT JOIN demandas dm2 ON dm2.defensor_id = u.id AND dm2.deleted_at IS NULL
      LEFT JOIN processos pr ON pr.defensor_id = u.id AND pr.deleted_at IS NULL
      LEFT JOIN evolution_config ec ON ec.created_by_id = u.id AND ec.is_active = true
      LEFT JOIN agent_analyses aa ON aa.requested_by_id = u.id
      LEFT JOIN user_invitations ui ON ui.email = u.email
      WHERE u.deleted_at IS NULL
        AND u.role IN ('defensor', 'estagiario', 'servidor')
        AND u.approval_status = 'approved'
      GROUP BY u.id, u.name, u.role, u.comarca_id, c.nome, ui.used_at, ec.id
      ORDER BY c.nome, u.name
    `);

    return rows.rows as Array<{
      id: number; name: string; role: string;
      comarca_id: number; comarca_nome: string;
      ultimo_acesso: string | null;
      atendimentos: number; demandas: number; processos: number;
      convite_aceito: boolean; primeiro_login: boolean;
      primeiro_atendimento: boolean; primeira_demanda: boolean;
      tem_whatsapp: boolean; usou_ia: boolean;
    }>;
  }),
```

**Step 3: Adicionar `getVolume` ao router**

```typescript
getVolume: adminProcedure
  .input(periodoInput)
  .query(async ({ input }) => {
    const inicio = input?.inicio ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fim = input?.fim ?? new Date().toISOString().split('T')[0];

    const [porComarca, tendencia, porTipo] = await Promise.all([
      // Distribuição por comarca
      db.execute(sql`
        SELECT c.nome as comarca, COUNT(a.id) as total
        FROM atendimentos a
        JOIN users u ON u.id = a.atendido_por_id
        JOIN comarcas c ON c.id = u.comarca_id
        WHERE a.created_at >= ${inicio}::timestamp
          AND a.created_at < ${fim}::timestamp
          AND a.deleted_at IS NULL
        GROUP BY c.nome
        ORDER BY total DESC
      `),
      // Tendência últimos 6 meses
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as mes,
          COUNT(*) as total
        FROM atendimentos
        WHERE created_at >= NOW() - INTERVAL '6 months'
          AND deleted_at IS NULL
        GROUP BY mes
        ORDER BY mes
      `),
      // Por tipo de atribuição (demandas)
      db.execute(sql`
        SELECT atribuicao, COUNT(*) as total
        FROM demandas
        WHERE created_at >= ${inicio}::timestamp
          AND created_at < ${fim}::timestamp
          AND deleted_at IS NULL
          AND atribuicao IS NOT NULL
        GROUP BY atribuicao
        ORDER BY total DESC
        LIMIT 8
      `),
    ]);

    return {
      porComarca: porComarca.rows as Array<{ comarca: string; total: number }>,
      tendencia: tendencia.rows as Array<{ mes: string; total: number }>,
      porTipo: porTipo.rows as Array<{ atribuicao: string; total: number }>,
    };
  }),
```

**Step 4: Adicionar `getSaudeTecnica` ao router**

```typescript
getSaudeTecnica: adminProcedure.query(async () => {
  const whatsapp = await db.execute(sql`
    SELECT id, instance_name, api_url, status, phone_number,
      last_sync_at, last_disconnect_reason, created_by_id
    FROM evolution_config
    WHERE is_active = true
    ORDER BY created_at
  `);

  // Ping ao banco (latência)
  const pingStart = Date.now();
  await db.execute(sql`SELECT 1`);
  const dbLatencyMs = Date.now() - pingStart;

  // Último deploy Vercel (via env var ou metadata)
  const ultimoDeploy = process.env.VERCEL_GIT_COMMIT_SHA
    ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)
    : "local";

  return {
    whatsapp: whatsapp.rows as Array<{
      id: number; instance_name: string; api_url: string;
      status: string; phone_number: string | null;
      last_sync_at: string | null; last_disconnect_reason: string | null;
      created_by_id: number;
    }>,
    banco: { latencyMs: dbLatencyMs, status: "ok" as const },
    vercel: { commit: ultimoDeploy },
  };
}),
```

**Step 5: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
```

**Step 6: Commit**

```bash
git add src/lib/trpc/routers/observatory.ts
git commit -m "feat(observatory): queries getAdocao, getVolume e getSaudeTecnica"
```

---

## Task 3: Componentes de UI — Alertas e Resumo Rápido

**Files:**
- Create: `src/app/(dashboard)/admin/observatory/_components/alertas-criticos.tsx`
- Create: `src/app/(dashboard)/admin/observatory/_components/resumo-rapido.tsx`
- Create: `src/app/(dashboard)/admin/observatory/_components/metric-card.tsx`

**Step 1: Criar `metric-card.tsx`**

```typescript
// src/app/(dashboard)/admin/observatory/_components/metric-card.tsx
"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  variacao: number | null; // % vs mês anterior
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, variacao, icon }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          {value.toLocaleString("pt-BR")}
        </span>
        {variacao !== null && (
          <span className={`mb-1 flex items-center gap-0.5 text-xs font-medium ${
            variacao > 0 ? "text-emerald-600" : variacao < 0 ? "text-red-500" : "text-zinc-400"
          }`}>
            {variacao > 0 ? <TrendingUp className="h-3 w-3" /> :
             variacao < 0 ? <TrendingDown className="h-3 w-3" /> :
             <Minus className="h-3 w-3" />}
            {Math.abs(variacao)}%
          </span>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Criar `resumo-rapido.tsx`**

```typescript
// src/app/(dashboard)/admin/observatory/_components/resumo-rapido.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { MetricCard } from "./metric-card";
import { Users, FileText, Scale, UserPlus, Brain, Activity } from "lucide-react";

export function ResumoRapido() {
  const { data, isLoading } = trpc.observatory.getResumoRapido.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Últimos 30 dias
        </h2>
        <span className="text-xs text-zinc-400">vs. 30 dias anteriores</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Atendimentos" value={data.atendimentos.total} variacao={data.atendimentos.variacao} icon={<Users className="h-4 w-4 text-zinc-400" />} />
        <MetricCard label="Demandas" value={data.demandas.total} variacao={data.demandas.variacao} icon={<FileText className="h-4 w-4 text-zinc-400" />} />
        <MetricCard label="Processos" value={data.processos.total} variacao={data.processos.variacao} icon={<Scale className="h-4 w-4 text-zinc-400" />} />
        <MetricCard label="Assistidos novos" value={data.assistidosNovos.total} variacao={data.assistidosNovos.variacao} icon={<UserPlus className="h-4 w-4 text-zinc-400" />} />
        <MetricCard label="Análises IA" value={data.analises_ia.total} variacao={data.analises_ia.variacao} icon={<Brain className="h-4 w-4 text-zinc-400" />} />
        <MetricCard label="Defensores ativos" value={data.defensoresAtivos.total} variacao={null} icon={<Activity className="h-4 w-4 text-zinc-400" />} />
      </div>
    </section>
  );
}
```

**Step 3: Criar `alertas-criticos.tsx`**

```typescript
// src/app/(dashboard)/admin/observatory/_components/alertas-criticos.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { AlertTriangle, Wifi, UserX, Mail } from "lucide-react";
import Link from "next/link";

export function AlertasCriticos() {
  const { data } = trpc.observatory.getAlertas.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // polling a cada 5 min
  });

  if (!data) return null;

  const total =
    data.whatsappDesconectados.length +
    data.defensoresInativos.length +
    data.convitesExpirados.length;

  if (total === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
        <div className="flex-1">
          <p className="font-medium text-red-800 dark:text-red-200">
            {total} {total === 1 ? "alerta" : "alertas"} requer{total === 1 ? "" : "em"} atenção
          </p>
          <ul className="mt-2 space-y-1">
            {data.whatsappDesconectados.map((w) => (
              <li key={w.id} className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                <Wifi className="h-3.5 w-3.5" />
                WhatsApp <strong>{w.instance_name}</strong> desconectado
                <Link href="/admin/whatsapp/chat" className="ml-auto text-xs underline">
                  Reconectar →
                </Link>
              </li>
            ))}
            {data.defensoresInativos.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <UserX className="h-3.5 w-3.5" />
                <strong>{d.name}</strong> sem acesso há mais de 7 dias
                <Link href="/admin/usuarios" className="ml-auto text-xs underline">
                  Ver usuário →
                </Link>
              </li>
            ))}
            {data.convitesExpirados.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <Mail className="h-3.5 w-3.5" />
                Convite para <strong>{c.email}</strong> sem aceite há mais de 14 dias
                <Link href="/admin/usuarios/convite" className="ml-auto text-xs underline">
                  Reenviar →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
```

**Step 5: Commit**

```bash
git add src/app/(dashboard)/admin/observatory/_components/
git commit -m "feat(observatory): componentes AlertasCriticos e ResumoRapido"
```

---

## Task 4: Componente de Adoção por Defensor

**Files:**
- Create: `src/app/(dashboard)/admin/observatory/_components/adocao-defensores.tsx`

**Step 1: Criar o componente**

```typescript
// src/app/(dashboard)/admin/observatory/_components/adocao-defensores.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { CheckCircle2, Circle, Wifi, Brain } from "lucide-react";

function StatusDot({ ultimoAcesso }: { ultimoAcesso: string | null }) {
  if (!ultimoAcesso) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" title="Nunca acessou" />;
  const days = Math.floor((Date.now() - new Date(ultimoAcesso).getTime()) / 86400000);
  if (days <= 3) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" title="Ativo" />;
  if (days <= 7) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" title="Morno" />;
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" title="Inativo" />;
}

function OnboardingBar({ steps }: { steps: [boolean, boolean, boolean, boolean] }) {
  return (
    <div className="flex gap-0.5">
      {steps.map((done, i) => (
        <div
          key={i}
          className={`h-1.5 w-5 rounded-sm ${done ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700"}`}
          title={["Convite aceito", "Primeiro login", "Primeiro atendimento", "Primeira demanda"][i]}
        />
      ))}
    </div>
  );
}

function UltimoAcesso({ ts }: { ts: string | null }) {
  if (!ts) return <span className="text-zinc-400">nunca</span>;
  const days = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (days === 0) return <span className="text-emerald-600 dark:text-emerald-400">hoje</span>;
  if (days === 1) return <span className="text-zinc-600 dark:text-zinc-300">ontem</span>;
  return <span className="text-zinc-500">{days}d atrás</span>;
}

interface AdocaoDefensoresProps {
  inicio?: string;
  fim?: string;
}

export function AdocaoDefensores({ inicio, fim }: AdocaoDefensoresProps) {
  const { data, isLoading } = trpc.observatory.getAdocao.useQuery(
    inicio && fim ? { inicio, fim } : undefined
  );

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
  }

  if (!data?.length) return <p className="text-sm text-zinc-400">Nenhum defensor cadastrado.</p>;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Adoção por Defensor
      </h2>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2.5 font-medium text-zinc-500">Defensor</th>
              <th className="px-4 py-2.5 font-medium text-zinc-500">Comarca</th>
              <th className="px-4 py-2.5 font-medium text-zinc-500">Último acesso</th>
              <th className="px-4 py-2.5 text-right font-medium text-zinc-500">Aten.</th>
              <th className="px-4 py-2.5 text-right font-medium text-zinc-500">Dem.</th>
              <th className="px-4 py-2.5 text-right font-medium text-zinc-500">Proc.</th>
              <th className="px-4 py-2.5 font-medium text-zinc-500">Onboarding</th>
              <th className="px-4 py-2.5 font-medium text-zinc-500">WA</th>
              <th className="px-4 py-2.5 font-medium text-zinc-500">IA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.map((d) => (
              <tr key={d.id} className="bg-white hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusDot ultimoAcesso={d.ultimo_acesso} />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{d.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500">{d.comarca_nome ?? "—"}</td>
                <td className="px-4 py-3">
                  <UltimoAcesso ts={d.ultimo_acesso} />
                </td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{d.atendimentos}</td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{d.demandas}</td>
                <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">{d.processos}</td>
                <td className="px-4 py-3">
                  <OnboardingBar steps={[d.convite_aceito, d.primeiro_login, d.primeiro_atendimento, d.primeira_demanda]} />
                </td>
                <td className="px-4 py-3">
                  {d.tem_whatsapp
                    ? <Wifi className="h-4 w-4 text-emerald-500" />
                    : <Wifi className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />}
                </td>
                <td className="px-4 py-3">
                  {d.usou_ia
                    ? <Brain className="h-4 w-4 text-emerald-500" />
                    : <Brain className="h-4 w-4 text-zinc-300 dark:text-zinc-700" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

**Step 2: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/observatory/_components/adocao-defensores.tsx
git commit -m "feat(observatory): componente AdocaoDefensores com tabela e onboarding"
```

---

## Task 5: Componentes de Volume e Saúde Técnica

**Files:**
- Create: `src/app/(dashboard)/admin/observatory/_components/volume-trabalho.tsx`
- Create: `src/app/(dashboard)/admin/observatory/_components/saude-tecnica.tsx`

**Step 1: Criar `volume-trabalho.tsx`**

```typescript
// src/app/(dashboard)/admin/observatory/_components/volume-trabalho.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"];

interface VolumeTrabalhoProps {
  inicio?: string;
  fim?: string;
}

export function VolumeTrabalho({ inicio, fim }: VolumeTrabalhoProps) {
  const { data, isLoading } = trpc.observatory.getVolume.useQuery(
    inicio && fim ? { inicio, fim } : undefined
  );

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
  }
  if (!data) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Volume de Trabalho
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Distribuição por comarca */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-xs font-medium text-zinc-500 uppercase">Atendimentos por comarca</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.porComarca} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="comarca" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="total" fill="#10b981" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Tendência mensal */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-xs font-medium text-zinc-500 uppercase">Tendência (6 meses)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.tendencia}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Por tipo de demanda */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-3 text-xs font-medium text-zinc-500 uppercase">Tipos de demanda</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={data.porTipo}
                dataKey="total"
                nameKey="atribuicao"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label={({ atribuicao, percent }) =>
                  percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""
                }
              >
                {data.porTipo.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Criar `saude-tecnica.tsx`**

```typescript
// src/app/(dashboard)/admin/observatory/_components/saude-tecnica.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { Wifi, WifiOff, QrCode, Database, Server, RefreshCw } from "lucide-react";
import Link from "next/link";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    connected: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300", label: "conectado" },
    disconnected: { color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", label: "desconectado" },
    connecting: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", label: "conectando" },
    qr_code: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", label: "QR pendente" },
  };
  const s = map[status] ?? { color: "bg-zinc-100 text-zinc-600", label: status };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>
  );
}

function RelativeTime({ ts }: { ts: string | null }) {
  if (!ts) return <span className="text-zinc-400">nunca</span>;
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 2) return <span className="text-emerald-600 dark:text-emerald-400">agora</span>;
  if (mins < 60) return <span className="text-zinc-500">{mins}min atrás</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span className="text-zinc-500">{hrs}h atrás</span>;
  return <span className="text-red-500">{Math.floor(hrs / 24)}d atrás</span>;
}

export function SaudeTecnica() {
  const { data, isLoading } = trpc.observatory.getSaudeTecnica.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />;
  if (!data) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Saúde Técnica
      </h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* WhatsApp */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">WhatsApp</span>
          </div>
          <div className="space-y-2">
            {data.whatsapp.map((w) => (
              <div key={w.id} className="flex items-center gap-3 text-sm">
                <StatusBadge status={w.status} />
                <span className="flex-1 font-mono text-xs text-zinc-600 dark:text-zinc-400">{w.instance_name}</span>
                {w.phone_number && (
                  <span className="text-xs text-zinc-400">{w.phone_number}</span>
                )}
                <RelativeTime ts={w.last_sync_at} />
                {w.status !== "connected" && (
                  <Link
                    href="/admin/whatsapp/chat"
                    className="text-xs text-emerald-600 underline hover:text-emerald-700"
                  >
                    reconectar →
                  </Link>
                )}
              </div>
            ))}
            {data.whatsapp.length === 0 && (
              <p className="text-xs text-zinc-400">Nenhuma instância configurada.</p>
            )}
          </div>
        </div>

        {/* Infraestrutura */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2">
            <Server className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Infraestrutura</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <Database className="h-3.5 w-3.5 text-zinc-400" />
              <span className="flex-1 text-zinc-600 dark:text-zinc-400">Banco de dados</span>
              <span className={`text-xs font-medium ${data.banco.latencyMs < 200 ? "text-emerald-600" : "text-amber-500"}`}>
                {data.banco.latencyMs}ms
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                ok
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Server className="h-3.5 w-3.5 text-zinc-400" />
              <span className="flex-1 text-zinc-600 dark:text-zinc-400">Vercel</span>
              <span className="font-mono text-xs text-zinc-400">{data.vercel.commit}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                ok
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 3: Verificar TypeScript**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -v "page-refactored\|schema.old" | head -20
```

**Step 4: Commit**

```bash
git add src/app/(dashboard)/admin/observatory/_components/volume-trabalho.tsx src/app/(dashboard)/admin/observatory/_components/saude-tecnica.tsx
git commit -m "feat(observatory): componentes VolumeTrabalho e SaudeTecnica"
```

---

## Task 6: Página principal + seletor de período + sidebar

**Files:**
- Create: `src/app/(dashboard)/admin/observatory/page.tsx`
- Modify: `src/components/layouts/admin-sidebar.tsx`

**Step 1: Criar a página**

```typescript
// src/app/(dashboard)/admin/observatory/page.tsx
"use client";

import { useState } from "react";
import { AlertasCriticos } from "./_components/alertas-criticos";
import { ResumoRapido } from "./_components/resumo-rapido";
import { AdocaoDefensores } from "./_components/adocao-defensores";
import { VolumeTrabalho } from "./_components/volume-trabalho";
import { SaudeTecnica } from "./_components/saude-tecnica";

// Utilitário: data ISO sem hora
function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

function getPeriodoDates(opcao: string) {
  const hoje = new Date();
  switch (opcao) {
    case "7d":
      return { inicio: toISO(new Date(Date.now() - 7 * 86400000)), fim: toISO(hoje) };
    case "30d":
      return { inicio: toISO(new Date(Date.now() - 30 * 86400000)), fim: toISO(hoje) };
    case "90d":
      return { inicio: toISO(new Date(Date.now() - 90 * 86400000)), fim: toISO(hoje) };
    case "6m":
      return { inicio: toISO(new Date(Date.now() - 180 * 86400000)), fim: toISO(hoje) };
    default:
      return { inicio: toISO(new Date(Date.now() - 30 * 86400000)), fim: toISO(hoje) };
  }
}

export default function ObservatoryPage() {
  const [periodo, setPeriodo] = useState("30d");
  const { inicio, fim } = getPeriodoDates(periodo);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Observatory</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Observabilidade da plataforma OMBUDS
          </p>
        </div>
        {/* Seletor de período */}
        <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {["7d", "30d", "90d", "6m"].map((op) => (
            <button
              key={op}
              onClick={() => setPeriodo(op)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                periodo === op
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {op === "7d" ? "7 dias" : op === "30d" ? "30 dias" : op === "90d" ? "90 dias" : "6 meses"}
            </button>
          ))}
        </div>
      </div>

      {/* Alertas críticos (sem seletor — sempre tempo real) */}
      <AlertasCriticos />

      {/* Resumo rápido (sempre 30 dias, independente do seletor) */}
      <ResumoRapido />

      {/* Adoção */}
      <AdocaoDefensores inicio={inicio} fim={fim} />

      {/* Volume */}
      <VolumeTrabalho inicio={inicio} fim={fim} />

      {/* Saúde técnica */}
      <SaudeTecnica />
    </div>
  );
}
```

**Step 2: Adicionar ao sidebar**

Em `src/components/layouts/admin-sidebar.tsx`, encontrar a seção onde ficam os itens admin-only (com `requiredRoles: ["admin"]`) e adicionar:

```typescript
{ label: "Observatory", path: "/admin/observatory", icon: "Activity", requiredRoles: ["admin"] },
```

O ícone `Activity` já está disponível no Lucide. Confirmar que está no import do arquivo — se não estiver, adicionar `Activity` ao import.

**Step 3: Build completo**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && npm run build 2>&1 | tail -15
```

Esperado: build sem erros.

**Step 4: Commit**

```bash
git add src/app/(dashboard)/admin/observatory/page.tsx src/components/layouts/admin-sidebar.tsx
git commit -m "feat(observatory): página principal + seletor de período + link no sidebar"
```

**Step 5: Push**

```bash
git push origin main
```
