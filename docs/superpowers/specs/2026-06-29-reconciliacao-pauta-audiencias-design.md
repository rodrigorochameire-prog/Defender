# Design — Reconciliação Pauta ↔ Audiências (#2 da varredura)

**Data:** 2026-06-29
**Status:** Design (pré-implementação) — **bloqueado por pré-requisito** (ver §7)
**Autor:** Rodrigo + Claude
**Relacionado:** `.claude/skills/varredura-triagem/` (movimentos da timeline, commits `e19a9c48`/`09b22224`), `.claude/skills/importar-pauta/`

---

## 1. Problema

A varredura da triagem só captura uma audiência quando **visita** o processo — ou
seja, quando há um **expediente pendente** em `5_TRIAGEM`/`URGENTE` que dispara a
leitura dos autos. A correção de 2026-06-29 (movimentos da timeline) tornou essa
captura confiável **dentro** desse caminho.

Resta um **ângulo cego estrutural**: processos com audiência **designada/redesignada
mas SEM expediente pendente** nunca são visitados pela varredura → a audiência não
entra no OMBUDS. Exemplos:

- Audiência marcada em decisão antiga cuja ciência já foi dada (sai de "pendentes").
- Redesignação registrada só na **pauta do juízo**, sem novo expediente ao defensor.
- Audiência de processo que ainda não gerou demanda em triagem.

A fonte canônica para fechar esse ângulo é a **pauta oficial de audiências** do PJe,
raspada pela skill `importar-pauta` para `pauta_import_staging`. Este design
especifica a **reconciliação** dessa staging com a tabela `audiencias` do OMBUDS.

> **Não competem:** a captura por movimento (varredura) e a reconciliação por pauta
> são complementares. A varredura pega o que está "quente" (expediente pendente); a
> pauta pega o universo completo de audiências designadas, independente de expediente.

---

## 2. Fontes de dados (schema real)

### `pauta_import_staging` (escrita por `importar_pauta.py`)

| coluna | conteúdo |
|---|---|
| `job_id` | id da task de import |
| `atribuicao` | VVD_CAMACARI, JURI_CAMACARI, EXECUCAO_PENAL, … |
| `data_audiencia` | ISO (`YYYY-MM-DDTHH:MM:SS`) |
| `processo_numero` | CNJ (pode ser `NULL` em linhas degeneradas) |
| `orgao_julgador` | vara/órgão |
| `partes_raw` | texto livre das partes |
| `classe_raw` | classe processual |
| `tipo_raw` | tipo da audiência (texto livre — ex. "Oitiva Especial", "Instrução") |
| `sala` | sala |
| `situacao` | **situação da audiência** (ex. Designada, Redesignada, Cancelada, Realizada) |
| `content_hash` | `sha256(processo \| data_iso \| tipo_norm \| situacao_norm)` |
| `selected` | flag de seleção (default `True`) |

### `audiencias` (destino)

Colunas relevantes: `processo_id`, `assistido_id`, `defensor_id`, `data_audiencia`,
`horario`, `tipo`, `local`, `sala`, `titulo`, `descricao`, `status`,
`google_calendar_event_id`, `aguardando_nova_data`, `created_at`.

### `processos` (ponte)

Join `pauta_import_staging.processo_numero` → `processos.numero_autos` → `processos.id`.

---

## 3. Algoritmo de reconciliação

Para cada linha de `pauta_import_staging` com `selected=true` e `processo_numero` não-nulo:

```
1. Resolver processo:
   pid = processos.id WHERE numero_autos = processo_numero
   - Se não existe processo no OMBUDS → registrar em relatório "sem processo"
     e PULAR (não cria processo aqui; isso é responsabilidade do import de demandas).

2. Normalizar tipo:
   slug = detectar_slug(tipo_raw)            # reusa designacao_parse
   tipo = tipo_descricao_por_slug(slug)      # rótulo canônico ("Depoimento Especial" etc.)

3. Mapear situação → ação (situacao normalizada, sem acento/minúscula):
   - "cancelada" / "cancelado"        → CANCELAR audiência casada (se existir)
   - "redesignada" / "redesignado"    → REDESIGNAR: cancelar abertas do mesmo tipo + criar nova
   - "designada" / "aprazada" / vazio → GARANTIR: criar se não existe (idempotente)
   - "realizada"                      → marcar realizada (ou ignorar se já passou)

4. Dedup / idempotência:
   - audiencia_exists(pid, data_ymd, tipo)?  → não duplica (reusa helper da varredura)
   - guardar pauta_import_staging.id ou content_hash em audiencias.descricao/contexto
     para rastreabilidade e evitar reprocessar a mesma linha.

5. Escrever:
   - insert_audiencia({... status: 'agendada', descricao: 'Reconciliada da pauta oficial
     (job N, hash …)'})  — defensor_id/assistido_id resolvidos pelo processo.
   - Em redesignação: cancel_audiencias_abertas(pid, tipo) antes do insert.

6. Relatório por execução: criadas / atualizadas / canceladas / sem-processo / já-existentes.
```

### Direção inversa (drift detection — opcional, fase 2)

Auditar audiências `agendada` no OMBUDS **futuras** que **não** têm linha
correspondente na pauta mais recente → sinalizar como "possivelmente cancelada/movida"
(`aguardando_nova_data=true` + registro de revisão). NÃO cancelar automaticamente —
ausência na pauta pode ser lag de scraping. Só sinaliza.

---

## 4. Onde roda

**Script novo** `scripts/reconciliar_pauta.py` na skill `importar-pauta` (a pauta é
dela), **NÃO** na varredura — a varredura é "expediente-driven", a reconciliação é
"pauta-driven". Reusa helpers da varredura por import:

- `designacao_parse`: `detectar_slug`, `tipo_descricao_por_slug`, `tipo_duracao_por_slug`
- `varredura_triagem.Supabase`: `audiencia_exists`, `cancel_audiencias_abertas`, `insert_audiencia`

Invocação:
```bash
python3 reconciliar_pauta.py --job-id <N>        # reconcilia uma rodada de import
python3 reconciliar_pauta.py --atribuicao VVD_CAMACARI --desde 2026-06-29
```
Encadeável após `importar_pauta.py` (mesma task) ou como passo separado do daemon.

---

## 5. Casos de borda

| Caso | Tratamento |
|---|---|
| `processo_numero` NULL ou processo inexistente no OMBUDS | pula + relatório "sem processo" (não inventa processo) |
| Sigilo VVD (partes mascaradas) | reconciliação usa só processo+data+tipo; não depende das partes |
| Múltiplas audiências do mesmo processo (datas diferentes) | cada `data` é uma audiência; dedup por (pid, data, tipo) |
| Mesma audiência em 2 imports (hash igual) | `content_hash` + `audiencia_exists` evitam duplicar |
| Audiência já criada pela varredura (movimento) | `audiencia_exists` casa por (pid, data, tipo) → não duplica; reconciliação só completa metadados faltantes (sala, órgão) |
| `tipo_raw` não reconhecido pelo `detectar_slug` | cai em slug `indefinido` → tipo "Audiência"; agenda mesmo assim |
| Data no passado | "realizada"/ignora; nunca agenda audiência passada como `agendada` |
| GCal | reconciliação grava só em `audiencias`; sync GCal segue o mesmo mecanismo já usado (MCP), fora do script |

---

## 6. Plano de testes (TDD)

Funções puras testáveis sem banco/browser:

1. `mapear_situacao(situacao_raw) -> {"acao": "criar|redesignar|cancelar|realizar"}`
   — fixtures: "Designada", "REDESIGNADA", "Cancelada", "Realizada", "" → default criar.
2. `linha_para_audiencia(row, pid, assistido_id, defensor_id) -> dict`
   — monta o payload de `audiencias` (data, horario, tipo via slug, local=orgao, sala).
3. Reconciliação idempotente: rodar 2× a mesma staging → 0 duplicatas (mock do `audiencia_exists`).
4. Redesignação: linha situacao=redesignada → cancela abertas + cria nova (verifica chamada a `cancel_audiencias_abertas`).
5. Sem processo: `processo_numero` sem match → conta em "sem_processo", 0 escrita.

Suite standalone no padrão dos testes existentes (`test_*.py`, sem framework).

---

## 7. Pré-requisito (bloqueador atual)

`pauta_import_staging` está **vazia** (0 linhas em 2026-06-29) — o scraper
`importar-pauta` ainda não foi operacionalizado. **A reconciliação só tem efeito
após popular a tabela.** Sequência obrigatória:

1. Operacionalizar/rodar `importar-pauta` (browser-lane, Chromium :9222 navegado até
   `ProcessoAudiencia/PautaAudiencia/listView.seam`) → popular `pauta_import_staging`.
2. **Então** implementar e rodar `reconciliar_pauta.py` (este design).

Sem o passo 1, implementar o passo 2 é construir contra tabela vazia.

### ⚠ Achado 2026-06-29 — a `listView` da pauta NÃO serve como gold source

Investigação ao vivo (skill `importar-pauta`) revelou que
`ProcessoAudiencia/PautaAudiencia/listView.seam` é uma **visão de audiências
iminentes**, não um arquivo consultável:

1. **Campo "De" travado no presente** — setar data início no futuro (`.value` ou
   `fill()` com teclado) faz o RichFaces limpar e resetar para hoje
   (`maxDate=hoje` provável). A janela sempre começa em hoje.
2. **Grid sem paginador** — a tabela não tem datascroller; renderiza ~16–17
   linhas e o `JS_GOTO_PAGE` não acha próxima página → o resto é inalcançável.
3. **AJAX flaky** — runs idênticos voltaram 16/17/1 linhas.

**Consequência:** a pauta só cobre as próximas ~16 audiências — exatamente o que
a varredura JÁ captura via expedientes + movimentos da timeline (commits
`e19a9c48`/`09b22224`, validado no André). **O valor marginal da reconciliação
contra esta tela é baixo.** Para o #2 valer, trocar a fonte: **aba "Audiências"
por processo** ou **API `procapi`** — NÃO a `listView`. Decisão de produto
pendente antes de implementar. Memória: `gotcha-pauta-listview-imminent-only`.

---

## 8. Decisões em aberto (para validar antes de implementar)

- **Quem é o `assistido_id`** numa audiência reconciliada de processo sem demanda?
  Provável: o réu/assistido vinculado ao processo; se ambíguo (sigilo), placeholder
  "⚠ A identificar" (padrão já usado na varredura).
- **`defensor_id`**: deriva do processo (responsável) ou do job? Provável: do processo.
- **Drift detection (§3 inversa)** entra na fase 1 ou fica para fase 2? Sugestão: fase 2.
- **Acoplamento ao daemon**: reconciliação roda automática após cada import de pauta,
  ou sob demanda? Sugestão: passo automático encadeado ao import (idempotente, barato).
