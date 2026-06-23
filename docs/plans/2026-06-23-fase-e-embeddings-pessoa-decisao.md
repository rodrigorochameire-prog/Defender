# Decisão — Fase E (embeddings ↔ pessoa / Caseload-RAG)

> **Data:** 2026-06-23
> **Decisão:** **ADIAR** a Fase E. Pré-requisito ausente + caminho V1 melhor sem NER.
> **Contexto:** parte do programa Pessoa 360° (`.specs/features/pessoa-360/`).

## Achado decisivo
As duas tabelas de embeddings estão **VAZIAS** (0 linhas) no banco de produção:
- `document_embeddings` (OpenAI 1536d, migração `0013_semantic_search.sql`, RPC `search_documents`) — **0 linhas**.
- `embeddings` (Gemini 768d, RPC `search_embeddings`, vetor fora do Drizzle) — **0 linhas**.

O índice semântico **nunca foi populado**. Logo, qualquer recuperação por pessoa
(o objetivo da Fase E) não retornaria nada — seria uma feature oca. O bloqueio real
não é o `pessoa_id`, é a **ausência de índice**.

## Sequência correta (pré-requisitos antes da Fase E)
1. **Popular embeddings** rodando o pipeline do `enrichment-engine` (Docling →
   chunk → embed) sobre a carga de documentos. Iniciativa própria, maior, fora deste programa.
2. **Recuperação por pessoa — V1 LEAN (sem NER)**: ao popular, o link pessoa↔documento
   sai de graça do grafo já existente — **sem coluna nova, sem NER**:
   `pessoa → participacoes_processo.processo_id → embeddings.processo_id`
   (e `document_embeddings → drive_files.processo_id`, que existe). Uma query/rota
   "menções da pessoa na carga" agrega tudo dos processos onde ela participa.
   Entrega ~80% do valor ("tudo sobre X na carga") com ~5% do esforço.
3. **Precisão por menção — V2 (NER, caro)**: só então `document_embeddings.pessoa_id`
   + NER no ingest p/ saber qual chunk cita qual pessoa. ~1-2 semanas. Adiar até haver
   demanda concreta.

## Por que NÃO fazer agora
- Sem índice populado, não há o que recuperar (bloqueio duro).
- O V1 lean torna a coluna `pessoa_id`/NER **desnecessária** para o primeiro valor.
- Evita construir tagging caro antes de validar que a busca semântica é usada.

## Gatilho para reabrir
Quando o pipeline de embeddings rodar sobre a carga (≥ alguns milhares de chunks),
implementar o V1 lean (1 query + 1 card "menções" na Ficha). Reavaliar NER (V2) por
demanda. Outros gaps menores ainda abertos: tipo `sujeito/autoridade` (hoje só
`categoriaPrimaria`); detecção de contradições entre depoimentos.
