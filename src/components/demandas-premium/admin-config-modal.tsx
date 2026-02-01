"use client";

import { useState } from "react";
import { X, Plus, Trash2, Settings2, Tag, FileCheck, Scale, Folder, Palette, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AdminConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ConfigTab = "status" | "atos" | "atribuicoes" | "processos";

interface StatusConfig {
  value: string;
  label: string;
  group: string;
  color: string;
}

interface AtoConfig {
  atribuicao: string;
  atos: string[];
}

interface AtribuicaoConfig {
  value: string;
  label: string;
  color: string;
}

interface ProcessoConfig {
  tipo: string;
  descricao: string;
}

export function AdminConfigModal({ isOpen, onClose }: AdminConfigModalProps) {
  const [activeTab, setActiveTab] = useState<ConfigTab>("status");

  // Estados para Status
  const [statusList, setStatusList] = useState<StatusConfig[]>([
    { value: "urgente", label: "Urgente", group: "urgente", color: "#DC2626" },
    { value: "analisar", label: "Analisar", group: "preparacao", color: "#F59E0B" },
    { value: "elaborar", label: "Elaborar", group: "preparacao", color: "#3B82F6" },
    { value: "elaborando", label: "Elaborando", group: "preparacao", color: "#6366F1" },
    { value: "revisar", label: "Revisar", group: "preparacao", color: "#8B5CF6" },
    { value: "protocolar", label: "Protocolar", group: "delegacao", color: "#EC4899" },
    { value: "fila", label: "Fila", group: "fila", color: "#64748B" },
    { value: "protocolado", label: "Protocolado", group: "monitoramento", color: "#10B981" },
    { value: "monitorar", label: "Monitorar", group: "monitoramento", color: "#14B8A6" },
    { value: "resolvido", label: "Resolvido", group: "concluida", color: "#22C55E" },
  ]);

  // Estados para Atos
  const [atosList, setAtosList] = useState<AtoConfig[]>([
    {
      atribuicao: "Tribunal do Júri",
      atos: [
        "Resposta à Acusação",
        "Alegações finais",
        "Apelação",
        "Habeas Corpus",
        "Ciência da pronúncia",
      ],
    },
    {
      atribuicao: "Violência Doméstica",
      atos: [
        "Resposta à Acusação",
        "Revogação de MPU",
        "Modulação de MPU",
        "Habeas Corpus",
      ],
    },
  ]);

  // Estados para Atribuições
  const [atribuicoesList, setAtribuicoesList] = useState<AtribuicaoConfig[]>([
    { value: "Tribunal do Júri", label: "Tribunal do Júri", color: "#10B981" },
    { value: "Violência Doméstica", label: "Violência Doméstica", color: "#F59E0B" },
    { value: "Execução Penal", label: "Execução Penal", color: "#3B82F6" },
    { value: "Criminal Geral", label: "Criminal Geral", color: "#DC2626" },
    { value: "Substituição", label: "Substituição", color: "#8B5CF6" },
    { value: "Curadoria Especial", label: "Curadoria Especial", color: "#64748B" },
  ]);

  // Estados para Processos
  const [processosList, setProcessosList] = useState<ProcessoConfig[]>([
    { tipo: "AP", descricao: "Ação Penal" },
    { tipo: "HC", descricao: "Habeas Corpus" },
    { tipo: "MPU", descricao: "Medida Protetiva de Urgência" },
    { tipo: "IP", descricao: "Inquérito Policial" },
    { tipo: "RESE", descricao: "Recurso em Sentido Estrito" },
    { tipo: "ED", descricao: "Embargos de Declaração" },
  ]);

  // Formulários
  const [newStatus, setNewStatus] = useState({ value: "", label: "", group: "preparacao", color: "#3B82F6" });
  const [newAto, setNewAto] = useState({ atribuicao: "", ato: "" });
  const [newAtribuicao, setNewAtribuicao] = useState({ value: "", label: "", color: "#3B82F6" });
  const [newProcesso, setNewProcesso] = useState({ tipo: "", descricao: "" });

  // Handlers para Status
  const handleAddStatus = () => {
    if (!newStatus.value || !newStatus.label) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setStatusList([...statusList, { ...newStatus }]);
    setNewStatus({ value: "", label: "", group: "preparacao", color: "#3B82F6" });
    toast.success("Status adicionado!");
  };

  const handleDeleteStatus = (value: string) => {
    setStatusList(statusList.filter((s) => s.value !== value));
    toast.success("Status removido!");
  };

  // Handlers para Atos
  const handleAddAto = () => {
    if (!newAto.atribuicao || !newAto.ato) {
      toast.error("Preencha todos os campos");
      return;
    }

    const atribuicaoIndex = atosList.findIndex((a) => a.atribuicao === newAto.atribuicao);
    
    if (atribuicaoIndex >= 0) {
      const updated = [...atosList];
      updated[atribuicaoIndex].atos.push(newAto.ato);
      setAtosList(updated);
    } else {
      setAtosList([...atosList, { atribuicao: newAto.atribuicao, atos: [newAto.ato] }]);
    }
    
    setNewAto({ atribuicao: "", ato: "" });
    toast.success("Ato adicionado!");
  };

  const handleDeleteAto = (atribuicao: string, ato: string) => {
    const updated = atosList.map((config) => {
      if (config.atribuicao === atribuicao) {
        return {
          ...config,
          atos: config.atos.filter((a) => a !== ato),
        };
      }
      return config;
    }).filter((config) => config.atos.length > 0);
    
    setAtosList(updated);
    toast.success("Ato removido!");
  };

  // Handlers para Atribuições
  const handleAddAtribuicao = () => {
    if (!newAtribuicao.value || !newAtribuicao.label) {
      toast.error("Preencha todos os campos");
      return;
    }
    setAtribuicoesList([...atribuicoesList, { ...newAtribuicao }]);
    setNewAtribuicao({ value: "", label: "", color: "#3B82F6" });
    toast.success("Atribuição adicionada!");
  };

  const handleDeleteAtribuicao = (value: string) => {
    setAtribuicoesList(atribuicoesList.filter((a) => a.value !== value));
    toast.success("Atribuição removida!");
  };

  // Handlers para Processos
  const handleAddProcesso = () => {
    if (!newProcesso.tipo || !newProcesso.descricao) {
      toast.error("Preencha todos os campos");
      return;
    }
    setProcessosList([...processosList, { ...newProcesso }]);
    setNewProcesso({ tipo: "", descricao: "" });
    toast.success("Tipo de processo adicionado!");
  };

  const handleDeleteProcesso = (tipo: string) => {
    setProcessosList(processosList.filter((p) => p.tipo !== tipo));
    toast.success("Tipo de processo removido!");
  };

  // Salvar todas as configurações
  const handleSaveAll = () => {
    localStorage.setItem("defender_status_config", JSON.stringify(statusList));
    localStorage.setItem("defender_atos_config", JSON.stringify(atosList));
    localStorage.setItem("defender_atribuicoes_config", JSON.stringify(atribuicoesList));
    localStorage.setItem("defender_processos_config", JSON.stringify(processosList));
    
    toast.success("Configurações salvas com sucesso!", {
      description: "As alterações serão aplicadas ao recarregar a página."
    });
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "status" as ConfigTab, label: "Status", icon: Tag, count: statusList.length },
    { id: "atribuicoes" as ConfigTab, label: "Atribuições", icon: Scale, count: atribuicoesList.length },
    { id: "atos" as ConfigTab, label: "Atos", icon: FileCheck, count: atosList.reduce((acc, a) => acc + a.atos.length, 0) },
    { id: "processos" as ConfigTab, label: "Processos", icon: Folder, count: processosList.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {/* Header Compacto */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Settings2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                Configurações
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Gerencie status, atos, atribuições e processos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
          </button>
        </div>

        {/* Tabs Compactas */}
        <div className="flex items-center gap-0.5 px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-zinc-700 dark:bg-zinc-300 text-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                  isActive
                    ? "bg-white/20 text-white dark:bg-zinc-900/30 dark:text-zinc-900"
                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Alerta de Administração */}
        <div className="mx-6 mt-3 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-l-2 border-amber-400 rounded-r-md flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Alterações afetam toda a aplicação. Salve após modificar.
          </p>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* TAB: STATUS */}
          {activeTab === "status" && (
            <div className="space-y-4">
              {/* Formulário de Adição - Inline Compacto */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Adicionar Novo Status</h3>
                </div>
                <div className="grid grid-cols-[1fr_1fr_140px_80px_auto] gap-2">
                  <Input
                    placeholder="Valor (ex: urgente)"
                    value={newStatus.value}
                    onChange={(e) => setNewStatus({ ...newStatus, value: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <Input
                    placeholder="Label (ex: Urgente)"
                    value={newStatus.label}
                    onChange={(e) => setNewStatus({ ...newStatus, label: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <select
                    value={newStatus.group}
                    onChange={(e) => setNewStatus({ ...newStatus, group: e.target.value })}
                    className="h-9 px-2 text-xs border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="preparacao">Preparação</option>
                    <option value="delegacao">Delegação</option>
                    <option value="monitoramento">Monitoramento</option>
                    <option value="fila">Fila</option>
                    <option value="concluida">Concluída</option>
                    <option value="urgente">Urgente</option>
                  </select>
                  <input
                    type="color"
                    value={newStatus.color}
                    onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                    className="h-9 w-full rounded-md cursor-pointer"
                  />
                  <Button onClick={handleAddStatus} size="sm" className="h-9 bg-violet-500 hover:bg-violet-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Status - Grid Compacto */}
              <div className="grid grid-cols-2 gap-2">
                {statusList.map((status) => (
                  <div
                    key={status.value}
                    className="group flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-600 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: status.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                          {status.label}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {status.group}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStatus(status.value)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 py-2">
                {statusList.length} status configurados
              </p>
            </div>
          )}

          {/* TAB: ATOS */}
          {activeTab === "atos" && (
            <div className="space-y-4">
              {/* Formulário de Adição */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Adicionar Novo Ato</h3>
                </div>
                <div className="grid grid-cols-[200px_1fr_auto] gap-2">
                  <select
                    value={newAto.atribuicao}
                    onChange={(e) => setNewAto({ ...newAto, atribuicao: e.target.value })}
                    className="h-9 px-2 text-xs border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Selecione atribuição</option>
                    {atribuicoesList.map((attr) => (
                      <option key={attr.value} value={attr.value}>
                        {attr.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Nome do ato"
                    value={newAto.ato}
                    onChange={(e) => setNewAto({ ...newAto, ato: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <Button onClick={handleAddAto} size="sm" className="h-9 bg-violet-500 hover:bg-violet-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Atos por Atribuição */}
              <div className="space-y-3">
                {atosList.map((atoConfig) => (
                  <div
                    key={atoConfig.atribuicao}
                    className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
                  >
                    <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center justify-between">
                        {atoConfig.atribuicao}
                        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {atoConfig.atos.length} atos
                        </span>
                      </h4>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      {atoConfig.atos.map((ato) => (
                        <div
                          key={ato}
                          className="group flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-600 transition-all"
                        >
                          <span className="text-xs text-zinc-900 dark:text-zinc-50 truncate flex-1">
                            {ato}
                          </span>
                          <button
                            onClick={() => handleDeleteAto(atoConfig.atribuicao, ato)}
                            className="opacity-0 group-hover:opacity-100 ml-2 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                          >
                            <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ATRIBUIÇÕES */}
          {activeTab === "atribuicoes" && (
            <div className="space-y-4">
              {/* Formulário de Adição */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Adicionar Nova Atribuição</h3>
                </div>
                <div className="grid grid-cols-[1fr_1fr_80px_auto] gap-2">
                  <Input
                    placeholder="Valor (ex: tribunal_juri)"
                    value={newAtribuicao.value}
                    onChange={(e) => setNewAtribuicao({ ...newAtribuicao, value: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <Input
                    placeholder="Label (ex: Tribunal do Júri)"
                    value={newAtribuicao.label}
                    onChange={(e) => setNewAtribuicao({ ...newAtribuicao, label: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <input
                    type="color"
                    value={newAtribuicao.color}
                    onChange={(e) => setNewAtribuicao({ ...newAtribuicao, color: e.target.value })}
                    className="h-9 w-full rounded-md cursor-pointer"
                  />
                  <Button onClick={handleAddAtribuicao} size="sm" className="h-9 bg-violet-500 hover:bg-violet-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Atribuições */}
              <div className="grid grid-cols-2 gap-2">
                {atribuicoesList.map((attr) => (
                  <div
                    key={attr.value}
                    className="group flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-600 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: attr.color }}
                      />
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                        {attr.label}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteAtribuicao(attr.value)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 py-2">
                {atribuicoesList.length} atribuições configuradas
              </p>
            </div>
          )}

          {/* TAB: PROCESSOS */}
          {activeTab === "processos" && (
            <div className="space-y-4">
              {/* Formulário de Adição */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Adicionar Tipo de Processo</h3>
                </div>
                <div className="grid grid-cols-[120px_1fr_auto] gap-2">
                  <Input
                    placeholder="Tipo (ex: HC)"
                    value={newProcesso.tipo}
                    onChange={(e) => setNewProcesso({ ...newProcesso, tipo: e.target.value.toUpperCase() })}
                    className="h-9 text-xs"
                  />
                  <Input
                    placeholder="Descrição (ex: Habeas Corpus)"
                    value={newProcesso.descricao}
                    onChange={(e) => setNewProcesso({ ...newProcesso, descricao: e.target.value })}
                    className="h-9 text-xs"
                  />
                  <Button onClick={handleAddProcesso} size="sm" className="h-9 bg-violet-500 hover:bg-violet-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Processos */}
              <div className="grid grid-cols-2 gap-2">
                {processosList.map((proc) => (
                  <div
                    key={proc.tipo}
                    className="group flex items-center justify-between p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-violet-300 dark:hover:border-violet-600 transition-all"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-bold rounded">
                        {proc.tipo}
                      </span>
                      <p className="text-sm text-zinc-900 dark:text-zinc-50 truncate">
                        {proc.descricao}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteProcesso(proc.tipo)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 py-2">
                {processosList.length} tipos de processo configurados
              </p>
            </div>
          )}
        </div>

        {/* Footer Compacto */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
            Alterações não salvas serão perdidas
          </p>
          <div className="flex gap-2">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-zinc-500 hover:text-zinc-700"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAll}
              size="sm"
              className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-300 dark:text-zinc-900 text-white"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}