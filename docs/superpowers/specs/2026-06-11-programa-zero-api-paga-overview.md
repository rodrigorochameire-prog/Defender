# Programa "Zero API Paga" — OMBUDS 100% Daemon

**Data:** 2026-06-11
**Autor:** Rodrigo (DPE-BA) + Claude (Opus 4.8)
**Status:** Aprovado o rumo; Fase 1 em implementação (branch `feat/migracao-daemon-fase1`)

## Objetivo

Eliminar **todo uso de IA paga** no OMBUDS (Anthropic/Claude, e — por decisão do dono — também Gemini/OpenAI: ASR e embeddings), substituindo por:

- **LLM** → daemon `claude -p` no Mac Mini M4 (conta **Max**, custo marginal R$0).
- **ASR (transcrição)** → **Whisper local** no Mini (Metal) + diarização local (pyannote).
- **Embeddings** → modelo local no Mini — **ADIADO** para análise futura (subsistema mais pesado: re-indexação total do acervo + migração de dimensões pgvector).

Princípio de resiliência: **daemon-only no dia a dia**, com a flag existente `ALLOW_CLAUDE_API` servindo de **break-glass manual** de emergência (Mini fora por tempo longo). Sem fallback automático para API paga.

## Por que decompor

São 6–7 subsistemas independentes, com riscos muito diferentes. Um único PR gigante seria irrevisável e arriscaria a operação jurídica que depende do OMBUDS (prazos, júri). Entregamos em **ondas seguras**, cada uma cortando custo e entregando valor, cada uma com seu spec → plano → implementação → validação.

## Decomposição (sequência por valor/risco)

| Fase | Escopo | Risco | Spec |
|---|---|---|---|
| **1** | App: ~10 call-sites Claude SDK → daemon + **daemon v2** (cap de concorrência + fila com prioridade + break-glass) | 🟢 médio | `2026-06-11-fase1-app-claude-daemon-design.md` |
| **2** | WhatsApp chat (tempo real) → assíncrono via daemon | 🟡 | `2026-06-11-fase2-whatsapp-async-design.md` |
| **3** | enrichment-engine: etapa de **análise/depoimento** (Sonnet/Gemini) → daemon | 🟡 | `2026-06-11-fase3-engine-analise-daemon-design.md` |
| **4** | enrichment-engine: **ASR local** (Whisper no Mini) substituindo Gemini áudio | 🔴 infra nova | `2026-06-11-fase4-asr-local-whisper-design.md` |
| **5** | **Embeddings locais** + re-indexação pgvector | 🔴🔴 | **ADIADO** — análise futura |

## Invariantes do programa (valem em todas as fases)

1. **Nada vai pra produção sem revisão do dono.** Trabalho em branch; deploy de `main` só com ele presente.
2. **Guard fechado por feature migrada.** `assertClaudeApiAllowed` deve cobrir 100% dos call-sites pagos. Uma feature só ganha guard depois que seu caminho daemon existe.
3. **Contrato de resultado do daemon:** `claude -p` retorna **um objeto JSON** (parseado em `claude_code_tasks.resultado`); o daemon já re-tenta 1x se vier sujo. Cada skill define o JSON de saída espelhando o tipo TS que a UI já consome.
4. **Resiliência primeiro.** O daemon é ponto único de falha; mudanças nele são testadas e reversíveis (backup do binário/working version antes de swap).

## Estado atual (grounding em 2026-06-11)

- **Trilho pronto:** tabela `claude_code_tasks`, daemon `scripts/claude-code-daemon.mjs` (LaunchAgent no Mini, re-subscribe automático já corrigido), hook `useSkillTask`, tRPC `analise.criarTask`.
- **Guard existe:** `src/lib/services/claude-api-guard.ts` (bloqueia pago salvo `ALLOW_CLAUDE_API=true`). Cobertura parcial — ver Fase 1.
- **24 skills** em `.claude/skills-cowork/` (aliases em `SKILL_ALIASES.json`).
- **enrichment-engine:** serviço Python/FastAPI em `enrichment-engine/`, hospedado no Railway. Usa Gemini (ASR + embeddings 768d), Anthropic (Sonnet/Opus), OpenAI (embeddings 1536d legacy), pyannote (diarização).

## Fora de escopo (por ora)

- Embeddings locais / re-indexação (Fase 5, adiado).
- Trocar provider de scraping/Instagram (instaloader) — não é IA paga.
- Mudanças de produto/UX além do necessário para tornar fluxos síncronos em assíncronos.
