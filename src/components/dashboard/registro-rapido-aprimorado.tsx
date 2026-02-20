"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Info,
  FileText,
  PenLine,
  UserPlus,
  User,
  ChevronsUpDown,
  Plus,
  Check,
  X,
  Lock,
  Send,
  FolderOpen,
  Scale,
  ListTodo,
  Calendar,
  Clock,
  Building2,
  Phone,
  FileUp,
  Briefcase,
  Gavel,
  Home,
  AlertCircle,
} from "lucide-react";
import { DelegacaoModal } from "@/components/demandas/delegacao-modal";
import { usePermissions, type UserRole } from "@/hooks/use-permissions";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// TIPOS
// ============================================

type TipoRegistro = "atendimento" | "diligencia" | "informacao" | "peticao" | "anotacao" | "delegacao";

interface RegistroRapidoData {
  // Identificação
  assistidoId: number | null;
  assistidoNome: string;
  processoId: number | null;
  processoNumero: string;
  
  // Tipo e conteúdo
  tipo: TipoRegistro;
  descricao: string;
  
  // Destino (onde salvar)
  criarDemanda: boolean;
  salvarNoDrive: boolean;
  agendarRetorno: boolean;
  
  // Metadados da demanda (se criarDemanda for true)
  atribuicao: string;
  prioridade: string;
  prazo: string;
}

interface RegistroRapidoAprimoradoProps {
  userRole?: UserRole;
  onRegistro?: (data: RegistroRapidoData) => void;
  assistidos?: any[];
  processos?: any[];
  compact?: boolean;
}

// ============================================
// CONFIGURAÇÕES DE TIPOS DE REGISTRO
// ============================================

const TIPOS_REGISTRO = {
  atendimento: {
    label: "Atendimento",
    icon: MessageSquare,
    color: "text-emerald-600",
    bgActive: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300",
    description: "Registrar atendimento presencial ou remoto",
  },
  diligencia: {
    label: "Diligência",
    icon: Search,
    color: "text-blue-600",
    bgActive: "bg-blue-100 dark:bg-blue-900/30 border-blue-300",
    description: "Registrar busca ou pesquisa realizada",
  },
  informacao: {
    label: "Informação",
    icon: Info,
    color: "text-amber-600",
    bgActive: "bg-amber-100 dark:bg-amber-900/30 border-amber-300",
    description: "Registrar informação obtida",
  },
  peticao: {
    label: "Petição",
    icon: FileText,
    color: "text-purple-600",
    bgActive: "bg-purple-100 dark:bg-purple-900/30 border-purple-300",
    description: "Registrar petição elaborada ou protocolada",
  },
  anotacao: {
    label: "Anotação",
    icon: PenLine,
    color: "text-zinc-600",
    bgActive: "bg-zinc-100 dark:bg-zinc-800 border-zinc-300",
    description: "Adicionar nota ou observação",
  },
  delegacao: {
    label: "Delegar",
    icon: UserPlus,
    color: "text-rose-600",
    bgActive: "bg-rose-100 dark:bg-rose-900/30 border-rose-300",
    description: "Delegar tarefa para equipe",
  },
} as const;

const ATRIBUICOES = [
  { value: "juri", label: "Tribunal do Júri", icon: Gavel, color: "emerald" },
  { value: "ep", label: "Execução Penal", icon: Building2, color: "blue" },
  { value: "vvd", label: "Violência Doméstica", icon: Home, color: "amber" },
  { value: "criminal", label: "Criminal Geral", icon: Scale, color: "violet" },
];

const PRIORIDADES = [
  { value: "BAIXA", label: "Baixa", color: "bg-zinc-100 text-zinc-600" },
  { value: "NORMAL", label: "Normal", color: "bg-blue-100 text-blue-600" },
  { value: "ALTA", label: "Alta", color: "bg-amber-100 text-amber-600" },
  { value: "URGENTE", label: "Urgente", color: "bg-rose-100 text-rose-600" },
  { value: "REU_PRESO", label: "Réu Preso", color: "bg-rose-500 text-white" },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function RegistroRapidoAprimorado({
  userRole = "defensor",
  onRegistro,
  assistidos = [],
  processos = [],
  compact = false,
}: RegistroRapidoAprimoradoProps) {
  const { canDelegate } = usePermissions();
  
  // Estado do formulário
  const [data, setData] = useState<RegistroRapidoData>({
    assistidoId: null,
    assistidoNome: "",
    processoId: null,
    processoNumero: "",
    tipo: "atendimento",
    descricao: "",
    criarDemanda: false,
    salvarNoDrive: false,
    agendarRetorno: false,
    atribuicao: "",
    prioridade: "NORMAL",
    prazo: "",
  });

  // Estados de UI
  const [assistidoSearchOpen, setAssistidoSearchOpen] = useState(false);
  const [assistidoSearchQuery, setAssistidoSearchQuery] = useState("");
  const [processoSearchOpen, setProcessoSearchOpen] = useState(false);
  const [processoSearchQuery, setProcessoSearchQuery] = useState("");
  const [delegacaoModalOpen, setDelegacaoModalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filtrar assistidos pela busca (excluindo "Não identificado")
  const assistidosFiltrados = useMemo(() => {
    const assistidosValidos = assistidos.filter((a: any) => {
      const nome = (a.nome || "").toLowerCase();
      return !nome.includes("não identificado") && 
             !nome.includes("nao identificado") && 
             nome !== "" && 
             nome !== "-";
    });
    
    if (!assistidoSearchQuery.trim()) return assistidosValidos.slice(0, 10);
    const query = assistidoSearchQuery.toLowerCase();
    return assistidosValidos
      .filter((a: any) => 
        a.nome?.toLowerCase().includes(query) ||
        a.cpf?.includes(query) ||
        a.vulgo?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [assistidos, assistidoSearchQuery]);

  // Filtrar processos pela busca ou pelo assistido
  const processosFiltrados = useMemo(() => {
    let filtered = processos;
    
    // Se tem assistido selecionado, filtrar processos dele
    if (data.assistidoId) {
      filtered = processos.filter((p: any) => p.assistidoId === data.assistidoId);
    }
    
    if (!processoSearchQuery.trim()) return filtered.slice(0, 10);
    const query = processoSearchQuery.toLowerCase();
    return filtered
      .filter((p: any) => 
        p.numero?.includes(query) ||
        p.tipo?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [processos, processoSearchQuery, data.assistidoId]);

  // Assistido selecionado
  const assistidoSelecionado = useMemo(() => {
    if (!data.assistidoId) return null;
    return assistidos.find((a: any) => a.id === data.assistidoId);
  }, [data.assistidoId, assistidos]);

  // Processo selecionado
  const processoSelecionado = useMemo(() => {
    if (!data.processoId) return null;
    return processos.find((p: any) => p.id === data.processoId);
  }, [data.processoId, processos]);

  // Handler para selecionar assistido
  const handleSelectAssistido = (assistido: any) => {
    setData(prev => ({
      ...prev,
      assistidoId: assistido.id,
      assistidoNome: assistido.nome,
      // Limpar processo se mudar de assistido
      processoId: null,
      processoNumero: "",
      // Detectar atribuição baseado no assistido
      atribuicao: assistido.atribuicao || "",
    }));
    setAssistidoSearchOpen(false);
    setAssistidoSearchQuery("");
  };

  // Handler para selecionar processo
  const handleSelectProcesso = (processo: any) => {
    setData(prev => ({
      ...prev,
      processoId: processo.id,
      processoNumero: processo.numero,
    }));
    setProcessoSearchOpen(false);
    setProcessoSearchQuery("");
  };

  // Handler para limpar assistido
  const handleClearAssistido = () => {
    setData(prev => ({
      ...prev,
      assistidoId: null,
      assistidoNome: "",
      processoId: null,
      processoNumero: "",
    }));
  };

  // Handler para submeter o registro
  const handleSubmit = () => {
    if (!data.assistidoId && data.tipo !== "anotacao") {
      toast.error("Selecione um assistido");
      return;
    }
    
    if (!data.descricao.trim()) {
      toast.error("Preencha a descrição");
      return;
    }

    const tipoLabel = TIPOS_REGISTRO[data.tipo].label;
    
    // Simular registro (chamar onRegistro se disponível)
    if (onRegistro) {
      onRegistro(data);
    }

    // Feedback de sucesso
    const messages = [];
    messages.push(`${tipoLabel} registrado`);
    if (data.criarDemanda) messages.push("Demanda criada");
    if (data.salvarNoDrive) messages.push("Salvo no Drive");
    if (data.agendarRetorno) messages.push("Retorno agendado");
    
    toast.success(messages.join(" • "), {
      description: data.assistidoNome ? `Para: ${data.assistidoNome}` : undefined,
    });

    // Limpar formulário
    setData({
      assistidoId: null,
      assistidoNome: "",
      processoId: null,
      processoNumero: "",
      tipo: "atendimento",
      descricao: "",
      criarDemanda: false,
      salvarNoDrive: false,
      agendarRetorno: false,
      atribuicao: "",
      prioridade: "NORMAL",
      prazo: "",
    });
    setShowAdvanced(false);
  };

  // Verificar se tipo é delegação
  const isDelegacao = data.tipo === "delegacao";

  return (
    <Card className="group/card relative bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-emerald-200/40 dark:hover:border-emerald-800/30 transition-all duration-300">
      {/* Header */}
      <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Registro Rápido</h3>
              <p className="text-[10px] text-zinc-400">Registre e organize informações</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] text-zinc-500 hover:text-emerald-600"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "Simplificado" : "Avançado"}
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 space-y-4">
        {/* Linha 1: Assistido + Processo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Seletor de Assistido */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
              Assistido
            </label>
            <Popover open={assistidoSearchOpen} onOpenChange={setAssistidoSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full h-9 justify-between text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                >
                  {data.assistidoId ? (
                    <span className="flex items-center gap-2 truncate">
                      <User className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="truncate">{data.assistidoNome}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-500 flex items-center gap-2">
                      <Search className="w-3.5 h-3.5" />
                      Buscar assistido...
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[350px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Digite o nome ou CPF..."
                    value={assistidoSearchQuery}
                    onValueChange={setAssistidoSearchQuery}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-4 text-center">
                        <User className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                        <p className="text-sm text-zinc-500">Nenhum assistido encontrado</p>
                        <Link href="/admin/assistidos/novo">
                          <Button variant="link" size="sm" className="mt-2 text-emerald-600">
                            <Plus className="w-3 h-3 mr-1" />
                            Cadastrar novo
                          </Button>
                        </Link>
                      </div>
                    </CommandEmpty>
                    <CommandGroup heading="Assistidos">
                      {assistidosFiltrados.map((assistido: any) => (
                        <CommandItem
                          key={assistido.id}
                          value={assistido.nome}
                          onSelect={() => handleSelectAssistido(assistido)}
                          className="flex items-center gap-2 py-2"
                        >
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={assistido.photoUrl || ""} />
                            <AvatarFallback className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700">
                              {assistido.nome?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{assistido.nome}</p>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                              {assistido.vulgo && <span>({assistido.vulgo})</span>}
                              {assistido.situacaoPrisional === "PRESO" && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] border-red-300 text-red-600">
                                  <Lock className="w-2.5 h-2.5 mr-0.5" />
                                  Preso
                                </Badge>
                              )}
                            </div>
                          </div>
                          {data.assistidoId === assistido.id && (
                            <Check className="w-4 h-4 text-emerald-500" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Seletor de Processo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
              Processo {data.assistidoId && `(${processosFiltrados.length})`}
            </label>
            <Popover open={processoSearchOpen} onOpenChange={setProcessoSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={!data.assistidoId}
                  className="w-full h-9 justify-between text-xs bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                >
                  {data.processoId ? (
                    <span className="flex items-center gap-2 truncate">
                      <Scale className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span className="truncate font-mono text-[10px]">{data.processoNumero}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-500 flex items-center gap-2">
                      <Scale className="w-3.5 h-3.5" />
                      {data.assistidoId ? "Selecionar processo..." : "Selecione assistido primeiro"}
                    </span>
                  )}
                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar por número..."
                    value={processoSearchQuery}
                    onValueChange={setProcessoSearchQuery}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-4 text-center">
                        <Scale className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                        <p className="text-sm text-zinc-500">Nenhum processo encontrado</p>
                      </div>
                    </CommandEmpty>
                    <CommandGroup heading="Processos">
                      {processosFiltrados.map((processo: any) => (
                        <CommandItem
                          key={processo.id}
                          value={processo.numero}
                          onSelect={() => handleSelectProcesso(processo)}
                          className="flex items-center gap-2 py-2"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Scale className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-mono truncate">{processo.numero}</p>
                            <p className="text-[10px] text-zinc-500 truncate">
                              {processo.tipo || processo.atribuicao || "Processo"}
                            </p>
                          </div>
                          {data.processoId === processo.id && (
                            <Check className="w-4 h-4 text-blue-500" />
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Chip do Assistido Selecionado */}
        {assistidoSelecionado && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={assistidoSelecionado.photoUrl || ""} />
              <AvatarFallback className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300">
                {assistidoSelecionado.nome?.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100 truncate">
                {assistidoSelecionado.nome}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-emerald-600 dark:text-emerald-400">
                {assistidoSelecionado.situacaoPrisional === "PRESO" && (
                  <span className="flex items-center gap-0.5 text-red-600">
                    <Lock className="w-2.5 h-2.5" />
                    Preso
                  </span>
                )}
                {processoSelecionado && (
                  <span className="flex items-center gap-0.5">
                    <Scale className="w-2.5 h-2.5" />
                    {processoSelecionado.numero?.slice(-10) || "Processo"}
                  </span>
                )}
                {assistidoSelecionado.telefone && (
                  <span className="flex items-center gap-0.5">
                    <Phone className="w-2.5 h-2.5" />
                    {assistidoSelecionado.telefone}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-red-500 flex-shrink-0"
              onClick={handleClearAssistido}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Linha 2: Tipo de Registro - Layout compacto */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
            Tipo
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(TIPOS_REGISTRO).map(([id, config]) => {
              const Icon = config.icon;
              const isSelected = data.tipo === id;
              const isDelegacaoBtn = id === "delegacao";
              const canShowDelegacao = canDelegate();

              // Esconder delegação se não pode delegar
              if (isDelegacaoBtn && !canShowDelegacao) return null;

              return (
                <button
                  key={id}
                  onClick={() => {
                    if (isDelegacaoBtn) {
                      setDelegacaoModalOpen(true);
                    } else {
                      setData(prev => ({ ...prev, tipo: id as TipoRegistro }));
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
                    isSelected && !isDelegacaoBtn
                      ? config.bgActive + " border " + config.color
                      : isDelegacaoBtn
                        ? "border border-rose-200 dark:border-rose-800 hover:border-rose-400 bg-rose-50 dark:bg-rose-900/20 text-rose-600"
                        : "border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                  title={config.description}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected && !isDelegacaoBtn ? config.color : isDelegacaoBtn ? "text-rose-500" : "text-zinc-400"}`} />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Linha 3: Descrição */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
            Descrição
          </label>
          <Textarea
            placeholder={TIPOS_REGISTRO[data.tipo]?.description || "Descreva o registro..."}
            value={data.descricao}
            onChange={(e) => setData(prev => ({ ...prev, descricao: e.target.value }))}
            className="min-h-[80px] text-sm bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 resize-none"
          />
        </div>

        {/* Opções Avançadas */}
        {showAdvanced && (
          <div className="space-y-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-2">
              Organizar Registro
            </div>

            {/* Destinos */}
            <div className="grid grid-cols-3 gap-3">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition-colors">
                <Checkbox
                  checked={data.criarDemanda}
                  onCheckedChange={(checked) => setData(prev => ({ ...prev, criarDemanda: !!checked }))}
                />
                <div className="flex items-center gap-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Criar Demanda</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition-colors">
                <Checkbox
                  checked={data.salvarNoDrive}
                  onCheckedChange={(checked) => setData(prev => ({ ...prev, salvarNoDrive: !!checked }))}
                />
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Salvar no Drive</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition-colors">
                <Checkbox
                  checked={data.agendarRetorno}
                  onCheckedChange={(checked) => setData(prev => ({ ...prev, agendarRetorno: !!checked }))}
                />
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Agendar Retorno</span>
                </div>
              </label>
            </div>

            {/* Campos de Demanda */}
            {data.criarDemanda && (
              <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                <div className="grid grid-cols-3 gap-3">
                  {/* Atribuição */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-500">Atribuição</label>
                    <select
                      value={data.atribuicao}
                      onChange={(e) => setData(prev => ({ ...prev, atribuicao: e.target.value }))}
                      className="w-full h-8 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    >
                      <option value="">Selecione...</option>
                      {ATRIBUICOES.map((attr) => (
                        <option key={attr.value} value={attr.value}>{attr.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Prioridade */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-500">Prioridade</label>
                    <select
                      value={data.prioridade}
                      onChange={(e) => setData(prev => ({ ...prev, prioridade: e.target.value }))}
                      className="w-full h-8 px-2 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    >
                      {PRIORIDADES.map((prio) => (
                        <option key={prio.value} value={prio.value}>{prio.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Prazo */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-zinc-500">Prazo</label>
                    <Input
                      type="date"
                      value={data.prazo}
                      onChange={(e) => setData(prev => ({ ...prev, prazo: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botão de Enviar */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={(!data.assistidoId && data.tipo !== "anotacao") || !data.descricao.trim()}
            className="px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Registrar
            {data.criarDemanda && " + Demanda"}
            {data.salvarNoDrive && " + Drive"}
          </Button>
        </div>
      </div>

      {/* Modal de Delegação */}
      <DelegacaoModal
        open={delegacaoModalOpen}
        onOpenChange={setDelegacaoModalOpen}
        assistidoId={data.assistidoId}
        assistidoNome={data.assistidoNome}
        processoId={data.processoId}
        processoNumero={data.processoNumero}
        onDelegacaoSucesso={() => {
          toast.success("Tarefa delegada com sucesso!");
          handleClearAssistido();
          setData(prev => ({ ...prev, descricao: "" }));
        }}
      />
    </Card>
  );
}
