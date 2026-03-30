"use client";

import { ExternalLink, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FavoritoItem {
  id: number;
  artigoId: number;
  titulo: string;
  resumo: string;
  fonteNome: string;
  fonteUrl: string;
  createdAt: string;
}

interface FactualFavoritesPanelProps {
  open: boolean;
  onClose: () => void;
  favoritos: FavoritoItem[];
  onRemove: (artigoId: number) => void;
  onClearAll: () => void;
}

export function FactualFavoritesPanel({
  open,
  onClose,
  favoritos,
  onRemove,
  onClearAll,
}: FactualFavoritesPanelProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const getSnippet = (text: string, maxLen = 120) => {
    const first = text.split("\n\n")[0] ?? text;
    return first.length > maxLen ? first.slice(0, maxLen) + "..." : first;
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base font-semibold">
                Artigos Salvos
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                {favoritos.length}{" "}
                {favoritos.length === 1 ? "artigo salvo" : "artigos salvos"}
              </SheetDescription>
            </div>
            {favoritos.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-7 gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-3 w-3" />
                Limpar tudo
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {favoritos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <span className="text-2xl" role="img" aria-label="bookmark">
                  &#9733;
                </span>
              </div>
              <p className="text-sm font-medium text-foreground/80">
                Nenhum artigo salvo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique na estrela de um artigo para salv&aacute;-lo aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {favoritos.map((fav) => (
                <div
                  key={fav.id}
                  className={cn(
                    "px-5 py-4 transition-colors",
                    "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className="text-sm font-semibold leading-snug text-foreground line-clamp-2"
                      style={{
                        fontFamily:
                          "'Playfair Display', Georgia, 'Times New Roman', serif",
                      }}
                    >
                      {fav.titulo}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(fav.artigoId)}
                      className="shrink-0 h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
                      aria-label="Remover artigo salvo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {getSnippet(fav.resumo)}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">
                      {formatDate(fav.createdAt)}
                    </span>
                    <a
                      href={fav.fonteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-medium transition-colors",
                        "text-[#1a1a2e]/60 hover:text-[#1a1a2e]",
                        "dark:text-muted-foreground dark:hover:text-amber-400"
                      )}
                    >
                      {fav.fonteNome}
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
