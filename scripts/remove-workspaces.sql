-- =====================================================
-- Migration: Remove workspace_id from all tables
-- =====================================================
-- This migration removes the multi-tenant workspace
-- concept in favor of defensorId-based access control.
--
-- IMPORTANT: Run this AFTER deploying the code changes.
-- The application code no longer reads/writes workspace_id,
-- so these columns are safe to drop.
-- =====================================================

BEGIN;

-- ==========================================
-- 1. Drop workspace_id columns from all tables
-- ==========================================

-- Core tables
ALTER TABLE users DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE assistidos DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE processos DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE demandas DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE delegacoes_historico DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE afastamentos DROP COLUMN IF EXISTS workspace_id;

-- Agenda tables
ALTER TABLE audiencias DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE calendar_events DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE atendimentos DROP COLUMN IF EXISTS workspace_id;

-- Casos
ALTER TABLE casos DROP COLUMN IF EXISTS workspace_id;

-- Documentos
ALTER TABLE documentos DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE documento_modelos DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE documentos_gerados DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE oficio_analises DROP COLUMN IF EXISTS workspace_id;

-- Comunicacao
ALTER TABLE evolution_config DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE plaud_config DROP COLUMN IF EXISTS workspace_id;

-- Juri
ALTER TABLE sessoes_juri DROP COLUMN IF EXISTS workspace_id;

-- Investigacao
ALTER TABLE diligencias DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE diligencia_templates DROP COLUMN IF EXISTS workspace_id;

-- Jurisprudencia
ALTER TABLE jurisprudencia_temas DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE jurisprudencia_teses DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE jurisprudencia_julgados DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE jurisprudencia_buscas DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE jurisprudencia_drive_folders DROP COLUMN IF EXISTS workspace_id;

-- Prazos
ALTER TABLE tipo_prazos DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE feriados_forenses DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE calculos_prazos DROP COLUMN IF EXISTS workspace_id;

-- Palacio
ALTER TABLE palacio_diagramas DROP COLUMN IF EXISTS workspace_id;

-- Simulador
ALTER TABLE simulacoes_3d DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE simulacao_assets DROP COLUMN IF EXISTS workspace_id;

-- Distribuicao
ALTER TABLE extraction_patterns DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE distribution_history DROP COLUMN IF EXISTS workspace_id;

-- VVD
ALTER TABLE partes_vvd DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE processos_vvd DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE intimacoes_vvd DROP COLUMN IF EXISTS workspace_id;

-- Cowork
ALTER TABLE pareceres DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE mural_notas DROP COLUMN IF EXISTS workspace_id;

-- ==========================================
-- 2. Drop the workspaces table
-- ==========================================
-- First remove user_invitations reference if exists
ALTER TABLE user_invitations DROP COLUMN IF EXISTS workspace_id;

DROP TABLE IF EXISTS workspaces CASCADE;

-- ==========================================
-- 3. Drop orphaned indexes (IF EXISTS handles
--    cases where they were already dropped)
-- ==========================================
DROP INDEX IF EXISTS workspaces_name_idx;
DROP INDEX IF EXISTS workspaces_active_idx;

COMMIT;
