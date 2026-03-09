# VVD Redesign — De Módulo Isolado a Cosmovisão Integrada

**Data**: 2026-03-08
**Status**: Aprovado para implementação

---

## Contexto

O módulo VVD (Violência Doméstica / MPU) existe como sistema paralelo isolado — tabelas próprias (`partes_vvd`, `processos_vvd`, `intimacoes_vvd`, `historico_mpu`), sem conexão com assistidos, processos, enrichment, drive ou audiências.

O volume de MPUs é altíssimo, mas a maioria são apenas ciência (sem atuação da DPE). O valor real está em **dois modos**:

1. **Registro/Cosmovisão** — controle estatístico de todas as MPUs para análise, gestão e argumentação (banalização da medida, padrões preditivos)
2. **Atuação Ativa** — os poucos casos onde a DPE precisa peticionar ou o assistido questiona a MPU → esses devem estar no sistema geral

**Princípio**: todo caso VVD é registro; um subconjunto é "promovido" ao sistema geral quando demanda atuação.

---

## Decisões Arquiteturais

### Workspaces
- **Manter campo, não se preocupar em popular** — workspace é redundante com o cenário single-tenant de Camaçari. O filtro por `defensorId` + `atribuicao` dá conta. Os campos ficam como slot futuro.

### Terminologia
- Renomear `autor` → `requerido` (quem a DPE defende, contra quem a MPU é pedida)
- Renomear `vitima` → `requerente` (quem pede a MPU)
- Uma requerente pode pedir MPU contra várias pessoas e várias vezes

### Abordagem de Integração
- **Link bidirecional**: manter tabelas VVD para registro/cosmovisão, adicionar FKs opcionais (`assistidoId`, `processoId`) para quando um caso é promovido ao sistema geral

### Promoção
- **Manual com sugestão**: o sistema destaca casos que possivelmente demandam atuação (PETICIONAR, AUDIENCIA), mas o defensor decide

### Triagem na Importação
- O modal de importação PJe é o ponto de triagem
- Defensor revisa cada intimação, ajusta tipo (CIÊNCIA vs PETICIONAR) e variáveis analíticas
- CIÊNCIA → especialidade VVD (registro)
- PETICIONAR/AUDIÊNCIA/CUMPRIMENTO → demandas + candidata a promoção

---

## Modelo de Dados — Evolução

### `partes_vvd` — Campos a adicionar/renomear

```sql
-- RENOMEAR
ALTER TABLE partes_vvd
  -- tipoParte: 'autor'|'vitima' → 'requerido'|'requerente'
  -- (migrar dados existentes)

-- ADICIONAR
ALTER TABLE partes_vvd ADD COLUMN assistido_id INTEGER REFERENCES assistidos(id);  -- vínculo promoção
ALTER TABLE partes_vvd ADD COLUMN sexo VARCHAR(10);  -- M/F/outro
```

### `processos_vvd` — Campos a adicionar/renomear

```sql
-- RENOMEAR FKs
-- autor_id → requerido_id
-- vitima_id → requerente_id

-- ADICIONAR - Integração
ALTER TABLE processos_vvd ADD COLUMN processo_id INTEGER REFERENCES processos(id);  -- vínculo promoção

-- ADICIONAR - Analíticos
ALTER TABLE processos_vvd ADD COLUMN canal_entrada VARCHAR(30);
  -- enum: formulario_google, policia_civil, cram, dpe, juiz_oficio, outro
ALTER TABLE processos_vvd ADD COLUMN tipo_relato VARCHAR(30);
  -- enum: ameaca, lesao_corporal, descumprimento, psicologica, patrimonial, sexual, outro
ALTER TABLE processos_vvd ADD COLUMN tem_acao_familia BOOLEAN DEFAULT false;
ALTER TABLE processos_vvd ADD COLUMN tipo_acao_familia VARCHAR(30);
  -- guarda, alimentos, divorcio, outro
ALTER TABLE processos_vvd ADD COLUMN suspeita_ma_fe BOOLEAN DEFAULT false;
ALTER TABLE processos_vvd ADD COLUMN data_fato DATE;  -- quando ocorreu o fato
ALTER TABLE processos_vvd ADD COLUMN medidas_deferidas JSONB;  -- array de medidas específicas
```

### `intimacoes_vvd` — Campos a adicionar

```sql
ALTER TABLE intimacoes_vvd ADD COLUMN audiencia_id INTEGER REFERENCES audiencias(id);  -- vínculo com calendário
```

### Indexes novos

```sql
CREATE INDEX processos_vvd_canal_entrada_idx ON processos_vvd(canal_entrada);
CREATE INDEX processos_vvd_tipo_relato_idx ON processos_vvd(tipo_relato);
CREATE INDEX processos_vvd_tem_acao_familia_idx ON processos_vvd(tem_acao_familia);
CREATE INDEX processos_vvd_data_fato_idx ON processos_vvd(data_fato);
CREATE INDEX processos_vvd_processo_id_idx ON processos_vvd(processo_id);
CREATE INDEX partes_vvd_assistido_id_idx ON partes_vvd(assistido_id);
CREATE INDEX partes_vvd_sexo_idx ON partes_vvd(sexo);
CREATE INDEX intimacoes_vvd_audiencia_id_idx ON intimacoes_vvd(audiencia_id);
```

---

## Router VVD — Novos Endpoints

### Promoção
- `vvd.promoverAssistido` — cria assistido + processo no sistema geral, seta FKs bidirecionais
  - Input: `{ processoVVDId, dadosAdicionais? }`
  - Busca requerido (parte VVD) → cria assistido com nome, CPF, telefone, endereço
  - Busca processo VVD → cria processo com número, comarca, vara, crime
  - Seta `partes_vvd.assistidoId` e `processos_vvd.processoId`
  - Retorna IDs criados

### CRUD complementar
- `vvd.updateParte` — editar dados de uma parte existente
- `vvd.deleteParte` — soft delete (seta deletedAt)
- `vvd.deleteProcesso` — soft delete

### Análise (Camada 1)
- `vvd.statsAnaliticos` — retorna dados para dashboard analítico:
  - MPUs por período (agrupado por dia/semana/mês)
  - Por canal de entrada
  - Por tipo de relato
  - Por bairro/região
  - Requerentes recorrentes (com contagem de MPUs)
  - Taxa de deferimento/indeferimento
  - Medidas mais aplicadas
  - Temporalidade (dia da semana, horário)

### Alertas (Camada 2)
- `vvd.checkRequerenteRecorrente` — dado um nome/CPF, verifica se já tem MPUs anteriores
- `vvd.checkAcaoFamiliaParalela` — dado um requerido, verifica se tem processos de família no sistema
- `vvd.alertasImportacao` — batch check ao importar várias intimações

---

## UI — Correções e Novas Features

### Fase 1: Correções (tornar funcional)
1. Renomear "Autor" → "Requerido" e "Vítima" → "Requerente" em toda UI
2. Botão "Novo Processo" → abrir modal funcional de criação
3. Mutation `updateParte` → permitir edição
4. Tab Partes no dashboard → vincular à página existente (remover stub)
5. Botão "Petição" → criar demanda real + vínculo com intimação VVD

### Fase 2: Promoção e Integração
6. Botão "Promover a Assistido" no detalhe do processo VVD
7. Badge "Promovido" + link para assistido/processo geral
8. Highlight visual em intimações PETICIONAR/AUDIENCIA não promovidas
9. Intimação tipo AUDIENCIA → criar evento no calendário de audiências

### Fase 3: Dashboard Analítico (Camada 1+2)
10. Página `/admin/vvd/stats` com:
    - Gráficos de tendência (MPUs por período)
    - Distribuição por canal de entrada
    - Ranking de tipos de relato
    - Tabela de requerentes recorrentes
    - Mapa/ranking por bairro
    - Medidas mais aplicadas
11. Alertas visuais na importação:
    - 🔴 "Requerente recorrente detectada"
    - 🟡 "Possível ação de família paralela"
    - 🔴 "Requerido com múltiplas MPUs vigentes"

### Modal de Triagem (enriquecimento)
- Adicionar campos no modal de importação PJe:
  - Canal de entrada (select)
  - Tipo de relato (select, pode ser pré-preenchido por heurística)
  - Toggle "Tem ação de família?"
- Alertas inline durante a triagem

---

## Tabela Legada `medidas_protetivas`
- **Não remover** — pode ter dados históricos
- **Não usar** — o novo modelo VVD substitui completamente
- Avaliar migração de dados existentes em momento oportuno

---

## Futuro: Camada 3 (IA Generativa)
- Classificação automática de relatos via enrichment engine (Gemini/OpenAI)
- Score de risco de má-fé (requerente recorrente + ação família + relato vago)
- Relatórios mensais gerados por IA com tendências e anomalias
- Análise preditiva de padrões sazonais e geográficos

---

## Ordem de Implementação

```
Fase 1: Fundação
├── 1.1 Migração schema (rename + novos campos)
├── 1.2 Atualizar router VVD (nova terminologia + novos endpoints)
├── 1.3 Corrigir UI broken (botões, tabs, edição)
├── 1.4 Botão Petição → cria demanda
└── 1.5 Intimação AUDIÊNCIA → cria audiência

Fase 2: Promoção
├── 2.1 Endpoint promoverAssistido
├── 2.2 UI de promoção (botão + badge + link)
└── 2.3 Sugestão automática (highlight PETICIONAR/AUDIENCIA)

Fase 3: Cosmovisão
├── 3.1 Endpoint statsAnaliticos
├── 3.2 Página /admin/vvd/stats (dashboard analítico)
├── 3.3 Alertas na importação (requerente recorrente, ação família)
└── 3.4 Campos analíticos no modal de triagem
```
