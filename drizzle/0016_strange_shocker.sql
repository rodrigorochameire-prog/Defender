CREATE TYPE "public"."sync_origem" AS ENUM('BANCO', 'PLANILHA', 'MOVE', 'CONFLITO_RESOLVIDO');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_message_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"action_type" varchar(20) NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" integer,
	"processo_id" integer,
	"observacao" text,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"demanda_id" integer,
	"campo" varchar(50) NOT NULL,
	"valor_banco" text,
	"valor_planilha" text,
	"origem" "sync_origem" NOT NULL,
	"banco_updated_at" timestamp,
	"planilha_updated_at" timestamp,
	"conflito" boolean DEFAULT false,
	"resolvido_em" timestamp,
	"resolvido_por" varchar(100),
	"resolvido_valor" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "whatsapp_chat_messages" ADD COLUMN "is_favorite" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "whatsapp_contacts" ADD COLUMN "last_message_status" varchar(20);--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "synced_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_message_actions" ADD CONSTRAINT "whatsapp_message_actions_message_id_whatsapp_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."whatsapp_chat_messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_message_actions" ADD CONSTRAINT "whatsapp_message_actions_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_message_actions" ADD CONSTRAINT "whatsapp_message_actions_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sync_log" ADD CONSTRAINT "sync_log_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_message_actions_message_idx" ON "whatsapp_message_actions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_message_actions_processo_idx" ON "whatsapp_message_actions" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_chat_messages_contact_created_idx" ON "whatsapp_chat_messages" USING btree ("contact_id","created_at");