"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, MapPin, Clock, Users, Link2, RefreshCw, CheckCircle2, XCircle, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCrimeBadgeColor, getCrimeLabel } from "./radar-filtros";
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
  viewMode?: "cards" | "list";
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

/** Verifica se é um nome próprio real */
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

export function RadarNoticiaCard({ noticia, relevanciaScore, onClick, onQuickAction, viewMode }: NoticiaCardProps) {
  const dataDisplay = noticia.dataFato || noticia.dataPublicacao;
  const hasMatch = (noticia.matchCount ?? 0) > 0;
  const envolvidos = parseEnvolvidos(noticia.envolvidos);
  const envolvidosComNome = envolvidos.filter((e) => isNomeProprio(e.nome));
  const matchScore = noticia.matches && noticia.matches.length > 0
    ? Math.max(...noticia.matches.map((m) => m.scoreConfianca))
    : null;

  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer",
          hasMatch && "border-l-4 border-l-emerald-500"
        )}
        onClick={onClick}
      >
        {/* Crime badge */}
        <Badge
          variant="secondary"
          className={cn("shrink-0 text-[10px]", getCrimeBadgeColor(noticia.tipoCrime))}
        >
          {getCrimeLabel(noticia.tipoCrime)}
        </Badge>
        <RelevanciaChip score={relevanciaScore} />

        {/* Título */}
        <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200 truncate">
          {noticia.titulo}
        </span>

        {/* Meta (bairro + data) */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-zinc-400 shrink-0">
          {noticia.bairro && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" />
              {noticia.bairro}
            </span>
          )}
          {(noticia.dataFato || noticia.dataPublicacao) && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date((noticia.dataFato || noticia.dataPublicacao) as string), "dd/MM", { locale: ptBR })}
            </span>
          )}
        </div>

        {/* Badges inline */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasMatch && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
              <Link2 className="h-2.5 w-2.5 mr-0.5" />
              DPE
            </Badge>
          )}
          {hasMatch && matchScore != null && (
            <span className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
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

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-shadow cursor-pointer",
        hasMatch && "border-l-4 border-l-emerald-500"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          {noticia.imagemUrl && (
            <div className="hidden sm:block w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
              <img
                src={noticia.imagemUrl}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-2">
            {/* Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={getCrimeBadgeColor(noticia.tipoCrime)}
              >
                {getCrimeLabel(noticia.tipoCrime)}
              </Badge>
              <RelevanciaChip score={relevanciaScore} />
              {hasMatch && (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Link2 className="h-3 w-3 mr-1" />
                  Caso DPE
                </Badge>
              )}
              {noticia.enrichmentStatus === "pending" && (
                <Badge variant="outline" className="text-zinc-400 border-zinc-300 dark:border-zinc-600">
                  <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" />
                  Analisando...
                </Badge>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                {noticia.fonte}
              </span>
            </div>

            {/* Título */}
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
              {noticia.titulo}
            </h3>

            {/* Resumo */}
            {noticia.resumoIA && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                {noticia.resumoIA}
              </p>
            )}

            {/* Envolvidos */}
            {envolvidosComNome.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {envolvidosComNome.slice(0, 5).map((e, i) => (
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
                        <span className="truncate max-w-[140px]">
                          {e.nome}
                          {e.idade ? `, ${e.idade}` : ""}
                          {e.vulgo ? ` (${e.vulgo})` : ""}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {e.nome}
                        {e.idade ? `, ${e.idade} anos` : ""}
                        {e.vulgo ? ` (${e.vulgo})` : ""}
                      </TooltipContent>
                    </Tooltip>
                    <span className="opacity-70">
                      {papelLabels[e.papel] || e.papel}
                    </span>
                  </span>
                ))}
                {envolvidosComNome.length > 5 && (
                  <span className="text-[10px] text-zinc-400 self-center">
                    +{envolvidosComNome.length - 5}
                  </span>
                )}
              </div>
            )}

            {/* Inline match triagem */}
            <MatchTriagem
              matches={noticia.matches ?? []}
              onQuickAction={onQuickAction}
            />

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              {dataDisplay && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(dataDisplay), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              )}
              {noticia.bairro && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {noticia.bairro}
                </span>
              )}
              {noticia.armaMeio && (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {noticia.armaMeio}
                </span>
              )}
              {envolvidos.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {envolvidos.length} envolvido{envolvidos.length > 1 ? "s" : ""}
                </span>
              )}
              <a
                href={noticia.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
                Fonte
              </a>
            </div>
          </div>
        </div>
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

  // Sort by scoreConfianca desc, pick top match
  const sorted = [...matches].sort((a, b) => b.scoreConfianca - a.scoreConfianca);
  const top = sorted[0];
  const rest = sorted.length - 1;

  const isPossivel = top.status === "possivel";
  const isConfirmed =
    top.status === "confirmado_manual" || top.status === "auto_confirmado";
  const isDescartado = top.status === "descartado";

  return (
    <div
      className="flex flex-col gap-1 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-md px-2 pb-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 text-[11px]">
        {/* Score pill */}
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded font-semibold",
            top.scoreConfianca >= 80
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : top.scoreConfianca >= 50
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          )}
        >
          {top.scoreConfianca}%
        </span>

        {/* Name */}
        <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300 font-medium">
          {top.assistidoNome || top.nomeEncontrado}
        </span>

        {/* Status / Actions */}
        {isPossivel && onQuickAction && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onQuickAction(top.id, "confirmar")}
              title="Confirmar match"
              className="inline-flex items-center gap-1 text-xs p-2 rounded font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>OK</span>
            </button>
            <button
              onClick={() => onQuickAction(top.id, "descartar")}
              title="Descartar match"
              className="inline-flex items-center gap-1 text-xs p-2 rounded font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Não</span>
            </button>
          </div>
        )}

        {isConfirmed && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Confirmado
            </span>
            {top.assistidoId && (
              <NextLink
                href={`/admin/assistidos/${top.assistidoId}`}
                className="inline-flex items-center p-0.5 rounded text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer"
                title="Ver perfil do assistido"
              >
                <ExternalLink className="h-3 w-3" />
              </NextLink>
            )}
          </div>
        )}

        {isDescartado && (
          <span className="text-[10px] text-zinc-400 italic shrink-0">
            Descartado
          </span>
        )}
      </div>

      {/* "+N outros" link */}
      {rest > 0 && (
        <span className="text-[10px] text-zinc-400 pl-0.5">
          +{rest} outro{rest > 1 ? "s" : ""} match{rest > 1 ? "es" : ""}
        </span>
      )}
    </div>
  );
}
