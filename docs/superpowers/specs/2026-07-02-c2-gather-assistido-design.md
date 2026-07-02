# Design — C2.2: Gather Drive/atendimentos na análise da Fase 2c

**Data:** 2026-07-02
**Autor:** Rodrigo Rocha Meire (via Claude Code)
**Status:** Design aprovado — aguardando revisão de spec
**Escopo:** Fatia 2 do **C2**. Branch: `feat/c2-gather-assistido` (do `main` @ `983caa2e`).

---

## 1. Contexto e problema

A **Fase 2c** (`analise-profunda-demanda`) baixa os autos e enfileira `analise-autos` (lane ai). Descoberta (exploração 2026-07-02): **a análise NÃO recebe quase nenhum contexto do assistido** — o worker enfileira a task com payload só `{demandaId, fonte}`, e a skill (`analise-autos`→`analise-audiencias`) lê os autos por globbing do Drive local, **sem tocar** nos atendimentos, no texto extraído do Drive (`driveFileContents`/`driveDocumentSections`) nem em análises anteriores. Ou seja, a IA analisa os autos "no vácuo", sem saber o que o assistido relatou nos atendimentos, o que já foi analisado antes, ou o que há de documentos no Drive além dos autos.

O 4º pedido original pedia explicitamente: "analise tudo (incluindo o que houver na pasta do google drive, como atendimentos)". Esta fatia entrega isso.

## 2. Mecanismo (por que dá pra injetar sem mexer no daemon)

O daemon ai (`claude-code-daemon.mjs:356-358`) monta o prompt como `task.prompt + "\n\nInstrução adicional: " + task.instrucao_adicional`. Logo, **o que o worker escrever no `prompt` da task vai direto pro prompt da análise**. O `instrucao_adicional` é parseado como JSON em outros pontos (derivação de estado), então **fica intocado** (`{demandaId, fonte}`); o dossiê vai no **`prompt`** (markdown legível).

## 3. Decisões

| Decisão | Escolha |
|---|---|
| Ponto de injeção | **worker** `analise_profunda_autos.py` — enriquece o `prompt` da task `analise-autos` (o daemon já o passa verbatim). ZERO mudança no daemon/skill. |
| Onde o dossiê entra | no campo **`prompt`** (markdown); `instrucao_adicional` continua `{demandaId, fonte}` (chaves-máquina preservadas). |
| Conteúdo | **Drive + atendimentos + análises anteriores** (os três) |
| Formato | só **RESUMOS**, com caps (nunca `driveFileContents.contentText` inteiro) |
| Ranking | **sem embeddings** nesta fatia (coluna vetorial não confirmada no schema); recência + caps |
| Escopo | **só Fase 2c (worker)**; enriquecer o `coworkAnalise` manual = follow-up |
| Migração | **nenhuma** (leitura pura + injeção no prompt) |
| Cópia de skill | só uma cópia do worker (sem espelho cowork) — sem dupla-cópia |

## 4. Design (componentes)

Tudo em `.claude/skills/analise-profunda-demanda/scripts/`:

### 4.1 `format_dossie(sections, registros, analises) -> str` (PURO, testável)
Recebe as linhas já buscadas do banco e produz um bloco markdown **capado**. Estrutura:
```
## Dossiê do assistido (contexto além dos autos)

### Documentos no Drive (resumos)
- **{tipo/titulo}**: {resumo|textoExtraido[:2000]}
… (top N seções)

### Atendimentos (o que o assistido relatou)
- {dataRegistro} [{tipo}/{subtipo}]: {dossieAtendimento.resumo | transcricaoResumo | conteudo[:1500]}
  - pontos-chave: {enrichmentData.key_points[:N]}
… (≤40 registros, ≤3 por tipo)

### Análises anteriores
- {analysisData.resumo} / {registro tipo=analise → enrichment.objeto/resumo}
```
Caps espelhando o que já existe no repo: `slice(0,2000)` por seção (`intelligence-consolidation.ts:271`), ≤40 registros / ≤3 por tipo (`registros-summary.ts`). **Bound total** via constante nomeada `MAX_DOSSIE_CHARS = 18000` (não placeholder) — se estourar, trunca com marcador `[…dossiê truncado]`. Se tudo vazio → retorna `""`.

**Preferência de campo por seção do Drive — desvio INTENCIONAL do precedente:** aqui usa-se `resumo` primeiro, `texto_extraido[:2000]` como fallback (o precedente `intelligence-consolidation.ts:271` faz o inverso, `textoExtraido || resumo`). Para um dossiê COMPACTO o resumo por peça é o campo certo; o texto integral só entra quando não há resumo. Idem atendimentos: `dossieAtendimento.resumo` → `transcricaoResumo` → `conteudo[:1500]`.

### 4.2 `fetch_dossie_data(sb, assistido_id) -> (sections, registros, analises)`
GETs PostgREST **com `select=` explícito** (evita puxar colunas pesadas não usadas — `transcricao`, `historico_solar` etc.; padrão de join-embed já usado em `varredura_triagem.py:79-81`):
- **Drive** (join-embed seção↔arquivo): `drive_document_sections?select=tipo,titulo,resumo,texto_extraido,review_status,drive_files!inner(assistido_id)&drive_files.assistido_id=eq.{id}&review_status=neq.rejected&order=updated_at.desc&limit=30`.
- **Atendimentos**: `registros?select=data_registro,tipo,subtipo,conteudo,dossie_atendimento,transcricao_resumo,enrichment_data&assistido_id=eq.{id}&order=data_registro.desc&limit=60` (o cap fino ≤40/≤3-por-tipo é no `format`).
- **Análises anteriores**: `assistidos?select=analysis_data&id=eq.{id}` + `processos?select=analysis_data&assistido_id=eq.{id}` + `registros?select=enrichment_data,data_registro&assistido_id=eq.{id}&tipo=eq.analise&order=data_registro.desc&limit=10`.
(Se o join-embed `drive_files!inner` não filtrar como esperado, fallback em 2 passos: GET `drive_files?select=id&assistido_id=eq.{id}` → GET `drive_document_sections?drive_file_id=in.(...)`.)

### 4.3 `build_dossie_assistido(sb, assistido_id) -> str`
`fetch` + `format`, **tudo em try/except → retorna `""`** em qualquer erro (a análise nunca quebra por causa do dossiê).

### 4.4 Wire em `build_analise_autos_task` (mantendo-a PURA)
`build_analise_autos_task` **continua pura** — em vez de receber `sb` (o que forçaria I/O dentro dela e quebraria o teste offline existente `test_analise_profunda_helpers.py:28`, que a chama sem `sb`), ela ganha um param **`dossie: str = ""`** (default vazio → o teste existente segue passando sem mudar a chamada). O fetch acontece no **call-site** em `main_async` (que já faz `sb._req` síncrono):
```python
# em main_async, antes de enfileirar (call-site :264-267):
dossie = build_dossie_assistido(sb, row["assistido_id"])   # faz o I/O aqui
task = build_analise_autos_task(row, demanda_id, created_by, dossie=dossie)

# build_analise_autos_task (PURA):
def build_analise_autos_task(row, demanda_id, created_by, dossie: str = "") -> dict:
    prompt = f"Análise profunda dos autos — demanda {demanda_id}"
    if dossie:
        prompt += "\n\n" + dossie
    return {..., "prompt": prompt,
            "instrucao_adicional": json.dumps({"demandaId": demanda_id, "fonte": "fase2c"}), ...}
```
`instrucao_adicional` **INTOCADO** (`{demandaId, fonte}`). Assim `build_analise_autos_task` e `format_dossie` são ambas puras/testáveis; só `build_dossie_assistido`/`fetch_dossie_data` fazem I/O (e são engolidas por try/except).

## 5. Fluxo de dados
worker resolve demanda→assistido (já faz) → `build_dossie_assistido(sb, assistido_id)` → GETs PostgREST (resumos) → `format_dossie` (capado) → concatena no `prompt` da task `analise-autos` → daemon passa verbatim → a IA analisa os autos JÁ SABENDO do histórico do assistido.

## 6. Tratamento de erro
- `build_dossie_assistido` nunca levanta: try/except → `""`. Análise segue com os autos (comportamento atual) se o dossiê falhar.
- Sem dados (assistido novo, sem Drive/atendimentos) → `""`, prompt fica como hoje.
- Bound de tamanho evita estourar o prompt.

## 7. Testes (TDD)
- **`format_dossie` (standalone Python, padrão das suítes do repo):**
  - vazio (sem sections/registros/analises) → `""`.
  - renderiza as 3 seções quando há dados.
  - aplica caps: ≤3 registros por tipo, ≤40 total; seção `texto_extraido` truncada em 2000.
  - bound total: dossiê gigante → truncado com marcador, tamanho ≤ limite.
  - preferência de campo: usa `dossieAtendimento.resumo` se houver, senão `transcricaoResumo`, senão `conteudo[:1500]`.
- **`build_analise_autos_task` (pura, com `dossie`):** com `dossie="..."` → o `prompt` contém o dossiê; sem `dossie` (default) → prompt = título puro (o teste existente `test_analise_profunda_helpers.py:28`, que chama sem `dossie`, **continua passando**). Em ambos, `instrucao_adicional == {"demandaId":…, "fonte":"fase2c"}` (chaves-máquina intactas).
- `python3 -c ast.parse` no worker (segue parseável).

## 8. Critérios de aceitação
1. `format_dossie` puro, testado (vazio/render/caps/bound/preferência de campo).
2. `build_analise_autos_task` injeta o dossiê no `prompt` e **não altera** `instrucao_adicional` (segue `{demandaId, fonte}`).
3. `build_dossie_assistido` engole qualquer erro (retorna `""`) — a Fase 2c nunca quebra por causa do dossiê.
4. Só resumos, com caps (nenhum `content_text`/`texto_extraido` inteiro sem truncar).
5. Sem migração; sem mudança no daemon nem na skill; worker continua parseável (ast).

## 9. Deferidos / próximas fatias
- **Ranking por embeddings** (rank-select das seções mais relevantes ao objeto da demanda) — quando a infra pgvector estiver confirmada.
- **Enriquecer o `coworkAnalise` manual** (hoje injeta só metadados) com o mesmo dossiê — follow-up (é TS, `briefing.ts`).
- **Verificação viva**: rodar a Fase 2c num assistido com Drive/atendimentos e conferir que a análise referencia o histórico.
- Próximas fatias C2: associados, mídias, modal unificado.
