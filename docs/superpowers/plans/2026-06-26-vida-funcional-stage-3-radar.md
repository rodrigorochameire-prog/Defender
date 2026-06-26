# Vida Funcional — Stage 3 (Radar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o "radar-lite" da home por um motor de Radar de verdade — uma função pura, testável, que varre os eventos do defensor e emite alertas datados por severidade (regras por tipo da spec §4), renderizados no topo da Visão geral com cores e links.

**Architecture:** Um módulo PURO `src/lib/vida-funcional/radar.ts` com `computeRadar(eventos, today): RadarAlert[]` — sem DB, sem rede, `today` injetado (testável em CI). A home (`vida-funcional-view.tsx`) chama `computeRadar` sobre os eventos que já busca uma vez (sem nova query), e renderiza os alertas com `COLORS` (danger/warning/info) linkando ao domínio. Mapeamento tipo→domínio é derivado de `DOMINIOS` (Stage 2) dentro do engine.

**Tech Stack:** TypeScript puro, Next.js/React (home), Tailwind/Padrão Defender, Vitest.

**Escopo deste plano:** Stage 3 da spec (§7 passo 3 + regras §4). **Decisão de escopo (YAGNI):** NÃO criar o procedure tRPC `radar()` agora — a home computa no cliente via o engine puro; o `radar()` server-side entra quando houver consumidor server (notificações do daemon, Stage 4+). O engine puro é o ativo reusável. NÃO inclui: formulário de criação de evento (os campos de `dados` que algumas regras leem só existem quando preenchidos; o engine lê `dados` defensivamente e fica em silêncio quando ausente), indexador (Stage 4), Produtividade (Stage 5).

## Global Constraints

- **Imports absolutos** `@/`. **Install** `pnpm`. Scripts via `npm run`.
- **Gate de teste honesto:** `CI=1 vitest run`. **Build gate:** `npm run build` passa. (Lembre: o vitest NÃO faz type-check — rode `npm run build` para validar tipos.)
- **Privacidade:** o engine é puro sobre eventos já escopados pelo router do Stage 1; a home não ganha nova fonte de dados. Sem mutações.
- **Datas:** colunas `date` chegam como `"YYYY-MM-DD"`. Comparar em **date-only local** (não usar `new Date("YYYY-MM-DD")` cru, que é UTC) — usar o helper `daysUntil` deste plano.
- **Severidades:** `critico` (≤7d), `atencao` (≤30d), `info` (demais/janelas). Cores: `COLORS.danger`/`COLORS.warning`/`COLORS.info` de `@/lib/config/design-tokens`.
- **Padrão Defender:** `cursor-pointer` em cards clicáveis, sem emojis como ícone.

---

### Task 1: Motor de Radar puro (`radar.ts`) + testes

**Files:**
- Create: `src/lib/vida-funcional/radar.ts`
- Test: `__tests__/unit/vida-funcional-radar.test.ts`

**Interfaces:**
- Consumes: `DOMINIOS` de `@/lib/vida-funcional/dominios`; tipo `VfTipo` de `@/lib/vida-funcional/tipo-cluster`.
- Produces: `computeRadar(eventos: RadarEventoInput[], today: Date): RadarAlert[]`; `daysUntil(dateStr: string, today: Date): number`; `SEV_RANK`; tipos `Severidade`, `RadarEventoInput`, `RadarAlert`.

- [ ] **Step 1: Teste (RED)**

Create `__tests__/unit/vida-funcional-radar.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeRadar, daysUntil, type RadarEventoInput } from "@/lib/vida-funcional/radar";

const TODAY = new Date(2026, 5, 26); // 2026-06-26 local

function ev(over: Partial<RadarEventoInput>): RadarEventoInput {
  return {
    id: 1, tipo: "FERIAS", titulo: "x", status: "previsto",
    dataEvento: "2026-06-01", dataFim: null, prazo: null, dados: {}, ...over,
  };
}

describe("daysUntil (date-only, local)", () => {
  it("conta dias corretamente", () => {
    expect(daysUntil("2026-06-26", TODAY)).toBe(0);
    expect(daysUntil("2026-06-29", TODAY)).toBe(3);
    expect(daysUntil("2026-06-20", TODAY)).toBe(-6);
  });
});

describe("computeRadar — regra base por prazo", () => {
  it("prazo em 3 dias → critico; 20 dias → atencao; 45 → info", () => {
    const r = computeRadar([
      ev({ id: 1, prazo: "2026-06-29" }),
      ev({ id: 2, prazo: "2026-07-16" }),
      ev({ id: 3, prazo: "2026-08-10" }),
    ], TODAY);
    const byId = Object.fromEntries(r.map((a) => [a.eventoId, a.severidade]));
    expect(byId[1]).toBe("critico");
    expect(byId[2]).toBe("atencao");
    expect(byId[3]).toBe("info");
  });
  it("evento concluido/arquivado não gera alerta", () => {
    const r = computeRadar([
      ev({ id: 1, prazo: "2026-06-29", status: "concluido" }),
      ev({ id: 2, prazo: "2026-06-29", status: "arquivado" }),
    ], TODAY);
    expect(r).toHaveLength(0);
  });
  it("evento sem prazo e sem regra específica não gera alerta", () => {
    expect(computeRadar([ev({ id: 1, prazo: null })], TODAY)).toHaveLength(0);
  });
  it("prazo muito distante (>60d) é ignorado", () => {
    expect(computeRadar([ev({ id: 1, prazo: "2026-12-01" })], TODAY)).toHaveLength(0);
  });
});

describe("computeRadar — regras específicas", () => {
  it("FOLGA com vencimento próximo", () => {
    const r = computeRadar([ev({ id: 1, tipo: "FOLGA", dados: { vencimento: "2026-06-30" } })], TODAY);
    expect(r[0].severidade).toBe("critico");
    expect(r[0].motivo).toMatch(/folga/i);
  });
  it("DIARIA a_requerer", () => {
    const r = computeRadar([ev({ id: 1, tipo: "DIARIA", status: "concluido", dados: { status: "a_requerer" } })], TODAY);
    expect(r[0].severidade).toBe("atencao");
    expect(r[0].motivo).toMatch(/requerer/i);
  });
  it("GRATIFICACAO com SEI pendente e período encerrado", () => {
    const r = computeRadar([ev({ id: 1, tipo: "GRATIFICACAO", dataFim: "2026-06-10", dados: { seiStatus: "pendente" } })], TODAY);
    expect(r[0].motivo).toMatch(/SEI|ofício/i);
  });
  it("SOLICITACAO_ADM pendente há mais de 15 dias", () => {
    const r = computeRadar([ev({ id: 1, tipo: "SOLICITACAO_ADM", status: "pendente", dataEvento: "2026-06-01" })], TODAY);
    expect(r[0].motivo).toMatch(/sem resposta/i);
  });
  it("PROMOCAO com prazo → info (nunca critico)", () => {
    const r = computeRadar([ev({ id: 1, tipo: "PROMOCAO", prazo: "2026-06-28" })], TODAY);
    expect(r[0].severidade).toBe("info");
  });
});

describe("computeRadar — ordenação", () => {
  it("ordena por severidade depois por prazo", () => {
    const r = computeRadar([
      ev({ id: 1, prazo: "2026-08-10" }),   // info
      ev({ id: 2, prazo: "2026-06-28" }),   // critico
      ev({ id: 3, prazo: "2026-07-10" }),   // atencao
    ], TODAY);
    expect(r.map((a) => a.eventoId)).toEqual([2, 3, 1]);
  });
  it("vincula dominioKey pelo tipo", () => {
    const r = computeRadar([ev({ id: 1, tipo: "FERIAS", prazo: "2026-06-28" })], TODAY);
    expect(r[0].dominioKey).toBe("ferias-licencas");
  });
});
```

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-radar.test.ts` → FAIL (módulo inexistente).

- [ ] **Step 2: Implementar o engine**

Create `src/lib/vida-funcional/radar.ts`:

```typescript
import { DOMINIOS } from "./dominios";

export type Severidade = "critico" | "atencao" | "info";

export interface RadarEventoInput {
  id: number;
  tipo: string;
  titulo: string;
  status: string;
  dataEvento: string;
  dataFim: string | null;
  prazo: string | null;
  dados: Record<string, unknown>;
}

export interface RadarAlert {
  eventoId: number;
  tipo: string;
  severidade: Severidade;
  titulo: string;
  prazo: string | null; // data-alvo do alerta (vencimento/prazo/dataFim) quando houver
  motivo: string;
  dominioKey: string | null;
}

export const SEV_RANK: Record<Severidade, number> = { critico: 0, atencao: 1, info: 2 };

// tipo → primeira key de domínio que o contém (marcos/progressao → undefined)
const TIPO_TO_DOMINIO: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const d of DOMINIOS) for (const t of d.tipos) if (!(t in m)) m[t] = d.key;
  return m;
})();

const ativo = (status: string) => status !== "concluido" && status !== "arquivado";

/** Dias do hoje até a data, em date-only local. Negativo = passado. */
export function daysUntil(dateStr: string, today: Date): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const target = new Date(y, mo - 1, d).getTime();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((target - base) / 86400000);
}

function sevByDias(dias: number): Severidade {
  if (dias <= 7) return "critico";
  if (dias <= 30) return "atencao";
  return "info";
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function computeRadar(eventos: RadarEventoInput[], today: Date): RadarAlert[] {
  const alerts: RadarAlert[] = [];

  for (const e of eventos) {
    const tipo = e.tipo;
    const dom = TIPO_TO_DOMINIO[tipo] ?? null;
    const dados = e.dados ?? {};

    // FOLGA com vencimento (usar ou virar pecúnia)
    const vencimento = str(dados.vencimento);
    if (tipo === "FOLGA" && vencimento && ativo(e.status)) {
      const dias = daysUntil(vencimento, today);
      if (dias >= -1 && dias <= 60) {
        alerts.push({ eventoId: e.id, tipo, severidade: sevByDias(dias), titulo: e.titulo, prazo: vencimento, motivo: dias < 0 ? "folga vencida" : `folga vence em ${dias}d`, dominioKey: dom });
        continue;
      }
    }

    // DIARIA a requerer
    if (tipo === "DIARIA" && str(dados.status) === "a_requerer") {
      alerts.push({ eventoId: e.id, tipo, severidade: "atencao", titulo: e.titulo, prazo: e.prazo, motivo: "diária a requerer", dominioKey: dom });
      continue;
    }

    // GRATIFICACAO/SUBSTITUICAO com SEI pendente e período encerrado
    const seiStatus = str(dados.seiStatus);
    if ((tipo === "GRATIFICACAO" || tipo === "SUBSTITUICAO") && seiStatus && seiStatus !== "enviado") {
      const encerrada = e.dataFim ? daysUntil(e.dataFim, today) < 0 : false;
      if (encerrada) {
        alerts.push({ eventoId: e.id, tipo, severidade: "atencao", titulo: e.titulo, prazo: e.dataFim, motivo: "ofício/SEI pendente", dominioKey: dom });
        continue;
      }
    }

    // SOLICITACAO_ADM pendente há muito tempo
    if (tipo === "SOLICITACAO_ADM" && e.status === "pendente") {
      const idade = -daysUntil(e.dataEvento, today);
      if (idade > 15) {
        alerts.push({ eventoId: e.id, tipo, severidade: "atencao", titulo: e.titulo, prazo: null, motivo: `sem resposta há ${idade}d`, dominioKey: dom });
        continue;
      }
    }

    // Regra base: evento ativo com prazo próximo
    if (e.prazo && ativo(e.status)) {
      const dias = daysUntil(e.prazo, today);
      if (dias >= -3 && dias <= 60) {
        const sev: Severidade = tipo === "PROMOCAO" ? "info" : sevByDias(dias);
        alerts.push({ eventoId: e.id, tipo, severidade: sev, titulo: e.titulo, prazo: e.prazo, motivo: dias < 0 ? "prazo vencido" : `em ${dias}d`, dominioKey: dom });
      }
    }
  }

  alerts.sort((a, b) => {
    const s = SEV_RANK[a.severidade] - SEV_RANK[b.severidade];
    if (s !== 0) return s;
    const pa = a.prazo ? daysUntil(a.prazo, today) : 9999;
    const pb = b.prazo ? daysUntil(b.prazo, today) : 9999;
    return pa - pb;
  });

  return alerts;
}
```

- [ ] **Step 3: GREEN + commit**

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-radar.test.ts` → PASS.
Run: `npm run build` → sem erro de tipo no novo módulo. (Pode levar minutos.)

```bash
git add src/lib/vida-funcional/radar.ts __tests__/unit/vida-funcional-radar.test.ts
git commit -m "feat(carreira): motor de Radar puro da Vida Funcional (regras por tipo, severidade)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Wire o Radar na home (substitui radar-lite)

**Files:**
- Modify: `src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx`

**Interfaces:**
- Consumes: `computeRadar`/`RadarAlert`/`Severidade` (Task 1); `COLORS` de `@/lib/config/design-tokens`; eventos já buscados via `listEventos` (sem nova query).
- Produces: a Visão geral mostra a seção "Radar" no topo, com cards por severidade (cor de `COLORS`), ordenados, cada um linkando ao domínio (`/admin/carreira/vida-funcional/{dominioKey}` quando houver). Substitui o `proximosPrazos` e a seção radar-lite.

- [ ] **Step 1: Substituir o memo `proximosPrazos`**

Em `vida-funcional-view.tsx`, troque o bloco do memo `proximosPrazos` (linhas ~32-38) por:

```tsx
  const radar = useMemo(() => computeRadar(eventos as any, new Date()), [eventos]);
```

E adicione os imports no topo:

```tsx
import { computeRadar, type Severidade } from "@/lib/vida-funcional/radar";
import { COLORS } from "@/lib/config/design-tokens";
```

- [ ] **Step 2: Substituir a seção "Radar-lite" no JSX**

Troque a `<section>` do "Radar-lite" (o bloco com "Próximos prazos", linhas ~85-100) por:

```tsx
            {/* Radar */}
            <section>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                Radar {radar.length > 0 && <span className="text-neutral-400">· {radar.length}</span>}
              </p>
              {radar.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum alerta. Em dia.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {radar.map((a) => {
                    const c = a.severidade === "critico" ? COLORS.danger : a.severidade === "atencao" ? COLORS.warning : COLORS.info;
                    const inner = (
                      <div className={cn("p-3 rounded-xl border h-full", c.border, c.bg)}>
                        <p className={cn("text-[11px] font-mono", c.text)}>{a.prazo ?? a.motivo}</p>
                        <p className="text-sm font-medium truncate">{a.titulo}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{a.motivo}</p>
                      </div>
                    );
                    return a.dominioKey ? (
                      <Link key={a.eventoId} href={`/admin/carreira/vida-funcional/${a.dominioKey}`} className="cursor-pointer">
                        {inner}
                      </Link>
                    ) : (
                      <div key={a.eventoId}>{inner}</div>
                    );
                  })}
                </div>
              )}
            </section>
```

- [ ] **Step 3: Build**

Run: `npm run build` → a home compila com o Radar; rota `/admin/carreira/vida-funcional` no manifest.
Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-radar.test.ts __tests__/unit/vida-funcional-dominios.test.ts __tests__/unit/vida-funcional-tipo-cluster.test.ts __tests__/unit/vida-funcional-scope.test.ts` → todos verdes (sem regressão).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx"
git commit -m "feat(carreira): Radar na home da Vida Funcional (severidade + links por dominio)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Verificação final do Stage 3

- [ ] `CI=1 vitest run` (unit) verde, incl. `vida-funcional-radar` (engine).
- [ ] `npm run build` verde; home compila com o Radar.
- [ ] Manual (não headless): abrir a home como defensor com eventos que tenham `prazo`/`dados` — conferir que os alertas aparecem por severidade e linkam ao domínio.

## Self-review (autor do plano)

- **Cobertura (spec §4 + §7 passo 3):** regras por tipo (FOLGA, DIARIA, GRATIFICACAO/SUBSTITUICAO, SOLICITACAO_ADM, base por prazo, PROMOCAO info) ✓; severidades ✓; ordenação ✓; UI no cabeçalho da Visão geral ✓. `radar()` tRPC deferido por YAGNI (documentado no escopo) — o engine puro cobre o uso atual e é trivial de embrulhar depois.
- **Sem placeholders proibidos:** o engine lê `dados` defensivamente; regras ficam em silêncio quando o campo não existe (esperado até existir formulário de criação — Stage posterior). Isso é comportamento, não TODO.
- **Datas:** `daysUntil` evita o bug de TZ de `new Date("YYYY-MM-DD")`; testado explicitamente.
- **Consistência de tipos:** `RadarEventoInput` casa com os campos retornados por `listEventos` (id/tipo/titulo/status/dataEvento/dataFim/prazo/dados); `dominioKey` deriva de `DOMINIOS`.
- **Privacidade:** nenhuma nova fonte de dados; engine puro sobre eventos já escopados.
