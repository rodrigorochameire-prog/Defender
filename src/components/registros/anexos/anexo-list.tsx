"use client";
import React from "react";
import { FileText, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export function AnexoList({ registroId }: { registroId: number }) {
  const utils = trpc.useUtils();
  const { data: anexos } = trpc.registros.anexos.list.useQuery({ registroId });
  const remove = trpc.registros.anexos.remove.useMutation({
    onSuccess: () => utils.registros.anexos.list.invalidate({ registroId }),
  });
  if (!anexos || anexos.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {anexos.map((a) => (
        <div key={a.id} className="group relative">
          {a.tipo === "imagem" && a.url ? (
            <a href={a.url} target="_blank" rel="noreferrer">
              <img src={a.url} alt={a.nomeOriginal} className="w-16 h-16 object-cover rounded-md border border-neutral-200 dark:border-neutral-700" />
            </a>
          ) : (
            <a href={a.url ?? "#"} target="_blank" rel="noreferrer"
               className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-xs max-w-[160px]">
              <FileText className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
              <span className="truncate">{a.nomeOriginal}</span>
            </a>
          )}
          <button
            type="button"
            onClick={() => remove.mutate({ id: a.id })}
            title="Excluir anexo"
            className="absolute -top-1.5 -right-1.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-neutral-700 text-white"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
