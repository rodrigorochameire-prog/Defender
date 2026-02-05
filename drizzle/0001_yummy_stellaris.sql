DO $$ BEGIN
    CREATE TYPE "public"."chat_message_type" AS ENUM('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
    CREATE TYPE "public"."modelo_categoria" AS ENUM('PROVIDENCIA_ADMINISTRATIVA', 'PROVIDENCIA_FUNCIONAL', 'PROVIDENCIA_INSTITUCIONAL', 'PECA_PROCESSUAL', 'COMUNICACAO', 'OUTRO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documento_modelos" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descricao" text,
	"categoria" "modelo_categoria" DEFAULT 'OUTRO' NOT NULL,
	"conteudo" text NOT NULL,
	"tipo_peca" varchar(100),
	"area" "area",
	"variaveis" jsonb,
	"formatacao" jsonb,
	"tags" jsonb,
	"is_public" boolean DEFAULT true,
	"is_ativo" boolean DEFAULT true,
	"total_usos" integer DEFAULT 0,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documentos_gerados" (
	"id" serial PRIMARY KEY NOT NULL,
	"modelo_id" integer,
	"processo_id" integer,
	"assistido_id" integer,
	"demanda_id" integer,
	"caso_id" integer,
	"titulo" varchar(300) NOT NULL,
	"conteudo_final" text NOT NULL,
	"valores_variaveis" jsonb,
	"gerado_por_ia" boolean DEFAULT false,
	"prompt_ia" text,
	"google_doc_id" text,
	"google_doc_url" text,
	"drive_file_id" text,
	"workspace_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evolution_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"instance_name" varchar(100) NOT NULL,
	"api_url" text NOT NULL,
	"api_key" text NOT NULL,
	"status" varchar(20) DEFAULT 'disconnected' NOT NULL,
	"qr_code" text,
	"phone_number" varchar(20),
	"webhook_url" text,
	"webhook_secret" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"auto_reply" boolean DEFAULT false NOT NULL,
	"auto_reply_message" text,
	"last_sync_at" timestamp,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "evolution_config_instance_name_unique" UNIQUE("instance_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plaud_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer,
	"api_key" text,
	"api_secret" text,
	"webhook_secret" text,
	"device_id" varchar(100),
	"device_name" varchar(100),
	"device_model" varchar(50),
	"default_language" varchar(10) DEFAULT 'pt-BR',
	"auto_transcribe" boolean DEFAULT true,
	"auto_summarize" boolean DEFAULT true,
	"auto_upload_to_drive" boolean DEFAULT true,
	"drive_folder_id" varchar(100),
	"is_active" boolean DEFAULT false NOT NULL,
	"last_sync_at" timestamp,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plaud_recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"plaud_recording_id" varchar(100) NOT NULL,
	"plaud_device_id" varchar(100),
	"title" varchar(255),
	"duration" integer,
	"recorded_at" timestamp,
	"file_size" integer,
	"status" varchar(20) DEFAULT 'received',
	"error_message" text,
	"transcription" text,
	"summary" text,
	"speakers" jsonb,
	"atendimento_id" integer,
	"assistido_id" integer,
	"drive_file_id" varchar(100),
	"drive_file_url" text,
	"raw_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plaud_recordings_plaud_recording_id_unique" UNIQUE("plaud_recording_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"wa_message_id" varchar(255),
	"direction" varchar(10) NOT NULL,
	"type" "chat_message_type" DEFAULT 'text' NOT NULL,
	"content" text,
	"media_url" text,
	"media_mime_type" varchar(100),
	"media_filename" varchar(255),
	"status" varchar(20) DEFAULT 'sent' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" integer NOT NULL,
	"phone" varchar(20) NOT NULL,
	"name" text,
	"push_name" text,
	"profile_pic_url" text,
	"assistido_id" integer,
	"tags" text[],
	"notes" text,
	"last_message_at" timestamp,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "processo_id" integer;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "caso_id" integer;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "workspace_id" integer;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "duracao" integer;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "audio_url" text;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "audio_drive_file_id" varchar(100);--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "audio_mime_type" varchar(50);--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "audio_file_size" integer;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "transcricao" text;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "transcricao_resumo" text;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "transcricao_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "transcricao_idioma" varchar(10) DEFAULT 'pt-BR';--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "plaud_recording_id" varchar(100);--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "plaud_device_id" varchar(100);--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "transcricao_metadados" jsonb;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "pontos_chave" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_modelos" ADD CONSTRAINT "documento_modelos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documento_modelos" ADD CONSTRAINT "documento_modelos_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_modelo_id_documento_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."documento_modelos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_demanda_id_demandas_id_fk" FOREIGN KEY ("demanda_id") REFERENCES "public"."demandas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_caso_id_casos_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."casos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documentos_gerados" ADD CONSTRAINT "documentos_gerados_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evolution_config" ADD CONSTRAINT "evolution_config_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evolution_config" ADD CONSTRAINT "evolution_config_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_config" ADD CONSTRAINT "plaud_config_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_config" ADD CONSTRAINT "plaud_config_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_recordings" ADD CONSTRAINT "plaud_recordings_config_id_plaud_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."plaud_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_recordings" ADD CONSTRAINT "plaud_recordings_atendimento_id_atendimentos_id_fk" FOREIGN KEY ("atendimento_id") REFERENCES "public"."atendimentos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaud_recordings" ADD CONSTRAINT "plaud_recordings_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_chat_messages" ADD CONSTRAINT "whatsapp_chat_messages_contact_id_whatsapp_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."whatsapp_contacts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_config_id_evolution_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."evolution_config"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_categoria_idx" ON "documento_modelos" USING btree ("categoria");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_tipo_peca_idx" ON "documento_modelos" USING btree ("tipo_peca");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_area_idx" ON "documento_modelos" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_is_ativo_idx" ON "documento_modelos" USING btree ("is_ativo");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_workspace_id_idx" ON "documento_modelos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documento_modelos_deleted_at_idx" ON "documento_modelos" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_gerados_modelo_id_idx" ON "documentos_gerados" USING btree ("modelo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_gerados_processo_id_idx" ON "documentos_gerados" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_gerados_assistido_id_idx" ON "documentos_gerados" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_gerados_caso_id_idx" ON "documentos_gerados" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_gerados_workspace_id_idx" ON "documentos_gerados" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evolution_config_instance_name_idx" ON "evolution_config" USING btree ("instance_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evolution_config_workspace_id_idx" ON "evolution_config" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evolution_config_status_idx" ON "evolution_config" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_config_workspace_id_idx" ON "plaud_config" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_config_device_id_idx" ON "plaud_config" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_config_is_active_idx" ON "plaud_config" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_config_id_idx" ON "plaud_recordings" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_plaud_recording_id_idx" ON "plaud_recordings" USING btree ("plaud_recording_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_atendimento_id_idx" ON "plaud_recordings" USING btree ("atendimento_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_assistido_id_idx" ON "plaud_recordings" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_status_idx" ON "plaud_recordings" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaud_recordings_recorded_at_idx" ON "plaud_recordings" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_chat_messages_contact_id_idx" ON "whatsapp_chat_messages" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_chat_messages_wa_message_id_idx" ON "whatsapp_chat_messages" USING btree ("wa_message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_chat_messages_direction_idx" ON "whatsapp_chat_messages" USING btree ("direction");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_chat_messages_created_at_idx" ON "whatsapp_chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_config_id_idx" ON "whatsapp_contacts" USING btree ("config_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_phone_idx" ON "whatsapp_contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_assistido_id_idx" ON "whatsapp_contacts" USING btree ("assistido_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "whatsapp_contacts_last_message_at_idx" ON "whatsapp_contacts" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_contacts_config_phone_unique" ON "whatsapp_contacts" USING btree ("config_id","phone");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_processo_id_processos_id_fk" FOREIGN KEY ("processo_id") REFERENCES "public"."processos"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "atendimentos" ADD CONSTRAINT "atendimentos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_processo_id_idx" ON "atendimentos" USING btree ("processo_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_caso_id_idx" ON "atendimentos" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_workspace_id_idx" ON "atendimentos" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_plaud_recording_id_idx" ON "atendimentos" USING btree ("plaud_recording_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_transcricao_status_idx" ON "atendimentos" USING btree ("transcricao_status");