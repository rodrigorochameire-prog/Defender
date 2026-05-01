"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function TriagemFilters({ current }: { current: { status?: string; area?: string; busca?: string } }) {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(sp);
    if (value && value !== "todos" && value !== "todas") next.set(key, value);
    else next.delete(key);
    router.push(`/triagem?${next.toString()}`);
  }

  const statuses = [
    { v: "pendente_avaliacao", l: "Pendentes" },
    { v: "promovido", l: "Promovidos" },
    { v: "resolvido", l: "Resolvidos" },
    { v: "devolvido", l: "Devolvidos" },
    { v: "todos", l: "Todos" },
  ];
  const areas = [
    { v: "todas", l: "Todas áreas" },
    { v: "Juri", l: "Júri" },
    { v: "VVD", l: "VVD" },
    { v: "EP", l: "EP" },
    { v: "Crime1", l: "1ª Crime" },
    { v: "Crime2", l: "2ª Crime" },
  ];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex gap-1">
        {statuses.map(s => (
          <button
            key={s.v}
            onClick={() => update("status", s.v)}
            className={`text-xs rounded px-2 py-1 border ${(current.status ?? "pendente_avaliacao") === s.v ? "bg-foreground text-background" : ""}`}
          >
            {s.l}
          </button>
        ))}
      </div>
      <select
        value={current.area ?? "todas"}
        onChange={e => update("area", e.target.value)}
        className="text-xs border rounded px-2 py-1"
      >
        {areas.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
      </select>
      <input
        type="search"
        placeholder="Buscar nome ou processo..."
        defaultValue={current.busca ?? ""}
        onBlur={e => update("busca", e.target.value)}
        className="text-xs border rounded px-2 py-1 flex-1 min-w-[200px]"
      />
    </div>
  );
}
