CREATE TABLE IF NOT EXISTS "mural_notas" (
	"id" serial PRIMARY KEY NOT NULL,
	"autor_id" integer NOT NULL,
	"mensagem" text NOT NULL,
	"assistido_id" integer,
	"processo_id" integer,
	"fixado" boolean DEFAULT false NOT NULL,
	"workspace_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pareceres" (
	"id" serial PRIMARY KEY NOT NULL,
	"solicitante_id" integer NOT NULL,
	"respondedor_id" integer NOT NULL,
	"assistido_id" integer,
	"processo_id" integer,
	"pergunta" text NOT NULL,
	"resposta" text,
	"status" varchar(20) DEFAULT 'solicitado' NOT NULL,
	"urgencia" varchar(20) DEFAULT 'normal' NOT NULL,
	"data_solicitacao" timestamp DEFAULT now() NOT NULL,
	"data_resposta" timestamp,
	"workspace_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mural_notas" ADD CONSTRAINT "mural_notas_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mural_notas" ADD CONSTRAINT "mural_notas_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mural_notas" ADD CONSTRAINT "mural_notas_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pareceres" ADD CONSTRAINT "pareceres_solicitante_id_users_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pareceres" ADD CONSTRAINT "pareceres_respondedor_id_users_id_fk" FOREIGN KEY ("respondedor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pareceres" ADD CONSTRAINT "pareceres_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pareceres" ADD CONSTRAINT "pareceres_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mural_notas_autor_id_idx" ON "mural_notas" USING btree ("autor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mural_notas_workspace_id_idx" ON "mural_notas" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mural_notas_fixado_idx" ON "mural_notas" USING btree ("fixado");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pareceres_solicitante_id_idx" ON "pareceres" USING btree ("solicitante_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pareceres_respondedor_id_idx" ON "pareceres" USING btree ("respondedor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pareceres_status_idx" ON "pareceres" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pareceres_workspace_id_idx" ON "pareceres" USING btree ("workspace_id");