# Fluxo de delegação no Kanban — design

**Data:** 2026-06-08
**Branch:** `feat/fluxo-delegacao`
**Área:** Demandas premium (Kanban) — paleta delegação violeta (#9B84B8)

## Problema

Três problemas no fluxo de delegação do Kanban:

1. **Bug — status preso à Delegação.** Em `section-bucketing.ts`, `effectiveSectionKeys` faz `if (item.delegadoPara) return ["delegar"]` — qualquer demanda com delegatário é forçada à coluna **Delegação**, ignorando o status escolhido. Por isso, ao marcar "Monitorar" no card do Rogério, ele não sai da Delegação.

2. **Falta distinção de estado.** Hoje há um só estado de delegação (`statusDelegacao="pendente"`, chip "Delegada a X"). Não dá para diferenciar o que **ainda preciso enviar** do que a **pessoa já recebeu**.

3. **Mensagem em bloco truncada.** A delegação em lote já existe (`handleBatchDelegate` → `DelegacaoBatchModal` → `criarEmLote`), mas o preview da mensagem **trunca em 5** demandas ("...e mais N").

## Decisões (aprovadas)

- **a)** Mudar o status da pipeline num card delegado **cancela a delegação** (limpa o delegatário) — o card vai para o status escolhido.
- **b)** A transição `a delegar → delegado` é por **botão manual** no card.
- **c)** A coluna Delegação ganha **duas subseções**: "A delegar" e "Delegados".
- **d)** A notificação in-app ao destinatário sai no **"delegado"** (a pessoa "recebeu"), não no "a delegar".

## 1. Modelo de status

`statusDelegacao` (em `demandas`, varchar) passa a ter dois valores canônicos:

- **`a_delegar`** — pendente de envio (intenção de delegar; mensagem ainda não enviada).
- **`delegado`** — já entregue / pessoa recebeu.

A dimensão delegação (`delegadoParaId` + `statusDelegacao`) é **independente** do `status`/`substatus` da pipeline. Constantes canônicas adicionadas em `@/config/demanda-status` (`STATUS_DELEGACAO = { A_DELEGAR: "a_delegar", DELEGADO: "delegado" }`), evitando strings soltas.

> Nota: `delegacoesHistorico.status` (workflow do destinatário: pendente→aceita→…→concluida) é **outra** coisa e fica como está. `statusDelegacao` é o estado de envio do lado do defensor.

## 2. Correção do bucketing

`effectiveSectionKeys` (em `section-bucketing.ts`) passa a:

```
if (statusDelegacao === "a_delegar") return ["a_delegar"];
if (statusDelegacao === "delegado")  return ["delegado"];
return [normalizeStatusKey(substatus || status)];
```

Não chaveia mais pela mera presença de `delegadoPara`. Uma demanda com `delegadoPara` mas `statusDelegacao` nulo/“cancelado” cai no status normalizado (não fica presa).

As subseções da Delegação em `SUB_GROUP_SECTIONS` (`@/config/demanda-status`) passam de uma seção `{statuses:["delegar"]}` para duas:
- **"A delegar"** → `statuses: ["a_delegar"]`
- **"Delegados"** → `statuses: ["delegado"]`

## 3. Mudar status cancela a delegação

No handler de mudança de status do Kanban (`handleStatusChange` em `demandas-premium-view.tsx`, via `demandas.update`/`batchUpdate`): quando um status **da pipeline** é escolhido para um card delegado, a mutação limpa `delegadoParaId`, `statusDelegacao`, `dataDelegacao`, `motivoDelegacao` e aplica o `status`/`substatus` escolhido. A delegação aberta em `delegacoesHistorico` (status em STATUS_ATIVOS) é marcada `cancelada`. Sem notificação (YAGNI).

Isso é feito no servidor (router `demandas`) para ser atômico: um campo novo no input de update tipo `clearDelegacao?: boolean`, OU detecção: se o novo `status`/`substatus` não é de delegação e a demanda tem delegatário, limpar. **Escolha:** detecção no servidor (sem novo campo no input) — mantém o cliente simples.

## 4. Entrar em delegação + transição manual

- Ações de delegar (`delegacao.criar` e `delegacao.criarEmLote`): trocam `statusDelegacao: "pendente"` por **`"a_delegar"`**. Continuam criando `delegacoesHistorico` e gerando a mensagem. **Não** notificam o destinatário ainda.
- Novo procedure `delegacao.marcarDelegado({ demandaId })` (e variante em lote `marcarDelegadoEmLote({ demandaIds })`): seta `statusDelegacao="delegado"`, e dispara a notificação in-app ao destinatário. `reabrirDelegacao({ demandaId })` faz o inverso (`delegado→a_delegar`, sem notificar).
- A notificação no `criar`/`criarEmLote` é **movida** para o `marcarDelegado*`.

## 5. Card UI (kanban-premium.tsx)

Chip de delegação (hoje em ~linha 920):
- `a_delegar` → **"Delegar a {primeiroNome}"** — estilo pendente (tracejado/violeta claro).
- `delegado` → **"Delegado a {primeiroNome}"** — sólido.

Botão de ação no card:
- Em `a_delegar`: **"Marcar como delegado"** → `delegacao.marcarDelegado`.
- Em `delegado`: **"Reabrir"** → `delegacao.reabrirDelegacao`.

(Ações discretas, no rodapé do card; seguem o padrão de ações já existentes.)

## 6. Mensagem em bloco (organizada)

Extrair a geração da mensagem do `DelegacaoBatchModal` (hoje inline no `useEffect`, com `.slice(0, 5)`) para uma função pura `montarMensagemDelegacao({ destinatarioNome, demandas, instrucoes, prazo, saudacaoHora })` em `src/components/demandas/delegacao-message.ts`:
- Lista **todas** as demandas, numeradas: `N. *{processoNumero}* — {assistidoNome} ({ato})`.
- Cabeçalho com saudação + total; rodapé com instruções e prazo (quando houver).
- Sem truncamento. O modal passa a usar essa função.

## 7. Backfill

Migration/one-off: demandas com `delegadoParaId` not null e `statusDelegacao` em {`pendente`, `delegada`, `aceita`, ...} (qualquer valor legado de envio) → `statusDelegacao = "delegado"` (já apareciam como "Delegada a X"). Linhas sem delegatário ficam intactas.

## 8. Testes

- `section-bucketing`: `a_delegar`→"A delegar"; `delegado`→"Delegados"; demanda com delegatário mas `statusDelegacao` nulo → cai no status da pipeline (não em Delegação); status `monitorar` → seção monitorar.
- `montarMensagemDelegacao` (pura): lista completa sem truncar (ex.: 8 demandas → 8 linhas); cabeçalho/rodapé corretos; saudação por hora.

## Arquitetura — unidades

| Unidade | Mudança | Depende de |
|---|---|---|
| `@/config/demanda-status` | `STATUS_DELEGACAO`, subseções "A delegar"/"Delegados" | — |
| `section-bucketing.ts` | `effectiveSectionKeys` por `statusDelegacao` | config |
| `delegacao.ts` (router) | `a_delegar` no criar; `marcarDelegado(EmLote)`/`reabrirDelegacao`; notificação movida | schema |
| `demandas.ts` (router) | cancelar delegação ao mudar status da pipeline | schema |
| `delegacao-message.ts` | `montarMensagemDelegacao` (pura) | — |
| `delegacao-batch-modal.tsx` | usa a função; sem `slice(0,5)` | message |
| `kanban-premium.tsx` | chips dois estados + botões marcar/reabrir | router |

## Limitações / notas

- Subseções renderizam via `SectionsList`/`bucketIntoSections` já existentes — só muda a lista de seções.
- `delegacoesHistorico` workflow do destinatário permanece intocado.
- Cancelamento ao mudar status: detecção no servidor (sem novo campo de input).
