-- drizzle/0065_pedidos_administrativos.sql
-- Módulo Pedidos Administrativos (idempotente).
DO $$ BEGIN
  CREATE TYPE "public"."pedido_estado" AS ENUM('solicitado', 'em_analise', 'deferido', 'indeferido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pedidos_administrativos" (
	"id" serial PRIMARY KEY NOT NULL,
	"defensor_id" integer NOT NULL,
	"assunto" text NOT NULL,
	"descricao" text,
	"data_pedido" date NOT NULL,
	"prazo" date,
	"estado" "pedido_estado" DEFAULT 'solicitado' NOT NULL,
	"sei_protocolo" text,
	"observacao" text,
	"vida_funcional_evento_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pedidos_administrativos" ADD CONSTRAINT "pedidos_administrativos_defensor_id_users_id_fk" FOREIGN KEY ("defensor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pedidos_adm_defensor_estado_deleted_idx" ON "pedidos_administrativos" USING btree ("defensor_id","estado","deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pedidos_adm_defensor_prazo_idx" ON "pedidos_administrativos" USING btree ("defensor_id","prazo");
