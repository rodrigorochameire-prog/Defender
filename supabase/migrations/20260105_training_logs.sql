-- Tabela de registros de treinamento
CREATE TABLE IF NOT EXISTS training_logs (
    id SERIAL PRIMARY KEY,
    pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    log_date TIMESTAMP NOT NULL,
    command VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    success_rate INTEGER,
    duration INTEGER,
    treats INTEGER,
    method VARCHAR(100),
    notes TEXT,
    video_url TEXT,
    created_by_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Tabela de comandos de treinamento (biblioteca)
CREATE TABLE IF NOT EXISTS training_commands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20),
    steps TEXT,
    tips TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_training_logs_pet ON training_logs(pet_id);
CREATE INDEX IF NOT EXISTS idx_training_logs_date ON training_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_training_logs_category ON training_logs(category);

