"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { LugarForm } from "@/components/lugares/lugar-form";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Tab = "geral" | "participacoes" | "merge";

export default function LugarDetalhePage() {
  const params = useParams();
  const id = Number(params?.id);
  const [tab, setTab] = useState<Tab>("geral");

  const { data: lugar, isLoading } = trpc.lugares.getById.useQuery(
    { id },
    { enabled: !isNaN(id) },
  );
  const { data: participacoes = [] } = trpc.lugares.getParticipacoesDoLugar.useQuery(
    { lugarId: id },
    { enabled: !isNaN(id) },
  );
  const geocode = trpc.lugares.geocode.useMutation();

  if (isLoading) return <p className="p-6 text-sm text-neutral-500">Carregando…</p>;
  if (!lugar) return <p className="p-6 text-sm text-neutral-500">Lugar não encontrado.</p>;

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-lg font-semibold mb-4">{lugar.enderecoCompleto}</h1>

      <div role="tablist" className="flex gap-2 mb-4 border-b">
        {(["geral", "participacoes", "merge"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "px-3 py-1.5 text-sm cursor-pointer",
              tab === t
                ? "border-b-2 border-emerald-500 font-medium"
                : "text-neutral-500",
            )}
          >
            {t === "geral"
              ? "Geral"
              : t === "participacoes"
                ? `Participações (${(participacoes as any[]).length})`
                : "Merge"}
          </button>
        ))}
      </div>

      {tab === "geral" && (
        <div className="space-y-4">
          <LugarForm mode="edit" initial={lugar as any} />
          <div className="pt-4 border-t">
            <div className="text-xs text-neutral-500 mb-2">
              Lat/Lng:{" "}
              {lugar.latitude != null
                ? `${Number(lugar.latitude).toFixed(5)}, ${Number(lugar.longitude).toFixed(5)}`
                : "—"}
              {lugar.geocodingSource && ` · ${lugar.geocodingSource}`}
            </div>
            <button
              type="button"
              onClick={() => geocode.mutate({ id, force: lugar.latitude != null })}
              disabled={geocode.isPending}
              className="px-3 py-1.5 rounded border text-xs cursor-pointer hover:border-emerald-400"
            >
              {geocode.isPending
                ? "Geocodando…"
                : lugar.latitude != null
                  ? "Re-geocodar"
                  : "Geocodar"}
            </button>
          </div>
        </div>
      )}

      {tab === "participacoes" && (
        <div className="space-y-2">
          {(participacoes as any[]).length === 0 ? (
            <p className="italic text-neutral-400 text-sm">Nenhuma.</p>
          ) : (
            (participacoes as any[]).map((p) => (
              <div key={p.id} className="rounded border px-3 py-2 text-sm">
                <div className="font-medium">{p.tipo?.replace(/-/g, " ")}</div>
                <div className="text-xs text-neutral-500">
                  {p.processoId && (
                    <Link
                      href={`/admin/processos/${p.processoId}`}
                      className="underline"
                    >
                      Processo #{p.processoId}
                    </Link>
                  )}
                  {p.pessoaId && (
                    <>
                      {" · "}
                      <Link
                        href={`/admin/pessoas/${p.pessoaId}`}
                        className="underline"
                      >
                        Pessoa #{p.pessoaId}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "merge" && (
        <p className="italic text-neutral-400 text-sm">
          Veja candidatos globais em{" "}
          <Link href="/admin/lugares/merge-queue" className="underline">
            merge-queue
          </Link>
          .
        </p>
      )}
    </div>
  );
}
