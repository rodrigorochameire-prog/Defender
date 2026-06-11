ALTER TABLE "audiencias" ADD COLUMN IF NOT EXISTS "motivo_nao_realizacao" varchar(40);
ALTER TABLE "audiencias" ADD COLUMN IF NOT EXISTS "motivo_detalhe" text;
ALTER TABLE "audiencias" ADD COLUMN IF NOT EXISTS "aguardando_nova_data" boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "audiencias_aguardando_nova_data_idx" ON "audiencias" ("aguardando_nova_data") WHERE "aguardando_nova_data";
