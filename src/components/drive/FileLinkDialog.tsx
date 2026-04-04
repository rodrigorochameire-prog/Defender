// @ts-nocheck
"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Link2,
  X,
  Plus,
  User,
  Scale,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number;
  fileName: string;
  currentAssistidoId?: number | null;
  currentProcessoId?: number | null;
}

const ATRIBUICOES = [
  { value: "JURI_CAMACARI", label: "Juri Camacari" },
  { value: "VVD_CAMACARI", label: "VVD Camacari" },
  { value: "EXECUCAO_PENAL", label: "Execucao Penal" },
  { value: "SUBSTITUICAO", label: "Substituicao" },
  { value: "SUBSTITUICAO_CIVEL", label: "Substituicao Civel" },
  { value: "GRUPO_JURI", label: "Grupo Juri" },
] as const;

export function FileLinkDialog({
  isOpen,
  onClose,
  fileId,
  fileName,
  currentAssistidoId,
  currentProcessoId,
}: FileLinkDialogProps) {
  // Search states
  const [processoSearch, setProcessoSearch] = useState("");
  const [assistidoSearch, setAssistidoSearch] = useState("");

  // Selected entities
  const [selectedProcessoId, setSelectedProcessoId] = useState<number | null>(currentProcessoId || null);
  const [selectedAssistidoId, setSelectedAssistidoId] = useState<number | null>(currentAssistidoId || null);
  const [selectedProcessoLabel, setSelectedProcessoLabel] = useState<string | null>(null);
  const [selectedAssistidoLabel, setSelectedAssistidoLabel] = useState<string | null>(null);

  // Inline creation form states
  const [showCreateAssistido, setShowCreateAssistido] = useState(false);
  const [showCreateProcesso, setShowCreateProcesso] = useState(false);
  const [newAssistidoNome, setNewAssistidoNome] = useState("");
  const [newAssistidoAtribuicao, setNewAssistidoAtribuicao] = useState("SUBSTITUICAO");
  const [newProcessoNumero, setNewProcessoNumero] = useState("");
  const [newProcessoAtribuicao, setNewProcessoAtribuicao] = useState("SUBSTITUICAO");

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setSelectedProcessoId(currentProcessoId || null);
      setSelectedAssistidoId(currentAssistidoId || null);
      setProcessoSearch("");
      setAssistidoSearch("");
      setShowCreateAssistido(false);
      setShowCreateProcesso(false);
    }
  }, [isOpen, currentProcessoId, currentAssistidoId]);

  // Search queries (debounced via enabled)
  const { data: processoResults, isLoading: processosLoading } = trpc.drive.searchProcessosForLink.useQuery(
    { search: processoSearch },
    { enabled: processoSearch.length >= 2 }
  );

  const { data: assistidoResults, isLoading: assistidosLoading } = trpc.drive.searchAssistidosForLink.useQuery(
    { search: assistidoSearch },
    { enabled: assistidoSearch.length >= 2 }
  );

  // Mutations
  const linkFile = trpc.drive.linkFileToEntity.useMutation({
    onSuccess: () => {
      toast.success("Arquivo vinculado com sucesso");
      onClose();
    },
    onError: (err) => toast.error(`Erro ao vincular: ${err.message}`),
  });

  const unlinkFile = trpc.drive.linkFileToEntity.useMutation({
    onSuccess: () => {
      toast.success("Vinculo removido");
      setSelectedProcessoId(null);
      setSelectedAssistidoId(null);
      setSelectedProcessoLabel(null);
      setSelectedAssistidoLabel(null);
    },
  });

  const createAssistido = trpc.processos.quickCreateAssistido.useMutation({
    onSuccess: (data) => {
      setSelectedAssistidoId(data.id);
      setSelectedAssistidoLabel(data.nome);
      setShowCreateAssistido(false);
      setNewAssistidoNome("");
      toast.success(`Assistido "${data.nome}" criado`);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const createProcesso = trpc.processos.quickCreateProcesso.useMutation({
    onSuccess: (data) => {
      setSelectedProcessoId(data.id);
      setSelectedProcessoLabel(data.numeroAutos);
      setShowCreateProcesso(false);
      setNewProcessoNumero("");
      toast.success(`Processo "${data.numeroAutos}" criado`);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const handleLink = useCallback(() => {
    if (!selectedAssistidoId && !selectedProcessoId) {
      toast.error("Selecione um assistido ou processo");
      return;
    }
    linkFile.mutate({
      fileId,
      assistidoId: selectedAssistidoId || undefined,
      processoId: selectedProcessoId || undefined,
    });
  }, [fileId, selectedAssistidoId, selectedProcessoId, linkFile]);

  const handleUnlink = useCallback(() => {
    unlinkFile.mutate({
      fileId,
      assistidoId: 0,
      processoId: 0,
    });
  }, [fileId, unlinkFile]);

  const handleCreateAssistido = useCallback(() => {
    if (!newAssistidoNome.trim()) return;
    createAssistido.mutate({
      nome: newAssistidoNome.trim(),
      atribuicaoPrimaria: newAssistidoAtribuicao as any,
    });
  }, [newAssistidoNome, newAssistidoAtribuicao, createAssistido]);

  const handleCreateProcesso = useCallback(() => {
    if (!newProcessoNumero.trim() || !selectedAssistidoId) {
      toast.error("Informe o numero e selecione um assistido primeiro");
      return;
    }
    createProcesso.mutate({
      numero: newProcessoNumero.trim(),
      assistidoId: selectedAssistidoId,
      atribuicao: newProcessoAtribuicao as any,
    });
  }, [newProcessoNumero, selectedAssistidoId, newProcessoAtribuicao, createProcesso]);

  const hasCurrentLink = currentAssistidoId || currentProcessoId;
  const isLinking = linkFile.isPending || unlinkFile.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-500" />
            Vincular Arquivo
          </DialogTitle>
          <p className="text-[11px] text-neutral-400 truncate">{fileName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Current link status */}
          {hasCurrentLink && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30">
              <Link2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Vinculado</p>
                {selectedProcessoLabel && (
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/60 truncate">
                    Processo: {selectedProcessoLabel}
                  </p>
                )}
                {selectedAssistidoLabel && (
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/60 truncate">
                    Assistido: {selectedAssistidoLabel}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={handleUnlink}
                disabled={isLinking}
              >
                <Unlink className="w-3 h-3 mr-1" />
                Desvincular
              </Button>
            </div>
          )}

          {/* ── Processo Search ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Processo</span>
            </div>

            {selectedProcessoId && selectedProcessoLabel ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                <Badge variant="outline" className="text-[10px] h-5 bg-violet-50 dark:bg-violet-900/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/30">
                  <Scale className="w-2.5 h-2.5 mr-1" />
                  {selectedProcessoLabel}
                </Badge>
                <button
                  onClick={() => { setSelectedProcessoId(null); setSelectedProcessoLabel(null); }}
                  className="ml-auto p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  <X className="w-3 h-3 text-neutral-400" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <Input
                    value={processoSearch}
                    onChange={(e) => setProcessoSearch(e.target.value)}
                    placeholder="Buscar por numero ou nome..."
                    className="pl-8 h-8 text-xs"
                  />
                  {processosLoading && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-neutral-400" />
                  )}
                </div>

                {/* Results */}
                {processoResults && processoResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-800">
                    {processoResults.map((p: any) => (
                      <button
                        key={p.id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                        onClick={() => {
                          setSelectedProcessoId(p.id);
                          setSelectedProcessoLabel(p.numero);
                          if (p.assistidoId) {
                            setSelectedAssistidoId(p.assistidoId);
                            setSelectedAssistidoLabel(p.assistidoNome || null);
                          }
                          setProcessoSearch("");
                        }}
                      >
                        <Scale className="w-3 h-3 text-violet-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 truncate">{p.numero}</p>
                          {p.assistidoNome && (
                            <p className="text-[10px] text-neutral-400 truncate">{p.assistidoNome}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {processoSearch.length >= 2 && processoResults?.length === 0 && !processosLoading && (
                  <p className="text-[10px] text-neutral-400 text-center py-2">Nenhum processo encontrado</p>
                )}

                {/* Quick create processo */}
                <button
                  onClick={() => setShowCreateProcesso(!showCreateProcesso)}
                  className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Criar novo processo
                  {showCreateProcesso ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                </button>

                {showCreateProcesso && (
                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700 space-y-2">
                    <Input
                      value={newProcessoNumero}
                      onChange={(e) => setNewProcessoNumero(e.target.value)}
                      placeholder="Numero do processo (ex: 0001234-56.2024.8.05.0100)"
                      className="h-8 text-xs font-mono"
                    />
                    <Select value={newProcessoAtribuicao} onValueChange={setNewProcessoAtribuicao}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Atribuicao" />
                      </SelectTrigger>
                      <SelectContent>
                        {ATRIBUICOES.map((a) => (
                          <SelectItem key={a.value} value={a.value} className="text-xs">
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedAssistidoId && (
                      <p className="text-[10px] text-amber-500">Selecione um assistido primeiro</p>
                    )}
                    <Button
                      size="sm"
                      className="h-7 text-xs w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handleCreateProcesso}
                      disabled={!newProcessoNumero.trim() || !selectedAssistidoId || createProcesso.isPending}
                    >
                      {createProcesso.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Plus className="w-3 h-3 mr-1" />
                      )}
                      Criar e vincular
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-100 dark:border-neutral-800" />

          {/* ── Assistido Search ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Assistido</span>
            </div>

            {selectedAssistidoId && selectedAssistidoLabel ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
                <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/30">
                  <User className="w-2.5 h-2.5 mr-1" />
                  {selectedAssistidoLabel}
                </Badge>
                <button
                  onClick={() => { setSelectedAssistidoId(null); setSelectedAssistidoLabel(null); }}
                  className="ml-auto p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  <X className="w-3 h-3 text-neutral-400" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <Input
                    value={assistidoSearch}
                    onChange={(e) => setAssistidoSearch(e.target.value)}
                    placeholder="Buscar por nome ou CPF..."
                    className="pl-8 h-8 text-xs"
                  />
                  {assistidosLoading && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-neutral-400" />
                  )}
                </div>

                {/* Results */}
                {assistidoResults && assistidoResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto rounded-md border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-100 dark:divide-neutral-800">
                    {assistidoResults.map((a: any) => (
                      <button
                        key={a.id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                        onClick={() => {
                          setSelectedAssistidoId(a.id);
                          setSelectedAssistidoLabel(a.nome);
                          setAssistidoSearch("");
                        }}
                      >
                        <User className="w-3 h-3 text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-neutral-700 dark:text-neutral-300 truncate">{a.nome}</p>
                          {a.cpf && (
                            <p className="text-[10px] text-neutral-400 font-mono">{a.cpf}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {assistidoSearch.length >= 2 && assistidoResults?.length === 0 && !assistidosLoading && (
                  <p className="text-[10px] text-neutral-400 text-center py-2">Nenhum assistido encontrado</p>
                )}

                {/* Quick create assistido */}
                <button
                  onClick={() => setShowCreateAssistido(!showCreateAssistido)}
                  className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Criar novo assistido
                  {showCreateAssistido ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                </button>

                {showCreateAssistido && (
                  <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/30 border border-neutral-200 dark:border-neutral-700 space-y-2">
                    <Input
                      value={newAssistidoNome}
                      onChange={(e) => setNewAssistidoNome(e.target.value)}
                      placeholder="Nome do assistido"
                      className="h-8 text-xs"
                    />
                    <Select value={newAssistidoAtribuicao} onValueChange={setNewAssistidoAtribuicao}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Atribuicao" />
                      </SelectTrigger>
                      <SelectContent>
                        {ATRIBUICOES.map((a) => (
                          <SelectItem key={a.value} value={a.value} className="text-xs">
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-7 text-xs w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handleCreateAssistido}
                      disabled={!newAssistidoNome.trim() || createAssistido.isPending}
                    >
                      {createAssistido.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <Plus className="w-3 h-3 mr-1" />
                      )}
                      Criar e vincular
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer: Vincular button */}
        <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>
            Cancelar
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleLink}
            disabled={(!selectedAssistidoId && !selectedProcessoId) || isLinking}
          >
            {isLinking ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Link2 className="w-3 h-3 mr-1" />
            )}
            Vincular
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
