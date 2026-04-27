"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Props {
  lugarId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "geral" | "participacoes" | "coordenadas" | "merge";

export function LugarSheet({ lugarId, open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("geral");

  const { data: lugar, isLoading } = trpc.lugares.getById.useQuery(
    { id: lugarId ?? 0 },
    { enabled: !!lugarId && open, retry: false },
  );
  const { data: participacoes = [] } = trpc.lugares.getParticipacoesDoLugar.useQuery(
    { lugarId: lugarId ?? 0 },
    { enabled: !!lugarId && open, retry: false },
  );
  const geocodeMutation = trpc.lugares.geocode.useMutation();

  if (lugarId === null) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col gap-0">
        <div className="bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/40 px-4 py-3 flex items-center gap-2">
          <SheetHeader className="p-0">
            <SheetTitle className="text-sm font-semibold">Lugar</SheetTitle>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <p className="p-4 text-xs text-neutral-500">Carregando…</p>}
          {!isLoading && !lugar && (
            <p className="p-4 text-xs text-neutral-500">Lugar não encontrado</p>
          )}
          {!isLoading && lugar && (
            <>
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-neutral-500" />
                <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                  {lugar.enderecoCompleto}
                </h2>
              </div>

              <div role="tablist" className="flex border-b border-neutral-200 dark:border-neutral-800 px-2">
                {(["geral", "participacoes", "coordenadas", "merge"] as Tab[]).map((t) => {
                  const label =
                    t === "geral"
                      ? "Geral"
                      : t === "participacoes"
                        ? `Participações (${participacoes.length})`
                        : t === "coordenadas"
                          ? "Coordenadas"
                          : "Merge";
                  return (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={tab === t}
                      onClick={() => setTab(t)}
                      className={cn(
                        "px-3 py-2 text-[11px] font-medium border-b-2 cursor-pointer",
                        tab === t
                          ? "border-foreground text-foreground"
                          : "border-transparent text-neutral-500",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div className="px-4 py-3 text-sm">
                {tab === "geral" && (
                  <div className="space-y-2">
                    <div><strong>Logradouro:</strong> {lugar.logradouro ?? "—"}</div>
                    <div><strong>Número:</strong> {lugar.numero ?? "—"}</div>
                    <div><strong>Bairro:</strong> {lugar.bairro ?? "—"}</div>
                    <div>
                      <strong>Cidade/UF:</strong> {lugar.cidade ?? "—"} / {lugar.uf ?? "—"}
                    </div>
                    <div><strong>CEP:</strong> {(lugar as any).cep ?? "—"}</div>
                    <div><strong>Observações:</strong> {(lugar as any).observacoes ?? "—"}</div>
                  </div>
                )}

                {tab === "participacoes" && (
                  <div className="space-y-1.5 text-xs">
                    {participacoes.length === 0 ? (
                      <p className="italic text-neutral-400">Nenhuma participação vinculada.</p>
                    ) : (
                      (participacoes as any[]).map((p) => (
                        <div key={p.id} className="rounded border px-2 py-1.5">
                          <div className="font-medium">{p.tipo?.replace(/-/g, " ")}</div>
                          <div className="text-neutral-500">
                            {p.processoId && `Processo #${p.processoId}`}
                            {p.pessoaId && ` · Pessoa #${p.pessoaId}`}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {tab === "coordenadas" && (
                  <div className="space-y-2">
                    {lugar.latitude != null ? (
                      <>
                        <div>
                          Lat/Lng:{" "}
                          <strong>
                            {Number(lugar.latitude).toFixed(5)},{" "}
                            {Number(lugar.longitude).toFixed(5)}
                          </strong>
                        </div>
                        <div>Fonte: {lugar.geocodingSource ?? "—"}</div>
                      </>
                    ) : (
                      <p className="italic text-neutral-400">Sem coordenadas.</p>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        geocodeMutation.mutate({ id: lugarId, force: lugar.latitude != null })
                      }
                      disabled={geocodeMutation.isPending}
                      className="px-3 py-1.5 rounded border text-xs cursor-pointer hover:border-emerald-400"
                    >
                      {geocodeMutation.isPending
                        ? "Geocodando…"
                        : lugar.latitude != null
                          ? "Re-geocodar"
                          : "Geocodar"}
                    </button>
                  </div>
                )}

                {tab === "merge" && (
                  <p className="italic text-neutral-400">
                    Veja o merge-queue global em /admin/lugares/merge-queue.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
