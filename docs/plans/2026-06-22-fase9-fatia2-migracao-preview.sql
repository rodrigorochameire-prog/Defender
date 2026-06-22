-- ============================================================
-- PREVIEW da migração — Fase IX (execução penal), Fatia 2
-- ============================================================
-- NÃO é um arquivo de migração oficial (o repo aplica via `db:push`).
-- É um espelho legível, em SQL, do que `db:push` criaria a partir de
-- src/lib/db/schema/execucao.ts. 100% ADITIVO: só CREATE TYPE + CREATE TABLE.
-- Nenhum ALTER/DROP/UPDATE em tabelas ou dados existentes.
-- Aplicar SOMENTE após autorização: `npm run db:push`.

-- ---------- Enums novos ----------
CREATE TYPE unidade_prisional_tipo AS ENUM
  ('presidio','cadeia-publica','colonia-agricola','casa-albergado','hospital-custodia','penitenciaria','outro');
CREATE TYPE execucao_situacao AS ENUM
  ('preso','domiciliar','livramento-condicional','monitoramento','solto','foragido');
CREATE TYPE execucao_titulo_tipo AS ENUM
  ('condenatoria','condenatoria-c-substituicao','condenatoria-c-suspensao');
CREATE TYPE execucao_evento_tipo AS ENUM
  ('progressao','regressao','reconversao','remissao','detracao','unificacao','saida-temporaria','falta','beneficio-negado','outro');
CREATE TYPE execucao_beneficio_tipo AS ENUM
  ('progressao','livramento-condicional','indulto','comutacao','saida-temporaria','trabalho-externo','remissao','outro');
CREATE TYPE execucao_beneficio_decisao AS ENUM ('pendente','deferido','indeferido');
-- (regime_inicial já existe — reaproveitado em regime_comportado/inicial/atual)

-- ---------- Catálogo: unidades prisionais ----------
CREATE TABLE unidades_prisionais (
  id               serial PRIMARY KEY,
  nome             varchar(200) NOT NULL,
  tipo             unidade_prisional_tipo,
  regime_comportado regime_inicial,
  municipio        varchar(120),
  uf               varchar(2),
  observacoes      text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE INDEX unidades_prisionais_nome_idx ON unidades_prisionais (nome);

-- ---------- Título executivo + situação + contato ----------
CREATE TABLE execucoes_penais (
  id                  serial PRIMARY KEY,
  processo_id         integer NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  assistido_id        integer REFERENCES assistidos(id),
  numero_execucao     varchar(40),
  juizo_execucao      varchar(160),
  sentenca_data       date,
  transito_julgado_data date,
  tipo_titulo         execucao_titulo_tipo,
  pena_anos           integer NOT NULL DEFAULT 0,
  pena_meses          integer NOT NULL DEFAULT 0,
  pena_dias           integer NOT NULL DEFAULT 0,
  regime_inicial      regime_inicial,
  regime_atual        regime_inicial,
  reincidente         boolean NOT NULL DEFAULT false,
  menor_21_no_fato    boolean NOT NULL DEFAULT false,
  maior_70_na_sentenca boolean NOT NULL DEFAULT false,
  inicio_cumprimento  date,
  detracao_dias       integer NOT NULL DEFAULT 0,
  situacao            execucao_situacao NOT NULL DEFAULT 'preso',
  unidade_atual_id    integer REFERENCES unidades_prisionais(id),
  endereco_logradouro varchar(200),
  endereco_numero     varchar(20),
  endereco_bairro     varchar(120),
  endereco_cidade     varchar(120),
  endereco_uf         varchar(2),
  endereco_cep        varchar(9),
  telefone            varchar(20),
  data_ultima_confirmacao_cadastral date,
  observacoes         text,
  origem              varchar(20) DEFAULT 'manual',
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
CREATE INDEX execucoes_penais_processo_id_idx  ON execucoes_penais (processo_id);
CREATE INDEX execucoes_penais_assistido_id_idx ON execucoes_penais (assistido_id);
CREATE INDEX execucoes_penais_situacao_idx     ON execucoes_penais (situacao);

-- ---------- Cronologia executiva (eventos) ----------
CREATE TABLE execucao_eventos (
  id           serial PRIMARY KEY,
  execucao_id  integer NOT NULL REFERENCES execucoes_penais(id) ON DELETE CASCADE,
  tipo         execucao_evento_tipo NOT NULL,
  data         date NOT NULL,
  dados        jsonb,
  observacoes  text,
  fonte        varchar(30) DEFAULT 'manual',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX execucao_eventos_execucao_id_idx ON execucao_eventos (execucao_id);
CREATE INDEX execucao_eventos_tipo_idx        ON execucao_eventos (tipo);

-- ---------- Benefícios pleiteados ----------
CREATE TABLE execucao_beneficios (
  id           serial PRIMARY KEY,
  execucao_id  integer NOT NULL REFERENCES execucoes_penais(id) ON DELETE CASCADE,
  tipo         execucao_beneficio_tipo NOT NULL,
  data_pleito  date,
  decisao      execucao_beneficio_decisao NOT NULL DEFAULT 'pendente',
  data_decisao date,
  observacoes  text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);
CREATE INDEX execucao_beneficios_execucao_id_idx ON execucao_beneficios (execucao_id);
CREATE INDEX execucao_beneficios_decisao_idx     ON execucao_beneficios (decisao);
