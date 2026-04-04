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
import dynamic from "next/dynamic";
const DocumentCompareModal = dynamic(
  () => import("@/components/drive/DocumentCompareModal").then(m => m.DocumentCompareModal || m.default),
  { ssr: false }
);

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
  outros: { label: "Outros", color: "#71717a", bgColor: "bg-neutral-500/10 text-neutral-500 border-neutral-500/20", icon: HelpCircle },
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
  const [timelineMode, setTimelineMode] = useState<"cronologico" | "por_pessoa">("cronologico");
  const [faseFilter, setFaseFilter] = useState<"todos" | "inquerito" | "instrucao" | "plenario">("todos");
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareFileA, setCompareFileA] = useState<any>(null);

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
      descricao?: string;
      fonte?: string;
      fase?: string | null;
    }> = [];

    for (const s of filteredSections) {
      const meta = s.metadata || {};
      const fase = meta.fase || null;

      // v3: Use cronologia[] array if available
      const cronologiaArr = meta.cronologia || [];
      if (cronologiaArr.length > 0) {
        for (const c of cronologiaArr) {
          events.push({
            date: c.data || "",
            parsedDate: parseBrazilianDate(c.data || ""),
            section: s,
            label: `${getSectionConfig(s.tipo).label} — ${s.titulo}`,
            descricao: c.descricao,
            fonte: c.fonte,
            fase,
          });
        }
      } else {
        // v1 fallback: datasExtraidas
        const dates = meta.datasExtraidas || [];
        if (dates.length > 0) {
          for (const d of dates) {
            events.push({
              date: d,
              parsedDate: parseBrazilianDate(d),
              section: s,
              label: `${getSectionConfig(s.tipo).label} — ${s.titulo}`,
              fase,
            });
          }
        } else {
          events.push({
            date: s.createdAt ? format(new Date(s.createdAt), "dd/MM/yyyy", { locale: ptBR }) : "",
            parsedDate: s.createdAt ? new Date(s.createdAt) : null,
            section: s,
            label: `${getSectionConfig(s.tipo).label} — ${s.titulo}`,
            fase,
          });
        }
      }
    }

    return events.sort((a, b) => {
      if (!a.parsedDate) return 1;
      if (!b.parsedDate) return -1;
      return a.parsedDate.getTime() - b.parsedDate.getTime();
    });
  }, [filteredSections]);

  // Group sections by person name
  const pessoaGroups = useMemo(() => {
    const groups = new Map<string, typeof filteredSections>();
    for (const s of filteredSections) {
      const pessoas = (s.metadata?.pessoas || []) as Array<{ nome: string; papel: string }>;
      if (pessoas.length > 0) {
        for (const p of pessoas) {
          const key = p.nome.toLowerCase().trim();
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(s);
        }
      }
    }
    // Sort by number of appearances (most appearances first)
    return [...groups.entries()]
      .filter(([_, sections]) => sections.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);
  }, [filteredSections]);

  // Compare handler
  const handleCompare = (section: any) => {
    setCompareFileA({
      id: section.fileId,
      name: section.fileName,
      webViewLink: null,
      driveFolderId: null,
      driveFileId: null,
    });
    setCompareOpen(true);
  };

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
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
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
          <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Sistematização Processual
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
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
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Buscar peças..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
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
          <ByTypeView sectionsByType={sectionsByType} processoId={processoId} onCompare={handleCompare} />
        )}
        {activeTab === "cronologia" && (
          <CronologiaView
            cronologia={cronologia}
            processoId={processoId}
            timelineMode={timelineMode}
            setTimelineMode={setTimelineMode}
            faseFilter={faseFilter}
            setFaseFilter={setFaseFilter}
            pessoaGroups={pessoaGroups}
          />
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

      {compareOpen && (
        <DocumentCompareModal
          isOpen={compareOpen}
          onClose={() => { setCompareOpen(false); setCompareFileA(null); }}
          initialFileA={compareFileA}
          assistidoId={processo?.assistidoId}
        />
      )}
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
    zinc: "text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    red: "text-red-500 bg-red-50 dark:bg-red-900/20",
    amber: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  };

  return (
    <div className={cn("rounded-xl p-4 border border-neutral-200 dark:border-neutral-700", colorMap[color])}>
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
  onCompare,
}: {
  sectionsByType: [string, any[]][];
  processoId: number;
  onCompare?: (section: any) => void;
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
          <div key={tipo} className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
            {/* Type header */}
            <button
              onClick={() => setExpandedType(isExpanded ? null : tipo)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${config.color}15` }}
              >
                <Icon className="w-4 h-4" style={{ color: config.color }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {config.label}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {items.length} {items.length === 1 ? "peça" : "peças"}
                  {approvedCount > 0 && (
                    <span className="text-emerald-500 ml-2">
                      {approvedCount} aprovada{approvedCount > 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 text-neutral-400 transition-transform",
                isExpanded && "rotate-90"
              )} />
            </button>

            {/* Expanded items */}
            {isExpanded && (
              <div className="border-t border-neutral-100 dark:border-neutral-800">
                {items.map((section) => (
                  <SectionRow key={section.id} section={section} processoId={processoId} onCompare={onCompare} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionRow({ section, processoId, onCompare }: { section: any; processoId: number; onCompare?: (section: any) => void }) {
  const config = getSectionConfig(section.tipo);
  const statusBadge = getStatusBadge(section.reviewStatus);
  const hasFicha = section.fichaData && Object.keys(section.fichaData).length > 0;
  const [showFicha, setShowFicha] = useState(false);

  return (
    <div className="border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
        {statusBadge}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {section.titulo}
          </p>
          {section.resumo && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
              {section.resumo}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-neutral-400 font-mono">
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
            <span className="text-[10px] text-neutral-400">
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
        {/* Show compare button for depoimentos */}
        {onCompare && (section.tipo.startsWith("depoimento") || section.tipo === "interrogatorio") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] gap-1 text-blue-500 hover:text-blue-600"
            onClick={() => onCompare(section)}
          >
            <ExternalLink className="w-3 h-3" />
            Comparar
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
                  <span className="text-[10px] text-neutral-700 dark:text-neutral-300">
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
  timelineMode,
  setTimelineMode,
  faseFilter,
  setFaseFilter,
  pessoaGroups,
}: {
  cronologia: Array<{ date: string; parsedDate: Date | null; section: any; label: string; descricao?: string; fonte?: string; fase?: string | null }>;
  processoId: number;
  timelineMode: "cronologico" | "por_pessoa";
  setTimelineMode: (m: "cronologico" | "por_pessoa") => void;
  faseFilter: string;
  setFaseFilter: (f: any) => void;
  pessoaGroups: [string, any[]][];
}) {
  const FASE_LABELS: Record<string, { label: string; color: string }> = {
    inquerito: { label: "Inquérito", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    instrucao: { label: "Instrução", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    plenario: { label: "Plenário", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  };

  const hasFases = cronologia.some(e => e.fase);

  // Filter by fase
  const filteredCronologia = faseFilter === "todos"
    ? cronologia
    : cronologia.filter(e => e.fase === faseFilter);

  if (cronologia.length === 0 && pessoaGroups.length === 0) {
    return <EmptyState message="Nenhum evento com datas extraídas" />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1">
          <button
            onClick={() => setTimelineMode("cronologico")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
              timelineMode === "cronologico"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            Cronológico
          </button>
          <button
            onClick={() => setTimelineMode("por_pessoa")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
              timelineMode === "por_pessoa"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            Por Pessoa
            {pessoaGroups.length > 0 && (
              <span className="text-[9px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                {pessoaGroups.length}
              </span>
            )}
          </button>
        </div>

        {/* Fase filter chips */}
        {hasFases && timelineMode === "cronologico" && (
          <div className="flex gap-1">
            <button
              onClick={() => setFaseFilter("todos")}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border",
                faseFilter === "todos"
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-transparent"
                  : "bg-transparent text-neutral-500 border-neutral-300 dark:border-neutral-600 hover:border-neutral-400"
              )}
            >
              Todos
            </button>
            {Object.entries(FASE_LABELS).map(([key, { label, color }]) => (
              <button
                key={key}
                onClick={() => setFaseFilter(key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border",
                  faseFilter === key
                    ? cn(color, "border-transparent")
                    : "bg-transparent text-neutral-500 border-neutral-300 dark:border-neutral-600 hover:border-neutral-400"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cronológico mode */}
      {timelineMode === "cronologico" && (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700" />
          <div className="space-y-0">
            {filteredCronologia.map((event, idx) => {
              const config = getSectionConfig(event.section.tipo);
              const Icon = config.icon;
              const meta = event.section.metadata || {};
              const contradicoes = meta.contradicoes || [];
              const pontosCriticos = meta.pontosCriticos || [];

              return (
                <div key={`${event.section.id}-${idx}`} className="relative flex items-start gap-4 py-3 pl-2">
                  <div
                    className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center border-2 border-white dark:border-neutral-900 shadow-sm"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {event.date}
                      </Badge>
                      <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-md border", config.bgColor)}>
                        {config.label}
                      </span>
                      {event.fase && FASE_LABELS[event.fase] && (
                        <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full", FASE_LABELS[event.fase].color)}>
                          {FASE_LABELS[event.fase].label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {event.section.titulo}
                    </p>
                    {event.descricao && (
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5">
                        {event.descricao}
                      </p>
                    )}
                    {event.section.resumo && !event.descricao && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                        {event.section.resumo}
                      </p>
                    )}
                    {/* Contradições inline */}
                    {contradicoes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {contradicoes.map((c: string, i: number) => (
                          <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10 rounded px-2 py-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Pontos críticos inline */}
                    {pontosCriticos.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {pontosCriticos.map((p: string, i: number) => (
                          <div key={i} className="flex items-start gap-1.5 text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded px-2 py-1">
                            <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="text-[9px] text-neutral-400 mt-1 block">
                      {event.section.fileName} · pg {event.section.paginaInicio}-{event.section.paginaFim}
                      {event.fonte && ` · Fonte: ${event.fonte}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Por Pessoa mode */}
      {timelineMode === "por_pessoa" && (
        <div className="space-y-6">
          {pessoaGroups.length === 0 ? (
            <EmptyState message="Nenhuma pessoa identificada em múltiplas peças" />
          ) : (
            pessoaGroups.map(([personName, personSections]) => {
              // Sort by fase order: inquerito -> instrucao -> plenario
              const FASE_ORDER: Record<string, number> = { inquerito: 0, instrucao: 1, plenario: 2 };
              const sorted = [...personSections].sort((a, b) => {
                const faseA = FASE_ORDER[a.metadata?.fase] ?? 3;
                const faseB = FASE_ORDER[b.metadata?.fase] ?? 3;
                return faseA - faseB;
              });

              // Find the person's role
              const personRole = (() => {
                for (const s of personSections) {
                  const pessoas = (s.metadata?.pessoas || []) as Array<{ nome: string; papel: string; descricao?: string }>;
                  const match = pessoas.find(p => p.nome.toLowerCase().trim() === personName);
                  if (match) return match;
                }
                return null;
              })();

              // Check for contradictions across phases
              const hasMultiplePhases = new Set(sorted.map(s => s.metadata?.fase).filter(Boolean)).size > 1;

              return (
                <div key={personName} className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 capitalize">
                        {personName}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        {personRole?.papel && <span className="capitalize">{personRole.papel}</span>}
                        {personRole?.descricao && ` — ${personRole.descricao}`}
                        {" · "}{sorted.length} {sorted.length === 1 ? "aparição" : "aparições"}
                        {hasMultiplePhases && (
                          <span className="ml-2 text-amber-500 font-medium">Múltiplas fases — comparar versões</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {sorted.map((section) => {
                      const config = getSectionConfig(section.tipo);
                      const fase = section.metadata?.fase;
                      const faseLabel = fase && FASE_LABELS[fase];
                      const contradicoes = section.metadata?.contradicoes || [];

                      return (
                        <div key={section.id} className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {faseLabel && (
                              <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full", faseLabel.color)}>
                                {faseLabel.label}
                              </span>
                            )}
                            <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-md border", config.bgColor)}>
                              {config.label}
                            </span>
                            {section.confianca != null && (
                              <span className="text-[9px] font-mono text-neutral-400">
                                {section.confianca}%
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                            {section.titulo}
                          </p>
                          {section.resumo && (
                            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                              {section.resumo}
                            </p>
                          )}
                          {contradicoes.length > 0 && (
                            <div className="mt-1.5">
                              {contradicoes.map((c: string, i: number) => (
                                <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/10 rounded px-2 py-1 mt-1">
                                  <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                  <span>{c}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <span className="text-[9px] text-neutral-400 mt-1 block">
                            {section.fileName} · pg {section.paginaInicio}-{section.paginaFim}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
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
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Nenhuma contradição identificada</p>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
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
            <p className="text-sm text-neutral-800 dark:text-neutral-200">{item}</p>
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
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{fact.descricao}</p>
            {fact.fonte && (
              <span className="text-[10px] text-neutral-500 mt-1 block">Fonte: {fact.fonte}</span>
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
        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Nenhuma tese sugerida</p>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
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
          <p className="text-sm text-neutral-800 dark:text-neutral-200">{rec}</p>
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
                <span className="text-[9px] font-mono text-neutral-500">
                  {fact.confianca}% confiança
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mt-1">{fact.descricao}</p>
            {fact.fonte && (
              <span className="text-[10px] text-neutral-500 mt-1 block">Fonte: {fact.fonte}</span>
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
        <div className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
        </div>
      );
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
        <FileText className="w-6 h-6 text-neutral-400" />
      </div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
    </div>
  );
}
