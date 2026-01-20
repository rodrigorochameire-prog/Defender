-- ==========================================
-- EXECUTAR NO SUPABASE SQL EDITOR
-- Adiciona colunas deleted_at para soft delete
-- ==========================================

-- Tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON users(deleted_at);

-- Tabela pets  
ALTER TABLE pets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS pets_deleted_at_idx ON pets(deleted_at);

-- Tabela calendar_events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS calendar_events_deleted_at_idx ON calendar_events(deleted_at);

-- Verificar se as colunas foram criadas
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE column_name = 'deleted_at' 
  AND table_schema = 'public';
