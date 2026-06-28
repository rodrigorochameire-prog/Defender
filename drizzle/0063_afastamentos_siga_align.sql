-- Alinhamento Afastamentos↔SIGA: campos formais (aditivo/idempotente).
ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS "numero_solicitacao" text;--> statement-breakpoint
ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS "n_siga" text;--> statement-breakpoint
ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS "data_publicacao" date;--> statement-breakpoint
ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS "situacao_siga" text;--> statement-breakpoint
ALTER TABLE "afastamentos" ADD COLUMN IF NOT EXISTS "siga_synced_at" timestamp;
