# Technical Debt Assessment — DRAFT

> **Brownfield Discovery Phase 4** | Consolidado por @architect (Aria)
> **Data:** 2026-03-25
> **Projeto:** OMBUDS — Sistema de Gestao de Casos para Defensoria Publica
> **Stack:** Next.js 15 + tRPC + Drizzle + Supabase + FastAPI (Python)
> **Escala:** 340K LOC TypeScript, 19K LOC Python, 134 paginas, 120+ tabelas

---

## Executive Summary

O OMBUDS e um sistema de grande porte, rico em funcionalidades, construido por um desenvolvedor solo. A velocidade de entrega foi priorizada sobre qualidade e seguranca, resultando em debitos tecnicos significativos que precisam ser tratados antes de escalar o sistema.

**Totais identificados:** 35 debitos tecnicos
- **CRITICAL:** 7
- **HIGH:** 11
- **MEDIUM:** 12
- **LOW:** 5

---

## 1. Debitos de Sistema (Fonte: system-architecture.md)

### CRITICAL

| ID | Debito | Impacto | Esforco Est. | Localizacao |
|----|--------|---------|-------------|-------------|
| SYS-001 | **`ignoreBuildErrors: true`** — Type safety completamente desativada no build | Erros de tipo em producao, bugs silenciosos | ALTO | `next.config.js:33` |
| SYS-002 | **Zero testes automatizados** — 340K LOC sem nenhum teste | Impossivel garantir regressao, refatoracao perigosa | MUITO ALTO | Projeto inteiro |
| SYS-003 | **Sem CI/CD pipeline** — Push-to-deploy direto sem gates | Codigo quebrado pode ir para producao | MEDIO | `.github/` (ausente) |
| SYS-004 | **tRPC em Release Candidate** (`rc.608`) | Breaking changes possiveis a qualquer update | MEDIO | `package.json` |

### HIGH

| ID | Debito | Impacto | Esforco Est. | Localizacao |
|----|--------|---------|-------------|-------------|
| SYS-005 | **186 usos de `any`** nos tRPC routers | Type safety derrotada na camada de API | MEDIO | `src/lib/trpc/routers/` |
| SYS-006 | **CORS `allow_origins=["*"]`** no enrichment engine | Qualquer origem pode chamar a API | BAIXO | `enrichment-engine/main.py:91` |
| SYS-007 | **Rate limiting in-memory** — resetado a cada cold start | Efetivamente inutil no modelo serverless da Vercel | MEDIO | `src/lib/security.ts` |
| SYS-008 | **Cache de sessao in-memory** — incompativel com serverless | Cache nao compartilhado entre instancias | MEDIO | `src/lib/auth/session.ts` |
| SYS-009 | **Middleware so checa presenca do cookie** — nao valida JWT | Token expirado/adulterado passa pelo middleware | BAIXO | `src/middleware.ts` |
| SYS-010 | **`--legacy-peer-deps` necessario** — conflitos de dependencia mascarados | Incompatibilidades ocultas | BAIXO | `vercel.json` |
| SYS-011 | **62 tRPC routers carregados em toda request** — sem lazy loading | Cold start lento em serverless | MEDIO | `src/lib/trpc/routers/index.ts` |

### MEDIUM

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| SYS-012 | Routers duplicados (`cobertura` + `coberturas`, `parecer` + `pareceres`) | Confusao, duplicacao de codigo | BAIXO |
| SYS-013 | `pje-parser.ts` com 1.586 linhas — monolitico | Dificil de manter e testar | MEDIO |
| SYS-014 | Imagens grandes no repo (~36MB de logos) | Repositorio inchado | BAIXO |
| SYS-015 | Pool de conexao fixo em 5 | Insuficiente sob carga | BAIXO |
| SYS-016 | `robots: index: true` — ferramenta interna indexavel | Exposicao desnecessaria | BAIXO |
| SYS-017 | 102 TODO/FIXME/HACK markers em 48 arquivos | Debito reconhecido mas nao tratado | MEDIO |
| SYS-018 | `googleapis` package (~50MB) — bundle enorme | Cold starts lentos | MEDIO |

---

## 2. Debitos de Database (Fonte: db-audit.md)

### CRITICAL

| ID | Debito | Impacto | Esforco Est. | Localizacao |
|----|--------|---------|-------------|-------------|
| DB-001 | **Sistema dual de migrations** (Supabase SQL + Drizzle) — 28 tabelas so existem no Drizzle | Schema drift, tabelas podem nao existir em producao | ALTO | `supabase/migrations/` + `drizzle/` |
| DB-002 | **RLS e efetivamente no-op** — app conecta como `postgres` role que bypassa RLS. Policies sao `USING (true)` | Exposicao total do banco se credenciais vazarem | ALTO | Schema inteiro |
| DB-003 | **Sem isolamento multi-tenant** — `comarca_id` existe mas nenhuma RLS enforcea | Dados de uma comarca acessiveis por outra | ALTO | Tabelas core |

### HIGH

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| DB-004 | **Credenciais Supabase hardcoded** como fallback no client | Impossivel rotacionar sem deploy | BAIXO |
| DB-005 | **Missing `updated_at` triggers** na maioria das tabelas | Timestamps inconsistentes se dados modificados fora do app | MEDIO |
| DB-006 | **Tipos de timestamp inconsistentes** — mix de TIMESTAMP e TIMESTAMPTZ | Bugs de timezone | MEDIO |
| DB-007 | **Sem audit trail em DELETE** — soft delete sem log de quem deletou | Gap de compliance LGPD | MEDIO |
| DB-008 | **Tabela `workspaces` legada** ainda referenciada por FKs | Codigo morto, confusao | BAIXO |

### MEDIUM

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| DB-009 | **Missing composite indexes** para queries frequentes (defensor_id + deleted_at + status) | Degradacao de performance com escala | BAIXO |
| DB-010 | **Missing partial indexes** em `WHERE deleted_at IS NULL` | Full table scans incluem tombstoned rows | BAIXO |
| DB-011 | **VARCHAR para status** em varias tabelas ao inves de ENUMs | Sem validacao no banco, risco de typo | BAIXO |
| DB-012 | **Tabelas de documentos/templates duplicadas** — 6 tabelas com overlap | Dados espalhados, sem fonte canonica | MEDIO |
| DB-013 | **SERIAL (int4) PKs** — limite de ~2 bilhoes | Nao urgente, mas limita escalabilidade futura | BAIXO |

> **PENDENTE: Revisao do @data-engineer**
>
> Perguntas para Dara:
> 1. Das 28 tabelas Drizzle-only, quais realmente existem em producao (via `drizzle push`)? Ou o schema Drizzle e aspiracional?
> 2. A conexao via `DATABASE_URL` usa o connection pooler do Supabase (PgBouncer) ou acesso direto?
> 3. Qual o volume atual de dados nas tabelas core (assistidos, processos, demandas)? Isso informa a urgencia dos indexes.
> 4. Ha algum processo de backup automatizado?

---

## 3. Debitos de Frontend/UX (Fonte: frontend-spec.md)

### CRITICAL

| ID | Debito | Impacto | Esforco Est. | Localizacao |
|----|--------|---------|-------------|-------------|
| UX-001 | **Zero error boundaries** — 0 `error.tsx` em 134 rotas | App crasha silenciosamente sem feedback ao usuario | BAIXO | `src/app/` |

### HIGH

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| UX-002 | **Sem validacao de formularios** — useState/FormData raw, sem react-hook-form | Dados invalidos enviados, UX ruim | ALTO |
| UX-003 | **Componentes monoliticos** — 10+ arquivos com 1000+ linhas (PdfViewerModal: 3.671, admin-sidebar: 2.026) | Manutencao dificil, render performance | ALTO |
| UX-004 | **Componentes duplicados** — 5 stats cards, 4 page headers, 2 empty states | Inconsistencia visual, manutencao multiplicada | MEDIO |
| UX-005 | **Acessibilidade fraca** — 33 ARIA attrs em 363 componentes, sem skip nav, `<div onClick>` | Exclusao de usuarios com deficiencia, gap legal | MEDIO |

### MEDIUM

| ID | Debito | Impacto | Esforco Est. |
|----|--------|---------|-------------|
| UX-006 | **117 de 125 rotas admin sem `loading.tsx`** | Tela branca durante carregamento | MEDIO |
| UX-007 | **Toast como unico feedback de erro** — 944 usos, sem inline errors | Erros de formulario nao aparecem no campo | MEDIO |
| UX-008 | **Mix de tokens e cores raw** (emerald-600, zinc-900) | Risco se cor da marca mudar | BAIXO |
| UX-009 | **Sem print styles** — apenas 1 arquivo com `@media print` | Impressao de documentos juridicos comprometida | BAIXO |
| UX-010 | **Dois sistemas de layout** — CSS-class + component-based | Modelo mental dividido | BAIXO |

> **PENDENTE: Revisao do @ux-design-expert**
>
> Perguntas para Uma:
> 1. O design system v10.0 tem documentacao formal (Storybook, Figma, ou similar)?
> 2. Qual o impacto real de acessibilidade no contexto de defensores publicos como usuarios primarios?
> 3. Os componentes duplicados (5 stats cards) sao variantes intencionais ou evolucao organica?
> 4. Ha planos de suporte a impressao para pecas processuais e oficios?

---

## 4. Debitos Cross-Cutting

| ID | Debito | Areas | Impacto |
|----|--------|-------|---------|
| CROSS-001 | **Credenciais hardcoded** (Supabase anon key no client + DB_URL bypassa RLS) | Sistema + DB | Cadeia de seguranca comprometida |
| CROSS-002 | **Zero testes + zero CI + ignoreBuildErrors** | Sistema + DB + UX | Trifeta de risco: qualquer mudanca pode quebrar producao |
| CROSS-003 | **Dados sensiveis (PII, CPF, historico criminal) sem protecao adequada** | DB + Sistema | Risco LGPD grave |

---

## 5. Matriz Preliminar de Priorizacao

### Tier 1 — Seguranca & Estabilidade (URGENTE)

| Prioridade | ID | Debito | Justificativa |
|-----------|-----|--------|---------------|
| P1 | SYS-001 | Remover `ignoreBuildErrors` | Fundacao: sem type safety, tudo mais e construido em areia |
| P2 | DB-002 + DB-003 | Implementar RLS real + isolamento multi-tenant | Dados sensiveis (LGPD) sem protecao |
| P3 | DB-004 + SYS-009 | Remover credenciais hardcoded + validar JWT no middleware | Vetor de ataque direto |
| P4 | SYS-006 | Restringir CORS do enrichment engine | Acesso aberto a API de IA |

### Tier 2 — Fundacao de Qualidade (1-2 semanas)

| Prioridade | ID | Debito | Justificativa |
|-----------|-----|--------|---------------|
| P5 | SYS-003 | Configurar CI/CD (GitHub Actions: lint + typecheck + build) | Gate minimo antes de deploy |
| P6 | UX-001 | Adicionar error boundaries | App nao pode crashar silenciosamente |
| P7 | DB-001 | Consolidar sistema de migrations | Schema drift e bomba-relogio |
| P8 | UX-002 | Adotar react-hook-form + Zod client-side | Validacao de dados na entrada |

### Tier 3 — Performance & Manutencao (2-4 semanas)

| Prioridade | ID | Debito | Justificativa |
|-----------|-----|--------|---------------|
| P9 | UX-003 | Decompor componentes monoliticos | Manutencao e performance |
| P10 | UX-004 | Consolidar componentes duplicados | Consistencia visual |
| P11 | SYS-005 | Eliminar `any` dos tRPC routers | Type safety end-to-end |
| P12 | DB-009 + DB-010 | Adicionar composite + partial indexes | Performance com escala |
| P13 | SYS-007 + SYS-008 | Migrar rate limiting e cache para Redis/Upstash | Serverless-compatible |

### Tier 4 — Otimizacao (4-6 semanas)

| Prioridade | ID | Debito | Justificativa |
|-----------|-----|--------|---------------|
| P14 | SYS-002 | Iniciar suite de testes (areas criticas primeiro) | Cobertura gradual |
| P15 | DB-005 + DB-006 | Triggers de updated_at + padronizar TIMESTAMPTZ | Integridade temporal |
| P16 | UX-005 | Melhorar acessibilidade | Compliance e inclusao |
| P17 | UX-006 | Adicionar loading.tsx nas rotas restantes | UX consistente |
| P18 | DB-012 | Consolidar tabelas de documentos/templates | Simplificar modelo de dados |

---

## 6. Dependencias entre Debitos

```
SYS-001 (ignoreBuildErrors) ──► SYS-005 (remover any) ──► SYS-002 (testes)
                                                              │
DB-001 (migrations) ──► DB-002 (RLS) ──► DB-003 (multi-tenant) │
                                                              │
UX-002 (forms) ◄── precisa de ── Zod schemas (ja existem)    │
                                                              │
SYS-003 (CI/CD) ◄── depende de ── SYS-001 (build funcional) ▼
                                                    Testes automatizados
```

**Caminho critico:** SYS-001 → SYS-003 → SYS-002 (sem build funcional, nao ha CI, sem CI nao ha testes)

---

## 7. Forcas Identificadas

Antes de focar apenas nos debitos, e importante reconhecer as forcas do sistema:

1. **Modelagem de dominio rica** — 120+ tabelas cobrindo todo o fluxo da defensoria
2. **API tipada end-to-end** via tRPC (quando o type safety funcionar)
3. **Design system maduro** v10.0 com 3 temas e tokens semanticos
4. **Multi-tenancy pensado** — comarca/defensor scoping ja implementado na camada de aplicacao
5. **Integracao AI profunda** — document parsing, transcricao, analise semantica, diarizacao
6. **PWA com offline** — raro em apps juridicos
7. **Escala impressionante** — 134 paginas cobrindo Juri, VVD, Radar, Drive, WhatsApp, Execucao Penal
8. **Arquitetura de 2 camadas** — separacao clara entre Next.js e Python AI engine

---

## Proximo Passo

Este DRAFT segue para revisao dos especialistas:
- **Fase 5:** @data-engineer valida e ajusta debitos de DB
- **Fase 6:** @ux-design-expert valida e ajusta debitos de UX
- **Fase 7:** @qa realiza QA Review com decisao APPROVED / NEEDS WORK

---

*DRAFT v1.0 — Pendente revisao de especialistas*
