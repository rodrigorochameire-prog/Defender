"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PrisaoForm } from "./prisao-form";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  processoId: number;
  prisoes: any[];
  onRefresh: () => void;
}

export function PrisoesBlock({ processoId, prisoes, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const deleteMut = trpc.cronologia.deletePrisao.useMutation({
    onSuccess: () => { toast.success("Removida"); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Prisões ({prisoes.length})</h3>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="flex items-center gap-1 px-2 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400"
          >
            <Plus className="w-3 h-3" /> Nova
          </button>
        )}
      </div>

      {adding && (
        <PrisaoForm
          processoId={processoId}
          onDone={() => { setAdding(false); onRefresh(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {prisoes.length === 0 && !adding && (
        <p className="text-xs italic text-neutral-400">Nenhuma prisão.</p>
      )}

      <div className="space-y-1">
        {prisoes.map((p) => editingId === p.id ? (
          <PrisaoForm
            key={p.id}
            processoId={processoId}
            initial={p}
            onDone={() => { setEditingId(null); onRefresh(); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={p.id} className="flex items-center justify-between px-3 py-1.5 rounded border text-xs">
            <span>
              <strong>{format(new Date(p.dataInicio), "dd/MM/yyyy", { locale: ptBR })}</strong>
              {p.dataFim && <> — {format(new Date(p.dataFim), "dd/MM/yyyy", { locale: ptBR })}</>}
              {" · "}{p.tipo} · <em>{p.situacao}</em>
              {p.unidade && <span className="text-neutral-500"> · {p.unidade}</span>}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setEditingId(p.id)}
                className="text-neutral-400 hover:text-emerald-500 cursor-pointer">Editar</button>
              <button onClick={() => { if (confirm("Remover?")) deleteMut.mutate({ id: p.id }); }}
                className="text-neutral-400 hover:text-rose-500 cursor-pointer">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
