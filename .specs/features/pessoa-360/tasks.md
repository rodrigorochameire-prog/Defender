# Tasks: Pessoa 360° — ondas de subagentes com posse de arquivos

> Regra anti-colisão: cada onda só roda agentes com **arquivos disjuntos**. D depende
> de A+B+C. E é contingente (verificar antes). TDD-first. Migrações hand-authored.

## Onda 1 (PARALELA — arquivos disjuntos)

### Agente A — Depoentes → pessoas
POSSE (só estes): `src/lib/promocao/adaptador-depoentes.ts` (novo),
`src/lib/promocao/tipos.ts`, `src/lib/promocao/repo.ts`, `src/lib/promocao/backfill.ts`,
`src/lib/trpc/routers/promocao.ts`, testes em `src/lib/promocao/__tests__/`.
| ID | Tarefa | Status |
|----|--------|--------|
| A1 | Teste do adapter (Vitest) primeiro | ⬜ |
| A2 | `adaptador-depoentes.ts` + suporte `testemunhaId` em tipos/repo | ⬜ |
| A3 | Concatenar em `promoverProcesso`; tRPC `backfillDepoentes` | ⬜ |

### Agente B — Geocode residências
POSSE: `src/lib/promocao/adaptador-depoentes-locais.ts` (novo),
`src/lib/promocao/backfill-locais.ts`, `src/app/api/cron/geocode-faltantes/route.ts` (novo),
testes próprios.
| ID | Tarefa | Status |
|----|--------|--------|
| B1 | Teste do adapter de locais primeiro | ⬜ |
| B2 | `adaptador-depoentes-locais.ts` + incluir em `promoverLocaisProcesso` | ⬜ |
| B3 | Cron `geocode-faltantes` chamando `geocodificarFaltantes` | ⬜ |

### Agente C — Familiares (schema + backfill + tRPC)
POSSE: `src/lib/db/schema/pessoas.ts`, `drizzle/0056_pessoa_relacoes.sql` (novo),
`src/lib/promocao/backfill-familiares.ts` (novo), `src/lib/trpc/routers/pessoas.ts`,
testes próprios.
| ID | Tarefa | Status |
|----|--------|--------|
| C1 | Tabela `pessoa_relacoes` + migração hand-authored aditiva | ⬜ |
| C2 | Teste de mapeamento texto→relação; `backfill-familiares.ts` | ⬜ |
| C3 | tRPC getFamiliares/addFamiliar/removeFamiliar | ⬜ |

### Agente E-verify (READ-ONLY — sem posse, não escreve)
Verifica onde o vetor de embeddings vive (migrações SQL + `enrichment-engine/services/*embedding*`),
dimensão, e se `document_embeddings`/`embeddings` têm storage vetorial. Retorna recomendação. NÃO codar.

> ⚠️ Conflito conhecido: `src/lib/trpc/routers/pessoas.ts` é tocado por C (Onda 1) e
> por D (Onda 2). Por isso D fica em onda separada — nunca paralelo a C.

## Onda 2 (após A+B+C integrados e verdes)

### Agente D — Ficha 360°
POSSE: `src/app/(dashboard)/admin/pessoas/[id]/` (page + _components),
`src/lib/pessoas/calcular-idade.ts` (novo), `src/lib/trpc/routers/pessoas.ts`
(`getEnvolvimento`), testes próprios.
| ID | Tarefa | Status |
|----|--------|--------|
| D1 | `calcular-idade.ts` + teste | ⬜ |
| D2 | `pessoas.getEnvolvimento` (agrega processos/papéis) | ⬜ |
| D3 | Ficha: demografia + envolvimento + familiares + mapa | ⬜ |

## Onda 3 (contingente ao E-verify)
### Agente E — embeddings ↔ pessoa
Só se E-verify confirmar viabilidade: `document_embeddings.pessoa_id` + populate + 1 query.

## Integração (eu, entre ondas)
- Após cada onda: `npm run test` global + `npx tsc --noEmit`; revisar diffs; só então liberar a próxima onda.
