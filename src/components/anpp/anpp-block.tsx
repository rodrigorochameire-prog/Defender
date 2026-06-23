"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, ShieldCheck } from "lucide-react";
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
// Tipos locais — espelham o bloco jsonb `anpp` de processos (ANPP — art. 28-A
// CPP). Todos os campos são opcionais; datas são strings "YYYY-MM-DD" | null,
// preenchidas manualmente pelo defensor.
// ============================================================================

interface AnppPropostas {
  reparacao?: boolean;
  psc?: boolean;
  multa?: boolean;
  curso?: boolean;
  outras?: string | null;
}

interface Anpp {
  penaMinimaInferior4Anos?: boolean;
  semViolenciaGraveAmeaca?: boolean;
  primario?: boolean;
  confessou?: boolean;
  oferecido?: boolean;
  dataOferecimento?: string | null;
  propostas?: AnppPropostas;
  homologado?: boolean;
  cumprido?: boolean;
  descumprido?: boolean;
  observacoes?: string | null;
}

// Converte string vazia em null (evita "" no jsonb).
function strOrNull(v: string): string | null {
  return v === "" ? null : v;
}

export function AnppBlock({ processoId }: { processoId: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.processos.getAnpp.useQuery({ processoId });

  const mutation = trpc.processos.updateAnpp.useMutation({
    onSuccess: () => {
      utils.processos.getAnpp.invalidate({ processoId });
      toast.success("ANPP atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Anpp>({});

  // Seed do estado local a partir da query (bloco pode vir null).
  useEffect(() => {
    if (!data) return;
    setForm((data.anpp as Anpp | null) ?? {});
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando ANPP…
      </div>
    );
  }

  const flag = data?.flag ?? null;
  const propostas = form.propostas ?? {};

  const updateProposta = (patch: Partial<AnppPropostas>) => {
    setForm((f) => ({ ...f, propostas: { ...(f.propostas ?? {}), ...patch } }));
  };

  const handleSave = () => {
    mutation.mutate({ processoId, anpp: form });
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
            ANPP — acordo de não persecução
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Cabimento, oferecimento, propostas e andamento (art. 28-A CPP)
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

          {/* Cabimento */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Cabimento
            </Label>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!form.penaMinimaInferior4Anos}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, penaMinimaInferior4Anos: !!v }))
                  }
                />
                Pena mínima inferior a 4 anos
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!form.semViolenciaGraveAmeaca}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, semViolenciaGraveAmeaca: !!v }))
                  }
                />
                Sem violência ou grave ameaça
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!form.primario}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, primario: !!v }))
                  }
                />
                Primário
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!form.confessou}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, confessou: !!v }))
                  }
                />
                Confessou formal e circunstanciadamente
              </label>
            </div>
          </div>

          {/* Oferecimento */}
          <div className="space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Oferecimento
            </Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!form.oferecido}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, oferecido: !!v }))
                  }
                />
                ANPP oferecido pelo MP
              </label>
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-500">
                  Data do oferecimento
                </Label>
                <Input
                  type="date"
                  value={form.dataOferecimento ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dataOferecimento: strOrNull(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Propostas */}
          <div className="space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Propostas
            </Label>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!propostas.reparacao}
                  onCheckedChange={(v) => updateProposta({ reparacao: !!v })}
                />
                Reparação do dano
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!propostas.psc}
                  onCheckedChange={(v) => updateProposta({ psc: !!v })}
                />
                Prestação de serviços à comunidade
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!propostas.multa}
                  onCheckedChange={(v) => updateProposta({ multa: !!v })}
                />
                Prestação pecuniária / multa
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!propostas.curso}
                  onCheckedChange={(v) => updateProposta({ curso: !!v })}
                />
                Curso / medida educativa
              </label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Outras condições</Label>
              <Input
                value={propostas.outras ?? ""}
                onChange={(e) =>
                  updateProposta({ outras: strOrNull(e.target.value) })
                }
                placeholder="Ex.: comparecimento mensal em juízo"
              />
            </div>
          </div>

          {/* Andamento */}
          <div className="space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
              Andamento
            </Label>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!form.homologado}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, homologado: !!v }))
                  }
                />
                Homologado
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!form.cumprido}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, cumprido: !!v }))
                  }
                />
                Cumprido
              </label>
              <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
                <Checkbox
                  checked={!!form.descumprido}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, descumprido: !!v }))
                  }
                />
                Descumprido
              </label>
            </div>
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
              placeholder="Anotações sobre o ANPP…"
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
