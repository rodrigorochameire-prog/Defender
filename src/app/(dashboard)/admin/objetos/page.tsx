"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { ObjetoChip } from "@/components/objetos";
import { Plus } from "lucide-react";

export default function ObjetosCatalogoPage() {
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");

  const { data = [], isLoading } = trpc.objetos.list.useQuery({
    search: search || undefined,
    tipo: tipo || undefined,
    limit: 100,
  });

  const list = data as any[];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Objetos apreendidos ({list.length})</h1>
        <Link href="/admin/objetos/novo" className="px-3 py-1.5 rounded border text-sm flex items-center gap-1 cursor-pointer hover:border-emerald-400">
          <Plus className="w-3 h-3" /> Novo
        </Link>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          placeholder="Buscar por descrição, marca, modelo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1.5 border rounded text-sm w-80"
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="px-2 py-1.5 border rounded text-sm">
          <option value="">Todos os tipos</option>
          <option value="arma-fogo">Arma de fogo</option>
          <option value="munição">Munição</option>
          <option value="droga">Droga</option>
          <option value="celular">Celular</option>
          <option value="veiculo">Veículo</option>
          <option value="dinheiro">Dinheiro</option>
          <option value="outro">Outro</option>
        </select>
      </div>

      {isLoading && <p className="text-sm italic text-neutral-400">Carregando...</p>}
      {!isLoading && list.length === 0 && <p className="text-sm italic text-neutral-400">Nenhum objeto cadastrado.</p>}

      <div className="space-y-1.5">
        {list.map((o) => (
          <div key={o.id} className="rounded border px-3 py-2 flex items-center gap-2">
            <ObjetoChip objetoId={o.id} tipo={o.tipo} descricao={o.descricao} />
            <span className="text-xs text-neutral-500">
              {o.marca} {o.modelo}
              {o.quantidade && ` · ${o.quantidade}${o.unidade ?? ""}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
