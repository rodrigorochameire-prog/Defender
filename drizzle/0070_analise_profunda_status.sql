ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "analise_profunda_status" varchar(20);
ALTER TABLE "demandas" ADD COLUMN IF NOT EXISTS "analise_profunda_task_id" integer;
