-- ==========================================
-- DEFENSORHUB - MIGRATION PARA SISTEMA JURÍDICO
-- ==========================================

-- Criar Enums
DO $$ BEGIN
  CREATE TYPE area AS ENUM (
    'JURI', 'EXECUCAO_PENAL', 'VIOLENCIA_DOMESTICA', 'SUBSTITUICAO', 
    'CURADORIA', 'FAMILIA', 'CIVEL', 'FAZENDA_PUBLICA'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE status_prisional AS ENUM (
    'SOLTO', 'CADEIA_PUBLICA', 'PENITENCIARIA', 'COP', 
    'HOSPITAL_CUSTODIA', 'DOMICILIAR', 'MONITORADO'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE status_demanda AS ENUM (
    '2_ATENDER', '4_MONITORAR', '5_FILA', '7_PROTOCOLADO', 
    '7_CIENCIA', '7_SEM_ATUACAO', 'URGENTE', 'CONCLUIDO', 'ARQUIVADO'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE prioridade AS ENUM (
    'BAIXA', 'NORMAL', 'ALTA', 'URGENTE', 'REU_PRESO'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- TABELA: users (atualizada para defensores)
-- ==========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS oab VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS comarca VARCHAR(100);

CREATE INDEX IF NOT EXISTS users_comarca_idx ON users(comarca);

-- ==========================================
-- TABELA: assistidos
-- ==========================================
CREATE TABLE IF NOT EXISTS assistidos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf VARCHAR(14),
  rg VARCHAR(20),
  nome_mae TEXT,
  nome_pai TEXT,
  data_nascimento DATE,
  naturalidade VARCHAR(100),
  nacionalidade VARCHAR(50) DEFAULT 'Brasileira',
  
  -- Status Prisional
  status_prisional status_prisional DEFAULT 'SOLTO',
  local_prisao TEXT,
  unidade_prisional TEXT,
  data_prisao DATE,
  
  -- Contato
  telefone VARCHAR(20),
  telefone_contato VARCHAR(20),
  nome_contato TEXT,
  parentesco_contato VARCHAR(50),
  endereco TEXT,
  
  -- Foto
  photo_url TEXT,
  
  -- Observações
  observacoes TEXT,
  
  -- Defensor responsável
  defensor_id INTEGER REFERENCES users(id),
  
  -- Metadados
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS assistidos_nome_idx ON assistidos(nome);
CREATE INDEX IF NOT EXISTS assistidos_cpf_idx ON assistidos(cpf);
CREATE INDEX IF NOT EXISTS assistidos_status_prisional_idx ON assistidos(status_prisional);
CREATE INDEX IF NOT EXISTS assistidos_defensor_id_idx ON assistidos(defensor_id);
CREATE INDEX IF NOT EXISTS assistidos_deleted_at_idx ON assistidos(deleted_at);

-- ==========================================
-- TABELA: processos
-- ==========================================
CREATE TABLE IF NOT EXISTS processos (
  id SERIAL PRIMARY KEY,
  assistido_id INTEGER NOT NULL REFERENCES assistidos(id) ON DELETE CASCADE,
  
  -- Identificação
  numero_autos TEXT NOT NULL,
  numero_antigo TEXT,
  
  -- Localização
  comarca VARCHAR(100),
  vara VARCHAR(100),
  area area NOT NULL,
  
  -- Detalhes
  classe_processual VARCHAR(100),
  assunto TEXT,
  valor_causa INTEGER,
  
  -- Partes
  parte_contraria TEXT,
  advogado_contrario TEXT,
  
  -- Status
  fase VARCHAR(50),
  situacao VARCHAR(50) DEFAULT 'ativo',
  
  -- Júri
  is_juri BOOLEAN DEFAULT FALSE,
  data_sessao_juri TIMESTAMP,
  resultado_juri TEXT,
  
  -- Defensor
  defensor_id INTEGER REFERENCES users(id),
  
  -- Observações
  observacoes TEXT,
  
  -- Metadados
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS processos_assistido_id_idx ON processos(assistido_id);
CREATE INDEX IF NOT EXISTS processos_numero_autos_idx ON processos(numero_autos);
CREATE INDEX IF NOT EXISTS processos_comarca_idx ON processos(comarca);
CREATE INDEX IF NOT EXISTS processos_area_idx ON processos(area);
CREATE INDEX IF NOT EXISTS processos_is_juri_idx ON processos(is_juri);
CREATE INDEX IF NOT EXISTS processos_defensor_id_idx ON processos(defensor_id);
CREATE INDEX IF NOT EXISTS processos_situacao_idx ON processos(situacao);
CREATE INDEX IF NOT EXISTS processos_deleted_at_idx ON processos(deleted_at);

-- ==========================================
-- TABELA: demandas
-- ==========================================
CREATE TABLE IF NOT EXISTS demandas (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER NOT NULL REFERENCES assistidos(id) ON DELETE CASCADE,
  
  -- Identificação
  ato TEXT NOT NULL,
  tipo_ato VARCHAR(50),
  
  -- Datas
  prazo DATE,
  data_entrada DATE,
  data_intimacao DATE,
  data_conclusao TIMESTAMP,
  
  -- Status
  status status_demanda DEFAULT '5_FILA',
  prioridade prioridade DEFAULT 'NORMAL',
  
  -- Providências
  providencias TEXT,
  
  -- Responsável
  defensor_id INTEGER REFERENCES users(id),
  
  -- Flag réu preso
  reu_preso BOOLEAN DEFAULT FALSE,
  
  -- Metadados
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS demandas_processo_id_idx ON demandas(processo_id);
CREATE INDEX IF NOT EXISTS demandas_assistido_id_idx ON demandas(assistido_id);
CREATE INDEX IF NOT EXISTS demandas_prazo_idx ON demandas(prazo);
CREATE INDEX IF NOT EXISTS demandas_status_idx ON demandas(status);
CREATE INDEX IF NOT EXISTS demandas_prioridade_idx ON demandas(prioridade);
CREATE INDEX IF NOT EXISTS demandas_defensor_id_idx ON demandas(defensor_id);
CREATE INDEX IF NOT EXISTS demandas_reu_preso_idx ON demandas(reu_preso);
CREATE INDEX IF NOT EXISTS demandas_deleted_at_idx ON demandas(deleted_at);

-- ==========================================
-- TABELA: sessoes_juri
-- ==========================================
CREATE TABLE IF NOT EXISTS sessoes_juri (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  
  -- Detalhes
  data_sessao TIMESTAMP NOT NULL,
  horario VARCHAR(10),
  sala VARCHAR(50),
  
  -- Participantes
  defensor_id INTEGER REFERENCES users(id),
  defensor_nome TEXT,
  assistido_nome TEXT,
  
  -- Status
  status VARCHAR(30) DEFAULT 'agendada',
  
  -- Resultado
  resultado TEXT,
  pena_aplicada TEXT,
  
  -- Observações
  observacoes TEXT,
  
  -- Metadados
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS sessoes_juri_processo_id_idx ON sessoes_juri(processo_id);
CREATE INDEX IF NOT EXISTS sessoes_juri_data_sessao_idx ON sessoes_juri(data_sessao);
CREATE INDEX IF NOT EXISTS sessoes_juri_defensor_id_idx ON sessoes_juri(defensor_id);
CREATE INDEX IF NOT EXISTS sessoes_juri_status_idx ON sessoes_juri(status);

-- ==========================================
-- TABELA: audiencias
-- ==========================================
CREATE TABLE IF NOT EXISTS audiencias (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  
  -- Detalhes
  data_audiencia TIMESTAMP NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  local TEXT,
  
  -- Participantes
  defensor_id INTEGER REFERENCES users(id),
  juiz TEXT,
  promotor TEXT,
  
  -- Status
  status VARCHAR(30) DEFAULT 'agendada',
  
  -- Resultado
  resultado TEXT,
  
  -- Observações
  observacoes TEXT,
  
  -- Metadados
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS audiencias_processo_id_idx ON audiencias(processo_id);
CREATE INDEX IF NOT EXISTS audiencias_data_idx ON audiencias(data_audiencia);
CREATE INDEX IF NOT EXISTS audiencias_defensor_id_idx ON audiencias(defensor_id);
CREATE INDEX IF NOT EXISTS audiencias_status_idx ON audiencias(status);
CREATE INDEX IF NOT EXISTS audiencias_tipo_idx ON audiencias(tipo);

-- ==========================================
-- TABELA: movimentacoes
-- ==========================================
CREATE TABLE IF NOT EXISTS movimentacoes (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  
  -- Detalhes
  data_movimentacao TIMESTAMP NOT NULL,
  descricao TEXT NOT NULL,
  tipo VARCHAR(50),
  
  -- Origem
  origem VARCHAR(20) DEFAULT 'manual',
  
  -- Metadados
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS movimentacoes_processo_id_idx ON movimentacoes(processo_id);
CREATE INDEX IF NOT EXISTS movimentacoes_data_idx ON movimentacoes(data_movimentacao);
CREATE INDEX IF NOT EXISTS movimentacoes_tipo_idx ON movimentacoes(tipo);

-- ==========================================
-- TABELA: documentos
-- ==========================================
CREATE TABLE IF NOT EXISTS documentos (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE,
  demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL,
  
  -- Detalhes
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria VARCHAR(50) NOT NULL,
  tipo_peca VARCHAR(100),
  
  -- Arquivo
  file_url TEXT NOT NULL,
  file_key TEXT,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INTEGER,
  
  -- Template
  is_template BOOLEAN DEFAULT FALSE,
  
  -- Metadados
  uploaded_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS documentos_processo_id_idx ON documentos(processo_id);
CREATE INDEX IF NOT EXISTS documentos_assistido_id_idx ON documentos(assistido_id);
CREATE INDEX IF NOT EXISTS documentos_demanda_id_idx ON documentos(demanda_id);
CREATE INDEX IF NOT EXISTS documentos_categoria_idx ON documentos(categoria);
CREATE INDEX IF NOT EXISTS documentos_is_template_idx ON documentos(is_template);

-- ==========================================
-- TABELA: anotacoes
-- ==========================================
CREATE TABLE IF NOT EXISTS anotacoes (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE,
  demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL,
  
  -- Conteúdo
  conteudo TEXT NOT NULL,
  tipo VARCHAR(30) DEFAULT 'nota',
  
  -- Prioridade
  importante BOOLEAN DEFAULT FALSE,
  
  -- Metadados
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS anotacoes_processo_id_idx ON anotacoes(processo_id);
CREATE INDEX IF NOT EXISTS anotacoes_assistido_id_idx ON anotacoes(assistido_id);
CREATE INDEX IF NOT EXISTS anotacoes_demanda_id_idx ON anotacoes(demanda_id);
CREATE INDEX IF NOT EXISTS anotacoes_tipo_idx ON anotacoes(tipo);
CREATE INDEX IF NOT EXISTS anotacoes_importante_idx ON anotacoes(importante);

-- ==========================================
-- TABELA: calendar_events (atualizada)
-- ==========================================
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL;

-- Remover coluna pet_id se existir
ALTER TABLE calendar_events DROP COLUMN IF EXISTS pet_id;

CREATE INDEX IF NOT EXISTS calendar_events_processo_id_idx ON calendar_events(processo_id);
CREATE INDEX IF NOT EXISTS calendar_events_assistido_id_idx ON calendar_events(assistido_id);

-- ==========================================
-- TABELA: notifications (atualizada)
-- ==========================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL;

-- Remover coluna pet_id se existir
ALTER TABLE notifications DROP COLUMN IF EXISTS pet_id;

-- ==========================================
-- TABELA: peca_templates
-- ==========================================
CREATE TABLE IF NOT EXISTS peca_templates (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  tipo_peca VARCHAR(100) NOT NULL,
  area area,
  
  -- Conteúdo
  conteudo TEXT,
  file_url TEXT,
  
  -- Visibilidade
  is_public BOOLEAN DEFAULT FALSE,
  
  -- Metadados
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS peca_templates_tipo_peca_idx ON peca_templates(tipo_peca);
CREATE INDEX IF NOT EXISTS peca_templates_area_idx ON peca_templates(area);
CREATE INDEX IF NOT EXISTS peca_templates_is_public_idx ON peca_templates(is_public);

-- ==========================================
-- TABELA: calculos_pena
-- ==========================================
CREATE TABLE IF NOT EXISTS calculos_pena (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE,
  
  -- Tipo de cálculo
  tipo_calculo VARCHAR(30) NOT NULL,
  
  -- Dados base
  pena_total INTEGER,
  data_inicio DATE,
  regime VARCHAR(20),
  
  -- Resultados
  data_resultado DATE,
  observacoes TEXT,
  
  -- Parâmetros
  parametros TEXT,
  
  -- Metadados
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS calculos_pena_processo_id_idx ON calculos_pena(processo_id);
CREATE INDEX IF NOT EXISTS calculos_pena_assistido_id_idx ON calculos_pena(assistido_id);
CREATE INDEX IF NOT EXISTS calculos_pena_tipo_idx ON calculos_pena(tipo_calculo);

-- ==========================================
-- TABELA: atendimentos
-- ==========================================
CREATE TABLE IF NOT EXISTS atendimentos (
  id SERIAL PRIMARY KEY,
  assistido_id INTEGER NOT NULL REFERENCES assistidos(id) ON DELETE CASCADE,
  
  -- Detalhes
  data_atendimento TIMESTAMP NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  local TEXT,
  
  -- Resumo
  assunto TEXT,
  resumo TEXT,
  
  -- Acompanhantes
  acompanhantes TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'agendado',
  
  -- Metadados
  atendido_por_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS atendimentos_assistido_id_idx ON atendimentos(assistido_id);
CREATE INDEX IF NOT EXISTS atendimentos_data_idx ON atendimentos(data_atendimento);
CREATE INDEX IF NOT EXISTS atendimentos_tipo_idx ON atendimentos(tipo);
CREATE INDEX IF NOT EXISTS atendimentos_status_idx ON atendimentos(status);
CREATE INDEX IF NOT EXISTS atendimentos_atendido_por_idx ON atendimentos(atendido_por_id);

-- ==========================================
-- WHATSAPP: Atualizar para contexto jurídico
-- ==========================================
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS auto_notify_prazo BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS auto_notify_audiencia BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS auto_notify_juri BOOLEAN DEFAULT FALSE;
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS auto_notify_movimentacao BOOLEAN DEFAULT FALSE;

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL;

-- Remover colunas antigas do whatsapp se existirem
ALTER TABLE whatsapp_config DROP COLUMN IF EXISTS auto_notify_checkin;
ALTER TABLE whatsapp_config DROP COLUMN IF EXISTS auto_notify_checkout;
ALTER TABLE whatsapp_config DROP COLUMN IF EXISTS auto_notify_daily_log;
ALTER TABLE whatsapp_config DROP COLUMN IF EXISTS auto_notify_booking;

ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS pet_id;

CREATE INDEX IF NOT EXISTS whatsapp_messages_assistido_id_idx ON whatsapp_messages(assistido_id);

-- ==========================================
-- POLÍTICAS RLS (Row Level Security)
-- ==========================================

-- Habilitar RLS nas tabelas
ALTER TABLE assistidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_juri ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE peca_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculos_pena ENABLE ROW LEVEL SECURITY;

-- Políticas para assistidos
CREATE POLICY IF NOT EXISTS "assistidos_select_all" ON assistidos FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "assistidos_insert_admin" ON assistidos FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "assistidos_update_admin" ON assistidos FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "assistidos_delete_admin" ON assistidos FOR DELETE USING (true);

-- Políticas para processos
CREATE POLICY IF NOT EXISTS "processos_select_all" ON processos FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "processos_insert_admin" ON processos FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "processos_update_admin" ON processos FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "processos_delete_admin" ON processos FOR DELETE USING (true);

-- Políticas para demandas
CREATE POLICY IF NOT EXISTS "demandas_select_all" ON demandas FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "demandas_insert_admin" ON demandas FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "demandas_update_admin" ON demandas FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "demandas_delete_admin" ON demandas FOR DELETE USING (true);

-- Políticas para sessoes_juri
CREATE POLICY IF NOT EXISTS "sessoes_juri_select_all" ON sessoes_juri FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "sessoes_juri_insert_admin" ON sessoes_juri FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "sessoes_juri_update_admin" ON sessoes_juri FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "sessoes_juri_delete_admin" ON sessoes_juri FOR DELETE USING (true);

-- Políticas para audiencias
CREATE POLICY IF NOT EXISTS "audiencias_select_all" ON audiencias FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "audiencias_insert_admin" ON audiencias FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "audiencias_update_admin" ON audiencias FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "audiencias_delete_admin" ON audiencias FOR DELETE USING (true);

-- Políticas para movimentacoes
CREATE POLICY IF NOT EXISTS "movimentacoes_select_all" ON movimentacoes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "movimentacoes_insert_admin" ON movimentacoes FOR INSERT WITH CHECK (true);

-- Políticas para documentos
CREATE POLICY IF NOT EXISTS "documentos_select_all" ON documentos FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "documentos_insert_admin" ON documentos FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "documentos_update_admin" ON documentos FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "documentos_delete_admin" ON documentos FOR DELETE USING (true);

-- Políticas para anotacoes
CREATE POLICY IF NOT EXISTS "anotacoes_select_all" ON anotacoes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "anotacoes_insert_admin" ON anotacoes FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anotacoes_update_admin" ON anotacoes FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "anotacoes_delete_admin" ON anotacoes FOR DELETE USING (true);

-- Políticas para atendimentos
CREATE POLICY IF NOT EXISTS "atendimentos_select_all" ON atendimentos FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "atendimentos_insert_admin" ON atendimentos FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "atendimentos_update_admin" ON atendimentos FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "atendimentos_delete_admin" ON atendimentos FOR DELETE USING (true);

-- Políticas para peca_templates
CREATE POLICY IF NOT EXISTS "peca_templates_select_all" ON peca_templates FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "peca_templates_insert_admin" ON peca_templates FOR INSERT WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "peca_templates_update_admin" ON peca_templates FOR UPDATE USING (true);
CREATE POLICY IF NOT EXISTS "peca_templates_delete_admin" ON peca_templates FOR DELETE USING (true);

-- Políticas para calculos_pena
CREATE POLICY IF NOT EXISTS "calculos_pena_select_all" ON calculos_pena FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "calculos_pena_insert_admin" ON calculos_pena FOR INSERT WITH CHECK (true);

COMMENT ON TABLE assistidos IS 'Tabela de assistidos da defensoria pública';
COMMENT ON TABLE processos IS 'Processos judiciais dos assistidos';
COMMENT ON TABLE demandas IS 'Demandas e prazos a serem cumpridos';
COMMENT ON TABLE sessoes_juri IS 'Sessões do Tribunal do Júri';
COMMENT ON TABLE audiencias IS 'Audiências processuais';
COMMENT ON TABLE movimentacoes IS 'Movimentações processuais';
COMMENT ON TABLE documentos IS 'Documentos e peças processuais';
COMMENT ON TABLE anotacoes IS 'Anotações e providências';
COMMENT ON TABLE atendimentos IS 'Atendimentos aos assistidos';
COMMENT ON TABLE peca_templates IS 'Modelos de peças processuais';
COMMENT ON TABLE calculos_pena IS 'Cálculos de pena e prescrição';
