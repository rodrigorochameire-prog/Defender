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
CREATE INDEX IF NOT EXISTS "acordaos_recurso_idx" ON "acordaos" USING btree ("recurso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_data_julgamento_idx" ON "acordaos" USING btree ("data_julgamento");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_resultado_idx" ON "acordaos" USING btree ("resultado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_relator_idx" ON "acordaos" USING btree ("relator");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "acordaos_analise_status_idx" ON "acordaos" USING btree ("analise_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desembargadores_camara_idx" ON "desembargadores" USING btree ("camara");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "desembargadores_area_idx" ON "desembargadores" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_tipo_idx" ON "recursos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_status_idx" ON "recursos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_resultado_idx" ON "recursos" USING btree ("resultado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_processo_origem_idx" ON "recursos" USING btree ("processo_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_assistido_idx" ON "recursos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_defensor_origem_idx" ON "recursos" USING btree ("defensor_origem_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_defensor_destino_idx" ON "recursos" USING btree ("defensor_destino_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_relator_idx" ON "recursos" USING btree ("relator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_camara_idx" ON "recursos" USING btree ("camara");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recursos_data_julgamento_idx" ON "recursos" USING btree ("data_julgamento");