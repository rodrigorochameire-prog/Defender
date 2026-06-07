-- Tabela de anexos de registro (fotos, documentos) vinculados a registros de atendimento
CREATE TABLE IF NOT EXISTS "registro_anexos" (
	"id" serial PRIMARY KEY NOT NULL,
	"registro_id" integer NOT NULL,
	"storage_path" text NOT NULL,
	"nome_original" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"tamanho" integer NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"drive_file_id" varchar(100),
	"drive_status" varchar(20) DEFAULT 'pending',
	"autor_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "registro_anexos_registro_id_registros_id_fk" FOREIGN KEY ("registro_id") REFERENCES "public"."registros"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "registro_anexos_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registro_anexos_registro_id_idx" ON "registro_anexos" USING btree ("registro_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registro_anexos_autor_idx" ON "registro_anexos" USING btree ("autor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "registro_anexos_drive_status_idx" ON "registro_anexos" USING btree ("drive_status");
