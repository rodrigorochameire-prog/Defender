-- =========================================
-- TeteCare v2 - Script de Criação do Banco
-- =========================================
-- Execute este SQL no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query

-- ============ TABELA: USERS ============
-- ATENÇÃO: A tabela users já existe com schema diferente
-- Vou adicionar apenas a coluna password_hash se não existir

DO $$
BEGIN
    -- Adiciona coluna password_hash se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash text;
    END IF;
    
    -- Adiciona coluna species em pets se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pets' AND column_name = 'species'
    ) THEN
        ALTER TABLE pets ADD COLUMN species varchar(50) DEFAULT 'dog' NOT NULL;
    END IF;

    -- Adiciona coluna color em calendar_events se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' AND column_name = 'color'
    ) THEN
        ALTER TABLE calendar_events ADD COLUMN color varchar(20);
    END IF;

    -- Adiciona coluna action_url em notifications se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'action_url'
    ) THEN
        ALTER TABLE notifications ADD COLUMN action_url text;
    END IF;
END $$;

-- ============ TABELA: BOOKING_REQUESTS ============
CREATE TABLE IF NOT EXISTS "booking_requests" (
    "id" serial PRIMARY KEY NOT NULL,
    "pet_id" integer NOT NULL,
    "tutor_id" integer NOT NULL,
    "start_date" timestamp NOT NULL,
    "end_date" timestamp NOT NULL,
    "request_type" varchar(50) DEFAULT 'daycare' NOT NULL,
    "status" varchar(50) DEFAULT 'pending' NOT NULL,
    "notes" text,
    "rejection_reason" text,
    "admin_notes" text,
    "approved_by_id" integer,
    "approved_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- ============ TABELA: VACCINE_LIBRARY ============
CREATE TABLE IF NOT EXISTS "vaccine_library" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar(200) NOT NULL,
    "description" text,
    "interval_days" integer,
    "doses_required" integer DEFAULT 1,
    "is_common" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- ============ TABELA: PET_VACCINATIONS ============
CREATE TABLE IF NOT EXISTS "pet_vaccinations" (
    "id" serial PRIMARY KEY NOT NULL,
    "pet_id" integer NOT NULL,
    "vaccine_id" integer NOT NULL,
    "application_date" timestamp NOT NULL,
    "next_due_date" timestamp,
    "dose_number" integer DEFAULT 1,
    "veterinarian" varchar(200),
    "clinic" varchar(200),
    "notes" text,
    "document_url" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- ============ TABELA: DAILY_LOGS ============
CREATE TABLE IF NOT EXISTS "daily_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "pet_id" integer NOT NULL,
    "log_date" timestamp NOT NULL,
    "source" varchar(50) NOT NULL,
    "mood" varchar(50),
    "stool" varchar(50),
    "appetite" varchar(50),
    "notes" text,
    "created_by_id" integer NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- ============ FOREIGN KEYS ============

-- booking_requests
DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_tutor_id_users_id_fk" FOREIGN KEY ("tutor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- daily_logs
DO $$ BEGIN
 ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- pet_vaccinations
DO $$ BEGIN
 ALTER TABLE "pet_vaccinations" ADD CONSTRAINT "pet_vaccinations_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "pet_vaccinations" ADD CONSTRAINT "pet_vaccinations_vaccine_id_vaccine_library_id_fk" FOREIGN KEY ("vaccine_id") REFERENCES "public"."vaccine_library"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ============ DADOS INICIAIS ============

-- Biblioteca de Vacinas
INSERT INTO "vaccine_library" ("name", "description", "interval_days", "doses_required", "is_common")
SELECT 'V10', 'Vacina polivalente para cães', 365, 3, true
WHERE NOT EXISTS (SELECT 1 FROM "vaccine_library" WHERE name = 'V10');

INSERT INTO "vaccine_library" ("name", "description", "interval_days", "doses_required", "is_common")
SELECT 'Antirrábica', 'Vacina contra raiva', 365, 1, true
WHERE NOT EXISTS (SELECT 1 FROM "vaccine_library" WHERE name = 'Antirrábica');

INSERT INTO "vaccine_library" ("name", "description", "interval_days", "doses_required", "is_common")
SELECT 'Gripe Canina', 'Vacina contra gripe/tosse dos canis', 180, 1, true
WHERE NOT EXISTS (SELECT 1 FROM "vaccine_library" WHERE name = 'Gripe Canina');

INSERT INTO "vaccine_library" ("name", "description", "interval_days", "doses_required", "is_common")
SELECT 'Giárdia', 'Vacina contra giardíase', 365, 2, false
WHERE NOT EXISTS (SELECT 1 FROM "vaccine_library" WHERE name = 'Giárdia');

-- ============ FIM ============
-- Após executar, faça o deploy na Vercel e rode:
-- npm run db:seed (para criar usuários de teste)
