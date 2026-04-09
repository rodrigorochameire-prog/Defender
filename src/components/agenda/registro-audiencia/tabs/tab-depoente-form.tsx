"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  ChevronDown,
  Target,
  Quote,
  Eye,
} from "lucide-react";
import { AudioRecorderButton } from "@/components/shared/audio-recorder";
import { VoiceMemosButton } from "@/components/shared/voice-memos-button";
import { getDepoenteStyle } from "../constants";
import type { Depoente } from "../types";

interface TabDepoenteFormProps {
  depoente: Depoente;
  onUpdate: (d: Depoente) => void;
  expandedSections: Record<string, boolean>;
  toggleSection: (s: string) => void;
  expandedDepoenteDetails: Record<string, boolean>;
  toggleDepoenteDetails: (id: string) => void;
  evento: any;
}

// Reusable option button
function OptionBtn({ active, onClick, children, activeClass }: { active: boolean; onClick: () => void; children: React.ReactNode; activeClass?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer",
        active
          ? activeClass || "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-400 dark:border-neutral-600"
          : "bg-white dark:bg-neutral-900 text-neutral-500 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50"
      )}
    >
      {children}
    </button>
  );
}

// Type-specific questions for testemunha/informante
function WitnessTypeFields({ depoente, onUpdate, style }: { depoente: Depoente; onUpdate: (d: Depoente) => void; style: ReturnType<typeof getDepoenteStyle> }) {
  const activeClass = `${style.bg} ${style.text} border ${style.border}`;

  return (
    <div className="space-y-1.5 pl-2 border-l-2 border-neutral-200 dark:border-neutral-800">
      <div className="flex gap-2 flex-wrap">
        <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Tipo:</Label>
        <div className="flex gap-1">
          {[
            { value: "ocular", label: "Ocular" },
            { value: "ouvir-dizer", label: "Ouvir dizer" },
            { value: "conduta", label: "Conduta" },
          ].map((tipo) => (
            <OptionBtn key={tipo.value} active={depoente.tipoTestemunha === tipo.value} onClick={() => onUpdate({ ...depoente, tipoTestemunha: tipo.value as any })} activeClass={activeClass}>
              {tipo.label}
            </OptionBtn>
          ))}
        </div>
      </div>

      {depoente.tipoTestemunha === "ocular" && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Viu:</Label>
            <div className="flex gap-1">
              <OptionBtn active={depoente.testemunhaOcularViu === "fato-objeto"} onClick={() => onUpdate({ ...depoente, testemunhaOcularViu: "fato-objeto" })} activeClass={activeClass}>Fato</OptionBtn>
              <OptionBtn active={depoente.testemunhaOcularViu === "indicios"} onClick={() => onUpdate({ ...depoente, testemunhaOcularViu: "indicios" })} activeClass={activeClass}>Indícios</OptionBtn>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Reconheceu assistido:</Label>
            <div className="flex gap-1">
              <OptionBtn active={depoente.reconheceuAssistido === true} onClick={() => onUpdate({ ...depoente, reconheceuAssistido: true })} activeClass={activeClass}>Sim</OptionBtn>
              <OptionBtn active={depoente.reconheceuAssistido === false} onClick={() => onUpdate({ ...depoente, reconheceuAssistido: false })} activeClass={activeClass}>Não</OptionBtn>
            </div>
          </div>
        </>
      )}

      {depoente.tipoTestemunha === "ouvir-dizer" && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Origem:</Label>
            <div className="flex gap-1">
              <OptionBtn active={depoente.testemunhaOuvirDizerFonte === "fonte-direta"} onClick={() => onUpdate({ ...depoente, testemunhaOuvirDizerFonte: "fonte-direta" })} activeClass={activeClass}>De quem presenciou</OptionBtn>
              <OptionBtn active={depoente.testemunhaOuvirDizerFonte === "rumores"} onClick={() => onUpdate({ ...depoente, testemunhaOuvirDizerFonte: "rumores" })} activeClass={activeClass}>Rumores/boatos</OptionBtn>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Informaram autoria:</Label>
            <div className="flex gap-1">
              <OptionBtn active={depoente.testemunhaOuvirDizerInformaramAutoria === true} onClick={() => onUpdate({ ...depoente, testemunhaOuvirDizerInformaramAutoria: true })} activeClass={activeClass}>Sim</OptionBtn>
              <OptionBtn active={depoente.testemunhaOuvirDizerInformaramAutoria === false} onClick={() => onUpdate({ ...depoente, testemunhaOuvirDizerInformaramAutoria: false })} activeClass={activeClass}>Não</OptionBtn>
            </div>
          </div>
        </>
      )}

      {depoente.tipoTestemunha === "conduta" && (
        <div className="flex gap-2 flex-wrap items-center">
          <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Caráter:</Label>
          <div className="flex gap-1">
            <OptionBtn active={depoente.testemunhaCondutaCarater === "favoravel"} onClick={() => onUpdate({ ...depoente, testemunhaCondutaCarater: "favoravel" })} activeClass={activeClass}>Boa reputação</OptionBtn>
            <OptionBtn active={depoente.testemunhaCondutaCarater === "desfavoravel"} onClick={() => onUpdate({ ...depoente, testemunhaCondutaCarater: "desfavoravel" })} activeClass={activeClass}>Má reputação</OptionBtn>
          </div>
        </div>
      )}
    </div>
  );
}

// Type-specific questions for vítima
function VictimTypeFields({ depoente, onUpdate, evento, style }: { depoente: Depoente; onUpdate: (d: Depoente) => void; evento: any; style: ReturnType<typeof getDepoenteStyle> }) {
  const activeClass = `${style.bg} ${style.text} border ${style.border}`;

  return (
    <div className="space-y-1.5 pl-2 border-l-2 border-neutral-200 dark:border-neutral-800">
      {evento.atribuicao !== "Violência Doméstica" && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Viu o autor:</Label>
            <div className="flex gap-1">
              <OptionBtn active={depoente.vitimaViuAutor === true} onClick={() => onUpdate({ ...depoente, vitimaViuAutor: true })} activeClass={activeClass}>Sim</OptionBtn>
              <OptionBtn active={depoente.vitimaViuAutor === false} onClick={() => onUpdate({ ...depoente, vitimaViuAutor: false })} activeClass={activeClass}>Não</OptionBtn>
            </div>
          </div>
          {depoente.vitimaViuAutor === true && (
            <div className="flex gap-2 flex-wrap items-center">
              <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Reconheceu:</Label>
              <div className="flex gap-1">
                <OptionBtn active={depoente.vitimaReconheceuAutor === true} onClick={() => onUpdate({ ...depoente, vitimaReconheceuAutor: true })} activeClass={activeClass}>Sim</OptionBtn>
                <OptionBtn active={depoente.vitimaReconheceuAutor === false} onClick={() => onUpdate({ ...depoente, vitimaReconheceuAutor: false })} activeClass={activeClass}>Não</OptionBtn>
              </div>
            </div>
          )}
        </>
      )}

      {evento.atribuicao === "Violência Doméstica" && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Reconciliação:</Label>
            <div className="flex gap-1">
              <OptionBtn active={depoente.vitimaReconciliada === true} onClick={() => onUpdate({ ...depoente, vitimaReconciliada: true })} activeClass={activeClass}>Voltaram</OptionBtn>
              <OptionBtn active={depoente.vitimaReconciliada === false} onClick={() => onUpdate({ ...depoente, vitimaReconciliada: false })} activeClass={activeClass}>Não voltaram</OptionBtn>
            </div>
          </div>
          {depoente.vitimaReconciliada === false && (
            <div className="flex gap-2 flex-wrap items-center">
              <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Estado emocional:</Label>
              <div className="flex gap-1">
                <OptionBtn active={depoente.vitimaEstadoEmocional === "em-paz"} onClick={() => onUpdate({ ...depoente, vitimaEstadoEmocional: "em-paz" })} activeClass="bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">Em paz</OptionBtn>
                <OptionBtn active={depoente.vitimaEstadoEmocional === "com-raiva"} onClick={() => onUpdate({ ...depoente, vitimaEstadoEmocional: "com-raiva" })} activeClass="bg-rose-100 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">Com raiva</OptionBtn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Type-specific questions for réu
function DefendantTypeFields({ depoente, onUpdate, style }: { depoente: Depoente; onUpdate: (d: Depoente) => void; style: ReturnType<typeof getDepoenteStyle> }) {
  const activeClass = `${style.bg} ${style.text} border ${style.border}`;

  return (
    <div className="space-y-1.5 pl-2 border-l-2 border-neutral-200 dark:border-neutral-800">
      <div className="flex gap-2 flex-wrap items-center">
        <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Silêncio na audiência:</Label>
        <div className="flex gap-1">
          <OptionBtn active={depoente.reuSilencio === true} onClick={() => onUpdate({ ...depoente, reuSilencio: true })} activeClass={activeClass}>Sim</OptionBtn>
          <OptionBtn active={depoente.reuSilencio === false} onClick={() => onUpdate({ ...depoente, reuSilencio: false })} activeClass={activeClass}>Não</OptionBtn>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Confessou na delegacia:</Label>
        <div className="flex gap-1">
          <OptionBtn active={depoente.reuConfessouDelegacia === "sim"} onClick={() => onUpdate({ ...depoente, reuConfessouDelegacia: "sim" })} activeClass={activeClass}>Sim</OptionBtn>
          <OptionBtn active={depoente.reuConfessouDelegacia === "nao"} onClick={() => onUpdate({ ...depoente, reuConfessouDelegacia: "nao" })} activeClass={activeClass}>Não</OptionBtn>
          <OptionBtn active={depoente.reuConfessouDelegacia === "em-parte"} onClick={() => onUpdate({ ...depoente, reuConfessouDelegacia: "em-parte" })} activeClass={activeClass}>Em parte</OptionBtn>
        </div>
      </div>

      {(depoente.reuConfessouDelegacia === "sim" || depoente.reuConfessouDelegacia === "em-parte") && (
        <div className="flex gap-2 flex-wrap items-center">
          <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Retratou:</Label>
          <div className="flex gap-1">
            <OptionBtn active={depoente.reuRetratou === true} onClick={() => onUpdate({ ...depoente, reuRetratou: true })} activeClass={activeClass}>Sim</OptionBtn>
            <OptionBtn active={depoente.reuRetratou === false} onClick={() => onUpdate({ ...depoente, reuRetratou: false })} activeClass={activeClass}>Não</OptionBtn>
          </div>
        </div>
      )}

      {(depoente.reuConfessouDelegacia === "sim" || depoente.reuConfessouDelegacia === "em-parte") && depoente.reuRetratou === true && (
        <div className="flex gap-2 flex-wrap items-center">
          <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Motivo da retratação:</Label>
          <div className="flex gap-1 flex-wrap">
            <OptionBtn active={depoente.reuMotivoRetracao === "tortura"} onClick={() => onUpdate({ ...depoente, reuMotivoRetracao: "tortura" })} activeClass={activeClass}>Tortura</OptionBtn>
            <OptionBtn active={depoente.reuMotivoRetracao === "falsidade-relato"} onClick={() => onUpdate({ ...depoente, reuMotivoRetracao: "falsidade-relato" })} activeClass={activeClass}>Assinou sem ler</OptionBtn>
            <OptionBtn active={depoente.reuMotivoRetracao === "inducao"} onClick={() => onUpdate({ ...depoente, reuMotivoRetracao: "inducao" })} activeClass={activeClass}>Indução</OptionBtn>
          </div>
        </div>
      )}

      {(depoente.reuConfessouDelegacia === "nao" || depoente.reuRetratou === true) && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Informou álibi:</Label>
            <div className="flex gap-1">
              <OptionBtn active={depoente.reuInformouAlibi === true} onClick={() => onUpdate({ ...depoente, reuInformouAlibi: true })} activeClass={activeClass}>Sim</OptionBtn>
              <OptionBtn active={depoente.reuInformouAlibi === false} onClick={() => onUpdate({ ...depoente, reuInformouAlibi: false })} activeClass={activeClass}>Não</OptionBtn>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Sabe algo do fato:</Label>
            <div className="flex gap-1">
              <OptionBtn active={depoente.reuSabeAlgoFato === true} onClick={() => onUpdate({ ...depoente, reuSabeAlgoFato: true })} activeClass={activeClass}>Sim</OptionBtn>
              <OptionBtn active={depoente.reuSabeAlgoFato === false} onClick={() => onUpdate({ ...depoente, reuSabeAlgoFato: false })} activeClass={activeClass}>Não</OptionBtn>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Label className="text-[10px] text-neutral-600 dark:text-neutral-400">Sabe o que pode tê-lo incriminado:</Label>
            <div className="flex gap-1">
              <OptionBtn active={depoente.reuSabeOQueIncriminou === true} onClick={() => onUpdate({ ...depoente, reuSabeOQueIncriminou: true })} activeClass={activeClass}>Sim</OptionBtn>
              <OptionBtn active={depoente.reuSabeOQueIncriminou === false} onClick={() => onUpdate({ ...depoente, reuSabeOQueIncriminou: false })} activeClass={activeClass}>Não</OptionBtn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Collapsible textarea section with optional transcription buttons
function CollapsibleSection({ title, icon: Icon, field, depoente, onUpdate, expanded, onToggle, placeholder, style, showTranscription, rows = 8 }: {
  title: string; icon: any; field: keyof Depoente; depoente: Depoente; onUpdate: (d: Depoente) => void;
  expanded: boolean; onToggle: () => void; placeholder: string; style: ReturnType<typeof getDepoenteStyle>;
  showTranscription?: boolean; rows?: number;
}) {
  const hasContent = !!depoente[field];

  const appendToField = (text: string) => {
    const current = (depoente[field] as string) || "";
    const newValue = current + (current ? "\n\n" : "") + text;
    onUpdate({ ...depoente, [field]: newValue });
  };

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
      <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }} className="w-full px-3 py-2 flex items-center justify-between bg-white dark:bg-neutral-950 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors cursor-pointer">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-3.5 h-3.5", style.icon)} />
          <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">{title}</span>
          {hasContent && <div className={cn("w-1.5 h-1.5 rounded-full", style.dotColor)} />}
        </div>
        <div className="flex items-center gap-1">
          {showTranscription && (
            <span className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <AudioRecorderButton compact onTranscriptReady={appendToField} />
              <VoiceMemosButton compact onTranscriptReady={appendToField} />
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 text-neutral-400 transition-transform", expanded && "rotate-180")} />
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-3 bg-white dark:bg-neutral-950">
              {!depoente.presente && field === "estrategiaInquiricao" && (
                <div className="mb-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" />
                  Planejamento para próxima audiência
                </div>
              )}
              <Textarea
                value={(depoente[field] as string) || ""}
                onChange={(e) => onUpdate({ ...depoente, [field]: e.target.value })}
                placeholder={placeholder}
                rows={rows}
                className="text-sm font-mono border-neutral-200 dark:border-neutral-800"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TabDepoenteForm({ depoente, onUpdate, expandedSections, toggleSection, expandedDepoenteDetails, toggleDepoenteDetails, evento }: TabDepoenteFormProps) {
  const style = getDepoenteStyle(depoente.tipo);

  const appendToDepoimento = (text: string) => {
    const current = depoente.depoimentoLiteral || "";
    onUpdate({ ...depoente, depoimentoLiteral: current + (current ? "\n\n" : "") + text });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header - compact */}
      <div className={cn("shrink-0 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-lg border-l-4", style.borderCard, "border border-neutral-200/80 dark:border-neutral-800/80 px-3 md:px-4 py-2 mb-2 space-y-1.5")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("w-2 h-2 rounded-full shrink-0", style.dotColor)} />
            <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-50 truncate">{depoente.nome}</span>
            <span className="text-xs text-neutral-500 shrink-0">· {style.label}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Lado (acusação/defesa) */}
            {depoente.lado && (
              <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", depoente.lado === "acusacao" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400")}>
                {depoente.lado === "acusacao" ? "ACUS" : "DEF"}
              </span>
            )}
            {/* Status intimação */}
            <button type="button" onClick={() => {
              const cycle: Array<Depoente["statusIntimacao"]> = ["intimado", "nao-intimado", "frustrada", "mp-desistiu", "dispensado", "pendente"];
              const curr = depoente.statusIntimacao || (depoente.intimado ? "intimado" : "nao-intimado");
              const next = cycle[(cycle.indexOf(curr) + 1) % cycle.length]!;
              onUpdate({ ...depoente, statusIntimacao: next, intimado: next === "intimado" });
            }} className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer", {
              "bg-emerald-600 text-white": (depoente.statusIntimacao || (depoente.intimado ? "intimado" : "nao-intimado")) === "intimado",
              "bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300": (depoente.statusIntimacao || (depoente.intimado ? "intimado" : "nao-intimado")) === "nao-intimado",
              "bg-amber-500 text-white": depoente.statusIntimacao === "frustrada",
              "bg-rose-600 text-white": depoente.statusIntimacao === "mp-desistiu",
              "bg-sky-500 text-white": depoente.statusIntimacao === "dispensado",
              "bg-neutral-500 text-white": depoente.statusIntimacao === "pendente",
            })}>
              {{ intimado: "Intimado", "nao-intimado": "Não intim.", frustrada: "Frustrada", "mp-desistiu": "MP desistiu", dispensado: "Dispensado", pendente: "Pendente" }[(depoente.statusIntimacao || (depoente.intimado ? "intimado" : "nao-intimado"))] || "Não intim."}
            </button>
            {/* Já ouvido */}
            <button type="button" onClick={() => {
              const cycle: Array<NonNullable<Depoente["jaOuvido"]>> = ["nenhum", "delegacia", "audiencia-anterior", "ambos"];
              const curr = depoente.jaOuvido || "nenhum";
              const next = cycle[(cycle.indexOf(curr) + 1) % cycle.length]!;
              onUpdate({ ...depoente, jaOuvido: next });
            }} className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer", {
              "bg-neutral-200 dark:bg-neutral-800 text-neutral-500": !depoente.jaOuvido || depoente.jaOuvido === "nenhum",
              "bg-blue-500 text-white": depoente.jaOuvido === "delegacia",
              "bg-violet-500 text-white": depoente.jaOuvido === "audiencia-anterior",
              "bg-indigo-600 text-white": depoente.jaOuvido === "ambos",
            })}>
              {{ nenhum: "1ª vez", delegacia: "Ouvido DP", "audiencia-anterior": "Ouvido AIJ", ambos: "DP+AIJ" }[depoente.jaOuvido || "nenhum"]}
            </button>
            {/* Presente na audiência atual */}
            <button type="button" onClick={() => onUpdate({ ...depoente, presente: !depoente.presente })} className={cn("px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer", depoente.presente ? "bg-emerald-500 text-white" : "bg-rose-500 text-white")}>
              {depoente.presente ? "Presente" : "Ausente"}
            </button>
          </div>
        </div>

        {/* Depoimentos anteriores (delegacia / audiência anterior) — read-only se importado */}
        {(depoente.depoimentoDelegacia || depoente.depoimentoAnterior || depoente.pontosFortes || depoente.pontosFracos) && (
          <div className="space-y-1.5 mx-1 mb-1">
            {depoente.depoimentoDelegacia && (
              <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400 mb-1">Relato na Delegacia</p>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{depoente.depoimentoDelegacia}</p>
              </div>
            )}
            {depoente.depoimentoAnterior && (
              <div className="rounded-lg bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-violet-600 dark:text-violet-400 mb-1">Depoimento em Audiência Anterior</p>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{depoente.depoimentoAnterior}</p>
              </div>
            )}
            {(depoente.pontosFortes || depoente.pontosFracos) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                {depoente.pontosFortes && (
                  <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Pontos Fortes (Defesa)</p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{depoente.pontosFortes}</p>
                  </div>
                )}
                {depoente.pontosFracos && (
                  <div className="rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-600 dark:text-rose-400 mb-1">Pontos Fracos / Riscos</p>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{depoente.pontosFracos}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Type-specific fields */}
        {(depoente.tipo === "testemunha" || depoente.tipo === "informante") && (
          <div className="space-y-1.5">
            <button type="button" onClick={() => toggleDepoenteDetails(depoente.id)} className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Detalhes {depoente.tipo === "testemunha" ? "da Testemunha" : "do Informante"}</span>
              <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform", expandedDepoenteDetails[depoente.id] && "rotate-180")} />
            </button>
            {expandedDepoenteDetails[depoente.id] && <WitnessTypeFields depoente={depoente} onUpdate={onUpdate} style={style} />}
          </div>
        )}

        {depoente.tipo === "vitima" && (
          <div className="space-y-1.5">
            <button type="button" onClick={() => toggleDepoenteDetails(depoente.id)} className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Detalhes da Vítima</span>
              <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform", expandedDepoenteDetails[depoente.id] && "rotate-180")} />
            </button>
            {expandedDepoenteDetails[depoente.id] && <VictimTypeFields depoente={depoente} onUpdate={onUpdate} evento={evento} style={style} />}
          </div>
        )}

        {depoente.tipo === "reu" && (
          <div className="space-y-1.5">
            <button type="button" onClick={() => toggleDepoenteDetails(depoente.id)} className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
              <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Detalhes do Réu</span>
              <ChevronDown className={cn("w-4 h-4 text-neutral-500 transition-transform", expandedDepoenteDetails[depoente.id] && "rotate-180")} />
            </button>
            {expandedDepoenteDetails[depoente.id] && <DefendantTypeFields depoente={depoente} onUpdate={onUpdate} style={style} />}
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {/* PRIMARY: Depoimento e Trechos Literais - always visible */}
        {depoente.presente && (
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Quote className={cn("w-3.5 h-3.5", style.icon)} />
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">Depoimento e Trechos Literais</span>
                {!!depoente.depoimentoLiteral && <div className={cn("w-1.5 h-1.5 rounded-full", style.dotColor)} />}
              </div>
              <div className="flex items-center gap-0.5">
                <AudioRecorderButton compact onTranscriptReady={appendToDepoimento} />
                <VoiceMemosButton compact onTranscriptReady={appendToDepoimento} />
              </div>
            </div>
            <div className="p-3 bg-white dark:bg-neutral-950">
              {depoente.tipo === "vitima" && (
                <div className="mb-2">
                  <Label className="text-xs mb-1 block text-neutral-700 dark:text-neutral-300">Contradições / Relatos que desmintam</Label>
                  <Textarea
                    value={depoente.vitimaContradicoes || ""}
                    onChange={(e) => onUpdate({ ...depoente, vitimaContradicoes: e.target.value })}
                    placeholder="Contradições identificadas..."
                    rows={3}
                    className="text-sm font-mono border-neutral-200 dark:border-neutral-800 mb-2"
                  />
                </div>
              )}
              <Textarea
                value={depoente.depoimentoLiteral || ""}
                onChange={(e) => onUpdate({ ...depoente, depoimentoLiteral: e.target.value })}
                placeholder="Trechos importantes do depoimento..."
                rows={12}
                className="text-sm font-mono border-neutral-200 dark:border-neutral-800"
              />
            </div>
          </div>
        )}

        {/* SECONDARY: Estratégia - collapsible */}
        <CollapsibleSection
          title="Estratégia de Inquirição"
          icon={Target}
          field="estrategiaInquiricao"
          depoente={depoente}
          onUpdate={onUpdate}
          expanded={expandedSections.estrategia}
          onToggle={() => toggleSection("estrategia")}
          placeholder="Estratégia, linha de questionamento e perguntas..."
          style={style}
          showTranscription
        />

        {/* SECONDARY: Análise - collapsible */}
        {depoente.presente && (
          <CollapsibleSection
            title="Análise e Percepções"
            icon={Eye}
            field="analisePercepcoes"
            depoente={depoente}
            onUpdate={onUpdate}
            expanded={expandedSections.analise}
            onToggle={() => toggleSection("analise")}
            placeholder="Credibilidade e pontos relevantes..."
            style={style}
            showTranscription
          />
        )}
      </div>
    </div>
  );
}
