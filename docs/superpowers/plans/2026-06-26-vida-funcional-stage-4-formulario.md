# Vida Funcional — Stage 4 (Formulário de eventos / CRUD UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar à Vida Funcional a entrada de dados que faltava — um formulário de criar/editar evento e exclusão com confirmação, acionável da home e da tela de domínio. É o que torna as telas (Stages 1–3) realmente úteis e popula os campos `dados` que o Radar lê.

**Architecture:** Um componente hand-rolled `EventoFormDialog` (Dialog, padrão do repo) que cria OU edita (prop `evento?`), chamando as mutações owner-only do Stage 1 (`createEvento`/`updateEvento`) e invalidando `listEventos`. Campos comuns + campos `dados` condicionais por tipo (vencimento p/ FOLGA, situação p/ DIARIA, SEI p/ GRATIFICAÇÃO/SUBSTITUIÇÃO) + valor para tipos monetários. Rótulos legíveis vêm de um módulo puro `labels.ts` (testado). Exclusão usa `alert-dialog` + `deleteEvento`.

**Tech Stack:** Next.js/React, tRPC v11, shadcn Dialog/AlertDialog/Select/Input/Textarea/Label/Button, sonner toast, Tailwind/Padrão Defender, Vitest.

**Escopo deste plano:** o CRUD via UI. NÃO inclui: indexador do Drive/sugestões (Stage 5 futuro), Produtividade. As mutações já existem e são owner-only/testadas (Stage 1) — aqui é a camada de UI. Campos `dados` cobertos: os que o Radar usa (vencimento, status de diária, seiStatus); outros campos `dados` por tipo (ex.: classe/edital de PROMOCAO) ficam para iteração futura — o form não tenta cobrir todos os tipos exaustivamente.

## Global Constraints

- **Imports absolutos** `@/`. **Install** `pnpm`. Scripts via `npm run`.
- **Gate:** `CI=1 vitest run`; **Build:** `npm run build` passa (e é o type-gate — vitest não tipa).
- **Privacidade/escrita owner-only:** as mutações do Stage 1 já garantem (defensorId === ctx.user.id). O form não passa `defensorId` (deixa o default = usuário). Não burlar isso.
- **Datas:** inputs `type="date"` produzem `"YYYY-MM-DD"` (compatível com o regex do `createInput`). Campos de data vazios → enviar `undefined`, nunca `""`.
- **Padrão Defender:** Dialog/AlertDialog do design system, `cursor-pointer`, labels claras, sem emojis como ícone, toasts em PT.

---

### Task 1: Rótulos legíveis (`labels.ts`) + teste

**Files:**
- Create: `src/lib/vida-funcional/labels.ts`
- Test: `__tests__/unit/vida-funcional-labels.test.ts`

**Interfaces:**
- Consumes: tipo `VfTipo` de `@/lib/vida-funcional/tipo-cluster`.
- Produces: `TIPO_LABELS: Record<VfTipo, string>`, `STATUS_LABELS: Record<string, string>`, `tipoLabel(t: string): string`, `statusLabel(s: string): string`, `TIPO_OPTIONS: { value: VfTipo; label: string }[]`.

- [ ] **Step 1: Teste (RED)**

Create `__tests__/unit/vida-funcional-labels.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TIPO_LABELS, tipoLabel, statusLabel, TIPO_OPTIONS } from "@/lib/vida-funcional/labels";

const ALL_TIPOS = [
  "POSSE","PROMOCAO","REMOCAO","TITULARIDADE","ACUMULO","DESIGNACAO_RELEVANTE","CONVOCACAO",
  "FERIAS","LICENCA","AFASTAMENTO","COOPERACAO","DIARIA","FOLGA","TRABALHO_EXTRAORDINARIO",
  "SUBSTITUICAO","GRATIFICACAO","REEMBOLSO","SOLICITACAO_ADM",
];

describe("labels", () => {
  it("todo tipo tem rótulo não-vazio e único", () => {
    const seen = new Set<string>();
    for (const t of ALL_TIPOS) {
      const l = (TIPO_LABELS as Record<string, string>)[t];
      expect(l, t).toBeTruthy();
      expect(seen.has(l)).toBe(false);
      seen.add(l);
    }
  });
  it("TIPO_OPTIONS cobre todos os 18 tipos", () => {
    expect(TIPO_OPTIONS).toHaveLength(18);
    expect(TIPO_OPTIONS.map((o) => o.value).sort()).toEqual([...ALL_TIPOS].sort());
  });
  it("tipoLabel faz fallback p/ o próprio valor se desconhecido", () => {
    expect(tipoLabel("PROMOCAO")).toBe(TIPO_LABELS.PROMOCAO);
    expect(tipoLabel("XPTO")).toBe("XPTO");
  });
  it("statusLabel traduz os status conhecidos", () => {
    expect(statusLabel("previsto")).toBeTruthy();
    expect(statusLabel("concluido")).toBeTruthy();
  });
});
```

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-labels.test.ts` → FAIL.

- [ ] **Step 2: Implementar**

Create `src/lib/vida-funcional/labels.ts`:

```typescript
import type { VfTipo } from "./tipo-cluster";

export const TIPO_LABELS: Record<VfTipo, string> = {
  POSSE: "Posse",
  PROMOCAO: "Promoção",
  REMOCAO: "Remoção",
  TITULARIDADE: "Titularidade / Lotação",
  ACUMULO: "Acúmulo de atribuição",
  DESIGNACAO_RELEVANTE: "Designação relevante",
  CONVOCACAO: "Convocação",
  FERIAS: "Férias",
  LICENCA: "Licença",
  AFASTAMENTO: "Afastamento",
  COOPERACAO: "Cooperação",
  DIARIA: "Diária",
  FOLGA: "Folga",
  TRABALHO_EXTRAORDINARIO: "Trabalho extraordinário",
  SUBSTITUICAO: "Substituição",
  GRATIFICACAO: "Gratificação",
  REEMBOLSO: "Reembolso",
  SOLICITACAO_ADM: "Solicitação administrativa",
};

export const STATUS_LABELS: Record<string, string> = {
  previsto: "Previsto",
  em_curso: "Em curso",
  concluido: "Concluído",
  pendente: "Pendente",
  arquivado: "Arquivado",
};

export function tipoLabel(t: string): string {
  return (TIPO_LABELS as Record<string, string>)[t] ?? t;
}

export function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s;
}

export const TIPO_OPTIONS: { value: VfTipo; label: string }[] = (
  Object.keys(TIPO_LABELS) as VfTipo[]
).map((value) => ({ value, label: TIPO_LABELS[value] }));
```

- [ ] **Step 3: GREEN + commit**

Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-labels.test.ts` → PASS.

```bash
git add src/lib/vida-funcional/labels.ts __tests__/unit/vida-funcional-labels.test.ts
git commit -m "feat(carreira): rotulos legiveis de tipo/status da Vida Funcional

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `EventoFormDialog` (criar/editar)

**Files:**
- Create: `src/app/(dashboard)/admin/carreira/vida-funcional/_components/evento-form-dialog.tsx`

**Interfaces:**
- Consumes: `TIPO_OPTIONS`/`STATUS_LABELS` (Task 1); `trpc.vidaFuncional.createEvento`/`updateEvento`; `Dialog*`, `Select*`, `Input`, `Textarea`, `Label`, `Button`; `toast`.
- Produces: `EventoFormDialog({ open, onOpenChange, evento?, tipoInicial? })`. `evento` ausente = criar; presente = editar. `onOpenChange(false)` ao concluir. Invalida `listEventos` no sucesso.

- [ ] **Step 1: Implementar o componente**

Create `src/app/(dashboard)/admin/carreira/vida-funcional/_components/evento-form-dialog.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { TIPO_OPTIONS, STATUS_LABELS } from "@/lib/vida-funcional/labels";

interface EventoLike {
  id: number;
  tipo: string;
  titulo: string;
  descricao: string | null;
  dataEvento: string;
  dataFim: string | null;
  prazo: string | null;
  status: string;
  valorCents: number | null;
  driveFolderId: string | null;
  dados: Record<string, unknown>;
}

const STATUS_VALUES = ["previsto", "em_curso", "concluido", "pendente", "arquivado"];
const TIPOS_MONETARIOS = ["DIARIA", "GRATIFICACAO", "SUBSTITUICAO", "REEMBOLSO"];
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function EventoFormDialog({
  open, onOpenChange, evento, tipoInicial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  evento?: EventoLike;
  tipoInicial?: string;
}) {
  const utils = trpc.useUtils();
  const editing = !!evento;

  const [tipo, setTipo] = useState<string>(evento?.tipo ?? tipoInicial ?? "FERIAS");
  const [titulo, setTitulo] = useState(evento?.titulo ?? "");
  const [dataEvento, setDataEvento] = useState(evento?.dataEvento ?? "");
  const [dataFim, setDataFim] = useState(evento?.dataFim ?? "");
  const [prazo, setPrazo] = useState(evento?.prazo ?? "");
  const [status, setStatus] = useState(evento?.status ?? "previsto");
  const [descricao, setDescricao] = useState(evento?.descricao ?? "");
  const [driveFolderId, setDriveFolderId] = useState(evento?.driveFolderId ?? "");
  const [valorReais, setValorReais] = useState(evento?.valorCents != null ? String(evento.valorCents / 100) : "");
  // dados condicionais
  const [vencimento, setVencimento] = useState(str(evento?.dados?.vencimento));
  const [diariaSituacao, setDiariaSituacao] = useState(str(evento?.dados?.status) || "a_requerer");
  const [seiStatus, setSeiStatus] = useState(str(evento?.dados?.seiStatus) || "pendente");

  // re-sincroniza quando abre para outro evento
  useEffect(() => {
    if (!open) return;
    setTipo(evento?.tipo ?? tipoInicial ?? "FERIAS");
    setTitulo(evento?.titulo ?? "");
    setDataEvento(evento?.dataEvento ?? "");
    setDataFim(evento?.dataFim ?? "");
    setPrazo(evento?.prazo ?? "");
    setStatus(evento?.status ?? "previsto");
    setDescricao(evento?.descricao ?? "");
    setDriveFolderId(evento?.driveFolderId ?? "");
    setValorReais(evento?.valorCents != null ? String(evento.valorCents / 100) : "");
    setVencimento(str(evento?.dados?.vencimento));
    setDiariaSituacao(str(evento?.dados?.status) || "a_requerer");
    setSeiStatus(str(evento?.dados?.seiStatus) || "pendente");
  }, [open, evento, tipoInicial]);

  const onDone = () => {
    utils.vidaFuncional.listEventos.invalidate();
    onOpenChange(false);
  };
  const createM = trpc.vidaFuncional.createEvento.useMutation({
    onSuccess: () => { toast.success("Evento criado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const updateM = trpc.vidaFuncional.updateEvento.useMutation({
    onSuccess: () => { toast.success("Evento atualizado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const saving = createM.isPending || updateM.isPending;

  function buildDados(): Record<string, unknown> {
    const d: Record<string, unknown> = { ...(evento?.dados ?? {}) };
    if (tipo === "FOLGA") d.vencimento = vencimento || undefined;
    if (tipo === "DIARIA") d.status = diariaSituacao;
    if (tipo === "GRATIFICACAO" || tipo === "SUBSTITUICAO") d.seiStatus = seiStatus;
    return d;
  }

  function submit() {
    if (!titulo.trim()) return toast.error("Informe um título");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataEvento)) return toast.error("Informe a data do evento");
    const base = {
      tipo: tipo as any,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      dataEvento,
      dataFim: dataFim || undefined,
      prazo: prazo || undefined,
      status: status as any,
      valorCents: valorReais ? Math.round(parseFloat(valorReais) * 100) : undefined,
      driveFolderId: driveFolderId.trim() || undefined,
      dados: buildDados(),
    };
    if (editing) updateM.mutate({ id: evento!.id, ...base });
    else createM.mutate(base);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="mt-1" placeholder="ex.: Férias 2º período" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data do evento</Label>
              <Input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_VALUES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data fim (opcional)</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Prazo (opcional)</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} className="mt-1" />
            </div>
          </div>

          {TIPOS_MONETARIOS.includes(tipo) && (
            <div>
              <Label>Valor (R$, opcional)</Label>
              <Input type="number" step="0.01" value={valorReais} onChange={(e) => setValorReais(e.target.value)} className="mt-1" />
            </div>
          )}

          {tipo === "FOLGA" && (
            <div>
              <Label>Vencimento da folga (opcional)</Label>
              <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="mt-1" />
            </div>
          )}
          {tipo === "DIARIA" && (
            <div>
              <Label>Situação da diária</Label>
              <Select value={diariaSituacao} onValueChange={setDiariaSituacao}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_requerer">A requerer</SelectItem>
                  <SelectItem value="requerida">Requerida</SelectItem>
                  <SelectItem value="recebida">Recebida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {(tipo === "GRATIFICACAO" || tipo === "SUBSTITUICAO") && (
            <div>
              <Label>Status SEI</Label>
              <Select value={seiStatus} onValueChange={setSeiStatus}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="enviado">Enviado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Pasta do Drive (ID, opcional)</Label>
            <Input value={driveFolderId} onChange={(e) => setDriveFolderId(e.target.value)} className="mt-1" placeholder="ID da pasta do Google Drive" />
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="mt-1" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build` → compila (o componente ainda não é usado; sem erro de tipo). Minutos é normal.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/admin/carreira/vida-funcional/_components/evento-form-dialog.tsx"
git commit -m "feat(carreira): EventoFormDialog (criar/editar evento, campos por tipo)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Wire criar/editar/excluir na tela de domínio + "Novo evento" na home

**Files:**
- Modify: `src/app/(dashboard)/admin/carreira/vida-funcional/[dominio]/page.tsx`
- Modify: `src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx`

**Interfaces:**
- Consumes: `EventoFormDialog` (Task 2); `trpc.vidaFuncional.deleteEvento`; `AlertDialog*`; `tipoLabel`/`statusLabel` (Task 1).
- Produces: na tela de domínio, um botão "Novo evento" (pré-seleciona o 1º tipo do domínio), um "Editar" e um "Excluir" (com confirmação) por evento. Na home, um botão "Novo evento" no cabeçalho da Visão geral.

- [ ] **Step 1: Domínio — botões e diálogos**

Modify `[dominio]/page.tsx`:
- Importe no topo:
```tsx
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc/client";
import { EventoFormDialog } from "../_components/evento-form-dialog";
import { tipoLabel, statusLabel } from "@/lib/vida-funcional/labels";
```
(`use`, `Link`, `getDominio`, `vfIcon`, `DrivePanel`, `cn` já estão; `trpc` já está.)

- Dentro do componente, após obter `cfg` e `eventos`, adicione estado e a mutação de exclusão:
```tsx
  const utils = trpc.useUtils();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | undefined>(undefined);
  const [toDelete, setToDelete] = useState<{ id: number; titulo: string } | null>(null);
  const delM = trpc.vidaFuncional.deleteEvento.useMutation({
    onSuccess: () => { utils.vidaFuncional.listEventos.invalidate(); setToDelete(null); },
  });
```

- No cabeçalho (junto ao título), adicione o botão Novo evento:
```tsx
        <Button size="sm" className="ml-auto cursor-pointer" onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Novo evento
        </Button>
```
(coloque dentro do `div` flex do cabeçalho do domínio, depois do contador.)

- Em cada linha de evento, troque o `<span>` do tipo (canto direito) por um grupo com tipo + ações:
```tsx
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] uppercase tracking-wide text-neutral-400">{tipoLabel(e.tipo)}</span>
                    <button className="p-1 rounded hover:bg-black/[0.05] dark:hover:bg-white/[0.06] cursor-pointer" onClick={() => { setEditing(e); setFormOpen(true); }} title="Editar"><Pencil className="w-3.5 h-3.5 text-neutral-400" /></button>
                    <button className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer" onClick={() => setToDelete({ id: e.id, titulo: e.titulo })} title="Excluir"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                  </div>
```
(e troque, na mesma linha de status, `{e.status}` por `{statusLabel(e.status)}`.)

- Antes do fechamento do componente, adicione os diálogos:
```tsx
      <EventoFormDialog open={formOpen} onOpenChange={setFormOpen} evento={editing} tipoInicial={cfg.tipos[0]} />
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento</AlertDialogTitle>
            <AlertDialogDescription>Excluir “{toDelete?.titulo}”? Esta ação arquiva o evento.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="cursor-pointer" onClick={() => toDelete && delM.mutate({ id: toDelete.id })}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
```

- [ ] **Step 2: Home — botão "Novo evento"**

Modify `_components/vida-funcional-view.tsx`:
- Import: `import { useState } from "react";` (já há `useMemo, useState`? confirme — se faltar `useState`, adicione), `import { Plus } from "lucide-react";`, `import { Button } from "@/components/ui/button";`, `import { EventoFormDialog } from "./evento-form-dialog";`
- Estado: `const [novoOpen, setNovoOpen] = useState(false);`
- No bloco da aba "visao", logo no topo (antes da seção Radar), adicione:
```tsx
            <div className="flex justify-end">
              <Button size="sm" className="cursor-pointer" onClick={() => setNovoOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Novo evento
              </Button>
            </div>
```
- Antes do fechamento do componente (após o `</div>` do container de conteúdo), adicione:
```tsx
      <EventoFormDialog open={novoOpen} onOpenChange={setNovoOpen} />
```

- [ ] **Step 3: Build + regressão**

Run: `npm run build` → home e `[dominio]` compilam com criar/editar/excluir.
Run: `CI=1 npx vitest run __tests__/unit/vida-funcional-labels.test.ts __tests__/unit/vida-funcional-radar.test.ts __tests__/unit/vida-funcional-dominios.test.ts __tests__/unit/vida-funcional-tipo-cluster.test.ts __tests__/unit/vida-funcional-scope.test.ts` → todos verdes.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/admin/carreira/vida-funcional/[dominio]/page.tsx" "src/app/(dashboard)/admin/carreira/vida-funcional/_components/vida-funcional-view.tsx"
git commit -m "feat(carreira): criar/editar/excluir evento na home e no dominio

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Verificação final do Stage 4

- [ ] `CI=1 vitest run` (unit) verde, incl. `vida-funcional-labels`.
- [ ] `npm run build` verde; home e `[dominio]` compilam.
- [ ] Manual (não headless): como defensor, criar um evento (ex.: FOLGA com vencimento, DIÁRIA a_requerer) → aparece na lista do domínio E gera alerta no Radar; editar e excluir funcionam; toasts em PT.

## Self-review (autor do plano)

- **Cobertura:** criar/editar (Task 2), excluir com confirmação + rótulos (Task 3), entradas na home e no domínio (Task 3), rótulos testados (Task 1). Popula os `dados` que o Radar usa (vencimento, diária.status, seiStatus) → fecha o loop Stage 3.
- **Owner-only preservado:** o form não envia `defensorId`; as mutações do Stage 1 garantem titularidade. Exclusão é soft (deleteEvento).
- **Datas:** campos vazios viram `undefined` (não `""`), compatível com o regex do `createInput`.
- **YAGNI:** cobre os campos `dados` relevantes ao Radar; não tenta um form exaustivo por tipo (ex.: classe/edital de PROMOCAO ficam para depois). Form hand-rolled conforme convenção do repo (sem helper compartilhado).
- **Consistência:** `EventoLike` casa com os campos retornados por `listEventos`; `tipoLabel`/`statusLabel` reusáveis (a timeline/detalhe podem adotar depois).
