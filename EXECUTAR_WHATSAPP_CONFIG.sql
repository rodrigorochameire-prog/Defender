-- ==========================================
-- EXECUTAR NO SUPABASE SQL EDITOR
-- ==========================================
-- Este script cria as tabelas necessárias para a configuração
-- do WhatsApp por admin (multi-tenant)
--
-- Execute este SQL no dashboard do Supabase:
-- https://supabase.com/dashboard → Seu projeto → SQL Editor

-- ==========================================
-- Tabela de configurações WhatsApp por Admin
-- ==========================================

CREATE TABLE IF NOT EXISTS whatsapp_config (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Credenciais da Meta Cloud API
  access_token TEXT,
  phone_number_id TEXT,
  business_account_id TEXT,
  webhook_verify_token TEXT,
  
  -- Informações do número (cache do perfil)
  display_phone_number TEXT,
  verified_name TEXT,
  quality_rating VARCHAR(20),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMP,
  
  -- Configurações de envio automático
  auto_notify_checkin BOOLEAN NOT NULL DEFAULT false,
  auto_notify_checkout BOOLEAN NOT NULL DEFAULT false,
  auto_notify_daily_log BOOLEAN NOT NULL DEFAULT false,
  auto_notify_booking BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadados
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para whatsapp_config
CREATE INDEX IF NOT EXISTS whatsapp_config_admin_id_idx ON whatsapp_config(admin_id);
CREATE INDEX IF NOT EXISTS whatsapp_config_is_active_idx ON whatsapp_config(is_active);

-- ==========================================
-- Tabela de Histórico de Mensagens
-- ==========================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  config_id INTEGER NOT NULL REFERENCES whatsapp_config(id) ON DELETE CASCADE,
  
  -- Destinatário
  to_phone TEXT NOT NULL,
  to_name TEXT,
  pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  
  -- Mensagem
  message_type VARCHAR(50) NOT NULL,
  template_name TEXT,
  content TEXT,
  
  -- Status da API
  message_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  
  -- Contexto
  context VARCHAR(50),
  sent_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para whatsapp_messages
CREATE INDEX IF NOT EXISTS whatsapp_messages_config_id_idx ON whatsapp_messages(config_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_pet_id_idx ON whatsapp_messages(pet_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_status_idx ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS whatsapp_messages_context_idx ON whatsapp_messages(context);
CREATE INDEX IF NOT EXISTS whatsapp_messages_created_at_idx ON whatsapp_messages(created_at);

-- ==========================================
-- Trigger para updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_whatsapp_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS whatsapp_config_updated_at ON whatsapp_config;
CREATE TRIGGER whatsapp_config_updated_at
  BEFORE UPDATE ON whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_config_updated_at();

-- ==========================================
-- Verificação
-- ==========================================

SELECT 
  'whatsapp_config' as tabela,
  COUNT(*) as registros
FROM whatsapp_config
UNION ALL
SELECT 
  'whatsapp_messages' as tabela,
  COUNT(*) as registros
FROM whatsapp_messages;
