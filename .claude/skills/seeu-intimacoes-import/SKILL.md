---
name: seeu-intimacoes-import
description: >
  Worker browser-lane que raspa a Mesa do Defensor do SEEU (Execução Penal) por
  aba (Manifestação/Ciência/Razões) e grava em seeu_import_staging,
  deduplicando por processo+Seq via seeu_ledger. NUNCA escreve em demandas nem
  no SEEU. Zero API paga — Python + browser CDP.
triggers:
  - "importar intimações SEEU"
  - "scrape mesa do defensor"
  - "worker seeu intimacoes"
---

# seeu-intimacoes-import

## Propósito

Worker autônomo de **captura** (não de interpretação) que:
1. Anexa via CDP a um Chromium com o SEEU já logado (login manual — Keycloak
   quebra login HTTP puro)
2. Localiza o frame da Mesa do Defensor (`usuario/mesaDefensor1Grau.do`)
3. Para cada aba suportada (Manifestação / Ciência / Razões), clica o link
   pelo TEXTO (submete `mesaDefensor1GrauForm`) e re-resolve o frame após o
   AJAX
4. Extrai o innerText cru de `table.resultTable` e fatia em blocos, um por
   processo CNJ encontrado (com o Seq de 3-4 dígitos imediatamente anterior
   incluído)
5. Aplica deduplicação Layer-A: compara contra `seeu_ledger` pela chave forte
   `(processo_numero, seq)` e, na ausência dela, por `content_hash`
6. Grava cada expediente em `seeu_import_staging` (`conteudo` = bloco cru) com
   `selected=true` se `decisao=nova`, ou `false` se `duplicada`/`ja_importada`
7. Faz bump de `last_seen_at` no `seeu_ledger` para hits Layer-A
8. Atualiza `claude_code_tasks` com etapa/status/resultado

**Arquitetura de parsing (fonte única):** o worker NÃO interpreta semântica.
Ele grava o `conteudo` cru; o significado (assistido, classe, datas, prazo) é
extraído pela camada TS ao promover staging → demandas, via
`parseIntimacoesUnificado` (`src/lib/pje-parser.ts`), que auto-detecta PJe vs
SEEU pelo conteúdo e roteia para `intimacaoSEEUToDemanda`. O worker só precisa
acertar `processoNumero` e `seq` — a chave de dedup.

**Regras invioláveis:**
- **Read-only sobre o SEEU**: o worker só lê DOM, troca de aba e pagina. NUNCA
  clica "Dispensar Juntada", "Analisar", assina ou peticiona.
- **NUNCA escreve em `demandas`** (nem em `registros`/`processos`/`assistidos`).
  A promoção staging → demandas é feita pela API, fora deste worker.
- Playwright/patchright é importado **lazily** dentro de `_async_scrape_mesa`
  — nunca no topo do módulo — para que os helpers puros (usados pelo teste
  `test_seeu_helpers.py`) permaneçam importáveis com só stdlib.

## CLI

```bash
python3 seeu_intimacoes_import.py \
  --job-id 42 \
  --atribuicoes EXECUCAO_PENAL \
  --abas manifestacao,ciencia,razoes \
  [--modo cdp] \
  [--limit 300]
```

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `--job-id` | sim | ID do registro `claude_code_tasks` que monitora este job |
| `--atribuicoes` | não | Atribuição gravada em staging (default: `EXECUCAO_PENAL`) — só a primeira do CSV é usada |
| `--abas` | não | CSV de abas suportadas (default: `manifestacao,ciencia,razoes`) |
| `--limit` | não | Máximo de expedientes capturados no total (default: 300) |
| `--modo` | não | Só `cdp` (SEEU exige login manual via Keycloak) |

## Abas suportadas

Mapeadas em `ABAS_SUPORTADAS` no script — `chave CLI` → `(texto do link, ato da demanda)`:

```python
ABAS_SUPORTADAS = {
    "manifestacao": ("Manifestação", "Manifestação"),
    "ciencia": ("Ciência", "Ciência"),
    "razoes": ("Razões/Contrarrazões", "Razões"),
}
```

## Env vars necessárias

Lidas de `/Users/rodrigorochameire/Projetos/Defender/.env.local` via `load_env()` de `varredura_triagem.py`:

| Var | Obrigatório | Descrição |
|-----|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Chave service-role (acesso total) |
| `SEEU_CDP_URL` | não | Endpoint CDP (default: `http://127.0.0.1:9222`) |

## Modo CDP (único suportado)

1. Abra o Chromium com flag de debug:
   ```
   /Applications/Chromium.app/Contents/MacOS/Chromium --remote-debugging-port=9222
   ```
2. Logue manualmente no SEEU (Keycloak) e navegue até a **Mesa do Defensor**
   (`usuario/mesaDefensor1Grau.do`)
3. Execute o worker com `--modo cdp`

O worker localiza automaticamente a aba do SEEU e o frame da Mesa. Se o CDP
estiver desligado, sem aba do SEEU aberta, ou sem a Mesa carregada, o worker
termina com `status=failed` e `etapa="Abra o SEEU logado"`.

## Navegação e extração

Frame: `MESA_FRAME_MARKER = "mesaDefensor1Grau.do"` — localizado por
`_find_mesa_frame(page)` iterando `page.frames`.

Troca de aba: clique via JS (`JS_CLICK_ABA`) no `<a>` cujo texto começa com o
label da aba (ex.: "Manifestação"). O clique dispara o submit interno do
`mesaDefensor1GrauForm`; após ~2.5s, o frame é **re-resolvido** (o AJAX pode
recriar o frame).

Extração: `JS_TABLE_TEXT` captura o innerText cru de `table.resultTable`
(fallback: `document.body`). `_split_blocos_por_processo` fatia esse texto em
blocos, um por CNJ encontrado, incluindo os ~40 caracteres anteriores (onde
mora o Seq). `_seq_before_cnj` extrai o Seq (3-4 dígitos) imediatamente antes
do CNJ dentro do bloco — `None` se ausente.

| O quê | Como | Status |
|-------|------|--------|
| Frame da Mesa | URL contém `mesaDefensor1Grau.do` | Validado ao vivo |
| Abas | `<a>` cujo texto começa com "Manifestação"/"Ciência"/"Razões" | Validado ao vivo |
| Lista | `table.resultTable` | Validado ao vivo |
| `processo_numero` | CNJ via regex no bloco | Confirmado |
| `seq` | 3-4 dígitos imediatamente antes do CNJ | Confirmado |
| `conteudo` gravado | bloco cru (innerText, sem colapsar) | Confirmado |

## Hash de conteúdo

`compute_content_hash(processo, doc_id, conteudo)` é byte-idêntico ao TS
`computeContentHash`. No SEEU, `doc_id` é sempre `None` (segmento vazio):

```
sha256( processo + "|" + "" + "|" + normalize_conteudo(conteudo) )
```

onde `normalize_conteudo` = colapsar whitespace + strip + lowercase (UTF-8).

## Dedup Layer-A

Chave forte = `(processo_numero, seq)` via `proc_seq_key`. Quando ausente
(processo ou seq faltando), cai para `content_hash`. Índice construído por
`load_seeu_ledger_index` (pagina 1000 em 1000 para não subcontar). Decisão:

- `nova` — não encontrado no ledger por nenhuma das duas chaves
- `ja_importada` — encontrado e a decisão anterior foi `imported`
- `duplicada` — encontrado e a decisão anterior foi `skipped`

## Reuso de varredura_triagem.py

O worker importa lazily (dentro de `run()`/`main()`), com o mesmo padrão do
worker PJe (`pje-intimacoes-import`):
- `load_env()` — lê `.env.local`
- `Supabase` — cliente REST base, estendido localmente (`SupabaseExt`) com
  `.insert()`/`.update()`

O import usa `sys.path.insert` calculado relativamente a `__file__`, apontando
para `.claude/skills/varredura-triagem/scripts/`. Os helpers puros
(`normalize_conteudo`, `compute_content_hash`, `proc_seq_key`,
`decide_layer_a_seeu`, `load_seeu_ledger_index`) ficam no topo do módulo sem
imports pesados, para que `test_seeu_helpers.py` os importe sem Playwright.

## Tabelas gravadas

| Tabela | Operações | Condição |
|--------|-----------|----------|
| `seeu_import_staging` | INSERT por expediente | sempre |
| `seeu_ledger` | UPDATE `last_seen_at` | decisao != 'nova' |
| `claude_code_tasks` | UPDATE etapa/status/resultado | heartbeat + conclusão |

**NUNCA:** `demandas`, `registros`, `processos`, `assistidos` ou qualquer outra
tabela — e nenhuma escrita no SEEU (sem clique em ações que alterem estado
processual).
