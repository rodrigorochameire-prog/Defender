# SEEU Intimações Import (Fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar automaticamente as intimações de Execução Penal do SEEU (Mesa do Defensor) para o OMBUDS em status de triagem, espelhando o pipeline de importação do PJe.

**Architecture:** Worker Python (browser lane, CDP-attach) raspa o frame `mesaDefensor1Grau.do` do SEEU e grava blocos crus em tabelas SEEU próprias (`seeu_import_staging` / `seeu_ledger`). Um router tRPC `seeuIntimacoes` enfileira o job, enriquece o staging com o parser canônico (que já auto-detecta SEEU) e promove para `demandas` via `intimacaoSEEUToDemanda → importarDemandas`. A UI reusa a página de revisão, parametrizada pelo `skill` da task.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM (Postgres/Supabase), Zod, Vitest (TS), Python 3.12 + Patchright/Playwright (CDP), pytest para os helpers puros do worker.

## Global Constraints

- **Read-only sobre o SEEU:** o worker NUNCA clica "Dispensar Juntada", "Analisar", assina ou peticiona. Só lê DOM + troca de aba + paginação.
- **Worker escreve SÓ em** `seeu_import_staging`, `seeu_ledger`, `claude_code_tasks` — NUNCA em `demandas`.
- **Chave forte de dedup do SEEU = `(processoNumero, seq)`** (o SEEU não tem `pjeDocumentoId`); `content_hash` é fallback.
- **Fonte única de semântica:** o `conteudo` cru (innerText do bloco) é reparseado por `parseIntimacoesUnificado` — nunca duplicar lógica de parsing na UI ou no worker.
- **`content_hash` deve ser byte-idêntico** entre Python (`compute_content_hash`) e TS (`computeContentHash`): `sha256(processo + "|" + (doc_id or "") + "|" + normalize(conteudo))`, `normalize` = colapsa `\s+`→espaço, strip, lowercase. Para SEEU, `doc_id` é sempre `""`.
- **Tudo entra em triagem**, diferenciado pelo `ato` (Manifestação → `analisar`; Ciência → `ciencia`; Razões → `analisar`).
- **Abas da Fase 1:** Manifestação, Ciência, Razões/Contrarrazões. "Pendências de Incidentes" é Fase 1.5 (fora deste plano).
- **Nenhum segredo no código.** Credenciais via `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Login no SEEU é sempre manual (CDP-attach).
- Rodar `npm run test` (Vitest) e `npm run typecheck` verdes antes de cada commit de tarefa TS.

---

### Task 1: Corrigir os 2 bugs do parser SEEU (TDD, fixture real)

**Files:**
- Create: `src/lib/__tests__/pje-parser-seeu.test.ts`
- Create: `src/lib/__tests__/fixtures/seeu-mesa-manifestacao.txt`
- Create: `src/lib/__tests__/fixtures/seeu-mesa-ciencia.txt`
- Modify: `src/lib/pje-parser.ts` (`parseSEEUIntimacoes` ~1348–1426, `extrairDadosBlocoSEEU` ~1431–1541)

**Interfaces:**
- Consumes: `parseIntimacoesUnificado(texto): { intimacoes: IntimacaoSEEU[]; sistema }` (existente).
- Produces: `IntimacaoSEEU` com `dataEnvio`/`ultimoDia` corretos por linha e `assistido` sem vazamento — consumido por Tasks 5/6 via `parseStagingRow`.

- [ ] **Step 1: Criar as fixtures reais**

Criar `src/lib/__tests__/fixtures/seeu-mesa-manifestacao.txt` com o texto cru capturado da aba Manifestação (contém `Terceiro:` na 2ª linha — o caso do bug 2):

```
Mesa do Defensor
   

Manifestação (16)
Ciência (11)
Pendências de Incidentes
Razões/Contrarrazões (0)
Lembretes


Processos Pendentes


Situação:	 Recebidas e não Lidas       Lidas e Aguardando Análise       Aguardando Assinatura


1
7 registro(s) encontrado(s), exibindo de 1 até 7
 	Seq	Processo
	Classe Processual
(Assunto Principal)	Partes	Defensor	Data de Envio
Último Dia	Prazo para resposta	Pré-Análise	Leitura de Prazo
Todos 
	1372	
2002228-90.2023.8.05.0001 	Execução da Pena
(Pena Privativa de Liberdade)	
Autoridade:	
Estado da Bahia


Executado:	
JOSE NEVES DA SILVA
		29/06/2026
09/07/2026	5 dias corridos	
Analisar
	
	1552	
2000068-07.2025.8.05.0039 	Execução da Pena
(Acordo de Não Persecução Penal)	
Autoridade:	
Ministério Público do Estado da Bahia


Executado:	
NADSON WESLEY MASCARENHAS DOS SANTOS DA SILVA


Terceiro:	
DEFENSORIA PÚBLICA DO ESTADO DA BAHIA
Polícia Civil do Estado da Bahia
		29/06/2026
09/07/2026	5 dias corridos	
Analisar
	
```

Criar `src/lib/__tests__/fixtures/seeu-mesa-ciencia.txt` com a aba Ciência (contém `[ Dispensar Juntada ]`):

```
Mesa do Defensor
   

Manifestação (16)
Ciência (11)
Pendências de Incidentes
Razões/Contrarrazões (0)
Lembretes


Processos Pendentes


Situação:	 Recebidas e não Lidas       Lidas e Aguardando Análise       Aguardando Assinatura


1
4 registro(s) encontrado(s), exibindo de 1 até 4
 	Seq	Processo
	Classe Processual
(Assunto Principal)	Partes	Defensor	Data de Envio
Último Dia	Prazo para resposta	Pré-Análise	Leitura de Prazo
Todos 
	1000	
2000124-11.2023.8.05.0039 	Execução da Pena
(Pena Privativa de Liberdade)	
Autoridade:	
Estado da Bahia


Executado:	
FRANKLIN LEITE DOS SANTOS
		30/06/2026
10/07/2026	5 dias corridos	
Analisar

[ Dispensar Juntada ]	
	1062	
2000160-53.2023.8.05.0039 	Execução da Pena
(Pena Privativa de Liberdade)	
Autoridade:	
Estado da Bahia


Executado:	
ICARO COSTA DE JESUS MATOS
		30/06/2026
10/07/2026	5 dias corridos	
Analisar

[ Dispensar Juntada ]	
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `src/lib/__tests__/pje-parser-seeu.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseIntimacoesUnificado, parseSEEUIntimacoes } from "@/lib/pje-parser";

const fx = (name: string) =>
  readFileSync(join(__dirname, "fixtures", name), "utf8");

describe("parser SEEU — dados reais da Mesa do Defensor", () => {
  it("detecta SEEU e extrai todas as linhas da aba Manifestação", () => {
    const r = parseIntimacoesUnificado(fx("seeu-mesa-manifestacao.txt"));
    expect(r.sistema).toBe("SEEU");
    expect(r.intimacoes.length).toBe(2);
  });

  it("Bug 1: dataEnvio e ultimoDia NÃO são trocados em linhas após a primeira", () => {
    const r = parseSEEUIntimacoes(fx("seeu-mesa-manifestacao.txt"));
    const seq1552 = r.intimacoes.find((i) => i.seq === 1552)!;
    expect(seq1552).toBeDefined();
    // Envio é sempre a data ANTERIOR ao último dia.
    expect(seq1552.dataEnvio).toBe("29/06/2026");
    expect(seq1552.ultimoDia).toBe("09/07/2026");
  });

  it("Bug 2: nome do Executado não vaza para o bloco Terceiro:", () => {
    const r = parseSEEUIntimacoes(fx("seeu-mesa-manifestacao.txt"));
    const seq1552 = r.intimacoes.find((i) => i.seq === 1552)!;
    expect(seq1552.assistido).toBe(
      "Nadson Wesley Mascarenhas dos Santos da Silva",
    );
    expect(seq1552.assistido.toLowerCase()).not.toContain("terceiro");
    expect(seq1552.assistido.toLowerCase()).not.toContain("defensoria");
  });

  it("aba Ciência: ato = Ciência e ruído [ Dispensar Juntada ] não polui o nome", () => {
    const r = parseSEEUIntimacoes(fx("seeu-mesa-ciencia.txt"), "ciencia");
    expect(r.intimacoes.length).toBe(2);
    const franklin = r.intimacoes.find((i) => i.seq === 1000)!;
    expect(franklin.assistido).toBe("Franklin Leite dos Santos");
    expect(franklin.assistido.toLowerCase()).not.toContain("dispensar");
    expect(franklin.tipoDocumento).toBe("Ciência");
  });

  it("preserva seq correto por linha", () => {
    const r = parseSEEUIntimacoes(fx("seeu-mesa-manifestacao.txt"));
    expect(r.intimacoes.map((i) => i.seq).sort()).toEqual([1372, 1552]);
  });
});
```

- [ ] **Step 3: Rodar os testes e confirmar que falham**

Run: `npm run test -- pje-parser-seeu`
Expected: FAIL — `Bug 1` (datas trocadas) e `Bug 2` (nome com "terceiro") falham.

- [ ] **Step 4: Corrigir Bug 1 (swap de datas) em `parseSEEUIntimacoes`**

Em `src/lib/pje-parser.ts`, dentro do loop `for (const numeroProcesso of processosUnicos)` de `parseSEEUIntimacoes`, substituir o cálculo do bloco (que hoje usa `posicaoProcesso - 50`) e passar o `seq` extraído de uma janela curta:

```ts
    // Bloco = do próprio processo até o próximo (SEM lookback de 50 chars, que
    // capturava a data da linha anterior e trocava dataEnvio/ultimoDia — bug 1).
    const blocoTexto = texto.substring(posicaoProcesso, fimBloco);

    // Seq: número imediatamente ANTES do processo (só whitespace/tab/newline entre
    // eles). Janela curta e ancorada no fim evita pegar o ano da data anterior.
    const preWindow = texto.substring(Math.max(0, posicaoProcesso - 40), posicaoProcesso);
    const seqMatch = preWindow.match(/(\d{3,4})[\s\t\n]*$/);
    const seq = seqMatch ? parseInt(seqMatch[1], 10) : undefined;

    const intimacao = extrairDadosBlocoSEEU(blocoTexto, numeroProcesso, tipoManifestacao, contadorOrdem++, seq);
```

E na assinatura de `extrairDadosBlocoSEEU`, aceitar `seq` e remover a extração interna:

```ts
function extrairDadosBlocoSEEU(
  bloco: string,
  numeroProcesso: string,
  tipoManifestacao: string,
  ordemOriginal: number,
  seq: number | undefined,
): IntimacaoSEEU | null {
  // (removido: const matchSeq = bloco.match(/(\d{3,4})\s*[\t\n]?\s*\d{7}-/) ...)
```

Remover a atribuição antiga `const seq = matchSeq ? ...` e usar o parâmetro `seq` no objeto retornado (já é referenciado como `seq` no `return`).

- [ ] **Step 5: Corrigir Bug 2 (vazamento de nome) em `extrairDadosBlocoSEEU`**

Substituir a regex primária do Executado (hoje `/(?:Executado|Deprecado):\s*\n?\s*([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\s]+)/i`) por uma versão sem `/i` e cuja classe de caracteres NÃO inclui `\s` (portanto não cruza a quebra de linha para o bloco `Terceiro:`):

```ts
  // Nome do Executado/Deprecado: linha em MAIÚSCULAS logo após o rótulo.
  // Sem /i (evita casar minúsculas) e a classe usa espaço literal, não \s —
  // assim para na quebra de linha e não invade "Terceiro:"/"Polo Ativo:" (bug 2).
  const matchExecutado = bloco.match(
    /(?:Executado|Deprecado):\s*\n\s*([A-ZÀÁÂÃÉÊÍÓÔÕÚÇÑ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇÑ'.\- ]+)/,
  );
  if (matchExecutado) {
    assistido = matchExecutado[1].trim();
  }
```

- [ ] **Step 6: Filtrar o ruído `[ Dispensar Juntada ]`**

No fallback linha-a-linha de nome (o loop `for (let i...` que testa `linhas[i].includes('Executado:')`), adicionar o novo termo à guarda de exclusão, junto de `ESTADO`/`MINISTÉRIO`/`BAHIA`:

```ts
            if (!linha.includes('ESTADO') && !linha.includes('MINISTÉRIO') &&
                !linha.includes('BAHIA') && !linha.includes('Dispensar') &&
                !linha.includes('Terceiro') && !linha.includes('Polo')) {
              assistido = linha;
              break;
            }
```

- [ ] **Step 7: Rodar os testes e confirmar que passam**

Run: `npm run test -- pje-parser-seeu`
Expected: PASS (5 testes verdes).

- [ ] **Step 8: Garantir que não quebrou os testes existentes**

Run: `npm run test -- pje-intimacoes-import`
Expected: PASS (o teste de serviço existente continua verde).

- [ ] **Step 9: Commit**

```bash
git add src/lib/pje-parser.ts src/lib/__tests__/pje-parser-seeu.test.ts src/lib/__tests__/fixtures/seeu-mesa-*.txt
git commit -m "fix(parser-seeu): corrige swap de datas e vazamento de nome no Terceiro (fixtures reais)"
```

---

### Task 2: Tabelas SEEU próprias + migration

**Files:**
- Create: `src/lib/db/schema/seeu-import.ts`
- Modify: `src/lib/db/schema/index.ts` (adicionar `export * from "./seeu-import";` perto da linha 79)
- Create: migration gerada em `drizzle/` (via `npm run db:generate`)

**Interfaces:**
- Produces: tabelas `seeuImportStaging`, `seeuLedger` e tipos `SeeuImportStaging`, `InsertSeeuImportStaging`, `SeeuLedger`, `InsertSeeuLedger` — consumidos por Tasks 5/6 e pelo worker (Task 4). `SeeuImportStaging` é um **superconjunto estrutural** de `PjeImportStaging` (mesmas colunas + `seq`, `tab`), para reusar os helpers de serviço.

- [ ] **Step 1: Criar o schema SEEU**

Criar `src/lib/db/schema/seeu-import.ts`:

```ts
import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  atribuicaoEnum,
  stagingDecisaoEnum,
  ledgerDecisaoEnum,
} from "./enums";

// Efêmera: 1 linha por expediente raspado da Mesa do Defensor num job SEEU.
// Superconjunto de pje_import_staging (mesmas colunas + seq + tab) para reusar
// os helpers de serviço (stagingRowToImportRow, enrichStagingWithLiveDedup).
export const seeuImportStaging = pgTable("seeu_import_staging", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(), // = claude_code_tasks.id
  atribuicao: atribuicaoEnum("atribuicao"), // EXECUCAO_PENAL na Fase 1
  tab: text("tab"), // manifestacao | ciencia | razoes (aba de origem)
  seq: integer("seq"), // Seq do SEEU (parte da chave forte com processoNumero)
  processoNumero: varchar("processo_numero", { length: 40 }),
  assistidoNome: text("assistido_nome"),
  ato: text("ato"),
  tipoDocumento: varchar("tipo_documento", { length: 80 }),
  dataExpedicao: timestamp("data_expedicao"),
  dataIntimacao: timestamp("data_intimacao"),
  prazo: date("prazo"),
  conteudo: text("conteudo"),
  // Sempre NULL no SEEU (não há pjeDocumentoId); mantido p/ compat estrutural.
  pjeDocumentoId: varchar("pje_documento_id", { length: 30 }),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  decisao: stagingDecisaoEnum("decisao").notNull().default("nova"),
  matchedDemandaId: integer("matched_demanda_id"),
  matchedLedgerId: integer("matched_ledger_id"),
  selected: boolean("selected").notNull().default(false),
  revisao: jsonb("revisao").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("seeu_import_staging_job_id_idx").on(table.jobId),
  index("seeu_import_staging_content_hash_idx").on(table.contentHash),
  index("seeu_import_staging_proc_seq_idx").on(table.processoNumero, table.seq),
]);

export type SeeuImportStaging = typeof seeuImportStaging.$inferSelect;
export type InsertSeeuImportStaging = typeof seeuImportStaging.$inferInsert;

// Permanente: memória de toda intimação SEEU já vista. Chave forte = processo+seq.
export const seeuLedger = pgTable("seeu_ledger", {
  id: serial("id").primaryKey(),
  processoNumero: varchar("processo_numero", { length: 40 }),
  seq: integer("seq"),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  atribuicao: atribuicaoEnum("atribuicao"),
  ato: text("ato"),
  decisao: ledgerDecisaoEnum("decisao").notNull(),
  demandaId: integer("demanda_id"),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  jobId: integer("job_id"),
}, (table) => [
  // Chave forte: (processoNumero, seq) único quando seq presente.
  uniqueIndex("seeu_ledger_proc_seq_uidx")
    .on(table.processoNumero, table.seq)
    .where(sql`seq IS NOT NULL`),
  // Fallback: contentHash único quando NÃO há seq.
  uniqueIndex("seeu_ledger_content_hash_uidx")
    .on(table.contentHash)
    .where(sql`seq IS NULL`),
  index("seeu_ledger_processo_numero_idx").on(table.processoNumero),
]);

export type SeeuLedger = typeof seeuLedger.$inferSelect;
export type InsertSeeuLedger = typeof seeuLedger.$inferInsert;
```

- [ ] **Step 2: Exportar no barrel do schema**

Em `src/lib/db/schema/index.ts`, logo após `export * from "./pje-import";` (linha ~79), adicionar:

```ts
export * from "./seeu-import";
```

- [ ] **Step 3: Gerar a migration**

Run: `npm run db:generate`
Expected: novo arquivo SQL em `drizzle/` criando `seeu_import_staging` e `seeu_ledger` com os índices únicos parciais.

- [ ] **Step 4: Aplicar a migration no banco**

Run: `npm run db:push`
Expected: "Changes applied" — as duas tabelas criadas no Supabase.

- [ ] **Step 5: Verificar typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/schema/seeu-import.ts src/lib/db/schema/index.ts drizzle/
git commit -m "feat(db): tabelas seeu_import_staging e seeu_ledger (dedup processo+seq)"
```

---

### Task 3: Helpers puros de dedup do worker SEEU (Python, TDD)

**Files:**
- Create: `.claude/skills/seeu-intimacoes-import/scripts/seeu_intimacoes_import.py` (só os helpers puros neste task)
- Create: `.claude/skills/seeu-intimacoes-import/scripts/test_seeu_helpers.py`

**Interfaces:**
- Produces: `normalize_conteudo(s)`, `compute_content_hash(processo, doc_id, conteudo)`, `load_seeu_ledger_index(sb)`, `decide_layer_a_seeu(processo, seq, content_hash, index)` — consumidos por `run()` no Task 4.
- Contrato do índice: `{"by_proc_seq": {"<processo>|<seq>": decisao}, "by_hash": {hash: decisao}}`.

- [ ] **Step 1: Escrever os testes que falham**

Criar `.claude/skills/seeu-intimacoes-import/scripts/test_seeu_helpers.py`:

```python
import hashlib
from seeu_intimacoes_import import (
    normalize_conteudo,
    compute_content_hash,
    decide_layer_a_seeu,
    proc_seq_key,
)


def test_normalize_colapsa_e_lower():
    assert normalize_conteudo("  A\tB\n C ") == "a b c"


def test_content_hash_matches_ts_formula():
    # sha256("proc|<vazio>|texto") — doc_id sempre "" no SEEU
    proc, conteudo = "2000068-07.2025.8.05.0039", "Bloco Cru"
    expected = hashlib.sha256(
        f"{proc}||{normalize_conteudo(conteudo)}".encode("utf-8")
    ).hexdigest()
    assert compute_content_hash(proc, None, conteudo) == expected


def test_proc_seq_key():
    assert proc_seq_key("2000068-07.2025.8.05.0039", 1552) == "2000068-07.2025.8.05.0039|1552"


def test_decide_nova_quando_ausente():
    idx = {"by_proc_seq": {}, "by_hash": {}}
    assert decide_layer_a_seeu("proc", 10, "hash", idx) == "nova"


def test_decide_ja_importada_por_proc_seq():
    idx = {"by_proc_seq": {"proc|10": "imported"}, "by_hash": {}}
    assert decide_layer_a_seeu("proc", 10, "hash", idx) == "ja_importada"


def test_decide_duplicada_por_proc_seq_skipped():
    idx = {"by_proc_seq": {"proc|10": "skipped"}, "by_hash": {}}
    assert decide_layer_a_seeu("proc", 10, "hash", idx) == "duplicada"


def test_decide_fallback_por_hash_quando_sem_seq():
    idx = {"by_proc_seq": {}, "by_hash": {"h": "imported"}}
    assert decide_layer_a_seeu("proc", None, "h", idx) == "ja_importada"
```

- [ ] **Step 2: Criar o módulo com só os helpers puros**

Criar `.claude/skills/seeu-intimacoes-import/scripts/seeu_intimacoes_import.py` com o cabeçalho e os helpers puros (o resto do worker vem no Task 4):

```python
#!/usr/bin/env python3
"""Worker (browser lane): raspa a Mesa do Defensor do SEEU (Execução Penal) por
aba e grava em seeu_import_staging (NUNCA em demandas). Dedup Layer-A via
seeu_ledger, chave forte = (processoNumero, seq).

Read-only sobre o SEEU: só lê DOM + troca de aba + paginação. Nunca clica
"Dispensar Juntada"/"Analisar"/assinar/peticionar.
"""
from __future__ import annotations

import argparse
import asyncio
import hashlib
import os
import re
import sys
from datetime import datetime, timezone

CDP_URL = os.environ.get("SEEU_CDP_URL", "http://127.0.0.1:9222")
SEEU_BASE = "https://seeu.pje.jus.br/seeu"
MESA_FRAME_MARKER = "mesaDefensor1Grau.do"

# Abas suportadas na Fase 1 → (texto do link, ato da demanda).
ABAS_SUPORTADAS: dict[str, tuple[str, str]] = {
    "manifestacao": ("Manifestação", "Manifestação"),
    "ciencia": ("Ciência", "Ciência"),
    "razoes": ("Razões/Contrarrazões", "Razões"),
}


def normalize_conteudo(s: str) -> str:
    """Colapsa whitespace, strip, lowercase. Byte-idêntico ao TS normalizeConteudo."""
    s = s or ""
    return re.sub(r"\s+", " ", s).strip().lower()


def compute_content_hash(processo: str, doc_id: str | None, conteudo: str) -> str:
    """sha256(processo + "|" + (doc_id or "") + "|" + normalize_conteudo(conteudo)).
    No SEEU doc_id é sempre None → segmento vazio. Byte-idêntico ao TS."""
    payload = "%s|%s|%s" % (processo or "", doc_id or "", normalize_conteudo(conteudo))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def proc_seq_key(processo: str | None, seq: int | None) -> str | None:
    """Chave forte '<processo>|<seq>' ou None se faltar processo ou seq."""
    if not processo or seq is None:
        return None
    return "%s|%s" % (processo, seq)


def decide_layer_a_seeu(
    processo: str | None,
    seq: int | None,
    content_hash: str,
    ledger_index: dict,
) -> str:
    """ledger_index = {"by_proc_seq": {key: decisao}, "by_hash": {hash: decisao}}.
    Retorna 'nova' | 'duplicada' | 'ja_importada'. Chave forte = processo+seq;
    content_hash é fallback."""
    key = proc_seq_key(processo, seq)
    if key and key in ledger_index.get("by_proc_seq", {}):
        prev = ledger_index["by_proc_seq"][key]
        return "ja_importada" if prev == "imported" else "duplicada"
    if content_hash in ledger_index.get("by_hash", {}):
        prev = ledger_index["by_hash"][content_hash]
        return "ja_importada" if prev == "imported" else "duplicada"
    return "nova"


def load_seeu_ledger_index(sb) -> dict:
    """Lê TODOS os rows de seeu_ledger e indexa por (processo|seq) e por hash.
    Pagina de 1000 em 1000 (PostgREST limita a resposta) p/ não subcontar."""
    PAGE = 1000
    idx: dict = {"by_proc_seq": {}, "by_hash": {}}
    offset = 0
    while True:
        rows = sb._req(
            "GET",
            f"/rest/v1/seeu_ledger"
            f"?select=processo_numero,seq,content_hash,decisao"
            f"&limit={PAGE}&offset={offset}",
        ) or []
        for r in rows:
            k = proc_seq_key(r.get("processo_numero"), r.get("seq"))
            if k:
                idx["by_proc_seq"][k] = r["decisao"]
            if r.get("content_hash"):
                idx["by_hash"][r["content_hash"]] = r["decisao"]
        if len(rows) < PAGE:
            break
        offset += PAGE
    return idx
```

- [ ] **Step 3: Rodar os testes e confirmar que passam**

Run: `cd .claude/skills/seeu-intimacoes-import/scripts && python3 -m pytest test_seeu_helpers.py -v`
Expected: PASS (7 testes). Se pytest não estiver disponível, usar o `.venv` do enrichment-engine: `../../../../enrichment-engine/.venv/bin/python -m pytest test_seeu_helpers.py -v`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/seeu-intimacoes-import/scripts/seeu_intimacoes_import.py .claude/skills/seeu-intimacoes-import/scripts/test_seeu_helpers.py
git commit -m "feat(seeu-worker): helpers puros de dedup (processo+seq) com testes"
```

---

### Task 4: Worker de captura SEEU (navegação + scraping + staging)

**Files:**
- Modify: `.claude/skills/seeu-intimacoes-import/scripts/seeu_intimacoes_import.py` (adicionar navegação, scraping e `run()`)
- Create: `.claude/skills/seeu-intimacoes-import/SKILL.md`

**Interfaces:**
- Consumes: helpers do Task 3; `seeu_import_staging`/`seeu_ledger` do Task 2; reusa `load_env`/`Supabase` de `varredura-triagem` (como o worker PJe).
- Produces: linhas em `seeu_import_staging` (`conteudo` = innerText cru do bloco por expediente; `tab`, `seq`, `ato` preenchidos); atualiza `claude_code_tasks`. CLI: `--job-id N --atribuicoes EXECUCAO_PENAL --abas manifestacao,ciencia,razoes [--modo cdp] [--limit 200]`.

- [ ] **Step 1: Adicionar o patch de sys.path + SupabaseExt + set_etapa (espelho do PJe)**

No mesmo arquivo, adicionar (idêntico ao worker PJe — reuso deliberado):

```python
def _patch_varredura_path() -> None:
    varredura_dir = os.path.normpath(
        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                     "..", "..", "varredura-triagem", "scripts")
    )
    if varredura_dir not in sys.path:
        sys.path.insert(0, varredura_dir)


def set_etapa(sb, job_id: int, texto: str) -> None:
    sb.update("claude_code_tasks", {"id": "eq.%d" % job_id}, {"etapa": texto})


def _bump_ledger_last_seen(sb, processo, seq, content_hash, job_id) -> None:
    key = proc_seq_key(processo, seq)
    if key:
        flt = {"processo_numero": "eq.%s" % processo, "seq": "eq.%d" % seq}
    else:
        flt = {"content_hash": "eq.%s" % content_hash}
    sb.update("seeu_ledger", flt,
              {"last_seen_at": datetime.now(timezone.utc).isoformat(), "job_id": job_id})
```

- [ ] **Step 2: Adicionar navegação read-only na Mesa do Defensor**

Adicionar as funções de localização do frame, troca de aba (por texto, via `el.click()`), captura do innerText da tabela, e split em blocos por expediente. A captura NÃO usa seletores destrutivos:

```python
def _find_mesa_frame(page):
    """Retorna o Frame cuja URL contém mesaDefensor1Grau.do, ou None."""
    for f in page.frames:
        if MESA_FRAME_MARKER in (f.url or ""):
            return f
    return None


JS_CLICK_ABA = r"""(label) => {
  const as = [...document.querySelectorAll('a')];
  const el = as.find(a => (a.innerText || '').trim().startsWith(label));
  if (el) { el.click(); return true; }
  return false;
}"""

JS_TABLE_TEXT = r"""() => {
  const t = document.querySelector('table.resultTable');
  return t ? (t.innerText || '') : (document.body ? document.body.innerText : '');
}"""

# Split de um bloco de expediente por Seq: cada linha começa com um Seq de 3-4
# dígitos seguido do processo. Fatiamos a tabela em blocos "Seq..próximo Seq".
def _split_blocos_por_processo(texto_tabela: str) -> list[str]:
    """Devolve fatias de texto, uma por processo CNJ encontrado (com o Seq antes).
    Reusa a mesma heurística CNJ do parser TS — cada fatia é conteudo cru."""
    cnj_iter = list(re.finditer(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}", texto_tabela))
    blocos = []
    for i, m in enumerate(cnj_iter):
        ini = max(0, m.start() - 40)  # inclui o Seq imediatamente antes
        fim = cnj_iter[i + 1].start() - 40 if i + 1 < len(cnj_iter) else len(texto_tabela)
        fim = max(fim, m.end())
        blocos.append(texto_tabela[ini:fim])
    return blocos
```

- [ ] **Step 3: Adicionar o scraper assíncrono por aba**

```python
async def _async_scrape_mesa(env, abas: list[str], modo: str, limit: int, status_cb):
    try:
        from patchright.async_api import async_playwright  # type: ignore
    except ImportError:
        raise RuntimeError("patchright não instalado — ative o .venv do enrichment-engine")

    results: list[dict] = []
    async with async_playwright() as p:
        if modo != "cdp":
            raise RuntimeError("SEEU só suporta modo cdp (login manual via Keycloak)")
        try:
            browser = await p.chromium.connect_over_cdp(CDP_URL)
        except Exception as e:
            raise RuntimeError(f"Abra o SEEU logado (CDP erro: {e})")
        ctx = browser.contexts[0]
        page = next((pg for pg in ctx.pages if "seeu" in (pg.url or "")), None)
        if page is None:
            raise RuntimeError("Abra o SEEU logado — nenhuma aba do SEEU encontrada no browser CDP")
        frame = _find_mesa_frame(page)
        if frame is None:
            raise RuntimeError("Mesa do Defensor não encontrada — abra a Mesa no SEEU")

        for aba in abas:
            label, ato = ABAS_SUPORTADAS[aba]
            if status_cb:
                status_cb(f"Abrindo aba {label}…")
            frame = _find_mesa_frame(page)
            await frame.evaluate(JS_CLICK_ABA, label)
            await page.wait_for_timeout(2500)
            frame = _find_mesa_frame(page)  # re-resolve após o submit do form
            if frame is None:
                continue
            texto = await frame.evaluate(JS_TABLE_TEXT)
            for bloco in _split_blocos_por_processo(texto):
                cnj = re.search(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}", bloco)
                seqm = re.search(r"(\d{3,4})[\s\t\n]*" + re.escape(cnj.group(0)) if cnj else r"$^", bloco) if cnj else None
                results.append({
                    "aba": aba,
                    "ato": ato,
                    "processoNumero": cnj.group(0) if cnj else None,
                    "seq": int(seqm.group(1)) if seqm else None,
                    "conteudo": bloco,
                })
                if len(results) >= limit:
                    return results
    return results
```

> **Nota de captura:** o `conteudo` cru vai inteiro para o staging; o parsing autoritativo (assistido, classe, datas, prazo) é feito na camada TS por `parseIntimacoesUnificado`, já corrigido no Task 1. O worker só precisa acertar `processoNumero` e `seq` (chave de dedup).

- [ ] **Step 4: Adicionar `run()`, `parse_args()` e `main()` (espelho do PJe, tabelas SEEU)**

```python
def parse_args(argv=None):
    p = argparse.ArgumentParser(description="Importa Mesa do Defensor (SEEU) → seeu_import_staging")
    p.add_argument("--job-id", type=int, required=True)
    p.add_argument("--atribuicoes", default="EXECUCAO_PENAL")
    p.add_argument("--abas", default="manifestacao,ciencia,razoes")
    p.add_argument("--limit", type=int, default=300)
    p.add_argument("--modo", choices=["cdp"], default="cdp")
    return p.parse_args(argv)


def run(args) -> None:
    _patch_varredura_path()
    from varredura_triagem import load_env, Supabase  # type: ignore

    class SupabaseExt(Supabase):
        def insert(self, table, data):
            self._req("POST", f"/rest/v1/{table}", data, prefer="return=minimal")
        def update(self, table, filter_dict, data):
            qs = "&".join(f"{k}={v}" for k, v in filter_dict.items())
            self._req("PATCH", f"/rest/v1/{table}?{qs}", data, prefer="return=minimal")

    env = load_env()
    if not env.get("NEXT_PUBLIC_SUPABASE_URL") or not env.get("SUPABASE_SERVICE_ROLE_KEY"):
        raise RuntimeError("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local")
    sb = SupabaseExt(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])

    atrib = (args.atribuicoes.split(",")[0] or "EXECUCAO_PENAL").strip()
    abas = [a.strip() for a in args.abas.split(",") if a.strip() in ABAS_SUPORTADAS]

    set_etapa(sb, args.job_id, "Conectando ao SEEU…")
    ledger_index = load_seeu_ledger_index(sb)

    expedientes = asyncio.run(_async_scrape_mesa(
        env, abas, args.modo, args.limit,
        status_cb=lambda msg: set_etapa(sb, args.job_id, msg),
    ))

    total = 0
    for exp in expedientes:
        proc = exp.get("processoNumero")
        seq = exp.get("seq")
        ch = compute_content_hash(proc or "", None, exp.get("conteudo") or "")
        decisao = decide_layer_a_seeu(proc, seq, ch, ledger_index)
        sb.insert("seeu_import_staging", {
            "job_id": args.job_id,
            "atribuicao": atrib,
            "tab": exp.get("aba"),
            "seq": seq,
            "processo_numero": proc,
            "ato": exp.get("ato"),
            "conteudo": exp.get("conteudo") or "",
            "content_hash": ch,
            "decisao": decisao,
            "selected": decisao == "nova",
        })
        if decisao != "nova":
            _bump_ledger_last_seen(sb, proc, seq, ch, args.job_id)
        total += 1

    sb.update("claude_code_tasks", {"id": "eq.%d" % args.job_id}, {
        "status": "completed", "etapa": "Concluído",
        "resultado": {"raspadas": total, "abas": abas, "atribuicao": atrib},
    })
    print(f"[ok] {total} expediente(s) SEEU importados para staging.", flush=True)


def main(argv=None) -> None:
    args = parse_args(argv)
    try:
        run(args)
    except Exception as e:
        try:
            _patch_varredura_path()
            from varredura_triagem import load_env, Supabase  # type: ignore
            class _SB(Supabase):
                def update(self, table, filter_dict, data):
                    qs = "&".join(f"{k}={v}" for k, v in filter_dict.items())
                    self._req("PATCH", f"/rest/v1/{table}?{qs}", data, prefer="return=minimal")
            env = load_env()
            sb = _SB(env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SERVICE_ROLE_KEY"])
            etapa = ("Abra o SEEU logado" if "Abra o SEEU" in str(e) else "Falha na importação")
            sb.update("claude_code_tasks", {"id": "eq.%d" % args.job_id},
                      {"status": "failed", "erro": str(e)[:500], "etapa": etapa})
        except Exception as e2:
            print(f"ERRO ao gravar falha: {e2}", file=sys.stderr)
        print(f"ERRO: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Confirmar que os testes puros continuam passando**

Run: `cd .claude/skills/seeu-intimacoes-import/scripts && python3 -m pytest test_seeu_helpers.py -v`
Expected: PASS (imports do módulo maior não quebram os helpers — Playwright é importado lazy dentro de `_async_scrape_mesa`).

- [ ] **Step 6: Teste ao vivo (aceitação manual)**

Com o SEEU logado no browser CDP (porta em `SEEU_CDP_URL`), criar uma task e rodar:

```bash
# 1) inserir uma claude_code_tasks pending manualmente (ou via a UI do Task 7) e pegar o id N
python3 .claude/skills/seeu-intimacoes-import/scripts/seeu_intimacoes_import.py \
  --job-id N --atribuicoes EXECUCAO_PENAL --abas manifestacao,ciencia --modo cdp
```

Expected: imprime `[ok] <n> expediente(s) SEEU importados`; `seeu_import_staging` tem uma linha por expediente das abas Manifestação+Ciência, com `seq` e `processo_numero` preenchidos; nenhuma escrita no SEEU.

- [ ] **Step 7: Escrever o SKILL.md**

Criar `.claude/skills/seeu-intimacoes-import/SKILL.md` (frontmatter + instruções), espelhando `pje-intimacoes-import/SKILL.md`: descreve lane browser, CDP-attach ao SEEU logado, abas suportadas, tabelas SEEU, invioláveis (read-only; nunca escreve em demandas nem no SEEU), e o CLI. Frontmatter:

```markdown
---
name: seeu-intimacoes-import
description: Worker browser-lane que raspa a Mesa do Defensor do SEEU (Execução Penal) por aba (Manifestação/Ciência/Razões) e grava em seeu_import_staging, deduplicando por processo+Seq via seeu_ledger. NUNCA escreve em demandas nem no SEEU. Zero API paga — Python + browser CDP.
---
```

- [ ] **Step 8: Commit**

```bash
git add .claude/skills/seeu-intimacoes-import/
git commit -m "feat(seeu-worker): captura da Mesa do Defensor (Manifestação/Ciência/Razões) → staging"
```

---

### Task 5: Serviço SEEU (ledger upserts por processo+seq)

**Files:**
- Create: `src/lib/services/seeu-intimacoes-import.ts`
- Create: `src/lib/services/seeu-intimacoes-import.test.ts`

**Interfaces:**
- Consumes: `SeeuImportStaging` (Task 2); `stagingRowToImportRow` de `pje-intimacoes-import.ts` (reuso — `SeeuImportStaging` é estruturalmente compatível com `PjeImportStaging`).
- Produces: `buildSeeuLedgerUpserts(rows, selectedIds, jobId): SeeuLedgerUpsert[]` — consumido pelo router (Task 6).

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/services/seeu-intimacoes-import.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildSeeuLedgerUpserts } from "@/lib/services/seeu-intimacoes-import";
import type { SeeuImportStaging } from "@/lib/db/schema/seeu-import";

function row(over: Partial<SeeuImportStaging>): SeeuImportStaging {
  return {
    id: 1, jobId: 10, atribuicao: "EXECUCAO_PENAL", tab: "manifestacao",
    seq: 1552, processoNumero: "2000068-07.2025.8.05.0039", assistidoNome: "X",
    ato: "Manifestação", tipoDocumento: null, dataExpedicao: null,
    dataIntimacao: null, prazo: null, conteudo: "bloco", pjeDocumentoId: null,
    contentHash: "h1", decisao: "nova", matchedDemandaId: null,
    matchedLedgerId: null, selected: true, revisao: null,
    createdAt: new Date(), ...over,
  } as SeeuImportStaging;
}

describe("buildSeeuLedgerUpserts", () => {
  it("marca imported quando selecionado, preservando processo+seq", () => {
    const ups = buildSeeuLedgerUpserts([row({ id: 1 })], new Set([1]), 10);
    expect(ups[0]).toMatchObject({
      processoNumero: "2000068-07.2025.8.05.0039", seq: 1552,
      contentHash: "h1", decisao: "imported", jobId: 10,
    });
  });

  it("marca duplicate para linha ja_importada não selecionada e skipped p/ nova não selecionada", () => {
    const ups = buildSeeuLedgerUpserts(
      [row({ id: 1, decisao: "ja_importada" }), row({ id: 2, seq: 999, decisao: "nova" })],
      new Set(),
      10,
    );
    expect(ups[0].decisao).toBe("duplicate");
    expect(ups[1].decisao).toBe("skipped");
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm run test -- seeu-intimacoes-import`
Expected: FAIL — `buildSeeuLedgerUpserts` não existe.

- [ ] **Step 3: Implementar o serviço**

Criar `src/lib/services/seeu-intimacoes-import.ts`:

```ts
import type { SeeuImportStaging } from "@/lib/db/schema/seeu-import";

export type SeeuLedgerUpsert = {
  processoNumero: string | null;
  seq: number | null;
  contentHash: string;
  atribuicao: string | null;
  ato: string | null;
  decisao: "imported" | "skipped" | "duplicate";
  jobId: number;
};

/**
 * Mesma semântica de buildLedgerUpserts do PJe, porém com a chave forte do SEEU
 * (processo+seq) em vez de pjeDocumentoId. imported = selecionado; duplicate =
 * já vista (duplicada/ja_importada) não selecionada; skipped = nova não selecionada.
 */
export function buildSeeuLedgerUpserts(
  rows: SeeuImportStaging[],
  selectedIds: Set<number>,
  jobId: number,
): SeeuLedgerUpsert[] {
  return rows.map((r) => {
    let decisao: SeeuLedgerUpsert["decisao"];
    if (selectedIds.has(r.id)) decisao = "imported";
    else if (r.decisao === "duplicada" || r.decisao === "ja_importada")
      decisao = "duplicate";
    else decisao = "skipped";
    return {
      processoNumero: r.processoNumero ?? null,
      seq: r.seq ?? null,
      contentHash: r.contentHash,
      atribuicao: (r.atribuicao as string | null) ?? null,
      ato: r.ato ?? null,
      decisao,
      jobId,
    };
  });
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm run test -- seeu-intimacoes-import`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/seeu-intimacoes-import.ts src/lib/services/seeu-intimacoes-import.test.ts
git commit -m "feat(seeu): buildSeeuLedgerUpserts (chave forte processo+seq)"
```

---

### Task 6: Router `seeuIntimacoes`

**Files:**
- Create: `src/lib/trpc/routers/seeuIntimacoes.ts`
- Modify: root router (registrar `seeuIntimacoes`) — arquivo em `src/lib/trpc/routers/_app.ts` ou equivalente (localizar com grep abaixo)
- Create: `src/lib/trpc/routers/seeuIntimacoes.test.ts`

**Interfaces:**
- Consumes: `seeuImportStaging`/`seeuLedger` (Task 2); `stagingRowToImportRow` (reuso), `buildSeeuLedgerUpserts` (Task 5); `importarDemandas`.
- Produces: procedures `criarImportJob`, `listStaging`, `confirmarImport` sob `trpc.seeuIntimacoes.*` — consumidas pela UI (Task 7).

- [ ] **Step 1: Localizar o root router e o padrão de registro**

Run: `grep -rn "intimacoesRouter\|intimacoes:" src/lib/trpc/routers/_app.ts src/lib/trpc/root.ts 2>/dev/null; grep -rln "intimacoesRouter" src/lib/trpc`
Expected: identifica o arquivo que faz `intimacoes: intimacoesRouter`. Registrar `seeuIntimacoes` ao lado, no mesmo padrão.

- [ ] **Step 2: Escrever o teste que falha (unidade das funções puras do router)**

Criar `src/lib/trpc/routers/seeuIntimacoes.test.ts` — testar o `buildJobMeta` do router SEEU (mantém a superfície testável sem DB, espelhando o teste do router PJe):

```ts
import { describe, it, expect } from "vitest";
import { buildSeeuJobMeta } from "@/lib/trpc/routers/seeuIntimacoes";

describe("buildSeeuJobMeta", () => {
  it("normaliza abas e atribuição com defaults", () => {
    expect(buildSeeuJobMeta({ atribuicoes: ["EXECUCAO_PENAL"] })).toEqual({
      atribuicoes: ["EXECUCAO_PENAL"],
      abas: ["manifestacao", "ciencia", "razoes"],
      limit: 300,
    });
  });

  it("respeita abas explícitas", () => {
    expect(
      buildSeeuJobMeta({ atribuicoes: ["EXECUCAO_PENAL"], abas: ["ciencia"], limit: 50 }).abas,
    ).toEqual(["ciencia"]);
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar que falha**

Run: `npm run test -- seeuIntimacoes`
Expected: FAIL — módulo não existe.

- [ ] **Step 4: Implementar o router**

Criar `src/lib/trpc/routers/seeuIntimacoes.ts` (espelha `intimacoes.ts`, apontando para as tabelas SEEU; enriquecimento reusa `comCamposParseados` via re-export ou cópia mínima — aqui usamos `parseStagingRow` diretamente para os campos essenciais):

```ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { claudeCodeTasks } from "@/lib/db/schema/casos";
import { seeuImportStaging, seeuLedger } from "@/lib/db/schema/seeu-import";
import { demandas } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  stagingRowToImportRow,
  parseStagingRow,
  enrichStagingWithLiveDedup,
} from "@/lib/services/pje-intimacoes-import";
import { buildSeeuLedgerUpserts } from "@/lib/services/seeu-intimacoes-import";
import { importarDemandas } from "@/lib/services/pje-import";
import type { SeeuImportStaging } from "@/lib/db/schema/seeu-import";
import type { PjeImportStaging } from "@/lib/db/schema/pje-import";

const ABAS = ["manifestacao", "ciencia", "razoes"] as const;

const criarImportJobInput = z.object({
  atribuicoes: z.array(z.enum(["EXECUCAO_PENAL"])).min(1),
  abas: z.array(z.enum(ABAS)).min(1).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});
export type CriarSeeuImportJobInput = z.infer<typeof criarImportJobInput>;

export function buildSeeuJobMeta(input: CriarSeeuImportJobInput) {
  return {
    atribuicoes: input.atribuicoes,
    abas: input.abas ?? [...ABAS],
    limit: input.limit ?? 300,
  };
}

// SeeuImportStaging é superconjunto estrutural de PjeImportStaging → os helpers
// de serviço (stagingRowToImportRow, enrichStagingWithLiveDedup) aceitam via cast.
const asPje = (rows: SeeuImportStaging[]) => rows as unknown as PjeImportStaging[];

export const seeuIntimacoesRouter = router({
  criarImportJob: protectedProcedure
    .input(criarImportJobInput)
    .mutation(async ({ ctx, input }) => {
      const emAndamento = await db
        .select({ id: claudeCodeTasks.id })
        .from(claudeCodeTasks)
        .where(and(
          eq(claudeCodeTasks.skill, "seeu-intimacoes-import"),
          inArray(claudeCodeTasks.status, ["pending", "processing"]),
        ))
        .limit(1);
      if (emAndamento.length > 0)
        return { success: true, existing: true, taskId: emAndamento[0].id };

      const meta = buildSeeuJobMeta(input);
      const [task] = await db.insert(claudeCodeTasks).values({
        skill: "seeu-intimacoes-import",
        lane: "browser",
        prompt: `Importar intimações SEEU — ${meta.abas.join(", ")} (Execução Penal)`,
        instrucaoAdicional: JSON.stringify(meta),
        status: "pending",
        createdBy: ctx.user.id,
      }).returning({ id: claudeCodeTasks.id });
      return { success: true, existing: false, taskId: task.id };
    }),

  listStaging: protectedProcedure
    .input(z.object({ jobId: z.number().int() }))
    .query(async ({ input }) => {
      const [task] = await db
        .select({ status: claudeCodeTasks.status, etapa: claudeCodeTasks.etapa })
        .from(claudeCodeTasks)
        .where(eq(claudeCodeTasks.id, input.jobId))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Job SEEU não encontrado" });

      const stagingRows = await db
        .select().from(seeuImportStaging)
        .where(eq(seeuImportStaging.jobId, input.jobId))
        .orderBy(seeuImportStaging.id);

      const withParsed = (rows: SeeuImportStaging[]) =>
        rows.map((r) => {
          const int = parseStagingRow(r as unknown as PjeImportStaging)?.int;
          return {
            ...r,
            assistidoParsed: int?.assistido ?? null,
            crime: int?.crime ?? null,
            tipoProcesso: int?.tipoProcesso ?? null,
          };
        });

      if (task.status === "completed") {
        const demandasVivas = await db.select().from(demandas).where(isNull(demandas.deletedAt));
        const enriched = enrichStagingWithLiveDedup(asPje(stagingRows), demandasVivas) as unknown as SeeuImportStaging[];
        return { status: task.status, etapa: task.etapa ?? null, rows: withParsed(enriched) };
      }
      return { status: task.status, etapa: task.etapa ?? null, rows: withParsed(stagingRows) };
    }),

  confirmarImport: protectedProcedure
    .input(z.object({
      jobId: z.number().int(),
      selectedIds: z.array(z.number().int()),
      edits: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const stagingRows = await db
        .select().from(seeuImportStaging)
        .where(eq(seeuImportStaging.jobId, input.jobId));
      const selectedSet = new Set(input.selectedIds);
      const withEdits = stagingRows.map((r) => {
        const e = input.edits?.[String(r.id)];
        return e ? { ...r, revisao: { ...(r.revisao ?? {}), ...e } } : r;
      });
      const importRows = withEdits
        .filter((r) => selectedSet.has(r.id))
        .map((r) => stagingRowToImportRow(r as unknown as PjeImportStaging));
      const result = await importarDemandas(importRows, ctx.user.id, false);

      const upserts = buildSeeuLedgerUpserts(withEdits, selectedSet, input.jobId);
      let ledgerWritten = 0;
      await db.transaction(async (tx) => {
        for (const u of upserts) {
          let existing: { id: number } | undefined;
          if (u.processoNumero && u.seq != null) {
            [existing] = await tx.select({ id: seeuLedger.id }).from(seeuLedger)
              .where(and(eq(seeuLedger.processoNumero, u.processoNumero), eq(seeuLedger.seq, u.seq)))
              .limit(1);
          } else {
            [existing] = await tx.select({ id: seeuLedger.id }).from(seeuLedger)
              .where(and(eq(seeuLedger.contentHash, u.contentHash), isNull(seeuLedger.seq)))
              .limit(1);
          }
          if (existing) {
            await tx.update(seeuLedger)
              .set({ decisao: u.decisao, lastSeenAt: new Date(), jobId: u.jobId })
              .where(eq(seeuLedger.id, existing.id));
          } else {
            await tx.insert(seeuLedger).values({
              processoNumero: u.processoNumero,
              seq: u.seq,
              contentHash: u.contentHash,
              atribuicao: u.atribuicao as never,
              ato: u.ato,
              decisao: u.decisao,
              jobId: u.jobId,
            });
          }
          ledgerWritten++;
        }
      });
      return { ...result, ledgerWritten };
    }),
});
```

- [ ] **Step 5: Registrar o router no root**

No arquivo identificado no Step 1, importar e registrar (exemplo):

```ts
import { seeuIntimacoesRouter } from "./seeuIntimacoes";
// ... dentro do appRouter:
  seeuIntimacoes: seeuIntimacoesRouter,
```

- [ ] **Step 6: Rodar o teste + typecheck**

Run: `npm run test -- seeuIntimacoes && npm run typecheck`
Expected: PASS e sem erros de tipo.

- [ ] **Step 7: Commit**

```bash
git add src/lib/trpc/routers/seeuIntimacoes.ts src/lib/trpc/routers/seeuIntimacoes.test.ts src/lib/trpc/routers/_app.ts
git commit -m "feat(seeu): router seeuIntimacoes (criar job, listStaging, confirmar → triagem)"
```

---

### Task 7: UI — modal assíncrono + dropdown + página de revisão parametrizada

**Files:**
- Create: `src/components/demandas-premium/seeu-intimacoes-import-modal.tsx` (modal ASSÍNCRONO, espelho de `intimacoes-import-modal.tsx` — NÃO reusar o `seeu-import-modal.tsx` de copy-paste)
- Modify: `src/components/demandas-premium/import-dropdown.tsx` (item "Importar Execução Penal (SEEU)")
- Modify: `src/app/(dashboard)/admin/demandas/importar/[jobId]/page.tsx` (parametrizar por `skill` da task)

**Interfaces:**
- Consumes: `trpc.seeuIntimacoes.criarImportJob` / `listStaging` / `confirmarImport` (Task 6).
- Produces: fluxo dropdown → modal → `/admin/demandas/importar/[jobId]` → confirmação.

- [ ] **Step 1: Criar o modal assíncrono SEEU**

Criar `src/components/demandas-premium/seeu-intimacoes-import-modal.tsx` espelhando `intimacoes-import-modal.tsx`, mas: sem seletor de atribuição (fixo `EXECUCAO_PENAL`), com checkboxes de abas (`manifestacao`, `ciencia`, `razoes`, default todas), chamando `trpc.seeuIntimacoes.criarImportJob.useMutation()` e navegando para `/admin/demandas/importar/${taskId}` no sucesso. Reusar os componentes `Dialog`, `Button` e `toast` do modal PJe.

- [ ] **Step 2: Adicionar o item no dropdown de importação**

Em `src/components/demandas-premium/import-dropdown.tsx`, adicionar um item "Importar Execução Penal (SEEU)" que abre o novo modal (seguindo o padrão do item PJe existente — prop `onImportSEEUAsync` ou evento global, conforme o padrão do arquivo).

- [ ] **Step 3: Parametrizar a página de revisão por skill da task**

Em `src/app/(dashboard)/admin/demandas/importar/[jobId]/page.tsx`, ler o `skill` da task (via uma query leve que já exista ou adicionar `trpc.seeuIntimacoes.listStaging` vs `trpc.intimacoes.listStaging`). Selecionar o router:

```ts
// Descobre o sistema pela task e escolhe o router.
const isSeeu = task?.skill === "seeu-intimacoes-import";
const listStaging = isSeeu
  ? trpc.seeuIntimacoes.listStaging.useQuery({ jobId })
  : trpc.intimacoes.listStaging.useQuery({ jobId });
const confirmar = isSeeu
  ? trpc.seeuIntimacoes.confirmarImport.useMutation()
  : trpc.intimacoes.confirmarImport.useMutation();
```

> Se a página hoje não conhece o `skill` da task, adicionar uma procedure leve `trpc.tasks.getSkill({ jobId })` ou reusar uma existente. Manter as colunas idênticas; `seq`/`classeProcessual` do SEEU aparecem como colunas opcionais quando presentes.

- [ ] **Step 4: Verificar no browser (dev server)**

Run: iniciar o dev server (Turbopack) e abrir `/admin/demandas`. Abrir o dropdown de importação → "Importar Execução Penal (SEEU)" → selecionar abas → confirmar. Verificar que cria o job e navega para a página de revisão.

Expected: modal abre, dispara `criarImportJob`, navega para `/admin/demandas/importar/[jobId]`; a página mostra o status do job SEEU.

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/demandas-premium/seeu-intimacoes-import-modal.tsx src/components/demandas-premium/import-dropdown.tsx "src/app/(dashboard)/admin/demandas/importar/[jobId]/page.tsx"
git commit -m "feat(seeu-ui): modal assíncrono + dropdown + página de revisão parametrizada"
```

---

## Validação final (aceitação da Fase 1)

- [ ] **E2E ao vivo (Camaçari):** com o SEEU logado, disparar pela UI → worker raspa Manifestação+Ciência → revisar → confirmar. As demandas nascem em triagem (`ato` correto por aba). Reexecutar: nada duplica (dedup processo+Seq).
- [ ] `npm run test` verde (parser SEEU + serviço SEEU + router SEEU + testes existentes).
- [ ] `npm run typecheck` e `npm run lint` verdes.

## Self-Review (cobertura do spec)

- Parser fixes (spec §4) → Task 1. ✓
- Tabelas próprias + dedup processo+seq (spec §5) → Tasks 2, 3, 5. ✓
- Worker de captura Manifestação/Ciência/Razões, read-only (spec §6) → Task 4. ✓
- Router + gate EXECUCAO_PENAL + promoção em triagem (spec §7) → Task 6. ✓
- UI modal + dropdown + revisão parametrizada (spec §7) → Task 7. ✓
- Fase 1.5 (Pendências de Incidentes) e Fase 2 (análise da triagem) → fora deste plano, por design. ✓
```
