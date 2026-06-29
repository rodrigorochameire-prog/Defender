-- drizzle/0059_diarias_modulo.sql
-- Módulo Diárias: enum + tabela diarias (idempotente).
DO $$ BEGIN
  CREATE TYPE "public"."diaria_status" AS ENUM('a_requerer', 'requerida', 'autorizada', 'paga', 'cancelada');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "diarias" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"destino" text NOT NULL,
	"origem" text,
	"motivo" text,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"quantidade" numeric(5, 1) NOT NULL,
	"valor_unitario_cents" bigint NOT NULL,
	"status" "diaria_status" DEFAULT 'a_requerer' NOT NULL,
	"sei_protocolo" text,
	"vida_funcional_evento_id" integer,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "diarias" ADD CONSTRAINT "diarias_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diarias_defensor_status_deleted_idx" ON "diarias" USING btree ("defensor_id","status","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "diarias_defensor_data_idx" ON "diarias" USING btree ("defensor_id","data_inicio");
