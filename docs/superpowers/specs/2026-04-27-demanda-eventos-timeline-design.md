# Timeline estruturada de eventos da demanda

**Data:** 2026-04-27
**Autor:** Rodrigo Rocha Meire
**Status:** Spec aprovada (pendente revisão final do autor)

## Problema

O campo `providencias` (texto livre) no `demandas` é o único registro do que foi feito numa demanda. Resultado:

- Cards do kanban têm comportamento inconsistente — só mostram `providenciaResumo` quando preenchido; demais ficam "vazios".
- Não há registro estruturado de **atendimentos**, **diligências a fazer**, ou **observações** vinculados à demanda. Atendimentos existem como entidade rica (com áudio, transcrição, enrichment) mas só conectam a `assistido`/`processo`/`caso`, não a `demanda`.
- Sem dados estruturados, a "inteligência" do OMBUDS (relatórios `/analise-*`, KPIs do dashboard, busca, RAG) lê texto livre — perde precisão e contexto temporal.
- O card de **"Triagem — pendentes"** está mal posicionado no `/admin` (dashboard estratégico vira fila operacional).

## Objetivo

Substituir o campo de texto livre por uma **timeline estruturada** por demanda, com 3 tipos de evento (`atendimento`, `diligencia`, `observacao`). Toda peça do OMBUDS lê dessa fonte única; cards do kanban ficam consistentes; triagem sai do dashboard.

## Não-objetivos

- Reescrever o pipeline de transcrição Plaud/atendimentos (continua funcional como está).
- Tocar nos status do kanban (`5_TRIAGEM`, etc.) ou na lógica de delegação.
- Substituir o módulo de relatórios `/analise-*` neste PR (consumirá os eventos depois).
- Backfill semântico (extrair tipo/subtipo do texto antigo) — migração é literal, sem inferência.

## Modelo de dados

### Tabela nova: `demanda_eventos`

Timeline polimórfica, append-only com soft delete.

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `demanda_id` | int FK→demandas.id, cascade | indexed |
| `tipo` | enum | `atendimento` \| `diligencia` \| `observacao` |
| `subtipo` | varchar(30) nullable | só pra `diligencia`: `peticao` \| `contato_cartorio` \| `contato_orgao` \| `juntada` \| `recurso` \| `outro` |
| `status` | varchar(20) nullable | só pra `diligencia`: `pendente` \| `feita` \| `cancelada` (default `feita`) |
| `resumo` | varchar(140) | linha curta exibida no card |
| `descricao` | text nullable | corpo livre |
| `prazo` | date nullable | só pra `diligencia` com `status=pendente` |
| `responsavel_id` | int FK→users nullable | quem fez/vai fazer (default = `autor_id`) |
| `atendimento_id` | int FK→atendimentos.id nullable | só pra tipo `atendimento` |
| `autor_id` | int FK→users notnull | quem registrou |
| `data_conclusao` | timestamp nullable | preenchida quando `status` vira `feita` |
| `created_at` / `updated_at` | timestamp | defaults |
| `deleted_at` | timestamp nullable | soft delete |

**Índices:**
- `(demanda_id, created_at desc)` — consulta principal
- `(demanda_id, tipo, status)` — pendentes
- `(autor_id, created_at desc)` — auditoria/relatórios por autor
- `(prazo)` filtrando `status='pendente'` — alertas de prazo

**Constraints:**
- `CHECK (tipo='diligencia' OR (subtipo IS NULL AND status IS NULL AND prazo IS NULL))` — campos exclusivos da diligência
- `CHECK (tipo='atendimento' OR atendimento_id IS NULL)` — `atendimento_id` só em atendimento
- `CHECK (tipo='diligencia' AND status='pendente') OR prazo IS NULL` — `prazo` só em diligência pendente

### Tabela nova: `atendimento_demandas`

Relação N:N — um atendimento pode tocar várias demandas do mesmo assistido/processo.

| Coluna | Tipo |
|---|---|
| `atendimento_id` | int FK→atendimentos.id, cascade |
| `demanda_id` | int FK→demandas.id, cascade |
| `created_at` | timestamp default now() |
| PK | composta `(atendimento_id, demanda_id)` |

Quando o pipeline Plaud/atendimentos cria um `atendimento` com `processoId`, um **hook no `atendimentos.create` tRPC** (não DB trigger — mais testável, fica no domínio da aplicação) cria automaticamente:
- 1 linha em `atendimento_demandas` para **cada demanda aberta** (status ≠ concluída/arquivada) daquele processo.
- 1 linha em `demanda_eventos` (`tipo=atendimento`, `atendimento_id=...`) por demanda vinculada.

Usuário pode desvincular individualmente (ação no drawer da demanda).

### Migração dos dados existentes

Para cada `demandas` com `providencias IS NOT NULL AND providencias != ''`:

```sql
INSERT INTO demanda_eventos (
  demanda_id, tipo, subtipo, status, resumo, descricao,
  autor_id, created_at, updated_at, data_conclusao
)
SELECT
  id,
  'diligencia',
  'outro',
  'feita',
  COALESCE(NULLIF(providencia_resumo, ''), LEFT(providencias, 140)),
  providencias,
  COALESCE(defensor_id, 1),  -- fallback admin se sem defensor
  updated_at,
  updated_at,
  updated_at
FROM demandas
WHERE providencias IS NOT NULL AND providencias != '' AND deleted_at IS NULL;
```

Campos antigos `providencias` e `providencia_resumo` ficam read-only por 30 dias (banner: "campo legado, registre via timeline"); removidos na fase 2.

## UI / UX

### Card no kanban (estado padrão)

Layout máximo 2 linhas de timeline (1 fixa + 1 condicional):

```
[Avatar] Assistido · Ato                              [status]
        Processo nº ...
        ⏰ Pendente: contato cartório · prazo 2d        ← cor por proximidade
        ↳ 2d · Petição protocolada — revogação preventiva
```

Regras:
- Linha de **diligência pendente** só aparece se houver alguma com `status=pendente` para essa demanda. Se houver mais de uma, mostra a de menor prazo. Cores: zinc-500 (>7d), amber-500 (1-7d), red-500 (vencido).
- Linha de **última atividade** sempre presente. Se a demanda não tem nenhum evento: placeholder italic clicável `+ registrar atividade`.
- Ícone do tipo: `📞` atendimento, `📝` diligência, `🗒` observação (substituir por Lucide na implementação).
- Tempo relativo: `2d`, `3h`, `agora` (até 7d) → vira data absoluta.

### Expand inline

Clique no card (em área não-interativa) abre acordeão revelando os **3 eventos mais recentes** abaixo da última atividade. Mesmo formato 1-line, scroll dentro do card. Footer: `Ver todos →` abre o drawer.

### Drawer cheio

Reformar `src/components/demandas-premium/demanda-timeline-drawer.tsx` (atualmente 158 linhas).

- **Topo:** contexto da demanda (assistido, processo, ato, prazo, status, defensor responsável).
- **Tabs:** `Timeline` (default) · `Diligências pendentes` · `Atendimentos`.
- **Timeline:** lista vertical agrupada por dia, filtro por tipo no topo, cada item com hover-actions (`editar`, `arquivar`; em diligência pendente: `marcar como feita`).
- **Botão flutuante `+ Registrar`** (FAB no canto inferior direito): menu com 3 ações.
- **Formulários inline:**
  - **Diligência:** subtipo (chips de seleção única), status (default `feita`), resumo (140 chars, obrigatório), descrição (opcional), prazo (só aparece se `status=pendente`).
  - **Atendimento manual:** modal compacto com data, tipo (presencial/telefone/whatsapp), interlocutor, resumo, descrição. Link "abrir página de atendimento completa" pra anexar áudio/transcrição.
  - **Observação:** 1 textarea, salva e fecha.

### Página de triagem dedicada

Nova rota `src/app/(dashboard)/admin/triagem/page.tsx`:

- Lista compacta de demandas com `status=5_TRIAGEM`, ordenada por `data_entrada DESC`.
- Filtros: por defensor (admin vê todos), por tipo de ato, por urgência.
- Ações inline por linha: distribuir defensor · marcar urgência · arquivar (não é caso meu).
- Bulk actions: distribuir múltiplas, arquivar múltiplas.

### Reposicionamento da triagem no dashboard

- Remover `<AtendimentosPendentesCard>` de `src/app/(dashboard)/admin/page.tsx:21`.
- Adicionar **badge de contagem** no item "Demandas" do menu lateral (sidebar/nav). Conta demandas com `status=5_TRIAGEM` filtradas por `defensor_id = sessionUserId` (ou geral pra admin).
- Quando clicado, leva direto pra `/admin/triagem`.

## API (tRPC)

### Roteador novo: `src/server/routers/demanda-eventos.ts`

| Procedure | Tipo | Função |
|---|---|---|
| `list` | query | Por `demandaId`, paginado, ordenado desc, com join de `users` e `atendimentos` |
| `lastByDemandaIds` | query | Batch: `{ids: number[]}` → `Map<demandaId, ultimoEvento>`. Usado pelo kanban (evita N+1) |
| `pendentesByDemandaIds` | query | Mesma estrutura, mas só `tipo=diligencia AND status=pendente`, ordenado por `prazo asc` |
| `historicoByAssistidoId` | query | Agrega eventos de **todas** as demandas do assistido (página do assistido) |
| `historicoByProcessoId` | query | Mesmo, mas por processo |
| `create` | mutation | Body validado por zod discriminated union por `tipo` |
| `update` | mutation | Edita resumo/descricao/status; só `autor_id = self` ou admin |
| `marcarFeita` | mutation | Atalho: `update` com `status='feita'` + `data_conclusao=now()` |
| `archive` | mutation | Soft delete (`deleted_at = now()`) |
| `vincularAtendimento` | mutation | Cria linha em `atendimento_demandas` + evento `tipo=atendimento` |
| `desvincularAtendimento` | mutation | Remove linha e arquiva o evento correspondente |

### Validação zod (esboço)

```ts
const baseEvent = z.object({
  demandaId: z.number(),
  resumo: z.string().min(1).max(140),
  descricao: z.string().optional(),
});

const diligenciaSchema = baseEvent.extend({
  tipo: z.literal("diligencia"),
  subtipo: z.enum(["peticao","contato_cartorio","contato_orgao","juntada","recurso","outro"]),
  status: z.enum(["pendente","feita","cancelada"]).default("feita"),
  prazo: z.string().date().optional(),  // obrigatório se status=pendente — refinement
  responsavelId: z.number().optional(),
});

const atendimentoEventoSchema = baseEvent.extend({
  tipo: z.literal("atendimento"),
  atendimentoId: z.number(),
});

const observacaoSchema = baseEvent.extend({ tipo: z.literal("observacao") });

const createSchema = z.discriminatedUnion("tipo",
  [diligenciaSchema, atendimentoEventoSchema, observacaoSchema]
);
```

## Permissões e RLS

- **Defensor titular** (`demandas.defensor_id = current_user`): CRUD total nos eventos da própria demanda.
- **Delegado** (`demandas.delegado_para_id = current_user`): cria eventos; edita/arquiva apenas se `autor_id = current_user`.
- **Admin/coordenador**: tudo.
- RLS reaproveita as policies já existentes em `demandas` — eventos herdam por join.

## Integração com resto do OMBUDS

Sem rotas novas, só consumindo a tabela:

1. **Página do assistido** (`/admin/assistidos/[id]`): aba "Histórico" agregando eventos de todas as demandas (mini-CRM).
2. **Página do processo** (`/admin/processos/[id]`): seção timeline juntando eventos de todas as demandas daquele processo.
3. **Dashboard KPIs** (`src/components/dashboard/kpis-section.tsx`): novos KPIs:
   - "Diligências pendentes" — count `tipo=diligencia, status=pendente`, agrupado por proximidade do prazo.
   - "Atividade da semana" — eventos criados nos últimos 7d, agrupados por subtipo.
4. **Realtime**: subscribe Supabase em `demanda_eventos` filtrado por demandas visíveis no kanban → eventos do estagiário aparecem sem reload.
5. **Push notification**: quando evento criado em demanda delegada a você (reaproveita pipeline existente).
6. **Relatórios `/analise-*`** (fora deste PR): comando lê eventos como fonte de "o que foi feito até agora", citando providências reais com data e autor.

## Plano de implementação (alto nível)

Fase 1 — fundação:
1. Migration Drizzle: criar tabelas `demanda_eventos` + `atendimento_demandas`, índices, constraints.
2. Roteador tRPC `demanda-eventos` com procedures CRUD básicas + zod schemas.
3. Migration de dados: backfill `providencias` → `demanda_eventos`.

Fase 2 — UI core:
4. Refatorar card do kanban (`kanban-premium.tsx`): nova prop `lastEvento` + `pendenteEvento`, fetcher batch via `lastByDemandaIds` + `pendentesByDemandaIds`.
5. Reformar `demanda-timeline-drawer.tsx`: tabs, FAB, formulários de registro.
6. Hook no `atendimentos.create` tRPC → vinculação automática N:N + criação de eventos.

Fase 3 — triagem e cross-views:
7. Página `/admin/triagem` + badge no menu lateral.
8. Remover `AtendimentosPendentesCard` do dashboard.
9. Integração nas páginas de assistido e processo (histórico agregado).

Fase 4 — polimento:
10. KPIs novos no dashboard.
11. Remover campos legados `providencias` / `providencia_resumo` (após 30 dias).

## Riscos e mitigação

- **N+1 no kanban com 100+ demandas:** mitigado por `lastByDemandaIds` em query única indexada.
- **Trigger Plaud cria muitos eventos** se processo tem muitas demandas abertas: aceitável (1 evento por demanda relevante); usuário pode desvincular se ruidoso.
- **Migração apagar dados:** migração é INSERT only; campos antigos ficam por 30d como rollback.
- **Permissão de estagiária editando evento de outro:** RLS bloqueia; UI esconde ações de edição.
- **Realtime spam** com mute de eventos arquivados: filtro `deleted_at IS NULL` no subscribe.

## Testes

- Unit: zod schemas (discriminated union, refinement de `prazo` quando pendente).
- Integration: backfill migration produz 1 evento por demanda com `providencias` não vazia.
- E2E (Playwright): registrar diligência via drawer → aparece no card; marcar como feita → muda no card; criar atendimento Plaud → aparece em todas demandas abertas do processo.
- Regression: cards sem eventos mostram placeholder; cards com eventos não quebram layout (snapshot).
