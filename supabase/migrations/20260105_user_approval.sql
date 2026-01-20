-- Adicionar campo de aprovação para usuários
-- Usuários internos precisam ser aprovados pelo admin para acessar o sistema

-- Adicionar coluna se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'approval_status') THEN
        ALTER TABLE users ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending' NOT NULL;
    END IF;
END $$;

-- Atualizar usuários existentes (admins ficam aprovados, demais usuários também)
UPDATE users SET approval_status = 'approved' WHERE role = 'admin';
UPDATE users SET approval_status = 'approved'
  WHERE role IN ('defensor', 'estagiario', 'servidor')
    AND approval_status = 'pending';

-- Comentário para documentação
COMMENT ON COLUMN users.approval_status IS 'Status de aprovação do usuário: pending, approved, rejected';

