// src/components/processo/analise-provas.tsx
"use client";

import { useState } from "react";
import {
  FileText, Search, ChevronDown, ChevronUp, AlertTriangle,
  CheckCircle2, XCircle, File, Folder,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TYPO, CARD_STYLE, COLORS } from "@/lib/config/design-tokens";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Prova {
  descricao: string;
  tipo?: string; // "documental" | "testemunhal" | "pericial" | "material"
  relevancia?: string; // "alta" | "media" | "baixa"
  favoravel_defesa?: boolean | null;
  observacao?: string;
  pagina?: string;
  fonte?: string;
}

interface DocumentoMapa {
  nome: string;
  tipo?: string;
  paginas?: string;
  relevancia?: string;
  resumo?: string;
  alerta?: string;
}

interface Laudo {
  tipo: string;
  perito?: string;
  data?: string;
  conclusao: string;
  pontos_chave?: string[];
  favoravel_defesa?: boolean | null;
  lacunas?: string[];
}

interface AnaliseProvasProps {
  inventarioProvas: Prova[];
  mapaDocumental: DocumentoMapa[];
  laudos?: Laudo[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function relevanciaBadge(rel?: string) {
  if (!rel) return null;
  const r = rel.toLowerCase();
  if (r === "alta") return <Badge variant="danger" className="text-xs">Alta</Badge>;
  if (r === "media" || r === "média") return <Badge variant="warning" className="text-xs">Média</Badge>;
  return <Badge variant="outline" className="text-xs">Baixa</Badge>;
}

function tipoBg(tipo?: string) {
  const t = tipo?.toLowerCase();
  if (t === "documental") return "border-l-blue-500";
  if (t === "testemunhal") return "border-l-purple-500";
  if (t === "pericial") return "border-l-cyan-500";
  if (t === "material") return "border-l-amber-500";
  return "border-l-neutral-300 dark:border-l-neutral-600";
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function AnaliseProvas({ inventarioProvas, mapaDocumental, laudos }: AnaliseProvasProps) {
  const [expandedLaudo, setExpandedLaudo] = useState<number | null>(null);

  const isEmpty = inventarioProvas.length === 0 && mapaDocumental.length === 0 && (!laudos || laudos.length === 0);

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-10 w-10 text-neutral-300 dark:text-neutral-600 mb-4" />
        <p className={`${TYPO.body} text-muted-foreground`}>
          Nenhuma prova catalogada. Execute uma análise para inventariar as provas do caso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Inventário de Provas ── */}
      {inventarioProvas.length > 0 && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Search className="h-5 w-5 text-blue-500 shrink-0" />
            Inventário de Provas
            <span className="text-xs text-neutral-400 font-normal ml-1">({inventarioProvas.length})</span>
          </h3>

          <div className="space-y-2">
            {inventarioProvas.map((prova, i) => (
              <div
                key={i}
                className={`${CARD_STYLE.highlight} ${tipoBg(prova.tipo)} rounded-xl`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {prova.tipo && (
                        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                          {prova.tipo}
                        </span>
                      )}
                      {relevanciaBadge(prova.relevancia)}
                      {prova.favoravel_defesa === true && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Favorável
                        </span>
                      )}
                      {prova.favoravel_defesa === false && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                          <XCircle className="h-3 w-3" /> Desfavorável
                        </span>
                      )}
                    </div>
                    <p className={TYPO.body}>{prova.descricao}</p>
                    {prova.observacao && (
                      <p className={`${TYPO.caption} mt-1`}>{prova.observacao}</p>
                    )}
                  </div>
                  {prova.pagina && (
                    <span className="text-xs text-neutral-400 shrink-0 tabular-nums">
                      p. {prova.pagina}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Laudos Periciais ── */}
      {laudos && laudos.length > 0 && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <FileText className="h-5 w-5 text-cyan-500 shrink-0" />
            Laudos Periciais
            <span className="text-xs text-neutral-400 font-normal ml-1">({laudos.length})</span>
          </h3>

          <div className="space-y-3">
            {laudos.map((laudo, i) => (
              <div key={i} className={`${CARD_STYLE.base} rounded-xl border-l-4 border-l-cyan-500`}>
                {/* Header */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedLaudo(expandedLaudo === i ? null : i)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={TYPO.h3}>{laudo.tipo}</span>
                        {laudo.favoravel_defesa === true && (
                          <Badge variant="default" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Favorável</Badge>
                        )}
                        {laudo.favoravel_defesa === false && (
                          <Badge variant="danger" className="text-xs">Desfavorável</Badge>
                        )}
                      </div>
                      {laudo.perito && (
                        <p className={`${TYPO.caption} mt-0.5`}>Perito: {laudo.perito} {laudo.data ? `· ${laudo.data}` : ""}</p>
                      )}
                    </div>
                  </div>
                  {expandedLaudo === i ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
                </div>

                {/* Conclusão sempre visível */}
                <p className={`${TYPO.body} mt-2`}>{laudo.conclusao}</p>

                {/* Expanded details */}
                {expandedLaudo === i && (
                  <div className="mt-3 space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                    {laudo.pontos_chave && laudo.pontos_chave.length > 0 && (
                      <div>
                        <p className={`${TYPO.label} mb-2`}>Pontos-Chave</p>
                        <ul className="space-y-1.5">
                          {laudo.pontos_chave.map((p, pi) => (
                            <li key={pi} className={`flex items-start gap-2 ${TYPO.body}`}>
                              <span className="text-cyan-500 shrink-0">•</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {laudo.lacunas && laudo.lacunas.length > 0 && (
                      <div className={`rounded-lg p-3 ${COLORS.warning.bg}`}>
                        <p className={`${TYPO.label} text-amber-600 dark:text-amber-400 mb-2`}>Lacunas Identificadas</p>
                        <ul className="space-y-1.5">
                          {laudo.lacunas.map((l, li) => (
                            <li key={li} className={`flex items-start gap-2 ${TYPO.body}`}>
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                              {l}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Mapa Documental ── */}
      {mapaDocumental.length > 0 && (
        <div>
          <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
            <Folder className="h-5 w-5 text-amber-500 shrink-0" />
            Mapa Documental
            <span className="text-xs text-neutral-400 font-normal ml-1">({mapaDocumental.length})</span>
          </h3>

          <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-xs uppercase text-neutral-500 dark:text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold tracking-wide">Documento</th>
                    <th className="px-4 py-3 text-left font-semibold tracking-wide">Tipo</th>
                    <th className="px-4 py-3 text-left font-semibold tracking-wide">Páginas</th>
                    <th className="px-4 py-3 text-left font-semibold tracking-wide">Resumo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {mapaDocumental.map((doc, i) => (
                    <tr key={i} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <File className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                          <span className="text-[14px] font-medium text-neutral-800 dark:text-neutral-200">{doc.nome}</span>
                        </div>
                        {doc.alerta && (
                          <span className="flex items-center gap-1 mt-1 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            {doc.alerta}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-neutral-500">{doc.tipo ?? "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-neutral-500 tabular-nums">{doc.paginas ?? "—"}</td>
                      <td className="px-4 py-3 text-[13px] text-neutral-500 max-w-xs truncate">{doc.resumo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
