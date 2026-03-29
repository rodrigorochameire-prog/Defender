CREATE TABLE IF NOT EXISTS "medidas_socioeducativas" (
	"id" serial PRIMARY KEY NOT NULL,
	"processo_id" integer NOT NULL,
	"assistido_id" integer NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"status" varchar(30) DEFAULT 'APLICADA' NOT NULL,
	"data_aplicacao" date,
	"data_inicio" date,
	"data_fim" date,
	"prazo_meses" integer,
	"prazo_maximo_meses" integer,
	"data_proxima_reavaliacao" date,
	"unidade_execucao" varchar(200),
	"condicoes" jsonb,
	"horas_servico" integer,
	"medida_anterior_id" integer,
	"motivo_substituicao" text,
	"observacoes" text,
	"defensor_id" integer,
	"comarca_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medidas_socioeducativas" ADD CONSTRAINT "medidas_socioeducativas_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medidas_socioeducativas" ADD CONSTRAINT "medidas_socioeducativas_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medidas_socioeducativas" ADD CONSTRAINT "medidas_socioeducativas_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medidas_socioeducativas" ADD CONSTRAINT "medidas_socioeducativas_comarca_id_comarcas_id_fk" FOREIGN KEY ("comarca_id") REFERENCES "public"."comarcas"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_socio_processo_idx" ON "medidas_socioeducativas" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_socio_assistido_idx" ON "medidas_socioeducativas" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_socio_tipo_idx" ON "medidas_socioeducativas" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_socio_status_idx" ON "medidas_socioeducativas" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_socio_defensor_idx" ON "medidas_socioeducativas" USING btree ("defensor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_socio_comarca_idx" ON "medidas_socioeducativas" USING btree ("comarca_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medidas_socio_reavaliacao_idx" ON "medidas_socioeducativas" USING btree ("data_proxima_reavaliacao");