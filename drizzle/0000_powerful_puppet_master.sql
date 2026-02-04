CREATE TYPE "public"."acao_log" AS ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'COMPLETE', 'DELEGATE', 'UPLOAD', 'SYNC');--> statement-breakpoint
CREATE TYPE "public"."area" AS ENUM('JURI', 'EXECUCAO_PENAL', 'VIOLENCIA_DOMESTICA', 'SUBSTITUICAO', 'CURADORIA', 'FAMILIA', 'CIVEL', 'FAZENDA_PUBLICA');--> statement-breakpoint
CREATE TYPE "public"."atribuicao" AS ENUM('JURI_CAMACARI', 'VVD_CAMACARI', 'EXECUCAO_PENAL', 'SUBSTITUICAO', 'SUBSTITUICAO_CIVEL', 'GRUPO_JURI');--> statement-breakpoint
CREATE TYPE "public"."atribuicao_rotativa" AS ENUM('JURI_EP', 'VVD');--> statement-breakpoint
CREATE TYPE "public"."diligencia_status" AS ENUM('A_PESQUISAR', 'EM_ANDAMENTO', 'AGUARDANDO', 'LOCALIZADO', 'OBTIDO', 'INFRUTIFERO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."diligencia_tipo" AS ENUM('LOCALIZACAO_PESSOA', 'LOCALIZACAO_DOCUMENTO', 'REQUISICAO_DOCUMENTO', 'PESQUISA_OSINT', 'DILIGENCIA_CAMPO', 'INTIMACAO', 'OITIVA', 'PERICIA', 'EXAME', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."entidade_log" AS ENUM('demanda', 'assistido', 'processo', 'documento', 'audiencia', 'delegacao', 'caso', 'jurado');--> statement-breakpoint
CREATE TYPE "public"."fase_caso" AS ENUM('INQUERITO', 'INSTRUCAO', 'PLENARIO', 'RECURSO', 'EXECUCAO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."grupo_trabalho" AS ENUM('juri_ep_vvd', 'varas_criminais');--> statement-breakpoint
CREATE TYPE "public"."nivel_confianca" AS ENUM('BAIXA', 'MEDIA', 'ALTA');--> statement-breakpoint
CREATE TYPE "public"."prioridade" AS ENUM('BAIXA', 'NORMAL', 'ALTA', 'URGENTE', 'REU_PRESO');--> statement-breakpoint
CREATE TYPE "public"."status_audiencia" AS ENUM('A_DESIGNAR', 'DESIGNADA', 'REALIZADA', 'AGUARDANDO_ATA', 'CONCLUIDA', 'ADIADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."status_caso" AS ENUM('ATIVO', 'SUSPENSO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."status_demanda" AS ENUM('2_ATENDER', '4_MONITORAR', '5_FILA', '7_PROTOCOLADO', '7_CIENCIA', '7_SEM_ATUACAO', 'URGENTE', 'CONCLUIDO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."status_prisional" AS ENUM('SOLTO', 'CADEIA_PUBLICA', 'PENITENCIARIA', 'COP', 'HOSPITAL_CUSTODIA', 'DOMICILIAR', 'MONITORADO');--> statement-breakpoint
CREATE TYPE "public"."status_processo" AS ENUM('FLAGRANTE', 'INQUERITO', 'INSTRUCAO', 'RECURSO', 'EXECUCAO', 'ARQUIVADO');--> statement-breakpoint
CREATE TYPE "public"."status_testemunha" AS ENUM('ARROLADA', 'INTIMADA', 'OUVIDA', 'DESISTIDA', 'NAO_LOCALIZADA', 'CARTA_PRECATORIA');--> statement-breakpoint
CREATE TYPE "public"."sync_direction" AS ENUM('bidirectional', 'drive_to_app', 'app_to_drive');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('synced', 'pending_upload', 'pending_download', 'conflict', 'error');--> statement-breakpoint
CREATE TYPE "public"."tendencia_voto" AS ENUM('CONDENAR', 'ABSOLVER', 'INDECISO');--> statement-breakpoint
CREATE TYPE "public"."tipo_analise_ia" AS ENUM('RESUMO_CASO', 'ANALISE_DENUNCIA', 'TESES_DEFENSIVAS', 'ANALISE_PROVAS', 'RISCO_CONDENACAO', 'JURISPRUDENCIA', 'ESTRATEGIA_JURI', 'PERFIL_JURADOS', 'COMPARACAO_CASOS', 'TIMELINE', 'PONTOS_FRACOS', 'QUESITACAO', 'MEMORIAL_DRAFT', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_audiencia" AS ENUM('INSTRUCAO', 'CUSTODIA', 'CONCILIACAO', 'JUSTIFICACAO', 'ADMONICAO', 'UNA', 'PLENARIO_JURI', 'CONTINUACAO', 'OUTRA');--> statement-breakpoint
CREATE TYPE "public"."tipo_peca_processual" AS ENUM('DENUNCIA', 'QUEIXA_CRIME', 'PRONUNCIA', 'IMPRONUNCIA', 'ABSOLVICAO_SUMARIA', 'SENTENCA', 'ACORDAO', 'LAUDO_PERICIAL', 'LAUDO_CADAVERICO', 'LAUDO_PSIQUIATRICO', 'LAUDO_TOXICOLOGICO', 'ATA_AUDIENCIA', 'ATA_INTERROGATORIO', 'ATA_PLENARIO', 'DEPOIMENTO', 'BOLETIM_OCORRENCIA', 'AUTO_PRISAO', 'MANDADO', 'DECISAO_INTERLOCUTORIA', 'QUESITOS', 'MEMORIAL', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_testemunha" AS ENUM('DEFESA', 'ACUSACAO', 'COMUM', 'INFORMANTE', 'PERITO', 'VITIMA');--> statement-breakpoint
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
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "atendimentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer NOT NULL,
	"data_atendimento" timestamp NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"local" text,
	"assunto" text,
	"resumo" text,
	"acompanhantes" text,
	"status" varchar(20) DEFAULT 'agendado',
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
	"demanda_id" integer NOT NULL,
	"delegado_de_id" integer NOT NULL,
	"delegado_para_id" integer NOT NULL,
	"data_delegacao" timestamp DEFAULT now() NOT NULL,
	"data_aceitacao" timestamp,
	"data_conclusao" timestamp,
	"instrucoes" text,
	"observacoes" text,
	"prazo_sugerido" date,
	"status" varchar(20) DEFAULT 'pendente' NOT NULL,
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
	"data_conclusao" timestamp,
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
 ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
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
 ALTER TABLE "users" ADD CONSTRAINT "users_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "atendimentos_assistido_id_idx" ON "atendimentos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_data_idx" ON "atendimentos" USING btree ("data_atendimento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_tipo_idx" ON "atendimentos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_status_idx" ON "atendimentos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_atendido_por_idx" ON "atendimentos" USING btree ("atendido_por_id");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "documentos_processo_id_idx" ON "documentos" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_assistido_id_idx" ON "documentos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_demanda_id_idx" ON "documentos" USING btree ("demanda_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_caso_id_idx" ON "documentos" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_categoria_idx" ON "documentos" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_is_template_idx" ON "documentos" USING btree ("is_template");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_workspace_id_idx" ON "documentos" USING btree ("workspace_id");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "fact_evidence_fact_id_idx" ON "fact_evidence" USING btree ("fact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_evidence_documento_id_idx" ON "fact_evidence" USING btree ("documento_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fact_evidence_contradicao_idx" ON "fact_evidence" USING btree ("contradicao");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "medidas_protetivas_processo_id_idx" ON "medidas_protetivas" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_protetivas_status_idx" ON "medidas_protetivas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_protetivas_data_vencimento_idx" ON "medidas_protetivas" USING btree ("data_vencimento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movimentacoes_processo_id_idx" ON "movimentacoes" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movimentacoes_data_idx" ON "movimentacoes" USING btree ("data_movimentacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movimentacoes_tipo_idx" ON "movimentacoes" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
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
CREATE INDEX IF NOT EXISTS "teses_defensivas_caso_id_idx" ON "teses_defensivas" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teses_defensivas_tipo_idx" ON "teses_defensivas" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "teses_defensivas_probabilidade_idx" ON "teses_defensivas" USING btree ("probabilidade_aceitacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_processo_id_idx" ON "testemunhas" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_caso_id_idx" ON "testemunhas" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_audiencia_id_idx" ON "testemunhas" USING btree ("audiencia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_tipo_idx" ON "testemunhas" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "testemunhas_status_idx" ON "testemunhas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_approval_status_idx" ON "users" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_comarca_idx" ON "users" USING btree ("comarca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_workspace_id_idx" ON "users" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_supervisor_id_idx" ON "users" USING btree ("supervisor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_nucleo_idx" ON "users" USING btree ("nucleo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_config_admin_id_idx" ON "whatsapp_config" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_config_is_active_idx" ON "whatsapp_config" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_config_id_idx" ON "whatsapp_messages" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_assistido_id_idx" ON "whatsapp_messages" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_status_idx" ON "whatsapp_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_context_idx" ON "whatsapp_messages" USING btree ("context");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_messages_created_at_idx" ON "whatsapp_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspaces_name_idx" ON "workspaces" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspaces_active_idx" ON "workspaces" USING btree ("is_active");