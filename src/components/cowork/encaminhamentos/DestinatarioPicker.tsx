"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { X } from "lucide-react";

export interface Colega {
  id: number;
  name: string;
}

export function DestinatarioPicker({
  value,
  onChange,
  maxCount = Infinity,
}: {
  value: Colega[];
  onChange: (colegas: Colega[]) => void;
  maxCount?: number;
}) {
  const [query, setQuery] = useState("");
  const { data } = trpc.users.colegasDoWorkspace.useQuery(undefined, {
    staleTime: 60_000,
  });
  const todos = (data ?? []) as Colega[];
  const selectedIds = new Set(value.map((c) => c.id));
  const suggestions = todos
    .filter((c) => !selectedIds.has(c.id))
    .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  const add = (c: Colega) => {
    if (value.length >= maxCount) return;
    onChange([...value, c]);
    setQuery("");
  };
  const remove = (id: number) => onChange(value.filter((c) => c.id !== id));

  const initials = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1.5 p-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg min-h-10 bg-white dark:bg-neutral-900">
        {value.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[12px] font-medium"
          >
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
              {initials(c.name)}
            </span>
            {c.name}
            <button
              type="button"
              onClick={() => remove(c.id)}
              className="cursor-pointer opacity-60 hover:opacity-100"
              aria-label={`Remover ${c.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={value.length === 0 ? "Adicionar colega…" : ""}
          disabled={value.length >= maxCount}
          className="flex-1 min-w-[140px] text-[13px] bg-transparent outline-none px-2 py-1 disabled:cursor-not-allowed"
        />
      </div>
      {query.length > 0 && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => add(c)}
              className="w-full text-left px-3 py-2 text-[13px] hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer flex items-center gap-2"
            >
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                {initials(c.name)}
              </span>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {value.length >= maxCount && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Limite de {maxCount} destinatário{maxCount === 1 ? "" : "s"} atingido.
        </p>
      )}
    </div>
  );
}
