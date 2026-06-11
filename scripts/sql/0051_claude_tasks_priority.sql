-- Fase 1 (daemon v2) — colunas de prioridade/origem em claude_code_tasks.
-- Idempotente e retrocompatível (colunas nullable/default; app atual ignora).
-- Aplicação canônica: `npm run db:generate` a partir do schema e depois migrate.
-- Este arquivo é um helper para aplicação manual (psql/Supabase SQL editor) se preferir.

ALTER TABLE claude_code_tasks
  ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS source text;

CREATE INDEX IF NOT EXISTS claude_code_tasks_priority_idx
  ON claude_code_tasks (status, priority, created_at);
