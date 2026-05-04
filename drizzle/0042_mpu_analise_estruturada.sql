-- Task 2: Campos de análise estruturada em processos_vvd
-- Fase do procedimento + motivo da intimação + prazo MPU + juiz decisor

ALTER TABLE "processos_vvd" ADD COLUMN IF NOT EXISTS "fase_procedimento" varchar(40);
ALTER TABLE "processos_vvd" ADD COLUMN IF NOT EXISTS "motivo_ultima_intimacao" varchar(40);
ALTER TABLE "processos_vvd" ADD COLUMN IF NOT EXISTS "prazo_mpu_dias" integer;
ALTER TABLE "processos_vvd" ADD COLUMN IF NOT EXISTS "juiz_decisor" varchar(200);

CREATE INDEX IF NOT EXISTS "processos_vvd_fase_procedimento_idx" ON "processos_vvd" ("fase_procedimento");
CREATE INDEX IF NOT EXISTS "processos_vvd_motivo_ultima_intimacao_idx" ON "processos_vvd" ("motivo_ultima_intimacao");
