-- ==========================================
-- EXECUTAR NO SUPABASE SQL EDITOR
-- Migração: Motor de Regras de Negócio
-- ==========================================

-- ==========================================
-- TABELA: CONFIGURAÇÕES GLOBAIS
-- ==========================================

CREATE TABLE IF NOT EXISTS business_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  label VARCHAR(200) NOT NULL,
  description TEXT,
  data_type VARCHAR(20) NOT NULL,
  updated_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_settings_key_idx ON business_settings(key);
CREATE INDEX IF NOT EXISTS business_settings_category_idx ON business_settings(category);

-- ==========================================
-- TABELA: REGRAS DE NEGÓCIO
-- ==========================================

CREATE TABLE IF NOT EXISTS business_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  
  trigger_type VARCHAR(50) NOT NULL,
  trigger_entity VARCHAR(50),
  trigger_field VARCHAR(100),
  trigger_condition VARCHAR(50),
  trigger_value TEXT,
  
  action_type VARCHAR(50) NOT NULL,
  action_config TEXT NOT NULL,
  
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMP,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_rules_is_active_idx ON business_rules(is_active);
CREATE INDEX IF NOT EXISTS business_rules_trigger_type_idx ON business_rules(trigger_type);
CREATE INDEX IF NOT EXISTS business_rules_priority_idx ON business_rules(priority);

-- ==========================================
-- TABELA: FLAGS DINÂMICAS
-- ==========================================

CREATE TABLE IF NOT EXISTS dynamic_flags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL,
  icon VARCHAR(50),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_assign_condition TEXT,
  show_on_checkin BOOLEAN NOT NULL DEFAULT true,
  show_on_calendar BOOLEAN NOT NULL DEFAULT true,
  show_on_pet_card BOOLEAN NOT NULL DEFAULT true,
  show_on_daily_log BOOLEAN NOT NULL DEFAULT true,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dynamic_flags_is_active_idx ON dynamic_flags(is_active);

-- ==========================================
-- TABELA: ATRIBUIÇÃO DE FLAGS A PETS
-- ==========================================

CREATE TABLE IF NOT EXISTS pet_flags (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  flag_id INTEGER NOT NULL REFERENCES dynamic_flags(id) ON DELETE CASCADE,
  assigned_by_id INTEGER REFERENCES users(id),
  assigned_by_rule INTEGER REFERENCES business_rules(id),
  notes TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(pet_id, flag_id)
);

CREATE INDEX IF NOT EXISTS pet_flags_pet_id_idx ON pet_flags(pet_id);
CREATE INDEX IF NOT EXISTS pet_flags_flag_id_idx ON pet_flags(flag_id);

-- ==========================================
-- TABELA: LOG DE EXECUÇÃO DE REGRAS
-- ==========================================

CREATE TABLE IF NOT EXISTS rule_execution_log (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER NOT NULL REFERENCES business_rules(id) ON DELETE CASCADE,
  pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  trigger_data TEXT,
  action_result TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rule_execution_log_rule_id_idx ON rule_execution_log(rule_id);
CREATE INDEX IF NOT EXISTS rule_execution_log_pet_id_idx ON rule_execution_log(pet_id);
CREATE INDEX IF NOT EXISTS rule_execution_log_executed_at_idx ON rule_execution_log(executed_at);

-- ==========================================
-- TRIGGERS PARA UPDATED_AT
-- ==========================================

DROP TRIGGER IF EXISTS business_settings_updated_at ON business_settings;
CREATE TRIGGER business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS business_rules_updated_at ON business_rules;
CREATE TRIGGER business_rules_updated_at
  BEFORE UPDATE ON business_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS dynamic_flags_updated_at ON dynamic_flags;
CREATE TRIGGER dynamic_flags_updated_at
  BEFORE UPDATE ON dynamic_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VERIFICAÇÃO
-- ==========================================

SELECT 
  'Motor de Regras instalado!' AS resultado,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'business_settings') AS business_settings,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'business_rules') AS business_rules,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'dynamic_flags') AS dynamic_flags,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'pet_flags') AS pet_flags,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'rule_execution_log') AS rule_execution_log;
