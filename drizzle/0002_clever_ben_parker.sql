ALTER TABLE "atendimentos" ADD COLUMN "enrichment_status" varchar(20);--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "enrichment_data" jsonb;--> statement-breakpoint
ALTER TABLE "atendimentos" ADD COLUMN "enriched_at" timestamp;--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "ordem_manual" integer;--> statement-breakpoint
ALTER TABLE "demandas" ADD COLUMN "enrichment_data" jsonb;--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "enrichment_status" varchar(20);--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "enrichment_data" jsonb;--> statement-breakpoint
ALTER TABLE "documentos" ADD COLUMN "enriched_at" timestamp;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "atendimentos_enrichment_status_idx" ON "atendimentos" USING btree ("enrichment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documentos_enrichment_status_idx" ON "documentos" USING btree ("enrichment_status");