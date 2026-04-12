"use client";

import { useState, useMemo } from "react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scale,
  Calculator,
  Calendar,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  Info,
  Download,
  ChevronRight,
  GaugeCircle,
  Timer,
  Shield,
  Sun,
  Home,
} from "lucide-react";
import {
  calcularExecucaoPenal,
  type TipoPenal,
  type RegimeInicial,
  type ExecucaoPenalInput,
  type ExecucaoPenalResult,
  type MarcoExecucao,
} from "@/lib/juri/execucao-penal";
import { generateExcalidrawTimeline } from "@/lib/juri/excalidraw-timeline";

// ==========================================
// CONSTANTS
// ==========================================

const TIPO_PENAL_OPTIONS: { value: TipoPenal; label: string }[] = [
  { value: "homicidio_simples", label: "Homicidio Simples" },
  { value: "homicidio_qualificado", label: "Homicidio Qualificado" },
  { value: "homicidio_privilegiado", label: "Homicidio Privilegiado" },
  {
    value: "homicidio_privilegiado_qualificado",
    label: "Privilegiado-Qualificado",
  },
  { value: "homicidio_tentado", label: "Homicidio Tentado" },
  { value: "feminicidio", label: "Feminicidio" },
];

const REGIME_OPTIONS: { value: RegimeInicial; label: string }[] = [
  { value: "fechado", label: "Fechado" },
  { value: "semiaberto", label: "Semiaberto" },
  { value: "aberto", label: "Aberto" },
];

const PACOTE_ANTICRIME_DATE = "2020-01-23";
const LEI_FEMINICIDIO_DATE = "2024-10-10";

// ==========================================
// HELPERS
// ==========================================

function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function formatDaysToLabel(days: number): string {
  const years = Math.floor(days / 360);
  const months = Math.floor((days % 360) / 30);
  const remainDays = days % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ano${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} ${months > 1 ? "meses" : "mes"}`);
  if (remainDays > 0) parts.push(`${remainDays} dia${remainDays > 1 ? "s" : ""}`);

  return parts.length > 0 ? parts.join(", ") : "0 dias";
}

function getMarcoIcon(tipo: MarcoExecucao["tipo"]) {
  switch (tipo) {
    case "detracao":
      return Timer;
    case "progressao_1":
      return ChevronRight;
    case "progressao_2":
      return Sun;
    case "saida_temporaria":
      return Home;
    case "livramento_condicional":
      return Unlock;
    case "fim_pena":
      return Shield;
    default:
      return Calendar;
  }
}

function getMarcoColor(tipo: MarcoExecucao["tipo"]) {
  switch (tipo) {
    case "detracao":
      return {
        border: "border-orange-200 dark:border-orange-800/50",
        bg: "bg-orange-50 dark:bg-orange-950/20",
        icon: "text-orange-600 dark:text-orange-400",
        accent: "bg-orange-500",
      };
    case "progressao_1":
      return {
        border: "border-rose-200 dark:border-rose-800/50",
        bg: "bg-rose-50 dark:bg-rose-950/20",
        icon: "text-rose-600 dark:text-rose-400",
        accent: "bg-rose-600",
      };
    case "progressao_2":
      return {
        border: "border-amber-200 dark:border-amber-800/50",
        bg: "bg-amber-50 dark:bg-amber-950/20",
        icon: "text-amber-600 dark:text-amber-400",
        accent: "bg-amber-500",
      };
    case "saida_temporaria":
      return {
        border: "border-emerald-200 dark:border-emerald-800/50",
        bg: "bg-emerald-50 dark:bg-emerald-950/20",
        icon: "text-emerald-600 dark:text-emerald-400",
        accent: "bg-emerald-500",
      };
    case "livramento_condicional":
      return {
        border: "border-violet-200 dark:border-violet-800/50",
        bg: "bg-violet-50 dark:bg-violet-950/20",
        icon: "text-violet-600 dark:text-violet-400",
        accent: "bg-violet-500",
      };
    case "fim_pena":
      return {
        border: "border-neutral-200 dark:border-neutral-700",
        bg: "bg-neutral-50 dark:bg-neutral-900/40",
        icon: "text-neutral-600 dark:text-neutral-400",
        accent: "bg-neutral-500",
      };
    default:
      return {
        border: "border-neutral-200 dark:border-neutral-700",
        bg: "bg-neutral-50 dark:bg-neutral-900/40",
        icon: "text-neutral-600 dark:text-neutral-400",
        accent: "bg-neutral-500",
      };
  }
}

// ==========================================
// TIMELINE SEGMENT BUILDER
// ==========================================

interface TimelineSegment {
  label: string;
  percentage: number;
  color: string;
  days: number;
}

function buildTimelineSegments(result: ExecucaoPenalResult): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  const totalDays = result.penaTotalDias;
  if (totalDays <= 0) return segments;

  // Detracao segment
  if (result.detracaoDias > 0) {
    segments.push({
      label: "Detracao",
      color: "bg-orange-500",
      days: result.detracaoDias,
      percentage: (result.detracaoDias / totalDays) * 100,
    });
  }

  const marcos = result.marcos;
  const progressao1 = marcos.find((m) => m.tipo === "progressao_1");
  const progressao2 = marcos.find((m) => m.tipo === "progressao_2");
  const fimPena = marcos.find((m) => m.tipo === "fim_pena");

  if (progressao1 && progressao2 && fimPena) {
    const fechadoDays = progressao1.diasCumpridos;
    const semiabertoDays = progressao2.diasCumpridos - progressao1.diasCumpridos;
    const abertoDays = fimPena.diasCumpridos - progressao2.diasCumpridos;

    segments.push({
      label: "Fechado",
      color: "bg-rose-600",
      days: fechadoDays,
      percentage: (fechadoDays / totalDays) * 100,
    });
    segments.push({
      label: "Semiaberto",
      color: "bg-amber-500",
      days: semiabertoDays,
      percentage: (semiabertoDays / totalDays) * 100,
    });
    if (abertoDays > 0) {
      segments.push({
        label: "Aberto",
        color: "bg-emerald-500",
        days: abertoDays,
        percentage: (abertoDays / totalDays) * 100,
      });
    }
  } else if (progressao2 && fimPena) {
    const semiabertoDays = progressao2.diasCumpridos;
    const abertoDays = fimPena.diasCumpridos - progressao2.diasCumpridos;

    segments.push({
      label: "Semiaberto",
      color: "bg-amber-500",
      days: semiabertoDays,
      percentage: (semiabertoDays / totalDays) * 100,
    });
    if (abertoDays > 0) {
      segments.push({
        label: "Aberto",
        color: "bg-emerald-500",
        days: abertoDays,
        percentage: (abertoDays / totalDays) * 100,
      });
    }
  } else if (fimPena) {
    segments.push({
      label: "Aberto",
      color: "bg-emerald-500",
      days: result.saldoPenaDias,
      percentage: (result.saldoPenaDias / totalDays) * 100,
    });
  }

  return segments;
}

// ==========================================
// REGIME LEGAL INFO
// ==========================================

function getRegimeLegalInfo(dataFato: string, tipoPenal: TipoPenal | "") {
  if (!dataFato) return null;

  const isFeminicidio = tipoPenal === "feminicidio";

  if (isFeminicidio && dataFato >= LEI_FEMINICIDIO_DATE) {
    return {
      text: "Lei 14.994/2024 -- Feminicidio (55%)",
      color:
        "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300",
    };
  }

  if (dataFato >= PACOTE_ANTICRIME_DATE) {
    return {
      text: "Pacote Anticrime -- Art. 112, LEP (25%, 40%, 50%, 60%...)",
      color:
        "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300",
    };
  }

  return {
    text: "Lei anterior ao Pacote Anticrime (1/6, 2/5, 3/5)",
    color:
      "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300",
  };
}

// ==========================================
// PAGE COMPONENT
// ==========================================

export default function CalculadoraExecucaoPenalPage() {
  // ---- Form state ----
  const [tipoPenal, setTipoPenal] = useState<TipoPenal | "">("");
  const [penaAnos, setPenaAnos] = useState<string>("");
  const [penaMeses, setPenaMeses] = useState<string>("");
  const [regimeInicial, setRegimeInicial] = useState<RegimeInicial | "">("");
  const [dataFato, setDataFato] = useState<string>("");
  const [dataCondenacao, setDataCondenacao] = useState<string>("");
  const [reuPrimario, setReuPrimario] = useState<boolean>(true);
  const [resultouMorte, setResultouMorte] = useState<boolean>(true);
  const [detracaoInicio, setDetracaoInicio] = useState<string>("");
  const [nomeReu, setNomeReu] = useState<string>("");

  // ---- Result state ----
  const [result, setResult] = useState<ExecucaoPenalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ---- Derived ----
  const regimeLegalInfo = useMemo(
    () => getRegimeLegalInfo(dataFato, tipoPenal),
    [dataFato, tipoPenal]
  );

  const isFormValid = useMemo(() => {
    return (
      tipoPenal !== "" &&
      (parseInt(penaAnos) > 0 || parseInt(penaMeses) > 0) &&
      regimeInicial !== "" &&
      dataFato !== "" &&
      dataCondenacao !== ""
    );
  }, [tipoPenal, penaAnos, penaMeses, regimeInicial, dataFato, dataCondenacao]);

  // ---- Handlers ----
  function handleCalcular() {
    setError(null);

    if (!isFormValid) {
      setError("Preencha todos os campos obrigatorios.");
      return;
    }

    const penaTotalMeses =
      (parseInt(penaAnos) || 0) * 12 + (parseInt(penaMeses) || 0);

    if (penaTotalMeses <= 0) {
      setError("A pena total deve ser maior que zero.");
      return;
    }

    try {
      const input: ExecucaoPenalInput = {
        tipoPenal: tipoPenal as TipoPenal,
        penaTotalMeses,
        regimeInicial: regimeInicial as RegimeInicial,
        dataFato,
        dataCondenacao,
        reuPrimario,
        resultouMorte,
        detracaoInicio: detracaoInicio || undefined,
      };

      const calcResult = calcularExecucaoPenal(input);
      setResult(calcResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao calcular. Verifique os dados."
      );
    }
  }

  function handleExportExcalidraw() {
    if (!result) return;

    const data = generateExcalidrawTimeline({
      result,
      nomeReu: nomeReu || "Reu",
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `execucao-penal-${nomeReu ? nomeReu.toLowerCase().replace(/\s+/g, "-") : "calc"}.excalidraw`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setResult(null);
    setError(null);
  }

  // ---- Timeline segments ----
  const segments = useMemo(
    () => (result ? buildTimelineSegments(result) : []),
    [result]
  );

  // ====================================
  // RENDER
  // ====================================
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      <CollapsiblePageHeader title="Calculadora Penal" icon={Calculator}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">Calculadora Penal</h1>
            <p className="text-[10px] text-white/55 hidden sm:block">Progressão de regime, livramento condicional e marcos da pena</p>
          </div>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-3 md:py-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ====================== INPUT FORM ====================== */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="w-4 h-4" />
                Dados do Caso
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Nome do reu (optional, for Excalidraw) */}
              <div className="space-y-2">
                <Label htmlFor="nomeReu">Nome do Reu (opcional)</Label>
                <Input
                  id="nomeReu"
                  type="text"
                  placeholder="Para identificacao no Excalidraw"
                  value={nomeReu}
                  onChange={(e) => setNomeReu(e.target.value)}
                />
              </div>

              {/* Tipo penal */}
              <div className="space-y-2">
                <Label>
                  Tipo Penal <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={tipoPenal}
                  onValueChange={(v) => setTipoPenal(v as TipoPenal)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo penal" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_PENAL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pena total */}
              <div className="space-y-2">
                <Label>
                  Pena Total <span className="text-rose-500">*</span>
                </Label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        placeholder="0"
                        value={penaAnos}
                        onChange={(e) => setPenaAnos(e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                        anos
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={11}
                        placeholder="0"
                        value={penaMeses}
                        onChange={(e) => setPenaMeses(e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                        meses
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regime inicial */}
              <div className="space-y-2">
                <Label>
                  Regime Inicial <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={regimeInicial}
                  onValueChange={(v) =>
                    setRegimeInicial(v as RegimeInicial)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o regime" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data do fato */}
              <div className="space-y-2">
                <Label htmlFor="dataFato">
                  Data do Fato <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="dataFato"
                  type="date"
                  value={dataFato}
                  onChange={(e) => setDataFato(e.target.value)}
                />
              </div>

              {/* Regime legal info alert */}
              {regimeLegalInfo && (
                <div
                  className={cn(
                    "flex items-start gap-2.5 px-3.5 py-3 rounded-xl border text-sm",
                    regimeLegalInfo.color
                  )}
                >
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{regimeLegalInfo.text}</span>
                </div>
              )}

              {/* Data da condenacao */}
              <div className="space-y-2">
                <Label htmlFor="dataCondenacao">
                  Data da Condenacao <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="dataCondenacao"
                  type="date"
                  value={dataCondenacao}
                  onChange={(e) => setDataCondenacao(e.target.value)}
                />
              </div>

              {/* Switches */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="reuPrimario"
                    className="cursor-pointer select-none"
                  >
                    Reu Primario
                  </Label>
                  <Switch
                    id="reuPrimario"
                    checked={reuPrimario}
                    onCheckedChange={setReuPrimario}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="resultouMorte"
                    className="cursor-pointer select-none"
                  >
                    Resultou em Morte
                  </Label>
                  <Switch
                    id="resultouMorte"
                    checked={resultouMorte}
                    onCheckedChange={setResultouMorte}
                  />
                </div>
              </div>

              {/* Detracao */}
              <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Label htmlFor="detracaoInicio">
                  Detracao -- Inicio da Preventiva
                </Label>
                <Input
                  id="detracaoInicio"
                  type="date"
                  value={detracaoInicio}
                  onChange={(e) => setDetracaoInicio(e.target.value)}
                />
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  Data em que o reu foi preso preventivamente. Deixe em branco
                  se nao houve preventiva.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-sm text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Calculate button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleCalcular}
                disabled={!isFormValid}
              >
                <GaugeCircle className="w-4 h-4 mr-2" />
                Calcular
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ====================== RESULTS ====================== */}
        <div className="lg:col-span-3 space-y-5">
          {!result ? (
            /* Empty state */
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                  <Scale className="w-8 h-8 text-neutral-400 dark:text-neutral-500" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Preencha os dados do caso
                </h3>
                <p className="text-sm text-neutral-400 dark:text-neutral-500 max-w-sm">
                  Os marcos de execucao penal serao calculados automaticamente
                  com base na legislacao vigente na data do fato.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Actions bar */}
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Resultado
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                  >
                    Limpar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcalidraw}
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Excalidraw
                  </Button>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard
                  label="Pena Total"
                  value={formatDaysToLabel(result.penaTotalDias)}
                  icon={Clock}
                  color="text-neutral-600 dark:text-neutral-400"
                />
                <SummaryCard
                  label="Detracao"
                  value={
                    result.detracaoDias > 0
                      ? `${result.detracaoDias} dias`
                      : "Nenhuma"
                  }
                  icon={Timer}
                  color="text-orange-600 dark:text-orange-400"
                />
                <SummaryCard
                  label="Saldo"
                  value={formatDaysToLabel(result.saldoPenaDias)}
                  icon={GaugeCircle}
                  color="text-emerald-600 dark:text-emerald-400"
                />
                <SummaryCard
                  label="Fracao"
                  value={result.fracaoLabel}
                  icon={result.vedadoLivramento ? Lock : Unlock}
                  color={
                    result.vedadoLivramento
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-violet-600 dark:text-violet-400"
                  }
                  sublabel={
                    result.vedadoLivramento
                      ? "Livramento vedado"
                      : "Livramento possivel"
                  }
                />
              </div>

              {/* Vedado livramento alert */}
              {result.vedadoLivramento && (
                <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-rose-800 dark:text-rose-300">
                      Livramento Condicional Vedado
                    </p>
                    <p className="text-sm text-rose-700 dark:text-rose-400 mt-0.5">
                      {result.incisoAplicado}
                    </p>
                  </div>
                </div>
              )}

              {/* Timeline bar */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Timeline da Pena
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-14 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                    {segments.map((seg, i) => (
                      <div
                        key={`${seg.label}-${i}`}
                        className={cn(
                          "flex flex-col items-center justify-center text-white transition-all relative group",
                          seg.color
                        )}
                        style={{
                          width: `${Math.max(seg.percentage, 2)}%`,
                        }}
                      >
                        {seg.percentage > 8 && (
                          <>
                            <span className="text-[11px] font-semibold leading-tight">
                              {seg.label}
                            </span>
                            <span className="text-[10px] opacity-80 leading-tight">
                              {formatDaysToLabel(seg.days)}
                            </span>
                          </>
                        )}
                        {/* Tooltip on hover for narrow segments */}
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {seg.label}: {formatDaysToLabel(seg.days)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 mt-4">
                    {segments.map((seg, i) => (
                      <div
                        key={`legend-${i}`}
                        className="flex items-center gap-1.5"
                      >
                        <div
                          className={cn(
                            "w-3 h-3 rounded-sm",
                            seg.color
                          )}
                        />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {seg.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Marco cards */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Marcos da Execucao
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.marcos.map((marco, i) => (
                    <MarcoCard key={`${marco.tipo}-${i}`} marco={marco} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  sublabel,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn("w-3.5 h-3.5", color)} />
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
        {value}
      </p>
      {sublabel && (
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
          {sublabel}
        </p>
      )}
    </div>
  );
}

function MarcoCard({ marco }: { marco: MarcoExecucao }) {
  const Icon = getMarcoIcon(marco.tipo);
  const colors = getMarcoColor(marco.tipo);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200",
        colors.border,
        colors.bg
      )}
    >
      {/* Top accent bar */}
      <div className={cn("h-1 w-12 rounded-full mb-3", colors.accent)} />

      {/* Label + icon */}
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn("w-4 h-4 shrink-0", colors.icon)} />
        <span className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
          {marco.label}
        </span>
      </div>

      {/* Date */}
      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-1 font-mono tabular-nums">
        {formatDateBR(marco.data)}
      </p>

      {/* Fracao + fundamento */}
      {marco.fracao && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {marco.fracao} -- {marco.fundamentoLegal}
        </p>
      )}
      {!marco.fracao && marco.fundamentoLegal && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {marco.fundamentoLegal}
        </p>
      )}

      {/* Accessible label */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2.5 italic leading-relaxed">
        {marco.labelAcessivel}
      </p>
    </div>
  );
}
