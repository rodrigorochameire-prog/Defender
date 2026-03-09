-- ==========================================
-- VVD REDESIGN - Criar tabelas com schema novo
-- 2026-03-08
-- ==========================================

-- Enums
DO $$ BEGIN CREATE TYPE tipo_intimacao AS ENUM ('CIENCIA','PETICIONAR','AUDIENCIA','CUMPRIMENTO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE status_mpu AS ENUM ('ATIVA','EXPIRADA','REVOGADA','RENOVADA','MODULADA','AGUARDANDO_DECISAO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE canal_entrada_vvd AS ENUM ('formulario_google','policia_civil','cram','dpe','juiz_oficio','outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tipo_relato_vvd AS ENUM ('ameaca','lesao_corporal','descumprimento','psicologica','patrimonial','sexual','outro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- partes_vvd
CREATE TABLE IF NOT EXISTS partes_vvd (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf VARCHAR(14),
  rg VARCHAR(20),
  data_nascimento DATE,
  tipo_parte VARCHAR(20) NOT NULL,
  telefone VARCHAR(20),
  telefone_secundario VARCHAR(20),
  email VARCHAR(100),
  endereco TEXT,
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  parentesco VARCHAR(50),
  observacoes TEXT,
  assistido_id INTEGER REFERENCES assistidos(id),
  sexo VARCHAR(10),
  workspace_id INTEGER REFERENCES workspaces(id),
  defensor_id INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- processos_vvd
CREATE TABLE IF NOT EXISTS processos_vvd (
  id SERIAL PRIMARY KEY,
  requerido_id INTEGER NOT NULL REFERENCES partes_vvd(id) ON DELETE CASCADE,
  requerente_id INTEGER REFERENCES partes_vvd(id) ON DELETE SET NULL,
  numero_autos TEXT NOT NULL,
  tipo_processo VARCHAR(20) NOT NULL DEFAULT 'MPU',
  comarca VARCHAR(100),
  vara VARCHAR(100) DEFAULT 'Vara de Violência Doméstica',
  crime VARCHAR(200),
  assunto TEXT,
  data_distribuicao DATE,
  data_ultima_movimentacao DATE,
  fase VARCHAR(50) DEFAULT 'tramitando',
  situacao VARCHAR(50) DEFAULT 'ativo',
  mpu_ativa BOOLEAN DEFAULT false,
  data_decisao_mpu DATE,
  tipos_mpu TEXT,
  data_vencimento_mpu DATE,
  distancia_minima INTEGER,
  defensor_id INTEGER REFERENCES users(id),
  observacoes TEXT,
  pje_documento_id VARCHAR(20),
  pje_ultima_atualizacao TIMESTAMP,
  workspace_id INTEGER REFERENCES workspaces(id),
  processo_id INTEGER REFERENCES processos(id),
  canal_entrada canal_entrada_vvd,
  tipo_relato tipo_relato_vvd,
  tem_acao_familia BOOLEAN DEFAULT false,
  tipo_acao_familia VARCHAR(30),
  suspeita_ma_fe BOOLEAN DEFAULT false,
  data_fato DATE,
  medidas_deferidas JSONB,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- intimacoes_vvd
CREATE TABLE IF NOT EXISTS intimacoes_vvd (
  id SERIAL PRIMARY KEY,
  processo_vvd_id INTEGER NOT NULL REFERENCES processos_vvd(id) ON DELETE CASCADE,
  tipo_intimacao tipo_intimacao NOT NULL DEFAULT 'CIENCIA',
  ato TEXT NOT NULL,
  data_expedicao DATE,
  data_intimacao DATE,
  prazo DATE,
  prazo_dias INTEGER,
  pje_documento_id VARCHAR(20),
  pje_tipo_documento VARCHAR(50),
  status VARCHAR(30) DEFAULT 'pendente',
  providencias TEXT,
  demanda_id INTEGER REFERENCES demandas(id),
  audiencia_id INTEGER REFERENCES audiencias(id),
  defensor_id INTEGER REFERENCES users(id),
  workspace_id INTEGER REFERENCES workspaces(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- historico_mpu
CREATE TABLE IF NOT EXISTS historico_mpu (
  id SERIAL PRIMARY KEY,
  processo_vvd_id INTEGER NOT NULL REFERENCES processos_vvd(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(30) NOT NULL,
  data_evento DATE NOT NULL,
  descricao TEXT,
  medidas_vigentes TEXT,
  nova_data_vencimento DATE,
  nova_distancia INTEGER,
  pje_documento_id VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS partes_vvd_nome_idx ON partes_vvd(nome);
CREATE INDEX IF NOT EXISTS partes_vvd_cpf_idx ON partes_vvd(cpf);
CREATE INDEX IF NOT EXISTS partes_vvd_tipo_parte_idx ON partes_vvd(tipo_parte);
CREATE INDEX IF NOT EXISTS partes_vvd_workspace_id_idx ON partes_vvd(workspace_id);
CREATE INDEX IF NOT EXISTS partes_vvd_deleted_at_idx ON partes_vvd(deleted_at);
CREATE INDEX IF NOT EXISTS partes_vvd_assistido_id_idx ON partes_vvd(assistido_id);
CREATE INDEX IF NOT EXISTS partes_vvd_sexo_idx ON partes_vvd(sexo);

CREATE INDEX IF NOT EXISTS processos_vvd_requerido_id_idx ON processos_vvd(requerido_id);
CREATE INDEX IF NOT EXISTS processos_vvd_requerente_id_idx ON processos_vvd(requerente_id);
CREATE INDEX IF NOT EXISTS processos_vvd_numero_autos_idx ON processos_vvd(numero_autos);
CREATE INDEX IF NOT EXISTS processos_vvd_mpu_ativa_idx ON processos_vvd(mpu_ativa);
CREATE INDEX IF NOT EXISTS processos_vvd_data_vencimento_mpu_idx ON processos_vvd(data_vencimento_mpu);
CREATE INDEX IF NOT EXISTS processos_vvd_defensor_id_idx ON processos_vvd(defensor_id);
CREATE INDEX IF NOT EXISTS processos_vvd_workspace_id_idx ON processos_vvd(workspace_id);
CREATE INDEX IF NOT EXISTS processos_vvd_deleted_at_idx ON processos_vvd(deleted_at);
CREATE INDEX IF NOT EXISTS processos_vvd_processo_id_idx ON processos_vvd(processo_id);
CREATE INDEX IF NOT EXISTS processos_vvd_canal_entrada_idx ON processos_vvd(canal_entrada);
CREATE INDEX IF NOT EXISTS processos_vvd_tipo_relato_idx ON processos_vvd(tipo_relato);
CREATE INDEX IF NOT EXISTS processos_vvd_tem_acao_familia_idx ON processos_vvd(tem_acao_familia);
CREATE INDEX IF NOT EXISTS processos_vvd_data_fato_idx ON processos_vvd(data_fato);

CREATE INDEX IF NOT EXISTS intimacoes_vvd_processo_vvd_id_idx ON intimacoes_vvd(processo_vvd_id);
CREATE INDEX IF NOT EXISTS intimacoes_vvd_tipo_intimacao_idx ON intimacoes_vvd(tipo_intimacao);
CREATE INDEX IF NOT EXISTS intimacoes_vvd_status_idx ON intimacoes_vvd(status);
CREATE INDEX IF NOT EXISTS intimacoes_vvd_prazo_idx ON intimacoes_vvd(prazo);
CREATE INDEX IF NOT EXISTS intimacoes_vvd_defensor_id_idx ON intimacoes_vvd(defensor_id);
CREATE INDEX IF NOT EXISTS intimacoes_vvd_workspace_id_idx ON intimacoes_vvd(workspace_id);
CREATE INDEX IF NOT EXISTS intimacoes_vvd_audiencia_id_idx ON intimacoes_vvd(audiencia_id);

CREATE INDEX IF NOT EXISTS historico_mpu_processo_vvd_id_idx ON historico_mpu(processo_vvd_id);
CREATE INDEX IF NOT EXISTS historico_mpu_tipo_evento_idx ON historico_mpu(tipo_evento);
CREATE INDEX IF NOT EXISTS historico_mpu_data_evento_idx ON historico_mpu(data_evento);

-- RLS
ALTER TABLE partes_vvd ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos_vvd ENABLE ROW LEVEL SECURITY;
ALTER TABLE intimacoes_vvd ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_mpu ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS partes_vvd_service ON partes_vvd;
  CREATE POLICY partes_vvd_service ON partes_vvd FOR ALL USING (true) WITH CHECK (true);
  DROP POLICY IF EXISTS processos_vvd_service ON processos_vvd;
  CREATE POLICY processos_vvd_service ON processos_vvd FOR ALL USING (true) WITH CHECK (true);
  DROP POLICY IF EXISTS intimacoes_vvd_service ON intimacoes_vvd;
  CREATE POLICY intimacoes_vvd_service ON intimacoes_vvd FOR ALL USING (true) WITH CHECK (true);
  DROP POLICY IF EXISTS historico_mpu_service ON historico_mpu;
  CREATE POLICY historico_mpu_service ON historico_mpu FOR ALL USING (true) WITH CHECK (true);
END $$;
