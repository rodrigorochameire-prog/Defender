-- Add reply_to_id column for quoted message replies
ALTER TABLE whatsapp_chat_messages ADD COLUMN IF NOT EXISTS reply_to_id VARCHAR(200);
