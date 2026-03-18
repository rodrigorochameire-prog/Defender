"use client";

import { Star, Paperclip, ExternalLink, Sparkles, Clock, FolderPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { NoticiaJuridica } from "@/lib/db/schema";

type AnaliseIA = {
  resumoExecutivo: string;
  impactoPratico: string;
  ratioDecidendi?: string;
  casosAplicaveis: string[];
};

interface NoticiaCardProps {
  noticia: NoticiaJuridica;
  corFonte: string;
  isFavorito: boolean;
  onToggleFavorito: () => void;
  onSalvarNoCaso: () => void;
  onClick: () => void;
  compact?: boolean;
}

function estimarTempoLeitura(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const words = texto.trim().split(/\s+/).length;
  return Math.ceil(words / 200);
}

export function NoticiaCard({
  noticia,
  corFonte,
  isFavorito,
  onToggleFavorito,
  onSalvarNoCaso,
  onClick,
  compact = false,
}: NoticiaCardProps) {
  const analise = noticia.analiseIa as AnaliseIA | null;
  const tags = (noticia.tags as string[]) ?? [];

  const { data: pastas = [] } = trpc.noticias.listPastas.useQuery(undefined, { staleTime: 60_000 });
  const adicionarNaPasta = trpc.noticias.adicionarNaPasta.useMutation({
    onSuccess: () => toast.success("Salvo na pasta"),
  });

  const textoParaEstimar = (noticia as { conteudo?: string | null }).conteudo ?? noticia.resumo;
  const tempoLeitura = estimarTempoLeitura(textoParaEstimar);

  return (
    <div
      className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-500/40 hover:shadow-md hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Barra colorida da fonte */}
      <div className="h-1.5" style={{ backgroundColor: corFonte }} />

      {/* Badge IA — canto superior direito (absoluto) */}
      {analise?.resumoExecutivo && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <Sparkles className="h-2.5 w-2.5" />
            IA
          </span>
        </div>
      )}

      <div className={cn("p-5", compact && "py-3")}>
        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2 flex-wrap pr-10">
          <Badge
            variant="outline"
            className="text-xs font-medium capitalize"
            style={{ borderColor: corFonte, color: corFonte }}
          >
            {noticia.fonte.replace(/-/g, " ")}
          </Badge>
          <Badge variant="secondary" className="text-xs capitalize">
            {noticia.categoria}
          </Badge>
          <div className="flex items-center gap-1.5 ml-auto text-xs text-zinc-400">
            {tempoLeitura && (
              <>
                <Clock className="h-3 w-3" />
                <span>~{tempoLeitura} min</span>
                <span className="text-zinc-300 dark:text-zinc-600">·</span>
              </>
            )}
            <span>
              {noticia.publicadoEm
                ? formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })
                : ""}
            </span>
          </div>
        </div>

        {/* Título */}
        <h3 className={cn(
          "font-semibold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors mb-2",
          compact ? "line-clamp-1" : "line-clamp-2"
        )}>
          {noticia.titulo}
        </h3>

        {/* Preview IA ou resumo */}
        {!compact && (analise?.resumoExecutivo ? (
          <div className="border-l-2 border-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/20 rounded-r-lg px-3 py-2 mb-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 italic line-clamp-2">
              {analise.resumoExecutivo}
            </p>
          </div>
        ) : noticia.resumo ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
            {noticia.resumo}
          </p>
        ) : null)}

        {/* Tags */}
        {!compact && tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-3">
            {tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded px-1.5 py-0.5"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs text-zinc-400">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Ações — visíveis apenas no hover */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 transition-colors",
              isFavorito && "bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/40"
            )}
            onClick={onToggleFavorito}
            title={isFavorito ? "Remover dos salvos" : "Salvar"}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                isFavorito ? "fill-amber-500 text-amber-500" : "text-zinc-400"
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onSalvarNoCaso}
            title="Vincular a caso"
          >
            <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                title="Salvar em pasta"
                onClick={(e) => e.stopPropagation()}
              >
                <FolderPlus className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {pastas.length === 0 && <DropdownMenuItem disabled>Nenhuma pasta</DropdownMenuItem>}
              {pastas.map(p => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => adicionarNaPasta.mutate({ pastaId: p.id, noticiaId: noticia.id })}
                  className="gap-2 cursor-pointer text-sm"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.cor ?? "#6366f1" }} />
                  {p.nome}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" asChild>
            <a
              href={noticia.urlOriginal}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir original"
            >
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
