CREATE TABLE IF NOT EXISTS "delitos" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"assistido_id" integer,
	"tipo_delito" varchar(80) NOT NULL,
	"artigo_base" varchar(50) NOT NULL,
	"incisos" jsonb,
	"qualificadoras" jsonb,
	"causas_aumento" jsonb,
	"causas_diminuicao" jsonb,
	"pena_minima_meses" integer,
	"pena_maxima_meses" integer,
	"pena_aplicada_meses" integer,
	"regime_inicial" varchar(20),
	"cabe_anpp" boolean,
	"cabe_sursis" boolean,
	"cabe_transacao" boolean,
	"cabe_substituicao" boolean,
	"data_sentenca" date,
	"resultado_sentenca" varchar(30),
	"observacoes" text,
	"comarca_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delitos" ADD CONSTRAINT "delitos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delitos" ADD CONSTRAINT "delitos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "delitos" ADD CONSTRAINT "delitos_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delitos_processo_idx" ON "delitos" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delitos_assistido_idx" ON "delitos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delitos_tipo_idx" ON "delitos" USING btree ("tipo_delito");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "delitos_comarca_idx" ON "delitos" USING btree ("comarca_id");