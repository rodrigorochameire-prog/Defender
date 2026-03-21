ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "comarca_id" integer NOT NULL DEFAULT 1 REFERENCES "comarcas"("id");
