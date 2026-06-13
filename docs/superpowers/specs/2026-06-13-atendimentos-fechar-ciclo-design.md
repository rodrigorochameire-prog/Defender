# Atendimentos — Fechar o ciclo (retorno + demanda)

Data: 2026-06-13 · Branch `feat/atendimentos-v7` · Direção B do brainstorm

## Objetivo

Do atendimento, transformar o "e agora?" em ação com um clique, sem reabrir
cadastros — emendando o módulo de Atendimentos à Agenda e ao Kanban de Demandas
que já existem.

## Duas ações, na seção "Próximos passos" do sheet

### Agendar retorno
Abre o modal de novo atendimento já preenchido: mesmo assistido (travado),
processo, área; `subtipo = retorno`; pedido herdado. O defensor só escolhe
data/hora. Grava por `registros.agendar` → cai na agenda e na pauta. O retorno
aparece naturalmente na timeline de registros do assistido (mesmo sheet).

Implementação: `AtendimentoFormModal` ganha prop `prefill`; a view abre o modal
com o prefill quando o sheet dispara `onAgendarRetorno(item)` (padrão do `onEdit`).

### Gerar demanda
Popover leve (padrão do `QuickRegistrar`), sem acoplar o pesado
`DemandaCreateModal`: confirma o **ato** (sugestões por atribuição via
`getAtosPorAtribuicao`, com campo livre) e cria a demanda por
`demandas.createFromForm` — vinculada por `assistidoId`, `numeroAutos` do
processo e `atribuicao` derivada (enum do processo se houver; senão
`area → label`), status inicial Triagem. Toast com link para o Kanban.

Não duplico a geração de peça: a peça nasce da demanda, pelo fluxo atual.

## Mapeamento área → atribuição (config.ts)

| area | atribuição (label p/ atos + createFromForm) |
|---|---|
| CRIMINAL | Criminal Geral |
| VIOLENCIA_DOMESTICA | Violência Doméstica |
| JURI | Tribunal do Júri |
| EXECUCAO_PENAL | Execução Penal |
| CIVEL / FAMILIA / OUTRA | Criminal Geral (fallback; ato é livre) |

Quando o atendimento tem processo vinculado, prefiro `processo.atribuicao`
(enum válido) — mais preciso que a área do atendimento.

## Bordas
- Sem processo vinculado: a demanda fica só no assistido (createFromForm aceita).
- Retorno exige data (validação do modal).
- Nada destrutivo; ambos abrem confirmação antes de gravar.

## Fora de escopo (sequência do brainstorm)
A (importar pauta SOLAR — aguarda amostra do formato), C (agenda/perfil/WhatsApp),
D (higiene + lembrete). Cada uma entra depois, isolada.
