-- ==========================================
-- PREPARAÇÃO PRÉ-JÚRI: Schema Extensions
-- ==========================================

-- 1. Nova tabela: quesitos
CREATE TABLE IF NOT EXISTS quesitos (
  id SERIAL PRIMARY KEY,
  caso_id INTEGER REFERENCES casos(id) ON DELETE CASCADE,
  sessao_juri_id INTEGER REFERENCES sessoes_juri(id) ON DELETE SET NULL,

  numero INTEGER NOT NULL,
  texto TEXT NOT NULL,
  tipo VARCHAR(30), -- 'materialidade' | 'autoria' | 'absolvicao' | 'causa_diminuicao' | 'qualificadora' | 'privilegio' | 'atenuante' | 'agravante'
  origem VARCHAR(20), -- 'obrigatorio' | 'acusacao' | 'defesa'

  tese_id INTEGER REFERENCES teses_defensivas(id) ON DELETE SET NULL,

  argumentacao_sim TEXT,
  argumentacao_nao TEXT,

  depende_de INTEGER, -- self-reference ao quesito pai
  condicao_pai VARCHAR(5), -- 'sim' | 'nao'

  gerado_por_ia BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS quesitos_caso_id_idx ON quesitos(caso_id);
CREATE INDEX IF NOT EXISTS quesitos_sessao_juri_id_idx ON quesitos(sessao_juri_id);
CREATE INDEX IF NOT EXISTS quesitos_tipo_idx ON quesitos(tipo);
CREATE INDEX IF NOT EXISTS quesitos_numero_idx ON quesitos(numero);

-- 2. Estender personagens_juri com estatísticas
ALTER TABLE personagens_juri ADD COLUMN IF NOT EXISTS total_condenacoes INTEGER DEFAULT 0;
ALTER TABLE personagens_juri ADD COLUMN IF NOT EXISTS total_absolvicoes INTEGER DEFAULT 0;
ALTER TABLE personagens_juri ADD COLUMN IF NOT EXISTS total_desclassificacoes INTEGER DEFAULT 0;
ALTER TABLE personagens_juri ADD COLUMN IF NOT EXISTS tempo_medio_sustentacao INTEGER;
ALTER TABLE personagens_juri ADD COLUMN IF NOT EXISTS argumentos_preferidos JSONB;
ALTER TABLE personagens_juri ADD COLUMN IF NOT EXISTS teses_vulneraveis JSONB;
ALTER TABLE personagens_juri ADD COLUMN IF NOT EXISTS notas_estrategicas TEXT;
ALTER TABLE personagens_juri ADD COLUMN IF NOT EXISTS ultima_sessao_data TIMESTAMP;

-- 3. Estender sessoes_juri com resultado de simulação IA
ALTER TABLE sessoes_juri ADD COLUMN IF NOT EXISTS simulacao_resultado JSONB;
