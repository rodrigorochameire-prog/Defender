# Epic: Resolucao de Debito Tecnico — OMBUDS

## Objetivo

Eliminar os 53 debitos tecnicos identificados no Brownfield Discovery, priorizando seguranca (senha exposta, RLS inativo, CORS aberto) e fundacao (CI/CD, type safety, error boundaries), para viabilizar escalabilidade, conformidade LGPD e adocao institucional do sistema OMBUDS.

## Contexto

O Brownfield Discovery (Phases 1-8) revelou que a velocidade de entrega por um desenvolvedor solo resultou em debitos criticos que ameacam a seguranca e a estabilidade do sistema:

- **Senha do banco em plaintext** commitada no repositorio (DB-014) — acesso total ao banco por qualquer pessoa com acesso ao repo
- **RLS efetivamente desabilitado** — app conecta como `postgres` role, 43 tabelas sem RLS habilitado (DB-002, DB-015)
- **Zero testes automatizados** em 340K LOC TypeScript e cobertura <5% em Python (SYS-002, PY-001)
- **`ignoreBuildErrors: true`** desativa type safety no build (SYS-001)
- **CORS `allow_origins=["*"]`** no enrichment engine (SYS-006)
- **Webhook Drive fail-open** permite injecao de eventos (INFRA-002)
- **Sem CI/CD pipeline** — push-to-deploy sem gates (SYS-003)

Referencia completa: `docs/discovery/technical-debt-assessment.md`

## Escopo

### Incluido
- Todos os 53 debitos tecnicos catalogados (9 CRITICAL, 15 HIGH, 20 MEDIUM, 9 LOW)
- Rotacao de credenciais e limpeza de historico git
- Implementacao de CI/CD com GitHub Actions
- Habilitacao e implementacao de RLS
- Consolidacao de migrations
- Error boundaries e validacao de formularios
- Testes automatizados (vitest, pytest, Playwright)
- Acessibilidade (e-MAG, LBI)
- Print styles para documentos juridicos

### NAO incluido
- Novas funcionalidades (features)
- Migracoes de stack (ex: trocar Next.js, trocar Supabase)
- Redesign visual completo
- Integracoes externas novas (PJe, OpenClaw, SOLAR/SIGAD)

## Criterios de Sucesso

| Metrica | Atual | Meta 1 Mes | Meta 3 Meses | Meta 6 Meses |
|---------|-------|-----------|-------------|-------------|
| Debitos CRITICAL | 9 | 2 | 0 | 0 |
| Debitos HIGH | 15 | 10 | 3 | 0 |
| `tsc --noEmit` erros | ??? | 0 | 0 | 0 |
| Usos de `any` em tRPC | 186 | 120 | 40 | 0 |
| Cobertura testes (TS) | 0% | 10% | 30% | 50% |
| Cobertura testes (Python) | ~5% | 15% | 30% | 50% |
| Tabelas com RLS habilitado | 87/130 | 130/130 | 130/130 | 130/130 |
| Tabelas com RLS policies reais | 5/130 | 20/130 | 80/130 | 130/130 |
| Error boundaries | 0 | 5 | 10 | 15+ |
| Loading states | 8 | 20 | 50 | 80+ |
| CI pipeline | Inexistente | lint+typecheck+build | +testes | +E2E+security |
| Secrets em plaintext | 8+ | 0 | 0 | 0 |

## Stories

### Wave 1 — Emergencia de Seguranca (Semana 1)

| ID | Story | Horas | Debito |
|----|-------|------:|--------|
| TD.1 | Rotacionar senha do banco e limpar historico git | 2-4 | DB-014 |
| TD.2 | Remover `ignoreBuildErrors` e corrigir erros de tipo | 16-24 | SYS-001 |
| TD.3 | Remover credenciais hardcoded do client Supabase | 2 | DB-004 |
| TD.4 | Corrigir `supabase/config.toml` para projeto correto | 0.5 | DB-019 |
| TD.5 | Restringir CORS do enrichment engine | 1 | SYS-006 |
| TD.6 | Corrigir webhook Drive fail-open | 1 | INFRA-002 |

**Total estimado:** 22-32h

### Wave 2 — Fundacao (Semana 2-3)

| ID | Story | Horas | Debito |
|----|-------|------:|--------|
| TD.7 | Implementar CI/CD com GitHub Actions | 8-12 | SYS-003 |
| TD.8 | Adicionar error boundaries nas rotas criticas | 8-12 | UX-001 |
| TD.9 | Habilitar RLS nas 43 tabelas restantes | 3-4 | DB-015 |
| TD.10 | Implementar backup off-site para dados LGPD | 4-8 | DB-020 |
| TD.11 | Validar JWT no middleware (nao apenas cookie) | 2-4 | SYS-009 |
| TD.12 | Quick wins de acessibilidade | 8 | UX-005 |

**Total estimado:** 33-48h

### Wave 3 — Seguranca de Dados (Semana 4-6)

| ID | Story | Horas | Debito |
|----|-------|------:|--------|
| TD.13 | Implementar RLS real com role dedicada | 24-40 | DB-002 |
| TD.14 | Isolamento multi-tenant por comarca_id via RLS | 8-12 | DB-003 |
| TD.15 | Consolidar migrations em Drizzle como source of truth | 16-24 | DB-001 |

**Total estimado:** 48-76h

### Wave 4 — Qualidade de Codigo (Semana 7-10)

| ID | Story | Horas | Debito |
|----|-------|------:|--------|
| TD.16 | Adotar react-hook-form + Zod nos CRUDs core | 40-60 | UX-002 |
| TD.17 | Consolidar componentes duplicados + setup Storybook | 32-48 | UX-004, UX-013 |
| TD.18 | Eliminar `any` dos tRPC routers | 16-24 | SYS-005 |

**Total estimado:** 88-132h

### Wave 5 — Performance e Polish (Semana 11-17)

| ID | Story | Horas | Debito |
|----|-------|------:|--------|
| TD.19 | Decompor componentes monoliticos | 32-48 | UX-003 |
| TD.20 | Print styles para documentos juridicos | 20-28 | UX-009 |
| TD.21 | Testes do enrichment engine Python | 16-24 | PY-001 |
| TD.22 | Triggers updated_at + padronizar TIMESTAMPTZ | 12-18 | DB-005, DB-006 |
| TD.23 | Suite de testes vitest para areas criticas | 40-60 | SYS-002 |
| TD.24 | Loading states nas rotas restantes | 12-16 | UX-006 |
| TD.25 | Backlog restante (audit, cleanup, observability) | 40-60 | DB-007, DB-012, SYS-007/008, PY-002/003, INFRA-001/003/004 |

**Total estimado:** 172-254h

## Riscos

| # | Risco | Impacto | Mitigacao |
|---|-------|---------|----------|
| RC-001 | **Cadeia de seguranca**: senha no repo + RLS no-op + CORS * + webhook fail-open | Acesso nao autorizado ao banco e APIs | DB-014 imediato (Semana 1), bloco de seguranca completo nas Semanas 1-6 |
| RC-002 | **Cadeia de integridade**: zero testes + zero CI + ignoreBuildErrors + dual migrations | Codigo quebrado em producao sem deteccao | SYS-001 -> SYS-003 -> SYS-002 sequencial |
| RC-003 | **Cadeia UX**: zero error boundaries + zero validacao + toast-only | App crasha sem feedback, dados invalidos | UX-001 quick win (Semana 2), UX-002 paralelo |
| RC-004 | **Risco LGPD**: PII sem RLS + sem audit DELETE + sem backup off-site + senha exposta | Violacao de conformidade, exposicao de dados sensiveis | Tratar como bloco unico nas Semanas 1-6 |
| RC-005 | **Fragilidade AI**: CORS * + API key unica + sem circuit breaker + cross-region | Pipeline AI vulneravel e instavel | SYS-006 imediato, observability gradual |
| RC-006 | **Risco de regressao**: 340K LOC sem testes + sem Storybook = refatoracao perigosa | Refatoracoes podem quebrar funcionalidades existentes | Testes ANTES de refatorar cada area |

## Timeline

| Semana | Wave | Foco | Horas Est. |
|--------|------|------|-----------|
| 1 | Wave 1 | Emergencia de Seguranca — rotacao de senha, type safety, credenciais, CORS, webhook | 22-32h |
| 2-3 | Wave 2 | Fundacao — CI/CD, error boundaries, RLS enable, backup, JWT, acessibilidade | 33-48h |
| 4-6 | Wave 3 | Seguranca de Dados — RLS real, multi-tenant, consolidar migrations | 48-76h |
| 7-10 | Wave 4 | Qualidade de Codigo — formularios, componentes, type safety | 88-132h |
| 11-17 | Wave 5 | Performance e Polish — decomposicao, print, testes, timestamps, loading | 172-254h |
| **Total** | | | **363-542h** |

**Caminho critico:** DB-014 + SYS-001 (Semana 1) -> SYS-003 (Semana 2) -> DB-002/003 (Semana 4-6)

---

*Epic criado na Phase 10 do Brownfield Discovery — @pm (Morgan)*
*Referencia: `docs/discovery/technical-debt-assessment.md`*
