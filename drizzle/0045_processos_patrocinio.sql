-- Adiciona colunas de tipo de patrocínio (Defensoria ou advogado particular)
-- Seguro: NOT NULL com default "DEFENSORIA", sem quebra de dados existentes

ALTER TABLE "processos" ADD COLUMN "tipo_patrocinio" varchar(20) NOT NULL DEFAULT 'DEFENSORIA';
ALTER TABLE "processos" ADD COLUMN "advogado_particular" text;
