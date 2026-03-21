"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Gavel,
  Scale,
  Pencil,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Eye,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  StickyNote,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface DossiePersonagemProps {
  personagem: {
    id: number;
    nome: string;
    tipo: string; // 'juiz' | 'promotor'
    vara?: string | null;
    comarca?: string | null;
    estiloAtuacao?: string | null;
    pontosFortes?: string | null;
    pontosFracos?: string | null;
    tendenciasObservadas?: string | null;
    estrategiasRecomendadas?: string | null;
    totalSessoes?: number | null;
    totalCondenacoes?: number | null;
    totalAbsolvicoes?: number | null;
    totalDesclassificacoes?: number | null;
    tempoMedioSustentacao?: number | null;
    argumentosPreferidos?: string[] | null;
    tesesVulneraveis?: string[] | null;
    notasEstrategicas?: string | null;
    ultimaSessaoData?: string | null;
  };
  onEdit?: (id: number) => void;
}

// ============================================
// HELPERS
// ============================================

const TYPE_CONFIG = {
  juiz: {
    label: "Juiz(a)",
    icon: <Gavel className="w-4 h-4" />,
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    accentBorder: "border-l-amber-500 dark:border-l-amber-400",
    accentBg: "bg-amber-50/50 dark:bg-amber-950/10",
  },
  promotor: {
    label: "Promotor(a)",
    icon: <Scale className="w-4 h-4" />,
    badgeClass:
      "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    accentBorder: "border-l-red-500 dark:border-l-red-400",
    accentBg: "bg-red-50/50 dark:bg-red-950/10",
  },
} as const;

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

// ============================================
// SUB-COMPONENTS
// ============================================

function StatBox({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number | null | undefined;
  icon: React.ReactNode;
  highlight?: "success" | "danger" | "warning" | "default";
}) {
  const highlightClass = {
    success:
      "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
    danger:
      "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
    warning:
      "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
    default:
      "text-stone-700 dark:text-zinc-300 bg-stone-50 dark:bg-zinc-800/50 border-stone-200 dark:border-zinc-700",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-lg border transition-colors",
        highlightClass[highlight ?? "default"]
      )}
    >
      <div className="flex items-center gap-1.5 mb-1 text-xs opacity-70">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <span className="text-xl font-bold font-mono tabular-nums">
        {value ?? 0}
      </span>
    </div>
  );
}

function ConvictionBar({
  condenacoes,
  absolvicoes,
}: {
  condenacoes: number;
  absolvicoes: number;
}) {
  const total = condenacoes + absolvicoes;
  if (total === 0) return null;

  const condenacaoPct = Math.round((condenacoes / total) * 100);
  const absolvicaoPct = 100 - condenacaoPct;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          Condenacao {condenacaoPct}%
        </span>
        <span className="flex items-center gap-1">
          Absolvicao {absolvicaoPct}%
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
        </span>
      </div>
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-stone-100 dark:bg-zinc-800">
        <div
          className="bg-red-500 dark:bg-red-400 transition-all duration-500"
          style={{ width: `${condenacaoPct}%` }}
        />
        <div
          className="bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
          style={{ width: `${absolvicaoPct}%` }}
        />
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen,
  accentClass,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentClass?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between p-2.5 rounded-lg transition-all duration-150",
            "hover:bg-stone-50 dark:hover:bg-zinc-800/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "text-sm font-medium text-stone-600 dark:text-zinc-400",
            accentClass
          )}
        >
          <div className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400 dark:text-zinc-500 shrink-0" />
          )}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-2.5 pb-1 pt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DossiePersonagem({ personagem, onEdit }: DossiePersonagemProps) {
  const tipo = (personagem.tipo === "juiz" || personagem.tipo === "promotor")
    ? personagem.tipo
    : "juiz";
  const config = TYPE_CONFIG[tipo];

  const condenacoes = personagem.totalCondenacoes ?? 0;
  const absolvicoes = personagem.totalAbsolvicoes ?? 0;
  const showBar = condenacoes + absolvicoes > 0;

  // Split comma/semicolon-separated strings into lists for pontos fortes/fracos
  const pontosFortesList = personagem.pontosFortes
    ?.split(/[;,\n]/)
    .map((s) => s.trim())
    .filter(Boolean) ?? [];
  const pontosFracosList = personagem.pontosFracos
    ?.split(/[;,\n]/)
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

  return (
    <Card className={cn("border-l-4", config.accentBorder)}>
      {/* ---- HEADER ---- */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <span className="truncate">{personagem.nome}</span>
              <Badge className={cn("text-xs shrink-0", config.badgeClass)}>
                {config.icon}
                <span className="ml-1">{config.label}</span>
              </Badge>
            </CardTitle>
            {(personagem.vara || personagem.comarca) && (
              <p className="text-xs text-stone-500 dark:text-zinc-500 mt-1.5">
                {[personagem.vara, personagem.comarca].filter(Boolean).join(" - ")}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      {/* ---- CONTENT ---- */}
      <CardContent className="space-y-5">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatBox
            label="Sessoes"
            value={personagem.totalSessoes}
            icon={<BookOpen className="w-3 h-3" />}
          />
          <StatBox
            label="Condenacoes"
            value={personagem.totalCondenacoes}
            icon={<TrendingDown className="w-3 h-3" />}
            highlight={condenacoes > absolvicoes ? "danger" : "default"}
          />
          <StatBox
            label="Absolvicoes"
            value={personagem.totalAbsolvicoes}
            icon={<TrendingUp className="w-3 h-3" />}
            highlight={absolvicoes > condenacoes ? "success" : "default"}
          />
          <StatBox
            label="Desclassif."
            value={personagem.totalDesclassificacoes}
            icon={<Target className="w-3 h-3" />}
            highlight={
              (personagem.totalDesclassificacoes ?? 0) > 0 ? "warning" : "default"
            }
          />
        </div>

        {/* Conviction vs Acquittal Bar */}
        {showBar && (
          <ConvictionBar condenacoes={condenacoes} absolvicoes={absolvicoes} />
        )}

        {/* Tempo Medio */}
        {personagem.tempoMedioSustentacao != null && personagem.tempoMedioSustentacao > 0 && (
          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-zinc-500 px-1">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>
              Tempo medio de sustentacao:{" "}
              <strong className="text-stone-700 dark:text-zinc-300 font-mono">
                {personagem.tempoMedioSustentacao} min
              </strong>
            </span>
          </div>
        )}

        {/* ---- COLLAPSIBLE SECTIONS ---- */}
        <div className="space-y-1 border-t border-stone-100 dark:border-zinc-800 pt-3">
          {/* Estilo de Atuacao */}
          {personagem.estiloAtuacao && (
            <CollapsibleSection
              title="Estilo de Atuacao"
              icon={<Eye className="w-4 h-4 text-blue-500" />}
              defaultOpen
            >
              <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {personagem.estiloAtuacao}
              </p>
            </CollapsibleSection>
          )}

          {/* Pontos Fortes / Fracos */}
          {(pontosFortesList.length > 0 || pontosFracosList.length > 0) && (
            <CollapsibleSection
              title="Pontos Fortes / Fracos"
              icon={<Shield className="w-4 h-4 text-purple-500" />}
              defaultOpen
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pontos Fortes */}
                {pontosFortesList.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">
                      Fortes
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {pontosFortesList.map((ponto, i) => (
                        <Badge key={i} variant="warning" className="text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {ponto}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* Pontos Fracos */}
                {pontosFracosList.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-stone-500 dark:text-zinc-500 uppercase tracking-wider">
                      Fracos
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {pontosFracosList.map((ponto, i) => (
                        <Badge key={i} variant="danger" className="text-xs">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          {ponto}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

          {/* Tendencias Observadas */}
          {personagem.tendenciasObservadas && (
            <CollapsibleSection
              title="Tendencias Observadas"
              icon={<Eye className="w-4 h-4 text-amber-500" />}
            >
              <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {personagem.tendenciasObservadas}
              </p>
            </CollapsibleSection>
          )}

          {/* Estrategias Recomendadas */}
          {personagem.estrategiasRecomendadas && (
            <CollapsibleSection
              title="Estrategias Recomendadas"
              icon={<Lightbulb className="w-4 h-4 text-emerald-500" />}
              defaultOpen
            >
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed whitespace-pre-wrap">
                  {personagem.estrategiasRecomendadas}
                </p>
              </div>
            </CollapsibleSection>
          )}

          {/* Argumentos Preferidos */}
          {personagem.argumentosPreferidos &&
            personagem.argumentosPreferidos.length > 0 && (
              <CollapsibleSection
                title="Argumentos Preferidos"
                icon={<Target className="w-4 h-4 text-blue-500" />}
              >
                <div className="flex flex-wrap gap-1.5">
                  {personagem.argumentosPreferidos.map((arg, i) => (
                    <Badge key={i} variant="info" className="text-xs">
                      {arg}
                    </Badge>
                  ))}
                </div>
              </CollapsibleSection>
            )}

          {/* Teses Vulneraveis */}
          {personagem.tesesVulneraveis &&
            personagem.tesesVulneraveis.length > 0 && (
              <CollapsibleSection
                title="Teses Vulneraveis"
                icon={<AlertTriangle className="w-4 h-4 text-emerald-500" />}
              >
                <p className="text-xs text-stone-500 dark:text-zinc-500 mb-2">
                  Teses que funcionaram contra este personagem
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {personagem.tesesVulneraveis.map((tese, i) => (
                    <Badge key={i} variant="success" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      {tese}
                    </Badge>
                  ))}
                </div>
              </CollapsibleSection>
            )}

          {/* Notas Estrategicas */}
          {personagem.notasEstrategicas && (
            <CollapsibleSection
              title="Notas Estrategicas"
              icon={<StickyNote className="w-4 h-4 text-stone-500 dark:text-zinc-400" />}
            >
              <div className="p-3 rounded-lg bg-stone-50 dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700">
                <p className="text-sm text-stone-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {personagem.notasEstrategicas}
                </p>
              </div>
            </CollapsibleSection>
          )}
        </div>
      </CardContent>

      {/* ---- FOOTER ---- */}
      <CardFooter className="flex items-center justify-between">
        <span className="text-xs text-stone-400 dark:text-zinc-500">
          {personagem.ultimaSessaoData ? (
            <>
              <Calendar className="w-3 h-3 inline mr-1" />
              Ultima sessao: {formatDate(personagem.ultimaSessaoData)}
            </>
          ) : (
            "Sem registro de sessoes anteriores"
          )}
        </span>
        {onEdit && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onEdit(personagem.id)}
            className="text-stone-500 dark:text-zinc-400 hover:text-stone-700 dark:hover:text-zinc-200"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" />
            Editar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
