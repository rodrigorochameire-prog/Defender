-- Permite criação de processos_vvd via importação automática (sync MPU)
-- antes da resolução da parte requerida. Idempotente.

ALTER TABLE "processos_vvd" ALTER COLUMN "requerido_id" DROP NOT NULL;
ALTER TABLE "processos_vvd" ALTER COLUMN "numero_autos" DROP NOT NULL;
