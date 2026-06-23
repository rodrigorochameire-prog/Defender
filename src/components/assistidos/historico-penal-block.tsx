"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// ============================================================================
// Tipos locais — espelham o bloco jsonb `historicoPenal` de assistidos.
// Datas são strings "YYYY-MM-DD" | null; o defensor preenche manualmente.
// ============================================================================

type Primariedade =
  | "primario"
  | "reincidente-generico"
  | "reincidente-especifico";

interface CondenacaoAnterior {
  delito?: string | null;
  pena?: string | null;
  regime?: string | null;
  dataTransitoJulgado?: string | null;
  extinta?: boolean;
  extintaMotivo?: string | null;
}

interface HistoricoPenal {
  primariedade?: Primariedade;
  condenacoesAnteriores?: CondenacaoAnterior[];
  passagensPoliciaisSemCondenacao?: number;
  mausAntecedentesAlegados?: boolean;
  anppAnterior?: boolean;
  observacoes?: string | null;
}

const PRIMARIEDADE_OPCOES: { value: Primariedade; label: string }[] = [
  { value: "primario", label: "Primário" },
  { value: "reincidente-generico", label: "Reincidente genérico" },
  { value: "reincidente-especifico", label: "Reincidente específico" },
];

// Converte string vazia em null (evita "" no jsonb).
function strOrNull(v: string): string | null {
  return v === "" ? null : v;
}

// Converte string vazia do <input type="number"> em 0 (campo é number, não nullable).
function numberOrZero(v: string): number {
  if (v.trim() === "") return 0;
  const n = Number(v);
  return Number.isNaN(n) || n < 0 ? 0 : Math.trunc(n);
}

const SELECT_CLASS =
  "flex h-10 w-full cursor-pointer rounded-lg border-2 border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring hover:border-border/80";

export function HistoricoPenalBlock({ assistidoId }: { assistidoId: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.assistidos.getHistoricoPenal.useQuery({
    assistidoId,
  });

  const mutation = trpc.assistidos.updateHistoricoPenal.useMutation({
    onSuccess: () => {
      utils.assistidos.getHistoricoPenal.invalidate({ assistidoId });
      toast.success("Histórico penal atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<HistoricoPenal>({});

  // Seed do estado local a partir da query (bloco pode vir null).
  useEffect(() => {
    if (!data) return;
    setForm((data.historicoPenal as HistoricoPenal | null) ?? {});
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico penal…
      </div>
    );
  }

  const flag = data?.flagPrimariedade ?? null;
  const condenacoes = form.condenacoesAnteriores ?? [];

  const updateCondenacao = (
    idx: number,
    patch: Partial<CondenacaoAnterior>,
  ) => {
    setForm((f) => {
      const list = [...(f.condenacoesAnteriores ?? [])];
      list[idx] = { ...list[idx], ...patch };
      return { ...f, condenacoesAnteriores: list };
    });
  };

  const addCondenacao = () => {
    setForm((f) => ({
      ...f,
      condenacoesAnteriores: [...(f.condenacoesAnteriores ?? []), {}],
    }));
  };

  const removeCondenacao = (idx: number) => {
    setForm((f) => ({
      ...f,
      condenacoesAnteriores: (f.condenacoesAnteriores ?? []).filter(
        (_, i) => i !== idx,
      ),
    }));
  };

  const handleSave = () => {
    mutation.mutate({ assistidoId, historicoPenal: form });
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            Histórico penal
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Antecedentes, condenações e argumentos de primariedade
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-4 border-t border-neutral-100 px-4 py-4 dark:border-neutral-800">
          {flag && (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500/50 dark:bg-emerald-500/10">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs text-emerald-800 dark:text-emerald-200">
                <span className="font-semibold">Argumento de defesa:</span>{" "}
                {flag.motivo}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Primariedade</Label>
              <select
                value={form.primariedade ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    primariedade:
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as Primariedade),
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {PRIMARIEDADE_OPCOES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">
                Passagens policiais sem condenação
              </Label>
              <Input
                type="number"
                min={0}
                value={form.passagensPoliciaisSemCondenacao ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    passagensPoliciaisSemCondenacao: numberOrZero(
                      e.target.value,
                    ),
                  }))
                }
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
              <Checkbox
                checked={!!form.mausAntecedentesAlegados}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, mausAntecedentesAlegados: !!v }))
                }
              />
              Maus antecedentes alegados
            </label>
            <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
              <Checkbox
                checked={!!form.anppAnterior}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, anppAnterior: !!v }))
                }
              />
              ANPP anterior
            </label>
          </div>

          {/* Condenações anteriores — sub-formulário repetível */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Condenações anteriores
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={addCondenacao}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar condenação
              </Button>
            </div>

            {condenacoes.length === 0 && (
              <p className="text-xs italic text-neutral-400 dark:text-neutral-500">
                Nenhuma condenação registrada.
              </p>
            )}

            {condenacoes.map((c, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 dark:border-neutral-800 dark:bg-neutral-800/30"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-neutral-500">
                    Condenação {idx + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeCondenacao(idx)}
                    className="cursor-pointer rounded-md p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    aria-label={`Remover condenação ${idx + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-500">Delito</Label>
                    <Input
                      value={c.delito ?? ""}
                      onChange={(e) =>
                        updateCondenacao(idx, {
                          delito: strOrNull(e.target.value),
                        })
                      }
                      placeholder="Ex.: Furto (art. 155 CP)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-500">Pena</Label>
                    <Input
                      value={c.pena ?? ""}
                      onChange={(e) =>
                        updateCondenacao(idx, {
                          pena: strOrNull(e.target.value),
                        })
                      }
                      placeholder="Ex.: 1 ano e 6 meses"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-500">Regime</Label>
                    <Input
                      value={c.regime ?? ""}
                      onChange={(e) =>
                        updateCondenacao(idx, {
                          regime: strOrNull(e.target.value),
                        })
                      }
                      placeholder="Ex.: Aberto"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-500">
                      Trânsito em julgado
                    </Label>
                    <Input
                      type="date"
                      value={c.dataTransitoJulgado ?? ""}
                      onChange={(e) =>
                        updateCondenacao(idx, {
                          dataTransitoJulgado: strOrNull(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-neutral-700 dark:text-neutral-200">
                  <Checkbox
                    checked={!!c.extinta}
                    onCheckedChange={(v) =>
                      updateCondenacao(idx, { extinta: !!v })
                    }
                  />
                  Punibilidade extinta
                </label>

                {c.extinta && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-neutral-500">
                      Motivo da extinção
                    </Label>
                    <Input
                      value={c.extintaMotivo ?? ""}
                      onChange={(e) =>
                        updateCondenacao(idx, {
                          extintaMotivo: strOrNull(e.target.value),
                        })
                      }
                      placeholder="Ex.: Prescrição da pretensão executória"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-500">Observações</Label>
            <Textarea
              value={form.observacoes ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  observacoes: strOrNull(e.target.value),
                }))
              }
              placeholder="Anotações sobre o histórico penal…"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={mutation.isPending}
              onClick={handleSave}
            >
              {mutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {mutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
