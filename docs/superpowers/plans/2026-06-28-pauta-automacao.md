# Automação da pauta de audiências — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar automaticamente a pauta de audiências do PJe (worker raspa a tabela → staging → revisão → cria/atualiza audiências), espelhando o pipeline de intimações e reusando o `importBatch` existente.

**Architecture:** Worker browser (Python) raspa `PautaAudiencia/listView.seam` → `pauta_import_staging`. Os helpers de parsing são extraídos para um módulo TS único (`src/lib/agenda/parse-pauta.ts`), usado tanto pelo modal de texto quanto pelo `confirmarImport`. O core do `importBatch` é extraído para `importar-audiencias.ts` e reusado servidor-a-servidor. UI no Padrão Defender v5.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, PostgreSQL (Supabase), Vitest, Patchright/Playwright (CDP), Python (browser lane), Tailwind.

**Spec:** `docs/superpowers/specs/2026-06-28-pauta-automacao-design.md`

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `src/lib/agenda/parse-pauta.ts` | Helpers puros de parsing (fonte única): atribuição, assistidos, situação, linha→evento | Criar |
| `src/lib/agenda/__tests__/parse-pauta.test.ts` | Testes unitários dos helpers | Criar |
| `src/lib/agenda/importar-audiencias.ts` | Core do `importBatch` extraído (reusável servidor-a-servidor) | Criar |
| `src/lib/trpc/routers/audiencias.ts` | `importBatch` passa a delegar ao core extraído | Modificar |
| `src/components/agenda/pje-agenda-import-modal.tsx` | Passa a importar helpers de `parse-pauta.ts` (sem duplicação) | Modificar |
| `src/lib/db/schema/pauta-import.ts` | Tabela `pauta_import_staging` (Drizzle) | Criar |
| `src/lib/db/schema/index.ts` | Re-export do novo schema | Modificar |
| `.claude/skills/importar-pauta/scripts/importar_pauta.py` | Worker browser: raspa a pauta → staging | Criar |
| `.claude/skills/importar-pauta/scripts/test_importar_pauta.py` | Testes dos helpers puros do worker | Criar |
| `.claude/skills/importar-pauta/SKILL.md` | Doc do worker | Criar |
| `scripts/browser-broker-daemon.mjs` | Registrar skill `importar-pauta` | Modificar |
| `src/lib/trpc/routers/pauta.ts` | `criarImportJob` / `listStaging` / `confirmarImport` | Criar |
| `src/lib/trpc/routers/index.ts` (root router) | Registrar `pauta` router | Modificar |
| `src/components/agenda/atualizar-pauta-modal.tsx` | Modal "Do PJe / Colar texto" (Padrão Defender v5) | Criar |
| Página da Agenda (header) | Botão "Atualizar pauta" | Modificar |

**Princípio de qualidade:** o worker NUNCA aplica regra de negócio — só raspa colunas brutas. Toda derivação (assistido, atribuição, tipo, situação) acontece no TS via `parse-pauta.ts`, fonte única usada pelos dois caminhos.

---

## Task 1: Extrair helpers de parsing → `parse-pauta.ts`

**Files:**
- Create: `src/lib/agenda/parse-pauta.ts`
- Test: `src/lib/agenda/__tests__/parse-pauta.test.ts`
- Reference (copiar lógica): `src/components/agenda/pje-agenda-import-modal.tsx:80-189` (toTitleCase, mapearAtribuicao, extrairAssistido, mapearSituacao) e `:253-307` (regexAssistido + filtro não-pessoa + dedup)
- Reuse: `@/lib/utils/title-case` (NAME_ACCENTS), `@/lib/agenda/tipos-audiencia` (detectarSlug, tipoPorSlug), `@/components/agenda/detectar-tipo-audiencia` (detectarSituacao)

- [ ] **Step 1: Escrever os testes (falhando)**

```typescript
// src/lib/agenda/__tests__/parse-pauta.test.ts
import { describe, it, expect } from "vitest";
import { mapearAtribuicao, extrairAssistidos, mapearSituacao, linhaParaEvento } from "../parse-pauta";

describe("extrairAssistidos", () => {
  it("pega o réu (polo após X), ignora o requerente em segredo", () => {
    const r = extrairAssistidos("Em segredo de justiça - CPF: 783.125.405-63 (REQUERENTE) X MARCELO AUGUSTO BARROS SA BARRETO - CPF: 514.967.805-82 (REQUERIDO)");
    expect(r.map(a => a.nome)).toEqual(["Marcelo Augusto Barros Sa Barreto"]);
    expect(r[0].cpf).toBe("514.967.805-82");
  });
  it("extrai múltiplos réus ligados por 'e', sem o 'e' no nome", () => {
    const r = extrairAssistidos("DEAM CAMAÇARI (REQUERENTE) X ALMIR OLIVEIRA - CPF: 700.800.205-00 (REQUERIDO) e HIDELBRANDO DIAS DOS SANTOS - CPF: 348.079.185-91 (REQUERIDO)");
    expect(r.map(a => a.nome)).toEqual(["Almir Oliveira", "Hidelbrando Dias Dos Santos"]);
  });
  it("captura AUTORIDADE no polo passivo e ignora MP no polo ativo", () => {
    const r = extrairAssistidos("Ministério Público do Estado da Bahia - CNPJ: 04.142.491/0001-66 (AUTORIDADE) X ROSIANE MACHADO DE OLIVEIRA - CPF: 071.163.585-44 (AUTORIDADE)");
    expect(r.map(a => a.nome)).toEqual(["Rosiane Machado De Oliveira"]);
  });
  it("filtra não-pessoas (DEAM, VARA, segredo)", () => {
    const r = extrairAssistidos("X DEAM CAMAÇARI (REQUERIDO)");
    expect(r).toEqual([]);
  });
});

describe("mapearAtribuicao", () => {
  it("Vara do Júri e Execuções Penais → Tribunal do Júri (não EP)", () => {
    expect(mapearAtribuicao("VARA DO JÚRI E EXECUÇÕES PENAIS DE CAMAÇARI", "AÇÃO PENAL", "")).toBe("Tribunal do Júri");
  });
  it("VVD por órgão julgador", () => {
    expect(mapearAtribuicao("VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI", "MEDIDAS PROTETIVAS", "")).toBe("Violência Doméstica");
  });
});

describe("mapearSituacao", () => {
  it("redesignada não cai em designada", () => {
    expect(mapearSituacao("redesignada")).toBe("remarcado");
    expect(mapearSituacao("designada")).toBe("confirmado");
    expect(mapearSituacao("cancelada")).toBe("cancelado");
  });
});

describe("linhaParaEvento", () => {
  it("monta evento a partir de colunas estruturadas", () => {
    const ev = linhaParaEvento({
      dataHora: "30/06/26 09:00",
      processo: "8009660-70.2025.8.05.0039",
      orgao: "VARA DE VIOLÊNCIA DOMÉSTICA FAM CONTRA A MULHER DE CAMAÇARI",
      partes: "Ministério Público do Estado da Bahia - CNPJ: 04.142.491/0001-66 (AUTOR) X JEAN MAYKON SIMOES DA SILVA - CPF: 052.153.735-58 (REU)",
      classe: "AÇÃO PENAL - PROCEDIMENTO ORDINÁRIO (283)",
      tipo: "AUDIÊNCIA DE INSTRUÇÃO E JULGAMENTO",
      sala: "Sala 1",
      situacao: "designada",
    });
    expect(ev.data).toBe("2026-06-30");
    expect(ev.horarioInicio).toBe("09:00");
    expect(ev.processo).toBe("8009660-70.2025.8.05.0039");
    expect(ev.assistido).toBe("Jean Maykon Simoes Da Silva");
    expect(ev.atribuicao).toBe("Violência Doméstica");
    expect(ev.status).toBe("confirmado");
    expect(ev.situacaoAudiencia).toBe("designada");
  });
});
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `npm test -- src/lib/agenda/__tests__/parse-pauta.test.ts`
Expected: FAIL ("Cannot find module '../parse-pauta'").

- [ ] **Step 3: Implementar `parse-pauta.ts`**

Portar **exatamente** as funções do modal (linhas citadas acima), trocando referências locais por imports. Estrutura:

```typescript
// src/lib/agenda/parse-pauta.ts
import { NAME_ACCENTS } from "@/lib/utils/title-case";
import { detectarSlug, tipoPorSlug } from "@/lib/agenda/tipos-audiencia";

export interface AssistidoInfo { nome: string; cpf: string; }

export interface ParsedEvento {
  titulo: string; tipo: string; data: string; horarioInicio: string;
  horarioFim: string; local: string; processo: string; assistido: string;
  assistidos: AssistidoInfo[]; atribuicao: string; status: string;
  descricao: string; classeJudicial: string; situacaoAudiencia: string;
  orgaoJulgador: string;
}

const CONECTIVOS = ["de","da","do","das","dos","e","em","para","por","com","sem","a","o","as","os"];

export function toTitleCase(texto: string): string {
  if (!texto) return "";
  return texto.toLowerCase().split(" ").map((p, i) => {
    if (NAME_ACCENTS[p]) return NAME_ACCENTS[p];
    if (i === 0 || !CONECTIVOS.includes(p)) return p.charAt(0).toUpperCase() + p.slice(1);
    return p;
  }).join(" ");
}

export function mapearAtribuicao(orgaoJulgador: string, classeJudicial: string, textoCompleto: string): string {
  // PORTAR de pje-agenda-import-modal.tsx:108-156 sem alterar a lógica
}

export function mapearSituacao(situacaoTexto: string): string {
  // PORTAR de :176-189 (ordem: cancelada → não-realizada → redesignada → realizada → designada)
}

const ROLE = "(REU|INVESTIGADO|REQUERIDO|FLAGRANTEADO|RECORRIDO|APELADO|AUTORIDADE)";

export function extrairAssistidos(partesTexto: string): AssistidoInfo[] {
  // PORTAR de :253-307: pegar texto após " X ", normalizar, regex de nome+CPF+papel,
  // limpar prefixos ("X ", "e ", "registrado(a) civilmente como"), filtrar não-pessoas
  // (Ministério/VARA/DEAM/Polícia/"DT "/DELEGACIA/"segredo de justiça"/^\d{2}ª DT), dedup
  // por CPF/nome, toTitleCase.
}

const DURACAO_FALLBACK = 60;

/** Constrói um ParsedEvento a partir de colunas JÁ separadas da tabela da pauta. */
export function linhaParaEvento(cols: {
  dataHora: string; processo: string; orgao: string; partes: string;
  classe: string; tipo: string; sala: string; situacao: string;
}, forcedAtribuicao?: string): ParsedEvento {
  // 1) data/hora: "DD/MM/AA HH:MM" → data "YYYY-MM-DD" + horarioInicio "HH:MM"
  const m = cols.dataHora.match(/(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2}):(\d{2})/);
  const [, dia, mes, ano, hh, mm] = m!;
  const anoCompleto = ano.length === 2 ? `20${ano}` : ano;
  const data = `${anoCompleto}-${mes}-${dia}`;
  const horarioInicio = `${hh}:${mm}`;
  // 2) assistidos
  const assistidos = extrairAssistidos(cols.partes);
  const assistido = assistidos.map(a => a.nome).join(", ");
  // 3) tipo via catálogo (usa a célula "Tipo" + classe como contexto)
  const tipoCat = tipoPorSlug(detectarSlug(`${cols.tipo} ${cols.classe}`));
  // 4) atribuição (forçada ou derivada)
  const atribuicao = forcedAtribuicao && forcedAtribuicao !== "auto"
    ? forcedAtribuicao
    : mapearAtribuicao(cols.orgao, cols.classe, `${cols.orgao} ${cols.classe} ${cols.tipo}`);
  // 5) horário fim (duração do catálogo)
  const dur = tipoCat.duracaoMin ?? DURACAO_FALLBACK;
  const fim = (Number(hh) * 60 + Number(mm) + dur) % 1440;
  const horarioFim = `${String(Math.floor(fim/60)).padStart(2,"0")}:${String(fim%60).padStart(2,"0")}`;
  const classeJudicial = toTitleCase(cols.classe.replace(/\s*\(\d+\)\s*$/, "").replace(/\s+/g," ").trim());
  const orgaoFmt = toTitleCase(cols.orgao);
  const titulo = `${tipoCat.sigla} - ${assistido || "Sem assistido"} - ${cols.processo}`;
  const descricao = [
    "INFORMAÇÕES DA AUDIÊNCIA", "",
    `Órgão Julgador: ${orgaoFmt || "Não informado"}`, "",
    `Tipo de Audiência: ${tipoCat.descricao}`, "",
    `Processo: ${cols.processo}`, "",
    `Classe Processual: ${classeJudicial}`, "",
    `Parte(s) Assistida(s): ${assistido || "Não identificado"}`, "",
    `Status: ${cols.situacao}`,
  ].join("\n");
  return {
    titulo, tipo: tipoCat.descricao, data, horarioInicio, horarioFim,
    local: "Fórum Clemente Mariani - Camaçari", processo: cols.processo.trim(),
    assistido, assistidos, atribuicao, status: mapearSituacao(cols.situacao),
    descricao, classeJudicial, situacaoAudiencia: cols.situacao, orgaoJulgador: cols.orgao,
  };
}
```

> Verifique o nome do campo de duração em `TipoAudiencia` (em `tipos-audiencia.ts`) e o de `NAME_ACCENTS`/`toTitleCase` em `title-case.ts` antes de implementar; ajuste imports conforme o real.

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `npm test -- src/lib/agenda/__tests__/parse-pauta.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Refatorar o modal para usar `parse-pauta.ts` (sem mudar comportamento)**

Em `pje-agenda-import-modal.tsx`, remover as definições locais de `toTitleCase`, `mapearAtribuicao`, `mapearSituacao` e o bloco de extração de assistido, importando de `@/lib/agenda/parse-pauta`. Manter o resto do parser de texto intacto.

- [ ] **Step 6: Typecheck + commit**

Run: `npx tsc --noEmit` → Expected: sem erros.
```bash
git add src/lib/agenda/parse-pauta.ts src/lib/agenda/__tests__/parse-pauta.test.ts src/components/agenda/pje-agenda-import-modal.tsx
git commit -m "refactor(agenda): extrai helpers de parsing da pauta p/ parse-pauta.ts (fonte única)"
```

---

## Task 2: Extrair core do `importBatch` → `importar-audiencias.ts`

**Files:**
- Create: `src/lib/agenda/importar-audiencias.ts`
- Modify: `src/lib/trpc/routers/audiencias.ts:1210-1788` (procedure `importBatch` passa a delegar)
- Reference: corpo atual de `importBatch` (mutation) e seu retorno `{ superados, importados, duplicados, atualizados, duplicadosProcessos, assistidosCriados }`

- [ ] **Step 1: Extrair o schema do evento como named export**

Hoje o input de `importBatch` é um `z.object` anônimo inline (`audiencias.ts:1212-1232`). Extraí-lo para um `export const eventoImportSchema = z.object({ ... })` (mesmos campos) e derivar `export type EventoImport = z.infer<typeof eventoImportSchema>`. Pode viver em `importar-audiencias.ts` e ser importado pelo router.

- [ ] **Step 2: Mover o corpo da mutation para uma função pura de serviço**

Criar `importarAudiencias(eventos: EventoImport[], opts?: { userId?: number }): Promise<ImportarAudienciasResult>` em `importar-audiencias.ts`, contendo **todo** o corpo atual da mutation (statusCanonico, mapAtribuicao, mapArea, normalizarNome, calcularSimilaridade, batch pre-fetch, criação, `db.transaction`, reconciliação `idsParaSuperar`, return). **Nota:** o `importBatch` atual destrutura `{ ctx, input }` mas **não usa `ctx`** — então `opts.userId` é forward-looking (não há uso a migrar); manter o parâmetro opcional para o `confirmarImport` poder passar o autor se útil, sem quebrar nada. `ImportarAudienciasResult` = o shape de retorno atual `{ superados, importados, duplicados, atualizados, duplicadosProcessos, assistidosCriados }`.

- [ ] **Step 3: `importBatch` delega**

```typescript
importBatch: protectedProcedure
  .input(z.object({ eventos: z.array(eventoImportSchema) }))
  .mutation(async ({ input }) => importarAudiencias(input.eventos)),
```

- [ ] **Step 4: Teste de não-regressão**

Run: `npm test` (suíte existente que cobre importBatch, se houver) e `npx tsc --noEmit`.
Expected: PASS / sem erros. Se não houver teste cobrindo importBatch, adicionar um teste mínimo de smoke chamando `importarAudiencias([])` → retorna zeros.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda/importar-audiencias.ts src/lib/trpc/routers/audiencias.ts
git commit -m "refactor(agenda): extrai core do importBatch p/ importar-audiencias.ts (reuso server-side)"
```

---

## Task 3: Tabela `pauta_import_staging`

**Files:**
- Create: `src/lib/db/schema/pauta-import.ts`
- Modify: `src/lib/db/schema/index.ts` (re-export)
- Reference: `src/lib/db/schema/pje-import.ts` (mesmo padrão)

- [ ] **Step 1: Definir o schema**

```typescript
// src/lib/db/schema/pauta-import.ts
import { pgTable, serial, integer, text, varchar, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { atribuicaoEnum } from "./enums";

export const pautaImportStaging = pgTable("pauta_import_staging", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  atribuicao: atribuicaoEnum("atribuicao"),
  dataAudiencia: timestamp("data_audiencia"),
  processoNumero: varchar("processo_numero", { length: 40 }),
  orgaoJulgador: text("orgao_julgador"),
  partesRaw: text("partes_raw"),
  classeRaw: text("classe_raw"),
  tipoRaw: text("tipo_raw"),
  sala: varchar("sala", { length: 40 }),
  situacao: varchar("situacao", { length: 30 }),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  selected: boolean("selected").notNull().default(true),
  revisao: jsonb("revisao").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("pauta_import_staging_job_id_idx").on(t.jobId),
  index("pauta_import_staging_content_hash_idx").on(t.contentHash),
]);

export type PautaImportStaging = typeof pautaImportStaging.$inferSelect;
export type InsertPautaImportStaging = typeof pautaImportStaging.$inferInsert;
```

- [ ] **Step 2: Re-export** em `src/lib/db/schema/index.ts`: `export * from "./pauta-import";`

- [ ] **Step 3: Gerar e aplicar migração** (segue `/db-migrate`)

Run: `npm run db:generate` (gera SQL em `drizzle/`) → revisar o `.sql` gerado (deve ser só `CREATE TABLE pauta_import_staging` + índices).
Run: `npm run db:push`
Expected: tabela criada; `npx tsc --noEmit` sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema/pauta-import.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat(db): tabela pauta_import_staging"
```

---

## Task 4: Worker `importar_pauta.py`

**Files:**
- Create: `.claude/skills/importar-pauta/scripts/importar_pauta.py`
- Create: `.claude/skills/importar-pauta/scripts/test_importar_pauta.py`
- Create: `.claude/skills/importar-pauta/SKILL.md`
- Reference (espelhar): `.claude/skills/pje-intimacoes-import/scripts/pje_intimacoes_import.py` (load_env, Supabase, attach CDP, navegação JSF por texto, paginação, set_etapa) e a estratégia de dispensa de modal robusta criada no mesmo arquivo.

- [ ] **Step 1: Teste do helper puro (falhando)**

```python
# test_importar_pauta.py
import importlib.util, os
spec = importlib.util.spec_from_file_location("ip", os.path.join(os.path.dirname(__file__), "importar_pauta.py"))
ip = importlib.util.module_from_spec(spec); spec.loader.exec_module(ip)

def test_content_hash_estavel():
    h1 = ip.compute_pauta_hash("8009660-70.2025.8.05.0039", "2026-06-30 09:00", "OITIVA", "designada")
    h2 = ip.compute_pauta_hash("8009660-70.2025.8.05.0039", "2026-06-30 09:00", "OITIVA", "designada")
    assert h1 == h2 and len(h1) == 64

def test_parse_data_hora():
    assert ip.parse_data_hora("30/06/26 09:00") == ("2026-06-30T09:00:00", "09:00")
```

Run: `python3 .claude/skills/importar-pauta/scripts/test_importar_pauta.py` → FAIL (módulo/func ausente).

- [ ] **Step 2: Implementar o worker**

Estrutura (espelhar intimações para infra; abaixo o que é específico da pauta):

```python
#!/usr/bin/env python3
"""Worker (browser lane): raspa a Pauta de Audiência do PJe → pauta_import_staging.
NUNCA escreve em audiencias/assistidos/processos. Reusa varredura_triagem.{load_env,Supabase,attach}.
"""
import argparse, asyncio, hashlib, os, re, sys
from datetime import datetime, timezone

CDP_URL = "http://127.0.0.1:9222"
PAUTA_URL = "https://pje.tjba.jus.br/pje/ProcessoAudiencia/PautaAudiencia/listView.seam"
SITUACAO_TODAS = True  # raspar todas as situações (necessário p/ reconciliação)

ATRIB_UNIDADE = {  # MESMO mapa de intimações
    "VVD_CAMACARI":  ("CAMAÇARI", "Vara de Violência doméstica"),
    "JURI_CAMACARI": ("CAMAÇARI", "Vara do Júri e Execuções Penais"),
}

def compute_pauta_hash(processo, data_iso, tipo, situacao):
    payload = f"{processo}|{data_iso}|{(tipo or '').strip().lower()}|{(situacao or '').strip().lower()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

def parse_data_hora(s):
    m = re.search(r"(\d{2})/(\d{2})/(\d{2,4})\s+(\d{2}):(\d{2})", s or "")
    if not m: return (None, None)
    dia, mes, ano, hh, mm = m.groups()
    ano = ano if len(ano) == 4 else f"20{ano}"
    return (f"{ano}-{mes}-{dia}T{hh}:{mm}:00", f"{hh}:{mm}")

# --- run(): attach CDP, p/ cada atribuição: navega PAUTA_URL, seta filtros, PESQUISA,
#     raspa linhas (com paginação), grava staging. Igual intimações no shape de infra. ---
```

Especificidades a implementar dentro de `run()`:
1. **Navegação/filtros** (validar seletores ao vivo, como foi feito p/ Expedientes):
   - `await page.goto(PAUTA_URL)`.
   - Setar **Jurisdição** (comarca) e **Órgão julgador** (unidade) — selects Angular/JSF; usar clique por texto da option (padrão do projeto), não `select_option` cego.
   - Marcar **Situações = Todas**.
   - Preencher **Período** De/Até (campos data) com `--since`/`--until`.
   - Clicar **PESQUISA**.
2. **Scrape da tabela** via `page.evaluate` retornando as 8 colunas por linha (Data/hora, Processo, Órgão, Partes, Classe, Tipo, Sala, Situação) — extrair `td` por índice; juntar CNJ partido por quebra de linha (`(\d{7})-\s*\n?\s*(\d{2}\.\d{4})`).
3. **Paginação**: reusar o padrão `JS_RESET_TO_PAGE_1` / `JS_GOTO_PAGE` de intimações se a tabela paginar; senão, ler tudo.
4. **Gravar staging**: para cada linha → `{job_id, atribuicao, data_audiencia(iso), processo_numero, orgao_julgador, partes_raw, classe_raw, tipo_raw, sala, situacao, content_hash, selected:true}`; dedup intra-job pelo `content_hash`.
5. **Heartbeat**: `set_etapa` por unidade/página; ao fim, `status=completed` + resultado `{total, por_unidade}`.
6. **Dispensa de modal**: reusar a função robusta (X → Esc → poll) caso o PJe abra modal.

- [ ] **Step 3: Rodar o teste do helper → passar**

Run: `python3 .claude/skills/importar-pauta/scripts/test_importar_pauta.py`
Expected: sem AssertionError.

- [ ] **Step 4: `py_compile`**

Run: `python3 -m py_compile .claude/skills/importar-pauta/scripts/importar_pauta.py`
Expected: sem saída (ok).

- [ ] **Step 5: SKILL.md** — descrever propósito, CLI (`--job-id --atribuicoes --since --until --modo`), env, modo CDP, e a regra inviolável (nunca escreve em audiencias). Espelhar o SKILL.md de intimações.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/importar-pauta/
git commit -m "feat(pauta): worker importar_pauta.py (raspa listView.seam → staging)"
```

> A validação ao vivo dos seletores e do scrape acontece na Task 8 (precisa de PJe logado + CDP).

---

## Task 5: Registrar a skill no daemon

**Files:**
- Modify: `scripts/browser-broker-daemon.mjs` (objeto `SKILL_REGISTRY`, perto de `pje-intimacoes-import` em :131)

- [ ] **Step 1: Adicionar a entrada**

```javascript
'importar-pauta': {
  label: 'Importar pauta de audiências (staging)',
  interactive: true, // exige PJe logado
  build: (meta) => {
    if (!meta.atribuicoes?.length) throw new Error('meta.atribuicoes é obrigatório para importar-pauta');
    return {
      interpreter: VENV_PYTHON,
      argv: [
        resolve(PROJECT_DIR, '.claude/skills/importar-pauta/scripts/importar_pauta.py'),
        '--job-id', String(meta.jobId),
        '--atribuicoes', meta.atribuicoes.join(','),
        ...(meta.since ? ['--since', String(meta.since)] : []),
        ...(meta.until ? ['--until', String(meta.until)] : []),
        '--modo', meta.modo || 'cdp',
      ],
      timeoutMs: 30 * 60_000,
    };
  },
},
```

> O daemon injeta `meta.jobId` ao montar o build (confirmar no fluxo existente; intimações usa `String(meta.jobId)`).

- [ ] **Step 2: Commit**

```bash
git add scripts/browser-broker-daemon.mjs
git commit -m "feat(pauta): registra skill importar-pauta no browser-broker-daemon"
```

---

## Task 6: tRPC `pauta` router

**Files:**
- Create: `src/lib/trpc/routers/pauta.ts`
- Modify: root router `src/lib/trpc/routers/index.ts` — registrar `pauta`
- Reference (espelhar): `src/lib/trpc/routers/intimacoes.ts` (criarImportJob :206, listStaging :245, confirmarImport :371)
- Reuse: `linhaParaEvento` (Task 1), `importarAudiencias` (Task 2)

- [ ] **Step 1: `criarImportJob`** — espelha intimações: dedup por task pending/processing com `skill="importar-pauta"`; insere `claude_code_tasks` (lane browser) com `instrucaoAdicional = JSON.stringify({ atribuicoes, since, until })`; `since` default = hoje (ISO), `until` default = hoje+60d.

- [ ] **Step 2: `listStaging({ jobId })`** — retorna `status` do job + linhas de `pauta_import_staging` mapeadas por `linhaParaEvento({...colunas brutas})` para o preview (assistido, tipo, atribuição, situação). Calcular `reconciliarPrevisto`: agrupar por processo+janela e contar audiências `agendada` existentes na janela ausentes do conjunto (preview do `Z`; recalculável na seleção — ver §12.1 do spec).

- [ ] **Step 3: `confirmarImport({ jobId, selectedIds, edits? })`**

```typescript
// 1. carregar linhas selecionadas do staging
// 2. aplicar edits (revisao)
// 3. eventos = linhas.map(l => linhaParaEvento({ dataHora, processo, orgao, partes, classe, tipo, sala, situacao }))
// 4. const r = await importarAudiencias(eventos, { userId: ctx.user.id });
// 5. return { importadas: r.importados, atualizadas: r.atualizados,
//             reconciliadas: r.superados, ignoradas: r.duplicados };
```

- [ ] **Step 4: Registrar** `pauta` no root router e `npx tsc --noEmit`.
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/lib/trpc/routers/pauta.ts src/lib/trpc/routers/index.ts
git commit -m "feat(pauta): router tRPC criarImportJob/listStaging/confirmarImport"
```

---

## Task 7: UI — modal "Atualizar pauta" (Padrão Defender v5)

**Files:**
- Create: `src/components/agenda/atualizar-pauta-modal.tsx`
- Modify: página da Agenda (`src/app/(dashboard)/admin/agenda/page.tsx`) — botão no header + render do modal
- Reference: Padrão Defender v5 (skill `padrao-defender`); `pje-agenda-import-modal.tsx` (reusar para a aba "Colar texto")

- [ ] **Step 1: Modal com segmented control** "Do PJe (automático)" | "Colar texto".
  - **Do PJe**: chips de unidade (VVD amber / Júri-EP emerald, ambas on), date inputs De/Até (default hoje→+60d), botão "Atualizar" (emerald, `RefreshCw`).
  - dispara `trpc.pauta.criarImportJob`; faz **poll** de `trpc.pauta.listStaging({ jobId })` (refetchInterval enquanto `status` ∈ pending/processing).
  - **Colar texto**: renderiza o fluxo atual (`PJeAgendaImportModal` content) → `audiencias.importBatch`.

- [ ] **Step 2: Preview** — stats inline, callout de reconciliação (amber, só se `reconciliarPrevisto>0`, com lista expansível), lista agrupada por dia (mais próximo primeiro), mini-cards (barra de atribuição, horário mono, badge tipo, assistido, processo mono, badge situação), checkboxes (tudo on). Rodapé sticky "Importar N selecionadas" → `trpc.pauta.confirmarImport`.

- [ ] **Step 3: Botão de entrada** no header da Agenda (ícone `RefreshCw`, tooltip "Atualizar pauta") abrindo o modal.

- [ ] **Step 4: Checklist Padrão Defender v5** — Lucide (sem emoji), cursor-pointer, hover 150–200ms, cards bg-white shadow-sm, fundo neutral-100, cor só funcional, responsivo, dropdowns via portal. Rodar `bash scripts/verify-padrao-defender.sh` se existir.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` → sem erros.
```bash
git add src/components/agenda/atualizar-pauta-modal.tsx "src/app/(dashboard)/admin/agenda/page.tsx"
git commit -m "feat(pauta): modal 'Atualizar pauta' (Padrão Defender v5)"
```

---

## Task 8: Validação ao vivo (PJe logado + CDP) e deploy

**Files:** nenhum (validação) — ajustes pontuais de seletores no worker se necessário.

- [ ] **Step 1: Pré-requisito** — Chromium com `--remote-debugging-port=9222`, PJe logado no Painel; daemon browser rodando.

- [ ] **Step 2: Disparar** via UI (botão "Atualizar pauta", VVD+Júri/EP, período default). Monitorar a task e o worker (logs/etapa).

- [ ] **Step 3: Conferir staging** — `pauta_import_staging` populado com as linhas (comparar contagem/algumas linhas com a pauta real que o usuário já colou no exemplo). Ajustar seletores/scrape se algo divergir.

- [ ] **Step 4: Preview + confirmar** num **subconjunto pequeno** (selecionar 2–3) e verificar: audiências criadas, assistido/processo corretos, situação/tipo certos, e a reconciliação (uma redesignada conhecida marca a antiga). Conferir contra a agenda.

- [ ] **Step 5: Rodar a suíte + typecheck final**

Run: `npm test && npx tsc --noEmit`
Expected: PASS / sem erros.

- [ ] **Step 6: Commit de ajustes (se houver) + deploy**

```bash
git add -A && git commit -m "fix(pauta): ajustes de seletores após validação ao vivo"  # se necessário
git push origin HEAD:main
vercel --prod --yes
```

> Sincronizar o worker no Mac Mini não é necessário (worker é da lane browser/local); o daemon local relê o script a cada task.

---

## Notas finais

- **DRY:** parsing num só lugar (`parse-pauta.ts`); promote num só lugar (`importar-audiencias.ts`).
- **YAGNI:** sem cron (worker pronto p/ ligar depois), sem ledger, sem descoberta dinâmica de unidades, sem parsing de PDF.
- **Reconciliação:** depende de raspar TODAS as situações no período — não filtrar só "designada".
- **Segurança:** worker nunca escreve em tabelas finais; promote só via `confirmarImport` revisado.
