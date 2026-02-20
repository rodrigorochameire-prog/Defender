CREATE TYPE "public"."acao_log" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'COMPLETE', 'DELEGATE', 'UPLOAD', 'SYNC');--> statement-breakpoint
CREATE TYPE "public"."analysis_type" AS ENUM('EXTRACAO', 'ESTRATEGIA', 'PREPARACAO', 'ENRIQUECIMENTO');--> statement-breakpoint
CREATE TYPE "public"."area_direito" AS ENUM('CRIMINAL', 'CIVEL', 'TRABALHISTA', 'EXECUCAO_PENAL', 'JURI');--> statement-breakpoint
CREATE TYPE "public"."area" AS ENUM('JURI', 'EXECUCAO_PENAL', 'VIOLENCIA_DOMESTICA', 'SUBSTITUICAO', 'CURADORIA', 'FAMILIA', 'CIVEL', 'FAZENDA_PUBLICA');--> statement-breakpoint
CREATE TYPE "public"."atribuicao" AS ENUM('JURI_CAMACARI', 'VVD_CAMACARI', 'EXECUCAO_PENAL', 'SUBSTITUICAO', 'SUBSTITUICAO_CIVEL', 'GRUPO_JURI');--> statement-breakpoint
CREATE TYPE "public"."atribuicao_rotativa" AS ENUM('JURI_EP', 'VVD');--> statement-breakpoint
CREATE TYPE "public"."chat_message_type" AS ENUM('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."diagrama_tipo" AS ENUM('MAPA_MENTAL', 'TIMELINE', 'RELACIONAL', 'HIERARQUIA', 'MATRIX', 'FLUXOGRAMA', 'LIVRE');--> statement-breakpoint
CREATE TYPE "public"."diligencia_status" AS ENUM('A_PESQUISAR', 'EM_ANDAMENTO', 'AGUARDANDO', 'LOCALIZADO', 'OBTIDO', 'INFRUTIFERO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."diligencia_tipo" AS ENUM('LOCALIZACAO_PESSOA', 'LOCALIZACAO_DOCUMENTO', 'REQUISICAO_DOCUMENTO', 'PESQUISA_OSINT', 'DILIGENCIA_CAMPO', 'INTIMACAO', 'OITIVA', 'PERICIA', 'EXAME', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."entidade_log" AS ENUM('demanda', 'assistido', 'processo', 'documento', 'audiencia', 'delegacao', 'caso', 'jurado');--> statement-breakpoint
CREATE TYPE "public"."extraction_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."fase_caso" AS ENUM('INQUERITO', 'INSTRUCAO', 'PLENARIO', 'RECURSO', 'EXECUCAO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."grupo_trabalho" AS ENUM('juri_ep_vvd', 'varas_criminais');--> statement-breakpoint
CREATE TYPE "public"."modelo_categoria" AS ENUM('PROVIDENCIA_ADMINISTRATIVA', 'PROVIDENCIA_FUNCIONAL', 'PROVIDENCIA_INSTITUCIONAL', 'PECA_PROCESSUAL', 'COMUNICACAO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."nivel_confianca" AS ENUM('BAIXA', 'MEDIA', 'ALTA');--> statement-breakpoint
CREATE TYPE "public"."papel_processo" AS ENUM('REU', 'CORREU', 'VITIMA', 'TESTEMUNHA', 'DENUNCIANTE', 'QUERELANTE', 'ASSISTENTE');--> statement-breakpoint
CREATE TYPE "public"."pattern_type" AS ENUM('orgao', 'classe', 'parte', 'numero');--> statement-breakpoint
CREATE TYPE "public"."prioridade" AS ENUM('BAIXA', 'NORMAL', 'ALTA', 'URGENTE', 'REU_PRESO');--> statement-breakpoint
CREATE TYPE "public"."simulacao_status" AS ENUM('RASCUNHO', 'PRONTO', 'APRESENTADO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."status_audiencia" AS ENUM('A_DESIGNAR', 'DESIGNADA', 'REALIZADA', 'AGUARDANDO_ATA', 'CONCLUIDA', 'ADIADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."status_caso" AS ENUM('ATIVO', 'SUSPENSO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."status_demanda" AS ENUM('2_ATENDER', '4_MONITORAR', '5_FILA', '7_PROTOCOLADO', '7_CIENCIA', '7_SEM_ATUACAO', 'URGENTE', 'CONCLUIDO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."status_mpu" AS ENUM('ATIVA', 'EXPIRADA', 'REVOGADA', 'RENOVADA', 'MODULADA', 'AGUARDANDO_DECISAO');--> statement-breakpoint
CREATE TYPE "public"."status_prisional" AS ENUM('SOLTO', 'CADEIA_PUBLICA', 'PENITENCIARIA', 'COP', 'HOSPITAL_CUSTODIA', 'DOMICILIAR', 'MONITORADO');--> statement-breakpoint
CREATE TYPE "public"."status_processo" AS ENUM('FLAGRANTE', 'INQUERITO', 'INSTRUCAO', 'RECURSO', 'EXECUCAO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."status_testemunha" AS ENUM('ARROLADA', 'INTIMADA', 'OUVIDA', 'DESISTIDA', 'NAO_LOCALIZADA', 'CARTA_PRECATORIA');--> statement-breakpoint
CREATE TYPE "public"."sync_direction" AS ENUM('bidirectional', 'drive_to_app', 'app_to_drive');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('synced', 'pending_upload', 'pending_download', 'conflict', 'error');--> statement-breakpoint
CREATE TYPE "public"."tendencia_voto" AS ENUM('CONDENAR', 'ABSOLVER', 'INDECISO');--> statement-breakpoint
CREATE TYPE "public"."tipo_analise_ia" AS ENUM('RESUMO_CASO', 'ANALISE_DENUNCIA', 'TESES_DEFENSIVAS', 'ANALISE_PROVAS', 'RISCO_CONDENACAO', 'JURISPRUDENCIA', 'ESTRATEGIA_JURI', 'PERFIL_JURADOS', 'COMPARACAO_CASOS', 'TIMELINE', 'PONTOS_FRACOS', 'QUESITACAO', 'MEMORIAL_DRAFT', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_audiencia" AS ENUM('INSTRUCAO', 'CUSTODIA', 'CONCILIACAO', 'JUSTIFICACAO', 'ADMONICAO', 'UNA', 'PLENARIO_JURI', 'CONTINUACAO', 'OUTRA');--> statement-breakpoint
CREATE TYPE "public"."tipo_decisao" AS ENUM('ACORDAO', 'DECISAO_MONOCRATICA', 'SUMULA', 'SUMULA_VINCULANTE', 'REPERCUSSAO_GERAL', 'RECURSO_REPETITIVO', 'INFORMATIVO', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_intimacao" AS ENUM('CIENCIA', 'PETICIONAR', 'AUDIENCIA', 'CUMPRIMENTO');--> statement-breakpoint
CREATE TYPE "public"."tipo_peca_processual" AS ENUM('DENUNCIA', 'QUEIXA_CRIME', 'PRONUNCIA', 'IMPRONUNCIA', 'ABSOLVICAO_SUMARIA', 'SENTENCA', 'ACORDAO', 'LAUDO_PERICIAL', 'LAUDO_CADAVERICO', 'LAUDO_PSIQUIATRICO', 'LAUDO_TOXICOLOGICO', 'ATA_AUDIENCIA', 'ATA_INTERROGATORIO', 'ATA_PLENARIO', 'DEPOIMENTO', 'BOLETIM_OCORRENCIA', 'AUTO_PRISAO', 'MANDADO', 'DECISAO_INTERLOCUTORIA', 'QUESITOS', 'MEMORIAL', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_testemunha" AS ENUM('DEFESA', 'ACUSACAO', 'COMUM', 'INFORMANTE', 'PERITO', 'VITIMA');--> statement-breakpoint
CREATE TYPE "public"."tribunal" AS ENUM('STF', 'STJ', 'TJBA', 'TRF1', 'TRF3', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."unidade" AS ENUM('CAMACARI', 'CANDEIAS', 'DIAS_DAVILA', 'SIMOES_FILHO', 'LAURO_DE_FREITAS', 'SALVADOR');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"acao" varchar(20) NOT NULL,
	"entidade_tipo" varchar(30) NOT NULL,
	"entidade_id" integer,
	"descricao" text,
	"detalhes" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "afastamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"substituto_id" integer NOT NULL,
	"data_inicio" date NOT NULL,
	"data_fim" date,
	"tipo" varchar(20) DEFAULT 'FERIAS' NOT NULL,
	"motivo" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"acesso_demandas" boolean DEFAULT true,
	"acesso_equipe" boolean DEFAULT false,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"analysis_type" "analysis_type" NOT NULL,
	"atribuicao" "atribuicao",
	"input_document_ids" jsonb,
	"input_summary" text,
	"output" jsonb NOT NULL,
	"confidence" real,
	"completeness" real,
	"model_used" varchar(100),
	"tokens_input" integer,
	"tokens_output" integer,
	"processing_time_ms" integer,
	"requested_by_id" integer,
	"is_approved" boolean,
	"approved_at" timestamp,
	"approved_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analises_ia" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer,
	"assistido_id" integer,
	"caso_id" integer,
	"peca_id" integer,
	"tipo_analise" "tipo_analise_ia" NOT NULL,
	"titulo" text NOT NULL,
	"prompt_utilizado" text,
	"conteudo" text NOT NULL,
	"dados_estruturados" text,
	"score_confianca" integer,
	"modelo_ia" varchar(50) DEFAULT 'gemini-pro',
	"tokens_utilizados" integer,
	"feedback_positivo" boolean,
	"feedback_comentario" text,
	"is_arquivado" boolean DEFAULT false,
	"is_favorito" boolean DEFAULT false,
	"criado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anotacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer,
	"assistido_id" integer,
	"demanda_id" integer,
	"caso_id" integer,
	"conteudo" text NOT NULL,
	"tipo" varchar(30) DEFAULT 'nota',
	"importante" boolean DEFAULT false,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "argumentos_sustentacao" (
	"id" serial PRIMARY KEY NOT NULL,
	"avaliacao_juri_id" integer NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"ordem" integer,
	"descricao_argumento" text,
	"reacao_jurados" text,
	"nivel_persuasao" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assistidos" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"cpf" varchar(14),
	"rg" varchar(20),
	"nome_mae" text,
	"nome_pai" text,
	"data_nascimento" date,
	"naturalidade" varchar(100),
	"nacionalidade" varchar(50) DEFAULT 'Brasileira',
	"workspace_id" integer,
	"status_prisional" "status_prisional" DEFAULT 'SOLTO',
	"local_prisao" text,
	"unidade_prisional" text,
	"data_prisao" date,
	"telefone" varchar(20),
	"telefone_contato" varchar(20),
	"nome_contato" text,
	"parentesco_contato" varchar(50),
	"endereco" text,
	"photo_url" text,
	"observacoes" text,
	"defensor_id" integer,
	"caso_id" integer,
	"atribuicao_primaria" "atribuicao" DEFAULT 'SUBSTITUICAO',
	"drive_folder_id" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assistidos_processos" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer NOT NULL,
	"processo_id" integer NOT NULL,
	"papel" "papel_processo" DEFAULT 'REU' NOT NULL,
	"is_principal" boolean DEFAULT true,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "atendimentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer NOT NULL,
	"processo_id" integer,
	"caso_id" integer,
	"workspace_id" integer,
	"data_atendimento" timestamp NOT NULL,
	"duracao" integer,
	"tipo" varchar(30) NOT NULL,
	"local" text,
	"assunto" text,
	"resumo" text,
	"acompanhantes" text,
	"status" varchar(20) DEFAULT 'agendado',
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
	"atendido_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audiencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"workspace_id" integer,
	"caso_id" integer,
	"assistido_id" integer,
	"data_audiencia" timestamp NOT NULL,
	"tipo" varchar(50) NOT NULL,
	"local" text,
	"titulo" text,
	"descricao" text,
	"sala" varchar(50),
	"horario" varchar(10),
	"defensor_id" integer,
	"juiz" text,
	"promotor" text,
	"status" varchar(30) DEFAULT 'agendada',
	"resultado" text,
	"observacoes" text,
	"anotacoes" text,
	"anotacoes_versao" integer DEFAULT 1,
	"resumo_defesa" text,
	"google_calendar_event_id" text,
	"gerar_prazo_apos" boolean DEFAULT false,
	"prazo_gerado_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audiencias_historico" (
	"id" serial PRIMARY KEY NOT NULL,
	"audiencia_id" integer NOT NULL,
	"versao" integer NOT NULL,
	"anotacoes" text NOT NULL,
	"editado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "avaliacao_jurados" (
	"id" serial PRIMARY KEY NOT NULL,
	"avaliacao_juri_id" integer NOT NULL,
	"jurado_id" integer,
	"posicao" integer NOT NULL,
	"nome" text,
	"profissao" varchar(100),
	"idade_aproximada" integer,
	"sexo" varchar(20),
	"aparencia_primeira_impressao" text,
	"linguagem_corporal_inicial" text,
	"tendencia_voto" "tendencia_voto",
	"nivel_confianca" "nivel_confianca",
	"justificativa_tendencia" text,
	"anotacoes_interrogatorio" text,
	"anotacoes_mp" text,
	"anotacoes_defesa" text,
	"anotacoes_gerais" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "avaliacao_testemunhas_juri" (
	"id" serial PRIMARY KEY NOT NULL,
	"avaliacao_juri_id" integer NOT NULL,
	"testemunha_id" integer,
	"ordem" integer,
	"nome" text NOT NULL,
	"resumo_depoimento" text,
	"reacao_jurados" text,
	"expressoes_faciais_linguagem" text,
	"credibilidade" integer,
	"observacoes_complementares" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "avaliacoes_juri" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessao_juri_id" integer NOT NULL,
	"processo_id" integer,
	"observador" text NOT NULL,
	"data_julgamento" date NOT NULL,
	"horario_inicio" varchar(10),
	"duracao_estimada" varchar(50),
	"descricao_ambiente" text,
	"disposicao_fisica" text,
	"clima_emocional_inicial" text,
	"presenca_publico_midia" text,
	"interrogatorio_reacao_geral" text,
	"interrogatorio_jurados_acreditaram" text,
	"interrogatorio_jurados_ceticos" text,
	"interrogatorio_momentos_impacto" text,
	"interrogatorio_contradicoes" text,
	"interrogatorio_impressao_credibilidade" text,
	"interrogatorio_nivel_credibilidade" integer,
	"mp_estrategia_geral" text,
	"mp_impacto_geral" integer,
	"mp_inclinacao_condenar" text,
	"defesa_estrategia_geral" text,
	"defesa_impacto_geral" integer,
	"defesa_duvida_razoavel" text,
	"replica_refutacoes" text,
	"replica_argumentos_novos" text,
	"replica_reacao_geral" text,
	"replica_impacto" integer,
	"replica_mudanca_opiniao" text,
	"treplica_refutacoes" text,
	"treplica_apelo_final" text,
	"treplica_reacao_geral" text,
	"treplica_momento_impactante" text,
	"treplica_impacto" integer,
	"treplica_reconquista_indecisos" text,
	"lado_mais_persuasivo" text,
	"impacto_acusacao" integer,
	"impacto_defesa" integer,
	"impressao_final_leiga" text,
	"argumento_mais_impactante" text,
	"pontos_nao_explorados" text,
	"clima_geral_julgamento" text,
	"momentos_virada" text,
	"surpresas_julgamento" text,
	"observacoes_adicionais" text,
	"status" varchar(30) DEFAULT 'em_andamento',
	"criado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "banco_pecas" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"conteudo_texto" text,
	"arquivo_url" text,
	"arquivo_key" text,
	"tipo_peca" varchar(100) NOT NULL,
	"area" "area",
	"tags" text,
	"sucesso" boolean,
	"resultado_descricao" text,
	"processo_referencia" text,
	"is_public" boolean DEFAULT true,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calculos_pena" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer,
	"assistido_id" integer,
	"tipo_calculo" varchar(30) NOT NULL,
	"pena_total" integer,
	"data_inicio" date,
	"regime" varchar(20),
	"data_resultado" date,
	"observacoes" text,
	"parametros" text,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calculos_prazos" (
	"id" serial PRIMARY KEY NOT NULL,
	"demanda_id" integer,
	"tipo_prazo_id" integer,
	"tipo_prazo_codigo" varchar(50),
	"data_expedicao" date,
	"data_leitura" date,
	"data_termo_inicial" date,
	"data_termo_final" date NOT NULL,
	"prazo_base_dias" integer NOT NULL,
	"prazo_com_dobro_dias" integer NOT NULL,
	"dias_uteis_suspensos" integer DEFAULT 0,
	"area_direito" varchar(20),
	"contado_em_dias_uteis" boolean DEFAULT false,
	"aplicou_dobro" boolean DEFAULT true,
	"tempo_leitura_aplicado" integer DEFAULT 10,
	"observacoes" text,
	"calculo_manual" boolean DEFAULT false,
	"workspace_id" integer,
	"calculado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calculos_seeu" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"assistido_id" integer,
	"data_base" date NOT NULL,
	"pena_total" integer NOT NULL,
	"regime_inicial" varchar(20),
	"fracao_progressao" varchar(20),
	"fracao_livramento" varchar(20),
	"data_progressao" date,
	"data_livramento" date,
	"data_termino" date,
	"data_saida" date,
	"dias_remidos" integer DEFAULT 0,
	"dias_trabalho" integer DEFAULT 0,
	"dias_estudo" integer DEFAULT 0,
	"is_hediondo" boolean DEFAULT false,
	"is_primario" boolean DEFAULT true,
	"status_progressao" varchar(30),
	"status_livramento" varchar(30),
	"observacoes" text,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"event_date" timestamp NOT NULL,
	"end_date" timestamp,
	"event_type" varchar(100) NOT NULL,
	"processo_id" integer,
	"assistido_id" integer,
	"demanda_id" integer,
	"workspace_id" integer,
	"is_all_day" boolean DEFAULT true NOT NULL,
	"color" varchar(20),
	"location" varchar(200),
	"notes" text,
	"reminder_minutes" integer,
	"priority" varchar(20) DEFAULT 'normal',
	"status" varchar(20) DEFAULT 'scheduled',
	"is_recurring" boolean DEFAULT false,
	"recurrence_type" varchar(20),
	"recurrence_interval" integer DEFAULT 1,
	"recurrence_end_date" timestamp,
	"recurrence_count" integer,
	"recurrence_days" varchar(50),
	"parent_event_id" integer,
	"deleted_at" timestamp,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_facts" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"tipo" varchar(30),
	"tags" jsonb,
	"status" varchar(20) DEFAULT 'ativo',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "case_personas" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer NOT NULL,
	"assistido_id" integer,
	"jurado_id" integer,
	"nome" text NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"status" varchar(30),
	"perfil" jsonb,
	"contatos" jsonb,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "caso_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(100) NOT NULL,
	"descricao" text,
	"cor" varchar(20) DEFAULT 'slate',
	"uso_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "caso_tags_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "casos" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"codigo" varchar(50),
	"atribuicao" "atribuicao" DEFAULT 'SUBSTITUICAO' NOT NULL,
	"workspace_id" integer,
	"teoria_fatos" text,
	"teoria_provas" text,
	"teoria_direito" text,
	"tags" text,
	"status" varchar(30) DEFAULT 'ativo',
	"fase" varchar(50),
	"prioridade" "prioridade" DEFAULT 'NORMAL',
	"defensor_id" integer,
	"caso_conexo_id" integer,
	"observacoes" text,
	"link_drive" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "casos_conexos" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_origem_id" integer NOT NULL,
	"caso_destino_id" integer NOT NULL,
	"tipo_conexao" varchar(50),
	"descricao" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compartilhamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"entidade_tipo" varchar(30) NOT NULL,
	"entidade_id" integer NOT NULL,
	"compartilhado_por" integer,
	"compartilhado_com" integer,
	"motivo" text,
	"data_inicio" timestamp DEFAULT now() NOT NULL,
	"data_fim" timestamp,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conselho_juri" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessao_id" integer NOT NULL,
	"jurado_id" integer NOT NULL,
	"posicao" integer,
	"voto" varchar(30),
	"anotacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "delegacoes_historico" (
	"id" serial PRIMARY KEY NOT NULL,
	"demanda_id" integer,
	"delegado_de_id" integer NOT NULL,
	"delegado_para_id" integer NOT NULL,
	"data_delegacao" timestamp DEFAULT now() NOT NULL,
	"data_aceitacao" timestamp,
	"data_conclusao" timestamp,
	"tipo" varchar(30) DEFAULT 'delegacao_generica',
	"instrucoes" text,
	"orientacoes" text,
	"observacoes" text,
	"prazo_sugerido" date,
	"status" varchar(25) DEFAULT 'pendente' NOT NULL,
	"assistido_id" integer,
	"processo_id" integer,
	"prioridade" varchar(10) DEFAULT 'NORMAL',
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "demandas" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"assistido_id" integer NOT NULL,
	"workspace_id" integer,
	"ato" text NOT NULL,
	"tipo_ato" varchar(50),
	"prazo" date,
	"data_entrada" date,
	"data_intimacao" date,
	"data_expedicao" date,
	"data_conclusao" timestamp,
	"tipo_prazo_id" integer,
	"status" "status_demanda" DEFAULT '5_FILA',
	"substatus" varchar(50),
	"prioridade" "prioridade" DEFAULT 'NORMAL',
	"providencias" text,
	"defensor_id" integer,
	"delegado_para_id" integer,
	"data_delegacao" timestamp,
	"motivo_delegacao" text,
	"status_delegacao" varchar(20),
	"prazo_sugerido" date,
	"reu_preso" boolean DEFAULT false,
	"google_calendar_event_id" text,
	"caso_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "depoimentos_analise" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer,
	"persona_id" integer,
	"testemunha_nome" text,
	"versao_delegacia" text,
	"versao_juizo" text,
	"contradicoes_identificadas" text,
	"pontos_fracos" text,
	"pontos_fortes" text,
	"estrategia_inquiricao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "diligencia_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(200) NOT NULL,
	"descricao" text,
	"tipo" "diligencia_tipo" NOT NULL,
	"aplicavel_a" jsonb,
	"titulo_template" varchar(300) NOT NULL,
	"descricao_template" text,
	"checklist_itens" jsonb,
	"prioridade_sugerida" "prioridade" DEFAULT 'NORMAL',
	"prazo_sugerido_dias" integer,
	"ordem" integer DEFAULT 0,
	"ativo" boolean DEFAULT true,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "diligencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(300) NOT NULL,
	"descricao" text,
	"tipo" "diligencia_tipo" DEFAULT 'OUTRO' NOT NULL,
	"status" "diligencia_status" DEFAULT 'A_PESQUISAR' NOT NULL,
	"processo_id" integer,
	"assistido_id" integer,
	"caso_id" integer,
	"persona_id" integer,
	"nome_pessoa_alvo" varchar(200),
	"tipo_relacao" varchar(50),
	"cpf_alvo" varchar(14),
	"endereco_alvo" text,
	"telefone_alvo" varchar(20),
	"resultado" text,
	"data_conclusao" timestamp,
	"prazo_estimado" timestamp,
	"prioridade" "prioridade" DEFAULT 'NORMAL',
	"links_osint" jsonb,
	"documentos" jsonb,
	"historico" jsonb,
	"tags" jsonb,
	"is_sugestao_automatica" boolean DEFAULT false,
	"sugestao_origem" varchar(100),
	"workspace_id" integer,
	"defensor_id" integer,
	"criado_por_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "distribution_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"drive_file_id" text NOT NULL,
	"original_filename" text NOT NULL,
	"extracted_numero_processo" text,
	"extracted_orgao_julgador" text,
	"extracted_assistido_nome" text,
	"extracted_classe_demanda" text,
	"atribuicao_identificada" "atribuicao",
	"atribuicao_confianca" integer,
	"assistido_id" integer,
	"processo_id" integer,
	"destination_folder_id" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"was_manually_correted" boolean DEFAULT false,
	"corrected_by" integer,
	"workspace_id" integer,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documento_modelos" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descricao" text,
	"categoria" "modelo_categoria" DEFAULT 'OUTRO' NOT NULL,
	"conteudo" text NOT NULL,
	"tipo_peca" varchar(100),
	"area" "area",
	"variaveis" jsonb,
	"formatacao" jsonb,
	"tags" jsonb,
	"is_public" boolean DEFAULT true,
	"is_ativo" boolean DEFAULT true,
	"total_usos" integer DEFAULT 0,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer,
	"assistido_id" integer,
	"demanda_id" integer,
	"caso_id" integer,
	"workspace_id" integer,
	"titulo" text NOT NULL,
	"descricao" text,
	"categoria" varchar(50) NOT NULL,
	"tipo_peca" varchar(100),
	"file_url" text NOT NULL,
	"file_key" text,
	"file_name" varchar(255),
	"mime_type" varchar(100),
	"file_size" integer,
	"is_template" boolean DEFAULT false,
	"uploaded_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documentos_gerados" (
	"id" serial PRIMARY KEY NOT NULL,
	"modelo_id" integer,
	"processo_id" integer,
	"assistido_id" integer,
	"demanda_id" integer,
	"caso_id" integer,
	"titulo" varchar(300) NOT NULL,
	"conteudo_final" text NOT NULL,
	"valores_variaveis" jsonb,
	"gerado_por_ia" boolean DEFAULT false,
	"prompt_ia" text,
	"google_doc_id" text,
	"google_doc_url" text,
	"drive_file_id" text,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drive_file_contents" (
	"id" serial PRIMARY KEY NOT NULL,
	"drive_file_id" integer NOT NULL,
	"extraction_status" "extraction_status" DEFAULT 'PENDING' NOT NULL,
	"content_markdown" text,
	"content_text" text,
	"extracted_data" jsonb,
	"document_type" varchar(100),
	"document_subtype" varchar(100),
	"extracted_at" timestamp,
	"processing_time_ms" integer,
	"page_count" integer,
	"table_count" integer,
	"image_count" integer,
	"word_count" integer,
	"error_message" text,
	"error_stack" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drive_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"drive_file_id" varchar(100) NOT NULL,
	"drive_folder_id" varchar(100) NOT NULL,
	"name" varchar(500) NOT NULL,
	"mime_type" varchar(100),
	"file_size" integer,
	"description" text,
	"web_view_link" text,
	"web_content_link" text,
	"thumbnail_link" text,
	"icon_link" text,
	"sync_status" varchar(20) DEFAULT 'synced',
	"last_modified_time" timestamp,
	"last_sync_at" timestamp,
	"local_checksum" varchar(64),
	"drive_checksum" varchar(64),
	"processo_id" integer,
	"assistido_id" integer,
	"documento_id" integer,
	"local_file_url" text,
	"local_file_key" text,
	"version" integer DEFAULT 1,
	"is_folder" boolean DEFAULT false,
	"parent_file_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drive_files_drive_file_id_unique" UNIQUE("drive_file_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drive_sync_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"drive_folder_id" varchar(100) NOT NULL,
	"drive_folder_url" text,
	"description" text,
	"sync_direction" varchar(20) DEFAULT 'bidirectional',
	"is_active" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"sync_token" text,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drive_sync_folders_drive_folder_id_unique" UNIQUE("drive_folder_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drive_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"drive_file_id" varchar(100),
	"action" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'success',
	"details" text,
	"error_message" text,
	"user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drive_webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" varchar(100) NOT NULL,
	"resource_id" varchar(100),
	"folder_id" varchar(100) NOT NULL,
	"expiration" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drive_webhooks_channel_id_unique" UNIQUE("channel_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escalas_atribuicao" (
	"id" serial PRIMARY KEY NOT NULL,
	"profissional_id" integer,
	"atribuicao" varchar(30) NOT NULL,
	"mes" integer NOT NULL,
	"ano" integer NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evolution_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"instance_name" varchar(100) NOT NULL,
	"api_url" text NOT NULL,
	"api_key" text NOT NULL,
	"status" varchar(20) DEFAULT 'disconnected' NOT NULL,
	"qr_code" text,
	"phone_number" varchar(20),
	"webhook_url" text,
	"webhook_secret" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"auto_reply" boolean DEFAULT false NOT NULL,
	"auto_reply_message" text,
	"last_sync_at" timestamp,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evolution_config_instance_name_unique" UNIQUE("instance_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extraction_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern_type" "pattern_type" NOT NULL,
	"original_value" text NOT NULL,
	"corrected_value" text,
	"correct_atribuicao" "atribuicao",
	"regex_used" text,
	"confidence_before" integer,
	"documento_exemplo" text,
	"times_used" integer DEFAULT 1 NOT NULL,
	"workspace_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fact_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"fact_id" integer NOT NULL,
	"documento_id" integer,
	"source_type" varchar(30),
	"source_id" text,
	"trecho" text,
	"contradicao" boolean DEFAULT false,
	"confianca" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feriados_forenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"data" date NOT NULL,
	"nome" varchar(150) NOT NULL,
	"tipo" varchar(30) DEFAULT 'FERIADO' NOT NULL,
	"abrangencia" varchar(30) DEFAULT 'NACIONAL',
	"estado" varchar(2),
	"comarca" varchar(100),
	"tribunal" varchar(20),
	"suspende_prazo" boolean DEFAULT true,
	"apenas_expediente" boolean DEFAULT false,
	"data_fim" date,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "historico_mpu" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_vvd_id" integer NOT NULL,
	"tipo_evento" varchar(30) NOT NULL,
	"data_evento" date NOT NULL,
	"descricao" text,
	"medidas_vigentes" text,
	"nova_data_vencimento" date,
	"nova_distancia" integer,
	"pje_documento_id" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intimacoes_vvd" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_vvd_id" integer NOT NULL,
	"tipo_intimacao" "tipo_intimacao" DEFAULT 'CIENCIA' NOT NULL,
	"ato" text NOT NULL,
	"data_expedicao" date,
	"data_intimacao" date,
	"prazo" date,
	"prazo_dias" integer,
	"pje_documento_id" varchar(20),
	"pje_tipo_documento" varchar(50),
	"status" varchar(30) DEFAULT 'pendente',
	"providencias" text,
	"demanda_id" integer,
	"defensor_id" integer,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurados" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"profissao" varchar(100),
	"escolaridade" varchar(50),
	"idade" integer,
	"bairro" varchar(100),
	"genero" varchar(20),
	"classe_social" varchar(30),
	"perfil_psicologico" text,
	"tendencia_voto" integer,
	"status" varchar(30),
	"sessao_juri_id" integer,
	"total_sessoes" integer DEFAULT 0,
	"votos_condenacao" integer DEFAULT 0,
	"votos_absolvicao" integer DEFAULT 0,
	"votos_desclassificacao" integer DEFAULT 0,
	"perfil_tendencia" varchar(30),
	"observacoes" text,
	"historico_notas" text,
	"ativo" boolean DEFAULT true,
	"reuniao_periodica" varchar(10),
	"tipo_jurado" varchar(20),
	"empresa" varchar(150),
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "juri_script_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer NOT NULL,
	"sessao_juri_id" integer,
	"persona_id" integer,
	"fact_id" integer,
	"pergunta" text,
	"fase" varchar(40),
	"ordem" integer,
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisprudencia_buscas" (
	"id" serial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"tipo_query" varchar(20) DEFAULT 'pergunta',
	"resposta" text,
	"julgados_ids" jsonb,
	"tempo_resposta" integer,
	"total_resultados" integer,
	"feedback" varchar(20),
	"workspace_id" integer,
	"user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisprudencia_drive_folders" (
	"id" serial PRIMARY KEY NOT NULL,
	"folder_id" varchar(100) NOT NULL,
	"folder_name" varchar(255),
	"folder_path" text,
	"tribunal" "tribunal",
	"tema_id" integer,
	"is_active" boolean DEFAULT true,
	"last_sync_at" timestamp,
	"total_arquivos" integer DEFAULT 0,
	"arquivos_sincronizados" integer DEFAULT 0,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisprudencia_julgados" (
	"id" serial PRIMARY KEY NOT NULL,
	"tribunal" "tribunal" NOT NULL,
	"tipo_decisao" "tipo_decisao" NOT NULL,
	"numero_processo" varchar(100),
	"numero_recurso" varchar(100),
	"relator" varchar(200),
	"orgao_julgador" varchar(200),
	"data_julgamento" date,
	"data_publicacao" date,
	"ementa" text,
	"ementa_resumo" text,
	"decisao" text,
	"votacao" varchar(100),
	"texto_integral" text,
	"tema_id" integer,
	"tese_id" integer,
	"tags" jsonb,
	"palavras_chave" jsonb,
	"drive_file_id" varchar(100),
	"drive_file_url" text,
	"arquivo_nome" varchar(255),
	"arquivo_tamanho" integer,
	"processado_por_ia" boolean DEFAULT false,
	"ia_resumo" text,
	"ia_pontos_chave" jsonb,
	"ia_argumentos" jsonb,
	"embedding" jsonb,
	"citacao_formatada" text,
	"status" varchar(20) DEFAULT 'pendente',
	"is_favorito" boolean DEFAULT false,
	"fonte" varchar(100),
	"observacoes" text,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisprudencia_temas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(200) NOT NULL,
	"descricao" text,
	"cor" varchar(20) DEFAULT '#6366f1',
	"icone" varchar(50),
	"parent_id" integer,
	"total_julgados" integer DEFAULT 0,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jurisprudencia_teses" (
	"id" serial PRIMARY KEY NOT NULL,
	"tema_id" integer,
	"titulo" varchar(300) NOT NULL,
	"descricao" text,
	"texto_tese" text,
	"posicao" varchar(20) DEFAULT 'favoravel',
	"forca" varchar(20) DEFAULT 'medio',
	"tags" jsonb,
	"total_julgados" integer DEFAULT 0,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medidas_protetivas" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"assistido_id" integer,
	"numero_medida" varchar(50),
	"tipo_medida" varchar(100) NOT NULL,
	"data_decisao" date,
	"prazo_dias" integer,
	"data_vencimento" date,
	"distancia_metros" integer,
	"nome_vitima" text,
	"telefone_vitima" varchar(20),
	"status" varchar(30) DEFAULT 'ativa',
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "movimentacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"data_movimentacao" timestamp NOT NULL,
	"descricao" text NOT NULL,
	"tipo" varchar(50),
	"origem" varchar(20) DEFAULT 'manual',
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"processo_id" integer,
	"demanda_id" integer,
	"type" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"action_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "palacio_conexoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"diagrama_id" integer NOT NULL,
	"elemento_origem_id" integer NOT NULL,
	"elemento_destino_id" integer NOT NULL,
	"tipo_conexao" varchar(30),
	"label" text,
	"forca" integer,
	"direcional" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "palacio_diagramas" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"tipo" "diagrama_tipo" DEFAULT 'MAPA_MENTAL' NOT NULL,
	"excalidraw_data" jsonb,
	"thumbnail" text,
	"versao" integer DEFAULT 1,
	"ultimo_exportado" timestamp,
	"formato_exportacao" varchar(20),
	"ordem" integer DEFAULT 0,
	"tags" jsonb,
	"status" varchar(20) DEFAULT 'ativo',
	"criado_por_id" integer,
	"atualizado_por_id" integer,
	"workspace_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "palacio_elementos" (
	"id" serial PRIMARY KEY NOT NULL,
	"diagrama_id" integer NOT NULL,
	"excalidraw_element_id" text NOT NULL,
	"tipo_vinculo" varchar(30),
	"persona_id" integer,
	"fato_id" integer,
	"documento_id" integer,
	"testemunha_id" integer,
	"tese_id" integer,
	"label" text,
	"notas" text,
	"cor" varchar(20),
	"icone" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partes_vvd" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"cpf" varchar(14),
	"rg" varchar(20),
	"data_nascimento" date,
	"tipo_parte" varchar(20) NOT NULL,
	"telefone" varchar(20),
	"telefone_secundario" varchar(20),
	"email" varchar(100),
	"endereco" text,
	"bairro" varchar(100),
	"cidade" varchar(100),
	"parentesco" varchar(50),
	"observacoes" text,
	"workspace_id" integer,
	"defensor_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "peca_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(200) NOT NULL,
	"descricao" text,
	"tipo_peca" varchar(100) NOT NULL,
	"area" "area",
	"conteudo" text,
	"file_url" text,
	"is_public" boolean DEFAULT false,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pecas_processuais" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"assistido_id" integer,
	"caso_id" integer,
	"titulo" text NOT NULL,
	"tipo_peca" "tipo_peca_processual" NOT NULL,
	"numero_paginas" integer,
	"data_documento" date,
	"drive_file_id" varchar(100),
	"arquivo_url" text,
	"arquivo_key" text,
	"mime_type" varchar(100),
	"file_size" integer,
	"conteudo_texto" text,
	"resumo_ia" text,
	"pontos_criticos" text,
	"metadados" text,
	"is_destaque" boolean DEFAULT false,
	"ordem_exibicao" integer DEFAULT 0,
	"tags" text,
	"observacoes" text,
	"uploaded_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personagens_juri" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"vara" varchar(100),
	"comarca" varchar(100),
	"estilo_atuacao" text,
	"pontos_fortes" text,
	"pontos_fracos" text,
	"tendencias_observadas" text,
	"estrategias_recomendadas" text,
	"historico" text,
	"total_sessoes" integer DEFAULT 0,
	"ativo" boolean DEFAULT true,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plaud_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"api_key" text,
	"api_secret" text,
	"webhook_secret" text,
	"device_id" varchar(100),
	"device_name" varchar(100),
	"device_model" varchar(50),
	"default_language" varchar(10) DEFAULT 'pt-BR',
	"auto_transcribe" boolean DEFAULT true,
	"auto_summarize" boolean DEFAULT true,
	"auto_upload_to_drive" boolean DEFAULT true,
	"drive_folder_id" varchar(100),
	"is_active" boolean DEFAULT false NOT NULL,
	"last_sync_at" timestamp,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plaud_recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"plaud_recording_id" varchar(100) NOT NULL,
	"plaud_device_id" varchar(100),
	"title" varchar(255),
	"duration" integer,
	"recorded_at" timestamp,
	"file_size" integer,
	"status" varchar(20) DEFAULT 'received',
	"error_message" text,
	"transcription" text,
	"summary" text,
	"speakers" jsonb,
	"atendimento_id" integer,
	"assistido_id" integer,
	"drive_file_id" varchar(100),
	"drive_file_url" text,
	"raw_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaud_recordings_plaud_recording_id_unique" UNIQUE("plaud_recording_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processos" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer NOT NULL,
	"atribuicao" "atribuicao" DEFAULT 'SUBSTITUICAO' NOT NULL,
	"workspace_id" integer,
	"numero_autos" text NOT NULL,
	"numero_antigo" text,
	"comarca" varchar(100),
	"vara" varchar(100),
	"area" "area" NOT NULL,
	"classe_processual" varchar(100),
	"assunto" text,
	"valor_causa" integer,
	"parte_contraria" text,
	"advogado_contrario" text,
	"fase" varchar(50),
	"situacao" varchar(50) DEFAULT 'ativo',
	"is_juri" boolean DEFAULT false,
	"data_sessao_juri" timestamp,
	"resultado_juri" text,
	"defensor_id" integer,
	"observacoes" text,
	"link_drive" text,
	"drive_folder_id" text,
	"caso_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processos_vvd" (
	"id" serial PRIMARY KEY NOT NULL,
	"autor_id" integer NOT NULL,
	"vitima_id" integer,
	"numero_autos" text NOT NULL,
	"tipo_processo" varchar(20) DEFAULT 'MPU' NOT NULL,
	"comarca" varchar(100),
	"vara" varchar(100) DEFAULT 'Vara de Violência Doméstica',
	"crime" varchar(200),
	"assunto" text,
	"data_distribuicao" date,
	"data_ultima_movimentacao" date,
	"fase" varchar(50) DEFAULT 'tramitando',
	"situacao" varchar(50) DEFAULT 'ativo',
	"mpu_ativa" boolean DEFAULT false,
	"data_decisao_mpu" date,
	"tipos_mpu" text,
	"data_vencimento_mpu" date,
	"distancia_minima" integer,
	"defensor_id" integer,
	"observacoes" text,
	"pje_documento_id" varchar(20),
	"pje_ultima_atualizacao" timestamp,
	"workspace_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profissionais" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"nome" text NOT NULL,
	"nome_curto" varchar(50),
	"email" text,
	"grupo" varchar(30) NOT NULL,
	"vara" varchar(50),
	"cor" varchar(20) DEFAULT 'zinc',
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profissionais_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roteiro_plenario" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer,
	"ordem" integer,
	"fase" varchar(40),
	"conteudo" jsonb,
	"tempo_estimado" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessoes_juri" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"workspace_id" integer,
	"data_sessao" timestamp NOT NULL,
	"horario" varchar(10),
	"sala" varchar(50),
	"defensor_id" integer,
	"defensor_nome" text,
	"assistido_nome" text,
	"status" varchar(30) DEFAULT 'agendada',
	"resultado" text,
	"pena_aplicada" text,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"categoria" varchar(30) NOT NULL,
	"subcategoria" varchar(50),
	"arquivo_url" text NOT NULL,
	"thumbnail_url" text,
	"formato" varchar(20),
	"descricao" text,
	"tags" jsonb,
	"tamanho_bytes" integer,
	"fonte" varchar(50),
	"licenca" varchar(50),
	"atribuicao" text,
	"configuracao_padrao" jsonb,
	"publico" boolean DEFAULT false,
	"workspace_id" integer,
	"criado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_exportacoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"versao_id" integer NOT NULL,
	"video_url" text,
	"thumbnail_url" text,
	"formato" varchar(10),
	"resolucao" varchar(20),
	"status" varchar(20) DEFAULT 'pendente',
	"progresso" integer DEFAULT 0,
	"erro" text,
	"tamanho_bytes" integer,
	"duracao_segundos" real,
	"fps" integer,
	"render_engine" varchar(20),
	"tempo_renderizacao" integer,
	"criado_por_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_keyframes" (
	"id" serial PRIMARY KEY NOT NULL,
	"versao_id" integer NOT NULL,
	"personagem_id" integer,
	"objeto_id" integer,
	"camera_id" text,
	"tempo" real NOT NULL,
	"frame" integer,
	"posicao" jsonb,
	"rotacao" jsonb,
	"escala" jsonb,
	"animacao" varchar(50),
	"animacao_velocidade" real DEFAULT 1,
	"opacidade" real DEFAULT 1,
	"visivel" boolean DEFAULT true,
	"easing" varchar(30) DEFAULT 'linear',
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_objetos" (
	"id" serial PRIMARY KEY NOT NULL,
	"simulacao_id" integer NOT NULL,
	"nome" text NOT NULL,
	"tipo" varchar(30),
	"modelo_url" text,
	"modelo_nome" varchar(100),
	"posicao" jsonb,
	"rotacao" jsonb,
	"escala" jsonb,
	"cor" varchar(20),
	"visivel" boolean DEFAULT true,
	"destacado" boolean DEFAULT false,
	"descricao" text,
	"ordem" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_personagens" (
	"id" serial PRIMARY KEY NOT NULL,
	"simulacao_id" integer NOT NULL,
	"nome" text NOT NULL,
	"papel" varchar(30),
	"persona_id" integer,
	"avatar_url" text,
	"avatar_tipo" varchar(30),
	"cor" varchar(20),
	"altura" real DEFAULT 1.7,
	"posicao_inicial" jsonb,
	"rotacao_inicial" jsonb,
	"animacao_padrao" varchar(50) DEFAULT 'idle',
	"ordem" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacao_versoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"simulacao_id" integer NOT NULL,
	"nome" text NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"cor" varchar(20),
	"animacao_data" jsonb,
	"duracao" real,
	"narrativa" text,
	"camera_id" text,
	"ordem" integer DEFAULT 0,
	"ativa" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulacoes_3d" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"cena_data" jsonb,
	"thumbnail" text,
	"status" "simulacao_status" DEFAULT 'RASCUNHO',
	"config_export" jsonb,
	"criado_por_id" integer,
	"atualizado_por_id" integer,
	"workspace_id" integer,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teses_defensivas" (
	"id" serial PRIMARY KEY NOT NULL,
	"caso_id" integer,
	"titulo" text NOT NULL,
	"descricao" text,
	"tipo" varchar(30),
	"probabilidade_aceitacao" integer,
	"argumentos_chave" jsonb,
	"jurisprudencia_relacionada" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "testemunhas" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"caso_id" integer,
	"audiencia_id" integer,
	"nome" text NOT NULL,
	"tipo" "tipo_testemunha" NOT NULL,
	"status" "status_testemunha" DEFAULT 'ARROLADA',
	"telefone" varchar(20),
	"endereco" text,
	"resumo_depoimento" text,
	"pontos_favoraveis" text,
	"pontos_desfavoraveis" text,
	"perguntas_sugeridas" text,
	"ordem_inquiricao" integer,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tipo_prazos" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"nome" varchar(150) NOT NULL,
	"descricao" text,
	"prazo_legal_dias" integer NOT NULL,
	"area_direito" "area_direito" DEFAULT 'CRIMINAL' NOT NULL,
	"contar_em_dias_uteis" boolean DEFAULT false,
	"aplicar_dobro_defensoria" boolean DEFAULT true,
	"tempo_leitura_dias" integer DEFAULT 10,
	"termo_inicial" varchar(50) DEFAULT 'INTIMACAO',
	"categoria" varchar(50),
	"fase" varchar(50),
	"is_active" boolean DEFAULT true,
	"workspace_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tipo_prazos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"role" varchar(20) DEFAULT 'defensor' NOT NULL,
	"phone" text,
	"oab" varchar(50),
	"comarca" varchar(100),
	"workspace_id" integer,
	"email_verified" boolean DEFAULT false NOT NULL,
	"approval_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"supervisor_id" integer,
	"funcao" varchar(30),
	"nucleo" varchar(30),
	"is_admin" boolean DEFAULT false,
	"pode_ver_todos_assistidos" boolean DEFAULT true,
	"pode_ver_todos_processos" boolean DEFAULT true,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"wa_message_id" varchar(255),
	"direction" varchar(10) NOT NULL,
	"type" "chat_message_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"media_url" text,
	"media_mime_type" varchar(100),
	"media_filename" varchar(255),
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"access_token" text,
	"phone_number_id" text,
	"business_account_id" text,
	"webhook_verify_token" text,
	"display_phone_number" text,
	"verified_name" text,
	"quality_rating" varchar(20),
	"is_active" boolean DEFAULT false NOT NULL,
	"last_verified_at" timestamp,
	"auto_notify_prazo" boolean DEFAULT false NOT NULL,
	"auto_notify_audiencia" boolean DEFAULT false NOT NULL,
	"auto_notify_juri" boolean DEFAULT false NOT NULL,
	"auto_notify_movimentacao" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_config_admin_id_unique" UNIQUE("admin_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"phone" varchar(20) NOT NULL,
	"name" text,
	"push_name" text,
	"profile_pic_url" text,
	"assistido_id" integer,
	"tags" text[],
	"notes" text,
	"last_message_at" timestamp,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"to_phone" text NOT NULL,
	"to_name" text,
	"assistido_id" integer,
	"message_type" varchar(50) NOT NULL,
	"template_name" text,
	"content" text,
	"message_id" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"context" varchar(50),
	"sent_by_id" integer,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "afastamentos" ADD CONSTRAINT "afastamentos_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "afastamentos" ADD CONSTRAINT "afastamentos_substituto_id_users_id_fk" FOREIGN KEY ("substituto_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "afastamentos" ADD CONSTRAINT "afastamentos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_analyses" ADD CONSTRAINT "agent_analyses_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_analyses" ADD CONSTRAINT "agent_analyses_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analises_ia" ADD CONSTRAINT "analises_ia_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analises_ia" ADD CONSTRAINT "analises_ia_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analises_ia" ADD CONSTRAINT "analises_ia_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analises_ia" ADD CONSTRAINT "analises_ia_peca_id_pecas_processuais_id_fk" FOREIGN KEY ("peca_id") REFERENCES "public"."pecas_processuais"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analises_ia" ADD CONSTRAINT "analises_ia_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anotacoes" ADD CONSTRAINT "anotacoes_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anotacoes" ADD CONSTRAINT "anotacoes_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anotacoes" ADD CONSTRAINT "anotacoes_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anotacoes" ADD CONSTRAINT "anotacoes_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "anotacoes" ADD CONSTRAINT "anotacoes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "argumentos_sustentacao" ADD CONSTRAINT "argumentos_sustentacao_avaliacao_juri_id_avaliacoes_juri_id_fk" FOREIGN KEY ("avaliacao_juri_id") REFERENCES "public"."avaliacoes_juri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistidos" ADD CONSTRAINT "assistidos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistidos" ADD CONSTRAINT "assistidos_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistidos_processos" ADD CONSTRAINT "assistidos_processos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assistidos_processos" ADD CONSTRAINT "assistidos_processos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_atendido_por_id_users_id_fk" FOREIGN KEY ("atendido_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencias" ADD CONSTRAINT "audiencias_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencias" ADD CONSTRAINT "audiencias_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencias" ADD CONSTRAINT "audiencias_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencias_historico" ADD CONSTRAINT "audiencias_historico_audiencia_id_audiencias_id_fk" FOREIGN KEY ("audiencia_id") REFERENCES "public"."audiencias"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audiencias_historico" ADD CONSTRAINT "audiencias_historico_editado_por_id_users_id_fk" FOREIGN KEY ("editado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avaliacao_jurados" ADD CONSTRAINT "avaliacao_jurados_avaliacao_juri_id_avaliacoes_juri_id_fk" FOREIGN KEY ("avaliacao_juri_id") REFERENCES "public"."avaliacoes_juri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avaliacao_jurados" ADD CONSTRAINT "avaliacao_jurados_jurado_id_jurados_id_fk" FOREIGN KEY ("jurado_id") REFERENCES "public"."jurados"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avaliacao_testemunhas_juri" ADD CONSTRAINT "avaliacao_testemunhas_juri_avaliacao_juri_id_avaliacoes_juri_id_fk" FOREIGN KEY ("avaliacao_juri_id") REFERENCES "public"."avaliacoes_juri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avaliacao_testemunhas_juri" ADD CONSTRAINT "avaliacao_testemunhas_juri_testemunha_id_testemunhas_id_fk" FOREIGN KEY ("testemunha_id") REFERENCES "public"."testemunhas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avaliacoes_juri" ADD CONSTRAINT "avaliacoes_juri_sessao_juri_id_sessoes_juri_id_fk" FOREIGN KEY ("sessao_juri_id") REFERENCES "public"."sessoes_juri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avaliacoes_juri" ADD CONSTRAINT "avaliacoes_juri_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "avaliacoes_juri" ADD CONSTRAINT "avaliacoes_juri_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "banco_pecas" ADD CONSTRAINT "banco_pecas_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_pena" ADD CONSTRAINT "calculos_pena_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_pena" ADD CONSTRAINT "calculos_pena_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_pena" ADD CONSTRAINT "calculos_pena_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_prazos" ADD CONSTRAINT "calculos_prazos_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_prazos" ADD CONSTRAINT "calculos_prazos_tipo_prazo_id_tipo_prazos_id_fk" FOREIGN KEY ("tipo_prazo_id") REFERENCES "public"."tipo_prazos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_prazos" ADD CONSTRAINT "calculos_prazos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_prazos" ADD CONSTRAINT "calculos_prazos_calculado_por_id_users_id_fk" FOREIGN KEY ("calculado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_seeu" ADD CONSTRAINT "calculos_seeu_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_seeu" ADD CONSTRAINT "calculos_seeu_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calculos_seeu" ADD CONSTRAINT "calculos_seeu_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_facts" ADD CONSTRAINT "case_facts_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_personas" ADD CONSTRAINT "case_personas_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_personas" ADD CONSTRAINT "case_personas_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "case_personas" ADD CONSTRAINT "case_personas_jurado_id_jurados_id_fk" FOREIGN KEY ("jurado_id") REFERENCES "public"."jurados"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "casos" ADD CONSTRAINT "casos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "casos" ADD CONSTRAINT "casos_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "casos_conexos" ADD CONSTRAINT "casos_conexos_caso_origem_id_casos_id_fk" FOREIGN KEY ("caso_origem_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "casos_conexos" ADD CONSTRAINT "casos_conexos_caso_destino_id_casos_id_fk" FOREIGN KEY ("caso_destino_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compartilhamentos" ADD CONSTRAINT "compartilhamentos_compartilhado_por_profissionais_id_fk" FOREIGN KEY ("compartilhado_por") REFERENCES "public"."profissionais"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compartilhamentos" ADD CONSTRAINT "compartilhamentos_compartilhado_com_profissionais_id_fk" FOREIGN KEY ("compartilhado_com") REFERENCES "public"."profissionais"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conselho_juri" ADD CONSTRAINT "conselho_juri_sessao_id_sessoes_juri_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."sessoes_juri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conselho_juri" ADD CONSTRAINT "conselho_juri_jurado_id_jurados_id_fk" FOREIGN KEY ("jurado_id") REFERENCES "public"."jurados"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delegacoes_historico" ADD CONSTRAINT "delegacoes_historico_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delegacoes_historico" ADD CONSTRAINT "delegacoes_historico_delegado_de_id_users_id_fk" FOREIGN KEY ("delegado_de_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delegacoes_historico" ADD CONSTRAINT "delegacoes_historico_delegado_para_id_users_id_fk" FOREIGN KEY ("delegado_para_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delegacoes_historico" ADD CONSTRAINT "delegacoes_historico_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delegacoes_historico" ADD CONSTRAINT "delegacoes_historico_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delegacoes_historico" ADD CONSTRAINT "delegacoes_historico_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas" ADD CONSTRAINT "demandas_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas" ADD CONSTRAINT "demandas_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas" ADD CONSTRAINT "demandas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas" ADD CONSTRAINT "demandas_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "demandas" ADD CONSTRAINT "demandas_delegado_para_id_users_id_fk" FOREIGN KEY ("delegado_para_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "depoimentos_analise" ADD CONSTRAINT "depoimentos_analise_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "depoimentos_analise" ADD CONSTRAINT "depoimentos_analise_persona_id_case_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."case_personas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diligencia_templates" ADD CONSTRAINT "diligencia_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diligencias" ADD CONSTRAINT "diligencias_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diligencias" ADD CONSTRAINT "diligencias_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diligencias" ADD CONSTRAINT "diligencias_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diligencias" ADD CONSTRAINT "diligencias_persona_id_case_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."case_personas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diligencias" ADD CONSTRAINT "diligencias_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diligencias" ADD CONSTRAINT "diligencias_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "diligencias" ADD CONSTRAINT "diligencias_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribution_history" ADD CONSTRAINT "distribution_history_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribution_history" ADD CONSTRAINT "distribution_history_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribution_history" ADD CONSTRAINT "distribution_history_corrected_by_users_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "distribution_history" ADD CONSTRAINT "distribution_history_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_modelos" ADD CONSTRAINT "documento_modelos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_modelos" ADD CONSTRAINT "documento_modelos_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos" ADD CONSTRAINT "documentos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos" ADD CONSTRAINT "documentos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos" ADD CONSTRAINT "documentos_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos" ADD CONSTRAINT "documentos_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos" ADD CONSTRAINT "documentos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos" ADD CONSTRAINT "documentos_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_modelo_id_documento_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."documento_modelos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drive_file_contents" ADD CONSTRAINT "drive_file_contents_drive_file_id_drive_files_id_fk" FOREIGN KEY ("drive_file_id") REFERENCES "public"."drive_files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drive_sync_folders" ADD CONSTRAINT "drive_sync_folders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drive_sync_logs" ADD CONSTRAINT "drive_sync_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "escalas_atribuicao" ADD CONSTRAINT "escalas_atribuicao_profissional_id_profissionais_id_fk" FOREIGN KEY ("profissional_id") REFERENCES "public"."profissionais"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evolution_config" ADD CONSTRAINT "evolution_config_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evolution_config" ADD CONSTRAINT "evolution_config_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_patterns" ADD CONSTRAINT "extraction_patterns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extraction_patterns" ADD CONSTRAINT "extraction_patterns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fact_evidence" ADD CONSTRAINT "fact_evidence_fact_id_case_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."case_facts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fact_evidence" ADD CONSTRAINT "fact_evidence_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feriados_forenses" ADD CONSTRAINT "feriados_forenses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "historico_mpu" ADD CONSTRAINT "historico_mpu_processo_vvd_id_processos_vvd_id_fk" FOREIGN KEY ("processo_vvd_id") REFERENCES "public"."processos_vvd"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intimacoes_vvd" ADD CONSTRAINT "intimacoes_vvd_processo_vvd_id_processos_vvd_id_fk" FOREIGN KEY ("processo_vvd_id") REFERENCES "public"."processos_vvd"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intimacoes_vvd" ADD CONSTRAINT "intimacoes_vvd_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intimacoes_vvd" ADD CONSTRAINT "intimacoes_vvd_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "intimacoes_vvd" ADD CONSTRAINT "intimacoes_vvd_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurados" ADD CONSTRAINT "jurados_sessao_juri_id_sessoes_juri_id_fk" FOREIGN KEY ("sessao_juri_id") REFERENCES "public"."sessoes_juri"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurados" ADD CONSTRAINT "jurados_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "juri_script_items" ADD CONSTRAINT "juri_script_items_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "juri_script_items" ADD CONSTRAINT "juri_script_items_sessao_juri_id_sessoes_juri_id_fk" FOREIGN KEY ("sessao_juri_id") REFERENCES "public"."sessoes_juri"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "juri_script_items" ADD CONSTRAINT "juri_script_items_persona_id_case_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."case_personas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "juri_script_items" ADD CONSTRAINT "juri_script_items_fact_id_case_facts_id_fk" FOREIGN KEY ("fact_id") REFERENCES "public"."case_facts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_buscas" ADD CONSTRAINT "jurisprudencia_buscas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_buscas" ADD CONSTRAINT "jurisprudencia_buscas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_drive_folders" ADD CONSTRAINT "jurisprudencia_drive_folders_tema_id_jurisprudencia_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."jurisprudencia_temas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_drive_folders" ADD CONSTRAINT "jurisprudencia_drive_folders_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_drive_folders" ADD CONSTRAINT "jurisprudencia_drive_folders_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_julgados" ADD CONSTRAINT "jurisprudencia_julgados_tema_id_jurisprudencia_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."jurisprudencia_temas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_julgados" ADD CONSTRAINT "jurisprudencia_julgados_tese_id_jurisprudencia_teses_id_fk" FOREIGN KEY ("tese_id") REFERENCES "public"."jurisprudencia_teses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_julgados" ADD CONSTRAINT "jurisprudencia_julgados_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_julgados" ADD CONSTRAINT "jurisprudencia_julgados_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_temas" ADD CONSTRAINT "jurisprudencia_temas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_temas" ADD CONSTRAINT "jurisprudencia_temas_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_teses" ADD CONSTRAINT "jurisprudencia_teses_tema_id_jurisprudencia_temas_id_fk" FOREIGN KEY ("tema_id") REFERENCES "public"."jurisprudencia_temas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_teses" ADD CONSTRAINT "jurisprudencia_teses_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jurisprudencia_teses" ADD CONSTRAINT "jurisprudencia_teses_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medidas_protetivas" ADD CONSTRAINT "medidas_protetivas_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medidas_protetivas" ADD CONSTRAINT "medidas_protetivas_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "movimentacoes" ADD CONSTRAINT "movimentacoes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_conexoes" ADD CONSTRAINT "palacio_conexoes_diagrama_id_palacio_diagramas_id_fk" FOREIGN KEY ("diagrama_id") REFERENCES "public"."palacio_diagramas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_conexoes" ADD CONSTRAINT "palacio_conexoes_elemento_origem_id_palacio_elementos_id_fk" FOREIGN KEY ("elemento_origem_id") REFERENCES "public"."palacio_elementos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_conexoes" ADD CONSTRAINT "palacio_conexoes_elemento_destino_id_palacio_elementos_id_fk" FOREIGN KEY ("elemento_destino_id") REFERENCES "public"."palacio_elementos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_diagramas" ADD CONSTRAINT "palacio_diagramas_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_diagramas" ADD CONSTRAINT "palacio_diagramas_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_diagramas" ADD CONSTRAINT "palacio_diagramas_atualizado_por_id_users_id_fk" FOREIGN KEY ("atualizado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_diagramas" ADD CONSTRAINT "palacio_diagramas_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_diagrama_id_palacio_diagramas_id_fk" FOREIGN KEY ("diagrama_id") REFERENCES "public"."palacio_diagramas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_persona_id_case_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."case_personas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_fato_id_case_facts_id_fk" FOREIGN KEY ("fato_id") REFERENCES "public"."case_facts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_testemunha_id_testemunhas_id_fk" FOREIGN KEY ("testemunha_id") REFERENCES "public"."testemunhas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palacio_elementos" ADD CONSTRAINT "palacio_elementos_tese_id_teses_defensivas_id_fk" FOREIGN KEY ("tese_id") REFERENCES "public"."teses_defensivas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partes_vvd" ADD CONSTRAINT "partes_vvd_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "partes_vvd" ADD CONSTRAINT "partes_vvd_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "peca_templates" ADD CONSTRAINT "peca_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pecas_processuais" ADD CONSTRAINT "pecas_processuais_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pecas_processuais" ADD CONSTRAINT "pecas_processuais_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pecas_processuais" ADD CONSTRAINT "pecas_processuais_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pecas_processuais" ADD CONSTRAINT "pecas_processuais_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "personagens_juri" ADD CONSTRAINT "personagens_juri_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_config" ADD CONSTRAINT "plaud_config_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_config" ADD CONSTRAINT "plaud_config_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_recordings" ADD CONSTRAINT "plaud_recordings_config_id_plaud_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."plaud_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_recordings" ADD CONSTRAINT "plaud_recordings_atendimento_id_atendimentos_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_recordings" ADD CONSTRAINT "plaud_recordings_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos" ADD CONSTRAINT "processos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos" ADD CONSTRAINT "processos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos" ADD CONSTRAINT "processos_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_autor_id_partes_vvd_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."partes_vvd"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_vitima_id_partes_vvd_id_fk" FOREIGN KEY ("vitima_id") REFERENCES "public"."partes_vvd"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processos_vvd" ADD CONSTRAINT "processos_vvd_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profissionais" ADD CONSTRAINT "profissionais_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "roteiro_plenario" ADD CONSTRAINT "roteiro_plenario_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessoes_juri" ADD CONSTRAINT "sessoes_juri_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessoes_juri" ADD CONSTRAINT "sessoes_juri_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessoes_juri" ADD CONSTRAINT "sessoes_juri_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_assets" ADD CONSTRAINT "simulacao_assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_assets" ADD CONSTRAINT "simulacao_assets_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_exportacoes" ADD CONSTRAINT "simulacao_exportacoes_versao_id_simulacao_versoes_id_fk" FOREIGN KEY ("versao_id") REFERENCES "public"."simulacao_versoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_exportacoes" ADD CONSTRAINT "simulacao_exportacoes_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_keyframes" ADD CONSTRAINT "simulacao_keyframes_versao_id_simulacao_versoes_id_fk" FOREIGN KEY ("versao_id") REFERENCES "public"."simulacao_versoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_keyframes" ADD CONSTRAINT "simulacao_keyframes_personagem_id_simulacao_personagens_id_fk" FOREIGN KEY ("personagem_id") REFERENCES "public"."simulacao_personagens"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_keyframes" ADD CONSTRAINT "simulacao_keyframes_objeto_id_simulacao_objetos_id_fk" FOREIGN KEY ("objeto_id") REFERENCES "public"."simulacao_objetos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_objetos" ADD CONSTRAINT "simulacao_objetos_simulacao_id_simulacoes_3d_id_fk" FOREIGN KEY ("simulacao_id") REFERENCES "public"."simulacoes_3d"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_personagens" ADD CONSTRAINT "simulacao_personagens_simulacao_id_simulacoes_3d_id_fk" FOREIGN KEY ("simulacao_id") REFERENCES "public"."simulacoes_3d"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_personagens" ADD CONSTRAINT "simulacao_personagens_persona_id_case_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."case_personas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacao_versoes" ADD CONSTRAINT "simulacao_versoes_simulacao_id_simulacoes_3d_id_fk" FOREIGN KEY ("simulacao_id") REFERENCES "public"."simulacoes_3d"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacoes_3d" ADD CONSTRAINT "simulacoes_3d_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacoes_3d" ADD CONSTRAINT "simulacoes_3d_criado_por_id_users_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacoes_3d" ADD CONSTRAINT "simulacoes_3d_atualizado_por_id_users_id_fk" FOREIGN KEY ("atualizado_por_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "simulacoes_3d" ADD CONSTRAINT "simulacoes_3d_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "teses_defensivas" ADD CONSTRAINT "teses_defensivas_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "testemunhas" ADD CONSTRAINT "testemunhas_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "testemunhas" ADD CONSTRAINT "testemunhas_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "testemunhas" ADD CONSTRAINT "testemunhas_audiencia_id_audiencias_id_fk" FOREIGN KEY ("audiencia_id") REFERENCES "public"."audiencias"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tipo_prazos" ADD CONSTRAINT "tipo_prazos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_chat_messages" ADD CONSTRAINT "whatsapp_chat_messages_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_config" ADD CONSTRAINT "whatsapp_config_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_config_id_evolution_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."evolution_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_config_id_whatsapp_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."whatsapp_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_sent_by_id_users_id_fk" FOREIGN KEY ("sent_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_user_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_entidade_idx" ON "activity_logs" USING btree ("entidade_tipo","entidade_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_acao_idx" ON "activity_logs" USING btree ("acao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_logs_created_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "afastamentos_defensor_id_idx" ON "afastamentos" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "afastamentos_substituto_id_idx" ON "afastamentos" USING btree ("substituto_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "afastamentos_ativo_idx" ON "afastamentos" USING btree ("ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "afastamentos_data_inicio_idx" ON "afastamentos" USING btree ("data_inicio");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "afastamentos_workspace_id_idx" ON "afastamentos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_analyses_entity_idx" ON "agent_analyses" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_analyses_analysis_type_idx" ON "agent_analyses" USING btree ("analysis_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_analyses_atribuicao_idx" ON "agent_analyses" USING btree ("atribuicao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_analyses_created_at_idx" ON "agent_analyses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_analyses_is_approved_idx" ON "agent_analyses" USING btree ("is_approved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analises_ia_processo_id_idx" ON "analises_ia" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analises_ia_assistido_id_idx" ON "analises_ia" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analises_ia_caso_id_idx" ON "analises_ia" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analises_ia_peca_id_idx" ON "analises_ia" USING btree ("peca_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analises_ia_tipo_analise_idx" ON "analises_ia" USING btree ("tipo_analise");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analises_ia_is_favorito_idx" ON "analises_ia" USING btree ("is_favorito");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anotacoes_processo_id_idx" ON "anotacoes" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anotacoes_assistido_id_idx" ON "anotacoes" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anotacoes_demanda_id_idx" ON "anotacoes" USING btree ("demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anotacoes_caso_id_idx" ON "anotacoes" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anotacoes_tipo_idx" ON "anotacoes" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "anotacoes_importante_idx" ON "anotacoes" USING btree ("importante");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "argumentos_sustentacao_avaliacao_id_idx" ON "argumentos_sustentacao" USING btree ("avaliacao_juri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "argumentos_sustentacao_tipo_idx" ON "argumentos_sustentacao" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "argumentos_sustentacao_ordem_idx" ON "argumentos_sustentacao" USING btree ("ordem");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_nome_idx" ON "assistidos" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_cpf_idx" ON "assistidos" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_status_prisional_idx" ON "assistidos" USING btree ("status_prisional");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_defensor_id_idx" ON "assistidos" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_deleted_at_idx" ON "assistidos" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_caso_id_idx" ON "assistidos" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_workspace_id_idx" ON "assistidos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_atribuicao_primaria_idx" ON "assistidos" USING btree ("atribuicao_primaria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_processos_assistido_id_idx" ON "assistidos_processos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_processos_processo_id_idx" ON "assistidos_processos" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "assistidos_processos_papel_idx" ON "assistidos_processos" USING btree ("papel");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "assistidos_processos_unique_idx" ON "assistidos_processos" USING btree ("assistido_id","processo_id","papel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_assistido_id_idx" ON "atendimentos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_processo_id_idx" ON "atendimentos" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_caso_id_idx" ON "atendimentos" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_data_idx" ON "atendimentos" USING btree ("data_atendimento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_tipo_idx" ON "atendimentos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_status_idx" ON "atendimentos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_atendido_por_idx" ON "atendimentos" USING btree ("atendido_por_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_workspace_id_idx" ON "atendimentos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_plaud_recording_id_idx" ON "atendimentos" USING btree ("plaud_recording_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_transcricao_status_idx" ON "atendimentos" USING btree ("transcricao_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_processo_id_idx" ON "audiencias" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_data_idx" ON "audiencias" USING btree ("data_audiencia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_defensor_id_idx" ON "audiencias" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_status_idx" ON "audiencias" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_tipo_idx" ON "audiencias" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_caso_id_idx" ON "audiencias" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_assistido_id_idx" ON "audiencias" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_google_event_idx" ON "audiencias" USING btree ("google_calendar_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_workspace_id_idx" ON "audiencias" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_hist_audiencia_idx" ON "audiencias_historico" USING btree ("audiencia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audiencias_hist_versao_idx" ON "audiencias_historico" USING btree ("versao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacao_jurados_avaliacao_id_idx" ON "avaliacao_jurados" USING btree ("avaliacao_juri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacao_jurados_jurado_id_idx" ON "avaliacao_jurados" USING btree ("jurado_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacao_jurados_posicao_idx" ON "avaliacao_jurados" USING btree ("posicao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacao_jurados_tendencia_idx" ON "avaliacao_jurados" USING btree ("tendencia_voto");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacao_testemunhas_avaliacao_id_idx" ON "avaliacao_testemunhas_juri" USING btree ("avaliacao_juri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacao_testemunhas_testemunha_id_idx" ON "avaliacao_testemunhas_juri" USING btree ("testemunha_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacao_testemunhas_ordem_idx" ON "avaliacao_testemunhas_juri" USING btree ("ordem");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacoes_juri_sessao_id_idx" ON "avaliacoes_juri" USING btree ("sessao_juri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacoes_juri_processo_id_idx" ON "avaliacoes_juri" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacoes_juri_status_idx" ON "avaliacoes_juri" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "avaliacoes_juri_data_idx" ON "avaliacoes_juri" USING btree ("data_julgamento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "banco_pecas_tipo_peca_idx" ON "banco_pecas" USING btree ("tipo_peca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "banco_pecas_area_idx" ON "banco_pecas" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "banco_pecas_sucesso_idx" ON "banco_pecas" USING btree ("sucesso");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "banco_pecas_is_public_idx" ON "banco_pecas" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_pena_processo_id_idx" ON "calculos_pena" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_pena_assistido_id_idx" ON "calculos_pena" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_pena_tipo_idx" ON "calculos_pena" USING btree ("tipo_calculo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_prazos_demanda_id_idx" ON "calculos_prazos" USING btree ("demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_prazos_tipo_prazo_id_idx" ON "calculos_prazos" USING btree ("tipo_prazo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_prazos_data_termo_final_idx" ON "calculos_prazos" USING btree ("data_termo_final");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_prazos_workspace_id_idx" ON "calculos_prazos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_seeu_processo_id_idx" ON "calculos_seeu" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_seeu_assistido_id_idx" ON "calculos_seeu" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_seeu_data_progressao_idx" ON "calculos_seeu" USING btree ("data_progressao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calculos_seeu_data_livramento_idx" ON "calculos_seeu" USING btree ("data_livramento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_event_date_idx" ON "calendar_events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_processo_id_idx" ON "calendar_events" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_assistido_id_idx" ON "calendar_events" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_event_type_idx" ON "calendar_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_status_idx" ON "calendar_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_deleted_at_idx" ON "calendar_events" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_date_range_idx" ON "calendar_events" USING btree ("event_date","end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_events_workspace_id_idx" ON "calendar_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_facts_caso_id_idx" ON "case_facts" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_facts_tipo_idx" ON "case_facts" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_facts_status_idx" ON "case_facts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_personas_caso_id_idx" ON "case_personas" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_personas_tipo_idx" ON "case_personas" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_personas_status_idx" ON "case_personas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_personas_assistido_id_idx" ON "case_personas" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "case_personas_jurado_id_idx" ON "case_personas" USING btree ("jurado_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "caso_tags_nome_idx" ON "caso_tags" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "caso_tags_uso_idx" ON "caso_tags" USING btree ("uso_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_titulo_idx" ON "casos" USING btree ("titulo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_atribuicao_idx" ON "casos" USING btree ("atribuicao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_status_idx" ON "casos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_defensor_id_idx" ON "casos" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_deleted_at_idx" ON "casos" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_workspace_id_idx" ON "casos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_conexos_origem_idx" ON "casos_conexos" USING btree ("caso_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_conexos_destino_idx" ON "casos_conexos" USING btree ("caso_destino_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compartilhamentos_entidade_idx" ON "compartilhamentos" USING btree ("entidade_tipo","entidade_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compartilhamentos_por_idx" ON "compartilhamentos" USING btree ("compartilhado_por");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compartilhamentos_com_idx" ON "compartilhamentos" USING btree ("compartilhado_com");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "compartilhamentos_ativo_idx" ON "compartilhamentos" USING btree ("ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conselho_juri_sessao_idx" ON "conselho_juri" USING btree ("sessao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conselho_juri_jurado_idx" ON "conselho_juri" USING btree ("jurado_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delegacoes_historico_demanda_id_idx" ON "delegacoes_historico" USING btree ("demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delegacoes_historico_delegado_de_id_idx" ON "delegacoes_historico" USING btree ("delegado_de_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delegacoes_historico_delegado_para_id_idx" ON "delegacoes_historico" USING btree ("delegado_para_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delegacoes_historico_status_idx" ON "delegacoes_historico" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delegacoes_historico_tipo_idx" ON "delegacoes_historico" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delegacoes_historico_assistido_id_idx" ON "delegacoes_historico" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delegacoes_historico_processo_id_idx" ON "delegacoes_historico" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delegacoes_historico_workspace_id_idx" ON "delegacoes_historico" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_processo_id_idx" ON "demandas" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_assistido_id_idx" ON "demandas" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_prazo_idx" ON "demandas" USING btree ("prazo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_status_idx" ON "demandas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_prioridade_idx" ON "demandas" USING btree ("prioridade");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_delegado_para_id_idx" ON "demandas" USING btree ("delegado_para_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_defensor_id_idx" ON "demandas" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_reu_preso_idx" ON "demandas" USING btree ("reu_preso");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_deleted_at_idx" ON "demandas" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_caso_id_idx" ON "demandas" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "demandas_workspace_id_idx" ON "demandas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "depoimentos_analise_caso_id_idx" ON "depoimentos_analise" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "depoimentos_analise_persona_id_idx" ON "depoimentos_analise" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "depoimentos_analise_testemunha_idx" ON "depoimentos_analise" USING btree ("testemunha_nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencia_templates_tipo_idx" ON "diligencia_templates" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencia_templates_ativo_idx" ON "diligencia_templates" USING btree ("ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencia_templates_workspace_id_idx" ON "diligencia_templates" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencias_processo_id_idx" ON "diligencias" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencias_assistido_id_idx" ON "diligencias" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencias_caso_id_idx" ON "diligencias" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencias_status_idx" ON "diligencias" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencias_tipo_idx" ON "diligencias" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencias_workspace_id_idx" ON "diligencias" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencias_defensor_id_idx" ON "diligencias" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencias_deleted_at_idx" ON "diligencias" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diligencias_prioridade_idx" ON "diligencias" USING btree ("prioridade");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_history_file_id_idx" ON "distribution_history" USING btree ("drive_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_history_assistido_id_idx" ON "distribution_history" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_history_processo_id_idx" ON "distribution_history" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_history_status_idx" ON "distribution_history" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "distribution_history_workspace_id_idx" ON "distribution_history" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_categoria_idx" ON "documento_modelos" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_tipo_peca_idx" ON "documento_modelos" USING btree ("tipo_peca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_area_idx" ON "documento_modelos" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_is_ativo_idx" ON "documento_modelos" USING btree ("is_ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_workspace_id_idx" ON "documento_modelos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_deleted_at_idx" ON "documento_modelos" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_processo_id_idx" ON "documentos" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_assistido_id_idx" ON "documentos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_demanda_id_idx" ON "documentos" USING btree ("demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_caso_id_idx" ON "documentos" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_categoria_idx" ON "documentos" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_is_template_idx" ON "documentos" USING btree ("is_template");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_workspace_id_idx" ON "documentos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_gerados_modelo_id_idx" ON "documentos_gerados" USING btree ("modelo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_gerados_processo_id_idx" ON "documentos_gerados" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_gerados_assistido_id_idx" ON "documentos_gerados" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_gerados_caso_id_idx" ON "documentos_gerados" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_gerados_workspace_id_idx" ON "documentos_gerados" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "drive_file_contents_drive_file_id_idx" ON "drive_file_contents" USING btree ("drive_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_file_contents_extraction_status_idx" ON "drive_file_contents" USING btree ("extraction_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_file_contents_document_type_idx" ON "drive_file_contents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_drive_folder_id_idx" ON "drive_files" USING btree ("drive_folder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_drive_file_id_idx" ON "drive_files" USING btree ("drive_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_processo_id_idx" ON "drive_files" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_assistido_id_idx" ON "drive_files" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_sync_status_idx" ON "drive_files" USING btree ("sync_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_is_folder_idx" ON "drive_files" USING btree ("is_folder");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_parent_file_id_idx" ON "drive_files" USING btree ("parent_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_sync_folders_drive_folder_id_idx" ON "drive_sync_folders" USING btree ("drive_folder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_sync_folders_is_active_idx" ON "drive_sync_folders" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_sync_logs_drive_file_id_idx" ON "drive_sync_logs" USING btree ("drive_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_sync_logs_created_at_idx" ON "drive_sync_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_sync_logs_action_idx" ON "drive_sync_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_webhooks_channel_id_idx" ON "drive_webhooks" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_webhooks_folder_id_idx" ON "drive_webhooks" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_webhooks_is_active_idx" ON "drive_webhooks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escalas_mes_ano_idx" ON "escalas_atribuicao" USING btree ("mes","ano");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escalas_profissional_idx" ON "escalas_atribuicao" USING btree ("profissional_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evolution_config_instance_name_idx" ON "evolution_config" USING btree ("instance_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evolution_config_workspace_id_idx" ON "evolution_config" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evolution_config_status_idx" ON "evolution_config" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_patterns_type_idx" ON "extraction_patterns" USING btree ("pattern_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_patterns_original_value_idx" ON "extraction_patterns" USING btree ("original_value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "extraction_patterns_workspace_id_idx" ON "extraction_patterns" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "extraction_patterns_unique_idx" ON "extraction_patterns" USING btree ("pattern_type","original_value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_evidence_fact_id_idx" ON "fact_evidence" USING btree ("fact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_evidence_documento_id_idx" ON "fact_evidence" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_evidence_contradicao_idx" ON "fact_evidence" USING btree ("contradicao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_data_idx" ON "feriados_forenses" USING btree ("data");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_tipo_idx" ON "feriados_forenses" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_abrangencia_idx" ON "feriados_forenses" USING btree ("abrangencia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_estado_idx" ON "feriados_forenses" USING btree ("estado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_tribunal_idx" ON "feriados_forenses" USING btree ("tribunal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feriados_forenses_workspace_id_idx" ON "feriados_forenses" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "historico_mpu_processo_vvd_id_idx" ON "historico_mpu" USING btree ("processo_vvd_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "historico_mpu_tipo_evento_idx" ON "historico_mpu" USING btree ("tipo_evento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "historico_mpu_data_evento_idx" ON "historico_mpu" USING btree ("data_evento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_processo_vvd_id_idx" ON "intimacoes_vvd" USING btree ("processo_vvd_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_tipo_intimacao_idx" ON "intimacoes_vvd" USING btree ("tipo_intimacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_status_idx" ON "intimacoes_vvd" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_prazo_idx" ON "intimacoes_vvd" USING btree ("prazo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_defensor_id_idx" ON "intimacoes_vvd" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "intimacoes_vvd_workspace_id_idx" ON "intimacoes_vvd" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurados_nome_idx" ON "jurados" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurados_perfil_idx" ON "jurados" USING btree ("perfil_tendencia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurados_sessao_juri_id_idx" ON "jurados" USING btree ("sessao_juri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurados_tendencia_voto_idx" ON "jurados" USING btree ("tendencia_voto");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurados_status_idx" ON "jurados" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurados_reuniao_idx" ON "jurados" USING btree ("reuniao_periodica");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurados_tipo_idx" ON "jurados" USING btree ("tipo_jurado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurados_ativo_idx" ON "jurados" USING btree ("ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "juri_script_items_caso_id_idx" ON "juri_script_items" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "juri_script_items_sessao_id_idx" ON "juri_script_items" USING btree ("sessao_juri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "juri_script_items_persona_id_idx" ON "juri_script_items" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "juri_script_items_fact_id_idx" ON "juri_script_items" USING btree ("fact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "juri_script_items_fase_idx" ON "juri_script_items" USING btree ("fase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "juri_script_items_ordem_idx" ON "juri_script_items" USING btree ("ordem");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_buscas_user_id_idx" ON "jurisprudencia_buscas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_buscas_workspace_id_idx" ON "jurisprudencia_buscas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_buscas_created_at_idx" ON "jurisprudencia_buscas" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_drive_folders_folder_id_idx" ON "jurisprudencia_drive_folders" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_drive_folders_tribunal_idx" ON "jurisprudencia_drive_folders" USING btree ("tribunal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_drive_folders_workspace_id_idx" ON "jurisprudencia_drive_folders" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_tribunal_idx" ON "jurisprudencia_julgados" USING btree ("tribunal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_tipo_decisao_idx" ON "jurisprudencia_julgados" USING btree ("tipo_decisao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_numero_processo_idx" ON "jurisprudencia_julgados" USING btree ("numero_processo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_data_julgamento_idx" ON "jurisprudencia_julgados" USING btree ("data_julgamento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_tema_id_idx" ON "jurisprudencia_julgados" USING btree ("tema_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_tese_id_idx" ON "jurisprudencia_julgados" USING btree ("tese_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_status_idx" ON "jurisprudencia_julgados" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_is_favorito_idx" ON "jurisprudencia_julgados" USING btree ("is_favorito");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_julgados_workspace_id_idx" ON "jurisprudencia_julgados" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_temas_nome_idx" ON "jurisprudencia_temas" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_temas_parent_id_idx" ON "jurisprudencia_temas" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_temas_workspace_id_idx" ON "jurisprudencia_temas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_teses_tema_id_idx" ON "jurisprudencia_teses" USING btree ("tema_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_teses_titulo_idx" ON "jurisprudencia_teses" USING btree ("titulo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_teses_posicao_idx" ON "jurisprudencia_teses" USING btree ("posicao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jurisprudencia_teses_workspace_id_idx" ON "jurisprudencia_teses" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_protetivas_processo_id_idx" ON "medidas_protetivas" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_protetivas_status_idx" ON "medidas_protetivas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_protetivas_data_vencimento_idx" ON "medidas_protetivas" USING btree ("data_vencimento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movimentacoes_processo_id_idx" ON "movimentacoes" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movimentacoes_data_idx" ON "movimentacoes" USING btree ("data_movimentacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movimentacoes_tipo_idx" ON "movimentacoes" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_conexoes_diagrama_id_idx" ON "palacio_conexoes" USING btree ("diagrama_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_conexoes_origem_idx" ON "palacio_conexoes" USING btree ("elemento_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_conexoes_destino_idx" ON "palacio_conexoes" USING btree ("elemento_destino_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_conexoes_tipo_idx" ON "palacio_conexoes" USING btree ("tipo_conexao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_caso_id_idx" ON "palacio_diagramas" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_tipo_idx" ON "palacio_diagramas" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_status_idx" ON "palacio_diagramas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_criado_por_idx" ON "palacio_diagramas" USING btree ("criado_por_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_workspace_id_idx" ON "palacio_diagramas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_diagramas_deleted_at_idx" ON "palacio_diagramas" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_elementos_diagrama_id_idx" ON "palacio_elementos" USING btree ("diagrama_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_elementos_tipo_vinculo_idx" ON "palacio_elementos" USING btree ("tipo_vinculo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_elementos_persona_id_idx" ON "palacio_elementos" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_elementos_fato_id_idx" ON "palacio_elementos" USING btree ("fato_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "palacio_elementos_documento_id_idx" ON "palacio_elementos" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_nome_idx" ON "partes_vvd" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_cpf_idx" ON "partes_vvd" USING btree ("cpf");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_tipo_parte_idx" ON "partes_vvd" USING btree ("tipo_parte");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_workspace_id_idx" ON "partes_vvd" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partes_vvd_deleted_at_idx" ON "partes_vvd" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "peca_templates_tipo_peca_idx" ON "peca_templates" USING btree ("tipo_peca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "peca_templates_area_idx" ON "peca_templates" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "peca_templates_is_public_idx" ON "peca_templates" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pecas_processuais_processo_id_idx" ON "pecas_processuais" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pecas_processuais_assistido_id_idx" ON "pecas_processuais" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pecas_processuais_caso_id_idx" ON "pecas_processuais" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pecas_processuais_tipo_peca_idx" ON "pecas_processuais" USING btree ("tipo_peca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pecas_processuais_is_destaque_idx" ON "pecas_processuais" USING btree ("is_destaque");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pecas_processuais_drive_file_id_idx" ON "pecas_processuais" USING btree ("drive_file_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personagens_juri_nome_idx" ON "personagens_juri" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personagens_juri_tipo_idx" ON "personagens_juri" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personagens_juri_comarca_idx" ON "personagens_juri" USING btree ("comarca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personagens_juri_ativo_idx" ON "personagens_juri" USING btree ("ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_config_workspace_id_idx" ON "plaud_config" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_config_device_id_idx" ON "plaud_config" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_config_is_active_idx" ON "plaud_config" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_config_id_idx" ON "plaud_recordings" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_plaud_recording_id_idx" ON "plaud_recordings" USING btree ("plaud_recording_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_atendimento_id_idx" ON "plaud_recordings" USING btree ("atendimento_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_assistido_id_idx" ON "plaud_recordings" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_status_idx" ON "plaud_recordings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_recorded_at_idx" ON "plaud_recordings" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_assistido_id_idx" ON "processos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_numero_autos_idx" ON "processos" USING btree ("numero_autos");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_comarca_idx" ON "processos" USING btree ("comarca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_area_idx" ON "processos" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_is_juri_idx" ON "processos" USING btree ("is_juri");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_defensor_id_idx" ON "processos" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_situacao_idx" ON "processos" USING btree ("situacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_deleted_at_idx" ON "processos" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_caso_id_idx" ON "processos" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_workspace_id_idx" ON "processos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_autor_id_idx" ON "processos_vvd" USING btree ("autor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_vitima_id_idx" ON "processos_vvd" USING btree ("vitima_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_numero_autos_idx" ON "processos_vvd" USING btree ("numero_autos");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_mpu_ativa_idx" ON "processos_vvd" USING btree ("mpu_ativa");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_data_vencimento_mpu_idx" ON "processos_vvd" USING btree ("data_vencimento_mpu");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_defensor_id_idx" ON "processos_vvd" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_workspace_id_idx" ON "processos_vvd" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "processos_vvd_deleted_at_idx" ON "processos_vvd" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profissionais_grupo_idx" ON "profissionais" USING btree ("grupo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profissionais_user_id_idx" ON "profissionais" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profissionais_ativo_idx" ON "profissionais" USING btree ("ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roteiro_plenario_caso_id_idx" ON "roteiro_plenario" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roteiro_plenario_fase_idx" ON "roteiro_plenario" USING btree ("fase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "roteiro_plenario_ordem_idx" ON "roteiro_plenario" USING btree ("ordem");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessoes_juri_processo_id_idx" ON "sessoes_juri" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessoes_juri_data_sessao_idx" ON "sessoes_juri" USING btree ("data_sessao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessoes_juri_defensor_id_idx" ON "sessoes_juri" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessoes_juri_status_idx" ON "sessoes_juri" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessoes_juri_workspace_id_idx" ON "sessoes_juri" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_assets_categoria_idx" ON "simulacao_assets" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_assets_subcategoria_idx" ON "simulacao_assets" USING btree ("subcategoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_assets_publico_idx" ON "simulacao_assets" USING btree ("publico");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_assets_workspace_id_idx" ON "simulacao_assets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_exportacoes_versao_id_idx" ON "simulacao_exportacoes" USING btree ("versao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_exportacoes_status_idx" ON "simulacao_exportacoes" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_keyframes_versao_id_idx" ON "simulacao_keyframes" USING btree ("versao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_keyframes_personagem_id_idx" ON "simulacao_keyframes" USING btree ("personagem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_keyframes_objeto_id_idx" ON "simulacao_keyframes" USING btree ("objeto_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_keyframes_tempo_idx" ON "simulacao_keyframes" USING btree ("tempo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_objetos_simulacao_id_idx" ON "simulacao_objetos" USING btree ("simulacao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_objetos_tipo_idx" ON "simulacao_objetos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_personagens_simulacao_id_idx" ON "simulacao_personagens" USING btree ("simulacao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_personagens_persona_id_idx" ON "simulacao_personagens" USING btree ("persona_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_personagens_papel_idx" ON "simulacao_personagens" USING btree ("papel");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_versoes_simulacao_id_idx" ON "simulacao_versoes" USING btree ("simulacao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacao_versoes_tipo_idx" ON "simulacao_versoes" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacoes_3d_caso_id_idx" ON "simulacoes_3d" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacoes_3d_status_idx" ON "simulacoes_3d" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacoes_3d_criado_por_idx" ON "simulacoes_3d" USING btree ("criado_por_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacoes_3d_workspace_id_idx" ON "simulacoes_3d" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "simulacoes_3d_deleted_at_idx" ON "simulacoes_3d" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teses_defensivas_caso_id_idx" ON "teses_defensivas" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teses_defensivas_tipo_idx" ON "teses_defensivas" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teses_defensivas_probabilidade_idx" ON "teses_defensivas" USING btree ("probabilidade_aceitacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_processo_id_idx" ON "testemunhas" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_caso_id_idx" ON "testemunhas" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_audiencia_id_idx" ON "testemunhas" USING btree ("audiencia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_tipo_idx" ON "testemunhas" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_status_idx" ON "testemunhas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tipo_prazos_codigo_idx" ON "tipo_prazos" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tipo_prazos_area_direito_idx" ON "tipo_prazos" USING btree ("area_direito");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tipo_prazos_categoria_idx" ON "tipo_prazos" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tipo_prazos_workspace_id_idx" ON "tipo_prazos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_approval_status_idx" ON "users" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_comarca_idx" ON "users" USING btree ("comarca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_workspace_id_idx" ON "users" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_supervisor_id_idx" ON "users" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_nucleo_idx" ON "users" USING btree ("nucleo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_chat_messages_contact_id_idx" ON "whatsapp_chat_messages" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_chat_messages_wa_message_id_idx" ON "whatsapp_chat_messages" USING btree ("wa_message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_chat_messages_direction_idx" ON "whatsapp_chat_messages" USING btree ("direction");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_chat_messages_created_at_idx" ON "whatsapp_chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_config_admin_id_idx" ON "whatsapp_config" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_config_is_active_idx" ON "whatsapp_config" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_config_id_idx" ON "whatsapp_contacts" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_phone_idx" ON "whatsapp_contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_assistido_id_idx" ON "whatsapp_contacts" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_last_message_at_idx" ON "whatsapp_contacts" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_contacts_config_phone_unique" ON "whatsapp_contacts" USING btree ("config_id","phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_config_id_idx" ON "whatsapp_messages" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_assistido_id_idx" ON "whatsapp_messages" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_status_idx" ON "whatsapp_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_context_idx" ON "whatsapp_messages" USING btree ("context");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_created_at_idx" ON "whatsapp_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspaces_name_idx" ON "workspaces" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspaces_active_idx" ON "workspaces" USING btree ("is_active");