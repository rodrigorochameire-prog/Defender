# Technical Debt Assessment — FINAL

> **Brownfield Discovery Phase 8** | Consolidado por @architect (Aria)
> **Data:** 2026-03-25
> **Projeto:** OMBUDS — Sistema de Gestao de Casos para Defensoria Publica
> **Stack:** Next.js 15 + tRPC + Drizzle + Supabase + FastAPI (Python)
> **Escala:** 340K LOC TypeScript | 19K LOC Python | 134 paginas | ~130 tabelas | ~45K registros
> **Status QA:** APPROVED (Phase 7)

---

## Executive Summary

O OMBUDS e um sistema de gestao de casos juridicos de grande porte, construido por um desenvolvedor solo, com escala impressionante (134 paginas, 130 tabelas, integracao com 15+ servicos externos). A velocidade de entrega resultou em **53 debitos tecnicos** que precisam ser tratados para viabilizar escalabilidade, seguranca LGPD e adocao institucional.

**Achado mais critico:** Senha do banco de dados em plaintext no repositorio (DB-014). Requer rotacao imediata.

| Severidade | Quantidade | Horas Est. |
|-----------|-----------|-----------|
| CRITICAL | 9 | 90-140h |
| HIGH | 15 | 190-280h |
| MEDIUM | 20 | 140-190h |
| LOW | 9 | 50-60h |
| **TOTAL** | **53** | **470-670h** |

**Tempo estimado (1 dev solo):** 12-17 semanas, priorizando seguranca e fundacao nas primeiras 4.

---

## Forcas do Sistema

Antes dos debitos, e fundamental reconhecer o que foi bem construido:

1. **Modelagem de dominio rica** — 130+ tabelas cobrindo todo o fluxo da defensoria publica
2. **API tipada end-to-end** via tRPC com 62 routers cobrindo 15+ dominios
3. **Design system maduro** v10.0 — tokens HSL, 3 temas (light/medium/dark), 3 fontes semanticas
4. **Multi-tenancy pensado** — comarca/defensor scoping implementado na camada de aplicacao
5. **Pipeline AI profunda** — classificacao, extracao, transcricao, diarizacao, busca semantica (pgvector)
6. **PWA com offline** — Dexie/IndexedDB, sync queue, service worker
7. **134 paginas** cobrindo Juri, VVD, Radar Criminal, Drive, WhatsApp, Execucao Penal, Legislacao
8. **Arquitetura de 2 camadas** — Next.js (Vercel, Sao Paulo) + Python AI (Railway)
9. **Indexes bem aplicados** — 150+ B-tree + GIN trigram + HNSW pgvector + functional CPF
10. **Soft delete consistente** nas tabelas core

---

## Inventario Completo de Debitos

### 1. Sistema (validado por @architect)

#### CRITICAL

| ID | Debito | Impacto | Horas | Localizacao |
|----|--------|---------|------:|-------------|
| SYS-001 | **`ignoreBuildErrors: true`** — type safety desativada no build | Erros de tipo em producao | 16-24 | `next.config.js:33` |
| SYS-002 | **Zero testes automatizados** — 340K LOC sem cobertura | Regressao impossivel de detectar | 60-80 | Projeto inteiro |
| SYS-003 | **Sem CI/CD pipeline** — push-to-deploy sem gates | Codigo quebrado vai para producao | 8-12 | `.github/` (ausente) |
| SYS-004 | **tRPC em Release Candidate** (`rc.608`) | Breaking changes possiveis | 4-8 | `package.json` |

#### HIGH

| ID | Debito | Impacto | Horas |
|----|--------|---------|------:|
| SYS-005 | **186 usos de `any`** em tRPC routers | Type safety derrotada na API | 16-24 |
| SYS-006 | **CORS `allow_origins=["*"]`** no enrichment engine | API aberta a qualquer origem | 1 |
| SYS-007 | **Rate limiting in-memory** — inutil em serverless | Sem protecao contra abuso | 8-12 |
| SYS-008 | **Cache de sessao in-memory** — incompativel com serverless | Cache nao compartilhado | 8-12 |
| SYS-009 | **Middleware so checa presenca do cookie** — nao valida JWT | Token expirado passa | 2-4 |

#### MEDIUM

| ID | Debito | Impacto | Horas |
|----|--------|---------|------:|
| SYS-010 | `--legacy-peer-deps` necessario | Conflitos mascarados | 4-8 |
| SYS-011 | 62 tRPC routers carregados em toda request | Cold start lento | 8-16 |
| SYS-012 | Routers duplicados (cobertura/coberturas, parecer/pareceres) | Confusao | 4-6 |
| SYS-013 | `pje-parser.ts` — 1.586 linhas monoliticas | Manutencao dificil | 8-12 |
| SYS-017 | 102 TODO/FIXME/HACK em 48 arquivos | Debito reconhecido nao tratado | 16-24 |
| SYS-018 | `googleapis` package (~50MB) | Cold starts lentos | 4-8 |

#### LOW

| ID | Debito | Horas |
|----|--------|------:|
| SYS-014 | Imagens grandes no repo (~36MB) | 2-4 |
| SYS-015 | Pool de conexao fixo em 5 | 1-2 |
| SYS-016 | `robots: index: true` em ferramenta interna | 0.5 |

---

### 2. Database (validado por @data-engineer)

#### CRITICAL

| ID | Debito | Impacto | Horas | Complexidade |
|----|--------|---------|------:|:------------:|
| DB-014 | **Senha do banco em plaintext** (`[REDACTED]`) em 8+ arquivos commitados | Acesso total ao banco por qualquer colaborador | 2-4 | Simple |
| DB-001 | **Sistema dual de migrations** (Supabase SQL + Drizzle push) | Schema sem source of truth unico, sem rollback | 16-24 | Complex |
| DB-002 | **RLS efetivamente no-op** — app conecta como `postgres` role | Exposicao total se credenciais vazarem | 24-40 | Complex |
| DB-003 | **Sem isolamento multi-tenant** — `comarca_id` sem enforcement no banco | Dados de comarcas acessiveis entre si | 16-24 | Complex |
| DB-004 | **Credenciais Supabase hardcoded** + senha no repo | Impossivel rotacionar sem deploy | 4-6 | Simple |
| DB-015 | **43 tabelas sem RLS habilitado** (rowsecurity=false) | Pre-requisito para qualquer policy RLS | 3-4 | Simple |

#### HIGH

| ID | Debito | Impacto | Horas |
|----|--------|---------|------:|
| DB-005 | Missing `updated_at` triggers (apenas 3 de ~130 tabelas) | Timestamps inconsistentes | 4-6 |
| DB-006 | Tipos de timestamp inconsistentes (TIMESTAMP vs TIMESTAMPTZ) | Bugs de timezone | 8-12 |
| DB-007 | Sem audit trail em DELETE — gap LGPD | Compliance | 8-12 |
| DB-020 | Sem backup off-site para dados LGPD (apenas Supabase Free 7d) | Perda de dados irrecuperavel | 4-8 |

#### MEDIUM

| ID | Debito | Horas |
|----|--------|------:|
| DB-008 | Tabela `workspaces` legada com FKs pendentes | 2-3 |
| DB-011 | VARCHAR para status ao inves de ENUMs | 6-8 |
| DB-012 | 6 tabelas de documentos/templates duplicadas (todas com 0 rows) | 12-16 |
| DB-016 | `drive_sync_logs` sem retencao (24K+ rows crescendo) | 2-3 |
| DB-019 | `supabase/config.toml` apontando para projeto errado (tetecare) | 0.5 |

#### LOW

| ID | Debito | Horas |
|----|--------|------:|
| DB-009 | Missing composite indexes (volume atual nao justifica urgencia) | 2-3 |
| DB-010 | Missing partial indexes em deleted_at IS NULL | 2-3 |
| DB-013 | SERIAL (int4) PKs — limite futuro | 16-24 |
| DB-017 | Tabelas orfas (`usuarios`, `sessions`) | 1-2 |
| DB-018 | `processos.comarca` VARCHAR redundante com `comarca_id` FK | 2-3 |

---

### 3. Frontend/UX (validado por @ux-design-expert)

#### CRITICAL

| ID | Debito | Impacto | Horas |
|----|--------|---------|------:|
| UX-001 | **Zero error boundaries** — 0 `error.tsx` em 134 rotas | App crasha sem feedback | 8-12 |

#### HIGH

| ID | Debito | Impacto | Horas |
|----|--------|---------|------:|
| UX-002 | **Sem validacao de formularios** — useState/FormData raw | Dados invalidos, UX ruim | 40-60 |
| UX-003 | **Componentes monoliticos** — 10+ arquivos >1000 linhas (max: 3.671) | Manutencao, performance | 32-48 |
| UX-004 | **6 variantes duplicadas** de stats cards + 4 headers + 2 empty states | Inconsistencia visual | 16-24 |
| UX-005 | **Acessibilidade fraca** — 33 ARIA, sem skip nav, `<div onClick>` | Exclusao, barreira legal (e-MAG, LBI) | 24-32 |

#### MEDIUM

| ID | Debito | Horas |
|----|--------|------:|
| UX-006 | 117 de 125 rotas admin sem `loading.tsx` | 12-16 |
| UX-007 | Toast como unico feedback de erro (944 usos) | 16-24 |
| UX-008 | Mix de tokens e cores raw (emerald-600, zinc-900) | 8-12 |
| UX-009 | **Sem print styles** — 1 arquivo com @media print (elevado de LOW) | 20-28 |
| UX-010 | Dois sistemas de layout (CSS-class + component-based) | 12-16 |
| UX-011 | Ausencia de React.memo em componentes pesados | 8-12 |
| UX-012 | Sem focus management em modais customizados | 6-8 |
| UX-013 | Sem Storybook / catalogo visual (causa raiz de duplicacao) | 16-24 |
| UX-015 | Sem feedback visual proporcional em acoes destrutivas | 8-12 |

#### LOW

| ID | Debito | Horas |
|----|--------|------:|
| UX-014 | `<a href>` vs `<Link>` inconsistente em navegacao | 2 |

---

### 4. Python Backend (identificado por @qa)

#### HIGH

| ID | Debito | Impacto | Horas |
|----|--------|---------|------:|
| PY-001 | **4 testes para 55+ arquivos** — cobertura <5% | Regressao no pipeline AI | 16-24 |
| PY-004 | **Scrapers frageis** (SOLAR, SIGAD, PJe, Instagram) sem monitoramento | Quebra silenciosa | 8-12 |

#### MEDIUM

| ID | Debito | Horas |
|----|--------|------:|
| PY-002 | 292 try/except — pattern catch-all silencioso | 8-12 |
| PY-003 | 655 logger/print sem structured logging | 8-12 |
| PY-005 | Pipeline AI sem fallback chain, circuit breaker, metricas de custo | 8-12 |
| PY-006 | Railway em us-east4 vs banco em sa-east-1 — latencia cross-region | 4-8 |

---

### 5. Infraestrutura (identificado por @qa)

#### MEDIUM

| ID | Debito | Impacto | Horas |
|----|--------|---------|------:|
| INFRA-001 | **Inngest sem dead letter queue** — jobs falham silenciosamente | Mensagens nao enviadas | 4-8 |
| INFRA-002 | **Webhook Drive fail-open** — fallback `""` desabilita autenticacao | Injecao de eventos | 2-4 |
| INFRA-003 | **PWA offline sync nao testada** — sem notificacao de falha | Dados perdidos em campo | 8-12 |
| INFRA-004 | **Sem observability estruturada** — 226 console.log, sem correlation IDs | Debugging impossivel | 12-16 |

---

## Plano de Resolucao

### Semana 1 — EMERGENCIA de Seguranca (~20h)

| # | ID | Acao | Horas |
|---|-----|------|------:|
| 1 | **DB-014** | Rotacionar senha do banco IMEDIATAMENTE. Remover de scripts/docs. BFG para limpar historico git. | 2-4 |
| 2 | **SYS-001** | Remover `ignoreBuildErrors: true`. Corrigir erros de tipo que surgirem. | 16-24 |
| 3 | **DB-004** | Remover credenciais hardcoded do `client.ts`. Fail hard se env ausente. | 2 |
| 4 | **DB-019** | Corrigir `config.toml` para projeto correto. | 0.5 |
| 5 | **SYS-006** | Restringir CORS do enrichment para dominio Vercel. | 1 |
| 6 | **INFRA-002** | Corrigir webhook Drive fail-open. | 1 |

### Semana 2-3 — Fundacao (~50h)

| # | ID | Acao | Horas |
|---|-----|------|------:|
| 7 | **SYS-003** | CI/CD: GitHub Actions com lint + typecheck + build + secret scanning. | 8-12 |
| 8 | **UX-001** | Error boundaries: root, admin, rotas data-heavy (juri, drive, processos). | 8-12 |
| 9 | **DB-015** | Habilitar RLS nas 43 tabelas (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). | 3-4 |
| 10 | **DB-020** | Backup off-site (pg_dump + S3/R2). Documentar restauracao. | 4-8 |
| 11 | **SYS-009** | Validar JWT no middleware (nao apenas presenca do cookie). | 2-4 |
| 12 | **UX-005** | Acessibilidade quick wins: skip nav, `<div onClick>` → `<button>`, aria-labels. | 8 |

### Semana 4-6 — Seguranca de Dados (~60h)

| # | ID | Acao | Horas |
|---|-----|------|------:|
| 13 | **DB-002** | RLS real: role dedicada para app, policies baseadas em auth context. | 24-40 |
| 14 | **DB-003** | Isolamento multi-tenant por comarca_id via RLS. | 8-12 |
| 15 | **DB-001** | Consolidar migrations em Drizzle como single source of truth. | 16-24 |

### Semana 7-10 — Qualidade de Codigo (~80h)

| # | ID | Acao | Horas |
|---|-----|------|------:|
| 16 | **UX-002** | Adotar react-hook-form + Zod client-side. Iniciar pelos CRUDs core. | 40-60 |
| 17 | **UX-004 + UX-013** | Consolidar componentes duplicados + setup Storybook. | 32-48 |
| 18 | **SYS-005** | Eliminar `any` dos tRPC routers (incremental). | 16-24 |

### Semana 11-14 — Performance e Polish (~60h)

| # | ID | Acao | Horas |
|---|-----|------|------:|
| 19 | **UX-003** | Decompor componentes monoliticos (PdfViewer, Sidebar, Cockpit). | 32-48 |
| 20 | **UX-009** | Print styles para documentos juridicos (oficios, fichas, pareceres). | 20-28 |
| 21 | **PY-001** | Testes do enrichment engine — endpoints criticos. | 16-24 |
| 22 | **DB-005 + DB-006** | Triggers updated_at + padronizar TIMESTAMPTZ. | 12-18 |

### Semana 15-17 — Otimizacao (backlog, ~50h)

| # | ID | Acao | Horas |
|---|-----|------|------:|
| 23 | **SYS-002** | Suite de testes vitest — areas criticas (auth, demandas, processos). | 40-60 |
| 24 | **UX-006** | Loading states nas rotas restantes. | 12-16 |
| 25 | Demais | DB-007, DB-012, SYS-007/008, PY-002/003, INFRA-001/003/004, etc. | 40-60 |

---

## Mapa de Dependencias

```
                    ┌── DB-014 (senha no repo) ──── INDEPENDENTE, SEMANA 1
                    │
SYS-001 ──────────►SYS-003 ──────────► SYS-002 (testes)
(ignoreBuildErrors)  (CI/CD)                │
        │                                    │
        └──► SYS-005 (remover any)           │
        │                                    │
        └──► UX-002 (Zod client-side)        │
                                             │
DB-015 ──► DB-002 ──► DB-003                 │
(enable RLS) (RLS real) (multi-tenant)       │
                                             │
DB-001 ──► DB-006 (timestamps)               │
(migrations)  DB-011 (enums)                 │
              DB-012 (consolidar tabelas)     │
                                             │
UX-013 ──► UX-004 (Storybook previne duplicacao futura)
```

**Caminho critico:** DB-014 + SYS-001 (Semana 1) → SYS-003 (Semana 2) → DB-002/003 (Semana 4-6)

---

## Riscos Cruzados

| # | Risco | Areas | Mitigacao |
|---|-------|-------|----------|
| RC-001 | **Cadeia de seguranca**: senha no repo + RLS no-op + CORS * + webhook fail-open | DB, API, Webhooks | DB-014 imediato, depois bloco de seguranca (Sem 2-6) |
| RC-002 | **Cadeia de integridade**: zero testes + zero CI + ignoreBuildErrors + dual migrations | Sistema, DB | SYS-001 → SYS-003 → SYS-002 sequencial |
| RC-003 | **Cadeia UX**: zero error boundaries + zero validacao + toast-only | Frontend | UX-001 quick win, UX-002 paralelo com API |
| RC-004 | **Risco LGPD**: PII sem RLS + sem audit DELETE + sem backup off-site + senha exposta | Compliance | Tratar como bloco unico nas Semanas 1-6 |
| RC-005 | **Fragilidade AI**: CORS * + API key unica + sem circuit breaker + cross-region | Python | SYS-006 imediato, observability gradual |
| RC-006 | **Risco de regressao**: 340K LOC sem testes + sem Storybook = refatoracao perigosa | Todo | Testes ANTES de refatorar cada area |

---

## Metricas de Progresso

| Metrica | Atual | 1 Mes | 3 Meses | 6 Meses |
|---------|-------|-------|---------|---------|
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

---

## Estrategia de Testes

| Fase | Testes Requeridos | Framework |
|------|-------------------|-----------|
| SYS-001 | Fix de TODOS os erros de tipo | `tsc --noEmit` |
| SYS-003 | Pipeline: lint + typecheck + build | GitHub Actions |
| DB-002/003 | Permissao: usuario A nao acessa comarca B | pytest + SQL |
| UX-001 | Error boundary captura throw | vitest + RTL |
| UX-002 | Inputs invalidos mostram erro inline | vitest + RTL |
| Webhooks | Request sem secret retorna 401/403 | vitest |
| Enrichment | Cada endpoint retorna schema esperado | pytest + httpx |

**Ferramentas:** vitest (TS), React Testing Library (componentes), pytest + httpx (Python), Playwright (E2E), GitHub Actions (CI)

---

## Apendice: Documentos de Referencia

| Fase | Documento | Localizacao |
|------|-----------|-------------|
| 1 | System Architecture Report | `docs/system-architecture.md` |
| 2 | Database Audit | `docs/discovery/db-audit.md` |
| 3 | Frontend/UX Spec | `docs/discovery/frontend-spec.md` |
| 4 | Technical Debt DRAFT | `docs/discovery/technical-debt-DRAFT.md` |
| 5 | DB Specialist Review | `docs/discovery/db-specialist-review.md` |
| 6 | UX Specialist Review | `docs/discovery/ux-specialist-review.md` |
| 7 | QA Review | `docs/discovery/qa-review.md` |
| 8 | **Este documento** | `docs/discovery/technical-debt-assessment.md` |

---

*Assessment final consolidado — Brownfield Discovery Phase 8*
*Proximo: Phase 9 (@analyst — Relatorio Executivo) + Phase 10 (@pm — Epic + Stories)*
