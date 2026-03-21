-- Adicionar comarca_id em profissionais
ALTER TABLE profissionais
  ADD COLUMN IF NOT EXISTS comarca_id INTEGER REFERENCES comarcas(id) DEFAULT 1;

-- Preencher todos os existentes com comarca 1 (Camaçari)
UPDATE profissionais SET comarca_id = 1 WHERE comarca_id IS NULL;

-- Tornar NOT NULL
ALTER TABLE profissionais ALTER COLUMN comarca_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS profissionais_comarca_id_idx ON profissionais(comarca_id);

-- Adicionar comarca_id em escalas_atribuicao
ALTER TABLE escalas_atribuicao
  ADD COLUMN IF NOT EXISTS comarca_id INTEGER REFERENCES comarcas(id) DEFAULT 1;

-- Preencher todos os existentes com comarca 1 (Camaçari)
UPDATE escalas_atribuicao SET comarca_id = 1 WHERE comarca_id IS NULL;

-- Tornar NOT NULL
ALTER TABLE escalas_atribuicao ALTER COLUMN comarca_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS escalas_comarca_id_idx ON escalas_atribuicao(comarca_id);
