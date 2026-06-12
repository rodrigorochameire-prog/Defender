# Módulo Atendimentos — design

Data: 2026-06-11 · Branch: `feat/atendimentos-modulo`

## Problema

A página `/admin/atendimentos` é um placeholder (KPIs hardcoded, empty state) e o form
`/admin/atendimentos/novo` simula o submit sem gravar. Ao mesmo tempo, o backend já tem o
domínio pronto: a tabela `registros` (ex-`atendimentos`) com `tipo='atendimento'` é a fonte
que a agenda consome (`registros.listAgendados` → `registroAgendadoToAgendaItem`, visual
tracejado, feed ICS `atendimentos`). Falta a camada de gestão: uma página rica no padrão
Demandas/Assistidos e os campos que o SOLAR fornece no agendamento (nº de atendimento,
inicial/retorno, área, pedido, anotações da recepção, histórico e processos citados).

## Decisão de modelo de dados

**Reusar `registros` (tipo `atendimento`)** — não criar tabela nova. É o que a agenda, o ICS
e o Plaud já consomem; criar outra tabela duplicaria a esteira. Novas colunas (todas nullable,
específicas de atendimento):

| Coluna | Tipo | Conteúdo |
|---|---|---|
| `numero_solar` | varchar(30) | nº do atendimento/agendamento SOLAR (ex.: `260610.002.780`) |
| `subtipo` | varchar(20) | `inicial` \| `retorno` |
| `area` | varchar(40) | `CRIMINAL`, `VIOLENCIA_DOMESTICA`, `JURI`, `EXECUCAO_PENAL`, `CIVEL`, `FAMILIA`, `OUTRA` |
| `pedido` | varchar(80) | pedido SOLAR (ex.: `Consulta-Orientação`) |
| `anotacoes_recepcao` | text | anotação do agendamento feita pela recepção |
| `historico_solar` | jsonb | `[{ data, numero?, texto }]` — atendimentos/anotações anteriores no SOLAR |
| `processos_citados` | jsonb | `[{ cnj, processoId?, origem: 'vinculado_solar' \| 'anotacao' }]` |

Índice em `numero_solar` (dedup de futuras importações SOLAR). Migração com `lock_timeout`.
`processoId` continua sendo o vínculo formal; `processos_citados` guarda CNJs das anotações
que podem ou não existir no OMBUDS (quando existem, gravamos `processoId` no item).

## Backend (router `registros`)

- `agendarAtendimentoInput` ganha os novos campos (todos opcionais).
- `updateRegistroInput` ganha os novos campos + `assunto`, `local`, `dataRegistro`
  (edição/reagendamento) — mantendo o contrato atual.
- Novas procedures:
  - `listAtendimentos` — `tipo='atendimento'`, filtros: `status[]`, `subtipo`, `area`,
    `search` (nome do assistido / nº SOLAR / CNJ), `dateFrom/dateTo`; joins assistido
    (nome, cpf, telefone), processo (numeroAutos, area, atribuicao) e autor; escopo de
    defensor igual ao `listAgendados`; ordenação `asc(dataRegistro)`.
  - `atendimentosKpis` — hoje, esta semana, agendados futuros, realizados no mês (mesmo escopo).
- Agenda intocada: `listAgendados` devolve a linha completa, então os novos campos fluem;
  o título gravado na criação (“Atendimento inicial — Fulano”) já enriquece a agenda/ICS.

## UI

- `/admin/atendimentos/page.tsx` vira wrapper fino de `src/components/atendimentos/atendimentos-view.tsx`
  (padrão Demandas): `CollapsiblePageHeader` charcoal + KPIs reais + filtros (busca, status,
  subtipo, área, período) + lista agrupada por dia (pauta de atendimentos) com horário em
  fonte mono, badges de subtipo/área (cores de `atribuicoes.ts`), nº SOLAR e CNJ em mono.
- Sheet de detalhe: dados completos, anotações da recepção, histórico SOLAR, processos
  citados (link PJe `ConsultaPublica/listView.seam?numeroProcesso=`), ações: marcar
  realizado (com relato → `conteudo`), cancelar, editar/reagendar.
- Modal criar/editar: autocomplete de assistido ao vivo (padrão Nova Demanda), data+hora,
  subtipo, área, pedido, local, nº SOLAR, processo do assistido (dropdown), CNJs citados,
  anotações da recepção, assunto.
- `novo/page.tsx` → redireciona para `/admin/atendimentos?novo=1` (modal abre via query).
- Sidebar: entrada “Atendimentos” no `MAIN_NAV` (entre Agenda e Drive), ícone `UserCheck`.

## Carga inicial (12/06/2026, autor Rodrigo id=1)

| Hora | Assistido | Subtipo | Vínculos |
|---|---|---|---|
| 10:00 | Roberto Cordeiro Gomes (criar) | inicial | citado 8008640-10.2026.8.05.0039 (inexistente no OMBUDS) |
| 10:50 | André Roque Aragão (id 2297, completar CPF/nasc.) | inicial | processo 2553 = 8000634-14.2026 (VVD, é dele) |
| 11:40 | Luan Marlon Ribeiro dos Santos (criar) | inicial | citado 8099430-91.2025.8.05.0001 (inexistente) |
| 12:30 | João Victor Moura Ramos (id 439 — CPF bate; id 1002 é duplicata) | retorno | processo 259 = 8005316-46.2025 (Júri) |

Horários em America/Bahia gravados como instante UTC (+3h), convenção vigente da tabela.
Script idempotente por `numero_solar` em `scripts/popular-atendimentos-12jun2026.mjs`.

## Riscos / fora de escopo

- Duplicata de assistido João Victor (439 × 1002) — apenas sinalizada, não mesclada.
- Importação automática SOLAR — fora de escopo; `numero_solar` + índice preparam o terreno.
- Mapa/geocodificação de atendimentos — permanece TODO do router legado.
