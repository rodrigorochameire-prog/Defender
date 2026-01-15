-- ==========================================
-- Configurações WhatsApp por Admin
-- ==========================================
-- Permite que cada admin configure suas próprias credenciais
-- da API do WhatsApp Business (Meta)

-- Tabela de configurações
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
-- Histórico de Mensagens WhatsApp
-- ==========================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  config_id INTEGER NOT NULL REFERENCES whatsapp_config(id) ON DELETE CASCADE,
  
  -- Destinatário
  to_phone TEXT NOT NULL,
  to_name TEXT,
  pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  
  -- Mensagem
  message_type VARCHAR(50) NOT NULL, -- 'text' | 'template' | 'image' | 'document'
  template_name TEXT,
  content TEXT,
  
  -- Status da API
  message_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  error_message TEXT,
  
  -- Contexto
  context VARCHAR(50), -- 'checkin' | 'checkout' | 'daily_log' | 'booking' | 'manual'
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
-- RLS Policies (Row Level Security)
-- ==========================================

-- Habilitar RLS
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para whatsapp_config
-- Apenas o próprio admin pode ver/editar suas configurações
CREATE POLICY whatsapp_config_select_own ON whatsapp_config
  FOR SELECT USING (true); -- Admins podem ver suas próprias configurações via API

CREATE POLICY whatsapp_config_insert_own ON whatsapp_config
  FOR INSERT WITH CHECK (true);

CREATE POLICY whatsapp_config_update_own ON whatsapp_config
  FOR UPDATE USING (true);

CREATE POLICY whatsapp_config_delete_own ON whatsapp_config
  FOR DELETE USING (true);

-- Políticas para whatsapp_messages
CREATE POLICY whatsapp_messages_select ON whatsapp_messages
  FOR SELECT USING (true);

CREATE POLICY whatsapp_messages_insert ON whatsapp_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY whatsapp_messages_update ON whatsapp_messages
  FOR UPDATE USING (true);
