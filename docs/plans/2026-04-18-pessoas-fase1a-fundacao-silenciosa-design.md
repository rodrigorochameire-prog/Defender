# Pessoas · Fase I-A · Fundação Silenciosa — Design

**Data:** 2026-04-18
**Status:** Design aprovado — aguardando plano de implementação
**Escopo:** Fundação do catálogo de pessoas: schema, backfill, tRPC, CRUD em `/admin/pessoas`, `PessoaSheet` e `PessoaChip` reutilizáveis — **sem qualquer sinalização de inteligência**. A Fase I-A deixa a plumbing pronta; a Fase I-B acende as luzes.
**Fases seguintes:** I-B Apresentação de Inteligência · II Extração IA · III Perfis Juiz/Promotor · IV Testemunha inteligente · V Rede social + alertas.

---

## Por que dividir em I-A e I-B

A Fase I original misturava fundação (schema, CRUD, catálogo) com apresentação (dots, peek, banner). Isso criava risco duplo: desenhar sinalização sem dados reais leva a escolhas que não sobrevivem ao primeiro teste; e implementar tudo de uma vez faz a UX ser decidida sob pressão de prazo.

Separando:

- **I-A** entrega o esqueleto de dados e a UI básica (catálogo, CRUD, merge) — **silenciosa**. Zero sinalização de intel. Cada chip é só um chip; cada sheet mostra só os dados brutos que existem.
- **I-B** vem depois, já com dados reais do backfill, e desenha a sinalização calibrada.

Ganho: I-B é iterada em cima de evidência, não suposição.

## Objetivo I-A

Transformar strings espalhadas em entidade navegável, sem prometer inteligência ainda. O defensor consegue:

1. Buscar pessoas no catálogo.
2. Ver quais processos uma pessoa aparece e em qual papel.
3. Mesclar duplicatas detectadas.
4. Criar/editar pessoas manualmente.
5. Clicar em qualquer nome (no catálogo ou em componentes que integrarem) e ver o sheet.

O que **não** entrega nesta fase: dots, peek, banner, correlações automáticas, alertas, integração com o sheet da agenda (essa integração vem em I-B agora que a agenda foi liberada).

## Decisões de design

| Decisão | Escolha | Racional |
|---|---|---|
| Entidade central | `pessoas` (catálogo global) | Cross-ref exige entidade única |
| Relação pessoa-processo | N:N via `participacoes_processo` com `papel` | Mesma pessoa pode ter papéis diferentes em casos diferentes |
| Dedup automático | **Só por CPF exato**; resto via merge-queue | False positives em "João Silva" destroem confiança |
| Preservar `testemunhas` existente | FK opcional `participacoes_processo.testemunha_id` | Dados ricos (sinteseJuizo, audioDriveFileId) não duplicam |
| Proveniência | `fonte_criacao` + `confidence` em todos os registros | Auditabilidade + prioridade pra merges |
| Soft-merge | `merged_into` + preservar original | Undo simples; audit intacto |
| Escopo I-A | Só plumbing, sem sinalização | UX precisa de dados reais pra calibrar |
| LGPD | ACL por field + audit_logs | Dados de profissionais públicos são ok; observações de testemunha/vítima são sensíveis |

## Arquitetura

### Schema (2 tabelas + 1 tabela auxiliar)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Catálogo global de pessoas
CREATE TABLE pessoas (
  id                serial PRIMARY KEY,
  nome              text NOT NULL,
  nome_normalizado  text NOT NULL,
  nomes_alternativos jsonb DEFAULT '[]'::jsonb,
  cpf               varchar(14) UNIQUE,      -- ground truth, rejeita duplicata
  rg                text,
  data_nascimento   date,
  telefone          text,
  endereco          text,
  foto_drive_file_id varchar(100),
  observacoes       text,

  -- categorização rápida (primária; papéis completos vêm de participacoes)
  categoria_primaria varchar(30),             -- ex: "testemunha-frequente" | "juiz" | "policial"

  -- proveniência
  fonte_criacao     varchar(40) NOT NULL,     -- manual | backfill | ia-atendimento | ia-denuncia | import-pje
  criado_por        integer REFERENCES users(id),
  confidence        numeric(3,2) DEFAULT 1.0 NOT NULL,

  -- soft-merge
  merged_into       integer REFERENCES pessoas(id),
  merge_reason      text,
  merged_at         timestamp,
  merged_by         integer REFERENCES users(id),

  -- LGPD
  workspace_id      integer REFERENCES workspaces(id),  -- escopo do usuário

  created_at        timestamp DEFAULT now() NOT NULL,
  updated_at        timestamp DEFAULT now() NOT NULL
);

CREATE INDEX pessoas_nome_norm_idx ON pessoas(nome_normalizado);
CREATE INDEX pessoas_nome_trgm_idx ON pessoas USING gin(nome_normalizado gin_trgm_ops);
CREATE INDEX pessoas_merged_idx ON pessoas(merged_into) WHERE merged_into IS NOT NULL;
CREATE INDEX pessoas_categoria_idx ON pessoas(categoria_primaria);
CREATE INDEX pessoas_workspace_idx ON pessoas(workspace_id);

-- Participação N:N pessoa × processo
CREATE TABLE participacoes_processo (
  id                      serial PRIMARY KEY,
  pessoa_id               integer NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  processo_id             integer NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  papel                   varchar(30) NOT NULL,      -- ver lista de papéis válidos abaixo
  lado                    varchar(20),                -- acusacao | defesa | neutro
  subpapel                varchar(40),                -- ex: "condutor-da-ocorrencia" dentro de policial-militar

  -- elo com tabela existente
  testemunha_id           integer REFERENCES testemunhas(id),  -- quando papel=testemunha/vitima/etc

  -- dados DESTA participação
  resumo_nesta_causa      text,
  observacoes_nesta_causa text,
  audio_drive_file_id     varchar(100),
  data_primeira_aparicao  date,                        -- primeira vez que apareceu neste processo

  -- proveniência
  fonte                   varchar(40) NOT NULL,
  confidence              numeric(3,2) DEFAULT 1.0 NOT NULL,

  created_at              timestamp DEFAULT now() NOT NULL,
  updated_at              timestamp DEFAULT now() NOT NULL,
  UNIQUE(pessoa_id, processo_id, papel)
);

CREATE INDEX participacoes_pessoa_idx ON participacoes_processo(pessoa_id);
CREATE INDEX participacoes_processo_idx ON participacoes_processo(processo_id);
CREATE INDEX participacoes_papel_idx ON participacoes_processo(papel);
CREATE INDEX participacoes_testemunha_idx ON participacoes_processo(testemunha_id) WHERE testemunha_id IS NOT NULL;

-- Pares confirmados como distintos (pra merge-queue não sugerir repetidamente)
CREATE TABLE pessoas_distincts_confirmed (
  pessoa_a_id  integer NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  pessoa_b_id  integer NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  confirmado_por integer REFERENCES users(id),
  confirmado_em timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY (LEAST(pessoa_a_id, pessoa_b_id), GREATEST(pessoa_a_id, pessoa_b_id))
);
```

### Taxonomia de papéis

Valores válidos para `participacoes_processo.papel`, **divididos em rotativos e estáveis**:

**Rotativos** (alto valor de cruzamento — pessoas diferentes em casos diferentes, merecem inteligência contextual em fase I-B):

```
Depoentes / Acusação:
  testemunha, vitima, informante, co-reu, testemunha-defesa

Policial / Investigação:
  autoridade-policial (delegado), policial-militar, policial-civil,
  policial-federal, guarda-municipal, agente-penitenciario

Pericial / Técnico:
  perito-criminal, perito-medico, medico-legista, medico-assistente,
  psicologo-forense, psiquiatra-forense, assistente-social, tradutor-interprete

Parte contrária:
  advogado-parte-contraria
```

**Estáveis** (baixo valor de cruzamento em comarca única — titularidade é fixa, todo processo tem o mesmo. Cadastro existe para estatística futura/multi-comarca, mas em I-B NÃO ganham dot/peek/banner):

```
Judicial / Ministério Público:
  juiz, desembargador, promotor, procurador, oficial-justica,
  servidor-cartorio, analista-judiciario
```

**Outros:**

```
outro (fallback com observações obrigatórias)
```

A distinção **não afeta o schema** — é purely classificação em tempo de render (Fase I-B). Em I-A ambos os grupos geram `pessoas` + `participacoes` normalmente; a diferença visual vem na Fase I-B.

Config em `src/lib/pessoas/intel-config.ts`:

```ts
export const PAPEIS_ROTATIVOS = new Set([
  "testemunha", "vitima", "informante", "co-reu", "testemunha-defesa",
  "autoridade-policial", "policial-militar", "policial-civil",
  "policial-federal", "guarda-municipal", "agente-penitenciario",
  "perito-criminal", "perito-medico", "medico-legista", "medico-assistente",
  "psicologo-forense", "psiquiatra-forense", "assistente-social",
  "tradutor-interprete", "advogado-parte-contraria",
]);
// Papéis fora dessa lista → estáveis por default (pra workspace multi-comarca, admin pode habilitar)
```

Validação via Zod enum em todas as mutations. `subpapel` é texto livre para refinamento ("delegado-plantao", "perito-bh-cir", etc).

### Normalização canônica

Função compartilhada em `src/lib/pessoas/normalize.ts`:

```ts
export function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(dr|dra|sr|sra|pm|pc|pf|cb|sgt|sub|insp|esc|inv|tte)\.?\s/gi, " ") // remove pronomes de tratamento
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

Inclui strip de pronomes de tratamento (Dr, PM, Cabo, etc) pra aumentar matches. `"PM João da Silva"` e `"Soldado João Silva"` normalizam para `"joao da silva"` e `"joao silva"` — suficientemente próximos para serem sugeridos como merge.

### tRPC router `pessoas.ts`

```ts
// Listagem e busca
list: input({
  search?: string,
  papel?: string,
  categoria?: string,
  hasProcessos?: boolean,
  workspace?: "current" | "all",
  limit?: number = 50,
  offset?: number = 0,
  orderBy?: "nome" | "casos" | "recente" = "nome",
})
// retorna { items: PessoaListItem[], total: number }

searchForAutocomplete: input({ query: string, papel?: string, limit?: number = 10 })
// autocomplete em formulários

getById: input({ id: number })
// retorna { pessoa, participacoes: [{ processo, papel, ... }], totals: { porPapel, porAno } }

getByCpf: input({ cpf: string })
// lookup ground-truth (para deduplicação por CPF)

// CRUD
create: input({ nome, cpf?, rg?, data_nascimento?, telefone?, endereco?, observacoes?, categoria_primaria?, fonte_criacao })
update: input({ id, ...fields })
delete: input({ id }) // soft-delete via merged_into=null mas deleted flag

// Relações
addParticipacao: input({ pessoaId, processoId, papel, lado?, subpapel?, testemunhaId?, resumo?, observacoes? })
updateParticipacao: input({ id, ...fields })
removeParticipacao: input({ id })
getParticipacoes: input({ pessoaId })
getParticipacoesDoProcesso: input({ processoId })
linkTestemunha: input({ participacaoId, testemunhaId })
unlinkTestemunha: input({ participacaoId })

// Merge
suggestMerges: input({ pessoaId?, limit?: number = 20 })
  // Retorna pares candidatos ordenados por similarity + mesmo contexto
  // Exclui pares em pessoas_distincts_confirmed
merge: input({ fromId, intoId, reason })
  // Move participacoes, preserva fromId com merged_into
unmerge: input({ pessoaId })
  // Reverte último merge — requer auditoria
markAsDistinct: input({ pessoaAId, pessoaBId })
  // Grava em pessoas_distincts_confirmed
```

### Backfill script

`scripts/backfill-pessoas.mjs` — idempotente, dry-run opcional, batch de 100.

Ordem:
1. **Testemunhas** (`testemunhas.nome`): 1 pessoa por nome+processoId único; participação com `papel` derivado de `tipo`; link `testemunha_id`.
2. **Juízes** (distinct `processos.juiz` + `audiencias.juiz`): dedup por nome_normalizado no nível global; participações em cada processo/audiência onde o nome aparece.
3. **Promotores** (idem).
4. **Vítimas** (`processos.vitima` string): pessoa + participação `papel=vitima`.
5. **Mencionados IA** (`atendimentos.enrichmentData.persons_mentioned[]`): pessoa com `fonte=ia-atendimento`, `confidence=0.5`. **SEM** participação até promoção manual. Observação cita o atendimento de origem.
6. **Mencionados em analysis_data** (`processos.analysisData.pessoas_detectadas[]` se existir): pessoa com `fonte=ia-denuncia`, participação com papel detectado pelo pipeline.

Idempotência: re-run não duplica; usa `ON CONFLICT (nome_normalizado, ...)` com estratégia de update-skip.

Output:
```
Backfill concluído em 47s
  Pessoas criadas:       823
  Pessoas atualizadas:     12 (nomes_alternativos adicionados)
  Participações criadas: 1247
  Warnings:                23 (nomes ambíguos registrados em log)
  Duplicatas sugeridas:    87 (revisar em /admin/pessoas/merge-queue)
```

### UI I-A — componentes

#### `PessoaChip` (versão silenciosa)

```tsx
interface PessoaChipProps {
  pessoaId?: number;
  nome?: string;
  papel?: string;
  size?: "xs" | "sm" | "md";
  clickable?: boolean;        // default true
  onClick?: (pessoa: PessoaResumo) => void;
}
```

Comportamento **I-A**:
- Se `pessoaId`: renderiza nome da pessoa + ícone User + papel em texto menor.
- Se só `nome`: tenta `usePessoaDoNome(nome, { papel })` hook (batch lookup por página), renderiza o chip se encontrou; senão renderiza texto plain.
- Click → abre `PessoaSheet`.
- Hover: cursor-pointer, hover bg subtle. **Sem peek.** (Peek vem em I-B.)
- Sem dots. Sem badges de intel. Só o nome.

#### `PessoaSheet` (versão silenciosa)

Sheet lateral (padrão Defender v5, 480-560px). Tabs:

- **Visão geral** — dados pessoais + resumo das participações (contagens por papel, sem ranking).
- **Processos** — lista de participações: processo · papel · data. Sem filtros avançados nem destaques.
- **Mídias** — fotos + áudios vinculados.
- **Proveniência** — fonte_criacao, confidence, merge history, audit log.

**Não tem** nesta fase: aba Depoimentos agregados, padrão de juiz, rede, alertas. Tudo isso vem em fases seguintes.

#### `/admin/pessoas` — catálogo

Listagem estilo `/admin/assistidos`:

```
┌─────────────────────────────────────────────────────────────┐
│ Pessoas · catálogo                                   [+ Nova]│
├─────────────────────────────────────────────────────────────┤
│ [🔍 busca] [papel ▾] [com processos ☐] [fonte ▾]           │
├─────────────────────────────────────────────────────────────┤
│ Nome              Papéis           Processos   Última   Conf│
│ Maria Silva       testem/vitima    3           11/25    0.9 │
│ Dr. Pedro Alencar juiz             14          04/26    0.85│
│ João da Silva     co-reu           1           03/26    0.7 │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

Sem dots coloridos. Sem badges de intel. Coluna "Conf" mostra confidence literal (0.9) — útil pra admin avaliar qualidade do backfill.

#### `/admin/pessoas/[id]` — detalhe

Mesmo conteúdo do `PessoaSheet` em layout full-page + botões de ação: Editar, Mesclar, Excluir, Imprimir (PDF de "dossiê básico"). Sem dashboards.

#### `/admin/pessoas/merge-queue` — tela de dedup

```
┌─────────────────────────────────────────────────────────────┐
│ Fila de duplicatas sugeridas (87)                            │
├─────────────────────────────────────────────────────────────┤
│ Similaridade   Contexto              Pessoa A   Pessoa B     │
│ 0.95           mesma comarca + ano   #42        #87          │
│ 0.88           mesmo papel           #103       #208         │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

Click num par abre modal side-by-side com todos os dados, processos, e 3 opções: **Mesclar em A** · **Mesclar em B** · **Marcar como distintas** (grava em `pessoas_distincts_confirmed`).

### LGPD em I-A

- **Policial, juiz, promotor, perito, servidor**: dados funcionais-públicos. Acessíveis por qualquer usuário com escopo de workspace.
- **Testemunha, vítima, informante, co-réu**: `observacoes`, `resumo_nesta_causa`, `observacoes_nesta_causa` só visíveis a usuários com acesso ao processo de origem.
- **CPF, RG, data_nascimento, telefone, endereco**: sempre sensível. Visível com escopo do processo onde aparece ou cadastro manual do defensor.
- **Merge e update**: todo evento grava em `audit_logs` (tabela já existe) com `entity_type="pessoa"`, `entity_id`, `action`, `user_id`.
- **Export em massa**: desabilitado. Download só de uma pessoa por vez (PDF do dossiê).

### Testes I-A

#### Unit
- `normalizarNome.test.ts` — 10 casos (acentos, pronomes de tratamento, pontuação, sufixos, etc)
- `pessoas-router.test.ts` — list filtros, getById, create validação, merge preserva participações
- `backfill.test.ts` — idempotência, dedup por nome_normalizado

#### Component
- `PessoaChip.test.tsx` — renderiza com pessoaId, com nome, clicável, lookup por nome
- `PessoaSheet.test.tsx` — renderiza abas, navega entre processos
- `merge-queue.test.tsx` — renderiza par, dispara merge, marca distintos

#### Integration
- Backfill em DB de teste com fixtures (50 processos, 200 testemunhas, 10 juízes) — verifica contagens esperadas
- Regression: nenhuma tabela existente modificada; tests de processos/assistidos/audiências seguem verdes

### Padrão Defender v5

- `/admin/pessoas` segue o padrão de `/admin/assistidos` (tabela com colunas, filtros laterais ou topo, ação primária no canto).
- `PessoaSheet` reusa estrutura do sheet da agenda (header sticky, tabs ou ToC, seções colapsáveis) **como componente novo separado**; zero edição nos arquivos do sheet da agenda.
- `PessoaChip` em `text-[11px]`, ícone `User` do lucide, `rounded-md px-2 py-0.5`, hover emerald subtle.
- Cores de papel (consistentes em toda a app — fundamental pra I-B):
  - `juiz`, `desembargador`, `servidor` → neutral
  - `promotor`, `procurador` → rose
  - `policial-militar`, `policial-civil`, `policial-federal`, `guarda-municipal`, `agente-penitenciario` → indigo
  - `perito-*`, `medico-*`, `psicologo-*` → violet
  - `testemunha`, `testemunha-defesa`, `informante` → emerald
  - `vitima` → amber
  - `co-reu` → slate
  - `advogado-parte-contraria` → cyan

### Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Backfill cria pessoas excessivamente duplicadas | Dedup conservadora + merge-queue grande (expected) + ferramenta rápida de merge |
| Merge errado junta pessoas distintas | `unmerge()` disponível; `merged_into` preserva audit |
| Performance lookup de chips em página cheia | `usePessoaDoNome` hook faz batch por página; cache por ID |
| pg_trgm extension não disponível em prod | Habilitada via migration; fallback: ILIKE exato |
| LGPD: observações vazando em queries list | `list` endpoint não retorna observações; só `getById` com ACL |
| Agenda fora de escopo em I-A | Hooks prontos; I-B integra quando apropriado |

### Critérios de aceitação I-A

1. Extension `pg_trgm` habilitada.
2. Tabelas `pessoas`, `participacoes_processo`, `pessoas_distincts_confirmed` criadas com índices.
3. Backfill script roda idempotente; popula todas as 6 fontes; reporta totais.
4. 14 procedures tRPC em `pessoas.*` funcionais com input validation.
5. `/admin/pessoas` lista, busca, filtra, pagina.
6. `/admin/pessoas/[id]` renderiza 4 tabs silenciosas.
7. `/admin/pessoas/merge-queue` lista sugestões e permite merge/distinct.
8. `PessoaSheet` + `PessoaChip` exportados de `src/components/pessoas/`.
9. **Nenhum outro arquivo fora de `src/components/pessoas/`, `src/lib/pessoas/`, `src/lib/trpc/routers/pessoas.ts`, `src/lib/db/schema/pessoas.ts`, `scripts/backfill-pessoas.mjs` é modificado.** I-A é silenciosa e isolada.
10. Audit logs gravados em toda mutation.
11. LGPD: observações restritas a usuários com acesso ao processo.
12. Tests unit, component, integration verdes.

### Não-escopo I-A

- Dots/sinalização nos chips → I-B
- Peek hover → I-B
- Banner de correlação → I-B
- Integração com agenda (sheet + modal) → I-B
- Aba "Pessoas" no `/admin/processos/[id]` → I-B
- Perfis agregados de juiz/promotor → III
- Confiabilidade de testemunha → IV
- Rede social e alertas → V
