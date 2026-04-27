"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PessoaChip, PessoaSheet } from "@/components/pessoas";
import { Plus } from "lucide-react";

export default function PessoasPage() {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [sheetId, setSheetId] = useState<number | null>(null);

  const { data, isLoading } = trpc.pessoas.list.useQuery({
    search: search || undefined,
    limit: 50,
    offset,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Pessoas</h1>
          <p className="text-xs text-neutral-500 mt-1">Catálogo global — {total} pessoas</p>
        </div>
        <Link href="/admin/pessoas/nova">
          <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" /> Nova pessoa</Button>
        </Link>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar por nome…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          className="max-w-md"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-xs text-neutral-500">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Nome</th>
              <th className="text-left px-3 py-2 font-medium">Categoria</th>
              <th className="text-left px-3 py-2 font-medium">Fonte</th>
              <th className="text-left px-3 py-2 font-medium">Confidence</th>
              <th className="text-left px-3 py-2 font-medium">Criada</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-500 text-xs">Carregando…</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-neutral-500 text-xs">Nenhuma pessoa encontrada.</td></tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-t hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 cursor-pointer" onClick={() => setSheetId(p.id)}>
                <td className="px-3 py-2">
                  <PessoaChip nome={p.nome} papel={p.categoriaPrimaria ?? undefined} clickable={false} size="sm" />
                </td>
                <td className="px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400">{p.categoriaPrimaria ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">{p.fonteCriacao}</td>
                <td className="px-3 py-2 text-xs text-neutral-500 tabular-nums">{p.confidence}</td>
                <td className="px-3 py-2 text-xs text-neutral-500">{new Date(p.createdAt as any).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 50 && (
        <div className="flex items-center justify-between mt-4">
          <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
            Anterior
          </Button>
          <span className="text-xs text-neutral-500">{offset + 1}–{Math.min(offset + 50, total)} de {total}</span>
          <Button size="sm" variant="outline" disabled={offset + 50 >= total} onClick={() => setOffset(offset + 50)}>
            Próxima
          </Button>
        </div>
      )}

      <PessoaSheet pessoaId={sheetId} open={sheetId !== null} onOpenChange={(o) => !o && setSheetId(null)} />
    </div>
  );
}
