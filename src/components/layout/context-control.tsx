// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  ChevronRight,
  RefreshCw,
  Award,
  Scale,
  UserCheck,
  FileText,
  Eye,
  Briefcase,
  Check,
  Settings2,
  Building2,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAssignment, Assignment } from "@/contexts/assignment-context";
import { useProfissional, type ProfissionalConfig } from "@/contexts/profissional-context";
import { usePermissions } from "@/hooks/use-permissions";

// ==========================================
// TIPOS
// ==========================================

export type Defensor = string; // Now dynamic: profissional ID as string, or "GERAL"
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
// CONFIGURAÇÕES ESTÁTICAS
// ==========================================

// Filtros de atribuição removidos - agora gerenciados via menu Especialidades na sidebar

const WORKSPACES_ESPECIAIS = [
  { id: null as WorkspaceEspecial, nome: "Principal", icon: Briefcase, cor: "text-zinc-500" },
  { id: "SUBSTITUICAO_CRIMINAL" as WorkspaceEspecial, nome: "Subst. Criminal", icon: RefreshCw, cor: "text-zinc-500" },
  { id: "GRUPO_JURI" as WorkspaceEspecial, nome: "Grupo Juri", icon: Award, cor: "text-zinc-500" },
  { id: "CURADORIA" as WorkspaceEspecial, nome: "Curadoria", icon: UserCheck, cor: "text-zinc-500" },
  { id: "PETICIONAMENTO" as WorkspaceEspecial, nome: "Peticionamento", icon: FileText, cor: "text-zinc-500" },
  { id: "SUBSTITUICAO_CIVEL" as WorkspaceEspecial, nome: "Subst. Civel", icon: Scale, cor: "text-zinc-500" },
];

// ==========================================
// STORAGE KEYS
// ==========================================

export const STORAGE_KEYS = {
  defensor: "defender_context_defensor",
  atribuicao: "defender_context_atribuicao",
  workspace: "defender_context_workspace",
  visaoIntegrada: "defender_context_visao_integrada",
};

// ==========================================
// HOOK PARA ACESSAR FILTRO DE ATRIBUICAO
// ==========================================

// Evento customizado para notificar mudancas de atribuicao na mesma aba
const ATRIBUICAO_CHANGE_EVENT = "atribuicao-filtro-change";

export function dispatchAtribuicaoChange(atribuicao: AtribuicaoFiltro) {
  window.dispatchEvent(new CustomEvent(ATRIBUICAO_CHANGE_EVENT, { detail: atribuicao }));
}

export function useAtribuicaoFiltro() {
  const [atribuicao, setAtribuicao] = useState<AtribuicaoFiltro>("TODOS");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEYS.atribuicao) as AtribuicaoFiltro;
    if (saved) setAtribuicao(saved);

    // Escutar mudancas no localStorage (de outras abas)
    const handleStorage = () => {
      const updated = localStorage.getItem(STORAGE_KEYS.atribuicao) as AtribuicaoFiltro;
      if (updated) setAtribuicao(updated);
    };

    // Escutar evento customizado (da mesma aba)
    const handleCustomEvent = (e: CustomEvent<AtribuicaoFiltro>) => {
      setAtribuicao(e.detail);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(ATRIBUICAO_CHANGE_EVENT, handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(ATRIBUICAO_CHANGE_EVENT, handleCustomEvent as EventListener);
    };
  }, []);

  return { atribuicao, isAllSelected: atribuicao === "TODOS", mounted };
}

// ==========================================
// HELPER: Gerar dados de display para um defensor
// ==========================================

function getDefensorDisplayData(config: ProfissionalConfig): { id: string; nome: string; nomeCurto: string; inicial: string; cor: string; grupo: string } {
  const inicial = config.nomeCurto?.[0]?.toUpperCase() || config.nome[0]?.toUpperCase() || "?";

  // Cores distintas baseadas no ID (match do estilo original)
  let cor = "bg-zinc-600 text-white";
  if (config.id === 1) cor = "bg-zinc-800 text-white";
  else if (config.id === 2) cor = "bg-white border-2 border-zinc-600 text-zinc-900";
  else if (config.id === 3) cor = "bg-zinc-700 text-white";
  else if (config.id === 4) cor = "bg-zinc-500 text-white";

  return {
    id: String(config.id),
    nome: config.nome,
    nomeCurto: config.nomeCurto || config.nome.split(' ').slice(0, 2).join(' '),
    inicial,
    cor,
    grupo: config.grupo,
  };
}

// ==========================================
// COMPONENTE PRINCIPAL - VERSAO COMPACTA PREMIUM
// ==========================================

// Mapeamento de AtribuicaoFiltro para Assignment
const ATRIBUICAO_TO_ASSIGNMENT: Record<AtribuicaoFiltro, Assignment | null> = {
  TODOS: null,
  JURI: "JURI_CAMACARI",
  VVD: "VVD_CAMACARI",
  EP: "EXECUCAO_PENAL",
};

export function ContextControl({ collapsed = false }: ContextControlProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [defensor, setDefensor] = useState<Defensor>("1");
  const [atribuicao, setAtribuicao] = useState<AtribuicaoFiltro>("TODOS");
  const [workspace, setWorkspace] = useState<WorkspaceEspecial>(null);
  const [visaoIntegrada, setVisaoIntegrada] = useState(false);

  const { setAssignment } = useAssignment();
  const { profissionaisConfigs, profissionalAtivo, profissionalLogado, setProfissionalAtivo } = useProfissional();
  const { user: sessionUser } = usePermissions();

  // Verificar se o usuario logado pode ver o switcher de contexto
  // Apenas defensores especializados (grupo juri_ep_vvd) e admin veem o switcher
  const canSeeSwitcher = useMemo(() => {
    // Admin sempre ve
    if (sessionUser?.role === "admin") return true;
    
    // Se nao eh defensor, nao ve
    if (sessionUser?.role !== "defensor") return false;
    
    // Verificar se o profissional logado eh do grupo especializado
    if (profissionalLogado && profissionalLogado.grupo === "juri_ep_vvd") return true;
    
    return false;
  }, [sessionUser, profissionalLogado]);

  // Construir lista de defensores dinamicamente a partir do contexto
  const defensoresDisplay = useMemo(() => {
    const items = profissionaisConfigs.map(getDefensorDisplayData);
    // Adicionar "Visao Geral" no final
    items.push({
      id: "GERAL",
      nome: "Visao Geral",
      nomeCurto: "Visao Geral",
      inicial: "G",
      cor: "bg-zinc-300 text-zinc-700",
      grupo: "todos",
    });
    return items;
  }, [profissionaisConfigs]);

  // Detectar se o defensor selecionado eh criminal geral
  const defensorSelecionadoGrupo = useMemo(() => {
    if (defensor === "GERAL") return "todos";
    const found = profissionaisConfigs.find((c) => String(c.id) === defensor);
    return found?.grupo || "juri_ep_vvd";
  }, [defensor, profissionaisConfigs]);

  const isCriminalGeral = defensorSelecionadoGrupo === "varas_criminais";

  // Carregar do localStorage
  useEffect(() => {
    setMounted(true);
    const savedDefensor = localStorage.getItem(STORAGE_KEYS.defensor) as Defensor;
    const savedAtribuicao = localStorage.getItem(STORAGE_KEYS.atribuicao) as AtribuicaoFiltro;
    const savedWorkspace = localStorage.getItem(STORAGE_KEYS.workspace) as WorkspaceEspecial;
    const savedVisao = localStorage.getItem(STORAGE_KEYS.visaoIntegrada);

    if (savedDefensor) {
      // Migrar valores antigos: "R" -> "1", "J" -> "2"
      let migrated = savedDefensor;
      if (savedDefensor === "R") migrated = "1";
      else if (savedDefensor === "J") migrated = "2";
      setDefensor(migrated);
    }
    if (savedAtribuicao) {
      setAtribuicao(savedAtribuicao);
      const assignment = ATRIBUICAO_TO_ASSIGNMENT[savedAtribuicao];
      if (assignment) {
        setAssignment(assignment);
      }
    }
    if (savedWorkspace && savedWorkspace !== "null") setWorkspace(savedWorkspace);
    if (savedVisao) setVisaoIntegrada(savedVisao === "true");
  }, [setAssignment]);

  // Sincronizar com ProfissionalContext quando o defensor muda
  useEffect(() => {
    if (!mounted) return;
    if (defensor === "GERAL") {
      setProfissionalAtivo(0);
    } else {
      const id = parseInt(defensor, 10);
      if (!isNaN(id)) {
        setProfissionalAtivo(id);
      }
    }
  }, [defensor, mounted, setProfissionalAtivo]);

  // Salvar no localStorage
  const updateDefensor = (value: Defensor) => {
    setDefensor(value);
    localStorage.setItem(STORAGE_KEYS.defensor, value);
  };

  const updateAtribuicao = (value: AtribuicaoFiltro) => {
    setAtribuicao(value);
    localStorage.setItem(STORAGE_KEYS.atribuicao, value);

    dispatchAtribuicaoChange(value);

    const assignment = ATRIBUICAO_TO_ASSIGNMENT[value];
    if (assignment) {
      setAssignment(assignment);
    }
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
  const defensorAtual = defensoresDisplay.find(d => d.id === defensor) || defensoresDisplay[0];
  const workspaceAtual = WORKSPACES_ESPECIAIS.find(w => w.id === workspace)!;

  if (!mounted) {
    return (
      <div className="px-3 py-2">
        <div className="h-12 bg-[#2a2a2f]/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Se o usuario nao pode ver o switcher, nao renderiza nada
  // Isso se aplica a: Danilo, Cristiane, estagiarios, servidor, triagem
  if (!canSeeSwitcher) {
    return null;
  }

  // Versao colapsada - apenas avatar do defensor
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
          <PopoverContent side="right" align="start" className="w-72 p-0 bg-[#1f1f23] border-zinc-700/40 shadow-xl shadow-black/30">
            <ContextPopoverContent
              defensor={defensor}
              atribuicao={atribuicao}
              workspace={workspace}
              visaoIntegrada={visaoIntegrada}
              updateDefensor={updateDefensor}
              updateAtribuicao={updateAtribuicao}
              updateWorkspace={updateWorkspace}
              updateVisaoIntegrada={updateVisaoIntegrada}
              defensoresDisplay={defensoresDisplay}
              isCriminalGeral={isCriminalGeral}
            />
          </PopoverContent>
        </Popover>

        {/* Indicadores visuais compactos */}
        {workspace && (
          <div className="flex gap-1 mt-2">
            <div className={cn("w-1.5 h-1.5 rounded-full", workspaceAtual.cor.replace("text-", "bg-"))} />
          </div>
        )}
      </div>
    );
  }

  // Versao expandida - linha unica elegante (TEMA ESCURO)
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
                {isCriminalGeral && (
                  <>
                    <span className="text-[10px] text-zinc-500">|</span>
                    <div className="flex items-center gap-0.5 text-zinc-400">
                      <Building2 className="w-3 h-3" />
                      <span className="text-[10px] font-semibold">Vara Criminal</span>
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
            defensoresDisplay={defensoresDisplay}
            isCriminalGeral={isCriminalGeral}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ==========================================
// CONTEUDO DO POPOVER
// ==========================================

interface DefensorDisplay {
  id: string;
  nome: string;
  nomeCurto: string;
  inicial: string;
  cor: string;
  grupo: string;
}

function ContextPopoverContent({
  defensor,
  atribuicao,
  workspace,
  visaoIntegrada,
  updateDefensor,
  updateAtribuicao,
  updateWorkspace,
  updateVisaoIntegrada,
  defensoresDisplay,
  isCriminalGeral,
}: {
  defensor: Defensor;
  atribuicao: AtribuicaoFiltro;
  workspace: WorkspaceEspecial;
  visaoIntegrada: boolean;
  updateDefensor: (v: Defensor) => void;
  updateAtribuicao: (v: AtribuicaoFiltro) => void;
  updateWorkspace: (v: WorkspaceEspecial) => void;
  updateVisaoIntegrada: (v: boolean) => void;
  defensoresDisplay: DefensorDisplay[];
  isCriminalGeral: boolean;
}) {
  // Separar defensores por grupo para melhor organizacao
  const juriEpVvdDefensores = defensoresDisplay.filter(d => d.grupo === "juri_ep_vvd");
  const varasCriminaisDefensores = defensoresDisplay.filter(d => d.grupo === "varas_criminais");
  const geralOption = defensoresDisplay.find(d => d.id === "GERAL");

  return (
    <div className="divide-y divide-zinc-600/30">
      {/* Secao: Defensor Principal */}
      <div className="p-3">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
          Defensor
        </p>

        {/* Defensores Principais (Juri/EP/VVD) */}
        <div className="flex gap-2 mb-2">
          {juriEpVvdDefensores.map((d) => (
            <button
              key={d.id}
              onClick={() => updateDefensor(d.id)}
              className={cn(
                "flex-1 py-2.5 px-2 rounded-xl transition-all duration-200 text-center",
                "border-2",
                defensor === d.id
                  ? "border-emerald-500 bg-emerald-900/30 shadow-lg shadow-emerald-900/20"
                  : "border-zinc-700/50 hover:bg-zinc-700/50 hover:border-zinc-600"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm mx-auto mb-1 shadow-md",
                d.cor
              )}>
                {d.inicial}
              </div>
              <p className="text-[10px] font-semibold text-zinc-200 leading-tight">
                {d.nomeCurto.split(' ').slice(0, 2).join(' ')}
              </p>
            </button>
          ))}
        </div>

        {/* Visao Geral - Destaque especial */}
        {geralOption && (
          <button
            onClick={() => updateDefensor(geralOption.id)}
            className={cn(
              "w-full py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-3",
              "border-2 mt-2",
              defensor === geralOption.id
                ? "border-emerald-500 bg-gradient-to-r from-emerald-900/40 to-emerald-800/30 shadow-lg shadow-emerald-900/20"
                : "border-zinc-600/50 hover:bg-zinc-700/50 hover:border-zinc-500 bg-zinc-800/30"
            )}
          >
            <Eye className={cn(
              "w-5 h-5",
              defensor === geralOption.id ? "text-emerald-400" : "text-zinc-400"
            )} />
            <p className={cn(
              "text-sm font-semibold",
              defensor === geralOption.id ? "text-emerald-300" : "text-zinc-300"
            )}>
              Visão Geral
            </p>
          </button>
        )}

        {/* Varas Criminais - Seção colapsável para admin */}
        {varasCriminaisDefensores.length > 0 && (
          <Collapsible className="mt-3">
            <CollapsibleTrigger className="w-full pt-2 border-t border-zinc-700/30 flex items-center justify-between group">
              <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-3 h-3" />
                Modo Admin
              </p>
              <ChevronRight className="w-3 h-3 text-zinc-600 transition-transform group-data-[state=open]:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex gap-2">
                {varasCriminaisDefensores.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => updateDefensor(d.id)}
                    className={cn(
                      "flex-1 py-1.5 px-2 rounded-lg transition-all duration-200 text-center",
                      "border opacity-50 hover:opacity-100",
                      defensor === d.id
                        ? "border-zinc-500 bg-zinc-700/50 opacity-100"
                        : "border-zinc-700/30 hover:bg-zinc-800/50"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] mx-auto mb-0.5",
                      d.cor
                    )}>
                      {d.inicial}
                    </div>
                    <p className="text-[9px] font-medium text-zinc-400 truncate">
                      {d.nomeCurto}
                    </p>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* Secao: Workspace */}
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

      {/* Secao: Visao Integrada */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-xs font-medium text-zinc-200">
                Visao Integrada
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
  const [defensor, setDefensor] = useState<Defensor>("1");
  const [atribuicao, setAtribuicao] = useState<AtribuicaoFiltro>("TODOS");
  const [workspace, setWorkspace] = useState<WorkspaceEspecial>(null);
  const [visaoIntegrada, setVisaoIntegrada] = useState(false);

  useEffect(() => {
    const savedDefensor = localStorage.getItem(STORAGE_KEYS.defensor) as Defensor;
    const savedAtribuicao = localStorage.getItem(STORAGE_KEYS.atribuicao) as AtribuicaoFiltro;
    const savedWorkspace = localStorage.getItem(STORAGE_KEYS.workspace) as WorkspaceEspecial;
    const savedVisao = localStorage.getItem(STORAGE_KEYS.visaoIntegrada);

    if (savedDefensor) {
      // Migrar valores antigos
      let migrated = savedDefensor;
      if (savedDefensor === "R") migrated = "1";
      else if (savedDefensor === "J") migrated = "2";
      setDefensor(migrated);
    }
    if (savedAtribuicao) setAtribuicao(savedAtribuicao);
    if (savedWorkspace && savedWorkspace !== "null") setWorkspace(savedWorkspace);
    if (savedVisao) setVisaoIntegrada(savedVisao === "true");

    // Listener para mudancas
    const handleStorage = () => {
      const d = localStorage.getItem(STORAGE_KEYS.defensor) as Defensor;
      const a = localStorage.getItem(STORAGE_KEYS.atribuicao) as AtribuicaoFiltro;
      const w = localStorage.getItem(STORAGE_KEYS.workspace) as WorkspaceEspecial;
      const v = localStorage.getItem(STORAGE_KEYS.visaoIntegrada);
      if (d) {
        let migrated = d;
        if (d === "R") migrated = "1";
        else if (d === "J") migrated = "2";
        setDefensor(migrated);
      }
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
    defensorNome: defensor === "GERAL" ? "Visao Geral" : "",
  };
}
