ALTER TABLE "drive_files" ADD COLUMN "enrichment_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "enrichment_error" text;--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "enriched_at" timestamp;--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "categoria" varchar(50);--> statement-breakpoint
ALTER TABLE "drive_files" ADD COLUMN "document_type" varchar(100);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_enrichment_status_idx" ON "drive_files" USING btree ("enrichment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drive_files_enriched_at_idx" ON "drive_files" USING btree ("enriched_at");