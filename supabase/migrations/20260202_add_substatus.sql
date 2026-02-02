-- Adiciona coluna substatus para guardar o status granular da planilha
-- (elaborar, revisar, buscar, analisar, etc.)
-- O campo status (enum) continua como grupo principal (2_ATENDER, 5_FILA, etc.)

ALTER TABLE demandas ADD COLUMN IF NOT EXISTS substatus VARCHAR(50);

COMMENT ON COLUMN demandas.substatus IS 'Status granular importado da planilha: elaborar, revisar, buscar, analisar, etc.';
