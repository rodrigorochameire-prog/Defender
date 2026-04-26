"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const TIPOS = [
  "fato","apf","audiencia-custodia","denuncia","recebimento-denuncia",
  "resposta-acusacao","aij-designada","aij-realizada","memoriais",
  "sentenca","recurso-interposto","acordao-recurso","transito-julgado",
  "execucao-inicio","outro",
] as const;

interface Props {
  processoId: number;
  initial?: {
    id?: number;
    tipo?: string;
    data?: string;
    documentoReferencia?: string | null;
    observacoes?: string | null;
  };
  onDone: () => void;
  onCancel: () => void;
}

export function MarcoForm({ processoId, initial, onDone, onCancel }: Props) {
  const [form, setForm] = useState({
    tipo: initial?.tipo ?? "fato",
    data: initial?.data ?? new Date().toISOString().slice(0,10),
    documentoReferencia: initial?.documentoReferencia ?? "",
    observacoes: initial?.observacoes ?? "",
  });

  const createMut = trpc.cronologia.createMarco.useMutation({
    onSuccess: () => { toast.success("Marco criado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.cronologia.updateMarco.useMutation({
    onSuccess: () => { toast.success("Atualizado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initial?.id) {
      updateMut.mutate({ id: initial.id, patch: {
        tipo: form.tipo as any,
        data: form.data,
        documentoReferencia: form.documentoReferencia || null,
        observacoes: form.observacoes || null,
      } });
    } else {
      createMut.mutate({
        processoId,
        tipo: form.tipo as any,
        data: form.data,
        documentoReferencia: form.documentoReferencia || null,
        observacoes: form.observacoes || null,
      });
    }
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={submit} className="space-y-2 p-3 rounded border bg-neutral-50 dark:bg-neutral-900/50">
      <div className="flex gap-2">
        <label className="block flex-1">
          <span className="text-[10px] text-neutral-500">Tipo</span>
          <select className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}>
            {TIPOS.map((t) => <option key={t} value={t}>{t.replace(/-/g, " ")}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] text-neutral-500">Data</span>
          <input type="date" className="w-full px-2 py-1.5 border rounded text-sm"
            value={form.data}
            onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] text-neutral-500">Documento de referência</span>
        <input className="w-full px-2 py-1.5 border rounded text-sm"
          placeholder='ex: "sentença fls. 234"'
          value={form.documentoReferencia}
          onChange={(e) => setForm((f) => ({ ...f, documentoReferencia: e.target.value }))} />
      </label>
      <label className="block">
        <span className="text-[10px] text-neutral-500">Observações</span>
        <textarea rows={2} className="w-full px-2 py-1.5 border rounded text-sm"
          value={form.observacoes}
          onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400">
          {pending ? "Salvando…" : (initial?.id ? "Salvar" : "Criar")}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-neutral-400">
          Cancelar
        </button>
      </div>
    </form>
  );
}
