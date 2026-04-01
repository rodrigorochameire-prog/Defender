CREATE TABLE IF NOT EXISTS "claude_code_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer NOT NULL,
	"processo_id" integer,
	"caso_id" integer,
	"skill" text NOT NULL,
	"prompt" text NOT NULL,
	"instrucao_adicional" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"etapa" text,
	"resultado" jsonb,
	"erro" text,
	"created_by" integer NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_google_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_google_tokens_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "assistido_id" integer;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "processo_referencia_id" integer;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "drive_folder_id" text;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "foco" text;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "narrativa_denuncia" text;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "analysis_data" jsonb;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "analysis_status" varchar(20);--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "analyzed_at" timestamp;--> statement-breakpoint
ALTER TABLE "casos" ADD COLUMN "analysis_version" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "tipo_processo" varchar(30) DEFAULT 'AP';--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "is_referencia" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_linked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "drive_folder_id" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sheets_spreadsheet_id" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sheets_spreadsheet_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sheets_sync_enabled" boolean DEFAULT false;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claude_code_tasks" ADD CONSTRAINT "claude_code_tasks_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claude_code_tasks" ADD CONSTRAINT "claude_code_tasks_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claude_code_tasks" ADD CONSTRAINT "claude_code_tasks_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "claude_code_tasks" ADD CONSTRAINT "claude_code_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_google_tokens" ADD CONSTRAINT "user_google_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claude_code_tasks_status_idx" ON "claude_code_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claude_code_tasks_assistido_id_idx" ON "claude_code_tasks" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "claude_code_tasks_caso_id_idx" ON "claude_code_tasks" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_google_tokens_user_idx" ON "user_google_tokens" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "casos" ADD CONSTRAINT "casos_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "casos" ADD CONSTRAINT "casos_processo_referencia_id_processos_id_fk" FOREIGN KEY ("processo_referencia_id") REFERENCES "public"."processos"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_assistido_id_idx" ON "casos" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "casos_analysis_status_idx" ON "casos" USING btree ("analysis_status");