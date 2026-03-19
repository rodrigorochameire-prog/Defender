"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { X, Check, CheckCircle2, XCircle, ChevronDown, Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type AnaliseIA = {
  resumoExecutivo: string;
  impactoPratico: string;
};


type Props = {
  onClose: () => void;
  onUpdate: () => void;
  onOpenReader?: (noticia: { id: number; titulo: string; fonte: string; categoria: string; urlOriginal: string; analiseIa: unknown; resumo: string | null; publicadoEm: string | null; conteudo?: string | null }) => void;
};

export function NoticiasTriagem({ onClose, onUpdate, onOpenReader }: Props) {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { data: pendentes, isLoading } = trpc.noticias.listPendentes.useQuery();
  const { data: fontes = [] } = trpc.noticias.listFontes.useQuery();
  const utils = trpc.useUtils();

  const fonteIdToCorMap = useMemo(
    () => Object.fromEntries(fontes.map(f => [f.id, f.cor ?? "#71717a"])),
    [fontes]
  );
  const fonteIdToNomeMap = useMemo(
    () => Object.fromEntries(fontes.map(f => [f.id, f.nome])),
    [fontes]
  );

  const filteredItems = (pendentes ?? []).filter(item => !removingIds.has(item.id));

  const aprovar = trpc.noticias.aprovar.useMutation({
    onSuccess: () => {
      utils.noticias.listPendentes.invalidate();
      utils.noticias.countPendentes.invalidate();
      onUpdate();
    },
  });

  const descartar = trpc.noticias.descartar.useMutation({
    onSuccess: () => {
      utils.noticias.listPendentes.invalidate();
      utils.noticias.countPendentes.invalidate();
      onUpdate();
    },
  });

  const handleAprovar = useCallback((id: number) => {
    setRemovingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      aprovar.mutate({ ids: [id] });
      setFocusedIndex(prev => Math.min(prev, filteredItems.length - 2));
    }, 200);
  }, [aprovar, filteredItems.length]);

  const handleDescartar = useCallback((id: number) => {
    setRemovingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      descartar.mutate({ ids: [id] });
      setFocusedIndex(prev => Math.min(prev, filteredItems.length - 2));
    }, 200);
  }, [descartar, filteredItems.length]);

  const handleAprovarTodos = useCallback(() => {
    if (!pendentes) return;
    aprovar.mutate({ ids: pendentes.map(p => p.id) });
  }, [pendentes, aprovar]);

  // Navegação por teclado
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      const items = filteredItems;
      if (items.length === 0) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex(i => Math.max(0, i - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex(i => Math.min(items.length - 1, i + 1));
      } else if (e.key === "a" || e.key === "A") {
        if (items[focusedIndex]) handleAprovar(items[focusedIndex].id);
      } else if (e.key === "d" || e.key === "D") {
        if (items[focusedIndex]) handleDescartar(items[focusedIndex].id);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [focusedIndex, filteredItems, handleAprovar, handleDescartar]);

  // Scroll automático ao mudar foco
  useEffect(() => {
    const item = filteredItems[focusedIndex];
    if (item) {
      const el = itemRefs.current.get(item.id);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex, filteredItems]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="h-5 w-32 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex-1 p-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!pendentes || pendentes.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
            Sair da triagem
          </button>
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
          <Badge variant="outline" className="text-zinc-600 dark:text-zinc-400 font-medium">
            {pendentes.length} {pendentes.length === 1 ? "pendente" : "pendentes"}
          </Badge>
          <span className="text-xs text-zinc-400">
            ↑↓ navegar · A aprovar · D descartar
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleAprovarTodos}
          disabled={aprovar.isPending}
          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/30"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Aprovar todos
        </Button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-4 space-y-2">
          {filteredItems.map((item, index) => {
            const corFonte = item.fonteId ? (fonteIdToCorMap[item.fonteId] ?? "#71717a") : "#71717a";
            const nomeFonte = item.fonteId ? (fonteIdToNomeMap[item.fonteId] ?? item.fonte.replace(/-/g, " ")) : item.fonte.replace(/-/g, " ");
            const analise = item.analiseIa as AnaliseIA | null;
            const isFocused = index === focusedIndex;
            const isRemoving = removingIds.has(item.id);

            return (
              <div
                key={item.id}
                ref={el => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
                className={cn(
                  "border rounded-xl overflow-hidden transition-all duration-200",
                  isRemoving ? "opacity-0 scale-95" : "opacity-100 scale-100",
                  isFocused
                    ? "border-zinc-400 dark:border-zinc-500 shadow-sm bg-zinc-50 dark:bg-zinc-800/40"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                {/* Borda lateral colorida */}
                <div className="flex">
                  <div className="w-[3px] shrink-0" style={{ backgroundColor: corFonte }} />

                  <div className="flex-1 min-w-0">
                    {/* Linha colapsada */}
                    <button
                      className="w-full flex flex-col gap-0.5 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                      onClick={() => setFocusedIndex(index)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ color: corFonte, backgroundColor: `${corFonte}18` }}
                          >
                            {nomeFonte}
                          </span>
                          {item.publicadoEm && (
                            <span className="text-[11px] text-zinc-400">
                              {formatDistanceToNow(new Date(item.publicadoEm), { addSuffix: true, locale: ptBR })}
                            </span>
                          )}
                        </div>

                        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate flex-1 min-w-0">
                          {item.titulo}
                        </span>

                        <ChevronDown className={cn(
                          "h-4 w-4 text-zinc-400 shrink-0 transition-transform duration-200",
                          isFocused && "rotate-180"
                        )} />
                      </div>

                      {((analise?.resumoExecutivo) || item.resumo) && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 text-left w-full">
                          {analise?.resumoExecutivo ?? item.resumo}
                        </p>
                      )}
                    </button>

                    {/* Expansão com síntese IA + ações */}
                    {isFocused && (
                      <div className="px-4 pb-4 space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        {/* Síntese IA */}
                        {analise?.resumoExecutivo && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            {analise.resumoExecutivo}
                          </p>
                        )}

                        {/* Impacto prático */}
                        {analise?.impactoPratico && (
                          <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2">
                            <Zap className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                              {analise.impactoPratico}
                            </p>
                          </div>
                        )}

                        {!analise?.resumoExecutivo && !analise?.impactoPratico && (
                          <p className="text-sm text-zinc-400 italic">Sem análise IA disponível</p>
                        )}

                        {/* Ações */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                            onClick={() => handleAprovar(item.id)}
                            disabled={aprovar.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30 gap-1.5"
                            onClick={() => handleDescartar(item.id)}
                            disabled={descartar.isPending}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Descartar
                          </Button>
                          {onOpenReader && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-zinc-500 gap-1.5 ml-auto"
                              onClick={() => { onOpenReader(item as Parameters<typeof onOpenReader>[0]); onClose(); }}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Abrir completo
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
