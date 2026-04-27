ALTER TABLE "audiencias" ADD COLUMN IF NOT EXISTS "anotacoes_rapidas" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN IF NOT EXISTS "ouvido_em" timestamp;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN IF NOT EXISTS "redesignado_para" date;--> statement-breakpoint
ALTER TABLE "testemunhas" ADD COLUMN IF NOT EXISTS "sintese_juizo" text;
