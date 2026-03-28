CREATE TABLE IF NOT EXISTS "institutos" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"assistido_id" integer NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'PROPOSTO' NOT NULL,
	"condicoes" jsonb,
	"data_acordo" date,
	"data_inicio" date,
	"data_fim" date,
	"prazo_meses" integer,
	"audiencia_homologacao_id" integer,
	"audiencia_admonitoria_id" integer,
	"valor_prestacao" numeric,
	"horas_servico" integer,
	"observacoes" text,
	"defensor_id" integer,
	"comarca_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "institutos" ADD CONSTRAINT "institutos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "institutos" ADD CONSTRAINT "institutos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "institutos" ADD CONSTRAINT "institutos_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "institutos" ADD CONSTRAINT "institutos_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "institutos_processo_idx" ON "institutos" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "institutos_assistido_idx" ON "institutos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "institutos_defensor_idx" ON "institutos" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "institutos_status_idx" ON "institutos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "institutos_tipo_idx" ON "institutos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "institutos_comarca_idx" ON "institutos" USING btree ("comarca_id");