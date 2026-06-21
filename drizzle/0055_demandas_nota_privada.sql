-- Nota interna privada do defensor na demanda (não entra em ofício/exportação).
ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "nota_privada" text;
