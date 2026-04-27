CREATE TABLE IF NOT EXISTS objetos_apreendidos (
  id                    serial PRIMARY KEY,
  workspace_id          int NOT NULL REFERENCES workspaces(id),
  tipo                  varchar(60) NOT NULL,           -- 'arma-fogo' | 'munição' | 'droga' | 'celular' | 'veiculo' | 'dinheiro' | 'outro'
  descricao             text NOT NULL,                   -- 'Pistola Taurus 9mm' ou 'Maconha 50g'
  marca                 varchar(80),
  modelo                varchar(80),
  numero_serie          varchar(80),
  quantidade            numeric(10,2),
  unidade               varchar(20),                     -- 'g' | 'kg' | 'unidades' | 'cm³' | etc
  observacoes           text,
  fonte_criacao         varchar(40),
  confidence            numeric(3,2) DEFAULT 0.9,
  merged_into           int REFERENCES objetos_apreendidos(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS objetos_apreendidos_workspace ON objetos_apreendidos(workspace_id);
CREATE INDEX IF NOT EXISTS objetos_apreendidos_tipo ON objetos_apreendidos(tipo);
CREATE INDEX IF NOT EXISTS objetos_apreendidos_descricao_trgm ON objetos_apreendidos USING gin(descricao gin_trgm_ops);

CREATE TABLE IF NOT EXISTS participacoes_objeto (
  id                  serial PRIMARY KEY,
  objeto_id           int NOT NULL REFERENCES objetos_apreendidos(id),
  processo_id         int REFERENCES processos(id),
  pessoa_id           int REFERENCES pessoas(id),
  papel               varchar(40),                       -- 'apreendido-com' | 'objeto-do-crime' | 'instrumento-do-crime' | 'produto-do-crime'
  data_apreensao      date,
  local_apreensao     varchar(200),
  fonte               varchar(30) NOT NULL DEFAULT 'manual',
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS participacoes_objeto_objeto ON participacoes_objeto(objeto_id);
CREATE INDEX IF NOT EXISTS participacoes_objeto_processo ON participacoes_objeto(processo_id) WHERE processo_id IS NOT NULL;
