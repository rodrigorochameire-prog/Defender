-- Lugares: Camada 1 entidade cruzável

CREATE TABLE IF NOT EXISTS lugares (
  id                               serial PRIMARY KEY,
  workspace_id                     int NOT NULL REFERENCES workspaces(id),
  logradouro                       text,
  numero                           varchar(30),
  complemento                      varchar(120),
  bairro                           varchar(120),
  cidade                           varchar(120) DEFAULT 'Camaçari',
  uf                               char(2) DEFAULT 'BA',
  cep                              varchar(9),
  latitude                         numeric(10,7),
  longitude                        numeric(10,7),
  endereco_completo                text,
  endereco_normalizado             text NOT NULL,
  observacoes                      text,
  fonte_criacao                    varchar(40),
  confidence                       numeric(3,2) DEFAULT 0.9,
  merged_into                      int REFERENCES lugares(id),
  geocoded_at                      timestamptz,
  geocoding_source                 varchar(30),
  created_at                       timestamptz DEFAULT now(),
  updated_at                       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lugares_workspace ON lugares(workspace_id);
CREATE INDEX IF NOT EXISTS lugares_normalizado ON lugares(endereco_normalizado) WHERE merged_into IS NULL;
CREATE INDEX IF NOT EXISTS lugares_bairro_trgm ON lugares USING gin(bairro gin_trgm_ops);
CREATE INDEX IF NOT EXISTS lugares_logradouro_trgm ON lugares USING gin(logradouro gin_trgm_ops);
CREATE INDEX IF NOT EXISTS lugares_geo ON lugares(latitude, longitude) WHERE latitude IS NOT NULL;

DO $$ BEGIN
  CREATE TYPE lugar_tipo_participacao AS ENUM (
    'local-do-fato',
    'endereco-assistido',
    'residencia-agressor',
    'trabalho-agressor',
    'local-atendimento',
    'radar-noticia'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS participacoes_lugar (
  id                serial PRIMARY KEY,
  lugar_id          int NOT NULL REFERENCES lugares(id),
  processo_id       int REFERENCES processos(id),
  pessoa_id         int REFERENCES pessoas(id),
  tipo              lugar_tipo_participacao NOT NULL,
  data_relacionada  date,
  source_table      varchar(40),
  source_id         int,
  fonte             varchar(30) NOT NULL,
  confidence        numeric(3,2) DEFAULT 0.9,
  created_at        timestamptz DEFAULT now(),
  UNIQUE (lugar_id, processo_id, tipo, source_table, source_id)
);

CREATE INDEX IF NOT EXISTS participacoes_lugar_lugar ON participacoes_lugar(lugar_id);
CREATE INDEX IF NOT EXISTS participacoes_lugar_processo ON participacoes_lugar(processo_id) WHERE processo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS participacoes_lugar_pessoa ON participacoes_lugar(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS participacoes_lugar_tipo ON participacoes_lugar(tipo);

CREATE TABLE IF NOT EXISTS lugares_distincts_confirmed (
  id              serial PRIMARY KEY,
  lugar_a_id      int NOT NULL,
  lugar_b_id      int NOT NULL,
  confirmed_by    int REFERENCES users(id),
  confirmed_at    timestamptz DEFAULT now(),
  UNIQUE (lugar_a_id, lugar_b_id),
  CHECK (lugar_a_id < lugar_b_id)
);

CREATE TABLE IF NOT EXISTS lugares_access_log (
  id          bigserial PRIMARY KEY,
  lugar_id    int REFERENCES lugares(id),
  user_id     int REFERENCES users(id),
  action      varchar(40) NOT NULL,
  context     jsonb,
  ts          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lugares_access_log_user_ts ON lugares_access_log(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS lugares_access_log_lugar ON lugares_access_log(lugar_id);
