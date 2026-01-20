-- ==========================================
-- Migração: Gestão Avançada de Pets
-- Data: 2026-01-14
-- ==========================================

-- ==========================================
-- NOVOS CAMPOS NA TABELA PETS
-- ==========================================

-- Alimentação
ALTER TABLE pets ADD COLUMN IF NOT EXISTS food_type VARCHAR(50);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS food_stock_grams INTEGER;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS food_stock_last_update TIMESTAMP;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS feeding_instructions TEXT;

-- Comportamento e Energia
ALTER TABLE pets ADD COLUMN IF NOT EXISTS energy_level VARCHAR(20);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS sociability_level VARCHAR(20);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS anxiety_separation VARCHAR(20);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS room_preference VARCHAR(50);

-- Protocolo de Emergência
ALTER TABLE pets ADD COLUMN IF NOT EXISTS emergency_vet_name VARCHAR(200);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS emergency_vet_phone VARCHAR(50);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS emergency_vet_address TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS severe_allergies TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS medical_conditions TEXT;

-- Índices
CREATE INDEX IF NOT EXISTS pets_energy_level_idx ON pets(energy_level);
CREATE INDEX IF NOT EXISTS pets_room_preference_idx ON pets(room_preference);

-- ==========================================
-- TABELA: CÍRCULO SOCIAL
-- ==========================================

CREATE TABLE IF NOT EXISTS pet_social_circle (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  related_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  relationship_type VARCHAR(20) NOT NULL, -- 'friend' | 'neutral' | 'avoid' | 'incompatible'
  notes TEXT,
  severity VARCHAR(20), -- para 'avoid'/'incompatible': 'low' | 'medium' | 'high' | 'critical'
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(pet_id, related_pet_id)
);

CREATE INDEX IF NOT EXISTS pet_social_circle_pet_id_idx ON pet_social_circle(pet_id);
CREATE INDEX IF NOT EXISTS pet_social_circle_related_pet_id_idx ON pet_social_circle(related_pet_id);
CREATE INDEX IF NOT EXISTS pet_social_circle_relationship_type_idx ON pet_social_circle(relationship_type);

-- ==========================================
-- TABELA: HISTÓRICO DE PESO
-- ==========================================

CREATE TABLE IF NOT EXISTS pet_weight_history (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL, -- em gramas
  measured_at TIMESTAMP NOT NULL,
  notes TEXT,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pet_weight_history_pet_id_idx ON pet_weight_history(pet_id);
CREATE INDEX IF NOT EXISTS pet_weight_history_measured_at_idx ON pet_weight_history(measured_at);

-- ==========================================
-- TABELA: LOG DE ALIMENTAÇÃO
-- ==========================================

CREATE TABLE IF NOT EXISTS pet_feeding_logs (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  feeding_date TIMESTAMP NOT NULL,
  meal_type VARCHAR(20) NOT NULL, -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  amount_grams INTEGER NOT NULL,
  consumption VARCHAR(20) NOT NULL, -- 'all' | 'most' | 'half' | 'little' | 'none'
  notes TEXT,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pet_feeding_logs_pet_id_idx ON pet_feeding_logs(pet_id);
CREATE INDEX IF NOT EXISTS pet_feeding_logs_feeding_date_idx ON pet_feeding_logs(feeding_date);
CREATE INDEX IF NOT EXISTS pet_feeding_logs_consumption_idx ON pet_feeding_logs(consumption);

-- ==========================================
-- TABELA: HABILIDADES DE ADESTRAMENTO
-- ==========================================

CREATE TABLE IF NOT EXISTS pet_training_skills (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'not_started' | 'learning' | 'inconsistent' | 'mastered'
  last_practiced TIMESTAMP,
  notes TEXT,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(pet_id, skill_name)
);

CREATE INDEX IF NOT EXISTS pet_training_skills_pet_id_idx ON pet_training_skills(pet_id);
CREATE INDEX IF NOT EXISTS pet_training_skills_status_idx ON pet_training_skills(status);

-- ==========================================
-- TABELA: ALERTAS DO PET
-- ==========================================

CREATE TABLE IF NOT EXISTS pet_alerts (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'behavior' | 'health' | 'feeding' | 'social' | 'financial'
  severity VARCHAR(20) NOT NULL, -- 'info' | 'warning' | 'critical'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  resolved_at TIMESTAMP,
  resolved_by_id INTEGER REFERENCES users(id),
  resolution_notes TEXT,
  related_log_id INTEGER,
  related_event_id INTEGER,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pet_alerts_pet_id_idx ON pet_alerts(pet_id);
CREATE INDEX IF NOT EXISTS pet_alerts_alert_type_idx ON pet_alerts(alert_type);
CREATE INDEX IF NOT EXISTS pet_alerts_severity_idx ON pet_alerts(severity);
CREATE INDEX IF NOT EXISTS pet_alerts_is_active_idx ON pet_alerts(is_active);

-- ==========================================
-- TRIGGERS PARA UPDATED_AT
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS pet_social_circle_updated_at ON pet_social_circle;
CREATE TRIGGER pet_social_circle_updated_at
  BEFORE UPDATE ON pet_social_circle
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS pet_training_skills_updated_at ON pet_training_skills;
CREATE TRIGGER pet_training_skills_updated_at
  BEFORE UPDATE ON pet_training_skills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- VERIFICAÇÃO
-- ==========================================

SELECT 
  'Migração concluída!' AS status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'energy_level') AS pets_has_energy_level,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'pet_social_circle') AS has_social_circle,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'pet_weight_history') AS has_weight_history,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'pet_feeding_logs') AS has_feeding_logs,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'pet_training_skills') AS has_training_skills,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'pet_alerts') AS has_alerts;
