CREATE TABLE IF NOT EXISTS "user_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"nome" text NOT NULL,
	"token" varchar(64) NOT NULL,
	"nucleo" varchar(30),
	"funcao" varchar(30) DEFAULT 'defensor_titular',
	"oab" varchar(50),
	"pode_ver_todos_assistidos" boolean DEFAULT true,
	"pode_ver_todos_processos" boolean DEFAULT true,
	"mensagem" text,
	"invited_by_id" integer,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_accepted_user_id_users_id_fk" FOREIGN KEY ("accepted_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_invitations_email_idx" ON "user_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_invitations_token_idx" ON "user_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_invitations_status_idx" ON "user_invitations" USING btree ("status");