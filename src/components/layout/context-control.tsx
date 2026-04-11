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
import { useDefensor } from "@/contexts/defensor-context";
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
  { id: null as WorkspaceEspecial, nome: "Principal", icon: Briefcase, cor: "text-muted-foreground" },
  { id: "SUBSTITUICAO_CRIMINAL" as WorkspaceEspecial, nome: "Subst. Criminal", icon: RefreshCw, cor: "text-muted-foreground" },
  { id: "GRUPO_JURI" as WorkspaceEspecial, nome: "Grupo Juri", icon: Award, cor: "text-muted-foreground" },
  { id: "CURADORIA" as WorkspaceEspecial, nome: "Curadoria", icon: UserCheck, cor: "text-muted-foreground" },
  { id: "PETICIONAMENTO" as WorkspaceEspecial, nome: "Peticionamento", icon: FileText, cor: "text-muted-foreground" },
  { id: "SUBSTITUICAO_CIVEL" as WorkspaceEspecial, nome: "Subst. Civel", icon: Scale, cor: "text-muted-foreground" },
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
// HELPER: Extrair inicial sem prefixos profissionais
// ==========================================

function getDisplayInitial(name: string): string {
  // Strip common professional prefixes (Dr., Dra., Dr , Dra )
  const cleaned = name
    .replace(/^(Dr\.|Dra\.|Dr |Dra )/i, '')
    .trim();
  return (cleaned.charAt(0) || name.charAt(0)).toUpperCase();
}

// ==========================================
// HELPER: Gerar dados de display para um defensor
// ==========================================

function getDefensorDisplayData(config: ProfissionalConfig): { id: string; nome: string; nomeCurto: string; inicial: string; cor: string; grupo: string } {
  const inicial = getDisplayInitial(config.nomeCurto || config.nome);

  // Cores distintas baseadas no ID (match do estilo original)
  let cor = "bg-neutral-600 text-white";
  if (config.id === 1) cor = "bg-neutral-800 text-white";
  else if (config.id === 2) cor = "bg-white border-2 border-neutral-600 text-neutral-900";
  else if (config.id === 3) cor = "bg-neutral-700 text-white";
  else if (config.id === 4) cor = "bg-neutral-500 text-white";

  return {
    id: String(config.id),
    nome: config.nome,
    nomeCurto: config.nomeCurto || (config.nome ?? "").split(' ').slice(0, 2).join(' '),
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
  const { setSelectedDefensorId } = useDefensor();
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
      cor: "bg-neutral-300 text-neutral-700",
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
    // Sair do modo peer ao trocar de profissional interno.
    setSelectedDefensorId(null);
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
        <div className="h-12 bg-black/[0.04] dark:bg-white/[0.04] rounded-xl animate-pulse" />
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
              "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-200",
              "hover:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-600",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
              defensorAtual.cor
            )}>
              {defensorAtual.inicial}
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" sideOffset={16} className="w-64 p-0 bg-popover border border-border shadow-lg rounded-xl overflow-hidden">
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

  // Versao expandida - discreta e compacta
  return (
    <div className="px-3 py-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={cn(
            "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-150",
            "bg-neutral-50 dark:bg-neutral-900/50",
            "border border-neutral-200/60 dark:border-neutral-700/40",
            "hover:border-neutral-300 dark:hover:border-neutral-600",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
            "group"
          )}>
            {/* Avatar Defensor */}
            <div className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center font-bold text-[11px] flex-shrink-0",
              defensorAtual.cor
            )}>
              {defensorAtual.inicial}
            </div>

            {/* Nome */}
            <div className="flex-1 min-w-0 text-left">
              <span className="text-[11px] font-semibold text-foreground truncate block">
                {defensorAtual.nomeCurto.split(' ').slice(0, 2).join(' ')}
              </span>
              {isCriminalGeral && (
                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                  <Building2 className="w-2.5 h-2.5" />
                  Vara Criminal
                </span>
              )}
            </div>

            {/* Ícone sutil */}
            <ChevronRight className={cn(
              "w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-150 flex-shrink-0",
              "group-hover:text-muted-foreground",
              open && "rotate-90"
            )} />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" sideOffset={8} className="w-64 p-0 bg-popover border border-border shadow-lg rounded-xl overflow-hidden">
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
  const geralOption = defensoresDisplay.find(d => d.id === "GERAL");

  return (
    <div>
      {/* Header */}
      <div className="px-3 pt-3 pb-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Perfil ativo
        </p>
      </div>

      {/* Defensores Principais (Juri/EP/VVD) — inline compacto */}
      <div className="px-3 pb-2">
        <div className="flex gap-1.5">
          {juriEpVvdDefensores.map((d) => {
            const isActive = defensor === d.id;
            return (
              <button
                key={d.id}
                onClick={() => updateDefensor(d.id)}
                className={cn(
                  "flex-1 py-2 px-1.5 rounded-lg transition-all duration-150 text-center",
                  isActive
                    ? "bg-neutral-100 dark:bg-neutral-800 ring-1 ring-neutral-300 dark:ring-neutral-600"
                    : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center font-bold text-xs mx-auto mb-1",
                  isActive && "ring-2 ring-neutral-400 dark:ring-neutral-500",
                  d.cor
                )}>
                  {d.inicial}
                </div>
                <p className={cn(
                  "text-[10px] leading-tight truncate",
                  isActive ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                )}>
                  {d.nomeCurto.split(' ').slice(0, 2).join(' ')}
                </p>
              </button>
            );
          })}
        </div>

        {/* Visao Geral — botão com ícone de olho */}
        {geralOption && (
          <button
            onClick={() => updateDefensor(geralOption.id)}
            className={cn(
              "w-full py-2 px-3 rounded-lg transition-all duration-150 flex items-center gap-2.5 mt-1.5",
              defensor === geralOption.id
                ? "bg-neutral-100 dark:bg-neutral-800 ring-1 ring-neutral-300 dark:ring-neutral-600"
                : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            )}
          >
            <Eye className={cn(
              "w-4 h-4 flex-shrink-0",
              defensor === geralOption.id ? "text-foreground" : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-xs",
              defensor === geralOption.id ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
            )}>
              Visão agregada
            </span>
            {defensor === geralOption.id && (
              <Check className="w-3.5 h-3.5 text-foreground ml-auto flex-shrink-0" />
            )}
          </button>
        )}
      </div>

      {/* Secao: Visao Integrada */}
      <div className="mx-3 h-px bg-border" />
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-[11px] font-medium text-foreground">
                Visão Integrada
              </p>
              <p className="text-[9px] text-muted-foreground">
                Incluir registros de todos
              </p>
            </div>
          </div>
          <Switch
            checked={visaoIntegrada}
            onCheckedChange={updateVisaoIntegrada}
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
