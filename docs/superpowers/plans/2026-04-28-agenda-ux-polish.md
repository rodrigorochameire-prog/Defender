# Agenda — Polish UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tirar 3 fricções de uso da página `/admin/agenda` — calendário que extrapola viewport, expansão obrigatória do card no sheet do dia, e título do evento truncado/uppercase.

**Architecture:** Mudanças localizadas, sem refactor estrutural. Um helper novo (`toTitleCase`) com whitelist de siglas, fix de regex em `extrairTipo`, reescrita da renderização do card no sheet (sem chevron — ações inline com pattern `group-hover:`), e ajuste de altura/grid no calendário para `flex-1 min-h-0`.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS, Vitest, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-04-28-agenda-ux-polish-design.md`

---

## File Structure

| Path | Status | Responsabilidade |
|---|---|---|
| `src/lib/utils/title-case.ts` | **CREATE** | Helper puro `toTitleCase()` com whitelist de siglas + heurística |
| `src/lib/utils/__tests__/title-case.test.ts` | **CREATE** | Testes do helper |
| `src/components/agenda/day-events-sheet.tsx` | MODIFY | (a) `extrairTipo`: fix regex em-dash + aplicar Title Case. (b) Card: remover expansão, faixa de ações sempre/hover |
| `src/components/agenda/calendar-month-view.tsx` | MODIFY | Container raiz `h-full flex flex-col`; grade das semanas `flex-1`; células `min-h-0 overflow-hidden` |
| `src/app/(dashboard)/admin/agenda/page.tsx` | MODIFY | Wrapper que envolve o `CalendarMonthView` passa a permitir `flex-1` (altura calculada) |

---

## Task 1 — Helper `toTitleCase` com whitelist de siglas

**Files:**
- Create: `src/lib/utils/title-case.ts`
- Create: `src/lib/utils/__tests__/title-case.test.ts`

- [ ] **Step 1.1: Escrever os testes que falham**

Criar `src/lib/utils/__tests__/title-case.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toTitleCase } from "../title-case";

describe("toTitleCase", () => {
  it("uppercase comum vira Title Case", () => {
    expect(toTitleCase("JUSTIFICAÇÃO")).toBe("Justificação");
    expect(toTitleCase("AUDIÊNCIA CONCENTRADA")).toBe("Audiência Concentrada");
    expect(toTitleCase("MEDIDAS PROTETIVAS")).toBe("Medidas Protetivas");
  });

  it("siglas conhecidas permanecem em caixa alta", () => {
    expect(toTitleCase("AIJ")).toBe("AIJ");
    expect(toTitleCase("ANPP")).toBe("ANPP");
    expect(toTitleCase("PAP")).toBe("PAP");
    expect(toTitleCase("IRDR")).toBe("IRDR");
    expect(toTitleCase("STJ")).toBe("STJ");
  });

  it("siglas embutidas em frase permanecem em caixa alta", () => {
    expect(toTitleCase("AUDIÊNCIA AIJ")).toBe("Audiência AIJ");
    expect(toTitleCase("ACORDO ANPP COM MP")).toBe("Acordo ANPP com MP");
  });

  it("conectivos minúsculos exceto na primeira posição", () => {
    expect(toTitleCase("AUDIÊNCIA DE INSTRUÇÃO")).toBe("Audiência de Instrução");
    expect(toTitleCase("VARA DA FAZENDA PÚBLICA")).toBe("Vara da Fazenda Pública");
    expect(toTitleCase("DE ACORDO COM A LEI")).toBe("De Acordo com a Lei");
  });

  it("heurística: token todo maiúsculo de até 4 chars vira sigla", () => {
    expect(toTitleCase("CASO XYZ")).toBe("Caso XYZ");
    expect(toTitleCase("RELATOR JKLM")).toBe("Relator JKLM");
  });

  it("heurística não dispara para tokens longos", () => {
    expect(toTitleCase("AUDIÊNCIA")).toBe("Audiência");
    expect(toTitleCase("CONCENTRADA")).toBe("Concentrada");
  });

  it("input misto/Title já formatado preserva siglas", () => {
    expect(toTitleCase("Audiência AIJ")).toBe("Audiência AIJ");
    expect(toTitleCase("audiência aij")).toBe("Audiência AIJ");
  });

  it("strings vazias/whitespace", () => {
    expect(toTitleCase("")).toBe("");
    expect(toTitleCase("   ")).toBe("   ");
  });

  it("preserva pontuação adjacente", () => {
    expect(toTitleCase("AUDIÊNCIA, INSTRUÇÃO E JULGAMENTO")).toBe(
      "Audiência, Instrução e Julgamento"
    );
  });
});
```

- [ ] **Step 1.2: Rodar testes para confirmar que falham**

```bash
npx vitest run src/lib/utils/__tests__/title-case.test.ts
```

Esperado: erro de import (`Cannot find module '../title-case'`) — todos os testes falham.

- [ ] **Step 1.3: Implementar o helper**

Criar `src/lib/utils/title-case.ts`:

```ts
const KNOWN_ACRONYMS = new Set<string>([
  "AIJ",
  "PAP",
  "ANPP",
  "ANPL",
  "IRDR",
  "JECRIM",
  "DPE",
  "MPBA",
  "MP",
  "TJ",
  "STF",
  "STJ",
  "CNJ",
  "TJBA",
  "TRF",
  "PJE",
  "VVD",
]);

const CONNECTORS = new Set<string>([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
  "as",
  "os",
  "em",
  "na",
  "no",
  "nas",
  "nos",
  "para",
  "com",
  "por",
]);

function isAcronymHeuristic(rawToken: string, normalized: string): boolean {
  if (KNOWN_ACRONYMS.has(normalized)) return true;
  // Heurística: token cru todo em caixa alta e curto (≤ 4 chars alfabéticos) é sigla.
  // Ignora caracteres não-alfabéticos para o cálculo de tamanho.
  const letters = rawToken.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length === 0 || letters.length > 4) return false;
  return letters === letters.toUpperCase() && /[A-Z]/.test(letters);
}

function capitalize(word: string): string {
  if (!word) return word;
  // Preserva pontuação adjacente: capitaliza a 1ª letra alfabética encontrada.
  const match = word.match(/^([^A-Za-zÀ-ÿ]*)([A-Za-zÀ-ÿ])(.*)$/);
  if (!match) return word;
  const [, prefix, first, rest] = match;
  return prefix + first.toUpperCase() + rest.toLowerCase();
}

/**
 * Converte texto para Title Case respeitando siglas e conectivos do português.
 *
 * - Siglas conhecidas (whitelist) e tokens curtos (≤ 4 chars) já em caixa alta no
 *   input permanecem em caixa alta.
 * - Conectivos (de, da, do, e, com, etc.) ficam minúsculos exceto se forem o
 *   primeiro token da string.
 * - Demais palavras: primeira letra maiúscula, resto minúsculo.
 */
export function toTitleCase(input: string): string {
  if (!input) return input;

  const tokens = input.split(/(\s+)/); // preserva whitespace original
  let firstWordSeen = false;

  return tokens
    .map((token) => {
      if (/^\s+$/.test(token) || token === "") return token;

      const normalized = token.replace(/[^A-Za-zÀ-ÿ]/g, "").toUpperCase();

      if (isAcronymHeuristic(token, normalized)) {
        firstWordSeen = true;
        // Mantém a sigla em maiúsculo, preservando pontuação adjacente.
        return token.replace(/[A-Za-zÀ-ÿ]+/, (m) => m.toUpperCase());
      }

      const lower = token.toLowerCase();
      const lowerCore = lower.replace(/[^a-zà-ÿ]/g, "");

      if (firstWordSeen && CONNECTORS.has(lowerCore)) {
        return lower;
      }

      firstWordSeen = true;
      return capitalize(token);
    })
    .join("");
}
```

- [ ] **Step 1.4: Rodar testes — devem passar**

```bash
npx vitest run src/lib/utils/__tests__/title-case.test.ts
```

Esperado: todos os 9 testes verdes.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/utils/title-case.ts src/lib/utils/__tests__/title-case.test.ts
git commit -m "feat(utils): add toTitleCase helper with sigla whitelist"
```

---

## Task 2 — Fix `extrairTipo` (em-dash + Title Case)

**Files:**
- Modify: `src/components/agenda/day-events-sheet.tsx:60-108`
- Create: `src/components/agenda/__tests__/extrair-tipo.test.ts`

A função `extrairTipo` está privada no arquivo do componente. Vamos extrair para um módulo próprio para poder testar, e aplicar `toTitleCase` no resultado.

**Files:**
- Create: `src/components/agenda/extrair-tipo.ts`
- Create: `src/components/agenda/__tests__/extrair-tipo.test.ts`
- Modify: `src/components/agenda/day-events-sheet.tsx` — passar a importar de `./extrair-tipo`

- [ ] **Step 2.1: Escrever os testes**

Criar `src/components/agenda/__tests__/extrair-tipo.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { extrairTipo } from "../extrair-tipo";

describe("extrairTipo", () => {
  it("título com em-dash separa pelo dash (regressão do bug 2026-04-28)", () => {
    expect(extrairTipo("JUSTIFICAÇÃO — JADSON DE JESUS MACHADO")).toBe(
      "Justificação"
    );
  });

  it("título com hífen comum também separa", () => {
    expect(extrairTipo("JUSTIFICAÇÃO - JADSON")).toBe("Justificação");
  });

  it("título com en-dash também separa", () => {
    expect(extrairTipo("JUSTIFICAÇÃO – JADSON")).toBe("Justificação");
  });

  it("preserva siglas mapeadas", () => {
    expect(extrairTipo("AIJ — JADSON")).toBe("AIJ");
    expect(
      extrairTipo("Audiência de Instrução e Julgamento — JADSON")
    ).toBe("AIJ");
    expect(extrairTipo("Acordo de Não Persecução Penal — Maria")).toBe("ANPP");
  });

  it("aplica Title Case quando não há sigla mapeada", () => {
    expect(extrairTipo("AUDIÊNCIA CONCENTRADA — Joao")).toBe(
      "Audiência Concentrada"
    );
  });

  it("remove prefixo ADV", () => {
    expect(extrairTipo("ADV - JUSTIFICAÇÃO — JADSON")).toBe("Justificação");
    expect(extrairTipo("ADV JUSTIFICAÇÃO")).toBe("Justificação");
  });

  it("título sem dash usa string inteira (em Title Case)", () => {
    expect(extrairTipo("JUSTIFICAÇÃO")).toBe("Justificação");
    expect(extrairTipo("AIJ")).toBe("AIJ");
  });

  it("título longo sem dash é truncado", () => {
    const titulo = "ALGUMA AUDIÊNCIA EXTREMAMENTE LONGA";
    const out = extrairTipo(titulo);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(21);
  });
});
```

- [ ] **Step 2.2: Rodar — falham por import faltando**

```bash
npx vitest run src/components/agenda/__tests__/extrair-tipo.test.ts
```

Esperado: `Cannot find module '../extrair-tipo'`.

- [ ] **Step 2.3: Criar o módulo `extrair-tipo.ts`**

Criar `src/components/agenda/extrair-tipo.ts`:

```ts
import { toTitleCase } from "@/lib/utils/title-case";

const tipoAbreviacoes: Record<string, string> = {
  "Audiência de Instrução e Julgamento": "AIJ",
  "Instrução e Julgamento": "AIJ",
  "Audiência de Custódia": "Custódia",
  "Audiência de Justificação": "Justificação",
  "Audiência Preliminar": "Preliminar",
  "Audiência de Apresentação": "Apresentação",
  "Audiência Concentrada": "Concentrada",
  "Audiência de Conciliação": "Conciliação",
  "Sessão de Julgamento do Tribunal do Júri": "Júri",
  "Sessão do Tribunal do Júri": "Júri",
  "Tribunal do Júri": "Júri",
  "Sessão de Júri": "Júri",
  "Plenário do Júri": "Júri",
  "Produção Antecipada de Provas": "PAP",
  "Acordo de Não Persecução Penal": "ANPP",
  "Audiência Admonitória": "Admonitória",
  "Oitiva Especial": "Oitiva Especial",
  "Audiência de Retratação": "Retratação",
  "Audiência de Execução": "Execução",
  "Audiência de Progressão": "Progressão",
  "Audiência de Livramento": "Livramento",
  "Audiência de Unificação": "Unificação",
  "Audiência Adminitória": "Adminitória",
  "Adminitória": "Adminitória",
  "Retratação": "Retratação",
  "Audiência de Medidas Protetivas": "Med. Protetivas",
  "Medidas Protetivas": "Med. Protetivas",
  "Audiência": "Audiência",
  "Atendimento": "Atendimento",
  "Reunião": "Reunião",
  "Diligência": "Diligência",
};

// Comparação case-insensitive contra as chaves do mapa (que estão em Title Case).
function lookupTipo(segment: string): string | null {
  const normalized = segment.toLowerCase();
  for (const [chave, abrev] of Object.entries(tipoAbreviacoes)) {
    if (chave.toLowerCase() === normalized) return abrev;
  }
  for (const [chave, abrev] of Object.entries(tipoAbreviacoes)) {
    if (normalized.includes(chave.toLowerCase())) return abrev;
  }
  return null;
}

export function extrairTipo(titulo: string): string {
  // Remove prefixo ADV se presente
  const clean = titulo.replace(/^ADV\s*[-–—]\s*/i, "").replace(/^ADV\s+/i, "");

  // Split em hífen, en-dash OU em-dash (U+2014) — bug original ignorava em-dash.
  const firstSegment = clean.split(/\s*[-–—]\s*/)[0]?.trim() || "";

  const matched = lookupTipo(firstSegment);
  if (matched) return matched;

  if (firstSegment.length <= 20) return toTitleCase(firstSegment);
  return toTitleCase(firstSegment.substring(0, 20)) + "…";
}
```

- [ ] **Step 2.4: Rodar testes — devem passar**

```bash
npx vitest run src/components/agenda/__tests__/extrair-tipo.test.ts
```

Esperado: 8 testes verdes.

- [ ] **Step 2.5: Substituir a versão privada em `day-events-sheet.tsx`**

Em `src/components/agenda/day-events-sheet.tsx`, remover as linhas 59-108 (constante `tipoAbreviacoes` e função `extrairTipo`). No bloco de imports (após a linha 41), adicionar:

```ts
import { extrairTipo } from "./extrair-tipo";
```

- [ ] **Step 2.6: Type-check**

```bash
npm run typecheck 2>/dev/null || npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 2.7: Commit**

```bash
git add src/components/agenda/extrair-tipo.ts \
        src/components/agenda/__tests__/extrair-tipo.test.ts \
        src/components/agenda/day-events-sheet.tsx
git commit -m "fix(agenda): em-dash em extrairTipo + Title Case com siglas"
```

---

## Task 3 — Card do sheet: ações inline (sem chevron)

**Files:**
- Modify: `src/components/agenda/day-events-sheet.tsx` — bloco do card, atual `lines 154` (estado) e `lines 262-516` (renderização)

A reescrita elimina o `expandedId`, transforma o card de botão expansível para um `<div>` com layout de 3 linhas + faixa de ações. Botões secundários ficam visíveis apenas em `group-hover:`.

- [ ] **Step 3.1: Remover estado `expandedId` e import `ChevronDown`/`ChevronRight`**

Em `day-events-sheet.tsx`:

(a) No bloco de imports lucide-react (linhas 5-24), remover `ChevronDown` e `ChevronRight`. O bloco resultante deve manter `X, MapPin, FileText, Clock, Calendar as CalendarIcon, Edit3, Trash2, Copy, Check, CheckCircle2, XCircle, RefreshCw, ExternalLink, User, Scale, StickyNote`.

(b) Na linha ~154, remover:

```ts
const [expandedId, setExpandedId] = useState<string | null>(null);
```

- [ ] **Step 3.2: Reescrever o `map(filteredEventos)` (linhas ~262-516)**

Substituir todo o bloco que renderiza um evento (do `filteredEventos.map((evento) => {` até o fechamento `})` correspondente, antes do `</div>` que fecha `<div className="px-3 pb-4 space-y-2">`) pelo seguinte:

```tsx
filteredEventos.map((evento) => {
  const cancelado = isEventoCancelado(evento.status);
  const concluido = evento.status === "concluido";
  const colors = getAtribuicaoColors(evento.atribuicaoKey || evento.atribuicao);
  const solidColor = cancelado ? "#a1a1aa" : (colors as any).color || "#71717a";
  const tipo = extrairTipo(evento.titulo);
  const assistidoNome = evento.assistido || "";
  const processo = evento.processo || "";

  return (
    <div
      key={evento.id}
      className={cn(
        "group rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 transition-all duration-200",
        cancelado
          ? "opacity-60"
          : "shadow-sm shadow-black/[0.04] hover:shadow-md hover:border-neutral-300/80"
      )}
    >
      {/* Linha principal: dot + tipo/assistido/processo */}
      <div className="flex items-start gap-3 px-3.5 pt-3">
        <div
          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
          style={{ backgroundColor: solidColor }}
        />

        <div className="flex-1 min-w-0">
          {/* Linha 1: hora + tipo */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-bold tabular-nums shrink-0",
                cancelado
                  ? "text-neutral-400 line-through"
                  : "text-neutral-800 dark:text-neutral-200"
              )}
            >
              {evento.horarioInicio || "--:--"}
            </span>
            <span
              className={cn(
                "text-xs font-medium shrink-0 truncate",
                cancelado ? "text-neutral-400" : ""
              )}
              style={cancelado ? undefined : { color: solidColor }}
            >
              {tipo}
            </span>
            {cancelado && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-medium ml-auto shrink-0">
                {evento.status}
              </span>
            )}
          </div>

          {/* Linha 2: nome do assistido */}
          {assistidoNome && (
            <p
              className={cn(
                "text-[13px] font-medium truncate mt-0.5",
                cancelado
                  ? "text-neutral-400 line-through"
                  : "text-neutral-700 dark:text-neutral-300"
              )}
            >
              {assistidoNome}
            </p>
          )}

          {/* Linha 3: processo */}
          {processo && <ProcessoCopyRow processo={processo} cancelado={cancelado} />}
        </div>
      </div>

      {/* Faixa de ações */}
      <div className="mt-2 px-3 pb-2 pt-1.5 border-t border-neutral-100/80 dark:border-neutral-800/40 flex items-center gap-1">
        {/* PRIMÁRIAS — sempre visíveis */}
        {concluido ? (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 px-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Realizado
          </span>
        ) : cancelado ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange?.(evento.id, "confirmado");
              toast.success("Evento restaurado!");
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restaurar
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange?.(evento.id, "concluido");
              toast.success("Marcado como realizado!");
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Realizado
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onEventClick(evento);
          }}
        >
          <ExternalLink className="w-3 h-3" />
          Detalhes
        </Button>

        <span className="flex-1" />

        {/* SECUNDÁRIAS — só no hover do card */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {!concluido && !cancelado && onStatusChange && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(evento.id, "cancelado");
                toast.success("Evento cancelado.");
              }}
              title="Cancelar"
            >
              <XCircle className="w-3.5 h-3.5" />
            </Button>
          )}

          {evento.assistidoId && (
            <Link
              href={`/admin/assistidos/${evento.assistidoId}`}
              onClick={(e) => e.stopPropagation()}
              title="Ver assistido"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <User className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}

          {evento.vinculoDemanda && (
            <Link
              href={`/admin/demandas/${evento.vinculoDemanda}`}
              onClick={(e) => e.stopPropagation()}
              title="Ver demanda"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}

          {onEditEvento && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onEditEvento(evento);
              }}
              title="Editar"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDeleteEvento && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-neutral-400 hover:text-red-500 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEvento(evento.id);
              }}
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});
```

- [ ] **Step 3.3: Type-check + lint**

```bash
npm run lint -- --file src/components/agenda/day-events-sheet.tsx 2>/dev/null || npx eslint src/components/agenda/day-events-sheet.tsx
npx tsc --noEmit
```

Esperado: zero erros. Se houver warning sobre `MapPin`, `Clock`, `StickyNote` não usados, remover do import.

- [ ] **Step 3.4: Limpar imports não usados**

Em `day-events-sheet.tsx`, no bloco lucide-react, remover `MapPin`, `Clock`, `StickyNote` (deixaram de ser usados ao remover o bloco expandido). Manter: `X, FileText, Calendar as CalendarIcon, Edit3, Trash2, Copy, Check, CheckCircle2, XCircle, RefreshCw, ExternalLink, User, Scale`.

Re-rodar `npx tsc --noEmit` — esperado zero erros.

- [ ] **Step 3.5: Verificação visual**

```bash
npm run dev
```

Abrir `http://localhost:3000/admin/agenda`, clicar em um dia com 3+ eventos para abrir o sheet. Conferir:
- Card NÃO tem chevron à direita.
- Botões `Realizado` e `Detalhes` aparecem na faixa inferior **sempre**.
- Hover sobre o card revela ícones de Cancelar/Assistido/Editar/Excluir à direita.
- Clique em `Detalhes` abre o modal (1 clique, não 2).
- Clique em `Realizado` muda status sem expandir nada.

- [ ] **Step 3.6: Commit**

```bash
git add src/components/agenda/day-events-sheet.tsx
git commit -m "feat(agenda): ações inline no card do sheet (sem expansão)"
```

---

## Task 4 — Calendário cabe na altura da viewport

**Files:**
- Modify: `src/components/agenda/calendar-month-view.tsx`
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

A page tem `min-h-screen` e o conteúdo flui empilhado. Para o calendário caber na viewport, o container do calendário precisa receber `flex-1 min-h-0`, e a página precisa estabelecer um `flex flex-col` com altura fixa da viewport.

- [ ] **Step 4.1: Calendar — container raiz vira flex-col**

Em `src/components/agenda/calendar-month-view.tsx`, linha 366:

**Antes:**
```tsx
return (
  <div className="space-y-4">
```

**Depois:**
```tsx
return (
  <div className="flex flex-col gap-4 h-full min-h-0">
```

- [ ] **Step 4.2: Calendar — header fica `shrink-0`, grade fica `flex-1`**

No `Card` que envolve a grade (linha 419), trocar:

**Antes:**
```tsx
<Card className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
```

**Depois:**
```tsx
<Card className="overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex-1 min-h-0 flex flex-col">
```

E no `<div>` que envolve as semanas (linha 433), trocar:

**Antes:**
```tsx
<div>
  {rows.map((week, weekIndex) => (
    <div
      key={weekIndex}
      className="grid grid-cols-7"
    >
```

**Depois:**
```tsx
<div className="flex-1 min-h-0 grid" style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}>
  {rows.map((week, weekIndex) => (
    <div
      key={weekIndex}
      className="grid grid-cols-7 min-h-0"
    >
```

- [ ] **Step 4.3: Calendar — célula sem `min-h` fixo**

Linha 452, na string template da `className` da célula, trocar:

**Antes:**
```tsx
group relative min-h-[80px] sm:min-h-[120px] p-1 sm:p-2 transition-all duration-150 cursor-pointer
```

**Depois:**
```tsx
group relative min-h-0 overflow-hidden p-1 sm:p-2 transition-all duration-150 cursor-pointer flex flex-col
```

- [ ] **Step 4.4: Calendar — lista de eventos com overflow controlado**

Linha 489, trocar:

**Antes:**
```tsx
<div className="space-y-1">
  {dayEvents.slice(0, 3).map((evento) => (
```

**Depois:**
```tsx
<div className="space-y-1 flex-1 min-h-0 overflow-hidden">
  {dayEvents.slice(0, 3).map((evento) => (
```

- [ ] **Step 4.5: Page — wrapper passa a permitir altura calculada**

Em `src/app/(dashboard)/admin/agenda/page.tsx`, linha 1414-1415:

**Antes:**
```tsx
return (
  <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
```

**Depois:**
```tsx
return (
  <div className="h-[100dvh] flex flex-col bg-neutral-100 dark:bg-[#0f0f11] overflow-hidden">
```

- [ ] **Step 4.6: Page — bloco do calendário recebe `flex-1`**

Localizar o bloco `{!selectedPeriodo && (` por volta da linha 1809 e o `<>` de abertura. O conteúdo do `viewMode === "calendar"` precisa de wrapper `flex-1 min-h-0 flex flex-col`. Como existem 3 ramos (calendar/week/list) no mesmo Fragment, envolver o `CalendarMonthView` em um `div` com altura controlada:

**Antes (linhas ~1811-1827):**
```tsx
{viewMode === "calendar" ? (
  <CalendarMonthView
    eventos={eventosFiltrados}
    currentDate={currentDate}
    ...
    headerRight={calendarHeaderRight}
  />
) : viewMode === "week" ? (
```

**Depois:**
```tsx
{viewMode === "calendar" ? (
  <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 lg:px-8 pb-4">
    <CalendarMonthView
      eventos={eventosFiltrados}
      currentDate={currentDate}
      onDateChange={setCurrentDate}
      onEventClick={handleEventClick}
      onDateClick={(date) => {
        setCurrentDate(date);
        setViewMode("list");
      }}
      onCreateClick={handleMonthQuickCreate}
      onEditEvento={handleEditEvento}
      onDeleteEvento={handleDeleteEvento}
      onStatusChange={handleStatusChange}
      onEventDoubleClick={(evento) => { setSelectedEvento(evento); setIsSheetOpen(true); }}
      headerRight={calendarHeaderRight}
    />
  </div>
) : viewMode === "week" ? (
```

> **Atenção:** se a página já adiciona padding (`px-4 sm:px-6 lg:px-8`) ao redor de TODO o conteúdo (não só do calendar), e o wrapper que adicionamos duplicar esse padding, remova o padding do nosso wrapper ou da camada externa. Antes de aplicar, leia 50 linhas acima do ponto de troca para confirmar onde está o padding atual e ajuste para evitar duplicação.

- [ ] **Step 4.7: Verificação visual**

```bash
npm run dev
```

Abrir `http://localhost:3000/admin/agenda` em viewport 1366×768. Testar:
- Mês de 6 semanas (ex.: navegar até `agosto/2026` ou `maio/2026`): grade inteira cabe sem scroll na página.
- Cabeçalho da agenda (filtros, prev/next, "Hoje") sempre visível ao alternar entre meses.
- Cada célula mostra ao menos 2 chips antes do "+N" — se mostrar 0, reduzir o `space-y-1` para `space-y-0.5` na célula.
- Em mobile (375px), continua scrollando normalmente (já que `100dvh` em mobile esconde a barra de URL adequadamente).

- [ ] **Step 4.8: Type-check final**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 4.9: Rodar testes da Task 1 e 2 para garantir que nada regrediu**

```bash
npx vitest run src/lib/utils/__tests__/title-case.test.ts \
               src/components/agenda/__tests__/extrair-tipo.test.ts
```

Esperado: 17 testes verdes (9 + 8).

- [ ] **Step 4.10: Commit**

```bash
git add src/components/agenda/calendar-month-view.tsx \
        "src/app/(dashboard)/admin/agenda/page.tsx"
git commit -m "feat(agenda): calendário cabe na altura da viewport"
```

---

## Critérios de aceite — checklist final

- [ ] `Justificação` (Title Case) aparece no card do sheet em vez de `JUSTIFICAÇÃO — JADSO…`
- [ ] `AIJ`, `ANPP`, `PAP`, `IRDR` continuam em caixa alta
- [ ] Marcar `Realizado` no sheet leva 1 clique
- [ ] Hover no card revela `Cancelar` / `Assistido` / `Editar` / `Excluir` sem layout shift
- [ ] Calendário em mês de 6 semanas cabe em 1366×768 sem scroll na página
- [ ] `npx tsc --noEmit` zero erros
- [ ] `npx vitest run` zero falhas
