# Renderizar dossiê v2 no painel da agenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir no painel da agenda os dossiês gravados no formato `analysis_data.dossie` (`dossie_vvd_autos_pje_v2`), hoje invisíveis, numa seção "Dossiê" dedicada — sem regressão para os demais formatos.

**Architecture:** Mudança só de frontend (o `analysis_data` inteiro já chega ao cliente via `getAudienciaContext`). Helper puro de detecção/classificação + componente de render fiel + integração no `event-detail-sheet` que mostra a seção "Dossiê" e suprime as seções narrativas vazias do formato-app quando há dossiê v2.

**Tech Stack:** React, Next.js 15, Tailwind, vitest + @testing-library/react (happy-dom).

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/agenda/dossie-v2.ts` (novo) | tipo `DossieV2`, `hasDossieV2`, `nivelTeseClass` (puros) |
| `src/components/agenda/sheet/dossie-v2-block.tsx` (novo) | render fiel do dossiê (recebe `dossie` por prop) |
| `src/components/agenda/event-detail-sheet.tsx` | detecção `dossieV2`, seção "Dossiê", gating `!dossieV2` das narrativas |
| `__tests__/unit/dossie-v2.test.ts` (novo) | testes dos helpers |
| `__tests__/components/dossie-v2-block.test.tsx` (novo) | teste de render do bloco |

---

## Task 1: Helper puro `dossie-v2.ts`

**Files:**
- Create: `src/lib/agenda/dossie-v2.ts`
- Test: `__tests__/unit/dossie-v2.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

Criar `__tests__/unit/dossie-v2.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { hasDossieV2, nivelTeseClass } from "@/lib/agenda/dossie-v2";

describe("hasDossieV2", () => {
  it("true quando analysisData tem .dossie objeto", () => {
    expect(hasDossieV2({ dossie: { ato: "x" }, pje_autos: {} })).toBe(true);
  });
  it("false sem dossie", () => {
    expect(hasDossieV2({ pje_autos: {} })).toBe(false);
  });
  it("false para null/undefined/não-objeto/dossie nulo", () => {
    expect(hasDossieV2(null)).toBe(false);
    expect(hasDossieV2(undefined)).toBe(false);
    expect(hasDossieV2("x")).toBe(false);
    expect(hasDossieV2({ dossie: null })).toBe(false);
  });
});

describe("nivelTeseClass", () => {
  it("classifica ALTA/MÉDIA/BAIXA pelo texto do nível", () => {
    expect(nivelTeseClass("■■■■□ ALTA")).toBe("alta");
    expect(nivelTeseClass("■■■□□ MÉDIA")).toBe("media");
    expect(nivelTeseClass("■■□□□ BAIXA")).toBe("baixa");
  });
  it("fallback neutra", () => {
    expect(nivelTeseClass(undefined)).toBe("neutra");
    expect(nivelTeseClass("???")).toBe("neutra");
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run __tests__/unit/dossie-v2.test.ts`
Expected: FAIL — `Cannot find module '@/lib/agenda/dossie-v2'`.

- [ ] **Step 3: Implementar o helper**

Criar `src/lib/agenda/dossie-v2.ts`:

```ts
export type DossieV2 = {
  ato?: string;
  gerado_em?: string;
  resumo?: string[];
  teses?: Array<{ nome?: string; nivel?: string; fundamento?: string }>;
  fragilidades?: string[];
  perguntas?: string[];
  providencias?: string[];
  versao_defendido?: string;
  intimacao?: string;
  fonte?: string;
  versao?: string;
};

/** true quando analysisData contém um objeto `dossie` (formato dossie_vvd_autos_pje_v2). */
export function hasDossieV2(analysisData: unknown): boolean {
  if (!analysisData || typeof analysisData !== "object") return false;
  const d = (analysisData as Record<string, unknown>).dossie;
  return !!d && typeof d === "object";
}

export type NivelTese = "alta" | "media" | "baixa" | "neutra";

/** Classifica o texto do nível ("■■■■□ ALTA", …) para escolha de cor do badge. */
export function nivelTeseClass(nivel?: string): NivelTese {
  const s = (nivel ?? "").toLowerCase();
  if (/alta/.test(s)) return "alta";
  if (/m[eé]dia/.test(s)) return "media";
  if (/baixa/.test(s)) return "baixa";
  return "neutra";
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run __tests__/unit/dossie-v2.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda/dossie-v2.ts __tests__/unit/dossie-v2.test.ts
git commit -m "feat(agenda): helper dossie-v2 (hasDossieV2, nivelTeseClass)"
```

---

## Task 2: Componente `DossieV2Block`

**Files:**
- Create: `src/components/agenda/sheet/dossie-v2-block.tsx`
- Test: `__tests__/components/dossie-v2-block.test.tsx`

- [ ] **Step 1: Escrever o teste de render que falha**

Criar `__tests__/components/dossie-v2-block.test.tsx` (o pragma happy-dom segue o padrão de `__tests__/components/collapsible-section.test.tsx`):

```tsx
// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DossieV2Block } from "@/components/agenda/sheet/dossie-v2-block";

afterEach(() => cleanup());

const dossie = {
  ato: "Instrução e Julgamento",
  resumo: ["Parágrafo um.", "Parágrafo dois."],
  teses: [{ nome: "Absolvição", nivel: "■■■■□ ALTA", fundamento: "Prova frágil." }],
  perguntas: ["Confirmar identidade."],
  // sem `intimacao` de propósito
};

describe("DossieV2Block", () => {
  it("renderiza resumo, tese (nome+fundamento) e pergunta", () => {
    render(<DossieV2Block dossie={dossie} />);
    expect(screen.getByText("Parágrafo um.")).toBeTruthy();
    expect(screen.getByText("Absolvição")).toBeTruthy();
    expect(screen.getByText("Prova frágil.")).toBeTruthy();
    expect(screen.getByText("Confirmar identidade.")).toBeTruthy();
  });
  it("omite a subseção ausente (Intimação)", () => {
    render(<DossieV2Block dossie={dossie} />);
    expect(screen.queryByText("Intimação")).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run __tests__/components/dossie-v2-block.test.tsx`
Expected: FAIL — `Cannot find module '@/components/agenda/sheet/dossie-v2-block'`.

- [ ] **Step 3: Implementar o componente**

Criar `src/components/agenda/sheet/dossie-v2-block.tsx`:

```tsx
import type { DossieV2 } from "@/lib/agenda/dossie-v2";
import { nivelTeseClass } from "@/lib/agenda/dossie-v2";
import { cn } from "@/lib/utils";

const NIVEL_BADGE: Record<string, string> = {
  alta: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  baixa: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  neutra: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

function Lista({ titulo, itens }: { titulo: string; itens?: string[] }) {
  if (!itens || itens.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{titulo}</h4>
      <ul className="space-y-1 list-disc pl-4">
        {itens.map((t, i) => (
          <li key={i} className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function DossieV2Block({ dossie }: { dossie: DossieV2 }) {
  const temAlgo =
    !!dossie &&
    ((dossie.resumo?.length ?? 0) > 0 ||
      (dossie.teses?.length ?? 0) > 0 ||
      (dossie.fragilidades?.length ?? 0) > 0 ||
      (dossie.perguntas?.length ?? 0) > 0 ||
      (dossie.providencias?.length ?? 0) > 0 ||
      !!dossie.versao_defendido ||
      !!dossie.intimacao);

  if (!temAlgo) {
    return <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">Dossiê sem conteúdo.</p>;
  }

  return (
    <div className="space-y-4">
      {(dossie.ato || dossie.gerado_em) && (
        <div className="flex items-center justify-between gap-2">
          {dossie.ato && (
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{dossie.ato}</span>
          )}
          {dossie.gerado_em && (
            <span className="text-[10px] text-neutral-400 whitespace-nowrap">gerado em {dossie.gerado_em}</span>
          )}
        </div>
      )}

      {dossie.resumo && dossie.resumo.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Resumo</h4>
          {dossie.resumo.map((p, i) => (
            <p key={i} className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{p}</p>
          ))}
        </div>
      )}

      {dossie.teses && dossie.teses.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Teses</h4>
          {dossie.teses.map((t, i) => (
            <div key={i} className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-2.5 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 flex-1">{t.nome}</p>
                {t.nivel && (
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0",
                      NIVEL_BADGE[nivelTeseClass(t.nivel)],
                    )}
                  >
                    {t.nivel}
                  </span>
                )}
              </div>
              {t.fundamento && (
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">{t.fundamento}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Lista titulo="Fragilidades da acusação" itens={dossie.fragilidades} />
      <Lista titulo="Perguntas / atos em audiência" itens={dossie.perguntas} />
      <Lista titulo="Providências da defesa" itens={dossie.providencias} />

      {dossie.versao_defendido && (
        <div className="space-y-1">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Versão do defendido</h4>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed border-l-2 border-neutral-300 dark:border-neutral-700 pl-2 italic">
            {dossie.versao_defendido}
          </p>
        </div>
      )}

      {dossie.intimacao && (
        <div className="space-y-1">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Intimação</h4>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{dossie.intimacao}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run __tests__/components/dossie-v2-block.test.tsx`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/dossie-v2-block.tsx __tests__/components/dossie-v2-block.test.tsx
git commit -m "feat(agenda): DossieV2Block — render fiel do dossiê v2"
```

---

## Task 3: Integração no `event-detail-sheet.tsx`

**File:**
- Modify: `src/components/agenda/event-detail-sheet.tsx`

Leia o arquivo antes de editar para confirmar as linhas (os números abaixo são âncoras aproximadas da versão atual).

- [ ] **Step 1: Imports**

Adicionar (perto dos imports irmãos `DocumentosBlock`/`MidiaBlock`):

```ts
import { DossieV2Block } from "./sheet/dossie-v2-block";
import { hasDossieV2 } from "@/lib/agenda/dossie-v2";
```

- [ ] **Step 2: Derivar `dossieV2`**

Logo após a linha `const ad = ctx?.analysisData;` (~linha 150), adicionar:

```ts
  const dossieV2 = hasDossieV2(ad) ? (ad as any).dossie : null;
```

- [ ] **Step 3: Renderizar a seção "Dossiê"**

A seção "Resumo Executivo" é renderizada por um bloco `{!isLoading && resumoExecutivo && ( <CollapsibleSection id="resumo" …/> )}` (~linhas 434-438). **Imediatamente após** o fechamento `)}` desse bloco e **antes** do próximo bloco `{!isLoading && (` (~linha 440), inserir:

```tsx
            {!isLoading && dossieV2 && (
              <CollapsibleSection id="dossie" label="Dossiê" defaultOpen>
                <DossieV2Block dossie={dossieV2} />
              </CollapsibleSection>
            )}
```

- [ ] **Step 4: Suprimir as narrativas do formato-app quando há `dossieV2`**

Dentro do grande bloco `{!isLoading && (<> … </>)}` (~linhas 490-839), as seções narrativas formam **dois grupos contíguos**, com `depoentes` entre eles. Envolver cada grupo em `{!dossieV2 && (<> … </>)}`:

**Grupo 1** — começa no bloco condicional do CTA "Análise IA" (`{!imputacao && !fatos && laudos.length === 0 && contradicoes.length === 0 && ( <CollapsibleSection id="analise-ia" …`) e termina no fim da seção `<CollapsibleSection id="versao" …>…</CollapsibleSection>` (logo **antes** de `<CollapsibleSection id="depoentes"`). Envolver todo esse trecho:

```tsx
                {!dossieV2 && (
                  <>
                    {/* …bloco analise-ia (CTA) + imputacao + fatos + versao… */}
                  </>
                )}
```

**Grupo 2** — começa em `<CollapsibleSection id="contradicoes" …>` (logo **após** o fechamento da seção `depoentes`) e termina no fim de `<CollapsibleSection id="teses" …>…</CollapsibleSection>` (logo **antes** de `<CollapsibleSection id="documentos"`). Envolver todo esse trecho:

```tsx
                {!dossieV2 && (
                  <>
                    {/* …contradicoes + laudos + investigacao + pendencias + teses… */}
                  </>
                )}
```

**NÃO** envolver `depoentes` (~567), `documentos` (~816) nem `midia` (~824) — essas seções vêm de fontes independentes (testemunhas/Drive) e devem aparecer sempre.

Cuidado com o balanceamento de JSX: cada `{!dossieV2 && (<>` precisa do seu `</>)}`. Não mover seções de lugar — apenas envolver os dois trechos contíguos.

- [ ] **Step 5: Verificar typecheck e parsing**

Run: `npm run typecheck`
Expected: nenhum erro **novo** mencionando `event-detail-sheet.tsx` (o projeto tem erros pré-existentes em outros arquivos — ignorar). Se o arquivo tiver erro de JSX não-balanceado, o typecheck acusa em `event-detail-sheet.tsx` — corrigir o balanceamento antes de prosseguir.

- [ ] **Step 6: Verificação de comportamento (raciocínio + opcional dev)**

Confirmar por leitura:
- Com `dossieV2` truthy: a seção "Dossiê" renderiza; os dois grupos narrativos e o CTA "Analisar" não renderizam; `depoentes`/`documentos`/`midia` seguem renderizando.
- Com `dossieV2` null: nenhuma seção "Dossiê"; tudo idêntico ao atual.

(Opcional, se o ambiente permitir: `npm run dev`, abrir a audiência das 10:40 — proc. 138 — e conferir a seção "Dossiê"; abrir uma com formato-app — ex.: proc. 647 — e conferir que está idêntica ao atual.)

- [ ] **Step 7: Commit**

```bash
git add src/components/agenda/event-detail-sheet.tsx
git commit -m "feat(agenda): seção Dossiê no painel + supressão das narrativas vazias quando há dossiê v2"
```

---

## Verificação final

- [ ] **Suíte dos arquivos novos**

Run: `npx vitest run __tests__/unit/dossie-v2.test.ts __tests__/components/dossie-v2-block.test.tsx`
Expected: PASS (7 testes).

- [ ] **Typecheck geral** — sem erros novos introduzidos por este trabalho.

- [ ] **Conferir os 5 critérios de aceite do spec** (`docs/superpowers/specs/2026-06-02-dossie-v2-painel-design.md`).
