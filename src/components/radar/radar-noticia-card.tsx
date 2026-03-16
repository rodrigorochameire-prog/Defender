"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, Clock, Users, Link2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCrimeBadgeColor, getCrimeLabel } from "./radar-filtros";
import { cn } from "@/lib/utils";

interface Envolvido {
  nome: string | null;
  papel: string;
  idade?: number;
  vulgo?: string;
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
    resumoIA: string | null;
    envolvidos: Envolvido[] | string | null;
    enrichmentStatus: string;
    matchCount?: number;
    matches?: Array<{
      id: number;
      assistidoNome: string | null;
      nomeEncontrado: string;
      scoreConfianca: number;
      status: string;
    }>;
  };
  onClick?: () => void;
  onQuickAction?: (matchId: number, action: "confirmar" | "descartar") => void;
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

export function RadarNoticiaCard({ noticia, onClick, onQuickAction }: NoticiaCardProps) {
  const dataDisplay = noticia.dataFato || noticia.dataPublicacao;
  const hasMatch = (noticia.matchCount ?? 0) > 0;
  const envolvidos = parseEnvolvidos(noticia.envolvidos);
  const envolvidosComNome = envolvidos.filter((e) => isNomeProprio(e.nome));

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
              <span className="text-xs text-zinc-400">{noticia.fonte}</span>
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
                    <span className="truncate max-w-[140px]">
                      {e.nome}
                      {e.idade ? `, ${e.idade}` : ""}
                      {e.vulgo ? ` (${e.vulgo})` : ""}
                    </span>
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

            {/* Quick actions para matches pendentes */}
            {(noticia.matches ?? []).filter(m => m.status === "possivel").length > 0 && onQuickAction && (
              <div className="flex flex-col gap-1 pt-1 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                {(noticia.matches ?? []).filter(m => m.status === "possivel").slice(0, 2).map(match => (
                  <div key={match.id} className="flex items-center gap-2 text-[11px]">
                    <span className="flex-1 truncate text-zinc-600 dark:text-zinc-400">
                      <Users className="h-2.5 w-2.5 inline mr-0.5" />
                      {match.assistidoNome || match.nomeEncontrado}
                      <span className="text-zinc-400 ml-1">({match.scoreConfianca}%)</span>
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onQuickAction(match.id, "confirmar"); }}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      OK
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onQuickAction(match.id, "descartar"); }}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-zinc-500 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      <XCircle className="h-2.5 w-2.5" />
                      Não
                    </button>
                  </div>
                ))}
                {(noticia.matches ?? []).filter(m => m.status === "possivel").length > 2 && (
                  <span className="text-[10px] text-zinc-400">
                    +{(noticia.matches ?? []).filter(m => m.status === "possivel").length - 2} outros matches pendentes
                  </span>
                )}
              </div>
            )}

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
