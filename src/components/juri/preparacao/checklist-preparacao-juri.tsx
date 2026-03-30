"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Clock,
  FileText,
  Shield,
  Users,
  MessageSquare,
  Flame,
  BookOpen,
  ListChecks,
  CalendarCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

// ============================================
// TYPES
// ============================================

interface ChecklistPreparacaoJuriProps {
  sessaoId: string;
  casoId: number | null;
  dataSessao?: Date | string;
}

/** Expected shape returned by `trpc.preparacao.caseDataSummary` */
interface CaseDataSummary {
  dataSessao?: string;
  hasPericia: boolean;
  hasTheses: boolean;
  thesesCount: number;
  hasEvidence: boolean;
  hasFacts: boolean;
  factsCount?: number;
  hasDepoimentosAnalise: boolean;
  witnesses: Array<{
    id: number;
    nome: string;
    lado: "acusacao" | "defesa";
  }>;
}

type ChecklistCategory =
  | "preparacao"
  | "documentos"
  | "estrategia"
  | "testemunhas"
  | "comunicacao";

interface ChecklistItem {
  id: string;
  label: string;
  category: ChecklistCategory;
  critical: boolean;
  description?: string;
}

interface CategoryConfig {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ============================================
// CONSTANTS
// ============================================

const CATEGORY_CONFIG: Record<ChecklistCategory, CategoryConfig> = {
  preparacao: {
    label: "Preparacao Geral",
    icon: <BookOpen className="w-4 h-4" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  documentos: {
    label: "Documentos e Provas",
    icon: <FileText className="w-4 h-4" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  estrategia: {
    label: "Estrategia Defensiva",
    icon: <Shield className="w-4 h-4" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  testemunhas: {
    label: "Testemunhas",
    icon: <Users className="w-4 h-4" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  comunicacao: {
    label: "Comunicacao e Logistica",
    icon: <MessageSquare className="w-4 h-4" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-border",
  },
};

/** Static base items -- always present regardless of case data */
const BASE_ITEMS: ChecklistItem[] = [
  // Preparacao
  {
    id: "revisar-processo",
    label: "Revisar integralmente o processo",
    category: "preparacao",
    critical: true,
    description: "Leitura completa dos autos, incluindo denúncia, inquérito e peças intermediárias",
  },
  {
    id: "preparar-roteiro",
    label: "Preparar roteiro de plenário",
    category: "preparacao",
    critical: false,
    description: "Cronograma com tempos estimados para cada fase da sessão",
  },
  {
    id: "verificar-dia-local",
    label: "Verificar dia e local da sessão",
    category: "comunicacao",
    critical: false,
    description: "Confirmar data, horário, sala e endereço do fórum",
  },
  // Estrategia
  {
    id: "definir-tese",
    label: "Definir tese principal e subsidiária",
    category: "estrategia",
    critical: true,
    description: "Tese principal de defesa e alternativas em caso de recusa pelo conselho",
  },
  {
    id: "preparar-sustentacao",
    label: "Preparar sustentação oral",
    category: "estrategia",
    critical: true,
    description: "Roteiro da sustentação com argumentos-chave, duração estimada e pontos de ênfase",
  },
  {
    id: "elaborar-quesitos",
    label: "Elaborar quesitos defensivos",
    category: "estrategia",
    critical: true,
    description: "Redigir quesitos que orientem a votação favorável à tese da defesa",
  },
  // Comunicacao
  {
    id: "estudar-jurados",
    label: "Estudar perfil dos jurados",
    category: "comunicacao",
    critical: false,
    description: "Analisar lista de jurados convocados e traçar perfil socioeconômico",
  },
  {
    id: "material-visual",
    label: "Preparar material visual (se aplicável)",
    category: "comunicacao",
    critical: false,
    description: "Slides, fotos ampliadas, diagramas ou vídeos para o plenário",
  },
];

// ============================================
// HELPERS
// ============================================

function getDaysUntil(dataSessao: Date | string | undefined): number | null {
  if (!dataSessao) return null;
  const sessao = new Date(dataSessao);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  sessao.setHours(0, 0, 0, 0);
  return Math.ceil((sessao.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyConfig(daysUntil: number | null) {
  if (daysUntil === null) {
    return {
      label: "Data não definida",
      variant: "default" as const,
      className: "border-border bg-muted text-muted-foreground",
      pulse: false,
    };
  }
  if (daysUntil < 0) {
    return {
      label: "ATRASADO",
      variant: "danger" as const,
      className: "border-red-300 bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800 animate-pulse",
      pulse: true,
    };
  }
  if (daysUntil === 0) {
    return {
      label: "HOJE",
      variant: "danger" as const,
      className: "border-red-300 bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800 animate-pulse",
      pulse: true,
    };
  }
  if (daysUntil <= 3) {
    return {
      label: `Urgente - ${daysUntil} dia${daysUntil > 1 ? "s" : ""}`,
      variant: "danger" as const,
      className: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
      pulse: false,
    };
  }
  if (daysUntil <= 7) {
    return {
      label: `Atenção - ${daysUntil} dias`,
      variant: "warning" as const,
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
      pulse: false,
    };
  }
  return {
    label: "Tempo suficiente",
    variant: "success" as const,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
    pulse: false,
  };
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ChecklistItemRow({
  item,
  checked,
  onToggle,
}: {
  item: ChecklistItem;
  checked: boolean;
  onToggle: (id: string, checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={`checklist-${item.id}`}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-150",
        "hover:bg-muted/50",
        checked && "opacity-60"
      )}
    >
      <Checkbox
        id={`checklist-${item.id}`}
        checked={checked}
        onCheckedChange={(val) => onToggle(item.id, val as boolean)}
        className="mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium transition-all",
              checked
                ? "line-through text-muted-foreground/50"
                : "text-foreground/80"
            )}
          >
            {item.label}
          </span>
          {item.critical && (
            <Badge
              variant="danger"
              className="text-[10px] px-1.5 py-0 leading-tight shrink-0"
            >
              <Flame className="w-3 h-3 mr-0.5" />
              Crítico
            </Badge>
          )}
        </div>
        {item.description && (
          <p
            className={cn(
              "text-xs mt-0.5 leading-relaxed",
              checked
                ? "text-muted-foreground/30"
                : "text-muted-foreground"
            )}
          >
            {item.description}
          </p>
        )}
      </div>
    </label>
  );
}

function CategorySection({
  category,
  items,
  checkedItems,
  onToggle,
}: {
  category: ChecklistCategory;
  items: ChecklistItem[];
  checkedItems: Record<string, boolean>;
  onToggle: (id: string, checked: boolean) => void;
}) {
  const config = CATEGORY_CONFIG[category];
  const total = items.length;
  const done = items.filter((i) => checkedItems[i.id]).length;
  const allDone = done === total;
  const [isOpen, setIsOpen] = useState(!allDone);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-lg transition-all duration-150",
            "hover:bg-muted/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            config.bgColor,
            "border",
            config.borderColor
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className={config.color}>{config.icon}</span>
            <span
              className={cn(
                "text-sm font-semibold",
                config.color
              )}
            >
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {done}/{total}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {allDone && (
              <Badge variant="success" className="text-[10px] px-1.5 py-0">
                Completo
              </Badge>
            )}
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 ml-2 space-y-0.5">
          {items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              checked={!!checkedItems[item.id]}
              onToggle={onToggle}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StaticFallbackChecklist({
  sessaoId,
}: {
  sessaoId: string;
}) {
  const STORAGE_KEY = `preparacao-checklist-${sessaoId}`;
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    () => {
      if (typeof window === "undefined") return {};
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedItems));
  }, [checkedItems, STORAGE_KEY]);

  const handleToggle = useCallback((id: string, checked: boolean) => {
    setCheckedItems((prev) => ({ ...prev, [id]: checked }));
  }, []);

  const total = BASE_ITEMS.length;
  const done = BASE_ITEMS.filter((i) => checkedItems[i.id]).length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  const groupedItems = useMemo(() => {
    const groups: Partial<Record<ChecklistCategory, ChecklistItem[]>> = {};
    for (const item of BASE_ITEMS) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]!.push(item);
    }
    return groups;
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Checklist de Preparação
          </CardTitle>
          <Badge variant="default" className="text-xs">
            <ListChecks className="w-3 h-3 mr-1" />
            Modo básico
          </Badge>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso geral</span>
            <span className="font-mono font-semibold">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
        <div className="mt-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Vincule um processo/caso para gerar o checklist dinâmico com itens
            personalizados baseados nos dados do caso.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {(
              Object.keys(CATEGORY_CONFIG) as ChecklistCategory[]
            ).map((cat) => {
              const items = groupedItems[cat];
              if (!items || items.length === 0) return null;
              return (
                <CategorySection
                  key={cat}
                  category={cat}
                  items={items}
                  checkedItems={checkedItems}
                  onToggle={handleToggle}
                />
              );
            })}
          </div>
        </ScrollArea>
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {done}/{total} concluídos ({percentage}%)
          </span>
          <span>
            {BASE_ITEMS.filter((i) => i.critical && checkedItems[i.id]).length}/
            {BASE_ITEMS.filter((i) => i.critical).length} críticos
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ChecklistPreparacaoJuri({
  sessaoId,
  casoId,
  dataSessao,
}: ChecklistPreparacaoJuriProps) {
  // ---- tRPC query for dynamic case data ----
  // NOTE: The `preparacao` router must be created and registered in appRouter.
  // When it exists, remove the `as any` cast below.
  const preparacaoRouter = (trpc as any).preparacao;
  const { data, isLoading, isError } = preparacaoRouter
    ? preparacaoRouter.caseDataSummary.useQuery(
        { sessaoId: Number(sessaoId) },
        {
          enabled: !!casoId && !!sessaoId,
          retry: false,
          staleTime: 5 * 60 * 1000, // 5 minutes
        }
      )
    : ({ data: undefined, isLoading: false, isError: true } as {
        data: CaseDataSummary | undefined;
        isLoading: boolean;
        isError: boolean;
      });

  // ---- localStorage for checked state ----
  const STORAGE_KEY = `preparacao-checklist-${sessaoId}`;
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    () => {
      if (typeof window === "undefined") return {};
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedItems));
  }, [checkedItems, STORAGE_KEY]);

  const handleToggle = useCallback((id: string, checked: boolean) => {
    setCheckedItems((prev) => ({ ...prev, [id]: checked }));
  }, []);

  // ---- Determine effective date ----
  const effectiveDate = dataSessao ?? data?.dataSessao;
  const daysUntil = getDaysUntil(effectiveDate);
  const urgency = getUrgencyConfig(daysUntil);

  // ---- Build dynamic items ----
  const dynamicItems: ChecklistItem[] = useMemo(() => {
    const items: ChecklistItem[] = [...BASE_ITEMS];

    if (!data) return items;

    // Documentos / Provas
    if (data.hasPericia) {
      items.push({
        id: "analisar-laudo-pericial",
        label: "Analisar laudo pericial",
        category: "documentos",
        critical: true,
        description:
          "Verificar metodologia, conclusões e possíveis falhas na perícia",
      });
    }

    if (data.hasEvidence) {
      items.push({
        id: "catalogar-provas",
        label: "Catalogar provas disponíveis",
        category: "documentos",
        critical: false,
        description: "Organizar e classificar todas as provas da acusação e defesa",
      });
    }

    if (data.hasDepoimentosAnalise) {
      items.push({
        id: "revisar-analise-depoimentos",
        label: "Revisar análise comparativa de depoimentos",
        category: "documentos",
        critical: false,
        description:
          "Verificar contradições e consistências identificadas pela IA",
      });
    }

    // Estrategia
    if (data.hasTheses && data.thesesCount > 0) {
      items.push({
        id: "revisar-teses-cadastradas",
        label: `Revisar teses cadastradas (${data.thesesCount})`,
        category: "estrategia",
        critical: false,
        description:
          "Analisar as teses já salvas no sistema e verificar se estão atualizadas",
      });
    }

    if (data.hasFacts) {
      items.push({
        id: "verificar-fatos-controversos",
        label: `Verificar fatos controversos (${data.factsCount ?? 0})`,
        category: "estrategia",
        critical: false,
        description: "Mapear os fatos em disputa que serão debatidos no plenário",
      });
    }

    // Testemunhas
    if (data.witnesses && data.witnesses.length > 0) {
      for (const witness of data.witnesses) {
        const isAcusacao = witness.lado === "acusacao";
        items.push({
          id: `contradicoes-${witness.id}`,
          label: `Mapear contradições de ${witness.nome}`,
          category: "testemunhas",
          critical: isAcusacao,
          description: isAcusacao
            ? "Testemunha de acusação - identificar pontos fracos e inconsistências"
            : "Testemunha de defesa - preparar para reperguntas do MP",
        });
      }
    }

    return items;
  }, [data]);

  // ---- Group items by category ----
  const groupedItems = useMemo(() => {
    const groups: Partial<Record<ChecklistCategory, ChecklistItem[]>> = {};
    for (const item of dynamicItems) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category]!.push(item);
    }
    return groups;
  }, [dynamicItems]);

  // ---- Stats ----
  const total = dynamicItems.length;
  const done = dynamicItems.filter((i) => checkedItems[i.id]).length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  const criticalItems = dynamicItems.filter((i) => i.critical);
  const criticalDone = criticalItems.filter((i) => checkedItems[i.id]).length;
  const criticalTotal = criticalItems.length;
  const criticalPercentage =
    criticalTotal > 0 ? Math.round((criticalDone / criticalTotal) * 100) : 0;

  // ---- Fallback: no casoId or tRPC error ----
  if (!casoId || isError) {
    return <StaticFallbackChecklist sessaoId={sessaoId} />;
  }

  // ---- Loading ----
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Checklist de Preparação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-10 rounded-lg bg-muted animate-pulse" />
                <div className="ml-4 space-y-1">
                  <div className="h-8 rounded bg-muted/50 animate-pulse" />
                  <div className="h-8 rounded bg-muted/50 animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Render ----
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Checklist de Preparação
          </CardTitle>
          <div className="flex items-center gap-2">
            {data && (
              <Badge variant="default" className="text-[10px]">
                <CalendarCheck className="w-3 h-3 mr-1" />
                Dinâmico
              </Badge>
            )}
            <Badge className={cn("text-xs font-medium", urgency.className)}>
              <Clock className="w-3 h-3 mr-1" />
              {urgency.label}
            </Badge>
          </div>
        </div>

        {/* Progress bars */}
        <div className="mt-4 space-y-3">
          {/* Overall progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Progresso geral
              </span>
              <span className="font-mono font-semibold text-foreground/80">
                {percentage}%
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {/* Critical items progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3 text-red-500" />
                Itens críticos
              </span>
              <span
                className={cn(
                  "font-mono font-semibold",
                  criticalPercentage === 100
                    ? "text-emerald-600 dark:text-emerald-400"
                    : criticalPercentage >= 50
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400"
                )}
              >
                {criticalDone}/{criticalTotal} ({criticalPercentage}%)
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-red-100 dark:bg-red-950/30">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  criticalPercentage === 100
                    ? "bg-emerald-500"
                    : criticalPercentage >= 50
                      ? "bg-amber-500"
                      : "bg-red-500"
                )}
                style={{ width: `${criticalPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3">
            {(
              Object.keys(CATEGORY_CONFIG) as ChecklistCategory[]
            ).map((cat) => {
              const items = groupedItems[cat];
              if (!items || items.length === 0) return null;
              return (
                <CategorySection
                  key={cat}
                  category={cat}
                  items={items}
                  checkedItems={checkedItems}
                  onToggle={handleToggle}
                />
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer stats */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5" />
            {done}/{total} concluídos ({percentage}%)
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-red-500" />
            {criticalDone}/{criticalTotal} críticos
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
