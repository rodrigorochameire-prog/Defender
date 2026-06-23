"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
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
import { MEDIDA_MPU, rotuloMedida } from "@/lib/mpu/medidas-taxonomia";

// ============================================================================
// Tipos locais — espelham os blocos jsonb de processos_vvd (Fase VII).
// Datas são strings "YYYY-MM-DD" | null; o defensor preenche manualmente.
// ============================================================================

interface ContextoCivel {
  divorcioEmCurso?: boolean;
  divorcioDataInicio?: string | null;
  guardaEmDisputa?: boolean;
  guardaDataInicio?: string | null;
  alimentosEmCurso?: boolean;
  inventarioPendente?: boolean;
  reintegracaoPosseAtiva?: boolean;
  imovelConjugalEmDisputa?: boolean;
  observacoes?: string | null;
}

interface AcaoPenalVvd {
  denunciaOferecida?: boolean;
  dataDenuncia?: string | null;
  arquivada?: boolean;
  retratacaoPolicialData?: string | null;
  retratacaoAudienciaData?: string | null;
  art16Aplicado?: boolean;
  condenacao?: boolean;
  penaAnos?: number | null;
  penaMeses?: number | null;
  regime?: string | null;
  substituicaoRestritiva?: boolean;
}

const REGIMES = ["aberto", "semiaberto", "fechado"] as const;
const REGIME_LABEL: Record<string, string> = {
  aberto: "Aberto",
  semiaberto: "Semiaberto",
  fechado: "Fechado",
};

// Códigos de medida reutilizados da taxonomia canônica MPU (Lei 11.340/2006).
const MEDIDAS_CODIGOS = Object.values(MEDIDA_MPU);

// Converte string vazia do <input type="date"> em null (evita "" no jsonb).
function dateOrNull(v: string): string | null {
  return v === "" ? null : v;
}

// Converte string vazia do <input type="number"> em null.
function numberOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function BlocosFaseVii({ processoId }: { processoId: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.vvd.getBlocosFaseVii.useQuery({ processoId });

  const mutation = trpc.vvd.updateBlocosFaseVii.useMutation({
    onSuccess: () => {
      utils.vvd.getBlocosFaseVii.invalidate({ processoId });
      toast.success("Blocos atualizados");
    },
    onError: (e) => toast.error(e.message),
  });

  // Estado local inicializado a partir da query (blocos podem vir null).
  const [civel, setCivel] = useState<ContextoCivel>({});
  const [penal, setPenal] = useState<AcaoPenalVvd>({});
  const [medidas, setMedidas] = useState<string[]>([]);

  useEffect(() => {
    if (!data) return;
    setCivel(data.contextoCivel ?? {});
    setPenal(data.acaoPenalVvd ?? {});
    setMedidas(data.medidasSolicitadas ?? []);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-neutral-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando blocos…
      </div>
    );
  }

  // Sem registro VVD para este processo → nada a editar.
  if (!data) {
    return (
      <p className="text-xs italic text-neutral-400 dark:text-neutral-500">
        Sem registro VVD para este processo.
      </p>
    );
  }

  const saving = (field: "contextoCivel" | "acaoPenalVvd" | "medidasSolicitadas") =>
    mutation.isPending && mutation.variables != null && field in mutation.variables;

  const deferidas = data.medidasDeferidas ?? [];

  return (
    <div className="space-y-3">
      <Section title="Contexto cível" subtitle="Litígios cíveis paralelos à MPU">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckboxWithDate
            label="Divórcio em curso"
            checked={!!civel.divorcioEmCurso}
            onCheckedChange={(v) => setCivel((c) => ({ ...c, divorcioEmCurso: v }))}
            date={civel.divorcioDataInicio ?? ""}
            onDateChange={(v) =>
              setCivel((c) => ({ ...c, divorcioDataInicio: dateOrNull(v) }))
            }
            dateLabel="Início do divórcio"
          />
          <CheckboxWithDate
            label="Guarda em disputa"
            checked={!!civel.guardaEmDisputa}
            onCheckedChange={(v) => setCivel((c) => ({ ...c, guardaEmDisputa: v }))}
            date={civel.guardaDataInicio ?? ""}
            onDateChange={(v) =>
              setCivel((c) => ({ ...c, guardaDataInicio: dateOrNull(v) }))
            }
            dateLabel="Início da disputa de guarda"
          />
          <CheckRow
            label="Alimentos em curso"
            checked={!!civel.alimentosEmCurso}
            onCheckedChange={(v) => setCivel((c) => ({ ...c, alimentosEmCurso: v }))}
          />
          <CheckRow
            label="Inventário pendente"
            checked={!!civel.inventarioPendente}
            onCheckedChange={(v) => setCivel((c) => ({ ...c, inventarioPendente: v }))}
          />
          <CheckRow
            label="Reintegração de posse ativa"
            checked={!!civel.reintegracaoPosseAtiva}
            onCheckedChange={(v) =>
              setCivel((c) => ({ ...c, reintegracaoPosseAtiva: v }))
            }
          />
          <CheckRow
            label="Imóvel conjugal em disputa"
            checked={!!civel.imovelConjugalEmDisputa}
            onCheckedChange={(v) =>
              setCivel((c) => ({ ...c, imovelConjugalEmDisputa: v }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-neutral-500">Observações</Label>
          <Textarea
            value={civel.observacoes ?? ""}
            onChange={(e) =>
              setCivel((c) => ({
                ...c,
                observacoes: e.target.value === "" ? null : e.target.value,
              }))
            }
            placeholder="Anotações sobre o contexto cível…"
          />
        </div>
        <SaveBar
          pending={saving("contextoCivel")}
          onClick={() => mutation.mutate({ processoId, contextoCivel: civel })}
        />
      </Section>

      <Section title="Ação penal" subtitle="Tramitação criminal vinculada à VVD">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckboxWithDate
            label="Denúncia oferecida"
            checked={!!penal.denunciaOferecida}
            onCheckedChange={(v) => setPenal((p) => ({ ...p, denunciaOferecida: v }))}
            date={penal.dataDenuncia ?? ""}
            onDateChange={(v) =>
              setPenal((p) => ({ ...p, dataDenuncia: dateOrNull(v) }))
            }
            dateLabel="Data da denúncia"
          />
          <CheckRow
            label="Arquivada"
            checked={!!penal.arquivada}
            onCheckedChange={(v) => setPenal((p) => ({ ...p, arquivada: v }))}
          />
          <DateField
            label="Retratação (delegacia)"
            value={penal.retratacaoPolicialData ?? ""}
            onChange={(v) =>
              setPenal((p) => ({ ...p, retratacaoPolicialData: dateOrNull(v) }))
            }
          />
          <DateField
            label="Retratação (audiência art. 16)"
            value={penal.retratacaoAudienciaData ?? ""}
            onChange={(v) =>
              setPenal((p) => ({ ...p, retratacaoAudienciaData: dateOrNull(v) }))
            }
          />
          <CheckRow
            label="Art. 16 LMP aplicado"
            checked={!!penal.art16Aplicado}
            onCheckedChange={(v) => setPenal((p) => ({ ...p, art16Aplicado: v }))}
          />
          <CheckRow
            label="Condenação"
            checked={!!penal.condenacao}
            onCheckedChange={(v) => setPenal((p) => ({ ...p, condenacao: v }))}
          />
          <NumberField
            label="Pena (anos)"
            value={penal.penaAnos}
            onChange={(v) => setPenal((p) => ({ ...p, penaAnos: numberOrNull(v) }))}
          />
          <NumberField
            label="Pena (meses)"
            value={penal.penaMeses}
            onChange={(v) => setPenal((p) => ({ ...p, penaMeses: numberOrNull(v) }))}
          />
          <div className="space-y-1.5">
            <Label className="text-xs text-neutral-500">Regime</Label>
            <select
              value={penal.regime ?? ""}
              onChange={(e) =>
                setPenal((p) => ({
                  ...p,
                  regime: e.target.value === "" ? null : e.target.value,
                }))
              }
              className="flex h-10 w-full cursor-pointer rounded-lg border-2 border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring hover:border-border/80"
            >
              <option value="">—</option>
              {REGIMES.map((r) => (
                <option key={r} value={r}>
                  {REGIME_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <CheckRow
            label="Substituição por restritiva de direitos"
            checked={!!penal.substituicaoRestritiva}
            onCheckedChange={(v) =>
              setPenal((p) => ({ ...p, substituicaoRestritiva: v }))
            }
          />
        </div>
        <SaveBar
          pending={saving("acaoPenalVvd")}
          onClick={() => mutation.mutate({ processoId, acaoPenalVvd: penal })}
        />
      </Section>

      <Section
        title="Medidas solicitadas"
        subtitle="Pedido do defensor (compare com as deferidas)"
      >
        <div className="flex flex-wrap gap-2">
          {MEDIDAS_CODIGOS.map((codigo) => {
            const selected = medidas.includes(codigo);
            const granted = deferidas.includes(codigo);
            return (
              <button
                key={codigo}
                type="button"
                onClick={() =>
                  setMedidas((prev) =>
                    prev.includes(codigo)
                      ? prev.filter((c) => c !== codigo)
                      : [...prev, codigo],
                  )
                }
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors",
                  selected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "border-neutral-200 text-neutral-600 hover:border-emerald-400 hover:text-emerald-700 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-emerald-500/60",
                )}
                aria-pressed={selected}
                title={granted ? "Também deferida" : undefined}
              >
                {rotuloMedida(codigo)}
                {granted && (
                  <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    ✓ deferida
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <SaveBar
          pending={saving("medidasSolicitadas")}
          onClick={() =>
            mutation.mutate({ processoId, medidasSolicitadas: medidas })
          }
        />
      </Section>
    </div>
  );
}

// ============================================================================
// Subcomponentes
// ============================================================================

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
    >
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <div>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {subtitle}
            </p>
          )}
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
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function CheckRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm text-neutral-700 dark:text-neutral-200">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      {label}
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-neutral-500">{label}</Label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CheckboxWithDate({
  label,
  checked,
  onCheckedChange,
  date,
  onDateChange,
  dateLabel,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  date: string;
  onDateChange: (v: string) => void;
  dateLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <CheckRow label={label} checked={checked} onCheckedChange={onCheckedChange} />
      {checked && (
        <DateField label={dateLabel} value={date} onChange={onDateChange} />
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-neutral-500">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  );
}

function SaveBar({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end pt-1">
      <Button size="sm" className="gap-1.5" disabled={pending} onClick={onClick}>
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </div>
  );
}
