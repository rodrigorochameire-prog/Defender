-- =====================================================
-- DEFESAHUB - SCHEMA COMPLETO DO BANCO DE DADOS
-- Versão: 1.0.0
-- Data: 2026-01-20
-- 
-- Este arquivo contém a estrutura completa do banco de dados
-- com todas as tabelas, índices, enums e constraints necessários.
-- =====================================================

-- =====================================================
-- SEÇÃO 1: ENUMS (Tipos Enumerados)
-- =====================================================

-- Atribuições/Workspaces (divisão principal do sistema)
DO $$ BEGIN
  CREATE TYPE atribuicao AS ENUM (
    'JURI_CAMACARI',
    'VVD_CAMACARI',
    'EXECUCAO_PENAL',
    'SUBSTITUICAO',
    'SUBSTITUICAO_CIVEL',
    'GRUPO_JURI'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Áreas de atuação da Defensoria
DO $$ BEGIN
  CREATE TYPE area AS ENUM (
    'JURI',
    'EXECUCAO_PENAL',
    'VIOLENCIA_DOMESTICA',
    'SUBSTITUICAO',
    'CURADORIA',
    'FAMILIA',
    'CIVEL',
    'FAZENDA_PUBLICA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status prisional do assistido
DO $$ BEGIN
  CREATE TYPE status_prisional AS ENUM (
    'SOLTO',
    'CADEIA_PUBLICA',
    'PENITENCIARIA',
    'COP',
    'HOSPITAL_CUSTODIA',
    'DOMICILIAR',
    'MONITORADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status das demandas/prazos
DO $$ BEGIN
  CREATE TYPE status_demanda AS ENUM (
    '2_ATENDER',
    '4_MONITORAR',
    '5_FILA',
    '7_PROTOCOLADO',
    '7_CIENCIA',
    '7_SEM_ATUACAO',
    'URGENTE',
    'CONCLUIDO',
    'ARQUIVADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Prioridade
DO $$ BEGIN
  CREATE TYPE prioridade AS ENUM (
    'BAIXA',
    'NORMAL',
    'ALTA',
    'URGENTE',
    'REU_PRESO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unidade/Comarca
DO $$ BEGIN
  CREATE TYPE unidade AS ENUM (
    'CAMACARI',
    'CANDEIAS',
    'DIAS_DAVILA',
    'SIMOES_FILHO',
    'LAURO_DE_FREITAS',
    'SALVADOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status do processo
DO $$ BEGIN
  CREATE TYPE status_processo AS ENUM (
    'FLAGRANTE',
    'INQUERITO',
    'INSTRUCAO',
    'RECURSO',
    'EXECUCAO',
    'ARQUIVADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status do caso
DO $$ BEGIN
  CREATE TYPE status_caso AS ENUM (
    'ATIVO',
    'SUSPENSO',
    'ARQUIVADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fase do caso
DO $$ BEGIN
  CREATE TYPE fase_caso AS ENUM (
    'INQUERITO',
    'INSTRUCAO',
    'PLENARIO',
    'RECURSO',
    'EXECUCAO',
    'ARQUIVADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de audiência
DO $$ BEGIN
  CREATE TYPE tipo_audiencia AS ENUM (
    'INSTRUCAO',
    'CUSTODIA',
    'CONCILIACAO',
    'JUSTIFICACAO',
    'ADMONICAO',
    'UNA',
    'PLENARIO_JURI',
    'CONTINUACAO',
    'OUTRA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status de audiência
DO $$ BEGIN
  CREATE TYPE status_audiencia AS ENUM (
    'A_DESIGNAR',
    'DESIGNADA',
    'REALIZADA',
    'AGUARDANDO_ATA',
    'CONCLUIDA',
    'ADIADA',
    'CANCELADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de peça processual
DO $$ BEGIN
  CREATE TYPE tipo_peca_processual AS ENUM (
    'DENUNCIA',
    'QUEIXA_CRIME',
    'PRONUNCIA',
    'IMPRONUNCIA',
    'ABSOLVICAO_SUMARIA',
    'SENTENCA',
    'ACORDAO',
    'LAUDO_PERICIAL',
    'LAUDO_CADAVERICO',
    'LAUDO_PSIQUIATRICO',
    'LAUDO_TOXICOLOGICO',
    'ATA_AUDIENCIA',
    'ATA_INTERROGATORIO',
    'ATA_PLENARIO',
    'DEPOIMENTO',
    'BOLETIM_OCORRENCIA',
    'AUTO_PRISAO',
    'MANDADO',
    'DECISAO_INTERLOCUTORIA',
    'QUESITOS',
    'MEMORIAL',
    'OUTRO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de análise IA
DO $$ BEGIN
  CREATE TYPE tipo_analise_ia AS ENUM (
    'RESUMO_CASO',
    'ANALISE_DENUNCIA',
    'TESES_DEFENSIVAS',
    'ANALISE_PROVAS',
    'RISCO_CONDENACAO',
    'JURISPRUDENCIA',
    'ESTRATEGIA_JURI',
    'PERFIL_JURADOS',
    'COMPARACAO_CASOS',
    'TIMELINE',
    'PONTOS_FRACOS',
    'QUESITACAO',
    'MEMORIAL_DRAFT',
    'OUTRO'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tipo de testemunha
DO $$ BEGIN
  CREATE TYPE tipo_testemunha AS ENUM (
    'DEFESA',
    'ACUSACAO',
    'COMUM',
    'INFORMANTE',
    'PERITO',
    'VITIMA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Status de testemunha
DO $$ BEGIN
  CREATE TYPE status_testemunha AS ENUM (
    'ARROLADA',
    'INTIMADA',
    'OUVIDA',
    'DESISTIDA',
    'NAO_LOCALIZADA',
    'CARTA_PRECATORIA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SEÇÃO 2: TABELAS PRINCIPAIS
-- =====================================================

-- ==========================================
-- WORKSPACES (Universos de dados)
-- ==========================================
CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS workspaces_name_idx ON workspaces(name);
CREATE INDEX IF NOT EXISTS workspaces_active_idx ON workspaces(is_active);

-- Workspace padrão
INSERT INTO workspaces (name, description, is_active)
SELECT 'Default', 'Workspace padrão', TRUE
WHERE NOT EXISTS (SELECT 1 FROM workspaces WHERE name = 'Default');

-- ==========================================
-- USUÁRIOS (DEFENSORES)
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role VARCHAR(20) DEFAULT 'defensor' NOT NULL,
  phone TEXT,
  oab VARCHAR(50),
  comarca VARCHAR(100),
  workspace_id INTEGER REFERENCES workspaces(id),
  email_verified BOOLEAN DEFAULT FALSE NOT NULL,
  approval_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_approval_status_idx ON users(approval_status);
CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON users(deleted_at);
CREATE INDEX IF NOT EXISTS users_comarca_idx ON users(comarca);
CREATE INDEX IF NOT EXISTS users_workspace_id_idx ON users(workspace_id);

-- ==========================================
-- CASOS (Entidade Mestre - Case-Centric)
-- ==========================================
CREATE TABLE IF NOT EXISTS casos (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  codigo VARCHAR(50),
  atribuicao atribuicao NOT NULL DEFAULT 'SUBSTITUICAO',
  workspace_id INTEGER REFERENCES workspaces(id),
  teoria_fatos TEXT,
  teoria_provas TEXT,
  teoria_direito TEXT,
  tags TEXT,
  status VARCHAR(30) DEFAULT 'ativo',
  fase VARCHAR(50),
  prioridade prioridade DEFAULT 'NORMAL',
  defensor_id INTEGER REFERENCES users(id),
  caso_conexo_id INTEGER,
  observacoes TEXT,
  link_drive TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS casos_titulo_idx ON casos(titulo);
CREATE INDEX IF NOT EXISTS casos_atribuicao_idx ON casos(atribuicao);
CREATE INDEX IF NOT EXISTS casos_status_idx ON casos(status);
CREATE INDEX IF NOT EXISTS casos_defensor_id_idx ON casos(defensor_id);
CREATE INDEX IF NOT EXISTS casos_deleted_at_idx ON casos(deleted_at);
CREATE INDEX IF NOT EXISTS casos_workspace_id_idx ON casos(workspace_id);

-- ==========================================
-- ASSISTIDOS (Centro da Aplicação)
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
  workspace_id INTEGER REFERENCES workspaces(id),
  status_prisional status_prisional DEFAULT 'SOLTO',
  local_prisao TEXT,
  unidade_prisional TEXT,
  data_prisao DATE,
  telefone VARCHAR(20),
  telefone_contato VARCHAR(20),
  nome_contato TEXT,
  parentesco_contato VARCHAR(50),
  endereco TEXT,
  photo_url TEXT,
  observacoes TEXT,
  defensor_id INTEGER REFERENCES users(id),
  caso_id INTEGER REFERENCES casos(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS assistidos_nome_idx ON assistidos(nome);
CREATE INDEX IF NOT EXISTS assistidos_cpf_idx ON assistidos(cpf);
CREATE INDEX IF NOT EXISTS assistidos_status_prisional_idx ON assistidos(status_prisional);
CREATE INDEX IF NOT EXISTS assistidos_defensor_id_idx ON assistidos(defensor_id);
CREATE INDEX IF NOT EXISTS assistidos_deleted_at_idx ON assistidos(deleted_at);
CREATE INDEX IF NOT EXISTS assistidos_caso_id_idx ON assistidos(caso_id);
CREATE INDEX IF NOT EXISTS assistidos_workspace_id_idx ON assistidos(workspace_id);

-- ==========================================
-- PROCESSOS
-- ==========================================
CREATE TABLE IF NOT EXISTS processos (
  id SERIAL PRIMARY KEY,
  assistido_id INTEGER NOT NULL REFERENCES assistidos(id) ON DELETE CASCADE,
  atribuicao atribuicao NOT NULL DEFAULT 'SUBSTITUICAO',
  workspace_id INTEGER REFERENCES workspaces(id),
  numero_autos TEXT NOT NULL,
  numero_antigo TEXT,
  comarca VARCHAR(100),
  vara VARCHAR(100),
  area area NOT NULL,
  classe_processual VARCHAR(100),
  assunto TEXT,
  valor_causa INTEGER,
  parte_contraria TEXT,
  advogado_contrario TEXT,
  fase VARCHAR(50),
  situacao VARCHAR(50) DEFAULT 'ativo',
  is_juri BOOLEAN DEFAULT FALSE,
  data_sessao_juri TIMESTAMP WITH TIME ZONE,
  resultado_juri TEXT,
  defensor_id INTEGER REFERENCES users(id),
  observacoes TEXT,
  link_drive TEXT,
  drive_folder_id TEXT,
  caso_id INTEGER REFERENCES casos(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS processos_assistido_id_idx ON processos(assistido_id);
CREATE INDEX IF NOT EXISTS processos_numero_autos_idx ON processos(numero_autos);
CREATE INDEX IF NOT EXISTS processos_comarca_idx ON processos(comarca);
CREATE INDEX IF NOT EXISTS processos_area_idx ON processos(area);
CREATE INDEX IF NOT EXISTS processos_is_juri_idx ON processos(is_juri);
CREATE INDEX IF NOT EXISTS processos_defensor_id_idx ON processos(defensor_id);
CREATE INDEX IF NOT EXISTS processos_situacao_idx ON processos(situacao);
CREATE INDEX IF NOT EXISTS processos_deleted_at_idx ON processos(deleted_at);
CREATE INDEX IF NOT EXISTS processos_caso_id_idx ON processos(caso_id);
CREATE INDEX IF NOT EXISTS processos_workspace_id_idx ON processos(workspace_id);

-- ==========================================
-- DEMANDAS/PRAZOS
-- ==========================================
CREATE TABLE IF NOT EXISTS demandas (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER NOT NULL REFERENCES assistidos(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id),
  ato TEXT NOT NULL,
  tipo_ato VARCHAR(50),
  prazo DATE,
  data_entrada DATE,
  data_intimacao DATE,
  data_conclusao TIMESTAMP WITH TIME ZONE,
  status status_demanda DEFAULT '5_FILA',
  prioridade prioridade DEFAULT 'NORMAL',
  providencias TEXT,
  defensor_id INTEGER REFERENCES users(id),
  reu_preso BOOLEAN DEFAULT FALSE,
  google_calendar_event_id TEXT,
  caso_id INTEGER REFERENCES casos(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS demandas_processo_id_idx ON demandas(processo_id);
CREATE INDEX IF NOT EXISTS demandas_assistido_id_idx ON demandas(assistido_id);
CREATE INDEX IF NOT EXISTS demandas_prazo_idx ON demandas(prazo);
CREATE INDEX IF NOT EXISTS demandas_status_idx ON demandas(status);
CREATE INDEX IF NOT EXISTS demandas_prioridade_idx ON demandas(prioridade);
CREATE INDEX IF NOT EXISTS demandas_defensor_id_idx ON demandas(defensor_id);
CREATE INDEX IF NOT EXISTS demandas_reu_preso_idx ON demandas(reu_preso);
CREATE INDEX IF NOT EXISTS demandas_deleted_at_idx ON demandas(deleted_at);
CREATE INDEX IF NOT EXISTS demandas_caso_id_idx ON demandas(caso_id);
CREATE INDEX IF NOT EXISTS demandas_workspace_id_idx ON demandas(workspace_id);

-- ==========================================
-- SESSÕES DO JÚRI
-- ==========================================
CREATE TABLE IF NOT EXISTS sessoes_juri (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id),
  data_sessao TIMESTAMP WITH TIME ZONE NOT NULL,
  horario VARCHAR(10),
  sala VARCHAR(50),
  defensor_id INTEGER REFERENCES users(id),
  defensor_nome TEXT,
  assistido_nome TEXT,
  status VARCHAR(30) DEFAULT 'agendada',
  resultado TEXT,
  pena_aplicada TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS sessoes_juri_processo_id_idx ON sessoes_juri(processo_id);
CREATE INDEX IF NOT EXISTS sessoes_juri_data_sessao_idx ON sessoes_juri(data_sessao);
CREATE INDEX IF NOT EXISTS sessoes_juri_defensor_id_idx ON sessoes_juri(defensor_id);
CREATE INDEX IF NOT EXISTS sessoes_juri_status_idx ON sessoes_juri(status);
CREATE INDEX IF NOT EXISTS sessoes_juri_workspace_id_idx ON sessoes_juri(workspace_id);

-- ==========================================
-- AUDIÊNCIAS
-- ==========================================
CREATE TABLE IF NOT EXISTS audiencias (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id),
  caso_id INTEGER REFERENCES casos(id),
  assistido_id INTEGER REFERENCES assistidos(id),
  data_audiencia TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  local TEXT,
  titulo TEXT,
  descricao TEXT,
  sala VARCHAR(50),
  horario VARCHAR(10),
  defensor_id INTEGER REFERENCES users(id),
  juiz TEXT,
  promotor TEXT,
  status VARCHAR(30) DEFAULT 'agendada',
  resultado TEXT,
  observacoes TEXT,
  anotacoes TEXT,
  anotacoes_versao INTEGER DEFAULT 1,
  resumo_defesa TEXT,
  google_calendar_event_id TEXT,
  gerar_prazo_apos BOOLEAN DEFAULT FALSE,
  prazo_gerado_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS audiencias_processo_id_idx ON audiencias(processo_id);
CREATE INDEX IF NOT EXISTS audiencias_data_idx ON audiencias(data_audiencia);
CREATE INDEX IF NOT EXISTS audiencias_defensor_id_idx ON audiencias(defensor_id);
CREATE INDEX IF NOT EXISTS audiencias_status_idx ON audiencias(status);
CREATE INDEX IF NOT EXISTS audiencias_tipo_idx ON audiencias(tipo);
CREATE INDEX IF NOT EXISTS audiencias_caso_id_idx ON audiencias(caso_id);
CREATE INDEX IF NOT EXISTS audiencias_assistido_id_idx ON audiencias(assistido_id);
CREATE INDEX IF NOT EXISTS audiencias_google_event_idx ON audiencias(google_calendar_event_id);
CREATE INDEX IF NOT EXISTS audiencias_workspace_id_idx ON audiencias(workspace_id);

-- ==========================================
-- MOVIMENTAÇÕES PROCESSUAIS
-- ==========================================
CREATE TABLE IF NOT EXISTS movimentacoes (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  data_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL,
  descricao TEXT NOT NULL,
  tipo VARCHAR(50),
  origem VARCHAR(20) DEFAULT 'manual',
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS movimentacoes_processo_id_idx ON movimentacoes(processo_id);
CREATE INDEX IF NOT EXISTS movimentacoes_data_idx ON movimentacoes(data_movimentacao);
CREATE INDEX IF NOT EXISTS movimentacoes_tipo_idx ON movimentacoes(tipo);

-- ==========================================
-- DOCUMENTOS
-- ==========================================
CREATE TABLE IF NOT EXISTS documentos (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE,
  demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL,
  caso_id INTEGER REFERENCES casos(id) ON DELETE SET NULL,
  workspace_id INTEGER REFERENCES workspaces(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria VARCHAR(50) NOT NULL,
  tipo_peca VARCHAR(100),
  file_url TEXT NOT NULL,
  file_key TEXT,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size INTEGER,
  is_template BOOLEAN DEFAULT FALSE,
  uploaded_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS documentos_processo_id_idx ON documentos(processo_id);
CREATE INDEX IF NOT EXISTS documentos_assistido_id_idx ON documentos(assistido_id);
CREATE INDEX IF NOT EXISTS documentos_demanda_id_idx ON documentos(demanda_id);
CREATE INDEX IF NOT EXISTS documentos_caso_id_idx ON documentos(caso_id);
CREATE INDEX IF NOT EXISTS documentos_categoria_idx ON documentos(categoria);
CREATE INDEX IF NOT EXISTS documentos_is_template_idx ON documentos(is_template);
CREATE INDEX IF NOT EXISTS documentos_workspace_id_idx ON documentos(workspace_id);

-- ==========================================
-- ANOTAÇÕES
-- ==========================================
CREATE TABLE IF NOT EXISTS anotacoes (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE,
  demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL,
  caso_id INTEGER REFERENCES casos(id) ON DELETE SET NULL,
  conteudo TEXT NOT NULL,
  tipo VARCHAR(30) DEFAULT 'nota',
  importante BOOLEAN DEFAULT FALSE,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS anotacoes_processo_id_idx ON anotacoes(processo_id);
CREATE INDEX IF NOT EXISTS anotacoes_assistido_id_idx ON anotacoes(assistido_id);
CREATE INDEX IF NOT EXISTS anotacoes_demanda_id_idx ON anotacoes(demanda_id);
CREATE INDEX IF NOT EXISTS anotacoes_caso_id_idx ON anotacoes(caso_id);
CREATE INDEX IF NOT EXISTS anotacoes_tipo_idx ON anotacoes(tipo);
CREATE INDEX IF NOT EXISTS anotacoes_importante_idx ON anotacoes(importante);

-- ==========================================
-- EVENTOS DO CALENDÁRIO
-- ==========================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  event_type VARCHAR(100) NOT NULL,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE,
  demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL,
  workspace_id INTEGER REFERENCES workspaces(id),
  is_all_day BOOLEAN DEFAULT TRUE NOT NULL,
  color VARCHAR(20),
  location VARCHAR(200),
  notes TEXT,
  reminder_minutes INTEGER,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'scheduled',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_type VARCHAR(20),
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  recurrence_count INTEGER,
  recurrence_days VARCHAR(50),
  parent_event_id INTEGER,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calendar_events_event_date_idx ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS calendar_events_processo_id_idx ON calendar_events(processo_id);
CREATE INDEX IF NOT EXISTS calendar_events_assistido_id_idx ON calendar_events(assistido_id);
CREATE INDEX IF NOT EXISTS calendar_events_event_type_idx ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS calendar_events_status_idx ON calendar_events(status);
CREATE INDEX IF NOT EXISTS calendar_events_deleted_at_idx ON calendar_events(deleted_at);
CREATE INDEX IF NOT EXISTS calendar_events_workspace_id_idx ON calendar_events(workspace_id);

-- ==========================================
-- NOTIFICAÇÕES
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  demanda_id INTEGER REFERENCES demandas(id) ON DELETE SET NULL,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, is_read);

-- ==========================================
-- ATENDIMENTOS
-- ==========================================
CREATE TABLE IF NOT EXISTS atendimentos (
  id SERIAL PRIMARY KEY,
  assistido_id INTEGER NOT NULL REFERENCES assistidos(id) ON DELETE CASCADE,
  data_atendimento TIMESTAMP WITH TIME ZONE NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  local TEXT,
  assunto TEXT,
  resumo TEXT,
  acompanhantes TEXT,
  status VARCHAR(20) DEFAULT 'agendado',
  atendido_por_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS atendimentos_assistido_id_idx ON atendimentos(assistido_id);
CREATE INDEX IF NOT EXISTS atendimentos_data_idx ON atendimentos(data_atendimento);
CREATE INDEX IF NOT EXISTS atendimentos_tipo_idx ON atendimentos(tipo);
CREATE INDEX IF NOT EXISTS atendimentos_status_idx ON atendimentos(status);
CREATE INDEX IF NOT EXISTS atendimentos_atendido_por_idx ON atendimentos(atendido_por_id);

-- ==========================================
-- JURADOS
-- ==========================================
CREATE TABLE IF NOT EXISTS jurados (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  profissao VARCHAR(100),
  escolaridade VARCHAR(50),
  idade INTEGER,
  bairro VARCHAR(100),
  genero VARCHAR(20),
  classe_social VARCHAR(30),
  perfil_psicologico TEXT,
  tendencia_voto INTEGER,
  status VARCHAR(30),
  sessao_juri_id INTEGER REFERENCES sessoes_juri(id) ON DELETE SET NULL,
  total_sessoes INTEGER DEFAULT 0,
  votos_condenacao INTEGER DEFAULT 0,
  votos_absolvicao INTEGER DEFAULT 0,
  votos_desclassificacao INTEGER DEFAULT 0,
  perfil_tendencia VARCHAR(30),
  observacoes TEXT,
  historico_notas TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS jurados_nome_idx ON jurados(nome);
CREATE INDEX IF NOT EXISTS jurados_perfil_idx ON jurados(perfil_tendencia);
CREATE INDEX IF NOT EXISTS jurados_sessao_juri_id_idx ON jurados(sessao_juri_id);
CREATE INDEX IF NOT EXISTS jurados_tendencia_voto_idx ON jurados(tendencia_voto);
CREATE INDEX IF NOT EXISTS jurados_status_idx ON jurados(status);
CREATE INDEX IF NOT EXISTS jurados_ativo_idx ON jurados(ativo);

-- ==========================================
-- CONSELHO DO JÚRI
-- ==========================================
CREATE TABLE IF NOT EXISTS conselho_juri (
  id SERIAL PRIMARY KEY,
  sessao_id INTEGER NOT NULL REFERENCES sessoes_juri(id) ON DELETE CASCADE,
  jurado_id INTEGER NOT NULL REFERENCES jurados(id) ON DELETE CASCADE,
  posicao INTEGER,
  voto VARCHAR(30),
  anotacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS conselho_juri_sessao_idx ON conselho_juri(sessao_id);
CREATE INDEX IF NOT EXISTS conselho_juri_jurado_idx ON conselho_juri(jurado_id);

-- ==========================================
-- WHATSAPP CONFIG
-- ==========================================
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT,
  phone_number_id TEXT,
  business_account_id TEXT,
  webhook_verify_token TEXT,
  display_phone_number TEXT,
  verified_name TEXT,
  quality_rating VARCHAR(20),
  is_active BOOLEAN DEFAULT FALSE NOT NULL,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  auto_notify_prazo BOOLEAN DEFAULT FALSE NOT NULL,
  auto_notify_audiencia BOOLEAN DEFAULT FALSE NOT NULL,
  auto_notify_juri BOOLEAN DEFAULT FALSE NOT NULL,
  auto_notify_movimentacao BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS whatsapp_config_admin_id_idx ON whatsapp_config(admin_id);
CREATE INDEX IF NOT EXISTS whatsapp_config_is_active_idx ON whatsapp_config(is_active);

-- ==========================================
-- WHATSAPP MESSAGES
-- ==========================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  config_id INTEGER NOT NULL REFERENCES whatsapp_config(id) ON DELETE CASCADE,
  to_phone TEXT NOT NULL,
  to_name TEXT,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  message_type VARCHAR(50) NOT NULL,
  template_name TEXT,
  content TEXT,
  message_id TEXT,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  error_message TEXT,
  context VARCHAR(50),
  sent_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_config_id_idx ON whatsapp_messages(config_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_assistido_id_idx ON whatsapp_messages(assistido_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_status_idx ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS whatsapp_messages_context_idx ON whatsapp_messages(context);
CREATE INDEX IF NOT EXISTS whatsapp_messages_created_at_idx ON whatsapp_messages(created_at);

-- ==========================================
-- TEMPLATES DE PEÇAS
-- ==========================================
CREATE TABLE IF NOT EXISTS peca_templates (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  tipo_peca VARCHAR(100) NOT NULL,
  area area,
  conteudo TEXT,
  file_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS peca_templates_tipo_peca_idx ON peca_templates(tipo_peca);
CREATE INDEX IF NOT EXISTS peca_templates_area_idx ON peca_templates(area);
CREATE INDEX IF NOT EXISTS peca_templates_is_public_idx ON peca_templates(is_public);

-- ==========================================
-- BANCO DE PEÇAS
-- ==========================================
CREATE TABLE IF NOT EXISTS banco_pecas (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  conteudo_texto TEXT,
  arquivo_url TEXT,
  arquivo_key TEXT,
  tipo_peca VARCHAR(100) NOT NULL,
  area area,
  tags TEXT,
  sucesso BOOLEAN,
  resultado_descricao TEXT,
  processo_referencia TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS banco_pecas_tipo_peca_idx ON banco_pecas(tipo_peca);
CREATE INDEX IF NOT EXISTS banco_pecas_area_idx ON banco_pecas(area);
CREATE INDEX IF NOT EXISTS banco_pecas_sucesso_idx ON banco_pecas(sucesso);
CREATE INDEX IF NOT EXISTS banco_pecas_is_public_idx ON banco_pecas(is_public);

-- ==========================================
-- CÁLCULOS DE PENA
-- ==========================================
CREATE TABLE IF NOT EXISTS calculos_pena (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE,
  tipo_calculo VARCHAR(30) NOT NULL,
  pena_total INTEGER,
  data_inicio DATE,
  regime VARCHAR(20),
  data_resultado DATE,
  observacoes TEXT,
  parametros TEXT,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS calculos_pena_processo_id_idx ON calculos_pena(processo_id);
CREATE INDEX IF NOT EXISTS calculos_pena_assistido_id_idx ON calculos_pena(assistido_id);
CREATE INDEX IF NOT EXISTS calculos_pena_tipo_idx ON calculos_pena(tipo_calculo);

-- ==========================================
-- MEDIDAS PROTETIVAS (VVD)
-- ==========================================
CREATE TABLE IF NOT EXISTS medidas_protetivas (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  numero_medida VARCHAR(50),
  tipo_medida VARCHAR(100) NOT NULL,
  data_decisao DATE,
  prazo_dias INTEGER,
  data_vencimento DATE,
  distancia_metros INTEGER,
  nome_vitima TEXT,
  telefone_vitima VARCHAR(20),
  status VARCHAR(30) DEFAULT 'ativa',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS medidas_protetivas_processo_id_idx ON medidas_protetivas(processo_id);
CREATE INDEX IF NOT EXISTS medidas_protetivas_status_idx ON medidas_protetivas(status);
CREATE INDEX IF NOT EXISTS medidas_protetivas_data_vencimento_idx ON medidas_protetivas(data_vencimento);

-- ==========================================
-- CÁLCULOS SEEU (Execução Penal)
-- ==========================================
CREATE TABLE IF NOT EXISTS calculos_seeu (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  data_base DATE NOT NULL,
  pena_total INTEGER NOT NULL,
  regime_inicial VARCHAR(20),
  fracao_progressao VARCHAR(20),
  fracao_livramento VARCHAR(20),
  data_progressao DATE,
  data_livramento DATE,
  data_termino DATE,
  data_saida DATE,
  dias_remidos INTEGER DEFAULT 0,
  dias_trabalho INTEGER DEFAULT 0,
  dias_estudo INTEGER DEFAULT 0,
  is_hediondo BOOLEAN DEFAULT FALSE,
  is_primario BOOLEAN DEFAULT TRUE,
  status_progressao VARCHAR(30),
  status_livramento VARCHAR(30),
  observacoes TEXT,
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS calculos_seeu_processo_id_idx ON calculos_seeu(processo_id);
CREATE INDEX IF NOT EXISTS calculos_seeu_assistido_id_idx ON calculos_seeu(assistido_id);
CREATE INDEX IF NOT EXISTS calculos_seeu_data_progressao_idx ON calculos_seeu(data_progressao);
CREATE INDEX IF NOT EXISTS calculos_seeu_data_livramento_idx ON calculos_seeu(data_livramento);

-- =====================================================
-- SEÇÃO 3: TABELAS CASE-CENTRIC
-- =====================================================

-- ==========================================
-- PERSONAS DO CASO
-- ==========================================
CREATE TABLE IF NOT EXISTS case_personas (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  jurado_id INTEGER REFERENCES jurados(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  status VARCHAR(30),
  perfil JSONB,
  contatos JSONB,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS case_personas_caso_id_idx ON case_personas(caso_id);
CREATE INDEX IF NOT EXISTS case_personas_tipo_idx ON case_personas(tipo);
CREATE INDEX IF NOT EXISTS case_personas_status_idx ON case_personas(status);
CREATE INDEX IF NOT EXISTS case_personas_assistido_id_idx ON case_personas(assistido_id);
CREATE INDEX IF NOT EXISTS case_personas_jurado_id_idx ON case_personas(jurado_id);

-- ==========================================
-- FATOS DO CASO
-- ==========================================
CREATE TABLE IF NOT EXISTS case_facts (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo VARCHAR(30),
  tags JSONB,
  status VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS case_facts_caso_id_idx ON case_facts(caso_id);
CREATE INDEX IF NOT EXISTS case_facts_tipo_idx ON case_facts(tipo);
CREATE INDEX IF NOT EXISTS case_facts_status_idx ON case_facts(status);

-- ==========================================
-- EVIDÊNCIAS DOS FATOS
-- ==========================================
CREATE TABLE IF NOT EXISTS fact_evidence (
  id SERIAL PRIMARY KEY,
  fact_id INTEGER NOT NULL REFERENCES case_facts(id) ON DELETE CASCADE,
  documento_id INTEGER REFERENCES documentos(id) ON DELETE SET NULL,
  source_type VARCHAR(30),
  source_id TEXT,
  trecho TEXT,
  contradicao BOOLEAN DEFAULT FALSE,
  confianca INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS fact_evidence_fact_id_idx ON fact_evidence(fact_id);
CREATE INDEX IF NOT EXISTS fact_evidence_documento_id_idx ON fact_evidence(documento_id);
CREATE INDEX IF NOT EXISTS fact_evidence_contradicao_idx ON fact_evidence(contradicao);

-- ==========================================
-- ROTEIRO DO JÚRI
-- ==========================================
CREATE TABLE IF NOT EXISTS juri_script_items (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  sessao_juri_id INTEGER REFERENCES sessoes_juri(id) ON DELETE SET NULL,
  persona_id INTEGER REFERENCES case_personas(id) ON DELETE SET NULL,
  fact_id INTEGER REFERENCES case_facts(id) ON DELETE SET NULL,
  pergunta TEXT,
  fase VARCHAR(40),
  ordem INTEGER,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS juri_script_items_caso_id_idx ON juri_script_items(caso_id);
CREATE INDEX IF NOT EXISTS juri_script_items_sessao_id_idx ON juri_script_items(sessao_juri_id);
CREATE INDEX IF NOT EXISTS juri_script_items_persona_id_idx ON juri_script_items(persona_id);
CREATE INDEX IF NOT EXISTS juri_script_items_fact_id_idx ON juri_script_items(fact_id);
CREATE INDEX IF NOT EXISTS juri_script_items_fase_idx ON juri_script_items(fase);
CREATE INDEX IF NOT EXISTS juri_script_items_ordem_idx ON juri_script_items(ordem);

-- ==========================================
-- TESES DEFENSIVAS
-- ==========================================
CREATE TABLE IF NOT EXISTS teses_defensivas (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo VARCHAR(30),
  probabilidade_aceitacao INTEGER,
  argumentos_chave JSONB,
  jurisprudencia_relacionada JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS teses_defensivas_caso_id_idx ON teses_defensivas(caso_id);
CREATE INDEX IF NOT EXISTS teses_defensivas_tipo_idx ON teses_defensivas(tipo);
CREATE INDEX IF NOT EXISTS teses_defensivas_probabilidade_idx ON teses_defensivas(probabilidade_aceitacao);

-- ==========================================
-- ANÁLISE DE DEPOIMENTOS
-- ==========================================
CREATE TABLE IF NOT EXISTS depoimentos_analise (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  persona_id INTEGER REFERENCES case_personas(id) ON DELETE SET NULL,
  testemunha_nome TEXT,
  versao_delegacia TEXT,
  versao_juizo TEXT,
  contradicoes_identificadas TEXT,
  pontos_fracos TEXT,
  pontos_fortes TEXT,
  estrategia_inquiricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS depoimentos_analise_caso_id_idx ON depoimentos_analise(caso_id);
CREATE INDEX IF NOT EXISTS depoimentos_analise_persona_id_idx ON depoimentos_analise(persona_id);
CREATE INDEX IF NOT EXISTS depoimentos_analise_testemunha_idx ON depoimentos_analise(testemunha_nome);

-- ==========================================
-- ROTEIRO DE PLENÁRIO
-- ==========================================
CREATE TABLE IF NOT EXISTS roteiro_plenario (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  ordem INTEGER,
  fase VARCHAR(40),
  conteudo JSONB,
  tempo_estimado INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS roteiro_plenario_caso_id_idx ON roteiro_plenario(caso_id);
CREATE INDEX IF NOT EXISTS roteiro_plenario_fase_idx ON roteiro_plenario(fase);
CREATE INDEX IF NOT EXISTS roteiro_plenario_ordem_idx ON roteiro_plenario(ordem);

-- ==========================================
-- TAGS DE CASOS
-- ==========================================
CREATE TABLE IF NOT EXISTS caso_tags (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  cor VARCHAR(20) DEFAULT 'slate',
  uso_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS caso_tags_nome_idx ON caso_tags(nome);
CREATE INDEX IF NOT EXISTS caso_tags_uso_idx ON caso_tags(uso_count);

-- ==========================================
-- CONEXÕES ENTRE CASOS
-- ==========================================
CREATE TABLE IF NOT EXISTS casos_conexos (
  id SERIAL PRIMARY KEY,
  caso_origem_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  caso_destino_id INTEGER NOT NULL REFERENCES casos(id) ON DELETE CASCADE,
  tipo_conexao VARCHAR(50),
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS casos_conexos_origem_idx ON casos_conexos(caso_origem_id);
CREATE INDEX IF NOT EXISTS casos_conexos_destino_idx ON casos_conexos(caso_destino_id);

-- ==========================================
-- HISTÓRICO DE ANOTAÇÕES DE AUDIÊNCIA
-- ==========================================
CREATE TABLE IF NOT EXISTS audiencias_historico (
  id SERIAL PRIMARY KEY,
  audiencia_id INTEGER NOT NULL REFERENCES audiencias(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL,
  anotacoes TEXT NOT NULL,
  editado_por_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS audiencias_hist_audiencia_idx ON audiencias_historico(audiencia_id);
CREATE INDEX IF NOT EXISTS audiencias_hist_versao_idx ON audiencias_historico(versao);

-- =====================================================
-- SEÇÃO 4: GOOGLE DRIVE SYNC
-- =====================================================

-- ==========================================
-- PASTAS SINCRONIZADAS
-- ==========================================
CREATE TABLE IF NOT EXISTS drive_sync_folders (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  drive_folder_id VARCHAR(100) NOT NULL UNIQUE,
  drive_folder_url TEXT,
  description TEXT,
  sync_direction VARCHAR(20) DEFAULT 'bidirectional',
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_token TEXT,
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS drive_sync_folders_drive_folder_id_idx ON drive_sync_folders(drive_folder_id);
CREATE INDEX IF NOT EXISTS drive_sync_folders_is_active_idx ON drive_sync_folders(is_active);

-- ==========================================
-- ARQUIVOS DO DRIVE
-- ==========================================
CREATE TABLE IF NOT EXISTS drive_files (
  id SERIAL PRIMARY KEY,
  drive_file_id VARCHAR(100) NOT NULL UNIQUE,
  drive_folder_id VARCHAR(100) NOT NULL,
  name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100),
  file_size INTEGER,
  description TEXT,
  web_view_link TEXT,
  web_content_link TEXT,
  thumbnail_link TEXT,
  icon_link TEXT,
  sync_status VARCHAR(20) DEFAULT 'synced',
  last_modified_time TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  local_checksum VARCHAR(64),
  drive_checksum VARCHAR(64),
  processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  documento_id INTEGER REFERENCES documentos(id) ON DELETE SET NULL,
  local_file_url TEXT,
  local_file_key TEXT,
  version INTEGER DEFAULT 1,
  is_folder BOOLEAN DEFAULT FALSE,
  parent_file_id INTEGER,
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS drive_files_drive_folder_id_idx ON drive_files(drive_folder_id);
CREATE INDEX IF NOT EXISTS drive_files_drive_file_id_idx ON drive_files(drive_file_id);
CREATE INDEX IF NOT EXISTS drive_files_processo_id_idx ON drive_files(processo_id);
CREATE INDEX IF NOT EXISTS drive_files_assistido_id_idx ON drive_files(assistido_id);
CREATE INDEX IF NOT EXISTS drive_files_sync_status_idx ON drive_files(sync_status);
CREATE INDEX IF NOT EXISTS drive_files_is_folder_idx ON drive_files(is_folder);
CREATE INDEX IF NOT EXISTS drive_files_parent_file_id_idx ON drive_files(parent_file_id);

-- ==========================================
-- LOGS DE SINCRONIZAÇÃO
-- ==========================================
CREATE TABLE IF NOT EXISTS drive_sync_logs (
  id SERIAL PRIMARY KEY,
  drive_file_id VARCHAR(100),
  action VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'success',
  details TEXT,
  error_message TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS drive_sync_logs_drive_file_id_idx ON drive_sync_logs(drive_file_id);
CREATE INDEX IF NOT EXISTS drive_sync_logs_created_at_idx ON drive_sync_logs(created_at);
CREATE INDEX IF NOT EXISTS drive_sync_logs_action_idx ON drive_sync_logs(action);

-- ==========================================
-- WEBHOOKS DO DRIVE
-- ==========================================
CREATE TABLE IF NOT EXISTS drive_webhooks (
  id SERIAL PRIMARY KEY,
  channel_id VARCHAR(100) NOT NULL UNIQUE,
  resource_id VARCHAR(100),
  folder_id VARCHAR(100) NOT NULL,
  expiration TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS drive_webhooks_channel_id_idx ON drive_webhooks(channel_id);
CREATE INDEX IF NOT EXISTS drive_webhooks_folder_id_idx ON drive_webhooks(folder_id);
CREATE INDEX IF NOT EXISTS drive_webhooks_is_active_idx ON drive_webhooks(is_active);

-- =====================================================
-- SEÇÃO 5: PEÇAS PROCESSUAIS E IA
-- =====================================================

-- ==========================================
-- PEÇAS PROCESSUAIS
-- ==========================================
CREATE TABLE IF NOT EXISTS pecas_processuais (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  caso_id INTEGER REFERENCES casos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tipo_peca tipo_peca_processual NOT NULL,
  numero_paginas INTEGER,
  data_documento DATE,
  drive_file_id VARCHAR(100),
  arquivo_url TEXT,
  arquivo_key TEXT,
  mime_type VARCHAR(100),
  file_size INTEGER,
  conteudo_texto TEXT,
  resumo_ia TEXT,
  pontos_criticos TEXT,
  metadados TEXT,
  is_destaque BOOLEAN DEFAULT FALSE,
  ordem_exibicao INTEGER DEFAULT 0,
  tags TEXT,
  observacoes TEXT,
  uploaded_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS pecas_processuais_processo_id_idx ON pecas_processuais(processo_id);
CREATE INDEX IF NOT EXISTS pecas_processuais_assistido_id_idx ON pecas_processuais(assistido_id);
CREATE INDEX IF NOT EXISTS pecas_processuais_caso_id_idx ON pecas_processuais(caso_id);
CREATE INDEX IF NOT EXISTS pecas_processuais_tipo_peca_idx ON pecas_processuais(tipo_peca);
CREATE INDEX IF NOT EXISTS pecas_processuais_is_destaque_idx ON pecas_processuais(is_destaque);
CREATE INDEX IF NOT EXISTS pecas_processuais_drive_file_id_idx ON pecas_processuais(drive_file_id);

-- ==========================================
-- ANÁLISES DE IA
-- ==========================================
CREATE TABLE IF NOT EXISTS analises_ia (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  peca_id INTEGER REFERENCES pecas_processuais(id) ON DELETE SET NULL,
  tipo_analise tipo_analise_ia NOT NULL,
  titulo TEXT NOT NULL,
  prompt_utilizado TEXT,
  conteudo TEXT NOT NULL,
  dados_estruturados TEXT,
  score_confianca INTEGER,
  modelo_ia VARCHAR(50) DEFAULT 'gemini-pro',
  tokens_utilizados INTEGER,
  feedback_positivo BOOLEAN,
  feedback_comentario TEXT,
  is_arquivado BOOLEAN DEFAULT FALSE,
  is_favorito BOOLEAN DEFAULT FALSE,
  criado_por_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS analises_ia_processo_id_idx ON analises_ia(processo_id);
CREATE INDEX IF NOT EXISTS analises_ia_assistido_id_idx ON analises_ia(assistido_id);
CREATE INDEX IF NOT EXISTS analises_ia_caso_id_idx ON analises_ia(caso_id);
CREATE INDEX IF NOT EXISTS analises_ia_peca_id_idx ON analises_ia(peca_id);
CREATE INDEX IF NOT EXISTS analises_ia_tipo_analise_idx ON analises_ia(tipo_analise);
CREATE INDEX IF NOT EXISTS analises_ia_is_favorito_idx ON analises_ia(is_favorito);

-- ==========================================
-- TESTEMUNHAS
-- ==========================================
CREATE TABLE IF NOT EXISTS testemunhas (
  id SERIAL PRIMARY KEY,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  caso_id INTEGER REFERENCES casos(id) ON DELETE SET NULL,
  audiencia_id INTEGER REFERENCES audiencias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  tipo tipo_testemunha NOT NULL,
  status status_testemunha DEFAULT 'ARROLADA',
  telefone VARCHAR(20),
  endereco TEXT,
  resumo_depoimento TEXT,
  pontos_favoraveis TEXT,
  pontos_desfavoraveis TEXT,
  perguntas_sugeridas TEXT,
  ordem_inquiricao INTEGER,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS testemunhas_processo_id_idx ON testemunhas(processo_id);
CREATE INDEX IF NOT EXISTS testemunhas_caso_id_idx ON testemunhas(caso_id);
CREATE INDEX IF NOT EXISTS testemunhas_audiencia_id_idx ON testemunhas(audiencia_id);
CREATE INDEX IF NOT EXISTS testemunhas_tipo_idx ON testemunhas(tipo);
CREATE INDEX IF NOT EXISTS testemunhas_status_idx ON testemunhas(status);

-- =====================================================
-- SEÇÃO 6: CONFIRMAÇÃO
-- =====================================================

SELECT 'Schema completo criado com sucesso!' AS status;
