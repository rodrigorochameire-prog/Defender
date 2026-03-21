-- supabase/migrations/20260321_defensor_parceiros.sql

CREATE TABLE IF NOT EXISTS defensor_parceiros (
  id SERIAL PRIMARY KEY,
  defensor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parceiro_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT defensor_parceiros_unique UNIQUE (defensor_id, parceiro_id),
  CONSTRAINT defensor_parceiros_no_self CHECK (defensor_id != parceiro_id)
);

CREATE INDEX IF NOT EXISTS defensor_parceiros_defensor_idx ON defensor_parceiros(defensor_id);
CREATE INDEX IF NOT EXISTS defensor_parceiros_parceiro_idx ON defensor_parceiros(parceiro_id);

-- Seed: Rodrigo (id=1) e Juliane (id=4) são parceiros
-- Inserir ambas as direções para facilitar o JOIN
INSERT INTO defensor_parceiros (defensor_id, parceiro_id)
VALUES (1, 4), (4, 1)
ON CONFLICT DO NOTHING;
