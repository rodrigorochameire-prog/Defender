# Sheet de evento por subtipo de audiência — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestruturar o `EventDetailSheet` para que cada subtipo de audiência tenha seu próprio conjunto ordenado de seções (manifesto), entregando a Justificação (MPU) completa sem regredir os demais ritos.

**Architecture:** Um manifesto `SecaoId[]` por subtipo (em `SUBTIPO_CONFIG`) define ordem e presença. O sheet constrói um mapa `id → { label, node, temDado }` a partir dos blocos existentes + novos, e renderiza ToC e corpo iterando o manifesto resolvido — fonte única, fim da divergência. Lógica pura (resolução do manifesto, normalização do motivo, fonte das medidas) vai para módulos testáveis com Vitest.

**Tech Stack:** Next.js 15, React, TypeScript, tRPC, Tailwind, Vitest + @testing-library/react.

---

## Estrutura de arquivos

**Criar:**
- `src/components/agenda/sheet/secoes-manifest.ts` — `SecaoId`, `SECOES_DEFAULT`, `SECOES_JUSTIFICACAO`, `resolverManifesto()`.
- `src/components/agenda/sheet/secoes-manifest.test.ts` — testes do manifesto.
- `src/components/agenda/sheet/motivo-designacao.ts` — `OrigemDesignacao`, `MotivoDesignacao`, `normalizarMotivo()`, `LABEL_ORIGEM`.
- `src/components/agenda/sheet/motivo-designacao.test.ts`
- `src/components/agenda/sheet/medidas-fonte.ts` — `FonteMedidas`, `resolverFonteMedidas()`.
- `src/components/agenda/sheet/medidas-fonte.test.ts`
- `src/components/agenda/sheet/secoes/MotivoDesignacaoSecao.tsx`
- `src/components/agenda/sheet/secoes/RequerimentoDefesaSecao.tsx`
- `src/components/agenda/sheet/secoes/ResumoGeralSecao.tsx`
- `src/components/agenda/sheet/secoes/IntimacaoSecao.tsx`
- `src/components/agenda/sheet/secoes/MedidasVigentesSecao.tsx`
- `src/components/agenda/sheet/secoes/__tests__/secoes-novas.test.tsx`
- `src/components/mpu/use-medidas-vigentes.ts` — hook extraído do painel.

**Modificar:**
- `src/components/agenda/registro-audiencia/subtipo-audiencia.ts` — `import { SecaoId }`, campo `secoes?` em `SubtipoConfig`, `secoes` em `justificacao`.
- `src/components/agenda/sheet/dossie-v2-block.tsx` — prop `ocultarIntimacao`.
- `src/components/mpu/medidas-vigentes-panel.tsx` — usar `use-medidas-vigentes`.
- `src/components/agenda/event-detail-sheet.tsx` — mapa de seções + render por manifesto; remover `tocSections` fixo e a seção `medidas-deferidas`.
- Skill `analise-vvd` (prompt/esquema) — emitir campos novos.

---

## Task 1: Manifesto de seções por subtipo

**Files:**
- Create: `src/components/agenda/sheet/secoes-manifest.ts`
- Test: `src/components/agenda/sheet/secoes-manifest.test.ts`
- Modify: `src/components/agenda/registro-audiencia/subtipo-audiencia.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/components/agenda/sheet/secoes-manifest.test.ts
import { describe, it, expect } from "vitest";
import { SECOES_DEFAULT, SECOES_JUSTIFICACAO, resolverManifesto } from "./secoes-manifest";

describe("resolverManifesto", () => {
  it("usa o manifesto próprio quando o subtipo define secoes", () => {
    expect(resolverManifesto({ secoes: SECOES_JUSTIFICACAO })).toBe(SECOES_JUSTIFICACAO);
  });

  it("cai para o default quando o subtipo não define secoes", () => {
    expect(resolverManifesto({})).toBe(SECOES_DEFAULT);
  });

  it("a Justificação não inclui seções de ação penal", () => {
    for (const penal of ["imputacao", "fatos", "sintese", "contradicoes", "laudos", "teses"] as const) {
      expect(SECOES_JUSTIFICACAO).not.toContain(penal);
    }
  });

  it("a Justificação põe o motivo antes das medidas e o requerimento logo após o motivo", () => {
    const iMotivo = SECOES_JUSTIFICACAO.indexOf("motivo-designacao");
    const iReq = SECOES_JUSTIFICACAO.indexOf("requerimento-defesa");
    const iMed = SECOES_JUSTIFICACAO.indexOf("medidas");
    expect(iMotivo).toBeGreaterThanOrEqual(0);
    expect(iReq).toBe(iMotivo + 1);
    expect(iMed).toBeGreaterThan(iReq);
  });

  it("o default preserva a ordem atual do corpo (resumo→dossie→medidas no topo)", () => {
    expect(SECOES_DEFAULT.slice(0, 3)).toEqual(["resumo", "dossie", "medidas"]);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run src/components/agenda/sheet/secoes-manifest.test.ts`
Expected: FAIL — `Cannot find module './secoes-manifest'`.

- [ ] **Step 3: Implementar o módulo**

```ts
// src/components/agenda/sheet/secoes-manifest.ts

/**
 * Identificador de seção do EventDetailSheet. Os valores coincidem com o `id`
 * usado em cada <CollapsibleSection>, para que o ToC (IntersectionObserver via
 * data-section-id) e o corpo apontem para a mesma âncora.
 */
export type SecaoId =
  | "resumo"             // Resumo Executivo (default / ação penal)
  | "resumo-audiencia"   // NOVO — resumo geral orientado ao subtipo
  | "motivo-designacao"
  | "requerimento-defesa" // NOVO
  | "intimacao"          // NOVO standalone (lê dossie.intimacao)
  | "dossie"             // Roteiro da defesa
  | "medidas"            // Medidas protetivas vigentes (unificada)
  | "preventiva"
  | "cautelares"
  | "anotacoes-rapidas"
  | "analise-ia"
  | "imputacao"
  | "fatos"
  | "relato-vitima"
  | "sintese"
  | "versao"             // Relato do assistido
  | "depoentes"
  | "depoimentos"
  | "contradicoes"
  | "laudos"
  | "investigacao"
  | "pendencias"
  | "teses"
  | "documentos"
  | "midia";

/**
 * Ordem-base reproduzindo o corpo renderizado hoje em event-detail-sheet.tsx.
 * A única diferença intencional: a antiga seção "medidas-deferidas"
 * (analysisData) foi fundida em "medidas" (ver Task 6 / medidas-fonte).
 */
export const SECOES_DEFAULT: SecaoId[] = [
  "resumo",
  "dossie",
  "medidas",
  "preventiva",
  "cautelares",
  "anotacoes-rapidas",
  "analise-ia",
  "imputacao",
  "fatos",
  "motivo-designacao",
  "relato-vitima",
  "sintese",
  "versao",
  "depoentes",
  "depoimentos",
  "contradicoes",
  "laudos",
  "investigacao",
  "pendencias",
  "teses",
  "documentos",
  "midia",
];

/** Justificação (MPU): por relevância para o defensor; sem seções de ação penal. */
export const SECOES_JUSTIFICACAO: SecaoId[] = [
  "motivo-designacao",
  "requerimento-defesa",
  "intimacao",
  "resumo-audiencia",
  "medidas",
  "relato-vitima",
  "versao",
  "dossie",
  "depoentes",
  "anotacoes-rapidas",
  "documentos",
  "midia",
];

export function resolverManifesto(config: { secoes?: SecaoId[] }): SecaoId[] {
  return config.secoes ?? SECOES_DEFAULT;
}
```

- [ ] **Step 4: Ligar o manifesto à config de subtipo**

Em `src/components/agenda/registro-audiencia/subtipo-audiencia.ts`:

Adicionar o import no topo (junto aos demais imports):
```ts
import type { SecaoId } from "@/components/agenda/sheet/secoes-manifest";
import { SECOES_JUSTIFICACAO } from "@/components/agenda/sheet/secoes-manifest";
```

Na interface `SubtipoConfig`, adicionar o campo (após `direcionaCockpit?`):
```ts
  /** Lista ordenada de seções deste rito no EventDetailSheet. Ausente → SECOES_DEFAULT. */
  secoes?: SecaoId[];
```

No objeto `SUBTIPO_CONFIG.justificacao`, adicionar a propriedade (após `instrucaoCompleta: false,`):
```ts
    secoes: SECOES_JUSTIFICACAO,
```

- [ ] **Step 5: Rodar o teste e o typecheck**

Run: `npx vitest run src/components/agenda/sheet/secoes-manifest.test.ts && npm run typecheck`
Expected: testes PASS; typecheck sem erros novos.

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/sheet/secoes-manifest.ts src/components/agenda/sheet/secoes-manifest.test.ts src/components/agenda/registro-audiencia/subtipo-audiencia.ts
git commit -m "feat(agenda): manifesto de seções por subtipo + manifesto da Justificação"
```

---

## Task 2: Normalização do motivo da designação (tipado + retrocompat)

**Files:**
- Create: `src/components/agenda/sheet/motivo-designacao.ts`
- Test: `src/components/agenda/sheet/motivo-designacao.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/components/agenda/sheet/motivo-designacao.test.ts
import { describe, it, expect } from "vitest";
import { normalizarMotivo, LABEL_ORIGEM } from "./motivo-designacao";

describe("normalizarMotivo", () => {
  it("string legada vira { origem: null, detalhe }", () => {
    expect(normalizarMotivo("juiz remarcou para reavaliar")).toEqual({
      origem: null,
      detalhe: "juiz remarcou para reavaliar",
    });
  });

  it("objeto tipado é preservado", () => {
    expect(normalizarMotivo({ origem: "pedido_revogacao_ofendida", detalhe: "ela quer revogar" })).toEqual({
      origem: "pedido_revogacao_ofendida",
      detalhe: "ela quer revogar",
    });
  });

  it("origem inválida é descartada, detalhe mantido", () => {
    expect(normalizarMotivo({ origem: "xpto", detalhe: "algo" })).toEqual({ origem: null, detalhe: "algo" });
  });

  it("vazio/ausente → null", () => {
    expect(normalizarMotivo("")).toBeNull();
    expect(normalizarMotivo("   ")).toBeNull();
    expect(normalizarMotivo(null)).toBeNull();
    expect(normalizarMotivo(undefined)).toBeNull();
    expect(normalizarMotivo({ origem: null, detalhe: "" })).toBeNull();
  });

  it("há rótulo para toda origem", () => {
    expect(LABEL_ORIGEM.requerimento_defesa).toBe("Requerimento da defesa");
    expect(Object.keys(LABEL_ORIGEM)).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/components/agenda/sheet/motivo-designacao.test.ts`
Expected: FAIL — `Cannot find module './motivo-designacao'`.

- [ ] **Step 3: Implementar**

```ts
// src/components/agenda/sheet/motivo-designacao.ts

export type OrigemDesignacao =
  | "requerimento_defesa"
  | "pedido_revogacao_ofendida"
  | "alegacao_descumprimento"
  | "reavaliacao_juizo"
  | "caso_novo"
  | "outro";

export interface MotivoDesignacao {
  origem: OrigemDesignacao | null;
  detalhe: string;
}

export const LABEL_ORIGEM: Record<OrigemDesignacao, string> = {
  requerimento_defesa: "Requerimento da defesa",
  pedido_revogacao_ofendida: "Pedido de revogação da ofendida",
  alegacao_descumprimento: "Alegação de descumprimento",
  reavaliacao_juizo: "Reavaliação pelo juízo",
  caso_novo: "Caso novo",
  outro: "Outro",
};

const ORIGENS = Object.keys(LABEL_ORIGEM) as OrigemDesignacao[];

export function normalizarMotivo(raw: unknown): MotivoDesignacao | null {
  if (!raw) return null;

  if (typeof raw === "string") {
    const detalhe = raw.trim();
    return detalhe ? { origem: null, detalhe } : null;
  }

  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const detalhe = typeof o.detalhe === "string" ? o.detalhe.trim() : "";
    const origem = ORIGENS.includes(o.origem as OrigemDesignacao) ? (o.origem as OrigemDesignacao) : null;
    if (!detalhe && !origem) return null;
    return { origem, detalhe };
  }

  return null;
}
```

- [ ] **Step 4: Rodar e confirmar PASS**

Run: `npx vitest run src/components/agenda/sheet/motivo-designacao.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/motivo-designacao.ts src/components/agenda/sheet/motivo-designacao.test.ts
git commit -m "feat(agenda): motivo da designação tipado com retrocompat de string"
```

---

## Task 3: Fonte das medidas protetivas (unificação banco → analysisData)

**Files:**
- Create: `src/components/agenda/sheet/medidas-fonte.ts`
- Test: `src/components/agenda/sheet/medidas-fonte.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/components/agenda/sheet/medidas-fonte.test.ts
import { describe, it, expect } from "vitest";
import { resolverFonteMedidas } from "./medidas-fonte";

describe("resolverFonteMedidas", () => {
  it("prefere o banco quando há registros estruturados", () => {
    expect(resolverFonteMedidas({ qtdBanco: 2, qtdAnalysis: 5 })).toBe("banco");
  });

  it("cai para analysisData quando o banco está vazio mas a IA extraiu", () => {
    expect(resolverFonteMedidas({ qtdBanco: 0, qtdAnalysis: 3 })).toBe("analysisData");
  });

  it("nenhuma quando ambos vazios", () => {
    expect(resolverFonteMedidas({ qtdBanco: 0, qtdAnalysis: 0 })).toBe("nenhuma");
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/components/agenda/sheet/medidas-fonte.test.ts`
Expected: FAIL — módulo inexistente.

- [ ] **Step 3: Implementar**

```ts
// src/components/agenda/sheet/medidas-fonte.ts

export type FonteMedidas = "banco" | "analysisData" | "nenhuma";

/** Banco (medidas_mpu) é autoritativo; analysisData é fallback informacional. */
export function resolverFonteMedidas(args: { qtdBanco: number; qtdAnalysis: number }): FonteMedidas {
  if (args.qtdBanco > 0) return "banco";
  if (args.qtdAnalysis > 0) return "analysisData";
  return "nenhuma";
}
```

- [ ] **Step 4: Rodar e confirmar PASS**

Run: `npx vitest run src/components/agenda/sheet/medidas-fonte.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/medidas-fonte.ts src/components/agenda/sheet/medidas-fonte.test.ts
git commit -m "feat(agenda): resolvedor de fonte das medidas (banco → analysisData)"
```

---

## Task 4: Hook `useMedidasVigentes` (extraído do painel)

Necessário para o sheet saber a contagem do banco e decidir o fallback (Task 6).

**Files:**
- Create: `src/components/mpu/use-medidas-vigentes.ts`
- Modify: `src/components/mpu/medidas-vigentes-panel.tsx`

- [ ] **Step 1: Ler o painel e identificar a query**

Run: `sed -n '1,80p' src/components/mpu/medidas-vigentes-panel.tsx` (ou abrir no editor)
Localize a chamada `trpc.mpu.listMedidas.useQuery({ ... })` (ou equivalente) e os parâmetros/`enabled` que ela usa a partir de `processoId`.

- [ ] **Step 2: Criar o hook reproduzindo exatamente a query do painel**

```ts
// src/components/mpu/use-medidas-vigentes.ts
import { trpc } from "@/lib/trpc/client"; // ajustar o caminho ao import já usado no painel

/**
 * Fonte única da consulta de medidas vigentes (medidas_mpu) do processo.
 * Mantém os MESMOS parâmetros/enabled da query original do MedidasVigentesPanel.
 */
export function useMedidasVigentes(processoId: number | null | undefined) {
  const query = trpc.mpu.listMedidas.useQuery(
    { processoId: processoId ?? 0 },          // espelhar o input exato do painel
    { enabled: typeof processoId === "number", retry: false },
  );
  const medidas = query.data ?? [];
  return { medidas, qtd: medidas.length, isLoading: query.isLoading };
}
```

> Se o input do painel for `processoVvdId` (e não `processoId`), ajuste a assinatura e o nome do parâmetro do hook para refletir o painel — o objetivo é reusar a MESMA query, não inventar outra.

- [ ] **Step 3: Refatorar o painel para usar o hook**

Em `medidas-vigentes-panel.tsx`, substituir a chamada direta da query por:
```ts
const { medidas, isLoading } = useMedidasVigentes(processoId);
```
e remover a declaração antiga da query, mantendo o resto do componente igual.

- [ ] **Step 4: Verificar typecheck e teste existente do card**

Run: `npm run typecheck && npx vitest run src/components/mpu/__tests__/medida-mpu-card.test.ts`
Expected: sem erros de tipo; teste do card PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/mpu/use-medidas-vigentes.ts src/components/mpu/medidas-vigentes-panel.tsx
git commit -m "refactor(mpu): extrai useMedidasVigentes para reuso no sheet"
```

---

## Task 5: Componentes das seções novas + prop de intimação no Roteiro

**Files:**
- Create: `src/components/agenda/sheet/secoes/MotivoDesignacaoSecao.tsx`
- Create: `src/components/agenda/sheet/secoes/RequerimentoDefesaSecao.tsx`
- Create: `src/components/agenda/sheet/secoes/ResumoGeralSecao.tsx`
- Create: `src/components/agenda/sheet/secoes/IntimacaoSecao.tsx`
- Create: `src/components/agenda/sheet/secoes/MedidasVigentesSecao.tsx`
- Modify: `src/components/agenda/sheet/dossie-v2-block.tsx`
- Test: `src/components/agenda/sheet/secoes/__tests__/secoes-novas.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

```tsx
// src/components/agenda/sheet/secoes/__tests__/secoes-novas.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MotivoDesignacaoSecao } from "../MotivoDesignacaoSecao";
import { DossieV2Block } from "../../dossie-v2-block";

describe("MotivoDesignacaoSecao", () => {
  it("mostra o chip da origem e o detalhe", () => {
    render(<MotivoDesignacaoSecao motivo={{ origem: "pedido_revogacao_ofendida", detalhe: "ela quer revogar" }} />);
    expect(screen.getByText("Pedido de revogação da ofendida")).toBeInTheDocument();
    expect(screen.getByText("ela quer revogar")).toBeInTheDocument();
  });

  it("string legada (origem null) mostra só o detalhe, sem chip", () => {
    render(<MotivoDesignacaoSecao motivo={{ origem: null, detalhe: "juiz remarcou" }} />);
    expect(screen.getByText("juiz remarcou")).toBeInTheDocument();
    expect(screen.queryByText("Reavaliação pelo juízo")).not.toBeInTheDocument();
  });
});

describe("DossieV2Block ocultarIntimacao", () => {
  it("não renderiza a intimação quando ocultarIntimacao", () => {
    render(<DossieV2Block dossie={{ intimacao: "ofendida em situação de rua" } as any} ocultarIntimacao />);
    expect(screen.queryByText("ofendida em situação de rua")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx vitest run src/components/agenda/sheet/secoes/__tests__/secoes-novas.test.tsx`
Expected: FAIL — componentes/props inexistentes.

- [ ] **Step 3: Implementar `MotivoDesignacaoSecao`**

```tsx
// src/components/agenda/sheet/secoes/MotivoDesignacaoSecao.tsx
import type { MotivoDesignacao } from "../motivo-designacao";
import { LABEL_ORIGEM } from "../motivo-designacao";

export function MotivoDesignacaoSecao({ motivo }: { motivo: MotivoDesignacao }) {
  return (
    <div className="space-y-2">
      {motivo.origem && (
        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
          {LABEL_ORIGEM[motivo.origem]}
        </span>
      )}
      {motivo.detalhe && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
          {motivo.detalhe}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implementar `RequerimentoDefesaSecao`**

```tsx
// src/components/agenda/sheet/secoes/RequerimentoDefesaSecao.tsx
export function RequerimentoDefesaSecao({ texto, vinculadoAoMotivo }: { texto: string; vinculadoAoMotivo?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{texto}</p>
      {vinculadoAoMotivo && (
        <p className="text-[10px] text-blue-500">↔ vinculado ao Motivo da designação (origem: requerimento da defesa)</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implementar `ResumoGeralSecao`**

```tsx
// src/components/agenda/sheet/secoes/ResumoGeralSecao.tsx
export function ResumoGeralSecao({ texto }: { texto: string }) {
  return (
    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{texto}</p>
  );
}
```

- [ ] **Step 6: Implementar `IntimacaoSecao`**

```tsx
// src/components/agenda/sheet/secoes/IntimacaoSecao.tsx
export function IntimacaoSecao({ texto }: { texto: string }) {
  return (
    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{texto}</p>
  );
}
```

- [ ] **Step 7: Implementar `MedidasVigentesSecao` (unificada com fallback)**

```tsx
// src/components/agenda/sheet/secoes/MedidasVigentesSecao.tsx
import { MedidasVigentesPanel } from "@/components/mpu/medidas-vigentes-panel";
import { resolverFonteMedidas } from "../medidas-fonte";

export function MedidasVigentesSecao({
  processoId,
  qtdBanco,
  medidasAnalysis,
}: {
  processoId: number | null;
  qtdBanco: number;
  medidasAnalysis: any[];
}) {
  const fonte = resolverFonteMedidas({ qtdBanco, qtdAnalysis: medidasAnalysis.length });

  if (fonte === "banco" && typeof processoId === "number") {
    return <MedidasVigentesPanel processoId={processoId} readOnly />;
  }

  if (fonte === "analysisData") {
    return (
      <div className="space-y-2">
        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          extraído dos autos — conferir no PJe
        </span>
        <ul className="space-y-1 list-disc pl-4">
          {medidasAnalysis.map((m: any, i: number) => (
            <li key={i} className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {typeof m === "string" ? m : (m.medida ?? m.texto ?? JSON.stringify(m))}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // fonte === "nenhuma": ainda assim renderiza o painel quando há processo,
  // pois ele trata o próprio estado de vazio/carregando de forma consistente.
  if (typeof processoId === "number") {
    return <MedidasVigentesPanel processoId={processoId} readOnly />;
  }
  return null;
}
```

- [ ] **Step 8: Adicionar `ocultarIntimacao` ao `DossieV2Block`**

Em `src/components/agenda/sheet/dossie-v2-block.tsx`, alterar a assinatura e o bloco de intimação:

Assinatura (linha 17):
```tsx
export function DossieV2Block({ dossie, ocultarIntimacao }: { dossie: DossieV2; ocultarIntimacao?: boolean }) {
```

Bloco de intimação (linhas 60-65) — envolver na condição:
```tsx
      {!ocultarIntimacao && dossie.intimacao && (
        <div className="space-y-1">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Intimação</h4>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{dossie.intimacao}</p>
        </div>
      )}
```

- [ ] **Step 9: Rodar os testes e o typecheck**

Run: `npx vitest run src/components/agenda/sheet/secoes/__tests__/secoes-novas.test.tsx && npm run typecheck`
Expected: testes PASS; typecheck OK.

- [ ] **Step 10: Commit**

```bash
git add src/components/agenda/sheet/secoes src/components/agenda/sheet/dossie-v2-block.tsx
git commit -m "feat(agenda): componentes das seções novas + ocultarIntimacao no Roteiro"
```

---

## Task 6: Renderizar o sheet pelo manifesto (ToC + corpo numa fonte só)

Esta é a integração. O objetivo: o corpo e o ToC passam a iterar `resolverManifesto(config)`, usando um mapa `id → { label, node, temDado }`. Preservar a JSX existente de cada seção (mover para o mapa, sem reescrever a lógica interna), remover o `tocSections` fixo e a seção `medidas-deferidas`.

**Files:**
- Modify: `src/components/agenda/event-detail-sheet.tsx`

- [ ] **Step 1: Importar os novos módulos/componentes**

No topo de `event-detail-sheet.tsx`, adicionar (e garantir que `Fragment`/`ReactNode` de `react` e `SUBTIPO_CONFIG` de `registro-audiencia/subtipo-audiencia` estejam importados — vários já podem estar):
```ts
import { Fragment, type ReactNode } from "react";
import { SUBTIPO_CONFIG } from "@/components/agenda/registro-audiencia/subtipo-audiencia";
import { resolverManifesto, type SecaoId } from "@/components/agenda/sheet/secoes-manifest";
import { normalizarMotivo } from "@/components/agenda/sheet/motivo-designacao";
import { useMedidasVigentes } from "@/components/mpu/use-medidas-vigentes";
import { MotivoDesignacaoSecao } from "@/components/agenda/sheet/secoes/MotivoDesignacaoSecao";
import { RequerimentoDefesaSecao } from "@/components/agenda/sheet/secoes/RequerimentoDefesaSecao";
import { ResumoGeralSecao } from "@/components/agenda/sheet/secoes/ResumoGeralSecao";
import { IntimacaoSecao } from "@/components/agenda/sheet/secoes/IntimacaoSecao";
import { MedidasVigentesSecao } from "@/components/agenda/sheet/secoes/MedidasVigentesSecao";
```

- [ ] **Step 2: Derivar os campos novos**

Junto aos demais `extract*` (perto da linha 380-385), adicionar:
```ts
const motivo = normalizarMotivo((ad as any)?.motivo_designacao);
const resumoAudiencia = extractString(ad, "resumo_audiencia");
const requerimentoDefesa = extractString(ad, "requerimento_defesa");
const intimacaoTexto = dossieV2?.intimacao ?? null;
const { qtd: qtdMedidasBanco } = useMedidasVigentes(typeof processoId === "number" ? processoId : null);
const medidasAnalysis = medidasProtetivas.length ? medidasProtetivas : medidasVigentesArr;
```

> Observação: `motivoDesignacao` (string) ainda é usado por `tocSections`; ele será removido no Step 5. Use `motivo` (objeto normalizado) daqui em diante.

- [ ] **Step 3: Montar o mapa de seções**

Substituir o `tocSections` fixo (linhas 460-483) por um mapa de seções. Cada entrada tem `label`, `temDado` e `node`. Mover a JSX de CADA `<CollapsibleSection>` existente (linhas ~775-1019 e além) para o `node` correspondente, **preservando a JSX interna intacta** (mesmas props, mesmo conteúdo), apenas tirando o wrapper condicional externo `{cond && (...)}` — a condição vira `temDado`.

```ts
type SecaoEntry = { label: string; temDado: boolean; count?: number; node: ReactNode };

const secoesMap: Partial<Record<SecaoId, SecaoEntry>> = {
  "resumo": { label: "Resumo Executivo", temDado: !!resumoExecutivo, node: /* <CollapsibleSection id="resumo">…</> existente */ },
  "resumo-audiencia": { label: "Resumo geral", temDado: !!resumoAudiencia, node: (
    <CollapsibleSection id="resumo-audiencia" label="Resumo geral" defaultOpen>
      <ResumoGeralSecao texto={resumoAudiencia!} />
    </CollapsibleSection>
  ) },
  "motivo-designacao": { label: "Motivo da designação", temDado: !!motivo, node: (
    <CollapsibleSection id="motivo-designacao" label="Motivo da designação" defaultOpen>
      <MotivoDesignacaoSecao motivo={motivo!} />
    </CollapsibleSection>
  ) },
  "requerimento-defesa": { label: "Requerimento da defesa", temDado: !!requerimentoDefesa, node: (
    <CollapsibleSection id="requerimento-defesa" label="Requerimento da defesa" defaultOpen>
      <RequerimentoDefesaSecao texto={requerimentoDefesa!} vinculadoAoMotivo={motivo?.origem === "requerimento_defesa"} />
    </CollapsibleSection>
  ) },
  "intimacao": { label: "Intimação", temDado: !!intimacaoTexto, node: (
    <CollapsibleSection id="intimacao" label="Intimação" defaultOpen>
      <IntimacaoSecao texto={intimacaoTexto!} />
    </CollapsibleSection>
  ) },
  "dossie": { label: "Roteiro da defesa", temDado: !!dossieV2, node: (
    <CollapsibleSection id="dossie" label="Roteiro da defesa" defaultOpen={false}>
      <DossieV2Block dossie={dossieV2!} ocultarIntimacao={manifesto.includes("intimacao")} />
    </CollapsibleSection>
  ) },
  "medidas": { label: "Medidas protetivas vigentes", temDado: typeof processoId === "number" || medidasAnalysis.length > 0, node: (
    <CollapsibleSection id="medidas" label="Medidas protetivas vigentes" defaultOpen>
      <MedidasVigentesSecao processoId={typeof processoId === "number" ? processoId : null} qtdBanco={qtdMedidasBanco} medidasAnalysis={medidasAnalysis} />
    </CollapsibleSection>
  ) },
  "preventiva": { label: "Prisão preventiva", temDado: typeof processoId === "number", node: /* bloco existente id="preventiva" */ },
  "cautelares": { label: "Cautelares", temDado: typeof processoId === "number", node: /* bloco existente id="cautelares" */ },
  "anotacoes-rapidas": { label: "Anotações rápidas", temDado: true, count: anotacoesRapidas.length, node: /* bloco existente id="anotacoes-rapidas" */ },
  "analise-ia": { label: "Análise IA", temDado: !imputacao && !fatos && laudos.length === 0 && contradicoes.length === 0, node: /* bloco existente id="analise-ia" */ },
  "imputacao": { label: "Imputação", temDado: true, node: /* bloco existente id="imputacao" */ },
  "fatos": { label: "Fatos (Denúncia)", temDado: true, node: /* bloco existente id="fatos" */ },
  "relato-vitima": { label: "Relato da ofendida", temDado: !!relatoVitima, node: /* bloco existente id="relato-vitima" */ },
  "sintese": { label: "Síntese Processual", temDado: cronologia.length > 0, node: /* bloco existente id="sintese" */ },
  "versao": { label: "Relato do assistido", temDado: !!(versaoDelegacia || versaoJuizo || relatoAtendimento), node: /* bloco existente id="versao" */ },
  "depoentes": { label: "Depoentes", temDado: (depoentesDetalhe.length || depoentes.length) > 0, count: depoentesDetalhe.length || depoentes.length, node: /* bloco existente */ },
  "depoimentos": { label: "Depoimentos", temDado: depoentes.length > 0, count: depoentes.length, node: /* bloco existente */ },
  "contradicoes": { label: "Contradições", temDado: contradicoes.length > 0, node: /* bloco existente */ },
  "laudos": { label: "Laudos", temDado: laudos.length > 0, node: /* bloco existente */ },
  "investigacao": { label: "Investigação", temDado: diligencias.length > 0, node: /* bloco existente */ },
  "pendencias": { label: "Pendências", temDado: pendencias.length > 0, node: /* bloco existente */ },
  "teses": { label: "Teses", temDado: teses.length > 0, node: /* bloco existente */ },
  "documentos": { label: "Docs", temDado: true, node: /* bloco existente id="documentos" */ },
  "midia": { label: "Mídia", temDado: true, node: /* bloco existente id="midia" */ },
};
```

> A seção antiga `medidas-deferidas` (linhas 972-1001) é **removida** — seu conteúdo foi absorvido por `MedidasVigentesSecao` (fallback analysisData). Não criar entrada para ela.

- [ ] **Step 4: Resolver o manifesto e a lista de seções visíveis**

```ts
const manifesto = resolverManifesto(SUBTIPO_CONFIG[subtipo]); // 'subtipo' já é derivado no componente
const secoesVisiveis = manifesto.filter((id) => secoesMap[id]?.temDado);
const tocSections: ToCSection[] = secoesVisiveis.map((id) => ({
  id,
  label: secoesMap[id]!.label,
  ...(secoesMap[id]!.count !== undefined ? { count: secoesMap[id]!.count } : {}),
}));
```

> `manifesto` precisa estar definido ANTES do `secoesMap` (o nó do Roteiro lê `manifesto.includes("intimacao")`). Declarar `manifesto` no topo do corpo do componente; `secoesMap` logo depois; `secoesVisiveis`/`tocSections` em seguida.

- [ ] **Step 5: Renderizar o corpo a partir de `secoesVisiveis`**

No JSX do corpo (onde hoje ficam os blocos `{!isLoading && (...)}`), substituir a sequência fixa de `<CollapsibleSection>` por:
```tsx
{!isLoading && secoesVisiveis.map((id) => (
  <Fragment key={id}>{secoesMap[id]!.node}</Fragment>
))}
```
Manter fora do loop o que não é seção (ex.: `SubtipoBanner`, spinner de loading). Garantir o import de `Fragment` (`import { Fragment } from "react"`).

- [ ] **Step 6: Remover restos do esquema antigo**

- Apagar o `useMemo` de `tocSections` antigo (linhas 460-483) — já substituído.
- Remover a variável `motivoDesignacao` (string) se não houver mais uso, mantendo `motivo`.
- Conferir que `medidasProtetivas`/`medidasVigentesArr` seguem usados (via `medidasAnalysis`).

- [ ] **Step 7: Typecheck + testes + build do componente**

Run: `npm run typecheck && npx vitest run`
Expected: sem erros de tipo; toda a suíte Vitest existente PASS.

- [ ] **Step 8: Verificação visual (Justificação + um rito não-Justificação)**

Subir o dev server e abrir o sheet de uma audiência de Justificação e de uma AIJ:
Run: `npm run dev` (e abrir `http://localhost:3000` na agenda)
Conferir:
- Justificação: ordem Motivo → Requerimento → Intimação → Resumo geral → Medidas → Relato ofendida → Relato assistido → Roteiro (sem intimação repetida) → Depoentes. Sem Imputação/Fatos/Síntese/Contradições/Laudos/Teses. Medidas no topo do mérito (banco, ou fallback com selo).
- AIJ/Instrução: corpo idêntico ao de antes (ordem default), incluindo Imputação/Fatos/Teses.
- Evento sem `analysisData`: não quebra.

- [ ] **Step 9: Commit**

```bash
git add src/components/agenda/event-detail-sheet.tsx
git commit -m "feat(agenda): EventDetailSheet renderiza ToC e corpo pelo manifesto por subtipo"
```

---

## Task 7: Pipeline de análise emite os campos novos

A skill/prompt que gera o `analysisData` do dossiê VVD passa a emitir `resumo_audiencia`, `requerimento_defesa` e `motivo_designacao` tipado. O sheet já tolera ausência, então isto é incremental e independente.

**Files:**
- Modify: skill `analise-vvd` (prompt/esquema do dossiê VVD) — localizar a definição da skill em `/Users/rodrigorochameire/Projetos/Defender/.claude/` ou na pasta canônica de skills do Drive (`Skills - harmonizacao`).

- [ ] **Step 1: Localizar o esquema de saída do dossiê**

Run: `grep -rn "motivo_designacao\|relato_vitima\|resumo_executivo" .claude src 2>/dev/null | head -30`
Identificar onde o esquema/prompt do dossiê VVD define os campos de `analysisData`.

- [ ] **Step 2: Acrescentar os campos novos ao esquema/prompt**

Adicionar à especificação de saída (mantendo o estilo do prompt existente):
- `resumo_audiencia` (string): 3–4 linhas orientadas ao TIPO de audiência. Na Justificação: quem é quem, medidas em vigor e desde quando, status do risco/relação, direção da defesa (manter/revisar/revogar).
- `requerimento_defesa` (string): a pretensão de mérito da defesa no ato (quando houver).
- `motivo_designacao` (objeto): `{ origem, detalhe }` onde `origem ∈ {requerimento_defesa, pedido_revogacao_ofendida, alegacao_descumprimento, reavaliacao_juizo, caso_novo, outro}` e `detalhe` é o texto concreto do gatilho. (Strings antigas seguem aceitas pelo normalizador.)

- [ ] **Step 3: Sincronizar a cópia canônica da skill**

Conforme a regra do projeto, editar a skill na pasta canônica do Drive (`Skills - harmonizacao`) e sincronizar as cópias. Usar a skill `evoluir-skill`/`evolucao-skills` para registrar a evolução.

- [ ] **Step 4: Validar a emissão num caso real**

Reprocessar um caso de Justificação e conferir no sheet que o Resumo geral, o Requerimento da defesa e o chip de origem do Motivo aparecem preenchidos.

- [ ] **Step 5: Commit (se houver arquivos versionados da skill no repo)**

```bash
git add -A && git commit -m "feat(analise-vvd): emite resumo_audiencia, requerimento_defesa e motivo_designacao tipado"
```

---

## Notas de verificação final

- `npm run typecheck` limpo.
- `npx vitest run` — toda a suíte verde (novos módulos + suíte existente).
- Paridade visual confirmada num rito não-Justificação (default inalterado).
- Justificação na ordem aprovada, sem seções de ação penal, medidas unificadas no topo do mérito, intimação como seção própria.
