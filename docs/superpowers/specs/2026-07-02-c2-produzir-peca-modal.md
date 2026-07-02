# C2 fatia 5 — Modal unificado "Produzir peça"

**Data:** 2026-07-02 · **Branch:** `feat/produzir-peca-modal` · **Base:** `origin/main`

## Objetivo
Unificar o fluxo ad-hoc de "Análise profunda + Rascunhar peça" (dois botões + `window.prompt`, status em colunas) numa única superfície-wizard que roda o pipeline de uma tacada.

## Decisões (brainstorm 2026-07-02, aprovadas)
- **Orquestração:** wizard de uma tacada — preenche linhas mestras → clica Produzir → roda tudo sozinho (baixar autos → analisar → rascunhar).
- **Superfície:** `ResponsiveDialog` (dialog no desktop, bottom-sheet no mobile).
- **Escopo:** simples, sem toggles — contexto (autos/associados/dossiê) já reunido automaticamente pelas fatias 2.2/2a.

## Arquitetura
- **Zero mudança no daemon/skill/migração.** Reusa os routers/mutations que já existem: `analiseProfunda.{criar,status}` e `rascunhoPeca.{criar,status}`.
- **Orquestração client-side no modal:** segura `linhasMestras` + flag `orchestrating`; quando `analiseProfundaStatus==='concluida'` e orquestrando e rascunho não iniciado → dispara `rascunhoPeca.criar` sozinho. (Os hooks `useAnaliseProfundaJob`/`useRascunhoPecaJob` NÃO servem aqui porque auto-resetam no fim; o modal usa as queries/mutations cruas.)

### Componentes
1. `produzir-peca-state.ts` — `computeProduzirPecaState(analise, rascunho, {orchestrating})` PURA → `{ stages[], running, done, failedStage, nextAction }`. Testável isolada.
2. `ProduzirPecaModal.tsx` — ResponsiveDialog; queries de status (poll 4s), mutations de criar, textarea de linhas mestras, stepper de 3 estágios, link do `.docx`, retry por estágio. Só renderiza o resultado da função pura.
3. Wiring em `kanban-premium.tsx` + `demandas-premium-view.tsx`: novo botão "Produzir peça" (`onProduzirPeca`) abre o modal; remove o botão "Rascunhar peça" + o `window.prompt`. **Mantém** "Análise profunda" (análise-sem-peça tem valor na triagem).

## Estágios (derivados dos 2 status)
| Estágio | ativo | feito | erro |
|---|---|---|---|
| Baixar autos | `analise==='baixando_autos'` | análise passou disso | (análise erro → marca em Analisar) |
| Analisar | `analise==='analisando'` | `analise==='concluida'` | `analise==='erro'` |
| Rascunhar peça | `rascunho==='rascunhando'` | `rascunho==='pronto'` | `rascunho==='erro'` |

## Bordas
- Resumível/idempotente: reabrir mostra o estado atual; jobs seguem no servidor ao fechar. Mutations já têm guard `existing`.
- Erro num estágio → vermelho + "Tentar novamente" (re-dispara só ele).

## Fora de escopo
Mídias (fatia 4), download real de associados (2b), toggles de escopo.
