"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useMemo, useRef, useCallback, useEffect, Fragment } from "react";
import { HEADER_STYLE } from "@/lib/config/design-tokens";
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
  FolderOpen,
  MessageCircle,
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
  normalizeAreaToFilter,
} from "@/lib/config/atribuicoes";
import { differenceInDays, parseISO, format } from "date-fns";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { toast } from "sonner";

// Extracted components
import { AssistidoUI } from "./_components/assistido-types";
import { statusConfig, faseConfig, areaConfig, ATRIBUICAO_ICONS } from "./_components/assistido-config";
import { getPrazoInfo, calcularIdade, calcularTempoPreso, computeCompletude } from "./_components/assistido-utils";
import { AnalyticsTab } from "./_components/analytics-tab";
import { useRecentAssistidos } from "./_components/use-recent-assistidos";
import { PhotoUploadDialog } from "./_components/photo-upload-dialog";
import { AssistidoQuickPreview } from "./_components/assistido-quick-preview";
import { AssistidoCard } from "./_components/assistido-card";
import { AssistidoTableView } from "./_components/assistido-table-view";
import { ProcessingQueuePanel } from "@/components/drive/ProcessingQueuePanel";
import { useProcessingQueue } from "@/contexts/processing-queue";
import { useComarcaVisibilidade } from "@/hooks/use-comarca-visibilidade";
import { AtribuicaoPills } from "@/components/demandas-premium/AtribuicaoPills";

// ========================================
// HELPERS
// ========================================

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
      const atribuicoes = (a as any).atribuicoes || [];
      const areas = (a as any).areas || [];
      const comarcasArr = (a as any).comarcas || [];

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
        area: areas[0] || "",
        areas: areas,
        atribuicoes: atribuicoes,
        atribuicaoPrimaria: ((a as any).atribuicaoPrimaria || "") as string,
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
        comarcas: comarcasArr,
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
    (searchParams.get("view") as "grid" | "list") || "list"
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

  // Backfill Drive folders state
  const [backfillResult, setBackfillResult] = useState<{
    linked: number;
    skipped: number;
    errors: number;
    hasMore: boolean;
  } | null>(null);

  const backfillDriveMutation = trpc.drive.backfillAssistidoLinks.useMutation({
    onSuccess: (result) => {
      setBackfillResult(result);
      if (result.linked > 0) {
        utils.assistidos.list.invalidate();
      }
      toast.success(
        `${result.linked} assistido(s) vinculado(s). ${result.skipped} sem correspondência.`
      );
    },
    onError: (err) => toast.error(err.message),
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
      const matchesAtribuicao = atribuicaoFilter === "all" ||
        normalizeAreaToFilter(a.atribuicaoPrimaria) === atribuicaoFilter ||
        (a.atribuicoes || []).some(attr => normalizeAreaToFilter(attr) === atribuicaoFilter);
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

  // Contagens por atribuição (usando mesma lógica de normalização do filtro)
  const atribuicaoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const option of ATRIBUICAO_OPTIONS) {
      if (option.value === "all") continue;
      counts[option.value] = 0;
    }
    for (const a of realAssistidos) {
      const matched = new Set<string>();
      // Check atribuicaoPrimaria
      const normPrimaria = normalizeAreaToFilter(a.atribuicaoPrimaria);
      if (normPrimaria !== "all") matched.add(normPrimaria);
      // Check atribuicoes from processos
      for (const attr of (a.atribuicoes || [])) {
        const norm = normalizeAreaToFilter(attr);
        if (norm !== "all") matched.add(norm);
      }
      for (const key of matched) {
        if (counts[key] !== undefined) counts[key]++;
      }
    }
    return counts;
  }, [realAssistidos]);

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
      <div className="min-h-screen bg-muted dark:bg-[#0f0f11]">
        <div className="px-4 md:px-6 py-3 bg-background dark:bg-card border-b border-border">
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
          <Card className="border border-border">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
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
                <div key={i} className="border border-border rounded-lg p-4 space-y-3 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
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
              ? "border-border bg-muted cursor-not-allowed opacity-40"
              : batchSelectedIds.has(a.id)
              ? "border-amber-500 bg-amber-500"
              : "border-border bg-background hover:border-amber-400"
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
    <div className="min-h-screen bg-muted dark:bg-[#0f0f11]">
      {/* Header */}
      <div className={cn(HEADER_STYLE.container, "rounded-none sm:rounded-xl sm:mx-3 sm:mt-3 pb-1")}>
        {/* Row 1: Title + stats badges + search + actions */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4a4a52] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-white/70" />
            </div>
            <h1 className="text-white text-[17px] font-semibold tracking-tight">Assistidos</h1>
            {/* Stats como badges inline (igual Demandas) */}
            <div className="flex items-center gap-1.5 ml-1">
              {[
                { value: stats.total - naoIdentificadosCount, label: "total", onClick: () => { setStatusFilter("all"); setShowPinnedOnly(false); }, active: statusFilter === "all" && !showPinnedOnly },
                { value: stats.presos, label: "presos", onClick: () => { setStatusFilter(statusFilter === "CADEIA_PUBLICA" ? "all" : "CADEIA_PUBLICA"); setShowPinnedOnly(false); }, active: statusFilter === "CADEIA_PUBLICA", danger: stats.presos > 0 },
                { value: stats.monitorados, label: "monit", onClick: () => { setStatusFilter(statusFilter === "MONITORADO" ? "all" : "MONITORADO"); setShowPinnedOnly(false); }, active: statusFilter === "MONITORADO" },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={s.onClick}
                  className={cn(
                    "text-[9px] font-semibold px-2 py-0.5 rounded-full tabular-nums cursor-pointer transition-colors shrink-0",
                    s.active ? "bg-emerald-500/20 text-emerald-400"
                      : (s as any).danger ? "bg-red-500/15 text-red-300"
                      : "bg-[#4a4a52] text-white/70 hover:text-white/90"
                  )}
                >
                  {s.value} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Busca + Ações */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <Input
                ref={searchInputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, CPF, processo..."
                className="pl-8 w-[140px] sm:w-[200px] md:w-[260px] h-8 text-xs bg-[#3e3e44] border border-[#525258] text-white/90 placeholder:text-white/40 rounded-lg"
              />
              {isProcessoSearch && (
                <p className="text-[10px] text-white/50 mt-0.5 absolute left-0 -bottom-4 whitespace-nowrap">
                  Buscando por processo...
                </p>
              )}
            </div>
            <Link href="/admin/inteligencia">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-emerald-400 hover:bg-[#4a4a52] cursor-pointer" title="Inteligência">
                <Brain className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-emerald-400 hover:bg-[#4a4a52] cursor-pointer" title="Exportar CSV" onClick={() => exportToCSV(filteredAssistidos)}>
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-emerald-400 hover:bg-[#4a4a52] cursor-pointer" title="Vincular pastas Drive" disabled={backfillDriveMutation.isPending} onClick={() => backfillDriveMutation.mutate({ limit: 50 })}>
              {backfillDriveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="sm" className={cn("h-8 w-8 p-0 cursor-pointer", batchSelectMode ? "text-amber-400 bg-amber-500/20" : "text-white/50 hover:text-amber-400 hover:bg-[#4a4a52]")} title="Exportar ao Solar" onClick={() => setBatchSelectMode(!batchSelectMode)}>
              <Sun className="w-3.5 h-3.5" />
            </Button>
            {batchSelectMode && (
              <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-white/15">
                <span className="text-[10px] text-white/60 tabular-nums">{batchSelectedIds.size} sel.</span>
                <Button size="sm" className="h-7 px-2.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-medium rounded-lg" disabled={batchSelectedIds.size === 0 || exportarBatch.isPending} onClick={() => exportarBatch.mutate({ assistidoIds: Array.from(batchSelectedIds) })}>
                  {exportarBatch.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Exportar"}
                </Button>
                <button onClick={() => { setBatchSelectMode(false); setBatchSelectedIds(new Set()); }} className="text-white/50 hover:text-white">
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="w-px h-5 bg-[#525258] mx-0.5" />
            <Link href="/admin/assistidos/novo">
              <Button size="sm" className="h-8 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer">
                <Plus className="w-3.5 h-3.5 mr-1" /> Novo
              </Button>
            </Link>
          </div>
        </div>

        {/* Inset Row — segmented controls uniformes */}
        <div className={cn("flex items-center gap-3 mx-3 mt-3 mb-2.5 overflow-x-auto scrollbar-none", HEADER_STYLE.bottomRow)}>
          {/* Segmented: Comarca / RMS */}
          {!showNaoIdentificados && (
            <div className="inline-flex items-center bg-[#3e3e44] rounded-md p-[2px] shrink-0">
              {[
                { label: "Comarca", active: !verRMS, onClick: () => verRMS && toggleVerRMS({ verRMS: false }) },
                { label: "RMS", active: verRMS, onClick: () => !verRMS && toggleVerRMS({ verRMS: true }) },
              ].map((opt) => (
                <button key={opt.label} onClick={opt.onClick} className={cn("px-2.5 py-1 text-[10px] font-medium rounded-[4px] transition-all", opt.active ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/60")}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Atribuição pills */}
          {!showNaoIdentificados && (
            <AtribuicaoPills
              variant="dark"
              options={[
                { value: "Tribunal do Júri", label: "Tribunal do Júri" },
                { value: "Violência Doméstica", label: "Violência Doméstica" },
                { value: "Execução Penal", label: "Execução Penal" },
                { value: "Substituição Criminal", label: "Substituição Criminal" },
                { value: "Grupo Especial do Júri", label: "Grupo Especial do Júri" },
              ]}
              selectedValues={atribuicaoFilter !== "all" ? [(() => {
                const map: Record<string, string> = { JURI: "Tribunal do Júri", VVD: "Violência Doméstica", EXECUCAO: "Execução Penal", SUBSTITUICAO: "Substituição Criminal", SUBSTITUICAO_CIVEL: "Substituição Criminal", CURADORIA: "Curadoria Especial" };
                return map[atribuicaoFilter] || atribuicaoFilter;
              })()] : []}
              onToggle={(value) => {
                const reverseMap: Record<string, string> = { "Tribunal do Júri": "JURI", "Violência Doméstica": "VVD", "Execução Penal": "EXECUCAO", "Substituição Criminal": "SUBSTITUICAO", "Grupo Especial do Júri": "JURI", "Curadoria Especial": "CURADORIA" };
                const normalized = reverseMap[value] || value;
                setAtribuicaoFilter(atribuicaoFilter === normalized ? "all" : normalized);
              }}
              onClear={() => setAtribuicaoFilter("all")}
              counts={{ "Tribunal do Júri": (atribuicaoCounts["JURI"] || 0), "Violência Doméstica": (atribuicaoCounts["VVD"] || 0), "Execução Penal": (atribuicaoCounts["EXECUCAO"] || 0), "Substituição Criminal": (atribuicaoCounts["SUBSTITUICAO"] || 0), "Grupo Especial do Júri": 0 }}
              singleSelect
              compact
            />
          )}

          <div className="w-px h-4 bg-white/[0.08] shrink-0" />

          {/* Segmented: Lista / Analytics */}
          <div className="inline-flex items-center bg-[#3e3e44] rounded-md p-[2px] shrink-0">
            {[
              { label: "Lista", icon: Users, tab: "lista" as const },
              { label: "Analytics", icon: BarChart3, tab: "analytics" as const },
            ].map((opt) => (
              <button key={opt.tab} onClick={() => setActiveTab(opt.tab)} className={cn("flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-[4px] transition-all", activeTab === opt.tab ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/60")}>
                <opt.icon className="w-3 h-3" /> {opt.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-2" />

          {/* Smart presets — ícones compactos */}
          {!showNaoIdentificados && (
            <div className="inline-flex items-center bg-[#3e3e44] rounded-md p-[2px] shrink-0">
              {[
                { id: "meus_presos", tip: "Presos", icon: Lock, count: stats.presos },
                { id: "audiencias_semana", tip: "Audiências", icon: Calendar, count: stats.audienciasSemana },
                { id: "prazos_vencidos", tip: "Prazos vencidos", icon: AlertCircle, count: stats.prazosVencidos },
                { id: "sem_drive", tip: "Sem Drive", icon: Link2Off, count: stats.semDrive },
                { id: "novos_30d", tip: "Novos 30d", icon: Plus, count: stats.novos30d },
              ].map((preset) => {
                const active = smartPreset === preset.id;
                const PresetIcon = preset.icon;
                return (
                  <Tooltip key={preset.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (active) { setSmartPreset(null); setStatusFilter("all"); setSortBy("nome"); }
                          else {
                            setSmartPreset(preset.id);
                            if (preset.id === "meus_presos") { setStatusFilter("CADEIA_PUBLICA"); setSortBy("prioridade"); }
                            else if (preset.id === "audiencias_semana") { setStatusFilter("all"); setSortBy("prazo"); }
                            else if (preset.id === "prazos_vencidos") { setStatusFilter("all"); setSortBy("prazo"); }
                            else { setStatusFilter("all"); setSortBy("nome"); }
                          }
                        }}
                        className={cn("relative inline-flex items-center justify-center w-7 h-7 rounded-[4px] transition-all shrink-0 cursor-pointer", active ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/60")}
                      >
                        <PresetIcon className="w-3 h-3" />
                        {preset.count > 0 && (
                          <span className={cn("absolute -top-1 -right-1 text-[7px] font-bold tabular-nums min-w-[12px] h-[12px] flex items-center justify-center rounded-full", active ? "bg-emerald-500 text-white" : preset.id === "prazos_vencidos" ? "bg-rose-500 text-white" : "bg-[#525258] text-white/60")}>
                            {preset.count}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[10px]">{preset.tip} ({preset.count})</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
          {smartPreset && (
            <button onClick={() => { setSmartPreset(null); setStatusFilter("all"); setSortBy("nome"); }} className="text-white/40 hover:text-white transition-colors shrink-0">
              <XCircle className="w-3 h-3" />
            </button>
          )}
          <Link href="/admin/whatsapp" className="inline-flex items-center justify-center w-7 h-7 rounded-[4px] text-white/40 hover:text-emerald-400 hover:bg-white/[0.08] transition-colors shrink-0">
            <MessageCircle className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Sticky Summary Bar */}
      {showStickyBar && (
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between px-6 py-2 max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground/80">
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
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, CPF ou processo..."
                className="pl-8 w-[220px] h-7 text-xs border-border bg-muted rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-muted p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center gap-1 px-2 h-6 text-xs font-medium rounded-md transition-all",
                    viewMode === "grid"
                      ? "bg-background dark:bg-muted text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex items-center gap-1 px-2 h-6 text-xs font-medium rounded-md transition-all",
                    viewMode === "list"
                      ? "bg-background dark:bg-muted text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
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
      <div className="px-5 md:px-8 py-3 md:py-4 space-y-3">

      {/* Tabs + Stats moved into header bottomRow above */}

      {/* Analytics Tab Content */}
      {activeTab === "analytics" && (
        <Card className="border border-border bg-card rounded-xl overflow-hidden">
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

      {/* Filter bar moved into header bottom row 2 */}



      {/* Card de Listagem */}
      <Card className="border border-border bg-card rounded-xl overflow-hidden">
        {/* Header — count + sort + view */}
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground tabular-nums">
              {filteredAssistidos.length} resultado{filteredAssistidos.length !== 1 && 's'}
            </span>
            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Ordenar:</span>
                <div className="flex bg-muted p-0.5 rounded-lg">
                  {(["nome", "prioridade", "prazo"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSortBy(opt)}
                      className={cn(
                        "px-2 py-1 text-[10px] font-medium rounded-md transition-all",
                        sortBy === opt
                          ? "bg-background dark:bg-muted text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt === "nome" ? "Nome" : opt === "prioridade" ? "Prio." : "Prazo"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Processing queue */}
              <ProcessingQueuePanel>
                <button
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center gap-1 rounded-md transition-colors",
                    activeCount > 0
                      ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Fila de processamento"
                >
                  <Activity className={cn("h-3.5 w-3.5", activeCount > 0 && "animate-pulse")} />
                  {activeCount > 0 && <span className="text-[10px] font-medium">{activeCount}</span>}
                </button>
              </ProcessingQueuePanel>
              {/* View toggle */}
              <div className="flex bg-muted p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn("flex items-center justify-center w-7 h-7 rounded-md transition-all", viewMode === "grid" ? "bg-background dark:bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  title="Grade"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("flex items-center justify-center w-7 h-7 rounded-md transition-all", viewMode === "list" ? "bg-background dark:bg-muted text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                  title="Lista"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
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
                    <h3 className="text-sm font-semibold text-foreground/80 capitalize">
                      {groupName}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                  <div className="flex-1 h-px bg-border" />
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
                  <span className="font-medium text-foreground">
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
