"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface Props {
  aId: number;
  bId: number;
  aEndereco: string;
  bEndereco: string;
  onDone: () => void;
}

export function MergePairCardLugar({ aId, bId, aEndereco, bEndereco, onDone }: Props) {
  const [keepId, setKeepId] = useState(aId);
  const mergeMut = trpc.lugares.merge.useMutation({
    onSuccess: () => { toast.success("Mergeado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });
  const distinctMut = trpc.lugares.markDistinct.useMutation({
    onSuccess: () => { toast.success("Marcado como distinto"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded border px-3 py-2 space-y-2">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="radio"
            name={`keep-${aId}-${bId}`}
            checked={keepId === aId}
            onChange={() => setKeepId(aId)}
          />
          <span className={keepId === aId ? "font-medium" : ""}>{aEndereco}</span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="radio"
            name={`keep-${aId}-${bId}`}
            checked={keepId === bId}
            onChange={() => setKeepId(bId)}
          />
          <span className={keepId === bId ? "font-medium" : ""}>{bEndereco}</span>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => mergeMut.mutate({ keepId, mergeId: keepId === aId ? bId : aId })}
          disabled={mergeMut.isPending}
          className="px-2 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400 disabled:opacity-40"
        >
          Mergear
        </button>
        <button
          onClick={() => distinctMut.mutate({ aId, bId })}
          disabled={distinctMut.isPending}
          className="px-2 py-1 rounded border text-xs cursor-pointer hover:border-neutral-400 disabled:opacity-40"
        >
          São distintos
        </button>
      </div>
    </div>
  );
}
