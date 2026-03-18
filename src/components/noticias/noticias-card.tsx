"use client";

import { Star, Paperclip, ExternalLink, Clock, FolderPlus, Zap } from "lucide-react";
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

const LABEL_CATEGORIA: Record<string, string> = {
  legislativa: "Legislativa",
  jurisprudencial: "Jurisprudencial",
  artigo: "Artigo",
};

const LABEL_FONTE: Record<string, string> = {
  "conjur": "ConJur",
  "stj-noticias": "STJ",
  "stj-not-cias": "STJ",
  "ibccrim": "IBCCRIM",
  "dizer-o-direito": "Dizer o Direito",
  "tudo-de-penal": "Tudo de Penal",
  "canal-ciencias-criminais": "Canal Ciências",
  "canal-ciências-criminais": "Canal Ciências",
  "emporio-do-direito": "Empório do Direito",
  "empório-do-direito": "Empório do Direito",
  "stf-noticias": "STF",
  "stf-notícias": "STF",
  "jota": "JOTA",
};

interface NoticiaCardProps {
  noticia: NoticiaJuridica;
  corFonte: string;
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
  isFavorito,
  isSelected = false,
  onToggleFavorito,
  onSalvarNoCaso,
  onClick,
}: NoticiaCardProps) {
  const analise = noticia.analiseIa as AnaliseIA | null;
  const tags = (noticia.tags as string[]) ?? [];

  const { data: pastas = [] } = trpc.noticias.listPastas.useQuery(undefined, { staleTime: 60_000 });
  const adicionarNaPasta = trpc.noticias.adicionarNaPasta.useMutation({
    onSuccess: () => toast.success("Salvo na pasta"),
  });

  const textoParaEstimar = (noticia as { conteudo?: string | null }).conteudo ?? noticia.resumo;
  const tempoLeitura = estimarTempoLeitura(textoParaEstimar);
  const nomeFonte = LABEL_FONTE[noticia.fonte.toLowerCase()] ?? noticia.fonte.replace(/-/g, " ");
  const nomeCategoria = LABEL_CATEGORIA[noticia.categoria] ?? noticia.categoria;

  return (
    <div
      className={cn(
        "group relative bg-white dark:bg-zinc-900 border rounded-xl overflow-hidden cursor-pointer",
        "transition-all duration-150",
        isSelected
          ? "border-emerald-400 shadow-md ring-1 ring-emerald-400/30"
          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md hover:-translate-y-px"
      )}
      onClick={onClick}
    >
      {/* Borda lateral esquerda colorida por fonte */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ backgroundColor: corFonte }} />

      <div className="pl-5 pr-4 py-4">
        {/* Zona 1: meta */}
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ color: corFonte, backgroundColor: `${corFonte}18` }}
          >
            {nomeCategoria}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">{nomeFonte}</span>
          {noticia.publicadoEm && (
            <>
              <span className="text-zinc-200 dark:text-zinc-700">·</span>
              <span className="text-[11px] text-zinc-400">
                {formatDistanceToNow(new Date(noticia.publicadoEm), { addSuffix: true, locale: ptBR })}
              </span>
            </>
          )}
          <button
            className={cn(
              "ml-auto opacity-0 group-hover:opacity-100 transition-opacity",
              isFavorito && "opacity-100"
            )}
            onClick={e => { e.stopPropagation(); onToggleFavorito(); }}
            title={isFavorito ? "Remover dos salvos" : "Salvar"}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                isFavorito ? "fill-amber-500 text-amber-500" : "text-zinc-300 hover:text-amber-400"
              )}
            />
          </button>
        </div>

        {/* Zona 2: título + síntese */}
        <h3 className="font-semibold text-[15px] leading-snug text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors mb-2.5 line-clamp-2">
          {noticia.titulo}
        </h3>

        {(analise?.resumoExecutivo || noticia.resumo) && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3 mb-3">
            {analise?.resumoExecutivo ?? noticia.resumo}
          </p>
        )}

        {/* Zona 3: impacto prático */}
        {analise?.impactoPratico && (
          <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2 mb-3">
            <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed line-clamp-2">
              {analise.impactoPratico}
            </p>
          </div>
        )}

        {/* Rodapé: tags + tempo + ações */}
        <div className="flex items-center gap-2 flex-wrap">
          {tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-zinc-400">+{tags.length - 3}</span>
          )}

          <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            {tempoLeitura && (
              <span className="flex items-center gap-0.5 text-[11px] text-zinc-400 mr-1">
                <Clock className="h-3 w-3" />
                {tempoLeitura} min
              </span>
            )}
            <button
              className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={onSalvarNoCaso}
              title="Vincular a caso"
            >
              <Paperclip className="h-3.5 w-3.5 text-zinc-400" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Salvar em pasta"
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
            <a
              href={noticia.urlOriginal}
              target="_blank"
              rel="noopener noreferrer"
              className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Abrir original"
            >
              <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
