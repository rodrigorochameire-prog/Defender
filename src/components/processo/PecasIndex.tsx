"use client";

import { useState, useMemo } from "react";
import { Search, List } from "lucide-react";
import { PecaGroup, DepoimentoGroup } from "./PecaGroup";
import type { PecaItemData } from "./PecaItem";

interface PecasIndexProps {
  groups: { key: string; sections: PecaItemData[] }[];
  depoimentos: { pessoa: string; sections: PecaItemData[] }[];
  activeId: number | null;
  onSelect: (id: number) => void;
  total: number;
}

export function PecasIndex({ groups, depoimentos, activeId, onSelect, total }: PecasIndexProps) {
  const [search, setSearch] = useState("");

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        sections: g.sections.filter(
          (s) => s.titulo.toLowerCase().includes(q) || s.tipo.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.sections.length > 0);
  }, [groups, search]);

  const filteredDepoimentos = useMemo(() => {
    if (!search.trim()) return depoimentos;
    const q = search.toLowerCase();
    return depoimentos
      .map((dp) => ({
        ...dp,
        sections: dp.sections.filter(
          (s) => s.titulo.toLowerCase().includes(q) || dp.pessoa.toLowerCase().includes(q),
        ),
      }))
      .filter((dp) => dp.sections.length > 0);
  }, [depoimentos, search]);

  const visibleCount =
    filteredGroups.reduce((acc, g) => acc + g.sections.length, 0) +
    filteredDepoimentos.reduce((acc, dp) => acc + dp.sections.length, 0);

  if (total === 0) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/40 dark:bg-zinc-900/40 p-8 text-center">
        <List className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Nenhuma peça classificada</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
          Use o botão &quot;Classificar&quot; no PDF dos autos para extrair as peças
        </p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 overflow-hidden flex flex-col">
      <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
          Peças
        </span>
        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
          {visibleCount}
          {search && total !== visibleCount ? ` / ${total}` : ""}
        </span>
      </div>

      <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar peças..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {filteredGroups
          .filter((g) => ["acusacao", "decisoes"].includes(g.key))
          .map((g) => (
            <PecaGroup
              key={g.key}
              groupKey={g.key}
              sections={g.sections}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}

        <DepoimentoGroup
          depoimentos={filteredDepoimentos}
          activeId={activeId}
          onSelect={onSelect}
        />

        {filteredGroups
          .filter((g) => !["acusacao", "decisoes"].includes(g.key))
          .map((g) => (
            <PecaGroup
              key={g.key}
              groupKey={g.key}
              sections={g.sections}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}

        {visibleCount === 0 && search && (
          <div className="px-3 py-6 text-center text-xs text-zinc-500">
            Nenhuma peça encontrada para &quot;{search}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
