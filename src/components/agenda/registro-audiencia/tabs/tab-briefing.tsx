"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Wand2,
  Scale,
  FileText,
  Search,
  Shield,
  Users,
  AlertTriangle,
  ClipboardList,
  Lightbulb,
  Loader2,
  ExternalLink,
  Check,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TabPreparacao } from "./tab-preparacao";
import type { Depoente } from "../types";
import { DepoenteCard } from "../shared/depoente-card";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function SectionCard({
  label,
  icon: Icon,
  children,
  className,
  defaultOpen = true,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={cn(
        "bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
        )}
        {Icon && <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
        <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500">
          {label}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">{text}</p>
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
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          <span className="ml-2 text-sm text-zinc-500">Carregando contexto...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* 0. RESUMO EXECUTIVO */}
          {resumoExecutivo && (
            <SectionCard label="Resumo Executivo" icon={Sparkles} defaultOpen={true}>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {resumoExecutivo}
              </p>
            </SectionCard>
          )}

          {/* 1. IMPUTACAO */}
          <SectionCard label="Imputacao" icon={Scale}>
            {imputacao ? (
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {typeof imputacao === "string"
                  ? imputacao
                  : Array.isArray(imputacao)
                    ? (imputacao as string[]).join(", ")
                    : String(imputacao)}
              </p>
            ) : (
              <EmptyHint text="Imputacao nao extraida — rode a analise IA." />
            )}
          </SectionCard>

          {/* 2. FATOS (DENUNCIA) — expanded */}
          <SectionCard label="Fatos (Denuncia)" icon={FileText}>
            {fatos ? (
              <div className="space-y-2">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {fatos}
                </p>
                {teoriaFatos && (
                  <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Teoria dos Fatos
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {teoriaFatos}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <EmptyHint text="Narrativa da denuncia nao disponivel." />
            )}
          </SectionCard>

          {/* 3. ELEMENTOS — expanded */}
          <SectionCard label="Elementos" icon={Search}>
            {laudos.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-400 mb-1.5">
                  Laudos Periciais
                </p>
                <ul className="space-y-1.5">
                  {laudos.map((l: any, i: number) => {
                    const text = typeof l === "string" ? l : l.nome ?? l.titulo ?? l.descricao ?? JSON.stringify(l);
                    const detalhes = typeof l === "object" ? l.resultado ?? l.conclusao ?? l.detalhes : null;
                    return (
                      <li key={i} className="rounded-lg bg-white dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 px-3 py-2">
                        <div className="flex items-start gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                          <ClipboardList className="w-3 h-3 text-zinc-400 mt-0.5 flex-shrink-0" />
                          <span>{text}</span>
                        </div>
                        {detalhes && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 pl-4.5 leading-relaxed">
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
                <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-400 mb-1.5">
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
              <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                  Teoria das Provas
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {teoriaProvas}
                </p>
              </div>
            )}
            {laudos.length === 0 && lacunas.length === 0 && !teoriaProvas && (
              <EmptyHint text="Elementos probatorios nao extraidos." />
            )}
          </SectionCard>

          {/* 4. VERSAO DO ACUSADO — expanded */}
          <SectionCard label="Versao do Acusado" icon={Shield}>
            <div className="space-y-4">
              {/* Delegacia */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-blue-500">
                    Delegacia
                  </span>
                </div>
                {versaoDelegacia ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-3.5 whitespace-pre-wrap">
                    {versaoDelegacia}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 italic pl-3.5">
                    Versao na delegacia nao extraida.
                  </p>
                )}
              </div>
              {/* Atendimentos Defensoria — expanded: show all */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-500">
                    Atendimentos Defensoria ({atendimentos.length})
                  </span>
                </div>
                {atendimentos.length > 0 ? (
                  <div className="space-y-3 pl-3.5">
                    {atendimentos.map((at: any, i: number) => (
                      <div key={at.id ?? i} className="rounded-lg bg-white dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          {at.data && (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {format(new Date(at.data as string), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                          {at.tipo && (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 border-zinc-300 dark:border-zinc-600">
                              {at.tipo}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                          {at.resumo ?? at.transcricaoResumo ?? (typeof at.pontosChave === "string" ? at.pontosChave : JSON.stringify(at.pontosChave)) ?? "Sem resumo"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic pl-3.5">
                    Nenhum atendimento registrado — agende entrevista.
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* 5. INVESTIGACAO DEFENSIVA — expanded */}
          <SectionCard label="Investigacao Defensiva" icon={Search}>
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
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
                  return (
                    <li key={d.id} className="rounded-lg bg-white dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/60 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium flex-1 min-w-0">
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
                        <p className="text-[11px] text-zinc-500 mt-0.5">Alvo: {d.nomePessoaAlvo}</p>
                      )}
                      {d.resultado && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed whitespace-pre-wrap">
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
          </SectionCard>

          {/* 6. DEPOENTES — cards ricos unificados */}
          <SectionCard label={`Depoentes${depoentes.length > 0 ? ` (${depoentes.length})` : ""}`} icon={Users}>
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
          </SectionCard>

          {/* 7. CONTRADICOES */}
          {contradicoes.length > 0 && (
            <SectionCard label="Contradicoes" icon={AlertTriangle}>
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
            </SectionCard>
          )}

          {/* 8. PENDENCIAS */}
          {pendencias.length > 0 && (
            <SectionCard label="Pendencias" icon={AlertTriangle} defaultOpen={true}>
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
            </SectionCard>
          )}

          {/* 9. TESES */}
          <SectionCard label="Teses Defensivas" icon={Lightbulb}>
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
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700";
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
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
                      Teoria do Direito
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {teoriaDireito}
                    </p>
                  </div>
                )}
              </div>
            ) : teoriaDireito ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {teoriaDireito}
              </p>
            ) : (
              <EmptyHint text="Nenhuma tese identificada." />
            )}
          </SectionCard>
        </>
      )}

      {/* Preparacao Section (collapsible) */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
        <button
          type="button"
          onClick={() => setPreparacaoOpen(!preparacaoOpen)}
          className="w-full flex items-center gap-2.5 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
        >
          {preparacaoOpen ? (
            <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
          )}
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
            <Wand2 className="w-4 h-4 text-white dark:text-zinc-900" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Preparacao da Audiencia
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Preview de depoentes e pipeline de preparacao
            </p>
          </div>
        </button>

        {preparacaoOpen && (
          <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 p-4">
            <TabPreparacao
              audienciaId={audienciaId}
              evento={evento}
              onImportarParaDepoentes={onImportarParaDepoentes}
            />
          </div>
        )}
      </div>
    </div>
  );
}
