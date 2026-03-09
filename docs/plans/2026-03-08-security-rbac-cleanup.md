# Plano: Cleanup de Segurança, RBAC e Remoção de Workspaces

**Data**: 2026-03-08
**Status**: Aprovado para implementação
**Escopo**: 4 fases progressivas

---

## Contexto

Investigação completa revelou:
- Tabela `workspaces` é um container vazio sem semântica de negócio
- O modelo real de isolamento é por `defensorId` (já implementado em demandas)
- `workspaceId` é usado inconsistentemente (processos sim, demandas não, assistidos "compartilhado")
- 88/93 tabelas têm RLS habilitado mas SEM policies além de service_role/postgres bypass
- Assignment system (Júri/VVD/EP) é 100% frontend (localStorage) e independente de workspaces
- Role `triagem` existe no frontend mas não no tRPC
- `avaliacaoJuri` tem 5 endpoints públicos expondo dados sensíveis
- Policies legadas do WhatsApp com `USING (true)` podem estar ativas

## Decisões Arquiteturais

1. **Workspaces removidos** — filtro por `defensorId` + `getDefensoresVisiveis()` substitui completamente
2. **Assignment system mantido** — é frontend-only, não é afetado
3. **RLS como defense-in-depth** — tRPC continua como camada principal, RLS como fallback
4. **service_role continua bypassando RLS** — necessário para o backend tRPC

---

## Fase 1: Remover Workspaces

### 1.1 — Migração SQL: Dropar workspace

```sql
-- Migration: remove_workspaces.sql

-- 1. Remover FK de users
ALTER TABLE users DROP COLUMN IF EXISTS workspace_id;

-- 2. Remover workspace_id de todas as tabelas que têm
ALTER TABLE assistidos DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE processos DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE demandas DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE sessoes_juri DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE audiencias DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE documentos DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE calendar_events DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE casos DROP COLUMN IF EXISTS workspace_id;

-- 3. Dropar tabela workspaces
DROP TABLE IF EXISTS workspaces CASCADE;

-- 4. Dropar índices de workspace
-- (serão dropados automaticamente com as colunas)

-- 5. Dropar RLS policies de workspace
DROP POLICY IF EXISTS "service_role_full_access" ON workspaces;
DROP POLICY IF EXISTS "postgres_full_access" ON workspaces;
```

### 1.2 — Schema Drizzle: Remover workspaces

**Arquivo**: `src/lib/db/schema/core.ts`
- Deletar tabela `workspaces` inteira
- Remover `workspaceId` da tabela `users`
- Remover `workspaceId` de todas as tabelas que referenciam

**Arquivos afetados** (grep por `workspaceId` e `workspace_id`):
- `src/lib/db/schema/core.ts` — tabela workspaces + FK em users
- `src/lib/db/schema/` — qualquer outro schema com workspaceId
- Remover relações `workspaces` de todos os `relations()`

### 1.3 — tRPC: Limpar referências a workspace

**Arquivo `src/lib/trpc/workspace.ts`** → Renomear para `src/lib/trpc/defensor-scope.ts`:
- Remover `getWorkspaceScope()` (ou simplificar para retornar só `{ isAdmin, userId }`)
- Remover `resolveWorkspaceId()`
- Manter `getDefensorResponsavel()` (é a lógica correta)
- Manter `getDefensoresVisiveis()` (é a lógica correta)
- Manter `isSharedData()` e `isIndividualData()`

**Routers afetados** (grep por `workspaceId`, `getWorkspaceScope`, `resolveWorkspaceId`):
- `src/lib/trpc/routers/demandas.ts` — remover workspaceId "para compatibilidade" na criação
- `src/lib/trpc/routers/processos.ts` — trocar filtro workspaceId por defensorId (ou remover filtro se processo é shared)
- `src/lib/trpc/routers/assistidos.ts` — remover getWorkspaceScope calls desnecessários
- `src/lib/trpc/routers/casos.ts` — idem
- `src/lib/trpc/routers/workspaces.ts` — DELETAR arquivo inteiro
- Todos os outros routers que importam workspace functions

**Router principal** (`src/lib/trpc/routers/index.ts` ou `_app.ts`):
- Remover `workspaces` do appRouter

### 1.4 — Frontend: Limpar referências

- Remover página `/admin/workspaces` se existir
- Remover item "Workspaces" do sidebar (admin-sidebar.tsx)
- Remover qualquer `trpc.workspaces.*` call nos componentes
- Grep por `workspaceId` em todo o frontend

### 1.5 — Tipos: Atualizar

- Remover `workspaceId` do tipo `User`
- Atualizar interfaces que incluem workspace

---

## Fase 2: RLS Defense-in-Depth

### 2.1 — Policies para tabelas críticas

Criar policies que espelham a lógica do tRPC para as 5 tabelas mais importantes:

```sql
-- assistidos: SHARED (todos autenticados podem ver)
CREATE POLICY "authenticated_read_assistidos" ON assistidos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "authenticated_write_assistidos" ON assistidos
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_assistidos" ON assistidos
  FOR UPDATE TO authenticated
  USING (deleted_at IS NULL);

-- processos: SHARED
CREATE POLICY "authenticated_read_processos" ON processos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- demandas: PRIVATE por defensor
-- Nota: Esta policy é defense-in-depth. O tRPC já filtra.
-- A policy garante que mesmo com bug no tRPC, um defensor
-- não vê demandas de outro via PostgREST direto.
CREATE POLICY "defensor_read_own_demandas" ON demandas
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- Admin/servidor veem tudo
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()::INTEGER
        AND users.role IN ('admin', 'servidor')
      )
      -- Defensor vê as próprias
      OR defensor_id = auth.uid()::INTEGER
      -- Estagiário vê do supervisor
      OR defensor_id = (
        SELECT supervisor_id FROM users
        WHERE users.id = auth.uid()::INTEGER
      )
    )
  );

-- casos: SHARED
CREATE POLICY "authenticated_read_casos" ON casos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);
```

### 2.2 — Remover policies legadas do WhatsApp

```sql
-- Remover policies permissivas de 20260114
DROP POLICY IF EXISTS "whatsapp_config_select_own" ON whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_insert_own" ON whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_update_own" ON whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_config_delete_own" ON whatsapp_config;
DROP POLICY IF EXISTS "whatsapp_messages_select" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_insert" ON whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_update" ON whatsapp_messages;
```

### 2.3 — Soft delete no RLS

Todas as policies de SELECT devem incluir `AND deleted_at IS NULL` para evitar
que rows "deletados" vazem via acesso direto ao banco.

---

## Fase 3: Formalizar Roles

### 3.1 — Adicionar `triagem` ao tRPC

**Arquivo**: `src/lib/trpc/init.ts`
```typescript
// Linha 14: adicionar triagem
export type UserRole = "admin" | "defensor" | "estagiario" | "servidor" | "triagem";
```

### 3.2 — supervisorId obrigatório para estagiários

**Arquivo**: `src/lib/db/schema/core.ts`
- Manter `supervisorId` nullable no schema (nem todo user é estagiário)
- Adicionar CHECK constraint no banco:

```sql
ALTER TABLE users ADD CONSTRAINT check_estagiario_has_supervisor
  CHECK (role != 'estagiario' OR supervisor_id IS NOT NULL);
```

### 3.3 — Proteger avaliacaoJuri

**Arquivo**: `src/lib/trpc/routers/avaliacaoJuri.ts`
- Trocar `publicProcedure` por `protectedProcedure` em todos os endpoints
- Se precisar de acesso externo (jurados avaliando), criar token temporário

### 3.4 — Remover fallback user sintético

**Arquivo**: `src/lib/auth/session.ts` (linhas 113-121)
- Se JWT válido mas user não existe no DB → invalidar sessão e redirecionar login
- Não criar user fantasma que bypassa validações

---

## Fase 4: Hardening (Nice-to-Have)

### 4.1 — Rate Limiting

**Arquivo**: `src/lib/trpc/init.ts` (linhas 163-170)
- Implementar rate limiter real no middleware stub
- Sugestão: in-memory com Map + sliding window (não precisa Redis para 4 users)
- Limites sugeridos: 100 req/min para protected, 20 req/min para admin

### 4.2 — Audit log expandido

- Atualmente só admin actions são logadas
- Expandir para: login/logout, acesso a dados sensíveis (assistidos), export de dados

---

## Checklist de Validação Pós-Implementação

- [ ] `npm run build` passa sem erros
- [ ] Grep por `workspaceId` retorna 0 resultados em `src/`
- [ ] Grep por `getWorkspaceScope` retorna 0 resultados
- [ ] Grep por `resolveWorkspaceId` retorna 0 resultados
- [ ] Grep por `workspaces` no router index retorna 0
- [ ] Assignment switcher (Júri/VVD/EP) continua funcionando
- [ ] Login como admin vê tudo
- [ ] Login como defensor vê demandas próprias, assistidos compartilhados
- [ ] Sidebar mostra items corretos por role
- [ ] `avaliacaoJuri` requer auth
- [ ] WhatsApp policies legadas removidas (verificar no Supabase)

---

## Arquivos Críticos

| Arquivo | Ação |
|---------|------|
| `src/lib/db/schema/core.ts` | Remover workspaces + workspaceId |
| `src/lib/trpc/workspace.ts` | Renomear → defensor-scope.ts, limpar |
| `src/lib/trpc/routers/workspaces.ts` | DELETAR |
| `src/lib/trpc/routers/demandas.ts` | Remover workspaceId refs |
| `src/lib/trpc/routers/processos.ts` | Trocar workspaceId por lógica shared |
| `src/lib/trpc/routers/assistidos.ts` | Limpar getWorkspaceScope |
| `src/lib/trpc/routers/avaliacaoJuri.ts` | publicProcedure → protectedProcedure |
| `src/lib/trpc/init.ts` | Adicionar triagem, rate limiting |
| `src/lib/auth/session.ts` | Remover fallback user |
| `src/hooks/use-permissions.ts` | Já tem triagem (ok) |
| `src/components/layouts/admin-sidebar.tsx` | Remover workspace menu item |
| `supabase/migrations/` | Nova migration (RLS + drop workspace) |
