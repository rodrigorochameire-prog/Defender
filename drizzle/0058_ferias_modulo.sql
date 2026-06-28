-- Módulo Férias: enum + ferias_periodos + ferias_parcelas (idempotente).
DO $$ BEGIN
  CREATE TYPE "public"."ferias_status" AS ENUM('programada', 'homologada', 'em_fruicao', 'concluida', 'cancelada');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
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
DO $$ BEGIN
  ALTER TABLE "ferias_periodos" ADD CONSTRAINT "ferias_periodos_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
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
CREATE INDEX IF NOT EXISTS "ferias_periodos_defensor_deleted_idx" ON "ferias_periodos" USING btree ("defensor_id","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ferias_parcelas_periodo_idx" ON "ferias_parcelas" USING btree ("periodo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ferias_parcelas_defensor_status_deleted_idx" ON "ferias_parcelas" USING btree ("defensor_id","status","deleted_at");
