"use client";

import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText, Users, Notebook, MessageSquare, Eye, BookOpen,
  Sparkles, Gavel, X, Save, CheckCircle2,
} from "lucide-react";
import { BriefingSection } from "@/components/briefing";
import { useRegistroForm } from "./hooks/use-registro-form";
import { TabGeral } from "./tabs/tab-geral";
import { TabDepoentes } from "./tabs/tab-depoentes";
import { TabAnotacoes } from "./tabs/tab-anotacoes";
import { TabManifestacoes } from "./tabs/tab-manifestacoes";
import { TabRegistro } from "./tabs/tab-registro";
import { TabHistorico } from "./tabs/tab-historico";
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
  { key: "geral", label: "Geral", icon: FileText },
  { key: "briefing", label: "Briefing", icon: Sparkles },
  { key: "depoentes", label: "Depoentes", icon: Users, countKey: "depoentes" },
  { key: "anotacoes", label: "Anotações", icon: Notebook },
  { key: "manifestacoes", label: "Manifestações", icon: MessageSquare },
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
      <DialogContent className="!max-w-none w-[98vw] md:w-[98vw] h-[98vh] flex flex-col overflow-hidden bg-white dark:bg-zinc-950 p-0 gap-0" hideClose>
        <DialogTitle className="sr-only">Registro de Audiência Judicial</DialogTitle>
        <DialogDescription className="sr-only">
          Sistema para registro de audiências com gestão de depoentes.
        </DialogDescription>

        {/* Header - Padrão Defender */}
        <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200/80 dark:border-zinc-800/80 px-3 py-2.5 md:px-4 md:py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center flex-shrink-0 shadow-lg">
              <Gavel className="w-4 h-4 md:w-5 md:h-5 text-white dark:text-zinc-900" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-sm md:text-lg font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {evento.titulo}
                </h2>
                {form.registroSalvo && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Salvo
                  </Badge>
                )}
              </div>
              <p className="text-xs md:text-sm font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                {(() => {
                  const assistidoName = typeof evento.assistido === "string" ? evento.assistido : evento.assistido?.nome;
                  const assistidoId = typeof evento.assistido === "object" ? evento.assistido?.id : evento.assistidoId;
                  if (assistidoId) {
                    return (
                      <Link
                        href={`/admin/assistidos/${assistidoId}`}
                        target="_blank"
                        rel="noopener"
                        className="text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors truncate"
                      >
                        {assistidoName}
                      </Link>
                    );
                  }
                  return assistidoName;
                })()}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 truncate">
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
                            className="font-mono text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors"
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
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                    {evento.atribuicao}
                  </Badge>
                )}
                {form.registroSalvo && form.ultimoSalvamento && (
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-500">
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
              className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 md:w-5 md:h-5 text-zinc-700 dark:text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Tabs - Emerald active */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-0 px-2 md:px-4">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const count = tab.countKey ? tabCounts[tab.countKey] : undefined;
              const isActive = form.activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => form.setActiveTab(tab.key)}
                  className={`px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 md:gap-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-emerald-600 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950"
                      : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {count !== undefined && count > 0 && (
                    <Badge className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] px-1.5 py-0">
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
            <AnimatePresence mode="wait">
              {form.activeTab === "geral" && (
                <motion.div key="geral" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
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
                </motion.div>
              )}

              {form.activeTab === "briefing" && (
                <motion.div key="briefing" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="max-w-5xl mx-auto">
                  <BriefingSection evento={evento} />
                </motion.div>
              )}

              {form.activeTab === "depoentes" && (
                <motion.div key="depoentes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
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
                </motion.div>
              )}

              {form.activeTab === "anotacoes" && (
                <motion.div key="anotacoes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <TabAnotacoes registro={form.registro} updateRegistro={form.updateRegistro} />
                </motion.div>
              )}

              {form.activeTab === "manifestacoes" && (
                <motion.div key="manifestacoes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <TabManifestacoes registro={form.registro} updateRegistro={form.updateRegistro} />
                </motion.div>
              )}

              {form.activeTab === "registro" && (
                <motion.div key="registro" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <TabRegistro
                    registro={form.registro}
                    statusAudiencia={form.statusAudiencia}
                    completude={form.completude}
                    depoentesRedesignacao={form.depoentesRedesignacao}
                    setActiveTab={form.setActiveTab}
                    evento={evento}
                  />
                </motion.div>
              )}

              {form.activeTab === "historico" && (
                <motion.div key="historico" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <TabHistorico registrosAnteriores={form.registrosAnteriores} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 md:p-3 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          <div className="text-xs text-zinc-500">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none text-xs md:text-sm h-8 md:h-9 cursor-pointer"
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
