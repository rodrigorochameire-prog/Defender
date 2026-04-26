"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { CautelarForm } from "./cautelar-form";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  processoId: number;
  cautelares: any[];
  onRefresh: () => void;
}

export function CautelaresBlock({ processoId, cautelares, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const deleteMut = trpc.cronologia.deleteCautelar.useMutation({
    onSuccess: () => { toast.success("Removida"); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Cautelares ({cautelares.length})</h3>
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
        <CautelarForm
          processoId={processoId}
          onDone={() => { setAdding(false); onRefresh(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {cautelares.length === 0 && !adding && (
        <p className="text-xs italic text-neutral-400">Nenhuma cautelar.</p>
      )}

      <div className="space-y-1">
        {cautelares.map((c) => editingId === c.id ? (
          <CautelarForm
            key={c.id}
            processoId={processoId}
            initial={c}
            onDone={() => { setEditingId(null); onRefresh(); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={c.id} className="flex items-center justify-between px-3 py-1.5 rounded border text-xs">
            <span>
              <strong>{format(new Date(c.dataInicio), "dd/MM/yyyy", { locale: ptBR })}</strong>
              {c.dataFim && <> — {format(new Date(c.dataFim), "dd/MM/yyyy", { locale: ptBR })}</>}
              {" · "}{c.tipo.replace(/-/g, " ")} · <em>{c.status}</em>
              {c.detalhes && <span className="text-neutral-500"> · {c.detalhes}</span>}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setEditingId(c.id)}
                className="text-neutral-400 hover:text-emerald-500 cursor-pointer">Editar</button>
              <button onClick={() => { if (confirm("Remover?")) deleteMut.mutate({ id: c.id }); }}
                className="text-neutral-400 hover:text-rose-500 cursor-pointer">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
