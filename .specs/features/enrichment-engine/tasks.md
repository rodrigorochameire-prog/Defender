# Tasks: Enrichment Engine - Sistema Nervoso Defensivo

## Referencia: docs/plans/2026-02-20-enrichment-engine-tdd.md

---

## Fase 1: Infra & Setup

| ID | Tarefa | Estimativa | Dependencias | Status |
|----|--------|------------|--------------|--------|
| T-01 | Criar projeto Python (estrutura de pastas, main.py, config.py) | 1h | - | ⬜ |
| T-02 | Criar Dockerfile com deps sistema (tesseract, poppler) | 30min | T-01 | ⬜ |
| T-03 | Criar requirements.txt (fastapi, docling, google-generativeai, supabase) | 15min | T-01 | ⬜ |
| T-04 | Implementar auth.py (middleware API Key) | 30min | T-01 | ⬜ |
| T-05 | Implementar models/schemas.py (Pydantic Input/Output) | 1h | T-01 | ⬜ |
| T-06 | Implementar health.py (GET /health com status Docling) | 30min | T-01 | ⬜ |
| T-07 | Criar railway.json + configurar deploy | 30min | T-02 | ⬜ |
| T-08 | Deploy inicial no Railway (health check funcional) | 30min | T-07 | ⬜ |

## Fase 2: Docling Service

| ID | Tarefa | Estimativa | Dependencias | Status |
|----|--------|------------|--------------|--------|
| T-09 | Implementar docling_service.py (download + parse -> Markdown) | 2h | T-01 | ⬜ |
| T-10 | Implementar document_classifier.py (prompt Gemini para classificar tipo) | 1h | T-09 | ⬜ |
| T-11 | Testar Docling com PDFs reais do OMBUDS (sentenca, laudo, certidao) | 1h | T-09 | ⬜ |

## Fase 3: Gemini Service + Prompts

| ID | Tarefa | Estimativa | Dependencias | Status |
|----|--------|------------|--------------|--------|
| T-12 | Implementar gemini_service.py (wrapper + retry + rate limiting) | 1h | T-01 | ⬜ |
| T-13 | Implementar prompts/base.py (instrucoes gerais, formato JSON) | 30min | T-12 | ⬜ |
| T-14 | Implementar prompts/pje_extraction.py (intimacoes PJe) | 1.5h | T-13 | ⬜ |
| T-15 | Implementar prompts/document_sentenca.py | 1h | T-13 | ⬜ |
| T-16 | Implementar prompts/document_decisao.py | 30min | T-15 | ⬜ |
| T-17 | Implementar prompts/document_laudo.py | 30min | T-15 | ⬜ |
| T-18 | Implementar prompts/document_certidao.py | 30min | T-15 | ⬜ |
| T-19 | Implementar prompts/transcript_analysis.py | 1h | T-13 | ⬜ |
| T-20 | Implementar prompts/audiencia_parsing.py | 30min | T-13 | ⬜ |
| T-21 | Implementar prompts/whatsapp_triage.py | 30min | T-13 | ⬜ |

## Fase 4: Supabase Service + Migracao

| ID | Tarefa | Estimativa | Dependencias | Status |
|----|--------|------------|--------------|--------|
| T-22 | Implementar supabase_service.py (CRUD enriquecimentos) | 2h | T-01 | ⬜ |
| T-23 | Adicionar colunas enrichmentStatus/Data/enrichedAt no Drizzle schema | 30min | - | ⬜ |
| T-24 | Gerar e aplicar migracao (npm run db:generate + db:push) | 30min | T-23 | ⬜ |

## Fase 5: Endpoints (Fluxos Completos)

| ID | Tarefa | Estimativa | Dependencias | Status |
|----|--------|------------|--------------|--------|
| T-25 | Implementar enrichment_orchestrator.py (Docling -> Gemini -> Supabase) | 1.5h | T-09,T-12,T-22 | ⬜ |
| T-26 | Implementar routers/document.py (POST /enrich/document) | 1h | T-25 | ⬜ |
| T-27 | Implementar routers/pje.py (POST /enrich/pje-text) | 1h | T-25 | ⬜ |
| T-28 | Implementar routers/transcript.py (POST /enrich/transcript) | 30min | T-25 | ⬜ |
| T-29 | Implementar routers/audiencia.py (POST /enrich/audiencia) | 30min | T-25 | ⬜ |
| T-30 | Implementar routers/whatsapp.py (POST /enrich/whatsapp) | 30min | T-25 | ⬜ |

## Fase 6: Integracao Next.js

| ID | Tarefa | Estimativa | Dependencias | Status |
|----|--------|------------|--------------|--------|
| T-31 | Criar lib/enrichment-client.ts (client HTTP para Railway) | 1h | T-26 | ⬜ |
| T-32 | Integrar no PJe Import Modal (chamar /enrich/pje-text) | 1h | T-31 | ⬜ |
| T-33 | Integrar no Drive Webhook (chamar /enrich/document) | 1h | T-31 | ⬜ |
| T-34 | Integrar no Atendimento (chamar /enrich/transcript) | 30min | T-31 | ⬜ |
| T-35 | Integrar no WhatsApp webhook (chamar /enrich/whatsapp) | 30min | T-31 | ⬜ |

## Fase 7: Testes

| ID | Tarefa | Estimativa | Dependencias | Status |
|----|--------|------------|--------------|--------|
| T-36 | Criar conftest.py (fixtures mock Gemini, mock Supabase) | 1h | T-25 | ⬜ |
| T-37 | Testes unitarios: document + pje + transcript | 2h | T-36 | ⬜ |
| T-38 | Testes integracao: fluxo completo com dados reais | 2h | T-37 | ⬜ |

## Fase 8: Deploy Producao

| ID | Tarefa | Estimativa | Dependencias | Status |
|----|--------|------------|--------------|--------|
| T-39 | Deploy staging Railway + testar com dados reais | 1h | T-38 | ⬜ |
| T-40 | Deploy producao + monitoramento | 1h | T-39 | ⬜ |

---

## Legendas
- ⬜ Pendente
- 🔄 Em progresso
- ✅ Completo
- ❌ Bloqueado
- ⏸️ Pausado

## Notas de Implementacao

### T-01: Estrutura do Projeto
O projeto sera criado em `/enrichment-engine/` na raiz do monorepo.
Estrutura conforme TDD: main.py, config.py, auth.py, routers/, services/, prompts/, models/, tests/

### T-04: Auth Middleware
Header: `X-API-Key`. Env var: `ENRICHMENT_API_KEY`. Excecao: `/health` nao requer auth.

### T-09: Docling Service
Usar `docling` lib diretamente (nao docling-serve). Mais simples, menos overhead.
Suportar: PDF, DOCX, imagens. Output: Markdown com tabelas.

### T-12: Gemini Service
Usar `google-generativeai` com `gemini-1.5-flash`. Retry com backoff exponencial.
Rate limit: 15 req/min (free tier) ou 60 req/min (pay-as-you-go).
Response format: JSON via `response_mime_type="application/json"`.

### T-22: Supabase Service
Usar `supabase-py` com `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS).
Metodos: upsert_enrichment, create_case_facts, create_case_personas, create_anotacao.

### T-23: Migracao DB
Adicionar em tabelas existentes:
- documentos: enrichmentStatus, enrichmentData (jsonb), enrichedAt
- atendimentos: enrichmentStatus, enrichmentData (jsonb), enrichedAt
- demandas: enrichmentData (jsonb)
Todas colunas nullable — zero impacto em dados existentes.
