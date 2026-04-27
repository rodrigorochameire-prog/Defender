"use client";

import { Button } from "@/components/ui/button";
import { PessoaChip } from "./pessoa-chip";

interface Pessoa {
  id: number;
  nome: string;
  cpf?: string | null;
  categoriaPrimaria?: string | null;
  confidence?: string;
}

interface Props {
  pair: { a: Pessoa; b: Pessoa };
  onMerge: (args: { fromId: number; intoId: number }) => void;
  onDistinct: (args: { pessoaAId: number; pessoaBId: number }) => void;
}

export function MergePairCard({ pair, onMerge, onDistinct }: Props) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-semibold">Possível duplicata: &ldquo;{pair.a.nome}&rdquo;</h3>
      <div className="grid grid-cols-2 gap-3">
        {[pair.a, pair.b].map((p) => (
          <div key={p.id} className="border rounded p-3 text-xs space-y-1 bg-neutral-50 dark:bg-neutral-900/40">
            <PessoaChip nome={p.nome} papel={p.categoriaPrimaria ?? undefined} clickable={false} size="sm" />
            <div><span className="text-neutral-400">#</span>{p.id}</div>
            <div><span className="text-neutral-400">CPF:</span> {p.cpf ?? "—"}</div>
            <div><span className="text-neutral-400">Cat:</span> {p.categoriaPrimaria ?? "—"}</div>
            <div><span className="text-neutral-400">Conf:</span> {p.confidence}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end flex-wrap">
        <Button size="sm" variant="outline" onClick={() => onMerge({ fromId: pair.b.id, intoId: pair.a.id })}>
          Mesclar em #{pair.a.id}
        </Button>
        <Button size="sm" variant="outline" onClick={() => onMerge({ fromId: pair.a.id, intoId: pair.b.id })}>
          Mesclar em #{pair.b.id}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDistinct({ pessoaAId: pair.a.id, pessoaBId: pair.b.id })}>
          São distintas
        </Button>
      </div>
    </div>
  );
}
