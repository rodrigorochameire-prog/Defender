CREATE TABLE IF NOT EXISTS "defensores_ba" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" varchar(200),
	"unidade" varchar(100),
	"atribuicao" text,
	"especialidade" varchar(50) NOT NULL,
	"area" varchar(20) NOT NULL,
	"instancia" varchar(20) NOT NULL,
	"localizacao" varchar(20) NOT NULL,
	"comarca" varchar(100),
	"ativo" boolean DEFAULT true NOT NULL,
	"fonte_organograma" varchar(50) DEFAULT 'DPE-BA-2026',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_especialidade_idx" ON "defensores_ba" USING btree ("especialidade");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_area_idx" ON "defensores_ba" USING btree ("area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_instancia_idx" ON "defensores_ba" USING btree ("instancia");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_localizacao_idx" ON "defensores_ba" USING btree ("localizacao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "defensores_ba_comarca_idx" ON "defensores_ba" USING btree ("comarca");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "defensores_ba_email_idx" ON "defensores_ba" USING btree ("email");