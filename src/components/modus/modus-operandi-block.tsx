"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
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
// Tipos locais — espelham o bloco jsonb `modusOperandi` de processos (Fase VI).
// Todos os campos são opcionais; selects guardam strings literais, números são
// nullable, e `tagsAdicionais` é um array de strings preenchido pelo defensor.
// ============================================================================

type Abordagem =
  | "denuncia-anonima"
  | "flagrante-ronda"
  | "bloqueio"
  | "investigacao-previa"
  | "mandado"
  | "apresentacao-espontanea"
  | "outro";

type ArmaUsada = "fogo" | "branca" | "impropriada" | "nenhuma" | "simulada";

type RelacaoAutorVitima =
  | "desconhecido"
  | "conhecido-esporadico"
  | "familiar"
  | "conjugal-atual"
  | "conjugal-ex"
  | "laboral"
  | "vizinho";

type HorarioFato = "madrugada" | "manha" | "tarde" | "noite";

type Contexto =
  | "domicilio"
  | "via-publica"
  | "estabelecimento-comercial"
  | "escolar"
  | "transito"
  | "virtual"
  | "outro";

interface ModusOperandi {
  abordagem?: Abordagem;
  fundadaSuspeitaDocumentada?: boolean;
  armaUsada?: ArmaUsada;
  relacaoAutorVitima?: RelacaoAutorVitima;
  horarioFato?: HorarioFato;
  contexto?: Contexto;
  numAgentesCrime?: number | null;
  numAgentesApreensao?: number | null;
  tagsAdicionais?: string[];
  observacoes?: string | null;
}

const ABORDAGEM_LABEL: Record<Abordagem, string> = {
  "denuncia-anonima": "Denúncia anônima",
  "flagrante-ronda": "Flagrante em ronda",
  bloqueio: "Bloqueio / barreira",
  "investigacao-previa": "Investigação prévia",
  mandado: "Mandado",
  "apresentacao-espontanea": "Apresentação espontânea",
  outro: "Outro",
};

const ARMA_LABEL: Record<ArmaUsada, string> = {
  fogo: "Arma de fogo",
  branca: "Arma branca",
  impropriada: "Arma imprópria",
  nenhuma: "Nenhuma",
  simulada: "Simulada",
};

const RELACAO_LABEL: Record<RelacaoAutorVitima, string> = {
  desconhecido: "Desconhecido",
  "conhecido-esporadico": "Conhecido esporádico",
  familiar: "Familiar",
  "conjugal-atual": "Conjugal (atual)",
  "conjugal-ex": "Conjugal (ex)",
  laboral: "Laboral",
  vizinho: "Vizinho",
};

const HORARIO_LABEL: Record<HorarioFato, string> = {
  madrugada: "Madrugada",
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

const CONTEXTO_LABEL: Record<Contexto, string> = {
  domicilio: "Domicílio",
  "via-publica": "Via pública",
  "estabelecimento-comercial": "Estabelecimento comercial",
  escolar: "Escolar",
  transito: "Trânsito",
  virtual: "Virtual",
  outro: "Outro",
};

const SELECT_CLASS =
  "flex h-10 w-full cursor-pointer rounded-lg border-2 border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring hover:border-border/80";

// Converte string vazia em null (evita "" no jsonb).
function strOrNull(v: string): string | null {
  return v === "" ? null : v;
}

// Converte o conteúdo de um input numérico em number | null.
function numOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function ModusOperandiBlock({ processoId }: { processoId: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.processos.getModus.useQuery({ processoId });

  const mutation = trpc.processos.updateModus.useMutation({
    onSuccess: () => {
      utils.processos.getModus.invalidate({ processoId });
      toast.success("Modus operandi atualizado");
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ModusOperandi>({});

  // Seed do estado local a partir da query (bloco pode vir null).
  useEffect(() => {
    if (!data) return;
    setForm((data.modusOperandi as ModusOperandi | null) ?? {});
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando modus operandi…
      </div>
    );
  }

  const flag = data?.flag ?? null;

  const handleSave = () => {
    mutation.mutate({ processoId, modusOperandi: form });
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
            Modus operandi
          </p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Circunstâncias da abordagem, do fato e da apreensão (Fase VI)
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
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 dark:border-amber-500/50 dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <span className="font-semibold">Possível nulidade:</span>{" "}
                {flag.motivo}
              </p>
            </div>
          )}

          {/* Abordagem */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Abordagem</Label>
              <select
                value={form.abordagem ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    abordagem:
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as Abordagem),
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {(Object.keys(ABORDAGEM_LABEL) as Abordagem[]).map((k) => (
                  <option key={k} value={k}>
                    {ABORDAGEM_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-center gap-2 self-end py-2.5 text-sm text-neutral-700 dark:text-neutral-200">
              <Checkbox
                checked={!!form.fundadaSuspeitaDocumentada}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, fundadaSuspeitaDocumentada: !!v }))
                }
              />
              Fundada suspeita documentada
            </label>
          </div>

          {/* Circunstâncias do fato */}
          <div className="grid grid-cols-1 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-2 dark:border-neutral-800">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Arma usada</Label>
              <select
                value={form.armaUsada ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    armaUsada:
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as ArmaUsada),
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {(Object.keys(ARMA_LABEL) as ArmaUsada[]).map((k) => (
                  <option key={k} value={k}>
                    {ARMA_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">
                Relação autor–vítima
              </Label>
              <select
                value={form.relacaoAutorVitima ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    relacaoAutorVitima:
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as RelacaoAutorVitima),
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {(Object.keys(RELACAO_LABEL) as RelacaoAutorVitima[]).map(
                  (k) => (
                    <option key={k} value={k}>
                      {RELACAO_LABEL[k]}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Horário do fato</Label>
              <select
                value={form.horarioFato ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    horarioFato:
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as HorarioFato),
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {(Object.keys(HORARIO_LABEL) as HorarioFato[]).map((k) => (
                  <option key={k} value={k}>
                    {HORARIO_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">Contexto</Label>
              <select
                value={form.contexto ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    contexto:
                      e.target.value === ""
                        ? undefined
                        : (e.target.value as Contexto),
                  }))
                }
                className={SELECT_CLASS}
              >
                <option value="">—</option>
                {(Object.keys(CONTEXTO_LABEL) as Contexto[]).map((k) => (
                  <option key={k} value={k}>
                    {CONTEXTO_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Agentes */}
          <div className="grid grid-cols-1 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-2 dark:border-neutral-800">
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">
                Nº de agentes no crime
              </Label>
              <Input
                type="number"
                min={0}
                value={form.numAgentesCrime ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    numAgentesCrime: numOrNull(e.target.value),
                  }))
                }
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-500">
                Nº de agentes na apreensão
              </Label>
              <Input
                type="number"
                min={0}
                value={form.numAgentesApreensao ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    numAgentesApreensao: numOrNull(e.target.value),
                  }))
                }
                placeholder="—"
              />
            </div>
          </div>

          {/* Tags adicionais */}
          <div className="space-y-1.5 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <Label className="text-xs text-neutral-500">Tags adicionais</Label>
            <Input
              value={(form.tagsAdicionais ?? []).join(", ")}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tagsAdicionais: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter((t) => t !== ""),
                }))
              }
              placeholder="Ex.: reincidência, confissão, ausência de testemunhas"
            />
            <p className="text-xs text-neutral-400">
              Separe por vírgula.
            </p>
          </div>

          {/* Observações */}
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
              placeholder="Anotações sobre o modus operandi…"
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
