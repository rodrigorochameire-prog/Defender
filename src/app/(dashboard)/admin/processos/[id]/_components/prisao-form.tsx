"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const TIPOS = ["flagrante","temporaria","preventiva","decorrente-sentenca","outro"] as const;
const SITUACOES = ["ativa","relaxada","revogada","extinta","cumprida","convertida-em-preventiva"] as const;

interface Props {
  processoId: number;
  initial?: any;
  onDone: () => void;
  onCancel: () => void;
}

export function PrisaoForm({ processoId, initial, onDone, onCancel }: Props) {
  const [form, setForm] = useState({
    tipo: initial?.tipo ?? "preventiva",
    dataInicio: initial?.dataInicio ?? new Date().toISOString().slice(0,10),
    dataFim: initial?.dataFim ?? "",
    motivo: initial?.motivo ?? "",
    unidade: initial?.unidade ?? "",
    situacao: initial?.situacao ?? "ativa",
  });

  const createMut = trpc.cronologia.createPrisao.useMutation({
    onSuccess: () => { toast.success("Prisão criada"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.cronologia.updatePrisao.useMutation({
    onSuccess: () => { toast.success("Atualizado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tipo: form.tipo as any,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim || null,
      motivo: form.motivo || null,
      unidade: form.unidade || null,
      situacao: form.situacao as any,
    };
    if (initial?.id) updateMut.mutate({ id: initial.id, patch: payload });
    else createMut.mutate({ processoId, ...payload });
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={submit} className="space-y-2 p-3 rounded border bg-neutral-50 dark:bg-neutral-900/50">
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[10px] text-neutral-500">Tipo</span>
          <select className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
            {TIPOS.map((t) => <option key={t} value={t}>{t.replace(/-/g," ")}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] text-neutral-500">Data início</span>
          <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.dataInicio}
            onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} />
        </label>
        <label className="block">
          <span className="text-[10px] text-neutral-500">Data fim</span>
          <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.dataFim}
            onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] text-neutral-500">Situação</span>
          <select className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.situacao} onChange={(e) => setForm((f) => ({ ...f, situacao: e.target.value }))}>
            {SITUACOES.map((s) => <option key={s} value={s}>{s.replace(/-/g," ")}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] text-neutral-500">Unidade</span>
          <input className="w-full px-2 py-1.5 border rounded text-sm"
            placeholder="Conjunto Penal..."
            value={form.unidade} onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))} />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] text-neutral-500">Motivo</span>
        <textarea rows={2} className="w-full px-2 py-1.5 border rounded text-sm"
          value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400">
          {pending ? "Salvando…" : (initial?.id ? "Salvar" : "Criar")}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-neutral-400">Cancelar</button>
      </div>
    </form>
  );
}
