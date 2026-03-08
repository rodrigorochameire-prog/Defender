-- Migration: Recursos e Execução (Pós-Júri)
-- Data: 2026-03-07
-- Descrição: Tabelas para acompanhamento de apelações e configuração de handoff

-- ==========================================
-- ENUMS
-- ==========================================

DO $$ BEGIN
  CREATE TYPE status_apelacao AS ENUM (
    'interposta',
    'admitida',
    'em_julgamento',
    'julgada',
    'transitada'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE resultado_recurso AS ENUM (
    'provido',
    'parcialmente_provido',
    'improvido',
    'nao_conhecido'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- TABELA: recursos_juri
-- ==========================================

CREATE TABLE IF NOT EXISTS recursos_juri (
  id SERIAL PRIMARY KEY,
  sessao_juri_id INTEGER NOT NULL REFERENCES sessoes_juri(id) ON DELETE CASCADE,
  caso_id INTEGER REFERENCES casos(id) ON DELETE SET NULL,
  processo_id INTEGER NOT NULL REFERENCES processos(id) ON DELETE CASCADE,

  -- Dados do réu (desnormalizado)
  reu_nome TEXT,

  -- Status
  status status_apelacao NOT NULL DEFAULT 'interposta',
  data_interposicao DATE,
  data_admissao DATE,
  data_julgamento DATE,

  -- TJBA
  turma_tjba TEXT,
  camara_tjba TEXT,
  relator TEXT,

  -- Resultado apelação
  resultado_apelacao resultado_recurso,

  -- Recurso Especial (STJ)
  houve_resp BOOLEAN DEFAULT FALSE,
  resultado_resp resultado_recurso,

  -- Recurso Extraordinário (STF)
  houve_re BOOLEAN DEFAULT FALSE,
  resultado_re resultado_recurso,

  -- Observações
  observacoes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS recursos_juri_sessao_idx ON recursos_juri(sessao_juri_id);
CREATE INDEX IF NOT EXISTS recursos_juri_processo_idx ON recursos_juri(processo_id);
CREATE INDEX IF NOT EXISTS recursos_juri_status_idx ON recursos_juri(status);

-- ==========================================
-- TABELA: handoff_config
-- ==========================================

CREATE TABLE IF NOT EXISTS handoff_config (
  id SERIAL PRIMARY KEY,
  comarca TEXT NOT NULL UNIQUE,

  -- Defensor do 2º Grau
  defensor_2grau_info TEXT,

  -- Defensor da Execução Penal
  defensor_ep_info TEXT,

  -- Núcleo de EP
  nucleo_ep_endereco TEXT,
  nucleo_ep_telefone TEXT,
  nucleo_ep_horario TEXT,

  -- Mensagem personalizada
  mensagem_personalizada TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS handoff_config_comarca_idx ON handoff_config(comarca);

-- ==========================================
-- SEED: Configuração padrão para Camaçari
-- ==========================================

INSERT INTO handoff_config (comarca, defensor_2grau_info, defensor_ep_info, nucleo_ep_endereco, nucleo_ep_telefone, nucleo_ep_horario)
VALUES (
  'Camaçari',
  'Núcleo de Atuação Criminal da 2ª Instância - Defensoria Pública do Estado da Bahia',
  'Núcleo de Execução Penal - Defensoria Pública do Estado da Bahia',
  'Rua Pedro Lessa, s/n, Canela, Salvador-BA',
  '(71) 3117-6800',
  'Segunda a sexta, 8h às 14h'
)
ON CONFLICT (comarca) DO NOTHING;
