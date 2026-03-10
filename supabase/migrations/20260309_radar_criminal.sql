-- Radar Criminal: monitoramento de notícias policiais + matching com assistidos DPE
-- Tabelas: radar_noticias, radar_matches, radar_fontes

-- ==========================================
-- ENUMS
-- ==========================================

DO $$ BEGIN
  CREATE TYPE tipo_crime_radar AS ENUM (
    'homicidio', 'tentativa_homicidio', 'trafico', 'roubo', 'furto',
    'violencia_domestica', 'sexual', 'lesao_corporal', 'porte_arma',
    'estelionato', 'outros'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE circunstancia_radar AS ENUM (
    'flagrante', 'mandado', 'denuncia', 'operacao', 'investigacao', 'julgamento'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE radar_match_status AS ENUM (
    'auto_confirmado', 'possivel', 'descartado', 'confirmado_manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE radar_enrichment_status AS ENUM (
    'pending', 'extracted', 'matched', 'analyzed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE radar_fonte_tipo AS ENUM (
    'portal', 'instagram', 'twitter', 'facebook'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================
-- TABELA: radar_noticias
-- ==========================================

CREATE TABLE IF NOT EXISTS radar_noticias (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  fonte VARCHAR(100) NOT NULL,
  titulo TEXT NOT NULL,
  corpo TEXT,
  data_publicacao TIMESTAMPTZ,
  data_fato TIMESTAMPTZ,
  imagem_url TEXT,
  tipo_crime tipo_crime_radar,
  bairro TEXT,
  logradouro TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  delegacia TEXT,
  circunstancia circunstancia_radar,
  artigos_penais JSONB,
  arma_meio TEXT,
  resumo_ia TEXT,
  envolvidos JSONB,
  enrichment_status radar_enrichment_status NOT NULL DEFAULT 'pending',
  analysis_sonnet JSONB,
  raw_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS radar_noticias_tipo_crime_idx ON radar_noticias (tipo_crime);
CREATE INDEX IF NOT EXISTS radar_noticias_data_fato_idx ON radar_noticias (data_fato);
CREATE INDEX IF NOT EXISTS radar_noticias_bairro_idx ON radar_noticias (bairro);
CREATE INDEX IF NOT EXISTS radar_noticias_enrichment_status_idx ON radar_noticias (enrichment_status);
CREATE INDEX IF NOT EXISTS radar_noticias_fonte_idx ON radar_noticias (fonte);
CREATE INDEX IF NOT EXISTS radar_noticias_created_at_idx ON radar_noticias (created_at);

-- Trigram index para busca fuzzy de bairro (requer pg_trgm já habilitado)
CREATE INDEX IF NOT EXISTS radar_noticias_bairro_trgm_idx ON radar_noticias USING gin (bairro gin_trgm_ops);

-- GIN index para busca em JSONB de envolvidos
CREATE INDEX IF NOT EXISTS radar_noticias_envolvidos_gin_idx ON radar_noticias USING gin (envolvidos);

-- ==========================================
-- TABELA: radar_matches
-- ==========================================

CREATE TABLE IF NOT EXISTS radar_matches (
  id SERIAL PRIMARY KEY,
  noticia_id INTEGER NOT NULL REFERENCES radar_noticias(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
  caso_id INTEGER REFERENCES casos(id) ON DELETE SET NULL,
  nome_encontrado TEXT NOT NULL,
  score_confianca INTEGER NOT NULL DEFAULT 0,
  status radar_match_status NOT NULL DEFAULT 'possivel',
  dados_extraidos JSONB,
  confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS radar_matches_noticia_id_idx ON radar_matches (noticia_id);
CREATE INDEX IF NOT EXISTS radar_matches_assistido_id_idx ON radar_matches (assistido_id);
CREATE INDEX IF NOT EXISTS radar_matches_processo_id_idx ON radar_matches (processo_id);
CREATE INDEX IF NOT EXISTS radar_matches_caso_id_idx ON radar_matches (caso_id);
CREATE INDEX IF NOT EXISTS radar_matches_status_idx ON radar_matches (status);
CREATE INDEX IF NOT EXISTS radar_matches_score_idx ON radar_matches (score_confianca);

-- ==========================================
-- TABELA: radar_fontes (configuração de scraping)
-- ==========================================

CREATE TABLE IF NOT EXISTS radar_fontes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  tipo radar_fonte_tipo NOT NULL DEFAULT 'portal',
  url TEXT NOT NULL,
  seletor_titulo TEXT,
  seletor_corpo TEXT,
  seletor_data TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultima_coleta TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- DADOS INICIAIS: fontes de notícias
-- ==========================================

INSERT INTO radar_fontes (nome, tipo, url) VALUES
  ('Camaçari Notícias', 'portal', 'https://www.camacarinoticias.com.br'),
  ('Blog do Valente', 'portal', 'https://www.blogdovalente.com.br'),
  ('Jornal Grande Bahia', 'portal', 'https://www.jornalgrandebahia.com.br'),
  ('Alô Camaçari', 'portal', 'https://www.alocamacari.com'),
  ('Jornal Camaçari', 'portal', 'https://www.jornalcamacari.com.br'),
  ('Bahia Notícias', 'portal', 'https://www.bahianoticias.com.br'),
  ('A Tarde', 'portal', 'https://www.atarde.com.br'),
  ('Correio 24h', 'portal', 'https://www.correio24horas.com.br'),
  ('G1 Bahia', 'portal', 'https://g1.globo.com/ba/bahia'),
  ('BNews', 'portal', 'https://www.bnews.com.br')
ON CONFLICT DO NOTHING;

-- ==========================================
-- RLS
-- ==========================================

ALTER TABLE radar_noticias ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_fontes ENABLE ROW LEVEL SECURITY;

-- Policies (drop + recreate para idempotência)
DO $$ BEGIN
  DROP POLICY IF EXISTS "radar_noticias_read" ON radar_noticias;
  DROP POLICY IF EXISTS "radar_matches_read" ON radar_matches;
  DROP POLICY IF EXISTS "radar_fontes_read" ON radar_fontes;
  DROP POLICY IF EXISTS "radar_noticias_insert" ON radar_noticias;
  DROP POLICY IF EXISTS "radar_noticias_update" ON radar_noticias;
  DROP POLICY IF EXISTS "radar_matches_insert" ON radar_matches;
  DROP POLICY IF EXISTS "radar_matches_update" ON radar_matches;
  DROP POLICY IF EXISTS "radar_fontes_all" ON radar_fontes;
END $$;

-- Leitura para todos autenticados
CREATE POLICY "radar_noticias_read" ON radar_noticias
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "radar_matches_read" ON radar_matches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "radar_fontes_read" ON radar_fontes
  FOR SELECT TO authenticated USING (true);

-- Escrita (service role para enrichment engine, admins via app)
CREATE POLICY "radar_noticias_insert" ON radar_noticias
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "radar_noticias_update" ON radar_noticias
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "radar_matches_insert" ON radar_matches
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "radar_matches_update" ON radar_matches
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "radar_fontes_all" ON radar_fontes
  FOR ALL TO authenticated USING (true);
