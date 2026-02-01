-- Migration: WhatsApp Business Integration
-- Autor: DefensorHub
-- Data: 2026-01-31
-- Descrição: Adiciona tabelas para integração com WhatsApp Business API (Meta)

-- ==========================================
-- TABELA: whatsapp_config
-- Configurações de integração WhatsApp por admin
-- ==========================================

CREATE TABLE IF NOT EXISTS whatsapp_config (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  
  -- Credenciais (criptografadas em produção)
  access_token TEXT,
  phone_number_id TEXT,
  business_account_id TEXT,
  webhook_verify_token TEXT,
  
  -- Informações do número
  display_phone_number TEXT,
  verified_name TEXT,
  quality_rating VARCHAR(20),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMP,
  
  -- Configurações de automação
  auto_notify_prazo BOOLEAN NOT NULL DEFAULT FALSE,
  auto_notify_audiencia BOOLEAN NOT NULL DEFAULT FALSE,
  auto_notify_juri BOOLEAN NOT NULL DEFAULT FALSE,
  auto_notify_movimentacao BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadados
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS whatsapp_config_admin_id_idx ON whatsapp_config(admin_id);
CREATE INDEX IF NOT EXISTS whatsapp_config_is_active_idx ON whatsapp_config(is_active);

-- ==========================================
-- TABELA: whatsapp_messages
-- Histórico de mensagens enviadas
-- ==========================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  config_id INTEGER NOT NULL REFERENCES whatsapp_config(id) ON DELETE CASCADE,
  
  -- Destinatário
  to_phone TEXT NOT NULL,
  to_name TEXT,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  
  -- Mensagem
  message_type VARCHAR(50) NOT NULL,
  template_name TEXT,
  content TEXT,
  
  -- Status da mensagem
  message_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  
  -- Contexto da mensagem
  context VARCHAR(50), -- 'prazo' | 'audiencia' | 'juri' | 'movimentacao' | 'manual'
  sent_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS whatsapp_messages_config_id_idx ON whatsapp_messages(config_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_assistido_id_idx ON whatsapp_messages(assistido_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_status_idx ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS whatsapp_messages_context_idx ON whatsapp_messages(context);
CREATE INDEX IF NOT EXISTS whatsapp_messages_created_at_idx ON whatsapp_messages(created_at);

-- ==========================================
-- POLÍTICAS RLS (Row Level Security)
-- ==========================================

-- Habilitar RLS
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_config
CREATE POLICY "Admin pode ver e gerenciar sua configuração"
  ON whatsapp_config
  FOR ALL
  USING (admin_id = (SELECT id FROM users WHERE supabase_id = auth.uid()))
  WITH CHECK (admin_id = (SELECT id FROM users WHERE supabase_id = auth.uid()));

-- Políticas para whatsapp_messages
CREATE POLICY "Admin pode ver mensagens de sua configuração"
  ON whatsapp_messages
  FOR SELECT
  USING (config_id IN (
    SELECT id FROM whatsapp_config 
    WHERE admin_id = (SELECT id FROM users WHERE supabase_id = auth.uid())
  ));

CREATE POLICY "Admin pode inserir mensagens"
  ON whatsapp_messages
  FOR INSERT
  WITH CHECK (config_id IN (
    SELECT id FROM whatsapp_config 
    WHERE admin_id = (SELECT id FROM users WHERE supabase_id = auth.uid())
  ));

CREATE POLICY "Admin pode atualizar mensagens"
  ON whatsapp_messages
  FOR UPDATE
  USING (config_id IN (
    SELECT id FROM whatsapp_config 
    WHERE admin_id = (SELECT id FROM users WHERE supabase_id = auth.uid())
  ));

-- ==========================================
-- COMENTÁRIOS DE DOCUMENTAÇÃO
-- ==========================================

COMMENT ON TABLE whatsapp_config IS 'Configurações de integração WhatsApp Business por admin';
COMMENT ON COLUMN whatsapp_config.access_token IS 'Token de acesso da API Meta (manter seguro)';
COMMENT ON COLUMN whatsapp_config.phone_number_id IS 'ID do número de telefone no Meta Business';
COMMENT ON COLUMN whatsapp_config.webhook_verify_token IS 'Token para verificar webhooks do Meta';
COMMENT ON COLUMN whatsapp_config.auto_notify_prazo IS 'Habilita notificação automática de prazos';
COMMENT ON COLUMN whatsapp_config.auto_notify_audiencia IS 'Habilita notificação automática de audiências';
COMMENT ON COLUMN whatsapp_config.auto_notify_juri IS 'Habilita notificação automática de sessões do júri';

COMMENT ON TABLE whatsapp_messages IS 'Histórico de mensagens enviadas via WhatsApp';
COMMENT ON COLUMN whatsapp_messages.context IS 'Contexto: prazo, audiencia, juri, movimentacao, manual';
COMMENT ON COLUMN whatsapp_messages.status IS 'Status: pending, sent, delivered, read, failed';

-- ==========================================
-- INSTRUÇÕES DE CONFIGURAÇÃO
-- ==========================================

/*
CONFIGURAÇÃO DA INTEGRAÇÃO WHATSAPP BUSINESS:

1. CRIAR CONTA NO META BUSINESS:
   - Acesse: https://business.facebook.com
   - Crie uma conta Business ou use existente
   
2. CONFIGURAR WHATSAPP BUSINESS API:
   - Acesse: https://developers.facebook.com/apps/
   - Crie um novo app ou selecione existente
   - Adicione o produto "WhatsApp"
   - Configure um número de teste ou produção

3. OBTER CREDENCIAIS:
   - Phone Number ID: encontre em "Configuração da API"
   - Access Token: gere um token de acesso permanente
   - Business Account ID: encontre nas configurações

4. CONFIGURAR WEBHOOK:
   - URL: https://seu-dominio.com/api/webhooks/whatsapp
   - Token de verificação: gere no DefensorHub
   - Campos: messages, message_template_status_update

5. INSERIR NO DEFENSORHUB:
   - Acesse: /admin/whatsapp
   - Cole as credenciais
   - Ative a integração
   - Teste enviando uma mensagem

CUSTOS:
- Meta cobra por conversação iniciada (não por mensagem)
- Preços variam por país: https://developers.facebook.com/docs/whatsapp/pricing
*/
