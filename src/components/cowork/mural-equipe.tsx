"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pin,
  Send,
  MoreHorizontal,
  Pencil,
  Trash2,
  PinOff,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

// ==========================================
// HELPERS
// ==========================================

/** Retorna tempo relativo em português */
function tempoRelativo(data: Date | string): string {
  const agora = new Date();
  const d = typeof data === "string" ? new Date(data) : data;
  const diffMs = agora.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `ha ${diffMin}m`;
  if (diffH < 24) return `ha ${diffH}h`;
  if (diffD < 30) return `ha ${diffD}d`;
  return d.toLocaleDateString("pt-BR");
}

/** Extrai iniciais do nome */
function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

// ==========================================
// TIPOS
// ==========================================

interface MuralEquipeProps {
  className?: string;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function MuralEquipe({ className }: MuralEquipeProps) {
  const [novaMensagem, setNovaMensagem] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editandoTexto, setEditandoTexto] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ==========================================
  // QUERIES E MUTATIONS
  // ==========================================

  const { data: currentUser } = trpc.users.me.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const { data: notas = [], isLoading } = trpc.mural.listarNotas.useQuery(undefined, {
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  const utils = trpc.useUtils();

  const criarNota = trpc.mural.criarNota.useMutation({
    onSuccess: () => {
      utils.mural.listarNotas.invalidate();
      setNovaMensagem("");
      toast.success("Nota adicionada ao mural");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar nota");
    },
  });

  const editarNota = trpc.mural.editarNota.useMutation({
    onSuccess: () => {
      utils.mural.listarNotas.invalidate();
      setEditandoId(null);
      setEditandoTexto("");
      toast.success("Nota atualizada");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao editar nota");
    },
  });

  const excluirNota = trpc.mural.excluirNota.useMutation({
    onSuccess: () => {
      utils.mural.listarNotas.invalidate();
      toast.success("Nota removida");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao excluir nota");
    },
  });

  const fixarNota = trpc.mural.fixarNota.useMutation({
    onSuccess: (data) => {
      utils.mural.listarNotas.invalidate();
      toast.success(data.fixado ? "Nota fixada" : "Nota desafixada");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao fixar nota");
    },
  });

  // ==========================================
  // HANDLERS
  // ==========================================

  function handleEnviar() {
    const msg = novaMensagem.trim();
    if (!msg) return;
    criarNota.mutate({ mensagem: msg });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+Enter ou Cmd+Enter para enviar
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleEnviar();
    }
  }

  function handleIniciarEdicao(id: number, mensagem: string) {
    setEditandoId(id);
    setEditandoTexto(mensagem);
  }

  function handleSalvarEdicao() {
    if (!editandoId) return;
    const msg = editandoTexto.trim();
    if (!msg) return;
    editarNota.mutate({ id: editandoId, mensagem: msg });
  }

  function handleCancelarEdicao() {
    setEditandoId(null);
    setEditandoTexto("");
  }

  // ==========================================
  // RENDER
  // ==========================================

  const userId = currentUser?.id;

  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <Pin className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Mural da Equipe
        </h3>
        <span className="ml-auto text-xs text-zinc-400">
          {notas.length} {notas.length === 1 ? "nota" : "notas"}
        </span>
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            placeholder="Nova nota..."
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-sm min-h-[60px]"
          />
          <Button
            size="icon"
            onClick={handleEnviar}
            disabled={!novaMensagem.trim() || criarNota.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 h-9 w-9"
          >
            {criarNota.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-zinc-400 mt-1">
          Ctrl+Enter para enviar
        </p>
      </div>

      {/* Notes feed */}
      <ScrollArea className="flex-1 max-h-[400px]">
        <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
            </div>
          )}

          {!isLoading && notas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma nota no mural</p>
              <p className="text-xs mt-1">Seja o primeiro a compartilhar algo!</p>
            </div>
          )}

          {notas.map((nota) => {
            const isAutor = nota.autorId === userId;
            const isEditing = editandoId === nota.id;

            return (
              <div
                key={nota.id}
                className={cn(
                  "px-4 py-3 transition-colors",
                  nota.fixado && "bg-amber-50/50 dark:bg-amber-950/10"
                )}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-600 text-zinc-600 dark:text-zinc-300 text-[10px] font-medium">
                      {iniciais(nota.autor?.name || "?")}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {nota.fixado && (
                        <Pin className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {nota.autor?.name || "Desconhecido"}
                      </span>
                      <span className="text-xs text-zinc-400 shrink-0">
                        {tempoRelativo(nota.createdAt)}
                      </span>

                      {/* Menu de ações (apenas para o autor) */}
                      {isAutor && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-auto shrink-0 text-zinc-400 hover:text-zinc-600"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={() => handleIniciarEdicao(nota.id, nota.mensagem)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                fixarNota.mutate({
                                  id: nota.id,
                                  fixado: !nota.fixado,
                                })
                              }
                            >
                              {nota.fixado ? (
                                <>
                                  <PinOff className="h-3.5 w-3.5 mr-2" />
                                  Desafixar
                                </>
                              ) : (
                                <>
                                  <Pin className="h-3.5 w-3.5 mr-2" />
                                  Fixar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => excluirNota.mutate({ id: nota.id })}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {/* Pin/Unpin for non-authors */}
                      {!isAutor && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto shrink-0 text-zinc-400 hover:text-zinc-600"
                          onClick={() =>
                            fixarNota.mutate({
                              id: nota.id,
                              fixado: !nota.fixado,
                            })
                          }
                          title={nota.fixado ? "Desafixar" : "Fixar"}
                        >
                          {nota.fixado ? (
                            <PinOff className="h-3 w-3" />
                          ) : (
                            <Pin className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Message body or edit form */}
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editandoTexto}
                          onChange={(e) => setEditandoTexto(e.target.value)}
                          rows={2}
                          className="resize-none bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelarEdicao}
                            className="h-7 text-xs"
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSalvarEdicao}
                            disabled={!editandoTexto.trim() || editarNota.isPending}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            {editarNota.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : null}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 whitespace-pre-wrap break-words">
                        {nota.mensagem}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
