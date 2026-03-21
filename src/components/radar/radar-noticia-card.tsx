"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, MapPin, Clock, Users, Link2, RefreshCw, CheckCircle2, XCircle, Zap, ChevronDown, FileText, Shield, Crosshair } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCrimeBadgeColor, getCrimeLabel, getCrimeBorderColor } from "./radar-filtros";
import { cn } from "@/lib/utils";
import NextLink from "next/link";

interface Envolvido {
  nome: string | null;
  papel: string;
  idade?: number;
  vulgo?: string;
}

function RelevanciaChip({ score }: { score?: number | null }) {
  if (score == null || score === 0) return null;
  if (score >= 85) return (
    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4">
      Confirmada
    </Badge>
  );
  if (score >= 60) return (
    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5 py-0 h-4">
      Provável
    </Badge>
  );
  if (score >= 35) return (
    <Badge className="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] px-1.5 py-0 h-4">
      Possível
    </Badge>
  );
  return null;
}

interface NoticiaCardProps {
  noticia: {
    id: number;
    url: string;
    fonte: string;
    titulo: string;
    dataPublicacao: string | Date | null;
    dataFato: string | Date | null;
    imagemUrl?: string | null;
    tipoCrime: string | null;
    bairro: string | null;
    armaMeio?: string | null;
    resumoIA: string | null;
    envolvidos: Envolvido[] | string | null;
    enrichmentStatus: string;
    matchCount?: number;
    matches?: Array<{
      id: number;
      assistidoId?: number | null;
      assistidoNome: string | null;
      nomeEncontrado: string;
      scoreConfianca: number;
      status: string;
    }>;
  };
  relevanciaScore?: number | null;
  onClick?: () => void;
  onQuickAction?: (matchId: number, action: "confirmar" | "descartar") => void;
  viewMode?: "compact" | "cards" | "list";
  expanded?: boolean;
  onToggleExpand?: () => void;
}

/** Normaliza envolvidos que pode vir como string JSON ou array */
function parseEnvolvidos(raw: Envolvido[] | string | null): Envolvido[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

/** Nomes genéricos que não são nomes próprios reais */
const NOMES_GENERICOS = new Set([
  "homem", "mulher", "criminoso", "suspeito", "vítima", "vitima",
  "filho", "filha", "pai", "mãe", "mae", "menor", "adolescente",
  "indivíduos", "individuos", "indivíduos encapuzados", "desconhecido",
  "pessoa", "policial", "pm", "delegado",
]);

function isNomeProprio(nome: string | null): boolean {
  if (!nome || !nome.trim()) return false;
  return !NOMES_GENERICOS.has(nome.toLowerCase().trim());
}

const papelColors: Record<string, string> = {
  suspeito: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  preso: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  acusado: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  denunciado: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  vitima: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  testemunha: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  policial: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

const papelLabels: Record<string, string> = {
  suspeito: "Suspeito",
  preso: "Preso",
  acusado: "Acusado",
  denunciado: "Denunciado",
  vitima: "Vítima",
  testemunha: "Testemunha",
  policial: "Policial",
  outro: "Outro",
};

/** Painel de inteligência expandível — reutilizado nos modos compact e cards */
function IntelPanel({
  noticia,
  envolvidos,
  dataDisplay,
  onClick,
}: {
  noticia: NoticiaCardProps["noticia"];
  envolvidos: Envolvido[];
  dataDisplay: string | Date | null;
  onClick?: () => void;
}) {
  return (
    <div
      className="mt-2 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      {(noticia.bairro || noticia.armaMeio || dataDisplay) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          {noticia.bairro && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{noticia.bairro}</span>
            </span>
          )}
          {noticia.armaMeio && (
            <span className="flex items-center gap-1">
              <Crosshair className="h-3 w-3 text-zinc-400 shrink-0" />
              <span>{noticia.armaMeio}</span>
            </span>
          )}
          {dataDisplay && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-zinc-400 shrink-0" />
              <span>{format(new Date(dataDisplay as string), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </span>
          )}
        </div>
      )}

      {envolvidos.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Envolvidos</p>
          <div className="flex flex-wrap gap-1.5">
            {envolvidos.map((e, i) => (
              <span
                key={`exp-${e.nome}-${i}`}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium",
                  papelColors[e.papel] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                )}
              >
                <Users className="h-2.5 w-2.5 shrink-0" />
                {e.nome}{e.idade ? `, ${e.idade} anos` : ""}{e.vulgo ? ` (${e.vulgo})` : ""}
                <span className="opacity-60 text-[10px]">· {papelLabels[e.papel] || e.papel}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {noticia.resumoIA && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Resumo IA
          </p>
          <p className="text-[12px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {noticia.resumoIA}
          </p>
        </div>
      )}

      <div className="flex justify-end pt-0.5">
        <button
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        >
          <ExternalLink className="h-3 w-3" />
          Ver completo no sheet
        </button>
      </div>
    </div>
  );
}

export function RadarNoticiaCard({
  noticia,
  relevanciaScore,
  onClick,
  onQuickAction,
  viewMode = "compact",
  expanded = false,
  onToggleExpand,
}: NoticiaCardProps) {
  const dataDisplay = noticia.dataFato || noticia.dataPublicacao;
  const hasMatch = (noticia.matchCount ?? 0) > 0;
  const envolvidos = parseEnvolvidos(noticia.envolvidos);
  const envolvidosComNome = envolvidos.filter((e) => isNomeProprio(e.nome));
  const matchScore = noticia.matches && noticia.matches.length > 0
    ? Math.max(...noticia.matches.map((m) => m.scoreConfianca))
    : null;

  const hasIntel = !!(noticia.resumoIA || noticia.bairro || noticia.armaMeio || envolvidosComNome.length > 0);

  // ─── MODO LIST ─────────────────────────────────────────────────────────────
  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-3 h-9 border-b border-zinc-100 dark:border-zinc-800/60",
          "hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer",
          "border-l-[3px]",
          getCrimeBorderColor(noticia.tipoCrime),
        )}
        onClick={onClick}
      >
        <Badge
          variant="secondary"
          className={cn("shrink-0 text-[10px] h-4 px-1.5 py-0", getCrimeBadgeColor(noticia.tipoCrime))}
        >
          {getCrimeLabel(noticia.tipoCrime)}
        </Badge>

        <span className="flex-1 text-xs text-zinc-800 dark:text-zinc-200 truncate">
          {noticia.titulo}
        </span>

        <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-400 shrink-0">
          {noticia.bairro && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" />{noticia.bairro}
            </span>
          )}
          {dataDisplay && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date(dataDisplay as string), "dd/MM", { locale: ptBR })}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasMatch && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] h-4 px-1.5 py-0">
              <Link2 className="h-2.5 w-2.5 mr-0.5" />DPE
            </Badge>
          )}
          {hasMatch && matchScore != null && (
            <span className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              matchScore >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
              matchScore >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
              "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            )}>
              {matchScore}%
            </span>
          )}
          {noticia.enrichmentStatus === "pending" && (
            <RefreshCw className="h-3 w-3 text-zinc-400 animate-spin" />
          )}
          <a
            href={noticia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-emerald-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  // ─── MODO COMPACT (padrão) ─────────────────────────────────────────────────
  if (viewMode === "compact") {
    return (
      <div
        className={cn(
          "px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/60",
          "hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer",
          "border-l-[3px]",
          getCrimeBorderColor(noticia.tipoCrime),
        )}
        onClick={onClick}
      >
        {/* Row 1: só o badge do crime + fonte */}
        <div className="flex items-center gap-2 mb-1.5">
          <Badge className={cn("text-[10px] px-2 py-0 h-[18px] font-medium", getCrimeBadgeColor(noticia.tipoCrime))}>
            {getCrimeLabel(noticia.tipoCrime)}
          </Badge>
          {noticia.enrichmentStatus === "pending" && (
            <RefreshCw className="h-3 w-3 text-zinc-300 animate-spin" />
          )}
          <span className="text-[10px] text-zinc-400 ml-auto truncate max-w-[120px]">{noticia.fonte}</span>
        </div>

        {/* Row 2: título — 2 linhas */}
        <h3 className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2 mb-1.5">
          {noticia.titulo}
        </h3>

        {/* Row 3: meta compacta */}
        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
          {noticia.bairro && (
            <span className="flex items-center gap-0.5 shrink-0">
              <MapPin className="h-2.5 w-2.5" />{noticia.bairro}
            </span>
          )}
          {dataDisplay && (
            <span className="flex items-center gap-0.5 shrink-0">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date(dataDisplay as string), "dd/MM", { locale: ptBR })}
            </span>
          )}
          {envolvidosComNome.length > 0 && (
            <span className="hidden sm:flex items-center gap-0.5 truncate max-w-[140px]">
              <Users className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{envolvidosComNome[0].nome}</span>
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {hasMatch && (
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <Link2 className="h-2.5 w-2.5" />DPE
              </span>
            )}
            <a
              href={noticia.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-2.5 w-2.5" />
              <span>Fonte</span>
            </a>
            {hasIntel && onToggleExpand && (
              <button
                className={cn(
                  "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer",
                  expanded
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              >
                <Shield className="h-2.5 w-2.5" />
                Intel
                <ChevronDown className={cn("h-2.5 w-2.5 transition-transform duration-200", expanded && "rotate-180")} />
              </button>
            )}
          </div>
        </div>

        {/* Inline match triagem */}
        <MatchTriagem matches={noticia.matches ?? []} onQuickAction={onQuickAction} />

        {/* Painel expandido */}
        {expanded && (
          <IntelPanel
            noticia={noticia}
            envolvidos={envolvidosComNome}
            dataDisplay={dataDisplay}
            onClick={onClick}
          />
        )}
      </div>
    );
  }

  // ─── MODO CARDS / GRID ────────────────────────────────────────────────────
  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all duration-150 cursor-pointer overflow-hidden",
        hasMatch && "ring-1 ring-emerald-200 dark:ring-emerald-800"
      )}
      onClick={onClick}
    >
      {/* Thumbnail topo (full width) */}
      {noticia.imagemUrl && (
        <div className="relative w-full h-36 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <img
            src={noticia.imagemUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Crime badge overlay */}
          <div className="absolute top-2 left-2">
            <Badge className={cn("text-[10px] shadow-sm", getCrimeBadgeColor(noticia.tipoCrime))}>
              {getCrimeLabel(noticia.tipoCrime)}
            </Badge>
          </div>
          {hasMatch && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-emerald-600 text-white text-[10px] shadow-sm">
                <Link2 className="h-2.5 w-2.5 mr-0.5" />DPE
              </Badge>
            </div>
          )}
        </div>
      )}

      <CardContent className="p-3">
        {/* Badges (quando não há imagem) */}
        {!noticia.imagemUrl && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <Badge variant="secondary" className={getCrimeBadgeColor(noticia.tipoCrime)}>
              {getCrimeLabel(noticia.tipoCrime)}
            </Badge>
            <RelevanciaChip score={relevanciaScore} />
            {hasMatch && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Link2 className="h-3 w-3 mr-1" />Caso DPE
              </Badge>
            )}
            {noticia.enrichmentStatus === "pending" && (
              <Badge variant="outline" className="text-zinc-400 border-zinc-300 dark:border-zinc-600">
                <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" />Analisando...
              </Badge>
            )}
          </div>
        )}

        {/* Fonte (quando há imagem, badges já estão no overlay) */}
        {noticia.imagemUrl && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <RelevanciaChip score={relevanciaScore} />
            {noticia.enrichmentStatus === "pending" && (
              <Badge variant="outline" className="text-zinc-400 border-zinc-300 dark:border-zinc-600">
                <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" />Analisando...
              </Badge>
            )}
            <span className="ml-auto text-[10px] text-zinc-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
              {noticia.fonte}
            </span>
          </div>
        )}

        {/* Título */}
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2 mb-1.5">
          {noticia.titulo}
        </h3>

        {/* Resumo IA */}
        {noticia.resumoIA && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2">
            {noticia.resumoIA}
          </p>
        )}

        {/* Envolvidos */}
        {envolvidosComNome.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {envolvidosComNome.slice(0, 3).map((e, i) => (
              <span
                key={`${e.nome}-${i}`}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium",
                  papelColors[e.papel] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                )}
              >
                <Users className="h-2.5 w-2.5 shrink-0" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate max-w-[120px]">
                      {e.nome}{e.idade ? `, ${e.idade}` : ""}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {e.nome}{e.idade ? `, ${e.idade} anos` : ""}{e.vulgo ? ` (${e.vulgo})` : ""}
                  </TooltipContent>
                </Tooltip>
                <span className="opacity-70">{papelLabels[e.papel] || e.papel}</span>
              </span>
            ))}
            {envolvidosComNome.length > 3 && (
              <span className="text-[10px] text-zinc-400 self-center">+{envolvidosComNome.length - 3}</span>
            )}
          </div>
        )}

        {/* Match triagem */}
        <MatchTriagem matches={noticia.matches ?? []} onQuickAction={onQuickAction} />

        {/* Metadata row */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-2">
          {dataDisplay && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(dataDisplay as string), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          )}
          {noticia.bairro && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{noticia.bairro}
            </span>
          )}
          {noticia.armaMeio && (
            <span className="flex items-center gap-1 hidden sm:flex">
              <Zap className="h-3 w-3" />{noticia.armaMeio}
            </span>
          )}
          <a
            href={noticia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />Fonte
          </a>
          {hasIntel && onToggleExpand && (
            <button
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer",
                expanded
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            >
              <Shield className="h-3 w-3" />
              {expanded ? "Recolher" : "Intel"}
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", expanded && "rotate-180")} />
            </button>
          )}
        </div>

        {/* Painel expandido */}
        {expanded && (
          <IntelPanel
            noticia={noticia}
            envolvidos={envolvidosComNome}
            dataDisplay={dataDisplay}
            onClick={onClick}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ==========================================
// MATCH TRIAGEM — inline no card do feed
// ==========================================

interface MatchTriagemProps {
  matches: Array<{
    id: number;
    assistidoId?: number | null;
    assistidoNome: string | null;
    nomeEncontrado: string;
    scoreConfianca: number;
    status: string;
  }>;
  onQuickAction?: (matchId: number, action: "confirmar" | "descartar") => void;
}

function MatchTriagem({ matches, onQuickAction }: MatchTriagemProps) {
  if (matches.length === 0) return null;

  const sorted = [...matches].sort((a, b) => b.scoreConfianca - a.scoreConfianca);
  const top = sorted[0];
  const rest = sorted.length - 1;

  const isPossivel = top.status === "possivel";
  const isConfirmed = top.status === "confirmado_manual" || top.status === "auto_confirmado";
  const isDescartado = top.status === "descartado";

  return (
    <div
      className="flex flex-col gap-1 mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-md px-2 pb-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 text-[11px]">
        <span className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded font-semibold",
          top.scoreConfianca >= 80
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : top.scoreConfianca >= 50
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        )}>
          {top.scoreConfianca}%
        </span>
        <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300 font-medium">
          {top.assistidoNome || top.nomeEncontrado}
        </span>

        {isPossivel && onQuickAction && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onQuickAction(top.id, "confirmar")}
              className="inline-flex items-center gap-1 text-xs p-1.5 rounded font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /><span>OK</span>
            </button>
            <button
              onClick={() => onQuickAction(top.id, "descartar")}
              className="inline-flex items-center gap-1 text-xs p-1.5 rounded font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 transition-colors cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" /><span>Não</span>
            </button>
          </div>
        )}
        {isConfirmed && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3 w-3" />Confirmado
            </span>
            {top.assistidoId && (
              <NextLink
                href={`/admin/assistidos/${top.assistidoId}`}
                className="inline-flex items-center p-0.5 rounded text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                <ExternalLink className="h-3 w-3" />
              </NextLink>
            )}
          </div>
        )}
        {isDescartado && (
          <span className="text-[10px] text-zinc-400 italic shrink-0">Descartado</span>
        )}
      </div>
      {rest > 0 && (
        <span className="text-[10px] text-zinc-400 pl-0.5">
          +{rest} outro{rest > 1 ? "s" : ""} match{rest > 1 ? "es" : ""}
        </span>
      )}
    </div>
  );
}
