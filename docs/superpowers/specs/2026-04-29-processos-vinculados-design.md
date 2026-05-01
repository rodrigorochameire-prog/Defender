# Processos Vinculados (Referência) — Design

**Data:** 2026-04-29
**Autor:** Rodrigo Rocha Meire (com Claude)
**Status:** Aguardando merge da `feat/registros-tipados`

## Objetivo

Tornar de primeira-classe na UI o relacionamento entre **processo principal e processos incidentais/apartados** (revogação, MPU, HC, recursos, IP) — leitura na ficha do assistido e na página do processo, e criação rápida a partir da página de demandas quando o defensor protocola peça em autos apartados.

## Motivação

A infra de banco já existe (`processos.tipoProcesso`, `processos.processoOrigemId`, `processos.casoId`, `processos.isReferencia`), mas:

- A UI de "Processos vinculados" no `<ProcessoHeader>` agrupa apenas via `casoId` e mostra apenas `assistidosNomes`, sem distinguir tipo nem hierarquia
- Não há fluxo para criar um processo apartado a partir de uma demanda existente — hoje o defensor precisa ir em `/admin/processos/novo`, lembrar de marcar o `casoId` correto e voltar manualmente
- Na ficha do assistido, processos do mesmo caso aparecem em lista plana, sem agrupamento visual

Caso real motivador: pedido de revogação de prisão preventiva do assistido João Batista Souza Falck Junior — distribuído em autos apartados (8011095-45.2026.8.05.0039) vinculados à AP principal (8000166-50.2026.8.05.0039). Hoje os dois aparecem como processos paralelos, sem visualização da relação incidental → principal.

## Escopo

**Inclui:**
1. Distinguir tipo de processo no card de "Processos vinculados" (badge `AP`, `REVOGAÇÃO`, `MPU`, `IP`, `RECURSO`, `HC`)
2. Botão "Novo processo vinculado" na página do processo principal (header + tab "Vinculados") e na ficha do assistido
3. Atalho na página de demandas: ao criar/editar uma demanda do tipo recursal/incidental, oferecer "Marcar como autos apartados" (cria processo novo + casoId compartilhado + transfere a demanda)
4. Aba "Processos" na ficha do assistido agrupada por caso (AP no topo + vinculados embaixo com indentação)
5. Endpoint tRPC unificado `processos.vinculados` que aceita `processoId` ou `casoId` e retorna a hierarquia

**Não inclui (YAGNI):**
- Migração automática de processos antigos para `casoId` (manual via script quando necessário)
- Vinculação cross-assistido (autos do mesmo fato com co-réus diferentes — usar `caso_conexo_id`, fica para depois)
- Drag-and-drop para reordenar hierarquia
- Visualização em árvore graphica (lista hierárquica simples basta)

## Arquitetura

### Modelo de dados (sem mudança de schema)

Usar campos já existentes:

| Campo | Uso |
|---|---|
| `processos.casoId` | Agrupador horizontal — todos os processos do mesmo evento jurídico |
| `processos.tipoProcesso` | Discriminador semântico (`AP`, `REVOGACAO`, `MPU`, `IP`, `RECURSO`, `HC`, `EP`...) |
| `processos.processoOrigemId` | Hierarquia vertical — incidental aponta para principal (já usado em 2º grau) |
| `processos.isReferencia` | Flag para "processo só de referência" (não houve atuação direta, ex.: IP da DEAM) |

**Convenção:** Em um caso novo, o primeiro processo cadastrado é o "principal" (`processoOrigemId=null`). Incidentais subsequentes recebem `processoOrigemId={id do principal}` + mesmo `casoId`. Caso o defensor cadastre o incidental antes (cenário real), vincular depois via "Marcar como vinculado a..." (botão na header).

### Tipos de processo (enum)

Hoje `tipoProcesso` é `varchar(30)` livre. Não criar enum PostgreSQL ainda (evitar migration pesada), mas **estabelecer constante TS canônica**:

```ts
// src/lib/processos/tipos.ts
export const TIPOS_PROCESSO = {
  AP:        { label: "Ação Penal",         badge: "AP",        color: "slate"   },
  IP:        { label: "Inquérito Policial", badge: "IP",        color: "neutral" },
  MPU:       { label: "Medida Protetiva",   badge: "MPU",       color: "amber"   },
  REVOGACAO: { label: "Revogação",          badge: "Revogação", color: "blue"    },
  HC:        { label: "Habeas Corpus",      badge: "HC",        color: "rose"    },
  RECURSO:   { label: "Recurso",            badge: "Recurso",   color: "violet"  },
  EP:        { label: "Execução Penal",     badge: "EP",        color: "blue"    },
  PEDIDO:    { label: "Pedido Apartado",    badge: "Apartado",  color: "indigo"  },
} as const;
export type TipoProcesso = keyof typeof TIPOS_PROCESSO;
```

Render em `<ProcessoTipoBadge tipo={p.tipoProcesso} />` (componente novo).

### tRPC: novo procedure `processos.vinculados`

Hoje a vinculação está embutida em `processos.getById` (linha 247-307). Extrair:

```ts
// src/lib/trpc/routers/processos.ts
vinculados: protectedProcedure
  .input(z.object({
    processoId: z.number().optional(),
    casoId: z.number().optional(),
    excluirId: z.number().optional(),  // p/ não retornar o "self"
  }))
  .query(async ({ ctx, input }) => {
    if (!input.processoId && !input.casoId) return [];

    let casoId = input.casoId;
    if (!casoId && input.processoId) {
      const [p] = await ctx.db.select({ casoId: processos.casoId })
        .from(processos).where(eq(processos.id, input.processoId)).limit(1);
      casoId = p?.casoId ?? undefined;
      if (!casoId) {
        // Fallback: vinculados via processoOrigemId
        const ladders = await ctx.db.select({...}).from(processos)
          .where(or(
            eq(processos.processoOrigemId, input.processoId),
            eq(processos.id, input.processoId), // ele mesmo, p/ achar pai
          ));
        // ...
        return ladders;
      }
    }

    const rows = await ctx.db.select({
      id: processos.id,
      numeroAutos: processos.numeroAutos,
      tipoProcesso: processos.tipoProcesso,
      processoOrigemId: processos.processoOrigemId,
      classeProcessual: processos.classeProcessual,
      situacao: processos.situacao,
    }).from(processos).where(and(
      eq(processos.casoId, casoId),
      input.excluirId ? ne(processos.id, input.excluirId) : undefined,
      isNull(processos.deletedAt),
    ));

    // Já retorna ordenado: principal primeiro (processoOrigemId nulo), incidentais depois
    return rows.sort((a, b) => {
      if (a.processoOrigemId === null && b.processoOrigemId !== null) return -1;
      if (b.processoOrigemId === null && a.processoOrigemId !== null) return 1;
      return a.id - b.id;
    });
  }),
```

### tRPC: novo procedure `processos.criarVinculado`

```ts
criarVinculado: protectedProcedure
  .input(z.object({
    processoOrigemId: z.number(),
    numeroAutos: z.string(),
    tipoProcesso: z.enum(["REVOGACAO","HC","RECURSO","MPU","IP","PEDIDO"]),
    classeProcessual: z.string().optional(),
    assunto: z.string().optional(),
    moverDemandaId: z.number().optional(), // se vier, transfere a demanda
  }))
  .mutation(async ({ ctx, input }) => {
    return await ctx.db.transaction(async (tx) => {
      const [origem] = await tx.select().from(processos)
        .where(eq(processos.id, input.processoOrigemId)).limit(1);
      if (!origem) throw new TRPCError({ code: "NOT_FOUND" });

      // Garantir caso comum
      let casoId = origem.casoId;
      if (!casoId) {
        const [novo] = await tx.insert(casos).values({
          titulo: `${origem.assistido.nome} — ${origem.area}`,
          atribuicao: mapAreaParaAtribuicao(origem.area),
          assistidoId: origem.assistidoId,
          defensorId: ctx.session.user.id,
          status: "ativo",
        }).returning({ id: casos.id });
        casoId = novo.id;
        await tx.update(processos).set({ casoId }).where(eq(processos.id, origem.id));
      }

      const [novoProc] = await tx.insert(processos).values({
        assistidoId: origem.assistidoId,
        numeroAutos: input.numeroAutos,
        comarca: origem.comarca,
        vara: origem.vara,
        area: origem.area,
        classeProcessual: input.classeProcessual,
        assunto: input.assunto,
        tipoProcesso: input.tipoProcesso,
        processoOrigemId: origem.id,
        casoId,
        defensorId: ctx.session.user.id,
        situacao: "ativo",
      }).returning();

      if (input.moverDemandaId) {
        await tx.update(demandas)
          .set({ processoId: novoProc.id })
          .where(eq(demandas.id, input.moverDemandaId));
      }
      return novoProc;
    });
  }),
```

### Componentes UI

**1. `<ProcessoTipoBadge>`**

```tsx
// src/components/processo/processo-tipo-badge.tsx
export function ProcessoTipoBadge({ tipo, className }: { tipo: string | null; className?: string }) {
  const cfg = TIPOS_PROCESSO[tipo as TipoProcesso] ?? TIPOS_PROCESSO.AP;
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium",
      `bg-${cfg.color}-100 text-${cfg.color}-700 dark:bg-${cfg.color}-900/30 dark:text-${cfg.color}-400`,
      className,
    )}>
      {cfg.badge}
    </span>
  );
}
```

**2. `<ProcessosVinculadosList>` (substitui o bloco atual no `<ProcessoHeader>`)**

```tsx
// src/components/processo/processos-vinculados-list.tsx
interface Props {
  processoId: number;
  showCreateButton?: boolean;
}
export function ProcessosVinculadosList({ processoId, showCreateButton }: Props) {
  const { data: vinculados } = api.processos.vinculados.useQuery({ processoId, excluirId: processoId });
  const principal = vinculados?.find(p => p.processoOrigemId === null);
  const incidentais = vinculados?.filter(p => p.processoOrigemId !== null) ?? [];

  return (
    <div className="space-y-1.5">
      {principal && <ProcessoVinculadoRow proc={principal} hierarchy="principal" />}
      {incidentais.map(p => (
        <ProcessoVinculadoRow key={p.id} proc={p} hierarchy="incidental" />
      ))}
      {showCreateButton && (
        <NovoProcessoVinculadoButton processoOrigemId={processoId} />
      )}
    </div>
  );
}
```

**3. `<NovoProcessoVinculadoButton>`** + `<NovoProcessoVinculadoDialog>`

Dialog com 4 campos: número dos autos, tipo (select com badges), assunto opcional, comarca herdada do principal. Submit chama `processos.criarVinculado`.

**4. Botão "Marcar como autos apartados" na demanda**

Em `<DemandasPremiumView>`, quando uma demanda está com status `7_PROTOCOLADO` ou similar, exibir um menu kebab com a opção "Mover para autos apartados". Abre o mesmo dialog acima, mas passando `moverDemandaId={demanda.id}`. Ao concluir, a demanda agora pertence ao processo novo, e a timeline de registros viaja com ela (já que `registros.processoId` é set null on delete, mas `registros.demandaId` permanece).

**5. Aba "Processos" agrupada na ficha do assistido**

Em `src/app/(dashboard)/admin/assistidos/[id]/page.tsx`, na aba "Processos", agrupar por `casoId`:

```tsx
{casos.map(caso => (
  <div key={caso.id} className="space-y-1 mb-4">
    <h3 className="text-sm font-semibold">{caso.titulo}</h3>
    <ProcessosVinculadosList processoId={caso.processoPrincipalId} />
  </div>
))}
{processosOrfaos.length > 0 && (
  <div className="space-y-1">
    <h3 className="text-sm text-muted-foreground italic">Sem caso vinculado</h3>
    {processosOrfaos.map(p => <ProcessoCard proc={p} />)}
  </div>
)}
```

## UX

**Cenário 1 — Defensor protocola pedido de revogação:**

1. Está na demanda "Apresentar revogação" (já aberta na AP)
2. Clica menu kebab → "Mover para autos apartados"
3. Dialog: preenche número 8011095-45..., tipo "REVOGAÇÃO"
4. Confirm → demanda muda de processo, redireciona para o novo processo
5. AP do header agora mostra "1 incidental: REVOGAÇÃO 8011095..." na seção de vinculados

**Cenário 2 — Defensor abre uma AP do João:**

- Header mostra: badge `AP`, número, assistido, comarca
- Logo abaixo, seção "Processos vinculados (1)" com card pequeno: badge `REVOGAÇÃO`, número, status atual, link
- Clica no card → vai pro processo de revogação

**Cenário 3 — Defensor abre a ficha do assistido:**

- Aba "Processos" mostra:
  - **Caso 62: Joao Batista — VVD**
    - `[AP]` 8000166-50... — Vara VVD Camaçari
      - `[REVOGAÇÃO]` 8011095-45... (incidental)

## Migração

Sem migration de schema (tudo já existe). Apenas:

1. Script para preencher `casoId` retroativamente em processos órfãos compartilhando assistido + comarca + área (opcional, em outra branch)
2. Script para inferir `tipoProcesso` a partir de `classeProcessual` em processos antigos (heurística)

## Riscos / Edge cases

| Risco | Mitigação |
|---|---|
| Defensor cria incidental sem `casoId` (processo órfão) | Botão "Vincular a processo existente..." na header do processo, lista assistido em comum |
| Múltiplos vinculados com mesmo número (duplicata) | Unique parcial em `(numero_autos) WHERE deleted_at IS NULL` (já existe? conferir) |
| Tipo de processo livre (varchar) — typo | Constraint check ou enum PostgreSQL — adiar, validar no Zod por enquanto |
| Caso conexo entre assistidos diferentes | Usar `caso_conexo_id` (já existe, sem implementação UI) — escopo separado |

## Implementação faseada

**Fase 1 (~1 dia):**
- `<ProcessoTipoBadge>` + constantes em `tipos.ts`
- Refazer `<ProcessoHeader>` para mostrar tipo + hierarquia
- `processos.vinculados` extraído + renderiza no header

**Fase 2 (~1 dia):**
- `criarVinculado` mutation + `<NovoProcessoVinculadoDialog>`
- Botão na header do processo principal

**Fase 3 (~½ dia):**
- Botão "Mover para autos apartados" na demanda
- Aba "Processos" agrupada na ficha do assistido

**Fase 4 (~½ dia):**
- Script de inferência de `tipoProcesso` em processos antigos
- Documentação no `AGENTS.md` + skill `/peca-vvd` (atualizar para criar processo vinculado quando peça é recursal/incidental)

## Self-Review

- ✅ Sem mudança de schema (zero migration)
- ✅ Reaproveita `casoId` existente
- ✅ Compatível com a UI hoje (degrada graciosamente para `casoId`-only)
- ✅ Permite criação a partir da demanda (caso de uso real)
- ✅ Não bloqueado pela `feat/registros-tipados` (orthogonal — registros viajam com `demandaId`)
- ⚠ `tipoProcesso` permanece varchar — risco de typo controlado via Zod + constante TS
