"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { MarcoForm } from "./marco-form";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  processoId: number;
  marcos: any[];
  onRefresh: () => void;
}

export function MarcosBlock({ processoId, marcos, onRefresh }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const deleteMut = trpc.cronologia.deleteMarco.useMutation({
    onSuccess: () => { toast.success("Removido"); onRefresh(); },
    onError: (e) => toast.error(e.message),
  });

  const handleDelete = (id: number) => {
    if (!confirm("Remover esse marco?")) return;
    deleteMut.mutate({ id });
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Marcos ({marcos.length})</h3>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="flex items-center gap-1 px-2 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400"
          >
            <Plus className="w-3 h-3" /> Novo
          </button>
        )}
      </div>

      {adding && (
        <MarcoForm
          processoId={processoId}
          onDone={() => { setAdding(false); onRefresh(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {marcos.length === 0 && !adding && (
        <p className="text-xs italic text-neutral-400">Nenhum marco.</p>
      )}

      <div className="space-y-1">
        {marcos.map((m) => editingId === m.id ? (
          <MarcoForm
            key={m.id}
            processoId={processoId}
            initial={m}
            onDone={() => { setEditingId(null); onRefresh(); }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={m.id} className="flex items-center justify-between px-3 py-1.5 rounded border text-xs">
            <span>
              <strong>{format(new Date(m.data), "dd/MM/yyyy", { locale: ptBR })}</strong>
              {" · "}{m.tipo.replace(/-/g, " ")}
              {m.documentoReferencia && <span className="text-neutral-500"> · {m.documentoReferencia}</span>}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setEditingId(m.id)}
                className="text-neutral-400 hover:text-emerald-500 cursor-pointer">Editar</button>
              <button onClick={() => handleDelete(m.id)}
                className="text-neutral-400 hover:text-rose-500 cursor-pointer">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
