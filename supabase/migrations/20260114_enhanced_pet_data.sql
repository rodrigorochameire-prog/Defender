-- ============================================
-- Migração: Enhanced Pet Data Structure
-- Data: 2026-01-14
-- Descrição: Adiciona campos estruturados para gestão profissional
-- ============================================

-- ============================================
-- 1. PERFIL COMPORTAMENTAL DO PET
-- ============================================

-- Adicionar novos campos à tabela pets
ALTER TABLE pets ADD COLUMN IF NOT EXISTS size VARCHAR(20); -- mini, small, medium, large, giant
ALTER TABLE pets ADD COLUMN IF NOT EXISTS coat_type VARCHAR(20); -- short, medium, long, wire, curly, double, hairless
ALTER TABLE pets ADD COLUMN IF NOT EXISTS gender VARCHAR(10); -- male, female
ALTER TABLE pets ADD COLUMN IF NOT EXISTS neutered_status VARCHAR(20) DEFAULT 'yes'; -- yes, no, scheduled
ALTER TABLE pets ADD COLUMN IF NOT EXISTS neutered_date DATE;

-- Perfil Comportamental
ALTER TABLE pets ADD COLUMN IF NOT EXISTS dog_sociability VARCHAR(20); -- social, selective, reactive, antisocial
ALTER TABLE pets ADD COLUMN IF NOT EXISTS human_sociability VARCHAR(20); -- friendly, cautious, fearful, reactive
ALTER TABLE pets ADD COLUMN IF NOT EXISTS play_style VARCHAR(20); -- wrestling, chase, fetch, tug, independent, observer
ALTER TABLE pets ADD COLUMN IF NOT EXISTS correction_sensitivity VARCHAR(10); -- high, medium, low
ALTER TABLE pets ADD COLUMN IF NOT EXISTS human_focus_level VARCHAR(10); -- low, medium, high

-- Arrays JSON para múltiplas seleções
ALTER TABLE pets ADD COLUMN IF NOT EXISTS fear_triggers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS calming_methods JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS equipment_restrictions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS coexistence_restrictions JSONB DEFAULT '[]'::jsonb;

-- Saúde
ALTER TABLE pets ADD COLUMN IF NOT EXISTS has_food_allergy BOOLEAN DEFAULT false;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS food_allergies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS has_medication_allergy BOOLEAN DEFAULT false;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS medication_allergies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS has_chronic_condition BOOLEAN DEFAULT false;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS chronic_conditions JSONB DEFAULT '[]'::jsonb;

-- Alimentação
ALTER TABLE pets ADD COLUMN IF NOT EXISTS food_type VARCHAR(30); -- dry_kibble, wet_food, natural_raw, etc.
ALTER TABLE pets ADD COLUMN IF NOT EXISTS food_preparation VARCHAR(30); -- dry_pure, dry_warm_water, etc.
ALTER TABLE pets ADD COLUMN IF NOT EXISTS feeding_notes TEXT;

-- Dados de Cio (para fêmeas não castradas)
ALTER TABLE pets ADD COLUMN IF NOT EXISTS last_heat_date DATE;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS heat_duration_days INTEGER;

-- ============================================
-- 2. TABELA DE INSPEÇÃO DE CHECK-IN
-- ============================================

CREATE TABLE IF NOT EXISTS checkin_inspections (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  calendar_event_id INTEGER REFERENCES calendar_events(id) ON DELETE SET NULL,
  inspection_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Estado Físico
  skin_coat_status VARCHAR(20), -- intact, parasites, hair_loss, wound, redness, hot_spot, dry
  skin_coat_notes TEXT,
  ear_status VARCHAR(20), -- clean, odor, discharge, sensitivity, red
  ear_notes TEXT,
  eye_status VARCHAR(20), -- clean, tearing, opacity, redness, discharge
  eye_notes TEXT,
  paw_status VARCHAR(20), -- normal, long_nails, licking, pad_injury, interdigital
  paw_notes TEXT,
  
  -- Observações gerais
  checkin_observations JSONB DEFAULT '[]'::jsonb, -- array de observações
  general_notes TEXT,
  
  -- Fotos de evidência
  photos JSONB DEFAULT '[]'::jsonb,
  
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkin_inspections_pet_id ON checkin_inspections(pet_id);
CREATE INDEX IF NOT EXISTS idx_checkin_inspections_date ON checkin_inspections(inspection_date);

-- ============================================
-- 3. TABELA DE MEDICAMENTOS DO PET
-- ============================================

CREATE TABLE IF NOT EXISTS pet_medications (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100), -- ex: "1 comprimido", "5ml"
  frequency VARCHAR(50), -- ex: "1x ao dia", "2x ao dia"
  administration_times JSONB DEFAULT '[]'::jsonb, -- ["08:00", "20:00"]
  administration_method VARCHAR(30), -- in_food, with_treat, direct_mouth, etc.
  
  start_date DATE,
  end_date DATE,
  is_ongoing BOOLEAN DEFAULT false, -- medicação contínua
  
  instructions TEXT,
  side_effects TEXT,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_medications_pet_id ON pet_medications(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_medications_active ON pet_medications(is_active);

-- ============================================
-- 4. LOGS DE ADMINISTRAÇÃO DE MEDICAMENTOS
-- ============================================

CREATE TABLE IF NOT EXISTS medication_logs (
  id SERIAL PRIMARY KEY,
  pet_medication_id INTEGER NOT NULL REFERENCES pet_medications(id) ON DELETE CASCADE,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  
  administered_at TIMESTAMP NOT NULL,
  scheduled_time VARCHAR(10), -- "08:00"
  
  was_given BOOLEAN DEFAULT true,
  reason_not_given TEXT, -- se não foi dado, por quê
  
  notes TEXT,
  administered_by_id INTEGER REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medication_logs_pet_id ON medication_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_date ON medication_logs(administered_at);

-- ============================================
-- 5. ATUALIZAR LOGS DIÁRIOS COM CAMPOS ESTRUTURADOS
-- ============================================

-- Adicionar novos campos à tabela daily_logs
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS stool_quality VARCHAR(20); -- type_1 a type_7, blood, mucus, none
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS urine_quality VARCHAR(20); -- normal, dark, frequent, straining, blood, none
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS physical_integrity VARCHAR(30); -- perfect, minor_scratch, bite_mark, etc.
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS physical_notes TEXT;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS nap_quality VARCHAR(20); -- deep, rested, restless, none
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS group_role VARCHAR(20); -- leader, follower, peacemaker, shadow, loner, instigator
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS best_friend_pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS activities_performed JSONB DEFAULT '[]'::jsonb;
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS checkout_observations JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- 6. ATUALIZAR LOGS DE COMPORTAMENTO
-- ============================================

-- Métricas numéricas (escala 1-5)
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS group_interaction_score INTEGER CHECK (group_interaction_score >= 1 AND group_interaction_score <= 5);
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS relaxation_score INTEGER CHECK (relaxation_score >= 1 AND relaxation_score <= 5);
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS obedience_score INTEGER CHECK (obedience_score >= 1 AND obedience_score <= 5);
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS barking_score INTEGER CHECK (barking_score >= 1 AND barking_score <= 5);
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS agitation_score INTEGER CHECK (agitation_score >= 1 AND agitation_score <= 5);

-- Métricas de temperamento
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS confidence_score INTEGER CHECK (confidence_score >= 1 AND confidence_score <= 5);
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS impulsivity_score INTEGER CHECK (impulsivity_score >= 1 AND impulsivity_score <= 5);
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS resilience_score INTEGER CHECK (resilience_score >= 1 AND resilience_score <= 5);
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS focus_score INTEGER CHECK (focus_score >= 1 AND focus_score <= 5);
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS frustration_tolerance_score INTEGER CHECK (frustration_tolerance_score >= 1 AND frustration_tolerance_score <= 5);

-- Gatilhos observados no dia
ALTER TABLE behavior_logs ADD COLUMN IF NOT EXISTS triggers_observed JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- 7. SKILLS MATRIX - TREINAMENTO
-- ============================================

CREATE TABLE IF NOT EXISTS pet_training_commands (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  
  command VARCHAR(30) NOT NULL, -- sit, down, stay, come, heel, place, etc.
  category VARCHAR(20), -- basic, intermediate, advanced, fun, behavior
  
  proficiency VARCHAR(20) DEFAULT 'not_started', -- not_started, learning, with_treat, reliable, proofed
  
  -- 3Ds: Distance, Duration, Distraction
  distance_level INTEGER DEFAULT 1 CHECK (distance_level >= 1 AND distance_level <= 5),
  duration_level INTEGER DEFAULT 1 CHECK (duration_level >= 1 AND duration_level <= 5),
  distraction_level INTEGER DEFAULT 1 CHECK (distraction_level >= 1 AND distraction_level <= 5),
  
  notes TEXT,
  last_practiced DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(pet_id, command)
);

CREATE INDEX IF NOT EXISTS idx_pet_training_commands_pet_id ON pet_training_commands(pet_id);

-- ============================================
-- 8. HISTÓRICO DE SESSÕES DE TREINO
-- ============================================

CREATE TABLE IF NOT EXISTS training_sessions (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  
  session_date TIMESTAMP NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER,
  
  commands_practiced JSONB DEFAULT '[]'::jsonb, -- [{"command": "sit", "success_rate": 80}]
  
  focus_level INTEGER CHECK (focus_level >= 1 AND focus_level <= 5),
  motivation_level INTEGER CHECK (motivation_level >= 1 AND motivation_level <= 5),
  
  notes TEXT,
  achievements TEXT, -- marcos alcançados
  
  trainer_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_pet_id ON training_sessions(pet_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(session_date);

-- ============================================
-- 9. TABELA DE COMPATIBILIDADE (SOCIAL MATRIX)
-- ============================================

CREATE TABLE IF NOT EXISTS pet_compatibility (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  other_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  
  compatibility_type VARCHAR(20) NOT NULL, -- friend, neutral, avoid, best_friend
  
  notes TEXT,
  observed_date DATE DEFAULT CURRENT_DATE,
  
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(pet_id, other_pet_id),
  CHECK (pet_id != other_pet_id)
);

CREATE INDEX IF NOT EXISTS idx_pet_compatibility_pet_id ON pet_compatibility(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_compatibility_other_pet_id ON pet_compatibility(other_pet_id);

-- ============================================
-- 10. ATUALIZAR PREVENTIVOS COM MAIS DETALHES
-- ============================================

ALTER TABLE preventive_treatments ADD COLUMN IF NOT EXISTS product_brand VARCHAR(100);
ALTER TABLE preventive_treatments ADD COLUMN IF NOT EXISTS frequency_days INTEGER DEFAULT 30;
ALTER TABLE preventive_treatments ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 7;
ALTER TABLE preventive_treatments ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;

-- ============================================
-- 11. ATUALIZAR VACINAS COM MAIS DETALHES
-- ============================================

ALTER TABLE pet_vaccinations ADD COLUMN IF NOT EXISTS vaccine_brand VARCHAR(100);
ALTER TABLE pet_vaccinations ADD COLUMN IF NOT EXISTS batch_number VARCHAR(50);
ALTER TABLE pet_vaccinations ADD COLUMN IF NOT EXISTS veterinarian_name VARCHAR(255);
ALTER TABLE pet_vaccinations ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255);
ALTER TABLE pet_vaccinations ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- ============================================
-- 12. DASHBOARD DE INCONSISTÊNCIAS (ALERTAS DO SISTEMA)
-- ============================================

CREATE TABLE IF NOT EXISTS system_alerts (
  id SERIAL PRIMARY KEY,
  
  alert_type VARCHAR(50) NOT NULL, -- negative_credits, overdue_vaccine, behavior_incident, etc.
  severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
  
  related_type VARCHAR(50), -- pet, tutor, booking, etc.
  related_id INTEGER,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP,
  resolved_by_id INTEGER REFERENCES users(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE checkin_inspections IS 'Registro de inspeção física do pet no momento do check-in';
COMMENT ON TABLE pet_medications IS 'Medicamentos ativos e histórico de medicação do pet';
COMMENT ON TABLE medication_logs IS 'Log de cada administração de medicamento';
COMMENT ON TABLE pet_training_commands IS 'Matriz de habilidades de treinamento por pet';
COMMENT ON TABLE training_sessions IS 'Histórico de sessões de treino';
COMMENT ON TABLE pet_compatibility IS 'Matriz de compatibilidade social entre pets';
COMMENT ON TABLE system_alerts IS 'Alertas automáticos do sistema para o gestor';
