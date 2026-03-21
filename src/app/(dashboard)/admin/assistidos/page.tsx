"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useMemo, useRef, useCallback, useEffect, Fragment } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  Plus,
  Search,
  Download,
  LayoutGrid,
  List,
  FileText,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Camera,
  Brain,
  BookmarkCheck,
  Clock,
  Calendar,
  AlertCircle,
  XCircle,
  Lock,
  Sun,
  Loader2,
  Activity,
  Link2Off,
  Scale,
  BarChart3,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssignment } from "@/contexts/assignment-context";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useOfflineQuery } from "@/hooks/use-offline-query";
import { useProgressiveList } from "@/hooks/use-progressive-list";
import { getOfflineAssistidos } from "@/lib/offline/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ATRIBUICAO_OPTIONS,
  getAtribuicaoColors,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";
import { differenceInDays, parseISO, format } from "date-fns";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { toast } from "sonner";

// Extracted components
import { AssistidoUI } from "./_components/assistido-types";
import { statusConfig, faseConfig, areaConfig, ATRIBUICAO_ICONS } from "./_components/assistido-config";
import { getPrazoInfo, calcularIdade, calcularTempoPreso } from "./_components/assistido-utils";
import { PhotoUploadDialog } from "./_components/photo-upload-dialog";
import { AssistidoQuickPreview } from "./_components/assistido-quick-preview";
import { AssistidoCard } from "./_components/assistido-card";
import { AssistidoTableView } from "./_components/assistido-table-view";
import { ProcessingQueuePanel } from "@/components/drive/ProcessingQueuePanel";
import { useProcessingQueue } from "@/contexts/processing-queue";
import { useComarcaVisibilidade } from "@/hooks/use-comarca-visibilidade";

// ========================================
// HELPERS
// ========================================

/** Compute completude score (0-100) for a single assistido */
function computeCompletude(a: AssistidoUI): number {
  let score = 0;
  if (a.cpf) score += 20;
  if (a.telefone || a.telefoneContato) score += 15;
  if (a.endereco) score += 15;
  if (a.driveFolderId) score += 20;
  if (a.numeroProcesso || a.processoPrincipal) score += 15;
  if (a.observacoes) score += 15;
  return score;
}

/** Compute smart alerts for an assistido */
function computeAlerts(a: AssistidoUI): Array<{ label: string; color: "rose" | "amber" }> {
  const alerts: Array<{ label: string; color: "rose" | "amber" }> = [];
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional);

  // Preso 90+ dias sem audiencia
  if (isPreso && a.dataPrisao) {
    const diasPreso = differenceInDays(new Date(), parseISO(a.dataPrisao));
    if (diasPreso >= 90 && !a.proximaAudiencia) {
      alerts.push({ label: `Sem audiencia ha ${diasPreso}d+`, color: "rose" });
    }
  }

  // Processo parado 60+ dias
  if (!a.proximoPrazo && !a.proximaAudiencia && !a.ultimoEvento) {
    if (a.createdAt) {
      const diasCadastro = differenceInDays(new Date(), parseISO(a.createdAt));
      if (diasCadastro >= 60) {
        alerts.push({ label: "Inativo 60d+", color: "amber" });
      }
    }
  }

  return alerts;
}

/** Export filtered assistidos to CSV */
function exportToCSV(assistidos: AssistidoUI[]) {
  const headers = ["Nome", "CPF", "Status", "Crime", "Processo", "Telefone", "Endereco", "Atribuicao", "Comarca"];
  const rows = assistidos.map((a) => [
    a.nome,
    a.cpf || "",
    statusConfig[a.statusPrisional]?.label || a.statusPrisional || "Solto",
    a.crimePrincipal || "",
    a.numeroProcesso || "",
    a.telefone || a.telefoneContato || "",
    a.endereco || "",
    (a.atribuicoes || a.areas || []).join("; "),
    (a.comarcas || []).join("; "),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((cell) => `"${(cell || "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `assistidos-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ========================================
// SIMPLE CSS DONUT CHART (no external deps)
// ========================================

function DonutChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div className="text-xs text-zinc-400">Sem dados</div>;

  let cumPercent = 0;
  const gradientParts = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const start = cumPercent;
      const pct = (d.value / total) * 100;
      cumPercent += pct;
      return `${d.color} ${start}% ${cumPercent}%`;
    });

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-24 h-24 rounded-full shrink-0"
        style={{
          background: `conic-gradient(${gradientParts.join(", ")})`,
          mask: "radial-gradient(circle at center, transparent 40%, black 41%)",
          WebkitMask: "radial-gradient(circle at center, transparent 40%, black 41%)",
        }}
      />
      <div className="space-y-1">
        {data
          .filter((d) => d.value > 0)
          .map((d) => (
            <div key={d.label} className="flex items-center gap-2 text-xs">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-zinc-600 dark:text-zinc-400">{d.label}</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">{d.value}</span>
              <span className="text-zinc-400 text-[10px]">({Math.round((d.value / total) * 100)}%)</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function BarChartSimple({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d) => (
        <Tooltip key={d.label}>
          <TooltipTrigger asChild>
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">{d.value}</span>
              <div
                className="w-full rounded-t-md transition-all min-h-[2px]"
                style={{
                  height: `${Math.max((d.value / max) * 80, 2)}px`,
                  backgroundColor: d.color,
                }}
              />
              <span className="text-[9px] text-zinc-400 truncate max-w-[40px]">{d.label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{d.label}: {d.value}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

// ========================================
// ANALYTICS TAB COMPONENT
// ========================================

function AnalyticsTab({ assistidos }: { assistidos: AssistidoUI[] }) {
  const atribuicaoData = useMemo(() => {
    const counts: Record<string, number> = {};
    assistidos.forEach((a) => {
      const attrs = a.atribuicoes || a.areas || [];
      if (attrs.length === 0) {
        counts["Sem atribuicao"] = (counts["Sem atribuicao"] || 0) + 1;
      } else {
        attrs.forEach((attr) => {
          const normalizedAttr = attr.toUpperCase().replace(/_/g, " ");
          const option = ATRIBUICAO_OPTIONS.find(
            (o) =>
              o.value.toUpperCase() === normalizedAttr ||
              o.label.toUpperCase().includes(normalizedAttr) ||
              normalizedAttr.includes(o.value.toUpperCase())
          );
          const label = option?.shortLabel || attr;
          counts[label] = (counts[label] || 0) + 1;
        });
      }
    });
    return Object.entries(counts).map(([label, value]) => {
      const option = ATRIBUICAO_OPTIONS.find((o) => o.shortLabel === label);
      const color = option ? SOLID_COLOR_MAP[option.value] || "#71717a" : "#71717a";
      return { label, value, color };
    });
  }, [assistidos]);

  const statusData = useMemo(() => {
    const presos = assistidos.filter((a) =>
      ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional)
    ).length;
    const monitorados = assistidos.filter((a) =>
      ["MONITORADO", "DOMICILIAR"].includes(a.statusPrisional)
    ).length;
    const soltos = assistidos.filter((a) => a.statusPrisional === "SOLTO" || !a.statusPrisional).length;
    return [
      { label: "Presos", value: presos, color: "#f43f5e" },
      { label: "Monitorados", value: monitorados, color: "#f59e0b" },
      { label: "Soltos", value: soltos, color: "#10b981" },
    ];
  }, [assistidos]);

  const generalStats = useMemo(() => {
    const totalProcessos = assistidos.reduce((sum, a) => sum + (a.processosAtivos || 0), 0);
    const mediaProcessos = assistidos.length > 0 ? (totalProcessos / assistidos.length).toFixed(1) : "0";
    const comDrive = assistidos.filter((a) => a.driveFolderId).length;
    const pctDrive = assistidos.length > 0 ? Math.round((comDrive / assistidos.length) * 100) : 0;
    const comAudienciaProxima = assistidos.filter((a) => {
      if (!a.proximaAudiencia) return false;
      const dias = differenceInDays(parseISO(a.proximaAudiencia), new Date());
      return dias >= 0 && dias <= 30;
    }).length;
    const pctAudiencia = assistidos.length > 0 ? Math.round((comAudienciaProxima / assistidos.length) * 100) : 0;
    const completudeMedia = assistidos.length > 0
      ? Math.round(assistidos.reduce((sum, a) => sum + computeCompletude(a), 0) / assistidos.length)
      : 0;
    return { mediaProcessos, pctDrive, pctAudiencia, completudeMedia };
  }, [assistidos]);

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, "yyyy-MM");
      months[key] = 0;
    }
    assistidos.forEach((a) => {
      if (!a.createdAt) return;
      const key = a.createdAt.substring(0, 7); // yyyy-MM
      if (key in months) months[key]++;
    });
    return Object.entries(months).map(([key, value]) => ({
      label: format(parseISO(key + "-01"), "MMM"),
      value,
      color: "#10b981",
    }));
  }, [assistidos]);

  return (
    <div className="space-y-6 p-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Media processos/assistido", value: generalStats.mediaProcessos },
          { label: "Com Drive vinculado", value: `${generalStats.pctDrive}%` },
          { label: "Audiencia proxima (30d)", value: `${generalStats.pctAudiencia}%` },
          { label: "Completude media", value: `${generalStats.completudeMedia}%` },
        ].map((s) => (
          <div key={s.label} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60">
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">{s.value}</p>
            <p className="text-[10px] text-zinc-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Atribuicoes Donut */}
        <div className="p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 bg-white dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-4">Distribuicao por Atribuicao</p>
          <DonutChart data={atribuicaoData} />
        </div>

        {/* Status Bar */}
        <div className="p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 bg-white dark:bg-zinc-900">
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-4">Distribuicao por Status</p>
          <BarChartSimple data={statusData} />
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 bg-white dark:bg-zinc-900">
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-4">Novos cadastros (ultimos 6 meses)</p>
        <BarChartSimple data={monthlyData} />
      </div>
    </div>
  );
}

// ========================================
// RECENT ASSISTIDOS SECTION
// ========================================

const RECENT_STORAGE_KEY = "ombuds:recent-assistidos";
const MAX_RECENT = 5;

function useRecentAssistidos() {
  const [recentIds, setRecentIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) setRecentIds(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const addRecent = useCallback((id: number) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { recentIds, addRecent };
}

// ========================================
// MAIN PAGE COMPONENT
// ========================================

export default function AssistidosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentAssignment } = useAssignment();
  const utils = trpc.useUtils();

  // Search input ref for keyboard shortcut
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toggle Ver RMS (Região Metropolitana de Salvador)
  const { verRMS, toggle: toggleVerRMS } = useComarcaVisibilidade();

  // Buscar assistidos do banco de dados (com fallback offline)
  const assistidosQuery = trpc.assistidos.list.useQuery({ verRMS });
  const { data: assistidosData, isLoading } = useOfflineQuery(
    assistidosQuery,
    getOfflineAssistidos,
  );

  // Transformar dados do banco para o formato esperado pela UI
  const realAssistidos = useMemo(() => {
    if (!assistidosData) return [];
    return assistidosData.map((a) => {
      const atribuicoesStr = ((a as any).atribuicoes || "") as string;
      const areasStr = ((a as any).areas || "") as string;
      const atribuicoes = atribuicoesStr ? atribuicoesStr.split(',').filter(Boolean) : [];
      const areas = areasStr ? areasStr.split(',').filter(Boolean) : [];
      const comarcasStr = ((a as any).comarcas || "") as string;

      return {
        id: a.id,
        nome: a.nome,
        cpf: a.cpf || "",
        rg: a.rg || "",
        dataNascimento: a.dataNascimento || "",
        naturalidade: a.naturalidade || "",
        statusPrisional: a.statusPrisional || "SOLTO",
        localPrisao: a.localPrisao || "",
        unidadePrisional: a.unidadePrisional || "",
        telefone: a.telefone || "",
        telefoneContato: a.telefoneContato || "",
        nomeContato: a.nomeContato || "",
        endereco: a.endereco || "",
        photoUrl: a.photoUrl || "",
        observacoes: a.observacoes || "",
        area: areas[0] || "CRIMINAL",
        areas: areas,
        atribuicoes: atribuicoes,
        vulgo: "",
        crimePrincipal: (a as any).crimePrincipal || "",
        defensor: "Nao atribuido",
        processoPrincipal: (a as any).processoPrincipal || "",
        demandasAbertas: (a as any).demandasAbertasCount || 0,
        processosAtivos: (a as any).processosCount || 0,
        proximoPrazo: (a as any).proximoPrazo || null,
        proximaAudiencia: (a as any).proximaAudiencia || null,
        prioridadeAI: "NORMAL" as const,
        createdAt: a.createdAt?.toISOString() || new Date().toISOString(),
        testemunhasArroladas: [] as Array<{ nome: string; ouvida: boolean }>,
        interrogatorioRealizado: false,
        tipoProximaAudiencia: "",
        dataPrisao: a.dataPrisao || null,
        faseProcessual: "INSTRUCAO" as const,
        numeroProcesso: (a as any).processoPrincipal || "",
        dataFato: null as string | null,
        resumoFato: "",
        teseDaDefesa: "",
        ultimaAudiencia: null as string | null,
        tipoUltimaAudiencia: "",
        observacoesProcesso: "",
        estrategiaDefesaAtual: "",
        atoProximoPrazo: "",
        nomeMae: a.nomeMae || "",
        bairro: "",
        cidade: "Camacari",
        comarcas: comarcasStr ? comarcasStr.split(',').filter(Boolean) : [],
        comarcaNome: (a as any).comarcaNome || null,
        scoreComplexidade: ((a as any).processosCount || 0) * 10 +
          ((a as any).demandasAbertasCount || 0) * 5 +
          (["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional || "") ? 20 : 0),
        ultimoEvento: null,
        driveFolderId: a.driveFolderId || null,
        driveFilesCount: (a as any).driveFilesCount || 0,
      } as AssistidoUI;
    });
  }, [assistidosData]);

  // ========================================
  // STATE — Read initial values from URL
  // ========================================

  const [activeTab, setActiveTab] = useState<"lista" | "analytics">(
    (searchParams.get("tab") as "lista" | "analytics") || "lista"
  );
  const [atribuicaoFilter, setAtribuicaoFilter] = useState<string>(searchParams.get("atribuicao") || "all");
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    (searchParams.get("view") as "grid" | "list") || "grid"
  );
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [comarcaFilter, setComarcaFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"nome" | "prioridade" | "prazo" | "complexidade">(
    (searchParams.get("sort") as any) || "nome"
  );
  const [groupBy, setGroupBy] = useState<"none" | "comarca" | "area" | "status">("none");
  const { activeCount } = useProcessingQueue();
  const [showNaoIdentificados, setShowNaoIdentificados] = useState(false);
  const [showArquivados, setShowArquivados] = useState(false);
  const [smartPreset, setSmartPreset] = useState<string | null>(searchParams.get("preset") || null);

  // Busca server-side por numero de processo
  const isProcessoSearch = searchTerm.length > 3 && /\d{4,}/.test(searchTerm) && (searchTerm.includes('-') || searchTerm.includes('.'));
  const processoSearchQuery = trpc.assistidos.list.useQuery(
    { search: searchTerm },
    { enabled: isProcessoSearch }
  );

  // Contagem de nao identificados
  const naoIdentificadosCount = useMemo(() => {
    return realAssistidos.filter(a =>
      a.nome.toLowerCase().includes("nao identificado") ||
      a.nome.toLowerCase().includes("nao identificado") ||
      a.nome === "" ||
      a.nome === "-"
    ).length;
  }, [realAssistidos]);

  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedAssistido, setSelectedAssistido] = useState<AssistidoUI | null>(null);
  const [previewAssistido, setPreviewAssistido] = useState<AssistidoUI | null>(null);

  // Sticky summary bar
  const [showStickyBar, setShowStickyBar] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  // Batch Solar export state
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<Set<number>>(new Set());
  const [batchResultOpen, setBatchResultOpen] = useState(false);
  const [batchResults, setBatchResults] = useState<Array<{
    assistidoId: number;
    nome?: string;
    success: boolean;
    ja_existia_solar?: boolean;
    verificacao_processo?: boolean | null;
    sigad_processo?: string | null;
    campos_enriquecidos?: string[];
    error?: string | null;
    message?: string | null;
  }>>([]);

  const exportarBatch = trpc.solar.exportarBatch.useMutation({
    onSuccess: (result) => {
      setBatchResults(result.results);
      setBatchResultOpen(true);
      setBatchSelectMode(false);
      setBatchSelectedIds(new Set());
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const toggleBatchSelect = (id: number, hasCpf: boolean) => {
    if (!hasCpf) return;
    setBatchSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Recent assistidos
  const { recentIds, addRecent } = useRecentAssistidos();

  // ========================================
  // DEEP LINK — Update URL when filters change
  // ========================================

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== "lista") params.set("tab", activeTab);
    if (atribuicaoFilter !== "all") params.set("atribuicao", atribuicaoFilter);
    if (viewMode !== "grid") params.set("view", viewMode);
    if (searchTerm) params.set("search", searchTerm);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sortBy !== "nome") params.set("sort", sortBy);
    if (smartPreset) params.set("preset", smartPreset);

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    if (newUrl !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [activeTab, atribuicaoFilter, viewMode, searchTerm, statusFilter, sortBy, smartPreset]);

  // ========================================
  // KEYBOARD SHORTCUTS
  // ========================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement).blur();
          setSearchTerm("");
          setPreviewAssistido(null);
        }
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        router.push("/admin/assistidos/novo");
      } else if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setViewMode("grid");
      } else if (e.key === "t" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setViewMode("list");
      } else if (e.key === "Escape") {
        setPreviewAssistido(null);
        setSearchTerm("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // ========================================
  // DERIVED DATA
  // ========================================

  // Extrair comarcas unicas dos assistidos
  const comarcasUnicas = useMemo(() => {
    const allComarcas = new Set<string>();
    realAssistidos.forEach(a => {
      (a.comarcas || []).forEach(c => allComarcas.add(c));
    });
    return Array.from(allComarcas).sort();
  }, [realAssistidos]);

  // IDs de assistidos encontrados via busca server-side por numero de processo
  const processoSearchIds = useMemo(() => {
    if (!isProcessoSearch || !processoSearchQuery.data) return new Set<number>();
    return new Set(processoSearchQuery.data.map(a => a.id));
  }, [isProcessoSearch, processoSearchQuery.data]);

  const filteredAssistidos = useMemo(() => {
    let result = realAssistidos.filter((a) => {
      // Verificar se e "Nao Identificado"
      const isNaoIdentificado =
        a.nome.toLowerCase().includes("nao identificado") ||
        a.nome.toLowerCase().includes("nao identificado") ||
        a.nome === "" ||
        a.nome === "-";

      if (showNaoIdentificados) return isNaoIdentificado;
      if (isNaoIdentificado) return false;

      // Expanded search: includes endereco, unidadePrisional, nomeMae
      const term = searchTerm.toLowerCase();
      const matchesSearch = !term ||
        a.nome.toLowerCase().includes(term) ||
        a.cpf.includes(searchTerm) ||
        (a.vulgo?.toLowerCase().includes(term)) ||
        (a.crimePrincipal?.toLowerCase().includes(term)) ||
        (a.numeroProcesso?.includes(searchTerm)) ||
        (a.endereco?.toLowerCase().includes(term)) ||
        (a.unidadePrisional?.toLowerCase().includes(term)) ||
        (a.nomeMae?.toLowerCase().includes(term)) ||
        processoSearchIds.has(a.id);

      const matchesStatus = statusFilter === "all" || a.statusPrisional === statusFilter;
      const matchesArea = areaFilter === "all" || a.area === areaFilter;
      const matchesPinned = !showPinnedOnly || pinnedIds.has(a.id);
      const matchesAtribuicao = atribuicaoFilter === "all" || a.area === atribuicaoFilter;
      const matchesComarca = comarcaFilter === "all" || (a.comarcas || []).includes(comarcaFilter);

      // Smart preset filters
      let matchesPreset = true;
      if (smartPreset === "audiencias_semana") {
        if (!a.proximaAudiencia) { matchesPreset = false; }
        else {
          const dias = differenceInDays(parseISO(a.proximaAudiencia), new Date());
          matchesPreset = dias >= 0 && dias <= 7;
        }
      } else if (smartPreset === "prazos_vencidos") {
        if (!a.proximoPrazo) { matchesPreset = false; }
        else {
          matchesPreset = differenceInDays(parseISO(a.proximoPrazo), new Date()) < 0;
        }
      } else if (smartPreset === "sem_drive") {
        matchesPreset = !a.driveFolderId;
      } else if (smartPreset === "novos_30d") {
        if (!a.createdAt) { matchesPreset = false; }
        else {
          matchesPreset = differenceInDays(new Date(), parseISO(a.createdAt)) <= 30;
        }
      }

      return matchesSearch && matchesStatus && matchesArea && matchesPinned && matchesAtribuicao && matchesComarca && matchesPreset;
    });

    result.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (sortBy === "nome") return a.nome.localeCompare(b.nome);
      if (sortBy === "complexidade") {
        return (b.scoreComplexidade || 0) - (a.scoreComplexidade || 0);
      }
      if (sortBy === "prioridade") {
        const prioA = statusConfig[a.statusPrisional]?.priority || 99;
        const prioB = statusConfig[b.statusPrisional]?.priority || 99;
        if (prioA !== prioB) return prioA - prioB;
        return b.demandasAbertas - a.demandasAbertas;
      }
      if (sortBy === "prazo") {
        if (!a.proximoPrazo && !b.proximoPrazo) return 0;
        if (!a.proximoPrazo) return 1;
        if (!b.proximoPrazo) return -1;
        return new Date(a.proximoPrazo).getTime() - new Date(b.proximoPrazo).getTime();
      }
      return 0;
    });

    return result;
  }, [realAssistidos, searchTerm, statusFilter, areaFilter, comarcaFilter, sortBy, pinnedIds, showPinnedOnly, atribuicaoFilter, showNaoIdentificados, smartPreset, processoSearchIds]);

  // Progressive rendering
  const { visibleItems: visibleAssistidos } = useProgressiveList(filteredAssistidos, 24, 24);

  // Detectar potenciais duplicados
  const potentialDuplicates = useMemo(() => {
    const duplicateMap: Record<number, number[]> = {};
    const firstLastNameMap: Record<string, number[]> = {};

    const normalizeName = (name: string) => {
      return name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    const getFirstLastName = (name: string) => {
      const parts = name.split(" ");
      if (parts.length < 2) return name;
      return `${parts[0]} ${parts[parts.length - 1]}`;
    };

    realAssistidos.forEach((a) => {
      const key = getFirstLastName(normalizeName(a.nome));
      if (!firstLastNameMap[key]) firstLastNameMap[key] = [];
      firstLastNameMap[key].push(a.id);
    });

    Object.values(firstLastNameMap).forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => {
          duplicateMap[id] = ids.filter(otherId => otherId !== id);
        });
      }
    });

    return duplicateMap;
  }, [realAssistidos]);

  // Agrupamento inteligente
  const groupedAssistidos = useMemo(() => {
    if (groupBy === "none") return null;

    const groups: Record<string, typeof filteredAssistidos> = {};

    filteredAssistidos.forEach(a => {
      let key = "";
      if (groupBy === "comarca") {
        key = (a.comarcas || [])[0] || "Sem comarca";
      } else if (groupBy === "area") {
        key = (a.areas || [])[0] || a.area || "Sem area";
      } else if (groupBy === "status") {
        key = statusConfig[a.statusPrisional]?.label || a.statusPrisional;
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredAssistidos, groupBy]);

  // Estatisticas
  const stats = useMemo(() => {
    const total = realAssistidos.length;
    const presos = realAssistidos.filter(a => ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional)).length;
    const monitorados = realAssistidos.filter(a => ["MONITORADO", "DOMICILIAR"].includes(a.statusPrisional)).length;
    const soltos = realAssistidos.filter(a => a.statusPrisional === "SOLTO").length;
    const pinned = pinnedIds.size;

    const audienciasHoje = realAssistidos.filter(a => {
      if (!a.proximaAudiencia) return false;
      return differenceInDays(parseISO(a.proximaAudiencia), new Date()) === 0;
    }).length;

    const audienciasSemana = realAssistidos.filter(a => {
      if (!a.proximaAudiencia) return false;
      const dias = differenceInDays(parseISO(a.proximaAudiencia), new Date());
      return dias >= 0 && dias <= 7;
    }).length;

    const prazosVencidos = realAssistidos.filter(a => {
      if (!a.proximoPrazo) return false;
      return differenceInDays(parseISO(a.proximoPrazo), new Date()) < 0;
    }).length;

    const prazosUrgentes = realAssistidos.filter(a => {
      if (!a.proximoPrazo) return false;
      const dias = differenceInDays(parseISO(a.proximoPrazo), new Date());
      return dias >= 0 && dias <= 3;
    }).length;

    const comDemandas = realAssistidos.filter(a => a.demandasAbertas > 0).length;
    const semDrive = realAssistidos.filter(a => !a.driveFolderId).length;

    const novos30d = realAssistidos.filter(a => {
      if (!a.createdAt) return false;
      return differenceInDays(new Date(), parseISO(a.createdAt)) <= 30;
    }).length;

    // Completude media
    const completudeMedia = total > 0
      ? Math.round(realAssistidos.reduce((sum, a) => sum + computeCompletude(a), 0) / total)
      : 0;

    return {
      total,
      presos,
      monitorados,
      soltos,
      pinned,
      audienciasHoje,
      audienciasSemana,
      prazosVencidos,
      prazosUrgentes,
      comDemandas,
      semDrive,
      novos30d,
      completudeMedia,
    };
  }, [realAssistidos, pinnedIds]);

  // ========================================
  // CALLBACKS
  // ========================================

  const handlePhotoClick = (assistido: AssistidoUI) => {
    setSelectedAssistido(assistido);
    setPhotoDialogOpen(true);
  };

  const togglePin = useCallback((id: number) => {
    setPinnedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const handlePreview = useCallback((a: AssistidoUI) => {
    setPreviewAssistido(a);
    addRecent(a.id);
  }, [addRecent]);

  // Recent assistidos resolved from IDs
  const recentAssistidos = useMemo(() => {
    if (recentIds.length === 0) return [];
    return recentIds
      .map((id) => realAssistidos.find((a) => a.id === id))
      .filter(Boolean) as AssistidoUI[];
  }, [recentIds, realAssistidos]);

  // ========================================
  // LOADING STATE
  // ========================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 flex-1 max-w-md rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
          <Card className="border border-zinc-200 dark:border-zinc-800">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  const atribuicaoColors = getAtribuicaoColors(atribuicaoFilter);

  // Helper to render a card with batch select overlay
  const renderCardWithBatch = (a: AssistidoUI, index?: number) => (
    <div
      key={a.id}
      className={cn(
        "relative",
        index !== undefined && "animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
      )}
      style={index !== undefined ? { animationDelay: `${Math.min(index * 40, 600)}ms` } : undefined}
    >
      {batchSelectMode && (
        <button
          onClick={() => toggleBatchSelect(a.id, !!a.cpf)}
          className={cn(
            "absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            !a.cpf
              ? "border-zinc-300 bg-zinc-100 cursor-not-allowed opacity-40"
              : batchSelectedIds.has(a.id)
              ? "border-amber-500 bg-amber-500"
              : "border-zinc-300 bg-white hover:border-amber-400"
          )}
          title={!a.cpf ? "Assistido sem CPF -- nao pode ser exportado" : undefined}
        >
          {batchSelectedIds.has(a.id) && (
            <CheckCircle2 className="w-3 h-3 text-white" />
          )}
        </button>
      )}
      <AssistidoCard
        assistido={a}
        onPhotoClick={() => handlePhotoClick(a)}
        isPinned={pinnedIds.has(a.id)}
        onTogglePin={() => togglePin(a.id)}
        hasDuplicates={(potentialDuplicates[a.id]?.length || 0) > 0}
        duplicateCount={potentialDuplicates[a.id]?.length || 0}
        onPreview={() => handlePreview(a)}
      />
    </div>
  );

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Compacto */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 text-white dark:text-zinc-900" />
          </div>
          <h1 className="font-serif text-base font-semibold text-zinc-900 dark:text-zinc-50">Assistidos</h1>
          <span className="hidden md:inline text-[10px] text-zinc-400 font-mono ml-1">/ buscar · n novo · g grid · t tabela</span>
        </div>

        {/* Busca + Acoes */}
        <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, CPF, processo, endereco, mae..."
                className="pl-8 w-[140px] sm:w-[200px] md:w-[280px] h-8 text-xs border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors"
              />
              {isProcessoSearch && (
                <p className="text-[10px] text-zinc-400 mt-0.5 absolute left-0 -bottom-4 whitespace-nowrap">
                  Buscando por numero de processo...
                </p>
              )}
            </div>
            <Link href="/admin/inteligencia">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Inteligencia"
              >
                <Brain className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-400 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Exportar CSV"
              onClick={() => exportToCSV(filteredAssistidos)}
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            {/* Botao batch Solar export */}
            {!batchSelectMode ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-medium rounded-md"
                onClick={() => setBatchSelectMode(true)}
                title="Exportar multiplos assistidos ao Solar via SIGAD"
              >
                <Sun className="w-3.5 h-3.5 mr-1" />
                Solar
              </Button>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">
                  {batchSelectedIds.size} selecionados
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs border-zinc-200 text-zinc-500"
                  onClick={() => {
                    setBatchSelectMode(false);
                    setBatchSelectedIds(new Set());
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md"
                  disabled={batchSelectedIds.size === 0 || exportarBatch.isPending}
                  onClick={() =>
                    exportarBatch.mutate({
                      assistidoIds: Array.from(batchSelectedIds),
                    })
                  }
                >
                  {exportarBatch.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Sun className="w-3 h-3 mr-1" />
                  )}
                  {exportarBatch.isPending
                    ? `Exportando ${batchSelectedIds.size}...`
                    : `Exportar ${batchSelectedIds.size} ao Solar`}
                </Button>
              </div>
            )}
            <Link href="/admin/assistidos/novo">
              <Button
                size="sm"
                className="h-9 px-4 ml-1 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo Assistido
              </Button>
            </Link>
        </div>
      </div>

      {/* Sticky Summary Bar */}
      {showStickyBar && (
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-sm animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between px-6 py-2 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {filteredAssistidos.length} assistidos
              </span>
              {smartPreset && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
                  {smartPreset === "meus_presos" ? "Meus presos" :
                   smartPreset === "audiencias_semana" ? "Audiencias semana" :
                   smartPreset === "prazos_vencidos" ? "Prazos vencidos" :
                   smartPreset === "sem_drive" ? "Sem Drive" :
                   smartPreset === "novos_30d" ? "Novos 30d" : smartPreset}
                </span>
              )}
            </div>
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, CPF ou processo..."
                className="pl-8 w-[220px] h-7 text-xs border-zinc-200/80 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-800 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center gap-1 px-2 h-6 text-xs font-medium rounded-md transition-all",
                    viewMode === "grid"
                      ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  <LayoutGrid className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex items-center gap-1 px-2 h-6 text-xs font-medium rounded-md transition-all",
                    viewMode === "list"
                      ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  <List className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteudo Principal */}
      <div className="p-5 md:p-8 space-y-5 md:space-y-7">

      {/* Tab System: Lista | Analytics */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("lista")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-all",
            activeTab === "lista"
              ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <Users className="w-3.5 h-3.5" />
          Lista
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition-all",
            activeTab === "analytics"
              ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          )}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Analytics
        </button>
      </div>

      {/* Analytics Tab Content */}
      {activeTab === "analytics" && (
        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-apple dark:shadow-apple-dark">
          <AnalyticsTab assistidos={realAssistidos.filter(a => {
            const isNI = a.nome.toLowerCase().includes("nao identificado") || a.nome === "" || a.nome === "-";
            return !isNI;
          })} />
        </Card>
      )}

      {/* Lista Tab Content */}
      {activeTab === "lista" && (
      <>
      {/* Alerta de Nao Identificados */}
      {naoIdentificadosCount > 0 && !showNaoIdentificados && (
        <button
          onClick={() => setShowNaoIdentificados(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors text-left group"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {naoIdentificadosCount} sem identificacao
          </span>
          <span className="text-[10px] text-amber-500 dark:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
            Regularizar
          </span>
        </button>
      )}

      {/* Banner modo Nao Identificados */}
      {showNaoIdentificados && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-amber-400 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/30">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Modo Regularizacao - Assistidos Nao Identificados
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Edite cada registro para adicionar o nome correto do assistido
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500 text-amber-700 hover:bg-amber-200"
            onClick={() => setShowNaoIdentificados(false)}
          >
            <XCircle className="w-3.5 h-3.5 mr-2" />
            Voltar
          </Button>
        </div>
      )}

      {/* Unified Toolbar */}
      {!showNaoIdentificados && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl shadow-sm overflow-hidden">
          {/* Row 1: Stats + urgency badges + sort + toggle */}
          <div ref={statsRef} className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto scrollbar-none">
            {[
              { icon: Users, value: stats.total - naoIdentificadosCount, label: "assistidos", onClick: () => { setStatusFilter("all"); setShowPinnedOnly(false); }, active: statusFilter === "all" && !showPinnedOnly },
              { icon: Lock, value: stats.presos, label: "presos", onClick: () => { setStatusFilter(statusFilter === "CADEIA_PUBLICA" ? "all" : "CADEIA_PUBLICA"); setShowPinnedOnly(false); }, active: statusFilter === "CADEIA_PUBLICA", alert: stats.presos > 0 },
              { icon: Timer, value: stats.monitorados, label: "monit.", onClick: () => { setStatusFilter(statusFilter === "MONITORADO" ? "all" : "MONITORADO"); setShowPinnedOnly(false); }, active: statusFilter === "MONITORADO" },
              { icon: Calendar, value: stats.audienciasHoje, label: "aud. hoje", alert: stats.audienciasHoje > 0 },
              { icon: FileText, value: stats.comDemandas, label: "demandas" },
              { icon: BookmarkCheck, value: stats.pinned, label: "fixados", onClick: () => { setShowPinnedOnly(!showPinnedOnly); setStatusFilter("all"); }, active: showPinnedOnly },
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Fragment key={index}>
                  {index > 0 && <div className="w-px h-3.5 bg-zinc-200/60 dark:bg-zinc-700/60 flex-shrink-0" />}
                  <button
                    onClick={stat.onClick}
                    className={cn(
                      "flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded-lg transition-colors text-xs",
                      stat.onClick && "cursor-pointer",
                      stat.active ? "bg-emerald-50 dark:bg-emerald-950/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                      stat.alert && !stat.active ? "bg-rose-50 dark:bg-rose-950/20" : ""
                    )}
                  >
                    <Icon className={cn("w-3 h-3 flex-shrink-0", stat.alert ? "text-rose-500" : stat.active ? "text-emerald-500" : "text-zinc-400")} />
                    <span className={cn("font-bold tabular-nums", stat.alert ? "text-rose-600 dark:text-rose-400" : "text-zinc-800 dark:text-zinc-100")}>{stat.value}</span>
                    <span className="text-zinc-500 dark:text-zinc-400">{stat.label}</span>
                    {stat.alert && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />}
                  </button>
                </Fragment>
              );
            })}
            {/* Inline urgency badges */}
            {stats.prazosVencidos > 0 && (
              <>
                <div className="w-px h-3.5 bg-zinc-200/60 dark:bg-zinc-700/60 flex-shrink-0" />
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-medium whitespace-nowrap border border-rose-200/60 dark:border-rose-800/30 flex-shrink-0">
                  <AlertCircle className="w-3 h-3" />
                  {stats.prazosVencidos} vencido{stats.prazosVencidos > 1 ? 's' : ''}
                </span>
              </>
            )}
            {stats.prazosUrgentes > 0 && (
              <>
                <div className="w-px h-3.5 bg-zinc-200/60 dark:bg-zinc-700/60 flex-shrink-0" />
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[10px] font-medium whitespace-nowrap border border-amber-200/60 dark:border-amber-800/30 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {stats.prazosUrgentes} urgente{stats.prazosUrgentes > 1 ? 's' : ''}
                </span>
              </>
            )}
            <div className="flex-1 min-w-2" />
            {/* Sort */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-zinc-400 hidden sm:inline">Ordenar:</span>
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                {(["nome", "prioridade", "prazo"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSortBy(opt)}
                    className={cn(
                      "px-2 py-1 text-[10px] font-medium rounded-md transition-all",
                      sortBy === opt
                        ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    )}
                  >
                    {opt === "nome" ? "Nome" : opt === "prioridade" ? "Prio." : "Prazo"}
                  </button>
                ))}
              </div>
            </div>
            {/* Processing queue + view toggle */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <ProcessingQueuePanel>
                <button
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center gap-1 rounded-md transition-colors",
                    activeCount > 0
                      ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                  title="Fila de processamento"
                >
                  <Activity className={cn("h-3.5 w-3.5", activeCount > 0 && "animate-pulse")} />
                  {activeCount > 0 && <span className="text-[10px] font-medium">{activeCount}</span>}
                </button>
              </ProcessingQueuePanel>
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn("flex items-center justify-center w-7 h-7 rounded-md transition-all", viewMode === "grid" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
                  title="Grade"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("flex items-center justify-center w-7 h-7 rounded-md transition-all", viewMode === "list" ? "bg-white dark:bg-zinc-700 text-zinc-800 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
                  title="Lista"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
          {/* Row 2: Atribuição chips + filtros rápidos */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto scrollbar-none">
            {/* Toggle Ver RMS */}
            <button
              onClick={() => toggleVerRMS(!verRMS)}
              aria-pressed={verRMS}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors shrink-0",
                verRMS
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
              )}
              title={verRMS ? "Exibindo toda a RMS — clique para mostrar só Camaçari" : "Mostrar toda a Região Metropolitana de Salvador"}
            >
              <MapPin className="h-3.5 w-3.5" />
              {verRMS ? "RMS" : "Comarca"}
            </button>
            <div className="w-px h-3.5 bg-zinc-200/60 dark:bg-zinc-700/60 flex-shrink-0" />
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium shrink-0">Atrib.</span>
            {ATRIBUICAO_OPTIONS.filter(o => o.value !== "all").map((option) => {
              const isActive = atribuicaoFilter === option.value;
              const color = SOLID_COLOR_MAP[option.value] || '#71717a';
              return (
                <button
                  key={option.value}
                  onClick={() => setAtribuicaoFilter(isActive ? "all" : option.value)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border shrink-0",
                    isActive
                      ? "text-white border-transparent shadow-sm"
                      : "bg-transparent text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  )}
                  style={isActive ? { backgroundColor: color, borderColor: color } : undefined}
                >
                  {ATRIBUICAO_ICONS[option.value] || null}
                  {option.shortLabel}
                </button>
              );
            })}
            {atribuicaoFilter !== "all" && (
              <button onClick={() => setAtribuicaoFilter("all")} className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors shrink-0">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="w-px h-3.5 bg-zinc-200/60 dark:bg-zinc-700/60 flex-shrink-0 mx-0.5" />
            {[
              { id: "meus_presos", label: "Presos", icon: Lock, count: stats.presos },
              { id: "audiencias_semana", label: "Aud. semana", icon: Calendar, count: stats.audienciasSemana },
              { id: "prazos_vencidos", label: "Prazos venc.", icon: AlertCircle, count: stats.prazosVencidos },
              { id: "sem_drive", label: "Sem Drive", icon: Link2Off, count: stats.semDrive },
              { id: "novos_30d", label: "Novos 30d", icon: Plus, count: stats.novos30d },
            ].map((preset) => {
              const active = smartPreset === preset.id;
              const PresetIcon = preset.icon;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (active) {
                      setSmartPreset(null);
                      setStatusFilter("all");
                      setSortBy("nome");
                    } else {
                      setSmartPreset(preset.id);
                      if (preset.id === "meus_presos") { setStatusFilter("CADEIA_PUBLICA"); setSortBy("prioridade"); }
                      else if (preset.id === "audiencias_semana") { setStatusFilter("all"); setSortBy("prazo"); }
                      else if (preset.id === "prazos_vencidos") { setStatusFilter("all"); setSortBy("prazo"); }
                      else { setStatusFilter("all"); setSortBy("nome"); }
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium transition-all shrink-0",
                    active
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-transparent"
                  )}
                >
                  <PresetIcon className="w-3 h-3" />
                  {preset.label}
                  {preset.count > 0 && (
                    <span className={cn(
                      "text-[10px] font-semibold tabular-nums px-1 rounded-full",
                      active ? "bg-emerald-200/60 dark:bg-emerald-800/40 text-emerald-700" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                    )}>
                      {preset.count}
                    </span>
                  )}
                </button>
              );
            })}
            {smartPreset && (
              <button
                onClick={() => { setSmartPreset(null); setStatusFilter("all"); setSortBy("nome"); }}
                className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}


      {/* Recent Assistidos (Feature #6) */}
      {recentAssistidos.length > 0 && !showNaoIdentificados && (
        <div className="flex items-center gap-3 px-1">
          <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium shrink-0">Recentes</span>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {recentAssistidos.map((a) => {
              const attrs = a.atribuicoes || a.areas || [];
              const primaryAttrValue = attrs.length > 0
                ? ATRIBUICAO_OPTIONS.find(o =>
                    o.value.toUpperCase() === attrs[0].toUpperCase().replace(/_/g, ' ') ||
                    attrs[0].toUpperCase().replace(/_/g, ' ').includes(o.value.toUpperCase())
                  )?.value || null
                : null;

              return (
                <Link
                  key={a.id}
                  href={`/admin/assistidos/${a.id}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors shrink-0 group"
                >
                  <AssistidoAvatar
                    nome={a.nome}
                    photoUrl={a.photoUrl}
                    size="xs"
                    atribuicao={primaryAttrValue}
                    statusPrisional={a.statusPrisional}
                  />
                  <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors max-w-[80px] truncate">
                    {a.nome.split(" ")[0]}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Card de Listagem */}
      <Card className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-apple dark:shadow-apple-dark">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              </div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {filteredAssistidos.length} assistido{filteredAssistidos.length !== 1 && 's'}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
      {filteredAssistidos.length === 0 ? (
        <div className="animate-in fade-in duration-500">
        <EmptyState
          icon={Users}
          title="Nenhum assistido encontrado"
          description="Ajuste os filtros ou cadastre um novo assistido."
          action={{
            label: "Novo Assistido",
            onClick: () => router.push('/admin/assistidos/novo'),
            icon: Plus,
          }}
          variant={searchTerm ? "search" : "default"}
        />
        </div>
      ) : viewMode === "grid" ? (
        groupedAssistidos ? (
          // Exibicao agrupada
          <div className="space-y-6">
            {groupedAssistidos.map(([groupName, items]) => (
              <div key={groupName}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 rounded-full bg-emerald-500" />
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 capitalize">
                      {groupName}
                    </h3>
                  </div>
                  <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                  <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                  {items.map((a) => renderCardWithBatch(a))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Exibicao normal (sem agrupamento)
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start animate-in fade-in duration-200">
            {visibleAssistidos.map((a, index) => renderCardWithBatch(a, index))}
          </div>
        )
      ) : (
        <AssistidoTableView
          assistidos={visibleAssistidos}
          pinnedIds={pinnedIds}
          onPhotoClick={(a) => handlePhotoClick(a as AssistidoUI)}
          onTogglePin={togglePin}
          sortBy={sortBy}
          onSortChange={(col) => setSortBy(col as "nome" | "prioridade" | "prazo" | "complexidade")}
          onPreview={(a) => handlePreview(a as AssistidoUI)}
        />
      )}
        </div>
      </Card>
      </>
      )}

      {/* Photo Dialog */}
      {selectedAssistido && (
        <PhotoUploadDialog
          isOpen={photoDialogOpen}
          onClose={() => { setPhotoDialogOpen(false); setSelectedAssistido(null); }}
          assistidoNome={selectedAssistido.nome}
          currentPhoto={selectedAssistido.photoUrl}
          onUpload={async (file) => {
            try {
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const base64 = (reader.result as string).split(',')[1];
                  await utils.client.assistidos.uploadPhoto.mutate({
                    assistidoId: selectedAssistido!.id,
                    imageBase64: base64,
                    fileName: file.name,
                    contentType: file.type,
                  });
                  utils.assistidos.list.invalidate();
                  toast.success("Foto atualizada!");
                  setPhotoDialogOpen(false);
                  setSelectedAssistido(null);
                } catch (err) {
                  console.error("Upload error:", err);
                  toast.error("Erro ao fazer upload da foto");
                }
              };
              reader.readAsDataURL(file);
            } catch (err) {
              console.error("File read error:", err);
              toast.error("Erro ao ler arquivo");
            }
          }}
        />
      )}

      {/* AssistidoQuickPreview Sheet */}
      <AssistidoQuickPreview
        assistido={previewAssistido}
        onClose={() => setPreviewAssistido(null)}
        currentIndex={previewAssistido ? filteredAssistidos.findIndex(a => a.id === previewAssistido.id) : undefined}
        totalCount={filteredAssistidos.length}
        onNext={previewAssistido ? (() => {
          const idx = filteredAssistidos.findIndex(a => a.id === previewAssistido.id);
          if (idx < filteredAssistidos.length - 1) {
            const next = filteredAssistidos[idx + 1];
            setPreviewAssistido(next);
            addRecent(next.id);
          }
        }) : undefined}
        onPrev={previewAssistido ? (() => {
          const idx = filteredAssistidos.findIndex(a => a.id === previewAssistido.id);
          if (idx > 0) {
            const prev = filteredAssistidos[idx - 1];
            setPreviewAssistido(prev);
            addRecent(prev.id);
          }
        }) : undefined}
      />

      {/* Batch Solar Export Results Dialog */}
      <Dialog open={batchResultOpen} onOpenChange={setBatchResultOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Sun className="h-4 w-4 text-amber-600" />
              Resultado da Exportacao ao Solar
            </DialogTitle>
            <DialogDescription className="text-xs">
              {batchResults.filter((r) => r.success).length} exportados com sucesso /{" "}
              {batchResults.filter((r) => !r.success).length} com falha
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {batchResults.map((r) => (
              <div
                key={r.assistidoId}
                className={cn(
                  "flex items-start gap-2 p-2.5 rounded-lg border text-xs",
                  r.success
                    ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20"
                    : r.error === "processo_nao_corresponde"
                    ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                    : "border-rose-200 bg-rose-50 dark:bg-rose-950/20"
                )}
              >
                {r.success ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : r.error === "processo_nao_corresponde" ? (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {r.nome ?? `Assistido #${r.assistidoId}`}
                  </span>
                  <p
                    className={cn(
                      "mt-0.5",
                      r.success ? "text-emerald-700" : r.error === "processo_nao_corresponde" ? "text-amber-700" : "text-rose-600"
                    )}
                  >
                    {r.success
                      ? r.ja_existia_solar
                        ? "Ja cadastrado no Solar"
                        : r.campos_enriquecidos && r.campos_enriquecidos.length > 0
                        ? `Exportado - Dados atualizados: ${r.campos_enriquecidos.join(", ")}`
                        : "Exportado ao Solar com sucesso"
                      : r.error === "sem_cpf"
                      ? "Sem CPF cadastrado no OMBUDS"
                      : r.error === "nao_encontrado"
                      ? "Nao encontrado no SIGAD"
                      : r.error === "processo_nao_corresponde"
                      ? `Processo SIGAD nao corresponde: ${r.sigad_processo ?? "?"}`
                      : r.message ?? r.error ?? "Erro desconhecido"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </div>
    </TooltipProvider>
  );
}
