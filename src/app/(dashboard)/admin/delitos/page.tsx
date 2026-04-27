"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Scale } from "lucide-react";

export default function DelitosCatalogoPage() {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");

  const { data = [], isLoading } = trpc.tipificacoes.listCatalogo.useQuery({
    search: search || undefined,
    area: area || undefined,
    limit: 100,
  });

  const list = data as any[];

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-5 h-5" />
        <h1 className="text-lg font-semibold">Catálogo de Delitos ({list.length})</h1>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          placeholder="Buscar por descrição, artigo ou lei..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1.5 border rounded text-sm w-80"
        />
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="px-2 py-1.5 border rounded text-sm"
        >
          <option value="">Todas as áreas</option>
          <option value="JURI">Júri</option>
          <option value="CRIMINAL">Criminal</option>
          <option value="VIOLENCIA_DOMESTICA">VVD</option>
          <option value="INFANCIA_JUVENTUDE">Infância e Juventude</option>
        </select>
      </div>

      {isLoading && <p className="italic text-neutral-400 text-sm">Carregando...</p>}
      {!isLoading && list.length === 0 && (
        <p className="italic text-neutral-400 text-sm">Nenhum delito encontrado.</p>
      )}

      <div className="space-y-1.5">
        {list.map((d) => (
          <div key={d.id} className="rounded border px-3 py-2 text-sm flex items-start justify-between gap-2">
            <div>
              <div className="font-medium">{d.descricaoCurta}</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                <span className="font-mono">
                  {d.codigoLei}
                  {d.artigo && ` art. ${d.artigo}`}
                  {d.paragrafo && ` ${d.paragrafo}`}
                </span>
                {d.areaSugerida && <span className="ml-2">· {d.areaSugerida}</span>}
                {d.hediondo && <span className="ml-2 text-rose-600 font-medium">hediondo</span>}
              </div>
            </div>
            <div className="text-[10px] text-neutral-400 text-right">
              {d.penaMinAnos != null && `${d.penaMinAnos}–${d.penaMaxAnos} anos`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
