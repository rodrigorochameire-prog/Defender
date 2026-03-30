"use client";

import { useMemo, useState } from "react";
import {
  Bookmark,
  Highlighter,
  Star,
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { LEGISLACOES } from "@/config/legislacao";

// ==========================================
// DESTAQUES SHEET - Painel "Meus Destaques"
// ==========================================

interface DestaquesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (leiId: string, artigoId: string) => void;
}

type FilterTab = "todos" | "highlight" | "note" | "favorite";

const leiMap = new Map(LEGISLACOES.map((l) => [l.id, l]));

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: "bg-yellow-300",
  green: "bg-green-300",
  blue: "bg-blue-300",
  pink: "bg-pink-300",
  purple: "bg-purple-300",
};

function getTipoIcon(tipo: string, cor: string | null) {
  switch (tipo) {
    case "highlight":
      return (
        <span
          className={cn(
            "inline-block h-3 w-3 rounded-full shrink-0",
            cor && HIGHLIGHT_COLORS[cor] ? HIGHLIGHT_COLORS[cor] : "bg-yellow-300"
          )}
        />
      );
    case "favorite":
      return <Star className="h-3.5 w-3.5 shrink-0 text-amber-500 fill-amber-500" />;
    case "note":
      return <StickyNote className="h-3.5 w-3.5 shrink-0 text-blue-500" />;
    default:
      return <Highlighter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  }
}

function getPreview(item: {
  tipo: string;
  conteudo: string | null;
  textoSelecionado: string | null;
}) {
  if (item.tipo === "note" && item.conteudo) return item.conteudo;
  if (item.textoSelecionado) return item.textoSelecionado;
  return item.conteudo ?? "";
}

export function DestaquesSheet({
  open,
  onOpenChange,
  onNavigate,
}: DestaquesSheetProps) {
  const [filter, setFilter] = useState<FilterTab>("todos");

  const { data: destaques, isLoading } =
    trpc.legislacao.listDestaques.useQuery(undefined, { enabled: open });

  const deleteMutation = trpc.legislacao.deleteDestaque.useMutation();
  const utils = trpc.useUtils();

  function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          utils.legislacao.listDestaques.invalidate();
        },
      }
    );
  }

  const filtered = useMemo(() => {
    if (!destaques) return [];
    if (filter === "todos") return destaques;
    return destaques.filter((d) => d.tipo === filter);
  }, [destaques, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const list = map.get(item.leiId) ?? [];
      list.push(item);
      map.set(item.leiId, list);
    }
    return map;
  }, [filtered]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[90vw] sm:w-[400px] sm:max-w-[400px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-zinc-200 dark:border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Bookmark className="h-4 w-4 text-emerald-600" />
            Meus Destaques
            {destaques && (
              <Badge variant="secondary" className="ml-auto text-xs font-normal">
                {destaques.length}
              </Badge>
            )}
          </SheetTitle>

          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as FilterTab)}
            className="mt-2"
          >
            <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-8">
              <TabsTrigger value="todos" className="text-xs">
                Todos
              </TabsTrigger>
              <TabsTrigger value="highlight" className="text-xs">
                Destaques
              </TabsTrigger>
              <TabsTrigger value="note" className="text-xs">
                Notas
              </TabsTrigger>
              <TabsTrigger value="favorite" className="text-xs">
                Favoritos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
              <Bookmark className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhum destaque encontrado
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Selecione textos nos artigos para criar destaques, notas e favoritos.
              </p>
            </div>
          ) : (
            <div className="py-2">
              {Array.from(grouped.entries()).map(([leiId, items]) => {
                const lei = leiMap.get(leiId);
                return (
                  <div key={leiId}>
                    <div className="sticky top-0 z-10 bg-zinc-50 dark:bg-card px-4 py-1.5 border-b border-zinc-100 dark:border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {lei?.nomeAbreviado ?? leiId}
                        {lei && (
                          <span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground">
                            - {lei.nome}
                          </span>
                        )}
                      </span>
                    </div>

                    {items.map((item) => {
                      const preview = getPreview(item);
                      return (
                        <button
                          key={item.id}
                          onClick={() => onNavigate(item.leiId, item.artigoId)}
                          className={cn(
                            "group w-full text-left px-4 py-2.5 flex items-start gap-2.5",
                            "hover:bg-zinc-100 dark:hover:bg-muted/50 transition-colors",
                            "border-b border-zinc-100 dark:border-border/50 last:border-b-0"
                          )}
                        >
                          <div className="mt-0.5">
                            {getTipoIcon(item.tipo, item.cor)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">
                              Art. {item.artigoId.replace(/^art-/, "")}
                            </span>
                            {preview && (
                              <p className="text-xs text-zinc-600 dark:text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                                {preview}
                              </p>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                              "text-muted-foreground hover:text-red-500"
                            )}
                            onClick={(e) => handleDelete(item.id, e)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
