-- Alinhamento Férias↔SIGA: campos formais + abono em ferias_parcelas (aditivo/idempotente).
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "numero_solicitacao" text;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "n_siga" text;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "provimento" text;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "data_publicacao" date;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "conversao_pecunia" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "valor_abono_cents" bigint;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "suspensa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "situacao_siga" text;--> statement-breakpoint
ALTER TABLE "ferias_parcelas" ADD COLUMN IF NOT EXISTS "siga_synced_at" timestamp;
