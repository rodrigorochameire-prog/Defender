-- Migração para criar tabela de Diligências Investigativas
-- Data: 2024

-- Criar enums se não existirem
DO $$ BEGIN
  CREATE TYPE categoria_diligencia AS ENUM (
    'SOCIAL', 'CAMPO', 'OFICIAL', 'GEO',
    'TELEFONIA', 'DOCUMENTAL', 'PERICIAL', 'TESTEMUNHAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE status_diligencia AS ENUM (
    'NAO_INICIADA', 'EM_ANDAMENTO', 'AGUARDANDO',
    'CONCLUIDA', 'INFRUTIFERA', 'CANCELADA'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE executor_diligencia AS ENUM (
    'DEFENSOR', 'SERVIDOR', 'ESTAGIARIO', 'FAMILIA',
    'INFORMANTE', 'INVESTIGADOR', 'ASSISTIDO', 'PERITO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Criar tabela de diligências
CREATE TABLE IF NOT EXISTS diligencias (
  id SERIAL PRIMARY KEY,

  -- Relacionamentos
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
  workspace_id INTEGER REFERENCES workspaces(id),

  -- Identificação
  titulo TEXT NOT NULL,
  descricao TEXT,

  -- Classificação
  categoria categoria_diligencia NOT NULL,
  status status_diligencia NOT NULL DEFAULT 'NAO_INICIADA',

  -- Executor
  executor executor_diligencia DEFAULT 'DEFENSOR',
  executor_nome TEXT,
  executor_contato TEXT,
  responsavel_id INTEGER REFERENCES users(id),

  -- Datas
  data_inicio TIMESTAMP,
  data_conclusao TIMESTAMP,
  prazo DATE,

  -- Dados estruturados (JSONB)
  checklist JSONB,
  notas TEXT,
  resultado TEXT,
  arquivos JSONB,

  -- Prioridade
  prioridade prioridade DEFAULT 'NORMAL',

  -- Soft delete
  deleted_at TIMESTAMP,

  -- Metadados
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS diligencias_caso_id_idx ON diligencias(caso_id);
CREATE INDEX IF NOT EXISTS diligencias_assistido_id_idx ON diligencias(assistido_id);
CREATE INDEX IF NOT EXISTS diligencias_processo_id_idx ON diligencias(processo_id);
CREATE INDEX IF NOT EXISTS diligencias_workspace_id_idx ON diligencias(workspace_id);
CREATE INDEX IF NOT EXISTS diligencias_categoria_idx ON diligencias(categoria);
CREATE INDEX IF NOT EXISTS diligencias_status_idx ON diligencias(status);
CREATE INDEX IF NOT EXISTS diligencias_prazo_idx ON diligencias(prazo);
CREATE INDEX IF NOT EXISTS diligencias_responsavel_id_idx ON diligencias(responsavel_id);
CREATE INDEX IF NOT EXISTS diligencias_deleted_at_idx ON diligencias(deleted_at);
