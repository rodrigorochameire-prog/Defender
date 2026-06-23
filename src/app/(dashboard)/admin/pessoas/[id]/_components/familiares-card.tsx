"use client";

import Link from "next/link";
import { Users, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Familiar {
  id: number;
  grau: string;
  nomeLivre?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  relacionadaPessoaId?: number | null;
  confirmado?: boolean;
}

const GRAU_LABEL: Record<string, string> = {
  mae: "mãe",
  pai: "pai",
  conjuge: "cônjuge",
  filho: "filho(a)",
  irmao: "irmão(ã)",
  contato: "contato",
  outro: "outro",
};

/**
 * Familiares/contatos do assistido (réu) — chips com grau + telefone. Quando o
 * familiar já é pessoa no grafo (`relacionadaPessoaId`), vira link para a Ficha dele.
 */
export function FamiliaresCard({
  familiares,
  isLoading,
}: {
  familiares: Familiar[];
  isLoading: boolean;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mb-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-neutral-400" />
        <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Familiares e contatos{" "}
          {!isLoading && <span className="text-neutral-400">({familiares.length})</span>}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
      ) : familiares.length === 0 ? (
        <p className="text-xs italic text-neutral-400">Nenhum familiar registrado.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {familiares.map((f) => {
            const nome = f.nomeLivre?.trim() || "(sem nome)";
            const grau = GRAU_LABEL[f.grau] ?? f.grau;
            const inner = (
              <>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{nome}</span>
                <span className="text-[10px] uppercase tracking-wide text-neutral-400">{grau}</span>
                {f.telefone && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-700 dark:text-emerald-400">
                    <Phone className="h-3 w-3" />
                    {f.telefone}
                  </span>
                )}
              </>
            );
            const cls =
              "inline-flex flex-col gap-0.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800/50";
            return (
              <li key={f.id}>
                {f.relacionadaPessoaId ? (
                  <Link
                    href={`/admin/pessoas/${f.relacionadaPessoaId}`}
                    className={`${cls} transition-colors hover:border-emerald-400 cursor-pointer`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <span className={cls}>{inner}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
