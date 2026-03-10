-- Função para buscar assistidos por similaridade de nome usando pg_trgm
-- Usada pelo enrichment-engine/services/radar_matching_service.py

CREATE OR REPLACE FUNCTION search_assistidos_trgm(
  search_name TEXT,
  min_similarity FLOAT DEFAULT 0.3,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  id INT,
  nome TEXT,
  endereco TEXT,
  cpf TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a.id,
    a.nome,
    a.endereco,
    a.cpf,
    similarity(a.nome, search_name) AS similarity
  FROM assistidos a
  WHERE a.deleted_at IS NULL
    AND similarity(a.nome, search_name) >= min_similarity
  ORDER BY similarity(a.nome, search_name) DESC
  LIMIT max_results;
$$;
