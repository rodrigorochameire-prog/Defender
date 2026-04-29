# Registros Tipados + Duplicação de Evento — Design

**Data:** 2026-04-29
**Autor:** Rodrigo Rocha Meire (com Claude)
**Status:** Aprovado para implementação

## Objetivo

Substituir o campo livre `demandas.providencias` (texto único) por uma timeline de **registros tipados** reutilizável em demanda, ficha do assistido, processo, agenda e dossiê. Aproveitar a tabela `atendimentos` existente (que já tem Plaud, transcrição, AI) renomeando-a para `registros` e expandindo os tipos. Adicionar duplicação de evento na agenda (feature isolada).

## Motivação

- "Providências" hoje é textarea livre — sem timeline, sem tipo, sem autoria
- O usuário quer registrar atos do dia a dia (atendimento, diligência, anotação, providência, delegação) em sequência cronológica, com filtragem por tipo
- Esses registros precisam aparecer em todos os contextos do assistido (ficha, processo, demandas, audiências)
- A tabela `atendimentos` já tem ~80% da infraestrutura (Plaud, transcrição, AI enrichment) — desperdício criar paralelo

## Escopo

**Inclui:**
- Renomear `atendimentos` → `registros` com tipo expandido (5 espécies)
- Componente `<RegistrosTimeline>` reutilizável
- Substituir textarea "Providências" da demanda pela timeline
- Aparecer em ficha do assistido, processo, audiência, agenda
- Migração de dados: `demanda.providencias` → registro tipo "providência"
- Duplicação de evento na agenda (item de menu)

**Não inclui (YAGNI):**
- Tabelas separadas por tipo
- Polimorfismo elaborado (JSONB para metadata específica fica para depois)
- Notificações ou compartilhamento de registros entre defensores
- Histórico de versões dos registros (apenas `updatedAt`)
- Linkage automático entre `pesquisa`/`elaboracao` e o sistema de jurisprudência ou peças geradas (FKs ficam para depois — por ora só campo livre)

## Arquitetura

### Schema (rename + extensão)

```sql
-- Migration 1: rename table + columns
ALTER TABLE atendimentos RENAME TO registros;
ALTER TABLE registros RENAME COLUMN resumo TO conteudo;
ALTER TABLE registros RENAME COLUMN data_atendimento TO data_registro;
ALTER TABLE registros RENAME COLUMN atendido_por_id TO autor_id;

-- Migration 2: novos campos
ALTER TABLE registros
  ADD COLUMN titulo VARCHAR(120),
  ADD COLUMN demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL,
  ADD COLUMN audiencia_id INTEGER REFERENCES audiencias(id) ON DELETE SET NULL;

-- Migration 3: alterar tipo (já era varchar(30), expandir uso)
-- Default 'atendimento' nas linhas existentes (já é o caso na prática)
UPDATE registros SET tipo = 'atendimento' WHERE tipo NOT IN
  ('atendimento','diligencia','anotacao','providencia','delegacao');

-- Migration 4: backfill providencias da demanda
INSERT INTO registros (assistido_id, processo_id, demanda_id, tipo, conteudo,
                       data_registro, autor_id, created_at, updated_at)
SELECT d.assistido_id, d.processo_id, d.id, 'providencia', d.providencias,
       COALESCE(d.updated_at, d.created_at), d.defensor_id, NOW(), NOW()
FROM demandas d
WHERE d.providencias IS NOT NULL AND length(trim(d.providencias)) > 0;

-- Migration 5: dropar coluna legada
ALTER TABLE demandas DROP COLUMN providencias;
ALTER TABLE demandas DROP COLUMN providencia_resumo;
-- (manter por 1 release como deprecated antes de dropar — decidir)
```

### Tipos (enum lógico, não pg enum)

| Tipo | Cor | Ícone | Quando |
|---|---|---|---|
| `atendimento` | emerald | Users | Conversa com assistido/familiar/testemunha (suporta Plaud) |
| `diligencia` | amber | MapPin | Visita/ato externo (oitiva informal, ida ao fórum, cadeia) |
| `anotacao` | slate | StickyNote | Nota livre, observação solta |
| `providencia` | blue | CheckSquare | TODO/encaminhamento a fazer |
| `delegacao` | purple | Send | Repasse para colega/estagiário — também atualiza `demanda.delegadoParaId` quando o registro é numa demanda |
| `pesquisa` | indigo | BookOpen | Pesquisa jurisprudencial, doutrina, leis, precedentes consultados |
| `elaboracao` | violet | Pen | Minutagem de peça, redação, edição de texto |

Mantido como `varchar(30)` (não pgEnum) pra permitir adicionar tipos sem migration futura.

### Componentes

```
src/components/registros/
├── registros-timeline.tsx          # Lista cronológica, filtro por tipo, agrupada por data
├── registro-card.tsx               # Card individual com chip de tipo + autor + data
├── registro-editor.tsx             # Inline editor (textarea + tipo + título opcional)
├── registro-tipo-chip.tsx          # Chip visual reutilizável
└── novo-registro-button.tsx        # Botão + dropdown de tipos (com tipo pré-selecionado)
```

`RegistrosTimeline` aceita props: `assistidoId`, `processoId?`, `demandaId?`, `audienciaId?`, `tiposPermitidos?`, `tipoDefault`. Filtra por contexto.

### Pontos de uso

| Local | Filtro | Tipo default |
|---|---|---|
| Demanda (substitui textarea Providências) | `demandaId` | `providencia` |
| Ficha do assistido (nova aba "Registros") | `assistidoId` | `atendimento` |
| Página do processo (nova aba) | `processoId` | `atendimento` |
| Modal registro de audiência (sub-aba) | `audienciaId` | `anotacao` |
| Detalhe de evento da agenda (sheet) | `eventoId` correlato | `atendimento` |

### Duplicação de evento (independente)

Item "Duplicar" no menu de cada evento:
- **day-events-sheet** (botões secundários, hover)
- **event-detail-sheet** (menu)

Ação: abre `EventoCreateModal` com `assistido + processo + atribuição + tipo + local + duracao` pré-preenchidos. Data/hora em branco (forçando escolha consciente). Não copia descrição/observações (são contextuais ao evento original).

## Trade-offs

| Decisão | Pró | Contra |
|---|---|---|
| Rename `atendimentos` → `registros` | Reusa Plaud/AI/UI | Toca ~20-30 arquivos com queries |
| Drop `demanda.providencias` | Schema limpo | Quebra dashboards/exports que leem o campo direto |
| Tipo varchar (não enum) | Adiciona tipo sem migration | Menos type-safety no DB |
| Timeline reutilizável vs por contexto | DRY | Componente fica genérico, props acumulam |
| Duplicação não copia descrição | Evita confusão (descrição é contextual) | Usuário pode querer reaproveitar |

## Riscos

1. **Quebra de import histórico:** scripts de import populam `atendimentos` direto. Auditar e atualizar.
2. **Performance da timeline:** assistido com 200+ registros pode ficar lento. Mitigação: paginação cursor-based, limit 50 por carga.
3. **Migração de dados:** `providencias` em produção tem ~? registros não-nulos. Validar contagem antes de dropar coluna.
4. **Componente compartilhado vira god-component:** mitigar com props bem definidas e composição (sub-componentes especializados).

## Critérios de aceite

- [ ] Timeline aparece em demanda, ficha do assistido, página do processo, audiência
- [ ] Posso adicionar registros em sequência sem fechar modal
- [ ] Filtro por tipo funciona em todos os contextos
- [ ] Atendimento ainda suporta upload Plaud + transcrição + AI
- [ ] Delegação atualiza `demanda.delegadoParaId` quando o registro é numa demanda
- [ ] Migração não perde nenhum dado de `demanda.providencias`
- [ ] Botão "Duplicar" no evento abre modal com dados pré-preenchidos, data em branco
- [ ] Type-check, build e suite de testes passam
- [ ] Performance OK em assistido com 100+ registros

## Self-review

**Placeholder scan:** Sem TBD/TODO no spec.
**Internal consistency:** Schema ↔ componentes ↔ pontos de uso alinhados.
**Scope:** Foca em 2 features relacionadas (registros + duplicação). Implementação cabe num plano único.
**Ambiguity:** Resolver no plano — paginação default, ordem padrão, comportamento de `delegacao` quando não há demanda.
