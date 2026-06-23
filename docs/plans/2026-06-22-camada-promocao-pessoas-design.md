# Camada de Promoção de Dados Estruturados — Piloto: Pessoas

**Data:** 2026-06-22
**Autor:** Defensor Rodrigo + Claude
**Método:** Brainstorming → spec-driven → TDD.
**Sub-projeto B** da decomposição "OMBUDS como sistema nervoso defensivo" (ver também sub-projetos A assistidos, C MPU Fase VII, D mapa dos fatos).

---

## 1. Problema

A IA de enrichment já extrai dados estruturados ricos (pessoas com CPF/papel/antecedentes, delitos, lugares, cautelares, depoimentos, cronologia), mas **tudo é despejado em blobs JSONB** (`processos.analysisData`, `demandas.enrichmentData`, `drive.enrichmentData`). As tabelas-catálogo normalizadas (`pessoas`, `delitos`, `lugares`, `cautelares_decisao`) existem, são bem desenhadas e estão **órfãs/vazias**: nenhum código promove JSONB → catálogo.

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

```ts
function extrairCandidatosDeAnalysis(
  processoId: number,
  analysisData: ProcessoAnalysisData | null,
): CandidatoPessoa[]
```
Lê `analysisData.pessoas[]`, mapeia o vocabulário da IA (`papel`/`relacaoComDefendido`) → vocabulário do catálogo (`papel`/`lado`/`subpapel`), monta `fonteRef = "analysis:<processoId>"` (ou doc id quando disponível). Piloto = só esta fonte. A assinatura `(processo) → CandidatoPessoa[]` é a interface que `ata.ouvidos` e `enrichmentData` implementam depois.

## 7. Applier idempotente + merge-queue

`promoverPessoasDoProcesso(processoId)` — **uma transação**:
1. `extrairCandidatosDeAnalysis` → candidatos.
2. Carrega `existentes` (pessoas do workspace) + `distinctsConfirmados`.
3. Para cada candidato: `resolverIdentidade` → decisão.
4. Aplica:
   - `vincular`: upsert participação por `(processo, pessoa, papel)`. Se a participação existe e `origem='manual'` → **não toca**. Se `origem='promocao'` → atualiza confidence/fonteRef. Se não existe → insere (`origem='promocao'`).
   - `criar`: insere pessoa (`fonteCriacao='promocao-auto'`, confidence da extração) + participação.
   - `revisar`: insere pessoa provisória (marcada, ex. `fonteCriacao='promocao-revisao'`) + participação; ela **aparece sozinha na merge-queue existente** por compartilhar `nomeNormalizado` com as candidatas.
5. Registra cada decisão em `promocao_log`.
6. Marca `processos.pessoas_promovidas_em = now()`.

Nunca toca linhas `origem='manual'`. Re-rodar é seguro (idempotente).

## 8. Gatilho + backfill

- **Hook (daqui pra frente):** Inngest function `promover-pessoas` disparada quando o enrichment de um processo conclui (evento `enrichment.completed` ou equivalente já emitido pelo daemon/pipeline). Chama `promoverPessoasDoProcesso`.
- **Backfill (acumulado):** comando/endpoint `backfillPromocaoPessoas` que itera processos com `analysisData` não-nulo e `pessoas_promovidas_em IS NULL`, chamando o mesmo applier. Idempotente, re-rodável; emite contadores `{ processos, vinculadas, criadas, revisao }`. Lotes para não sobrecarregar.
- **Observabilidade:** os contadores e o `promocao_log` permitem auditar cada execução.

## 9. LGPD / papéis

Promove todos os papéis. A sensibilidade segue o tratamento que `pessoas` já tem (profissionais públicos livres; testemunha/vítima/menor já tratados pelo catálogo). `promocao_log` fornece a trilha de auditoria para os papéis sensíveis. Nenhum novo modelo de ACL no piloto.

## 10. Estratégia de testes (TDD)

| Unidade | Casos |
|---|---|
| `resolverIdentidade` (puro) | CPF match; nome+nascimento match; nome-só ambíguo→revisar; par em distinctsConfirmados não re-sugere; match via nomesAlternativos; sem match→criar; múltiplos CPF (não deve acontecer, mas defensivo) |
| `extrairCandidatosDeAnalysis` (puro) | analysisData null→[]; pessoas variadas→candidatos; mapeamento de papel/lado; ausência de campos opcionais |
| applier (idempotência) | rodar 2x não duplica; `origem='manual'` intocada; `vincular` atualiza só auto; `revisar` cria provisória |
| backfill (integração leve) | fixture de processo com analysisData → contadores corretos; segunda execução não reprocessa |

Gate: `tsc 0 · lint 0 · vitest verde`, conforme a fundação (F.0).

## 11. Rollout

1. Migração aditiva (colunas + `promocao_log` + flag).
2. Resolvedor + adaptador + applier (TDD) — sem gatilho ainda.
3. Backfill manual num punhado de processos; conferir `promocao_log` e merge-queue.
4. Ligar o hook Inngest.
5. Backfill completo em lotes.

Cada etapa é verificável isoladamente; o catálogo só começa a encher quando o defensor valida o resultado das primeiras promoções.

## 12. Questões em aberto

- **Evento de enrichment:** confirmar o nome exato do evento/hook que o daemon emite ao concluir análise (define o gatilho da §8).
- **Vocabulário de papéis:** mapear o conjunto de `papel` que a IA produz vs o vocabulário canônico de `participacoes_processo` (tabela de-para na §6).
- **Workspace nas pessoas:** confirmar como o escopo por workspace se aplica ao carregar `existentes` (a tabela tem `workspaceId` nullable).

## 13. Próximos sub-projetos (após o piloto provar o padrão)
Replicar para **delitos** (catálogo finito, match por artigo), **cautelares** (alimenta os flags da Fase IX) e **lugares** (geocoding, alimenta o mapa dos fatos / sub-projeto D). O resolvedor e o applier viram genéricos parametrizados por entidade.
