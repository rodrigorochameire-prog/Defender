CREATE TYPE "public"."cautelar_status" AS ENUM('ativa', 'cumprida', 'descumprida', 'revogada', 'extinta');--> statement-breakpoint
CREATE TYPE "public"."cautelar_tipo" AS ENUM('monitoramento-eletronico', 'comparecimento-periodico', 'recolhimento-noturno', 'proibicao-contato', 'proibicao-frequentar', 'afastamento-lar', 'fianca', 'suspensao-porte-arma', 'suspensao-habilitacao', 'outro');--> statement-breakpoint
CREATE TYPE "public"."marco_tipo" AS ENUM('fato', 'apf', 'audiencia-custodia', 'denuncia', 'recebimento-denuncia', 'resposta-acusacao', 'aij-designada', 'aij-realizada', 'memoriais', 'sentenca', 'recurso-interposto', 'acordao-recurso', 'transito-julgado', 'execucao-inicio', 'outro');--> statement-breakpoint
CREATE TYPE "public"."prisao_situacao" AS ENUM('ativa', 'relaxada', 'revogada', 'extinta', 'cumprida', 'convertida-em-preventiva');--> statement-breakpoint
CREATE TYPE "public"."prisao_tipo" AS ENUM('flagrante', 'temporaria', 'preventiva', 'decorrente-sentenca', 'outro');--> statement-breakpoint
CREATE TYPE "public"."demanda_evento_tipo" AS ENUM('atendimento', 'diligencia', 'observacao');--> statement-breakpoint
CREATE TYPE "public"."classe_recursal" AS ENUM('APELACAO', 'AGRAVO_EXECUCAO', 'RESE', 'HC', 'EMBARGOS', 'REVISAO_CRIMINAL', 'CORREICAO_PARCIAL', 'MS', 'RESP', 'RE', 'AGRAVO_RESP', 'AGRAVO_RE', 'RECLAMACAO', 'HC_STJ', 'HC_STF');--> statement-breakpoint
CREATE TYPE "public"."demanda_origem" AS ENUM('pje', 'planilha_apps_script', 'planilha_n8n', 'ombuds_ui', 'enrichment', 'manual');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('novo', 'visto', 'enviado_jira', 'descartado');--> statement-breakpoint
CREATE TYPE "public"."feedback_tipo" AS ENUM('bug', 'sugestao', 'duvida');--> statement-breakpoint
CREATE TYPE "public"."instancia_processo" AS ENUM('PRIMEIRA', 'SEGUNDA', 'STJ', 'STF', 'SEEU');--> statement-breakpoint
CREATE TYPE "public"."ledger_decisao" AS ENUM('imported', 'skipped', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."resultado_julgamento" AS ENUM('PROVIDO', 'IMPROVIDO', 'PARCIAL', 'NAO_CONHECIDO', 'DILIGENCIA', 'PREJUDICADO');--> statement-breakpoint
CREATE TYPE "public"."staging_decisao" AS ENUM('nova', 'duplicada', 'ja_importada', 'incerta');--> statement-breakpoint
CREATE TYPE "public"."execucao_beneficio_decisao" AS ENUM('pendente', 'deferido', 'indeferido');--> statement-breakpoint
CREATE TYPE "public"."execucao_beneficio_tipo" AS ENUM('progressao', 'livramento-condicional', 'indulto', 'comutacao', 'saida-temporaria', 'trabalho-externo', 'remissao', 'outro');--> statement-breakpoint
CREATE TYPE "public"."execucao_evento_tipo" AS ENUM('progressao', 'regressao', 'reconversao', 'remissao', 'detracao', 'unificacao', 'saida-temporaria', 'falta', 'beneficio-negado', 'outro');--> statement-breakpoint
CREATE TYPE "public"."execucao_situacao" AS ENUM('preso', 'domiciliar', 'livramento-condicional', 'monitoramento', 'solto', 'foragido');--> statement-breakpoint
CREATE TYPE "public"."execucao_titulo_tipo" AS ENUM('condenatoria', 'condenatoria-c-substituicao', 'condenatoria-c-suspensao');--> statement-breakpoint
CREATE TYPE "public"."unidade_prisional_tipo" AS ENUM('presidio', 'cadeia-publica', 'colonia-agricola', 'casa-albergado', 'hospital-custodia', 'penitenciaria', 'outro');--> statement-breakpoint
CREATE TYPE "public"."ferias_status" AS ENUM('programada', 'homologada', 'em_fruicao', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."vf_cluster" AS ENUM('progressao', 'ausencias', 'contraprestacao', 'administrativo');--> statement-breakpoint
CREATE TYPE "public"."vf_origem" AS ENUM('manual', 'indexador', 'skill');--> statement-breakpoint
CREATE TYPE "public"."vf_status" AS ENUM('previsto', 'em_curso', 'concluido', 'pendente', 'arquivado');--> statement-breakpoint
CREATE TYPE "public"."vf_tipo_evento" AS ENUM('POSSE', 'PROMOCAO', 'REMOCAO', 'TITULARIDADE', 'ACUMULO', 'DESIGNACAO_RELEVANTE', 'CONVOCACAO', 'FERIAS', 'LICENCA', 'AFASTAMENTO', 'COOPERACAO', 'DIARIA', 'FOLGA', 'TRABALHO_EXTRAORDINARIO', 'SUBSTITUICAO', 'GRATIFICACAO', 'REEMBOLSO', 'SOLICITACAO_ADM');--> statement-breakpoint
CREATE TYPE "public"."objeto_destino" AS ENUM('pendente', 'devolvido', 'periciado', 'incinerado', 'em-custodia');--> statement-breakpoint
CREATE TYPE "public"."objeto_papel" AS ENUM('apreendido', 'utilizado', 'produto-do-crime');--> statement-breakpoint
CREATE TYPE "public"."objeto_tipo" AS ENUM('arma-fogo', 'arma-branca', 'droga', 'veiculo', 'celular', 'dinheiro', 'joia', 'documento', 'outro-bem');--> statement-breakpoint
CREATE TYPE "public"."lugar_tipo_participacao" AS ENUM('local-do-fato', 'endereco-assistido', 'residencia-agressor', 'trabalho-agressor', 'local-atendimento', 'radar-noticia', 'residencia-vitima', 'residencia-testemunha', 'outro');--> statement-breakpoint
ALTER TYPE "public"."area" ADD VALUE 'CRIMINAL_2_GRAU';--> statement-breakpoint
ALTER TYPE "public"."atribuicao" ADD VALUE 'MUTIRAO_PROTEGE' BEFORE 'CRIMINAL_CAMACARI';--> statement-breakpoint
ALTER TYPE "public"."atribuicao" ADD VALUE 'CRIMINAL_2_GRAU_SALVADOR';--> statement-breakpoint
ALTER TYPE "public"."papel_processo" ADD VALUE 'REQUERIDO';--> statement-breakpoint
ALTER TYPE "public"."papel_processo" ADD VALUE 'EXECUTADO';--> statement-breakpoint
ALTER TYPE "public"."papel_processo" ADD VALUE 'REEDUCANDO';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registro_anexos" (
	"id" serial PRIMARY KEY NOT NULL,
	"registro_id" integer NOT NULL,
	"storage_path" text NOT NULL,
	"nome_original" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"tamanho" integer NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"drive_file_id" varchar(100),
	"drive_status" varchar(20) DEFAULT 'pending',
	"autor_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registros" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer NOT NULL,
	"processo_id" integer,
	"caso_id" integer,
	"demanda_id" integer,
	"audiencia_id" integer,
	"data_registro" timestamp NOT NULL,
	"duracao" integer,
	"tipo" varchar(30) NOT NULL,
	"titulo" varchar(120),
	"local" text,
	"assunto" text,
	"conteudo" text,
	"acompanhantes" text,
	"status" varchar(20) DEFAULT 'agendado',
	"interlocutor" varchar(30) DEFAULT 'assistido',
	"numero_solar" varchar(30),
	"subtipo" varchar(20),
	"area" varchar(40),
	"pedido" varchar(80),
	"anotacoes_recepcao" text,
	"historico_solar" jsonb,
	"processos_citados" jsonb,
	"dossie_atendimento" jsonb,
	"audio_url" text,
	"audio_drive_file_id" varchar(100),
	"audio_mime_type" varchar(50),
	"audio_file_size" integer,
	"transcricao" text,
	"transcricao_resumo" text,
	"transcricao_status" varchar(20) DEFAULT 'pending',
	"transcricao_idioma" varchar(10) DEFAULT 'pt-BR',
	"plaud_recording_id" varchar(100),
	"plaud_device_id" varchar(100),
	"transcricao_metadados" jsonb,
	"pontos_chave" jsonb,
	"enrichment_status" varchar(20),
	"enrichment_data" jsonb,
	"enriched_at" timestamp,
	"autor_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"user_name" text,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(30) NOT NULL,
	"changes" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "claude_code_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer,
	"processo_id" integer,
	"caso_id" integer,
	"skill" text NOT NULL,
	"lane" text DEFAULT 'ai' NOT NULL,
	"prompt" text NOT NULL,
	"instrucao_adicional" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"etapa" text,
	"resultado" jsonb,
	"erro" text,
	"created_by" integer NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cautelares_decisao" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"especie" varchar(10) NOT NULL,
	"artigo" varchar(24),
	"parametros" jsonb,
	"literal" text,
	"data_decisao" date,
	"status" varchar(20) DEFAULT 'ativa',
	"origem" varchar(20) DEFAULT 'parser',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prisao_preventiva" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"cautelar_id" integer,
	"orgao_decisor" varchar(160),
	"data_decreto" date,
	"requisitos" jsonb,
	"pressupostos" jsonb,
	"contemporaneidade" text,
	"local_custodia" varchar(200),
	"historico_custodia" jsonb,
	"saude" jsonb,
	"seguranca" jsonb,
	"visitas" jsonb,
	"excesso_prazo" jsonb,
	"situacao" varchar(20) DEFAULT 'preso',
	"data_soltura" date,
	"status" varchar(20) DEFAULT 'ativa',
	"origem" varchar(20) DEFAULT 'parser',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pje_download_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"numero_processo" text NOT NULL,
	"atribuicao" varchar(30) NOT NULL,
	"assistido_id" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"pdf_path" text,
	"pdf_bytes" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scan_intimacoes_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero_processo" varchar(30) NOT NULL,
	"assistido_nome" varchar(200) NOT NULL,
	"atribuicao" varchar(50) NOT NULL,
	"id_documento" varchar(30),
	"drive_base_path" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"ato_sugerido" varchar(100),
	"ato_confianca" varchar(10),
	"providencias" text,
	"audiencia_data" varchar(10),
	"audiencia_hora" varchar(5),
	"audiencia_tipo" varchar(50),
	"pdf_path" text,
	"conteudo_resumo" text,
	"error" text,
	"batch_id" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coordenacoes_destino" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer DEFAULT 1 NOT NULL,
	"regime" varchar(12) DEFAULT 'interno' NOT NULL,
	"nivel" varchar(16) DEFAULT 'regional' NOT NULL,
	"nome" varchar(200) NOT NULL,
	"comarca" varchar(120),
	"uf" varchar(2) DEFAULT 'BA' NOT NULL,
	"email" varchar(120) NOT NULL,
	"telefone" varchar(30),
	"observacao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "demandas_acompanhantes" (
	"id" serial PRIMARY KEY NOT NULL,
	"demanda_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"origem_encaminhamento_id" integer,
	"notificar_alteracoes" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encaminhamento_anexos" (
	"id" serial PRIMARY KEY NOT NULL,
	"encaminhamento_id" integer,
	"resposta_id" integer,
	"tipo" varchar(20) NOT NULL,
	"drive_file_id" varchar(80),
	"storage_url" text,
	"nome" varchar(200),
	"size_bytes" integer,
	"duracao_seg" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encaminhamento_destinatarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"encaminhamento_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"estado_pessoal" varchar(20) DEFAULT 'pendente' NOT NULL,
	"lido_em" timestamp,
	"ciente_em" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encaminhamento_respostas" (
	"id" serial PRIMARY KEY NOT NULL,
	"encaminhamento_id" integer NOT NULL,
	"autor_id" integer NOT NULL,
	"mensagem" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "encaminhamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"remetente_id" integer NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"titulo" varchar(200),
	"mensagem" text NOT NULL,
	"demanda_id" integer,
	"processo_id" integer,
	"assistido_id" integer,
	"status" varchar(20) DEFAULT 'pendente' NOT NULL,
	"urgencia" varchar(10) DEFAULT 'normal' NOT NULL,
	"notificar_ombuds" boolean DEFAULT true NOT NULL,
	"notificar_whatsapp" boolean DEFAULT false NOT NULL,
	"notificar_email" boolean DEFAULT false NOT NULL,
	"concluido_em" timestamp,
	"concluido_por_id" integer,
	"motivo_recusa" text,
	"regime" varchar(12),
	"coordenacao_id" integer,
	"comarca_destino" varchar(120),
	"coordenacao_email" varchar(120),
	"prazo_urgente" boolean DEFAULT false NOT NULL,
	"data_limite" timestamp,
	"enviado_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cautelares" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"pessoa_id" integer,
	"tipo" "cautelar_tipo" NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"detalhes" text,
	"status" "cautelar_status" DEFAULT 'ativa' NOT NULL,
	"fonte" varchar(30) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marcos_processuais" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"tipo" "marco_tipo" NOT NULL,
	"data" date NOT NULL,
	"documento_referencia" text,
	"observacoes" text,
	"fonte" varchar(30) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prisoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"pessoa_id" integer,
	"tipo" "prisao_tipo" NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"motivo" text,
	"unidade" varchar(200),
	"situacao" "prisao_situacao" DEFAULT 'ativa' NOT NULL,
	"fonte" varchar(30) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "defensores_ba" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" varchar(200),
	"unidade" varchar(100),
	"atribuicao" text,
	"especialidade" varchar(50) NOT NULL,
	"area" varchar(20) NOT NULL,
	"instancia" varchar(20) NOT NULL,
	"localizacao" varchar(20) NOT NULL,
	"comarca" varchar(100),
	"ativo" boolean DEFAULT true NOT NULL,
	"fonte_organograma" varchar(50) DEFAULT 'DPE-BA-2026',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delitos_catalogo" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo_lei" varchar(40),
	"artigo" varchar(40),
	"paragrafo" varchar(20),
	"inciso" varchar(20),
	"descricao_curta" varchar(120) NOT NULL,
	"descricao_longa" text,
	"natureza" varchar(40),
	"hediondo" boolean DEFAULT false,
	"pena_min_anos" numeric(4, 1),
	"pena_max_anos" numeric(4, 1),
	"area_sugerida" varchar(40),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tipificacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"delito_id" integer NOT NULL,
	"qualificadoras" jsonb DEFAULT '[]'::jsonb,
	"majorantes" jsonb DEFAULT '[]'::jsonb,
	"minorantes" jsonb DEFAULT '[]'::jsonb,
	"modalidade" varchar(20) DEFAULT 'consumada',
	"observacoes" text,
	"fonte" varchar(30) DEFAULT 'manual' NOT NULL,
	"origem" varchar(20) DEFAULT 'manual' NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "atendimento_demandas" (
	"atendimento_id" integer NOT NULL,
	"demanda_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "atendimento_demandas_atendimento_id_demanda_id_pk" PRIMARY KEY("atendimento_id","demanda_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "demanda_eventos" (
	"id" serial PRIMARY KEY NOT NULL,
	"demanda_id" integer NOT NULL,
	"tipo" "demanda_evento_tipo" NOT NULL,
	"subtipo" varchar(30),
	"status" varchar(20),
	"resumo" varchar(140) NOT NULL,
	"descricao" text,
	"prazo" date,
	"responsavel_id" integer,
	"atendimento_id" integer,
	"autor_id" integer NOT NULL,
	"data_conclusao" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "demanda_eventos_diligencia_only" CHECK ("demanda_eventos"."tipo" = 'diligencia' OR ("demanda_eventos"."subtipo" IS NULL AND "demanda_eventos"."status" IS NULL AND "demanda_eventos"."prazo" IS NULL)),
	CONSTRAINT "demanda_eventos_atendimento_only" CHECK ("demanda_eventos"."tipo" = 'atendimento' OR "demanda_eventos"."atendimento_id" IS NULL)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "execucao_beneficios" (
	"id" serial PRIMARY KEY NOT NULL,
	"execucao_id" integer NOT NULL,
	"tipo" "execucao_beneficio_tipo" NOT NULL,
	"data_pleito" date,
	"decisao" "execucao_beneficio_decisao" DEFAULT 'pendente' NOT NULL,
	"data_decisao" date,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "execucao_eventos" (
	"id" serial PRIMARY KEY NOT NULL,
	"execucao_id" integer NOT NULL,
	"tipo" "execucao_evento_tipo" NOT NULL,
	"data" date NOT NULL,
	"dados" jsonb,
	"observacoes" text,
	"fonte" varchar(30) DEFAULT 'manual',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "execucoes_penais" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"assistido_id" integer,
	"numero_execucao" varchar(40),
	"juizo_execucao" varchar(160),
	"sentenca_data" date,
	"transito_julgado_data" date,
	"tipo_titulo" "execucao_titulo_tipo",
	"pena_anos" integer DEFAULT 0 NOT NULL,
	"pena_meses" integer DEFAULT 0 NOT NULL,
	"pena_dias" integer DEFAULT 0 NOT NULL,
	"regime_inicial" "regime_inicial",
	"regime_atual" "regime_inicial",
	"hediondo" boolean DEFAULT false NOT NULL,
	"reincidente" boolean DEFAULT false NOT NULL,
	"menor_21_no_fato" boolean DEFAULT false NOT NULL,
	"maior_70_na_sentenca" boolean DEFAULT false NOT NULL,
	"inicio_cumprimento" date,
	"detracao_dias" integer DEFAULT 0 NOT NULL,
	"situacao" "execucao_situacao" DEFAULT 'preso' NOT NULL,
	"unidade_atual_id" integer,
	"endereco_logradouro" varchar(200),
	"endereco_numero" varchar(20),
	"endereco_bairro" varchar(120),
	"endereco_cidade" varchar(120),
	"endereco_uf" varchar(2),
	"endereco_cep" varchar(9),
	"telefone" varchar(20),
	"data_ultima_confirmacao_cadastral" date,
	"observacoes" text,
	"origem" varchar(20) DEFAULT 'manual',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unidades_prisionais" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(200) NOT NULL,
	"tipo" "unidade_prisional_tipo",
	"regime_comportado" "regime_inicial",
	"municipio" varchar(120),
	"uf" varchar(2),
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tipo" "feedback_tipo" NOT NULL,
	"mensagem" text NOT NULL,
	"pagina" text,
	"contexto" jsonb,
	"status" "feedback_status" DEFAULT 'novo' NOT NULL,
	"jira_ticket_id" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ferias_parcelas" (
	"id" serial PRIMARY KEY NOT NULL,
	"periodo_id" integer NOT NULL,
	"defensor_id" integer NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"status" "ferias_status" DEFAULT 'programada' NOT NULL,
	"substituto_id" integer,
	"afastamento_id" integer,
	"vida_funcional_evento_id" integer,
	"sei_protocolo" text,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ferias_periodos" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"aquisitivo_inicio" date NOT NULL,
	"aquisitivo_fim" date NOT NULL,
	"dias_direito" integer DEFAULT 30 NOT NULL,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "substituicoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer,
	"unidade_substituida" text NOT NULL,
	"tipo" varchar(20) DEFAULT 'automatica' NOT NULL,
	"escopo_atribuicoes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"motivo" text,
	"status" varchar(20) DEFAULT 'em_andamento' NOT NULL,
	"oficio_numero" text,
	"oficio_path" text,
	"relatorio_path" text,
	"sei_protocolo" text,
	"observacoes" text,
	"afastamento_id" integer,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vida_funcional_eventos" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"tipo" "vf_tipo_evento" NOT NULL,
	"cluster" "vf_cluster" NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"data_evento" date NOT NULL,
	"data_fim" date,
	"prazo" date,
	"status" "vf_status" DEFAULT 'previsto' NOT NULL,
	"valor_cents" bigint,
	"drive_folder_id" varchar(100),
	"drive_file_id" varchar(100),
	"origem" "vf_origem" DEFAULT 'manual' NOT NULL,
	"dados" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medidas_mpu" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_vvd_id" integer NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"artigo" varchar(20),
	"distancia_metros" integer,
	"parametros" jsonb,
	"literal" text,
	"data_decisao" date,
	"data_vencimento" date,
	"status" varchar(20) DEFAULT 'ativa',
	"motivo_revogacao" text,
	"data_revogacao" date,
	"origem" varchar(20) DEFAULT 'parser',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mpu_relatos" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"relato_texto" text,
	"tipos_violencia" text[],
	"relacao" varchar(30),
	"gatilhos" text[],
	"provas_mencionadas" text[],
	"gravidade" varchar(10),
	"extraido_em" timestamp DEFAULT now() NOT NULL,
	"extracao_modelo" varchar(40),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mpu_taxonomia" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria" varchar(20) NOT NULL,
	"termo" varchar(60) NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	"primeiro_visto_em" timestamp DEFAULT now() NOT NULL,
	"ultimo_visto_em" timestamp DEFAULT now() NOT NULL,
	"aprovado" boolean DEFAULT false NOT NULL,
	"variantes" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promocao_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entidade" varchar(20) DEFAULT 'pessoa' NOT NULL,
	"processo_id" integer,
	"candidato_nome" text NOT NULL,
	"candidato_cpf" text,
	"acao" text NOT NULL,
	"pessoa_id" integer,
	"candidatos_ids" text,
	"confianca" numeric(3, 2),
	"fonte_ref" varchar(120),
	"modelo_extracao" varchar(60),
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "objetos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" "objeto_tipo" NOT NULL,
	"subtipo" varchar(60),
	"numero_serie" varchar(80),
	"placa" varchar(12),
	"modelo" varchar(80),
	"marca" varchar(80),
	"ano" integer,
	"calibre" varchar(30),
	"tipo_droga" varchar(60),
	"quantidade" numeric(12, 3),
	"unidade" varchar(20),
	"valor_estimado" numeric(14, 2),
	"descricao_livre" text,
	"fotos_drive_ids" jsonb,
	"fonte_criacao" varchar(40) DEFAULT 'manual' NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '1.0',
	"workspace_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participacoes_objeto" (
	"id" serial PRIMARY KEY NOT NULL,
	"objeto_id" integer NOT NULL,
	"processo_id" integer NOT NULL,
	"pessoa_id" integer,
	"papel" "objeto_papel" DEFAULT 'apreendido' NOT NULL,
	"destino" "objeto_destino" DEFAULT 'pendente',
	"data_apreensao" date,
	"local_apreensao" varchar(200),
	"observacoes" text,
	"fonte" varchar(30) DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_microsoft_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"microsoft_user_id" varchar(100),
	"refresh_token" text NOT NULL,
	"access_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_microsoft_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "acordaos" (
	"id" serial PRIMARY KEY NOT NULL,
	"recurso_id" integer NOT NULL,
	"numero_acordao" varchar(30),
	"data_julgamento" date,
	"data_publicacao" date,
	"ementa" text,
	"relator" text,
	"resultado" varchar(30),
	"votacao" varchar(50),
	"votos" jsonb DEFAULT '[]'::jsonb,
	"drive_file_id" integer,
	"analise_ia" jsonb DEFAULT 'null'::jsonb,
	"analise_status" varchar(20) DEFAULT 'PENDENTE',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "desembargadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"camara" varchar(50),
	"area" varchar(20),
	"status" varchar(20) DEFAULT 'ATIVO',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recursos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"tribunal" varchar(10) DEFAULT 'TJBA' NOT NULL,
	"numero_recurso" varchar(30),
	"processo_origem_id" integer,
	"assistido_id" integer,
	"defensor_origem_id" integer,
	"defensor_destino_id" integer,
	"camara" varchar(50),
	"relator_id" integer,
	"revisor_id" integer,
	"data_interposicao" date,
	"data_distribuicao" date,
	"data_pauta" date,
	"data_julgamento" date,
	"data_transito" date,
	"status" varchar(20) DEFAULT 'INTERPOSTO' NOT NULL,
	"resultado" varchar(30) DEFAULT 'PENDENTE' NOT NULL,
	"teses_invocadas" jsonb DEFAULT '[]'::jsonb,
	"tipos_penais" jsonb DEFAULT '[]'::jsonb,
	"resumo" text,
	"observacoes" text,
	"criado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_heartbeat" (
	"name" text PRIMARY KEY NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participacoes_processo" (
	"id" serial PRIMARY KEY NOT NULL,
	"pessoa_id" integer NOT NULL,
	"processo_id" integer NOT NULL,
	"papel" varchar(30) NOT NULL,
	"lado" varchar(20),
	"subpapel" varchar(40),
	"testemunha_id" integer,
	"resumo_nesta_causa" text,
	"observacoes_nesta_causa" text,
	"audio_drive_file_id" varchar(100),
	"data_primeira_aparicao" date,
	"fonte" varchar(40) NOT NULL,
	"origem" varchar(20) DEFAULT 'manual' NOT NULL,
	"fonte_ref" varchar(120),
	"confidence" numeric(3, 2) DEFAULT '1.0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pessoa_recortes" (
	"id" serial PRIMARY KEY NOT NULL,
	"pessoa_id" integer,
	"assistido_id" integer,
	"processo_id" integer,
	"drive_file_id" integer,
	"tipo" varchar(20) DEFAULT 'rosto',
	"papel" varchar(30),
	"rotulo" text,
	"imagem" text NOT NULL,
	"pagina" integer,
	"posicao" jsonb,
	"criado_por" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pessoa_relacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"pessoa_id" integer NOT NULL,
	"relacionada_pessoa_id" integer,
	"grau" varchar(40) NOT NULL,
	"nome_livre" text,
	"telefone" varchar(20),
	"endereco" text,
	"fonte" varchar(40) NOT NULL,
	"fonte_ref" varchar(120),
	"confirmado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pessoas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"nome_normalizado" text NOT NULL,
	"nomes_alternativos" jsonb DEFAULT '[]'::jsonb,
	"cpf" varchar(14),
	"rg" text,
	"data_nascimento" date,
	"telefone" text,
	"endereco" text,
	"foto_drive_file_id" varchar(100),
	"avatar_data_url" text,
	"observacoes" text,
	"categoria_primaria" varchar(30),
	"fonte_criacao" varchar(40) NOT NULL,
	"criado_por" integer,
	"confidence" numeric(3, 2) DEFAULT '1.0' NOT NULL,
	"merged_into" integer,
	"merge_reason" text,
	"merged_at" timestamp,
	"merged_by" integer,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pessoas_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pessoas_distincts_confirmed" (
	"pessoa_a_id" integer NOT NULL,
	"pessoa_b_id" integer NOT NULL,
	"confirmado_por" integer,
	"confirmado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pessoas_distincts_confirmed_pessoa_a_id_pessoa_b_id_pk" PRIMARY KEY("pessoa_a_id","pessoa_b_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lugares" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"logradouro" text,
	"numero" varchar(30),
	"complemento" varchar(120),
	"bairro" varchar(120),
	"cidade" varchar(120) DEFAULT 'Camaçari',
	"uf" varchar(2) DEFAULT 'BA',
	"cep" varchar(9),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"endereco_completo" text,
	"endereco_normalizado" text NOT NULL,
	"observacoes" text,
	"fonte_criacao" varchar(40),
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"merged_into" integer,
	"geocoded_at" timestamp with time zone,
	"geocoding_source" varchar(30),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lugares_access_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lugar_id" integer,
	"user_id" integer,
	"action" varchar(40) NOT NULL,
	"context" jsonb,
	"ts" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lugares_distincts_confirmed" (
	"id" serial PRIMARY KEY NOT NULL,
	"lugar_a_id" integer NOT NULL,
	"lugar_b_id" integer NOT NULL,
	"confirmed_by" integer,
	"confirmed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "participacoes_lugar" (
	"id" serial PRIMARY KEY NOT NULL,
	"lugar_id" integer NOT NULL,
	"processo_id" integer,
	"pessoa_id" integer,
	"tipo" "lugar_tipo_participacao" NOT NULL,
	"data_relacionada" date,
	"source_table" varchar(40),
	"source_id" integer,
	"fonte" varchar(30) NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.9',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "atendimentos_triagem" (
	"id" serial PRIMARY KEY NOT NULL,
	"tcc_ref" varchar(20) NOT NULL,
	"area" varchar(20) NOT NULL,
	"workspace_id" integer,
	"defensor_alvo_id" integer,
	"assistido_nome" text NOT NULL,
	"assistido_telefone" varchar(30),
	"assistido_cpf" varchar(14),
	"compareceu" varchar(20) DEFAULT 'proprio' NOT NULL,
	"familiar_nome" text,
	"familiar_telefone" varchar(30),
	"familiar_grau" varchar(30),
	"processo_cnj" varchar(25),
	"situacao" varchar(50),
	"vara" varchar(30),
	"urgencia" boolean DEFAULT false NOT NULL,
	"urgencia_motivo" varchar(50),
	"documento_entregue" varchar(50) DEFAULT 'Nenhum',
	"demanda_livre" text,
	"status" varchar(30) DEFAULT 'pendente_avaliacao' NOT NULL,
	"promovido_para_demanda_id" integer,
	"delegado_para" varchar(30),
	"motivo_devolucao" text,
	"motivo_override" text,
	"protocolo_solar" varchar(50),
	"metadata" jsonb,
	"criado_por_apps_script" varchar(100),
	"aba_planilha" varchar(20),
	"linha_planilha" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"decidido_em" timestamp,
	"decidido_por_id" integer,
	CONSTRAINT "atendimentos_triagem_tcc_ref_unique" UNIQUE("tcc_ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pje_import_staging" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"atribuicao" "atribuicao",
	"processo_numero" varchar(40),
	"assistido_nome" text,
	"ato" text,
	"tipo_documento" varchar(80),
	"data_expedicao" timestamp,
	"data_intimacao" timestamp,
	"prazo" date,
	"conteudo" text,
	"pje_documento_id" varchar(30),
	"content_hash" varchar(64) NOT NULL,
	"decisao" "staging_decisao" DEFAULT 'nova' NOT NULL,
	"matched_demanda_id" integer,
	"matched_ledger_id" integer,
	"selected" boolean DEFAULT false NOT NULL,
	"revisao" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pje_intimacoes_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"pje_documento_id" varchar(30),
	"content_hash" varchar(64) NOT NULL,
	"processo_numero" varchar(40),
	"processo_id" integer,
	"atribuicao" "atribuicao",
	"decisao" "ledger_decisao" NOT NULL,
	"demanda_id" integer,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"job_id" integer
);
--> statement-breakpoint
ALTER TABLE "atendimentos" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "atendimentos" CASCADE;--> statement-breakpoint
ALTER TABLE "drive_files" DROP CONSTRAINT "drive_files_drive_file_id_unique";--> statement-breakpoint
ALTER TABLE "drive_sync_folders" DROP CONSTRAINT "drive_sync_folders_drive_folder_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "assistidos_caso_id_idx";--> statement-breakpoint
ALTER TABLE "demandas" ALTER COLUMN "status" SET DEFAULT '5_TRIAGEM';--> statement-breakpoint
ALTER TABLE "historico_mpu" ALTER COLUMN "pje_documento_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "intimacoes_vvd" ALTER COLUMN "pje_documento_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "processos_vvd" ALTER COLUMN "requerido_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "processos_vvd" ALTER COLUMN "numero_autos" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "processos_vvd" ALTER COLUMN "pje_documento_id" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "noticias_fontes" ALTER COLUMN "cor" SET DEFAULT '#737373';--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "contexto" varchar(30);--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "midias" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "ata" jsonb;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "anotacoes_rapidas" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "audio_url" text;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "audio_drive_file_id" varchar(100);--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "audio_mime_type" varchar(50);--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "audio_file_size" integer;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "audio_duracao" integer;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "audio_fonte" varchar(16);--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "transcricao" text;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "transcricao_resumo" text;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "transcricao_status" varchar(20);--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "transcricao_idioma" varchar(10) DEFAULT 'pt-BR';--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "motivo_nao_realizacao" varchar(40);--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "motivo_detalhe" text;--> statement-breakpoint
ALTER TABLE "audiencias" ADD COLUMN "aguardando_nova_data" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "ouvido_em" timestamp;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "redesignado_para" date;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "sintese_juizo" text;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "audio_drive_file_id" varchar(100);--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "certidao_comunicacao" text;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "depoimento_audio_drive_file_id" varchar(100);--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "depoimento_audio_url" text;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "depoimento_audio_mime_type" varchar(50);--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "depoimento_audio_duracao" integer;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "depoimento_transcricao" text;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "depoimento_segments" jsonb;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN "depoimento_transcricao_status" varchar(20);--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "assistido_id" integer;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "drive_folder_id" text;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "foco" text;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "narrativa_denuncia" text;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "analysis_data" jsonb;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "analysis_status" varchar(20);--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "analyzed_at" timestamp;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "analysis_version" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "historico_penal" jsonb;--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "autor_nao_identificado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "assistidos" ADD COLUMN "nota_privada" text;--> statement-breakpoint
ALTER TABLE "assistidos_processos" ADD COLUMN "ativo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "delegacao_work_status" varchar(20);--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "nota_privada" text;--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "pje_documento_id" varchar(30);--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "origem" "demanda_origem";--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "revisao_pendente" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "tipo_patrocinio" varchar(20) DEFAULT 'DEFENSORIA' NOT NULL;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "advogado_particular" text;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "tipo_processo" varchar(30) DEFAULT 'AP';--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "is_referencia" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "pessoas_promovidas_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "delitos_promovidos_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "lugares_promovidos_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "cautelares_promovidas_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "modus_operandi" jsonb;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "anpp" jsonb;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "instancia" "instancia_processo" DEFAULT 'PRIMEIRA';--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "processo_origem_id" integer;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "defensor_2g_id" integer;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "defensor_brasilia_id" integer;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "classe_recursal" "classe_recursal";--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "camara" text;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "relator" text;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_distribuicao" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_conclusao" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_pauta" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_julgamento" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "resultado_julgamento" "resultado_julgamento";--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "acordao_recorrido_numero" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ics_token" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "microsoft_linked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "storage_provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onedrive_root_folder_id" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "defensor_ba_id" integer;--> statement-breakpoint
ALTER TABLE "documentos_gerados" ADD COLUMN "registro_id" integer;--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "drive_sync_folders" ADD COLUMN "provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "drive_sync_logs" ADD COLUMN "provider" varchar(20) DEFAULT 'google';--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "fase_procedimento" varchar(40);--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "motivo_ultima_intimacao" varchar(40);--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "prazo_mpu_dias" integer;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "juiz_decisor" varchar(200);--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "medidas_solicitadas" jsonb;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "contexto_civel" jsonb;--> statement-breakpoint
ALTER TABLE "processos_vvd" ADD COLUMN "acao_penal_vvd" jsonb;--> statement-breakpoint
ALTER TABLE "anotacoes" ADD COLUMN "registro_id" integer;--> statement-breakpoint
ALTER TABLE "diligencias" ADD COLUMN "registro_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registro_anexos" ADD CONSTRAINT "registro_anexos_registro_id_registros_id_fk" FOREIGN KEY ("registro_id") REFERENCES "public"."registros"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registro_anexos" ADD CONSTRAINT "registro_anexos_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registros" ADD CONSTRAINT "registros_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registros" ADD CONSTRAINT "registros_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registros" ADD CONSTRAINT "registros_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registros" ADD CONSTRAINT "registros_audiencia_id_audiencias_id_fk" FOREIGN KEY ("audiencia_id") REFERENCES "public"."audiencias"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registros" ADD CONSTRAINT "registros_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claude_code_tasks" ADD CONSTRAINT "claude_code_tasks_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claude_code_tasks" ADD CONSTRAINT "claude_code_tasks_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claude_code_tasks" ADD CONSTRAINT "claude_code_tasks_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claude_code_tasks" ADD CONSTRAINT "claude_code_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cautelares_decisao" ADD CONSTRAINT "cautelares_decisao_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prisao_preventiva" ADD CONSTRAINT "prisao_preventiva_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prisao_preventiva" ADD CONSTRAINT "prisao_preventiva_cautelar_id_cautelares_decisao_id_fk" FOREIGN KEY ("cautelar_id") REFERENCES "public"."cautelares_decisao"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pje_download_jobs" ADD CONSTRAINT "pje_download_jobs_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pje_download_jobs" ADD CONSTRAINT "pje_download_jobs_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas_acompanhantes" ADD CONSTRAINT "demandas_acompanhantes_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas_acompanhantes" ADD CONSTRAINT "demandas_acompanhantes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas_acompanhantes" ADD CONSTRAINT "demandas_acompanhantes_origem_encaminhamento_id_encaminhamentos_id_fk" FOREIGN KEY ("origem_encaminhamento_id") REFERENCES "public"."encaminhamentos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_anexos" ADD CONSTRAINT "encaminhamento_anexos_encaminhamento_id_encaminhamentos_id_fk" FOREIGN KEY ("encaminhamento_id") REFERENCES "public"."encaminhamentos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_anexos" ADD CONSTRAINT "encaminhamento_anexos_resposta_id_encaminhamento_respostas_id_fk" FOREIGN KEY ("resposta_id") REFERENCES "public"."encaminhamento_respostas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_destinatarios" ADD CONSTRAINT "encaminhamento_destinatarios_encaminhamento_id_encaminhamentos_id_fk" FOREIGN KEY ("encaminhamento_id") REFERENCES "public"."encaminhamentos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_destinatarios" ADD CONSTRAINT "encaminhamento_destinatarios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_respostas" ADD CONSTRAINT "encaminhamento_respostas_encaminhamento_id_encaminhamentos_id_fk" FOREIGN KEY ("encaminhamento_id") REFERENCES "public"."encaminhamentos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamento_respostas" ADD CONSTRAINT "encaminhamento_respostas_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_remetente_id_users_id_fk" FOREIGN KEY ("remetente_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_concluido_por_id_users_id_fk" FOREIGN KEY ("concluido_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "encaminhamentos" ADD CONSTRAINT "encaminhamentos_coordenacao_id_coordenacoes_destino_id_fk" FOREIGN KEY ("coordenacao_id") REFERENCES "public"."coordenacoes_destino"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cautelares" ADD CONSTRAINT "cautelares_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cautelares" ADD CONSTRAINT "cautelares_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "marcos_processuais" ADD CONSTRAINT "marcos_processuais_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prisoes" ADD CONSTRAINT "prisoes_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "prisoes" ADD CONSTRAINT "prisoes_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tipificacoes" ADD CONSTRAINT "tipificacoes_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tipificacoes" ADD CONSTRAINT "tipificacoes_delito_id_delitos_catalogo_id_fk" FOREIGN KEY ("delito_id") REFERENCES "public"."delitos_catalogo"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimento_demandas" ADD CONSTRAINT "atendimento_demandas_atendimento_id_registros_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."registros"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimento_demandas" ADD CONSTRAINT "atendimento_demandas_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demanda_eventos" ADD CONSTRAINT "demanda_eventos_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demanda_eventos" ADD CONSTRAINT "demanda_eventos_responsavel_id_users_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demanda_eventos" ADD CONSTRAINT "demanda_eventos_atendimento_id_registros_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."registros"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demanda_eventos" ADD CONSTRAINT "demanda_eventos_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "execucao_beneficios" ADD CONSTRAINT "execucao_beneficios_execucao_id_execucoes_penais_id_fk" FOREIGN KEY ("execucao_id") REFERENCES "public"."execucoes_penais"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "execucao_eventos" ADD CONSTRAINT "execucao_eventos_execucao_id_execucoes_penais_id_fk" FOREIGN KEY ("execucao_id") REFERENCES "public"."execucoes_penais"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "execucoes_penais" ADD CONSTRAINT "execucoes_penais_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "execucoes_penais" ADD CONSTRAINT "execucoes_penais_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "execucoes_penais" ADD CONSTRAINT "execucoes_penais_unidade_atual_id_unidades_prisionais_id_fk" FOREIGN KEY ("unidade_atual_id") REFERENCES "public"."unidades_prisionais"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ferias_parcelas" ADD CONSTRAINT "ferias_parcelas_periodo_id_ferias_periodos_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."ferias_periodos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ferias_parcelas" ADD CONSTRAINT "ferias_parcelas_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ferias_parcelas" ADD CONSTRAINT "ferias_parcelas_substituto_id_users_id_fk" FOREIGN KEY ("substituto_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ferias_periodos" ADD CONSTRAINT "ferias_periodos_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "substituicoes" ADD CONSTRAINT "substituicoes_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vida_funcional_eventos" ADD CONSTRAINT "vida_funcional_eventos_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medidas_mpu" ADD CONSTRAINT "medidas_mpu_processo_vvd_id_processos_vvd_id_fk" FOREIGN KEY ("processo_vvd_id") REFERENCES "public"."processos_vvd"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mpu_relatos" ADD CONSTRAINT "mpu_relatos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "promocao_log" ADD CONSTRAINT "promocao_log_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participacoes_objeto" ADD CONSTRAINT "participacoes_objeto_objeto_id_objetos_id_fk" FOREIGN KEY ("objeto_id") REFERENCES "public"."objetos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participacoes_objeto" ADD CONSTRAINT "participacoes_objeto_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participacoes_objeto" ADD CONSTRAINT "participacoes_objeto_pessoa_id_assistidos_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_microsoft_tokens" ADD CONSTRAINT "user_microsoft_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "acordaos" ADD CONSTRAINT "acordaos_recurso_id_recursos_id_fk" FOREIGN KEY ("recurso_id") REFERENCES "public"."recursos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_processo_origem_id_processos_id_fk" FOREIGN KEY ("processo_origem_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_defensor_origem_id_defensores_ba_id_fk" FOREIGN KEY ("defensor_origem_id") REFERENCES "public"."defensores_ba"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_defensor_destino_id_defensores_ba_id_fk" FOREIGN KEY ("defensor_destino_id") REFERENCES "public"."defensores_ba"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_relator_id_desembargadores_id_fk" FOREIGN KEY ("relator_id") REFERENCES "public"."desembargadores"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_revisor_id_desembargadores_id_fk" FOREIGN KEY ("revisor_id") REFERENCES "public"."desembargadores"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recursos" ADD CONSTRAINT "recursos_criado_por_id_defensores_ba_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."defensores_ba"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_processo_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_processo_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "participacoes_processo" ADD CONSTRAINT "participacoes_processo_testemunha_id_testemunhas_id_fk" FOREIGN KEY ("testemunha_id") REFERENCES "public"."testemunhas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoa_recortes" ADD CONSTRAINT "pessoa_recortes_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoa_recortes" ADD CONSTRAINT "pessoa_recortes_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoa_recortes" ADD CONSTRAINT "pessoa_recortes_criado_por_users_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoa_relacoes" ADD CONSTRAINT "pessoa_relacoes_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoa_relacoes" ADD CONSTRAINT "pessoa_relacoes_relacionada_pessoa_id_pessoas_id_fk" FOREIGN KEY ("relacionada_pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_criado_por_users_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoas" ADD CONSTRAINT "pessoas_merged_by_users_id_fk" FOREIGN KEY ("merged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_confirmed_pessoa_a_id_pessoas_id_fk" FOREIGN KEY ("pessoa_a_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_confirmed_pessoa_b_id_pessoas_id_fk" FOREIGN KEY ("pessoa_b_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoas_distincts_confirmed" ADD CONSTRAINT "pessoas_distincts_confirmed_confirmado_por_users_id_fk" FOREIGN KEY ("confirmado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos_triagem" ADD CONSTRAINT "atendimentos_triagem_defensor_alvo_id_users_id_fk" FOREIGN KEY ("defensor_alvo_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos_triagem" ADD CONSTRAINT "atendimentos_triagem_promovido_para_demanda_id_demandas_id_fk" FOREIGN KEY ("promovido_para_demanda_id") REFERENCES "public"."demandas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos_triagem" ADD CONSTRAINT "atendimentos_triagem_decidido_por_id_users_id_fk" FOREIGN KEY ("decidido_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registro_anexos_registro_id_idx" ON "registro_anexos" USING btree ("registro_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registro_anexos_autor_idx" ON "registro_anexos" USING btree ("autor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registro_anexos_drive_status_idx" ON "registro_anexos" USING btree ("drive_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_assistido_id_idx" ON "registros" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_processo_id_idx" ON "registros" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_caso_id_idx" ON "registros" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_demanda_id_idx" ON "registros" USING btree ("demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_audiencia_id_idx" ON "registros" USING btree ("audiencia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_data_idx" ON "registros" USING btree ("data_registro");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_tipo_idx" ON "registros" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_status_idx" ON "registros" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_autor_idx" ON "registros" USING btree ("autor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_enrichment_status_idx" ON "registros" USING btree ("enrichment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_plaud_recording_id_idx" ON "registros" USING btree ("plaud_recording_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_transcricao_status_idx" ON "registros" USING btree ("transcricao_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registros_numero_solar_idx" ON "registros" USING btree ("numero_solar");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claude_code_tasks_status_idx" ON "claude_code_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claude_code_tasks_lane_status_idx" ON "claude_code_tasks" USING btree ("lane","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claude_code_tasks_assistido_id_idx" ON "claude_code_tasks" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claude_code_tasks_caso_id_idx" ON "claude_code_tasks" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cautelares_decisao_processo_id_idx" ON "cautelares_decisao" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cautelares_decisao_status_idx" ON "cautelares_decisao" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prisao_preventiva_processo_id_idx" ON "prisao_preventiva" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prisao_preventiva_status_idx" ON "prisao_preventiva" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pje_download_jobs_status_idx" ON "pje_download_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pje_download_jobs_processo_idx" ON "pje_download_jobs" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_jobs_status_idx" ON "scan_intimacoes_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_jobs_batch_idx" ON "scan_intimacoes_jobs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coord_destino_regime_idx" ON "coordenacoes_destino" USING btree ("regime");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coord_destino_uf_idx" ON "coordenacoes_destino" USING btree ("uf");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coord_destino_ativo_idx" ON "coordenacoes_destino" USING btree ("ativo");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "dem_acomp_unique" ON "demandas_acompanhantes" USING btree ("demanda_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dem_acomp_user_idx" ON "demandas_acompanhantes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "enc_dest_unique" ON "encaminhamento_destinatarios" USING btree ("encaminhamento_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_dest_user_idx" ON "encaminhamento_destinatarios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_resp_enc_idx" ON "encaminhamento_respostas" USING btree ("encaminhamento_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_workspace_idx" ON "encaminhamentos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_remetente_idx" ON "encaminhamentos" USING btree ("remetente_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_demanda_idx" ON "encaminhamentos" USING btree ("demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_status_idx" ON "encaminhamentos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enc_created_idx" ON "encaminhamentos" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_especialidade_idx" ON "defensores_ba" USING btree ("especialidade");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_area_idx" ON "defensores_ba" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_instancia_idx" ON "defensores_ba" USING btree ("instancia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_localizacao_idx" ON "defensores_ba" USING btree ("localizacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_comarca_idx" ON "defensores_ba" USING btree ("comarca");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "defensores_ba_email_idx" ON "defensores_ba" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimento_demandas_demanda_idx" ON "atendimento_demandas" USING btree ("demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demanda_eventos_demanda_created_idx" ON "demanda_eventos" USING btree ("demanda_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demanda_eventos_pendentes_idx" ON "demanda_eventos" USING btree ("demanda_id","tipo","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demanda_eventos_autor_idx" ON "demanda_eventos" USING btree ("autor_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demanda_eventos_prazo_idx" ON "demanda_eventos" USING btree ("prazo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demanda_eventos_atendimento_idx" ON "demanda_eventos" USING btree ("atendimento_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demanda_eventos_deleted_idx" ON "demanda_eventos" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execucao_beneficios_execucao_id_idx" ON "execucao_beneficios" USING btree ("execucao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execucao_beneficios_decisao_idx" ON "execucao_beneficios" USING btree ("decisao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execucao_eventos_execucao_id_idx" ON "execucao_eventos" USING btree ("execucao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execucao_eventos_tipo_idx" ON "execucao_eventos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execucoes_penais_processo_id_idx" ON "execucoes_penais" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execucoes_penais_assistido_id_idx" ON "execucoes_penais" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "execucoes_penais_situacao_idx" ON "execucoes_penais" USING btree ("situacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unidades_prisionais_nome_idx" ON "unidades_prisionais" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedbacks_user_id_idx" ON "feedbacks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedbacks_status_idx" ON "feedbacks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedbacks_created_at_idx" ON "feedbacks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ferias_parcelas_periodo_idx" ON "ferias_parcelas" USING btree ("periodo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ferias_parcelas_defensor_status_deleted_idx" ON "ferias_parcelas" USING btree ("defensor_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ferias_periodos_defensor_deleted_idx" ON "ferias_periodos" USING btree ("defensor_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "substituicoes_defensor_id_idx" ON "substituicoes" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "substituicoes_status_idx" ON "substituicoes" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "substituicoes_data_inicio_idx" ON "substituicoes" USING btree ("data_inicio");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vf_eventos_defensor_status_deleted_idx" ON "vida_funcional_eventos" USING btree ("defensor_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vf_eventos_defensor_tipo_data_idx" ON "vida_funcional_eventos" USING btree ("defensor_id","tipo","data_evento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vf_eventos_defensor_prazo_idx" ON "vida_funcional_eventos" USING btree ("defensor_id","prazo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vf_eventos_cluster_idx" ON "vida_funcional_eventos" USING btree ("cluster");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_mpu_processo_vvd_id_idx" ON "medidas_mpu" USING btree ("processo_vvd_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_mpu_status_idx" ON "medidas_mpu" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mpu_relatos_processo_id_uniq" ON "mpu_relatos" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mpu_relatos_relacao_idx" ON "mpu_relatos" USING btree ("relacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mpu_relatos_gravidade_idx" ON "mpu_relatos" USING btree ("gravidade");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mpu_taxonomia_categoria_termo_uniq" ON "mpu_taxonomia" USING btree ("categoria","termo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mpu_taxonomia_categoria_idx" ON "mpu_taxonomia" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mpu_taxonomia_aprovado_idx" ON "mpu_taxonomia" USING btree ("aprovado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promocao_log_processo_idx" ON "promocao_log" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promocao_log_acao_idx" ON "promocao_log" USING btree ("acao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "objetos_tipo_idx" ON "objetos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "objetos_numero_serie_idx" ON "objetos" USING btree ("numero_serie");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "objetos_placa_idx" ON "objetos" USING btree ("placa");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "objetos_workspace_idx" ON "objetos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participacoes_objeto_objeto_idx" ON "participacoes_objeto" USING btree ("objeto_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participacoes_objeto_processo_idx" ON "participacoes_objeto" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_microsoft_tokens_user_idx" ON "user_microsoft_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_recurso_idx" ON "acordaos" USING btree ("recurso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_data_julgamento_idx" ON "acordaos" USING btree ("data_julgamento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_resultado_idx" ON "acordaos" USING btree ("resultado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_relator_idx" ON "acordaos" USING btree ("relator");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_analise_status_idx" ON "acordaos" USING btree ("analise_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desembargadores_camara_idx" ON "desembargadores" USING btree ("camara");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desembargadores_area_idx" ON "desembargadores" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_tipo_idx" ON "recursos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_tribunal_idx" ON "recursos" USING btree ("tribunal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_status_idx" ON "recursos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_resultado_idx" ON "recursos" USING btree ("resultado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_processo_origem_idx" ON "recursos" USING btree ("processo_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_assistido_idx" ON "recursos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_defensor_origem_idx" ON "recursos" USING btree ("defensor_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_defensor_destino_idx" ON "recursos" USING btree ("defensor_destino_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_relator_idx" ON "recursos" USING btree ("relator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_camara_idx" ON "recursos" USING btree ("camara");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_data_julgamento_idx" ON "recursos" USING btree ("data_julgamento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participacoes_pessoa_idx" ON "participacoes_processo" USING btree ("pessoa_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participacoes_processo_idx" ON "participacoes_processo" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participacoes_papel_idx" ON "participacoes_processo" USING btree ("papel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "participacoes_testemunha_idx" ON "participacoes_processo" USING btree ("testemunha_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoa_recortes_pessoa_idx" ON "pessoa_recortes" USING btree ("pessoa_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoa_recortes_processo_idx" ON "pessoa_recortes" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoa_relacoes_pessoa_idx" ON "pessoa_relacoes" USING btree ("pessoa_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoa_relacoes_relacionada_idx" ON "pessoa_relacoes" USING btree ("relacionada_pessoa_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pessoa_relacoes_unique_idx" ON "pessoa_relacoes" USING btree ("pessoa_id","grau","nome_livre");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoas_nome_norm_idx" ON "pessoas" USING btree ("nome_normalizado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoas_nome_trgm_idx" ON "pessoas" USING gin ("nome_normalizado" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoas_merged_idx" ON "pessoas" USING btree ("merged_into");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoas_categoria_idx" ON "pessoas" USING btree ("categoria_primaria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoas_workspace_idx" ON "pessoas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_status_idx" ON "atendimentos_triagem" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_defensor_alvo_idx" ON "atendimentos_triagem" USING btree ("defensor_alvo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_area_idx" ON "atendimentos_triagem" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_urgencia_idx" ON "atendimentos_triagem" USING btree ("urgencia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_created_at_idx" ON "atendimentos_triagem" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_processo_cnj_idx" ON "atendimentos_triagem" USING btree ("processo_cnj");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_promovido_demanda_idx" ON "atendimentos_triagem" USING btree ("promovido_para_demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "triagem_workspace_id_idx" ON "atendimentos_triagem" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pje_import_staging_job_id_idx" ON "pje_import_staging" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pje_import_staging_content_hash_idx" ON "pje_import_staging" USING btree ("content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pje_ledger_documento_id_uidx" ON "pje_intimacoes_ledger" USING btree ("pje_documento_id") WHERE pje_documento_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pje_ledger_content_hash_uidx" ON "pje_intimacoes_ledger" USING btree ("content_hash") WHERE pje_documento_id IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pje_ledger_processo_numero_idx" ON "pje_intimacoes_ledger" USING btree ("processo_numero");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "casos" ADD CONSTRAINT "casos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos" ADD CONSTRAINT "processos_processo_origem_id_processos_id_fk" FOREIGN KEY ("processo_origem_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos" ADD CONSTRAINT "processos_defensor_2g_id_defensores_ba_id_fk" FOREIGN KEY ("defensor_2g_id") REFERENCES "public"."defensores_ba"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos" ADD CONSTRAINT "processos_defensor_brasilia_id_defensores_ba_id_fk" FOREIGN KEY ("defensor_brasilia_id") REFERENCES "public"."defensores_ba"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_defensor_ba_id_defensores_ba_id_fk" FOREIGN KEY ("defensor_ba_id") REFERENCES "public"."defensores_ba"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_registro_id_registros_id_fk" FOREIGN KEY ("registro_id") REFERENCES "public"."registros"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anotacoes" ADD CONSTRAINT "anotacoes_registro_id_registros_id_fk" FOREIGN KEY ("registro_id") REFERENCES "public"."registros"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diligencias" ADD CONSTRAINT "diligencias_registro_id_registros_id_fk" FOREIGN KEY ("registro_id") REFERENCES "public"."registros"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_workspace_id_idx" ON "calendar_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_depo_transcricao_status_idx" ON "testemunhas" USING btree ("depoimento_transcricao_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_assistido_id_idx" ON "casos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_analysis_status_idx" ON "casos" USING btree ("analysis_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_workspace_id_idx" ON "assistidos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_workspace_id_idx" ON "demandas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_workspace_id_idx" ON "processos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_workspace_id_idx" ON "users" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "drive_files_provider_file_id_unique" ON "drive_files" USING btree ("drive_file_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "drive_sync_folders_provider_folder_id_unique" ON "drive_sync_folders" USING btree ("drive_folder_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_fase_procedimento_idx" ON "processos_vvd" USING btree ("fase_procedimento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_motivo_ultima_intimacao_idx" ON "processos_vvd" USING btree ("motivo_ultima_intimacao");--> statement-breakpoint
ALTER TABLE "assistidos" DROP COLUMN IF EXISTS "caso_id";--> statement-breakpoint
ALTER TABLE "demandas" DROP COLUMN IF EXISTS "providencias";--> statement-breakpoint
ALTER TABLE "public"."demandas" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."status_demanda";--> statement-breakpoint
CREATE TYPE "public"."status_demanda" AS ENUM('2_ATENDER', '4_MONITORAR', '5_TRIAGEM', '7_PROTOCOLADO', '7_CIENCIA', '7_SEM_ATUACAO', 'URGENTE', 'CONCLUIDO', 'ARQUIVADO');--> statement-breakpoint
ALTER TABLE "public"."demandas" ALTER COLUMN "status" SET DATA TYPE "public"."status_demanda" USING "status"::"public"."status_demanda";