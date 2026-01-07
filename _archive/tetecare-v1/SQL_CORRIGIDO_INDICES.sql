-- SQL CORRIGIDO PARA OS ÍNDICES
-- Use este SQL se o agente precisar corrigir os índices

-- Criar índices com referências corretas (usando aspas para colunas case-sensitive)
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_open_id ON users("openId");

-- Se precisar recriar a tabela do zero (DROP TABLE users; antes):
-- CREATE TABLE IF NOT EXISTS users (
--   id SERIAL PRIMARY KEY,
--   auth_id VARCHAR(255) UNIQUE,
--   "openId" VARCHAR(64) UNIQUE,
--   name TEXT,
--   email VARCHAR(320) UNIQUE,
--   "passwordHash" VARCHAR(255),
--   "loginMethod" VARCHAR(64) DEFAULT 'email' NOT NULL,
--   "emailVerified" BOOLEAN DEFAULT false NOT NULL,
--   role VARCHAR(20) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
--   phone VARCHAR(20),
--   "stripe_customer_id" VARCHAR(255),
--   "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
--   "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
--   "lastSignedIn" TIMESTAMP DEFAULT NOW() NOT NULL
-- );


