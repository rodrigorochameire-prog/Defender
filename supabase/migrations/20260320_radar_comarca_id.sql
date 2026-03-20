BEGIN;

ALTER TABLE radar_noticias ADD COLUMN IF NOT EXISTS comarca_id INTEGER REFERENCES comarcas(id) DEFAULT 1 NOT NULL;
UPDATE radar_noticias SET comarca_id = 1 WHERE comarca_id IS NULL;
CREATE INDEX IF NOT EXISTS radar_noticias_comarca_id_idx ON radar_noticias(comarca_id);

ALTER TABLE radar_noticias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access" ON radar_noticias;
CREATE POLICY "service_role_full_access" ON radar_noticias FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "postgres_full_access" ON radar_noticias;
CREATE POLICY "postgres_full_access" ON radar_noticias FOR ALL TO postgres USING (true) WITH CHECK (true);

COMMIT;
