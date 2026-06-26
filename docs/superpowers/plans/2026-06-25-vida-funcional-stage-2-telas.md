# Vida Funcional — Stage 2 (Telas centrais) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir as telas centrais da Vida Funcional sobre a fundação do Stage 1 — bento-home em 4 clusters (com radar-lite e card de Trajetória), a aba Linha do Tempo (Trajetória) e a tela de detalhe por domínio com painel do Drive embutido.

**Architecture:** Toda a tela lê o router `vidaFuncional` do Stage 1 (escopo privado já garantido). Um config puro de **domínios** (`dominios.ts`) mapeia cada card do bento a um conjunto de `tipos` e à rota de detalhe `[dominio]`. A home busca todos os eventos uma vez e agrupa no cliente (volume baixo por defensor). O detalhe embute arquivos do Drive via o `driveRouter` existente (`trpc.drive.files`). Radar e indexador completos ficam para os Stages 3/4 — aqui o "radar-lite" apenas lista eventos com `prazo` próximo a partir dos dados já existentes.

**Tech Stack:** Next.js 15 App Router, tRPC v11, Drizzle, Tailwind/Padrão Defender, shadcn `Tabs`, `@/components/shared/timeline`, lucide-react, Vitest.

**Escopo deste plano:** Stage 2 da spec `docs/superpowers/specs/2026-06-25-vida-funcional-design.md` (§7 passo 2). NÃO inclui: motor de Radar com regras legais (Stage 3), indexador/sugestões do Drive + tabela `vida_funcional_sugestoes` (Stage 4), aba Produtividade com geração de relatório (Stage 5 — aqui só um stub "em breve"). CRUD de criação/edição de eventos via formulário também é Stage posterior; aqui as telas são de **leitura/navegação** sobre os dados do Stage 1.

## Global Constraints

- **Imports absolutos** `@/`. **Install** com `pnpm`. Scripts via `npm run <script>`.
- **Gate de teste honesto:** `CI=1 vitest run` (testes de DB ficam no `CI_QUARANTINE`). **Build gate:** `npm run build` passa.
- **Privacidade (imutável do Stage 1):** toda leitura passa pelo router `vidaFuncional`, que aplica `getVidaFuncionalScope`. As telas NUNCA consultam a tabela diretamente — sempre via `trpc.vidaFuncional.*`.
- **Escrita owner-only** já garantida no router; Stage 2 não adiciona mutações de evento.
- **Padrão Defender:** usar `Card`, `CollapsiblePageHeader`, `design-tokens` (TYPO/COLORS/SPACE), `cursor-pointer` em cards clicáveis, skeletons, sem emojis como ícones (usar lucide).
- **Drive é fonte da verdade** dos arquivos; o app só lista/preview via `trpc.drive.files` e linka `https://drive.google.com/drive/folders/${folderId}`.

---

### Task 1: Router — filtro por `tipos[]` e `marcosOnly` em `listEventos`

**Files:**
- Modify: `src/lib/trpc/routers/vida-funcional.ts` (input + body de `listEventos`)
- Test: `__tests__/trpc/vida-funcional-router.test.ts` (adicionar casos)

**Interfaces:**
- Consumes: `MARCO_TIPOS`/`isMarco` de `@/lib/vida-funcional/tipo-cluster` (Stage 1).
- Produces: `listEventos` aceita `{ tipos?: VfTipo[], marcosOnly?: boolean }` (além dos já existentes `tipo?`, `cluster?`, `status?`). `tipos` filtra por `inArray(tipo, tipos)`; `marcosOnly: true` filtra pelos tipos-marco. Retorno inalterado (array de eventos).

- [ ] **Step 1: Adicionar o caso de teste (RED)**

Em `__tests__/trpc/vida-funcional-router.test.ts`, adicione (reuse helpers `makeDefensor`/`mkCtx`/`cleanupUser`):

```typescript
describe("vidaFuncional listEventos — filtros tipos[]/marcosOnly", { timeout: 30000 }, () => {
  it("filtra por tipos[] e por marcosOnly", async () => {
    const a = await makeDefensor("filt");
    try {
      const caller = createCaller(mkCtx(a));
      await caller.vidaFuncional.createEvento({ tipo: "PROMOCAO", titulo: "marco", dataEvento: "2026-01-01" });
      await caller.vidaFuncional.createEvento({ tipo: "FERIAS", titulo: "ferias", dataEvento: "2026-02-01" });
      await caller.vidaFuncional.createEvento({ tipo: "DIARIA", titulo: "diaria", dataEvento: "2026-03-01" });

      const soFerias = await caller.vidaFuncional.listEventos({ tipos: ["FERIAS"] });
      expect(soFerias.every((e) => e.tipo === "FERIAS")).toBe(true);
      expect(soFerias.length).toBe(1);

      const marcos = await caller.vidaFuncional.listEventos({ marcosOnly: true });
      expect(marcos.every((e) => e.tipo === "PROMOCAO")).toBe(true); // único marco criado
      expect(marcos.some((e) => e.tipo === "FERIAS")).toBe(false);
    } finally {
      await cleanupUser(a);
    }
  });
});
```

Run: `npx vitest run __tests__/trpc/vida-funcional-router.test.ts -t "filtros"` → FAIL (tipos/marcosOnly ainda não filtram).

- [ ] **Step 2: Implementar o filtro**

Em `vida-funcional.ts`, no `listEventos`:
- Acrescente ao input zod: `tipos: z.array(tipoSchema).optional(),` (mantém `marcosOnly: z.boolean().optional()` que já existe).
- No corpo, após os pushes de `tipo`/`cluster`/`status`, adicione:

```typescript
import { MARCO_TIPOS } from "@/lib/vida-funcional/tipo-cluster"; // garantir o import no topo
// ...
if (input?.tipos && input.tipos.length > 0) {
  conditions.push(inArray(vidaFuncionalEventos.tipo, input.tipos));
}
if (input?.marcosOnly) {
  conditions.push(inArray(vidaFuncionalEventos.tipo, MARCO_TIPOS as unknown as string[]));
}
```

(`inArray` já está importado no Stage 1.)

- [ ] **Step 3: GREEN + regressão**

Run: `npx vitest run __tests__/trpc/vida-funcional-router.test.ts` → todos verdes (os 5 do Stage 1 + o novo).
Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-tipo-cluster.test.ts __tests__/unit/vida-funcional-scope.test.ts` → 12/12.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/vida-funcional.ts __tests__/trpc/vida-funcional-router.test.ts
git commit -m "feat(carreira): listEventos filtra por tipos[] e marcosOnly (Trajetoria/bento)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Config de domínios (`dominios.ts`) + helper

**Files:**
- Create: `src/lib/vida-funcional/dominios.ts`
- Test: `__tests__/unit/vida-funcional-dominios.test.ts`

**Interfaces:**
- Consumes: tipos `VfTipo`/`VfCluster` de `@/lib/vida-funcional/tipo-cluster`.
- Produces: `DOMINIOS: Dominio[]` (cada um `{ key, label, icon, cluster, tipos }`), `getDominio(key): Dominio | undefined`, `dominiosByCluster(cluster): Dominio[]`. `icon` é o NOME do ícone lucide (string), resolvido na UI. A Trajetória NÃO é um domínio de rota — é representada pela aba Linha do Tempo; o cluster `progressao` expõe um card especial tratado na home.

- [ ] **Step 1: Teste (RED)**

Create `__tests__/unit/vida-funcional-dominios.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { DOMINIOS, getDominio, dominiosByCluster } from "@/lib/vida-funcional/dominios";

describe("dominios", () => {
  it("todo domínio tem key/label/icon/cluster/tipos não-vazios e keys únicas", () => {
    const keys = new Set<string>();
    for (const d of DOMINIOS) {
      expect(d.key).toBeTruthy();
      expect(d.label).toBeTruthy();
      expect(d.icon).toBeTruthy();
      expect(d.tipos.length).toBeGreaterThan(0);
      expect(keys.has(d.key)).toBe(false);
      keys.add(d.key);
    }
  });
  it("getDominio resolve por key", () => {
    expect(getDominio("ferias-licencas")?.tipos).toContain("FERIAS");
    expect(getDominio("inexistente")).toBeUndefined();
  });
  it("dominiosByCluster agrupa", () => {
    expect(dominiosByCluster("administrativo").some((d) => d.key === "solicitacoes")).toBe(true);
    expect(dominiosByCluster("contraprestacao").length).toBeGreaterThanOrEqual(3);
  });
});
```

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-dominios.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 2: Implementar**

Create `src/lib/vida-funcional/dominios.ts`:

```typescript
import type { VfTipo, VfCluster } from "./tipo-cluster";

export interface Dominio {
  key: string;          // segmento de rota: /admin/carreira/vida-funcional/[key]
  label: string;
  icon: string;         // nome de ícone lucide (resolvido na UI)
  cluster: VfCluster;
  tipos: VfTipo[];      // tipos de evento que pertencem a este domínio
}

export const DOMINIOS: Dominio[] = [
  // cluster ausencias
  { key: "ferias-licencas", label: "Férias / Licenças", icon: "Palmtree", cluster: "ausencias", tipos: ["FERIAS", "LICENCA"] },
  { key: "afastamentos", label: "Afastamentos", icon: "Plane", cluster: "ausencias", tipos: ["AFASTAMENTO"] },
  { key: "designacoes", label: "Designações", icon: "Send", cluster: "ausencias", tipos: ["DESIGNACAO_RELEVANTE"] },
  { key: "convocacoes", label: "Convocações", icon: "Mail", cluster: "ausencias", tipos: ["CONVOCACAO"] },
  { key: "cooperacoes", label: "Cooperações", icon: "Handshake", cluster: "ausencias", tipos: ["COOPERACAO"] },
  // cluster contraprestacao
  { key: "substituicoes-gratificacoes", label: "Substituições / Gratificações", icon: "Coins", cluster: "contraprestacao", tipos: ["SUBSTITUICAO", "GRATIFICACAO"] },
  { key: "trabalho-extra-folgas", label: "Trab. extraordinário & folgas", icon: "Zap", cluster: "contraprestacao", tipos: ["TRABALHO_EXTRAORDINARIO", "FOLGA"] },
  { key: "diarias", label: "Diárias", icon: "Luggage", cluster: "contraprestacao", tipos: ["DIARIA"] },
  { key: "reembolsos", label: "Reembolsos", icon: "Receipt", cluster: "contraprestacao", tipos: ["REEMBOLSO"] },
  // cluster administrativo
  { key: "solicitacoes", label: "Solicitações administrativas", icon: "FileText", cluster: "administrativo", tipos: ["SOLICITACAO_ADM"] },
];

export function getDominio(key: string): Dominio | undefined {
  return DOMINIOS.find((d) => d.key === key);
}

export function dominiosByCluster(cluster: VfCluster): Dominio[] {
  return DOMINIOS.filter((d) => d.cluster === cluster);
}
```

- [ ] **Step 3: GREEN + commit**

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-dominios.test.ts` → PASS.

```bash
git add src/lib/vida-funcional/dominios.ts __tests__/unit/vida-funcional-dominios.test.ts
git commit -m "feat(carreira): config de dominios da Vida Funcional (bento + rota detalhe)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Bento-home (Visão geral) + abas no cabeçalho

**Files:**
- Create: `src/app/(dashboard)/admin/carreira/vida-funcional/_components/icon-map.ts`
- Create: `src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx`
- Modify: `src/app/(dashboard)/admin/carreira/vida-funcional/page.tsx` (renderiza o view)

**Interfaces:**
- Consumes: `trpc.vidaFuncional.listEventos.useQuery({})`, `DOMINIOS`/`dominiosByCluster`, `MARCO_TIPOS`/`isMarco`, `CollapsiblePageHeader`.
- Produces: a home com 3 abas (`visao` | `timeline` | `produtividade`) controladas por estado; aba `visao` mostra radar-lite + card Trajetória + bento por cluster. As abas `timeline` e `produtividade` renderizam componentes das Tasks 4 e (stub) — esta task cria o shell de abas e a aba `visao`.

- [ ] **Step 1: Mapa de ícones lucide (compartilhado)**

Create `src/app/(dashboard)/admin/carreira/vida-funcional/_components/icon-map.ts`:

```typescript
import {
  Briefcase, Palmtree, Plane, Send, Mail, Handshake, Coins, Zap,
  Luggage, Receipt, FileText, Milestone, type LucideIcon,
} from "lucide-react";

export const VF_ICONS: Record<string, LucideIcon> = {
  Briefcase, Palmtree, Plane, Send, Mail, Handshake, Coins, Zap,
  Luggage, Receipt, FileText, Milestone,
};

export function vfIcon(name: string): LucideIcon {
  return VF_ICONS[name] ?? FileText;
}
```

- [ ] **Step 2: View com abas + Visão geral**

Create `src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Milestone, CalendarClock, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { trpc } from "@/lib/trpc/client";
import { DOMINIOS, dominiosByCluster } from "@/lib/vida-funcional/dominios";
import { isMarco } from "@/lib/vida-funcional/tipo-cluster";
import { vfIcon } from "./icon-map";
import { TrajetoriaTimeline } from "./trajetoria-timeline";

type Tab = "visao" | "timeline" | "produtividade";

const CLUSTERS: { key: "ausencias" | "contraprestacao" | "administrativo"; label: string }[] = [
  { key: "ausencias", label: "Ausências & designações" },
  { key: "contraprestacao", label: "Contraprestação & compensação" },
  { key: "administrativo", label: "Administrativo" },
];

export function VidaFuncionalView() {
  const [tab, setTab] = useState<Tab>("visao");
  const { data: eventos = [], isLoading } = trpc.vidaFuncional.listEventos.useQuery({});

  const countByTipo = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of eventos) m[e.tipo] = (m[e.tipo] ?? 0) + 1;
    return m;
  }, [eventos]);

  const proximosPrazos = useMemo(() => {
    const now = Date.now();
    return eventos
      .filter((e) => e.prazo && new Date(e.prazo).getTime() >= now - 86400000)
      .sort((a, b) => new Date(a.prazo!).getTime() - new Date(b.prazo!).getTime())
      .slice(0, 4);
  }, [eventos]);

  const marcosCount = eventos.filter((e) => isMarco(e.tipo as any)).length;

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: "visao", label: "Visão geral", icon: Briefcase },
    { key: "timeline", label: "Linha do Tempo", icon: Milestone },
    { key: "produtividade", label: "Produtividade", icon: CalendarClock },
  ];

  const bottomRow = (
    <div className="flex items-center gap-0.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 cursor-pointer",
            tab === t.key ? "bg-white/90 text-neutral-800 shadow-sm" : "text-white/60 hover:text-white hover:bg-white/[0.06]",
          )}
        >
          <t.icon className="w-3 h-3" />
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <CollapsiblePageHeader title="Vida Funcional" icon={Briefcase} seamless bottomRow={bottomRow}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-[15px] font-semibold">Vida Funcional</h1>
            <p className="text-[10px] text-white/55 hidden sm:block">
              {isLoading ? "carregando…" : `${eventos.length} evento(s) · ${marcosCount} marco(s)`}
            </p>
          </div>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-4 space-y-6">
        {tab === "visao" && (
          <>
            {/* Radar-lite */}
            <section>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">Próximos prazos</p>
              {proximosPrazos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem prazos próximos.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {proximosPrazos.map((e) => (
                    <div key={e.id} className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">{e.prazo}</p>
                      <p className="text-sm font-medium truncate">{e.titulo}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Trajetória (card → aba timeline) */}
            <section>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">Progressão</p>
              <button
                onClick={() => setTab("timeline")}
                className="w-full text-left p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50 hover:border-emerald-500/30 transition-colors cursor-pointer flex items-center gap-3"
              >
                <Milestone className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="font-medium">Trajetória</p>
                  <p className="text-xs text-muted-foreground">{marcosCount} marco(s) — ver linha do tempo da carreira</p>
                </div>
              </button>
            </section>

            {/* Bento por cluster */}
            {CLUSTERS.map((c) => (
              <section key={c.key}>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">{c.label}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dominiosByCluster(c.key).map((d) => {
                    const Icon = vfIcon(d.icon);
                    const count = d.tipos.reduce((s, t) => s + (countByTipo[t] ?? 0), 0);
                    return (
                      <Link
                        key={d.key}
                        href={`/admin/carreira/vida-funcional/${d.key}`}
                        className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50 hover:border-emerald-500/30 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-neutral-500" />
                          <span className="text-xs text-neutral-500 truncate">{d.label}</span>
                        </div>
                        <p className="text-lg font-semibold tabular-nums">{count}</p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}

        {tab === "timeline" && <TrajetoriaTimeline eventos={eventos} isLoading={isLoading} />}

        {tab === "produtividade" && (
          <div className="p-6 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-center">
            <p className="text-sm text-muted-foreground">Produtividade chega no próximo estágio (dashboard + relatório).</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Ligar na page**

Replace `src/app/(dashboard)/admin/carreira/vida-funcional/page.tsx` content with:

```tsx
"use client";

import { VidaFuncionalView } from "./_components/vida-funcional-view";

export default function VidaFuncionalPage() {
  return <VidaFuncionalView />;
}
```

- [ ] **Step 4: Build (depende da Task 4 existir)**

A Task 4 cria `trajetoria-timeline.tsx` (importado aqui). Implemente a Task 4 ANTES de rodar o build, ou crie um stub temporário. Para manter a ordem TDD-friendly, **execute a Task 4 antes do build desta task**; então:

Run: `npm run build` → a rota `/admin/carreira/vida-funcional` compila com as abas.

- [ ] **Step 5: Commit** (após Task 4 verde)

```bash
git add "src/app/(dashboard)/admin/carreira/vida-funcional/_components/icon-map.ts" "src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx" "src/app/(dashboard)/admin/carreira/vida-funcional/page.tsx"
git commit -m "feat(carreira): bento-home da Vida Funcional (abas + radar-lite + Trajetoria + clusters)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Aba Linha do Tempo (Trajetória)

**Files:**
- Create: `src/app/(dashboard)/admin/carreira/vida-funcional/_components/trajetoria-timeline.tsx`

**Interfaces:**
- Consumes: `Timeline`/`TimelineItem` de `@/components/shared/timeline`; `isMarco` de `@/lib/vida-funcional/tipo-cluster`; o array de eventos passado por prop (a home já o tem — evita 2ª query).
- Produces: componente `TrajetoriaTimeline({ eventos, isLoading })` com filtro Marcos | Operacional | Tudo; renderiza marcos em destaque e demais como leves.

- [ ] **Step 1: Implementar**

Create `src/app/(dashboard)/admin/carreira/vida-funcional/_components/trajetoria-timeline.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Timeline, TimelineItem } from "@/components/shared/timeline";
import { isMarco, type VfTipo } from "@/lib/vida-funcional/tipo-cluster";

type Filtro = "marcos" | "operacional" | "tudo";

interface EventoLite {
  id: number;
  tipo: string;
  titulo: string;
  dataEvento: string;
  driveFolderId: string | null;
}

export function TrajetoriaTimeline({ eventos, isLoading }: { eventos: EventoLite[]; isLoading: boolean }) {
  const [filtro, setFiltro] = useState<Filtro>("marcos");

  const itens = useMemo(() => {
    const list = eventos
      .filter((e) => {
        const marco = isMarco(e.tipo as VfTipo);
        if (filtro === "marcos") return marco;
        if (filtro === "operacional") return !marco;
        return true;
      })
      .sort((a, b) => new Date(b.dataEvento).getTime() - new Date(a.dataEvento).getTime());
    return list;
  }, [eventos, filtro]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando trajetória…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-0.5">
        {(["marcos", "operacional", "tudo"] as Filtro[]).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-colors cursor-pointer",
              filtro === f ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900" : "text-neutral-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum evento neste filtro.</p>
      ) : (
        <Timeline>
          {itens.map((e) => (
            <TimelineItem key={e.id} timestamp={e.dataEvento} completed={isMarco(e.tipo as VfTipo)}>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{e.tipo}</p>
              <p className="font-medium">{e.titulo}</p>
              {e.driveFolderId && (
                <a
                  href={`https://drive.google.com/drive/folders/${e.driveFolderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Abrir pasta no Drive ↗
                </a>
              )}
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build (cobre Tasks 3+4)**

Run: `npm run build` → compila a home com as duas abas. (Sem teste unitário: é componente de apresentação; a verificação é o build + checagem manual.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/admin/carreira/vida-funcional/_components/trajetoria-timeline.tsx"
git commit -m "feat(carreira): aba Linha do Tempo (Trajetoria) com filtro marcos/operacional/tudo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Tela de detalhe do domínio `[dominio]` + Drive embutido

**Files:**
- Create: `src/app/(dashboard)/admin/carreira/vida-funcional/[dominio]/page.tsx`
- Create: `src/app/(dashboard)/admin/carreira/vida-funcional/[dominio]/_components/drive-panel.tsx`
- Create: `src/app/(dashboard)/admin/carreira/vida-funcional/[dominio]/loading.tsx`

**Interfaces:**
- Consumes: `getDominio` (Task 2); `trpc.vidaFuncional.listEventos.useQuery({ tipos })` (Task 1); `trpc.drive.files.useQuery({ folderId })` (driveRouter existente — retorna `{ files, total, nextCursor }` com `DriveFileInfo[]`); `vfIcon` (Task 3).
- Produces: rota `/admin/carreira/vida-funcional/[dominio]` listando os eventos do domínio; cada evento com `driveFolderId` mostra um painel do Drive (lista + abrir no Drive). Domínio inválido → mensagem 404 amigável.

- [ ] **Step 1: Painel do Drive (embutido)**

Create `src/app/(dashboard)/admin/carreira/vida-funcional/[dominio]/_components/drive-panel.tsx`:

```tsx
"use client";

import { FileText, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export function DrivePanel({ folderId }: { folderId: string }) {
  const { data, isLoading } = trpc.drive.files.useQuery({ folderId, limit: 50 }, { enabled: !!folderId });
  const files = (data?.files ?? []) as Array<{ id: string; name: string; webViewLink?: string }>;

  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-neutral-50 dark:bg-neutral-900/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Drive</span>
        <a
          href={`https://drive.google.com/drive/folders/${folderId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
        >
          Abrir pasta <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando arquivos…</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted-foreground">Pasta vazia ou sem acesso.</p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.id}>
              <a
                href={f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span className="truncate">{f.name}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Página de detalhe**

Create `src/app/(dashboard)/admin/carreira/vida-funcional/[dominio]/page.tsx`:

```tsx
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { getDominio } from "@/lib/vida-funcional/dominios";
import { vfIcon } from "../_components/icon-map";
import { DrivePanel } from "./_components/drive-panel";

export default function DominioPage({ params }: { params: Promise<{ dominio: string }> }) {
  const { dominio } = use(params);
  const cfg = getDominio(dominio);
  const [openId, setOpenId] = useState<number | null>(null);

  const { data: eventos = [], isLoading } = trpc.vidaFuncional.listEventos.useQuery(
    { tipos: cfg?.tipos as any },
    { enabled: !!cfg },
  );

  if (!cfg) {
    return (
      <div className="p-8">
        <Link href="/admin/carreira/vida-funcional" className="text-sm text-emerald-600 hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <p className="mt-4 text-muted-foreground">Domínio “{dominio}” não encontrado.</p>
      </div>
    );
  }

  const Icon = vfIcon(cfg.icon);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <div className="px-5 md:px-8 py-4 border-b border-border/60 bg-white dark:bg-neutral-900/50">
        <Link href="/admin/carreira/vida-funcional" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Vida Funcional
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <Icon className="w-5 h-5 text-emerald-500" />
          <h1 className="text-lg font-semibold">{cfg.label}</h1>
          <span className="text-sm text-muted-foreground tabular-nums">({eventos.length})</span>
        </div>
      </div>

      <div className="px-5 md:px-8 py-4 space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento neste domínio ainda.</p>
        ) : (
          eventos.map((e) => {
            const open = openId === e.id;
            return (
              <div key={e.id} className="rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50">
                <button
                  onClick={() => setOpenId(open ? null : e.id)}
                  className="w-full text-left p-4 flex items-center gap-3 cursor-pointer"
                >
                  {e.driveFolderId ? (open ? <ChevronDown className="w-4 h-4 text-neutral-400" /> : <ChevronRight className="w-4 h-4 text-neutral-400" />) : <span className="w-4" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground font-mono">{e.dataEvento} · {e.status}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-neutral-400">{e.tipo}</span>
                </button>
                {open && e.driveFolderId && (
                  <div className="px-4 pb-4">
                    <DrivePanel folderId={e.driveFolderId} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: loading.tsx**

Create `src/app/(dashboard)/admin/carreira/vida-funcional/[dominio]/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function DominioLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-background">
      <div className="px-5 md:px-8 py-4 border-b border-border/60">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="px-5 md:px-8 py-4 space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build + manual check**

Run: `npm run build` → a rota dinâmica `/admin/carreira/vida-funcional/[dominio]` aparece no manifest. Manual (não headless): navegar a `/admin/carreira/vida-funcional/ferias-licencas` como defensor — anotar como follow-up manual.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/carreira/vida-funcional/[dominio]"
git commit -m "feat(carreira): tela de detalhe por dominio + painel do Drive embutido

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Verificação final do Stage 2

- [ ] `CI=1 vitest run` (unit) verde, incl. `vida-funcional-dominios`.
- [ ] Integração (local, live DB) verde, incl. o novo caso de filtros.
- [ ] `npm run build` verde; rotas `/admin/carreira/vida-funcional` e `.../[dominio]` no manifest.
- [ ] Navegação manual: abas Visão geral/Linha do Tempo funcionam; cards do bento abrem o detalhe; eventos com pasta mostram arquivos do Drive.

## Self-review (autor do plano)

- **Cobertura (spec §7 passo 2):** Home bento 4 clusters (Task 3) ✓; Trajetória (Task 4) ✓; detalhe de domínio com Drive embutido (Task 5, via `trpc.drive.files`) ✓; filtro de dados que as telas exigem (Task 1) ✓; config de domínios (Task 2) ✓. Radar completo, indexador/sugestões e Produtividade ficam para Stages 3–5 (declarado no escopo; aqui radar-lite e stub).
- **Sem placeholders proibidos:** o stub de Produtividade é uma decisão de escopo explícita (Stage 5), não um TODO de implementação.
- **Privacidade:** nenhuma tela toca a tabela direto; tudo via `trpc.vidaFuncional.*` (escopo do Stage 1) e `trpc.drive.files` (já protegido).
- **Consistência de tipos:** `Dominio.tipos: VfTipo[]` alimenta `listEventos({ tipos })`; `isMarco`/`MARCO_TIPOS` reusados de Stage 1; ícones resolvidos por `vfIcon`.
- **Dependência entre Tasks 3 e 4:** a view (3) importa o timeline (4); executar a Task 4 antes do build da Task 3 (anotado nos steps).
