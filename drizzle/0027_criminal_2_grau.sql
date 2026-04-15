CREATE TYPE "public"."classe_recursal" AS ENUM('APELACAO', 'AGRAVO_EXECUCAO', 'RESE', 'HC', 'EMBARGOS', 'REVISAO_CRIMINAL', 'CORREICAO_PARCIAL');--> statement-breakpoint
CREATE TYPE "public"."resultado_julgamento" AS ENUM('PROVIDO', 'IMPROVIDO', 'PARCIAL', 'NAO_CONHECIDO', 'DILIGENCIA', 'PREJUDICADO');--> statement-breakpoint
ALTER TYPE "public"."area" ADD VALUE 'CRIMINAL_2_GRAU';--> statement-breakpoint
ALTER TYPE "public"."atribuicao" ADD VALUE 'CRIMINAL_2_GRAU_SALVADOR';--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "classe_recursal" "classe_recursal";--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "camara" text;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "relator" text;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_distribuicao" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_conclusao" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_pauta" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "data_julgamento" date;--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "resultado_julgamento" "resultado_julgamento";--> statement-breakpoint
ALTER TABLE "processos" ADD COLUMN "acordao_recorrido_numero" text;
