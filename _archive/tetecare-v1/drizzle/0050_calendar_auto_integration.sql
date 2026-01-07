/*
  # Integração Automática com Calendário

  1. Novos Campos
    - `linkedResourceType` - Tipo do recurso vinculado (medicamento, vacina, preventivo, log)
    - `linkedResourceId` - ID do recurso vinculado
    - `autoCreated` - Flag para indicar se foi criado automaticamente

  2. Motivo
    - Permitir integração automática de medicamentos, vacinas, preventivos e logs com o calendário
    - Rastrear qual recurso originou cada evento
    - Identificar eventos criados automaticamente vs. manualmente

  3. Benefícios
    - Visualização unificada de todos os cuidados do pet no calendário
    - Sincronização automática entre sistemas
    - Histórico completo e organizado
*/

-- Adicionar colunas de integração à tabela calendar_events
ALTER TABLE calendar_events
ADD COLUMN linkedResourceType ENUM('medication', 'vaccine', 'preventive_flea', 'preventive_deworming', 'health_log') AFTER logIds,
ADD COLUMN linkedResourceId INT AFTER linkedResourceType,
ADD COLUMN autoCreated BOOLEAN NOT NULL DEFAULT FALSE AFTER linkedResourceId;

-- Adicionar índice para melhorar performance de consultas
CREATE INDEX idx_linked_resource ON calendar_events(linkedResourceType, linkedResourceId);
CREATE INDEX idx_auto_created ON calendar_events(autoCreated);
