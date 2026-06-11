# Fase 3 — enrichment-engine: Análise/Depoimento → Daemon

**Data:** 2026-06-11 · **Programa:** [Zero API Paga](./2026-06-11-programa-zero-api-paga-overview.md) · **Status:** Desenho (impl. após Fase 2)

## Objetivo

Tirar o **LLM pago** (Sonnet/Gemini) das etapas de **análise** do `enrichment-engine` (Python/Railway): "analisar depoimento", enriquecimento de documento (extração estruturada/markdown), classificação. Mover a inteligência para o daemon (`claude -p`), deixando o engine só com parsing local (docling), ASR (Fase 4) e embeddings (adiado).

## Problema central

O engine roda na **nuvem (Railway)**; o daemon roda no **Mini**. Duas formas de conectar:

- **(A) App orquestra (recomendado):** mover a chamada de análise para **fora do engine**, para o **Inngest do app** (que já dispara `intelligence/enrich.document`). O Inngest enfileira `claude_code_tasks` (`source=engine`, skill de análise) e aguarda `resultado` via Realtime/poll com teto. O engine vira "parser + dados", sem LLM. Acoplamento limpo; credenciais e fila ficam no app.
- **(B) Engine enfileira direto:** o engine (server-side) insere em `claude_code_tasks` e faz poll do Supabase. Menos refactor, mas espalha a lógica de fila para o Python e mantém o engine no caminho crítico.

**Decisão:** (A) — concentra orquestração no app/Inngest, simplifica o engine.

## Migração por etapa do engine

| Etapa engine | IA paga hoje | Destino |
|---|---|---|
| Analisar depoimento (o modal) | Sonnet/Gemini | skill `analise-depoimento` no daemon |
| Enrich documento (extração/markdown) | Gemini | skill `enrich-documento` no daemon |
| Classificação de documento | Gemini/Sonnet | skill `pdf-classificacao` (compartilhada c/ Fase 1) |
| Parsing PDF (docling) | local (grátis) | mantém no engine |
| Embeddings | Gemini/OpenAI | **adiado** (Fase 5) |
| ASR | Gemini | **Fase 4** (Whisper local) |

## Skills

`analise-depoimento`, `enrich-documento` — cada uma com **FORMATO JSON** espelhando o que o engine/`enrichmentData` já grava (document_type, extracted_data, confidence, markdown_preview, speakers, etc.).

## Validação

- Reprocessar um documento conhecido pelos dois caminhos (engine-LLM antigo vs daemon) e comparar `enrichmentData`.
- Latência fim-a-fim aceitável (Inngest `maxDuration=300` + tempo do Mini).

## Riscos

| Risco | Mitigação |
|---|---|
| Refactor do engine quebra enrichment | Migrar etapa a etapa; manter engine como fallback até validar |
| Inngest aguardando o Mini estoura 300s | Tarefas longas → padrão fire-and-poll com retomada por Realtime, não bloquear a função |
| Divergência de qualidade Gemini→Claude | Comparar amostras; ajustar prompt/skill |
