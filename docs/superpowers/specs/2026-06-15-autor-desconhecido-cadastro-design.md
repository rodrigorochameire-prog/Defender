# Cadastro de autor não identificado — convenção e desfusão

**Data:** 2026-06-15
**Autor:** Rodrigo Rocha Meire + Claude
**Status:** Aprovado para planejamento
**Branch:** `feat/autor-desconhecido-cadastro`

---

## 1. Problema

Processos com **autor não identificado** (polo passivo "Desconhecido"/"Não Identificado" — típico de produção antecipada de prova, IP sem indiciamento etc.) caem hoje em dois caminhos de import com comportamentos divergentes:

- **`importarDemandas`** (`src/lib/services/pje-import.ts`, ~169-500): no passo de reuso por nome (`ilike` exato, ~232-252) **funde** todos os "Não Identificado"/"Desconhecido" num **mesmo assistido**. Foi assim que o assistido `id=2232` ("Não Identificado") nasceu — e qualquer novo desconhecido tenderia a colar nele.
- **Webhook `openclaw`** (`src/app/api/webhooks/openclaw/route.ts`, ~78-200): já cria placeholder **ancorado no CNJ** (`"⚠ A identificar — {CNJ}"`, constante `ASSISTIDO_A_IDENTIFICAR` em `src/lib/pje-parser.ts:22`) e **não funde** — mas o nome é cru e o mecanismo é exclusivo desse caminho.

Consequências: cadastros de autor desconhecido colidem entre casos distintos, o nome não diz qual caso é, e a unicidade fica frágil (contador implícito). O parser **já marca** `assistidoNaoIdentificado=true` (`pje-parser.ts:546`), mas o `importarDemandas` ignora essa flag no passo de reuso.

## 2. Objetivo e escopo

Unificar o tratamento de autor não identificado sob uma invariante única:

> **Autor não identificado nunca funde: sempre um assistido NOVO, ancorado no CNJ (único, imutável, não-sensível), marcado por flag. O nome começa como placeholder e é enriquecido quando o scrape traz classe/assunto/polo.**

Entregas:
1. Migração de schema (flag `autor_nao_identificado`).
2. Helpers puros de detecção e nomenclatura.
3. Regra de matching (never-merge).
4. Unificação dos dois caminhos de import.
5. Enriquecimento do nome (placeholder → descritivo) no scrape.
6. Backfill dos cadastros existentes (inclui **desfusão** de assistidos que agregaram múltiplos processos).

**Fora de escopo:** mudar o parser de intimações para capturar polo passivo na intimação (o polo vem do scrape de autos, não da intimação — decisão de timing já tomada). UI/badge do flag fica como follow-up opcional.

## 3. Convenção de nome (decidida)

- **Placeholder (no import):** `Desconhecido — {CNJ}` — único por definição, nunca funde.
- **Descritivo (após enriquecimento):** `Desconhecido N — {TipoPenal} ({SiglaProc} · {Comarca})`
  - `N` = número do réu incerto dentro do processo (do polo passivo do PJe "Desconhecido 1/2…"); omitido se ausente/único.
  - `TipoPenal` = `processos.assunto` (ex.: "Estupro").
  - `SiglaProc` = sigla do procedimento derivada de `classe_processual` (ex.: "PRODUÇÃO ANTECIPADA DE PROVAS CRIMINAL" → "PAP"; "INQUÉRITO POLICIAL" → "IP"; "AÇÃO PENAL" → "AP"; "MEDIDAS PROTETIVAS" → "MPU"; fallback = classe truncada).
  - `Comarca` = `processos.comarca`.
  - **Desempate** (quando dois cadastros gerariam string idêntica): sufixo ` · {seq}` com o sequencial do CNJ (`8013994`), garantindo unicidade determinística.
  - Degradação graciosa: faltando `assunto`/`comarca`, monta a melhor versão possível; sem nenhum, mantém o placeholder.

Exemplo real (proc. 8013994-84.2024.8.05.0039): `Desconhecido 1 — Estupro (PAP · Camaçari)`.

## 4. Schema (migração)

`drizzle/schema.ts` (tabela `assistidos`, ~3436-3503):
```ts
autorNaoIdentificado: boolean("autor_nao_identificado").default(false).notNull(),
```
Migração SQL (com `lock_timeout`, conforme regra do projeto):
```sql
SET lock_timeout = '5s';
ALTER TABLE assistidos ADD COLUMN autor_nao_identificado boolean NOT NULL DEFAULT false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS assistidos_autor_nao_id_idx
  ON assistidos (autor_nao_identificado) WHERE autor_nao_identificado;
```
`processos.parte_contraria` (já existe, ~232) passa a guardar a **string do polo passivo** do PJe quando o scrape a captura (fonte do `N`).

## 5. Helpers puros — `src/lib/autor-desconhecido.ts` (novo, testável em vitest)

```ts
export function isAutorDesconhecido(s: string | null | undefined): boolean;
// casa /desconhecid|n[ãa]o identificad|incerto|ignorad|a identificar/i (após normalizar)

export function placeholderAutorDesconhecido(cnj: string): string;
// `Desconhecido — ${cnj}`

export function siglaProcedimento(classe: string | null | undefined): string | null;
// catálogo: PAP|IP|AP|MPU|… ; fallback classe truncada; null se vazio

export function extrairNumeroDesconhecido(poloPassivo: string | null | undefined): number | null;
// "Desconhecido 1 (REQUERIDO)" → 1 ; null se ausente

export interface NomeAutorArgs {
  cnj: string; classe?: string|null; assunto?: string|null;
  comarca?: string|null; poloPassivo?: string|null; desempate?: boolean;
}
export function nomeAutorDesconhecido(a: NomeAutorArgs): string;
// "Desconhecido N — Tipo (Sigla · Comarca)" com degradação graciosa + sufixo seq do CNJ se desempate
```
Sem dependências de DB. Toda a lógica de string vive aqui.

## 6. Regra de matching — `src/lib/assistido-match.ts`

Guarda de entrada em `classificarMatchNome(nomeImport, nomeExistente)`:
```ts
if (isAutorDesconhecido(nomeImport) || isAutorDesconhecido(nomeExistente))
  return { tipo: "new", similarity: 0 };
```
Defense-in-depth — impede colagem mesmo se algum caminho esquecer de checar a flag. A **decisão primária** de criar-vs-reusar fica no serviço de import (§7).

## 7. Import — unificação dos dois caminhos

### 7a. `src/lib/services/pje-import.ts`
No bloco de resolução do assistido (~204-301): quando `row.assistidoNaoIdentificado === true`:
- **Pular** o reuso por `ilike` de nome (passo ~232-252) — não procurar por nome.
- O desempate por CNJ (~204-230) já reusa o assistido **do próprio processo** se o processo já existe — manter (idempotência por CNJ).
- Ao **criar** (~264-301): `nome = placeholderAutorDesconhecido(row.processoNumero)`, `autorNaoIdentificado: true`, `observacoes` explicando a origem.

### 7b. `src/app/api/webhooks/openclaw/route.ts`
- Usar `placeholderAutorDesconhecido(cnj)` em vez do literal `"⚠ A identificar — {CNJ}"`, e setar `autorNaoIdentificado: true` na criação.
- O "rename ao identificar" (~117-122) passa a reconhecer **placeholder novo + legado**: detectar via `isAutorDesconhecido(nome)` (cobre "⚠ A identificar" e "Desconhecido — {CNJ}") antes de sobrescrever com o nome real.

## 8. Enriquecimento — `src/lib/services/enriquecer-autor-desconhecido.ts` (novo)

```ts
export async function enriquecerNomeAutorDesconhecido(processoId: number): Promise<void>;
```
- Lê o processo (`classe_processual`, `assunto`, `comarca`, `parte_contraria`, `numero_autos`) e seu assistido.
- Se `assistido.autorNaoIdentificado` e há dados suficientes (ao menos `assunto` ou `classe`), computa `nomeAutorDesconhecido(...)` e atualiza `assistidos.nome` (com desempate se colidir com outro assistido).
- Idempotente: se o nome já é o descritivo correto, no-op.
- **Gatilho:** chamado onde o scrape grava metadata do processo (classe/assunto/comarca). O scrape passa a **gravar a string do polo passivo em `processos.parte_contraria`** (de onde sai o `N`). Identificar o ponto exato do scrape→DB durante o plano (candidatos: serviço de scrape/enrichment que atualiza `processos`; `popular_analysis_data` não escreve essas colunas).

## 9. Backfill — `scripts/backfill-autor-desconhecido.ts` (novo, idempotente, `--dry-run`)

1. Seleciona assistidos com `isAutorDesconhecido(nome)` OU `autor_nao_identificado=true`.
2. Para cada: `SET autor_nao_identificado = true`.
3. Conta processos vinculados:
   - **1 processo** → renomeia via `nomeAutorDesconhecido(...)` (usa metadata do processo; senão placeholder).
   - **>1 processo (fusão)** → **desfusão**: mantém o assistido para o 1º processo; para cada processo extra, cria assistido novo (placeholder/descritivo) e reaponta `processos.assistido_id` + `demandas.assistido_id` daquele processo.
4. `--dry-run` imprime o plano sem escrever; execução real loga cada mudança. Roda no worker local (não no app), com `prepare:false` no pooler.

## 10. Testes

**Unit (vitest):**
- `autor-desconhecido.test.ts`: `isAutorDesconhecido` (positivos/negativos), `siglaProcedimento` (catálogo + fallback), `extrairNumeroDesconhecido`, `nomeAutorDesconhecido` (completo, degradado, desempate).
- `assistido-match.test.ts` (existente): caso novo — dois nomes autor-desconhecido nunca casam (`tipo:"new"`).

**Integração (mock DB ou unit do helper de decisão):** dois CNJs de autor desconhecido geram dois assistidos distintos; enriquecimento faz upgrade do placeholder para descritivo.

**Backfill:** dry-run sobre um fixture com um assistido fundido (2 processos) → plano mostra desfusão correta.

## 11. Arquivos afetados

- `drizzle/schema.ts` + migração SQL.
- `src/lib/autor-desconhecido.ts` (novo) + teste.
- `src/lib/assistido-match.ts` (guarda) + teste existente.
- `src/lib/services/pje-import.ts` (bloco de resolução do assistido).
- `src/app/api/webhooks/openclaw/route.ts` (placeholder + flag + rename).
- `src/lib/services/enriquecer-autor-desconhecido.ts` (novo) + gatilho no scrape→DB.
- `scripts/backfill-autor-desconhecido.ts` (novo).

## 12. Retrocompatibilidade

- Cadastros existentes seguem funcionando; o backfill os normaliza (forward sem backfill também é seguro — só não renomeia/desfunde o legado).
- O placeholder legado "⚠ A identificar — {CNJ}" é reconhecido por `isAutorDesconhecido`, então o rename-ao-identificar continua válido.
- Flag default `false` → nenhum cadastro existente muda de comportamento até o backfill marcá-los.
