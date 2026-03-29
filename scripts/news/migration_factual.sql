-- ==========================================
-- NOTÍCIAS FACTUAIS — Diário da Bahia
-- Execute no Supabase SQL Editor
-- ==========================================

-- 1. Edições do jornal
CREATE TABLE IF NOT EXISTS factual_edicoes (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL DEFAULT 'Diário da Bahia',
  subtitulo VARCHAR(300),
  data_edicao TIMESTAMP NOT NULL,
  total_artigos INTEGER NOT NULL DEFAULT 0,
  secoes JSONB DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'rascunho',
  publicado_por INTEGER REFERENCES users(id),
  publicado_em TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS factual_edicoes_data_idx ON factual_edicoes(data_edicao);
CREATE INDEX IF NOT EXISTS factual_edicoes_status_idx ON factual_edicoes(status);

-- 2. Artigos do jornal
CREATE TABLE IF NOT EXISTS factual_artigos (
  id SERIAL PRIMARY KEY,
  edicao_id INTEGER NOT NULL REFERENCES factual_edicoes(id) ON DELETE CASCADE,
  secao VARCHAR(50) NOT NULL,
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo_original TEXT,
  fonte_nome VARCHAR(100) NOT NULL,
  fonte_url TEXT NOT NULL,
  imagem_url TEXT,
  autor VARCHAR(200),
  data_publicacao TIMESTAMP,
  ordem INTEGER NOT NULL DEFAULT 0,
  destaque BOOLEAN NOT NULL DEFAULT FALSE,
  tags JSONB DEFAULT '[]',
  query_origem TEXT,
  content_hash TEXT,
  modelo_sumarizacao VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS factual_artigos_edicao_idx ON factual_artigos(edicao_id);
CREATE INDEX IF NOT EXISTS factual_artigos_secao_idx ON factual_artigos(secao);
CREATE INDEX IF NOT EXISTS factual_artigos_fonte_url_idx ON factual_artigos(fonte_url);
CREATE INDEX IF NOT EXISTS factual_artigos_content_hash_idx ON factual_artigos(content_hash);
CREATE INDEX IF NOT EXISTS factual_artigos_edicao_secao_idx ON factual_artigos(edicao_id, secao, ordem);

-- 3. Favoritos
CREATE TABLE IF NOT EXISTS factual_favoritos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artigo_id INTEGER NOT NULL REFERENCES factual_artigos(id) ON DELETE CASCADE,
  nota TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS factual_fav_unique_idx ON factual_favoritos(user_id, artigo_id);
CREATE INDEX IF NOT EXISTS factual_fav_user_idx ON factual_favoritos(user_id);

-- 4. Seções configuráveis (para pipeline)
CREATE TABLE IF NOT EXISTS factual_secoes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(50) NOT NULL,
  contexto TEXT NOT NULL,
  queries JSONB DEFAULT '[]',
  date_restrict VARCHAR(10) NOT NULL DEFAULT 'd3',
  max_artigos INTEGER NOT NULL DEFAULT 5,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  jornal VARCHAR(20) NOT NULL DEFAULT 'factual',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. RLS (básico — desabilitar para facilitar)
ALTER TABLE factual_edicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE factual_artigos ENABLE ROW LEVEL SECURITY;
ALTER TABLE factual_favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE factual_secoes ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para todos autenticados
CREATE POLICY "factual_edicoes_read" ON factual_edicoes FOR SELECT USING (true);
CREATE POLICY "factual_artigos_read" ON factual_artigos FOR SELECT USING (true);
CREATE POLICY "factual_favoritos_own" ON factual_favoritos FOR ALL USING (true);
CREATE POLICY "factual_secoes_read" ON factual_secoes FOR SELECT USING (true);

-- Permitir insert/update/delete via service role (API routes)
CREATE POLICY "factual_edicoes_admin" ON factual_edicoes FOR ALL USING (true);
CREATE POLICY "factual_artigos_admin" ON factual_artigos FOR ALL USING (true);
CREATE POLICY "factual_secoes_admin" ON factual_secoes FOR ALL USING (true);
