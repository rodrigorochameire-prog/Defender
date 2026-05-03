"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Users, Notebook, BookOpen,
  Sparkles, Gavel, X, Save, CheckCircle2, Circle, CircleDashed, ChevronDown,
} from "lucide-react";
import { useRegistroForm } from "./hooks/use-registro-form";
import { TabBriefing } from "./tabs/tab-briefing";
import { TabDepoentes } from "./tabs/tab-depoentes";
import { TabAnotacoes } from "./tabs/tab-anotacoes";
import { TabResultado } from "./tabs/tab-resultado";
import { TabHistorico } from "./tabs/tab-historico";
import type { RegistroAudienciaData } from "./types";
import type { TabKey } from "./hooks/use-registro-form";
import { getCompletudeBreakdown, type CompletudeState } from "./historico/count-completude";
import { SUBTIPO_CONFIG, corBadge, type SubtipoAudiencia } from "./subtipo-audiencia";

interface RegistroAudienciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (registro: RegistroAudienciaData) => void;
  evento: any;
  onCriarNovoEvento?: (evento: any) => void;
}

function completudeStateColor(state: CompletudeState): string {
  if (state === "full") return "bg-emerald-500";
  if (state === "partial") return "bg-amber-400";
  return "bg-neutral-300 dark:bg-neutral-700";
}

const COMPLETUDE_LABEL: Record<CompletudeState, string> = {
  full: "completo",
  partial: "parcial",
  empty: "vazio",
};

type TabDef = { key: TabKey; label: string; icon: any; countKey?: "depoentes" | "historico" };

function buildTabConfig(subtipo: SubtipoAudiencia): TabDef[] {
  const cfg = SUBTIPO_CONFIG[subtipo];
  const tabs: TabDef[] = [
    { key: "briefing", label: "Briefing", icon: Sparkles },
  ];
  if (cfg.exibeAbaDepoentes) {
    tabs.push({ key: "depoentes", label: cfg.labelAbaDepoentes, icon: Users, countKey: "depoentes" });
  }
  tabs.push({ key: "anotacoes", label: "Anotações", icon: Notebook });
  tabs.push({ key: "resultado", label: "Resultado", icon: CheckCircle2 });
  tabs.push({ key: "historico", label: "Histórico", icon: BookOpen, countKey: "historico" });
  return tabs;
}

export function RegistroAudienciaModal({ isOpen, onClose, onSave, evento, onCriarNovoEvento }: RegistroAudienciaModalProps) {
  const form = useRegistroForm({ evento, isOpen, onSave, onCriarNovoEvento });

  const tabCounts: Record<string, number> = {
    depoentes: form.registro.depoentes.length,
    historico: form.registrosAnteriores.length,
  };

  // Tabs dinâmicas a partir do subtipo detectado/escolhido
  const visibleTabs = buildTabConfig(form.subtipoAudiencia);
  const tabConfig = visibleTabs;
  const subtipoCores = corBadge(form.subtipoConfig.cor);
  const SubtipoIcon = form.subtipoConfig.icon;

  const [completudePopoverOpen, setCompletudePopoverOpen] = useState(false);
  const [subtipoSelectorOpen, setSubtipoSelectorOpen] = useState(false);

  const briefingData: { imputacao?: string | null; fatos?: string | null } | undefined =
    (form as any).briefingData ?? undefined;
  const completude = getCompletudeBreakdown(
    form.registro,
    form.statusAudiencia,
    briefingData,
    form.registroSalvo,
  );

  const identificacaoLinha = (() => {
    const assistidoName = typeof evento.assistido === "string" ? evento.assistido : evento.assistido?.nome;
    const assistidoId = typeof evento.assistido === "object" ? evento.assistido?.id : evento.assistidoId;
    const processoDisplay = typeof evento.processo === "string" ? evento.processo : evento.processo?.numero;
    const processoId = typeof evento.processo === "object" ? evento.processo?.id : evento.processoId;
    return (
      <>
        {assistidoId ? (
          <Link
            href={`/admin/assistidos/${assistidoId}`}
            target="_blank"
            rel="noopener"
            className="font-medium text-foreground/90 hover:underline"
          >
            {assistidoName}
          </Link>
        ) : (
          <span className="font-medium text-foreground/90">{assistidoName}</span>
        )}
        {processoDisplay && (
          <>
            {" · "}
            {processoId ? (
              <Link
                href={`/admin/processos/${processoId}`}
                target="_blank"
                rel="noopener"
                className="font-mono hover:underline"
              >
                {processoDisplay}
              </Link>
            ) : (
              <span className="font-mono">{processoDisplay}</span>
            )}
          </>
        )}
        {" · "}
        {new Date(evento.data).toLocaleDateString("pt-BR")}
        {evento.horarioInicio && ` · ${evento.horarioInicio}`}
      </>
    );
  })();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-none w-[98vw] md:w-[98vw] h-[98vh] flex flex-col overflow-hidden bg-white dark:bg-neutral-950 p-0 gap-0" hideClose>
        <DialogTitle className="sr-only">Registro de Audiencia Judicial</DialogTitle>
        <DialogDescription className="sr-only">
          Sistema para registro de audiencias com gestao de depoentes.
        </DialogDescription>

        {/* Header - Linha 1: identidade + ações */}
        <div className="bg-white dark:bg-neutral-950 border-b border-neutral-200/80 dark:border-border/80 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0 shadow-lg">
              <Gavel className="w-5 h-5 text-background" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-lg font-semibold text-foreground">
                  Registro de Audiência
                </h2>
                {form.registroSalvo && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Salvo
                  </Badge>
                )}
                {form.registroSalvo && form.ultimoSalvamento && (
                  <span className="text-[10px] text-muted-foreground">
                    {form.ultimoSalvamento}
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {identificacaoLinha}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-muted flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-muted transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5 text-foreground/80" />
          </button>
        </div>

        {/* Linha 2: banner do subtipo de audiência + seletor manual */}
        <div className={`${subtipoCores.bgSubtle} border-b ${subtipoCores.border} px-4 py-2 flex items-start gap-3 flex-shrink-0`}>
          <div className={`w-7 h-7 rounded-md ${subtipoCores.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
            <SubtipoIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold ${subtipoCores.text}`}>
                {form.subtipoConfig.label}
              </span>
              <Popover open={subtipoSelectorOpen} onOpenChange={setSubtipoSelectorOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-black/20 cursor-pointer transition-colors"
                    title="Trocar tipo (caso a detecção automática esteja errada)"
                  >
                    trocar
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 p-1.5">
                  <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wide">
                    Mudar tipo de audiência
                  </div>
                  {Object.values(SUBTIPO_CONFIG).map((cfg) => {
                    const Icon = cfg.icon;
                    const cores = corBadge(cfg.cor);
                    const isCurrent = cfg.key === form.subtipoAudiencia;
                    return (
                      <button
                        key={cfg.key}
                        type="button"
                        onClick={() => {
                          form.setSubtipoOverride(cfg.key);
                          setSubtipoSelectorOpen(false);
                        }}
                        className={`w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-muted text-left cursor-pointer ${isCurrent ? "bg-neutral-100 dark:bg-muted" : ""}`}
                      >
                        <div className={`w-5 h-5 rounded-md ${cores.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium ${isCurrent ? cores.text : "text-foreground"}`}>{cfg.label}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-2">{cfg.foco}</div>
                        </div>
                        {isCurrent && <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${cores.text}`} />}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
              {form.subtipoAuto !== form.subtipoAudiencia && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-600 dark:border-amber-800 dark:text-amber-500">
                  manual
                </Badge>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              {form.subtipoConfig.foco}
            </div>
            {form.subtipoConfig.lembretes.length > 0 && (
              <details className="mt-1">
                <summary className={`text-[10px] cursor-pointer ${subtipoCores.text} hover:underline`}>
                  ver {form.subtipoConfig.lembretes.length} lembrete{form.subtipoConfig.lembretes.length > 1 ? "s" : ""} desse rito
                </summary>
                <ul className="mt-1 space-y-0.5 text-[10px] text-muted-foreground list-disc pl-4">
                  {form.subtipoConfig.lembretes.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </div>

        {/* Linha 3: faixa de contexto (atribuição + vara + Juiz/MP) */}
        <div className="bg-neutral-50 dark:bg-neutral-900/40 border-b border-neutral-200 dark:border-border/60 px-4 py-1.5 flex items-center gap-3 flex-wrap flex-shrink-0">
          {evento.atribuicao && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
              {evento.atribuicao}
            </Badge>
          )}
          {evento.local && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[240px]">
              {evento.local}
            </span>
          )}
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Juiz:</span>
            <input
              type="text"
              value={form.juiz}
              onChange={(e) => form.setJuiz(e.target.value)}
              placeholder="Nome do juiz"
              className="text-xs px-1.5 py-0.5 h-5 w-32 md:w-40 border border-neutral-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-950 text-foreground focus:outline-none focus:ring-1 focus:ring-neutral-500/20 focus:border-neutral-500"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">MP:</span>
            <input
              type="text"
              value={form.promotor}
              onChange={(e) => form.setPromotor(e.target.value)}
              placeholder="Nome do promotor"
              className="text-xs px-1.5 py-0.5 h-5 w-32 md:w-40 border border-neutral-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-950 text-foreground focus:outline-none focus:ring-1 focus:ring-neutral-500/20 focus:border-neutral-500"
            />
          </label>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 dark:border-border bg-neutral-50 dark:bg-muted/50 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-0 px-2 md:px-4">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const count = tab.countKey ? tabCounts[tab.countKey] : undefined;
              const isActive = form.activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => form.setActiveTab(tab.key)}
                  className={`px-3 sm:px-2 md:px-3 py-2.5 sm:py-2 md:py-3 text-xs md:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 md:gap-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-foreground text-foreground bg-white dark:bg-neutral-950"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {count !== undefined && count > 0 && (
                    <Badge className="bg-neutral-100 dark:bg-muted text-muted-foreground text-[10px] px-1.5 py-0">
                      {count}
                    </Badge>
                  )}
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${completudeStateColor(completude.byTab[tab.key])}`}
                    title={`Completude: ${COMPLETUDE_LABEL[completude.byTab[tab.key]]}`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4">
              {form.activeTab === "briefing" && (
                <TabBriefing
                  evento={evento}
                  audienciaId={form.audienciaId}
                  onImportarParaDepoentes={(depoentes) => {
                    form.setRegistro((prev) => {
                      const existingNames = new Set(
                        prev.depoentes.map((d) => d.nome.trim().toLowerCase()),
                      );
                      const novos = depoentes.filter(
                        (d) => !existingNames.has(d.nome.trim().toLowerCase()),
                      );
                      return { ...prev, depoentes: [...prev.depoentes, ...novos] };
                    });
                    form.setActiveTab("depoentes");
                  }}
                />
              )}

              {form.activeTab === "depoentes" && (
                  <TabDepoentes
                    depoentes={form.registro.depoentes}
                    editandoDepoente={form.editandoDepoente}
                    setEditandoDepoente={form.setEditandoDepoente}
                    novoDepoenteNome={form.novoDepoenteNome}
                    setNovoDepoenteNome={form.setNovoDepoenteNome}
                    novoDepoenteTipo={form.novoDepoenteTipo}
                    setNovoDepoenteTipo={form.setNovoDepoenteTipo}
                    handleAddDepoente={form.handleAddDepoente}
                    handleRemoveDepoente={form.handleRemoveDepoente}
                    handleUpdateDepoente={form.handleUpdateDepoente}
                    expandedSections={form.expandedSections}
                    toggleSection={form.toggleSection}
                    expandedDepoenteDetails={form.expandedDepoenteDetails}
                    toggleDepoenteDetails={form.toggleDepoenteDetails}
                    evento={evento}
                    tiposPermitidos={form.subtipoConfig.tiposDepoente}
                  />
              )}

              {form.activeTab === "anotacoes" && (
                  <TabAnotacoes
                    registro={form.registro}
                    updateRegistro={form.updateRegistro}
                    audienciaId={form.audienciaId}
                    assistidoId={form.assistidoId}
                  />
              )}

              {form.activeTab === "resultado" && (
                  <TabResultado
                    registro={form.registro}
                    updateRegistro={form.updateRegistro}
                    statusAudiencia={form.statusAudiencia}
                    setStatusAudiencia={form.setStatusAudiencia}
                    decretoRevelia={form.decretoRevelia}
                    setDecretoRevelia={form.setDecretoRevelia}
                    testemunhaIntimada={form.testemunhaIntimada}
                    setTestemunhaIntimada={form.setTestemunhaIntimada}
                    parteInsistiu={form.parteInsistiu}
                    setParteInsistiu={form.setParteInsistiu}
                    depoentesRedesignacao={form.depoentesRedesignacao}
                    setDepoentesRedesignacao={form.setDepoentesRedesignacao}
                    novaDataPopoverOpen={form.novaDataPopoverOpen}
                    setNovaDataPopoverOpen={form.setNovaDataPopoverOpen}
                    novoHorarioPopoverOpen={form.novoHorarioPopoverOpen}
                    setNovoHorarioPopoverOpen={form.setNovoHorarioPopoverOpen}
                    evento={evento}
                  />
              )}

              {form.activeTab === "historico" && (
                  <TabHistorico
                    registrosAnteriores={form.registrosAnteriores}
                    registroAtual={form.registro}
                    statusAtual={form.statusAudiencia}
                  />
              )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 dark:border-border p-2 md:p-3 bg-neutral-50 dark:bg-muted/50 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span>
              {form.registro.depoentes.length} depoente{form.registro.depoentes.length !== 1 ? "s" : ""}
            </span>
            <Popover open={completudePopoverOpen} onOpenChange={setCompletudePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                >
                  {completude.filled}/{completude.total} preenchidos
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" side="top" className="w-56 p-1.5">
                <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wide">
                  Completude do registro
                </div>
                {tabConfig.map((tab) => {
                  const state = completude.byTab[tab.key];
                  const Icon = state === "full" ? CheckCircle2 : state === "partial" ? CircleDashed : Circle;
                  const color =
                    state === "full"
                      ? "text-emerald-500"
                      : state === "partial"
                        ? "text-amber-500"
                        : "text-neutral-400";
                  const countSuffix = tab.countKey ? ` (${tabCounts[tab.countKey] ?? 0})` : "";
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => {
                        form.setActiveTab(tab.key);
                        setCompletudePopoverOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-muted text-xs text-left cursor-pointer"
                    >
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
                      <span className="flex-1">{tab.label}{countSuffix}</span>
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
            {form.isDirty && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">Alteracoes nao salvas</span>
            )}
            {form.autoSaveStatus === "saving" && (
              <span className="text-[10px] text-neutral-400">Salvando...</span>
            )}
            {form.autoSaveStatus === "saved" && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Auto-salvo</span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-none text-xs md:text-sm h-8 md:h-9 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => form.handleSubmit({ concluir: false })}
              title="Salva o que houver (sem exigir resultado/motivo). Você pode continuar editando depois."
              className="flex-1 sm:flex-none text-xs md:text-sm h-8 md:h-9 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              Salvar rascunho
            </Button>
            <Button
              type="button"
              onClick={() => form.handleSubmit({ concluir: true })}
              title="Marca a audiência como concluída. Exige resultado (ou motivo, se redesignada)."
              className="bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 flex-1 sm:flex-none text-xs md:text-sm h-8 md:h-9 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              {form.registroSalvo ? "Atualizar e concluir" : "Concluir audiência"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
