CREATE TABLE IF NOT EXISTS "cross_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer NOT NULL,
	"contradiction_matrix" jsonb DEFAULT '[]'::jsonb,
	"tese_consolidada" jsonb DEFAULT '{}'::jsonb,
	"timeline_fatos" jsonb DEFAULT '[]'::jsonb,
	"mapa_atores" jsonb DEFAULT '[]'::jsonb,
	"providencias_agregadas" jsonb DEFAULT '[]'::jsonb,
	"source_file_ids" jsonb DEFAULT '[]'::jsonb,
	"analysis_count" integer DEFAULT 0 NOT NULL,
	"model_version" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cross_analyses" ADD CONSTRAINT "cross_analyses_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cross_analyses_assistido_idx" ON "cross_analyses" USING btree ("assistido_id");