"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { LugarChip, LugarSheet } from "@/components/lugares";
import { Plus } from "lucide-react";
import { computeLugarDotLevel } from "@/lib/lugares/compute-lugar-dot";

export default function LugaresCatalogoPage() {
  const [search, setSearch] = useState("");
  const [bairro, setBairro] = useState("");
  const [temCoord, setTemCoord] = useState(false);
  const [sheetId, setSheetId] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading } = trpc.lugares.list.useQuery({
    search: search || undefined,
    bairro: bairro || undefined,
    temCoord: temCoord || undefined,
    limit,
    offset,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const lugarIds = items.map((l) => l.id);
  const { data: signals = [] } = trpc.lugares.getBatchSignals.useQuery(
    { lugarIds },
    { enabled: lugarIds.length > 0 }
  );
  const signalMap = new Map((signals as any[]).map((s: any) => [s.lugarId, s]));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Lugares ({total})</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/lugares/merge-queue"
            className="text-xs text-neutral-500 underline hover:text-neutral-700"
          >
            Merge-queue
          </Link>
          <Link
            href="/admin/lugares/nova"
            className="px-3 py-1.5 rounded border text-sm flex items-center gap-1 cursor-pointer hover:border-emerald-400"
          >
            <Plus className="w-3 h-3" /> Novo
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-3 flex-wrap">
        <input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          className="px-2 py-1.5 border rounded text-sm w-60"
        />
        <input
          placeholder="Bairro"
          value={bairro}
          onChange={(e) => { setBairro(e.target.value); setOffset(0); }}
          className="px-2 py-1.5 border rounded text-sm w-40"
        />
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={temCoord}
            onChange={(e) => { setTemCoord(e.target.checked); setOffset(0); }}
          />
          só c/ coord
        </label>
      </div>

      {isLoading && (
        <p className="text-sm text-neutral-400 italic">Carregando...</p>
      )}
      {!isLoading && items.length === 0 && (
        <p className="text-sm text-neutral-400 italic">Nenhum lugar encontrado.</p>
      )}

      <div className="space-y-1.5">
        {items.map((l) => {
          const sig = signalMap.get(l.id);
          const dot = sig ? computeLugarDotLevel(sig) : "none";
          return (
          <div key={l.id} className="rounded border px-3 py-2 flex items-center gap-2">
            <LugarChip
              lugarId={l.id}
              enderecoCompleto={l.enderecoCompleto}
              bairro={l.bairro}
              onClick={() => setSheetId(l.id)}
              size="sm"
              dotLevel={dot}
            />
            <span className="text-xs text-neutral-400 ml-auto">
              {l.latitude != null ? "🗺" : "📍"}{" "}
              {(l as any).geocodingSource ?? ""}
            </span>
          </div>
          );
        })}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <button
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - limit))}
            className="px-3 py-1 border rounded cursor-pointer disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="text-xs text-neutral-500">
            {offset + 1}—{Math.min(offset + limit, total)} de {total}
          </span>
          <button
            disabled={offset + limit >= total}
            onClick={() => setOffset((o) => o + limit)}
            className="px-3 py-1 border rounded cursor-pointer disabled:opacity-40"
          >
            Próxima →
          </button>
        </div>
      )}

      <LugarSheet
        lugarId={sheetId}
        open={sheetId !== null}
        onOpenChange={(o) => !o && setSheetId(null)}
      />
    </div>
  );
}
