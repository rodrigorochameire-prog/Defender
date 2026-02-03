// @ts-nocheck
"use client";

import { DemandaCreateModal, type DemandaFormData } from "@/components/demandas-premium/demanda-create-modal";
import { ConfigModal } from "@/components/demandas-premium/config-modal";
import { DynamicChart } from "@/components/demandas-premium/dynamic-charts";
import { HistoricoChart } from "@/components/demandas-premium/historico-chart";
import { FilterSectionsCompact } from "@/components/demandas-premium/filter-sections-compact";
import { InfographicSelector } from "@/components/demandas-premium/infographic-selector";
import { ChartConfigModal } from "@/components/demandas-premium/chart-config-modal";
import { ImportModal } from "@/components/demandas-premium/import-modal";
import { PJeImportModal } from "@/components/demandas-premium/pje-import-modal";
import { ExportModal } from "@/components/demandas-premium/export-modal";
import { AdminConfigModal } from "@/components/demandas-premium/admin-config-modal";
import { ImportDropdown } from "@/components/demandas-premium/import-dropdown";
import { SheetsImportModal } from "@/components/demandas-premium/sheets-import-modal";
import { getStatusConfig, STATUS_GROUPS, type StatusGroup } from "@/config/demanda-status";
import { getAtosPorAtribuicao, getTodosAtosUnicos, ATOS_POR_ATRIBUICAO } from "@/config/atos-por-atribuicao";
import { copyToClipboard } from "@/lib/clipboard";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/demandas-premium/PageHeader";
import { DemandaCard } from "@/components/demandas-premium/DemandaCard";
import { DemandaTableView } from "@/components/demandas-premium/DemandaTableView";
import {
  ListTodo,
  Plus,
  Search,
  Download,
  Upload,
  Archive,
  XCircle,
  Sparkles,
  BarChart as BarChartIcon,
  Settings,
  CheckCircle2,
  Scale,
  Gavel,
  Target,
  Home,
  Lock,
  Folder,
  RefreshCw,
  Shield,
  FileEdit,
  AlertTriangle,
  ShieldCheck,
  FileCheck,
  FileText,
  CheckSquare,
  Trash2,
  X,
  LayoutList,
  Table2,
} from "lucide-react";

// Ícones e cores por atribuição
const atribuicaoIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Tribunal do Júri": Gavel,
  "Grupo Especial do Júri": Target,
  "Violência Doméstica": Home,
  "Execução Penal": Lock,
  "Criminal Geral": Folder,
  "Substituição": RefreshCw,
  "Curadoria Especial": Shield,
};

// Mapeamento de status do banco (enum) para status da UI
const DB_STATUS_TO_UI: Record<string, string> = {
  "2_ATENDER": "atender",
  "4_MONITORAR": "monitorar",
  "5_FILA": "fila",
  "7_PROTOCOLADO": "protocolado",
  "7_CIENCIA": "ciencia",
  "7_SEM_ATUACAO": "sem_atuacao",
  "URGENTE": "urgente",
  "CONCLUIDO": "resolvido",
  "ARQUIVADO": "protocolado",
};

// Mapeamento de enum do banco para label amigável
const ATRIBUICAO_ENUM_TO_LABEL: Record<string, string> = {
  "JURI_CAMACARI": "Tribunal do Júri",
  "GRUPO_JURI": "Grupo Especial do Júri",
  "VVD_CAMACARI": "Violência Doméstica",
  "EXECUCAO_PENAL": "Execução Penal",
  "SUBSTITUICAO": "Criminal Geral",
  "SUBSTITUICAO_CIVEL": "Curadoria Especial",
};

const atribuicaoColors: Record<string, string> = {
  "Tribunal do Júri": "text-green-600 dark:text-green-500",
  "Grupo Especial do Júri": "text-orange-600 dark:text-orange-500",
  "Violência Doméstica": "text-yellow-600 dark:text-yellow-500",
  "Execução Penal": "text-blue-600 dark:text-blue-500",
  "Criminal Geral": "text-red-600 dark:text-red-500",
  "Substituição": "text-purple-600 dark:text-purple-500",
  "Curadoria Especial": "text-gray-600 dark:text-gray-400",
};

const atribuicaoOptions = [
  { value: "Todas", label: "Todas Atribuições", icon: Scale },
  { value: "Tribunal do Júri", label: "Tribunal do Júri", icon: Gavel },
  { value: "Grupo Especial do Júri", label: "Grupo Especial do Júri", icon: Target },
  { value: "Violência Doméstica", label: "Violência Doméstica", icon: Home },
  { value: "Execução Penal", label: "Execução Penal", icon: Lock },
  { value: "Criminal Geral", label: "Criminal Geral", icon: Folder },
  { value: "Substituição", label: "Substituição", icon: RefreshCw },
  { value: "Curadoria Especial", label: "Curadoria Especial", icon: Shield },
  { value: "Peticionamento Integrado", label: "Peticionamento Integrado", icon: FileText },
];

const statusOptions = [
  { value: "urgente", label: "Urgente", icon: AlertTriangle },
  { value: "analisar", label: "Analisar", icon: Search },
  { value: "elaborar", label: "Elaborar", icon: FileEdit },
  { value: "elaborando", label: "Elaborando", icon: FileEdit },
  { value: "revisar", label: "Revisar", icon: FileCheck },
  { value: "protocolar", label: "Protocolar", icon: Upload },
  { value: "fila", label: "Fila", icon: ListTodo },
  { value: "protocolado", label: "Protocolado", icon: CheckCircle2 },
  { value: "monitorar", label: "Monitorar", icon: CheckCircle2 },
  { value: "resolvido", label: "Resolvido", icon: CheckCircle2 },
];

const atoGroups = {
  principais: {
    label: "Atos Principais",
    atos: ["Alegações Finais", "Apelação", "Razões de apelação", "Contrarrazões de apelação", "Arguição"],
  },
  ciencias: {
    label: "Ciências",
    atos: ["Ciência", "Ciência de sentença", "Ciência absolvição", "Ciência condenação"],
  },
  liberdade: {
    label: "Liberdade",
    atos: ["Liberdade Provisória", "Relaxamento de Prisão", "Revogação de Prisão Preventiva", "Habeas Corpus"],
  },
  recursos: {
    label: "Recursos",
    atos: ["Recurso em Sentido Estrito", "Embargos de Declaração", "Agravo em Execução"],
  },
};

const chartOptions = [
  { value: "atribuicoes", label: "Atribuições", category: "Atribuições", icon: Scale, color: "#71717A" },
  { value: "status", label: "Status", category: "Status", icon: ListTodo, color: "#52525B" },
  { value: "atos", label: "Tipos de Atos", category: "Atos", icon: FileCheck, color: "#3F3F46" },
  { value: "situacao-prisional", label: "Situação Prisional", category: "Situação", icon: ShieldCheck, color: "#27272A" },
];

export default function Demandas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("status");
  const [demandas, setDemandas] = useState<any[]>([]);
  const [selectedPrazoFilter, setSelectedPrazoFilter] = useState<string | null>(null);
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<string | null>(null);
  const [selectedEstadoPrisional, setSelectedEstadoPrisional] = useState<string | null>(null);
  const [selectedTipoAto, setSelectedTipoAto] = useState<string | null>(null);
  const [selectedStatusGroup, setSelectedStatusGroup] = useState<StatusGroup | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<string[]>(["atribuicoes", "status", "atos", "situacao-prisional"]);
  const [chartTypes, setChartTypes] = useState<Record<string, string>>({
    atribuicoes: "pizza",
    status: "pizza",
    atos: "barras",
    "situacao-prisional": "pizza",
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isChartConfigModalOpen, setIsChartConfigModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPJeImportModalOpen, setIsPJeImportModalOpen] = useState(false);
  const [isSheetsImportModalOpen, setIsSheetsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDemanda, setEditingDemanda] = useState<DemandaFormData | null>(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [isInfographicsExpanded, setIsInfographicsExpanded] = useState(false);
  const [isAdminConfigModalOpen, setIsAdminConfigModalOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("defender_demandas_view_mode") as "cards" | "table") || "cards";
    }
    return "cards";
  });

  // ==========================================
  // BUSCA DADOS REAIS DO BANCO DE DADOS
  // ==========================================
  const { data: demandasDB = [], isLoading: loadingDemandas } = trpc.demandas.list.useQuery({
    limit: 100,
  });

  const utils = trpc.useUtils();
  
  // Mutation para criar demanda
  const createDemandaMutation = trpc.demandas.create.useMutation({
    onSuccess: () => {
      toast.success("Demanda criada com sucesso!");
      utils.demandas.list.invalidate();
      setIsCreateModalOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar demanda: " + error.message);
    },
  });

  // Mutation para atualizar demanda
  const updateDemandaMutation = trpc.demandas.update.useMutation({
    onSuccess: () => {
      toast.success("Demanda atualizada!");
      utils.demandas.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Mutation para deletar demanda (soft delete)
  const deleteDemandaMutation = trpc.demandas.delete.useMutation({
    onSuccess: () => {
      toast.success("Demanda deletada!");
      utils.demandas.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao deletar: " + error.message);
    },
  });

  // Mapear dados do banco para o formato do componente
  // Por enquanto, mantemos os mocks como base e adicionamos dados do banco se existirem
  useEffect(() => {
    if (demandasDB && demandasDB.length > 0) {
      const mappedDemandas = demandasDB.map((d: any) => ({
        id: String(d.id),
        assistido: d.assistido?.nome || d.titulo || "Sem assistido",
        assistidoId: d.assistido?.id || d.assistidoId || null,
        processoId: d.processo?.id || d.processoId || null,
        // Usar substatus granular quando disponível, senão mapear do status coarse do DB
        status: d.substatus || DB_STATUS_TO_UI[d.status] || d.status?.toLowerCase().replace(/_/g, " ") || "fila",
        prazo: d.prazo ? new Date(d.prazo + "T12:00:00").toLocaleDateString("pt-BR") : "",
        data: d.dataEntrada ? new Date(d.dataEntrada + "T12:00:00").toLocaleDateString("pt-BR") : new Date(d.createdAt).toLocaleDateString("pt-BR"),
        processos: d.processo?.numeroAutos
          ? [{ tipo: "Processo", numero: d.processo.numeroAutos }]
          : [],
        ato: d.ato || d.titulo || "",
        providencias: d.providencias || "",
        atribuicao: ATRIBUICAO_ENUM_TO_LABEL[d.processo?.atribuicao] || d.atribuicao || "Criminal Geral",
        estadoPrisional: d.reuPreso ? "preso" : (d.assistido?.statusPrisional || "solto"),
        prioridade: d.prioridade || "normal",
        arquivado: d.status === "ARQUIVADO",
      }));
      // Usar apenas dados do banco
      setDemandas(mappedDemandas);
    } else {
      // Se banco vazio, mantém array vazio
      setDemandas([]);
    }
  }, [demandasDB]);

  // Gerar lista de atos dinamicamente baseado na atribuição selecionada
  const atoOptionsFiltered = useMemo(() => {
    // Se não houver atribuição selecionada ou for "Todas", retorna todos os atos
    if (!selectedAtribuicao || selectedAtribuicao === "Todas") {
      return getTodosAtosUnicos();
    }
    
    // Retorna atos específicos da atribuição
    return getAtosPorAtribuicao(selectedAtribuicao);
  }, [selectedAtribuicao]);

  // Mapeamento de status granular da UI para status coarse do banco
  const UI_STATUS_TO_DB: Record<string, string> = {
    "fila": "5_FILA",
    "atender": "2_ATENDER",
    "analisar": "2_ATENDER",
    "elaborar": "2_ATENDER",
    "elaborando": "2_ATENDER",
    "buscar": "2_ATENDER",
    "revisar": "2_ATENDER",
    "revisando": "2_ATENDER",
    "monitorar": "4_MONITORAR",
    "protocolar": "5_FILA",
    "protocolado": "7_PROTOCOLADO",
    "ciencia": "7_CIENCIA",
    "sem_atuacao": "7_SEM_ATUACAO",
    "urgente": "URGENTE",
    "resolvido": "CONCLUIDO",
    "arquivado": "ARQUIVADO",
  };

  const handleStatusChange = (demandaId: string, newStatus: string) => {
    // Atualizar localmente para feedback imediato
    setDemandas((prev) =>
      prev.map((d) => (d.id === demandaId ? { ...d, status: newStatus } : d))
    );

    // Atualizar no banco (id precisa ser número)
    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      const dbStatus = UI_STATUS_TO_DB[newStatus] || newStatus.toUpperCase().replace(/ /g, "_");
      updateDemandaMutation.mutate({
        id: numericId,
        status: dbStatus as any,
        substatus: newStatus, // Salvar o status granular
      });
    }
  };

  const handleAtoChange = (demandaId: string, newAto: string) => {
    // Atualizar localmente para feedback imediato
    setDemandas((prev) =>
      prev.map((d) => (d.id === demandaId ? { ...d, ato: newAto } : d))
    );

    // Atualizar no banco (id precisa ser número)
    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({
        id: numericId,
        ato: newAto,
      });
    }

    toast.success(`Ato alterado para "${newAto}"!`, {
      description: "O prazo será recalculado automaticamente conforme o tipo de ato."
    });
  };

  const handleProvidenciasChange = (demandaId: string, providencias: string) => {
    // Atualizar localmente para feedback imediato
    setDemandas((prev) =>
      prev.map((d) => (d.id === demandaId ? { ...d, providencias } : d))
    );

    // Atualizar no banco (id precisa ser número)
    const numericId = parseInt(demandaId, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({
        id: numericId,
        providencias,
      });
    }

    toast.success("Providências atualizadas!");
  };

  const handleSaveNewDemanda = (demandaData: DemandaFormData) => {
    // Por enquanto usar dados locais (mock) até o modal estar preparado
    // para selecionar assistidos e processos do banco de dados
    const newDemanda = {
      id: `new-${Date.now()}`,
      status: demandaData.status || "fila",
      prazo: demandaData.prazo,
      data: demandaData.data || new Date().toLocaleDateString("pt-BR"),
      assistido: demandaData.assistido,
      avatar: "",
      processos: demandaData.processos,
      ato: demandaData.ato,
      providencias: demandaData.providencias,
      atribuicao: demandaData.atribuicao,
      tipoAto: demandaData.ato,
      estadoPrisional: demandaData.estadoPrisional || "solto",
      dataInclusao: new Date().toISOString(),
      arquivado: false,
    };
    
    setDemandas((prev) => [newDemanda, ...prev]);
    toast.success("Demanda criada com sucesso!");
    setIsCreateModalOpen(false);
  };

  const handleEditDemanda = (demanda: any) => {
    setEditingDemanda({
      ...demanda,
      processos: demanda.processos || [],
      providencias: demanda.providencias || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (data: DemandaFormData) => {
    if (editingDemanda) {
      setDemandas((prev) =>
        prev.map((d) => (d.id === editingDemanda.id ? { ...d, ...data } : d))
      );
      toast.success("Demanda atualizada!");
      setIsEditModalOpen(false);
      setEditingDemanda(null);
    }
  };

  const handleArchiveDemanda = (id: string) => {
    // Arquivar = mudar status para ARQUIVADO no banco
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({ id: numericId, status: "ARQUIVADO" });
    } else {
      // Para demandas mock (string id), apenas atualiza estado local
      setDemandas((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, arquivado: true, dataArquivamento: new Date().toISOString() }
            : d
        )
      );
      toast.success("Demanda arquivada!");
    }
  };

  const handleUnarchiveDemanda = (id: string) => {
    // Desarquivar = mudar status de volta para FILA
    const numericId = parseInt(id, 10);
    if (!isNaN(numericId)) {
      updateDemandaMutation.mutate({ id: numericId, status: "5_FILA" });
    } else {
      // Para demandas mock (string id), apenas atualiza estado local
      setDemandas((prev) =>
        prev.map((d) => (d.id === id ? { ...d, arquivado: false, dataArquivamento: undefined } : d))
      );
      toast.success("Demanda desarquivada!");
    }
  };

  const handleDeleteDemanda = (id: string) => {
    if (confirm("Deseja deletar esta demanda? Esta ação não pode ser desfeita.")) {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        // Deletar no banco de dados (soft delete)
        deleteDemandaMutation.mutate({ id: numericId });
      } else {
        // Para demandas mock (string id), apenas atualiza estado local
        setDemandas((prev) => prev.filter((d) => d.id !== id));
        toast.success("Demanda deletada!");
      }
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === demandasOrdenadas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(demandasOrdenadas.map((d) => d.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deseja deletar ${selectedIds.size} demanda(s)? Esta ação não pode ser desfeita.`)) return;

    for (const id of selectedIds) {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        deleteDemandaMutation.mutate({ id: numericId });
      }
    }
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const handleExitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const importFromSheetsMutation = trpc.demandas.importFromSheets.useMutation({
    onSuccess: (result) => {
      utils.demandas.list.invalidate();
      utils.demandas.stats.invalidate();
      const messages: string[] = [];
      if (result.imported > 0) messages.push(`${result.imported} importadas`);
      if (result.skipped > 0) messages.push(`${result.skipped} ignoradas (duplicatas)`);
      if (result.errors.length > 0) messages.push(`${result.errors.length} erros`);
      toast.success(`Importação concluída: ${messages.join(", ")}`);
      if (result.errors.length > 0) {
        result.errors.forEach((err) => toast.error(err));
      }
    },
    onError: (error) => {
      toast.error("Erro na importação: " + error.message);
    },
  });

  const handleImportDemandas = async (importedData: any[]) => {
    // Mapear dados do modal para o formato esperado pela mutation
    const rows = importedData.map((data) => ({
      assistido: data.assistido || "Não informado",
      processoNumero: data.processos?.[0]?.numero || "",
      ato: data.ato || "Outros",
      prazo: data.prazo || undefined,
      dataEntrada: data.data || undefined,
      status: data.status || "fila",
      estadoPrisional: data.estadoPrisional || "solto",
      providencias: data.providencias || undefined,
      atribuicao: data.atribuicao || "Criminal Geral",
    }));

    importFromSheetsMutation.mutate({ rows });
  };

  const toggleChart = (chartType: string) => {
    setSelectedCharts((prev) => {
      if (prev.includes(chartType)) {
        return prev.filter((c) => c !== chartType);
      } else if (prev.length < 4) {
        return [...prev, chartType];
      }
      toast.error("Máximo de 4 gráficos");
      return prev;
    });
  };

  // Referência para todas as demandas (não filtradas)
  const allDemandas = demandas;

  // Filtrar demandas
  const demandasFiltradas = useMemo(() => {
    return demandas.filter((demanda) => {
      const matchArchived = showArchived ? demanda.arquivado : !demanda.arquivado;
      const processosText = demanda.processos.map((p) => `${p.tipo} ${p.numero}`).join(" ");
      const matchSearch =
        demanda.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        processosText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        demanda.ato.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPrazoFilter =
        !selectedPrazoFilter ||
        (selectedPrazoFilter === "prazo" && demanda.prazo) ||
        (selectedPrazoFilter === "sem-prazo" && !demanda.prazo);
      const matchAtribuicao =
        !selectedAtribuicao || demanda.atribuicao === selectedAtribuicao;
      const matchEstadoPrisional =
        !selectedEstadoPrisional || demanda.estadoPrisional === selectedEstadoPrisional;
      const matchTipoAto =
        !selectedTipoAto || demanda.tipoAto === selectedTipoAto;
      const matchStatusGroup =
        !selectedStatusGroup ||
        selectedStatusGroup.includes(getStatusConfig(demanda.status).group);

      return (
        matchArchived &&
        matchSearch &&
        matchPrazoFilter &&
        matchAtribuicao &&
        matchStatusGroup &&
        matchEstadoPrisional &&
        matchTipoAto
      );
    });
  }, [demandas, searchTerm, selectedPrazoFilter, selectedAtribuicao, selectedEstadoPrisional, selectedTipoAto, selectedStatusGroup, showArchived]);

  // Ordenar demandas
  const demandasOrdenadas = useMemo(() => {
    const sorted = [...demandasFiltradas];
    
    if (sortBy === "prazo") {
      return sorted.sort((a, b) => {
        if (!a.prazo) return 1;
        if (!b.prazo) return -1;
        return a.prazo.localeCompare(b.prazo);
      });
    } else if (sortBy === "assistido") {
      return sorted.sort((a, b) => a.assistido.localeCompare(b.assistido));
    } else if (sortBy === "data") {
      return sorted.sort((a, b) => {
        if (!a.data) return 1;
        if (!b.data) return -1;
        return b.data.localeCompare(a.data);
      });
    } else if (sortBy === "recentes") {
      return sorted.sort((a, b) => {
        const dateA = a.dataInclusao || a.data || "";
        const dateB = b.dataInclusao || b.data || "";
        return dateB.localeCompare(dateA);
      });
    } else if (sortBy === "status") {
      return sorted.sort((a, b) => {
        const statusA = getStatusConfig(a.status);
        const statusB = getStatusConfig(b.status);
        const groupOrder = ["urgente", "preparacao", "delegacao", "monitoramento", "fila", "diligencias", "concluida"];
        const indexA = groupOrder.indexOf(statusA.group);
        const indexB = groupOrder.indexOf(statusB.group);
        return indexA - indexB;
      });
    } else if (sortBy === "ato") {
      return sorted.sort((a, b) => a.ato.localeCompare(b.ato));
    }
    
    return sorted;
  }, [demandasFiltradas, sortBy]);

  // Estatísticas
  const statsData = useMemo(() => {
    const demandasAtivas = demandas.filter((d) => !d.arquivado);

    const emPreparacao = demandasAtivas.filter((d) =>
      ["elaborar", "elaborando", "revisar", "revisando"].includes(d.status.toLowerCase())
    ).length;

    const prazosCriticos = demandasAtivas.filter((d) => {
      if (!d.prazo) return false;
      try {
        const [dia, mes, ano] = d.prazo.split("/").map(Number);
        const prazo = new Date(2000 + ano, mes - 1, dia);
        const hoje = new Date();
        const diffDays = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3;
      } catch {
        return false;
      }
    }).length;

    const totalComEstadoPrisional = demandasAtivas.filter((d) => d.estadoPrisional).length;
    const reusPresos = demandasAtivas.filter((d) => d.estadoPrisional === "preso").length;
    const percentualPresos =
      totalComEstadoPrisional > 0 ? Math.round((reusPresos / totalComEstadoPrisional) * 100) : 0;

    const comCautelar = demandasAtivas.filter((d) => d.estadoPrisional === "cautelar").length;

    return [
      {
        label: "Em Preparação",
        value: emPreparacao.toString(),
        icon: FileEdit,
        change: `${Math.round((emPreparacao / demandasAtivas.length) * 100)}%`,
        changeLabel: "do total",
      },
      {
        label: "Prazos Críticos",
        value: prazosCriticos.toString(),
        icon: AlertTriangle,
        change: `${Math.round((prazosCriticos / demandasAtivas.length) * 100)}%`,
        changeLabel: "do total",
      },
      {
        label: "Rus Presos",
        value: `${percentualPresos}%`,
        icon: Lock,
        change: `${reusPresos}`,
        changeLabel: `de ${totalComEstadoPrisional} réus`,
      },
      {
        label: "Cautelares Diversas",
        value: comCautelar.toString(),
        icon: ShieldCheck,
        change: `${Math.round((comCautelar / totalComEstadoPrisional) * 100) || 0}%`,
        changeLabel: "do total",
      },
    ];
  }, [demandas]);

  return (
    <div className="w-full min-h-screen bg-zinc-100 dark:bg-[#0f0f11] overflow-x-hidden">
      {/* Header */}
      <PageHeader
        title="Demandas"
        subtitle="Gerenciamento de prazos e solicitações"
        actions={
          <div className="flex items-center gap-0.5">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsAdminConfigModalOpen(true)} 
              title="Configurações"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsChartConfigModalOpen(true)} 
              title="Infográficos"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <BarChartIcon className="w-3.5 h-3.5" />
            </Button>
            <ImportDropdown 
              onImportExcel={() => setIsImportModalOpen(true)}
              onImportPJe={() => setIsPJeImportModalOpen(true)}
              onImportSheets={() => setIsSheetsImportModalOpen(true)}
            />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsExportModalOpen(true)} 
              title="Exportar"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
            </Button>
            <Button 
              size="sm"
              onClick={() => setIsCreateModalOpen(true)} 
              title="Nova Demanda"
              className="h-7 px-2.5 ml-1.5 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-xs font-medium rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nova
            </Button>
          </div>
        }
      />

      {/* Conteúdo Principal */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Cards - 2 colunas em mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="group relative p-3 md:p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-emerald-500/[0.03] dark:hover:shadow-emerald-500/[0.05]"
              >
                {/* Linha superior sutil no hover */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover:via-emerald-500/30 transition-all duration-300 rounded-t-xl" />
                
                <div className="flex items-start justify-between gap-2 md:gap-3">
                  <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1">
                    <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 truncate uppercase tracking-wide group-hover:text-emerald-600/70 dark:group-hover:text-emerald-400/70 transition-colors duration-300">
                      {stat.label}
                    </p>
                    <p className="text-lg md:text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                      {stat.value}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-zinc-400 dark:text-zinc-500">
                      <span className="text-emerald-600 dark:text-emerald-500 font-medium">
                        {stat.change}
                      </span>{" "}
                      {stat.changeLabel}
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 border border-zinc-200 dark:border-zinc-700 group-hover:border-emerald-300/30 dark:group-hover:border-emerald-700/30 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-all duration-300">
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-zinc-500 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filtros e Infográficos */}
        <div className="space-y-4">
          {/* Filtros Rápidos */}
          <Card className="group/card relative border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl p-5 hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02]">
            <FilterSectionsCompact
              selectedPrazoFilter={selectedPrazoFilter}
              setSelectedPrazoFilter={setSelectedPrazoFilter}
              selectedAtribuicao={selectedAtribuicao}
              setSelectedAtribuicao={setSelectedAtribuicao}
              selectedEstadoPrisional={selectedEstadoPrisional}
              setSelectedEstadoPrisional={setSelectedEstadoPrisional}
              selectedTipoAto={selectedTipoAto}
              setSelectedTipoAto={setSelectedTipoAto}
              selectedStatusGroup={selectedStatusGroup}
              setSelectedStatusGroup={setSelectedStatusGroup}
              atribuicaoOptions={atribuicaoOptions}
              atribuicaoIcons={atribuicaoIcons}
              atribuicaoColors={atribuicaoColors}
              atoOptions={atoOptionsFiltered}
              isExpanded={isFiltersExpanded}
              onToggleExpand={() => setIsFiltersExpanded(!isFiltersExpanded)}
            />
          </Card>

          {/* Lista de Demandas */}
          <Card className="group/card relative border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02]">
            <div className="px-3 md:px-5 py-3 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent dark:from-emerald-500/10 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3">
                <div className="flex-1 min-w-0 relative">
                  <Search className="absolute left-3 md:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                  <Input
                    placeholder="Buscar assistido, processo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 md:pl-10 h-9 md:h-10 text-xs md:text-sm bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded p-1 transition-colors"
                    >
                      <XCircle className="w-3.5 md:w-4 h-3.5 md:h-4 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300" />
                    </button>
                  )}
                </div>
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  {["status", "prazo", "assistido", "ato", "recentes"].map((sort) => (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      className={`px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-semibold transition-all whitespace-nowrap ${
                        sortBy === sort
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {sort === "recentes" && <Sparkles className="w-2.5 md:w-3 h-2.5 md:h-3 inline mr-0.5 md:mr-1" />}
                      {sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </button>
                  ))}
                </div>
                {/* Toggle de Visualização: Cards / Planilha */}
                <div className="hidden md:flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
                  <button
                    onClick={() => {
                      setViewMode("cards");
                      localStorage.setItem("defender_demandas_view_mode", "cards");
                    }}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "cards"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                    title="Visualização em Cards"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setViewMode("table");
                      localStorage.setItem("defender_demandas_view_mode", "table");
                    }}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === "table"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                    title="Visualização em Planilha"
                  >
                    <Table2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={`px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-medium transition-all whitespace-nowrap ${
                    showArchived
                      ? "bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  <Archive className="w-2.5 md:w-3 h-2.5 md:h-3 inline mr-0.5 md:mr-1" />
                  {showArchived ? "Ativos" : "Arquivados"}
                </button>
              </div>
            </div>

            {showArchived && (
              <div className="mx-4 mt-4 p-3 rounded-lg bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-800">
                <div className="flex items-center gap-3">
                  <Archive className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                      Visualizando Demandas Arquivadas
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Estas demandas estão ocultas da lista principal.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArchived(false)}
                    className="bg-amber-200 dark:bg-amber-900/50"
                  >
                    Ver Ativos
                  </Button>
                </div>
              </div>
            )}

            <div className={`${viewMode === "cards" ? "p-4 space-y-3" : "p-0"} max-h-[calc(100vh-400px)] min-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-900`}>
              {viewMode === "table" ? (
                /* ========== MODO PLANILHA ========== */
                <DemandaTableView
                  demandas={demandasOrdenadas}
                  atribuicaoIcons={atribuicaoIcons}
                  atribuicaoColors={atribuicaoColors}
                  onStatusChange={handleStatusChange}
                  onEdit={handleEditDemanda}
                  onArchive={handleArchiveDemanda}
                  onUnarchive={handleUnarchiveDemanda}
                  onDelete={handleDeleteDemanda}
                  copyToClipboard={copyToClipboard}
                  onAtoChange={handleAtoChange}
                  onProvidenciasChange={handleProvidenciasChange}
                  isSelectMode={isSelectMode}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
              ) : (
                /* ========== MODO CARDS ========== */
                <>
                  {demandasOrdenadas.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mx-auto mb-5 flex items-center justify-center">
                        <ListTodo className="w-10 h-10 text-zinc-400 dark:text-zinc-600" />
                      </div>
                      <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                        Nenhuma demanda encontrada
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {showArchived
                          ? "Não há demandas arquivadas no momento"
                          : "Ajuste os filtros ou crie uma nova demanda"}
                      </p>
                    </div>
                  ) : (
                    demandasOrdenadas.map((demanda) => {
                      const statusConfig = getStatusConfig(demanda.status);
                      const borderColor = STATUS_GROUPS[statusConfig.group].color;

                      // Filtrar atos específicos para a atribuição da demanda
                      const atoOptionsForDemanda = getAtosPorAtribuicao(demanda.atribuicao);

                      return (
                        <DemandaCard
                          key={demanda.id}
                          demanda={demanda}
                          borderColor={borderColor}
                          atribuicaoIcons={atribuicaoIcons}
                          atribuicaoColors={atribuicaoColors}
                          onStatusChange={handleStatusChange}
                          onAtoChange={handleAtoChange}
                          atoOptions={atoOptionsForDemanda}
                          onEdit={handleEditDemanda}
                          onArchive={handleArchiveDemanda}
                          onUnarchive={handleUnarchiveDemanda}
                          onDelete={handleDeleteDemanda}
                          copyToClipboard={copyToClipboard}
                          onProvidenciasChange={handleProvidenciasChange}
                          isSelectMode={isSelectMode}
                          isSelected={selectedIds.has(demanda.id)}
                          onToggleSelect={handleToggleSelect}
                        />
                      );
                    })
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 flex items-center justify-between">
              {isSelectMode ? (
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                  >
                    {selectedIds.size === demandasOrdenadas.length ? "Desmarcar tudo" : "Selecionar tudo"}
                  </button>
                  <span className="text-xs text-zinc-400">
                    {selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {selectedIds.size > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs gap-1.5"
                        onClick={handleDeleteSelected}
                      >
                        <Trash2 className="w-3 h-3" />
                        Deletar ({selectedIds.size})
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-zinc-400 hover:text-zinc-600"
                      onClick={handleExitSelectMode}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    Mostrando <strong>{demandasOrdenadas.length}</strong> de{" "}
                    <strong>
                      {showArchived
                        ? demandas.filter((d) => d.arquivado).length
                        : demandas.filter((d) => !d.arquivado).length}
                    </strong>{" "}
                    demandas {showArchived ? "arquivadas" : "ativas"}
                  </p>
                  <button
                    onClick={() => setIsSelectMode(true)}
                    className="text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400 transition-colors"
                    title="Selecionar demandas"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </Card>

          {/* Infográficos */}
          {selectedCharts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                    <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Infográficos</h3>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                      Visualização de dados e estatísticas
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {selectedCharts.map((chartKey) => {
                  const chartConfig = chartOptions.find(opt => opt.value === chartKey);
                  const Icon = chartConfig?.icon || BarChartIcon;
                  
                  return (
                    <Card key={chartKey} className="group/chart relative p-4 border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/[0.02]">
                      {/* Linha superior sutil no hover */}
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/0 to-transparent group-hover/chart:via-emerald-500/20 transition-all duration-300 rounded-t-xl" />
                      
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover/chart:border-emerald-300/30 dark:group-hover/chart:border-emerald-700/30 group-hover/chart:bg-emerald-50 dark:group-hover/chart:bg-emerald-900/20 transition-all duration-300">
                          <Icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover/chart:text-emerald-600 dark:group-hover/chart:text-emerald-400 transition-colors duration-300" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 group-hover/chart:text-zinc-800 dark:group-hover/chart:text-zinc-200 transition-colors">
                            {chartConfig?.label || chartKey}
                          </h4>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {chartConfig?.category}
                          </p>
                        </div>
                      </div>
                      <div className="h-[300px] w-full">
                        <DynamicChart
                          type={chartKey}
                          demandas={demandasFiltradas}
                          visualizationType={chartTypes[chartKey] || "pizza"}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline */}
          <HistoricoChart demandas={demandasFiltradas} />
        </div>
      </div>

      {/* Modals */}
      <DemandaCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNewDemanda}
        assistidosOptions={[]}
        atribuicaoOptions={atribuicaoOptions}
        atoOptions={atoOptionsFiltered}
        statusOptions={statusOptions}
      />

      {editingDemanda && (
        <DemandaCreateModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingDemanda(null);
          }}
          onSave={handleSaveEdit}
          initialData={editingDemanda}
          assistidosOptions={[]}
          atribuicaoOptions={atribuicaoOptions}
          atoOptions={atoOptionsFiltered}
          statusOptions={statusOptions}
          mode="edit"
        />
      )}

      <ConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportDemandas}
      />
      <PJeImportModal
        isOpen={isPJeImportModalOpen}
        onClose={() => setIsPJeImportModalOpen(false)}
        onImport={handleImportDemandas}
        atribuicaoOptions={atribuicaoOptions}
        atoOptions={atoOptionsFiltered}
        statusOptions={statusOptions}
        demandasExistentes={allDemandas}
      />
      <SheetsImportModal
        isOpen={isSheetsImportModalOpen}
        onClose={() => setIsSheetsImportModalOpen(false)}
        onImport={handleImportDemandas}
      />
      <ChartConfigModal
        isOpen={isChartConfigModalOpen}
        onClose={() => setIsChartConfigModalOpen(false)}
        chartTypes={chartTypes}
        onChartTypeChange={(key, type) => setChartTypes((prev) => ({ ...prev, [key]: type }))}
        selectedCharts={selectedCharts}
        onToggleChart={toggleChart}
      />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        demandas={allDemandas}
        demandasFiltradas={demandasFiltradas}
      />
      <AdminConfigModal isOpen={isAdminConfigModalOpen} onClose={() => setIsAdminConfigModalOpen(false)} />
    </div>
  );
}