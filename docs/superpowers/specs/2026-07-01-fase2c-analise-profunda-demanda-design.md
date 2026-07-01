# Fase 2c — Análise Profunda por Demanda (pipeline autos → análise)

> **Status:** design aprovado (brainstorming 2026-07-01). Próximo passo: plano de implementação.
> **Contexto maior:** terceira fatia da inteligência da triagem SEEU/PJe. Fase 1 = importação; Fase 2a = resumo + sinal `peca_sugerida`; **Fase 2c = quando cabe peça, baixa os autos e roda a análise completa**. Fase 2b (autos do SEEU/EP) e o rascunho da peça (2c.2) ficam fora deste MVP.

## 1. Objetivo

Quando a Fase 2a marca uma demanda de triagem como **"cabe peça"** (`registros.enrichment_data.peca_sugerida != null`, `requer_analise_profunda = true`), o defensor revê o resumo e, com **um clique**, dispara um pipeline autônomo que:

1. baixa os **autos completos** do processo (PJe);
2. organiza os autos na pasta do assistido no **Drive**;
3. roda a **análise completa** (`/analise-{juri,vvd}`) sobre os PDFs;
4. popula `processos.analysisData` no formato que o card/painel já consome.

O defensor só clica e acompanha um badge de estado; o resultado aparece no card. **Sem rascunho de peça** e **sem download de mídias** neste MVP (ambos são fases seguintes).

### Escopo do MVP (fechado no brainstorming)

| Decisão | Valor |
|---|---|
| Atribuições | **Júri e VVD** apenas (autos via PJe). EP entra quando a Fase 2b existir. |
| Mídias/áudios | **Fora** — só autos (PDF). Mídia+transcrição = Fase 2c.2. |
| Rascunho da peça | **Fora** — pipeline para em `analysisData`. Rascunho = Fase 2c.2. |
| Arquitetura | **Duas lanes autônomas** (browser baixa autos → ai roda análise). |
| Disparo | **Manual** (botão na demanda; defensor revê o resumo da 2a antes). |

## 2. Arquitetura

Reusa a infraestrutura de dois daemons que já existe (browser = varredura/autos; ai = Max daemon / `claude -p`, que já roda os resumos da Fase 2a).

```
[Botão "Análise profunda" no card]
   → analiseProfunda.criar({ demandaId })                         (tRPC)
        │  valida elegibilidade + dedup; grava demandas.analise_profunda_status='baixando_autos'
        ▼
   claude_code_tasks (lane='browser', skill='analise-profunda-demanda')
        │  LANE BROWSER — daemon do defensor, Chromium logado em CDP :9222
        │  1. resolve demanda → processo → CNJ + assistido + atribuição
        │  2. baixa autos (reusa baixar_pdf_autos; VVD vence sigilo via
        │     listProcessoCompletoAdvogado.seam). Se já há PDF em <assistido>/Autos/, pula.
        │  3. organiza no Drive (distribuir-autos → <assistido>/Autos/)
        │  4. enfileira a task da lane ai + grava status='analisando'
        ▼
   claude_code_tasks (lane='ai', skill='analise-autos' — o mesmo do coworkAnalise)
        │  LANE AI — Max daemon (claude -p)
        │  5. roda /analise-{juri,vvd} lendo os PDFs da pasta do Drive
        │  6. grava processos.analysisData (shape ProcessoAnalysisData) +
        │     analysis_status='completed'
        │  7. grava demandas.analise_profunda_status='concluida'
        ▼
   [card renderiza a análise; badge some]
```

**Por que duas lanes:** casa exatamente com o modelo de daemons existente. Autos = trabalho de browser headless (sem LLM); `/analise-*` = trabalho de LLM (lane ai, o mesmo Max daemon que já roda os resumos da 2a). Cada lane é uma unidade testável isolada, comunicando por uma linha em `claude_code_tasks` + um campo de estado na demanda.

## 3. Componentes

### 3.1 Novos

| Componente | Arquivo | Responsabilidade |
|---|---|---|
| tRPC trigger | `src/lib/trpc/routers/analise-profunda.ts` (novo router) → `criar`, `status` | validar elegibilidade (`peca_sugerida != null` ∧ atrib∈{`JURI_CAMACARI`, `GRUPO_JURI`, `VVD_CAMACARI`}), dedup, enfileirar task browser, expor estado para poll |
| Worker browser | `.claude/skills/analise-profunda-demanda/scripts/analise_profunda_autos.py` | resolver demanda→CNJ; baixar autos; `distribuir-autos`; enfileirar task ai; escrever estado |
| Registro do daemon | `scripts/browser-broker-daemon.mjs` (+1 entrada no `SKILL_REGISTRY`) | `analise-profunda-demanda` → `{ interpreter: VENV_PYTHON, argv: [...], timeoutMs: 45*60_000, interactive: true }` |
| Coluna de estado | `demandas.analise_profunda_status` (migration Drizzle) + `analise_profunda_task_id` (int, nullable) | rastrear fase para o badge e o dedup |
| UI | botão "Análise profunda" no card premium + badge de estado | `src/components/demandas-premium/` — habilitado só quando elegível; poll em `analiseProfunda.status` |

### 3.2 Reuso (sem reescrever a lógica)

- **`baixar_pdf_autos`** (em `.claude/skills/varredura-triagem/scripts/varredura_triagem.py`) — baixa o PDF integral de um único processo a partir do browser da lane, com guarda anti-ciência (só links `listProcessoCompletoAdvogado.seam`). Extrair para um módulo compartilhável se necessário.
- **`distribuir-autos`** (`~/.claude/skills/distribuir-autos/scripts/distribuir_autos.py`) — roteia autos por CNJ para `<assistido>/Autos/`, cria pasta se titularidade de Camaçari.
- **Caminho ai do `coworkAnalise`** (`briefing.ts:1207`, "análise Cowork completa, um clique") — insere `claude_code_tasks` com `skill='analise-autos'` (lane ai, dedup por `processoId`); o Max daemon roda `claude -p` (`/analise-*`) → grava `analysisData` **no shape que o card já consome**. É o passo 5–6. O worker browser enfileira essa mesma task `analise-autos`, adicionando `demandaId` no `instrucaoAdicional`; a skill `analise-autos`, ao terminar, também fecha o estado da demanda (passo 7) quando o `demandaId` está presente.

> **Nota — evitar confusão de nome:** `briefing.analiseProfunda` (`briefing.ts:999`) é OUTRA coisa (camada de estratégia Sonnet que exige `analysisData` já existente). NÃO é reusada aqui; por isso o router novo é `analiseProfunda` num arquivo próprio e a skill é `analise-profunda-demanda`.

## 4. Máquina de estados

Coluna `demandas.analise_profunda_status` (varchar, nullable):

```
null →(clica)→ baixando_autos →(browser ok, ai enfileirada)→ analisando
     →(ai ok, analysisData gravado)→ concluida
     (qualquer falha)→ erro   (re-disparável)
```

- O trigger grava `baixando_autos` e guarda o `task_id` da task browser em `analise_profunda_task_id`.
- O worker browser, no sucesso, grava `analisando` e atualiza `analise_profunda_task_id` para a task ai; na falha, `erro`.
- A lane ai, ao gravar `analysisData`, grava `concluida`; na falha, `erro`.
- `analiseProfunda.status` deriva a resposta de `analise_profunda_status` (+ mensagem de erro quando houver, guardada no `resultado`/`erro` da task corrente).

## 5. Idempotência, erros, degradação

- **Dedup:** `criar` recusa com `{ existing: true }` se `analise_profunda_status ∈ {baixando_autos, analisando}`. Re-disparo após `erro`/`concluida` é permitido (re-análise).
- **Resume-safe:** se o PDF dos autos já está em `<assistido>/Autos/`, o worker browser pula o download e vai direto a enfileirar a análise (economiza a parte cara).
- **Erros não destrutivos:** sem match de CNJ, sigilo não vencido, ou autos vazios → `erro` com mensagem; autos parciais preservados; botão vira "Tentar de novo". Falha da lane ai deixa os autos no Drive (re-run reaproveita). Nada é apagado.
- **Sem travas:** o estado sempre deriva de `analise_profunda_status`; não há caminho que fique pendurado.

## 6. Testes

- **tRPC (unit, Vitest):**
  - `peca_sugerida = null` → `criar` rejeita (`PRECONDITION_FAILED`).
  - atribuição EP → rejeita no MVP (fora de {Júri, VVD}).
  - Júri/VVD + `peca_sugerida` setado → cria 1 task browser, grava `baixando_autos`.
  - Segundo clique com estado `analisando` → `{ existing: true }`, sem nova task.
- **Worker browser (unit, pytest):** helpers puros — `resolve_demanda_cnj`, `build_ai_task_payload`, `autos_ja_no_drive`. As partes CDP validam ao vivo (não são unit-testáveis).
- **Transições de estado (unit):** o setter que mapeia (fase, resultado) → `analise_profunda_status`.
- **Aceite ao vivo:** 1 demanda real Júri/VVD com `peca_sugerida` → clica → autos aparecem em `<assistido>/Autos/` no Drive → `processos.analysisData` populado → card mostra a análise. Verificar o dedup (segundo clique durante o processo).

## 7. Fora de escopo (fases seguintes)

- **Fase 2b:** baixar autos do **SEEU** (EP) — habilita a análise profunda para Execução Penal.
- **Fase 2c.2 (mídia):** baixar mídias das atas + transcrição (reusa `baixar_midias_lifesize.py` + `transcrever_midias.py`) para enriquecer memoriais/alegações finais.
- **Fase 2c.2 (rascunho):** `/peca-{juri,vvd,ep}` a partir da análise → `.docx` com timbre DPE-BA → `Protocolar/`.

## 8. Riscos & mitigações

| Risco | Mitigação |
|---|---|
| Timeout do worker (autos grandes + análise) | `timeoutMs` de 45min na entrada do registry; browser e ai são tasks separadas (cada uma com seu timeout). |
| Sigilo VVD bloqueia autos | `baixar_pdf_autos` já usa `listProcessoCompletoAdvogado.seam` (vence sigilo); herdar essa guarda. |
| Shape do `analysisData` incompatível com o card | **Reuso do `coworkAnalise`**, que já grava o shape correto — não invento formato novo. |
| Sessão CDP única (serial) | Herda o dedup do daemon browser (1 worker por lane); as tasks ai rodam no Max daemon em paralelo. |
| Colisão com o trabalho de auditoria/paridade | Worktree próprio off `main`; toca arquivos distintos (router novo, skill nova, coluna nova). |
