# DefesaHub - Queries do Banco de Dados

Este documento contém as queries SQL mais úteis para gestão do banco de dados DefesaHub.

## Sumário

1. [Queries de Dashboard](#queries-de-dashboard)
2. [Gestão de Demandas/Prazos](#gestão-de-demandasprazos)
3. [Gestão de Assistidos](#gestão-de-assistidos)
4. [Gestão de Processos](#gestão-de-processos)
5. [Audiências e Agenda](#audiências-e-agenda)
6. [Sessões do Júri](#sessões-do-júri)
7. [Atendimentos](#atendimentos)
8. [Relatórios e Estatísticas](#relatórios-e-estatísticas)
9. [Manutenção](#manutenção)

---

## Queries de Dashboard

### Contadores Principais

```sql
-- Prazos de hoje
SELECT COUNT(*) as prazos_hoje
FROM demandas
WHERE prazo = CURRENT_DATE
  AND deleted_at IS NULL
  AND status NOT IN ('CONCLUIDO', 'ARQUIVADO');

-- Prazos da semana
SELECT COUNT(*) as prazos_semana
FROM demandas
WHERE prazo BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND deleted_at IS NULL
  AND status NOT IN ('CONCLUIDO', 'ARQUIVADO');

-- Prazos vencidos
SELECT COUNT(*) as prazos_vencidos
FROM demandas
WHERE prazo < CURRENT_DATE
  AND deleted_at IS NULL
  AND status NOT IN ('CONCLUIDO', 'ARQUIVADO', '7_PROTOCOLADO');

-- Audiências de hoje
SELECT COUNT(*) as audiencias_hoje
FROM audiencias
WHERE DATE(data_audiencia) = CURRENT_DATE
  AND status NOT IN ('CANCELADA', 'ADIADA');

-- Réus presos
SELECT COUNT(*) as reus_presos
FROM assistidos
WHERE status_prisional NOT IN ('SOLTO', 'DOMICILIAR')
  AND deleted_at IS NULL;

-- Total de casos ativos
SELECT COUNT(*) as casos_ativos
FROM casos
WHERE status = 'ativo'
  AND deleted_at IS NULL;
```

### Dashboard Completo

```sql
-- Estatísticas gerais para o dashboard
SELECT 
  (SELECT COUNT(*) FROM demandas WHERE prazo = CURRENT_DATE AND deleted_at IS NULL AND status NOT IN ('CONCLUIDO', 'ARQUIVADO')) as prazos_hoje,
  (SELECT COUNT(*) FROM demandas WHERE prazo BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days' AND deleted_at IS NULL AND status NOT IN ('CONCLUIDO', 'ARQUIVADO')) as prazos_semana,
  (SELECT COUNT(*) FROM audiencias WHERE DATE(data_audiencia) = CURRENT_DATE AND status NOT IN ('CANCELADA', 'ADIADA')) as audiencias_hoje,
  (SELECT COUNT(*) FROM sessoes_juri WHERE DATE(data_sessao) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND status = 'agendada') as juris_mes,
  (SELECT COUNT(*) FROM assistidos WHERE status_prisional NOT IN ('SOLTO', 'DOMICILIAR') AND deleted_at IS NULL) as reus_presos,
  (SELECT COUNT(*) FROM casos WHERE status = 'ativo' AND deleted_at IS NULL) as casos_ativos,
  (SELECT COUNT(*) FROM assistidos WHERE deleted_at IS NULL) as total_assistidos,
  (SELECT COUNT(*) FROM processos WHERE deleted_at IS NULL) as total_processos;
```

---

## Gestão de Demandas/Prazos

### Listar Demandas Urgentes

```sql
-- Prazos urgentes ordenados por prioridade e prazo
SELECT 
  d.id,
  d.ato,
  d.prazo,
  d.prioridade,
  d.status,
  d.reu_preso,
  a.nome as assistido_nome,
  p.numero_autos,
  p.vara,
  CASE 
    WHEN d.prazo < CURRENT_DATE THEN -1
    ELSE d.prazo - CURRENT_DATE 
  END as dias_restantes
FROM demandas d
JOIN assistidos a ON d.assistido_id = a.id
JOIN processos p ON d.processo_id = p.id
WHERE d.deleted_at IS NULL
  AND d.status NOT IN ('CONCLUIDO', 'ARQUIVADO', '7_PROTOCOLADO')
  AND d.prazo <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY 
  CASE d.prioridade 
    WHEN 'REU_PRESO' THEN 1
    WHEN 'URGENTE' THEN 2
    WHEN 'ALTA' THEN 3
    WHEN 'NORMAL' THEN 4
    WHEN 'BAIXA' THEN 5
  END,
  d.prazo ASC
LIMIT 20;
```

### Demandas por Status

```sql
-- Contagem de demandas por status
SELECT 
  status,
  COUNT(*) as quantidade
FROM demandas
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY 
  CASE status 
    WHEN '2_ATENDER' THEN 1
    WHEN 'URGENTE' THEN 2
    WHEN '5_FILA' THEN 3
    WHEN '4_MONITORAR' THEN 4
    WHEN '7_PROTOCOLADO' THEN 5
    WHEN '7_CIENCIA' THEN 6
    WHEN 'CONCLUIDO' THEN 7
    WHEN 'ARQUIVADO' THEN 8
  END;
```

### Inserir Nova Demanda

```sql
INSERT INTO demandas (
  processo_id,
  assistido_id,
  workspace_id,
  ato,
  tipo_ato,
  prazo,
  data_entrada,
  data_intimacao,
  status,
  prioridade,
  providencias,
  defensor_id,
  reu_preso,
  caso_id
) VALUES (
  $1,  -- processo_id
  $2,  -- assistido_id
  $3,  -- workspace_id
  $4,  -- ato (ex: 'Resposta à Acusação')
  $5,  -- tipo_ato (ex: 'manifestacao')
  $6,  -- prazo (DATE)
  CURRENT_DATE,  -- data_entrada
  $7,  -- data_intimacao
  '5_FILA',  -- status inicial
  $8,  -- prioridade
  $9,  -- providencias
  $10, -- defensor_id
  $11, -- reu_preso (boolean)
  $12  -- caso_id (opcional)
)
RETURNING id;
```

### Atualizar Status de Demanda

```sql
-- Marcar demanda como protocolada
UPDATE demandas
SET 
  status = '7_PROTOCOLADO',
  data_conclusao = NOW(),
  updated_at = NOW()
WHERE id = $1;

-- Mover demanda para "Atender"
UPDATE demandas
SET 
  status = '2_ATENDER',
  updated_at = NOW()
WHERE id = $1;
```

---

## Gestão de Assistidos

### Listar Assistidos com Filtros

```sql
-- Assistidos com processos e status
SELECT 
  a.id,
  a.nome,
  a.cpf,
  a.status_prisional,
  a.telefone,
  a.unidade_prisional,
  COUNT(DISTINCT p.id) as total_processos,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status NOT IN ('CONCLUIDO', 'ARQUIVADO')) as demandas_pendentes
FROM assistidos a
LEFT JOIN processos p ON p.assistido_id = a.id AND p.deleted_at IS NULL
LEFT JOIN demandas d ON d.assistido_id = a.id AND d.deleted_at IS NULL
WHERE a.deleted_at IS NULL
GROUP BY a.id
ORDER BY a.nome;
```

### Assistidos Presos

```sql
SELECT 
  a.id,
  a.nome,
  a.status_prisional,
  a.unidade_prisional,
  a.data_prisao,
  COUNT(d.id) as demandas_pendentes
FROM assistidos a
LEFT JOIN demandas d ON d.assistido_id = a.id 
  AND d.deleted_at IS NULL 
  AND d.status NOT IN ('CONCLUIDO', 'ARQUIVADO')
WHERE a.deleted_at IS NULL
  AND a.status_prisional NOT IN ('SOLTO', 'DOMICILIAR')
GROUP BY a.id
ORDER BY a.data_prisao DESC;
```

### Inserir Novo Assistido

```sql
INSERT INTO assistidos (
  nome,
  cpf,
  rg,
  nome_mae,
  data_nascimento,
  status_prisional,
  telefone,
  telefone_contato,
  nome_contato,
  endereco,
  workspace_id,
  defensor_id
) VALUES (
  $1,  -- nome
  $2,  -- cpf
  $3,  -- rg
  $4,  -- nome_mae
  $5,  -- data_nascimento
  $6,  -- status_prisional
  $7,  -- telefone
  $8,  -- telefone_contato
  $9,  -- nome_contato
  $10, -- endereco
  $11, -- workspace_id
  $12  -- defensor_id
)
RETURNING id;
```

---

## Gestão de Processos

### Listar Processos com Detalhes

```sql
SELECT 
  p.id,
  p.numero_autos,
  p.area,
  p.atribuicao,
  p.comarca,
  p.vara,
  p.situacao,
  p.is_juri,
  a.nome as assistido_nome,
  a.status_prisional,
  u.name as defensor_nome,
  COUNT(d.id) FILTER (WHERE d.status NOT IN ('CONCLUIDO', 'ARQUIVADO')) as demandas_pendentes
FROM processos p
JOIN assistidos a ON p.assistido_id = a.id
LEFT JOIN users u ON p.defensor_id = u.id
LEFT JOIN demandas d ON d.processo_id = p.id AND d.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, a.nome, a.status_prisional, u.name
ORDER BY p.created_at DESC;
```

### Processos do Júri

```sql
SELECT 
  p.id,
  p.numero_autos,
  p.comarca,
  p.vara,
  a.nome as assistido_nome,
  a.status_prisional,
  sj.data_sessao,
  sj.status as status_sessao
FROM processos p
JOIN assistidos a ON p.assistido_id = a.id
LEFT JOIN sessoes_juri sj ON sj.processo_id = p.id AND sj.status = 'agendada'
WHERE p.is_juri = TRUE
  AND p.deleted_at IS NULL
  AND p.situacao = 'ativo'
ORDER BY sj.data_sessao ASC NULLS LAST;
```

### Inserir Novo Processo

```sql
INSERT INTO processos (
  assistido_id,
  atribuicao,
  workspace_id,
  numero_autos,
  comarca,
  vara,
  area,
  classe_processual,
  assunto,
  situacao,
  is_juri,
  defensor_id,
  caso_id
) VALUES (
  $1,  -- assistido_id
  $2,  -- atribuicao
  $3,  -- workspace_id
  $4,  -- numero_autos
  $5,  -- comarca
  $6,  -- vara
  $7,  -- area
  $8,  -- classe_processual
  $9,  -- assunto
  'ativo',
  $10, -- is_juri
  $11, -- defensor_id
  $12  -- caso_id
)
RETURNING id;
```

---

## Audiências e Agenda

### Audiências de Hoje e Próximas

```sql
-- Audiências de hoje
SELECT 
  au.id,
  au.data_audiencia,
  au.tipo,
  au.local,
  au.sala,
  au.status,
  p.numero_autos,
  a.nome as assistido_nome
FROM audiencias au
JOIN processos p ON au.processo_id = p.id
JOIN assistidos a ON p.assistido_id = a.id
WHERE DATE(au.data_audiencia) = CURRENT_DATE
  AND au.status NOT IN ('CANCELADA', 'ADIADA')
ORDER BY au.data_audiencia ASC;

-- Audiências da semana
SELECT 
  au.id,
  au.data_audiencia,
  au.tipo,
  au.local,
  au.status,
  p.numero_autos,
  a.nome as assistido_nome
FROM audiencias au
JOIN processos p ON au.processo_id = p.id
JOIN assistidos a ON p.assistido_id = a.id
WHERE au.data_audiencia BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  AND au.status NOT IN ('CANCELADA', 'ADIADA')
ORDER BY au.data_audiencia ASC;
```

### Inserir Nova Audiência

```sql
INSERT INTO audiencias (
  processo_id,
  workspace_id,
  caso_id,
  assistido_id,
  data_audiencia,
  tipo,
  local,
  sala,
  defensor_id,
  status
) VALUES (
  $1,  -- processo_id
  $2,  -- workspace_id
  $3,  -- caso_id
  $4,  -- assistido_id
  $5,  -- data_audiencia (TIMESTAMP)
  $6,  -- tipo
  $7,  -- local
  $8,  -- sala
  $9,  -- defensor_id
  'agendada'
)
RETURNING id;
```

---

## Sessões do Júri

### Próximas Sessões

```sql
SELECT 
  sj.id,
  sj.data_sessao,
  sj.horario,
  sj.sala,
  sj.status,
  sj.defensor_nome,
  p.numero_autos,
  p.comarca,
  a.nome as assistido_nome,
  a.status_prisional
FROM sessoes_juri sj
JOIN processos p ON sj.processo_id = p.id
JOIN assistidos a ON p.assistido_id = a.id
WHERE sj.data_sessao >= CURRENT_DATE
  AND sj.status = 'agendada'
ORDER BY sj.data_sessao ASC;
```

### Inserir Sessão do Júri

```sql
INSERT INTO sessoes_juri (
  processo_id,
  workspace_id,
  data_sessao,
  horario,
  sala,
  defensor_id,
  defensor_nome,
  assistido_nome,
  status
) VALUES (
  $1,  -- processo_id
  $2,  -- workspace_id
  $3,  -- data_sessao
  $4,  -- horario
  $5,  -- sala
  $6,  -- defensor_id
  $7,  -- defensor_nome
  $8,  -- assistido_nome
  'agendada'
)
RETURNING id;
```

---

## Atendimentos

### Atendimentos de Hoje

```sql
SELECT 
  at.id,
  at.data_atendimento,
  at.tipo,
  at.assunto,
  at.status,
  a.nome as assistido_nome,
  u.name as atendente_nome
FROM atendimentos at
JOIN assistidos a ON at.assistido_id = a.id
LEFT JOIN users u ON at.atendido_por_id = u.id
WHERE DATE(at.data_atendimento) = CURRENT_DATE
ORDER BY at.data_atendimento ASC;
```

### Inserir Novo Atendimento

```sql
INSERT INTO atendimentos (
  assistido_id,
  data_atendimento,
  tipo,
  local,
  assunto,
  atendido_por_id,
  status
) VALUES (
  $1,  -- assistido_id
  $2,  -- data_atendimento
  $3,  -- tipo ('presencial', 'telefone', 'videoconferencia', 'visita_carcer')
  $4,  -- local
  $5,  -- assunto
  $6,  -- atendido_por_id
  'agendado'
)
RETURNING id;
```

---

## Relatórios e Estatísticas

### Taxa de Cumprimento de Prazos

```sql
SELECT 
  ROUND(
    (COUNT(*) FILTER (WHERE data_conclusao <= prazo)::DECIMAL / 
     NULLIF(COUNT(*) FILTER (WHERE data_conclusao IS NOT NULL), 0)) * 100,
    2
  ) as taxa_cumprimento
FROM demandas
WHERE deleted_at IS NULL
  AND prazo IS NOT NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### Demandas Protocoladas por Período

```sql
SELECT 
  DATE_TRUNC('day', data_conclusao) as data,
  COUNT(*) as quantidade
FROM demandas
WHERE status = '7_PROTOCOLADO'
  AND data_conclusao >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', data_conclusao)
ORDER BY data;
```

### Distribuição por Área

```sql
SELECT 
  area,
  COUNT(*) as quantidade
FROM processos
WHERE deleted_at IS NULL
GROUP BY area
ORDER BY quantidade DESC;
```

### Carga de Trabalho por Defensor

```sql
SELECT 
  u.name as defensor,
  COUNT(DISTINCT d.id) FILTER (WHERE d.status NOT IN ('CONCLUIDO', 'ARQUIVADO')) as demandas_pendentes,
  COUNT(DISTINCT p.id) as processos_ativos
FROM users u
LEFT JOIN demandas d ON d.defensor_id = u.id AND d.deleted_at IS NULL
LEFT JOIN processos p ON p.defensor_id = u.id AND p.deleted_at IS NULL AND p.situacao = 'ativo'
WHERE u.role IN ('defensor', 'admin')
  AND u.deleted_at IS NULL
GROUP BY u.id
ORDER BY demandas_pendentes DESC;
```

---

## Manutenção

### Verificar Workspace Default

```sql
SELECT * FROM workspaces WHERE name = 'Default';
```

### Verificar Integridade de Dados

```sql
-- Demandas sem processo
SELECT d.* FROM demandas d
LEFT JOIN processos p ON d.processo_id = p.id
WHERE p.id IS NULL;

-- Processos sem assistido
SELECT p.* FROM processos p
LEFT JOIN assistidos a ON p.assistido_id = a.id
WHERE a.id IS NULL;

-- Audiências órfãs
SELECT au.* FROM audiencias au
LEFT JOIN processos p ON au.processo_id = p.id
WHERE p.id IS NULL;
```

### Atualizar Timestamps

```sql
-- Atualizar updated_at de todos os registros modificados
UPDATE demandas SET updated_at = NOW() WHERE id = $1;
UPDATE processos SET updated_at = NOW() WHERE id = $1;
UPDATE assistidos SET updated_at = NOW() WHERE id = $1;
```

### Soft Delete

```sql
-- Soft delete de assistido
UPDATE assistidos SET deleted_at = NOW() WHERE id = $1;

-- Restaurar assistido
UPDATE assistidos SET deleted_at = NULL WHERE id = $1;

-- Listar registros deletados
SELECT * FROM assistidos WHERE deleted_at IS NOT NULL;
```

---

## Views Úteis (Opcionais)

```sql
-- View de demandas urgentes
CREATE OR REPLACE VIEW vw_demandas_urgentes AS
SELECT 
  d.id,
  d.ato,
  d.prazo,
  d.prioridade,
  d.status,
  d.reu_preso,
  a.nome as assistido_nome,
  p.numero_autos,
  p.vara,
  CASE 
    WHEN d.prazo < CURRENT_DATE THEN -1
    ELSE d.prazo - CURRENT_DATE 
  END as dias_restantes
FROM demandas d
JOIN assistidos a ON d.assistido_id = a.id
JOIN processos p ON d.processo_id = p.id
WHERE d.deleted_at IS NULL
  AND d.status NOT IN ('CONCLUIDO', 'ARQUIVADO', '7_PROTOCOLADO')
  AND d.prazo <= CURRENT_DATE + INTERVAL '7 days';

-- View de agenda do dia
CREATE OR REPLACE VIEW vw_agenda_hoje AS
SELECT 
  'audiencia' as tipo_evento,
  au.id,
  au.data_audiencia as data_hora,
  au.tipo as subtipo,
  a.nome as assistido,
  p.numero_autos,
  au.local
FROM audiencias au
JOIN processos p ON au.processo_id = p.id
JOIN assistidos a ON p.assistido_id = a.id
WHERE DATE(au.data_audiencia) = CURRENT_DATE
  AND au.status NOT IN ('CANCELADA', 'ADIADA')
UNION ALL
SELECT 
  'atendimento' as tipo_evento,
  at.id,
  at.data_atendimento as data_hora,
  at.tipo as subtipo,
  a.nome as assistido,
  NULL as numero_autos,
  at.local
FROM atendimentos at
JOIN assistidos a ON at.assistido_id = a.id
WHERE DATE(at.data_atendimento) = CURRENT_DATE
  AND at.status = 'agendado'
ORDER BY data_hora;
```

---

## Notas Importantes

1. **Workspace**: Todas as queries devem considerar o `workspace_id` quando o sistema estiver em modo multi-workspace.

2. **Soft Delete**: Sempre verificar `deleted_at IS NULL` para não incluir registros deletados.

3. **Timezone**: O banco usa `TIMESTAMP WITH TIME ZONE`. Certifique-se de que as comparações de data considerem o timezone correto.

4. **Índices**: As queries principais já têm índices criados. Para queries personalizadas, considere criar índices adicionais se necessário.

5. **Performance**: Para tabelas grandes, use `LIMIT` e paginação com `OFFSET` ou cursor-based pagination.
