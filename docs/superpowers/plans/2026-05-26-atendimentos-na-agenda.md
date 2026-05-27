# Atendimentos na Agenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer atendimentos agendados (tabela `registros`, `tipo='atendimento'`, `status='agendado'`) aparecerem na agenda com marcação visual distinta das audiências, e religar o botão `+` da agenda à funcionalidade real de atendimentos.

**Architecture:** Terceira fonte na agregação client-side que já existe (`audiencias` + `calendar_events` + agora `registros`). Backend ganha `registros.agendar` (agendar atendimento) e `registros.listAgendados` (leitura escopada por defensor), e `registros.update` passa a aceitar `status` (marcar como realizado). Sem migration — reusa a tabela `registros`.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, PostgreSQL, Zod, Vitest, Tailwind, Lucide.

**Spec:** `docs/superpowers/specs/2026-05-26-atendimentos-na-agenda-design.md`

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/agenda/agenda-item.ts` (Create) | Tipo `AgendaItem` extraído da page + mapper puro `registroAgendadoToAgendaItem` |
| `src/lib/agenda/agenda-item-visual.ts` (Create) | Helper puro `agendaItemVisual(item)` → `{ natureza, dashed, icon }` |
| `src/lib/trpc/routers/registros.ts` (Modify) | `agendar` (nova), `listAgendados` (nova), `update` (+ `status`) |
| `src/app/(dashboard)/admin/agenda/page.tsx` (Modify) | importa `AgendaItem`, query `listAgendados`, 3º loop, ramificação do `+`, ação "realizar" |
| `src/components/agenda/calendar-month-view.tsx` (Modify) | chip de atendimento (anel + `Users`) |
| `src/components/agenda/calendar-week-view.tsx` (Modify) | chip de atendimento (anel + `Users`) |
| `__tests__/unit/*.test.ts` (Create) | cobertura dos mappers e schemas Zod |

**Padrão de teste do repo:** Vitest, testes de função pura e schema Zod em `__tests__/unit/`. NÃO existe harness de integração tRPC contra DB — não invente um. Lógica testável é extraída para funções puras; fiação tRPC/UI é verificada por `npm run build` (typecheck) + teste manual no browser.

---

## Task 1: Extrair o tipo `AgendaItem` para um módulo próprio

Hoje `AgendaItem` é declarado inline em `page.tsx` (linhas ~104-135). Extrair para um módulo permite testar mappers puros que produzem `AgendaItem`.

**Files:**
- Create: `src/lib/agenda/agenda-item.ts`
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx:104-135`

- [ ] **Step 1: Criar o módulo com o tipo**

Copiar a interface exatamente como está na page, ampliando o union `fonte` com `"registros"`:

```ts
// src/lib/agenda/agenda-item.ts
import type { RegistroAudienciaData } from "@/components/agenda/registro-audiencia-modal-simples";

export interface AgendaItem {
  /** Id composto para React keys e lookup (ex: "audiencia-179", "registro-42"). */
  id: string;
  /** Id numérico cru da fonte (audiencias.id, calendar_events.id OU registros.id). */
  rawId: number;
  titulo: string;
  tipo: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  local: string;
  assistido: string;
  assistidoId?: number | null;
  processo: string;
  processoId?: number | null;
  atribuicao: string;
  atribuicaoKey?: string;
  status: string;
  descricao: string;
  prioridade: string;
  recorrencia: string;
  lembretes: string[];
  tags: string[];
  participantes: string[];
  vinculoDemanda?: string;
  observacoes: string;
  documentos: string[];
  dataInclusao: string;
  responsavel?: string;
  registro?: RegistroAudienciaData;
  fonte?: "audiencias" | "calendar" | "registros";
}
```

- [ ] **Step 2: Remover a interface inline da page e importar do módulo**

Em `page.tsx`, apagar o bloco `interface AgendaItem { ... }` (linhas ~104-135) e adicionar no topo, junto aos demais imports:

```ts
import type { AgendaItem } from "@/lib/agenda/agenda-item";
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run build`
Expected: build passa (os dois loops existentes continuam construindo objetos `AgendaItem` válidos).

- [ ] **Step 4: Commit**

```bash
git add src/lib/agenda/agenda-item.ts "src/app/(dashboard)/admin/agenda/page.tsx"
git commit -m "refactor: extrair tipo AgendaItem para src/lib/agenda"
```

---

## Task 2: Mapper puro `registroAgendadoToAgendaItem` (TDD)

Converte um atendimento agendado (com processo/assistido juntados) em `AgendaItem`, derivando a área a partir do processo vinculado (fallback neutro quando sem processo).

**Files:**
- Create: `src/lib/agenda/registro-to-agenda-item.ts`
- Test: `__tests__/unit/registro-to-agenda-item.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// __tests__/unit/registro-to-agenda-item.test.ts
import { describe, it, expect } from "vitest";
import { registroAgendadoToAgendaItem, type RegistroAgendado } from "@/lib/agenda/registro-to-agenda-item";

const base: RegistroAgendado = {
  id: 42,
  titulo: "Orientação sobre recurso",
  assunto: "recurso",
  conteudo: null,
  local: "presencial",
  status: "agendado",
  dataRegistro: "2026-05-28T14:30:00.000Z",
  assistido: { id: 7, nome: "Maria Souza" },
  processo: { id: 3, numeroAutos: "0001234-56.2026.8.05.0039", atribuicao: "JURI_CAMACARI", area: "JURI" },
};

describe("registroAgendadoToAgendaItem", () => {
  it("monta id composto e fonte registros", () => {
    const item = registroAgendadoToAgendaItem(base);
    expect(item.id).toBe("registro-42");
    expect(item.rawId).toBe(42);
    expect(item.fonte).toBe("registros");
    expect(item.tipo).toBe("atendimento");
  });

  it("usa o titulo quando presente e cai em 'Atendimento' quando ausente", () => {
    expect(registroAgendadoToAgendaItem(base).titulo).toBe("Orientação sobre recurso");
    expect(registroAgendadoToAgendaItem({ ...base, titulo: null }).titulo).toBe("Atendimento");
  });

  it("extrai data e horário de dataRegistro", () => {
    const item = registroAgendadoToAgendaItem(base);
    expect(item.data).toBe("2026-05-28");
    expect(item.horarioInicio).toBe("14:30");
  });

  it("deriva atribuicaoKey do processo vinculado", () => {
    const item = registroAgendadoToAgendaItem(base);
    expect(item.atribuicaoKey).toBe("JURI");
  });

  it("usa atribuicaoKey neutro quando não há processo", () => {
    const item = registroAgendadoToAgendaItem({ ...base, processo: null });
    expect(item.atribuicaoKey).toBe("NEUTRO");
    expect(item.processoId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npx vitest run __tests__/unit/registro-to-agenda-item.test.ts`
Expected: FAIL — "Cannot find module '@/lib/agenda/registro-to-agenda-item'".

- [ ] **Step 3: Implementar o mapper**

`mapAtribuicaoToKey` retorna `"NEUTRO"` (ou similar) para entrada vazia — manter o fallback explícito aqui para garantir o comportamento testado, independentemente da implementação dela.

```ts
// src/lib/agenda/registro-to-agenda-item.ts
import { format } from "date-fns";
import { mapAtribuicaoToKey, getAtribuicaoColors } from "@/lib/config/atribuicoes";
import type { AgendaItem } from "./agenda-item";

export interface RegistroAgendado {
  id: number;
  titulo: string | null;
  assunto: string | null;
  conteudo: string | null;
  local: string | null;
  status: string;
  dataRegistro: string | Date;
  assistido: { id: number; nome: string } | null;
  processo: { id: number; numeroAutos: string; atribuicao: string | null; area: string | null } | null;
}

export function registroAgendadoToAgendaItem(r: RegistroAgendado): AgendaItem {
  const d = new Date(r.dataRegistro);
  const dataFormatada = format(d, "yyyy-MM-dd");
  const atribuicaoKey = r.processo
    ? mapAtribuicaoToKey(r.processo.atribuicao, r.processo.area)
    : "NEUTRO";
  const atribuicaoConfig = getAtribuicaoColors(atribuicaoKey);

  return {
    id: `registro-${r.id}`,
    rawId: r.id,
    titulo: r.titulo || "Atendimento",
    tipo: "atendimento",
    data: dataFormatada,
    horarioInicio: format(d, "HH:mm"),
    horarioFim: "",
    local: r.local || "",
    assistido: r.assistido?.nome || "",
    assistidoId: r.assistido?.id ?? undefined,
    processo: r.processo?.numeroAutos || "",
    processoId: r.processo?.id ?? undefined,
    atribuicao: atribuicaoConfig.label,
    atribuicaoKey,
    status: r.status || "agendado",
    descricao: r.assunto || r.conteudo || "",
    prioridade: "normal",
    recorrencia: "nenhuma",
    lembretes: [],
    tags: [],
    participantes: [],
    observacoes: "",
    documentos: [],
    dataInclusao: new Date().toISOString(),
    fonte: "registros",
  };
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run __tests__/unit/registro-to-agenda-item.test.ts`
Expected: PASS (5 testes).

Se o teste do fallback `"NEUTRO"` falhar porque `mapAtribuicaoToKey` retorna outro rótulo para vazio, ajuste a constante de fallback no mapper e no teste para o valor real que `getAtribuicaoColors` reconhece como neutro — mas mantenha o branch `r.processo ? ... : <neutro>` intacto.

- [ ] **Step 5: Commit**

```bash
git add src/lib/agenda/registro-to-agenda-item.ts __tests__/unit/registro-to-agenda-item.test.ts
git commit -m "feat: mapper registroAgendadoToAgendaItem com derivação de área"
```

---

## Task 3: Mutation `registros.agendar` (backend)

`registros.create` hardcoda `status:"realizado"` e exige `conteudo` — não serve para agendar. Adicionar mutation dedicada que grava um atendimento futuro com `status:"agendado"`. O schema de input fica exportado para teste Zod (precedente: `__tests__/unit/demanda-eventos-zod.test.ts`).

**Files:**
- Modify: `src/lib/trpc/routers/registros.ts`
- Test: `__tests__/unit/agendar-input.test.ts`

- [ ] **Step 1: Escrever o teste do schema (falha)**

```ts
// __tests__/unit/agendar-input.test.ts
import { describe, it, expect } from "vitest";
import { agendarAtendimentoInput } from "@/lib/trpc/routers/registros";

describe("agendarAtendimentoInput", () => {
  it("aceita payload válido com assistido + data + processo opcional", () => {
    const r = agendarAtendimentoInput.safeParse({
      assistidoId: 7,
      dataRegistro: "2026-05-28T14:30:00.000Z",
      titulo: "Orientação",
      local: "presencial",
      processoId: 3,
    });
    expect(r.success).toBe(true);
  });

  it("rejeita sem assistidoId", () => {
    const r = agendarAtendimentoInput.safeParse({ dataRegistro: "2026-05-28T14:30:00.000Z" });
    expect(r.success).toBe(false);
  });

  it("rejeita sem dataRegistro", () => {
    const r = agendarAtendimentoInput.safeParse({ assistidoId: 7 });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run __tests__/unit/agendar-input.test.ts`
Expected: FAIL — export `agendarAtendimentoInput` não existe.

- [ ] **Step 3: Implementar o schema + a procedure**

No topo de `src/lib/trpc/routers/registros.ts`, após o `TIPO_REGISTRO`, exportar o schema:

```ts
export const agendarAtendimentoInput = z.object({
  assistidoId: z.number().int().positive(),
  dataRegistro: z.union([z.string(), z.date()]),
  titulo: z.string().max(120).optional(),
  assunto: z.string().optional(),
  local: z.string().optional(),
  processoId: z.number().int().positive().optional(),
  casoId: z.number().int().positive().optional(),
  demandaId: z.number().int().positive().optional(),
});
```

Dentro de `registrosRouter`, adicionar a procedure (usa `ctx.user.id` como `autorId`):

```ts
agendar: protectedProcedure
  .input(agendarAtendimentoInput)
  .mutation(async ({ input, ctx }) => {
    const [registro] = await db
      .insert(registros)
      .values({
        assistidoId: input.assistidoId,
        processoId: input.processoId ?? null,
        casoId: input.casoId ?? null,
        demandaId: input.demandaId ?? null,
        tipo: "atendimento",
        status: "agendado",
        titulo: input.titulo ?? null,
        assunto: input.assunto ?? null,
        local: input.local ?? null,
        dataRegistro: new Date(input.dataRegistro),
        autorId: ctx.user.id,
      })
      .returning();

    if (!registro) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao agendar atendimento" });
    }
    return registro;
  }),
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run __tests__/unit/agendar-input.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Verificar typecheck**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trpc/routers/registros.ts __tests__/unit/agendar-input.test.ts
git commit -m "feat: registros.agendar para atendimentos futuros (status agendado)"
```

---

## Task 4: Query `registros.listAgendados` (backend)

Lista atendimentos agendados na faixa de datas, escopados por defensor (autor + parceiros de comarca), juntando processo e assistido para a UI.

**Files:**
- Modify: `src/lib/trpc/routers/registros.ts`

- [ ] **Step 1: Adicionar imports necessários no topo do router**

```ts
import { gte, lte, inArray } from "drizzle-orm";
import { processos, assistidos } from "@/lib/db/schema";
import { getDefensoresVisiveis } from "../defensor-scope";
import { getParceirosIds } from "@/lib/trpc/comarca-scope";
```

(Combine com os imports drizzle já presentes — `and, desc, eq, lt, or` viram `and, desc, eq, gte, inArray, lt, lte, or`.)

- [ ] **Step 2: Implementar a procedure**

```ts
listAgendados: protectedProcedure
  .input(z.object({ start: z.string(), end: z.string() }))
  .query(async ({ input, ctx }) => {
    const conditions = [
      eq(registros.tipo, "atendimento"),
      eq(registros.status, "agendado"),
      gte(registros.dataRegistro, new Date(input.start)),
      lte(registros.dataRegistro, new Date(input.end)),
    ];

    // Escopo de defensor: autor + parceiros. Admin/servidor ("all") não filtra.
    const visiveis = getDefensoresVisiveis(ctx.user);
    if (visiveis !== "all") {
      const ids = new Set<number>(visiveis);
      for (const uid of visiveis) {
        const parceiros = await getParceirosIds(uid);
        parceiros.forEach((p) => ids.add(p));
      }
      conditions.push(inArray(registros.autorId, Array.from(ids)));
    }

    const rows = await db
      .select({
        registro: registros,
        processo: {
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          atribuicao: processos.atribuicao,
          area: processos.area,
        },
        assistido: { id: assistidos.id, nome: assistidos.nome },
      })
      .from(registros)
      .leftJoin(processos, eq(registros.processoId, processos.id))
      .leftJoin(assistidos, eq(registros.assistidoId, assistidos.id))
      .where(and(...conditions))
      .orderBy(desc(registros.dataRegistro));

    return rows.map((r) => ({
      ...r.registro,
      processo: r.processo?.id ? r.processo : null,
      assistido: r.assistido?.id ? r.assistido : null,
    }));
  }),
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run build`
Expected: build passa. Confirme que `assistidos.nome` é o nome real da coluna (a agenda usa `a.assistido?.nome`); se o schema usar outro nome, ajuste o select.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/registros.ts
git commit -m "feat: registros.listAgendados escopado por defensor"
```

---

## Task 5: `registros.update` aceita `status` (backend, TDD)

Hoje `update` só aplica `titulo/conteudo/tipo`. Para "marcar como realizado" precisamos aceitar `status`.

**Files:**
- Modify: `src/lib/trpc/routers/registros.ts` (input do `update` ~linha 175, corpo ~linha 180)
- Test: `__tests__/unit/registro-update-status.test.ts`

- [ ] **Step 1: Escrever teste do schema (falha)**

Exportar o input do update para teste. Teste:

```ts
// __tests__/unit/registro-update-status.test.ts
import { describe, it, expect } from "vitest";
import { updateRegistroInput } from "@/lib/trpc/routers/registros";

describe("updateRegistroInput", () => {
  it("aceita status realizado", () => {
    expect(updateRegistroInput.safeParse({ id: 1, status: "realizado" }).success).toBe(true);
  });
  it("aceita status cancelado", () => {
    expect(updateRegistroInput.safeParse({ id: 1, status: "cancelado" }).success).toBe(true);
  });
  it("rejeita status inválido", () => {
    expect(updateRegistroInput.safeParse({ id: 1, status: "xpto" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run __tests__/unit/registro-update-status.test.ts`
Expected: FAIL — export `updateRegistroInput` não existe.

- [ ] **Step 3: Extrair/estender o input do update e aplicar o campo**

Substituir o `.input(z.object({...}))` inline do `update` por um schema exportado que inclui `status`:

```ts
export const updateRegistroInput = z.object({
  id: z.number().int().positive(),
  titulo: z.string().max(120).optional(),
  conteudo: z.string().optional(),
  tipo: TIPO_REGISTRO.optional(),
  status: z.enum(["agendado", "realizado", "cancelado"]).optional(),
});
```

E no corpo do `update`, após `if (rest.tipo !== undefined) data.tipo = rest.tipo;`, adicionar:

```ts
if (rest.status !== undefined) data.status = rest.status;
```

Trocar a procedure para `.input(updateRegistroInput)`.

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npx vitest run __tests__/unit/registro-update-status.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Verificar typecheck e commit**

Run: `npm run build` → passa.

```bash
git add src/lib/trpc/routers/registros.ts __tests__/unit/registro-update-status.test.ts
git commit -m "feat: registros.update aceita transição de status"
```

---

## Task 6: Plugar `listAgendados` na agenda (leitura)

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx` (~linha 638 a query; ~linha 758 o useMemo)

- [ ] **Step 1: Adicionar a query usando o mesmo range do calendar**

Logo após a query `trpc.calendar.list.useQuery({ start, end })` (~linha 638), adicionar:

```ts
const { data: registrosAgendados, isLoading: isLoadingRegistros } =
  trpc.registros.listAgendados.useQuery({
    start: inicioAno.toISOString(),
    end: fimAno.toISOString(),
  });
```

E incluir no loading combinado:

```ts
const isLoading = isLoadingAudiencias || isLoadingCalendar || isLoadingRegistros;
```

- [ ] **Step 2: Importar o mapper**

No topo da page:

```ts
import { registroAgendadoToAgendaItem } from "@/lib/agenda/registro-to-agenda-item";
```

- [ ] **Step 3: Adicionar o terceiro loop no useMemo `eventos`**

Dentro do `useMemo` (após o bloco "2. Processar eventos do calendário", antes do `// 3. Ordenar`):

```ts
// 3. Processar atendimentos agendados (tabela registros)
if (registrosAgendados) {
  registrosAgendados.forEach((r) => {
    items.push(registroAgendadoToAgendaItem(r as any));
  });
}
```

Renumerar o comentário de ordenação para "// 4. Ordenar por data" e incluir `registrosAgendados` nas dependências do `useMemo`:

```ts
}, [audienciasData, calendarData, registrosAgendados, escalaConfig]);
```

- [ ] **Step 4: Verificar typecheck**

Run: `npm run build`
Expected: build passa. O `as any` no push é ponte temporária; se o shape de `registrosAgendados` divergir de `RegistroAgendado`, ajuste o tipo de retorno de `listAgendados` em vez de manter o cast.

- [ ] **Step 5: Teste manual**

Run: `npm run dev` → abrir `/admin/agenda`. Inserir um atendimento agendado direto no banco (`tipo='atendimento'`, `status='agendado'`, `data_registro` futura, `autor_id` = seu user) e confirmar que aparece na timeline no dia certo.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/admin/agenda/page.tsx"
git commit -m "feat: atendimentos agendados aparecem na agenda"
```

---

## Task 7: Ramificar o `+` da agenda para gravar atendimento (TDD no builder)

Quando o tipo do `+` é "atendimento", gravar em `registros` via `agendar` — não em `calendar_events`. Extrair o builder do payload como função pura testável.

**Files:**
- Create: `src/lib/agenda/build-agendar-payload.ts`
- Test: `__tests__/unit/build-agendar-payload.test.ts`
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx` (~linha 929 `handleSaveNewEvento`; mutations ~linha 885)

- [ ] **Step 1: Escrever o teste do builder (falha)**

```ts
// __tests__/unit/build-agendar-payload.test.ts
import { describe, it, expect } from "vitest";
import { buildAgendarPayload } from "@/lib/agenda/build-agendar-payload";

describe("buildAgendarPayload", () => {
  it("combina data + hora em ISO e repassa vínculos", () => {
    const p = buildAgendarPayload(
      { titulo: "Orientação", data: "2026-05-28", horarioInicio: "14:30", local: "sala 2", descricao: "x" },
      { assistidoId: 7, processoId: 3 }
    );
    expect(p.assistidoId).toBe(7);
    expect(p.processoId).toBe(3);
    expect(p.titulo).toBe("Orientação");
    expect(p.local).toBe("sala 2");
    expect(p.dataRegistro).toBe(new Date("2026-05-28T14:30:00").toISOString());
  });

  it("usa 00:00 quando não há horário", () => {
    const p = buildAgendarPayload(
      { titulo: "x", data: "2026-05-28", horarioInicio: "", local: "", descricao: "" },
      { assistidoId: 7 }
    );
    expect(p.dataRegistro).toBe(new Date("2026-05-28T00:00:00").toISOString());
    expect(p.processoId).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run __tests__/unit/build-agendar-payload.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o builder**

```ts
// src/lib/agenda/build-agendar-payload.ts
export interface AgendarFormInput {
  titulo: string;
  data: string;
  horarioInicio: string;
  local: string;
  descricao: string;
}

export interface AgendarPayload {
  assistidoId: number;
  processoId?: number;
  titulo?: string;
  assunto?: string;
  local?: string;
  dataRegistro: string;
}

export function buildAgendarPayload(
  form: AgendarFormInput,
  vinculos: { assistidoId: number; processoId?: number }
): AgendarPayload {
  const h = form.horarioInicio && /^\d{2}:\d{2}$/.test(form.horarioInicio) ? form.horarioInicio : "00:00";
  return {
    assistidoId: vinculos.assistidoId,
    processoId: vinculos.processoId,
    titulo: form.titulo || undefined,
    assunto: form.descricao || undefined,
    local: form.local || undefined,
    dataRegistro: new Date(`${form.data}T${h}:00`).toISOString(),
  };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run __tests__/unit/build-agendar-payload.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Adicionar a mutation `agendar` na page**

Junto às outras mutations (~linha 885):

```ts
const agendarAtendimento = trpc.registros.agendar.useMutation({
  onSuccess: () => {
    toast.success("Atendimento agendado!");
    utils.registros.listAgendados.invalidate();
  },
  onError: (error) => {
    toast.error("Erro ao agendar atendimento", { description: error.message });
  },
});
```

- [ ] **Step 6: Ramificar `handleSaveNewEvento`**

No início de `handleSaveNewEvento`, após resolver `processoId`/`assistidoId` (~linha 955), antes do `createCalendarEvent.mutateAsync`:

```ts
if (eventoData.tipo === "atendimento") {
  if (!assistidoId) {
    toast.error("Selecione o assistido para agendar um atendimento");
    return;
  }
  const { buildAgendarPayload } = await import("@/lib/agenda/build-agendar-payload");
  await agendarAtendimento.mutateAsync(
    buildAgendarPayload(
      {
        titulo: eventoData.titulo,
        data: eventoData.data,
        horarioInicio: eventoData.horarioInicio,
        local: eventoData.local || "",
        descricao: eventoData.descricao || "",
      },
      { assistidoId, processoId }
    )
  );
  return;
}
```

(Se preferir, mova o import de `buildAgendarPayload` para o topo do arquivo em vez do dynamic import.)

- [ ] **Step 7: Verificar typecheck e teste manual**

Run: `npm run build` → passa.
Manual: `/admin/agenda` → `+` → tipo "Atendimento", escolher assistido + data futura → salvar → aparece na timeline com marcação de atendimento (Task 8) e NÃO cria linha em `calendar_events`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/agenda/build-agendar-payload.ts __tests__/unit/build-agendar-payload.test.ts "src/app/(dashboard)/admin/agenda/page.tsx"
git commit -m "feat: + da agenda agenda atendimento real em vez de calendar_event"
```

---

## Task 8: Marcação visual (forma = natureza, cor = área)

Helper puro decide o tratamento; aplica na timeline (page) e nos chips de mês/semana.

**Files:**
- Create: `src/lib/agenda/agenda-item-visual.ts`
- Test: `__tests__/unit/agenda-item-visual.test.ts`
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx` (card da timeline ~linha 400-430)
- Modify: `src/components/agenda/calendar-month-view.tsx`
- Modify: `src/components/agenda/calendar-week-view.tsx`

- [ ] **Step 1: Escrever o teste do helper (falha)**

```ts
// __tests__/unit/agenda-item-visual.test.ts
import { describe, it, expect } from "vitest";
import { agendaItemVisual } from "@/lib/agenda/agenda-item-visual";

describe("agendaItemVisual", () => {
  it("atendimento (fonte registros) é tracejado com ícone Users", () => {
    const v = agendaItemVisual({ fonte: "registros" });
    expect(v.natureza).toBe("atendimento");
    expect(v.dashed).toBe(true);
    expect(v.icon).toBe("Users");
  });
  it("audiência é sólida com ícone Gavel", () => {
    expect(agendaItemVisual({ fonte: "audiencias" })).toEqual({ natureza: "audiencia", dashed: false, icon: "Gavel" });
  });
  it("evento de calendário comum é sólido (não-atendimento)", () => {
    expect(agendaItemVisual({ fonte: "calendar" }).dashed).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npx vitest run __tests__/unit/agenda-item-visual.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o helper**

```ts
// src/lib/agenda/agenda-item-visual.ts
export type AgendaItemVisual = {
  natureza: "audiencia" | "atendimento";
  dashed: boolean;
  icon: "Gavel" | "Users";
};

export function agendaItemVisual(item: { fonte?: string }): AgendaItemVisual {
  if (item.fonte === "registros") {
    return { natureza: "atendimento", dashed: true, icon: "Users" };
  }
  return { natureza: "audiencia", dashed: false, icon: "Gavel" };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npx vitest run __tests__/unit/agenda-item-visual.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 5: Aplicar no card da timeline (page)**

No componente de card da agenda (onde já existe `evento.fonte === "audiencias"`, ~linha 420), importar `Users, Gavel` de `lucide-react` e `agendaItemVisual`, e:

- escolher o ícone do cabeçalho do card por `agendaItemVisual(evento).icon`;
- quando `agendaItemVisual(evento).dashed`, aplicar à barra/borda lateral as classes `border-l-2 border-dashed` e ao fundo um tom translúcido (ex.: trocar `bg-<area>` sólido por `bg-<area>/10`), mantendo a cor da área vinda de `getAtribuicaoColors(evento.atribuicaoKey)`. Caso contrário, manter o preenchido sólido atual.

- [ ] **Step 6: Aplicar o chip em month/week views**

Em `calendar-month-view.tsx` e `calendar-week-view.tsx`, para cada item com `agendaItemVisual(item).natureza === "atendimento"`: renderizar o chip com `ring-1 ring-dashed`/anel e um ícone `Users` pequeno (12px), preservando a cor da área. Demais itens permanecem como hoje.

- [ ] **Step 7: Verificar typecheck e teste visual**

Run: `npm run build` → passa.
Manual: comparar lado a lado uma audiência e um atendimento na timeline, no mês e na semana — atendimento deve ler como "vazado/tracejado + Users", audiência como "preenchido/sólido + Gavel"; cor = área nos dois.

- [ ] **Step 8: Commit**

```bash
git add src/lib/agenda/agenda-item-visual.ts __tests__/unit/agenda-item-visual.test.ts "src/app/(dashboard)/admin/agenda/page.tsx" src/components/agenda/calendar-month-view.tsx src/components/agenda/calendar-week-view.tsx
git commit -m "feat: marcação visual distinta para atendimentos na agenda"
```

---

## Task 9: Ação "Marcar como realizado"

No item de atendimento, transicionar `status` para `realizado` (sai da agenda) e abrir o fluxo de áudio/transcrição existente.

**Files:**
- Modify: `src/app/(dashboard)/admin/agenda/page.tsx`

- [ ] **Step 1: Adicionar a mutation**

Junto às mutations (~linha 885):

```ts
const realizarAtendimento = trpc.registros.update.useMutation({
  onSuccess: () => {
    toast.success("Atendimento marcado como realizado");
    utils.registros.listAgendados.invalidate();
  },
  onError: (error) => {
    toast.error("Erro ao atualizar atendimento", { description: error.message });
  },
});
```

- [ ] **Step 2: Adicionar a ação no card/menu do atendimento**

No card/menu de ações do evento, quando `evento.fonte === "registros"`, renderizar o botão "Marcar como realizado" (ícone `CheckCircle2` do lucide):

```tsx
{evento.fonte === "registros" && evento.status === "agendado" && (
  <button
    className="... cursor-pointer ..."
    onClick={() => realizarAtendimento.mutate({ id: evento.rawId, status: "realizado" })}
  >
    <CheckCircle2 className="h-4 w-4" /> Marcar como realizado
  </button>
)}
```

- [ ] **Step 3: Conectar ao fluxo de atendimento existente (abrir após realizar)**

Após o `onSuccess` da mutation, abrir o sheet de atendimento já existente para o registro (`registro-completo-sheet` / fluxo Plaud) com o `rawId`, para o defensor anexar áudio/transcrição. Reusar o componente/rota que a ficha do assistido já usa para abrir um registro de atendimento — não criar UI nova.

- [ ] **Step 4: Verificar typecheck e teste manual**

Run: `npm run build` → passa.
Manual: agendar atendimento → na agenda, "Marcar como realizado" → some da timeline (vira `realizado`) e abre o fluxo de áudio/transcrição.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/admin/agenda/page.tsx"
git commit -m "feat: marcar atendimento como realizado pela agenda"
```

---

## Self-Review (preenchido)

**Spec coverage:**
- Origem OMBUDS / sem scraper SOLAR → respeitado (nenhuma task de import; só leitura/escrita local). ✓
- Só agendados/futuros na agenda → `listAgendados` filtra `status='agendado'` (Task 4); realizar remove (Task 9). ✓
- Marcação forma=natureza, cor=área → Task 2 (cor por área) + Task 8 (forma). ✓
- Agendar + operar pela agenda → Task 7 (`+`→agendar) + Task 9 (realizar). ✓
- Sem migration → nenhuma task de schema/migration. ✓
- Assistido obrigatório (decisão do usuário) → Task 3 (`assistidoId` notNull no input) + Task 7 (guard no `+`). ✓

**Placeholder scan:** sem TBD/TODO; todo step de código mostra o código. Os pontos "ajuste se o nome real divergir" (coluna `nome`, rótulo neutro) são instruções de verificação concretas, não placeholders.

**Type consistency:** `AgendaItem` (Task 1) consumido por `registroAgendadoToAgendaItem` (Task 2) e pela page (Task 6); `agendarAtendimentoInput`/`updateRegistroInput` exportados (Tasks 3/5) e testados; `RegistroAgendado` (Task 2) alinhado ao retorno de `listAgendados` (Task 4) — ponte `as any` em Task 6 com instrução de remover via ajuste de tipo. `agendaItemVisual` keyed por `fonte` (Task 8) consistente com `fonte:"registros"` setado no mapper (Task 2).

**Riscos conhecidos a validar na execução:**
- Nome real da coluna de nome do assistido (`assistidos.nome`).
- Rótulo neutro real de `getAtribuicaoColors`/`mapAtribuicaoToKey` para entrada vazia.
- Localização exata do card de ações na page e a forma de abrir o `registro-completo-sheet` a partir da agenda (Task 9 passo 3).
