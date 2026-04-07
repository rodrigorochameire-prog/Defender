"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// motion/AnimatePresence removed — exit animations were stalling tab switches
import {
  FileText, Users, Notebook, MessageSquare, Eye, BookOpen,
  Sparkles, Gavel, X, Save, CheckCircle2, HardDrive, Wand2, Zap,
} from "lucide-react";
import { BriefingSection } from "@/components/briefing";
import { useRegistroForm } from "./hooks/use-registro-form";
import { TabGeral } from "./tabs/tab-geral";
import { TabRapido } from "./tabs/tab-rapido";
import { TabPreparacao } from "./tabs/tab-preparacao";
import { TabDepoentes } from "./tabs/tab-depoentes";
import { TabAnotacoes } from "./tabs/tab-anotacoes";
import { TabManifestacoes } from "./tabs/tab-manifestacoes";
import { TabRegistro } from "./tabs/tab-registro";
import { TabHistorico } from "./tabs/tab-historico";
import { TabMidia } from "./tabs/tab-midia";
import type { RegistroAudienciaData } from "./types";
import type { TabKey } from "./hooks/use-registro-form";

interface RegistroAudienciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (registro: RegistroAudienciaData) => void;
  evento: any;
  onCriarNovoEvento?: (evento: any) => void;
}

const tabConfig: { key: TabKey; label: string; icon: any; countKey?: "depoentes" | "historico" }[] = [
  { key: "rapido", label: "Rápido", icon: Zap },
  { key: "geral", label: "Geral", icon: FileText },
  { key: "briefing", label: "Briefing", icon: Sparkles },
  { key: "preparacao", label: "Preparação", icon: Wand2 },
  { key: "depoentes", label: "Depoentes", icon: Users, countKey: "depoentes" },
  { key: "anotacoes", label: "Anotações", icon: Notebook },
  { key: "manifestacoes", label: "Manifestações", icon: MessageSquare },
  { key: "midia", label: "Mídia", icon: HardDrive },
  { key: "registro", label: "Registro", icon: Eye },
  { key: "historico", label: "Histórico", icon: BookOpen, countKey: "historico" },
];

export function RegistroAudienciaModal({ isOpen, onClose, onSave, evento, onCriarNovoEvento }: RegistroAudienciaModalProps) {
  const form = useRegistroForm({ evento, isOpen, onSave, onCriarNovoEvento });

  const tabCounts: Record<string, number> = {
    depoentes: form.registro.depoentes.length,
    historico: form.registrosAnteriores.length,
  };

  const visibleTabs = tabConfig.filter(
    (tab) => tab.key !== "historico" || form.registrosAnteriores.length > 0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-none w-[98vw] md:w-[98vw] h-[98vh] flex flex-col overflow-hidden bg-white dark:bg-neutral-950 p-0 gap-0" hideClose>
        <DialogTitle className="sr-only">Registro de Audiência Judicial</DialogTitle>
        <DialogDescription className="sr-only">
          Sistema para registro de audiências com gestão de depoentes.
        </DialogDescription>

        {/* Header - Padrão Defender */}
        <div className="bg-white dark:bg-neutral-950 border-b border-neutral-200/80 dark:border-border/80 px-3 py-2.5 md:px-4 md:py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0 shadow-lg">
              <Gavel className="w-4 h-4 md:w-5 md:h-5 text-background" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-sm md:text-lg font-semibold text-foreground truncate">
                  {evento.titulo}
                </h2>
                {form.registroSalvo && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Salvo
                  </Badge>
                )}
              </div>
              <p className="text-xs md:text-sm font-semibold text-foreground/80 truncate">
                {(() => {
                  const assistidoName = typeof evento.assistido === "string" ? evento.assistido : evento.assistido?.nome;
                  const assistidoId = typeof evento.assistido === "object" ? evento.assistido?.id : evento.assistidoId;
                  if (assistidoId) {
                    return (
                      <Link
                        href={`/admin/assistidos/${assistidoId}`}
                        target="_blank"
                        rel="noopener"
                        className="text-foreground/80 hover:text-foreground hover:underline transition-colors truncate"
                      >
                        {assistidoName}
                      </Link>
                    );
                  }
                  return assistidoName;
                })()}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                  {new Date(evento.data).toLocaleDateString("pt-BR")} • {evento.horarioInicio}
                  {evento.processo && (() => {
                    const processoDisplay = typeof evento.processo === "string" ? evento.processo : evento.processo?.numero;
                    const processoId = typeof evento.processo === "object" ? evento.processo?.id : evento.processoId;
                    if (processoId) {
                      return (
                        <>
                          {" • "}
                          <Link
                            href={`/admin/processos/${processoId}`}
                            target="_blank"
                            rel="noopener"
                            className="font-mono text-muted-foreground hover:text-foreground hover:underline transition-colors"
                          >
                            {processoDisplay}
                          </Link>
                        </>
                      );
                    }
                    return ` • ${processoDisplay}`;
                  })()}
                </p>
                {evento.atribuicao && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border text-muted-foreground">
                    {evento.atribuicao}
                  </Badge>
                )}
                {form.registroSalvo && form.ultimoSalvamento && (
                  <span className="text-[9px] text-muted-foreground">
                    • Último salvamento: {form.ultimoSalvamento}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {form.registroSalvo && (
              <Button
                variant="outline"
                size="sm"
                onClick={form.handleSubmit}
                className="hidden md:flex items-center gap-1.5 h-8 text-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Atualizar
              </Button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-neutral-100 dark:bg-muted flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-foreground/80" />
            </button>
          </div>
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4">
              {form.activeTab === "rapido" && (
                  <TabRapido
                    registro={form.registro}
                    updateRegistro={form.updateRegistro}
                    statusAudiencia={form.statusAudiencia}
                    setStatusAudiencia={form.setStatusAudiencia}
                    handleUpdateDepoente={form.handleUpdateDepoente}
                    handleSubmit={form.handleSubmit}
                    registroSalvo={form.registroSalvo}
                  />
              )}

              {form.activeTab === "geral" && (
                  <TabGeral
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

              {form.activeTab === "briefing" && (
                <div className="max-w-5xl mx-auto">
                  <BriefingSection evento={evento} />
                </div>
              )}

              {form.activeTab === "preparacao" && (
                <TabPreparacao
                  audienciaId={form.audienciaId}
                  evento={evento}
                  onImportarParaDepoentes={(depoentes) => {
                    form.setRegistro((prev) => {
                      // Merge by name (case-insensitive) — keep existing entries.
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
                  />
              )}

              {form.activeTab === "anotacoes" && (
                  <TabAnotacoes registro={form.registro} updateRegistro={form.updateRegistro} />
              )}

              {form.activeTab === "manifestacoes" && (
                  <TabManifestacoes registro={form.registro} updateRegistro={form.updateRegistro} />
              )}

              {form.activeTab === "midia" && (
                  <TabMidia
                    assistidoId={(() => {
                      const aid = evento.assistido?.id ?? evento.assistidoId;
                      return typeof aid === "number" ? aid : undefined;
                    })()}
                    processoId={(() => {
                      const pid = evento.processo?.id ?? evento.processoId;
                      return typeof pid === "number" ? pid : undefined;
                    })()}
                    assistidoNome={typeof evento.assistido === "string" ? evento.assistido : evento.assistido?.nome}
                  />
              )}

              {form.activeTab === "registro" && (
                  <TabRegistro
                    registro={form.registro}
                    statusAudiencia={form.statusAudiencia}
                    completude={form.completude}
                    depoentesRedesignacao={form.depoentesRedesignacao}
                    setActiveTab={form.setActiveTab}
                    evento={evento}
                  />
              )}

              {form.activeTab === "historico" && (
                  <TabHistorico registrosAnteriores={form.registrosAnteriores} />
              )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 dark:border-border p-2 md:p-3 bg-neutral-50 dark:bg-muted/50 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          <div className="text-xs text-neutral-500">
            {form.registro.depoentes.length} depoente{form.registro.depoentes.length !== 1 ? "s" : ""}
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
              onClick={form.handleSubmit}
              className="bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 flex-1 sm:flex-none text-xs md:text-sm h-8 md:h-9 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              {form.registroSalvo ? "Atualizar Registro" : "Salvar Registro"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
