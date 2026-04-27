"use client";

import { trpc } from "@/lib/trpc/client";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  query: string;
  papel?: string;
  onSelect: (pessoaId: number) => void;
  onCreateNew?: (nome: string) => void;
}

export function VincularPessoaPopover({ query, papel, onSelect, onCreateNew }: Props) {
  const { data, isLoading } = trpc.pessoas.searchForAutocomplete.useQuery(
    { query, papel, limit: 8 },
    { enabled: query.trim().length >= 2 },
  );

  const items = data ?? [];

  return (
    <div className="w-64 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-md p-1 text-xs">
      <div className="px-2 py-1 text-[10px] text-neutral-500 flex items-center gap-1">
        <Search className="w-2.5 h-2.5" /> Vincular &ldquo;{query}&rdquo;
      </div>
      {isLoading && <p className="px-2 py-2 italic text-neutral-400">Buscando…</p>}
      {!isLoading && items.length === 0 && (
        <p className="px-2 py-2 italic text-neutral-400">Nenhum match.</p>
      )}
      {items.map((p, i) => (
        <button
          key={p.id}
          type="button"
          aria-label={p.nome}
          onClick={() => onSelect(p.id)}
          className={cn(
            "w-full text-left px-2 py-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer flex items-center gap-2",
            i === 0 && "bg-emerald-50 dark:bg-emerald-900/20",
          )}
        >
          <span className="font-medium flex-1 truncate">{p.nome}</span>
          {p.categoriaPrimaria && (
            <span className="text-[9px] text-neutral-400 uppercase tracking-wide">{p.categoriaPrimaria}</span>
          )}
          {i === 0 && <span className="text-[8px] text-emerald-600 font-semibold">provável</span>}
        </button>
      ))}
      {onCreateNew && query.trim().length >= 2 && (
        <button
          type="button"
          onClick={() => onCreateNew(query)}
          className="w-full text-left px-2 py-1.5 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer flex items-center gap-2 border-t border-neutral-100 dark:border-neutral-800 mt-1"
        >
          <Plus className="w-2.5 h-2.5" />
          <span>Criar nova &ldquo;{query}&rdquo;</span>
        </button>
      )}
    </div>
  );
}
