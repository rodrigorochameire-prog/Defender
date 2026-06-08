# Harmonização dos tipos de audiência — design

**Data:** 2026-06-08
**Status:** aprovado (brainstorming) → próximo: plano de implementação

## Problema

Os "tipos de audiência" (AIJ, Justificação, Oitiva Especial, Custódia, Júri, PAP, ANPP,
Admonitória, Retratação, Conciliação…) estão definidos em **~10 lugares independentes**,
cada um com seu vocabulário. Não há fonte única da verdade, então as listas divergem e
geram bugs (ex.: 07–08/06/2026 — Justificação exibida como AIJ).

### Divergências reais encontradas

- **Coluna `audiencias.tipo` é texto livre** e está suja: **17 valores distintos** para
  ~10 tipos reais. Ex.: AIJ aparece como `Audiência de Instrução e Julgamento` (273),
  `Instrução e Julgamento` (2), `Instrução` (3), `AIJ` (1), `INSTRUCAO` (1); Oitiva como
  `Oitiva Especial` (113), `Depoimento Especial` (34), `OITIVA_ESPECIALIZADA` (1);
  Justificação como `Justificação` (46), `Audiência de Justificação` (13), `JUSTIFICAÇÃO` (9);
  + `audiencia` (9, placeholder), `Instrução + Depoimento Especial` (4, mutirão),
  `Continuação de Instrução / Acareação` (2).
- **Enum `tipoAudienciaEnum`** (`INSTRUCAO/CUSTODIA/UNA/CONTINUACAO/…`) é **órfão** —
  nenhuma tabela o usa.
- Parser retorna `"Oitiva especial"` (minúsculo) × mapa de siglas tem `"Oitiva Especial"`
  × subtipo usa `"oitiva_especial"` × Plaud usa `"juri_instrucao"`/`"juri_debates"`.
- Typo **"Adminitória"** (deveria "Admonitória") no mapa de siglas.
- **4 mapas de abreviação** quase iguais mas divergentes: `extrair-tipo.ts`,
  `calendar-week-view` (`tipoNomeCompleto`), `calendar-month-view`, `day-events-popup`
  (este é **órfão**, não importado).
- `mapearTipoAudiencia` tem **fallback = AIJ** (origem do bug de 08/06).
- **Adição manual** (`evento-create-modal`) só escolhe "Audiência" genérica — não dá pra
  marcar AIJ/Justificação/etc.

## Decisões (brainstorming)

1. **Alcance:** catálogo central (fonte única) + refatorar TODOS os consumidores + migrar
   os dados sujos do banco.
2. **Adição manual:** ganhar um seletor do tipo de audiência (alimentado pelo catálogo).
3. **Armazenamento:** manter texto livre, mas padronizado na **descrição por extenso
   canônica** (sigla derivada no display). Sem mudança de schema.
4. **Casos especiais na migração:** `audiencia`/`Audiência` (placeholder) → `indefinido`
   ("Audiência"); `Continuação de Instrução / Acareação` → AIJ.
5. **Entrega em 2 PRs:** PR-A (código: catálogo + consumidores + testes); PR-B (migração
   de dados + rebuild de títulos).

## Arquitetura

### Fonte única: `src/lib/agenda/tipos-audiencia.ts`

Cada tipo definido **uma vez**:

```ts
interface TipoAudiencia {
  slug: string;            // id estável (selector, plaud, subtipo) — ex.: 'aij'
  descricao: string;       // valor CANÔNICO gravado em audiencias.tipo
  sigla: string;           // badge no display — ex.: 'AIJ'
  duracaoMin: number;      // duração padrão
  atribuicoes: Atribuicao[]; // em quais dropdowns aparece
  cor?: string;            // p/ subtipo/registro (tailwind token)
  detectar: RegExp[];      // padrões sobre texto ACHATADO (replace(/\s+/g,'')) p/ o parser
  classeCodigos?: string[];// fallback por código de classe processual
  aliases?: string[];      // strings sujas conhecidas → migração de dados
}
```

A ordem do array é a **ordem de detecção** (mais específico primeiro).

### Lista canônica

| slug | descricao (banco) | sigla | dur | atribuições | detectar (resumo) | classe |
|---|---|---|---|---|---|---|
| `plenario_juri` | Sessão de Julgamento do Tribunal do Júri | Júri | 480 | Júri | SESSÃO/PLENÁRIO/TRIBUNAL…JULGAMENTO | — |
| `anpp` | Acordo de Não Persecução Penal | ANPP | 30 | Criminal | ANPP/NÃOPERSECUÇÃO/ACORDO…PENAL | — |
| `pap` | Produção Antecipada de Provas | PAP | 30 | Júri, Criminal | PRODUÇÃOANTECIPADA/\bPAP\b/ANTECIPADADEPROVAS | — |
| `admonitoria` | Audiência Admonitória | Admonitória | 15 | EP | ADMONIT[OÓ]RIA | — |
| `instrucao_oitiva` | Instrução + Depoimento Especial | Instrução + Oitiva | 90 | VVD (mutirão) | INSTRUÇÃO **e** DEPOIMENTOESPECIAL | — |
| `oitiva_especial` | Oitiva Especial | Oitiva Especial | 30 | VVD, Criminal | OITIVAESPECIAL/DEPOIMENTOESPECIAL | 11955 |
| `retratacao` | Audiência de Retratação | Retratação | 30 | VVD | RETRATAÇÃO | — |
| `justificacao` | Justificação | Justificação | 30 | VVD, EP, Criminal | JUSTIFICAÇÃO | 1268, 280 |
| `custodia` | Audiência de Custódia | Custódia | 30 | todas | CUSTÓDIA | — |
| `aij` | Audiência de Instrução e Julgamento | AIJ | 90 | Júri, VVD, Criminal | INSTRUÇÃO/\bAIJ\b | 283, 10943 |
| `conciliacao` | Audiência de Conciliação | Conciliação | 30 | Cível | CONCILIAÇÃO | — |
| `indefinido` | Audiência | Audiência | 30 | — (fallback) | — | — |

**Ordem de detecção** (preserva a lógica atual): plenário_juri → anpp → pap → admonitória →
instrucao_oitiva → oitiva_especial → retratação → justificação → custódia → aij →
conciliação → indefinido. O `instrucao_oitiva` exige **ambos** os tokens e por isso vem
antes de `oitiva_especial`/`aij`.

**Aliases para migração** (strings sujas → slug):
- `aij`: `Instrução e Julgamento`, `Instrução`, `INSTRUCAO`, `AIJ`,
  `Continuação de Instrução / Acareação`
- `oitiva_especial`: `Depoimento Especial`, `OITIVA_ESPECIALIZADA`
- `justificacao`: `Audiência de Justificação`, `JUSTIFICAÇÃO`
- `indefinido`: `audiencia`, `Audiência`

**Siglas legadas (display-only, fora do dropdown):** Execução, Progressão, Livramento,
Unificação, Concentrada, Preliminar, Apresentação, Med. Protetivas. Entram apenas como
entradas extras no mapa de siglas derivado, para não quebrar exibições antigas; não viram
tipos de primeira classe nem opção de criação. Remove-se o typo "Adminitória".

### Consumidores (todos derivam do catálogo)

- **`detectar-tipo-audiencia.ts`** — `detectarTipoAudiencia` varre `detectar`/`classeCodigos`
  na ordem do catálogo; retorna a `descricao`. Some o fallback "AIJ" → `indefinido`.
  `detectarSituacao` permanece como está (não é tipo).
- **`extrair-tipo.ts`** — o `tipoAbreviacoes` passa a ser **gerado** do catálogo (descricao→sigla
  + aliases + siglas legadas). `extrairTipo`/`extrairTipoEvento` inalterados na assinatura.
- **`calendar-week-view` / `calendar-month-view`** — um único helper (sigla→descrição vem do
  catálogo). **`day-events-popup.tsx` é removido** (órfão).
- **Badge da agenda = `sigla` do catálogo, UNIFORME nas 3 views** (painel do dia, semana,
  mês): `AIJ`, `Justificação`, `PAP`, `Admonitória`, `Júri`, `Oitiva Especial`, `Custódia`,
  `ANPP`, `Retratação`, `Conciliação`, `Instrução + Oitiva`, `Audiência`. Uma única função
  (`extrairTipoEvento`, já existente) resolve a sigla a partir da coluna `tipo` autoritativa;
  fim das siglas divergentes entre as views.
- **`pje-agenda-import-modal`** — `mapearTipoAudiencia(texto, atribuição)` vira lookup no
  catálogo retornando `{sigla, descricao, duracaoMin}`. As durações (90/480/15/30) saem do
  catálogo. `ATRIBUICAO_OPTIONS` (descrições por atribuição) derivam de `atribuicoes`.
- **`evento-create-modal`** — quando `tipo === 'audiencia'`, exibe um seletor "Tipo de
  audiência" populado pelo catálogo (filtrável por atribuição) que grava a `descricao`.
- **`plaud-approval-modal`** e **`registro-audiencia/subtipo-audiencia.ts`** — passam a usar
  os `slug` do catálogo (mapeando os subtipos atuais: `justificacao`, `oitiva_especial`,
  `aij`, `custodia`, `plenario`→`plenario_juri`, `juri_instrucao`/`juri_debates` ficam como
  subdivisões do Júri fora do catálogo principal, documentadas no próprio módulo).

### Migração de dados (PR-B)

Script `scripts/migrar-tipos-audiencia.cjs` (dry-run → `--apply`, padrão de ontem):
1. Para cada `audiencias`, resolver o slug via `aliases` (match exato, case-insensitive) e,
   se não casar, via `detectar` sobre o próprio `tipo`. Sem match → `indefinido`.
2. `UPDATE` `tipo` ← `descricao` canônica.
3. **Rebuild do `titulo`**: troca a sigla no prefixo `"<sigla velha> - …"` pela `sigla` nova
   (mesma técnica usada nos 34 títulos de 08/06).
4. Relatório por valor de origem (os 17) → destino, com contagem.

Mapa esperado dos 17 valores atuais:

| origem (n) | → destino |
|---|---|
| Audiência de Instrução e Julgamento (273), Instrução e Julgamento (2), Instrução (3), AIJ (1), INSTRUCAO (1), Continuação de Instrução / Acareação (2) | Audiência de Instrução e Julgamento |
| Oitiva Especial (113), Depoimento Especial (34), OITIVA_ESPECIALIZADA (1) | Oitiva Especial |
| Justificação (46), Audiência de Justificação (13), JUSTIFICAÇÃO (9) | Justificação |
| Sessão de Julgamento do Tribunal do Júri (40) | (inalterado) |
| Audiência Admonitória (12) | (inalterado) |
| Produção Antecipada de Provas (9) | (inalterado) |
| Instrução + Depoimento Especial (4) | (inalterado) |
| audiencia (9) | Audiência |

## Testes

- **Catálogo:** slugs e descrições únicos; toda `descricao` casa seu próprio `detectar`/`aliases`;
  ordem de detecção cobre os pares ambíguos (Sessão×AIJ, Oitiva×Justificação, instrucao_oitiva×oitiva).
- **`detectarTipoAudiencia`:** casos atuais migrados + novos (Depoimento Especial→Oitiva,
  INSTRUCAO→AIJ, JUSTIFICAÇÃO→Justificação, placeholder→indefinido).
- **`extrairTipo`/`extrairTipoEvento`:** mantêm os testes atuais; siglas vêm do catálogo.
- **Migração:** teste puro do resolvedor slug para os 17 valores de origem → destino esperado.

## Não-objetivos (YAGNI)

- Não trocar a coluna para slug nem criar tabela de tipos (decisão: texto por extenso).
- Não remover o enum `tipoAudienciaEnum` órfão neste trabalho (limpeza de schema separada;
  só anotar como morto).
- Não redesenhar cores/atribuições (`atribuicoes.ts` permanece).

## Entrega

- **PR-A:** `tipos-audiencia.ts` + refator dos consumidores + remoção do `day-events-popup`
  + testes. Sem risco de dados.
- **PR-B:** `scripts/migrar-tipos-audiencia.cjs` (dry-run conferido → apply) + rebuild de
  títulos. Reversível por valor.
