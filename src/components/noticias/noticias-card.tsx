"use client";

import { Star, Paperclip, ExternalLink, Clock, FolderPlus, Sparkles } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn, decodeHtmlEntities } from "@/lib/utils";
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

const LABEL_CATEGORIA: Record<string, string> = {
  legislativa: "Legislativa",
  jurisprudencial: "Jurisprudencial",
  artigo: "Artigo",
};

interface NoticiaCardProps {
  noticia: NoticiaJuridica;
  corFonte: string;
  nomeFonte: string;
  isFavorito: boolean;
  isSelected?: boolean;
  onToggleFavorito: () => void;
  onSalvarNoCaso: () => void;
  onClick: () => void;
}

function estimarTempoLeitura(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const words = texto.trim().split(/\s+/).length;
  return Math.ceil(words / 200);
}

export function NoticiaCard({
  noticia,
  corFonte,
  nomeFonte,
  isFavorito,
  isSelected = false,
  onToggleFavorito,
  onSalvarNoCaso,
  onClick,
}: NoticiaCardProps) {
  const analise = noticia.analiseIa as AnaliseIA | null;

  const { data: pastas = [] } = trpc.noticias.listPastas.useQuery(undefined, { staleTime: 60_000 });
  const adicionarNaPasta = trpc.noticias.adicionarNaPasta.useMutation({
    onSuccess: () => toast.success("Salvo na pasta"),
  });

  const textoParaEstimar = noticia.resumo;
  const tempoLeitura = estimarTempoLeitura(textoParaEstimar);
  const nomeCategoria = LABEL_CATEGORIA[noticia.categoria] ?? noticia.categoria;

  return (
    <div
      className={cn(
        "group relative cursor-pointer",
        "pl-4 pr-5 py-4 transition-colors",
        "border-b border-zinc-100 dark:border-zinc-800",
        "border-l-2",
        isSelected
          ? "border-l-emerald-500 bg-zinc-50 dark:bg-zinc-800/50"
          : "border-l-transparent hover:border-l-zinc-200 dark:hover:border-l-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
      )}
      onClick={onClick}
    >
      {/* Linha 1 — meta: dot, fonte, categoria, tempo, badge IA, ações */}
      <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
        {/* Dot colorido por fonte */}
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: corFonte }}
        />
        {/* Nome da fonte */}
        <span className="text-xs text-zinc-400 font-medium truncate max-w-[80px]">
          {nomeFonte}
        </span>
        <span className="text-zinc-200 dark:text-zinc-700 shrink-0">·</span>
        {/* Categoria */}
        <span className="text-xs text-zinc-400 capitalize shrink-0">
          {nomeCategoria}
        </span>
        {/* Tempo */}
        {noticia.publicadoEm && (
          <>
            <span className="text-zinc-200 dark:text-zinc-700 shrink-0">·</span>
            <span className="text-xs text-zinc-400 shrink-0">
              {formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })}
            </span>
          </>
        )}
        {/* Badge IA — só se tiver análise */}
        {analise && (
          <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 ml-0.5">
            <Sparkles className="h-2.5 w-2.5" />
            IA
          </span>
        )}
        {/* Ações à direita */}
        <div
          className="ml-auto flex items-center gap-0.5 shrink-0"
          onClick={e => e.stopPropagation()}
        >
          {/* Star — sempre visível se favoritado, ghost no hover */}
          <button
            className={cn(
              "h-5 w-5 inline-flex items-center justify-center rounded transition-opacity",
              isFavorito ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={e => { e.stopPropagation(); onToggleFavorito(); }}
            title={isFavorito ? "Remover dos salvos" : "Salvar notícia"}
            aria-label={isFavorito ? "Remover dos salvos" : "Salvar notícia"}
          >
            <Star className={cn(
              "h-3 w-3 transition-colors",
              isFavorito ? "fill-amber-400 text-amber-400" : "text-zinc-300 hover:text-amber-400"
            )} />
          </button>
          {/* Menu hover: tempo de leitura, paperclip, pasta, external */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
            {tempoLeitura && (
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-400 mr-0.5">
                <Clock className="h-2.5 w-2.5" />
                {tempoLeitura}m
              </span>
            )}
            <button
              className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={e => { e.stopPropagation(); onSalvarNoCaso(); }}
              title="Vincular a caso"
              aria-label="Vincular a caso"
            >
              <Paperclip className="h-3 w-3 text-zinc-400" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Salvar em pasta"
                  aria-label="Salvar em pasta"
                >
                  <FolderPlus className="h-3 w-3 text-zinc-400" />
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
            <a
              href={noticia.urlOriginal}
              target="_blank"
              rel="noopener noreferrer"
              className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Abrir artigo original"
              aria-label="Abrir artigo original"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Linha 2 — título */}
      <h3
        className={cn(
          "text-base font-semibold leading-snug line-clamp-2 transition-colors",
          isSelected
            ? "text-zinc-900 dark:text-zinc-100"
            : "text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-zinc-100"
        )}
        style={{ fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }}
      >
        {decodeHtmlEntities(noticia.titulo)}
      </h3>

    </div>
  );
}
