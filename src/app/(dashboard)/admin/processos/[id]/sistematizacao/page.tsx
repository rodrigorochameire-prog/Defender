// @ts-nocheck
"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar,
  Layers,
  Search as SearchIcon,
  Sparkles,
  FileDown,
  FileText,
  Gavel,
  Scale,
  Users,
  ScrollText,
  Microscope,
  Shield,
  BookOpen,
  BookMarked,
  FileCheck,
  Unlock,
  ClipboardList,
  MessageSquare,
  FileSearch,
  CalendarDays,
  MapPin,
  HelpCircle,
  ShieldCheck,
  Check,
  X,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ─── Section Type Config (matching PdfViewerModal) ──────────────

const SECTION_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  denuncia: { label: "Denúncia", color: "#ef4444", bgColor: "bg-red-500/10 text-red-500 border-red-500/20", icon: Gavel },
  sentenca: { label: "Sentença", color: "#8b5cf6", bgColor: "bg-violet-500/10 text-violet-500 border-violet-500/20", icon: Scale },
  decisao: { label: "Decisão", color: "#f59e0b", bgColor: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: ScrollText },
  depoimento: { label: "Depoimento", color: "#3b82f6", bgColor: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Users },
  alegacoes: { label: "Alegações", color: "#06b6d4", bgColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20", icon: BookMarked },
  certidao: { label: "Certidão", color: "#22c55e", bgColor: "bg-green-500/10 text-green-500 border-green-500/20", icon: FileCheck },
  laudo: { label: "Laudo", color: "#ec4899", bgColor: "bg-pink-500/10 text-pink-500 border-pink-500/20", icon: Microscope },
  inquerito: { label: "Inquérito", color: "#f97316", bgColor: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: Shield },
  recurso: { label: "Recurso", color: "#14b8a6", bgColor: "bg-teal-500/10 text-teal-500 border-teal-500/20", icon: BookOpen },
  pronuncia: { label: "Pronúncia", color: "#d97706", bgColor: "bg-amber-600/10 text-amber-600 border-amber-600/20", icon: Gavel },
  resposta_acusacao: { label: "Resposta à Acusação", color: "#0d9488", bgColor: "bg-teal-600/10 text-teal-600 border-teal-600/20", icon: ShieldCheck },
  habeas_corpus: { label: "Habeas Corpus", color: "#dc2626", bgColor: "bg-red-600/10 text-red-600 border-red-600/20", icon: Unlock },
  diligencias_422: { label: "Diligências 422", color: "#ea580c", bgColor: "bg-orange-600/10 text-orange-600 border-orange-600/20", icon: ClipboardList },
  interrogatorio: { label: "Interrogatório", color: "#2563eb", bgColor: "bg-blue-600/10 text-blue-600 border-blue-600/20", icon: MessageSquare },
  termo_inquerito: { label: "Termo do Inquérito", color: "#475569", bgColor: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: FileSearch },
  ata_audiencia: { label: "Ata de Audiência", color: "#4f46e5", bgColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: CalendarDays },
  alegacoes_mp: { label: "Alegações (MP)", color: "#e11d48", bgColor: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: BookMarked },
  alegacoes_defesa: { label: "Alegações (Defesa)", color: "#059669", bgColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: BookMarked },
  laudo_necroscopico: { label: "Laudo Necroscópico", color: "#db2777", bgColor: "bg-pink-600/10 text-pink-600 border-pink-600/20", icon: Microscope },
  laudo_local: { label: "Laudo de Local", color: "#c026d3", bgColor: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20", icon: MapPin },
  outros: { label: "Outros", color: "#71717a", bgColor: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20", icon: HelpCircle },
};

function getSectionConfig(tipo: string) {
  return SECTION_TYPE_CONFIG[tipo] || SECTION_TYPE_CONFIG.outros;
}

type SistematizacaoTab = "cronologia" | "porTipo" | "contradicoes" | "teses";

export default function SistematizacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const processoId = parseInt(id);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SistematizacaoTab>("porTipo");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch processo data
  const { data: processo, isLoading: processoLoading } = trpc.processos.getById.useQuery(
    { id: processoId },
    { enabled: !isNaN(processoId) }
  );

  // Fetch all sections for this processo (cross-file)
  const { data: sectionsData, isLoading: sectionsLoading } =
    trpc.documentSections.listByProcesso.useQuery(
      { processoId },
      { enabled: !isNaN(processoId) }
    );

  // Fetch intelligence analysis if exists
  const { data: intelligence } = trpc.intelligence.getForProcesso.useQuery(
    { processoId },
    { enabled: !isNaN(processoId) }
  );

  const sections = useMemo(() => {
    if (!sectionsData) return [];
    return sectionsData.map((s) => ({
      ...s.section,
      fileName: s.fileName,
      fileId: s.fileId,
    }));
  }, [sectionsData]);

  // Filter by search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) =>
        s.titulo.toLowerCase().includes(q) ||
        s.tipo.toLowerCase().includes(q) ||
        (s.resumo && s.resumo.toLowerCase().includes(q))
    );
  }, [sections, searchQuery]);

  // Group sections by type
  const sectionsByType = useMemo(() => {
    const groups: Record<string, typeof filteredSections> = {};
    for (const s of filteredSections) {
      if (!groups[s.tipo]) groups[s.tipo] = [];
      groups[s.tipo].push(s);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSections]);

  // Timeline: extract dates from metadata and sort chronologically
  const cronologia = useMemo(() => {
    const events: Array<{
      date: string;
      parsedDate: Date | null;
      section: (typeof sections)[0];
      label: string;
    }> = [];

    for (const s of filteredSections) {
      const dates = s.metadata?.datasExtraidas || [];
      if (dates.length > 0) {
        for (const d of dates) {
          const parsed = parseBrazilianDate(d);
          events.push({
            date: d,
            parsedDate: parsed,
            section: s,
            label: `${getSectionConfig(s.tipo).label} — ${s.titulo}`,
          });
        }
      } else {
        // Use createdAt as fallback
        events.push({
          date: s.createdAt ? format(new Date(s.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "",
          parsedDate: s.createdAt ? new Date(s.createdAt) : null,
          section: s,
          label: `${getSectionConfig(s.tipo).label} — ${s.titulo}`,
        });
      }
    }

    return events.sort((a, b) => {
      if (!a.parsedDate) return 1;
      if (!b.parsedDate) return -1;
      return a.parsedDate.getTime() - b.parsedDate.getTime();
    });
  }, [filteredSections]);

  // Stats
  const stats = useMemo(() => {
    const total = sections.length;
    const approved = sections.filter((s) => s.reviewStatus === "approved").length;
    const rejected = sections.filter((s) => s.reviewStatus === "rejected").length;
    const pending = sections.filter((s) => s.reviewStatus === "pending").length;
    return { total, approved, rejected, pending };
  }, [sections]);

  // Analysis data
  const analysisData = intelligence?.analysisData as any;
  const caseFacts = intelligence?.caseFacts || [];
  const personas = intelligence?.personas || [];

  if (processoLoading || sectionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const TABS: { key: SistematizacaoTab; label: string; icon: React.ElementType }[] = [
    { key: "porTipo", label: "Por Tipo", icon: Layers },
    { key: "cronologia", label: "Cronologia", icon: Calendar },
    { key: "contradicoes", label: "Contradições", icon: AlertTriangle },
    { key: "teses", label: "Teses", icon: Sparkles },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/processos/${processoId}`)}
          className="gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Sistematização Processual
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {processo?.numero || `Processo #${processoId}`}
            {processo?.assistido && ` — ${processo.assistido.nome}`}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total de Peças" value={stats.total} icon={FileText} color="zinc" />
        <StatCard label="Aprovadas" value={stats.approved} icon={CheckCircle2} color="emerald" />
        <StatCard label="Rejeitadas" value={stats.rejected} icon={XCircle} color="red" />
        <StatCard label="Pendentes" value={stats.pending} icon={Clock} color="amber" />
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Buscar peças..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "porTipo" && (
          <ByTypeView sectionsByType={sectionsByType} processoId={processoId} />
        )}
        {activeTab === "cronologia" && (
          <CronologiaView cronologia={cronologia} processoId={processoId} />
        )}
        {activeTab === "contradicoes" && (
          <ContradicoesView
            analysisData={analysisData}
            caseFacts={caseFacts}
            sections={filteredSections}
          />
        )}
        {activeTab === "teses" && (
          <TesesView
            analysisData={analysisData}
            caseFacts={caseFacts}
          />
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function parseBrazilianDate(dateStr: string): Date | null {
  // Try DD/MM/YYYY
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  }
  // Try YYYY-MM-DD
  const iso = new Date(dateStr);
  return isNaN(iso.getTime()) ? null : iso;
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "zinc" | "emerald" | "red" | "amber";
}) {
  const colorMap = {
    zinc: "text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    red: "text-red-500 bg-red-50 dark:bg-red-900/20",
    amber: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  };

  return (
    <div className={cn("rounded-xl p-4 border border-zinc-200 dark:border-zinc-700", colorMap[color])}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-[11px] font-medium uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// ─── "Por Tipo" View ─────────────────────────────────────────────

function ByTypeView({
  sectionsByType,
  processoId,
}: {
  sectionsByType: [string, any[]][];
  processoId: number;
}) {
  const [expandedType, setExpandedType] = useState<string | null>(null);

  if (sectionsByType.length === 0) {
    return <EmptyState message="Nenhuma peça processual classificada" />;
  }

  return (
    <div className="space-y-3">
      {sectionsByType.map(([tipo, items]) => {
        const config = getSectionConfig(tipo);
        const Icon = config.icon;
        const isExpanded = expandedType === tipo;
        const approvedCount = items.filter((s) => s.reviewStatus === "approved").length;

        return (
          <div key={tipo} className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
            {/* Type header */}
            <button
              onClick={() => setExpandedType(isExpanded ? null : tipo)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${config.color}15` }}
              >
                <Icon className="w-4 h-4" style={{ color: config.color }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {config.label}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {items.length} {items.length === 1 ? "peça" : "peças"}
                  {approvedCount > 0 && (
                    <span className="text-emerald-500 ml-2">
                      {approvedCount} aprovada{approvedCount > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 text-zinc-400 transition-transform",
                isExpanded && "rotate-90"
              )} />
            </button>

            {/* Expanded items */}
            {isExpanded && (
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                {items.map((section) => (
                  <SectionRow key={section.id} section={section} processoId={processoId} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionRow({ section, processoId }: { section: any; processoId: number }) {
  const config = getSectionConfig(section.tipo);
  const statusBadge = getStatusBadge(section.reviewStatus);
  const hasFicha = section.fichaData && Object.keys(section.fichaData).length > 0;
  const [showFicha, setShowFicha] = useState(false);

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
        {statusBadge}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
            {section.titulo}
          </p>
          {section.resumo && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
              {section.resumo}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-zinc-400 font-mono">
              pg {section.paginaInicio}-{section.paginaFim}
            </span>
            {section.confianca != null && (
              <span className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded",
                section.confianca >= 80 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" :
                section.confianca >= 50 ? "text-amber-500 bg-amber-50 dark:bg-amber-900/20" :
                "text-red-500 bg-red-50 dark:bg-red-900/20"
              )}>
                {section.confianca}% confiança
              </span>
            )}
            <span className="text-[10px] text-zinc-400">
              {section.fileName}
            </span>
          </div>
        </div>
        {hasFicha && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] gap-1 text-violet-500 hover:text-violet-600"
            onClick={() => setShowFicha(!showFicha)}
          >
            <FileSearch className="w-3 h-3" />
            Ficha
          </Button>
        )}
      </div>

      {/* Ficha expandida */}
      {showFicha && hasFicha && (
        <div className="px-4 py-3 bg-violet-50/50 dark:bg-violet-900/10 border-t border-violet-100 dark:border-violet-800/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(section.fichaData).map(([key, value]) => {
              if (key.startsWith("_")) return null;
              const displayKey = key
                .replace(/([A-Z])/g, " $1")
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/^\w/, (c: string) => c.toUpperCase());

              return (
                <div key={key} className="flex gap-2">
                  <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 flex-shrink-0 min-w-[100px]">
                    {displayKey}:
                  </span>
                  <span className="text-[10px] text-zinc-700 dark:text-zinc-300">
                    {Array.isArray(value)
                      ? (value as string[]).join(", ")
                      : typeof value === "object" && value !== null
                        ? JSON.stringify(value, null, 0)
                        : String(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── "Cronologia" View ───────────────────────────────────────────

function CronologiaView({
  cronologia,
  processoId,
}: {
  cronologia: Array<{
    date: string;
    parsedDate: Date | null;
    section: any;
    label: string;
  }>;
  processoId: number;
}) {
  if (cronologia.length === 0) {
    return <EmptyState message="Nenhum evento com datas extraídas" />;
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-6 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-700" />

      <div className="space-y-0">
        {cronologia.map((event, idx) => {
          const config = getSectionConfig(event.section.tipo);
          const Icon = config.icon;

          return (
            <div key={`${event.section.id}-${idx}`} className="relative flex items-start gap-4 py-3 pl-2">
              {/* Timeline dot */}
              <div
                className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 shadow-sm"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: config.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[9px] font-mono">
                    {event.date}
                  </Badge>
                  <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-md border", config.bgColor)}>
                    {config.label}
                  </span>
                </div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {event.section.titulo}
                </p>
                {event.section.resumo && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {event.section.resumo}
                  </p>
                )}
                <span className="text-[9px] text-zinc-400 mt-1 block">
                  {event.section.fileName} · pg {event.section.paginaInicio}-{event.section.paginaFim}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── "Contradições" View ─────────────────────────────────────────

function ContradicoesView({
  analysisData,
  caseFacts,
  sections,
}: {
  analysisData: any;
  caseFacts: any[];
  sections: any[];
}) {
  const inconsistencias = analysisData?.inconsistencias || [];
  const contradicaoFacts = caseFacts.filter((f: any) => f.tipo === "contradicao" || f.tipo === "inconsistencia");

  if (inconsistencias.length === 0 && contradicaoFacts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
        </div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Nenhuma contradição identificada</p>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          A análise comparativa será gerada automaticamente quando houver seções aprovadas suficientes
          (depoimentos, laudos, etc.)
        </p>
        {sections.filter((s) => s.reviewStatus === "approved").length < 3 && (
          <p className="text-[10px] text-amber-500 mt-3">
            Aprove pelo menos 3 seções no visualizador para gerar contradições
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {inconsistencias.map((item: string, idx: number) => (
        <div
          key={`inc-${idx}`}
          className="flex items-start gap-3 p-4 border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl"
        >
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">{item}</p>
          </div>
        </div>
      ))}

      {contradicaoFacts.map((fact: any) => (
        <div
          key={fact.id}
          className="flex items-start gap-3 p-4 border border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10 rounded-xl"
        >
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{fact.descricao}</p>
            {fact.fonte && (
              <span className="text-[10px] text-zinc-500 mt-1 block">Fonte: {fact.fonte}</span>
            )}
            {fact.confianca && (
              <Badge variant="outline" className="mt-1 text-[9px]">
                Confiança: {fact.confianca}%
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── "Teses" View ────────────────────────────────────────────────

function TesesView({
  analysisData,
  caseFacts,
}: {
  analysisData: any;
  caseFacts: any[];
}) {
  const recomendacoes = analysisData?.recomendacoes || [];
  const teseFacts = caseFacts.filter((f: any) => f.tipo === "tese" || f.tipo === "nulidade");

  if (recomendacoes.length === 0 && teseFacts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/20 dark:to-violet-800/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-violet-400" />
        </div>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Nenhuma tese sugerida</p>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          As teses de defesa são sugeridas pela IA após consolidar a análise de todas as peças aprovadas
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recomendacoes.map((rec: string, idx: number) => (
        <div
          key={`rec-${idx}`}
          className="flex items-start gap-3 p-4 border border-violet-200 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-900/10 rounded-xl"
        >
          <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-800 dark:text-zinc-200">{rec}</p>
        </div>
      ))}

      {teseFacts.map((fact: any) => (
        <div
          key={fact.id}
          className={cn(
            "flex items-start gap-3 p-4 rounded-xl border",
            fact.tipo === "nulidade"
              ? "border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10"
              : "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
            fact.tipo === "nulidade" ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
          )}>
            {fact.tipo === "nulidade"
              ? <AlertTriangle className="w-4 h-4 text-red-500" />
              : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px]">
                {fact.tipo === "nulidade" ? "Nulidade" : "Tese"}
              </Badge>
              {fact.confianca && (
                <span className="text-[9px] font-mono text-zinc-500">
                  {fact.confianca}% confiança
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-1">{fact.descricao}</p>
            {fact.fonte && (
              <span className="text-[10px] text-zinc-500 mt-1 block">Fonte: {fact.fonte}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case "approved":
      return (
        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
        </div>
      );
    case "rejected":
      return (
        <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
          <X className="w-3.5 h-3.5 text-red-500" />
        </div>
      );
    case "needs_review":
      return (
        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </div>
      );
    default:
      return (
        <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
        </div>
      );
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
        <FileText className="w-6 h-6 text-zinc-400" />
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
    </div>
  );
}
