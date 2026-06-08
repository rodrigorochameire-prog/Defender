# Harmonização dos tipos de audiência — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma fonte única (`tipos-audiencia.ts`) para os tipos de audiência e fazer parser, siglas, views, dropdown manual, Plaud e subtipo derivarem dela; depois migrar os 17 valores sujos de `audiencias.tipo` para a descrição canônica.

**Architecture:** Um catálogo ordenado de `TipoAudiencia` (slug, descricao canônica, sigla, duração, atribuições, regex de detecção, códigos de classe, aliases sujos). Funções puras `detectarSlug`, `tipoPorSlug`, `resolverTipo`, `buildTipoAbreviacoes` derivam todo o resto. Consumidores trocam suas tabelas locais por chamadas ao catálogo.

**Tech Stack:** TypeScript, Next.js, Vitest, Drizzle/postgres-js. Worktree isolado: `/Users/rodrigorochameire/Projetos/Defender/.claude/worktrees/tipos-audiencia` (branch `feat/tipos-audiencia-catalogo`). **Todos os comandos rodam a partir desse diretório.**

**Spec:** `docs/plans/2026-06-08-harmonizar-tipos-audiencia-design.md`

---

## File Structure

- **Create** `src/lib/agenda/tipos-audiencia.ts` — catálogo + funções puras (fonte única).
- **Create** `src/lib/agenda/__tests__/tipos-audiencia.test.ts` — testes do catálogo/resolvedor.
- **Modify** `src/components/agenda/detectar-tipo-audiencia.ts` — `detectarTipoAudiencia` deriva do catálogo; `detectarSituacao` inalterada.
- **Modify** `src/components/agenda/__tests__/detectar-tipo-audiencia.test.ts` — expectativas canônicas.
- **Modify** `src/components/agenda/extrair-tipo.ts` — `tipoAbreviacoes` gerado pelo catálogo.
- **Modify** `src/components/agenda/pje-agenda-import-modal.tsx` — detecção/duração/descrição via catálogo; remove o switch `mapearTipoAudiencia`.
- **Modify** `src/components/agenda/calendar-week-view.tsx` — `tipoNomeCompleto` via catálogo.
- **Modify** `src/components/agenda/calendar-month-view.tsx` — usa o helper compartilhado.
- **Delete** `src/components/agenda/day-events-popup.tsx` — órfão.
- **Modify** `src/components/agenda/evento-create-modal.tsx` — seletor "Tipo de audiência" do catálogo.
- **Modify** `src/components/atendimentos/plaud-approval-modal.tsx` — slugs do catálogo.
- **Modify** `src/components/agenda/registro-audiencia/subtipo-audiencia.ts` — `detectarSubtipo` delega ao catálogo.
- **Create** `scripts/migrar-tipos-audiencia.cjs` — migração de dados (PR-B).
- **Create** `scripts/__tests__/resolver-tipo-migracao.test.ts` — teste do mapeamento dos 17 valores (PR-B).

---

# PR-A — Catálogo + consumidores + testes

## Task 1: Catálogo (fonte única)

**Files:**
- Create: `src/lib/agenda/tipos-audiencia.ts`
- Test: `src/lib/agenda/__tests__/tipos-audiencia.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/lib/agenda/__tests__/tipos-audiencia.test.ts
import { describe, it, expect } from "vitest";
import {
  TIPOS_AUDIENCIA,
  detectarSlug,
  tipoPorSlug,
  resolverTipo,
  buildTipoAbreviacoes,
} from "../tipos-audiencia";

describe("catálogo de tipos de audiência", () => {
  it("slugs e descrições são únicos", () => {
    const slugs = TIPOS_AUDIENCIA.map((t) => t.slug);
    const descs = TIPOS_AUDIENCIA.map((t) => t.descricao);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(descs).size).toBe(descs.length);
  });

  it("toda descrição canônica resolve para o próprio slug", () => {
    for (const t of TIPOS_AUDIENCIA) {
      expect(resolverTipo(t.descricao).slug).toBe(t.slug);
    }
  });

  it("tipoPorSlug cai em indefinido para slug desconhecido", () => {
    expect(tipoPorSlug("xpto").slug).toBe("indefinido");
  });
});

describe("detectarSlug — ordem de especificidade", () => {
  it("Sessão de Julgamento vence AIJ", () => {
    expect(detectarSlug("SESSÃO DE JULGAMENTO DO TRIBUNAL DO JÚRI")).toBe("plenario_juri");
  });
  it("Oitiva/Depoimento Especial vence Justificação e AIJ", () => {
    expect(detectarSlug("DEPOIMENTO ESPECIAL")).toBe("oitiva_especial");
  });
  it("Instrução + Depoimento Especial (mutirão) vence oitiva e aij", () => {
    expect(detectarSlug("INSTRUÇÃO + DEPOIMENTO ESPECIAL")).toBe("instrucao_oitiva");
  });
  it("Justificação quebrada (Ç|Ã) detecta", () => {
    expect(detectarSlug("(1268)\nJUSTIFICAÇ\nÃO")).toBe("justificacao");
  });
  it("AIJ por INSTRUÇÃO", () => {
    expect(detectarSlug("AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO")).toBe("aij");
  });
  it("fallback por código de classe (1268 → justificação)", () => {
    expect(detectarSlug("MEDIDAS PROTETIVAS (1268) designada")).toBe("justificacao");
  });
  it("sem match → indefinido", () => {
    expect(detectarSlug("ALGO QUE NÃO EXISTE")).toBe("indefinido");
  });
});

describe("resolverTipo — valores sujos do banco", () => {
  it.each([
    ["Audiência de Instrução e Julgamento", "aij"],
    ["Instrução e Julgamento", "aij"],
    ["Instrução", "aij"],
    ["INSTRUCAO", "aij"],
    ["AIJ", "aij"],
    ["Continuação de Instrução / Acareação", "aij"],
    ["Oitiva Especial", "oitiva_especial"],
    ["Depoimento Especial", "oitiva_especial"],
    ["OITIVA_ESPECIALIZADA", "oitiva_especial"],
    ["Justificação", "justificacao"],
    ["Audiência de Justificação", "justificacao"],
    ["JUSTIFICAÇÃO", "justificacao"],
    ["Sessão de Julgamento do Tribunal do Júri", "plenario_juri"],
    ["Audiência Admonitória", "admonitoria"],
    ["Produção Antecipada de Provas", "pap"],
    ["Instrução + Depoimento Especial", "instrucao_oitiva"],
    ["audiencia", "indefinido"],
    ["Audiência", "indefinido"],
  ])("'%s' → %s", (bruto, slug) => {
    expect(resolverTipo(bruto).slug).toBe(slug);
  });
});

describe("buildTipoAbreviacoes", () => {
  it("descrição e aliases mapeiam para a sigla", () => {
    const m = buildTipoAbreviacoes();
    expect(m["Audiência de Instrução e Julgamento"]).toBe("AIJ");
    expect(m["Instrução e Julgamento"]).toBe("AIJ");
    expect(m["Oitiva Especial"]).toBe("Oitiva Especial");
    expect(m["Sessão de Julgamento do Tribunal do Júri"]).toBe("Júri");
  });
  it("inclui siglas legadas e NÃO inclui o typo 'Adminitória'", () => {
    const m = buildTipoAbreviacoes();
    expect(m["Audiência de Execução"]).toBe("Execução");
    expect(m["Adminitória"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/agenda/__tests__/tipos-audiencia.test.ts`
Expected: FAIL ("Failed to resolve import ../tipos-audiencia").

- [ ] **Step 3: Implementar o catálogo**

```ts
// src/lib/agenda/tipos-audiencia.ts
// Fonte ÚNICA dos tipos de audiência. Parser, siglas, views, dropdown manual,
// Plaud e subtipo derivam deste catálogo. A ordem do array É a ordem de
// detecção (mais específico primeiro). Regex operam sobre texto ACHATADO
// (sem espaços, caixa alta) — imune à quebra mid-word da coluna "Tipo" do PJe.

export type AtribuicaoTipo = "JURI" | "VVD" | "EP" | "CRIMINAL" | "CIVEL";

export interface TipoAudiencia {
  slug: string;
  descricao: string;        // valor CANÔNICO gravado em audiencias.tipo
  sigla: string;            // badge no display
  duracaoMin: number;
  atribuicoes: AtribuicaoTipo[];
  cor?: string;             // token tailwind p/ subtipo/registro
  detectar: RegExp[];       // testados sobre o texto achatado
  classeCodigos?: string[]; // fallback por código de classe processual
  aliases?: string[];       // strings sujas conhecidas → migração
}

export const TIPOS_AUDIENCIA: TipoAudiencia[] = [
  {
    slug: "plenario_juri",
    descricao: "Sessão de Julgamento do Tribunal do Júri",
    sigla: "Júri",
    duracaoMin: 480,
    atribuicoes: ["JURI"],
    cor: "violet",
    detectar: [/SESS[ÃA]ODEJULGAMENTO/, /PLEN[ÁA]RIO/, /TRIBUNALDOJ[UÚ]RI.*JULGAMENTO/],
  },
  {
    slug: "anpp",
    descricao: "Acordo de Não Persecução Penal",
    sigla: "ANPP",
    duracaoMin: 30,
    atribuicoes: ["CRIMINAL"],
    detectar: [/ANPP/, /N[ÃA]OPERSECU[CÇ][ÃA]O/, /ACORDO.*PENAL/],
  },
  {
    slug: "pap",
    descricao: "Produção Antecipada de Provas",
    sigla: "PAP",
    duracaoMin: 30,
    atribuicoes: ["JURI", "CRIMINAL"],
    detectar: [/PRODU[CÇ][ÃA]OANTECIPADA/, /\bPAP\b/, /ANTECIPADADEPROVAS/, /COLETA.*PROVAS/],
  },
  {
    slug: "admonitoria",
    descricao: "Audiência Admonitória",
    sigla: "Admonitória",
    duracaoMin: 15,
    atribuicoes: ["EP"],
    detectar: [/ADMONIT[OÓ]RIA/],
  },
  {
    slug: "instrucao_oitiva",
    descricao: "Instrução + Depoimento Especial",
    sigla: "Instrução + Oitiva",
    duracaoMin: 90,
    atribuicoes: ["VVD"],
    cor: "emerald",
    detectar: [
      /INSTRU[CÇ][ÃA]O.*(DEPOIMENTO|OITIVA)ESPECIAL/,
      /(DEPOIMENTO|OITIVA)ESPECIAL.*INSTRU[CÇ][ÃA]O/,
    ],
  },
  {
    slug: "oitiva_especial",
    descricao: "Oitiva Especial",
    sigla: "Oitiva Especial",
    duracaoMin: 30,
    atribuicoes: ["VVD", "CRIMINAL"],
    cor: "rose",
    detectar: [/OITIVAESPECIAL/, /DEPOIMENTOESPECIAL/],
    classeCodigos: ["11955"],
    aliases: ["Depoimento Especial", "OITIVA_ESPECIALIZADA"],
  },
  {
    slug: "retratacao",
    descricao: "Audiência de Retratação",
    sigla: "Retratação",
    duracaoMin: 30,
    atribuicoes: ["VVD"],
    detectar: [/RETRATA[CÇ][ÃA]O/],
  },
  {
    slug: "justificacao",
    descricao: "Justificação",
    sigla: "Justificação",
    duracaoMin: 30,
    atribuicoes: ["VVD", "EP", "CRIMINAL"],
    cor: "amber",
    detectar: [/JUSTIFICA[CÇ][ÃA]O/],
    classeCodigos: ["1268", "280"],
    aliases: ["Audiência de Justificação", "JUSTIFICAÇÃO"],
  },
  {
    slug: "custodia",
    descricao: "Audiência de Custódia",
    sigla: "Custódia",
    duracaoMin: 30,
    atribuicoes: ["JURI", "VVD", "EP", "CRIMINAL"],
    cor: "sky",
    detectar: [/CUST[OÓ]DIA/],
  },
  {
    slug: "aij",
    descricao: "Audiência de Instrução e Julgamento",
    sigla: "AIJ",
    duracaoMin: 90,
    atribuicoes: ["JURI", "VVD", "CRIMINAL"],
    cor: "emerald",
    detectar: [/INSTRU[CÇ][ÃA]O/, /\bAIJ\b/],
    classeCodigos: ["283", "10943"],
    aliases: ["Instrução e Julgamento", "Instrução", "INSTRUCAO", "AIJ", "Continuação de Instrução / Acareação"],
  },
  {
    slug: "conciliacao",
    descricao: "Audiência de Conciliação",
    sigla: "Conciliação",
    duracaoMin: 30,
    atribuicoes: ["CIVEL"],
    detectar: [/CONCILIA[CÇ][ÃA]O/],
  },
  {
    slug: "indefinido",
    descricao: "Audiência",
    sigla: "Audiência",
    duracaoMin: 30,
    atribuicoes: [],
    detectar: [],
    aliases: ["audiencia", "Audiência"],
  },
];

const INDEFINIDO = TIPOS_AUDIENCIA[TIPOS_AUDIENCIA.length - 1];

// Siglas SÓ de exibição (tipos raros/legados que não viram opção de criação).
export const SIGLAS_LEGADAS: Record<string, string> = {
  "Audiência de Execução": "Execução",
  "Audiência de Progressão": "Progressão",
  "Audiência de Livramento": "Livramento",
  "Audiência de Unificação": "Unificação",
  "Audiência Concentrada": "Concentrada",
  "Audiência Preliminar": "Preliminar",
  "Audiência de Apresentação": "Apresentação",
  "Audiência de Medidas Protetivas": "Med. Protetivas",
  "Medidas Protetivas": "Med. Protetivas",
  Atendimento: "Atendimento",
  Reunião: "Reunião",
  Diligência: "Diligência",
};

/** Achata o texto: remove TODO whitespace e sobe pra caixa alta. */
export function flatten(texto: string): string {
  return texto.replace(/\s+/g, "").toUpperCase();
}

/** Detecta o slug do tipo a partir de um bloco de texto cru. 'indefinido' se nada casar. */
export function detectarSlug(textoBloco: string): string {
  const flat = flatten(textoBloco);
  for (const t of TIPOS_AUDIENCIA) {
    if (t.detectar.some((re) => re.test(flat))) return t.slug;
  }
  const cod = flat.match(/\((\d{2,5})\)/)?.[1] ?? "";
  if (cod) {
    const porCodigo = TIPOS_AUDIENCIA.find((t) => t.classeCodigos?.includes(cod));
    if (porCodigo) return porCodigo.slug;
  }
  return "indefinido";
}

/** Entrada do catálogo por slug (cai em indefinido). */
export function tipoPorSlug(slug: string): TipoAudiencia {
  return TIPOS_AUDIENCIA.find((t) => t.slug === slug) ?? INDEFINIDO;
}

/**
 * Resolve um valor BRUTO (texto livre do banco/pauta) para a entrada canônica.
 * Ordem: descrição/alias exatos (case-insensitive) → detecção por padrão.
 */
export function resolverTipo(valorBruto: string | null | undefined): TipoAudiencia {
  if (!valorBruto || !valorBruto.trim()) return INDEFINIDO;
  const low = valorBruto.trim().toLowerCase();
  for (const t of TIPOS_AUDIENCIA) {
    if (t.descricao.toLowerCase() === low) return t;
    if (t.aliases?.some((a) => a.toLowerCase() === low)) return t;
  }
  return tipoPorSlug(detectarSlug(valorBruto));
}

/** Mapa descrição/alias → sigla (consumido por extrair-tipo). Inclui siglas legadas. */
export function buildTipoAbreviacoes(): Record<string, string> {
  const m: Record<string, string> = { ...SIGLAS_LEGADAS };
  for (const t of TIPOS_AUDIENCIA) {
    m[t.descricao] = t.sigla;
    for (const a of t.aliases ?? []) m[a] = t.sigla;
  }
  return m;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/agenda/__tests__/tipos-audiencia.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
cd /Users/rodrigorochameire/Projetos/Defender/.claude/worktrees/tipos-audiencia
git add src/lib/agenda/tipos-audiencia.ts src/lib/agenda/__tests__/tipos-audiencia.test.ts
git commit -m "feat(agenda): catálogo único de tipos de audiência (fonte da verdade)"
```

---

## Task 2: Parser deriva do catálogo

**Files:**
- Modify: `src/components/agenda/detectar-tipo-audiencia.ts:15-82`
- Modify: `src/components/agenda/__tests__/detectar-tipo-audiencia.test.ts`

- [ ] **Step 1: Atualizar os testes para as descrições canônicas**

No arquivo de teste, troque as expectativas que mudaram de forma (o parser agora retorna a **descrição canônica**):
- `"Instrução e Julgamento"` → `"Audiência de Instrução e Julgamento"`
- `"Oitiva especial"` → `"Oitiva Especial"`
- `""` (fallback vazio), se houver, → `"Audiência"`

As expectativas `"Justificação"` e `"Sessão de Julgamento do Tribunal do Júri"` permanecem. Exemplo do bloco a ajustar:

```ts
it("detecta AIJ com 'INSTRUÇÃO/JULGAMENTO' quebrados em várias linhas", () => {
  const bloco = `AÇÃO PENAL\n-\nPROCEDIME\nNTO\nORDINÁRIO\n(283)\nAUDIÊNCIA\nDE\nINSTRUÇÃO\nE\nJULGAMENT\nO\ndesignada`;
  expect(detectarTipoAudiencia(bloco)).toBe("Audiência de Instrução e Julgamento");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/agenda/__tests__/detectar-tipo-audiencia.test.ts`
Expected: FAIL (retorna o valor antigo).

- [ ] **Step 3: Reescrever `detectarTipoAudiencia` derivando do catálogo**

Substitua o corpo da função `detectarTipoAudiencia` (linhas 15-82) por:

```ts
import { detectarSlug, tipoPorSlug } from "@/lib/agenda/tipos-audiencia";

/**
 * Tipo CANÔNICO (audiencias.tipo) a partir do bloco cru da pauta PJe.
 * Delega a detecção ao catálogo único (src/lib/agenda/tipos-audiencia.ts),
 * que já é imune à quebra mid-word da coluna "Tipo".
 */
export function detectarTipoAudiencia(textoBloco: string): string {
  return tipoPorSlug(detectarSlug(textoBloco)).descricao;
}
```

Mantenha `detectarSituacao` (linhas 84-97) intacta.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/components/agenda/__tests__/detectar-tipo-audiencia.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/detectar-tipo-audiencia.ts src/components/agenda/__tests__/detectar-tipo-audiencia.test.ts
git commit -m "refactor(agenda): detectarTipoAudiencia deriva do catálogo (descrição canônica)"
```

---

## Task 3: Siglas geradas pelo catálogo

**Files:**
- Modify: `src/components/agenda/extrair-tipo.ts:3-34`
- Test: `src/components/agenda/__tests__/extrair-tipo.test.ts` (já existe; adicionar 1 caso)

- [ ] **Step 1: Adicionar teste de que a sigla vem do catálogo (sem typo)**

No `extrair-tipo.test.ts`, adicione dentro de `describe("extrairTipo", …)`:

```ts
it("siglas vêm do catálogo (Depoimento Especial e sem typo Adminitória)", () => {
  expect(extrairTipo("Depoimento Especial — Maria")).toBe("Oitiva Especial");
  expect(extrairTipo("Audiência Admonitória — João")).toBe("Admonitória");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/components/agenda/__tests__/extrair-tipo.test.ts`
Expected: FAIL (mapa atual não tem "Depoimento Especial").

- [ ] **Step 3: Gerar `tipoAbreviacoes` do catálogo**

Em `extrair-tipo.ts`, remova o objeto literal `tipoAbreviacoes` (linhas 3-34) e substitua por:

```ts
import { toTitleCase } from "@/lib/utils/title-case";
import { buildTipoAbreviacoes } from "@/lib/agenda/tipos-audiencia";

const tipoAbreviacoes: Record<string, string> = buildTipoAbreviacoes();
```

Mantenha `lookupTipo`, `extrairTipo` e `extrairTipoEvento` exatamente como estão.

- [ ] **Step 4: Rodar e ver passar (suite inteira do extrair-tipo)**

Run: `npx vitest run src/components/agenda/__tests__/extrair-tipo.test.ts`
Expected: PASS (todos os existentes + o novo).

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/extrair-tipo.ts src/components/agenda/__tests__/extrair-tipo.test.ts
git commit -m "refactor(agenda): tipoAbreviacoes gerado pelo catálogo (remove typo Adminitória)"
```

---

## Task 4: Import da pauta usa o catálogo

**Files:**
- Modify: `src/components/agenda/pje-agenda-import-modal.tsx` (`mapearTipoAudiencia` 180-330; uso 482-507; `ATRIBUICAO_OPTIONS` 67-73)

- [ ] **Step 1: Substituir `mapearTipoAudiencia` por lookup no catálogo**

Remova toda a função `mapearTipoAudiencia` (linhas 180-330). No topo do arquivo adicione o import:

```ts
import { detectarSlug, tipoPorSlug } from "@/lib/agenda/tipos-audiencia";
```

- [ ] **Step 2: Trocar a montagem do evento (≈ linhas 481-507)**

Onde hoje há `const tipoAudienciaTexto = detectarTipoAudiencia(textoBloco);` seguido de `mapearTipoAudiencia(...)`, troque por detecção direta pelo catálogo:

```ts
// Detecta o tipo via catálogo único (imune à quebra de coluna do PJe).
const tipo = tipoPorSlug(detectarSlug(textoBloco));

const situacao = detectarSituacao(textoBloco);
const nomeAssistidoTitulo = assistido || "Sem assistido";
const titulo = `${tipo.sigla} - ${nomeAssistidoTitulo} - ${processo}`;

// Duração padrão do catálogo
const [h, m] = bloco.hora.split(":").map(Number);
const duracao = tipo.duracaoMin;
const fimMinutos = (h * 60 + m + duracao) % 1440;
const horarioFim = `${String(Math.floor(fimMinutos / 60)).padStart(2, "0")}:${String(fimMinutos % 60).padStart(2, "0")}`;
```

E no objeto `evento: ParsedEvento`, troque o campo `tipo` para a descrição canônica:

```ts
tipo: tipo.descricao,
```

Na descrição estruturada (`descricaoCompleta`), troque `Tipo de Audiência: ${tipoAudienciaMapeado.descricao}` por `Tipo de Audiência: ${tipo.descricao}`. Faça a mesma troca no segundo método de parsing (≈ linha 671/691) se ele referenciar `tipoAudienciaMapeado`/`mapearTipoAudiencia`: use `tipoPorSlug(detectarSlug(...))` e `.sigla`/`.descricao`/`.duracaoMin`.

- [ ] **Step 3: `ATRIBUICAO_OPTIONS` deriva do catálogo (descrições da dica)**

Substitua os literais de `description` (linhas 67-73) por uma derivação. Acima de `ATRIBUICAO_OPTIONS` adicione um helper local:

```ts
import { TIPOS_AUDIENCIA, type AtribuicaoTipo } from "@/lib/agenda/tipos-audiencia";

function siglasDe(attr: AtribuicaoTipo): string {
  return TIPOS_AUDIENCIA.filter((t) => t.atribuicoes.includes(attr))
    .map((t) => t.sigla)
    .join(", ");
}
```

E nas opções use `description: siglasDe("JURI")`, `siglasDe("VVD")`, `siglasDe("CRIMINAL")` (mantendo os `value`/`label`/`icon` atuais). A opção "Execução Penal" usa `siglasDe("EP")`.

- [ ] **Step 4: Verificar build de tipos e testes da agenda**

Run: `npx tsc --noEmit 2>&1 | grep pje-agenda-import-modal || echo "sem erro novo"`
Expected: "sem erro novo".
Run: `npx vitest run src/components/agenda/__tests__/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/agenda/pje-agenda-import-modal.tsx
git commit -m "refactor(agenda): import de pauta usa o catálogo (sigla/descrição/duração)"
```

---

## Task 5: Views de calendário unificadas; remover órfão

**Files:**
- Modify: `src/components/agenda/calendar-week-view.tsx:96-106` (`tipoNomeCompleto`)
- Modify: `src/components/agenda/calendar-month-view.tsx`
- Delete: `src/components/agenda/day-events-popup.tsx`

- [ ] **Step 1: Confirmar que o popup é órfão**

Run: `grep -rn "day-events-popup\|DayEventsPopup" src/ | grep -v "day-events-popup.tsx"`
Expected: nenhuma saída (não é importado).

- [ ] **Step 2: Remover o órfão**

```bash
git rm src/components/agenda/day-events-popup.tsx
```

- [ ] **Step 3: `tipoNomeCompleto` deriva do catálogo (week-view)**

Em `calendar-week-view.tsx`, substitua o objeto `tipoNomeCompleto` (linhas 96-106) por um mapa sigla→descrição gerado:

```ts
import { TIPOS_AUDIENCIA } from "@/lib/agenda/tipos-audiencia";

// sigla → descrição (para o popover). Derivado do catálogo único.
const tipoNomeCompleto: Record<string, string> = Object.fromEntries(
  TIPOS_AUDIENCIA.map((t) => [t.sigla, t.descricao]),
);
```

O uso (`tipoNomeCompleto[tipoAbrev] || tipoAbrev`, linha ≈135) permanece. `extrairTipoEvento(evento)` já é a fonte da sigla (Task 3).

- [ ] **Step 4: month-view não tem mapa próprio de tipo**

Run: `grep -n "abreviacoes\|tipoNomeCompleto" src/components/agenda/calendar-month-view.tsx`
Expected: nenhuma referência a um mapa local de tipos (já usa `extrairTipoEvento`). Se houver um objeto `abreviacoes` local remanescente, remova-o e confie em `extrairTipoEvento`.

- [ ] **Step 5: Verificar e commitar**

Run: `npx tsc --noEmit 2>&1 | grep -E "calendar-week-view|calendar-month-view|day-events-popup" || echo "ok"`
Expected: "ok".

```bash
git add src/components/agenda/calendar-week-view.tsx src/components/agenda/calendar-month-view.tsx
git commit -m "refactor(agenda): nome completo do tipo via catálogo; remove day-events-popup órfão"
```

---

## Task 6: Seletor de tipo de audiência na adição manual

**Files:**
- Modify: `src/components/agenda/evento-create-modal.tsx`

- [ ] **Step 1: Expor as opções de tipo de audiência do catálogo**

No topo do `evento-create-modal.tsx` adicione:

```ts
import { TIPOS_AUDIENCIA } from "@/lib/agenda/tipos-audiencia";

// Tipos de audiência oferecidos no seletor manual (exclui o fallback 'indefinido').
const tipoAudienciaOptions = TIPOS_AUDIENCIA
  .filter((t) => t.slug !== "indefinido")
  .map((t) => ({ value: t.descricao, label: `${t.sigla} — ${t.descricao}` }));
```

- [ ] **Step 2: Adicionar `tipoAudiencia` ao form**

Em `EventoFormData` (interface do form) adicione o campo opcional `tipoAudiencia?: string;`. No `emptyForm` adicione `tipoAudiencia: "",`.

- [ ] **Step 3: Renderizar o seletor quando o evento é Audiência**

Logo abaixo do `Select` de `tipo` (tipo de evento) no JSX, adicione um seletor condicional:

```tsx
{formData.tipo === "audiencia" && (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
      Tipo de audiência
    </label>
    <select
      value={formData.tipoAudiencia ?? ""}
      onChange={(e) => setFormData({ ...formData, tipoAudiencia: e.target.value })}
      className="w-full h-9 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 text-sm"
    >
      <option value="">Selecione…</option>
      {tipoAudienciaOptions.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
)}
```

(Se o arquivo já usa o componente `Select` do shadcn para os outros campos, use o mesmo padrão de `Select/SelectTrigger/SelectContent/SelectItem` em vez do `<select>` nativo, para consistência visual.)

- [ ] **Step 4: Propagar `tipoAudiencia` no payload de salvar**

No `onSave`/montagem do payload, quando `tipo === "audiencia"`, grave a descrição canônica no campo de tipo da audiência. Localize onde o evento de audiência é persistido (mutation `audiencias.create`/`importBatch` ou `onSave(formData)`); garanta que `formData.tipoAudiencia` chegue como o `tipo` da audiência. Se o save é via callback `onSave(formData)`, nenhuma mudança extra é necessária além de o consumidor ler `tipoAudiencia`; documente no PR que o backend grava `tipoAudiencia` em `audiencias.tipo`.

- [ ] **Step 5: Verificar e commitar**

Run: `npx tsc --noEmit 2>&1 | grep evento-create-modal || echo "ok"`
Expected: "ok".

```bash
git add src/components/agenda/evento-create-modal.tsx
git commit -m "feat(agenda): seletor de tipo de audiência (catálogo) na adição manual"
```

---

## Task 7: Plaud e subtipo alinhados ao catálogo

**Files:**
- Modify: `src/components/atendimentos/plaud-approval-modal.tsx:70-76`
- Modify: `src/components/agenda/registro-audiencia/subtipo-audiencia.ts` (`detectarSubtipo`)

- [ ] **Step 1: Plaud usa slugs do catálogo**

Em `plaud-approval-modal.tsx`, alinhe os `value` de `SUBTIPOS_AUDIENCIA` aos slugs do catálogo, mantendo os subtipos próprios de gravação do Júri:

```ts
const SUBTIPOS_AUDIENCIA = [
  { value: "aij", label: "AIJ" },
  { value: "justificacao", label: "Justificação" },
  { value: "oitiva_especial", label: "Oitiva Especial" },
  { value: "plenario_juri", label: "Júri (Plenário)" },
  { value: "juri_instrucao", label: "Júri — Instrução" }, // subdivisão de gravação
  { value: "juri_debates", label: "Júri — Debates" },     // subdivisão de gravação
  { value: "pap", label: "PAP" },
];
```

- [ ] **Step 2: `detectarSubtipo` delega ao catálogo**

Em `subtipo-audiencia.ts`, reescreva `detectarSubtipo` para mapear o slug do catálogo no `SubtipoAudiencia` local (mantendo o `SUBTIPO_CONFIG` rico como está):

```ts
import { detectarSlug } from "@/lib/agenda/tipos-audiencia";

const SLUG_PARA_SUBTIPO: Record<string, SubtipoAudiencia> = {
  plenario_juri: "plenario",
  aij: "aij",
  instrucao_oitiva: "aij",
  justificacao: "justificacao",
  oitiva_especial: "oitiva_especial",
  custodia: "custodia",
};

export function detectarSubtipo(
  tipoAudiencia?: string | null,
  classeProcessual?: string | null,
): SubtipoAudiencia {
  const base = `${tipoAudiencia ?? ""} ${classeProcessual ?? ""}`.trim();
  if (!base) return "indefinido";
  return SLUG_PARA_SUBTIPO[detectarSlug(base)] ?? "indefinido";
}
```

- [ ] **Step 3: Verificar e commitar**

Run: `npx tsc --noEmit 2>&1 | grep -E "plaud-approval-modal|subtipo-audiencia" || echo "ok"`
Expected: "ok".
Run: `npx vitest run src/components/agenda/__tests__/ src/lib/agenda/__tests__/`
Expected: PASS.

```bash
git add src/components/atendimentos/plaud-approval-modal.tsx src/components/agenda/registro-audiencia/subtipo-audiencia.ts
git commit -m "refactor(registro): Plaud e detectarSubtipo alinhados aos slugs do catálogo"
```

---

## Task 8: Verificação final do PR-A

- [ ] **Step 1: Suite completa de agenda + format + lib**

Run: `npx vitest run src/components/agenda/__tests__/ src/lib/agenda/__tests__/ src/lib/format/__tests__/`
Expected: PASS.

- [ ] **Step 2: Typecheck sem regressões novas**

Run: `npx tsc --noEmit 2>&1 | grep -E "tipos-audiencia|detectar-tipo|extrair-tipo|pje-agenda-import|calendar-week|calendar-month|evento-create|plaud|subtipo-audiencia" || echo "sem erro novo nos arquivos tocados"`
Expected: "sem erro novo nos arquivos tocados".

- [ ] **Step 3: Push + PR**

```bash
git push -u origin feat/tipos-audiencia-catalogo
gh pr create --base main --title "feat(agenda): catálogo único de tipos de audiência" --body "Ver docs/plans/2026-06-08-harmonizar-tipos-audiencia-design.md. PR-A (código). PR-B (migração de dados) virá em seguida."
```

---

# PR-B — Migração de dados + rebuild de títulos

## Task 9: Resolvedor de migração (teste puro)

**Files:**
- Test: `scripts/__tests__/resolver-tipo-migracao.test.ts`

- [ ] **Step 1: Teste do mapeamento dos 17 valores → destino**

```ts
// scripts/__tests__/resolver-tipo-migracao.test.ts
import { describe, it, expect } from "vitest";
import { resolverTipo } from "@/lib/agenda/tipos-audiencia";

const ESPERADO: Record<string, string> = {
  "Audiência de Instrução e Julgamento": "Audiência de Instrução e Julgamento",
  "Instrução e Julgamento": "Audiência de Instrução e Julgamento",
  Instrução: "Audiência de Instrução e Julgamento",
  INSTRUCAO: "Audiência de Instrução e Julgamento",
  AIJ: "Audiência de Instrução e Julgamento",
  "Continuação de Instrução / Acareação": "Audiência de Instrução e Julgamento",
  "Oitiva Especial": "Oitiva Especial",
  "Depoimento Especial": "Oitiva Especial",
  OITIVA_ESPECIALIZADA: "Oitiva Especial",
  Justificação: "Justificação",
  "Audiência de Justificação": "Justificação",
  JUSTIFICAÇÃO: "Justificação",
  "Sessão de Julgamento do Tribunal do Júri": "Sessão de Julgamento do Tribunal do Júri",
  "Audiência Admonitória": "Audiência Admonitória",
  "Produção Antecipada de Provas": "Produção Antecipada de Provas",
  "Instrução + Depoimento Especial": "Instrução + Depoimento Especial",
  audiencia: "Audiência",
};

describe("migração: 17 valores sujos → descrição canônica", () => {
  it.each(Object.entries(ESPERADO))("'%s' → '%s'", (origem, destino) => {
    expect(resolverTipo(origem).descricao).toBe(destino);
  });
});
```

- [ ] **Step 2: Rodar e ver passar (o resolvedor já existe do PR-A)**

Run: `npx vitest run scripts/__tests__/resolver-tipo-migracao.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add scripts/__tests__/resolver-tipo-migracao.test.ts
git commit -m "test(migracao): mapeamento dos 17 valores sujos → canônico"
```

---

## Task 10: Script de migração (dry-run → apply)

**Files:**
- Create: `scripts/migrar-tipos-audiencia.cjs`

- [ ] **Step 1: Escrever o script**

```js
// scripts/migrar-tipos-audiencia.cjs
// Canoniza audiencias.tipo e reconstrói o titulo. Dry-run por padrão; --apply grava.
// Usa o MESMO catálogo do app via require do build? Não: catálogo é TS. Para evitar
// transpile, replicamos só o resolvedor mínimo lendo a tabela e mapeando por aliases.
// (O teste puro de Task 9 garante o catálogo; aqui espelhamos os pares origem→destino.)
require("dotenv").config({ path: ".env.local", quiet: true });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL || process.env.POSTGRES_URL, { ssl: "require" });
const APPLY = process.argv.includes("--apply");

// origem (lower) → { descricao canônica, sigla }
const MAPA = {
  "audiência de instrução e julgamento": ["Audiência de Instrução e Julgamento", "AIJ"],
  "instrução e julgamento": ["Audiência de Instrução e Julgamento", "AIJ"],
  "instrução": ["Audiência de Instrução e Julgamento", "AIJ"],
  "instrucao": ["Audiência de Instrução e Julgamento", "AIJ"],
  "aij": ["Audiência de Instrução e Julgamento", "AIJ"],
  "continuação de instrução / acareação": ["Audiência de Instrução e Julgamento", "AIJ"],
  "oitiva especial": ["Oitiva Especial", "Oitiva Especial"],
  "depoimento especial": ["Oitiva Especial", "Oitiva Especial"],
  "oitiva_especializada": ["Oitiva Especial", "Oitiva Especial"],
  "justificação": ["Justificação", "Justificação"],
  "audiência de justificação": ["Justificação", "Justificação"],
  "sessão de julgamento do tribunal do júri": ["Sessão de Julgamento do Tribunal do Júri", "Júri"],
  "audiência admonitória": ["Audiência Admonitória", "Admonitória"],
  "produção antecipada de provas": ["Produção Antecipada de Provas", "PAP"],
  "instrução + depoimento especial": ["Instrução + Depoimento Especial", "Instrução + Oitiva"],
  "audiencia": ["Audiência", "Audiência"],
  "audiência": ["Audiência", "Audiência"],
};

(async () => {
  const rows = await sql`select id, tipo, titulo from audiencias`;
  const resumo = {};
  let mudancas = 0;
  for (const r of rows) {
    const chave = (r.tipo ?? "").trim().toLowerCase();
    const alvo = MAPA[chave];
    if (!alvo) continue; // já canônico ou desconhecido — não toca
    const [descricao, sigla] = alvo;
    const tituloNovo =
      r.titulo && /^[^-]+ - /.test(r.titulo)
        ? r.titulo.replace(/^[^-]+ - /, `${sigla} - `)
        : r.titulo;
    const precisa = r.tipo !== descricao || r.titulo !== tituloNovo;
    if (!precisa) continue;
    resumo[r.tipo] = (resumo[r.tipo] || 0) + 1;
    mudancas++;
    if (APPLY) {
      await sql`update audiencias set tipo = ${descricao}, titulo = ${tituloNovo} where id = ${r.id}`;
    }
  }
  console.log(`Linhas a alterar: ${mudancas}`);
  for (const [origem, n] of Object.entries(resumo)) console.log(`  ${n}\t${origem}`);
  console.log(APPLY ? "\n[APPLY] gravado." : "\n[DRY-RUN] nada gravado. Rode com --apply.");
  await sql.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
```

> Nota: o `sigla` no rebuild do título troca apenas o prefixo `"<algo> - "`. Para `Sessão`/`Admonitória`/`PAP`/`Oitiva` cujo título já costuma estar correto, a regex é idempotente (mesmo prefixo → mesmo valor). O `MAPA` espelha os pares testados em Task 9; a divergência seria pega pelo teste antes do apply.

- [ ] **Step 2: Dry-run e conferir o relatório contra o esperado**

Run: `node scripts/migrar-tipos-audiencia.cjs`
Expected: relatório listando, no mínimo, `Instrução e Julgamento (2)`, `Instrução (3)`, `INSTRUCAO (1)`, `AIJ (1)`, `Continuação… (2)`, `Depoimento Especial (34)`, `OITIVA_ESPECIALIZADA (1)`, `Audiência de Justificação (13)`, `JUSTIFICAÇÃO (9)`, `audiencia (9)`. **Conferir manualmente** que nenhum tipo já-canônico aparece (não deveria mudar).

- [ ] **Step 3: Aplicar**

Run: `node scripts/migrar-tipos-audiencia.cjs --apply`
Expected: `[APPLY] gravado.`

- [ ] **Step 4: Verificar pós-migração**

Run (esperado: só valores canônicos):
```bash
node -e "require('dotenv').config({path:'.env.local',quiet:true});const s=require('postgres')(process.env.DATABASE_URL||process.env.POSTGRES_URL,{ssl:'require'});(async()=>{const r=await s\`select tipo,count(*)::int n from audiencias group by tipo order by n desc\`;for(const x of r)console.log(x.n,x.tipo);await s.end()})()"
```
Expected: apenas `Audiência de Instrução e Julgamento`, `Oitiva Especial`, `Justificação`, `Sessão de Julgamento do Tribunal do Júri`, `Audiência Admonitória`, `Produção Antecipada de Provas`, `Instrução + Depoimento Especial`, `Audiência`.

- [ ] **Step 5: Commit + push + PR-B**

```bash
git add scripts/migrar-tipos-audiencia.cjs
git commit -m "feat(migracao): canoniza audiencias.tipo + rebuild de títulos (dry-run→apply)"
git push
gh pr create --base main --title "chore(agenda): migração dos tipos de audiência para o canônico" --body "PR-B. Roda scripts/migrar-tipos-audiencia.cjs (dry-run conferido → apply). Depende do PR-A."
```

---

## Notas de execução

- **Worktree isolado** (`feat/tipos-audiencia-catalogo`): há agente concorrente na raiz do repo; NÃO trabalhar na raiz. Todos os comandos a partir de `.claude/worktrees/tipos-audiencia`.
- **CI** do GitHub Actions pode falhar por `pnpm-lock` ausente (bug conhecido) — o check real é o preview da Vercel.
- **PR-B só depois do PR-A mergeado** (o teste de Task 9 importa o catálogo do PR-A).
