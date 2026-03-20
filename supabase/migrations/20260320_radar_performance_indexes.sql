-- Performance: índices compostos para o feed do Radar Criminal
-- O feed filtra por enrichmentStatus != 'pending' e ordena por dataPublicacao DESC

-- Índice composto principal: filtro de status + ordenação por data
CREATE INDEX CONCURRENTLY IF NOT EXISTS radar_noticias_status_datapub_idx
  ON radar_noticias (enrichment_status, data_publicacao DESC NULLS LAST);

-- Índice composto com relevância (para o score floor default = 60)
CREATE INDEX CONCURRENTLY IF NOT EXISTS radar_noticias_status_relevancia_datapub_idx
  ON radar_noticias (enrichment_status, relevancia_score DESC, data_publicacao DESC NULLS LAST);

-- Índice para busca de matches pendentes (matchesPendentesByNoticias)
CREATE INDEX CONCURRENTLY IF NOT EXISTS radar_matches_noticia_status_idx
  ON radar_matches (noticia_id, status);
