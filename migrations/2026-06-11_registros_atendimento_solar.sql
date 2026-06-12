-- Módulo Atendimentos — campos SOLAR na tabela registros (tipo='atendimento')
-- Aplicada em 2026-06-11 via script direto (lock_timeout 5s).
-- Spec: docs/superpowers/specs/2026-06-11-atendimentos-modulo-design.md

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE registros
  ADD COLUMN IF NOT EXISTS numero_solar varchar(30),
  ADD COLUMN IF NOT EXISTS subtipo varchar(20),
  ADD COLUMN IF NOT EXISTS area varchar(40),
  ADD COLUMN IF NOT EXISTS pedido varchar(80),
  ADD COLUMN IF NOT EXISTS anotacoes_recepcao text,
  ADD COLUMN IF NOT EXISTS historico_solar jsonb,
  ADD COLUMN IF NOT EXISTS processos_citados jsonb;

COMMIT;

CREATE INDEX IF NOT EXISTS registros_numero_solar_idx ON registros (numero_solar);
