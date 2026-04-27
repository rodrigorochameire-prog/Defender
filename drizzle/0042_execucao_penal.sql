CREATE TABLE IF NOT EXISTS execucao_penal (
  id                          serial PRIMARY KEY,
  processo_id                 int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  pessoa_id                   int REFERENCES pessoas(id),
  data_inicio_pena            date,
  data_termino_previsto       date,
  data_progressao_prevista    date,
  data_livramento_previsto    date,
  pena_total_dias             int,
  regime_atual                varchar(20),     -- 'fechado' | 'semiaberto' | 'aberto' | 'preso-provisorio'
  unidade_atual               varchar(200),
  ja_remido_dias              int DEFAULT 0,
  ja_cumprido_dias            int DEFAULT 0,
  observacoes                 text,
  fonte                       varchar(30) NOT NULL DEFAULT 'manual',
  confidence                  numeric(3,2) DEFAULT 0.9,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS execucao_penal_processo ON execucao_penal(processo_id);
CREATE INDEX IF NOT EXISTS execucao_penal_pessoa ON execucao_penal(pessoa_id) WHERE pessoa_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS execucao_penal_eventos (
  id                       serial PRIMARY KEY,
  execucao_id              int NOT NULL REFERENCES execucao_penal(id) ON DELETE CASCADE,
  tipo                     varchar(40) NOT NULL,  -- 'progressao' | 'regressao' | 'livramento' | 'remicao-trabalho' | 'remicao-estudo' | 'falta-disciplinar' | 'outro'
  data                     date NOT NULL,
  detalhes                 text,
  fonte                    varchar(30) NOT NULL DEFAULT 'manual',
  created_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS execucao_penal_eventos_execucao ON execucao_penal_eventos(execucao_id);
CREATE INDEX IF NOT EXISTS execucao_penal_eventos_tipo ON execucao_penal_eventos(tipo);
CREATE INDEX IF NOT EXISTS execucao_penal_eventos_data ON execucao_penal_eventos(data);
