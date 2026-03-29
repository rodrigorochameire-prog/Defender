CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"valor" numeric NOT NULL,
	"status" varchar(20) DEFAULT 'pendente' NOT NULL,
	"metodo" varchar(20) DEFAULT 'pix',
	"referencia_mes" varchar(7),
	"asaas_payment_id" varchar(100),
	"pix_qr_code" text,
	"pix_copia_cola" text,
	"nota" text,
	"data_pagamento" timestamp,
	"data_vencimento" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plano" varchar(20) DEFAULT 'essencial' NOT NULL,
	"status" varchar(20) DEFAULT 'pendente' NOT NULL,
	"valor_base" numeric NOT NULL,
	"desconto_percentual" integer DEFAULT 0,
	"valor_final" numeric NOT NULL,
	"data_inicio" date,
	"data_vencimento" date,
	"data_ultimo_pagamento" date,
	"asaas_customer_id" varchar(100),
	"asaas_subscription_id" varchar(100),
	"dias_tolerancia" integer DEFAULT 7,
	"observacoes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_subscription_idx" ON "payments" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_user_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payments_referencia_idx" ON "payments" USING btree ("referencia_mes");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_plano_idx" ON "subscriptions" USING btree ("plano");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_vencimento_idx" ON "subscriptions" USING btree ("data_vencimento");