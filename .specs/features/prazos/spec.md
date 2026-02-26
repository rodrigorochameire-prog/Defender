# Feature: Calculo de Prazos

## Contexto
Sistema completo de calculo de prazos processuais para Defensoria Publica. Implementa as regras do CPC, CPP e LC 80/94, incluindo prazo em dobro para Defensoria, feriados forenses, recesso judiciario e distincao entre dias uteis (civel) e corridos (criminal).

## Arquitetura

### Arquivos
| Arquivo | Linhas | Responsabilidade |
|---------|--------|------------------|
| `src/lib/db/schema.ts` | ~115 | 3 tabelas: tipoPrazos, feriadosForenses, calculosPrazos |
| `src/lib/prazo-calculator.ts` | 391 | Calculadora standalone (sem dependencia de DB) |
| `src/lib/services/calculo-prazos.ts` | 858 | Servico com suporte a DB + workspace |
| `src/lib/trpc/routers/prazos.ts` | 643 | 14 procedures tRPC |
| `src/components/prazos/calculadora-prazo.tsx` | 465 | Componente calculadora interativa |
| `src/components/prazos/dashboard-prazos.tsx` | 440 | Dashboard de prazos criticos |
| `src/app/(dashboard)/admin/prazos/page.tsx` | 492 | Pagina completa de gestao |
| **Total** | **~3.289** | |

### Modelo de Dados

#### tipoPrazos
Tipos pre-configurados de prazo (25+ seed):
- codigo, nome, descricao, baseLegal
- prazoBaseDias, areaDireito (CRIMINAL/CIVEL/JURI/EXECUCAO_PENAL)
- aplicarDobroDefensoria, tempoLeituraDias
- contarEmDiasUteis, categoria, fase
- isActive, workspaceId

#### feriadosForenses
Feriados que suspendem/estendem prazos:
- data, dataFim, nome, tipo (NACIONAL/ESTADUAL/MUNICIPAL/FORENSE/JUDICIAL)
- abrangencia, estado, comarca, tribunal
- suspendePrazo, apenasExpediente, recorrente
- Feriados moveis auto-calculados (Pascoa, Carnaval, Corpus Christi)
- Recesso forense: 20/dez a 06/jan

#### calculosPrazos (Trilha de Auditoria)
Registro de cada calculo realizado:
- demandaId, tipoPrazoId, tipoPrazoCodigo
- dataExpedicao, dataLeitura, dataTermoInicial, dataTermoFinal
- prazoBaseDias, prazoComDobroDias, diasUteisSuspensos
- areaDireito, contadoEmDiasUteis, aplicouDobro
- tempoLeituraAplicado, observacoes, calculoManual
- workspaceId, calculadoPorId

## Algoritmo de Calculo

### 4 Etapas
1. **Leitura**: dataExpedicao + tempoLeituraDias (padrao 10) = dataLeitura
2. **Termo Inicial**: dataLeitura + 1 dia
3. **Aplicar Dobro**: prazoBaseDias * 2 (se Defensoria, Art. 186 CPC / Art. 5 LC 80/94)
4. **Adicionar dias**:
   - Criminal: dias corridos, estende se vencimento cai em fds/feriado
   - Civel: dias uteis apenas (pula fds e feriados)
5. **Ajuste final**: se termina em dia nao util, avanca para proximo dia util

### Tipos de Prazo Pre-Configurados (25+)
| Codigo | Dias Base | Area | Dobro |
|--------|-----------|------|-------|
| RESPOSTA_ACUSACAO | 10 | Criminal | Sim |
| ALEGACOES_FINAIS | 5 | Criminal | Sim |
| APELACAO | 5 | Criminal | Sim |
| RAZOES_APELACAO | 8 | Criminal | Sim |
| RESE | 5 | Criminal | Sim |
| EMBARGOS_DECLARACAO | 2 | Criminal | Sim |
| AGRAVO_EXECUCAO | 5 | Exec. Penal | Sim |
| HABEAS_CORPUS | 0 | Criminal | Nao |
| PEDIDO_PROGRESSAO | 0 | Exec. Penal | Nao |
| RESE_PRONUNCIA | 5 | Juri | Sim |

### Hierarquia de Feriados
1. Nacionais (fixos + moveis + recesso)
2. Estaduais (BA, SP, etc.)
3. Municipais/Comarca
4. Tribunal (STF, STJ, TJBA)
5. Custom (do banco, por workspace)

## tRPC Router (14 procedures)

### Tipos de Prazo (6)
- `listTiposPrazo` — filtros por area/categoria/fase/busca
- `getTipoPrazo` — por id ou codigo
- `createTipoPrazo` — validacao de codigo unico
- `updateTipoPrazo` — atualizacao parcial
- `deleteTipoPrazo` — soft delete (isActive=false)
- `seedTiposPrazo` — popular DB com 25+ tipos padrao

### Feriados (4)
- `listFeriados` — filtros por ano/periodo/abrangencia
- `createFeriado` — novo feriado customizado
- `updateFeriado` — atualizacao
- `deleteFeriado` — hard delete

### Calculo (2)
- `calcularPrazo` — calculo completo + salvar historico opcional
- `historicoCalculos` — auditoria por demandaId

### Dashboard (2)
- `prazosCriticos` — demandas com prazo vencendo (join assistidos + processos)
  - Categoriza: VENCIDO (<0), HOJE (=0), CRITICO (<=2), ATENCAO (<=5), NORMAL (>5)
- `estatisticasPrazos` — KPIs: total, vencidos, vencendoHoje, reuPreso, porStatus

## Componentes UI

### CalculadoraPrazo (465 linhas)
- Props: onPrazoCalculado, demandaId, atoInicial, areaDireitoInicial, compact
- Auto-selecao de tipo baseada no ato da demanda
- Layout 4 caixas: Expedicao, Leitura, Inicio, PRAZO FATAL (verde)
- Badges: dias base, fator dobro, tipo dia, tempo leitura
- Alertas inline com explicacao do calculo

### DashboardPrazos (440 linhas)
- KPI Cards: Vencidos (vermelho), Hoje (laranja), Prox. 7d (amarelo), Reu Preso (roxo)
- Alerta especial para reu preso vencido
- Tabs: Todos/Vencidos/Hoje/Criticos/Reu Preso
- Filtro de periodo: 3/5/7/15/30 dias
- Modo compacto para sidebar (top 5)

### Pagina /admin/prazos (492 linhas)
- Filter chips por atribuicao
- Stat cards (5 metricas)
- Busca por assistido/processo/ato
- Lista com barras coloridas por atribuicao
- Badges de urgencia

## Integracao

### Com Demandas
- CalculadoraPrazo integrado em formularios de demanda
- Campo `demandas.prazo` recebe resultado do calculo
- Campo `demandas.tipoPrazoId` vincula ao tipo usado
- Historico salvo em calculosPrazos

### Com Dashboard Principal
- DashboardPrazos em modo compact na sidebar
- Top 5 prazos criticos com link para pagina completa

## Melhorias Futuras
- [ ] Notificacoes push quando prazo vencendo
- [ ] Batch calculation para importacoes PJe
- [ ] Cache de feriados (raramente mudam)
- [ ] Export de lista para calendario
- [ ] Diff de recalculos
