-- Rename enum value 5_FILA → 5_TRIAGEM in status_demanda
-- PostgreSQL 10+ supports ALTER TYPE ... RENAME VALUE
ALTER TYPE "status_demanda" RENAME VALUE '5_FILA' TO '5_TRIAGEM';

-- Update default on demandas table
ALTER TABLE "demandas" ALTER COLUMN "status" SET DEFAULT '5_TRIAGEM';
