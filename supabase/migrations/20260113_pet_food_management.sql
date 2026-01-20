-- ==========================================
-- Migration: Sistema de Gestão de Alimentação
-- Data: 2026-01-13
-- Descrição: Cria tabelas para gestão completa de alimentação de pets
-- ==========================================

-- Planos de Alimentação
CREATE TABLE IF NOT EXISTS pet_food_plans (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    food_type VARCHAR(50) NOT NULL, -- 'dry' | 'wet' | 'natural' | 'mixed'
    brand VARCHAR(200) NOT NULL,
    product_name VARCHAR(200),
    daily_amount INTEGER NOT NULL, -- quantidade diária em gramas
    portions_per_day INTEGER NOT NULL DEFAULT 2,
    portion_times TEXT, -- JSON array de horários
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para pet_food_plans
CREATE INDEX IF NOT EXISTS idx_pet_food_plans_pet_id ON pet_food_plans(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_food_plans_active ON pet_food_plans(pet_id, is_active) WHERE is_active = true;

-- Estoque de Ração
CREATE TABLE IF NOT EXISTS pet_food_inventory (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    brand VARCHAR(200) NOT NULL,
    product_name VARCHAR(200),
    quantity_received INTEGER NOT NULL, -- quantidade recebida em gramas
    quantity_remaining INTEGER NOT NULL, -- quantidade restante em gramas
    received_date TIMESTAMP NOT NULL DEFAULT NOW(),
    expiration_date TIMESTAMP,
    batch_number VARCHAR(100),
    notes TEXT,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para pet_food_inventory
CREATE INDEX IF NOT EXISTS idx_pet_food_inventory_pet_id ON pet_food_inventory(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_food_inventory_received ON pet_food_inventory(pet_id, received_date DESC);

-- Histórico de Rações (Reações)
CREATE TABLE IF NOT EXISTS pet_food_history (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    food_plan_id INTEGER REFERENCES pet_food_plans(id) ON DELETE SET NULL,
    brand VARCHAR(200) NOT NULL,
    product_name VARCHAR(200),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    -- Reações do pet
    acceptance VARCHAR(20), -- 'loved' | 'liked' | 'neutral' | 'disliked' | 'rejected'
    digestion VARCHAR(20), -- 'excellent' | 'good' | 'regular' | 'poor'
    stool_quality VARCHAR(20), -- 'normal' | 'soft' | 'hard' | 'diarrhea'
    coat_condition VARCHAR(20), -- 'excellent' | 'good' | 'regular' | 'poor'
    energy_level VARCHAR(20), -- 'high' | 'normal' | 'low'
    allergic_reaction BOOLEAN DEFAULT false,
    allergic_details TEXT,
    overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
    notes TEXT,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para pet_food_history
CREATE INDEX IF NOT EXISTS idx_pet_food_history_pet_id ON pet_food_history(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_food_history_date ON pet_food_history(pet_id, created_at DESC);

-- Petiscos e Snacks
CREATE TABLE IF NOT EXISTS pet_treats (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    treat_type VARCHAR(50) NOT NULL, -- 'snack' | 'biscuit' | 'natural' | 'supplement' | 'other'
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(200),
    purpose VARCHAR(100), -- 'reward' | 'training' | 'dental' | 'supplement' | 'enrichment'
    frequency VARCHAR(50), -- 'daily' | 'weekly' | 'occasionally' | 'training_only'
    max_per_day INTEGER,
    calories_per_unit INTEGER,
    acceptance VARCHAR(20), -- 'loved' | 'liked' | 'neutral' | 'disliked'
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para pet_treats
CREATE INDEX IF NOT EXISTS idx_pet_treats_pet_id ON pet_treats(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_treats_active ON pet_treats(pet_id, is_active) WHERE is_active = true;

-- Alimentação Natural
CREATE TABLE IF NOT EXISTS pet_natural_food (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    meal_type VARCHAR(50) NOT NULL, -- 'barf' | 'cooked' | 'mixed' | 'supplement'
    name VARCHAR(200) NOT NULL,
    ingredients TEXT, -- JSON array de ingredientes
    protein_source VARCHAR(200),
    portion_size INTEGER,
    frequency VARCHAR(50), -- 'daily' | 'weekly' | 'occasionally'
    preparation_notes TEXT,
    acceptance VARCHAR(20), -- 'loved' | 'liked' | 'neutral' | 'disliked'
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para pet_natural_food
CREATE INDEX IF NOT EXISTS idx_pet_natural_food_pet_id ON pet_natural_food(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_natural_food_active ON pet_natural_food(pet_id, is_active) WHERE is_active = true;

-- ==========================================
-- RLS Policies (Row Level Security)
-- ==========================================

-- Habilitar RLS nas tabelas
ALTER TABLE pet_food_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_food_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_food_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_treats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_natural_food ENABLE ROW LEVEL SECURITY;

-- Políticas para pet_food_plans
CREATE POLICY "Users can view their pets food plans" ON pet_food_plans
    FOR SELECT USING (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

CREATE POLICY "Users can insert food plans for their pets" ON pet_food_plans
    FOR INSERT WITH CHECK (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

CREATE POLICY "Users can update their pets food plans" ON pet_food_plans
    FOR UPDATE USING (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

-- Políticas para pet_food_inventory
CREATE POLICY "Users can view their pets inventory" ON pet_food_inventory
    FOR SELECT USING (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

CREATE POLICY "Users can insert inventory for their pets" ON pet_food_inventory
    FOR INSERT WITH CHECK (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

CREATE POLICY "Users can update their pets inventory" ON pet_food_inventory
    FOR UPDATE USING (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

-- Políticas para pet_food_history
CREATE POLICY "Users can view their pets food history" ON pet_food_history
    FOR SELECT USING (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

CREATE POLICY "Users can insert food history for their pets" ON pet_food_history
    FOR INSERT WITH CHECK (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

CREATE POLICY "Users can update their pets food history" ON pet_food_history
    FOR UPDATE USING (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

-- Políticas para pet_treats
CREATE POLICY "Users can view their pets treats" ON pet_treats
    FOR SELECT USING (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

CREATE POLICY "Users can insert treats for their pets" ON pet_treats
    FOR INSERT WITH CHECK (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

CREATE POLICY "Users can update their pets treats" ON pet_treats
    FOR UPDATE USING (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

-- Políticas para pet_natural_food
CREATE POLICY "Users can view their pets natural food" ON pet_natural_food
    FOR SELECT USING (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

CREATE POLICY "Users can insert natural food for their pets" ON pet_natural_food
    FOR INSERT WITH CHECK (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

CREATE POLICY "Users can update their pets natural food" ON pet_natural_food
    FOR UPDATE USING (
        pet_id IN (SELECT pet_id FROM pet_tutors WHERE tutor_id = auth.uid()::integer)
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::integer AND role = 'admin')
    );

-- ==========================================
-- Comentários nas tabelas
-- ==========================================

COMMENT ON TABLE pet_food_plans IS 'Planos de alimentação dos pets com tipo, marca, quantidade e porções diárias';
COMMENT ON TABLE pet_food_inventory IS 'Controle de estoque de ração por pet';
COMMENT ON TABLE pet_food_history IS 'Histórico de rações utilizadas com registro de reações do pet';
COMMENT ON TABLE pet_treats IS 'Petiscos e snacks permitidos para cada pet';
COMMENT ON TABLE pet_natural_food IS 'Alimentação natural e receitas caseiras dos pets';
