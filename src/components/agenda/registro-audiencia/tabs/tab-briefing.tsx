"use client";

import { useState } from "react";
import {
  Wand2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TabPreparacao } from "./tab-preparacao";
import type { Depoente } from "../types";
import { DepoenteCard } from "../shared/depoente-card";
import { CollapsibleSection } from "@/components/agenda/sheet/collapsible-section";
import { DocumentPreviewDialog } from "../shared/document-preview-dialog";

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

  const [previewDoc, setPreviewDoc] = useState<{ id: string; title: string } | null>(null);

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
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {resumoExecutivo}
              </p>
            </CollapsibleSection>
          )}

          {/* 1. IMPUTACAO */}
          <CollapsibleSection id="imputacao" label="Imputacao">
            {imputacao ? (
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {typeof imputacao === "string"
                  ? imputacao
                  : Array.isArray(imputacao)
                    ? (imputacao as string[]).join(", ")
                    : String(imputacao)}
              </p>
            ) : (
              <EmptyHint text="Imputacao nao extraida — rode a analise IA." />
            )}
          </CollapsibleSection>

          {/* 2. FATOS (DENUNCIA) — expanded */}
          <CollapsibleSection id="fatos" label="Fatos (Denuncia)">
            {fatos ? (
              <div className="space-y-2">
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                  {fatos}
                </p>
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
                    return (
                      <li key={i} className="rounded-lg bg-white dark:bg-neutral-800/40 border border-neutral-200/60 dark:border-neutral-700/60 px-3 py-2">
                        <div className="flex items-start gap-1.5 text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                          <ClipboardList className="w-3 h-3 text-neutral-400 mt-0.5 flex-shrink-0" />
                          <span>{text}</span>
                        </div>
                        {detalhes && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 pl-4.5 leading-relaxed">
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
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed whitespace-pre-wrap">
                          {d.resultado}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyHint text="Nenhuma diligencia registrada." />
            )}
          </CollapsibleSection>

          {/* 6. DEPOENTES — cards ricos unificados */}
          <CollapsibleSection id="depoentes" label="Depoentes" count={depoentes.length}>
            {depoentes.length > 0 ? (
              <div className="space-y-2.5">
                {depoentes.map((d: any, i: number) => {
                  const lado = d.lado ?? (d.tipo === "ACUSACAO" || d.tipo === "vitima" || d.tipo === "VITIMA" ? "acusacao" : d.tipo === "DEFESA" ? "defesa" : null);
                  const tipoNormalized = d.tipo === "ACUSACAO" || d.tipo === "DEFESA" || d.tipo === "COMUM"
                    ? "testemunha"
                    : (d.tipo ?? "testemunha");
                  return (
                    <DepoenteCard
                      key={d.id ?? `${i}-${d.nome}`}
                      dep={{ ...d, lado, tipo: tipoNormalized }}
                      variant="full"
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyHint text="Nenhum depoente cadastrado." />
            )}
          </CollapsibleSection>

          {/* 7. CONTRADICOES */}
          {contradicoes.length > 0 && (
            <CollapsibleSection id="contradicoes" label="Contradicoes">
              <ul className="space-y-2">
                {contradicoes.map((c: any, i: number) => {
                  const text = typeof c === "string" ? c : c.descricao ?? c.contradicao ?? c.vulnerabilidade ?? JSON.stringify(c);
                  const isBom = typeof c === "object" && (c.favoravel === true || c.tipo === "favoravel");
                  return (
                    <li key={i} className={cn(
                      "flex items-start gap-2 text-xs rounded-lg px-3 py-2 border",
                      isBom
                        ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400"
                    )}>
                      <span className="mt-0.5 flex-shrink-0">
                        {isBom ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      </span>
                      <span className="leading-relaxed">{text}</span>
                    </li>
                  );
                })}
              </ul>
            </CollapsibleSection>
          )}

          {/* 8. PENDENCIAS */}
          {pendencias.length > 0 && (
            <CollapsibleSection id="pendencias" label="Pendencias" defaultOpen={true}>
              <ul className="space-y-1">
                {pendencias.map((p: any, i: number) => {
                  const text = typeof p === "string" ? p : p.descricao ?? p.pendencia ?? p.titulo ?? JSON.stringify(p);
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>
            </CollapsibleSection>
          )}

          {/* 9. TESES */}
          <CollapsibleSection id="teses" label="Teses Defensivas">
            {teses.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {teses.map((t: any, i: number) => {
                    const text = typeof t === "string" ? t : t.tese ?? t.descricao ?? t.nome ?? JSON.stringify(t);
                    const viabilidade = typeof t === "object" ? t.viabilidade ?? t.probabilidade : null;
                    const color =
                      viabilidade === "alta" || viabilidade === "forte"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300"
                        : viabilidade === "media" || viabilidade === "moderada"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700";
                    return (
                      <span
                        key={i}
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-full border font-medium",
                          color
                        )}
                      >
                        {text}
                      </span>
                    );
                  })}
                </div>
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
              <EmptyHint text="Nenhuma tese identificada." />
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

      <DocumentPreviewDialog
        driveFileId={previewDoc?.id ?? null}
        title={previewDoc?.title}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  );
}
