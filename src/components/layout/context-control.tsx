// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  ChevronDown,
  Gavel,
  Shield,
  Lock,
  RefreshCw,
  Award,
  Scale,
  UserCheck,
  FileText,
  Eye,
  Briefcase,
  Check,
  Layers,
  Settings2,
} from "lucide-react";

// ==========================================
// TIPOS
// ==========================================

export type Defensor = "R" | "J" | "GERAL";
export type AtribuicaoFiltro = "JURI" | "VVD" | "EP" | "TODOS";
export type WorkspaceEspecial = 
  | null 
  | "SUBSTITUICAO_CRIMINAL" 
  | "GRUPO_JURI" 
  | "CURADORIA" 
  | "PETICIONAMENTO" 
  | "SUBSTITUICAO_CIVEL";

interface ContextControlProps {
  collapsed?: boolean;
}

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const DEFENSORES = [
  { id: "R" as Defensor, nome: "Dr. Rodrigo", inicial: "R", cor: "bg-zinc-800 text-white" },
  { id: "J" as Defensor, nome: "Dra. Juliane", inicial: "J", cor: "bg-white border-2 border-zinc-600 text-zinc-900" },
  { id: "GERAL" as Defensor, nome: "Visão Geral", inicial: "G", cor: "bg-zinc-300 text-zinc-700" },
];

const ATRIBUICOES = [
  { id: "TODOS" as AtribuicaoFiltro, nome: "Todas", icon: Layers, cor: "text-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800" },
  { id: "JURI" as AtribuicaoFiltro, nome: "Júri", icon: Gavel, cor: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" },
  { id: "VVD" as AtribuicaoFiltro, nome: "VVD", icon: Shield, cor: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" },
  { id: "EP" as AtribuicaoFiltro, nome: "Exec.", icon: Lock, cor: "text-zinc-600 dark:text-zinc-400", bg: "bg-zinc-100 dark:bg-zinc-800" },
];

const WORKSPACES_ESPECIAIS = [
  { id: null as WorkspaceEspecial, nome: "Principal", icon: Briefcase, cor: "text-zinc-500" },
  { id: "SUBSTITUICAO_CRIMINAL" as WorkspaceEspecial, nome: "Subst. Criminal", icon: RefreshCw, cor: "text-zinc-500" },
  { id: "GRUPO_JURI" as WorkspaceEspecial, nome: "Grupo Júri", icon: Award, cor: "text-zinc-500" },
  { id: "CURADORIA" as WorkspaceEspecial, nome: "Curadoria", icon: UserCheck, cor: "text-zinc-500" },
  { id: "PETICIONAMENTO" as WorkspaceEspecial, nome: "Peticionamento", icon: FileText, cor: "text-zinc-500" },
  { id: "SUBSTITUICAO_CIVEL" as WorkspaceEspecial, nome: "Subst. Cível", icon: Scale, cor: "text-zinc-500" },
];

// ==========================================
// STORAGE KEYS
// ==========================================

const STORAGE_KEYS = {
  defensor: "defender_context_defensor",
  atribuicao: "defender_context_atribuicao",
  workspace: "defender_context_workspace",
  visaoIntegrada: "defender_context_visao_integrada",
};

// ==========================================
// COMPONENTE PRINCIPAL - VERSÃO COMPACTA PREMIUM
// ==========================================

export function ContextControl({ collapsed = false }: ContextControlProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [defensor, setDefensor] = useState<Defensor>("R");
  const [atribuicao, setAtribuicao] = useState<AtribuicaoFiltro>("TODOS");
  const [workspace, setWorkspace] = useState<WorkspaceEspecial>(null);
  const [visaoIntegrada, setVisaoIntegrada] = useState(false);

  // Carregar do localStorage
  useEffect(() => {
    setMounted(true);
    const savedDefensor = localStorage.getItem(STORAGE_KEYS.defensor) as Defensor;
    const savedAtribuicao = localStorage.getItem(STORAGE_KEYS.atribuicao) as AtribuicaoFiltro;
    const savedWorkspace = localStorage.getItem(STORAGE_KEYS.workspace) as WorkspaceEspecial;
    const savedVisao = localStorage.getItem(STORAGE_KEYS.visaoIntegrada);

    if (savedDefensor) setDefensor(savedDefensor);
    if (savedAtribuicao) setAtribuicao(savedAtribuicao);
    if (savedWorkspace && savedWorkspace !== "null") setWorkspace(savedWorkspace);
    if (savedVisao) setVisaoIntegrada(savedVisao === "true");
  }, []);

  // Salvar no localStorage
  const updateDefensor = (value: Defensor) => {
    setDefensor(value);
    localStorage.setItem(STORAGE_KEYS.defensor, value);
  };

  const updateAtribuicao = (value: AtribuicaoFiltro) => {
    setAtribuicao(value);
    localStorage.setItem(STORAGE_KEYS.atribuicao, value);
  };

  const updateWorkspace = (value: WorkspaceEspecial) => {
    setWorkspace(value);
    localStorage.setItem(STORAGE_KEYS.workspace, value || "null");
  };

  const updateVisaoIntegrada = (value: boolean) => {
    setVisaoIntegrada(value);
    localStorage.setItem(STORAGE_KEYS.visaoIntegrada, String(value));
  };

  // Dados atuais
  const defensorAtual = DEFENSORES.find(d => d.id === defensor)!;
  const atribuicaoAtual = ATRIBUICOES.find(a => a.id === atribuicao)!;
  const workspaceAtual = WORKSPACES_ESPECIAIS.find(w => w.id === workspace)!;

  if (!mounted) {
    return (
      <div className="px-3 py-2">
        <div className="h-12 bg-[#2a2a2f]/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Versão colapsada - apenas avatar do defensor
  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-2 px-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md transition-all duration-200",
              "hover:scale-105 hover:shadow-lg",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
              defensorAtual.cor
            )}>
              {defensorAtual.inicial}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-64 p-0 bg-[#1f1f23] border-zinc-700/40 shadow-xl shadow-black/30">
            <ContextPopoverContent 
              defensor={defensor}
              atribuicao={atribuicao}
              workspace={workspace}
              visaoIntegrada={visaoIntegrada}
              updateDefensor={updateDefensor}
              updateAtribuicao={updateAtribuicao}
              updateWorkspace={updateWorkspace}
              updateVisaoIntegrada={updateVisaoIntegrada}
            />
          </PopoverContent>
        </Popover>
        
        {/* Indicadores visuais compactos */}
        <div className="flex gap-1 mt-2">
          {atribuicao !== "TODOS" && (
            <div className={cn("w-1.5 h-1.5 rounded-full", atribuicaoAtual.cor.replace("text-", "bg-"))} />
          )}
          {workspace && (
            <div className={cn("w-1.5 h-1.5 rounded-full", workspaceAtual.cor.replace("text-", "bg-"))} />
          )}
        </div>
      </div>
    );
  }

  // Versão expandida - linha única elegante (TEMA ESCURO)
  return (
    <div className="px-3 py-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200",
            "bg-gradient-to-r from-[#2a2a2f]/70 to-[#252529]/70",
            "border border-zinc-600/30",
            "hover:border-emerald-600/40",
            "hover:shadow-md hover:shadow-emerald-900/10",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
            "group"
          )}>
            {/* Avatar Defensor */}
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0",
              defensorAtual.cor
            )}>
              {defensorAtual.inicial}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-zinc-100 truncate">
                  {defensorAtual.nome}
                </span>
                {atribuicao !== "TODOS" && (
                  <>
                    <span className="text-[10px] text-zinc-500">|</span>
                    <div className={cn("flex items-center gap-0.5", atribuicaoAtual.cor)}>
                      <atribuicaoAtual.icon className="w-3 h-3" />
                      <span className="text-[10px] font-semibold">{atribuicaoAtual.nome}</span>
                    </div>
                  </>
                )}
              </div>
              {workspace && (
                <div className="flex items-center gap-1 mt-0.5">
                  <workspaceAtual.icon className={cn("w-2.5 h-2.5", workspaceAtual.cor)} />
                  <span className="text-[9px] text-zinc-400 truncate">
                    {workspaceAtual.nome}
                  </span>
                </div>
              )}
            </div>

            {/* Chevron */}
            <Settings2 className={cn(
              "w-4 h-4 text-zinc-500 transition-all duration-200 flex-shrink-0",
              "group-hover:text-zinc-300",
              open && "rotate-90"
            )} />
          </button>
        </PopoverTrigger>
        
        <PopoverContent align="start" className="w-72 p-0 bg-[#1f1f23] border-zinc-700/40 shadow-xl shadow-black/30">
          <ContextPopoverContent 
            defensor={defensor}
            atribuicao={atribuicao}
            workspace={workspace}
            visaoIntegrada={visaoIntegrada}
            updateDefensor={updateDefensor}
            updateAtribuicao={updateAtribuicao}
            updateWorkspace={updateWorkspace}
            updateVisaoIntegrada={updateVisaoIntegrada}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ==========================================
// CONTEÚDO DO POPOVER
// ==========================================

function ContextPopoverContent({
  defensor,
  atribuicao,
  workspace,
  visaoIntegrada,
  updateDefensor,
  updateAtribuicao,
  updateWorkspace,
  updateVisaoIntegrada,
}: {
  defensor: Defensor;
  atribuicao: AtribuicaoFiltro;
  workspace: WorkspaceEspecial;
  visaoIntegrada: boolean;
  updateDefensor: (v: Defensor) => void;
  updateAtribuicao: (v: AtribuicaoFiltro) => void;
  updateWorkspace: (v: WorkspaceEspecial) => void;
  updateVisaoIntegrada: (v: boolean) => void;
}) {
  return (
    <div className="divide-y divide-zinc-600/30">
      {/* Seção: Defensor */}
      <div className="p-3">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
          Defensor
        </p>
        <div className="flex gap-2">
          {DEFENSORES.map((d) => (
            <button
              key={d.id}
              onClick={() => updateDefensor(d.id)}
              className={cn(
                "flex-1 py-2 px-2 rounded-lg transition-all duration-200 text-center",
                "border-2",
                defensor === d.id 
                  ? "border-emerald-500 bg-emerald-900/30" 
                  : "border-transparent hover:bg-zinc-700/50"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs mx-auto mb-1",
                d.cor
              )}>
                {d.inicial}
              </div>
              <p className="text-[10px] font-medium text-zinc-300 truncate">
                {d.nome.split(' ')[0]}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Seção: Filtro de Atribuição */}
      <div className="p-3">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
          Filtrar Atribuição
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {ATRIBUICOES.map((a) => (
            <button
              key={a.id}
              onClick={() => updateAtribuicao(a.id)}
              className={cn(
                "py-2 px-1 rounded-lg transition-all duration-200 text-center",
                atribuicao === a.id 
                  ? "ring-2 ring-emerald-500 bg-zinc-700/50"
                  : "hover:bg-zinc-700/50"
              )}
            >
              <a.icon className={cn("w-4 h-4 mx-auto mb-1", a.cor)} />
              <p className="text-[9px] font-semibold text-zinc-300">
                {a.nome}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Seção: Workspace */}
      <div className="p-3">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
          Workspace
        </p>
        <div className="space-y-1">
          {WORKSPACES_ESPECIAIS.map((w) => (
            <button
              key={w.id || "principal"}
              onClick={() => updateWorkspace(w.id)}
              className={cn(
                "w-full flex items-center gap-2 py-2 px-2.5 rounded-lg transition-all duration-200",
                workspace === w.id 
                  ? "bg-emerald-900/30 ring-1 ring-emerald-500/50" 
                  : "hover:bg-zinc-700/50"
              )}
            >
              <w.icon className={cn("w-4 h-4 flex-shrink-0", w.cor)} />
              <span className="text-xs font-medium text-zinc-200 flex-1 text-left">
                {w.nome}
              </span>
              {workspace === w.id && (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Seção: Visão Integrada */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs font-medium text-zinc-200">
                Visão Integrada
              </p>
              <p className="text-[10px] text-zinc-500">
                Incluir workspaces especiais
              </p>
            </div>
          </div>
          <Switch
            checked={visaoIntegrada}
            onCheckedChange={updateVisaoIntegrada}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// HOOK PARA USAR O CONTEXTO
// ==========================================

export function useContextControl() {
  const [defensor, setDefensor] = useState<Defensor>("R");
  const [atribuicao, setAtribuicao] = useState<AtribuicaoFiltro>("TODOS");
  const [workspace, setWorkspace] = useState<WorkspaceEspecial>(null);
  const [visaoIntegrada, setVisaoIntegrada] = useState(false);

  useEffect(() => {
    const savedDefensor = localStorage.getItem(STORAGE_KEYS.defensor) as Defensor;
    const savedAtribuicao = localStorage.getItem(STORAGE_KEYS.atribuicao) as AtribuicaoFiltro;
    const savedWorkspace = localStorage.getItem(STORAGE_KEYS.workspace) as WorkspaceEspecial;
    const savedVisao = localStorage.getItem(STORAGE_KEYS.visaoIntegrada);

    if (savedDefensor) setDefensor(savedDefensor);
    if (savedAtribuicao) setAtribuicao(savedAtribuicao);
    if (savedWorkspace && savedWorkspace !== "null") setWorkspace(savedWorkspace);
    if (savedVisao) setVisaoIntegrada(savedVisao === "true");

    // Listener para mudanças
    const handleStorage = () => {
      const d = localStorage.getItem(STORAGE_KEYS.defensor) as Defensor;
      const a = localStorage.getItem(STORAGE_KEYS.atribuicao) as AtribuicaoFiltro;
      const w = localStorage.getItem(STORAGE_KEYS.workspace) as WorkspaceEspecial;
      const v = localStorage.getItem(STORAGE_KEYS.visaoIntegrada);
      if (d) setDefensor(d);
      if (a) setAtribuicao(a);
      if (w && w !== "null") setWorkspace(w); else setWorkspace(null);
      if (v) setVisaoIntegrada(v === "true");
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return {
    defensor,
    atribuicao,
    workspace,
    visaoIntegrada,
    isWorkspaceEspecial: workspace !== null,
    defensorNome: DEFENSORES.find(d => d.id === defensor)?.nome || "",
  };
}
