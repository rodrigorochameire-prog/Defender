"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Mic,
  Clock,
  FileText,
  MessageSquare,
  Search,
  User,
  Scale,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Gavel,
  Upload,
  Brain,
  X,
  Edit3,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";

// ============================================
// CONSTANTES
// ============================================

const INTERLOCUTOR_TYPES = [
  { value: "assistido", label: "Assistido(a)" },
  { value: "testemunha", label: "Testemunha" },
  { value: "familiar", label: "Familiar" },
  { value: "vitima", label: "Vítima" },
  { value: "perito", label: "Perito" },
  { value: "outro", label: "Outro" },
] as const;

const TIPOS_GRAVACAO = [
  { value: "conversa", label: "Conversa", icon: MessageSquare },
  { value: "audiencia", label: "Audiência", icon: Scale },
  { value: "outro", label: "Outro", icon: FileText },
] as const;

const SUBTIPOS_AUDIENCIA = [
  { value: "aij", label: "AIJ" },
  { value: "justificacao", label: "Justificação" },
  { value: "juri_instrucao", label: "Júri - Instrução" },
  { value: "juri_debates", label: "Júri - Debates" },
  { value: "pap", label: "PAP" },
] as const;

const SUBTIPOS_OUTRO = [
  { value: "reuniao", label: "Reunião" },
  { value: "palestra", label: "Palestra" },
  { value: "treinamento", label: "Treinamento" },
] as const;

const TIPOS_DEPOENTE = [
  { value: "reu", label: "Réu" },
  { value: "vitima", label: "Vítima" },
  { value: "testemunha", label: "Testemunha" },
  { value: "declarante", label: "Declarante" },
  { value: "perito", label: "Perito" },
  { value: "policial", label: "Policial" },
  { value: "informante", label: "Informante" },
] as const;

const ATRIBUICAO_CHIPS = [
  { value: "JURI_CAMACARI", label: "Júri", color: "bg-green-500" },
  { value: "GRUPO_JURI", label: "Grupo Júri", color: "bg-orange-500" },
  { value: "VVD_CAMACARI", label: "VVD", color: "bg-yellow-500" },
  { value: "EXECUCAO_PENAL", label: "Exec. Penal", color: "bg-blue-500" },
  { value: "SUBSTITUICAO", label: "Subst. Crim", color: "bg-red-500" },
  { value: "SUBSTITUICAO_CIVEL", label: "Subst. Cível", color: "bg-purple-500" },
] as const;

// ============================================
// TIPOS
// ============================================

interface PlaudApprovalModalProps {
  recordingId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}

type PdfUploadState = "idle" | "uploading" | "analyzing" | "ready" | "error";

interface ExtractedProcesso {
  numeroAutos: string;
  vara: string;
  comarca: string;
  tipoPenal: string;
  dataDistribuicao?: string;
  parteAutora?: string;
  atribuicaoSugerida?: string;
}

interface ExtractedAssistido {
  cpf?: string;
  rg?: string;
  endereco?: string;
  filiacao?: string;
  dataNascimento?: string;
  naturalidade?: string;
  nomeMae?: string;
  nomePai?: string;
}

// ============================================
// COMPONENTE
// ============================================

export function PlaudApprovalModal({
  recordingId,
  open,
  onOpenChange,
  onApproved,
}: PlaudApprovalModalProps) {
  // ---- State: existente ----
  const [interlocutorTipo, setInterlocutorTipo] = useState<string>("assistido");
  const [interlocutorObs, setInterlocutorObs] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssistidoId, setSelectedAssistidoId] = useState<number | null>(null);
  const [selectedProcessoId, setSelectedProcessoId] = useState<number | null>(null);
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<number | null>(null);
  const [criarNovoAtendimento, setCriarNovoAtendimento] = useState(false);
  const [novoAtendimentoTipo, setNovoAtendimentoTipo] = useState("presencial");
  const [novoAtendimentoDescricao, setNovoAtendimentoDescricao] = useState("");
  const [tipoGravacao, setTipoGravacao] = useState<"conversa" | "audiencia" | "outro">("conversa");
  const [subtipoGravacao, setSubtipoGravacao] = useState<string>("");
  const [depoentes, setDepoentes] = useState<Array<{ nome: string; tipo: string }>>([]);
  const [novoDeponenteNome, setNovoDeponenteNome] = useState("");
  const [novoDeponenteTipo, setNovoDeponenteTipo] = useState("testemunha");

  // ---- State: novo (criar assistido inline) ----
  const [showCreateAssistido, setShowCreateAssistido] = useState(false);
  const [novoAssistidoNome, setNovoAssistidoNome] = useState("");
  const [novoAssistidoAtribuicao, setNovoAssistidoAtribuicao] = useState<string>("");

  // ---- State: novo (processo via PDF) ----
  const [processoTab, setProcessoTab] = useState<"existente" | "novo">("existente");
  const [pdfUploadState, setPdfUploadState] = useState<PdfUploadState>("idle");
  const [pdfError, setPdfError] = useState<string>("");
  const [extractedProcesso, setExtractedProcesso] = useState<ExtractedProcesso | null>(null);
  const [extractedAssistido, setExtractedAssistido] = useState<ExtractedAssistido | null>(null);
  const [extractionConfianca, setExtractionConfianca] = useState(0);
  const [isDeepExtracting, setIsDeepExtracting] = useState(false);
  const [deepAnalise, setDeepAnalise] = useState<any>(null);
  const [pdfBase64, setPdfBase64] = useState<string>("");

  // ---- Debounce ----
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchResultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Queries ----
  const { data: recordings } = trpc.atendimentos.pendingRecordings.useQuery();
  const recording = useMemo(
    () => recordings?.find((r) => r.id === recordingId),
    [recordings, recordingId]
  );

  const { data: searchResults, isLoading: isSearching } = trpc.search.local.useQuery(
    { query: debouncedQuery, limit: 10 },
    { enabled: debouncedQuery.length >= 2 }
  );

  useEffect(() => {
    if (searchResults?.assistidos && searchResults.assistidos.length > 0 && searchResultsRef.current) {
      searchResultsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [searchResults]);

  const { data: processos, isLoading: isLoadingProcessos } =
    trpc.atendimentos.processosByAssistido.useQuery(
      { assistidoId: selectedAssistidoId! },
      { enabled: !!selectedAssistidoId }
    );

  // ---- Mutations ----
  const approveMutation = trpc.atendimentos.approveRecording.useMutation({
    onSuccess: () => {
      toast.success("Gravação aprovada e vinculada com sucesso!");
      onApproved();
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });

  const quickCreateMutation = trpc.processos.quickCreateAssistido.useMutation({
    onSuccess: (data) => {
      toast.success(`Assistido "${data.nome}" criado!`);
      setSelectedAssistidoId(data.id);
      setSelectedProcessoId(null);
      setSelectedAtendimentoId(null);
      setCriarNovoAtendimento(true);
      setShowCreateAssistido(false);
      setNovoAssistidoNome("");
      setNovoAssistidoAtribuicao("");
    },
    onError: (error) => {
      toast.error(`Erro ao criar assistido: ${error.message}`);
    },
  });

  const extractPdfMutation = trpc.processos.extractFromPdf.useMutation({
    onSuccess: (data) => {
      setExtractedProcesso(data.processo);
      setExtractedAssistido(data.assistido);
      setExtractionConfianca(data.confianca);
      if (data.analise) setDeepAnalise(data.analise);
      setPdfUploadState("ready");

      // Se IA sugeriu atribuição diferente da selecionada, avisar
      if (data.processo.atribuicaoSugerida && novoAssistidoAtribuicao &&
          data.processo.atribuicaoSugerida !== novoAssistidoAtribuicao) {
        const sugerida = ATRIBUICAO_CHIPS.find(c => c.value === data.processo.atribuicaoSugerida);
        toast.info(`IA sugere atribuição: ${sugerida?.label || data.processo.atribuicaoSugerida}`, {
          duration: 6000,
        });
      }
    },
    onError: (error) => {
      setPdfUploadState("error");
      setPdfError(error.message);
      toast.error(`Erro na extração: ${error.message}`);
    },
  });

  const createProcessoMutation = trpc.processos.create.useMutation({
    onSuccess: (data) => {
      toast.success("Processo criado com sucesso!");
      setSelectedProcessoId(data.id);
      setProcessoTab("existente");
    },
    onError: (error) => {
      toast.error(`Erro ao criar processo: ${error.message}`);
    },
  });

  // ---- Handlers ----
  const handleApprove = () => {
    if (!selectedAssistidoId) {
      toast.error("Selecione um assistido");
      return;
    }

    approveMutation.mutate({
      recordingId,
      assistidoId: selectedAssistidoId,
      processoId: selectedProcessoId || undefined,
      atendimentoId: criarNovoAtendimento ? undefined : selectedAtendimentoId || undefined,
      novoAtendimento: criarNovoAtendimento
        ? {
            tipo: novoAtendimentoTipo,
            descricao: novoAtendimentoDescricao || undefined,
          }
        : undefined,
      interlocutor: {
        tipo: interlocutorTipo as "assistido" | "testemunha" | "familiar" | "vitima" | "perito" | "outro",
        observacao: interlocutorObs || undefined,
      },
    });
  };

  const selectAssistido = (id: number) => {
    setSelectedAssistidoId(id);
    setSelectedProcessoId(null);
    setSelectedAtendimentoId(null);
    setCriarNovoAtendimento(true);
  };

  const handleCreateAssistido = () => {
    if (!novoAssistidoNome.trim()) {
      toast.error("Digite o nome do assistido");
      return;
    }
    if (!novoAssistidoAtribuicao) {
      toast.error("Selecione a atribuição");
      return;
    }
    quickCreateMutation.mutate({
      nome: novoAssistidoNome.trim(),
      atribuicaoPrimaria: novoAssistidoAtribuicao as any,
    });
  };

  const handlePdfUpload = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são aceitos");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 20MB)");
      return;
    }

    setPdfUploadState("uploading");
    setPdfError("");

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      setPdfBase64(base64);
      setPdfUploadState("analyzing");

      // Call extraction
      extractPdfMutation.mutate({ file: base64, deep: false });
    } catch (error) {
      setPdfUploadState("error");
      setPdfError("Erro ao ler o arquivo");
    }
  }, [extractPdfMutation]);

  const handleDeepExtraction = async () => {
    if (!pdfBase64) return;
    setIsDeepExtracting(true);
    try {
      const result = await extractPdfMutation.mutateAsync({ file: pdfBase64, deep: true });
      if (result.analise) {
        setDeepAnalise(result.analise);
        toast.success("Extração profunda concluída!");
      }
    } catch {
      toast.error("Erro na extração profunda");
    } finally {
      setIsDeepExtracting(false);
    }
  };

  const handleConfirmExtraction = () => {
    if (!extractedProcesso || !selectedAssistidoId) return;

    // Map atribuicaoSugerida to area enum
    const areaMap: Record<string, string> = {
      JURI_CAMACARI: "JURI",
      GRUPO_JURI: "JURI",
      VVD_CAMACARI: "VIOLENCIA_DOMESTICA",
      EXECUCAO_PENAL: "EXECUCAO_PENAL",
      SUBSTITUICAO: "SUBSTITUICAO",
      SUBSTITUICAO_CIVEL: "CIVEL",
    };
    const area = areaMap[extractedProcesso.atribuicaoSugerida || ""] || "SUBSTITUICAO";

    createProcessoMutation.mutate({
      assistidoId: selectedAssistidoId,
      numeroAutos: extractedProcesso.numeroAutos,
      comarca: extractedProcesso.comarca || undefined,
      vara: extractedProcesso.vara || undefined,
      area: area as any,
      assunto: extractedProcesso.tipoPenal || undefined,
      isJuri: area === "JURI",
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handlePdfUpload(file);
  }, [handlePdfUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePdfUpload(file);
  }, [handlePdfUpload]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!recording) return null;

  const selectedAssistido = searchResults?.assistidos?.find(
    (a: { id: number }) => a.id === selectedAssistidoId
  );

  const noResults = searchQuery.length >= 2 && !isSearching && searchQuery === debouncedQuery &&
    (!searchResults?.assistidos || searchResults.assistidos.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Aprovar Gravação
          </DialogTitle>
          <DialogDescription>
            Revise os dados e vincule a um assistido para salvar no OMBUDS
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 pr-4 -mr-4">
          <div className="space-y-6 pb-4">
            {/* ====== SEÇÃO 1: Detalhes da Gravação ====== */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <Mic className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">
                    {recording.title || "Gravação sem título"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(recording.duration)}
                    </span>
                  </div>
                </div>
              </div>

              {(recording.transcription || recording.summary) && (
                <Tabs defaultValue="transcricao" className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="transcricao" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Transcrição
                    </TabsTrigger>
                    <TabsTrigger value="resumo" className="text-xs">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Resumo
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="transcricao">
                    <div className="rounded-md bg-zinc-50 dark:bg-zinc-900 p-3 max-h-40 overflow-y-auto border">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
                        {recording.transcription || "Sem transcrição disponível"}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="resumo">
                    <div className="rounded-md bg-zinc-50 dark:bg-zinc-900 p-3 max-h-40 overflow-y-auto border">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
                        {recording.summary || "Sem resumo disponível"}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>

            <Separator />

            {/* ====== TIPO DE GRAVAÇÃO ====== */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Tipo de Gravação
              </Label>
              <div className="flex gap-2">
                {TIPOS_GRAVACAO.map((tipo) => {
                  const Icon = tipo.icon;
                  const isSelected = tipoGravacao === tipo.value;
                  return (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => { setTipoGravacao(tipo.value as "conversa" | "audiencia" | "outro"); setSubtipoGravacao(""); }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200",
                        isSelected
                          ? "border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm shadow-emerald-500/10"
                          : "border border-zinc-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 hover:border-emerald-200 dark:hover:border-emerald-800"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400")} />
                      <span className={cn("text-xs font-medium", isSelected ? "text-emerald-700 dark:text-emerald-300 font-semibold" : "text-zinc-500 dark:text-zinc-400")}>{tipo.label}</span>
                    </button>
                  );
                })}
              </div>
              {tipoGravacao === "audiencia" && (
                <div className="flex flex-wrap gap-1.5">
                  {SUBTIPOS_AUDIENCIA.map((sub) => (
                    <button
                      key={sub.value}
                      type="button"
                      onClick={() => setSubtipoGravacao(sub.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors",
                        subtipoGravacao === sub.value
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
              {tipoGravacao === "outro" && (
                <div className="flex flex-wrap gap-1.5">
                  {SUBTIPOS_OUTRO.map((sub) => (
                    <button
                      key={sub.value}
                      type="button"
                      onClick={() => setSubtipoGravacao(sub.value)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors",
                        subtipoGravacao === sub.value
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* ====== INTERLOCUTOR (só conversa) ====== */}
            {tipoGravacao === "conversa" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Tipo de Interlocutor
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={interlocutorTipo} onValueChange={setInterlocutorTipo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERLOCUTOR_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Observação (opcional)"
                    value={interlocutorObs}
                    onChange={(e) => setInterlocutorObs(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* ====== DEPOENTES (só audiência) ====== */}
            {tipoGravacao === "audiencia" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Gavel className="h-4 w-4" />
                  Depoentes nesta Gravação
                </Label>
                {depoentes.length > 0 && (
                  <div className="space-y-1.5">
                    {depoentes.map((dep, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-zinc-50 dark:bg-zinc-800">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        <span className="text-sm flex-1">{dep.nome}</span>
                        <Badge variant="outline" className="text-[10px]">{dep.tipo}</Badge>
                        <button type="button" onClick={() => setDepoentes(prev => prev.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-red-500 transition-colors">
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do depoente"
                    value={novoDeponenteNome}
                    onChange={(e) => setNovoDeponenteNome(e.target.value)}
                    className="text-sm flex-1"
                  />
                  <Select value={novoDeponenteTipo} onValueChange={setNovoDeponenteTipo}>
                    <SelectTrigger className="w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_DEPOENTE.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (novoDeponenteNome.trim()) {
                        setDepoentes(prev => [...prev, { nome: novoDeponenteNome.trim(), tipo: novoDeponenteTipo }]);
                        setNovoDeponenteNome("");
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {tipoGravacao === "outro" && (
              <div className="rounded-md bg-zinc-50 dark:bg-zinc-800 p-3">
                <p className="text-xs text-zinc-500">Gravação será salva na pasta geral. Vincule a um assistido opcionalmente.</p>
              </div>
            )}

            <Separator />

            {/* ====== SEÇÃO 3: Busca de Assistido ====== */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4" />
                Assistido
              </Label>

              {!selectedAssistidoId ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      placeholder="Buscar por nome ou CPF..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowCreateAssistido(false);
                      }}
                      className="pl-9 text-sm"
                    />
                  </div>

                  {/* Resultados da busca */}
                  {searchQuery.length >= 2 && (
                    <div ref={searchResultsRef} className="border rounded-md max-h-48 overflow-y-auto">
                      {isSearching || (searchQuery !== debouncedQuery) ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-xs text-zinc-500">Buscando...</span>
                        </div>
                      ) : searchResults?.assistidos && searchResults.assistidos.length > 0 ? (
                        searchResults.assistidos.map((assistido: { id: number; nome: string; cpf?: string | null; atribuicao?: string | null }) => (
                          <button
                            key={assistido.id}
                            className="w-full flex items-center gap-3 p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-left border-b last:border-b-0 transition-colors"
                            onClick={() => selectAssistido(assistido.id)}
                          >
                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                              <User className="h-4 w-4 text-zinc-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium flex items-center gap-1.5">
                                <span className={cn("w-2 h-2 rounded-full flex-shrink-0", getAtribuicaoColors(assistido.atribuicao).dot)} />
                                {assistido.nome}
                                <span className={cn("text-[9px] px-1 py-0.5 rounded ml-1", getAtribuicaoColors(assistido.atribuicao).bgSolid, getAtribuicaoColors(assistido.atribuicao).text)}>{getAtribuicaoColors(assistido.atribuicao).shortLabel}</span>
                              </p>
                              {assistido.cpf && (
                                <p className="text-xs text-zinc-500 font-mono">
                                  {assistido.cpf}
                                </p>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-4 space-y-2">
                          <p className="text-xs text-zinc-500">Nenhum assistido encontrado</p>
                          {!showCreateAssistido && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => {
                                setShowCreateAssistido(true);
                                setNovoAssistidoNome(searchQuery);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Criar &quot;{searchQuery}&quot;
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ====== CRIAR ASSISTIDO INLINE ====== */}
                  {showCreateAssistido && (
                    <div className="border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-3 space-y-3 bg-emerald-50/30 dark:bg-emerald-900/10">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                          <Plus className="w-3 h-3" />
                          Criar novo assistido
                        </p>
                        <button type="button" onClick={() => setShowCreateAssistido(false)} className="text-zinc-400 hover:text-zinc-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <Input
                        placeholder="Nome completo"
                        value={novoAssistidoNome}
                        onChange={(e) => setNovoAssistidoNome(e.target.value)}
                        className="text-sm"
                        autoFocus
                      />

                      <div className="space-y-1.5">
                        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Atribuição</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ATRIBUICAO_CHIPS.map((chip) => (
                            <button
                              key={chip.value}
                              type="button"
                              onClick={() => setNovoAssistidoAtribuicao(chip.value)}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-all",
                                novoAssistidoAtribuicao === chip.value
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold border-2 border-emerald-400"
                                  : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-300"
                              )}
                            >
                              <span className={cn("w-2 h-2 rounded-full", chip.color)} />
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleCreateAssistido}
                        disabled={!novoAssistidoNome.trim() || !novoAssistidoAtribuicao || quickCreateMutation.isPending}
                      >
                        {quickCreateMutation.isPending ? (
                          <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Criando...</>
                        ) : (
                          <><Plus className="w-3 h-3 mr-1" /> Criar Assistido</>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <User className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {selectedAssistido?.nome || "Assistido selecionado"}
                    </p>
                    {selectedAssistido?.cpf && (
                      <p className="text-xs text-zinc-500 font-mono">{selectedAssistido.cpf}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setSelectedAssistidoId(null);
                      setSelectedProcessoId(null);
                      setSearchQuery("");
                    }}
                  >
                    Trocar
                  </Button>
                </div>
              )}
            </div>

            {/* ====== SEÇÃO 4: Processo + Atendimento ====== */}
            {selectedAssistidoId && (
              <>
                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Processo
                  </Label>

                  {/* Tabs: Existente | Criar via PDF */}
                  <div className="flex gap-1.5 p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setProcessoTab("existente")}
                      className={cn(
                        "flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all",
                        processoTab === "existente"
                          ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-700"
                      )}
                    >
                      Existente
                    </button>
                    <button
                      type="button"
                      onClick={() => setProcessoTab("novo")}
                      className={cn(
                        "flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5",
                        processoTab === "novo"
                          ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-500 hover:text-zinc-700"
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      Criar via PDF
                    </button>
                  </div>

                  {/* Tab: Processo Existente */}
                  {processoTab === "existente" && (
                    <>
                      {isLoadingProcessos ? (
                        <div className="flex items-center gap-2 py-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs text-zinc-500">Carregando processos...</span>
                        </div>
                      ) : processos && processos.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          <button
                            className={cn(
                              "w-full text-left p-2.5 rounded-md border transition-colors",
                              !selectedProcessoId
                                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                                : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            )}
                            onClick={() => setSelectedProcessoId(null)}
                          >
                            <p className="text-xs text-zinc-500">Sem processo vinculado</p>
                          </button>

                          {processos.map((processo) => (
                            <button
                              key={processo.id}
                              className={cn(
                                "w-full text-left p-2.5 rounded-md border transition-colors",
                                selectedProcessoId === processo.id
                                  ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                                  : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                              )}
                              onClick={() => setSelectedProcessoId(processo.id)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-mono font-medium truncate">
                                    {processo.numeroAutos || "Sem número"}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {processo.assunto && (
                                      <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[200px]">
                                        {processo.assunto}
                                      </span>
                                    )}
                                    {processo.vara && (
                                      <Badge variant="outline" className="text-[10px] py-0">
                                        {processo.vara}
                                      </Badge>
                                    )}
                                    {processo.fase && (
                                      <Badge variant="secondary" className="text-[10px] py-0">
                                        {processo.fase}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {processo.papel && (
                                  <Badge variant="outline" className="text-[10px] shrink-0">
                                    {processo.papel}
                                  </Badge>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3 text-xs text-zinc-500">
                          <Scale className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
                          Nenhum processo vinculado a este assistido
                        </div>
                      )}
                    </>
                  )}

                  {/* Tab: Criar Processo via PDF */}
                  {processoTab === "novo" && (
                    <div className="space-y-3">
                      {/* Dropzone */}
                      {pdfUploadState === "idle" && (
                        <div
                          onDrop={handleDrop}
                          onDragOver={(e) => e.preventDefault()}
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-700 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all"
                        >
                          <Upload className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
                          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            Arraste o PDF aqui ou clique para selecionar
                          </p>
                          <p className="text-[10px] text-zinc-400 mt-1">PDF do processo (max. 20MB)</p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={handleFileSelect}
                          />
                        </div>
                      )}

                      {/* Uploading */}
                      {pdfUploadState === "uploading" && (
                        <div className="flex items-center justify-center py-6 gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                          <span className="text-sm text-zinc-600">Enviando PDF...</span>
                        </div>
                      )}

                      {/* Analyzing */}
                      {pdfUploadState === "analyzing" && (
                        <div className="flex items-center justify-center py-6 gap-2">
                          <Brain className="w-5 h-5 animate-pulse text-purple-600" />
                          <span className="text-sm text-zinc-600">IA analisando processo...</span>
                        </div>
                      )}

                      {/* Error */}
                      {pdfUploadState === "error" && (
                        <div className="rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <p className="text-xs text-red-600">{pdfError || "Erro na extração"}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPdfUploadState("idle");
                              setPdfError("");
                            }}
                          >
                            Tentar novamente
                          </Button>
                        </div>
                      )}

                      {/* Preview: Dados Extraídos */}
                      {pdfUploadState === "ready" && extractedProcesso && (
                        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10 p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3" />
                              Dados Extraídos
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 font-normal">
                                {Math.round(extractionConfianca * 100)}% confiança
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setPdfUploadState("idle");
                                setExtractedProcesso(null);
                                setExtractedAssistido(null);
                                setPdfBase64("");
                                setDeepAnalise(null);
                              }}
                              className="text-zinc-400 hover:text-zinc-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Processo fields */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Processo</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-zinc-400">N.o Autos</label>
                                <Input
                                  value={extractedProcesso.numeroAutos || ""}
                                  onChange={(e) => setExtractedProcesso(prev => prev ? { ...prev, numeroAutos: e.target.value } : prev)}
                                  className="text-xs h-8 font-mono"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-zinc-400">Vara</label>
                                <Input
                                  value={extractedProcesso.vara || ""}
                                  onChange={(e) => setExtractedProcesso(prev => prev ? { ...prev, vara: e.target.value } : prev)}
                                  className="text-xs h-8"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-zinc-400">Comarca</label>
                                <Input
                                  value={extractedProcesso.comarca || ""}
                                  onChange={(e) => setExtractedProcesso(prev => prev ? { ...prev, comarca: e.target.value } : prev)}
                                  className="text-xs h-8"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-zinc-400">Tipo Penal</label>
                                <Input
                                  value={extractedProcesso.tipoPenal || ""}
                                  onChange={(e) => setExtractedProcesso(prev => prev ? { ...prev, tipoPenal: e.target.value } : prev)}
                                  className="text-xs h-8"
                                />
                              </div>
                            </div>

                            {/* Sugestão de atribuição */}
                            {extractedProcesso.atribuicaoSugerida && (
                              <div className="flex items-center gap-2 text-xs">
                                <Sparkles className="w-3 h-3 text-purple-500" />
                                <span className="text-zinc-500">Atribuição sugerida:</span>
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                  getAtribuicaoColors(extractedProcesso.atribuicaoSugerida).bgSolid,
                                  getAtribuicaoColors(extractedProcesso.atribuicaoSugerida).text,
                                )}>
                                  {getAtribuicaoColors(extractedProcesso.atribuicaoSugerida).shortLabel}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Assistido fields (complement data) */}
                          {extractedAssistido && Object.values(extractedAssistido).some(v => v) && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Dados do Assistido (complementar)</p>
                              <div className="grid grid-cols-2 gap-2">
                                {extractedAssistido.cpf && (
                                  <div>
                                    <label className="text-[10px] text-zinc-400">CPF</label>
                                    <Input
                                      value={extractedAssistido.cpf}
                                      onChange={(e) => setExtractedAssistido(prev => prev ? { ...prev, cpf: e.target.value } : prev)}
                                      className="text-xs h-8 font-mono"
                                    />
                                  </div>
                                )}
                                {extractedAssistido.rg && (
                                  <div>
                                    <label className="text-[10px] text-zinc-400">RG</label>
                                    <Input
                                      value={extractedAssistido.rg}
                                      onChange={(e) => setExtractedAssistido(prev => prev ? { ...prev, rg: e.target.value } : prev)}
                                      className="text-xs h-8 font-mono"
                                    />
                                  </div>
                                )}
                                {extractedAssistido.endereco && (
                                  <div className="col-span-2">
                                    <label className="text-[10px] text-zinc-400">Endereço</label>
                                    <Input
                                      value={extractedAssistido.endereco}
                                      onChange={(e) => setExtractedAssistido(prev => prev ? { ...prev, endereco: e.target.value } : prev)}
                                      className="text-xs h-8"
                                    />
                                  </div>
                                )}
                                {(extractedAssistido.nomeMae || extractedAssistido.filiacao) && (
                                  <div className="col-span-2">
                                    <label className="text-[10px] text-zinc-400">Filiação</label>
                                    <Input
                                      value={extractedAssistido.nomeMae || extractedAssistido.filiacao || ""}
                                      onChange={(e) => setExtractedAssistido(prev => prev ? { ...prev, nomeMae: e.target.value, filiacao: e.target.value } : prev)}
                                      className="text-xs h-8"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Deep extraction button */}
                          {!deepAnalise && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                              onClick={handleDeepExtraction}
                              disabled={isDeepExtracting}
                            >
                              {isDeepExtracting ? (
                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Extraindo detalhes...</>
                              ) : (
                                <><Brain className="w-3 h-3 mr-1" /> Extrair mais detalhes</>
                              )}
                            </Button>
                          )}

                          {/* Deep analysis preview */}
                          {deepAnalise && (
                            <div className="space-y-2 border-t border-emerald-200/50 pt-2">
                              <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wide flex items-center gap-1">
                                <Brain className="w-3 h-3" />
                                Análise Profunda
                              </p>
                              {deepAnalise.resumoFatos && (
                                <div className="rounded-md bg-white dark:bg-zinc-900 p-2 text-[11px] text-zinc-600 dark:text-zinc-400 max-h-24 overflow-y-auto">
                                  {deepAnalise.resumoFatos}
                                </div>
                              )}
                              {deepAnalise.pontosAtencao?.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-amber-600 font-medium">Pontos de Atenção:</p>
                                  {deepAnalise.pontosAtencao.map((p: string, i: number) => (
                                    <p key={i} className="text-[10px] text-amber-700 dark:text-amber-400 flex items-start gap-1">
                                      <AlertTriangle className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                                      {p}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Confirm button */}
                          <Button
                            type="button"
                            size="sm"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleConfirmExtraction}
                            disabled={!extractedProcesso.numeroAutos || createProcessoMutation.isPending}
                          >
                            {createProcessoMutation.isPending ? (
                              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Criando processo...</>
                            ) : (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Criar Processo</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Atendimento */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Atendimento
                  </Label>

                  <div className="space-y-2">
                    <button
                      className={cn(
                        "w-full text-left p-3 rounded-md border transition-colors",
                        criarNovoAtendimento
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                          : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                      )}
                      onClick={() => {
                        setCriarNovoAtendimento(true);
                        setSelectedAtendimentoId(null);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium">Criar novo atendimento</span>
                      </div>
                    </button>

                    {criarNovoAtendimento && (
                      <div className="pl-4 space-y-2">
                        <Select value={novoAtendimentoTipo} onValueChange={setNovoAtendimentoTipo}>
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="presencial">Presencial</SelectItem>
                            <SelectItem value="telefone">Telefone</SelectItem>
                            <SelectItem value="videoconferencia">Videoconferência</SelectItem>
                            <SelectItem value="externo">Externo</SelectItem>
                          </SelectContent>
                        </Select>
                        <Textarea
                          placeholder="Descrição do atendimento (opcional)"
                          value={novoAtendimentoDescricao}
                          onChange={(e) => setNovoAtendimentoDescricao(e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Aviso de Drive folder */}
                {selectedAssistido && !selectedAssistido.driveFolderId && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Pasta no Drive será criada automaticamente para este assistido.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleApprove}
            disabled={!selectedAssistidoId || approveMutation.isPending}
          >
            {approveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Aprovando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Aprovar e Vincular
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
