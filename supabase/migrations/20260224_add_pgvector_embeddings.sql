-- Migration: Enable pgvector + Create embeddings table + Add conteudo_completo
-- Task 1 of Semantic Search feature for OMBUDS
-- Date: 2024-02-24

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Centralized embeddings table for semantic search
CREATE TABLE embeddings (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE SET NULL,
  processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
  chunk_index INTEGER DEFAULT 0,
  content_text TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_embeddings_hnsw ON embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_embeddings_entity ON embeddings (entity_type, entity_id);
CREATE INDEX idx_embeddings_assistido ON embeddings (assistido_id) WHERE assistido_id IS NOT NULL;
CREATE INDEX idx_embeddings_processo ON embeddings (processo_id) WHERE processo_id IS NOT NULL;

-- Store full Docling markdown in documentos (currently discarded after OCR)
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS conteudo_completo TEXT;

-- RPC function for semantic search via pgvector
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding vector(768),
  filter_assistido_id INTEGER DEFAULT NULL,
  filter_processo_id INTEGER DEFAULT NULL,
  filter_entity_types TEXT[] DEFAULT NULL,
  match_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id INTEGER,
  entity_type TEXT,
  entity_id INTEGER,
  assistido_id INTEGER,
  processo_id INTEGER,
  chunk_index INTEGER,
  content_text TEXT,
  metadata JSONB,
  score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_type,
    e.entity_id,
    e.assistido_id,
    e.processo_id,
    e.chunk_index,
    e.content_text,
    e.metadata,
    (1 - (e.embedding <=> query_embedding))::FLOAT AS score
  FROM embeddings e
  WHERE
    (filter_assistido_id IS NULL OR e.assistido_id = filter_assistido_id)
    AND (filter_processo_id IS NULL OR e.processo_id = filter_processo_id)
    AND (filter_entity_types IS NULL OR e.entity_type = ANY(filter_entity_types))
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;
