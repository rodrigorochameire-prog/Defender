# Feature: Demandas (Gestao de Demandas)

## Contexto
Sistema central do OMBUDS. Cada intimacao, tarefa ou trabalho do defensor vira uma "demanda" que passa por um fluxo de status. Suporta edicao inline, multiplas visualizacoes, importacao do PJe/Sheets, exportacao, e isolamento por defensor.

## Arquitetura

### Arquivos Principais
| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| `src/lib/db/schema.ts` (demandas) | ~65 | Tabela principal com 20+ campos |
| `src/lib/trpc/routers/demandas.ts` | 852 | 11 procedures (6 queries + 5 mutations) |
| `src/config/demanda-status.ts` | 143 | 24 status em 7 grupos com cores/icones |
| `src/config/atos-por-atribuicao.ts` | 333 | 6 atribuicoes com atos especificos (85+ atos) |
| `src/components/demandas-premium/` | 14.746 | 31 arquivos de UI |
| `src/components/shared/` | ~473 | 4 componentes inline (dropdown, autocomplete, datepicker, text) |

### Componentes (31 arquivos, 14.746 linhas)
| Componente | Linhas | Funcao |
|------------|--------|--------|
| demandas-premium-view.tsx | 2.138 | Orquestrador principal (state, views, modals) |
| DemandaCard.tsx | 979 | Visualizacao em cards com edicao inline |
| DemandaCompactView.tsx | 1.427 | Visualizacao planilha com drag-to-reorder |
| DemandaTableView.tsx | 611 | Visualizacao tabela com ordenacao |
| pje-import-modal.tsx | 894 | Importacao copy-paste do PJe |
| sheets-import-modal.tsx | 761 | Importacao do Google Sheets |
| export-modal.tsx | 921 | Exportacao CSV/Excel/JSON |
| dynamic-charts.tsx | 731 | Graficos e estatisticas |

### Componentes de Edicao Inline (shared)
| Componente | Linhas | Funcao |
|------------|--------|--------|
| inline-dropdown.tsx | 101 | Dropdown com opcoes agrupadas e cores |
| inline-autocomplete.tsx | 204 | Busca em tempo real (min 2 chars), navegacao teclado |
| inline-date-picker.tsx | 91 | Parse/format data BR, popover calendario |
| editable-text-inline.tsx | 77 | Enter/Escape/blur save, icone lapis |

## Modelo de Dados

### Tabela demandas
| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | serial | PK |
| ato | text | Tipo do ato processual |
| tipoAto | varchar(50) | Categoria (manifestacao/recurso/peticao) |
| status | enum | Status atual (24 opcoes em 7 grupos) |
| substatus | varchar(50) | Substatus granular |
| prazo | date | Prazo fatal |
| prioridade | enum | URGENTE/ALTA/NORMAL/BAIXA/REU_PRESO |
| reuPreso | boolean | Flag reu preso |
| dataEntrada, dataIntimacao, dataExpedicao | date | Datas de timeline |
| dataConclusao | timestamp | Quando concluida |
| defensorId | FK users | Defensor responsavel |
| delegadoParaId | FK users | Delegacao |
| assistidoId | FK assistidos | Vinculo ao assistido |
| processoId | FK processos | Vinculo ao processo |
| tipoPrazoId | FK tipoPrazos | Tipo de prazo para auto-calculo |
| importBatchId | varchar | Agrupamento de importacoes |
| ordemManual, ordemOriginal | integer | Ordenacao drag-and-drop |
| deletedAt | timestamp | Soft delete |

## Configuracao

### 24 Status em 7 Grupos
| Grupo | Cor | Status |
|-------|-----|--------|
| urgente | vermelho | URGENTE |
| preparacao | azul | Elaborar, Revisar, Buscar |
| delegacao | roxo | Delegada |
| monitoramento | amarelo | Monitorar, Aguardar |
| fila | zinc | Fila |
| diligencias | emerald | Diligencias |
| concluida | verde | Protocolado, Ciencia, Sem Atuacao, Concluido, Arquivado |

### 6 Atribuicoes com Atos Especificos
- **Tribunal do Juri**: 32 atos
- **Violencia Domestica**: 33 atos
- **Execucao Penal**: 22 atos
- **Substituicao Criminal**: 31 atos
- **Curadoria Especial**: 15 atos
- **Criminal Geral**: 35 atos
- **ATO_PRIORITY**: 98 pesos para ordenacao (1-2: critico, 90-98: ciencias)

## tRPC Router (11 procedures)

### Queries (6)
- `list` — paginada com isolamento por defensor
- `getById` — com controle de acesso
- `prazosUrgentes` — demandas com prazo nos proximos 7 dias
- `stats` — contagem por grupo de status
- `searchAssistidos` — autocomplete nome/CPF
- `searchProcessos` — autocomplete numero de processo

### Mutations (5)
- `create` — nova demanda (valida processo e assistido existem)
- `update` — complexa com side effects (atualiza processo.atribuicao, assistido.nome, etc.)
- `delete` — soft delete
- `importarDemandas` — bulk import com auto-criacao de assistidos/processos
- `reordenar` — atualizar ordemManual para drag-to-reorder

## Isolamento por Defensor
| Papel | Visibilidade |
|-------|-------------|
| Defensor | Apenas suas demandas |
| Estagiario | Demandas do supervisor |
| Servidor | Multiplos defensores (administrativo) |
| Admin | Todas as demandas |

Implementado via `getDefensoresVisiveis()` + `getDefensorResponsavel()`.

## Visualizacoes

### 4 Modos de Visualizacao
1. **Cards** (DemandaCard) — visual rico com edicao inline
2. **Planilha** (DemandaCompactView) — ultra-compacto, drag-to-reorder, select mode
3. **Tabela** (DemandaTableView) — ordenacao multi-coluna
4. **Graficos** (DynamicChart) — estatisticas e tendencias

### Mobile (DemandaCompactView md:hidden)
- Rows de 2 linhas por demanda (~48-52px altura)
- Linha 1: #, icones preso/urgente, nome, status pill, prazo, menu
- Linha 2: processo mono, separador, ato, providencias
- Faixa colorida clicavel a esquerda (atribuicao)
- Popover de atribuicao fixed bottom

## Fluxo de Dados
```
Importacao PJe/Sheets -> importarDemandas mutation
  -> Auto-cria assistidos (por nome)
  -> Auto-cria processos (por numero)
  -> Cria demandas com importBatchId

Edicao inline -> update mutation
  -> Side effects: atualiza processo.atribuicao, assistido.nome, etc.

Drag-to-reorder -> reordenar mutation
  -> Atualiza ordemManual

Export -> export-modal
  -> CSV/Excel/JSON com filtros aplicados
```

## Melhorias Futuras
- [ ] Distribuicao automatica de demandas
- [ ] Notificacoes push (prazo vencendo)
- [ ] Filtros avancados persistentes na URL
- [ ] Bulk edit (status, atribuicao)
