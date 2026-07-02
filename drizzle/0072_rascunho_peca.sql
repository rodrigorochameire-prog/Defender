ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "rascunho_status" varchar(20);
ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "rascunho_task_id" integer;
ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "rascunho_drive_url" text;
