-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Embeddings table for semantic search on drive_files content
CREATE TABLE IF NOT EXISTS document_embeddings (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES drive_files(id) ON DELETE CASCADE,
  assistido_id INTEGER REFERENCES assistidos(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL, -- text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS document_embeddings_file_idx ON document_embeddings(file_id);
CREATE INDEX IF NOT EXISTS document_embeddings_assistido_idx ON document_embeddings(assistido_id);

-- IVFFlat index for approximate nearest neighbor search
-- Note: needs at least ~100 rows to be effective, will work without but slower
CREATE INDEX IF NOT EXISTS document_embeddings_vector_idx ON document_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- GIN index for text search with pg_trgm
CREATE INDEX IF NOT EXISTS document_embeddings_text_trgm_idx ON document_embeddings
  USING gin (chunk_text gin_trgm_ops);

-- Function for hybrid search (semantic + text)
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  query_text TEXT DEFAULT '',
  match_assistido_id INTEGER DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id INTEGER,
  file_id INTEGER,
  assistido_id INTEGER,
  chunk_index INTEGER,
  chunk_text TEXT,
  metadata JSONB,
  semantic_similarity FLOAT,
  text_similarity FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.file_id,
    de.assistido_id,
    de.chunk_index,
    de.chunk_text,
    de.metadata,
    (1 - (de.embedding <=> query_embedding))::FLOAT as semantic_similarity,
    CASE
      WHEN query_text = '' THEN 0.0
      ELSE similarity(de.chunk_text, query_text)::FLOAT
    END as text_similarity,
    (
      (1 - (de.embedding <=> query_embedding)) * 0.7 +
      CASE
        WHEN query_text = '' THEN 0.0
        ELSE similarity(de.chunk_text, query_text) * 0.3
      END
    )::FLOAT as combined_score
  FROM document_embeddings de
  WHERE
    (match_assistido_id IS NULL OR de.assistido_id = match_assistido_id)
    AND (1 - (de.embedding <=> query_embedding)) > match_threshold
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;
