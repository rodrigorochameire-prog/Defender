-- ============================================
-- SCRIPT SQL INICIAL PARA SUPABASE
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  auth_id VARCHAR(255) UNIQUE,
  "openId" VARCHAR(64) UNIQUE,
  name TEXT,
  email VARCHAR(320) UNIQUE,
  "passwordHash" VARCHAR(255),
  "loginMethod" VARCHAR(64) DEFAULT 'email' NOT NULL,
  "emailVerified" BOOLEAN DEFAULT false NOT NULL,
  role VARCHAR(20) DEFAULT 'user' NOT NULL CHECK (role IN ('user', 'admin')),
  phone VARCHAR(20),
  "stripe_customer_id" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  "lastSignedIn" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_open_id ON users("openId");

-- Comentários para documentação
COMMENT ON TABLE users IS 'Tabela de usuários do sistema';
COMMENT ON COLUMN users.auth_id IS 'ID do usuário no Supabase Auth';
COMMENT ON COLUMN users."openId" IS 'ID do usuário no sistema OAuth antigo (opcional)';
COMMENT ON COLUMN users.role IS 'Role do usuário: user ou admin';

-- ============================================
-- NOTA: Este é apenas o início do schema
-- 
-- Para criar todas as tabelas, você tem duas opções:
--
-- OPÇÃO 1: Usar Drizzle Kit (Recomendado)
-- 1. Migre o schema.ts de MySQL para PostgreSQL
-- 2. Execute: npx drizzle-kit generate
-- 3. Execute: npx drizzle-kit migrate
--
-- OPÇÃO 2: Criar tabelas manualmente conforme necessário
-- Continue adicionando tabelas conforme o schema.ts
-- ============================================


