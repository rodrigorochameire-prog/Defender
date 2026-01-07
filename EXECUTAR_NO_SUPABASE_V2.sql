-- ===========================================
-- TeteCare v2 - Migração Completa de Tabelas
-- Execute este script no SQL Editor do Supabase
-- ===========================================

-- 1. BIBLIOTECA DE MEDICAMENTOS
CREATE TABLE IF NOT EXISTS medication_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    common_dosage VARCHAR(200),
    is_common BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. MEDICAMENTOS DO PET
CREATE TABLE IF NOT EXISTS pet_medications (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    medication_id INTEGER NOT NULL REFERENCES medication_library(id),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    dosage VARCHAR(200) NOT NULL,
    frequency VARCHAR(100),
    administration_times TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. TRATAMENTOS PREVENTIVOS
CREATE TABLE IF NOT EXISTS preventive_treatments (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    application_date TIMESTAMP NOT NULL,
    next_due_date TIMESTAMP,
    dosage VARCHAR(100),
    notes TEXT,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. DOCUMENTOS
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    uploaded_by_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 5. REGISTROS DE COMPORTAMENTO
CREATE TABLE IF NOT EXISTS behavior_logs (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    log_date TIMESTAMP NOT NULL,
    socialization VARCHAR(50),
    energy VARCHAR(50),
    obedience VARCHAR(50),
    anxiety VARCHAR(50),
    aggression VARCHAR(50),
    notes TEXT,
    activities TEXT,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 6. MURAL - POSTS
CREATE TABLE IF NOT EXISTS wall_posts (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id),
    pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    visibility VARCHAR(50) DEFAULT 'all' NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 7. MURAL - COMENTÁRIOS
CREATE TABLE IF NOT EXISTS wall_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 8. MURAL - CURTIDAS
CREATE TABLE IF NOT EXISTS wall_likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES wall_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(post_id, user_id)
);

-- 9. TRANSAÇÕES FINANCEIRAS
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    amount INTEGER NOT NULL,
    credits INTEGER,
    description TEXT,
    stripe_payment_id VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ===========================================
-- ÍNDICES PARA PERFORMANCE
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_pet_medications_pet_id ON pet_medications(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_medications_active ON pet_medications(is_active);
CREATE INDEX IF NOT EXISTS idx_preventive_treatments_pet_id ON preventive_treatments(pet_id);
CREATE INDEX IF NOT EXISTS idx_preventive_treatments_next_due ON preventive_treatments(next_due_date);
CREATE INDEX IF NOT EXISTS idx_documents_pet_id ON documents(pet_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_pet_id ON behavior_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_behavior_logs_date ON behavior_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_wall_posts_author ON wall_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_wall_posts_visibility ON wall_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_wall_comments_post ON wall_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_wall_likes_post ON wall_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pet ON transactions(pet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- ===========================================
-- DADOS INICIAIS - BIBLIOTECA DE MEDICAMENTOS
-- ===========================================

INSERT INTO medication_library (name, type, description, common_dosage) VALUES
('Bravecto', 'flea', 'Antipulgas e carrapatos - ação por 3 meses', '1 comprimido/peso'),
('Nexgard', 'flea', 'Antipulgas e carrapatos - ação por 1 mês', '1 comprimido/peso'),
('Simparic', 'flea', 'Antipulgas, carrapatos e sarnas', '1 comprimido/peso'),
('Drontal', 'deworming', 'Vermífugo de amplo espectro', '1 comp/10kg'),
('Milbemax', 'deworming', 'Vermífugo para cães', '1 comp/5kg'),
('Endogard', 'deworming', 'Vermífugo de amplo espectro', '1 comp/10kg'),
('Amoxicilina', 'antibiotic', 'Antibiótico para infecções bacterianas', 'Conforme prescrição'),
('Prednisolona', 'antiinflammatory', 'Anti-inflamatório corticoide', 'Conforme prescrição'),
('Omeprazol', 'other', 'Protetor gástrico', 'Conforme prescrição'),
('Tramadol', 'other', 'Analgésico para dor', 'Conforme prescrição')
ON CONFLICT DO NOTHING;

-- ===========================================
-- SUCESSO!
-- ===========================================
SELECT 'Migração concluída com sucesso!' as status;
