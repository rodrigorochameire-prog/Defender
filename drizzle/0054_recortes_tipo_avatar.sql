-- Recortes tipados (rosto/assinatura/laudo/peticao) + vínculo a assistido OU
-- pessoa + avatar da pessoa a partir de rosto.
SET lock_timeout = '10s';
ALTER TABLE "pessoa_recortes" ADD COLUMN IF NOT EXISTS "tipo" varchar(20) DEFAULT 'rosto';
ALTER TABLE "pessoa_recortes" ADD COLUMN IF NOT EXISTS "assistido_id" integer;
ALTER TABLE "pessoa_recortes" ALTER COLUMN "pessoa_id" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "pessoa_recortes_assistido_idx" ON "pessoa_recortes" ("assistido_id");
ALTER TABLE "pessoas" ADD COLUMN IF NOT EXISTS "avatar_data_url" text;
