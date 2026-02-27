"use client";

import { useState, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Tipos de interlocutor
const INTERLOCUTOR_TYPES = [
  { value: "assistido", label: "Assistido(a)" },
  { value: "testemunha", label: "Testemunha" },
  { value: "familiar", label: "Familiar" },
  { value: "vitima", label: "Vítima" },
  { value: "perito", label: "Perito" },
  { value: "outro", label: "Outro" },
] as const;

interface PlaudApprovalModalProps {
  recordingId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}

export function PlaudApprovalModal({
  recordingId,
  open,
  onOpenChange,
  onApproved,
}: PlaudApprovalModalProps) {
  // State
  const [interlocutorTipo, setInterlocutorTipo] = useState<string>("assistido");
  const [interlocutorObs, setInterlocutorObs] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssistidoId, setSelectedAssistidoId] = useState<number | null>(null);
  const [selectedProcessoId, setSelectedProcessoId] = useState<number | null>(null);
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<number | null>(null);
  const [criarNovoAtendimento, setCriarNovoAtendimento] = useState(false);
  const [novoAtendimentoTipo, setNovoAtendimentoTipo] = useState("presencial");
  const [novoAtendimentoDescricao, setNovoAtendimentoDescricao] = useState("");

  // Queries
  const { data: recordings } = trpc.atendimentos.pendingRecordings.useQuery();
  const recording = useMemo(
    () => recordings?.find((r) => r.id === recordingId),
    [recordings, recordingId]
  );

  const { data: searchResults, isLoading: isSearching } = trpc.search.local.useQuery(
    { query: searchQuery, limit: 10 },
    { enabled: searchQuery.length >= 2 }
  );

  const { data: processos, isLoading: isLoadingProcessos } =
    trpc.atendimentos.processosByAssistido.useQuery(
      { assistidoId: selectedAssistidoId! },
      { enabled: !!selectedAssistidoId }
    );

  // Mutations
  const approveMutation = trpc.atendimentos.approveRecording.useMutation({
    onSuccess: () => {
      toast.success("Gravação aprovada e vinculada com sucesso!");
      onApproved();
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });

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
    setCriarNovoAtendimento(true); // Default: criar novo atendimento
  };

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

        <ScrollArea className="flex-1 pr-4 -mr-4">
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

              {/* Tabs: Transcrição / Resumo */}
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

            {/* ====== SEÇÃO 2: Tipo de Interlocutor ====== */}
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
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>

                  {/* Resultados da busca */}
                  {searchQuery.length >= 2 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {isSearching ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-xs text-zinc-500">Buscando...</span>
                        </div>
                      ) : searchResults?.assistidos && searchResults.assistidos.length > 0 ? (
                        searchResults.assistidos.map((assistido: { id: number; nome: string; cpf?: string | null }) => (
                          <button
                            key={assistido.id}
                            className="w-full flex items-center gap-3 p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-left border-b last:border-b-0 transition-colors"
                            onClick={() => selectAssistido(assistido.id)}
                          >
                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                              <User className="h-4 w-4 text-zinc-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{assistido.nome}</p>
                              {assistido.cpf && (
                                <p className="text-xs text-zinc-500 font-mono">
                                  {assistido.cpf}
                                </p>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-zinc-500">
                          Nenhum assistido encontrado
                        </div>
                      )}
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
                    Processo (opcional)
                  </Label>

                  {isLoadingProcessos ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs text-zinc-500">Carregando processos...</span>
                    </div>
                  ) : processos && processos.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {/* Opção sem processo */}
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
        </ScrollArea>

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
