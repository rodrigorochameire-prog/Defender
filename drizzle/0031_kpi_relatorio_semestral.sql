-- KPI: Relatório Semestral de Atividades (Corregedoria DPE-BA)
-- Agrega demandas, audiências e atendimentos por mês, mapeados para as categorias
-- oficiais do formulário da Corregedoria. Escopo: defensor_id + ano + semestre.

-- ==========================================================================
-- 1. ATIVIDADES JUDICIAIS — demandas protocoladas, mapeadas por ato
-- ==========================================================================
CREATE OR REPLACE VIEW vw_relatorio_atos_judiciais AS
SELECT
  d.defensor_id,
  EXTRACT(YEAR FROM d.created_at)::int AS ano,
  EXTRACT(MONTH FROM d.created_at)::int AS mes,
  d.ato AS ato_ombuds,
  CASE d.ato
    -- Petições e defesas
    WHEN 'Resposta à Acusação' THEN 'Defesa preliminar'
    WHEN 'Alegações finais' THEN 'Alegações finais em memoriais / orais'
    WHEN 'Habeas Corpus' THEN 'Habeas corpus'
    WHEN 'Razões de RESE' THEN 'Recurso em sentido estrito - razões/contrarrazões'
    WHEN 'RESE' THEN 'Recurso em sentido estrito - razões/contrarrazões'
    WHEN 'Razões de apelação' THEN 'Apelação - razões'
    WHEN 'Agravo em Execução' THEN 'Agravo em execução penal / contrarrazão em agravo regimental'
    WHEN 'Embargos de declaração' THEN 'Embargos de declaração'
    WHEN 'Revogação da prisão preventiva' THEN 'Pedido de revogação de prisão preventiva'
    WHEN 'Revogação de medida protetiva' THEN 'Pedido de revogação de medida protetiva'
    WHEN 'Petição intermediária' THEN 'Outras petições intermediárias'
    WHEN 'Diligências do 422' THEN 'Diligências cartorárias'
    WHEN 'Ofício' THEN 'Correspondências/notificações/ofícios enviados'
    WHEN 'Transferência de autos' THEN 'Ação de restauração de autos'
    -- Ciências (sentença)
    WHEN 'Ciência' THEN 'Cota nos autos ( exceto intimação de sentença )'
    WHEN 'Ciência de decisão' THEN 'Cota nos autos ( exceto intimação de sentença )'
    WHEN 'Ciência cumprimento' THEN 'Ciência de sentença condenatória'
    WHEN 'Ciência da pronúncia' THEN 'Ciência de sentença de pronúncia'
    WHEN 'Ciência prescrição' THEN 'Ciência de sentença de extinção de punibilidade prescrição, decadência ou perempção'
    WHEN 'Ciência morte' THEN 'Ciência de sentença de extinção de punibilidade pela morte do agente'
    WHEN 'Ciência indulto' THEN 'Ciência de sentença de extinção de punibilidade pela anistia, graça ou indulto'
    WHEN 'Ciência da designação de audiência' THEN 'Análise individual de processo'
    -- ANPP
    WHEN 'ANPP - Manifestação' THEN 'Ciência de sentença homologatória de anpp'
    WHEN 'Cumprimento ANPP' THEN 'Ciência de sentença homologatória de anpp'
    -- Execução penal
    WHEN 'PPL - Manifestação' THEN 'Pedido de progressão de regime'
    WHEN 'PRD - Manifestação' THEN 'Pedido de suspensão condicional da pena'
    -- Manifestações genéricas
    WHEN 'Manifestação' THEN 'Outras petições intermediárias'
    WHEN 'Cumprir despacho' THEN 'Outras petições intermediárias'
    WHEN 'Analisar decisão' THEN 'Análise individual de processo'
    WHEN 'Atualização de endereço' THEN 'Outras petições intermediárias'
    WHEN 'Outro' THEN 'Outros (especificar)'
    ELSE 'Outros (especificar)'
  END AS categoria_relatorio,
  'ATIVIDADES JUDICIAIS' AS secao_relatorio,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE d.status = '7_PROTOCOLADO') AS protocoladas
FROM demandas d
WHERE d.deleted_at IS NULL
  AND d.ato IS NOT NULL
  AND d.ato != ''
GROUP BY d.defensor_id, EXTRACT(YEAR FROM d.created_at), EXTRACT(MONTH FROM d.created_at),
  d.ato;

-- ==========================================================================
-- 2. AUDIÊNCIAS — por tipo, mapeadas para categorias do relatório
-- ==========================================================================
CREATE OR REPLACE VIEW vw_relatorio_audiencias AS
SELECT
  a.defensor_id,
  EXTRACT(YEAR FROM a.data_audiencia)::int AS ano,
  EXTRACT(MONTH FROM a.data_audiencia)::int AS mes,
  a.tipo AS tipo_ombuds,
  CASE
    WHEN a.tipo ILIKE '%Júri%' OR a.tipo ILIKE '%juri%' THEN 'Defesa no júri'
    WHEN a.tipo ILIKE '%custódia%' THEN 'Audiência de custódia'
    WHEN a.tipo ILIKE '%Admonitória%' THEN 'Audências judiciais'
    WHEN a.tipo ILIKE '%Justificação%' THEN 'Audências judiciais'
    WHEN a.tipo ILIKE '%Oitiva%' THEN 'Audiência de oitiva informal de adolescente infrator'
    ELSE 'Audências judiciais'
  END AS categoria_relatorio,
  CASE
    WHEN a.tipo ILIKE '%Júri%' OR a.tipo ILIKE '%juri%' THEN 'ATIVIDADES JUDICIAIS'
    ELSE 'ATIVIDADES JUDICIAIS'
  END AS secao_relatorio,
  COUNT(*) AS total
FROM audiencias a
WHERE a.data_audiencia IS NOT NULL
GROUP BY a.defensor_id, EXTRACT(YEAR FROM a.data_audiencia), EXTRACT(MONTH FROM a.data_audiencia),
  a.tipo;

-- ==========================================================================
-- 3. ATENDIMENTOS — por tipo, mapeados para EXTRAJUDICIAL
-- ==========================================================================
CREATE OR REPLACE VIEW vw_relatorio_atendimentos AS
SELECT
  at.atendido_por_id AS defensor_id,
  EXTRACT(YEAR FROM at.data_atendimento)::int AS ano,
  EXTRACT(MONTH FROM at.data_atendimento)::int AS mes,
  at.tipo AS tipo_ombuds,
  CASE at.tipo
    WHEN 'presencial' THEN 'Atendimento presencial de assistido em liberdade ou familiar'
    WHEN 'videoconferencia' THEN 'Atendimento remoto por vídeoconferência de assistido em liberdade ou familiar'
    WHEN 'telefone' THEN 'Atendimento remoto por conversa telefônica'
    WHEN 'email' THEN 'Atendimento remoto por correio eletrônico ou aplicativo'
    WHEN 'presencial_prisional' THEN 'Atendimento presencial em unidade prisional'
    WHEN 'videoconferencia_prisional' THEN 'Atendimento remoto por vídeoconferência de assistido em unidade prisional'
    ELSE 'Atendimento presencial de assistido em liberdade ou familiar'
  END AS categoria_relatorio,
  'EXTRAJUDICIAL' AS secao_relatorio,
  COUNT(*) AS total
FROM atendimentos at
WHERE at.data_atendimento IS NOT NULL
GROUP BY at.atendido_por_id, EXTRACT(YEAR FROM at.data_atendimento), EXTRACT(MONTH FROM at.data_atendimento),
  at.tipo;

-- ==========================================================================
-- 4. VIEW CONSOLIDADA — une as 3 fontes numa estrutura única
-- ==========================================================================
CREATE OR REPLACE VIEW vw_relatorio_semestral AS
SELECT defensor_id, ano, mes, ato_ombuds AS fonte, categoria_relatorio, secao_relatorio, total
FROM vw_relatorio_atos_judiciais
UNION ALL
SELECT defensor_id, ano, mes, tipo_ombuds AS fonte, categoria_relatorio, secao_relatorio, total
FROM vw_relatorio_audiencias
UNION ALL
SELECT defensor_id, ano, mes, tipo_ombuds AS fonte, categoria_relatorio, secao_relatorio, total
FROM vw_relatorio_atendimentos;

-- ==========================================================================
-- 5. RESUMO MENSAL — totais agregados por seção e mês (para os KPI cards)
-- ==========================================================================
CREATE OR REPLACE VIEW vw_relatorio_resumo_mensal AS
SELECT
  defensor_id,
  ano,
  mes,
  secao_relatorio,
  SUM(total)::int AS total
FROM vw_relatorio_semestral
GROUP BY defensor_id, ano, mes, secao_relatorio;

GRANT SELECT ON vw_relatorio_atos_judiciais, vw_relatorio_audiencias,
  vw_relatorio_atendimentos, vw_relatorio_semestral, vw_relatorio_resumo_mensal
TO authenticated, anon, service_role;
