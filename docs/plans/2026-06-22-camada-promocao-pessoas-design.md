# Camada de Promoção de Dados Estruturados — Piloto: Pessoas

**Data:** 2026-06-22
**Autor:** Defensor Rodrigo + Claude
**Método:** Brainstorming → spec-driven → TDD.
**Sub-projeto B** da decomposição "OMBUDS como sistema nervoso defensivo" (ver também sub-projetos A assistidos, C MPU Fase VII, D mapa dos fatos).

---

## 1. Problema

A IA de enrichment já extrai dados estruturados ricos (pessoas com CPF/papel/antecedentes, delitos, lugares, cautelares, depoimentos, cronologia), mas **tudo é despejado em blobs JSONB** (`processos.analysisData`, `demandas.enrichmentData`, `drive.enrichmentData`). As tabelas-catálogo normalizadas (`pessoas`, `delitos`, `lugares`, `cautelares_decisao`) existem, são bem desenhadas e estão **órfãs/vazias**: nenhum código promove JSONB → catálogo.

### Onde as pessoas vivem hoje (duas fontes reais — confirmado em revisão)
Há **dois pipelines** de extração de pessoas, e eles escrevem em lugares diferentes:
1. **`/api/analyze`** (Gemini) → grava `processos.analysisData.pessoas[]` (jsonb). Campo de vínculo é `vinculoComDefendido`. **Não emite evento** ao concluir (faz `UPDATE` direto).
2. **Pipeline de consolidação** (`intelligence/consolidate`, Inngest, `intelligence-consolidation.ts`) → grava na tabela **`case_personas`** (`casos.ts:69`): `nome`, `tipo` (papel), `processoId?`, `casoId`, `assistidoId?`, `perfil`/`contatos` jsonb, `confidence`. **Não escreve `analysisData.pessoas`.** É o pipeline mantido/principal.

Logo, a camada de promoção tem **duas fontes** (não uma), e `case_personas` é a mais estruturada. O alvo das duas é o catálogo global `pessoas` + `participacoes_processo`.

Consequência: o "sistema nervoso" extrai o sinal e não o grava na memória consultável. Sem isso, nada a jusante funciona — correlação entre casos, MPU inteligente, mapa dos fatos, recorrência de pessoas. Esta é a perda que o defensor sente como "estamos perdendo dados estruturados".

## 2. Objetivo e escopo

Construir a **camada de promoção** que move entidades estruturadas dos blobs JSONB para os catálogos normalizados, com dedup conservador, idempotência, proveniência e auditoria. **Pilotar com Pessoas** (maior valor de correlação; exercita o padrão inteiro: identity resolution + merge-queue + LGPD) como implementação-referência que os demais catálogos (delitos, lugares, cautelares) replicam depois.

### Em escopo (piloto)
- Promoção de `processos.analysisData.pessoas[]` → `pessoas` + `participacoes_processo`.
- Resolvedor de identidade conservador (CPF / nome+nascimento / nome-só→revisão).
- Applier idempotente com proteção de edição manual.
- Gatilho híbrido: hook no enrichment + backfill dos blobs existentes.
- Auditoria de promoção (LGPD).

### Fora de escopo (piloto)
- Outras entidades (delitos/lugares/cautelares) — replicam o padrão depois.
- Fontes secundárias (`audiencias.ata.ouvidos`, `demandas.enrichmentData`) — adaptadores plugáveis numa fase posterior; a interface já acomoda.
- Novo modelo de ACL — reusa o tratamento de sensibilidade que `pessoas` já tem.
- Auto-merge de pessoas — **nunca**; ambiguidade vai para a merge-queue humana.

## 3. Princípios

1. **Conservador acima de tudo** — melhor uma duplicata revisável do que uma fusão errada de homônimos (crítico num sistema jurídico).
2. **Idempotente** — re-análise/re-backfill não duplica nem sobrescreve.
3. **Edição manual é soberana** — linhas `origem='manual'` são intocáveis pela automação.
4. **Proveniência sempre** — cada promoção registra de onde veio (doc/modelo/confiança).
5. **Lógica pura, IO fino** — toda decisão em funções puras testáveis; banco e gatilhos são camadas finas.

## 4. Modelo de dados (aditivo e mínimo)

### `participacoes_processo` — duas colunas novas
| Coluna | Tipo | Default | Propósito |
|---|---|---|---|
| `origem` | varchar(20) | `'manual'` | `'manual'` \| `'promocao'`. **Default `'manual'` blinda todas as linhas existentes** da automação. |
| `fonte_ref` | varchar(120) | null | Descritor da fonte (`analysis:<docId>`), para idempotência e rastreio. |

Reuso: `fonte`, `confidence`, `dataPrimeiraAparicao`, `papel`, `lado`, `subpapel` (já existem).

### `pessoas` — zero mudança
Reuso: `cpf` (unique → dedup natural), `nomeNormalizado`, `nomesAlternativos[]`, `dataNascimento`, `confidence`, `fonteCriacao`, `mergedInto`.

### `promocao_log` — nova tabela (auditoria)
```
id, entidade ('pessoa'), processo_id, candidato_nome, candidato_cpf?,
acao ('vincular'|'criar'|'revisar'), pessoa_id?, confianca, fonte_ref,
modelo_extracao?, criado_em
```
Trilha de auditoria por promoção — exigida para pessoas sensíveis (testemunha/vítima/menor) e para depurar o backfill.

### `processos` — flag de controle do backfill
`pessoas_promovidas_em` (timestamptz, null) — marca quando o processo foi promovido; o backfill ignora processos já promovidos (re-rodável com segurança; um `--force` reprocessa).

> Migração aplicada via padrão verificado: checar colisão (`pg_tables`/`information_schema`) → `apply_migration` aditivo → verificar. Tudo é `ADD COLUMN`/`CREATE TABLE`; sem ALTER/DROP em dado existente.

## 5. Resolvedor de identidade (função pura — núcleo do TDD)

```ts
type CandidatoPessoa = {
  nome: string;
  cpf?: string | null;
  dataNascimento?: string | null;
  papel: string;          // já no vocabulário do catálogo (ver §6)
  lado?: string | null;
  subpapel?: string | null;
  fonteRef: string;
};

type PessoaExistente = {
  id: number; nomeNormalizado: string; nomesAlternativos: string[];
  cpf: string | null; dataNascimento: string | null;
};

type ResultadoResolucao =
  | { acao: 'vincular'; pessoaId: number; confianca: number; motivo: string }
  | { acao: 'criar';    confianca: number; motivo: string }
  | { acao: 'revisar';  candidatosIds: number[]; confianca: number; motivo: string };

function resolverIdentidade(
  candidato: CandidatoPessoa,
  existentes: PessoaExistente[],
  distinctsConfirmados: Set<string>,   // chaves "a:b" de pares confirmados distintos
): ResultadoResolucao
```

**Camadas (primeira que casa vence):**
1. **CPF presente e igual** a 1 existente → `vincular` (confiança 1.0). (`cpf` unique garante unicidade.)
2. Sem CPF: **nome normalizado (ou em `nomesAlternativos`) + `dataNascimento` iguais** a exatamente 1 → `vincular` (confiança 0.9).
3. **Nome normalizado bate em ≥1** sem CPF/nascimento desambiguando → `revisar` (cria provisória + merge-queue), retornando os ids candidatos para o reviewer. Confiança 0.4.
4. Nenhum match → `criar` (confiança = confiança da extração).

`distinctsConfirmados` evita re-sugerir merge de pares já marcados como pessoas distintas. Normalização de nome reusa `src/lib/pessoas/normalize.ts`.

## 6. Adaptadores de fonte (puros)

Duas implementações da mesma interface `→ CandidatoPessoa[]`, ambas puras e defensivas (fonte ausente/malformada → `[]`):

```ts
// Fonte PRIMÁRIA — tabela estruturada do pipeline de consolidação.
function extrairCandidatosDeCasePersonas(
  rows: CasePersonaRow[],          // case_personas de um processo (ou caso)
): CandidatoPessoa[]
// nome; cpf/dataNascimento extraídos de `perfil`/`contatos` jsonb quando houver;
// papel ← `tipo`; fonteRef = "case_personas:<id>"; confidence ← `confidence`.

// Fonte SECUNDÁRIA — blob do /api/analyze.
function extrairCandidatosDeAnalysis(
  processoId: number,
  analysisData: Record<string, unknown> | null,   // coluna é jsonb não-tipado; cast/guard no boundary
): CandidatoPessoa[]
// lê `analysisData.pessoas[]` SE existir (pode estar undefined → []);
// mapeia o vocabulário da IA `vinculoComDefendido` → `lado`/`subpapel`;
// fonteRef = "analysis:<processoId>".
```

**De-para de papéis (open question #2)**: tabela explícita IA→catálogo, cobrindo `case_personas.tipo` e `analysisData.pessoas[].papel`/`vinculoComDefendido`.

**Resolução de `processoId`**: `case_personas.processoId` é nullable (a tabela é caso-scoped). Quando null, deriva o(s) processo(s) via `casoId`; se o caso tem múltiplos processos, registra em `promocao_log` como ambiguidade e adia (não chuta o processo). `analysisData` é sempre processo-scoped.

## 7. Applier idempotente + merge-queue

`promoverPessoasDoProcesso(processoId)` — **uma transação**:
1. `extrairCandidatosDeAnalysis` → candidatos.
2. Carrega `existentes` (pessoas do workspace) + `distinctsConfirmados`.
3. Para cada candidato: `resolverIdentidade` → decisão.
4. Aplica:
   - `vincular`: upsert participação por `(processo, pessoa, papel)`. Se a participação existe e `origem='manual'` → **não toca**. Se `origem='promocao'` → atualiza confidence/fonteRef. Se não existe → insere (`origem='promocao'`).
   - `criar`: insere pessoa (`fonteCriacao='promocao-auto'`, confidence da extração) + participação.
   - `revisar`: insere pessoa provisória (marcada, `fonteCriacao='promocao-revisao'`) com `nomeNormalizado` = nome normalizado do candidato + participação. A merge-queue existente é um self-join por `nome_normalizado` (`pessoas.ts:397`), então a provisória **aparece pareada** com a(s) candidata(s) que colidiram (não "sozinha" — correção da redação anterior). **Robustez:** como o match da camada 3 pode ter vindo de `nomesAlternativos` (e aí os `nomeNormalizado` podem divergir, fazendo o self-join não parear), o applier **também grava o par explícito** (`promocao_log` com `acao='revisar'` + `candidatosIds`), de modo que a revisão nunca se perca por incidência de igualdade de string.
5. Registra cada decisão em `promocao_log`.
6. Marca `processos.pessoas_promovidas_em = now()`.

Nunca toca linhas `origem='manual'`. Re-rodar é seguro (idempotente).

## 8. Gatilho + backfill

**Não existe um evento `enrichment.completed` pronto** (confirmado em revisão). A estratégia por fonte:
- **Fonte `case_personas` (primária):** o pipeline `intelligence/consolidate` (Inngest) já roda e escreve `case_personas`. O hook é **um passo de promoção ao final dessa função** (ou um evento novo que ela emite, consumido por `promover-pessoas`). É o caminho natural e mantido.
- **Fonte `analysisData` (secundária):** `/api/analyze` não emite evento. Piloto **depende de backfill** para essa fonte; emitir um evento próprio em `/api/analyze` fica como melhoria posterior (não bloqueia o piloto).
- **Backfill (acumulado):** comando/endpoint `backfillPromocaoPessoas` que itera (a) `case_personas` ainda não promovidas e (b) processos com `analysisData->'pessoas' IS NOT NULL` (filtro correto — **não** apenas `analysisData IS NOT NULL`) e `pessoas_promovidas_em IS NULL`. Chama o mesmo applier. Idempotente, re-rodável, em lotes; contadores `{ processos, vinculadas, criadas, revisao }`.
- **Observabilidade:** contadores + `promocao_log` auditam cada execução.

## 9. LGPD / papéis

Promove todos os papéis. A sensibilidade segue o tratamento que `pessoas` já tem (profissionais públicos livres; testemunha/vítima/menor já tratados pelo catálogo). `promocao_log` fornece a trilha de auditoria para os papéis sensíveis. Nenhum novo modelo de ACL no piloto.

## 10. Estratégia de testes (TDD)

| Unidade | Casos |
|---|---|
| `resolverIdentidade` (puro) | CPF match; nome+nascimento match; nome-só ambíguo→revisar; par em distinctsConfirmados não re-sugere; match via nomesAlternativos; sem match→criar; múltiplos CPF (não deve acontecer, mas defensivo) |
| adaptadores (puros) | `case_personas`: rows→candidatos, cpf/nascimento de perfil/contatos, processoId null→adia; `analysisData` null→[], **presente sem chave `pessoas`→[]**, pessoas variadas→candidatos, mapeamento `vinculoComDefendido`→lado/subpapel |
| applier (idempotência) | rodar 2x não duplica; `origem='manual'` intocada; `vincular` atualiza só auto; `revisar` cria provisória |
| backfill (integração leve) | fixture de processo com analysisData → contadores corretos; segunda execução não reprocessa |

Gate: `tsc 0 · lint 0 · vitest verde`, conforme a fundação (F.0).

## 11. Rollout

1. Migração aditiva (colunas + `promocao_log` + flag).
2. Resolvedor + dois adaptadores + applier (TDD) — sem gatilho ainda. O applier escreve via Drizzle direto (não pela tRPC `pessoasRouter.create`, cujo zod restringe `fonteCriacao`).
3. Backfill manual num punhado de processos (ambas as fontes); conferir `promocao_log` e merge-queue com o defensor.
4. Ligar o passo de promoção ao final de `intelligence/consolidate` (fonte `case_personas`). A fonte `analysisData` permanece backfill no piloto.
5. Backfill completo em lotes.

Cada etapa é verificável isoladamente; o catálogo só começa a encher quando o defensor valida o resultado das primeiras promoções.

## 12. Questões em aberto

- **Gatilho `analysisData`:** `/api/analyze` não emite evento; o piloto cobre essa fonte por backfill e deixa o evento próprio como melhoria. (A fonte `case_personas` tem hook natural no `intelligence/consolidate` — §8.) **Resolvido para o piloto.**
- **Vocabulário de papéis:** montar a tabela de-para concreta `case_personas.tipo` + `analysisData.pessoas[].papel`/`vinculoComDefendido` → `papel`/`lado`/`subpapel` canônicos. Trabalho de implementação, não bloqueador de design.
- **Workspace no dedup:** a merge-queue existente (`suggestMerges`, `pessoas.ts:397`) é **workspace-agnóstica** (self-join global por nome). O piloto **segue esse comportamento** (carrega `existentes` sem filtro de workspace, para casar com a merge-queue) e novas pessoas herdam o `workspaceId` do processo. Divergir disso seria inconsistente com o que já existe.
- **Escala do resolver:** carregar todas as `existentes` em memória é aceitável no piloto, mas o lookup deve usar índice por CPF + prefetch por `nome_normalizado` (não full-scan por candidato) à medida que o catálogo cresce. Otimização incremental, registrada.

## 13. Próximos sub-projetos (após o piloto provar o padrão)
Replicar para **delitos** (catálogo finito, match por artigo), **cautelares** (alimenta os flags da Fase IX) e **lugares** (geocoding, alimenta o mapa dos fatos / sub-projeto D). O resolvedor e o applier viram genéricos parametrizados por entidade.
