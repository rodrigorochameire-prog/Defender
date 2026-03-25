# QA Review — Technical Debt Assessment

> **Brownfield Discovery Phase 7** | @qa (Quinn)
> **Data:** 2026-03-25
> **Projeto:** OMBUDS — Sistema de Gestao de Casos para Defensoria Publica
> **Documentos revisados:**
> - `technical-debt-DRAFT.md` (Phase 4 — @architect)
> - `db-specialist-review.md` (Phase 5 — @data-engineer)
> - `ux-specialist-review.md` (Phase 6 — @ux-design-expert)
> - `db-audit.md` (Phase 2 — @data-engineer)
> - `frontend-spec.md` (Phase 3 — @ux-design-expert)
> - `system-architecture.md` (Phase 1 — @architect)

---

## Gate Status: APPROVED

O assessment tecnico esta completo, com cobertura adequada das areas criticas. Ha gaps identificados abaixo que devem ser incorporados na versao final (Phase 8), mas nenhum gap invalida os achados existentes ou altera a priorizacao de forma fundamental. Os tres especialistas realizaram trabalho rigoroso, com evidencias concretas e validacao direta no banco/codigo.

---

## 1. Gaps Identificados

### 1.1 Python Backend (enrichment-engine) — NAO COBERTO

Nenhum dos tres especialistas auditou a qualidade do codigo Python. O enrichment engine tem ~19K LOC, 25 routers, 20+ services, e apenas 4 testes reais (test_analysis, test_auth, test_health, test_transcription). Gaps especificos:

| Gap | Detalhe | Severidade Estimada |
|-----|---------|---------------------|
| **Cobertura de testes do Python** | 4 arquivos de teste para 55+ arquivos de servico/router. Cobertura estimada < 5%. | HIGH |
| **Error handling do Python** | 292 blocos try/except em 20 arquivos de servico — volume alto sugere pattern de catch-all silencioso sem propagacao adequada. | MEDIUM |
| **Logging excessivo** | 655 ocorrencias de logger/print em 55 arquivos Python. Sem structured logging padronizado. | MEDIUM |
| **Dependencia de scraping** | SOLAR, SIGAD, PJe, Instagram — scrapers sao frageis por natureza e sem monitoramento de quebra. | HIGH |
| **AI pipeline reliability** | Multiplos provedores (Gemini, Claude, Whisper) sem fallback chain documentada, sem circuit breaker, sem metricas de custo/latencia. | MEDIUM |
| **Railway deploy** | Enrichment engine roda em us-east4 enquanto o banco esta em sa-east-1 (Sao Paulo). Latencia cross-region para queries Python->Supabase. | MEDIUM |

**Recomendacao:** Incluir secao "Python Backend Debts" no assessment final (Phase 8). Sugerir: PY-001 (testes), PY-002 (error handling), PY-003 (structured logging), PY-004 (scraper resilience), PY-005 (AI pipeline observability), PY-006 (latencia cross-region).

### 1.2 Inngest Job Reliability — NAO COBERTO

O sistema usa Inngest para jobs assincronos (WhatsApp send, notificacao de prazos, Google Drive sync). Verificado em `src/lib/inngest/functions.ts` — funcoes configuradas com `retries: 5` mas sem:

- Dead letter queue / alerta de falha permanente
- Monitoramento de jobs stuck (Railway tem cron de 10min para recovery, mas o Inngest no Vercel nao)
- Idempotencia garantida (retries podem causar efeitos duplicados em WhatsApp send)
- Timeout configurado nos steps

**Severidade:** MEDIUM — jobs silenciosamente falhando podem causar mensagens nao enviadas e syncs incompletos.

### 1.3 Webhook Security — PARCIALMENTE COBERTO

A auditoria de sistema mencionou webhooks mas nao detalhou seguranca. Verificacao direta revelou:

| Webhook | Autenticacao | Status |
|---------|-------------|--------|
| `/api/webhooks/evolution` | EVOLUTION_WEBHOOK_SECRET (header check) | OK |
| `/api/webhooks/plaud` | HMAC-SHA256 signature verification | BOM |
| `/api/webhooks/n8n` | N8N_WEBHOOK_SECRET (com warn se ausente) | OK, mas fail-open se env nao configurada |
| `/api/webhooks/n8n/sheets` | N8N_WEBHOOK_SECRET | OK |
| `/api/webhooks/openclaw` | OPENCLAW_WEBHOOK_SECRET | OK |
| `/api/webhooks/drive` | DRIVE_WEBHOOK_SECRET (com fallback vazio `""`) | FRACO — fallback vazio permite bypass |
| `/api/webhooks/whatsapp` | Meta verify_token via DB config | OK |

**Gap critico:** `/api/webhooks/drive` usa `process.env.DRIVE_WEBHOOK_SECRET || ""` — se a env var nao estiver configurada, a comparacao passa com string vazia contra um header vazio, efetivamente desabilitando a autenticacao. Mesmo padrao de fail-open em N8N.

**Severidade:** HIGH — webhooks sao endpoints publicos; autenticacao fraca permite injecao de eventos falsos.

### 1.4 PWA/Offline Sync — NAO COBERTO

O sistema tem um modulo offline completo (`src/lib/offline/`) com Dexie (IndexedDB), sync queue processor, e conflict detection. Nenhum especialista avaliou:

- Integridade da sync queue (MAX_ATTEMPTS = 3, mas sem notificacao ao usuario de falha permanente)
- Conflitos de merge (optimistic locking via `expectedUpdatedAt` existe mas nao validado)
- Tamanho do IndexedDB sem politica de eviction
- Service worker (Serwist) sem testes de cenarios offline->online

**Severidade:** MEDIUM — feature critica para defensores em campo (presidios, delegacias sem wifi) sem validacao de robustez.

### 1.5 Structured Logging / Observability — PARCIALMENTE COBERTO

`system-architecture.md` lista Axiom como ferramenta de observability, mas o DRAFT nao avaliou:

- 226 `console.log/error/warn` no frontend sem structured logging
- 99 `console.log` no google-drive.ts (mencionado como HIGH debt, mas sem ID dedicado)
- 655 logger/print calls no Python sem padrao unificado
- Sem correlation IDs entre Next.js e enrichment engine
- Sem metricas de negocio (taxa de extracao, acuracia de matching, latencia de scraping)

**Severidade:** MEDIUM — dificulta debugging e monitoramento de saude do sistema em producao.

---

## 2. Riscos Cruzados

| # | Risco | Areas Afetadas | Mitigacao Proposta |
|---|-------|---------------|-------------------|
| RC-001 | **Cadeia de seguranca comprometida**: senha do banco em plaintext (DB-014) + credenciais hardcoded (DB-004/SYS-009) + CORS `*` (SYS-006) + RLS no-op (DB-002) + webhooks fail-open | DB, Sistema, Webhooks | Resolver DB-014 IMEDIATO. Depois DB-004 + SYS-006 + webhook hardening na mesma sprint de seguranca. RLS (DB-002) como projeto de 2-3 semanas subsequente. |
| RC-002 | **Cadeia de integridade de dados**: zero testes (SYS-002) + zero CI (SYS-003) + ignoreBuildErrors (SYS-001) + dual migrations (DB-001) + offline sync nao testada | Sistema, DB, PWA | SYS-001 primeiro (fundacao). SYS-003 imediatamente apos (gate). SYS-002 incremental comecando por areas criticas. DB-001 consolida migrations. |
| RC-003 | **Cadeia de experiencia do usuario**: zero error boundaries (UX-001) + zero validacao de forms (UX-002) + toast-only errors (UX-007) + 117 rotas sem loading (UX-006) | Frontend, UX | UX-001 (error boundaries, 8-12h) como quick win. UX-002 (forms) em paralelo com API work. UX-007 resolvido parcialmente por UX-002. |
| RC-004 | **Risco LGPD acumulado**: dados sensiveis (CPF, historico criminal) + sem RLS real (DB-002) + sem audit trail de DELETE (DB-007) + sem backup off-site (DB-020) + senha no repo (DB-014) | DB, Compliance, Sistema | Tratar como bloco unico de compliance. DB-014 + DB-020 imediatos. DB-002 + DB-007 na sprint de seguranca. Documentar postura LGPD pos-resolucao. |
| RC-005 | **Fragilidade da pipeline AI**: CORS `*` no enrichment (SYS-006) + API key unica compartilhada + sem circuit breaker + scraping sem monitoramento + cross-region latency | Python Backend, Sistema | Restringir CORS (SYS-006). Implementar health check e metricas basicas. Considerar migrar Railway para sa-east-1. |
| RC-006 | **Risco de regressao em refatoracao**: 340K LOC sem testes + 186 `any` + componentes monoliticos (3.6K linhas) + sem Storybook = qualquer refatoracao pode quebrar silenciosamente | Sistema, Frontend | Exigir testes para cada area ANTES de refatorar. Storybook como pre-requisito para consolidacao de componentes. |

---

## 3. Dependencias Validadas

### 3.1 Mapa do DRAFT (Validacao)

O DRAFT propoe:

```
SYS-001 (ignoreBuildErrors) -> SYS-005 (remover any) -> SYS-002 (testes)
DB-001 (migrations) -> DB-002 (RLS) -> DB-003 (multi-tenant)
SYS-003 (CI/CD) <- depende de <- SYS-001 (build funcional)
```

**Validacao:** CORRETO, com ajustes:

1. **SYS-001 -> SYS-003**: Confirmado. Sem build funcional, CI nao tem o que executar.
2. **SYS-001 -> SYS-005**: Confirmado, mas SYS-005 (remover `any`) pode ser feito INCREMENTALMENTE mesmo antes de SYS-001 estar 100% completo.
3. **DB-001 -> DB-002**: Parcialmente correto. DB-002 (RLS) nao depende tecnicamente de DB-001 (consolidar migrations). Porem, DB-015 (habilitar RLS nas 43 tabelas) e pre-requisito REAL de DB-002, e DB-015 e mais facil de executar com um sistema de migration unificado.
4. **DB-002 -> DB-003**: Confirmado. Multi-tenant RLS requer RLS funcional primeiro.

### 3.2 Dependencias Adicionadas pelo @data-engineer

```
DB-014 (senha no repo) -> INDEPENDENTE, resolver PRIMEIRO
DB-015 (enable RLS 43 tabs) -> DB-002 (policies) -> DB-003 (multi-tenant)
DB-011 (VARCHAR->ENUM) -> DB-001 (precisa migration system)
DB-012 (consolidar docs) -> DB-001 (precisa migration system)
```

**Validacao:** CORRETO. DB-014 e de fato o item mais urgente de todo o assessment, independente de qualquer outro. DB-015 como pre-requisito de DB-002 e um insight importante que nao estava no DRAFT.

### 3.3 Dependencias Adicionadas pelo @ux-design-expert

```
UX-002 (forms) -> UX-007 (hierarquia de erro) — parcialmente resolvido junto
UX-004 (consolidar duplicados) -> UX-013 (Storybook) — causa raiz
UX-005 (acessibilidade) -> UX-012 (focus management) — subconjunto
```

**Validacao:** CORRETO. A insight de que UX-013 (Storybook) e causa raiz de UX-004 (duplicacao) e valida e deve informar a priorizacao.

### 3.4 Dependencias Cross-Specialist Nao Mapeadas

| De | Para | Relacao |
|----|------|---------|
| SYS-001 (ignoreBuildErrors) | UX-002 (forms com Zod) | Zod schemas client-side so funcionam com type-checking ativo |
| SYS-003 (CI/CD) | DB-001 (migrations) | CI deveria incluir migration check/validation |
| UX-001 (error boundaries) | SYS-007 (rate limiting) | Rate limit errors precisam de UI feedback (error boundary + retry) |
| DB-014 (senha no repo) | SYS-003 (CI/CD) | CI precisa de secret scanning habilitado para prevenir recorrencia |

---

## 4. Blocker Interactions

Debitos que, se nao resolvidos, bloqueiam melhorias futuras:

| Blocker | O que bloqueia | Impacto |
|---------|---------------|---------|
| **SYS-001** (ignoreBuildErrors) | Qualquer refatoracao segura, CI/CD util, type-safety end-to-end, adocao de Zod client-side | TOTAL — e a fundacao de toda a cadeia de qualidade |
| **DB-014** (senha no repo) | Qualquer trabalho de seguranca — rotacionar credenciais e pre-requisito para RLS, audit trail, etc. | CRITICO — se a senha nao e rotacionada, toda melhoria de seguranca e cosmetica |
| **DB-001** (dual migrations) | Refatoracoes de schema (ENUMs, timestamps, consolidacao de tabelas), reproducibilidade de ambiente | ALTO — sem migration system confiavel, mudancas de schema sao arriscadas |
| **SYS-003** (CI/CD) | Qualquer teste automatizado em PR, quality gates, deploy seguro | ALTO — sem CI, testes escritos nao sao executados automaticamente |
| **UX-001** (error boundaries) | Deploy seguro de features novas — qualquer erro de render crasha a app inteira | ALTO — sem error boundaries, cada deploy e um risco para o usuario |
| **DB-002** (RLS no-op) | Multi-tenancy real (DB-003), compliance LGPD, adocao institucional | ALTO — sem RLS, o sistema nao pode ser oferecido a multiplas defensorias |

### Caminho Critico Revisado

```
DB-014 (senha) ─────────────────────────────────────────┐
                                                         │
SYS-001 (ignoreBuildErrors) ──► SYS-003 (CI/CD) ──┐    │
                                                    ├──► Seguranca completa
DB-015 (enable RLS) ──► DB-002 (RLS real) ──┐      │
                                             ├──► DB-003 (multi-tenant)
DB-001 (migrations) ────────────────────────┘      │
                                                    │
SYS-002 (testes) ◄── depende de ── SYS-003 (CI) ──┘
```

**Implicacao:** DB-014 e SYS-001 sao os dois items que devem ser resolvidos na SEMANA 1, em paralelo, pois desbloqueiam todos os outros.

---

## 5. Testes Requeridos

### 5.1 Estrategia de Testes Pos-Resolucao

| Fase de Resolucao | Testes Requeridos | Framework | Prioridade |
|-------------------|-------------------|-----------|------------|
| **SYS-001** (remover ignoreBuildErrors) | Fix de TODOS os erros de tipo que surgirem no build | `tsc --noEmit` | P1 — gate para CI |
| **SYS-003** (CI/CD) | Pipeline minium: `lint` + `typecheck` + `build` | GitHub Actions | P1 — gate para tudo mais |
| **DB-002/003** (RLS) | Testes de permissao: usuario A nao acessa dados de comarca B | pytest + SQL assertions | P2 — validacao de seguranca |
| **UX-001** (error boundaries) | Testes de render: simular throw em componente filho, verificar error boundary captura | vitest + React Testing Library | P2 |
| **UX-002** (forms) | Testes de validacao: inputs invalidos mostram erro inline, submit bloqueado | vitest + RTL | P3 |
| **DB-001** (migrations) | Teste de reproducibilidade: `drizzle push` de schema limpo gera banco identico ao de producao | Script de diff | P2 |
| **Enrichment Engine** | Testes de contrato: cada endpoint retorna schema esperado, erros sao propagados corretamente | pytest + httpx | P3 |
| **Webhooks** | Testes de autenticacao: request sem secret retorna 401/403, request com secret invalido retorna 401/403 | vitest | P2 |
| **Offline Sync** | Testes de integridade: criar items offline, simular reconexao, validar sync completa sem duplicatas | vitest + Dexie fake | P4 |

### 5.2 Cobertura Minima Recomendada

| Area | Meta Inicial (3 meses) | Meta Final (6 meses) |
|------|----------------------|---------------------|
| tRPC routers (criticos: assistidos, processos, demandas) | 40% | 70% |
| tRPC routers (demais) | 0% | 30% |
| Componentes criticos (forms, error boundaries) | 50% | 70% |
| RLS policies | 100% | 100% |
| Enrichment engine endpoints | 30% | 60% |
| Webhooks | 80% | 100% |
| Offline sync | 50% | 80% |
| E2E (fluxos criticos: login, criar processo, criar demanda) | 3 fluxos | 10 fluxos |

### 5.3 Ferramentas Recomendadas

| Ferramenta | Uso |
|-----------|-----|
| **vitest** | Unit/integration tests para Next.js (mais rapido que Jest com ESM) |
| **React Testing Library** | Testes de componente |
| **pytest + httpx** | Testes do enrichment engine (ja parcialmente configurado) |
| **Playwright** | E2E (ja esta no Python como dep — adicionar ao Next.js) |
| **GitHub Actions** | CI pipeline |

---

## 6. Metricas de Qualidade

### 6.1 Metricas de Progresso (Rastreamento Semanal)

| Metrica | Valor Atual | Meta 1 Mes | Meta 3 Meses | Meta 6 Meses |
|---------|------------|-----------|-------------|-------------|
| Debitos CRITICAL abertos | 12 (7 DRAFT + 5 specialist) | 4 | 0 | 0 |
| Debitos HIGH abertos | 11 (DRAFT + specialist) | 8 | 3 | 0 |
| `tsc --noEmit` erros | Desconhecido (ignoreBuildErrors) | 0 | 0 | 0 |
| Usos de `any` em tRPC routers | 186 | 120 | 40 | 0 |
| Cobertura de testes (TS) | 0% | 10% | 30% | 50% |
| Cobertura de testes (Python) | ~5% | 15% | 30% | 50% |
| Tabelas com RLS habilitado | ~87/130 | 130/130 | 130/130 | 130/130 |
| Tabelas com RLS policies reais | 5/130 | 20/130 | 80/130 | 130/130 |
| Error boundaries (`error.tsx`) | 0 | 5 | 10 | 15+ |
| Loading states (`loading.tsx`) | 8 | 20 | 50 | 80+ |
| CI pipeline status | Inexistente | lint+typecheck+build | + testes unitarios | + E2E + security scan |

### 6.2 Metricas de Saude (Monitoramento Continuo)

| Metrica | Como Medir | Alerta Se |
|---------|-----------|-----------|
| Build time | CI pipeline duration | > 5 min |
| Type errors | `tsc --noEmit` count | > 0 |
| Bundle size (client) | next build output | > 5MB first load JS |
| Inngest job failure rate | Inngest dashboard | > 5% em 24h |
| Webhook error rate | Axiom/logs | > 10% em 1h |
| Enrichment engine latency P95 | Axiom/logs | > 30s |
| Scraper success rate (SOLAR, PJe) | Custom metric | < 80% em 24h |
| Offline sync conflict rate | Custom metric | > 5% |
| Supabase DB size | Supabase dashboard | > 500MB (plano free) |

### 6.3 Metricas de Seguranca

| Metrica | Valor Atual | Meta |
|---------|------------|------|
| Secrets em plaintext no repo | 8+ arquivos | 0 |
| Tabelas sem RLS | 43 | 0 |
| Webhooks sem autenticacao | 1-2 (fail-open) | 0 |
| CORS permissivo (`*`) | 1 (enrichment) | 0 |
| Dependencias com vulnerabilidades conhecidas | Desconhecido | 0 critical, < 5 high |

---

## 7. Parecer Final

### Qualidade do Assessment

| Aspecto | Avaliacao | Notas |
|---------|-----------|-------|
| **Cobertura do DRAFT** | BOM | 35 debitos identificados, bem categorizados por severidade e area |
| **Revisao de DB (@data-engineer)** | EXCELENTE | Validou diretamente no banco, quantificou problemas (43 tabelas sem RLS, nao 28), adicionou 7 debitos criticos novos (DB-014 a DB-020), forneceu estimativas de horas realistas |
| **Revisao de UX (@ux-design-expert)** | EXCELENTE | Elevou severidades com justificativa legal (acessibilidade, impressao), diagnosticou causa raiz da duplicacao (evolucao organica), adicionou 5 debitos novos (UX-011 a UX-015), propostas de design concretas |
| **Dependencias mapeadas** | BOM | DRAFT mapeou dependencias principais. Especialistas adicionaram dependencias intra-area. Faltavam dependencias cross-area (adicionadas neste review). |
| **Priorizacao** | BOM | Tiers 1-4 do DRAFT estao corretos. Ajustes de severidade dos especialistas (UX-005 MEDIUM->HIGH, UX-009 LOW->MEDIUM-HIGH, DB-004 HIGH->CRITICAL) sao validos e devem ser incorporados. |

### Gaps que NAO Invalidam o Assessment

Os gaps identificados na Secao 1 (Python backend, Inngest, webhook security, PWA/offline, observability) sao REAIS, mas:

1. Nao alteram a priorizacao dos debitos existentes — DB-014, SYS-001, DB-002 continuam sendo os mais urgentes
2. Podem ser incorporados como secao adicional no assessment final (Phase 8) sem exigir re-revisao de especialistas
3. A maioria e de severidade MEDIUM, abaixo dos CRITICAL ja identificados

### Decisao

**APPROVED** — com as seguintes condicoes para Phase 8 (assessment final):

1. Incorporar os 6 gaps identificados neste review como nova secao "Debitos Adicionais (QA)"
2. Incorporar todas as elevacoes de severidade dos especialistas
3. Incorporar dependencias cross-specialist mapeadas na Secao 3.4
4. Incluir a estrategia de testes (Secao 5) e metricas (Secao 6) como apendices do assessment final
5. Ajustar a contagem final: DRAFT tinha 35 debitos -> especialistas adicionaram 12 (7 DB + 5 UX) -> QA adiciona ~6 (Python/Inngest/Webhooks/PWA/Observability) = **~53 debitos totais**

### Estimativa Consolidada de Esforco

| Area | Horas Min | Horas Max | Fonte |
|------|----------|----------|-------|
| Database (20 debitos) | 120h | 170h | @data-engineer |
| Frontend/UX (15 debitos) | 229h | 320h | @ux-design-expert |
| Sistema (18 debitos) | 80h | 120h | Estimativa DRAFT |
| Python Backend (6 debitos) | 40h | 60h | Estimativa QA |
| **TOTAL** | **~470h** | **~670h** | |

**Para 1 desenvolvedor solo:** 12-17 semanas de trabalho focado, priorizando Tier 1 (seguranca) e Tier 2 (fundacao) nas primeiras 4 semanas.

---

*QA Review concluido por @qa (Quinn) — Phase 7 Brownfield Discovery*
*Proximo: @architect (Aria) para Phase 8 — Assessment Final Consolidado*
