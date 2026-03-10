-- WhatsApp Templates + Contact Enhancements
-- Fase 1: WhatsApp Defender

-- ===========================================
-- TABELA: whatsapp_templates
-- ===========================================

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  shortcut VARCHAR(50),
  category VARCHAR(50) NOT NULL DEFAULT 'geral',
  content TEXT NOT NULL,
  variables TEXT[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS whatsapp_templates_shortcut_idx ON whatsapp_templates(shortcut);
CREATE INDEX IF NOT EXISTS whatsapp_templates_category_idx ON whatsapp_templates(category);

-- ===========================================
-- ALTER: whatsapp_contacts (novos campos)
-- ===========================================

-- Preview da última mensagem na lista de conversas
ALTER TABLE whatsapp_contacts
  ADD COLUMN IF NOT EXISTS last_message_content TEXT,
  ADD COLUMN IF NOT EXISTS last_message_direction VARCHAR(10),
  ADD COLUMN IF NOT EXISTS last_message_type VARCHAR(20);

-- Identificação do interlocutor (próprio assistido, familiar, testemunha, etc.)
ALTER TABLE whatsapp_contacts
  ADD COLUMN IF NOT EXISTS contact_relation VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contact_relation_detail TEXT;
