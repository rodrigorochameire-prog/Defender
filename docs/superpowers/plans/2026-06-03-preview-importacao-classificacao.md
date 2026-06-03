# Preview de Importação PJe — Classificação Ágil — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir classificar intimações inteiramente na etapa "revisar" do modal de importação PJe: dropdown que scrolla dentro do modal, ato pré-preenchido por sugestão, ações em lote por seleção, busca visível + grupo "Frequentes" no dropdown, e avanço por teclado linha a linha.

**Architecture:** Evolução cirúrgica dos componentes existentes. A lógica nova de dados vai para funções puras em `src/lib/` (testáveis com vitest); os componentes só orquestram. O fix de scroll é no `InlineDropdown` (beneficia todos os usos do app).

**Tech Stack:** Next.js 15, React, Tailwind, vitest + @testing-library/react (happy-dom).

**Worktree:** `/Users/rodrigorochameire/Projetos/Defender-preview-import`, branch `feat/preview-import-classificacao` (base `origin/main`). Todos os comandos abaixo rodam nesse diretório.

**Spec:** `docs/superpowers/specs/2026-06-03-preview-importacao-classificacao-design.md`

**Contexto essencial (leia antes de começar):**

- `src/components/shared/inline-dropdown.tsx` — dropdown custom com portal em `document.body`. O Radix Dialog do modal de importação usa `react-remove-scroll`, que cancela wheel/touch fora do conteúdo do dialog → portal não scrolla (o clique já foi consertado no PR #68 com `pointerEvents:auto` + `stopPropagation`).
- `src/components/demandas-premium/pje-import-modal.tsx` — modal 4 etapas (`configurar→colar→revisar→resultado`). `handleParsear` (~linha 383) monta as `PjeReviewRow` com **ato sempre vazio** de propósito: a detecção de audiência via `suggestAtoWithText(texto)` usa o texto colado INTEIRO (todas as intimações misturadas) e é imprecisa. O pré-preenchimento usará `suggestAto` (só campos da linha), que é confiável.
- `src/components/demandas-premium/pje-review-table.tsx` — tabela de revisão. JÁ TEM bulk "Ato p/ todos" / "Status p/ todos" (aplica a TODAS as não-excluídas) — vamos evoluir para seleção.
- `src/config/atos-por-atribuicao.ts` — `ATOS_POR_ATRIBUICAO`, `categorizarAto`, `getAtoOptionsAgrupados` (grupos Defesas/Recursos/Liberdade/Ciências/Diligências).
- Testes: `npm run test` (vitest). Padrão de teste de componente: `src/components/shared/__tests__/inline-dropdown.test.tsx` (happy-dom + RTL).

---

### Task 1: Fix do scroll no InlineDropdown

O scroll-lock do Radix Dialog cancela o wheel nativo em elementos fora do conteúdo do dialog. Solução: listener `wheel` nativo **non-passive** no portal que faz `preventDefault` + scroll programático (`scrollTop += deltaY`). Funciona nos dois mundos: dentro do modal (lock já cancelou o nativo, o programático passa) e fora (nós cancelamos o nativo, evitando scroll duplo). Bônus: `scrollIntoView` no item destacado (navegação ↑↓ hoje some abaixo da dobra).

**Files:**
- Modify: `src/components/shared/inline-dropdown.tsx`
- Test: `src/components/shared/__tests__/inline-dropdown.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `src/components/shared/__tests__/inline-dropdown.test.tsx`:

```tsx
describe("InlineDropdown — Scroll dentro de modal (scroll-lock do Radix)", () => {
  const manyOptions = Array.from({ length: 40 }, (_, i) => ({
    value: `v${i}`,
    label: `Opção ${i}`,
  }));

  it("consome o wheel no portal (preventDefault) para scrollar programaticamente", () => {
    render(
      <InlineDropdown
        value="v0"
        displayValue={<span>Trigger</span>}
        options={manyOptions}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Trigger"));

    const portal = document.querySelector(
      '[data-inline-dropdown-portal="true"]',
    ) as HTMLElement;
    expect(portal).not.toBeNull();

    // fireEvent retorna false quando preventDefault foi chamado pelo handler
    expect(fireEvent.wheel(portal, { deltaY: 40, cancelable: true })).toBe(false);
  });

  it("acompanha o item destacado com scrollIntoView na navegação por teclado", () => {
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    render(
      <InlineDropdown
        value="v0"
        displayValue={<span>Trigger</span>}
        options={manyOptions}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Trigger"));
    fireEvent.keyDown(document, { key: "ArrowDown" });

    expect(spy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm run test -- src/components/shared/__tests__/inline-dropdown.test.tsx`
Expected: os 2 testes novos FALHAM (wheel não é prevented; scrollIntoView não chamado). Os 2 antigos passam.

- [ ] **Step 3: Implementar no inline-dropdown.tsx**

3a. Adicionar ref do portal junto ao `ref` existente (linha ~49):

```tsx
  const ref = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
```

3b. Adicionar dois effects após o effect de click-outside (depois da linha ~102):

```tsx
  // O scroll-lock do Radix Dialog (react-remove-scroll) cancela wheel/touch em
  // elementos fora do conteúdo do dialog — e este portal mora em document.body.
  // preventDefault + scroll programático funciona nos dois mundos: dentro do
  // modal (o lock já cancelou o scroll nativo) e fora (nós cancelamos, evitando
  // scroll duplicado). Listener nativo non-passive porque o onWheel do React é
  // registrado como passive e não permite preventDefault.
  useEffect(() => {
    if (!isOpen) return;
    const el = portalRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // deltaMode 1 = linhas (Firefox); converte para px aproximado
      const delta = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
      el.scrollTop += delta;
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [isOpen, position]);

  // Mantém o item destacado visível durante navegação ↑↓ / type-ahead.
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    portalRef.current
      ?.querySelector('[data-highlighted="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [isOpen, highlightedIndex]);
```

3c. No div do portal (linha ~235), adicionar o ref:

```tsx
        <div
          ref={portalRef}
          data-inline-dropdown-portal="true"
```

3d. No botão de opção (linha ~310), adicionar o data-attribute logo após `key`:

```tsx
                    <button
                      key={opt.value}
                      data-highlighted={isHighlighted ? "true" : undefined}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm run test -- src/components/shared/__tests__/inline-dropdown.test.tsx`
Expected: 4 PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/inline-dropdown.tsx src/components/shared/__tests__/inline-dropdown.test.tsx
git commit -m "fix(inline-dropdown): scroll do portal dentro de Radix Dialog + scrollIntoView no highlight"
```

---

### Task 2: Barra de busca visível no dropdown

O type-ahead existe mas é invisível até digitar — ninguém descobre. Tornar a barra sempre visível com placeholder. **Não usar `<input>` real**: o focus-trap do Radix Dialog puxa o foco de volta para o conteúdo do dialog, e o portal está fora dele — um input lá seria infocável. A barra é presentacional, dirigida pelo listener global de teclado que já existe.

**Files:**
- Modify: `src/components/shared/inline-dropdown.tsx`
- Modify: `docs/superpowers/specs/2026-06-03-preview-importacao-classificacao-design.md` (registrar a decisão)
- Test: `src/components/shared/__tests__/inline-dropdown.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

```tsx
describe("InlineDropdown — Barra de busca visível", () => {
  it("mostra placeholder ao abrir e filtra ao digitar", () => {
    render(
      <InlineDropdown
        value="A"
        displayValue={<span>Trigger</span>}
        options={[
          { value: "A", label: "Alpha" },
          { value: "B", label: "Beta" },
        ]}
        onChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("Trigger"));

    expect(screen.getByText("Digite para filtrar…")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "b" });
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.queryByText("Digite para filtrar…")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test -- src/components/shared/__tests__/inline-dropdown.test.tsx`
Expected: FAIL ("Digite para filtrar…" não encontrado)

- [ ] **Step 3: Implementar**

Em `inline-dropdown.tsx`, substituir o bloco do type-ahead indicator (linhas ~255-261):

```tsx
          {/* Type-ahead indicator */}
          {filterQuery && (
            <div className="px-3 py-1.5 text-[10px] text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 sticky top-0 bg-white dark:bg-neutral-900 z-10">
              <Search className="w-3 h-3" />
              <span className="font-medium text-neutral-600 dark:text-neutral-300">{filterQuery}</span>
            </div>
          )}
```

por:

```tsx
          {/* Barra de filtro — sempre visível para tornar o type-ahead
              descobrível. Não é um <input> real: o focus-trap do Radix Dialog
              puxaria o foco de volta para o conteúdo do dialog (o portal está
              fora dele). A digitação é capturada no listener global de teclado
              e refletida aqui. */}
          <div className="px-3 py-1.5 text-[10px] text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 sticky top-0 bg-white dark:bg-neutral-900 z-10">
            <Search className="w-3 h-3" />
            {filterQuery ? (
              <span className="font-medium text-neutral-600 dark:text-neutral-300">{filterQuery}</span>
            ) : (
              <span className="italic">Digite para filtrar…</span>
            )}
          </div>
```

- [ ] **Step 4: Rodar os testes**

Run: `npm run test -- src/components/shared/__tests__/inline-dropdown.test.tsx`
Expected: todos PASS

- [ ] **Step 5: Atualizar o spec**

No spec, seção "4. Dropdown de ato melhor", substituir a frase do campo de busca por:

```markdown
- **Barra de busca visível** no topo do painel — presentacional (mostra o
  type-ahead existente + placeholder "Digite para filtrar…"). Um `<input>` real
  brigaria com o focus-trap do Radix Dialog (portal fora do conteúdo do dialog).
```

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/inline-dropdown.tsx src/components/shared/__tests__/inline-dropdown.test.tsx docs/superpowers/specs/2026-06-03-preview-importacao-classificacao-design.md
git commit -m "feat(inline-dropdown): barra de busca sempre visível (type-ahead descobrível)"
```

---

### Task 3: Grupo "Frequentes" + opções agrupadas no preview

**Files:**
- Modify: `src/config/atos-por-atribuicao.ts`
- Modify: `src/components/demandas-premium/pje-review-table.tsx:160-173` (atoOptions)
- Test: Create `src/config/__tests__/atos-por-atribuicao.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/config/__tests__/atos-por-atribuicao.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getAtoOptionsPreview, ATOS_POR_ATRIBUICAO } from "../atos-por-atribuicao";

describe("getAtoOptionsPreview", () => {
  it("frequentes vêm primeiro e são todos válidos para a atribuição", () => {
    const opts = getAtoOptionsPreview("Violência Doméstica");
    const validos = new Set(ATOS_POR_ATRIBUICAO["Violência Doméstica"]);
    const frequentes = opts.filter((o) => o.group === "Frequentes");

    expect(frequentes.length).toBeGreaterThan(0);
    // Bloco contíguo no início
    expect(opts.slice(0, frequentes.length).every((o) => o.group === "Frequentes")).toBe(true);
    frequentes.forEach((o) => expect(validos.has(o.value)).toBe(true));
  });

  it("contém todos os atos da atribuição (além dos frequentes)", () => {
    const opts = getAtoOptionsPreview("Tribunal do Júri");
    const values = new Set(opts.map((o) => o.value));
    ATOS_POR_ATRIBUICAO["Tribunal do Júri"].forEach((ato) => {
      expect(values.has(ato)).toBe(true);
    });
  });

  it("atribuição desconhecida cai no fallback de todos os atos, sem Frequentes", () => {
    const opts = getAtoOptionsPreview("Atribuição Inexistente");
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.some((o) => o.group === "Frequentes")).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm run test -- src/config/__tests__/atos-por-atribuicao.test.ts`
Expected: FAIL (`getAtoOptionsPreview` não exportado)

- [ ] **Step 3: Implementar em atos-por-atribuicao.ts**

Adicionar ao final do arquivo (após `getAtoOptionsAgrupados`):

```ts
// ==========================================
// FREQUENTES (preview de importação)
// ==========================================
// Atos mais usados no dia a dia de cada atribuição — aparecem primeiro no
// dropdown do preview de importação (grupo "Frequentes"). Lista curada; nomes
// que não existirem em ATOS_POR_ATRIBUICAO são filtrados silenciosamente.
// Os itens também seguem aparecendo no seu grupo temático.
export const ATOS_FREQUENTES_POR_ATRIBUICAO: Record<string, string[]> = {
  "Tribunal do Júri": [
    "Resposta à Acusação",
    "Diligências do 422",
    "Alegações finais",
    "Memoriais",
    "Ciência designação de audiência",
    "Ciência de decisão",
    "Manifestação",
    "Ciência",
  ],
  "Violência Doméstica": [
    "Resposta à Acusação",
    "Modulação de MPU",
    "Manifestação sobre MPU",
    "Revogação de MPU",
    "Alegações finais",
    "Ciência designação de audiência",
    "Manifestação",
    "Ciência",
  ],
  "Execução Penal": [
    "Requerimento de progressão",
    "Manifestação",
    "Agravo em Execução",
    "Designação de justificação",
    "Designação admonitória",
    "Transferência de unidade",
    "Indulto",
    "Ciência",
  ],
  "Substituição Criminal": [
    "Resposta à Acusação",
    "Alegações finais",
    "Memoriais",
    "Apelação",
    "Revogação da prisão",
    "Relaxamento da prisão",
    "Manifestação",
    "Ciência",
  ],
  "Curadoria": [
    "Manifestação",
    "Contestação",
    "Cumprir despacho",
    "Petição intermediária",
    "Ciência",
  ],
  "Criminal Geral": [
    "Resposta à Acusação",
    "Alegações finais",
    "Memoriais",
    "Apelação",
    "Relaxamento da prisão",
    "Revogação da prisão",
    "Manifestação",
    "Ciência",
  ],
};

/**
 * Opções de ato para o preview de importação: grupo "Frequentes" primeiro,
 * depois todos os atos da atribuição agrupados por categoria. Atribuição sem
 * configuração cai no fallback de todos os atos (sem grupos).
 */
export function getAtoOptionsPreview(
  atribuicao: string,
): Array<{ value: string; label: string; group?: string }> {
  const agrupados = getAtoOptionsAgrupados(atribuicao);
  if (agrupados.length === 0) {
    return getTodosAtosUnicos().filter((a) => a.value !== "Todos");
  }
  const validos = new Set(agrupados.map((a) => a.value));
  const frequentes = (ATOS_FREQUENTES_POR_ATRIBUICAO[atribuicao] || [])
    .filter((ato) => validos.has(ato))
    .map((ato) => ({ value: ato, label: ato, group: "Frequentes" }));
  return [...frequentes, ...agrupados];
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm run test -- src/config/__tests__/atos-por-atribuicao.test.ts`
Expected: 3 PASS

- [ ] **Step 5: Usar no preview**

Em `pje-review-table.tsx`, substituir o `atoOptions` (linhas 160-173):

```tsx
  // Opções de ato baseadas na atribuição — grupo "Frequentes" primeiro,
  // depois categorias (Defesas/Recursos/Liberdade/Ciências/Diligências).
  const atoOptions = useMemo(() => {
    if (atribuicao) return getAtoOptionsPreview(atribuicao);
    return getTodosAtosUnicos().filter((a) => a.value !== "Todos");
  }, [atribuicao]);
```

E ajustar o import na linha 7:

```tsx
import { getAtoOptionsPreview, getTodosAtosUnicos } from "@/config/atos-por-atribuicao";
```

Nota: o tipo de `atoOptions` passa a ter `group?` — a prop `options` do `InlineDropdown` já aceita `group` (renderiza headers de grupo no layout list). O tipo `Array<{ value: string; label: string }>` nas props de `PjeReviewRowProps` continua compatível (campo extra). Se o TS reclamar, ampliar para `Array<{ value: string; label: string; group?: string }>` em `PjeReviewRowProps.atoOptions`.

- [ ] **Step 6: Verificar tipos e testes**

Run: `npx tsc --noEmit && npm run test -- src/config src/components/shared`
Expected: sem erros de tipo, testes PASS

- [ ] **Step 7: Commit**

```bash
git add src/config/atos-por-atribuicao.ts src/config/__tests__/atos-por-atribuicao.test.ts src/components/demandas-premium/pje-review-table.tsx
git commit -m "feat(pje-import): grupo Frequentes + categorias no dropdown de ato do preview"
```

---

### Task 4: Pré-preencher ato sugerido (extrair `montarReviewRow`)

Hoje `handleParsear` monta as rows inline com `ato: ""` sempre. Extrair a montagem para função pura `montarReviewRow` e pré-preencher ato+prazo quando confiança alta/média. Usa `suggestAto` (campos da linha) e NÃO `suggestAtoWithText(texto)` — o texto colado contém TODAS as intimações misturadas e a detecção de audiência nele é imprecisa (motivo documentado no código atual).

**Files:**
- Create: `src/lib/pje-review-row.ts`
- Modify: `src/components/demandas-premium/pje-import-modal.tsx` (handleParsear, ~linhas 426-487)
- Modify: `src/components/demandas-premium/pje-review-table.tsx` (remover `calcularPrazoParaAto` local, importar do lib)
- Test: Create `src/lib/__tests__/pje-review-row.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/lib/__tests__/pje-review-row.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { montarReviewRow, calcularPrazoParaAto } from "../pje-review-row";

const base = {
  assistido: "João da Silva",
  numeroProcesso: "0000001-00.2026.8.05.0039",
  dataExpedicao: "01/06/2026",
  crime: "Ameaça",
  ordemOriginal: 0,
};

describe("montarReviewRow — pré-preenchimento de ato", () => {
  it("confiança alta preenche ato e prazo derivado", () => {
    const row = montarReviewRow(
      { ...base, tipoDocumento: "Intimação", tipoProcesso: "APOrd" },
      "Violência Doméstica",
      0,
    );
    expect(row.ato).toBe("Resposta à Acusação");
    expect(row.atoConfidence).toBe("high");
    expect(row.prazo).toBe(calcularPrazoParaAto("01/06/2026", "Resposta à Acusação"));
    expect(row.status).toBe("triagem");
    expect(row.prazoManual).toBe(false);
  });

  it("confiança média preenche ato", () => {
    const row = montarReviewRow(
      { ...base, tipoDocumento: "Intimação", tipoProcesso: "MPUMPCrim" },
      "Violência Doméstica",
      0,
    );
    expect(row.ato).toBe("Modulação de MPU");
    expect(row.atoConfidence).toBe("medium");
  });

  it("confiança baixa deixa ato e prazo vazios", () => {
    const row = montarReviewRow(
      { ...base, tipoDocumento: "Intimação", tipoProcesso: undefined },
      "Violência Doméstica",
      0,
    );
    expect(row.atoConfidence).toBe("low");
    expect(row.ato).toBe("");
    expect(row.prazo).toBe("");
  });

  it("ordemOriginal ausente cai no index", () => {
    const row = montarReviewRow(
      { ...base, ordemOriginal: undefined, tipoDocumento: "Sentença" },
      "Tribunal do Júri",
      7,
    );
    expect(row.ordemOriginal).toBe(7);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm run test -- src/lib/__tests__/pje-review-row.test.ts`
Expected: FAIL (módulo não existe)

- [ ] **Step 3: Criar src/lib/pje-review-row.ts**

```ts
/**
 * Montagem das linhas do preview de importação PJe (etapa "revisar").
 * Funções puras — testáveis sem React.
 */

import { suggestAto } from "@/lib/ato-suggestion";
import { calcularPrazoPorAto } from "@/lib/prazo-calculator";
import type { PjeReviewRow } from "@/components/demandas-premium/pje-review-table";

/**
 * Converte dataExpedicao ("DD/MM/YYYY", "DD/MM/YY HH:mm" ou "YYYY-MM-DD") +
 * ato em prazo BR via calcularPrazoPorAto. Retorna "" quando não calculável.
 * (Movida de pje-review-table.tsx para reutilizar na montagem e no lote.)
 */
export function calcularPrazoParaAto(dataExpedicao: string, ato: string): string {
  if (!dataExpedicao || !ato) return "";

  try {
    let date: Date;
    if (dataExpedicao.includes("-")) {
      // ISO format
      date = new Date(dataExpedicao + "T12:00:00");
    } else {
      const parts = dataExpedicao.split(/[\s/]/);
      const dia = parseInt(parts[0]);
      const mes = parseInt(parts[1]) - 1;
      const ano = parseInt(parts[2]);
      const fullYear = ano < 100 ? 2000 + ano : ano;
      date = new Date(fullYear, mes, dia);
    }

    if (isNaN(date.getTime())) return "";

    return calcularPrazoPorAto(date, ato) || "";
  } catch {
    return "";
  }
}

export interface IntimacaoParaReview {
  assistido: string;
  numeroProcesso: string;
  dataExpedicao: string;
  tipoDocumento?: string;
  tipoProcesso?: string;
  crime?: string;
  ordemOriginal?: number;
}

/**
 * Monta a linha do preview a partir da intimação parseada.
 *
 * Pré-preenche ato + prazo quando a sugestão regra-based tem confiança
 * alta/média; baixa fica vazia para classificação manual. Usa suggestAto
 * (campos da própria linha) e NÃO o texto colado completo — a detecção de
 * audiência no texto misturado de todas as intimações é imprecisa.
 */
export function montarReviewRow(
  intimacao: IntimacaoParaReview,
  atribuicao: string,
  index: number,
): PjeReviewRow {
  const suggestion = suggestAto(
    intimacao.tipoDocumento,
    intimacao.tipoProcesso,
    atribuicao,
  );
  const prefill = suggestion.confidence !== "low";
  const ato = prefill ? suggestion.ato : "";

  return {
    assistidoNome: intimacao.assistido,
    numeroProcesso: intimacao.numeroProcesso,
    dataExpedicao: intimacao.dataExpedicao,
    tipoDocumento: intimacao.tipoDocumento,
    tipoProcesso: intimacao.tipoProcesso,
    crime: intimacao.crime,
    ordemOriginal: intimacao.ordemOriginal ?? index,
    ato,
    atoConfidence: suggestion.confidence,
    status: "triagem", // Triagem — aguardando conferência/classificação
    prazo: ato ? calcularPrazoParaAto(intimacao.dataExpedicao, ato) : "",
    estadoPrisional: "Solto",
    excluded: false,
    prazoManual: false,
    providencias: "",
    assistidoMatch: { type: "new" }, // Será atualizado pelo matchQuery
    // Audiência: não preencher automaticamente (detecção por linha é do scan)
    audienciaData: undefined,
    audienciaHora: undefined,
    audienciaTipo: undefined,
    criarEventoAgenda: undefined,
  };
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm run test -- src/lib/__tests__/pje-review-row.test.ts`
Expected: 4 PASS. Se o teste de prazo falhar porque `calcularPrazoPorAto` não conhece "Resposta à Acusação", o assert por igualdade com `calcularPrazoParaAto(...)` continua válido (ambos retornam "") — verificar que é esse o caso e seguir.

- [ ] **Step 5: Usar no modal**

Em `pje-import-modal.tsx`, dentro de `handleParsear`, substituir TODO o bloco de montagem (de `const rows: PjeReviewRow[] = verificacao.novas.map((intimacao, index) => {` até o `});` correspondente, ~linhas 427-485) por:

```tsx
      const rows: PjeReviewRow[] = verificacao.novas.map((intimacao, index) =>
        montarReviewRow(intimacao, atribuicaoFinal, index)
      );
```

Adicionar o import:

```tsx
import { montarReviewRow } from "@/lib/pje-review-row";
```

Remover imports que ficarem órfãos — conferir antes com grep (o scan via Realtime também usa `calcularPrazoPorAto` e `suggestAtoWithText` em outros pontos do modal):

Run: `grep -n "suggestAtoWithText\|calcularPrazoPorAto\|suggestAto" src/components/demandas-premium/pje-import-modal.tsx`
Remover apenas os imports sem mais usos.

- [ ] **Step 6: DRY no pje-review-table.tsx**

Remover a função local `calcularPrazoParaAto` (linhas 105-133) e importar do lib:

```tsx
import { calcularPrazoParaAto } from "@/lib/pje-review-row";
```

Conferir se `calcularPrazoPorAto` (do prazo-calculator) ainda é usado no arquivo; se não, remover do import da linha 9 (mantendo `converterISOParaBR`).

- [ ] **Step 7: Tipos, testes e commit**

Run: `npx tsc --noEmit && npm run test`
Expected: sem erros, suite verde

```bash
git add src/lib/pje-review-row.ts src/lib/__tests__/pje-review-row.test.ts src/components/demandas-premium/pje-import-modal.tsx src/components/demandas-premium/pje-review-table.tsx
git commit -m "feat(pje-import): pré-preencher ato sugerido (alta/média) no preview via montarReviewRow"
```

---

### Task 5: Seleção de linhas + ações em lote

Evoluir o bulk existente (que aplica a TODAS as não-excluídas) para: com linhas selecionadas, aplica só às selecionadas; sem seleção, mantém o comportamento atual (todas as incluídas). Adicionar bulk de estado prisional e prazo. Lógica pura em `src/lib/pje-review-bulk.ts`.

**Files:**
- Create: `src/lib/pje-review-bulk.ts`
- Modify: `src/components/demandas-premium/pje-review-table.tsx`
- Test: Create `src/lib/__tests__/pje-review-bulk.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/lib/__tests__/pje-review-bulk.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { aplicarLote } from "../pje-review-bulk";
import type { PjeReviewRow } from "@/components/demandas-premium/pje-review-table";

function makeRow(overrides: Partial<PjeReviewRow> = {}): PjeReviewRow {
  return {
    assistidoNome: "Fulano",
    numeroProcesso: "0000001-00.2026.8.05.0039",
    dataExpedicao: "01/06/2026",
    ordemOriginal: 0,
    ato: "",
    atoConfidence: "low",
    status: "triagem",
    prazo: "",
    estadoPrisional: "Solto",
    excluded: false,
    prazoManual: false,
    providencias: "",
    assistidoMatch: { type: "new" },
    ...overrides,
  };
}

describe("aplicarLote", () => {
  const rows = [
    makeRow({ ordemOriginal: 0 }),
    makeRow({ ordemOriginal: 1 }),
    makeRow({ ordemOriginal: 2, excluded: true }),
    makeRow({ ordemOriginal: 3, prazoManual: true, prazo: "10/06/2026" }),
  ];

  it("com seleção, aplica só às selecionadas", () => {
    const out = aplicarLote(rows, new Set([1]), { status: "fazer" });
    expect(out[0].status).toBe("triagem");
    expect(out[1].status).toBe("fazer");
  });

  it("sem seleção, aplica a todas as não-excluídas", () => {
    const out = aplicarLote(rows, new Set(), { status: "fazer" });
    expect(out[0].status).toBe("fazer");
    expect(out[1].status).toBe("fazer");
    expect(out[3].status).toBe("fazer");
  });

  it("linha excluída nunca é tocada, mesmo selecionada", () => {
    const out = aplicarLote(rows, new Set([2]), { status: "fazer" });
    expect(out[2].status).toBe("triagem");
  });

  it("ato em lote recalcula prazo, exceto prazoManual", () => {
    const out = aplicarLote(rows, new Set(), { ato: "Resposta à Acusação" });
    expect(out[0].ato).toBe("Resposta à Acusação");
    expect(out[3].ato).toBe("Resposta à Acusação");
    expect(out[3].prazo).toBe("10/06/2026"); // prazoManual preservado
  });

  it("prazo em lote marca prazoManual", () => {
    const out = aplicarLote(rows, new Set([0]), { prazoIso: "2026-06-15" });
    expect(out[0].prazo).toBe("15/06/2026");
    expect(out[0].prazoManual).toBe(true);
    expect(out[1].prazoManual).toBe(false);
  });

  it("aplicar um campo não toca os demais", () => {
    const out = aplicarLote(rows, new Set([0]), { estadoPrisional: "preso" });
    expect(out[0].estadoPrisional).toBe("preso");
    expect(out[0].status).toBe("triagem");
    expect(out[0].ato).toBe("");
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm run test -- src/lib/__tests__/pje-review-bulk.test.ts`
Expected: FAIL (módulo não existe)

- [ ] **Step 3: Criar src/lib/pje-review-bulk.ts**

```ts
/**
 * Ações em lote do preview de importação PJe. Funções puras.
 */

import type { PjeReviewRow } from "@/components/demandas-premium/pje-review-table";
import { calcularPrazoParaAto } from "./pje-review-row";
import { converterISOParaBR } from "./prazo-calculator";

export interface LoteUpdates {
  ato?: string;
  status?: string;
  estadoPrisional?: string;
  prazoIso?: string; // YYYY-MM-DD
}

/**
 * Aplica updates às linhas alvo (por ordemOriginal). Alvo vazio = todas as
 * não-excluídas (comportamento legado do "p/ todos"). Linhas excluídas nunca
 * são tocadas. Ato recalcula prazo, exceto quando prazoManual. Prazo em lote
 * marca prazoManual.
 */
export function aplicarLote(
  rows: PjeReviewRow[],
  alvo: Set<number>,
  updates: LoteUpdates,
): PjeReviewRow[] {
  return rows.map((row) => {
    if (row.excluded) return row;
    if (alvo.size > 0 && !alvo.has(row.ordemOriginal)) return row;

    const next: PjeReviewRow = { ...row };
    if (updates.ato !== undefined) {
      next.ato = updates.ato;
      if (!row.prazoManual) {
        next.prazo = calcularPrazoParaAto(row.dataExpedicao, updates.ato);
      }
    }
    if (updates.status !== undefined) next.status = updates.status;
    if (updates.estadoPrisional !== undefined) next.estadoPrisional = updates.estadoPrisional;
    if (updates.prazoIso !== undefined) {
      next.prazo = converterISOParaBR(updates.prazoIso);
      next.prazoManual = true;
    }
    return next;
  });
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npm run test -- src/lib/__tests__/pje-review-bulk.test.ts`
Expected: 6 PASS

- [ ] **Step 5: Wire na PjeReviewTable — estado de seleção**

Em `pje-review-table.tsx`:

5a. Adicionar estado e import:

```tsx
import { aplicarLote } from "@/lib/pje-review-bulk";
```

```tsx
  // Seleção para ações em lote (por ordemOriginal — estável entre filtros).
  // Vazia = lote aplica a todas as incluídas (comportamento legado).
  const [selected, setSelected] = useState<Set<number>>(new Set());
```

5b. Substituir `handleBulkAto` e `handleBulkStatus` (linhas 258-279) e adicionar os novos:

```tsx
  // Bulk actions — às selecionadas; sem seleção, a todas as incluídas
  const handleBulkAto = (ato: string) => {
    setBulkAto(ato);
    onRowsChange(aplicarLote(rows, selected, { ato }));
  };

  const handleBulkStatus = (status: string) => {
    setBulkStatus(status);
    onRowsChange(aplicarLote(rows, selected, { status }));
  };

  const handleBulkEstadoPrisional = (estadoPrisional: string) => {
    onRowsChange(aplicarLote(rows, selected, { estadoPrisional }));
  };

  const handleBulkPrazo = (prazoIso: string) => {
    onRowsChange(aplicarLote(rows, selected, { prazoIso }));
  };

  const toggleSelected = (ordemOriginal: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ordemOriginal)) next.delete(ordemOriginal);
      else next.add(ordemOriginal);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const visiveis = filteredRows
      .filter(({ row }) => !row.excluded)
      .map(({ row }) => row.ordemOriginal);
    setSelected((prev) =>
      visiveis.every((o) => prev.has(o)) ? new Set() : new Set(visiveis)
    );
  };
```

5c. Na barra de bulk (após o dropdown de Status p/ todos, ~linha 421), atualizar tooltips dos dois existentes para refletir o alvo e adicionar os dois novos controles. Substituir o conteúdo dos `TooltipContent` de "Ato p/ todos" e "Status p/ todos" por `{selected.size > 0 ? \`Ato p/ ${selected.size} selecionadas\` : "Ato p/ todos"}` (idem status), e adicionar:

```tsx
          {/* Bulk: Estado prisional */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <InlineDropdown
                  value=""
                  compact
                  displayValue={
                    <span className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors cursor-pointer">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  }
                  options={estadoPrisionalOptions}
                  onChange={handleBulkEstadoPrisional}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {selected.size > 0 ? `Estado prisional p/ ${selected.size} selecionadas` : "Estado prisional p/ todos"}
            </TooltipContent>
          </Tooltip>
          {/* Bulk: Prazo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors cursor-pointer">
                <InlineDatePicker value="" onChange={handleBulkPrazo} placeholder="📅" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {selected.size > 0 ? `Prazo p/ ${selected.size} selecionadas` : "Prazo p/ todos"}
            </TooltipContent>
          </Tooltip>
          {/* Indicador de seleção */}
          {selected.size > 0 && (
            <button
              onClick={() => setSelected(new Set())}
              className="px-2 py-1 rounded-md text-[10px] font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
            >
              {selected.size} selecionada{selected.size > 1 ? "s" : ""} ✕
            </button>
          )}
```

Adicionar `Lock` ao import do lucide-react na linha 4. (Se o `InlineDatePicker` não aceitar `placeholder` como trigger compacto, usar o mesmo padrão `showEditIcon` dos usos por linha — conferir a assinatura em `src/components/shared/inline-date-picker.tsx` na hora.)

5d. No header "select all" (linhas 443-454), adicionar checkbox de seleção ao lado do toggle de exclusão:

```tsx
            <button
              onClick={toggleSelectAllVisible}
              className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 border flex items-center justify-center transition-colors ${
                selected.size > 0
                  ? "border-violet-500 bg-violet-500 text-white"
                  : "border-neutral-300 dark:border-neutral-600 hover:border-violet-400"
              }`}
              title="Selecionar visíveis p/ ações em lote"
            >
              {selected.size > 0 && <Check className="h-2.5 w-2.5" />}
            </button>
```

5e. Na row (componente `PjeReviewRowComponent`), adicionar props `isSelected: boolean` e `onToggleSelect: (ordemOriginal: number) => void`, passar do pai (`isSelected={selected.has(row.ordemOriginal)}` / `onToggleSelect={toggleSelected}`), e renderizar o checkbox de seleção ANTES do checkbox de exclusão existente (linha ~569):

```tsx
        {/* Seleção p/ lote (violeta) — separado do incluir/excluir (verde) */}
        <button
          onClick={() => onToggleSelect(row.ordemOriginal)}
          className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 border flex items-center justify-center transition-colors ${
            isSelected
              ? "border-violet-500 bg-violet-500 text-white"
              : "border-neutral-300 dark:border-neutral-600 hover:border-violet-400"
          }`}
          title="Selecionar p/ ações em lote"
        >
          {isSelected && <Check className="h-2.5 w-2.5" />}
        </button>
```

- [ ] **Step 6: Tipos, testes e commit**

Run: `npx tsc --noEmit && npm run test`
Expected: verde

```bash
git add src/lib/pje-review-bulk.ts src/lib/__tests__/pje-review-bulk.test.ts src/components/demandas-premium/pje-review-table.tsx
git commit -m "feat(pje-import): seleção de linhas + lote de ato/status/estado prisional/prazo"
```

---

### Task 6: Fluxo de teclado linha a linha

Ao classificar uma linha pendente (sem ato), avançar para a próxima linha sem ato e abrir o dropdown dela. Reedição (linha que já tinha ato) não avança. `InlineDropdown` ganha handle imperativo `open()`.

**Files:**
- Modify: `src/components/shared/inline-dropdown.tsx` (forwardRef + handle)
- Modify: `src/lib/pje-review-bulk.ts` (helper `proximaLinhaPendente`)
- Modify: `src/components/demandas-premium/pje-review-table.tsx`
- Test: `src/lib/__tests__/pje-review-bulk.test.ts`, `src/components/shared/__tests__/inline-dropdown.test.tsx`

- [ ] **Step 1: Testes que falham — helper e handle**

Em `src/lib/__tests__/pje-review-bulk.test.ts`, adicionar (reusa o `makeRow`):

```ts
import { aplicarLote, proximaLinhaPendente } from "../pje-review-bulk";
```

```ts
describe("proximaLinhaPendente", () => {
  const rows = [
    makeRow({ ordemOriginal: 0, ato: "Ciência" }),
    makeRow({ ordemOriginal: 1 }),                    // pendente
    makeRow({ ordemOriginal: 2, excluded: true }),    // pula
    makeRow({ ordemOriginal: 3 }),                    // pendente
  ];
  const ordemVisivel = [0, 1, 2, 3];

  it("retorna a próxima sem ato após o índice atual", () => {
    expect(proximaLinhaPendente(rows, ordemVisivel, 0)).toBe(1);
  });

  it("pula excluídas e classificadas", () => {
    expect(proximaLinhaPendente(rows, ordemVisivel, 1)).toBe(3);
  });

  it("retorna null quando não há mais pendentes", () => {
    expect(proximaLinhaPendente(rows, ordemVisivel, 3)).toBeNull();
  });
});
```

Em `inline-dropdown.test.tsx`:

```tsx
import { useRef } from "react";
import { InlineDropdown, type InlineDropdownHandle } from "../inline-dropdown";
```

```tsx
describe("InlineDropdown — handle imperativo", () => {
  it("open() abre o dropdown programaticamente", () => {
    function Harness() {
      const handle = useRef<InlineDropdownHandle>(null);
      return (
        <>
          <button onClick={() => handle.current?.open()}>abrir</button>
          <InlineDropdown
            ref={handle}
            value="A"
            displayValue={<span>Trigger</span>}
            options={[{ value: "A", label: "Alpha" }, { value: "B", label: "Beta" }]}
            onChange={vi.fn()}
          />
        </>
      );
    }
    render(<Harness />);
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("abrir"));
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm run test -- src/lib/__tests__/pje-review-bulk.test.ts src/components/shared/__tests__/inline-dropdown.test.tsx`
Expected: FAIL (proximaLinhaPendente e InlineDropdownHandle não existem)

- [ ] **Step 3: Implementar o handle no InlineDropdown**

Em `inline-dropdown.tsx`:

3a. Imports: adicionar `forwardRef, useImperativeHandle` ao import do react.

3b. Exportar o tipo do handle e converter para forwardRef. Trocar a assinatura:

```tsx
export interface InlineDropdownHandle {
  open: () => void;
}

export const InlineDropdown = forwardRef<InlineDropdownHandle, InlineDropdownProps>(
  function InlineDropdown(
    {
      value,
      displayValue,
      options,
      onChange,
      compact = false,
      activateOnDoubleClick = false,
      showEditIcon = false,
      layout = "list",
    },
    fwdRef,
  ) {
```

E no final do componente, trocar o fechamento `}` por `});` (fechando o forwardRef).

3c. Adicionar o handle após os useEffects:

```tsx
  // Abertura programática (fluxo de teclado do preview de importação):
  // garante o trigger visível ANTES de medir a posição do painel (scroll
  // instantâneo, não smooth — o useLayoutEffect mede o rect na abertura).
  useImperativeHandle(fwdRef, () => ({
    open: () => {
      ref.current?.scrollIntoView({ block: "center" });
      setIsOpen(true);
    },
  }), []);
```

- [ ] **Step 4: Implementar proximaLinhaPendente em pje-review-bulk.ts**

```ts
/**
 * Próxima linha pendente (sem ato, não excluída) na ordem visível, após o
 * índice (original) atual. null quando não há mais pendentes à frente.
 */
export function proximaLinhaPendente(
  rows: PjeReviewRow[],
  ordemVisivel: number[],
  aposIndex: number,
): number | null {
  const pos = ordemVisivel.indexOf(aposIndex);
  for (let i = pos + 1; i < ordemVisivel.length; i++) {
    const idx = ordemVisivel[i];
    const row = rows[idx];
    if (row && !row.excluded && !row.ato) return idx;
  }
  return null;
}
```

- [ ] **Step 5: Rodar os testes**

Run: `npm run test -- src/lib/__tests__/pje-review-bulk.test.ts src/components/shared/__tests__/inline-dropdown.test.tsx`
Expected: PASS

- [ ] **Step 6: Wire na PjeReviewTable**

6a. Imports:

```tsx
import { InlineDropdown, type InlineDropdownHandle } from "@/components/shared/inline-dropdown";
import { aplicarLote, proximaLinhaPendente } from "@/lib/pje-review-bulk";
```

6b. Mapa de refs no componente principal:

```tsx
  // Refs dos dropdowns de ato, por índice original — para o avanço por teclado
  const atoRefs = useRef(new Map<number, InlineDropdownHandle>());
```

6c. Reescrever `handleAtoChange` para construir o array novo e avançar:

```tsx
  const handleAtoChange = (index: number, novoAto: string) => {
    const row = rows[index];
    const updates: Partial<PjeReviewRow> = { ato: novoAto };

    // Se o prazo não foi editado manualmente, recalcular
    if (!row.prazoManual) {
      updates.prazo = calcularPrazoParaAto(row.dataExpedicao, novoAto);
    }

    // Quando o ato é de audiência e criarEventoAgenda ainda não foi definido, default true
    if (isAudienciaAto(novoAto) && row.criarEventoAgenda === undefined) {
      updates.criarEventoAgenda = true;
    }

    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...updates };
    onRowsChange(newRows);

    // Fluxo de classificação: linha estava pendente → avança para a próxima
    // sem ato e abre o dropdown dela. Reedição (já tinha ato) não avança.
    if (!row.ato && novoAto) {
      const ordem = filteredRows.map((f) => f.originalIndex);
      const next = proximaLinhaPendente(newRows, ordem, index);
      if (next !== null) {
        setTimeout(() => atoRefs.current.get(next)?.open(), 0);
      }
    }
  };
```

6d. Passar ref callback para a row. Em `PjeReviewRowProps`, adicionar:

```tsx
  atoDropdownRef?: (handle: InlineDropdownHandle | null) => void;
```

No map do pai:

```tsx
              atoDropdownRef={(h) => {
                if (h) atoRefs.current.set(originalIndex, h);
                else atoRefs.current.delete(originalIndex);
              }}
```

No `PjeReviewRowComponent`, no `InlineDropdown` do ato (linha ~668):

```tsx
          <InlineDropdown
            ref={atoDropdownRef}
            value={row.ato}
```

- [ ] **Step 7: Tipos, suite completa e commit**

Run: `npx tsc --noEmit && npm run test`
Expected: verde

```bash
git add src/components/shared/inline-dropdown.tsx src/components/shared/__tests__/inline-dropdown.test.tsx src/lib/pje-review-bulk.ts src/lib/__tests__/pje-review-bulk.test.ts src/components/demandas-premium/pje-review-table.tsx
git commit -m "feat(pje-import): avanço por teclado para a próxima linha pendente após classificar"
```

---

### Task 7: Verificação final

- [ ] **Step 1: Suite completa + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: tudo verde (CI do GH Actions falha por pnpm-lock — conhecido, não bloqueia; o check real é o preview da Vercel).

- [ ] **Step 2: Verificação manual no browser**

Subir o dev server NA WORKTREE (`npm run dev` em `Defender-preview-import`; se a porta 3000 estiver ocupada pelo checkout principal, usar `PORT=3001`). Fluxo: Demandas → Importar do PJe → escolher VVD → colar texto real de intimações → etapa revisar. Conferir:

1. Dropdown de ato scrolla com a rodinha dentro do modal; ↑↓ acompanha o highlight.
2. Barra "Digite para filtrar…" visível; digitar filtra.
3. Grupo "Frequentes" no topo do dropdown.
4. Atos pré-preenchidos (pontinho verde/amarelo); intimações sem tipo identificável ficam vazias.
5. Selecionar 2 linhas (checkbox violeta) → aplicar status em lote → só as 2 mudam. Sem seleção → muda todas.
6. Classificar uma linha pendente → dropdown da próxima pendente abre sozinho.
7. Regressão: dropdowns de ato/status no sheet lateral de demanda (fora do modal) continuam funcionando (clique + scroll).

- [ ] **Step 3: Commit final de eventuais ajustes**

```bash
git add -A && git commit -m "fix(pje-import): ajustes da verificação manual no browser"
```

(Somente se houver ajustes; senão, pular.)

---

## Self-review (já aplicado)

- **Cobertura do spec:** §1 scroll → Task 1; §2 pré-preencher → Task 4; §3 lote → Task 5; §4 dropdown (busca + frequentes) → Tasks 2-3; §5 teclado → Task 6; bordas (excluídas fora do lote/avanço, prazoManual, não sobrescrever ato do usuário) → Tasks 4-6 + testes.
- **Desvios do spec (documentados):** busca presentacional em vez de input real (focus-trap Radix — spec atualizado na Task 2); lote sem seleção mantém comportamento legado "p/ todos" (mais útil que no-op).
- **Consistência de tipos:** `InlineDropdownHandle` (Tasks 1/6), `aplicarLote`/`proximaLinhaPendente` (Tasks 5/6), `calcularPrazoParaAto` movida no Task 4 e usada no 5 — nomes idênticos em todas as tasks.
