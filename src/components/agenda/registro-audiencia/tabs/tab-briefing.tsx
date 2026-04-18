"use client";

import { useState, useMemo } from "react";
import {
  Wand2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
  Check,
  Loader2,
  Mail,
  FileText,
  Dna,
  Target,
  HeartPulse,
  FlaskConical,
  Brain,
  File,
  FileAudio,
  FileVideo,
  FileImage,
  Search,
  Volume2,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TabPreparacao } from "./tab-preparacao";
import type { Depoente } from "../types";
import { DepoenteCard } from "../shared/depoente-card";
import { CollapsibleSection } from "@/components/agenda/sheet/collapsible-section";
import { DocumentPreviewDialog } from "../shared/document-preview-dialog";
import { matchTermoDepoente, matchLaudo, getTermoKind } from "@/lib/agenda/match-document";
import {
  categorizeDocument,
  CATEGORY_ORDER,
  CATEGORY_LABEL,
  type DocumentCategory,
} from "@/lib/agenda/document-category";
import { useAudienciaStatusActions } from "@/hooks/use-audiencia-status-actions";
import { FreshnessBadge } from "@/components/agenda/sheet/freshness-badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">{text}</p>
  );
}

// Fallback: análises antigas gravaram o payload aninhado sob `vvd_analise_audiencia`
// em vez de no topo. Olha primeiro no topo (schema atual), depois no aninhado.
function extractArray(obj: Record<string, any> | null | undefined, ...keys: string[]): any[] {
  if (!obj) return [];
  const nested = (obj as any).vvd_analise_audiencia;
  for (const k of keys) {
    const val = obj[k];
    if (Array.isArray(val) && val.length > 0) return val;
    if (nested && typeof nested === "object") {
      const nv = nested[k];
      if (Array.isArray(nv) && nv.length > 0) return nv;
    }
  }
  return [];
}

function extractString(obj: Record<string, any> | null | undefined, ...keys: string[]): string | null {
  if (!obj) return null;
  const nested = (obj as any).vvd_analise_audiencia;
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === "string" && val.trim().length > 0) return val.trim();
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") return (val as string[]).join(", ");
    if (nested && typeof nested === "object") {
      const nv = nested[k];
      if (typeof nv === "string" && nv.trim().length > 0) return nv.trim();
      if (Array.isArray(nv) && nv.length > 0 && typeof nv[0] === "string") return (nv as string[]).join(", ");
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// File icon helper
// ─────────────────────────────────────────────

function iconeArquivo(file: { name: string; mimeType?: string | null }): React.ComponentType<{ className?: string }> {
  const m = file.mimeType ?? "";
  if (m.startsWith("audio/")) return FileAudio;
  if (m.startsWith("video/")) return FileVideo;
  if (m.startsWith("image/")) return FileImage;
  if (m === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return FileText;
  return File;
}

// ─────────────────────────────────────────────
// Documentos do Processo block
// ─────────────────────────────────────────────

function DocumentosProcessoBlock({
  files,
  onPreview,
}: {
  files: any[];
  onPreview: (p: {
    id: string;
    title: string;
    mimeType?: string | null;
    webViewLink?: string | null;
    fileSize?: string | null;
    enrichmentStatus?: string | null;
    list?: Array<{
      driveFileId: string;
      name?: string | null;
      mimeType?: string | null;
      webViewLink?: string | null;
      fileSize?: number | string | null;
      enrichmentStatus?: string | null;
    }>;
  }) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return files.filter((f) =>
      (f.name ?? f.fileName ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(q),
    );
  }, [files, query]);

  const grupos = useMemo(() => {
    const map: Record<DocumentCategory, any[]> = {
      inquerito: [],
      "acao-penal": [],
      laudo: [],
      termo: [],
      relatorio: [],
      midia: [],
      imagem: [],
      outros: [],
    };
    filtered.forEach((f) => {
      const cat = categorizeDocument({
        name: f.name ?? f.fileName ?? "",
        mimeType: f.mimeType ?? null,
      });
      map[cat].push(f);
    });
    Object.keys(map).forEach((k) => {
      map[k as DocumentCategory].sort((a, b) => {
        const da = new Date(a.lastModifiedTime ?? 0).getTime();
        const db = new Date(b.lastModifiedTime ?? 0).getTime();
        return db - da;
      });
    });
    return CATEGORY_ORDER.map((k) => ({ key: k, label: CATEGORY_LABEL[k], items: map[k] })).filter(
      (g) => g.items.length > 0,
    );
  }, [filtered]);

  if (files.length === 0) {
    return <EmptyHint text="Processo ainda sem arquivos no Drive." />;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
        <input
          type="text"
          placeholder="Buscar documento..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-xs pl-7 pr-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-foreground focus:outline-none focus:ring-1 focus:ring-neutral-500/20 focus:border-neutral-500"
        />
      </div>

      {grupos.length === 0 ? (
        <EmptyHint text="Nenhum arquivo corresponde à busca." />
      ) : (
        <div className="space-y-2">
          {grupos.map((grupo) => (
            <details key={grupo.key} open className="group">
              <summary className="cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
                <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-0 -rotate-90" />
                <span>{grupo.label}</span>
                <span className="text-neutral-400 font-normal">({grupo.items.length})</span>
              </summary>
              <ul className="mt-1.5 space-y-1">
                {grupo.items.map((f: any) => {
                  const fileName = f.name ?? f.fileName ?? "(sem nome)";
                  const Icon = iconeArquivo({ name: fileName, mimeType: f.mimeType });
                  const dataStr = f.lastModifiedTime
                    ? format(new Date(f.lastModifiedTime), "dd/MM/yy", { locale: ptBR })
                    : "";
                  return (
                    <li
                      key={f.driveFileId ?? f.id ?? fileName}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 hover:ring-neutral-300"
                    >
                      <Icon className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                      <span className="flex-1 text-xs truncate">{fileName}</span>
                      {dataStr && (
                        <span className="text-[10px] text-neutral-400 font-mono flex-shrink-0">{dataStr}</span>
                      )}
                      {f.driveFileId && (
                        <button
                          type="button"
                          onClick={() =>
                            onPreview({
                              id: f.driveFileId,
                              title: fileName,
                              mimeType: f.mimeType,
                              webViewLink: f.webViewLink,
                              fileSize: f.fileSize,
                              enrichmentStatus: f.enrichmentStatus,
                              list: filtered.map((x: any) => ({
                                driveFileId: x.driveFileId,
                                name: x.name ?? x.fileName ?? "",
                                mimeType: x.mimeType,
                                webViewLink: x.webViewLink,
                                fileSize: x.fileSize,
                                enrichmentStatus: x.enrichmentStatus,
                              })),
                            })
                          }
                          className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer flex-shrink-0"
                        >
                          Ver
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Depoentes block — toggle status/lado + grouped rows + compact row + "Ver termo"
// ─────────────────────────────────────────────

type DepoenteStatus = "ouvidos" | "ausentes" | "a-ouvir";
type DepoenteLado = "acusacao" | "defesa" | "comum";

function getDepoenteStatus(d: any): DepoenteStatus {
  if (d.ouvidoEm || d.jaOuvido === true) return "ouvidos";
  if (d.presente === false) return "ausentes";
  return "a-ouvir";
}

function getDepoenteLado(d: any): DepoenteLado {
  if (d.lado === "acusacao" || d.tipo === "VITIMA" || d.tipo === "ACUSACAO") return "acusacao";
  if (d.lado === "defesa" || d.tipo === "DEFESA") return "defesa";
  return "comum";
}

const STATUS_ORDER: DepoenteStatus[] = ["a-ouvir", "ouvidos", "ausentes"];
const LADO_ORDER: DepoenteLado[] = ["acusacao", "defesa", "comum"];

const STATUS_LABEL: Record<DepoenteStatus, string> = {
  "a-ouvir": "A ouvir",
  "ouvidos": "Ouvidos",
  "ausentes": "Ausentes",
};

const LADO_LABEL: Record<DepoenteLado, string> = {
  acusacao: "Acusação",
  defesa: "Defesa",
  comum: "Comum",
};

const LADO_BADGE_CLASS: Record<DepoenteLado, string> = {
  acusacao: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  defesa: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  comum: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

function DepoentesBlock({
  depoentes,
  driveFiles,
  onPreview,
}: {
  depoentes: any[];
  driveFiles: { driveFileId: string; name: string; mimeType?: string | null; webViewLink?: string | null }[];
  onPreview: (p: {
    id: string;
    title: string;
    mimeType?: string | null;
    webViewLink?: string | null;
    fileSize?: string | null;
    enrichmentStatus?: string | null;
  }) => void;
}) {
  const [vista, setVista] = useState<"status" | "lado">("status");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const grupos = useMemo(() => {
    if (vista === "status") {
      const map: Record<DepoenteStatus, any[]> = { "a-ouvir": [], ouvidos: [], ausentes: [] };
      depoentes.forEach((d) => map[getDepoenteStatus(d)].push(d));
      return STATUS_ORDER
        .map((k) => ({ key: k, label: STATUS_LABEL[k], items: map[k] }))
        .filter((g) => g.items.length > 0);
    } else {
      const map: Record<DepoenteLado, any[]> = { acusacao: [], defesa: [], comum: [] };
      depoentes.forEach((d) => map[getDepoenteLado(d)].push(d));
      return LADO_ORDER
        .map((k) => ({ key: k, label: LADO_LABEL[k], items: map[k] }))
        .filter((g) => g.items.length > 0);
    }
  }, [depoentes, vista]);

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="inline-flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5 text-[11px]">
        <button
          type="button"
          onClick={() => setVista("status")}
          className={cn(
            "px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors",
            vista === "status"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          Por status
        </button>
        <button
          type="button"
          onClick={() => setVista("lado")}
          className={cn(
            "px-2.5 py-1 rounded-md font-medium cursor-pointer transition-colors",
            vista === "lado"
              ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          Por lado
        </button>
      </div>

      {/* Grupos */}
      <div className="space-y-2">
        {grupos.map((grupo) => (
          <details key={grupo.key} open className="group">
            <summary className="cursor-pointer bg-neutral-50 dark:bg-neutral-900/50 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
              <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-0 -rotate-90" />
              <span>{grupo.label}</span>
              <span className="text-neutral-400 font-normal">({grupo.items.length})</span>
            </summary>
            <div className="mt-1.5 space-y-1">
              {grupo.items.map((d: any, i: number) => {
                const depId = d.id ?? `${d.nome}-${i}`;
                const iniciais = (d.nome ?? "?")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase();
                const lado = getDepoenteLado(d);
                const intimado = !!d.intimado || d.statusIntimacao === "intimado";
                const ouvido = !!d.ouvidoEm || d.jaOuvido === true;
                const termoId = matchTermoDepoente(d.nome ?? "", driveFiles);
                const termoFile = termoId
                  ? driveFiles.find((f: any) => f.driveFileId === termoId)
                  : null;
                const termoKind = termoFile
                  ? getTermoKind({
                      driveFileId: termoFile.driveFileId,
                      name: termoFile.name ?? "",
                      mimeType: termoFile.mimeType,
                    })
                  : null;
                const termoLabel = termoKind === "audio" ? "Ouvir" : termoKind === "video" ? "Ver" : "Termo";
                const TermoIcon = termoKind === "audio" ? Volume2 : termoKind === "video" ? Video : FileText;
                const termoTitlePrefix = termoKind === "audio" ? "Áudio" : termoKind === "video" ? "Vídeo" : "Termo";
                const expanded = expandedId === depId;
                const lado2 = d.lado ?? (d.tipo === "ACUSACAO" || d.tipo === "VITIMA" ? "acusacao" : d.tipo === "DEFESA" ? "defesa" : null);
                const tipoNormalized = d.tipo === "ACUSACAO" || d.tipo === "DEFESA" || d.tipo === "COMUM" ? "testemunha" : (d.tipo ?? "testemunha");

                return (
                  <div key={depId} className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 overflow-hidden">
                    <div
                      onClick={() => setExpandedId(expanded ? null : depId)}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400">{iniciais}</span>
                      </div>
                      <span className="flex-1 text-sm font-medium truncate">{d.nome}</span>
                      <Badge className={cn("text-[9px] px-1.5 py-0", LADO_BADGE_CLASS[lado])}>
                        {LADO_LABEL[lado]}
                      </Badge>
                      <Mail className={cn("w-3 h-3", intimado ? "text-emerald-500" : "text-neutral-300 dark:text-neutral-700")} />
                      <Check className={cn("w-3 h-3", ouvido ? "text-emerald-500" : "text-neutral-300 dark:text-neutral-700")} />
                      {termoId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview({ id: termoId, title: `${termoTitlePrefix} — ${d.nome}`, mimeType: termoFile?.mimeType, webViewLink: (termoFile as any)?.webViewLink });
                          }}
                          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          <TermoIcon className="w-3 h-3" /> {termoLabel}
                        </button>
                      )}
                      <ChevronDown className={cn("w-3.5 h-3.5 text-neutral-400 transition-transform", expanded && "rotate-180")} />
                    </div>
                    {expanded && (
                      <div className="border-t border-neutral-200 dark:border-neutral-800 p-2 bg-white dark:bg-neutral-950">
                        <DepoenteCard
                          dep={{ ...d, lado: lado2, tipo: tipoNormalized }}
                          variant="full"
                          onVerTermo={termoId ? () => onPreview({ id: termoId, title: `${termoTitlePrefix} — ${d.nome}`, mimeType: termoFile?.mimeType, webViewLink: (termoFile as any)?.webViewLink }) : undefined}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pendências helpers
// ─────────────────────────────────────────────

function getPendenciaKey(audienciaId: number | null, texto: string): string {
  const hash = texto.toLowerCase().trim().slice(0, 40);
  return `pendencia-resolvida:${audienciaId ?? "no-aud"}:${hash}`;
}

function isPendenciaResolvida(audienciaId: number | null, texto: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(getPendenciaKey(audienciaId, texto)) === "1";
}

function setPendenciaResolvida(audienciaId: number | null, texto: string, resolvida: boolean): void {
  if (typeof window === "undefined") return;
  const key = getPendenciaKey(audienciaId, texto);
  if (resolvida) window.localStorage.setItem(key, "1");
  else window.localStorage.removeItem(key);
}

const PRIORIDADE_CLASS: Record<string, string> = {
  alta: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  baixa: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700",
};

const PRIORIDADE_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

function normalizePrioridade(raw: unknown): "alta" | "media" | "baixa" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "alta" || s === "high") return "alta";
  if (s === "baixa" || s === "low") return "baixa";
  return "media";
}

function PendenciasBlock({
  pendencias,
  audienciaId,
  onAbordar,
}: {
  pendencias: any[];
  audienciaId: number | null;
  onAbordar: (texto: string) => void;
}) {
  const items = useMemo(
    () =>
      pendencias.map((p: any) => ({
        texto: typeof p === "string" ? p : (p.descricao ?? p.pendencia ?? p.titulo ?? JSON.stringify(p)),
        prioridade: normalizePrioridade(typeof p === "object" ? p.prioridade : null),
      })),
    [pendencias]
  );

  const [tick, setTick] = useState(0);

  return (
    <ul className="space-y-2">
      {items.map((p, i) => {
        const resolvido = isPendenciaResolvida(audienciaId, p.texto);
        return (
          <li
            key={i}
            className="flex items-start gap-2.5 p-3 rounded-lg bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 hover:ring-neutral-300"
          >
            <Checkbox
              checked={resolvido}
              onCheckedChange={(c) => {
                setPendenciaResolvida(audienciaId, p.texto, c === true);
                setTick((t) => t + 1);
              }}
              className="mt-0.5"
              aria-label={resolvido ? "Marcar como pendente" : "Marcar como resolvida"}
            />
            <p className={cn("flex-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300", resolvido && "line-through opacity-60")}>
              {p.texto}
            </p>
            <Badge className={cn("text-[10px] px-1.5 py-0 border", PRIORIDADE_CLASS[p.prioridade])}>
              {PRIORIDADE_LABEL[p.prioridade]}
            </Badge>
            {!resolvido && audienciaId && (
              <button
                type="button"
                onClick={() => onAbordar(p.texto)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer flex-shrink-0"
                title="Criar anotação rápida e marcar como resolvida"
              >
                Abordar
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─────────────────────────────────────────────
// Laudo icon helper
// ─────────────────────────────────────────────

function iconeLaudo(nome: string): React.ComponentType<{ className?: string }> {
  const n = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\bdna\b/.test(n)) return Dna;
  if (/balistic/.test(n)) return Target;
  if (/necropsia|cadaveric/.test(n)) return HeartPulse;
  if (/toxicolog/.test(n)) return FlaskConical;
  if (/psiquiatric/.test(n)) return Brain;
  return ClipboardList;
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface TabBriefingProps {
  evento: any;
  audienciaId: number | null;
  onImportarParaDepoentes?: (depoentes: Depoente[]) => void;
}

export function TabBriefing({ evento, audienciaId, onImportarParaDepoentes }: TabBriefingProps) {
  const [preparacaoOpen, setPreparacaoOpen] = useState(false);

  const { data: ctx, isLoading } = trpc.audiencias.getAudienciaContext.useQuery(
    { audienciaId: audienciaId ?? 0 },
    { enabled: !!audienciaId }
  );

  const processoId = ctx?.processo?.id ?? null;
  const filesByProcessoQuery = trpc.drive.filesByProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: !!processoId },
  );
  const driveFiles = filesByProcessoQuery.data ?? [];

  const actions = useAudienciaStatusActions(audienciaId);

  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    title: string;
    mimeType?: string | null;
    webViewLink?: string | null;
    fileSize?: string | null;
    enrichmentStatus?: string | null;
    list?: Array<{
      driveFileId: string;
      name?: string | null;
      mimeType?: string | null;
      webViewLink?: string | null;
      fileSize?: number | string | null;
      enrichmentStatus?: string | null;
    }>;
  } | null>(null);
  const [expandedInvestigacao, setExpandedInvestigacao] = useState<{ titulo: string; texto: string } | null>(null);

  // Analysis data shortcuts
  const ad = ctx?.analysisData;
  const caso = ctx?.caso;

  // 1. Imputacao
  const imputacao = extractString(ad, "imputacao", "crimes_imputados")
    ?? extractString(caso, "foco")
    ?? null;

  // 2. Fatos - expanded
  const fatos = caso?.narrativaDenuncia
    ?? extractString(ad, "resumo_executivo", "narrativa_denuncia")
    ?? null;

  // 3. Elementos
  const laudos = extractArray(ad, "laudos", "laudos_mencionados", "laudos_periciais");
  const lacunas = extractArray(ad, "vulnerabilidades_acusacao", "lacunas_probatorias", "lacunas");

  // 4. Versao do acusado
  const versaoDelegacia = extractString(ad, "versao_delegacia", "versao_reu_delegacia");
  const atendimentos = ctx?.atendimentos ?? [];
  const atendimento = atendimentos[0];
  const versaoAtendimento = atendimento?.resumo
    ?? atendimento?.transcricaoResumo
    ?? (atendimento?.pontosChave as any)
    ?? null;

  // 5. Diligencias
  const diligencias = ctx?.diligencias ?? [];

  // 6. Depoentes / testemunhas
  const testemunhasDB = ctx?.testemunhas ?? [];
  const testemunhasAcusacao = extractArray(ad, "testemunhas_acusacao");
  const testemunhasDefesa = extractArray(ad, "testemunhas_defesa");
  const allDepoentes = [
    ...testemunhasDB.map((t: any) => ({ ...t, _source: "db" })),
    ...testemunhasAcusacao.map((t: any) => ({ ...t, lado: "acusacao", _source: "analysis" })),
    ...testemunhasDefesa.map((t: any) => ({ ...t, lado: "defesa", _source: "analysis" })),
  ];
  const seen = new Set<string>();
  const depoentes = allDepoentes.filter((d) => {
    const key = (d.nome ?? d.name ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 0. Resumo Executivo (topo)
  const resumoExecutivo = extractString(ad, "resumo_executivo");
  const narrativaDenuncia = caso?.narrativaDenuncia ?? extractString(ad, "narrativa_denuncia");

  // 7. Contradicoes
  const contradicoes = extractArray(ad, "contradicoes", "vulnerabilidades_acusacao")
    .filter((item: any) => {
      if (typeof item === "string") return true;
      return item?.tipo === "contradicao" || item?.contradicao;
    });

  // 8. Pendencias
  const pendencias = extractArray(ad, "pendencias_diligencia_pre_aij", "pendencias", "pendencias_operacionais");

  // 9. Teses
  const teses = extractArray(ad, "teses_defesa", "teses").filter(Boolean);
  const teoriaDireito = caso?.teoriaDireito;
  const teoriaFatos = caso?.teoriaFatos;
  const teoriaProvas = caso?.teoriaProvas;

  return (
    <div className="max-w-5xl mx-auto space-y-3">
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
          <span className="ml-2 text-sm text-neutral-500">Carregando contexto...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* 0. RESUMO EXECUTIVO */}
          {resumoExecutivo && (
            <CollapsibleSection id="resumo-executivo" label="Resumo Executivo" defaultOpen={true}>
              <>
                {ctx?.processo?.analyzedAt && (
                  <div className="flex justify-end mb-2">
                    <FreshnessBadge analyzedAt={ctx.processo.analyzedAt} />
                  </div>
                )}
                <div className="space-y-2">
                  {resumoExecutivo.split(/\n\n+/).map((p, i) => (
                    <p key={i} className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                      {p}
                    </p>
                  ))}
                </div>
              </>
            </CollapsibleSection>
          )}

          {/* 1. IMPUTACAO */}
          <CollapsibleSection id="imputacao" label="Imputacao">
            {(() => {
              if (!imputacao) return <EmptyHint text="Imputação não extraída — rode a análise IA." />;
              const items = Array.isArray(imputacao)
                ? imputacao
                : typeof imputacao === "string" && /[;,]/.test(imputacao)
                  ? imputacao.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
                  : null;
              if (items && items.length > 1) {
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-xs px-2 py-0.5">
                        {typeof c === "string" ? c : String(c)}
                      </Badge>
                    ))}
                  </div>
                );
              }
              return (
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {typeof imputacao === "string" ? imputacao : String(imputacao)}
                </p>
              );
            })()}
          </CollapsibleSection>

          {/* 2. FATOS (DENUNCIA) — expanded */}
          <CollapsibleSection id="fatos" label="Fatos (Denuncia)">
            {fatos ? (
              <div className="space-y-2">
                <div className="space-y-2">
                  {fatos.split(/\n\n+/).map((p, i) => (
                    <p key={i} className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                      {p}
                    </p>
                  ))}
                </div>
                {teoriaFatos && (
                  <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/60">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-1">
                      Teoria dos Fatos
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {teoriaFatos}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <EmptyHint text="Narrativa da denuncia nao disponivel." />
            )}
          </CollapsibleSection>

          {/* 2.5. DOCUMENTOS DO PROCESSO — fonte antes da extração */}
          <CollapsibleSection id="documentos-processo" label="Documentos do Processo" count={driveFiles.length} defaultOpen>
            <DocumentosProcessoBlock files={driveFiles} onPreview={setPreviewDoc} />
          </CollapsibleSection>

          {/* 3. ELEMENTOS — expanded */}
          <CollapsibleSection id="elementos" label="Elementos">
            {laudos.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1.5">
                  Laudos Periciais
                </p>
                <ul className="space-y-1.5">
                  {laudos.map((l: any, i: number) => {
                    const text = typeof l === "string" ? l : l.nome ?? l.titulo ?? l.descricao ?? JSON.stringify(l);
                    const detalhes = typeof l === "object" ? l.resultado ?? l.conclusao ?? l.detalhes : null;
                    const Icon = iconeLaudo(text);
                    const laudoId = matchLaudo(text, driveFiles.map((f: any) => ({ driveFileId: f.driveFileId, name: f.fileName ?? f.name ?? "", mimeType: f.mimeType })));
                    const laudoFile = laudoId ? driveFiles.find((f: any) => f.driveFileId === laudoId) : null;
                    return (
                      <li key={i} className="rounded-lg bg-white dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 px-3 py-2">
                        <div className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                          <Icon className="w-3.5 h-3.5 text-neutral-500 mt-0.5 flex-shrink-0" />
                          <span className="flex-1">{text}</span>
                          {laudoId && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ id: laudoId, title: `Laudo — ${text}`, mimeType: (laudoFile as any)?.mimeType, webViewLink: (laudoFile as any)?.webViewLink })}
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer flex-shrink-0"
                            >
                              <FileText className="w-3 h-3" /> Ver
                            </button>
                          )}
                        </div>
                        {detalhes && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 pl-5 leading-relaxed">
                            {detalhes}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {lacunas.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider font-medium text-neutral-400 mb-1.5">
                  Lacunas / Vulnerabilidades da Acusacao
                </p>
                <ul className="space-y-1">
                  {lacunas.map((l: any, i: number) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{typeof l === "string" ? l : l.descricao ?? l.vulnerabilidade ?? JSON.stringify(l)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {teoriaProvas && (
              <div className="mt-3 pt-3 border-t border-neutral-200/60 dark:border-neutral-700/60">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-1">
                  Teoria das Provas
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {teoriaProvas}
                </p>
              </div>
            )}
            {laudos.length === 0 && lacunas.length === 0 && !teoriaProvas && (
              <EmptyHint text="Elementos probatorios nao extraidos." />
            )}
          </CollapsibleSection>

          {/* 4. VERSAO DO ACUSADO — expanded */}
          <CollapsibleSection id="versao-acusado" label="Versao do Acusado">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Coluna 1: Delegacia */}
              <div className="rounded-lg bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 p-3 flex flex-col">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-500">
                    Delegacia
                  </span>
                </div>
                {versaoDelegacia ? (
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                    {versaoDelegacia}
                  </p>
                ) : (
                  <p className="text-xs text-neutral-400 italic">
                    Versão na delegacia não extraída.
                  </p>
                )}
              </div>

              {/* Coluna 2: Atendimentos Defensoria */}
              <div className="rounded-lg bg-white dark:bg-neutral-900 ring-1 ring-neutral-200 dark:ring-neutral-800 p-3 flex flex-col max-h-96 overflow-y-auto">
                <div className="flex items-center gap-1.5 mb-2 sticky top-0 bg-white dark:bg-neutral-900 pb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-500">
                    Defensoria ({atendimentos.length})
                  </span>
                </div>
                {atendimentos.length > 0 ? (
                  <div className="space-y-2.5">
                    {atendimentos.map((at: any, i: number) => (
                      <div key={at.id ?? i} className="rounded-lg bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          {at.data && (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {format(new Date(at.data as string), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                          {at.tipo && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-neutral-300 dark:border-neutral-600">
                              {at.tipo}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
                          {at.resumo ?? at.transcricaoResumo ?? (typeof at.pontosChave === "string" ? at.pontosChave : JSON.stringify(at.pontosChave)) ?? "Sem resumo"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic">
                    Nenhum atendimento registrado — agende entrevista.
                  </p>
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* 5. INVESTIGACAO DEFENSIVA — expanded */}
          <CollapsibleSection id="investigacao" label="Investigacao Defensiva">
            {diligencias.length > 0 ? (
              <ul className="space-y-2.5">
                {diligencias.map((d: any) => {
                  const statusColor =
                    d.status === "concluida" || d.status === "concluída"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : d.status === "em_andamento" || d.status === "em andamento"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : d.status === "frustrada" || d.status === "cancelada"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
                  return (
                    <li key={d.id} className="rounded-lg bg-white dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-700 dark:text-neutral-300 font-medium flex-1 min-w-0">
                          {d.titulo}
                        </span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0", statusColor)}>
                          {d.status ?? "pendente"}
                        </span>
                        {d.prioridade && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1">
                            {d.prioridade}
                          </Badge>
                        )}
                      </div>
                      {d.nomePessoaAlvo && (
                        <p className="text-[11px] text-neutral-500 mt-0.5">Alvo: {d.nomePessoaAlvo}</p>
                      )}
                      {d.resultado && (
                        <div className="mt-1">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap line-clamp-3">
                            {d.resultado}
                          </p>
                          {d.resultado.length > 200 && (
                            <button
                              type="button"
                              onClick={() => setExpandedInvestigacao({ titulo: d.titulo, texto: d.resultado })}
                              className="text-[10px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 underline cursor-pointer mt-0.5"
                            >
                              Ver mais
                            </button>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyHint text="Nenhuma diligencia registrada." />
            )}
          </CollapsibleSection>

          {/* 6. DEPOENTES — toggle status/lado, linha compacta, preview do termo */}
          <CollapsibleSection id="depoentes" label="Depoentes" count={depoentes.length}>
            {depoentes.length > 0 ? (
              <DepoentesBlock
                depoentes={depoentes}
                driveFiles={driveFiles.map((f: any) => ({ driveFileId: f.driveFileId, name: f.fileName ?? f.name ?? "", mimeType: f.mimeType }))}
                onPreview={setPreviewDoc}
              />
            ) : (
              <EmptyHint text="Nenhum depoente cadastrado." />
            )}
          </CollapsibleSection>

          {/* 7. CONTRADICOES */}
          {contradicoes.length > 0 && (
            <CollapsibleSection id="contradicoes" label="Contradicoes">
              <ul className="space-y-2">
                {contradicoes.map((c: any, i: number) => {
                  if (typeof c === "string") {
                    return (
                      <li key={i} className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 border bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{c}</span>
                      </li>
                    );
                  }
                  const ponto = c.ponto ?? c.descricao ?? c.contradicao ?? c.vulnerabilidade;
                  const impacto = c.impacto;
                  const vDeleg = c.versao_delegacia ?? c.versaoDelegacia;
                  const vJuizo = c.versao_juizo_hoje ?? c.versao_juizo ?? c.versaoJuizo;
                  const isBom = c.favoravel === true || c.tipo === "favoravel";
                  if (!ponto && !impacto && !vDeleg && !vJuizo) {
                    return <li key={i} className="text-xs text-neutral-500 italic">{JSON.stringify(c)}</li>;
                  }
                  const impactoClass =
                    typeof impacto === "string" && /essencial|alta|forte/i.test(impacto)
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                      : typeof impacto === "string" && /media|moderad/i.test(impacto)
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
                  return (
                    <li key={i} className={cn(
                      "rounded-lg ring-1 p-3 space-y-1.5",
                      isBom
                        ? "ring-emerald-200 dark:ring-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/10"
                        : "ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900"
                    )}>
                      <div className="flex items-start gap-2">
                        {isBom ? (
                          <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400/70" />
                        )}
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed flex-1">{ponto}</p>
                        {impacto && (
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide flex-shrink-0", impactoClass)}>
                            {typeof impacto === "string" ? impacto.split(/\s—\s/)[0] : String(impacto)}
                          </span>
                        )}
                      </div>
                      {typeof impacto === "string" && impacto.includes("—") && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed pl-5">
                          {impacto.split(/\s—\s/).slice(1).join(" — ")}
                        </p>
                      )}
                      {(vDeleg || vJuizo) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-5 pt-1">
                          {vDeleg && (
                            <div className="text-xs leading-relaxed">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">Delegacia:</span>{" "}
                              <span className="text-neutral-600 dark:text-neutral-400">{vDeleg}</span>
                            </div>
                          )}
                          {vJuizo && (
                            <div className="text-xs leading-relaxed">
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Em juízo:</span>{" "}
                              <span className="text-neutral-600 dark:text-neutral-400">{vJuizo}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CollapsibleSection>
          )}

          {/* 8. PENDENCIAS */}
          {pendencias.length > 0 && (
            <CollapsibleSection id="pendencias" label="Pendencias" defaultOpen={true}>
              {pendencias.length > 0 ? (
                <PendenciasBlock
                  pendencias={pendencias}
                  audienciaId={audienciaId}
                  onAbordar={(texto) => {
                    if (!audienciaId) return;
                    actions.addNote.mutate({ audienciaId, texto: `Pendência: ${texto}` });
                    setPendenciaResolvida(audienciaId, texto, true);
                  }}
                />
              ) : (
                <EmptyHint text="Nenhuma pendência registrada." />
              )}
            </CollapsibleSection>
          )}

          {/* 9. TESES */}
          <CollapsibleSection id="teses" label="Teses Defensivas">
            {teses.length > 0 ? (
              <div className="space-y-2">
                {teses.map((t: any, i: number) => {
                  if (typeof t === "string") {
                    return (
                      <div key={i} className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 p-2.5">
                        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed">{t}</p>
                      </div>
                    );
                  }
                  const nome = t.nome ?? t.tese ?? t.titulo ?? t.descricao;
                  const forca = t.forca ?? t.força ?? t.viabilidade;
                  const baseLegal = t.base_legal ?? t.baseLegal;
                  const fundamentacao = t.fundamentacao ?? t.fundamentos ?? t.justificativa;
                  if (!nome && !forca && !baseLegal && !fundamentacao) {
                    return <div key={i} className="text-xs text-neutral-500 italic">{JSON.stringify(t)}</div>;
                  }
                  const forcaClass =
                    typeof forca === "string" && /alta|forte/i.test(forca)
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : typeof forca === "string" && /media|moderad/i.test(forca)
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
                  return (
                    <div key={i} className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 p-3 space-y-1.5">
                      <div className="flex items-start gap-2">
                        {nome && (
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-relaxed flex-1">
                            {nome}
                          </p>
                        )}
                        {forca && (
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide flex-shrink-0", forcaClass)}>
                            {forca}
                          </span>
                        )}
                      </div>
                      {baseLegal && (
                        <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 leading-relaxed">
                          {baseLegal}
                        </p>
                      )}
                      {fundamentacao && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                          {fundamentacao}
                        </p>
                      )}
                    </div>
                  );
                })}
                {teoriaDireito && (
                  <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 mb-1">
                      Teoria do Direito
                    </p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      {teoriaDireito}
                    </p>
                  </div>
                )}
              </div>
            ) : teoriaDireito ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {teoriaDireito}
              </p>
            ) : (
              <EmptyHint text="Teses não extraídas." />
            )}
          </CollapsibleSection>
        </>
      )}

      {/* Preparacao Section (collapsible) */}
      <div className="rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden">
        <button
          type="button"
          onClick={() => setPreparacaoOpen(!preparacaoOpen)}
          className="w-full flex items-center gap-2.5 px-4 py-3 bg-neutral-50/50 dark:bg-neutral-900/30 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer"
        >
          {preparacaoOpen ? (
            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
          )}
          <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center shrink-0">
            <Wand2 className="w-4 h-4 text-white dark:text-neutral-900" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Preparacao da Audiencia
            </p>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
              Preview de depoentes e pipeline de preparacao
            </p>
          </div>
        </button>

        {preparacaoOpen && (
          <div className="border-t border-neutral-200/80 dark:border-neutral-800/80 p-4">
            <TabPreparacao
              audienciaId={audienciaId}
              evento={evento}
              onImportarParaDepoentes={onImportarParaDepoentes}
            />
          </div>
        )}
      </div>

      <Dialog open={!!expandedInvestigacao} onOpenChange={(o) => !o && setExpandedInvestigacao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>{expandedInvestigacao?.titulo}</DialogTitle>
          <DialogDescription className="sr-only">Detalhes da diligência</DialogDescription>
          <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
            {expandedInvestigacao?.texto}
          </div>
        </DialogContent>
      </Dialog>

      <DocumentPreviewDialog
        driveFileId={previewDoc?.id ?? null}
        title={previewDoc?.title}
        mimeType={previewDoc?.mimeType}
        webViewLink={previewDoc?.webViewLink}
        fileSize={previewDoc?.fileSize}
        enrichmentStatus={previewDoc?.enrichmentStatus}
        list={previewDoc?.list}
        onNavigate={(next) => {
          if (!previewDoc) return;
          setPreviewDoc({
            ...previewDoc,
            id: next.driveFileId,
            title: next.name ?? "Documento",
            mimeType: next.mimeType,
            webViewLink: next.webViewLink,
            fileSize: next.fileSize != null ? String(next.fileSize) : null,
            enrichmentStatus: next.enrichmentStatus,
          });
        }}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
