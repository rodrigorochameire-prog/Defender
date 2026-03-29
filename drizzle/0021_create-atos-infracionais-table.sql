ALTER TYPE "public"."area" ADD VALUE 'CRIMINAL';--> statement-breakpoint
ALTER TYPE "public"."area" ADD VALUE 'INFANCIA_JUVENTUDE';--> statement-breakpoint
ALTER TYPE "public"."atribuicao" ADD VALUE 'CRIMINAL_SIMOES_FILHO';--> statement-breakpoint
ALTER TYPE "public"."atribuicao" ADD VALUE 'CRIMINAL_LAURO_DE_FREITAS';--> statement-breakpoint
ALTER TYPE "public"."atribuicao" ADD VALUE 'CRIMINAL_CANDEIAS';--> statement-breakpoint
ALTER TYPE "public"."atribuicao" ADD VALUE 'CRIMINAL_ITAPARICA';--> statement-breakpoint
ALTER TYPE "public"."unidade" ADD VALUE 'ITAPARICA';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "atos_infracionais" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"assistido_id" integer,
	"ato_equiparado" varchar(80) NOT NULL,
	"artigo_equiparado" varchar(50) NOT NULL,
	"qualificadoras" jsonb,
	"envolveu_violencia" boolean DEFAULT false,
	"envolveu_grave_ameaca" boolean DEFAULT false,
	"idade_na_data" integer,
	"remissao" varchar(30),
	"data_remissao" date,
	"condicoes_remissao" jsonb,
	"observacoes" text,
	"comarca_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "factual_artigos" (
	"id" serial PRIMARY KEY NOT NULL,
	"edicao_id" integer NOT NULL,
	"secao" varchar(50) NOT NULL,
	"titulo" text NOT NULL,
	"resumo" text,
	"conteudo_original" text,
	"fonte_nome" varchar(100) NOT NULL,
	"fonte_url" text NOT NULL,
	"imagem_url" text,
	"autor" varchar(200),
	"data_publicacao" timestamp,
	"ordem" integer DEFAULT 0 NOT NULL,
	"destaque" boolean DEFAULT false NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"query_origem" text,
	"content_hash" text,
	"modelo_sumarizacao" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "factual_edicoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(200) DEFAULT 'Diário da Bahia' NOT NULL,
	"subtitulo" varchar(300),
	"data_edicao" timestamp NOT NULL,
	"total_artigos" integer DEFAULT 0 NOT NULL,
	"secoes" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'rascunho' NOT NULL,
	"publicado_por" integer,
	"publicado_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "factual_favoritos" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"artigo_id" integer NOT NULL,
	"nota" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "factual_secoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(50) NOT NULL,
	"contexto" text NOT NULL,
	"queries" jsonb DEFAULT '[]'::jsonb,
	"date_restrict" varchar(10) DEFAULT 'd3' NOT NULL,
	"max_artigos" integer DEFAULT 5 NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"jornal" varchar(20) DEFAULT 'factual' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "areas_principais" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atos_infracionais" ADD CONSTRAINT "atos_infracionais_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atos_infracionais" ADD CONSTRAINT "atos_infracionais_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atos_infracionais" ADD CONSTRAINT "atos_infracionais_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "factual_artigos" ADD CONSTRAINT "factual_artigos_edicao_id_factual_edicoes_id_fk" FOREIGN KEY ("edicao_id") REFERENCES "public"."factual_edicoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "factual_edicoes" ADD CONSTRAINT "factual_edicoes_publicado_por_users_id_fk" FOREIGN KEY ("publicado_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "factual_favoritos" ADD CONSTRAINT "factual_favoritos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "factual_favoritos" ADD CONSTRAINT "factual_favoritos_artigo_id_factual_artigos_id_fk" FOREIGN KEY ("artigo_id") REFERENCES "public"."factual_artigos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atos_infracionais_processo_idx" ON "atos_infracionais" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atos_infracionais_assistido_idx" ON "atos_infracionais" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atos_infracionais_ato_idx" ON "atos_infracionais" USING btree ("ato_equiparado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atos_infracionais_comarca_idx" ON "atos_infracionais" USING btree ("comarca_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "factual_artigos_edicao_idx" ON "factual_artigos" USING btree ("edicao_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "factual_artigos_secao_idx" ON "factual_artigos" USING btree ("secao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "factual_artigos_fonte_url_idx" ON "factual_artigos" USING btree ("fonte_url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "factual_artigos_content_hash_idx" ON "factual_artigos" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "factual_artigos_edicao_secao_idx" ON "factual_artigos" USING btree ("edicao_id","secao","ordem");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "factual_edicoes_data_idx" ON "factual_edicoes" USING btree ("data_edicao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "factual_edicoes_status_idx" ON "factual_edicoes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "factual_fav_unique_idx" ON "factual_favoritos" USING btree ("user_id","artigo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "factual_fav_user_idx" ON "factual_favoritos" USING btree ("user_id");