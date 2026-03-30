"use client";

import { Fragment, useState, useMemo, useCallback } from "react";
import { Star, Copy, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Artigo, Dispositivo } from "@/config/legislacao/types";
import type { LegislacaoDestaque } from "@/lib/db/schema/legislacao";
import { ArtigoTimeline } from "./artigo-timeline";
import { ArtigoDiff } from "./artigo-diff";

// ==========================================
// ARTIGO RENDERER - Renderiza artigo de lei
// ==========================================

interface ArtigoRendererProps {
  artigo: Artigo;
  leiAbreviado: string;
  leiId?: string;
  destaques?: LegislacaoDestaque[];
  onHighlight?: (artigoId: string, texto: string, cor: string) => void;
  onFavorite?: (artigoId: string) => void;
  onNote?: (artigoId: string, conteudo: string) => void;
  isFavorited?: boolean;
  searchHighlight?: string;
}

/** Aplica highlight amarelo no termo de busca dentro do texto */
function highlightSearchTerm(text: string, term?: string) {
  if (!term || !term.trim()) return text;

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-800/60 rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

/** Aplica destaques do usuário como spans coloridos */
function applyHighlights(
  text: string,
  destaques: LegislacaoDestaque[],
  searchTerm?: string
) {
  const highlights = destaques.filter(
    (d) => d.tipo === "highlight" && d.textoSelecionado && text.includes(d.textoSelecionado)
  );

  if (highlights.length === 0) return highlightSearchTerm(text, searchTerm);

  const COR_MAP: Record<string, string> = {
    yellow: "bg-yellow-100 dark:bg-yellow-900/40",
    green: "bg-green-100 dark:bg-green-900/40",
    blue: "bg-blue-100 dark:bg-blue-900/40",
    red: "bg-red-100 dark:bg-red-900/40",
  };

  // Apply highlights sequentially (simple approach: first match wins)
  let remaining = text;
  const segments: { text: string; cor?: string }[] = [];

  for (const h of highlights) {
    const sel = h.textoSelecionado!;
    const idx = remaining.indexOf(sel);
    if (idx === -1) continue;

    if (idx > 0) segments.push({ text: remaining.slice(0, idx) });
    segments.push({ text: sel, cor: h.cor ?? "yellow" });
    remaining = remaining.slice(idx + sel.length);
  }
  if (remaining) segments.push({ text: remaining });

  return (
    <>
      {segments.map((seg, i) =>
        seg.cor ? (
          <span key={i} className={cn("rounded-sm px-0.5", COR_MAP[seg.cor])}>
            {highlightSearchTerm(seg.text, searchTerm)}
          </span>
        ) : (
          <Fragment key={i}>{highlightSearchTerm(seg.text, searchTerm)}</Fragment>
        )
      )}
    </>
  );
}

/** Renderiza alíneas (a, b, c...) */
function AlineaList({
  alineas,
  destaques,
  searchTerm,
}: {
  alineas: Dispositivo[];
  destaques: LegislacaoDestaque[];
  searchTerm?: string;
}) {
  return (
    <div className="space-y-1">
      {alineas.map((alinea) => (
        <p key={alinea.id} className="pl-14 text-sm text-zinc-700 dark:text-foreground/80">
          <span className="font-medium text-zinc-500 dark:text-muted-foreground">
            {alinea.numero})
          </span>{" "}
          {applyHighlights(alinea.texto, destaques, searchTerm)}
        </p>
      ))}
    </div>
  );
}

/** Renderiza incisos (I, II, III...) com alíneas opcionais */
function IncisoList({
  incisos,
  destaques,
  searchTerm,
}: {
  incisos: Dispositivo[];
  destaques: LegislacaoDestaque[];
  searchTerm?: string;
}) {
  return (
    <div className="space-y-1.5">
      {incisos.map((inciso) => (
        <div key={inciso.id}>
          <p className="pl-10 text-sm text-zinc-700 dark:text-foreground/80">
            <span className="font-semibold text-zinc-600 dark:text-muted-foreground">
              {inciso.numero}
            </span>{" "}
            - {applyHighlights(inciso.texto, destaques, searchTerm)}
          </p>
          {inciso.alineas && inciso.alineas.length > 0 && (
            <AlineaList
              alineas={inciso.alineas}
              destaques={destaques}
              searchTerm={searchTerm}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** Renderiza parágrafos (§ 1º, § 2º, Parágrafo único) com incisos/alíneas */
function ParagrafoList({
  paragrafos,
  destaques,
  searchTerm,
}: {
  paragrafos: Dispositivo[];
  destaques: LegislacaoDestaque[];
  searchTerm?: string;
}) {
  return (
    <div className="space-y-2">
      {paragrafos.map((par) => (
        <div key={par.id}>
          <p className="pl-6 text-sm text-zinc-700 dark:text-foreground/80">
            <span className="font-semibold text-zinc-600 dark:text-muted-foreground">
              {par.numero}
            </span>{" "}
            {applyHighlights(par.texto, destaques, searchTerm)}
          </p>
          {par.itens && par.itens.length > 0 && (
            <IncisoList
              incisos={par.itens}
              destaques={destaques}
              searchTerm={searchTerm}
            />
          )}
          {par.alineas && par.alineas.length > 0 && (
            <AlineaList
              alineas={par.alineas}
              destaques={destaques}
              searchTerm={searchTerm}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function ArtigoRenderer({
  artigo,
  leiAbreviado,
  leiId,
  destaques = [],
  onFavorite,
  isFavorited = false,
  searchHighlight,
}: ArtigoRendererProps) {
  const [timelineOpen, setTimelineOpen] = useState(false);

  const artigoDestaques = useMemo(
    () => destaques.filter((d) => d.artigoId === artigo.id),
    [destaques, artigo.id]
  );

  const copyReference = useCallback(() => {
    const ref = `Art. ${artigo.numero}, do ${leiAbreviado}`;
    navigator.clipboard.writeText(ref);
  }, [artigo.numero, leiAbreviado]);

  const hasHistorico = artigo.historico && artigo.historico.length > 1;

  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-white p-4 transition-colors",
        "border-zinc-200 hover:border-zinc-300",
        "dark:bg-card dark:border-border dark:hover:border-border"
      )}
    >
      {/* Header: Art. number + favorite */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
            Art. {artigo.numero}.
          </span>
          {artigo.rubrica && (
            <span className="text-sm italic text-zinc-500 dark:text-muted-foreground">
              {artigo.rubrica}
            </span>
          )}
        </div>

        {onFavorite && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => onFavorite(artigo.id)}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    isFavorited
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isFavorited ? "Remover favorito" : "Favoritar artigo"}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Caput */}
      <p className="mt-2 text-sm leading-relaxed text-zinc-900 dark:text-foreground">
        {applyHighlights(artigo.caput, artigoDestaques, searchHighlight)}
      </p>

      {/* Incisos do caput */}
      {artigo.incisos.length > 0 && (
        <div className="mt-2">
          <IncisoList
            incisos={artigo.incisos}
            destaques={artigoDestaques}
            searchTerm={searchHighlight}
          />
        </div>
      )}

      {/* Paragrafos */}
      {artigo.paragrafos.length > 0 && (
        <div className="mt-3">
          <ParagrafoList
            paragrafos={artigo.paragrafos}
            destaques={artigoDestaques}
            searchTerm={searchHighlight}
          />
        </div>
      )}

      {/* Diff de alterações legislativas */}
      {leiId && <ArtigoDiff leiId={leiId} artigoId={artigo.id} />}

      {/* Footer actions */}
      <div className="mt-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-zinc-500"
              onClick={copyReference}
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar ref.
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Copiar &quot;Art. {artigo.numero}, do {leiAbreviado}&quot;
          </TooltipContent>
        </Tooltip>

        {hasHistorico && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-zinc-500"
                onClick={() => setTimelineOpen(true)}
              >
                <History className="h-3.5 w-3.5" />
                Historico ({artigo.historico.length})
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {artigo.historico.length} versoes deste artigo
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Timeline Sheet */}
      {hasHistorico && (
        <ArtigoTimeline
          artigo={artigo}
          leiAbreviado={leiAbreviado}
          open={timelineOpen}
          onOpenChange={setTimelineOpen}
        />
      )}
    </div>
  );
}
