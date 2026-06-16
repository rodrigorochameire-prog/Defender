ALTER TABLE "assistidos" ADD COLUMN "autor_nao_identificado" boolean DEFAULT false NOT NULL;
CREATE INDEX IF NOT EXISTS "assistidos_autor_nao_id_idx" ON "assistidos" ("autor_nao_identificado") WHERE "autor_nao_identificado";
