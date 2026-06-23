-- Relações familiares/contatos do assistido (réu): aresta pessoa↔pessoa
-- (relacionada_pessoa_id) ou texto livre (nome_livre). Aditiva — nenhum
-- DROP/ALTER de objeto existente. Idempotente (IF NOT EXISTS + DO/EXCEPTION).
SET lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS "pessoa_relacoes" (
  "id" serial PRIMARY KEY NOT NULL,
  "pessoa_id" integer NOT NULL,
  "relacionada_pessoa_id" integer,
  "grau" varchar(40) NOT NULL,
  "nome_livre" text,
  "telefone" varchar(20),
  "endereco" text,
  "fonte" varchar(40) NOT NULL,
  "fonte_ref" varchar(120),
  "confirmado" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoa_relacoes" ADD CONSTRAINT "pessoa_relacoes_pessoa_id_pessoas_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pessoa_relacoes" ADD CONSTRAINT "pessoa_relacoes_relacionada_pessoa_id_pessoas_id_fk" FOREIGN KEY ("relacionada_pessoa_id") REFERENCES "public"."pessoas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoa_relacoes_pessoa_idx" ON "pessoa_relacoes" USING btree ("pessoa_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pessoa_relacoes_relacionada_idx" ON "pessoa_relacoes" USING btree ("relacionada_pessoa_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pessoa_relacoes_unique_idx" ON "pessoa_relacoes" USING btree ("pessoa_id","grau","nome_livre");
