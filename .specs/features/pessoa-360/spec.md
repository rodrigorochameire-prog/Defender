# Feature: Pessoa 360° (extensão do grafo de Pessoa existente)

> Design/TDD: `docs/plans/2026-06-23-pessoa-360-plan.md`. Schema vivo:
> `src/lib/db/schema/*.ts` (NUNCA `drizzle/schema.ts`, que é dump morto).
> Estende `src/lib/promocao/` + `pessoas`/`lugares` — não recria o grafo.

## US-A — Depoentes entram no grafo
**Como** defensor **quero** que testemunhas/depoentes do processo virem pessoas
**para** ver seu histórico e contatos.
- [ ] CA-A1: `adaptador-depoentes` extrai candidatos da tabela `testemunhas` (nome obrigatório; tipo→papel; confiança 0.8; `fonteRef="depoentes:{processoId}"`).
- [ ] CA-A2: a participação criada liga `testemunhaId` quando há linha correspondente.
- [ ] CA-A3: depoente já promovido (de `analysisData.pessoas[]`) **vincula/ignora**, nunca duplica (idempotente em re-run).
- [ ] CA-A4: integrado em `promoverProcesso` → roda no hook `consolidateForProcesso` sem chamada nova; falha isolada (try/catch).

## US-B — Residências no mapa
**Como** defensor **quero** endereços de depoentes/assistido geocodificados **para** planejar diligências.
- [ ] CA-B1: `adaptador-depoentes-locais` extrai `testemunhas.endereco` como `CandidatoLugar` (`tipo="residencia-testemunha"`), ligado à pessoa após promoção.
- [ ] CA-B2: incluído em `promoverLocaisProcesso`; idempotente (pipeline `lugares` existente).
- [ ] CA-B3: cron dispara `lugares.geocodificarFaltantes` (hoje só botão manual).

## US-C — Familiares do assistido
**Como** defensor **quero** ver familiares do réu **para** contexto e contatos.
- [ ] CA-C1: nova tabela `pessoa_relacoes` (pessoa↔pessoa/nome_livre, grau, telefone, endereço, fonte/fonteRef, confirmado). Migração aditiva hand-authored.
- [ ] CA-C2: backfill cria relações de `assistidos.nomeMae`(mae)/`nomePai`(pai)/`nomeContato`(grau=parentescoContato); tenta `relacionada_pessoa_id` por match; idempotente por `fonteRef`.
- [ ] CA-C3: tRPC `pessoas.getFamiliares/addFamiliar/removeFamiliar`.

## US-D — Ficha da Pessoa 360°
**Como** defensor **quero** uma ficha completa **para** decidir com contexto — com destaque a réu/vítima/depoentes.
- [ ] CA-D1: demografia — idade (computada de `dataNascimento`), telefone, endereço, `nomesAlternativos`, avatar.
- [ ] CA-D2: envolvimento cruzado — participações agrupadas por processo (papel/lado) via `pessoas.getEnvolvimento`.
- [ ] CA-D3: familiares (US-C) como chips com grau + telefone; link se for pessoa.
- [ ] CA-D4: mapa de endereços (`participacoesLugar` da pessoa) reusando Leaflet.

## US-E — embeddings ↔ pessoa (CONTINGENTE)
**Como** defensor **quero** que a busca conheça a identidade canônica **para** futuro profiling.
- [ ] CA-E0: **VERIFICAR primeiro** onde o vetor vive (migração SQL vs schema) e a dimensão.
- [ ] CA-E1: `document_embeddings.pessoa_id` (+ index); populado no enrichment.
- [ ] CA-E2: 1 query de recuperação por pessoa ("mencionado em N peças").

## Não-funcionais
- TDD-first (núcleo puro testado antes); idempotência verificada; `protectedProcedure`; migração reversível.

## Fora de escopo
- Chat-RAG conversacional; profiling-dashboard; árvore genealógica multinível.
