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

Worker autônomo que:
1. Abre o Painel do Defensor no PJe TJBA (via CDP ou login direto)
2. Navega para a aba EXPEDIENTES, filtra por atribuição + intervalo de datas
3. Extrai todos os expedientes linha a linha (com paginação)
4. Aplica deduplicação Layer-A: compara contra `pje_intimacoes_ledger` pelo
   `pje_documento_id` e pelo `content_hash`
5. Grava cada expediente em `pje_import_staging` com flag `selected=true` se
   `decisao=nova`, ou `selected=false` se `duplicada`/`ja_importada`
6. Faz bump de `last_seen_at` no ledger para hits Layer-A
7. Atualiza `claude_code_tasks` com status/progresso/resultado

**Regra inviolável:** este worker NUNCA escreve na tabela `demandas`. A
promoção staging → demandas é feita pela API (Task 3).

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

## Selectors PJe (ASSUMPTION — verificar ao vivo)

Os seguintes selectors foram inferidos dos padrões de varredura_triagem.py e
estrutura RichFaces típica do PJe TJBA. **Devem ser verificados** inspecionando
o DOM real antes de uso em produção:

| O quê | Selector / Padrão | Status |
|-------|-------------------|--------|
| Tabela de expedientes | `#formExpedientes:tbExpedientes:tb` | Confirmado (varredura) |
| Linhas da tabela | `tr.rich-table-row` dentro do tbody | Confirmado (varredura) |
| Link Autos Digitais | `a[title="Autos Digitais"]` | Confirmado (varredura) |
| pjeDocumentoId | `?nd=XXX` no onclick do link | **ASSUMPTION** |
| Col 1 (processo) | `td:nth-child(2)` texto | **ASSUMPTION** |
| Col 2 (assistido) | `td:nth-child(3)` texto | **ASSUMPTION** |
| Col 3 (tipo doc) | `td:nth-child(4)` texto | **ASSUMPTION** |
| Col 4 (data expedição) | `td:nth-child(5)` texto | **ASSUMPTION** |
| Col 5 (data intimação) | `td:nth-child(6)` texto | **ASSUMPTION** |
| Col 6 (prazo) | `td:nth-child(7)` texto | **ASSUMPTION** |
| Dropdown vara | `select` com option text matching keyword | **ASSUMPTION** |
| Input data início | `input[id*="dataInicio"]` | **ASSUMPTION** |
| Input data fim | `input[id*="dataFim"]` | **ASSUMPTION** |
| Botão pesquisar | `input[type=submit][value*="Pesquisar"]` | **ASSUMPTION** |

## Mapeamento atribuição → keyword de vara

```python
ATRIB_VARA_KEYWORDS = {
    "VVD_CAMACARI":       ["VVD", "Violência Doméstica", ...],
    "JURI_CAMACARI":      ["Júri", "Juri", ...],
    "CRIMINAL_CAMACARI":  ["Criminal", "Camaçari"],
    "EXECUCAO_PENAL":     ["Execução Penal", ...],
}
```

Verificar se esses termos aparecem exatamente nos textos de `<option>` do
dropdown de vara/órgão julgador no painel do defensor.

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
