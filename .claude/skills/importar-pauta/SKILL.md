---
name: importar-pauta
description: >
  Worker browser-lane: raspa a PAUTA DE AUDIÊNCIAS do PJe TJBA
  (ProcessoAudiencia/PautaAudiencia/listView.seam) por atribuição e intervalo
  de datas e grava os resultados brutos em pauta_import_staging. NUNCA escreve
  em audiencias, assistidos ou processos. Zero API paga — apenas Python + browser
  (CDP ou headless).
triggers:
  - "importar pauta"
  - "scrape pauta de audiências"
  - "worker pauta pje"
  - "audiências do pje"
---

# importar-pauta

## Propósito

Worker autônomo de **captura** (não de interpretação) que:
1. Abre a página de Pauta de Audiências do PJe TJBA (via CDP ou login direto)
2. Aplica filtros de formulário: Jurisdição (comarca), Órgão julgador (vara),
   Situações = Todas, Período De/Até
3. Extrai todas as linhas da tabela de resultados (8 colunas) com paginação
   RichFaces
4. Aplica `normaliza_cnj` para rejuntar números de processo partidos por
   quebra de linha
5. Faz deduplicação intra-job por `content_hash` (não grava a mesma audiência
   duas vezes na mesma execução)
6. Grava cada audiência em `pauta_import_staging` com `selected=True`
7. Atualiza `claude_code_tasks` com status/progresso/resultado

**Regra inviolável:** este worker NUNCA escreve em `audiencias`, `assistidos`
ou `processos`. A promoção staging → demandas é feita pela API em passo posterior.

**Seletores de filtros/tabela:** validados ao vivo (marcados com
`# TODO: validar seletor ao vivo` no script). O PJe pode variar entre
versões; se um filtro falhar, o script loga o passo e prossegue — não abortando
a extração.

## CLI

```bash
python3 importar_pauta.py \
  --job-id 42 \
  --atribuicoes VVD_CAMACARI,JURI_CAMACARI \
  [--since YYYY-MM-DD] \
  [--until YYYY-MM-DD] \
  [--modo cdp|direct]
```

| Argumento | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `--job-id` | sim | ID do registro `claude_code_tasks` que monitora este job |
| `--atribuicoes` | sim | CSV de atribuições (ex: `VVD_CAMACARI,JURI_CAMACARI`) |
| `--since` | não | Data mínima `YYYY-MM-DD` do período a filtrar |
| `--until` | não | Data máxima `YYYY-MM-DD` do período a filtrar |
| `--modo` | não | `cdp` (default) = anexa Chromium aberto; `direct` = headless + login |

## Env vars necessárias

Lidas de `/Users/rodrigorochameire/Projetos/Defender/.env.local` via `load_env()`
de varredura_triagem.py:

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
2. Logue no PJe normalmente na janela do Chromium
3. Execute o worker com `--modo cdp`

O worker localiza automaticamente a sessão ativa, navega para a página da pauta
e aplica os filtros. Se o CDP estiver desligado E o login direto falhar, o
worker termina com `status=failed` e
`etapa="Abra o PJe logado ou configure credenciais"`.

## Infraestrutura (espelhada de pje_intimacoes_import.py)

| Componente | Espelhado de |
|------------|-------------|
| `_patch_varredura_path()` + lazy import | pje_intimacoes_import.py |
| `SupabaseExt` (select/insert/update) | pje_intimacoes_import.py |
| `connect_over_cdp(CDP_URL)` | pje_intimacoes_import.py |
| `_ensure_logged_in` (auto-detect loop) | pje_intimacoes_import.py |
| `_poll` / `_js_click_text` / `_text_present` | pje_intimacoes_import.py |
| `JS_RESET_TO_PAGE_1` / `JS_GOTO_PAGE` | pje_intimacoes_import.py |
| `set_etapa` heartbeat | pje_intimacoes_import.py |
| `_dismiss_pauta_modal` (X → Esc → poll) | _dismiss_distribuir_modal |
| Erro CDP → `etapa="Abra o PJe logado…"` | pje_intimacoes_import.py |

O import de `varredura_triagem` é **lazy** (dentro de `run()`), para que os
helpers puros (`compute_pauta_hash`, `parse_data_hora`, `normaliza_cnj`) sejam
importáveis pelo arquivo de testes sem Playwright.

## Atribuições mapeadas

```python
ATRIB_UNIDADE = {
    "VVD_CAMACARI":  ("CAMAÇARI", "Vara de Violência doméstica"),
    "JURI_CAMACARI": ("CAMAÇARI", "Vara do Júri e Execuções Penais"),
}
```

Para acrescentar atribuição, basta uma linha neste mapa.

## Tabela da pauta — colunas extraídas (td por índice)

| Índice | Campo | Gravado como |
|--------|-------|-------------|
| 0 | Data/hora | `data_audiencia` (via `parse_data_hora`) |
| 1 | Processo | `processo_numero` (via `normaliza_cnj`) |
| 2 | Órgão julgador | `orgao_julgador` |
| 3 | Partes | `partes_raw` |
| 4 | Classe | `classe_raw` |
| 5 | Tipo de audiência | `tipo_raw` |
| 6 | Sala | `sala` |
| 7 | Situação | `situacao` |

## Seletores pendentes de validação ao vivo

Os seguintes seletores estão marcados com `# TODO: validar seletor ao vivo`
no script e devem ser confirmados/corrigidos na primeira execução live:

| Helper | Seletor candidato | O que validar |
|--------|------------------|---------------|
| `_set_jurisdicao` | `select[id*="jurisdicao"]`, `select[id*="comarca"]` | ID real do select de comarca |
| `_set_orgao_julgador` | `select[id*="orgaoJulgador"]`, `select[id*="unidade"]` | ID real do select de vara; dependência de AJAX pós-comarca |
| `_set_situacoes_todas` | `input[id*="todas"]`, `input[id*="situacaoTodas"]` | ID/tipo do checkbox "Todas" |
| `_set_periodo` (De) | `input[id*="dataInicio"]`, `input[id*="dtInicio"]` | ID do campo data início; formato aceito (DD/MM/YYYY vs picker) |
| `_set_periodo` (Até) | `input[id*="dataFim"]`, `input[id*="dtFim"]` | ID do campo data fim |
| `_click_pesquisar` | `input[type=submit]` com texto "Pesquisar" | ID/texto real do botão de busca |
| `JS_EXTRACT_PAUTA_ROWS` | `table.rich-table tbody`, `[id*="tbAudiencias"]` | ID/classe do tbody da tabela de resultados |
| `_table_loaded` | mesmos que JS_EXTRACT_PAUTA_ROWS | Texto de "sem resultados" para detectar fim de AJAX |

## Hash de conteúdo

```
compute_pauta_hash(processo, data_iso, tipo, situacao)
  = sha256(processo + "|" + data_iso + "|" + tipo.lower() + "|" + situacao.lower())
```

Garante dedup intra-job (mesma audiência não é inserida duas vezes numa mesma
execução). Não há ledger externo — o staging é limpado/substituído por job.

## Tabelas gravadas

| Tabela | Operações | Condição |
|--------|-----------|----------|
| `pauta_import_staging` | INSERT por audiência | sempre (sem duplicata intra-job) |
| `claude_code_tasks` | UPDATE etapa/status/resultado | heartbeat + conclusão |

**NUNCA:** `audiencias`, `assistidos`, `processos`, `demandas`, `pje_import_staging`
ou qualquer outra tabela além das duas acima.
