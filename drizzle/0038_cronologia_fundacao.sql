-- Cronologia Processual · Fase IV-A · Camada 2 (atributos estruturados)

DO $$ BEGIN
  CREATE TYPE marco_tipo AS ENUM (
    'fato','apf','audiencia-custodia','denuncia','recebimento-denuncia',
    'resposta-acusacao','aij-designada','aij-realizada','memoriais',
    'sentenca','recurso-interposto','acordao-recurso','transito-julgado',
    'execucao-inicio','outro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE prisao_tipo AS ENUM ('flagrante','temporaria','preventiva','decorrente-sentenca','outro');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE prisao_situacao AS ENUM ('ativa','relaxada','revogada','extinta','cumprida','convertida-em-preventiva');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE cautelar_tipo AS ENUM (
    'monitoramento-eletronico','comparecimento-periodico','recolhimento-noturno',
    'proibicao-contato','proibicao-frequentar','afastamento-lar','fianca',
    'suspensao-porte-arma','suspensao-habilitacao','outro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE cautelar_status AS ENUM ('ativa','cumprida','descumprida','revogada','extinta');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS marcos_processuais (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  tipo                     marco_tipo NOT NULL,
  data                     date NOT NULL,
  documento_referencia     text,
  observacoes              text,
  fonte                    varchar(30) NOT NULL,
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marcos_processuais_processo ON marcos_processuais(processo_id);
CREATE INDEX IF NOT EXISTS marcos_processuais_data ON marcos_processuais(data);
CREATE INDEX IF NOT EXISTS marcos_processuais_tipo ON marcos_processuais(tipo);

CREATE TABLE IF NOT EXISTS prisoes (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  pessoa_id                int REFERENCES pessoas(id),
  tipo                     prisao_tipo NOT NULL,
  data_inicio              date NOT NULL,
  data_fim                 date,
  motivo                   text,
  unidade                  varchar(200),
  situacao                 prisao_situacao NOT NULL DEFAULT 'ativa',
  fonte                    varchar(30) NOT NULL,
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prisoes_processo ON prisoes(processo_id);
CREATE INDEX IF NOT EXISTS prisoes_pessoa ON prisoes(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS prisoes_situacao ON prisoes(situacao);

CREATE TABLE IF NOT EXISTS cautelares (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  pessoa_id                int REFERENCES pessoas(id),
  tipo                     cautelar_tipo NOT NULL,
  data_inicio              date NOT NULL,
  data_fim                 date,
  detalhes                 text,
  status                   cautelar_status NOT NULL DEFAULT 'ativa',
  fonte                    varchar(30) NOT NULL,
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cautelares_processo ON cautelares(processo_id);
CREATE INDEX IF NOT EXISTS cautelares_pessoa ON cautelares(pessoa_id) WHERE pessoa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cautelares_status ON cautelares(status);
