# Fase 2c.2/B — Rascunho de Peça Guiado por Linhas Mestras (núcleo)

> **Status:** design aprovado (brainstorming 2026-07-01).
> **Contexto:** fecha o "caminho completo" da triagem: intimação → triagem → resumo → (cabe peça) → autos → análise (2c) → **rascunho guiado (B)**. A parte de consumir mídia (áudios/laudos) depende da Fase A (baixar mídia) e fica fora deste núcleo; a sistematização do inventário nas skills é a Fase C (deferida).

## 1. Objetivo

Quando a análise profunda (Fase 2c) termina (`demandas.analise_profunda_status='concluida'`, `analysisData` populado, autos no Drive) e a demanda "cabe peça" (`peca_sugerida` setado), o defensor dispara um **rascunho da peça guiado pelas suas linhas mestras**: ele digita a direção estratégica; a IA redige a peça correspondente ao `peca_sugerida` usando a skill/reference específica + a análise + os autos, produzindo um `.docx` (Garamond 12pt, timbre DPE-BA) em `Protocolar/` para revisão. **Não protocola nada.**

**Diferencial:** o rascunho sai do **comando estratégico do defensor** (linhas mestras), não só da análise automática. MVP: **Júri/VVD** (mesmo escopo da 2c).

### Escopo (fechado)

| Decisão | Valor |
|---|---|
| Gatilho | manual: botão "Rascunhar peça" no card (habilitado quando `analise_profunda_status='concluida'` ∧ `peca_sugerida != null`) |
| Entrada do defensor | **linhas mestras** (texto livre — a direção da peça) |
| Peças | Júri/VVD (`memoriais`, `resposta_acusacao`, `apelacao`, `rese`, `contrarrazoes`); `manifestacao_ep` = fora (EP espera 2b) |
| Motor | lane ai, skill `gerar-peca` (alias → `dpe-ba-pecas`); reusa `/peca-{juri,vvd}` references |
| Saída | `.docx` (Garamond 12pt, timbre DPE-BA) em `Protocolar/` (convenção v2 de nome) |
| Mídia (ouvir áudios) | **fora** (Fase A) |
| Protocolar de fato | **não** — só rascunho |

## 2. Arquitetura (uma lane ai, reusa mecanismo existente)

```
[Botão "Rascunhar peça"] → abre input de linhas mestras → submit
  → rascunhoPeca.criar({ demandaId, linhasMestras })            (tRPC)
       valida elegibilidade (concluida ∧ peca_sugerida ∧ atrib Júri/VVD) + dedup
       grava demandas.rascunho_status='rascunhando' + rascunho_task_id
       enfileira claude_code_tasks (lane=ai, skill='gerar-peca')
         instrucaoAdicional = JSON { demandaId, pecaSugerida, atribuicao, linhasMestras }
  → Max daemon (claude -p, skill gerar-peca→dpe-ba-pecas)
       1. resolve pasta do assistido no Drive (analysisData + autos)
       2. mapeia pecaSugerida → tipo + reference (vvd_alegacoes_finais, etc.)
       3. redige a peça GUIADA pelas linhas mestras + análise + reference + autos
       4. gera .docx (timbre DPE-BA) em Protocolar/ (nome convenção v2)
       5. grava demandas.rascunho_status='pronto' + rascunho_drive_url
       (falha → rascunho_status='erro')
  → card: badge "rascunho pronto → Protocolar/" (link)
```

Reusa: o caminho ai do `coworkAnalise`/`gerar-peca` (já enfileira `dpe-ba-pecas` e roda `claude -p`); as references de peça por atribuição; a `analysisData` da 2c; os autos no Drive (baixados pela 2c).

## 3. Componentes

| Arquivo | Papel |
|---|---|
| `src/lib/db/schema/core.ts` (modify) | +`rascunhoStatus` (`varchar(20)`), +`rascunhoTaskId` (`integer`), +`rascunhoDriveUrl` (`text`) em `demandas` |
| `drizzle/00NN_rascunho_peca.sql` (create) | migration das colunas |
| `src/lib/trpc/routers/rascunho-peca.ts` (create) | router `rascunhoPeca` (`criar`, `status`) + helpers puros (elegibilidade, mapa `peca_sugerida`→reference, meta) |
| `src/lib/trpc/routers/index.ts` (modify) | registra `rascunhoPeca` |
| `.claude/skills-cowork/dpe-ba-pecas/SKILL.md` (modify/estender) | instruir a usar `linhasMestras` como direção mestra + o mapa `peca_sugerida`→reference + fechar `rascunho_status` quando `demandaId` presente |
| `src/hooks/use-rascunho-peca-job.ts` (create) | hook (mutation + poll `status`) |
| `src/components/demandas-premium/` (modify) | botão "Rascunhar peça" + input de linhas mestras + badge |

### 3.1 Helpers puros do router (testáveis)

- `PECA_SUGERIDA_TO_REFERENCE: Record<string, {vvd?: string; juri?: string}>` — ex.: `memoriais→{vvd:"vvd_alegacoes_finais", juri:"alegacoes_finais_juri"}`, `resposta_acusacao→{vvd:"vvd_analise_para_ra"}`, `apelacao→{vvd:"vvd_apelacao", juri:"apelacao_pos_juri"}`, `rese→{vvd:"vvd_contrarrazoes_rese"}`, `contrarrazoes→{vvd:"vvd_contrarrazoes_apelacao"}`.
- `isElegivelRascunho({ statusAnalise, pecaSugerida, atribuicao }) -> {ok:true}|{ok:false,motivo}` — exige `statusAnalise==='concluida'`, `pecaSugerida` mapeável para a atribuição (Júri/VVD), e atrib ∈ {JURI_CAMACARI, GRUPO_JURI, VVD_CAMACARI}.
- `buildRascunhoTaskMeta({demandaId, pecaSugerida, atribuicao, linhasMestras}) -> string` (JSON p/ `instrucaoAdicional`).

### 3.2 Máquina de estados (coluna `demandas.rascunho_status`)

```
null →(criar)→ rascunhando →(ai grava .docx + url)→ pronto
     (qualquer falha)→ erro    (re-disparável)
```
Dedup: `criar` recusa (`existing:true`) se `rascunho_status='rascunhando'`. Re-disparo após `pronto`/`erro` permitido (novo rascunho, ex.: linhas mestras revisadas). `concluida` da 2c é pré-requisito (independente do `rascunho_status`).

`status` deriva-na-leitura como o 2c: se `rascunho_task_id` completou (lane ai) e a coluna ainda diz `rascunhando`, deriva `pronto` (a skill grava a url; se ausente, mantém pronto sem url).

## 4. Erros & robustez

- Elegibilidade falha (análise não concluída / peça não mapeável / atrib fora) → `PRECONDITION_FAILED`, sem task.
- `linhasMestras` vazio → permitido (a skill usa só a análise), mas o valor da feature é com elas; o input não é obrigatório.
- Falha da lane ai → `rascunho_status='erro'`; nada destrutivo; re-disparável.
- Skill não acha a pasta do Drive / autos → grava erro (não inventa peça sem base).
- Nunca protocola; só escreve `.docx` em `Protocolar/`.

## 5. Testes

- **tRPC (unit/contract):** `isElegivelRascunho` (concluida+peça+VVD→ok; análise não-concluída→rejeita; EP→rejeita; peça não-mapeável→rejeita); `PECA_SUGERIDA_TO_REFERENCE` (mapeamentos); `buildRascunhoTaskMeta` (JSON com linhasMestras); router contract (criar valida+dedup+insere lane ai skill gerar-peca; status derive-on-read; registrado no appRouter).
- **Hook (contract):** chama `rascunhoPeca.criar`; poll `status` com `refetchInterval` enquanto `rascunhando`; invalida `demandas.list` em `pronto`.
- **Skill (`dpe-ba-pecas`):** revisão humana da instrução (linhasMestras como direção + mapa + fechar estado). Sem teste automatizado de qualidade de peça.
- **Aceite ao vivo:** 1 demanda Júri/VVD com análise `concluida` → digita linhas mestras → "Rascunhar peça" → `.docx` aparece em `Protocolar/` guiado pelas linhas → `rascunho_status='pronto'`.

## 6. Fora de escopo

- **A:** baixar mídias/transcrição para o defensor ouvir antes de rascunhar.
- **C:** sistematizar o inventário nas skills (melhora a qualidade do rascunho).
- **EP:** `manifestacao_ep` (espera 2b — autos SEEU).
- Protocolo automático; edição inline do `.docx` no OMBUDS.

## 7. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Rascunho genérico (sem direção) | `linhasMestras` entram no prompt como direção mestra; sem elas, usa a análise (menor valor, mas funciona) |
| Alucinação de jurisprudência | reusa `citacoes-seguras` das references (`[VERIFICAR PRECEDENTE]`) |
| Peça sem base factual | skill exige `analysisData`+autos do Drive; sem base → erro (não inventa) |
| Estado preso em `rascunhando` | derive-on-read no `status` (task ai completed → pronto; failed → erro) |
| Depende de 2c (não live-validada ainda) | contrato `analysisData` estável; B consome, não altera a 2c |
