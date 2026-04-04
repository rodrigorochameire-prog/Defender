"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink, RefreshCw, CheckCircle2, XCircle, ChevronDown, FileText, Shield, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCrimeLabel, getCrimeBorderColor } from "./radar-filtros";
import { cn } from "@/lib/utils";
import NextLink from "next/link";

interface Envolvido {
  nome: string | null;
  papel: string;
  idade?: number;
  vulgo?: string;
}

const CRIME_HEX: Record<string, string> = {
  homicidio: "#4ade80",
  tentativa_homicidio: "#4ade80",
  feminicidio: "#4ade80",
  violencia_domestica: "#fbbf24",
  execucao_penal: "#60a5fa",
  trafico: "#f87171",
  roubo: "#fb923c",
  lesao_corporal: "#f472b6",
  sexual: "#c084fc",
  furto: "#fdba74",
  porte_arma: "#e879f9",
  estelionato: "#a78bfa",
  outros: "#a1a1aa",
};

function getCrimeHex(tipoCrime: string | null): string {
  return CRIME_HEX[tipoCrime ?? "outros"] ?? "#a1a1aa";
}

function formatDataRelativa(data: string | Date | null): string {
  if (!data) return "";
  try {
    const d = new Date(data as string);
    if (isNaN(d.getTime())) return "";
    const diff = Date.now() - d.getTime();
    const horas = diff / (1000 * 60 * 60);
    if (horas < 1) return "agora";
    if (horas < 24) return `há ${Math.floor(horas)}h`;
    if (horas < 48) return "ontem";
    const dias = Math.floor(horas / 24);
    if (dias < 7) return `há ${dias}d`;
    return format(d, "dd/MM", { locale: ptBR });
  } catch { return ""; }
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
    <Badge className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 text-[10px] px-1.5 py-0 h-4">
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
  onVerNoMapa?: () => void;
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

/** Dot component for crime type */
function CrimeDot({ tipoCrime }: { tipoCrime: string | null }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: getCrimeHex(tipoCrime),
        flexShrink: 0,
      }}
    />
  );
}

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
      className="mt-2 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      {(noticia.bairro || noticia.armaMeio || dataDisplay) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          {[
            noticia.bairro
              ? <span key="bairro" className="font-medium text-neutral-700 dark:text-neutral-300">{noticia.bairro}</span>
              : null,
            noticia.armaMeio
              ? <span key="arma">{noticia.armaMeio}</span>
              : null,
            dataDisplay
              ? <span key="data">{format(new Date(dataDisplay as string), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              : null,
          ]
            .filter(Boolean)
            .reduce<React.ReactNode[]>((acc, el, idx) => {
              if (idx > 0) acc.push(<span key={`sep-${idx}`} className="text-neutral-300 dark:text-neutral-600">·</span>);
              acc.push(el);
              return acc;
            }, [])}
        </div>
      )}

      {envolvidos.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide">Envolvidos</p>
          <div className="flex flex-wrap gap-1.5">
            {envolvidos.map((e, i) => (
              <span
                key={`exp-${e.nome}-${i}`}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium",
                  papelColors[e.papel] || "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
                )}
              >
                {e.nome}{e.idade ? `, ${e.idade} anos` : ""}{e.vulgo ? ` (${e.vulgo})` : ""}
                <span className="opacity-60 text-[10px]">· {papelLabels[e.papel] || e.papel}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {noticia.resumoIA && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Resumo IA
          </p>
          <p className="text-[12px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
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
  onVerNoMapa,
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
    const dataFormatada = dataDisplay
      ? (() => { try { return format(new Date(dataDisplay as string), "dd/MM", { locale: ptBR }); } catch { return null; } })()
      : null;

    const metaParts = [noticia.bairro, dataFormatada].filter(Boolean);

    return (
      <div
        className={cn(
          "flex items-center gap-3 px-3 h-9 border-b border-neutral-100 dark:border-neutral-800/60",
          "hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer",
          "border-l-[3px]",
          getCrimeBorderColor(noticia.tipoCrime),
        )}
        onClick={onClick}
      >
        {/* Dot + crime label */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          <CrimeDot tipoCrime={noticia.tipoCrime} />
          <span className="text-[10px] text-neutral-500">{getCrimeLabel(noticia.tipoCrime)}</span>
        </span>

        <span className="flex-1 text-xs text-neutral-800 dark:text-neutral-200 truncate">
          {noticia.titulo}
        </span>

        {metaParts.length > 0 && (
          <span className="hidden sm:block text-[10px] text-neutral-400 shrink-0">
            {metaParts.join(" · ")}
          </span>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          {hasMatch && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] h-4 px-1.5 py-0">
              DPE
            </Badge>
          )}
          {hasMatch && matchScore != null && (
            <span className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
              matchScore >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
              matchScore >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
              "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            )}>
              {matchScore}%
            </span>
          )}
          {noticia.enrichmentStatus === "pending" && (
            <RefreshCw className="h-3 w-3 text-neutral-400 animate-spin" />
          )}
          {onVerNoMapa && (
            <button
              onClick={(e) => { e.stopPropagation(); onVerNoMapa(); }}
              className="text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
              title="Ver no mapa"
            >
              <MapPin className="h-3 w-3" />
            </button>
          )}
          <a
            href={noticia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-emerald-600 transition-colors"
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
    const dataRelativa = formatDataRelativa(dataDisplay);

    const metaParts = [
      noticia.bairro,
      envolvidosComNome[0]?.nome ?? null,
    ].filter(Boolean);

    return (
      <div
        className={cn(
          "px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/60",
          "hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer",
          "border-l-[3px]",
          getCrimeBorderColor(noticia.tipoCrime),
        )}
        onClick={onClick}
      >
        {/* Row 1: dot + crime label + fonte + data relativa */}
        <div className="flex items-center gap-2 mb-1.5">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
            <CrimeDot tipoCrime={noticia.tipoCrime} />
            <span className="text-[10px] text-neutral-500">{getCrimeLabel(noticia.tipoCrime)}</span>
          </span>
          {noticia.enrichmentStatus === "pending" && (
            <RefreshCw className="h-3 w-3 text-neutral-300 animate-spin" />
          )}
          <span className="text-[10px] text-neutral-400 ml-auto truncate max-w-[120px]">{noticia.fonte}</span>
          {dataRelativa && (
            <span className="text-[11px] text-neutral-400 shrink-0">{dataRelativa}</span>
          )}
        </div>

        {/* Row 2: título — 2 linhas */}
        <h3
          className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 leading-snug line-clamp-2 mb-1.5"
          style={{ fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }}
        >
          {noticia.titulo}
        </h3>

        {/* Row 3: metadata + actions */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          {metaParts.length > 0 && (
            <span className="truncate">{metaParts.join(" · ")}</span>
          )}

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {hasMatch && (
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#10b981",
                  flexShrink: 0,
                }}
                title="Match DPE"
              />
            )}
            {onVerNoMapa && (
              <button
                className="flex items-center gap-0.5 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onVerNoMapa(); }}
                title="Ver no mapa"
              >
                <MapPin className="h-2.5 w-2.5" />
                <span>Mapa</span>
              </button>
            )}
            <a
              href={noticia.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
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
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
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
  const dataRelativa = formatDataRelativa(dataDisplay);
  const crimeHex = getCrimeHex(noticia.tipoCrime);

  return (
    <Card
      className={cn(
        "group relative border border-neutral-100 dark:border-neutral-800 rounded-xl shadow-none",
        "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden",
        hasMatch && "ring-1 ring-emerald-200 dark:ring-emerald-800/60"
      )}
      onClick={onClick}
    >
      {/* Imagem proporcional (se disponível) */}
      {noticia.imagemUrl ? (
        <div className="relative w-full overflow-hidden rounded-t-xl">
          <img
            src={noticia.imagemUrl}
            alt={noticia.titulo}
            className="w-full object-cover"
            style={{ maxHeight: 160 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {/* Accent bar sobreposta no topo da imagem */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{ background: crimeHex + "bb" }}
          />
        </div>
      ) : (
        /* Accent bar sem imagem */
        <div
          className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
          style={{ background: crimeHex + "bb" }}
        />
      )}

      <CardContent className="p-4 pt-5">
        {/* Header: badge crime + DPE dot + data */}
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: crimeHex + "15",
              color: crimeHex + "dd",
              border: `1px solid ${crimeHex}28`,
            }}
          >
            <span
              style={{ width: 5, height: 5, borderRadius: "50%", background: crimeHex + "cc", flexShrink: 0, display: "inline-block" }}
            />
            {getCrimeLabel(noticia.tipoCrime)}
          </span>

          {noticia.enrichmentStatus === "pending" && (
            <RefreshCw className="h-3 w-3 text-neutral-300 animate-spin" />
          )}

          {hasMatch && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full">
              DPE
            </span>
          )}

          {dataRelativa && (
            <span className="ml-auto flex items-center gap-1 text-[11px] text-neutral-400 shrink-0">
              <Clock className="h-2.5 w-2.5" />
              {dataRelativa}
            </span>
          )}
        </div>

        {/* Título */}
        <h3
          className="text-[13px] font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, 'Times New Roman', serif" }}
        >
          {noticia.titulo}
        </h3>

        {/* Resumo IA */}
        {noticia.resumoIA && (
          <p className="text-[12px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-2.5">
            {noticia.resumoIA}
          </p>
        )}

        {/* Envolvidos */}
        {envolvidosComNome.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {envolvidosComNome.slice(0, 2).map((e, i) => (
              <span
                key={`${e.nome}-${i}`}
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium",
                  papelColors[e.papel] || "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="truncate max-w-[100px]">
                      {e.nome}{e.idade ? `, ${e.idade}` : ""}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {e.nome}{e.idade ? `, ${e.idade} anos` : ""}{e.vulgo ? ` (${e.vulgo})` : ""}
                  </TooltipContent>
                </Tooltip>
                <span className="opacity-60">{papelLabels[e.papel] || e.papel}</span>
              </span>
            ))}
            {envolvidosComNome.length > 2 && (
              <span className="text-[10px] text-neutral-400 self-center">+{envolvidosComNome.length - 2}</span>
            )}
          </div>
        )}

        {/* Match triagem */}
        <MatchTriagem matches={noticia.matches ?? []} onQuickAction={onQuickAction} />

        {/* Footer: bairro + fonte + intel */}
        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-neutral-800">
          {noticia.bairro && (
            <span className="flex items-center gap-1 shrink-0 text-neutral-500">
              <MapPin className="h-2.5 w-2.5" />
              {noticia.bairro}
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto shrink-0">
            <span className="text-neutral-400 truncate max-w-[80px]">{noticia.fonte}</span>
            {onVerNoMapa && (
              <button
                className="flex items-center gap-0.5 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onVerNoMapa(); }}
                title="Ver no mapa"
              >
                <MapPin className="h-3 w-3" />
              </button>
            )}
            <a
              href={noticia.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="Ver fonte"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
            {hasIntel && onToggleExpand && (
              <button
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer",
                  expanded
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
                onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              >
                <Shield className="h-3 w-3" />
                Intel
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", expanded && "rotate-180")} />
              </button>
            )}
          </div>
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
      className="flex flex-col gap-1 mt-2 pt-1.5 border-t border-neutral-100 dark:border-neutral-800"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 text-[11px]">
        <span className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded font-semibold",
          top.scoreConfianca >= 80
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : top.scoreConfianca >= 50
              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
        )}>
          {top.scoreConfianca}%
        </span>
        <span className="flex-1 truncate text-neutral-700 dark:text-neutral-300 font-medium">
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
                className="inline-flex items-center p-0.5 rounded text-neutral-400 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                <ExternalLink className="h-3 w-3" />
              </NextLink>
            )}
          </div>
        )}
        {isDescartado && (
          <span className="text-[10px] text-neutral-400 italic shrink-0">Descartado</span>
        )}
      </div>
      {rest > 0 && (
        <span className="text-[10px] text-neutral-400 pl-0.5">
          +{rest} outro{rest > 1 ? "s" : ""} match{rest > 1 ? "es" : ""}
        </span>
      )}
    </div>
  );
}
