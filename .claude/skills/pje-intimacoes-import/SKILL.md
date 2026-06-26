---
name: pje-intimacoes-import
description: >
  Worker browser-lane: raspa a aba EXPEDIENTES do Painel do Defensor no PJe TJBA
  por atribuição e intervalo de datas, aplica deduplicação Layer-A via ledger e
  grava os resultados em pje_import_staging. NUNCA escreve em demandas. Zero API
  paga — apenas Python + browser (CDP ou headless).
triggers:
  - "importar intimações"
  - "scrape expedientes"
  - "worker pje intimacoes"
---

# pje-intimacoes-import

## Propósito

Worker autônomo de **captura** (não de interpretação) que:
1. Abre o Painel do Defensor no PJe TJBA (via CDP ou login direto)
2. Navega para a aba EXPEDIENTES por drill-down em ÁRVORE: situação → comarca →
   vara (clicando por TEXTO; IDs JSF são instáveis e NUNCA são usados)
3. Extrai todos os expedientes linha a linha (com paginação RichFaces),
   capturando por linha: `rowId` (= `pje_documento_id`, chave estável) e o
   **texto cru da célula** (bloco do expediente, com quebras de linha)
4. Aplica deduplicação Layer-A: compara contra `pje_intimacoes_ledger` pelo
   `pje_documento_id` e pelo `content_hash`
5. Grava cada expediente em `pje_import_staging` (`conteudo` = bloco cru) com
   `selected=true` se `decisao=nova`, ou `false` se `duplicada`/`ja_importada`
6. Faz bump de `last_seen_at` no ledger para hits Layer-A
7. Atualiza `claude_code_tasks` com status/progresso/resultado

**Arquitetura de parsing (fonte única):** o worker NÃO interpreta semântica. Ele
grava o `conteudo` cru; o significado (assistido com taxonomia de polos +
title-case, crime, tipoProcesso, vara, MPU) é extraído pela camada TS ao promover
staging → demandas, via `parseIntimacoesUnificado` (`src/lib/pje-parser.ts`) em
`stagingRowToImportRow`. O parser unificado **auto-detecta PJe vs SEEU** pelo
conteúdo, então blocos do SEEU (Mesa do Defensor / execução penal) são roteados
sozinhos para `intimacaoSEEUToDemanda`. Assim há UM só parser, batível por testes
e reaproveitado com a importação manual (cópia-colagem) e com o cron
`/api/cron/pje-import`. O `_parse_row` em Python preenche apenas colunas
best-effort (assistido/ato/processo) para exibição na tela de revisão.

**Atribuições validadas ao vivo (Camaçari):** `VVD_CAMACARI` (Vara de Violência
Doméstica) e `JURI_CAMACARI` (Vara do Júri e Execuções Penais — Júri **e** EP
compartilham a mesma vara no PJe Camaçari). Para uma nova atribuição/comarca,
basta uma linha em `ATRIB_UNIDADE` + a palavra-chave da vara na estabilização.

**Regra inviolável:** este worker NUNCA escreve na tabela `demandas`. A
promoção staging → demandas é feita pela API (`confirmarImport`).

## CLI

```bash
python3 pje_intimacoes_import.py \
  --job-id 42 \
  --atribuicoes VVD_CAMACARI,JURI_CAMACARI \
  [--since YYYY-MM-DD] \
  [--until YYYY-MM-DD] \
  [--limit 80] \
  [--modo cdp|direct]
```

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `--job-id` | sim | ID do registro `claude_code_tasks` que monitora este job |
| `--atribuicoes` | sim | CSV de atribuições (ex: `VVD_CAMACARI,JURI_CAMACARI`) |
| `--since` | não | Data mínima `YYYY-MM-DD` (filtro de expedição no PJe) |
| `--until` | não | Data máxima `YYYY-MM-DD` |
| `--limit` | não | Máximo de expedientes por atribuição (default: 80) |
| `--modo` | não | `cdp` (default) = anexa Chromium aberto; `direct` = headless + login |

## Env vars necessárias

Lidas de `/Users/rodrigorochameire/Projetos/Defender/.env.local` via `load_env()` de varredura_triagem.py:

| Var | Obrigatório | Descrição |
|-----|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Chave service-role (acesso total) |
| `PJE_CPF` | só modo direct | CPF para login no PJe |
| `PJE_SENHA` | só modo direct | Senha para login no PJe |

## Modo CDP (recomendado)

1. Abra o Chromium com flag de debug:
   ```
   /Applications/Chromium.app/Contents/MacOS/Chromium --remote-debugging-port=9222
   ```
2. Logue no PJe e navegue até o Painel do Defensor
3. Execute o worker com `--modo cdp`

O worker localiza automaticamente a aba aberta e aplica os filtros de vara/data.
Se o CDP estiver desligado E o login direto falhar, o worker termina com
`status=failed` e `etapa="Abra o PJe logado ou configure credenciais"`.

## Reuso de varredura_triagem.py

O worker importa lazily (dentro de `run()`):
- `load_env()` — lê `.env.local`
- `Supabase` — cliente REST base, estendido localmente com `.select()`, `.insert()`, `.update()`

O import usa `sys.path.insert` calculado relativamente a `__file__` para
apontar para `.claude/skills/varredura-triagem/scripts/`. Os helpers puros
(`normalize_conteudo`, `compute_content_hash`, `decide_layer_a`) são definidos
no topo do módulo sem imports pesados, para que o módulo de testes possa
importá-los sem Playwright.

## Navegação e extração (VALIDADO ao vivo — Camaçari VVD)

Navegação por **árvore**, clicando por texto (sem IDs JSF):
`aba Expedientes` → situação `Pendentes de ciência ou de resposta` → comarca →
unidade/vara. Mapa em `ATRIB_UNIDADE` no script:

```python
ATRIB_UNIDADE = {
    "VVD_CAMACARI":  ("CAMAÇARI", "Vara de Violência doméstica"),
    "JURI_CAMACARI": ("CAMAÇARI", "Vara do Júri e Execuções Penais"),
}
```

Para acrescentar atribuição (EP/Criminal), basta **uma linha** aqui — o parser
TS já reconhece os padrões de polo dessas varas.

| O quê | Como | Status |
|-------|------|--------|
| Tabela de expedientes | `#formExpedientes:tbExpedientes:tb` | Confirmado |
| Linhas | `tr.rich-table-row` | Confirmado |
| `pje_documento_id` | `rowId` do innerHTML: `tbExpedientes:(\d+):` | Confirmado |
| Texto do expediente | `cell[0]`=ação, `cell[1]`=bloco do intimado/ato/data/partes/vara, `cell[2]`=classe+CNJ+polos | Confirmado |
| `conteudo` gravado | `cell[1]` cru (newlines preservadas) — formato idêntico à cópia-colagem | Confirmado |

**Robustez de timing (RichFaces AJAX é racy — 3 correções validadas):**
- *Navegação:* só extrai quando a tabela ESTABILIZA (contagem de linhas estável
  por 2 ciclos) **e** o texto contém a palavra-chave da vara — evita ler a tabela
  transitória de um nó anterior (já causou ruído: processo de outra vara/comarca).
- *Paginação:* após clicar "próxima", espera o 1º `rowId` MUDAR antes de
  re-extrair; um guard `seen_row_ids` descarta linhas repetidas e encerra se uma
  página inteira repetir — impede duplicação (já gerou 40×2).
- *Login (CDP):* o worker abre `login.seam` e aguarda (auto-detecta) o login
  manual na janela do Chromium — contorna o desafio Keycloak JS que quebra login
  HTTP puro.

## Hash de conteúdo

`compute_content_hash(processo, doc_id, conteudo)` é byte-idêntico ao TS
`computeContentHash` (Task 2):

```
sha256( processo + "|" + (doc_id or "") + "|" + normalize_conteudo(conteudo) )
```

onde `normalize_conteudo` = colapsar whitespace + strip + lowercase (UTF-8).

## Tabelas gravadas

| Tabela | Operações | Condição |
|--------|-----------|----------|
| `pje_import_staging` | INSERT por expediente | sempre |
| `pje_intimacoes_ledger` | UPDATE `last_seen_at` | decisao != 'nova' |
| `claude_code_tasks` | UPDATE etapa/status/resultado | heartbeat + conclusão |

**NUNCA:** `demandas`, `registros`, `processos`, `assistidos` ou qualquer outra tabela.
