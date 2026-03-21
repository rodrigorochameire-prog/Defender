"use client";

import { useState } from "react";
import {
  Brain,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Shield,
  Users,
  Sparkles,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

interface SimulacaoJulgamentoProps {
  sessaoId: string;
  casoId: number | null;
}

interface Cenario {
  tipo: "melhor" | "pior" | "provavel";
  descricao: string;
  probabilidade: number;
  resultado: string;
  justificativa: string;
}

interface TeseAnalise {
  titulo: string;
  confianca: number;
  argumentosPromotoria: string[];
  contraArgumentos: string[];
  ordemRecomendada: number;
}

interface TestemunhaResistencia {
  nome: string;
  tipo: string;
  resistencia: number;
  pontosVulneraveis: string[];
  perguntasCriticas: string[];
}

interface SimulacaoResultado {
  generatedAt: string;
  cenarios: Cenario[];
  tesesAnalise: TeseAnalise[];
  testemunhasResistencia: TestemunhaResistencia[];
  resumoEstrategico: string;
}

// ============================================
// HELPERS
// ============================================

function getConfidenceColor(score: number) {
  if (score < 40) return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
  if (score <= 70) return { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
  return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
}

function getCenarioConfig(tipo: Cenario["tipo"]) {
  switch (tipo) {
    case "melhor":
      return {
        label: "Melhor Cenario",
        icon: TrendingUp,
        border: "border-emerald-300 dark:border-emerald-800",
        bg: "bg-emerald-50 dark:bg-emerald-950/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        probColor: "text-emerald-700 dark:text-emerald-300",
      };
    case "pior":
      return {
        label: "Pior Cenario",
        icon: TrendingDown,
        border: "border-red-300 dark:border-red-800",
        bg: "bg-red-50 dark:bg-red-950/20",
        iconColor: "text-red-600 dark:text-red-400",
        probColor: "text-red-700 dark:text-red-300",
      };
    case "provavel":
      return {
        label: "Mais Provavel",
        icon: Scale,
        border: "border-amber-300 dark:border-amber-800",
        bg: "bg-amber-50 dark:bg-amber-950/20",
        iconColor: "text-amber-600 dark:text-amber-400",
        probColor: "text-amber-700 dark:text-amber-300",
      };
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

function CenarioCard({ cenario }: { cenario: Cenario }) {
  const config = getCenarioConfig(cenario.tipo);
  const Icon = config.icon;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          "rounded-xl border p-4 transition-all duration-150",
          config.border,
          config.bg,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Icon className={cn("w-5 h-5 shrink-0", config.iconColor)} />
            <div>
              <p className={cn("text-xs font-medium", config.iconColor)}>
                {config.label}
              </p>
              <p className="text-sm font-semibold text-stone-800 dark:text-zinc-200 mt-0.5">
                {cenario.resultado}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={cn("text-2xl font-bold tabular-nums", config.probColor)}>
              {cenario.probabilidade}%
            </p>
            <p className="text-[10px] text-stone-500 dark:text-zinc-500">
              probabilidade
            </p>
          </div>
        </div>

        <p className="text-xs text-stone-600 dark:text-zinc-400 mt-3 leading-relaxed">
          {cenario.descricao}
        </p>

        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "mt-3 flex items-center gap-1 text-[11px] font-medium transition-colors",
              config.iconColor,
              "hover:opacity-80",
            )}
          >
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            Justificativa
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <p className="mt-2 text-xs text-stone-500 dark:text-zinc-500 leading-relaxed pl-4 border-l-2 border-stone-200 dark:border-zinc-700">
            {cenario.justificativa}
          </p>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function TeseAnaliseCard({ tese }: { tese: TeseAnalise }) {
  const colors = getConfidenceColor(tese.confianca);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0" />
              <h4 className="text-sm font-semibold text-stone-800 dark:text-zinc-200 truncate">
                {tese.titulo}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="default"
              className="text-[10px] px-1.5 py-0 bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400"
            >
              <Target className="w-3 h-3 mr-0.5" />
              #{tese.ordemRecomendada}
            </Badge>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-500 dark:text-zinc-500">Confianca</span>
            <span className={cn("font-mono font-semibold", colors.text)}>
              {tese.confianca}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
              style={{ width: `${tese.confianca}%` }}
            />
          </div>
        </div>

        {/* Expand toggle */}
        <CollapsibleTrigger asChild>
          <button
            className="mt-3 flex items-center gap-1 text-[11px] font-medium text-stone-500 dark:text-zinc-500 hover:text-stone-700 dark:hover:text-zinc-300 transition-colors"
          >
            {isOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            Argumentos e Contra-Argumentos
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 space-y-3">
            {/* Prosecution arguments */}
            <div>
              <p className="text-[11px] font-semibold text-red-600 dark:text-red-400 mb-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                Argumentos da Promotoria
              </p>
              <ul className="space-y-1 ml-3">
                {tese.argumentosPromotoria.map((arg, i) => (
                  <li
                    key={i}
                    className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed flex items-start gap-2"
                  >
                    <span className="w-1 h-1 rounded-full bg-red-400 dark:bg-red-600 mt-1.5 shrink-0" />
                    {arg}
                  </li>
                ))}
              </ul>
            </div>

            {/* Counter arguments */}
            <div>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Contra-Argumentos Sugeridos
              </p>
              <ul className="space-y-1 ml-3">
                {tese.contraArgumentos.map((arg, i) => (
                  <li
                    key={i}
                    className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed flex items-start gap-2"
                  >
                    <span className="w-1 h-1 rounded-full bg-emerald-400 dark:bg-emerald-600 mt-1.5 shrink-0" />
                    {arg}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function TestemunhaResistenciaCard({
  testemunha,
}: {
  testemunha: TestemunhaResistencia;
}) {
  const colors = getConfidenceColor(testemunha.resistencia);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Pergunta copiada");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Users className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-stone-800 dark:text-zinc-200">
              {testemunha.nome}
            </h4>
            <Badge
              variant="default"
              className="mt-0.5 text-[10px] px-1.5 py-0 bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-500"
            >
              {testemunha.tipo}
            </Badge>
          </div>
        </div>
      </div>

      {/* Resistance bar */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-500 dark:text-zinc-500">Resistencia</span>
          <span className={cn("font-mono font-semibold", colors.text)}>
            {testemunha.resistencia}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", colors.bar)}
            style={{ width: `${testemunha.resistencia}%` }}
          />
        </div>
      </div>

      {/* Vulnerable points */}
      {testemunha.pontosVulneraveis.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            Pontos Vulneraveis
          </p>
          <ul className="space-y-1 ml-3">
            {testemunha.pontosVulneraveis.map((ponto, i) => (
              <li
                key={i}
                className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed flex items-start gap-2"
              >
                <span className="w-1 h-1 rounded-full bg-amber-400 dark:bg-amber-600 mt-1.5 shrink-0" />
                {ponto}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Critical questions */}
      {testemunha.perguntasCriticas.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Perguntas Criticas
          </p>
          <ul className="space-y-1.5 ml-3">
            {testemunha.perguntasCriticas.map((pergunta, i) => (
              <li
                key={i}
                className="text-xs text-stone-600 dark:text-zinc-400 leading-relaxed flex items-start gap-2 group"
              >
                <span className="w-1 h-1 rounded-full bg-emerald-400 dark:bg-emerald-600 mt-1.5 shrink-0" />
                <span className="flex-1">{pergunta}</span>
                <button
                  onClick={() => handleCopy(pergunta, i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-stone-100 dark:hover:bg-zinc-800"
                  title="Copiar pergunta"
                >
                  {copiedIdx === i ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3 text-stone-400 dark:text-zinc-500" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SimulacaoJulgamento({
  sessaoId,
  casoId,
}: SimulacaoJulgamentoProps) {
  // ---- tRPC ----
  const preparacaoRouter = (trpc as any).preparacao;

  const simulacaoQuery = preparacaoRouter
    ? preparacaoRouter.getSimulacao.useQuery(
        { sessaoId },
        {
          enabled: !!sessaoId,
          retry: false,
          staleTime: 5 * 60 * 1000,
        },
      )
    : {
        data: undefined as SimulacaoResultado | undefined,
        isLoading: false,
        isError: false,
        refetch: () => {},
      };

  const simularMutation = preparacaoRouter
    ? preparacaoRouter.simularJulgamento.useMutation({
        onSuccess: () => {
          toast.success("Simulacao concluida com sucesso");
          simulacaoQuery.refetch();
        },
        onError: (err: any) => {
          toast.error(err.message || "Erro ao simular julgamento");
        },
      })
    : { mutate: () => {}, isPending: false, error: null as any };

  const isSimulating = simularMutation.isPending;
  const simulacaoResultado = simulacaoQuery.data as
    | SimulacaoResultado
    | undefined;

  // ---- Handlers ----
  function handleSimular() {
    if (!sessaoId) return;
    simularMutation.mutate({ sessaoId, casoId });
  }

  // ---- No casoId ----
  if (!casoId) {
    return (
      <Card className="p-6 min-h-[400px]">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Simulacao de Julgamento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="w-12 h-12 text-stone-300 dark:text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-stone-500 dark:text-zinc-500">
              Vincule um caso para simular
            </p>
            <p className="text-xs text-stone-400 dark:text-zinc-600 mt-1 max-w-xs">
              A simulacao precisa dos dados do caso (fatos, teses, testemunhas) para gerar cenarios.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Loading query ----
  if (simulacaoQuery.isLoading) {
    return (
      <Card className="p-6 min-h-[400px]">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Simulacao de Julgamento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-stone-100 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Simulating state ----
  if (isSimulating) {
    return (
      <Card className="p-6 min-h-[400px]">
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="relative mb-4">
              <Brain className="h-12 w-12 text-emerald-500" />
              <Loader2 className="h-5 w-5 text-emerald-500 animate-spin absolute -bottom-1 -right-1" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800 dark:text-zinc-200 mb-1">
              Simulando julgamento...
            </h3>
            <p className="text-sm text-stone-500 dark:text-zinc-400 max-w-sm">
              Analisando cenarios, teses e testemunhas. Isso pode levar alguns segundos.
            </p>
            <div className="mt-4 w-48 h-1.5 rounded-full bg-stone-200 dark:bg-zinc-700 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite] w-1/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Error state ----
  if (simularMutation.error && !simulacaoResultado) {
    return (
      <Card className="p-6 min-h-[400px]">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Simulacao de Julgamento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-red-50 dark:bg-red-950/30 mb-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
              Erro ao simular julgamento
            </p>
            <p className="text-xs text-stone-500 dark:text-zinc-500 max-w-sm mb-4">
              {simularMutation.error?.message || "Ocorreu um erro inesperado. Tente novamente."}
            </p>
            <button
              onClick={handleSimular}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors",
                "bg-emerald-600 text-white hover:bg-emerald-700",
              )}
            >
              <RefreshCw className="h-4 w-4" />
              Tentar Novamente
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- No result yet ----
  if (!simulacaoResultado) {
    return (
      <Card className="p-6 min-h-[400px]">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Simulacao de Julgamento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="w-12 h-12 text-stone-300 dark:text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-stone-600 dark:text-zinc-400 mb-1">
              Nenhuma simulacao realizada
            </p>
            <p className="text-xs text-stone-400 dark:text-zinc-600 max-w-sm mb-4">
              Simule cenarios de julgamento com IA para antecipar resultados, avaliar teses e preparar contra-argumentos.
            </p>
            <button
              onClick={handleSimular}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors",
                "bg-emerald-600 text-white hover:bg-emerald-700",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <Brain className="h-4 w-4" />
              Simular Julgamento
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Result Display ----
  const {
    cenarios,
    tesesAnalise,
    testemunhasResistencia,
    resumoEstrategico,
    generatedAt,
  } = simulacaoResultado;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Simulacao de Julgamento
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-400 dark:text-zinc-500">
                Gerado em{" "}
                {new Date(generatedAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <button
                onClick={handleSimular}
                disabled={isSimulating}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                  "text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200",
                  "dark:text-zinc-400 dark:hover:text-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {isSimulating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Regerar
              </button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cenarios */}
      {cenarios && cenarios.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
            <Scale className="w-4 h-4 text-stone-400 dark:text-zinc-500" />
            Cenarios
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {cenarios.map((cenario, i) => (
              <CenarioCard key={i} cenario={cenario} />
            ))}
          </div>
        </div>
      )}

      {/* Analise de Teses */}
      {tesesAnalise && tesesAnalise.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-stone-400 dark:text-zinc-500" />
            Analise de Teses
          </h3>
          <div className="space-y-3">
            {[...tesesAnalise]
              .sort((a, b) => a.ordemRecomendada - b.ordemRecomendada)
              .map((tese, i) => (
                <TeseAnaliseCard key={i} tese={tese} />
              ))}
          </div>
        </div>
      )}

      {/* Resistencia de Testemunhas */}
      {testemunhasResistencia && testemunhasResistencia.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-400 dark:text-zinc-500" />
            Resistencia de Testemunhas
          </h3>
          <ScrollArea className="max-h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testemunhasResistencia.map((testemunha, i) => (
                <TestemunhaResistenciaCard key={i} testemunha={testemunha} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Resumo Estrategico */}
      {resumoEstrategico && (
        <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-5">
          <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Resumo Estrategico
          </h3>
          <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed whitespace-pre-line">
            {resumoEstrategico}
          </p>
        </div>
      )}
    </div>
  );
}
