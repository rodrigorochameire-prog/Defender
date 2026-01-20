-- ==========================================
-- AVALIAÇÃO DO TRIBUNAL DO JÚRI
-- Formulário de observação comportamental
-- ==========================================

-- Enums
DO $$ BEGIN
  CREATE TYPE tendencia_voto AS ENUM ('CONDENAR', 'ABSOLVER', 'INDECISO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE nivel_confianca AS ENUM ('BAIXA', 'MEDIA', 'ALTA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tabela principal de avaliação
CREATE TABLE IF NOT EXISTS avaliacoes_juri (
  id SERIAL PRIMARY KEY,
  
  -- Relacionamentos
  sessao_juri_id INTEGER NOT NULL REFERENCES sessoes_juri(id) ON DELETE CASCADE,
  processo_id INTEGER REFERENCES processos(id) ON DELETE SET NULL,
  
  -- Identificação
  observador TEXT NOT NULL,
  data_julgamento DATE NOT NULL,
  horario_inicio VARCHAR(10),
  duracao_estimada VARCHAR(50),
  
  -- Contexto e Ambiente
  descricao_ambiente TEXT,
  disposicao_fisica TEXT,
  clima_emocional_inicial TEXT,
  presenca_publico_midia TEXT,
  
  -- Interrogatório do Réu
  interrogatorio_reacao_geral TEXT,
  interrogatorio_jurados_acreditaram TEXT,
  interrogatorio_jurados_ceticos TEXT,
  interrogatorio_momentos_impacto TEXT,
  interrogatorio_contradicoes TEXT,
  interrogatorio_impressao_credibilidade TEXT,
  interrogatorio_nivel_credibilidade INTEGER CHECK (interrogatorio_nivel_credibilidade >= 1 AND interrogatorio_nivel_credibilidade <= 10),
  
  -- Sustentação do MP
  mp_estrategia_geral TEXT,
  mp_impacto_geral INTEGER CHECK (mp_impacto_geral >= 1 AND mp_impacto_geral <= 10),
  mp_inclinacao_condenar TEXT,
  
  -- Sustentação da Defesa
  defesa_estrategia_geral TEXT,
  defesa_impacto_geral INTEGER CHECK (defesa_impacto_geral >= 1 AND defesa_impacto_geral <= 10),
  defesa_duvida_razoavel TEXT,
  
  -- Réplica do MP
  replica_refutacoes TEXT,
  replica_argumentos_novos TEXT,
  replica_reacao_geral TEXT,
  replica_impacto INTEGER CHECK (replica_impacto >= 1 AND replica_impacto <= 10),
  replica_mudanca_opiniao TEXT,
  
  -- Tréplica da Defesa
  treplica_refutacoes TEXT,
  treplica_apelo_final TEXT,
  treplica_reacao_geral TEXT,
  treplica_momento_impactante TEXT,
  treplica_impacto INTEGER CHECK (treplica_impacto >= 1 AND treplica_impacto <= 10),
  treplica_reconquista_indecisos TEXT,
  
  -- Análise Final
  lado_mais_persuasivo TEXT,
  impacto_acusacao INTEGER CHECK (impacto_acusacao >= 1 AND impacto_acusacao <= 10),
  impacto_defesa INTEGER CHECK (impacto_defesa >= 1 AND impacto_defesa <= 10),
  
  -- Impressão Final
  impressao_final_leiga TEXT,
  argumento_mais_impactante TEXT,
  pontos_nao_explorados TEXT,
  
  -- Observações Gerais
  clima_geral_julgamento TEXT,
  momentos_virada TEXT,
  surpresas_julgamento TEXT,
  observacoes_adicionais TEXT,
  
  -- Status
  status VARCHAR(30) DEFAULT 'em_andamento',
  
  -- Metadados
  criado_por_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS avaliacoes_juri_sessao_id_idx ON avaliacoes_juri(sessao_juri_id);
CREATE INDEX IF NOT EXISTS avaliacoes_juri_processo_id_idx ON avaliacoes_juri(processo_id);
CREATE INDEX IF NOT EXISTS avaliacoes_juri_status_idx ON avaliacoes_juri(status);
CREATE INDEX IF NOT EXISTS avaliacoes_juri_data_idx ON avaliacoes_juri(data_julgamento);

-- Tabela de avaliação individual de cada jurado
CREATE TABLE IF NOT EXISTS avaliacao_jurados (
  id SERIAL PRIMARY KEY,
  
  -- Relacionamentos
  avaliacao_juri_id INTEGER NOT NULL REFERENCES avaliacoes_juri(id) ON DELETE CASCADE,
  jurado_id INTEGER REFERENCES jurados(id) ON DELETE SET NULL,
  
  -- Posição no conselho (1-7)
  posicao INTEGER NOT NULL CHECK (posicao >= 1 AND posicao <= 7),
  
  -- Identificação
  nome TEXT,
  profissao VARCHAR(100),
  idade_aproximada INTEGER,
  sexo VARCHAR(20),
  
  -- Observações iniciais
  aparencia_primeira_impressao TEXT,
  linguagem_corporal_inicial TEXT,
  
  -- Previsão de voto
  tendencia_voto tendencia_voto,
  nivel_confianca nivel_confianca,
  justificativa_tendencia TEXT,
  
  -- Anotações durante o julgamento
  anotacoes_interrogatorio TEXT,
  anotacoes_mp TEXT,
  anotacoes_defesa TEXT,
  anotacoes_gerais TEXT,
  
  -- Metadados
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS avaliacao_jurados_avaliacao_id_idx ON avaliacao_jurados(avaliacao_juri_id);
CREATE INDEX IF NOT EXISTS avaliacao_jurados_jurado_id_idx ON avaliacao_jurados(jurado_id);
CREATE INDEX IF NOT EXISTS avaliacao_jurados_posicao_idx ON avaliacao_jurados(posicao);
CREATE INDEX IF NOT EXISTS avaliacao_jurados_tendencia_idx ON avaliacao_jurados(tendencia_voto);

-- Tabela de avaliação das testemunhas durante o júri
CREATE TABLE IF NOT EXISTS avaliacao_testemunhas_juri (
  id SERIAL PRIMARY KEY,
  
  -- Relacionamentos
  avaliacao_juri_id INTEGER NOT NULL REFERENCES avaliacoes_juri(id) ON DELETE CASCADE,
  testemunha_id INTEGER REFERENCES testemunhas(id) ON DELETE SET NULL,
  
  -- Ordem de inquirição
  ordem INTEGER,
  
  -- Identificação
  nome TEXT NOT NULL,
  
  -- Depoimento
  resumo_depoimento TEXT,
  reacao_jurados TEXT,
  expressoes_faciais_linguagem TEXT,
  credibilidade INTEGER CHECK (credibilidade >= 1 AND credibilidade <= 10),
  observacoes_complementares TEXT,
  
  -- Metadados
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS avaliacao_testemunhas_avaliacao_id_idx ON avaliacao_testemunhas_juri(avaliacao_juri_id);
CREATE INDEX IF NOT EXISTS avaliacao_testemunhas_testemunha_id_idx ON avaliacao_testemunhas_juri(testemunha_id);
CREATE INDEX IF NOT EXISTS avaliacao_testemunhas_ordem_idx ON avaliacao_testemunhas_juri(ordem);

-- Tabela de argumentos do MP e Defesa durante a sustentação
CREATE TABLE IF NOT EXISTS argumentos_sustentacao (
  id SERIAL PRIMARY KEY,
  
  -- Relacionamentos
  avaliacao_juri_id INTEGER NOT NULL REFERENCES avaliacoes_juri(id) ON DELETE CASCADE,
  
  -- Tipo
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('mp', 'defesa')),
  ordem INTEGER,
  
  -- Conteúdo
  descricao_argumento TEXT,
  reacao_jurados TEXT,
  nivel_persuasao INTEGER CHECK (nivel_persuasao >= 1 AND nivel_persuasao <= 10),
  
  -- Metadados
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS argumentos_sustentacao_avaliacao_id_idx ON argumentos_sustentacao(avaliacao_juri_id);
CREATE INDEX IF NOT EXISTS argumentos_sustentacao_tipo_idx ON argumentos_sustentacao(tipo);
CREATE INDEX IF NOT EXISTS argumentos_sustentacao_ordem_idx ON argumentos_sustentacao(ordem);

-- Tabela de personagens do Júri (Juiz, Promotor, etc.)
CREATE TABLE IF NOT EXISTS personagens_juri (
  id SERIAL PRIMARY KEY,
  
  -- Identificação
  nome TEXT NOT NULL,
  tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('juiz', 'promotor', 'defensor', 'oficial')),
  
  -- Dados profissionais
  vara VARCHAR(100),
  comarca VARCHAR(100),
  
  -- Perfil observado
  estilo_atuacao TEXT,
  pontos_fortes TEXT,
  pontos_fracos TEXT,
  tendencias_observadas TEXT,
  estrategias_recomendadas TEXT,
  
  -- Estatísticas
  historico TEXT,
  total_sessoes INTEGER DEFAULT 0,
  
  -- Status
  ativo BOOLEAN DEFAULT TRUE,
  
  -- Metadados
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS personagens_juri_nome_idx ON personagens_juri(nome);
CREATE INDEX IF NOT EXISTS personagens_juri_tipo_idx ON personagens_juri(tipo);
CREATE INDEX IF NOT EXISTS personagens_juri_comarca_idx ON personagens_juri(comarca);
CREATE INDEX IF NOT EXISTS personagens_juri_ativo_idx ON personagens_juri(ativo);
