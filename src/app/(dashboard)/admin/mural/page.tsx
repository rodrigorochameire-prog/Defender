"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Pin,
  PinOff,
  Send,
  Trash2,
  Pencil,
  Loader2,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ============================================
// HELPERS
// ============================================

function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `ha ${diffMin}min`;
  if (diffH < 24) return `ha ${diffH}h`;
  if (diffD < 7) return `ha ${diffD} dia${diffD > 1 ? "s" : ""}`;
  return format(d, "dd/MM", { locale: ptBR });
}

// ============================================
// NOTE CARD
// ============================================

function NotaCard({
  nota,
  currentUserId,
  onPin,
  onDelete,
}: {
  nota: {
    id: number;
    mensagem: string;
    fixado: boolean;
    createdAt: Date | string;
    autor: { id: number; name: string | null; email: string | null; role: string | null } | null;
  };
  currentUserId?: number;
  onPin: (id: number, fixado: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const isOwner = currentUserId === nota.autor?.id;
  const autorNome = nota.autor?.name || nota.autor?.email || "Desconhecido";
  const iniciais = getInitials(autorNome);

  return (
    <Card className={cn(
      "bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800/80 rounded-xl overflow-hidden transition-all duration-200",
      "hover:border-emerald-200/50 dark:hover:border-emerald-800/30",
      nota.fixado && "ring-1 ring-amber-200 dark:ring-amber-800/50"
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                {iniciais}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{autorNome}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-neutral-400">{formatTimeAgo(nota.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPin(nota.id, !nota.fixado)}
              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title={nota.fixado ? "Desfixar" : "Fixar"}
            >
              {nota.fixado
                ? <PinOff className="w-3.5 h-3.5 text-amber-500" />
                : <Pin className="w-3.5 h-3.5 text-neutral-400 hover:text-amber-500" />
              }
            </button>
            {isOwner && (
              <button
                onClick={() => onDelete(nota.id)}
                className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors cursor-pointer"
                title="Excluir"
              >
                <Trash2 className="w-3.5 h-3.5 text-neutral-400 hover:text-rose-500" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
          {nota.mensagem}
        </p>
      </div>
    </Card>
  );
}

// ============================================
// PAGE
// ============================================

export default function MuralPage() {
  const [novoPost, setNovoPost] = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: notas, isLoading } = trpc.mural.listarNotas.useQuery();

  // Mutations
  const criarNota = trpc.mural.criarNota.useMutation({
    onSuccess: () => {
      setNovoPost("");
      utils.mural.listarNotas.invalidate();
      toast.success("Nota publicada no mural");
    },
    onError: (err) => toast.error("Erro ao publicar", { description: err.message }),
  });

  const fixarNota = trpc.mural.fixarNota.useMutation({
    onSuccess: (updated) => {
      utils.mural.listarNotas.invalidate();
      toast.success(updated.fixado ? "Nota fixada" : "Nota desfixada");
    },
    onError: (err) => toast.error("Erro ao fixar", { description: err.message }),
  });

  const excluirNota = trpc.mural.excluirNota.useMutation({
    onSuccess: () => {
      utils.mural.listarNotas.invalidate();
      toast.success("Nota excluida");
    },
    onError: (err) => toast.error("Erro ao excluir", { description: err.message }),
  });

  // Derived data
  const pinnedNotas = (notas ?? []).filter(n => n.fixado);
  const recentNotas = (notas ?? []).filter(n => !n.fixado);

  // Get current user ID from first nota's perspective (simple heuristic)
  // TODO: get from auth context directly
  const currentUserId = notas?.[0]?.autor?.id;

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center shadow-lg">
              <MessageSquare className="w-5 h-5 text-white dark:text-neutral-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight font-serif">Mural da Equipe</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Notas, avisos e comunicados</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        {/* Novo Post */}
        <Card className="bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="O que deseja compartilhar com a equipe?"
              value={novoPost}
              onChange={(e) => setNovoPost(e.target.value)}
              rows={2}
              className="flex-1 text-sm bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 resize-none focus:ring-emerald-500/20 focus:border-emerald-300 dark:focus:border-emerald-700"
            />
            <Button
              size="sm"
              className="h-auto px-3 bg-neutral-900 hover:bg-emerald-600 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-emerald-500 text-white cursor-pointer"
              disabled={!novoPost.trim() || criarNota.isPending}
              onClick={() => {
                if (novoPost.trim()) {
                  criarNota.mutate({ mensagem: novoPost.trim() });
                }
              }}
            >
              {criarNota.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />
              }
            </Button>
          </div>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (notas ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <StickyNote className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Nenhuma nota no mural</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Seja o primeiro a publicar algo para a equipe</p>
          </div>
        )}

        {/* Fixados */}
        {pinnedNotas.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Fixados</p>
            <div className="space-y-3">
              {pinnedNotas.map(nota => (
                <NotaCard
                  key={nota.id}
                  nota={nota}
                  currentUserId={currentUserId}
                  onPin={(id, fixado) => fixarNota.mutate({ id, fixado })}
                  onDelete={(id) => excluirNota.mutate({ id })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recentes */}
        {recentNotas.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Recentes</p>
            <div className="space-y-3">
              {recentNotas.map(nota => (
                <NotaCard
                  key={nota.id}
                  nota={nota}
                  currentUserId={currentUserId}
                  onPin={(id, fixado) => fixarNota.mutate({ id, fixado })}
                  onDelete={(id) => excluirNota.mutate({ id })}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
