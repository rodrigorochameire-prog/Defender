"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

interface Props {
  leiId: string;
  artigoId: string;
}

export function ArtigoDiff({ leiId, artigoId }: Props) {
  const [open, setOpen] = useState(false);

  const { data: versoes } = trpc.legislacao.listVersoes.useQuery(
    { leiId, artigoId },
    { enabled: open, staleTime: 300_000 }
  );

  // Fetch versões eagerly (without expanding) to know if the badge should appear
  const { data: temVersoes } = trpc.legislacao.listVersoes.useQuery(
    { leiId, artigoId },
    { staleTime: 300_000 }
  );

  if (temVersoes !== undefined && temVersoes.length === 0) return null;

  const ultima = versoes?.[0];

  const linhasAntes = (ultima?.textoAnterior ?? "").split("\n").filter(Boolean);
  const linhasDepois = (ultima?.textoNovo ?? "").split("\n").filter(Boolean);
  const setAntes = new Set(linhasAntes);
  const setDepois = new Set(linhasDepois);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 cursor-pointer hover:bg-amber-100 transition-colors"
      >
        <History className="w-3 h-3" />
        Ver o que mudou
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && ultima && (
        <div className="mt-2 rounded-lg border border-amber-200 overflow-hidden text-xs font-mono">
          <div className="bg-amber-50 px-3 py-1.5 text-amber-800 font-medium font-sans">
            Alteração: {ultima.leisAlteradora ?? "Lei não identificada"}
            {ultima.dataVigencia && (
              <span className="ml-2 text-amber-600">· Vigência: {ultima.dataVigencia}</span>
            )}
          </div>
          <div className="grid grid-cols-2 divide-x divide-amber-200">
            <div className="p-3 bg-red-50/40">
              <div className="text-red-700 font-semibold font-sans mb-2">ANTES</div>
              {linhasAntes.map((linha, i) => (
                <div
                  key={i}
                  className={cn(
                    "leading-relaxed py-0.5",
                    !setDepois.has(linha) && "bg-red-100 line-through text-red-600 rounded px-1"
                  )}
                >
                  {linha}
                </div>
              ))}
            </div>
            <div className="p-3 bg-emerald-50/40">
              <div className="text-emerald-700 font-semibold font-sans mb-2">DEPOIS</div>
              {linhasDepois.map((linha, i) => (
                <div
                  key={i}
                  className={cn(
                    "leading-relaxed py-0.5",
                    !setAntes.has(linha) && "bg-emerald-100 font-medium text-emerald-800 rounded px-1"
                  )}
                >
                  {linha}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {open && !ultima && (
        <div className="mt-2 p-3 text-xs text-zinc-500 bg-zinc-50 rounded-lg border">
          Carregando histórico de alterações...
        </div>
      )}
    </div>
  );
}
