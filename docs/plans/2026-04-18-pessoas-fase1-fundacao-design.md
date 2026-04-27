# Pessoas · Fase I · Fundação — Design

**Data:** 2026-04-18
**Status:** Design aprovado — aguardando plano de implementação
**Escopo:** Introduzir entidade global `pessoas` + relação N:N `participacoes_processo`, backfill das strings existentes, UI de catálogo (`/admin/pessoas`) e componentes reutilizáveis (`PessoaSheet`, `PessoaChip`). Preparar integração com agenda sem tocá-la (agenda está em edição paralela).
**Fases seguintes (specs separados):** Fase II Extração IA · Fase III Perfis Juiz/Promotor · Fase IV Testemunha inteligente · Fase V Rede social + alertas.

---

## Contexto

Hoje OMBUDS modela pessoas não-assistidas como strings espalhadas: `testemunhas.nome`, `audiencias.juiz`, `processos.promotor`, `processos.vitima`, `atendimentos.enrichmentData.persons_mentioned[]`. Cada processo é uma ilha — impossível cross-reference. "Maria Silva" que depôs em 3 casos aparece 3 vezes sem link entre ocorrências. Juiz com 40 casos é 40 strings idênticas. Isso bloqueia:

- Perfil de confiabilidade de testemunha
- Padrão de decisão de juiz / promotor
- Rede social do assistido (quem conhece quem)
- Alertas cross-case ("vítima do caso novo já esteve em outro caso seu")

A Fase I entrega a **fundação**: catálogo global de pessoas + relação N:N com processos, sem implementar ainda a inteligência agregada (que vem nas fases seguintes).

## Objetivo

Transformar o universo de strings de pessoas em um grafo navegável. Deliverables:

1. Schema novo sem quebrar tabelas existentes.
2. Backfill one-shot populando `pessoas` a partir dos dados existentes.
3. Página `/admin/pessoas` com catálogo buscável e detalhe.
4. `PessoaSheet` e `PessoaChip` reutilizáveis em qualquer página.
5. Aba "Pessoas" em `/admin/processos/[id]`.
6. UI de merge-queue para desambiguação.
7. Integração com agenda: **não implementada neste plano** — entregue como hooks prontos que a sessão de agenda consome quando reabrir. Agenda está congelada por decisão do usuário.

## Decisões de design validadas no brainstorming

| Decisão | Escolha | Racional |
|---|---|---|
| Entidade central | `pessoas` (global, não por processo) | Cross-reference só funciona com entidade única |
| Relação pessoa-processo | N:N via `participacoes_processo` com `papel` | Mesma pessoa pode ser testemunha em um caso e juiz em outro (hipoteticamente) |
| Deduplicação automática | **NÃO** — conservador por default | Falsos positivos em "João Silva" destroem confiança; humano confirma merges |
| Integração com `testemunhas` existente | FK opcional `participacoes_processo.testemunha_id` | Preserva dados ricos de testemunhas (sinteseJuizo, audioDriveFileId) sem duplicação |
| Proveniência | campo `fonte` + `confidence` em todas tabelas | Auditabilidade + permite priorizar entradas de IA vs manuais |
| Soft-merge | `merged_into` + preservar registro original | Undo simples; não perde histórico |
| Escopo Fase I | **só fundação**, sem perfis agregados nem alertas | Fases II-V dependem dessa base e viram cada uma seu spec |

## Arquitetura

### Schema novo — 2 tabelas

```sql
CREATE TABLE pessoas (
  id                serial PRIMARY KEY,
  nome              text NOT NULL,
  nome_normalizado  text NOT NULL,
  nomes_alternativos jsonb DEFAULT '[]'::jsonb,
  cpf               varchar(14) UNIQUE,
  rg                text,
  data_nascimento   date,
  telefone          text,
  endereco          text,
  foto_drive_file_id varchar(100),
  observacoes       text,
  fonte_criacao     varchar(40) NOT NULL,
  criado_por        integer REFERENCES users(id),
  confidence        numeric(3,2) DEFAULT 1.0 NOT NULL,
  merged_into       integer REFERENCES pessoas(id),
  merge_reason      text,
  created_at        timestamp DEFAULT now() NOT NULL,
  updated_at        timestamp DEFAULT now() NOT NULL
);

CREATE INDEX pessoas_nome_norm_idx ON pessoas(nome_normalizado);
CREATE INDEX pessoas_nome_trgm_idx ON pessoas USING gin(nome_normalizado gin_trgm_ops);
CREATE INDEX pessoas_merged_idx ON pessoas(merged_into) WHERE merged_into IS NOT NULL;

CREATE TABLE participacoes_processo (
  id                      serial PRIMARY KEY,
  pessoa_id               integer NOT NULL REFERENCES pessoas(id) ON DELETE CASCADE,
  processo_id             integer NOT NULL REFERENCES processos(id) ON DELETE CASCADE,
  papel                   varchar(30) NOT NULL,
  lado                    varchar(20),
  testemunha_id           integer REFERENCES testemunhas(id),
  resumo_nesta_causa      text,
  observacoes_nesta_causa text,
  audio_drive_file_id     varchar(100),
  fonte                   varchar(40) NOT NULL,
  confidence              numeric(3,2) DEFAULT 1.0 NOT NULL,
  created_at              timestamp DEFAULT now() NOT NULL,
  updated_at              timestamp DEFAULT now() NOT NULL,
  UNIQUE(pessoa_id, processo_id, papel)
);

CREATE INDEX participacoes_pessoa_idx ON participacoes_processo(pessoa_id);
CREATE INDEX participacoes_processo_idx ON participacoes_processo(processo_id);
CREATE INDEX participacoes_papel_idx ON participacoes_processo(papel);
```

**Extension**: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` para busca fuzzy.

**Papéis válidos** (enum implícito via check — ou enum real se preferir):

```
testemunha | vitima | juiz | promotor | co-reu | advogado-parte-contraria |
informante | perito | policial | oficial-justica | servidor | outro
```

### Normalização

Função `normalizarNome(s: string): string`:

```ts
export function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

Aplicada sempre antes de insert/update. Índice único pessoas(nome_normalizado) **não imposto** — permite homônimos intencionais.

### tRPC router `pessoas.ts`

```
list({ search?, papel?, hasProcessos?, limit=50, offset=0 })    // lista pesquisável
getById({ id })                                                  // detalhe + participações expandidas
getByCpf({ cpf })                                                // lookup ground-truth
create({ nome, cpf?, rg?, data_nascimento?, telefone?, endereco?, observacoes?, fonte_criacao })
update({ id, ...fields })
delete({ id })                                                   // soft-delete via merged_into=self? ou hard delete
searchForLink({ query, papel? })                                 // autocomplete em forms
suggestMerges({ pessoaId })                                      // retorna similares no mesmo contexto
merge({ fromId, intoId, reason })                                // move participacoes + marca merged_into
unmerge({ pessoaId })                                            // desfaz último merge
linkTestemunha({ pessoaId, testemunhaId })                       // liga participacao a uma testemunha existente
getParticipacoes({ pessoaId })                                   // todos processos da pessoa com papel
```

Zero mutations novas em tabelas pré-existentes. Apenas CRUD sobre as novas.

### Script de backfill

`scripts/backfill-pessoas.mjs` — idempotente, transacional, executável via node direto (mesmo padrão das migrations das Fases 1-4).

Fluxo:

1. Para cada `testemunhas` row: cria pessoa (ou reutiliza se nome_normalizado já existe) + participação com papel derivado do `tipo` (`testemunha`/`vitima`/`informante`/`perito`). `confidence=0.9`. Link em `participacao.testemunha_id`.
2. Para cada distinct `processos.juiz` não-vazio: cria pessoa papel=juiz + participação. `confidence=0.85` (só nome, sem CPF).
3. Para cada distinct `processos.promotor` não-vazio: idem.
4. Idem para `audiencias.juiz`, `audiencias.promotor` (pode haver overlap com processos — consolida).
5. Para cada `processos.vitima` string não-vazia: cria pessoa papel=vitima + participação.
6. Para cada `atendimentos.enrichmentData.persons_mentioned[]`: cria pessoa com `fonte=ia-atendimento` e `confidence=0.5`. **SEM** participação (fica em "limbo" até promoção manual). Observação no campo `observacoes` citando o atendimento.
7. Report final: total pessoas criadas, participações criadas, duplicatas encontradas por nome_normalizado, warnings.

Pode rodar em `--dry-run` primeiro.

### UI

#### Rota `/admin/pessoas`

Página de catálogo — tabela ou grid (seguindo padrão de assistidos).

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍 busca]   [filtro papel ▾] [com processos ☐] [+ Nova]   │
├─────────────────────────────────────────────────────────────┤
│ Maria Silva · 📍 3 processos · testemunha/vítima · conf 0.9 │
│ Dr. Pedro Alencar · 📍 14 processos · juiz · conf 0.85      │
│ João da Silva · 📍 1 processo · co-réu · conf 0.7           │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

Colunas: Nome, Papéis principais (top 2), # processos, Última atividade, Confidence.

Filtros: papel, tem/não tem processos, fonte de criação, range de confidence.

Busca: `nome_normalizado ILIKE '%query%'` + ordenação trigram-similarity quando query >= 3 chars.

Paginação: 50 por página.

#### Rota `/admin/pessoas/[id]`

Detalhe com 5 tabs:

- **Visão geral** — dados pessoais editáveis + resumo de participações (count por papel) + proveniência.
- **Processos** — lista de participações com papel, processo, data. Link para cada.
- **Depoimentos** — se pessoa tem participação como testemunha/vítima com `testemunha_id` vinculado, mostra agregação dos `resumoDepoimento`/`versao_delegacia`/`sinteseJuizo` dos diferentes casos. Útil pra ver contradições entre depoimentos em casos diferentes.
- **Mídias** — áudios/vídeos de todos os `participacoes_processo.audio_drive_file_id` + foto.
- **Atividade IA** — proveniência: de onde veio (atendimento X, denúncia Y), confidence, histórico de merges.

#### Componente `PessoaSheet` (reutilizável)

Sheet lateral seguindo padrão Defender v5 (como o sheet de audiência).

```tsx
<PessoaSheet
  pessoaId={number | null}
  open={boolean}
  onOpenChange={(o: boolean) => void}
/>
```

Renderiza preview do mesmo conteúdo da página de detalhe (visão geral + processos), com botão "Abrir página completa" no footer. Permite navegação rápida sem perder contexto.

#### Componente `PessoaChip` (reutilizável)

```tsx
<PessoaChip
  nome="Maria Silva"                      // ou pessoaId direto
  pessoaId={number | null}
  papel?="testemunha"
  onClick={(p: Pessoa) => void}            // default: abrir PessoaSheet
/>
```

Renderiza chip pequeno com ícone de pessoa, nome truncado, papel em texto menor se fornecido. Hover mostra card tooltip com "X processos" + papéis.

Se `pessoaId` ausente mas `nome` presente → faz lookup via `trpc.pessoas.searchForLink({ query: nome })` e mostra "vincular" se achar match, ou "criar nova" se não.

**Destinatário principal**: outras páginas (Processo, Assistido, Atendimento, Audiência). Quando a agenda descongelar, sua sessão plugará `<PessoaChip>` onde hoje tem `string` de nome.

#### Aba "Pessoas" em `/admin/processos/[id]`

Nova aba na tabstrip do processo, antes de "Drive" talvez. Lista `participacoes_processo WHERE processo_id = X` agrupada por papel:

```
JUÍZES (1)
  Dr. Pedro Alencar  [sheet]

PROMOTORES (1)
  Dra. Ana Costa  [sheet]

TESTEMUNHAS (3)
  Maria Silva · Ouvida · [sheet]
  João Santos · Arrolada · [sheet]
  ...

VÍTIMAS (1)
  ...
```

#### UI de merge — `/admin/pessoas/merge-queue`

Lista pares/grupos de pessoas com nome_normalizado igual ou trigram-similarity > 0.85 no mesmo contexto.

```
┌───────────────────────────────────────────────────────────┐
│ Possível duplicata: "Maria Silva"                          │
├────────────────────────┬──────────────────────────────────┤
│ Pessoa #42             │ Pessoa #87                       │
│ Maria Silva            │ Maria Silva                      │
│ CPF: —                 │ CPF: —                           │
│ 2 processos (VVD)      │ 1 processo (VVD)                 │
│ Papel: testemunha      │ Papel: testemunha                │
│ Comarca: Camaçari      │ Comarca: Camaçari                │
│ Criada: 10/04/2026     │ Criada: 15/04/2026               │
├────────────────────────┴──────────────────────────────────┤
│   [✓ São a mesma · mesclar em #42]                        │
│   [✗ São distintas · marcar como diferentes]              │
│   [⋯ Ver processos de ambas]                              │
└───────────────────────────────────────────────────────────┘
```

"Marcar como distintas" grava flag `pessoas_distincts_confirmed` para nunca mais sugerir o mesmo par (tabela pequena só com par de ids).

### Fluxos

**Fluxo 1 — Navegação rápida de audiência** (disponível após integração futura):
Defensor abre sheet da audiência, vê "Maria Silva" como depoente → click no chip → `PessoaSheet` abre → vê 2 outros processos em que ela foi testemunha → decide estratégia.

**Fluxo 2 — Primeiro contato com pessoa nova no atendimento**:
IA do enrichment extrai `persons_mentioned` do atendimento → pessoa é criada com `fonte=ia-atendimento, confidence=0.5` → aparece no bloco "Mencionados" do atendimento com chip → defensor decide se vincula ao processo atual como testemunha.

**Fluxo 3 — Merge de duplicatas**:
Sistema detecta "Maria Silva" em 2 registros com mesma comarca → aparece em `/admin/pessoas/merge-queue` → defensor decide → processos/participações consolidam.

**Fluxo 4 — Pessoa nova manual**:
Defensor usa `PessoaChip` em formulário de testemunha → digita nome → autocomplete mostra matches → seleciona existente ou cria nova → participação linkada automaticamente.

## LGPD e permissões

- **Juízes/promotores**: dados são públicos profissionais. Sem restrição adicional.
- **Testemunhas/vítimas**: `observacoes` e `resumo_nesta_causa` visíveis apenas para usuários com acesso ao processo de origem.
- **CPF/RG/Endereço**: sempre sensíveis. Só visíveis via ACL de escopo (mesmo escopo do assistido).
- **Merge/update**: sempre grava em `audit_logs` (via hook existente).
- **Exportação**: página de pessoa NÃO permite exportar dados em massa (guard contra data scraping interno).

## Testes

### Unit
- `normalizarNome.test.ts` — 8 casos (acentos, pontuação, múltiplos espaços, etc).
- `pessoas-router.test.ts` — list, getById, create, merge (preserva participações), unmerge.

### Component (RTL + happy-dom)
- `PessoaChip.test.tsx` — renderiza nome, lookup por nome, fallback.
- `PessoaSheet.test.tsx` — abre/fecha, renderiza abas, navega.
- `merge-queue.test.tsx` — renderiza pares, dispara merge com decisão.

### Integration
- Backfill script em DB de teste — verifica contagem de pessoas criadas = testemunhas + distinct juízes + distinct promotores + vítimas + persons_mentioned (com dedup por nome).

### Regression
- Nenhuma tabela existente é modificada → regressões em assistidos, processos, audiências devem continuar verdes.

## Padrão Defender v5

- `/admin/pessoas` segue padrão de listagem usado em `/admin/assistidos` (estrutura de tabela/grid, filtros laterais, ação "Nova").
- `PessoaSheet` — mesma estrutura de `event-detail-sheet.tsx` (header sticky, ToC de chips, seções colapsáveis) mas **componente novo, independente** (não modifica o sheet de audiência).
- `PessoaChip` — rounded-full, ícone Lucide `User`, text-[11px], hover com tooltip card.
- Cores de papel: juiz (neutral), promotor (rose), testemunha (emerald), vítima (amber), co-réu (slate).

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Dedup agressivo mistura pessoas distintas | Default conservador: cria separado, merge só com confirmação manual |
| Backfill lento com 150+ processos | Batch de 100, transaction por batch, log de progresso |
| Merge errado (perde histórico) | `merged_into` + `merge_reason` preservam audit trail, `unmerge()` disponível |
| Performance do trigram em 10k+ pessoas | Índice GIN já cobre; fallback: primeiro filtra exact match depois trigram |
| Agenda quer integrar mas está congelada | `PessoaChip` e `PessoaSheet` ficam prontos e documentados; sessão de agenda integra quando reabrir |
| LGPD em perfis de testemunhas | ACL por escopo + audit_logs + sem exportação em massa |

## Não-escopo (Fases seguintes)

- Extração automática via IA — Fase II.
- Perfis agregados de Juiz/Promotor — Fase III.
- Confiabilidade/contradições de testemunha — Fase IV.
- Relações entre pessoas + grafo — Fase V.
- Alertas cross-case proativos — Fase V.
- Merge automático sem confirmação — sempre fora de escopo (perigoso).

## Critérios de aceitação

1. Migração cria `pessoas` + `participacoes_processo` com todos índices.
2. `pg_trgm` extension habilitada.
3. Script de backfill roda sem erro em DB de teste e popula:
   - 1 pessoa para cada testemunha existente
   - 1 pessoa para cada juiz/promotor distinct em processos + audiencias
   - 1 pessoa para cada vítima string
   - 1 pessoa para cada `persons_mentioned[]` do enrichment
4. Participações têm `fonte`, `confidence`, e (quando aplicável) `testemunha_id` preenchidos.
5. tRPC `pessoas.*` — 11 procedures funcionais.
6. `/admin/pessoas` renderiza catálogo com busca, filtros, paginação.
7. `/admin/pessoas/[id]` renderiza 5 tabs.
8. `PessoaSheet` e `PessoaChip` exportados de `src/components/pessoas/` para uso em outras páginas.
9. `/admin/processos/[id]` ganha aba "Pessoas" listando participações.
10. `/admin/pessoas/merge-queue` funcional com merge/unmerge.
11. LGPD: `observacoes` e `resumo_nesta_causa` só visíveis para usuários com acesso ao processo.
12. Agenda NÃO é tocada — nenhuma edição em `event-detail-sheet.tsx`, `registro-audiencia/**`.
13. Tests unitários, componente e regression verdes.
