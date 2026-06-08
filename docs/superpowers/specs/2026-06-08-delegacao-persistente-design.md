# Delegação persistente de duas pontas — design

**Data:** 2026-06-08
**Branch:** `feat/delegacao-persistente`
**Área:** Demandas premium (Kanban) + router de delegação — paleta violeta

## Problema

A entrega anterior (`feat/fluxo-delegacao`, em main) faz **mudar o status de um card delegado CANCELAR a delegação** (limpa `delegadoParaId`, marca o histórico `cancelada`). Isso destrói o lado de quem recebeu — justamente quem passa a gerir a tarefa até terminar e enviar a minuta. A delegação tem que **persistir**.

Há ainda um conflito de modelo: `demandas.statusDelegacao` é usado para DUAS coisas incompatíveis:
- o estado de envio do defensor (`a_delegar`/`delegado`), e
- o andamento do delegatário — `atualizarStatus` (delegacao.ts:286) grava `statusDelegacao = input.status` (`aceita`/`em_andamento`/…), sobrescrevendo o estado de envio.

## Modelo (aprovado)

Três dimensões **independentes**:

1. **Posição no quadro do defensor** — `demandas.status` / `substatus` (Triagem, Monitorar, etc.).
2. **Estado de envio (defensor)** — `demandas.statusDelegacao` ∈ `a_delegar` | `delegado`. **Só isso.**
3. **Andamento (delegatário)** — novo campo `demandas.delegacaoWorkStatus`, espelho do `delegacoesHistorico.status` (`pendente`/`aceita`/`em_andamento`/`aguardando_revisao`/`revisado`/`protocolado`/`concluida`/`devolvida`). NULL quando ainda não enviado.

Mudar a dimensão 1 **não** afeta 2 e 3.

## 1. Novo campo + correção do conflito

- Migration: `demandas.delegacao_work_status varchar(20)` (nullable).
- `delegacao.atualizarStatus` (delegacao.ts:~286): passa a gravar `delegacaoWorkStatus = input.status` (NÃO mais `statusDelegacao`).
- Constante de labels do andamento reusa as já existentes (`STATUS_LABELS` em delegacao.ts).

## 2. Reverter o cancelamento ao mudar status

Remover o bloco de cancelamento adicionado em `demandas.update` (linhas ~838-866) **e** em `demandas.batchUpdate`. Mudar `status`/`substatus` só atualiza essas colunas; `delegadoParaId`, `statusDelegacao`, `delegacaoWorkStatus` e o `delegacoesHistorico` **persistem**.

## 3. Bucketing (onde o card aparece no quadro do defensor)

`effectiveSectionKeys` (section-bucketing.ts) passa a:

```
se statusDelegacao === "a_delegar"            → ["a_delegar"]     (subseção "A delegar")
se statusDelegacao === "delegado":
   se substatus é placeholder ("delegar"/vazio) → ["delegado"]    (subseção "Delegados" — casa padrão)
   senão                                        → [pipeline substatus normalizado]  (você moveu; sai de Delegados)
senão                                           → [pipeline status normalizado]
```

`BucketItem` ganha `statusDelegacao` (já adicionado) — sem mudança de assinatura nova. O chip de delegação é renderizado **independentemente** da seção (aparece em qualquer coluna).

> A ação de delegar e `marcarDelegado` mantêm `substatus` no placeholder `"delegar"` (para o card ficar em "A delegar"/"Delegados"). Quando o defensor escolhe uma coluna real, `substatus` muda e o card migra — com o chip.

## 4. Chip espelha o andamento (kanban-premium.tsx)

O chip mostra envio **+** progresso do delegatário, lendo `delegacaoWorkStatus`:
- `a_delegar` → **"Delegar a {Nome}"** (tracejado).
- `delegado` + workStatus → **"Delegado a {Nome} · {andamento}"** — ex.: "· aguardando revisão" (minuta pronta), "· em andamento", "· enviado" (pendente).
- workStatus terminal (`concluida`/`protocolado`/`revisado`) → **"· concluída"** (verde/apagado), delegação encerrada.

## 5. Retomar + encerramento ao concluir

- Nova mutation `delegacao.retomar({ demandaId })`: limpa `delegadoParaId`, `statusDelegacao`, `delegacaoWorkStatus`, `dataDelegacao`, `motivoDelegacao`; marca `delegacoesHistorico` ativo como `cancelada`; notifica o destinatário. **Única** forma de desfazer.
- Botão no card: em `a_delegar`/`delegado` → **"Retomar"** (substitui o "Reabrir" anterior; "Marcar como delegado" continua no `a_delegar`).
- Encerramento automático: quando `delegacaoWorkStatus` é terminal (concluida/protocolado/revisado), a delegação não conta como ativa (chip "concluída"); o card permanece onde está até o defensor mover/arquivar (sem auto-move).

## 6. Lado do delegatário — intocado

`minhasDelegacoes`, `delegacoesEnviadas`, `atualizarStatus` e o `delegacoesHistorico` seguem funcionando. Quem recebe gere: aceitar → em andamento → aguardando revisão (envia minuta) → concluída. Mudanças no quadro do defensor não tocam nada disso.

## 7. Exposição do campo

`demandas.list` e `demandas.listKanban`/`getById` (onde retornam `statusDelegacao`) passam a retornar também `delegacaoWorkStatus`. O mapeamento no `demandas-premium-view.tsx` (linha ~1108-1110) e o tipo `KanbanDemanda` ganham `delegacaoWorkStatus?: string | null`.

## 8. Migração / backfill

```sql
ALTER TABLE demandas ADD COLUMN IF NOT EXISTS delegacao_work_status varchar(20);
-- Espelhar o andamento atual do histórico ativo mais recente.
UPDATE demandas d SET delegacao_work_status = h.status
FROM (
  SELECT DISTINCT ON (demanda_id) demanda_id, status
  FROM delegacoes_historico
  WHERE demanda_id IS NOT NULL
  ORDER BY demanda_id, data_delegacao DESC
) h
WHERE d.id = h.demanda_id AND d.delegado_para_id IS NOT NULL;
```

## 9. Testes

- `section-bucketing`: a_delegar→"A delegar"; delegado+placeholder→"Delegados"; delegado+substatus real (monitorar)→"monitorar" (saiu de Delegados, persiste); sem delegação→pipeline.
- Função pura de label do chip `rotuloDelegacaoChip({ statusDelegacao, delegacaoWorkStatus, nome })` → string esperada por estado (delegar / delegado+andamento / concluída).

## Arquitetura — unidades

| Unidade | Mudança | Depende de |
|---|---|---|
| migration `0050` + schema `core.ts` | coluna `delegacao_work_status` | — |
| `delegacao.ts` | atualizarStatus→workStatus; `retomar`; remove "reabrir"? (manter) | schema |
| `demandas.ts` | **remover** cancelamento (update+batchUpdate); expor workStatus | schema |
| `section-bucketing.ts` | regra delegado+placeholder vs movido | — |
| `delegacao-chip.ts` (novo, puro) | `rotuloDelegacaoChip` | labels |
| `kanban-premium.tsx` | chip com andamento + botão Retomar | chip, router |
| `demandas-premium-view.tsx` | mapear workStatus; tipo | — |

## Notas

- `statusDelegacao` deixa de ser sobrescrito pelo andamento — é a correção central.
- "Reabrir" (delegado→a_delegar) some? **Manter** como ação secundária útil (caso tenha marcado delegado por engano); "Retomar" é o cancelamento real.
- Encerramento ao concluir é só de exibição (não auto-move, não limpa) — respeita "fica até eu mover".
