# Delegação e Transferência Dinâmicas no Kanban

**Goal:** Eliminar erro de enum no drag-to-delegate, tornar a lista de equipe e parceiros dinâmica, redesenhar modal Padrão Defender e habilitar transferência de caso pelo Kanban.

**Architecture:**
Backend já tem `delegacaoRouter` (servidor/estagiário) e `encaminhamentosRouter` com `tipo:"transferir"` (defensor → defensor com aceite). O Kanban hoje usa lista hardcoded `["amanda","emilly","taissa"]` e dispara mutation com status inválido. Vamos: (A) reordenar `handleStatusChange` e derivar a lista da query `delegacao.membrosEquipe`; (B) redesenhar `DelegacaoModal` em zinc/emerald (Padrão Defender); (C) criar router `parceiros` com `listar` e adicionar colunas dinâmicas no Kanban diferenciando "Equipe" (delegação) de "Colegas" (transferência).

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, Tailwind CSS, lucide-react, sonner.

---

## Phase A — Bug fix + lista dinâmica de equipe

### Task A1: Corrigir handleStatusChange (skip mutation em delegação/transferência)

**Files:**
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx:1120-1181`

- [ ] **Step 1: Trocar lista hardcoded por derivação dinâmica de membrosEquipe**

Localizar bloco `// Status que disparam o modal de delegação` e substituir por:

```tsx
// Membros da equipe e parceiros são carregados via tRPC para gerar mapa dinâmico.
// O status enviado pelo Kanban é "primeironome" lowercase (ex: "amanda").
const { data: membrosEquipeQuery } = trpc.delegacao.membrosEquipe.useQuery();
const { data: parceirosQuery } = trpc.parceiros.listar.useQuery();

const equipeByKey = useMemo(() => {
  const map = new Map<string, { id: number; name: string; role: string }>();
  (membrosEquipeQuery ?? []).forEach((m) => {
    const key = m.name.split(" ")[0].toLowerCase();
    map.set(key, { id: m.id, name: m.name, role: m.role });
  });
  return map;
}, [membrosEquipeQuery]);

const parceirosByKey = useMemo(() => {
  const map = new Map<string, { id: number; name: string }>();
  (parceirosQuery ?? []).forEach((p) => {
    const key = p.name.split(" ")[0].toLowerCase();
    map.set(key, { id: p.id, name: p.name });
  });
  return map;
}, [parceirosQuery]);
```

- [ ] **Step 2: Reordenar handleStatusChange para early return**

Substituir corpo de `handleStatusChange` por:

```tsx
const handleStatusChange = (demandaId: string, newStatus: string) => {
  const key = newStatus.toLowerCase();
  const numericId = parseInt(demandaId, 10);
  const demanda = demandas.find((d) => d.id === demandaId);

  // 1) Delegação a membro da equipe → abre modal, sem mutation
  const membro = equipeByKey.get(key);
  if (membro && demanda) {
    setDelegacaoDemanda({
      demandaId: numericId || null,
      demandaAto: demanda.ato || "",
      assistidoId: demanda.assistidoId || null,
      assistidoNome: demanda.assistido || "",
      processoId: demanda.processoId || null,
      processoNumero: demanda.processos?.[0]?.numero || "",
      destinatarioNome: membro.name,
    });
    setDelegacaoModalOpen(true);
    return;
  }

  // 2) Transferência a colega defensor → abre modal de encaminhamento, sem mutation
  const parceiro = parceirosByKey.get(key);
  if (parceiro && demanda) {
    setTransferenciaDemanda({
      demandaId: numericId || null,
      processoId: demanda.processoId || null,
      assistidoId: demanda.assistidoId || null,
      display: `${demanda.assistido} · ${demanda.ato ?? "Demanda"}`,
      destinatarioId: parceiro.id,
      destinatarioNome: parceiro.name,
    });
    setTransferenciaModalOpen(true);
    return;
  }

  // 3) Status real → atualizar localmente e no banco (comportamento atual)
  setDemandas((prev) =>
    prev.map((d) => (d.id === demandaId ? { ...d, status: newStatus, substatus: newStatus } : d))
  );
  if (!isNaN(numericId)) {
    const dbStatus = UI_STATUS_TO_DB[newStatus] || newStatus.toUpperCase().replace(/ /g, "_");
    updateDemandaMutation.mutate({
      id: numericId,
      status: dbStatus as any,
      substatus: newStatus,
    });
  }

  // Gatilho recurso (mantém)
  if (newStatus.toLowerCase() === "protocolado" && !isNaN(numericId)) {
    const info = infoDoAtoRecurso(demanda?.ato);
    if (info) {
      setRecursoModal({
        open: true,
        demandaId: numericId,
        assistidoNome: demanda?.assistido,
        numeroAutosOrigem: demanda?.processos?.[0]?.numero,
        tipo: info.tipo,
        rotulo: info.rotulo,
        exigeNumero: info.exigeNumero,
      });
    }
  }
};
```

- [ ] **Step 3: Adicionar state de transferência**

Logo abaixo do state `delegacaoDemanda` (linha ~759):

```tsx
const [transferenciaModalOpen, setTransferenciaModalOpen] = useState(false);
const [transferenciaDemanda, setTransferenciaDemanda] = useState<{
  demandaId: number | null;
  processoId: number | null;
  assistidoId: number | null;
  display: string;
  destinatarioId: number;
  destinatarioNome: string;
} | null>(null);
```

- [ ] **Step 4: Renderizar NovoEncaminhamentoModal pré-preenchido para transferência**

Logo abaixo do `<DelegacaoModal ... />` no JSX:

```tsx
{transferenciaDemanda && (
  <NovoEncaminhamentoModal
    open={transferenciaModalOpen}
    onOpenChange={(o) => {
      setTransferenciaModalOpen(o);
      if (!o) setTransferenciaDemanda(null);
    }}
    initialTipo="transferir"
    contexto={{
      demandaId: transferenciaDemanda.demandaId ?? undefined,
      processoId: transferenciaDemanda.processoId ?? undefined,
      assistidoId: transferenciaDemanda.assistidoId ?? undefined,
      display: transferenciaDemanda.display,
    }}
    initialDestinatarioId={transferenciaDemanda.destinatarioId}
  />
)}
```

E adicionar import no topo:

```tsx
const NovoEncaminhamentoModal = dynamic(
  () => import("@/components/cowork/encaminhamentos/NovoEncaminhamentoModal").then(m => ({ default: m.NovoEncaminhamentoModal })),
  { ssr: false }
);
```

- [ ] **Step 5: Build check**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | head -30`
Expected: 0 errors em `demandas-premium-view.tsx`. Erro esperado em `parceiros.listar` (router ainda não existe — Task A2). Erro esperado em `initialDestinatarioId` (Task A3 adiciona prop).

- [ ] **Step 6: Commit**

```bash
git add src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "fix(kanban): handle delegation/transfer drag without writing invalid status to DB"
```

---

### Task A2: Criar router parceiros.listar

**Files:**
- Create: `src/lib/trpc/routers/parceiros.ts`
- Modify: `src/lib/trpc/routers/index.ts` (registrar router)

- [ ] **Step 1: Criar router de parceiros**

Conteúdo de `src/lib/trpc/routers/parceiros.ts`:

```ts
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { defensorParceiros, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export const parceirosRouter = router({
  // Lista os defensores parceiros do usuário atual (para transferência de caso).
  listar: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(defensorParceiros)
      .innerJoin(users, eq(users.id, defensorParceiros.parceiroId))
      .where(
        and(
          eq(defensorParceiros.defensorId, userId),
          isNull(users.deletedAt),
          eq(users.role, "defensor"),
        ),
      );

    return rows;
  }),
});
```

- [ ] **Step 2: Registrar router**

Em `src/lib/trpc/routers/index.ts` adicionar import e entrada (seguindo padrão dos outros):

```ts
import { parceirosRouter } from "./parceiros";
// ... no objeto appRouter:
parceiros: parceirosRouter,
```

- [ ] **Step 3: Build check**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | grep -E "(parceiros|error)" | head -10`
Expected: 0 erros em `parceiros.ts` e `demandas-premium-view.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/trpc/routers/parceiros.ts src/lib/trpc/routers/index.ts
git commit -m "feat(trpc): add parceiros.listar for defensor partners lookup"
```

---

### Task A3: Adicionar prop initialDestinatarioId ao NovoEncaminhamentoModal

**Files:**
- Modify: `src/components/cowork/encaminhamentos/NovoEncaminhamentoModal.tsx`

- [ ] **Step 1: Adicionar prop opcional e pré-preencher**

Em `NovoEncaminhamentoModal.tsx`, adicionar à interface de props:

```tsx
initialDestinatarioId?: number;
```

E na função, dentro do `useEffect(open)`:

```tsx
useEffect(() => {
  if (open) {
    setTipo(initialTipo);
    setNotif(NOTIF_DEFAULTS[initialTipo]);
    setMensagem("");
    setTitulo("");
    setDestinatarios([]);
    if (initialDestinatarioId) {
      // Buscar nome do destinatário via query simples
      // Nota: o DestinatarioPicker usa Colega { id, name, role }; vamos resolver via prop usando placeholder
      // até o picker carregar e atualizar.
      setDestinatarios([{ id: initialDestinatarioId, name: "...", role: "defensor" } as Colega]);
    }
  }
}, [open, initialTipo, initialDestinatarioId]);
```

- [ ] **Step 2: Verificar que o DestinatarioPicker resolve o nome quando props.value tem id mas name vazio**

Run: `grep -n "value\|name" /Users/rodrigorochameire/Projetos/Defender/src/components/cowork/encaminhamentos/DestinatarioPicker.tsx | head -20`

Se o picker não resolve nome a partir de id, adicionar resolução: `trpc.parceiros.listar` para hidrar.

- [ ] **Step 3: Hidratar nome (se necessário)**

Substituir o pré-preenchimento por uma query que casa o id:

```tsx
const { data: parceiros } = trpc.parceiros.listar.useQuery();

useEffect(() => {
  if (open && initialDestinatarioId && parceiros) {
    const p = parceiros.find((x) => x.id === initialDestinatarioId);
    if (p) setDestinatarios([{ id: p.id, name: p.name, role: p.role }]);
  }
}, [open, initialDestinatarioId, parceiros]);
```

- [ ] **Step 4: Build check + commit**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | head -10`

```bash
git add src/components/cowork/encaminhamentos/NovoEncaminhamentoModal.tsx
git commit -m "feat(encaminhamentos): support initialDestinatarioId for prefilled transfer"
```

---

### Task A4: Remover hardcodes em config/demanda-status.ts

**Files:**
- Modify: `src/config/demanda-status.ts`

- [ ] **Step 1: Remover entradas hardcoded de Amanda/Emilly/Taissa**

Em `SUB_GROUP_SECTIONS.acompanhar`, remover entrada `Delegação` com statuses fixos. As colunas dinâmicas serão criadas no Kanban (Task C2).

Em `STATUS_GROUPS` (linha ~258), remover entradas `emilly`, `amanda`, `taissa`.

Em `STATUS_OPTIONS_BY_COLUMN` (linha ~417), remover entradas `emilly`, `amanda`, `taissa`.

- [ ] **Step 2: Verificar que nenhum lugar depende dessas constantes**

Run: `grep -rn "\"emilly\"\|\"amanda\"\|\"taissa\"" /Users/rodrigorochameire/Projetos/Defender/src 2>/dev/null`
Expected: 0 ocorrências (exceto eventuais menções em comentários/docs).

- [ ] **Step 3: Build check + commit**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | head -20`

```bash
git add src/config/demanda-status.ts
git commit -m "refactor(status): remove hardcoded delegation status entries (now dynamic)"
```

---

## Phase B — Modal Delegar redesign Padrão Defender

### Task B1: Trocar gradiente rose-pink por zinc/emerald

**Files:**
- Modify: `src/components/demandas/delegacao-modal.tsx`

- [ ] **Step 1: Header icon — zinc neutro**

Localizar no JSX o div com `bg-gradient-to-br from-rose-500 to-pink-600`:

```tsx
<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
  <UserPlus className="w-4.5 h-4.5 text-white" />
</div>
```

Substituir por:

```tsx
<div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
  <UserPlus className="w-4.5 h-4.5 text-zinc-700 dark:text-zinc-300" />
</div>
```

- [ ] **Step 2: Asteriscos `*` rose → emerald**

Run search & replace no arquivo:
- `<span className="text-rose-500">*</span>` → `<span className="text-emerald-600">*</span>`

(São 2 ocorrências: linha ~344 destinatário, linha ~385 instruções.)

- [ ] **Step 3: Botão Delegar — gradiente rose → emerald sólido**

Localizar no DialogFooter:

```tsx
className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 transition-all"
```

Substituir por:

```tsx
className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
```

- [ ] **Step 4: Compactar contexto — remover ícones individuais coloridos**

Localizar bloco `{(assistidoNome || processoNumero || demandaAto) && (...)`. Substituir por uma versão neutra:

```tsx
{(assistidoNome || processoNumero || demandaAto) && (
  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-1.5">
    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Contexto</p>
    {assistidoNome && (
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider w-16 shrink-0">Assistido</span>
        <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">{assistidoNome}</span>
      </div>
    )}
    {processoNumero && (
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider w-16 shrink-0">Processo</span>
        <span className="text-zinc-700 dark:text-zinc-300 font-mono text-xs">{processoNumero}</span>
      </div>
    )}
    {demandaAto && (
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider w-16 shrink-0">Ato</span>
        <span className="text-zinc-700 dark:text-zinc-300">{demandaAto}</span>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Compactar spacing**

Localizar `<div className="space-y-4 py-4">` e trocar por `<div className="space-y-3 py-3">`.

Trocar `min-h-[100px]` do textarea por `min-h-[80px]`.

- [ ] **Step 6: Build + smoke test visual**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | head -10`

Iniciar dev server: `npm run dev` (em background) e abrir no browser para confirmar que o modal abre sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/demandas/delegacao-modal.tsx
git commit -m "refactor(delegacao-modal): apply Padrão Defender (zinc/emerald, compact)"
```

---

## Phase C — Kanban dinâmico com Equipe + Colegas

### Task C1: Adicionar seção "Pessoas" no Kanban (visualização extra)

**Files:**
- Modify: `src/components/demandas-premium/kanban-premium.tsx`
- Modify: `src/components/demandas-premium/demandas-premium-view.tsx`

- [ ] **Step 1: Estender props do KanbanPremium para receber listas de pessoas**

Em `kanban-premium.tsx`, no interface das props:

```tsx
membrosEquipe?: Array<{ id: number; name: string; role: string }>;
parceirosDefensores?: Array<{ id: number; name: string }>;
```

- [ ] **Step 2: Renderizar bloco "Pessoas" abaixo das colunas regulares**

Logo após o bloco `<div className="grid">` que renderiza colunas regulares (~linha 2070), adicionar:

```tsx
{(membrosEquipe?.length || parceirosDefensores?.length) ? (
  <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
    <div className="flex items-center gap-2 mb-3">
      <Users className="w-3.5 h-3.5 text-zinc-500" />
      <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Pessoas</h3>
      <span className="text-[10px] text-zinc-400">arraste para delegar ou transferir</span>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {(membrosEquipe ?? []).map((m) => {
        const key = m.name.split(" ")[0].toLowerCase();
        const items = demandas.filter(d => (d.delegadoPara ?? "").toLowerCase().includes(key) || (d.substatus ?? "").toLowerCase() === key);
        return (
          <PessoaColumn
            key={`equipe-${m.id}`}
            kind="equipe"
            personKey={key}
            name={m.name}
            role={m.role}
            items={items}
            draggedDemandaId={draggedDemandaId}
            dragOverColumn={dragOverColumn}
            setDragOverColumn={setDragOverColumn}
            onDropToStatus={onStatusChange}
            renderCard={(d) => (
              <KanbanCard
                key={d.id}
                demanda={d}
                group="acompanhar"
                onCardClick={onCardClick}
                onOpenEventsDrawer={onOpenEventsDrawer}
                onStatusChange={onStatusChange}
                onAgendarAudiencia={onAgendarAudiencia}
                onOpenRegistro={onOpenRegistro}
                onToggleUrgent={onToggleUrgent}
                isSelectMode={isSelectMode}
                isSelected={!!selectedIds?.has(String(d.id))}
                onToggleSelect={onToggleSelect}
                copyToClipboard={copyToClipboard}
                isDragging={draggedDemandaId === String(d.id)}
                isFocused={focusedCardId === String(d.id)}
                onDragStart={setDraggedDemandaId}
                onDragEnd={() => { setDraggedDemandaId(null); setDragOverColumn(null); }}
              />
            )}
          />
        );
      })}
      {(parceirosDefensores ?? []).map((p) => {
        const key = p.name.split(" ")[0].toLowerCase();
        const items = demandas.filter(d => (d.substatus ?? "").toLowerCase() === key);
        return (
          <PessoaColumn
            key={`parceiro-${p.id}`}
            kind="parceiro"
            personKey={key}
            name={p.name}
            role="defensor"
            items={items}
            draggedDemandaId={draggedDemandaId}
            dragOverColumn={dragOverColumn}
            setDragOverColumn={setDragOverColumn}
            onDropToStatus={onStatusChange}
            renderCard={() => null}
          />
        );
      })}
    </div>
  </div>
) : null}
```

- [ ] **Step 3: Criar componente `PessoaColumn`**

No mesmo arquivo, antes da função `KanbanPremium`, adicionar:

```tsx
function PessoaColumn({
  kind,
  personKey,
  name,
  role,
  items,
  draggedDemandaId,
  dragOverColumn,
  setDragOverColumn,
  onDropToStatus,
  renderCard,
}: {
  kind: "equipe" | "parceiro";
  personKey: string;
  name: string;
  role: string;
  items: any[];
  draggedDemandaId: string | null;
  dragOverColumn: string | null;
  setDragOverColumn: (v: string | null) => void;
  onDropToStatus?: (demandaId: string, newStatus: string) => void;
  renderCard: (d: any) => React.ReactNode;
}) {
  const colId = `pessoa-${kind}-${personKey}`;
  const isDropTarget = dragOverColumn === colId && draggedDemandaId !== null;
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const accent = kind === "equipe"
    ? "border-zinc-200 dark:border-zinc-700"
    : "border-slate-300 dark:border-slate-600";
  const ringAccent = kind === "equipe"
    ? "ring-emerald-400"
    : "ring-slate-500";

  return (
    <div
      className={cn(
        "flex flex-col min-w-0 rounded-xl border bg-white dark:bg-neutral-900/30 transition-all",
        accent,
        isDropTarget && `ring-2 ring-dashed ${ringAccent} ring-offset-1`,
      )}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverColumn(colId); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColumn(null); }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("demandaId");
        if (id && onDropToStatus) onDropToStatus(id, personKey);
        setDragOverColumn(null);
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 truncate">{name}</p>
          <p className="text-[9px] text-zinc-400 uppercase tracking-wider">
            {kind === "equipe" ? `Delegar · ${role}` : "Transferir · defensor"}
          </p>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">{items.length}</span>
      </div>
      <div className="p-2 space-y-2 min-h-[80px]">
        {items.slice(0, 8).map((d) => renderCard(d))}
        {items.length === 0 && (
          <p className="text-[10px] text-center text-zinc-300 dark:text-zinc-700 py-2">solte aqui</p>
        )}
      </div>
    </div>
  );
}
```

Adicionar import `Users` no topo do arquivo se não existir.

- [ ] **Step 4: Passar props da view para o Kanban**

Em `demandas-premium-view.tsx`, nas chamadas `<KanbanPremium ...>` (várias instâncias, ~linhas 3193, 3268, 3551), adicionar:

```tsx
membrosEquipe={membrosEquipeQuery ?? []}
parceirosDefensores={parceirosQuery ?? []}
```

- [ ] **Step 5: Build + smoke test**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsc --noEmit 2>&1 | head -20`

Abrir dev server e testar drag de card pra coluna de Amanda → modal abre, sem erro vermelho.

- [ ] **Step 6: Commit**

```bash
git add src/components/demandas-premium/kanban-premium.tsx src/components/demandas-premium/demandas-premium-view.tsx
git commit -m "feat(kanban): dynamic Pessoas section for delegate/transfer drag targets"
```

---

### Task C2: Cadastrar parceiros iniciais (Juliane, Cristiane, Danilo)

**Files:**
- Create (temporário): `scripts/seed-parceiros-rodrigo.ts`

- [ ] **Step 1: Criar script de seed**

```ts
// scripts/seed-parceiros-rodrigo.ts
import { db } from "@/lib/db";
import { defensorParceiros, users } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

const RODRIGO_EMAIL = "rodrigorochameire@gmail.com";
const PARCEIRO_NOMES = ["Juliane", "Cristiane", "Danilo"];

async function main() {
  const [rodrigo] = await db.select().from(users).where(eq(users.email, RODRIGO_EMAIL));
  if (!rodrigo) throw new Error("Rodrigo não encontrado");

  const candidatos = await db.select().from(users).where(eq(users.role, "defensor"));
  const matches = candidatos.filter(u =>
    PARCEIRO_NOMES.some(n => u.name.toLowerCase().startsWith(n.toLowerCase()))
  );

  console.log(`Encontrados ${matches.length} parceiros:`, matches.map(m => m.name));

  for (const p of matches) {
    if (p.id === rodrigo.id) continue;
    await db.insert(defensorParceiros).values({
      defensorId: rodrigo.id,
      parceiroId: p.id,
    }).onConflictDoNothing();
  }

  console.log("Parceiros cadastrados.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Rodar seed**

Run: `cd /Users/rodrigorochameire/Projetos/Defender && npx tsx scripts/seed-parceiros-rodrigo.ts`
Expected: log mostra parceiros encontrados e cadastrados.

- [ ] **Step 3: Confirmar via Supabase MCP ou direto no app**

Abrir o painel e verificar que as colunas Juliane/Cristiane/Danilo aparecem na seção "Pessoas".

- [ ] **Step 4: Commit script (mantém para reaproveitar quando user adicionar parceiros novos)**

```bash
git add scripts/seed-parceiros-rodrigo.ts
git commit -m "chore(scripts): seed defensor parceiros for Rodrigo"
```

---

### Task C3: Smoke test E2E manual

- [ ] **Step 1: Drag para membro da equipe (Amanda) → DelegacaoModal aparece com Padrão Defender (zinc/emerald), sem erro vermelho.**

- [ ] **Step 2: Preencher instruções e enviar → toast de sucesso, demanda aparece como delegada.**

- [ ] **Step 3: Drag para colega defensor (Juliane) → NovoEncaminhamentoModal aparece com tipo "transferir" e destinatário Juliane pré-preenchido.**

- [ ] **Step 4: Cancelar transferência → demanda permanece intocada (sem mutation indevida).**

- [ ] **Step 5: Confirmar transferência → encaminhamento criado, aparece no inbox da Juliane (verificar via /admin/cowork em outro user ou via SQL).**

- [ ] **Step 6: Commit final + push**

```bash
git push -u origin feat/delegacao-transferencia-kanban
```

---

## Self-Review Checklist

- [x] Spec coverage: A1-A4 cobrem fix do bug + dinâmico, B1 cobre redesign, C1-C3 cobrem Kanban dinâmico.
- [x] Sem placeholders: cada step tem código completo ou comando concreto.
- [x] Type consistency: `equipeByKey`/`parceirosByKey` usam mesmo shape `{ id, name, role? }` em todas as referências.
- [x] Sem features além do escopo: nada de UI nova de gerenciamento de parceiros (script de seed cobre o caso atual).
