CREATE TABLE IF NOT EXISTS delitos_catalogo (
  id              serial PRIMARY KEY,
  codigo_lei      varchar(40),
  artigo          varchar(40),
  paragrafo       varchar(20),
  inciso          varchar(20),
  descricao_curta varchar(120) NOT NULL,
  descricao_longa text,
  natureza        varchar(40),
  hediondo        boolean DEFAULT false,
  pena_min_anos   numeric(4,1),
  pena_max_anos   numeric(4,1),
  area_sugerida   varchar(40),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delitos_catalogo_codigo_artigo ON delitos_catalogo(codigo_lei, artigo);
CREATE INDEX IF NOT EXISTS delitos_catalogo_descricao_trgm ON delitos_catalogo USING gin(descricao_curta gin_trgm_ops);

CREATE TABLE IF NOT EXISTS tipificacoes (
  id                       serial PRIMARY KEY,
  processo_id              int NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  delito_id                int NOT NULL REFERENCES delitos_catalogo(id),
  qualificadoras           jsonb DEFAULT '[]'::jsonb,
  majorantes               jsonb DEFAULT '[]'::jsonb,
  minorantes               jsonb DEFAULT '[]'::jsonb,
  modalidade               varchar(20) DEFAULT 'consumada',
  observacoes              text,
  fonte                    varchar(30) NOT NULL DEFAULT 'manual',
  confidence               numeric(3,2) DEFAULT 0.9,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tipificacoes_processo ON tipificacoes(processo_id);
CREATE INDEX IF NOT EXISTS tipificacoes_delito ON tipificacoes(delito_id);

-- Seed catálogo: ~30 delitos comuns
INSERT INTO delitos_catalogo (codigo_lei, artigo, paragrafo, descricao_curta, hediondo, pena_min_anos, pena_max_anos, area_sugerida) VALUES
  ('CP','121',NULL,'Homicídio simples',false,6,20,'JURI'),
  ('CP','121','§2º','Homicídio qualificado',true,12,30,'JURI'),
  ('CP','121','§3º','Homicídio culposo',false,1,3,'JURI'),
  ('CP','121','§2º-A','Feminicídio',true,12,30,'JURI'),
  ('CP','122',NULL,'Induzimento ou auxílio a suicídio',false,2,6,'JURI'),
  ('CP','129','caput','Lesão corporal leve',false,0.25,1,'CRIMINAL'),
  ('CP','129','§9º','Lesão corporal — violência doméstica',false,0.25,3,'VIOLENCIA_DOMESTICA'),
  ('CP','147','caput','Ameaça',false,0.08,0.5,'CRIMINAL'),
  ('CP','147-A',NULL,'Stalking (perseguição)',false,0.5,3,'CRIMINAL'),
  ('CP','155','caput','Furto simples',false,1,4,'CRIMINAL'),
  ('CP','155','§4º','Furto qualificado',false,2,8,'CRIMINAL'),
  ('CP','157','caput','Roubo simples',false,4,10,'CRIMINAL'),
  ('CP','157','§2º','Roubo majorado',false,4.7,15.4,'CRIMINAL'),
  ('CP','157','§3º','Latrocínio (roubo seguido de morte)',true,20,30,'JURI'),
  ('CP','158',NULL,'Extorsão',false,4,10,'CRIMINAL'),
  ('CP','159',NULL,'Extorsão mediante sequestro',true,8,15,'JURI'),
  ('CP','171',NULL,'Estelionato',false,1,5,'CRIMINAL'),
  ('CP','213',NULL,'Estupro',true,6,10,'CRIMINAL'),
  ('CP','217-A',NULL,'Estupro de vulnerável',true,8,15,'CRIMINAL'),
  ('CP','331',NULL,'Desacato',false,0.5,2,'CRIMINAL'),
  ('CP','329',NULL,'Resistência',false,0.17,2,'CRIMINAL'),
  ('11.343','33','caput','Tráfico de drogas',true,5,15,'CRIMINAL'),
  ('11.343','33','§4º','Tráfico privilegiado',false,1.7,5,'CRIMINAL'),
  ('11.343','35',NULL,'Associação para o tráfico',false,3,10,'CRIMINAL'),
  ('11.343','28',NULL,'Posse de drogas para uso pessoal',false,0,0,'CRIMINAL'),
  ('10.826','12',NULL,'Posse irregular de arma de uso permitido',false,1,3,'CRIMINAL'),
  ('10.826','14',NULL,'Porte ilegal de arma de uso permitido',false,2,4,'CRIMINAL'),
  ('10.826','16',NULL,'Posse/porte de arma de uso restrito',false,3,6,'CRIMINAL'),
  ('11.340','24-A',NULL,'Descumprimento de medida protetiva',false,0.25,2,'VIOLENCIA_DOMESTICA'),
  ('8.069','244-B',NULL,'Corrupção de menores',false,1,4,'INFANCIA_JUVENTUDE')
ON CONFLICT DO NOTHING;
