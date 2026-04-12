-- Drive File Index — Fase 2 do TDD analytics-ml-foundation
-- Vincula arquivos do Google Drive a assistidos e processos.
-- Strategy A (path-based): determina o vínculo pela posição na hierarquia de pastas.
-- Strategy B (regex/embedding): para arquivos fora da hierarquia canônica (futuro).

CREATE TABLE IF NOT EXISTS drive_file_index (
  id BIGSERIAL PRIMARY KEY,
  drive_file_id TEXT UNIQUE NOT NULL,        -- ID do arquivo no Google Drive
  drive_path TEXT NOT NULL,                   -- path completo
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  modified_time TIMESTAMPTZ,

  -- Vínculo (preenchido pela estratégia de linkagem)
  assistido_id INT REFERENCES assistidos(id) ON DELETE SET NULL,
  processo_id INT REFERENCES processos(id) ON DELETE SET NULL,
  link_strategy TEXT NOT NULL DEFAULT 'pending'
    CHECK (link_strategy IN ('path','regex','embedding','manual','pending')),
  link_confidence REAL,

  -- Contexto
  workspace_id INT,
  defensor_id INT,
  indexed_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dfi_assistido ON drive_file_index(assistido_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dfi_processo ON drive_file_index(processo_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dfi_strategy ON drive_file_index(link_strategy);
CREATE INDEX IF NOT EXISTS idx_dfi_drive_path ON drive_file_index(drive_path);
