# OMBUDS 2º Grau Criminal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adaptar o OMBUDS para defensor público criminal de 2º grau (Maurício Saporito, TJBA Câmaras Criminais), com nova rota `/admin/segundo-grau`, scraping PJe 2º grau, e geração de convite.

**Architecture:** Extensão não-invasiva do schema (enum + campos nullable em `processo`), nova rota espelhada a `/admin/juri`, scraper Python herdando do pipeline PJe 1º grau, skills Claude Code em `~/.claude/commands/`.

**Tech Stack:** Next.js 15 (App Router), tRPC, Drizzle ORM, PostgreSQL, Tailwind, Patchright/Playwright, Python 3.

**Spec:** `docs/superpowers/specs/2026-04-15-ombuds-2grau-criminal-design.md`

---

## File Structure

**Created:**
- `drizzle/NNNN_add_2grau_criminal.sql` (gerado por `pnpm db:generate`)
- `scripts/invite-user.ts` — CLI wrapper sobre `trpc.users.invite`
- `src/app/(dashboard)/admin/segundo-grau/page.tsx` — landing / redirect pra dashboard
- `src/app/(dashboard)/admin/segundo-grau/layout.tsx` — layout com tabs
- `src/app/(dashboard)/admin/segundo-grau/dashboard/page.tsx`
- `src/app/(dashboard)/admin/segundo-grau/kanban/page.tsx`
- `src/app/(dashboard)/admin/segundo-grau/pauta/page.tsx`
- `src/app/(dashboard)/admin/segundo-grau/processos/page.tsx`
- `src/lib/trpc/routers/segundo-grau.ts` — queries específicas
- `scripts/pje_2grau_scraper.py` — scraper herdando de `pje_area_download.py`
- `scripts/pje_2grau_parse_movimentacoes.py` — parser de movimentações recursais
- `~/.claude/commands/analise-recurso.md`
- `~/.claude/commands/peca-recurso.md`

**Modified:**
- `drizzle/schema.ts` — adicionar enums + colunas em `processo`
- `src/lib/trpc/routers/_app.ts` — registrar router `segundoGrau`
- `src/components/layouts/admin-sidebar.tsx` — item "2º Grau" com filtro `hasArea`
- `src/lib/trpc/routers/users.ts` — aceitar nova `atribuicao` + `area` na validação de invite

---

## Phase 1 — Schema & Invite (entrega imediata do link do Maurício)

### Task 1: Estender enums no schema

**Files:**
- Modify: `drizzle/schema.ts` (top do arquivo, próximo a linha 4-52)

- [ ] **Step 1: Adicionar valores aos enums**

Editar `drizzle/schema.ts`:

```ts
export const areaEnum = pgEnum('area', [
  'JURI', 'EXECUCAO_PENAL', 'VIOLENCIA_DOMESTICA', 'SUBSTITUICAO',
  'CURADORIA', 'FAMILIA', 'CIVEL', 'FAZENDA_PUBLICA', 'CRIMINAL',
  'INFANCIA_JUVENTUDE',
  'CRIMINAL_2_GRAU', // novo
]);

export const atribuicaoEnum = pgEnum('atribuicao', [
  // ... valores existentes
  'CRIMINAL_2_GRAU_SALVADOR', // novo
]);

export const classeRecursalEnum = pgEnum('classe_recursal', [
  'APELACAO', 'AGRAVO_EXECUCAO', 'RESE', 'HC', 'EMBARGOS',
  'REVISAO_CRIMINAL', 'CORREICAO_PARCIAL',
]);

export const resultadoJulgamentoEnum = pgEnum('resultado_julgamento', [
  'PROVIDO', 'IMPROVIDO', 'PARCIAL', 'NAO_CONHECIDO', 'DILIGENCIA', 'PREJUDICADO',
]);
```

- [ ] **Step 2: Adicionar colunas à tabela `processo`**

Dentro da definição da tabela `processo` em `drizzle/schema.ts`:

```ts
classeRecursal: classeRecursalEnum('classe_recursal'),
camara: text('camara'),
relator: text('relator'),
dataDistribuicao: date('data_distribuicao'),
dataConclusao: date('data_conclusao'),
dataPauta: date('data_pauta'),
dataJulgamento: date('data_julgamento'),
resultadoJulgamento: resultadoJulgamentoEnum('resultado_julgamento'),
acordaoRecorridoNumero: text('acordao_recorrido_numero'),
```

- [ ] **Step 3: Gerar migration**

```bash
cd /Users/rodrigorochameire/Projetos/Defender && pnpm db:generate
```

Expected: novo arquivo `drizzle/NNNN_*.sql` contendo `ALTER TYPE ... ADD VALUE` e `ALTER TABLE processo ADD COLUMN ...`.

- [ ] **Step 4: Aplicar migration**

```bash
pnpm db:push
```

Expected: "Changes applied" sem erros.

- [ ] **Step 5: Commit**

```bash
git add drizzle/schema.ts drizzle/
git commit -m "feat(schema): add CRIMINAL_2_GRAU area and recursal fields"
```

---

### Task 2: Permitir a nova atribuição no endpoint de invite

**Files:**
- Modify: `src/lib/trpc/routers/users.ts` (validação zod do `invite` mutation, ~linha 663)

- [ ] **Step 1: Atualizar schema zod do invite**

Localizar o `.input(z.object({...}))` do mutation `invite` e garantir que `atribuicao` aceita o novo valor `CRIMINAL_2_GRAU_SALVADOR`. Se usa `z.enum(Object.values(atribuicaoEnum))`, não precisa mudar nada — Drizzle já incluiu. Se é enum literal hardcoded, adicionar o valor.

- [ ] **Step 2: Teste manual via Playground tRPC (ou pular se enum derivado)**

Se o enum é derivado do Drizzle, pule direto pro commit.

- [ ] **Step 3: Commit (só se houve mudança)**

```bash
git add src/lib/trpc/routers/users.ts
git commit -m "feat(users): accept CRIMINAL_2_GRAU_SALVADOR in invite input"
```

---

### Task 3: Script CLI de convite

**Files:**
- Create: `scripts/invite-user.ts`

- [ ] **Step 1: Escrever o script**

```ts
// scripts/invite-user.ts
import { db } from '@/lib/db';
import { userInvitations, users } from '@/../drizzle/schema';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';

async function main() {
  const nome = process.env.INVITE_NOME!;
  const email = process.env.INVITE_EMAIL!;
  const comarca = process.env.INVITE_COMARCA ?? 'SALVADOR';
  const atribuicao = process.env.INVITE_ATRIBUICAO ?? 'CRIMINAL_2_GRAU_SALVADOR';
  const area = process.env.INVITE_AREA ?? 'CRIMINAL_2_GRAU';

  if (!nome || !email) {
    console.error('Required: INVITE_NOME, INVITE_EMAIL');
    process.exit(1);
  }

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length) {
    console.error(`User with email ${email} already exists.`);
    process.exit(1);
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(userInvitations).values({
    nome, email, token, expiresAt,
    comarca, atribuicao: atribuicao as any, area: area as any,
    createdAt: new Date(),
  });

  const url = `https://ombuds.vercel.app/register?convite=${token}`;
  console.log('\n=== CONVITE GERADO ===');
  console.log(`Nome: ${nome}`);
  console.log(`Email: ${email}`);
  console.log(`URL: ${url}`);
  console.log(`Expira: ${expiresAt.toISOString()}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Verificar colunas reais de `userInvitations`**

```bash
grep -n "userInvitations" drizzle/schema.ts
```

Ajustar o `.values({...})` para corresponder às colunas reais (pode haver `nucleo`, `podeVerTodosAssistidos` etc — ver `src/app/(dashboard)/admin/usuarios/convite/page.tsx` linhas 37-47).

- [ ] **Step 3: Gerar o convite do Maurício**

```bash
INVITE_NOME="Maurício Saporito" \
INVITE_EMAIL="mausaporito@yahoo.com.br" \
INVITE_COMARCA="SALVADOR" \
INVITE_ATRIBUICAO="CRIMINAL_2_GRAU_SALVADOR" \
INVITE_AREA="CRIMINAL_2_GRAU" \
pnpm tsx scripts/invite-user.ts
```

Expected: imprime URL `https://ombuds.vercel.app/register?convite=...`.

- [ ] **Step 4: Entregar URL ao Rodrigo (copiar pro terminal output)**

- [ ] **Step 5: Commit**

```bash
git add scripts/invite-user.ts
git commit -m "feat(scripts): add invite-user CLI for onboarding via env vars"
```

**✅ MARCO: Link do Maurício entregue. Fases 2-4 podem rodar depois.**

---

## Phase 2 — Rota `/admin/segundo-grau` (MVP navegável)

### Task 4: Router tRPC `segundoGrau`

**Files:**
- Create: `src/lib/trpc/routers/segundo-grau.ts`
- Modify: `src/lib/trpc/routers/_app.ts`

- [ ] **Step 1: Criar router**

```ts
// src/lib/trpc/routers/segundo-grau.ts
import { z } from 'zod';
import { and, eq, gte, lte, isNotNull, sql } from 'drizzle-orm';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { processo } from '@/../drizzle/schema';

const CRIMINAL_2G = 'CRIMINAL_2_GRAU' as const;

export const segundoGrauRouter = router({
  dashboardKpis: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const [total] = await ctx.db.select({ c: sql<number>`count(*)::int` })
      .from(processo).where(eq(processo.area, CRIMINAL_2G));

    const [pautaProxima] = await ctx.db.select({ c: sql<number>`count(*)::int` })
      .from(processo).where(and(
        eq(processo.area, CRIMINAL_2G),
        gte(processo.dataPauta, now.toISOString().slice(0, 10)),
        lte(processo.dataPauta, in7.toISOString().slice(0, 10)),
      ));

    const [conclusosHaMais30] = await ctx.db.select({ c: sql<number>`count(*)::int` })
      .from(processo).where(and(
        eq(processo.area, CRIMINAL_2G),
        lte(processo.dataConclusao, thirtyDaysAgo.toISOString().slice(0, 10)),
        sql`${processo.dataJulgamento} IS NULL`,
      ));

    return {
      total: total.c,
      pautaProxima: pautaProxima.c,
      conclusosHaMais30: conclusosHaMais30.c,
    };
  }),

  listar: protectedProcedure
    .input(z.object({
      classe: z.string().optional(),
      camara: z.string().optional(),
      relator: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conds = [eq(processo.area, CRIMINAL_2G)];
      if (input?.classe) conds.push(eq(processo.classeRecursal, input.classe as any));
      if (input?.camara) conds.push(eq(processo.camara, input.camara));
      if (input?.relator) conds.push(eq(processo.relator, input.relator));
      return ctx.db.select().from(processo).where(and(...conds));
    }),

  pauta: protectedProcedure
    .input(z.object({ dias: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const ate = new Date(now.getTime() + input.dias * 86400000);
      return ctx.db.select().from(processo).where(and(
        eq(processo.area, CRIMINAL_2G),
        isNotNull(processo.dataPauta),
        gte(processo.dataPauta, now.toISOString().slice(0, 10)),
        lte(processo.dataPauta, ate.toISOString().slice(0, 10)),
      ));
    }),
});
```

- [ ] **Step 2: Registrar no `_app.ts`**

```ts
// src/lib/trpc/routers/_app.ts
import { segundoGrauRouter } from './segundo-grau';
export const appRouter = router({
  // ... routers existentes
  segundoGrau: segundoGrauRouter,
});
```

- [ ] **Step 3: Verificar tipos**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/segundo-grau.ts src/lib/trpc/routers/_app.ts
git commit -m "feat(trpc): segundoGrau router with kpis, listar, pauta"
```

---

### Task 5: Layout da rota com tabs

**Files:**
- Create: `src/app/(dashboard)/admin/segundo-grau/layout.tsx`
- Create: `src/app/(dashboard)/admin/segundo-grau/page.tsx` (redirect pra /dashboard)

- [ ] **Step 1: Criar layout**

```tsx
// src/app/(dashboard)/admin/segundo-grau/layout.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/admin/segundo-grau/dashboard', label: 'Dashboard' },
  { href: '/admin/segundo-grau/kanban', label: 'Kanban' },
  { href: '/admin/segundo-grau/pauta', label: 'Pauta' },
  { href: '/admin/segundo-grau/processos', label: 'Processos' },
];

export default function SegundoGrauLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold text-indigo-900">2º Grau Criminal</h1>
        <span className="text-sm text-muted-foreground">Câmaras Criminais — TJBA</span>
      </header>
      <nav className="flex gap-2 border-b">
        {tabs.map(t => (
          <Link key={t.href} href={t.href}
            className={cn(
              'px-4 py-2 text-sm border-b-2 -mb-px',
              pathname === t.href
                ? 'border-indigo-600 text-indigo-900 font-medium'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}>
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Criar página root (redirect)**

```tsx
// src/app/(dashboard)/admin/segundo-grau/page.tsx
import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/admin/segundo-grau/dashboard');
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/admin/segundo-grau/
git commit -m "feat(2g): layout and tabs for /admin/segundo-grau"
```

---

### Task 6: Sub-páginas — Dashboard, Processos, Pauta, Kanban

**Files:**
- Create: `src/app/(dashboard)/admin/segundo-grau/dashboard/page.tsx`
- Create: `src/app/(dashboard)/admin/segundo-grau/processos/page.tsx`
- Create: `src/app/(dashboard)/admin/segundo-grau/pauta/page.tsx`
- Create: `src/app/(dashboard)/admin/segundo-grau/kanban/page.tsx`

- [ ] **Step 1: Dashboard (KPIs)**

```tsx
// src/app/(dashboard)/admin/segundo-grau/dashboard/page.tsx
'use client';
import { trpc } from '@/lib/trpc/client';

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-indigo-900">{value}</div>
    </div>
  );
}

export default function Page() {
  const { data } = trpc.segundoGrau.dashboardKpis.useQuery();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Kpi label="Em tramitação" value={data?.total ?? '—'} />
      <Kpi label="Pauta próxima (7d)" value={data?.pautaProxima ?? '—'} />
      <Kpi label="Conclusos há +30 dias" value={data?.conclusosHaMais30 ?? '—'} />
    </div>
  );
}
```

- [ ] **Step 2: Processos (tabela)**

```tsx
// src/app/(dashboard)/admin/segundo-grau/processos/page.tsx
'use client';
import { trpc } from '@/lib/trpc/client';

export default function Page() {
  const { data: processos } = trpc.segundoGrau.listar.useQuery();
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-3 py-2">Nº</th>
            <th className="px-3 py-2">Classe</th>
            <th className="px-3 py-2">Câmara</th>
            <th className="px-3 py-2">Relator</th>
            <th className="px-3 py-2">Pauta</th>
          </tr>
        </thead>
        <tbody>
          {processos?.map(p => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2">{p.numeroAutos}</td>
              <td className="px-3 py-2">{p.classeRecursal ?? '—'}</td>
              <td className="px-3 py-2">{p.camara ?? '—'}</td>
              <td className="px-3 py-2">{p.relator ?? '—'}</td>
              <td className="px-3 py-2">{p.dataPauta ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Pauta (lista agrupada por janela)**

```tsx
// src/app/(dashboard)/admin/segundo-grau/pauta/page.tsx
'use client';
import { trpc } from '@/lib/trpc/client';

export default function Page() {
  const { data } = trpc.segundoGrau.pauta.useQuery({ dias: 30 });
  const now = new Date();
  const in48 = new Date(now.getTime() + 2 * 86400000);
  const in7 = new Date(now.getTime() + 7 * 86400000);

  const bucket = (d: string) => {
    const data = new Date(d);
    if (data <= in48) return 'Crítico (48h)';
    if (data <= in7) return 'Próxima semana';
    return 'Próximos 30 dias';
  };

  const groups: Record<string, typeof data> = {};
  data?.forEach(p => {
    if (!p.dataPauta) return;
    const k = bucket(p.dataPauta);
    (groups[k] ||= []).push(p);
  });

  return (
    <div className="space-y-6">
      {['Crítico (48h)', 'Próxima semana', 'Próximos 30 dias'].map(k => (
        <section key={k}>
          <h2 className="text-lg font-medium mb-2">{k}</h2>
          <ul className="space-y-1">
            {(groups[k] ?? []).map(p => (
              <li key={p.id} className="rounded border p-3 bg-card">
                <div className="font-mono text-sm">{p.numeroAutos}</div>
                <div className="text-xs text-muted-foreground">
                  {p.classeRecursal} · {p.camara} · Relator: {p.relator} · Pauta: {p.dataPauta}
                </div>
              </li>
            ))}
            {(groups[k] ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">Nenhum processo</li>
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Kanban (colunas por status recursal)**

```tsx
// src/app/(dashboard)/admin/segundo-grau/kanban/page.tsx
'use client';
import { trpc } from '@/lib/trpc/client';

const COLUNAS = [
  { key: 'distribuido', label: 'Distribuído' },
  { key: 'concluso', label: 'Concluso ao Relator' },
  { key: 'pautado', label: 'Pautado' },
  { key: 'julgado', label: 'Julgado' },
  { key: 'transito', label: 'Trânsito' },
];

function statusDe(p: any): string {
  if (p.resultadoJulgamento && p.dataJulgamento) {
    // simplificação: trânsito considerado quando existe julgamento e data > 15 dias
    const dj = new Date(p.dataJulgamento);
    if (Date.now() - dj.getTime() > 15 * 86400000) return 'transito';
    return 'julgado';
  }
  if (p.dataPauta) return 'pautado';
  if (p.dataConclusao) return 'concluso';
  return 'distribuido';
}

export default function Page() {
  const { data: processos = [] } = trpc.segundoGrau.listar.useQuery();
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {COLUNAS.map(col => {
        const cards = processos.filter(p => statusDe(p) === col.key);
        return (
          <div key={col.key} className="rounded-lg bg-muted/40 p-2">
            <h3 className="text-xs font-semibold uppercase text-indigo-900 mb-2 px-1">
              {col.label} ({cards.length})
            </h3>
            <div className="space-y-2">
              {cards.map(p => (
                <div key={p.id} className="rounded border bg-card p-2 shadow-sm">
                  <div className="font-mono text-xs">{p.numeroAutos}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.classeRecursal ?? '—'} · {p.camara ?? '—'}
                  </div>
                  <div className="text-xs">{p.relator ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Build verifica tipos**

```bash
pnpm build
```

Expected: sucesso.

- [ ] **Step 6: Commit**

```bash
git add src/app/(dashboard)/admin/segundo-grau/
git commit -m "feat(2g): dashboard, processos, pauta and kanban pages"
```

---

### Task 7: Item no sidebar com filtro por `hasArea`

**Files:**
- Modify: `src/components/layouts/admin-sidebar.tsx`

- [ ] **Step 1: Localizar o array de items + padrão atual de filtro**

```bash
grep -n "hasArea\|areasPrincipais\|JURI\|/admin/juri" src/components/layouts/admin-sidebar.tsx
```

- [ ] **Step 2: Adicionar item "2º Grau"**

Seguindo o padrão encontrado (ex: como `/admin/juri` é adicionado só quando `user.areasPrincipais.includes('JURI')`), adicionar análogo:

```ts
{
  href: '/admin/segundo-grau',
  label: '2º Grau',
  icon: ScaleIcon, // ou Gavel, conforme convenção
  requiresArea: 'CRIMINAL_2_GRAU',
},
```

E garantir que o filtro de render considera `CRIMINAL_2_GRAU`.

- [ ] **Step 3: Verificar visualmente com usuário de teste**

Logar com user cujo `areasPrincipais` inclui `CRIMINAL_2_GRAU` → deve aparecer. Outros users → não deve aparecer.

- [ ] **Step 4: Commit**

```bash
git add src/components/layouts/admin-sidebar.tsx
git commit -m "feat(sidebar): show 2º Grau item when user has CRIMINAL_2_GRAU area"
```

---

## Phase 3 — Scraper PJe 2º grau

### Task 8: Módulo `pje_2grau_scraper.py`

**Files:**
- Create: `scripts/pje_2grau_scraper.py`

- [ ] **Step 1: Copiar estrutura base do scraper 1º grau**

```bash
cp scripts/pje_area_download.py scripts/pje_2grau_scraper.py
```

- [ ] **Step 2: Substituir URL base e seletores**

Editar `scripts/pje_2grau_scraper.py`:

- URL base: trocar `https://pje.tjba.jus.br` por `https://pje2g.tjba.jus.br`.
- Adicionar extração dos campos: `classeRecursal` (regex sobre "Classe: Apelação|Agravo|..."), `camara` (ex: "1ª Câmara Criminal"), `relator` (campo "Relator: Des. Fulano"), `dataDistribuicao`, `dataConclusao`.

Ponto de atenção: seletores exatos do PJe 2º grau **devem ser descobertos empiricamente** — rodar manualmente em 3 processos conhecidos primeiro.

- [ ] **Step 3: Discovery manual**

```bash
python3 scripts/pje_2grau_scraper.py --discover --processo "<numero>"
```

(adicionar flag `--discover` que apenas faz dump do HTML da página do processo)

- [ ] **Step 4: Ajustar seletores com base no HTML real**

- [ ] **Step 5: Teste batch em 5 processos**

```bash
python3 scripts/pje_2grau_scraper.py --batch --limit 5
```

Expected: 5 processos com `classeRecursal`, `camara`, `relator` populados.

- [ ] **Step 6: Commit**

```bash
git add scripts/pje_2grau_scraper.py
git commit -m "feat(scraper): PJe 2º grau scraper with recursal field extraction"
```

---

### Task 9: Parser de movimentações recursais + enriquecimento de intimações

**Files:**
- Create: `scripts/pje_2grau_parse_movimentacoes.py`

- [ ] **Step 1: Escrever parser**

```python
# scripts/pje_2grau_parse_movimentacoes.py
import re
from datetime import datetime, timedelta

PATTERNS = {
    'pauta': re.compile(r'[Ii]nclu[ií]do em pauta.*?(\d{2}/\d{2}/\d{4})', re.S),
    'retirado': re.compile(r'[Rr]etirado de pauta', re.S),
    'julgado': re.compile(r'[Jj]ulgado em.*?(\d{2}/\d{2}/\d{4})', re.S),
    'conclusos': re.compile(r'[Cc]onclusos ao\(à\) [Rr]elator.*?(\d{2}/\d{2}/\d{4})', re.S),
    'acordao': re.compile(r'[Aa]c[óo]rd[ãa]o disponibilizado', re.S),
    'transito': re.compile(r'[Tt]r[âa]nsito em julgado', re.S),
}

def parse_movimentacao(texto: str) -> dict:
    resultado = {}
    if m := PATTERNS['pauta'].search(texto):
        data_pauta = datetime.strptime(m.group(1), '%d/%m/%Y').date()
        resultado['dataPauta'] = data_pauta.isoformat()
        resultado['gerarIntimacao'] = {
            'urgencia': 'ALTA',
            'tipoAto': 'PAUTA_JULGAMENTO_2G',
            'prazo': (data_pauta - timedelta(days=2)).isoformat(),
        }
    if m := PATTERNS['julgado'].search(texto):
        resultado['dataJulgamento'] = datetime.strptime(m.group(1), '%d/%m/%Y').date().isoformat()
    if m := PATTERNS['conclusos'].search(texto):
        resultado['dataConclusao'] = datetime.strptime(m.group(1), '%d/%m/%Y').date().isoformat()
    if PATTERNS['transito'].search(texto):
        resultado['transitado'] = True
    return resultado
```

- [ ] **Step 2: Teste com textos reais**

Coletar 10 trechos de movimentações PJe 2º grau, alimentar o parser, verificar extração correta.

- [ ] **Step 3: Integrar no scraper**

Chamar `parse_movimentacao` para cada movimentação coletada e popular campos no insert/update do `processo` + criar `Intimacao` quando `gerarIntimacao` presente.

- [ ] **Step 4: Commit**

```bash
git add scripts/pje_2grau_parse_movimentacoes.py scripts/pje_2grau_scraper.py
git commit -m "feat(scraper): parse recursal movimentações and auto-create pauta intimações"
```

---

### Task 10: Agendar no Mac Mini worker

**Files:**
- Modify: LaunchAgent plist existente do worker (ex: `~/Library/LaunchAgents/com.ombuds.pje-worker.plist`)

- [ ] **Step 1: Adicionar chamada ao scraper 2º grau no cron job existente**

Editar o script agendado (provavelmente `scripts/worker_cron.sh`):

```bash
# após o scraper 1º grau
python3 /Users/.../scripts/pje_2grau_scraper.py --batch >> /tmp/pje_2grau.log 2>&1
```

- [ ] **Step 2: Recarregar LaunchAgent**

```bash
launchctl unload ~/Library/LaunchAgents/com.ombuds.pje-worker.plist
launchctl load ~/Library/LaunchAgents/com.ombuds.pje-worker.plist
```

- [ ] **Step 3: Observar primeira execução**

```bash
tail -f /tmp/pje_2grau.log
```

Expected: processos importados sem erro.

- [ ] **Step 4: Commit (se aplicável — scripts do Mac Mini podem não estar no repo)**

---

## Phase 4 — Skills Claude Code

### Task 11: `/analise-recurso`

**Files:**
- Create: `~/.claude/commands/analise-recurso.md`

- [ ] **Step 1: Escrever o command**

Seguir estrutura de `~/.claude/commands/analise-juri.md` (Padrão Defender v2, 7 partes, paleta **indigo**, Verdana 11pt, KPIs adaptados). Entrada: pasta do assistido + nº do processo 2º grau. Saída: dossiê `.docx` no Drive.

Seções fixas:
1. Acórdão/sentença recorrida — resumo
2. Teses da defesa × fundamentos do recorrido
3. Precedentes vinculantes aplicáveis (STF/STJ — **regra: só citar súmula, Tema RG, lei. Para precedentes numerados, verificar em scon.stj.jus.br / portal.stf.jus.br / Jusbrasil**)
4. Pedido recursal
5. Roteiro de sustentação oral (3–5 min)
6. Pontos fracos antecipados da acusação em contrarrazões
7. Checklist de preparo (pauta, memoriais, petição de sustentação)

- [ ] **Step 2: Teste em 1 processo real**

Rodar `/analise-recurso` num processo conhecido; verificar qualidade e aderência ao Padrão Defender v2.

- [ ] **Step 3: Commit**

```bash
# commands dir é global, pode ou não ter git
```

---

### Task 12: `/peca-recurso`

**Files:**
- Create: `~/.claude/commands/peca-recurso.md`

- [ ] **Step 1: Escrever o command**

Estrutura espelhada a `/peca-juri`: Garamond 12pt, timbre DPE-BA (logo + rodapé), espaçamento padronizado.

Sub-tipos (parâmetro do command):
- memorial
- contrarrazoes
- razoes-apelacao
- hc-originario
- embargos-declaracao

Tom: respeito ao juízo a quo, assertividade e objetividade (já registrado em memória — `feedback_recursal_tone.md`).

- [ ] **Step 2: Teste em 1 processo real**

- [ ] **Step 3: Commit**

---

## Self-Review

**Spec coverage:**
- §1 schema → Tasks 1, 2 ✓
- §2 rota + sub-abas + sidebar → Tasks 4, 5, 6, 7 ✓
- §3 scraper → Tasks 8, 9, 10 ✓
- §4 skills + convite → Tasks 3 (convite), 11, 12 ✓

**Placeholder scan:** Task 7 step 2 ("seguindo o padrão encontrado") é levemente aberto — mitigado pelo step 1 que obriga localizar o padrão primeiro. Task 8 step 2 depende de discovery empírica (inevitável dado o scraping). Task 3 step 2 exige verificar colunas reais de `userInvitations` — aceitável porque é um check de 1 min.

**Type consistency:** `classeRecursal`, `camara`, `relator`, `dataPauta`, `dataConclusao`, `dataJulgamento` usados consistentemente no schema (Task 1), router (Task 4), páginas (Task 6) e scraper (Tasks 8-9). Enum `area = 'CRIMINAL_2_GRAU'` idem.

**Ordem de entrega:** Phase 1 termina com link do Maurício na mão (Tasks 1-3). Phase 2-4 podem rodar em sequência depois.
