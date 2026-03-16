"use client";

import { useState, useCallback } from "react";
import { X, Check, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

const FONTE_CORES: Record<string, string> = {
  "conjur": "#dc2626",
  "stj-notícias": "#1d4ed8",
  "ibccrim": "#7c3aed",
  "dizer-o-direito": "#059669",
};

type Props = {
  onClose: () => void;
  onUpdate: () => void;
};

export function NoticiasTriagem({ onClose, onUpdate }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const { data: pendentes, isLoading } = trpc.noticias.listPendentes.useQuery();
  const utils = trpc.useUtils();

  const aprovar = trpc.noticias.aprovar.useMutation({
    onSuccess: () => {
      utils.noticias.listPendentes.invalidate();
      onUpdate();
    },
  });

  const descartar = trpc.noticias.descartar.useMutation({
    onSuccess: () => {
      utils.noticias.listPendentes.invalidate();
      onUpdate();
    },
  });

  const updateCategoria = trpc.noticias.updateCategoria.useMutation({
    onSuccess: () => {
      utils.noticias.listPendentes.invalidate();
    },
  });

  const toggleSelected = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (!pendentes) return;
    if (selected.size === pendentes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendentes.map((p) => p.id)));
    }
  }, [pendentes, selected.size]);

  const handleAprovarSelected = useCallback(() => {
    if (selected.size === 0) return;
    aprovar.mutate({ ids: Array.from(selected) });
    setSelected(new Set());
  }, [selected, aprovar]);

  const handleDescartarSelected = useCallback(() => {
    if (selected.size === 0) return;
    descartar.mutate({ ids: Array.from(selected) });
    setSelected(new Set());
  }, [selected, descartar]);

  const handleAprovarTodos = useCallback(() => {
    if (!pendentes) return;
    aprovar.mutate({ ids: pendentes.map((p) => p.id) });
    setSelected(new Set());
  }, [pendentes, aprovar]);

  const handleDescartarTodos = useCallback(() => {
    if (!pendentes) return;
    descartar.mutate({ ids: pendentes.map((p) => p.id) });
    setSelected(new Set());
  }, [pendentes, descartar]);

  const formatDate = (date: string | Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <div className="border-b bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!pendentes || pendentes.length === 0) return null;

  return (
    <div className="border-b bg-amber-50/50 dark:bg-amber-900/10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-amber-200/50 dark:border-amber-800/30">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">Triagem</h3>
          <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-300">
            {pendentes.length} pendentes
          </Badge>
          {selected.size > 0 && (
            <span className="text-xs text-zinc-500">
              {selected.size} selecionados
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <>
              <Button size="sm" variant="outline" onClick={handleAprovarSelected} className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                <Check className="h-3.5 w-3.5 mr-1" />
                Aprovar ({selected.size})
              </Button>
              <Button size="sm" variant="outline" onClick={handleDescartarSelected} className="text-red-600 border-red-300 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Descartar ({selected.size})
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleAprovarTodos} className="text-emerald-600 border-emerald-300 hover:bg-emerald-50">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Aprovar Todos
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDescartarTodos} className="text-red-500 hover:text-red-700">
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Descartar Todos
              </Button>
            </>
          )}
          <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Items */}
      <div className="max-h-80 overflow-y-auto divide-y divide-amber-100 dark:divide-amber-900/20">
        {/* Select all */}
        <div className="px-6 py-2 flex items-center gap-2">
          <Checkbox
            checked={selected.size === pendentes.length}
            onCheckedChange={toggleAll}
          />
          <span className="text-xs text-zinc-500">Selecionar todos</span>
        </div>

        {pendentes.map((item) => {
          const fonteColor = FONTE_CORES[item.fonte] || "#71717a";

          return (
            <div
              key={item.id}
              className={cn(
                "px-6 py-2.5 flex items-center gap-3 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors",
                selected.has(item.id) && "bg-amber-100/50 dark:bg-amber-900/30"
              )}
            >
              <Checkbox
                checked={selected.has(item.id)}
                onCheckedChange={() => toggleSelected(item.id)}
              />

              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded text-white shrink-0"
                style={{ backgroundColor: fonteColor }}
              >
                {item.fonte}
              </span>

              <span className="text-sm font-medium truncate flex-1 min-w-0">
                {item.titulo}
              </span>

              <Select
                value={item.categoria}
                onValueChange={(val) =>
                  updateCategoria.mutate({
                    id: item.id,
                    categoria: val as "legislativa" | "jurisprudencial" | "artigo",
                  })
                }
              >
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="legislativa">Legislativa</SelectItem>
                  <SelectItem value="jurisprudencial">Jurisprudencial</SelectItem>
                  <SelectItem value="artigo">Artigo</SelectItem>
                </SelectContent>
              </Select>

              <span className="text-xs text-zinc-400 shrink-0 w-14 text-right">
                {formatDate(item.scrapeadoEm)}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                  onClick={() => aprovar.mutate({ ids: [item.id] })}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-100"
                  onClick={() => descartar.mutate({ ids: [item.id] })}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
