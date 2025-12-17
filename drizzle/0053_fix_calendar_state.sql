/*
  # Correção de Estado da Tabela calendar_events

  1. Objetivo
    - Garantir que a tabela calendar_events esteja no estado correto
    - Evitar erros de duplicação
    - Migração idempotente e segura

  2. Estratégia
    - Verificar existência de cada coluna antes de adicionar
    - Não gera erros se executada múltiplas vezes

  3. Segurança
    - Completamente idempotente
    - Pode ser executada quantas vezes for necessário
*/

-- Verificar e adicionar linkedResourceType se não existir
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'calendar_events'
    AND COLUMN_NAME = 'linkedResourceType'
);

SET @sql = IF(@column_exists = 0,
  "ALTER TABLE calendar_events ADD COLUMN linkedResourceType ENUM('medication', 'vaccine', 'preventive_flea', 'preventive_deworming', 'health_log') AFTER logIds",
  "SELECT 'linkedResourceType já existe' AS status"
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar linkedResourceId se não existir
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'calendar_events'
    AND COLUMN_NAME = 'linkedResourceId'
);

SET @sql = IF(@column_exists = 0,
  "ALTER TABLE calendar_events ADD COLUMN linkedResourceId INT AFTER linkedResourceType",
  "SELECT 'linkedResourceId já existe' AS status"
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar e adicionar autoCreated se não existir
SET @column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'calendar_events'
    AND COLUMN_NAME = 'autoCreated'
);

SET @sql = IF(@column_exists = 0,
  "ALTER TABLE calendar_events ADD COLUMN autoCreated BOOLEAN NOT NULL DEFAULT FALSE AFTER linkedResourceId",
  "SELECT 'autoCreated já existe' AS status"
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
