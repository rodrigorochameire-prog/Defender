# Agenda Sheet + Registro Modal Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver os 3 atritos de UX no sheet/modal de agenda: botão "Registrar" fora do dropdown, header escuro com identidade contextual, e completude do registro visível e navegável.

**Architecture:** Mudanças puramente de componente — sem mutations, sem schema, sem tRPC. Refatoração mínima no helper `count-completude.ts` (adiciona função `getCompletudeBreakdown` sem quebrar uso atual). UI muda em 3 arquivos: `sheet-action-footer.tsx`, `event-detail-sheet.tsx`, `registro-modal.tsx`.

**Tech Stack:** Next.js 15, React, Tailwind, shadcn/ui (Popover), Vitest + RTL + happy-dom, lucide-react.

**Spec:** `docs/superpowers/specs/2026-04-18-agenda-sheet-modal-redesign.md`

---

## File Structure

| Arquivo | Responsabilidade | Mudança |
|---|---|---|
| `src/components/agenda/registro-audiencia/historico/count-completude.ts` | Cálculo de completude do registro | Adiciona `getCompletudeBreakdown` |
| `src/components/agenda/registro-audiencia/historico/__tests__/count-completude.test.ts` | Testa helper | **Novo** |
| `src/components/agenda/sheet/sheet-action-footer.tsx` | Footer do sheet com ações | Remove dropdown `⋯`, adiciona botão `Registrar` |
| `src/components/agenda/event-detail-sheet.tsx` | Sheet lateral de evento | Header dark + card assistido com faixa lateral |
| `src/components/agenda/registro-audiencia/registro-modal.tsx` | Modal de registro completo | Header 3 linhas, bolinhas nas tabs, popover de completude no footer |

---

## Task 1: Adicionar `getCompletudeBreakdown` no helper

**Files:**
- Modify: `src/components/agenda/registro-audiencia/historico/count-completude.ts`
- Test: `src/components/agenda/registro-audiencia/historico/__tests__/count-completude.test.ts`

**Objetivo:** adicionar função que retorna o breakdown por aba, mantendo `countCompletude` funcionando.

- [ ] **Step 1: Criar arquivo de teste**

Criar `src/components/agenda/registro-audiencia/historico/__tests__/count-completude.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { countCompletude, getCompletudeBreakdown } from "../count-completude";

describe("countCompletude", () => {
  it("retorna 0 para registro vazio", () => {
    expect(countCompletude({})).toBe(0);
  });

  it("conta 5 quando todos campos preenchidos", () => {
    expect(
      countCompletude(
        {
          resultado: "audiencia realizada",
          assistidoCompareceu: true,
          anotacoesGerais: "ok",
          depoentes: [{}],
        },
        "realizada",
      ),
    ).toBe(5);
  });
});

describe("getCompletudeBreakdown", () => {
  it("marca todas empty para registro vazio", () => {
    const r = getCompletudeBreakdown({ depoentes: [] }, undefined);
    expect(r.filled).toBe(0);
    expect(r.total).toBe(5);
    expect(r.byTab.briefing).toBe("empty");
    expect(r.byTab.depoentes).toBe("empty");
    expect(r.byTab.anotacoes).toBe("empty");
    expect(r.byTab.resultado).toBe("empty");
    expect(r.byTab.historico).toBe("empty");
  });

  it("marca briefing full quando imputacao e fatos existem", () => {
    const r = getCompletudeBreakdown(
      { depoentes: [] },
      undefined,
      { imputacao: "art 121", fatos: "narrativa" },
    );
    expect(r.byTab.briefing).toBe("full");
  });

  it("marca briefing partial quando só imputacao existe", () => {
    const r = getCompletudeBreakdown(
      { depoentes: [] },
      undefined,
      { imputacao: "art 121" },
    );
    expect(r.byTab.briefing).toBe("partial");
  });

  it("marca depoentes full quando todos têm tipo", () => {
    const r = getCompletudeBreakdown(
      { depoentes: [{ nome: "A", tipo: "TESTEMUNHA" }, { nome: "B", tipo: "VITIMA" }] },
      undefined,
    );
    expect(r.byTab.depoentes).toBe("full");
  });

  it("marca depoentes partial quando algum sem tipo", () => {
    const r = getCompletudeBreakdown(
      { depoentes: [{ nome: "A", tipo: "TESTEMUNHA" }, { nome: "B" }] },
      undefined,
    );
    expect(r.byTab.depoentes).toBe("partial");
  });

  it("marca anotacoes full quando anotacoesGerais preenchida", () => {
    const r = getCompletudeBreakdown(
      { anotacoesGerais: "algo", depoentes: [] },
      undefined,
    );
    expect(r.byTab.anotacoes).toBe("full");
  });

  it("marca resultado full quando statusAudiencia é realizada", () => {
    const r = getCompletudeBreakdown({ depoentes: [] }, "realizada");
    expect(r.byTab.resultado).toBe("full");
  });

  it("marca resultado empty para status pendente ou undefined", () => {
    expect(getCompletudeBreakdown({ depoentes: [] }, "pendente").byTab.resultado).toBe("empty");
    expect(getCompletudeBreakdown({ depoentes: [] }, undefined).byTab.resultado).toBe("empty");
  });

  it("marca historico full quando hasRegistroSalvo true", () => {
    const r = getCompletudeBreakdown({ depoentes: [] }, undefined, undefined, true);
    expect(r.byTab.historico).toBe("full");
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

```bash
cd ~/projetos/Defender && npx vitest run src/components/agenda/registro-audiencia/historico/__tests__/count-completude.test.ts
```

Expected: falha porque `getCompletudeBreakdown` ainda não existe.

- [ ] **Step 3: Implementar `getCompletudeBreakdown`**

Editar `src/components/agenda/registro-audiencia/historico/count-completude.ts`, mantendo `countCompletude` e `COMPLETUDE_TOTAL` intactos. Adicionar ao final do arquivo:

```ts
export type CompletudeState = "full" | "partial" | "empty";

export type TabKey = "briefing" | "depoentes" | "anotacoes" | "resultado" | "historico";

export interface CompletudeBreakdown {
  total: number;
  filled: number;
  byTab: Record<TabKey, CompletudeState>;
}

interface BriefingData {
  imputacao?: string | null;
  fatos?: string | null;
}

interface DepoenteLite {
  nome?: string;
  tipo?: string;
}

export function getCompletudeBreakdown(
  registro: RegistroCompletude & { depoentes?: DepoenteLite[] },
  statusAudiencia: string | undefined,
  briefing?: BriefingData,
  hasRegistroSalvo?: boolean,
): CompletudeBreakdown {
  const briefingHasImputacao = !!briefing?.imputacao;
  const briefingHasFatos = !!briefing?.fatos;
  const briefingScore =
    briefingHasImputacao && briefingHasFatos
      ? "full"
      : briefingHasImputacao || briefingHasFatos
        ? "partial"
        : "empty";

  const depoentes = (registro.depoentes ?? []) as DepoenteLite[];
  const depoentesScore: CompletudeState =
    depoentes.length === 0
      ? "empty"
      : depoentes.every((d) => !!d.tipo)
        ? "full"
        : "partial";

  const anotacoesScore: CompletudeState = registro.anotacoesGerais ? "full" : "empty";

  const resultadoScore: CompletudeState =
    statusAudiencia && statusAudiencia !== "pendente" ? "full" : "empty";

  const historicoScore: CompletudeState = hasRegistroSalvo ? "full" : "empty";

  const byTab = {
    briefing: briefingScore as CompletudeState,
    depoentes: depoentesScore,
    anotacoes: anotacoesScore,
    resultado: resultadoScore,
    historico: historicoScore,
  };

  const filled = Object.values(byTab).filter((s) => s === "full").length;

  return { total: COMPLETUDE_TOTAL, filled, byTab };
}
```

- [ ] **Step 4: Rodar teste — deve passar**

```bash
npx vitest run src/components/agenda/registro-audiencia/historico/__tests__/count-completude.test.ts
```

Expected: PASS (10 testes).

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/registro-audiencia/historico/count-completude.ts src/components/agenda/registro-audiencia/historico/__tests__/count-completude.test.ts
git commit -m "feat(agenda): adiciona getCompletudeBreakdown com scores por aba"
```

---

## Task 2: Sheet footer — substituir dropdown por botão `Registrar`

**Files:**
- Modify: `src/components/agenda/sheet/sheet-action-footer.tsx`

- [ ] **Step 1: Remover imports de DropdownMenu**

No topo de `src/components/agenda/sheet/sheet-action-footer.tsx`, trocar:

```ts
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
```

por:

```ts
import { BookOpen } from "lucide-react";
```

E no import de `lucide-react` na linha 3, manter `Check` e `Send` (remover se não for usado mais em outro lugar — `Check` e `Send` ficam).

- [ ] **Step 2: Substituir bloco do dropdown por botão Registrar**

Localizar o bloco das linhas 53-83 (a `<div className="flex gap-1.5">` com os 3 botões + dropdown). Substituir o `DropdownMenu` inteiro (linhas 71-82) por:

```tsx
<Button
  size="sm"
  variant="outline"
  className="flex-1 text-xs h-9 cursor-pointer"
  disabled={!audienciaId}
  onClick={onAbrirRegistroCompleto}
>
  <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Registrar
</Button>
```

O bloco final fica:

```tsx
<div className="flex gap-1.5">
  <Button
    size="sm"
    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-9 cursor-pointer"
    disabled={jaConcluida || !audienciaId}
    onClick={() => setConcluirOpen(true)}
  >
    <Check className="w-3.5 h-3.5 mr-1.5" /> Concluir
  </Button>
  <Button
    size="sm"
    variant="outline"
    className="flex-1 text-xs h-9 cursor-pointer"
    disabled={!audienciaId}
    onClick={() => setRedesignarOpen(true)}
  >
    ↷ Redesignar
  </Button>
  <Button
    size="sm"
    variant="outline"
    className="flex-1 text-xs h-9 cursor-pointer"
    disabled={!audienciaId}
    onClick={onAbrirRegistroCompleto}
  >
    <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Registrar
  </Button>
</div>
```

- [ ] **Step 3: Typecheck + lint**

```bash
npx tsc --noEmit
```

Expected: 0 erros. Aviso possível sobre import não usado de DropdownMenu — removido no Step 1.

- [ ] **Step 4: Smoke test visual**

```bash
npm run dev
```

Abrir `http://localhost:3000/admin/agenda`, clicar num evento, verificar no footer do sheet:
- 3 botões lado a lado: Concluir (verde), Redesignar (outline), Registrar (outline).
- Sem botão `⋯`.
- Clicar em "Registrar" abre o modal de registro.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/sheet/sheet-action-footer.tsx
git commit -m "feat(agenda): promove 'Registrar' a botão principal do sheet footer"
```

---

## Task 3: Sheet header dark + card assistido com faixa lateral

**Files:**
- Modify: `src/components/agenda/event-detail-sheet.tsx`

- [ ] **Step 1: Header superior — tema escuro**

Localizar linhas 231-242 (header com label "Evento" + botão X). Substituir por:

```tsx
<div className="bg-neutral-900 dark:bg-neutral-950 text-white backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
  <SheetHeader className="p-0">
    <SheetTitle className="text-[13px] font-semibold tracking-tight text-white">Evento</SheetTitle>
  </SheetHeader>
  <button
    onClick={() => onOpenChange(false)}
    className="w-7 h-7 rounded-lg hover:bg-neutral-800 flex items-center justify-center cursor-pointer"
    title="Fechar"
  >
    <X className="w-3.5 h-3.5" />
  </button>
</div>
```

- [ ] **Step 2: SheetContent — background branco**

Localizar linha 227 — substituir `bg-[#f7f7f7] dark:bg-neutral-950` por:

```tsx
bg-white dark:bg-neutral-950
```

A linha inteira vira:

```tsx
className="w-full sm:w-[480px] md:w-[560px] p-0 flex flex-col gap-0 border-l-0 outline-none bg-white dark:bg-neutral-950 rounded-l-2xl sm:rounded-l-none shadow-2xl [&>button:first-of-type]:hidden"
```

- [ ] **Step 3: Card do assistido — ring + faixa lateral colorida**

Localizar linhas 247-294 (o `<div className="mx-3 mt-3 mb-3 px-4 py-4 rounded-xl bg-[#c8c8cc] ...">`). Substituir apenas o wrapper externo e remover o `boxShadow` colorido do avatar.

Substituir a linha 247 por:

```tsx
{(() => {
  const filterKey = normalizeAreaToFilter(evento.atribuicaoKey || evento.atribuicao || "");
  const atribColor = SOLID_COLOR_MAP[filterKey] || "#a1a1aa";
  return (
    <div
      className="mx-3 mt-3 mb-3 px-4 py-4 rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 border-l-[3px]"
      style={{ borderLeftColor: atribColor }}
    >
```

Adicionar fechamento `</div>)})()}` correspondente no final (onde antes fechava o `<div>` externo).

Dentro desse bloco, localizar o avatar (linhas 249-262) — o IIFE interno que calcula `atribColor` e aplica `boxShadow`. Simplificar para remover o IIFE redundante e o boxShadow:

```tsx
<div className="flex items-start gap-3.5">
  <div className="w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
    <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
      {(assistidoNome || evento.titulo || "").split(" ").filter(Boolean).slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
    </span>
  </div>
  <div className="flex-1 min-w-0 pt-0.5">
    {/* ... resto do conteúdo do card, inalterado ... */}
```

O restante do conteúdo do card (nome do assistido, botão copiar processo, data/hora, vara) **não muda**.

- [ ] **Step 4: ToC wrapper com fundo claro**

O componente `SheetToC` é renderizado na linha 244. O spec pede um wrapper com `bg-neutral-50 border-b`. Envolver assim:

```tsx
<div className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
  <SheetToC sections={tocSections} activeId={activeSection} onJump={handleJump} />
</div>
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 6: Smoke test visual**

```bash
npm run dev
```

Abrir agenda, clicar num evento. Verificar:
- Header do sheet preto (`bg-neutral-900`) com label "Evento" branco e X.
- Conteúdo abaixo em branco.
- Card do assistido branco com faixa vertical de 3px à esquerda na cor da atribuição.
- Avatar sem sombra colorida, fundo cinza claro.
- Alternar para dark mode e confirmar contraste.

- [ ] **Step 7: Commit**

```bash
git add src/components/agenda/event-detail-sheet.tsx
git commit -m "style(agenda): header escuro + card assistido com faixa lateral colorida"
```

---

## Task 4: Modal header enxuto — 3 linhas

**Files:**
- Modify: `src/components/agenda/registro-audiencia/registro-modal.tsx`

- [ ] **Step 1: Reestruturar header (linhas 60-173)**

Substituir todo o bloco do header (linhas 60-173) por:

```tsx
{/* Header - Linha 1: identidade + ações */}
<div className="bg-white dark:bg-neutral-950 border-b border-neutral-200/80 dark:border-border/80 px-4 py-3 flex items-center justify-between flex-shrink-0">
  <div className="flex items-center gap-3 min-w-0">
    <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0 shadow-lg">
      <Gavel className="w-5 h-5 text-background" />
    </div>
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Registro de Audiência
        </h2>
        {form.registroSalvo && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Salvo
          </Badge>
        )}
        {form.registroSalvo && form.ultimoSalvamento && (
          <span className="text-[10px] text-muted-foreground">
            {form.ultimoSalvamento}
          </span>
        )}
      </div>
      {/* Linha 2: identificação */}
      <p className="text-xs md:text-sm text-muted-foreground truncate">
        {(() => {
          const assistidoName = typeof evento.assistido === "string" ? evento.assistido : evento.assistido?.nome;
          const assistidoId = typeof evento.assistido === "object" ? evento.assistido?.id : evento.assistidoId;
          const processoDisplay = typeof evento.processo === "string" ? evento.processo : evento.processo?.numero;
          const processoId = typeof evento.processo === "object" ? evento.processo?.id : evento.processoId;
          return (
            <>
              {assistidoId ? (
                <Link
                  href={`/admin/assistidos/${assistidoId}`}
                  target="_blank"
                  rel="noopener"
                  className="font-medium text-foreground/90 hover:underline"
                >
                  {assistidoName}
                </Link>
              ) : (
                <span className="font-medium text-foreground/90">{assistidoName}</span>
              )}
              {processoDisplay && (
                <>
                  {" · "}
                  {processoId ? (
                    <Link
                      href={`/admin/processos/${processoId}`}
                      target="_blank"
                      rel="noopener"
                      className="font-mono hover:underline"
                    >
                      {processoDisplay}
                    </Link>
                  ) : (
                    <span className="font-mono">{processoDisplay}</span>
                  )}
                </>
              )}
              {" · "}
              {new Date(evento.data).toLocaleDateString("pt-BR")}
              {evento.horarioInicio && ` · ${evento.horarioInicio}`}
            </>
          );
        })()}
      </p>
    </div>
  </div>
  <button
    onClick={onClose}
    className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-muted flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-muted transition-colors cursor-pointer flex-shrink-0"
  >
    <X className="w-5 h-5 text-foreground/80" />
  </button>
</div>

{/* Linha 3: faixa de contexto (atribuição + vara + Juiz/MP) */}
<div className="bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-border/60 px-4 py-1.5 flex items-center gap-3 flex-wrap flex-shrink-0">
  {evento.atribuicao && (
    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
      {evento.atribuicao}
    </Badge>
  )}
  {evento.local && (
    <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
      {evento.local}
    </span>
  )}
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] text-muted-foreground">Juiz:</span>
    <input
      type="text"
      value={form.juiz}
      onChange={(e) => form.setJuiz(e.target.value)}
      placeholder="Nome do juiz"
      className="text-xs px-1.5 py-0.5 h-5 w-32 md:w-40 border border-neutral-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-950 text-foreground focus:outline-none focus:ring-1 focus:ring-neutral-500/20 focus:border-neutral-500"
    />
  </div>
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] text-muted-foreground">MP:</span>
    <input
      type="text"
      value={form.promotor}
      onChange={(e) => form.setPromotor(e.target.value)}
      placeholder="Nome do promotor"
      className="text-xs px-1.5 py-0.5 h-5 w-32 md:w-40 border border-neutral-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-950 text-foreground focus:outline-none focus:ring-1 focus:ring-neutral-500/20 focus:border-neutral-500"
    />
  </div>
</div>
```

**Importante:** o botão "Atualizar" do header (linhas 155-165 originais) foi removido. O botão no footer (linhas 315-322) permanece.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 3: Smoke test visual**

```bash
npm run dev
```

Abrir agenda, clicar num evento, clicar em "Registrar" para abrir modal. Verificar:
- Header em duas áreas visuais: linha superior branca (título, identificação, X) e faixa inferior cinza claro com atribuição/juiz/MP.
- Botão "Atualizar" não aparece mais no header.
- Título é "Registro de Audiência" (fixo), não `evento.titulo`.
- Salvamento continua funcionando pelo botão do footer.

- [ ] **Step 4: Commit**

```bash
git add src/components/agenda/registro-audiencia/registro-modal.tsx
git commit -m "refactor(agenda): header do modal em 3 linhas, remove botão Atualizar duplicado"
```

---

## Task 5: Bolinhas de completude nas tabs do modal

**Files:**
- Modify: `src/components/agenda/registro-audiencia/registro-modal.tsx`

- [ ] **Step 1: Importar helper novo e obter briefing**

No topo do arquivo, adicionar:

```ts
import { getCompletudeBreakdown, type CompletudeState } from "./historico/count-completude";
```

Dentro do componente, logo após a linha que calcula `tabCounts` (linha 40-42), adicionar:

```ts
const briefingData = form.briefingData as { imputacao?: string | null; fatos?: string | null } | undefined;
const completude = getCompletudeBreakdown(
  form.registro,
  form.statusAudiencia,
  briefingData,
  form.registroSalvo,
);
```

> Se `form.briefingData` não existir no hook `useRegistroForm`, passar `undefined` (o helper aceita). Isso marca Briefing sempre como `empty` — aceitável por ora; uma iteração futura pode puxar os dados de `trpc.audiencias.getAudienciaContext` como faz o sheet.

- [ ] **Step 2: Adicionar bolinha na renderização das tabs**

Dentro do loop `visibleTabs.map` (linhas 178-202), após o bloco da Badge de count, adicionar a bolinha. Substituir o conteúdo do `<button>` (linhas 184-201) por:

```tsx
<button
  key={tab.key}
  onClick={() => form.setActiveTab(tab.key)}
  className={`px-3 sm:px-2 md:px-3 py-2.5 sm:py-2 md:py-3 text-xs md:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 md:gap-2 whitespace-nowrap cursor-pointer ${
    isActive
      ? "border-foreground text-foreground bg-white dark:bg-neutral-950"
      : "border-transparent text-muted-foreground hover:text-foreground"
  }`}
>
  <Icon className="w-5 h-5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
  <span className="hidden sm:inline">{tab.label}</span>
  {count !== undefined && count > 0 && (
    <Badge className="bg-neutral-100 dark:bg-muted text-muted-foreground text-[10px] px-1.5 py-0">
      {count}
    </Badge>
  )}
  <span
    className={`w-1.5 h-1.5 rounded-full ${completudeStateColor(completude.byTab[tab.key])}`}
    title={`Completude: ${completude.byTab[tab.key]}`}
  />
</button>
```

- [ ] **Step 3: Adicionar helper `completudeStateColor` no arquivo**

Logo após os imports e antes do componente `RegistroAudienciaModal`, adicionar:

```ts
function completudeStateColor(state: CompletudeState): string {
  if (state === "full") return "bg-emerald-500";
  if (state === "partial") return "bg-amber-400";
  return "bg-neutral-300 dark:bg-neutral-700";
}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 5: Smoke test visual**

Abrir modal. Verificar:
- Cada tab tem uma bolinha de 6px à direita do label.
- Preencher um depoente com tipo → bolinha de "Depoentes" vira verde.
- Remover tipo → bolinha vira âmbar.
- Sem depoentes → bolinha cinza.

- [ ] **Step 6: Commit**

```bash
git add src/components/agenda/registro-audiencia/registro-modal.tsx
git commit -m "feat(agenda): bolinha de completude por aba no modal"
```

---

## Task 6: Footer do modal com popover de completude

**Files:**
- Modify: `src/components/agenda/registro-audiencia/registro-modal.tsx`

- [ ] **Step 1: Importar Popover e ícones**

No topo do arquivo:

```ts
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Circle, CircleDashed } from "lucide-react";
```

- [ ] **Step 2: Substituir a Badge "x/5 preenchidos" por Popover trigger**

Localizar o bloco do footer (linhas 285-304 — `<div className="border-t border-neutral-200 ...">`). No trecho com `<Badge>{completudeItems}/5 preenchidos</Badge>` (linhas 290-295), substituir por:

```tsx
<Popover>
  <PopoverTrigger asChild>
    <button
      type="button"
      className="inline-flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
    >
      {completude.filled}/{completude.total} preenchidos
    </button>
  </PopoverTrigger>
  <PopoverContent align="start" side="top" className="w-56 p-1.5">
    <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wide">
      Completude do registro
    </div>
    {tabConfig.map((tab) => {
      const state = completude.byTab[tab.key];
      const Icon = state === "full" ? CheckCircle2 : state === "partial" ? CircleDashed : Circle;
      const color =
        state === "full"
          ? "text-emerald-500"
          : state === "partial"
            ? "text-amber-500"
            : "text-neutral-400";
      const countSuffix = tab.countKey ? ` (${tabCounts[tab.countKey] ?? 0})` : "";
      return (
        <button
          key={tab.key}
          type="button"
          onClick={() => form.setActiveTab(tab.key)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-muted text-xs text-left cursor-pointer"
        >
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
          <span className="flex-1">{tab.label}{countSuffix}</span>
        </button>
      );
    })}
  </PopoverContent>
</Popover>
```

> **Importante:** a variável antiga `completudeItems` (linha 49) some. Remover a linha:
> ```ts
> const completudeItems = countCompletude(form.registro, form.statusAudiencia);
> ```
> E o import `countCompletude` se não for usado em mais nada neste arquivo.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: 0 erros.

- [ ] **Step 4: Smoke test visual**

Abrir modal. Clicar no botão `X/5 preenchidos` no footer:
- Popover abre com lista de 5 abas.
- Cada item mostra ícone (check verde/dashed âmbar/círculo cinza) conforme estado.
- Clicar num item troca a aba ativa e fecha popover.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/registro-audiencia/registro-modal.tsx
git commit -m "feat(agenda): popover navegável de completude no footer do modal"
```

---

## Task 7: Verificação final end-to-end

- [ ] **Step 1: Rodar typecheck + testes**

```bash
cd ~/projetos/Defender
npx tsc --noEmit
npx vitest run
```

Expected: 0 erros de tipo, todos os testes passam.

- [ ] **Step 2: Smoke test manual completo**

```bash
npm run dev
```

Roteiro:
1. Ir em `http://localhost:3000/admin/agenda`.
2. Clicar num evento de audiência → sheet lateral abre.
3. Confirmar header escuro, card branco com faixa colorida, 3 botões no footer.
4. Clicar em "Registrar" → modal abre.
5. Confirmar header 3 linhas, bolinhas nas tabs, X/5 no footer.
6. Clicar no `X/5 preenchidos` → popover abre, clicar em "Resultado" → aba troca.
7. Preencher um campo em Resultado → salvar pelo footer → ver badge "Salvo" aparecer.
8. Fechar modal, voltar ao sheet, clicar "Concluir" → dialog abre normalmente.
9. Alternar dark mode → verificar contraste em tudo.

- [ ] **Step 3: Deploy**

```bash
git log --oneline -10
```

Confirmar histórico de commits limpo. Se todos estiverem em main local, seguir fluxo padrão do Defender (`/merge-main-push` ou push direto — auto-commit hook bundla no main segundo memory `feedback_ombuds_autocommit`).

```bash
git push origin main
```

- [ ] **Step 4: Atualizar memória do projeto**

Criar memória `project_redesign_agenda_v2.md` atualizando o estado do redesign com as mudanças desta iteração (botão Registrar promovido, header escuro, completude visível) e adicionar pointer no MEMORY.md.

---

## Self-Review

**Spec coverage:**
- ✅ Parte 1 (3 botões footer) → Task 2
- ✅ Parte 2 (header dark + faixa) → Task 3
- ✅ Parte 3 (header 3 linhas) → Task 4
- ✅ Parte 4 (completude visível) → Tasks 1, 5, 6
- ✅ Helper refatorado → Task 1

**Placeholder scan:** nenhum TBD/TODO. Tests têm código completo. Todos os comandos têm output esperado.

**Type consistency:** `CompletudeState`, `TabKey`, `CompletudeBreakdown` usados consistentemente em Tasks 1, 5, 6. `completudeStateColor` e `completude.byTab[tab.key]` alinhados.

**Observação:** Task 5 assume que `form.briefingData` pode não existir — spec prevê fallback para `undefined`. Se o hook `useRegistroForm` não expuser esse dado, Briefing ficará sempre `empty`, o que é um degrade aceitável da primeira iteração (pode ser melhorado num bloco futuro puxando do `getAudienciaContext`).
