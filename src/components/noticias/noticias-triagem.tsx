"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { X, Check, XCircle, CheckCircle2, ExternalLink, Zap, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
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

const CATEGORIA_LABEL: Record<string, string> = {
  jurisprudencial: "Jurisprudencial",
  legislativa: "Legislativa",
  artigo: "Artigo",
  radar: "Radar Criminal",
  institucional: "Institucional",
};

const CATEGORIA_ORDER = ["radar", "jurisprudencial", "legislativa", "institucional", "artigo"];

export function NoticiasTriagem({ onClose, onUpdate, onOpenReader }: Props) {
  const [focusedId, setFocusedId] = useState<number | null>(null);
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

  const filteredItems = useMemo(
    () => (pendentes ?? []).filter(item => !removingIds.has(item.id)),
    [pendentes, removingIds]
  );

  // Flat list for keyboard navigation
  const flatList = useMemo(() => {
    return CATEGORIA_ORDER.flatMap(cat =>
      filteredItems.filter(item => item.categoria === cat)
    ).concat(filteredItems.filter(item => !CATEGORIA_ORDER.includes(item.categoria)));
  }, [filteredItems]);

  const focusedIndex = useMemo(() => {
    if (focusedId === null) return 0;
    const idx = flatList.findIndex(i => i.id === focusedId);
    return idx >= 0 ? idx : 0;
  }, [focusedId, flatList]);

  // Grouped by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredItems>();
    for (const cat of CATEGORIA_ORDER) {
      const items = filteredItems.filter(i => i.categoria === cat);
      if (items.length > 0) map.set(cat, items);
    }
    // Other categories
    const others = filteredItems.filter(i => !CATEGORIA_ORDER.includes(i.categoria));
    if (others.length > 0) map.set("outros", others);
    return map;
  }, [filteredItems]);

  const invalidate = useCallback(() => {
    utils.noticias.listPendentes.invalidate();
    utils.noticias.countPendentes.invalidate();
    utils.noticias.listRecentes.invalidate();
    onUpdate();
  }, [utils, onUpdate]);

  const aprovar = trpc.noticias.aprovar.useMutation({ onSuccess: invalidate });
  const descartar = trpc.noticias.descartar.useMutation({ onSuccess: invalidate });
  const descartarAntigos = trpc.noticias.descartarAntigos.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.descartados} itens antigos removidos`);
      invalidate();
    },
  });

  const handleAprovar = useCallback((id: number, categoria: string) => {
    setRemovingIds(prev => new Set(prev).add(id));
    const label = CATEGORIA_LABEL[categoria] ?? categoria;
    setTimeout(() => {
      aprovar.mutate({ ids: [id] });
      toast.success(`Aprovado → ${label}`);
    }, 180);
  }, [aprovar]);

  const handleDescartar = useCallback((id: number) => {
    setRemovingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      descartar.mutate({ ids: [id] });
    }, 180);
  }, [descartar]);

  const handleAprovarGrupo = useCallback((items: typeof filteredItems) => {
    const ids = items.map(i => i.id);
    ids.forEach(id => setRemovingIds(prev => new Set(prev).add(id)));
    const cat = items[0]?.categoria ?? "";
    const label = CATEGORIA_LABEL[cat] ?? cat;
    setTimeout(() => {
      aprovar.mutate({ ids });
      toast.success(`${ids.length} aprovados → ${label}`);
    }, 180);
  }, [aprovar]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (flatList.length === 0) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(0, focusedIndex - 1);
        setFocusedId(flatList[prev]?.id ?? null);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(flatList.length - 1, focusedIndex + 1);
        setFocusedId(flatList[next]?.id ?? null);
      } else if (e.key === "a" || e.key === "A") {
        const item = flatList[focusedIndex];
        if (item) handleAprovar(item.id, item.categoria);
      } else if (e.key === "d" || e.key === "D") {
        const item = flatList[focusedIndex];
        if (item) handleDescartar(item.id);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [focusedIndex, flatList, handleAprovar, handleDescartar]);

  // Auto-scroll focused item
  useEffect(() => {
    const item = flatList[focusedIndex];
    if (item) {
      itemRefs.current.get(item.id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex, flatList]);

  // Set initial focus
  useEffect(() => {
    if (flatList.length > 0 && focusedId === null) {
      setFocusedId(flatList[0].id);
    }
  }, [flatList, focusedId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <div className="h-5 w-32 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="flex-1 p-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!pendentes || pendentes.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-900 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-3.5 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
            Fechar
          </button>
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
          <Badge variant="outline" className="text-zinc-600 dark:text-zinc-400 font-medium">
            {filteredItems.length} {filteredItems.length === 1 ? "pendente" : "pendentes"}
          </Badge>
          <span className="text-xs text-zinc-400 hidden sm:block">
            ↑↓ navegar · A aprovar · D descartar
          </span>
        </div>

        <button
          onClick={() => {
            if (confirm("Descartar todos os itens pendentes com mais de 60 dias?")) {
              descartarAntigos.mutate({ diasLimite: 60 });
            }
          }}
          disabled={descartarAntigos.isPending}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
          title="Descartar itens pendentes com mais de 60 dias"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Limpar antigos</span>
        </button>
      </div>

      {/* Feed agrupado por categoria */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
          {Array.from(grouped.entries()).map(([cat, items]) => {
            const label = CATEGORIA_LABEL[cat] ?? cat;
            return (
              <div key={cat}>
                {/* Cabeçalho do grupo */}
                <div className="flex items-center gap-3 mb-2 px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                    {label}
                  </span>
                  <span className="text-[11px] text-zinc-300 dark:text-zinc-600">{items.length}</span>
                  <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                  <button
                    onClick={() => handleAprovarGrupo(items)}
                    disabled={aprovar.isPending}
                    className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Aprovar todos
                  </button>
                </div>

                {/* Itens do grupo */}
                <div className="space-y-0">
                  {items.map((item) => {
                    const corFonte = item.fonteId ? (fonteIdToCorMap[item.fonteId] ?? "#71717a") : "#71717a";
                    const nomeFonte = item.fonteId ? (fonteIdToNomeMap[item.fonteId] ?? item.fonte.replace(/-/g, " ")) : item.fonte.replace(/-/g, " ");
                    const analise = item.analiseIa as AnaliseIA | null;
                    const isFocused = item.id === focusedId;
                    const isRemoving = removingIds.has(item.id);
                    const resumo = analise?.resumoExecutivo ?? item.resumo;

                    return (
                      <div
                        key={item.id}
                        ref={el => {
                          if (el) itemRefs.current.set(item.id, el);
                          else itemRefs.current.delete(item.id);
                        }}
                        className={cn(
                          "border-b border-zinc-100 dark:border-zinc-800 px-3 py-3 transition-all duration-200 cursor-pointer",
                          isRemoving ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0",
                          isFocused
                            ? "bg-zinc-50 dark:bg-zinc-800/40 border-l-2 border-l-emerald-500 pl-[10px]"
                            : "hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20"
                        )}
                        onClick={() => setFocusedId(item.id)}
                      >
                        {/* Meta */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: corFonte }} />
                          <span className="text-[11px] text-zinc-400 font-medium">{nomeFonte}</span>
                          {item.publicadoEm && (
                            <>
                              <span className="text-zinc-200 dark:text-zinc-700">·</span>
                              <span className="text-[11px] text-zinc-400">
                                {formatDistanceToNow(new Date(item.publicadoEm), { addSuffix: true, locale: ptBR })}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Título (sem truncate) */}
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug mb-1.5">
                          {item.titulo}
                        </p>

                        {/* Resumo sempre visível */}
                        {resumo && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-2">
                            {resumo}
                          </p>
                        )}

                        {/* Impacto prático */}
                        {analise?.impactoPratico && (
                          <div className="flex items-start gap-1.5 mb-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-2">
                            <Zap className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                              {analise.impactoPratico}
                            </p>
                          </div>
                        )}

                        {/* Ações */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={e => { e.stopPropagation(); handleAprovar(item.id, item.categoria); }}
                            disabled={aprovar.isPending}
                            className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium transition-colors disabled:opacity-50 px-2 py-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            <Check className="h-3 w-3" />
                            Aprovar
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDescartar(item.id); }}
                            disabled={descartar.isPending}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 font-medium transition-colors disabled:opacity-50 px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <XCircle className="h-3 w-3" />
                            Descartar
                          </button>
                          {onOpenReader && (
                            <button
                              onClick={e => { e.stopPropagation(); onOpenReader(item as Parameters<typeof onOpenReader>[0]); onClose(); }}
                              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors ml-auto px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver completo
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
