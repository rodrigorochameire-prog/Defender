CREATE TABLE IF NOT EXISTS "chat_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistido_id" integer,
	"user_id" integer,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"skill_id" varchar(50),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_assistido_id_assistidos_id_fk" FOREIGN KEY ("assistido_id") REFERENCES "public"."assistidos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
