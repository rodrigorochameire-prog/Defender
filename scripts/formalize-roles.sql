-- ============================================================
-- Formalize Roles: Security Constraints
-- ============================================================

-- Estagiário MUST have a supervisor
ALTER TABLE users ADD CONSTRAINT check_estagiario_has_supervisor
  CHECK (role != 'estagiario' OR supervisor_id IS NOT NULL);
