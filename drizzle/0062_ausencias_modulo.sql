-- Módulo Ausências: enums + tabela ausencias (idempotente).
DO $$ BEGIN
  CREATE TYPE "public"."ausencia_tipo" AS ENUM('licenca', 'outra_ausencia');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."ausencia_situacao" AS ENUM('solicitada', 'deferida', 'gozada', 'indeferida', 'cancelada');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ausencias" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"tipo" "ausencia_tipo" NOT NULL,
	"motivo" text,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"situacao" "ausencia_situacao" DEFAULT 'solicitada' NOT NULL,
	"interrompida" boolean DEFAULT false NOT NULL,
	"suspensa" boolean DEFAULT false NOT NULL,
	"numero_solicitacao" text,
	"n_siga" text,
	"data_publicacao" date,
	"observacao" text,
	"situacao_siga" text,
	"siga_synced_at" timestamp,
	"vida_funcional_evento_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "ausencias" ADD CONSTRAINT "ausencias_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ausencias_defensor_situacao_deleted_idx" ON "ausencias" USING btree ("defensor_id","situacao","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ausencias_defensor_tipo_data_idx" ON "ausencias" USING btree ("defensor_id","tipo","data_inicio");
