import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { 
  adicionarRegistroHistorico, 
  buscarHistoricoPorEvento,
  buscarHistoricoPorProcesso,
  buscarHistoricoPorAssistido,
  vincularEventoRedesignado 
} from "@/lib/data/historico-audiencias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  CheckCircle2,
  Users,
  Clock,
  Gavel,
  AlertTriangle,
  Save,
  UserCheck,
  UserX,
  Calendar,
  X,
  Plus,
  Scale,
  MessageSquare,
  FileStack,
  Shield,
  Trash2,
  UserCircle2,
  ChevronRight,
  BookOpen,
  Notebook,
  Mail,
  BellRing,
  Target,
  Quote,
  Eye,
  ChevronDown,
  XCircle,
  MapPin,
  Check,
} from "lucide-react";

export interface Depoente {
  id: string;
  nome: string;
  tipo: "testemunha" | "vitima" | "reu" | "perito" | "informante" | "policial";
  intimado: boolean;
  presente: boolean;
  estrategiaInquiricao: string;
  perguntasDefesa: string;
  depoimentoLiteral: string;
  analisePercepcoes: string;
  // Campos específicos por tipo
  tipoTestemunha?: "ocular" | "ouvir-dizer" | "conduta" | "informante";
  testemunhaOcularViu?: "fato-objeto" | "indicios";
  testemunhaOuvirDizerFonte?: "fonte-direta" | "rumores";
  testemunhaOuvirDizerInformaramAutoria?: boolean;
  testemunhaCondutaCarater?: "favoravel" | "desfavoravel";
  reconheceuAssistido?: boolean;
  vitimaViuAutor?: boolean;
  vitimaReconheceuAutor?: boolean;
  vitimaReconciliada?: boolean;
  vitimaEstadoEmocional?: "em-paz" | "com-raiva";
  vitimaContradicoes?: string;
  reuConfessouDelegacia?: "sim" | "nao" | "em-parte";
  reuSilencio?: boolean;
  reuRetratou?: boolean;
  reuMotivoRetracao?: "tortura" | "falsidade-relato" | "inducao";
  reuInformouAlibi?: boolean;
  reuSabeAlgoFato?: boolean;
  reuSabeOQueIncriminou?: boolean;
}

export interface RegistroAudienciaData {
  eventoId: string;
  dataRealizacao: string;
  realizada: boolean;
  motivoNaoRealizacao?: string;
  assistidoCompareceu: boolean;
  resultado: string;
  motivoRedesignacao?: string;
  tipoExtincao?: string;
  depoentes: Depoente[];
  atendimentoReuAntes: string;
  estrategiasDefesa: string;
  manifestacaoMP: string;
  manifestacaoDefesa: string;
  decisaoJuiz: string;
  encaminhamentos: string;
  anotacoesGerais: string;
  registradoPor: string;
  dataRegistro: string;
  dataRedesignacao?: string;
  horarioRedesignacao?: string;
  // Campos para vinculação
  processoId?: string;
  casoId?: string;
  assistidoId?: string;
  historicoId?: string; // ID único do registro no histórico
}

interface RegistroAudienciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (registro: RegistroAudienciaData) => void;
  evento: any;
  onCriarNovoEvento?: (evento: any) => void;
}

const atribuicaoColors: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    icon: string;
    tabActive: string;
    btnPrimary: string;
  }
> = {
  "Tribunal do Júri": {
    bg: "bg-white dark:bg-zinc-950",
    border: "border-emerald-600 dark:border-emerald-500",
    text: "text-emerald-900 dark:text-emerald-100",
    icon: "text-emerald-600 dark:text-emerald-500",
    tabActive: "border-emerald-600 text-emerald-700 dark:text-emerald-400",
    btnPrimary: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  "Violência Doméstica": {
    bg: "bg-white dark:bg-zinc-950",
    border: "border-amber-600 dark:border-amber-500",
    text: "text-amber-900 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-500",
    tabActive: "border-amber-600 text-amber-700 dark:text-amber-400",
    btnPrimary: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  "Execução Penal": {
    bg: "bg-white dark:bg-zinc-950",
    border: "border-orange-600 dark:border-orange-500",
    text: "text-orange-900 dark:text-orange-100",
    icon: "text-orange-600 dark:text-orange-500",
    tabActive: "border-orange-600 text-orange-700 dark:text-orange-400",
    btnPrimary: "bg-orange-600 hover:bg-orange-700 text-white",
  },
  "Criminal Geral": {
    bg: "bg-white dark:bg-zinc-950",
    border: "border-rose-600 dark:border-rose-500",
    text: "text-rose-900 dark:text-rose-100",
    icon: "text-rose-600 dark:text-rose-500",
    tabActive: "border-rose-600 text-rose-700 dark:text-rose-400",
    btnPrimary: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  "Substituição": {
    bg: "bg-white dark:bg-zinc-950",
    border: "border-slate-600 dark:border-slate-500",
    text: "text-slate-900 dark:text-slate-100",
    icon: "text-slate-600 dark:text-slate-500",
    tabActive: "border-slate-600 text-slate-700 dark:text-slate-400",
    btnPrimary: "bg-slate-600 hover:bg-slate-700 text-white",
  },
  "Curadoria": {
    bg: "bg-white dark:bg-zinc-950",
    border: "border-zinc-600 dark:border-zinc-500",
    text: "text-zinc-900 dark:text-zinc-100",
    icon: "text-zinc-600 dark:text-zinc-500",
    tabActive: "border-zinc-600 text-zinc-700 dark:text-zinc-400",
    btnPrimary: "bg-zinc-600 hover:bg-zinc-700 text-white",
  },
};

const resultadoOptionsPorAtribuicao: Record<string, Array<{ value: string; label: string; icon: any }>> = {
  "Tribunal do Júri": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "extincao", label: "Extinção do Processo", icon: X },
  ],
  "Violência Doméstica": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "extincao", label: "Extinção do Processo", icon: X },
  ],
  "Execução Penal": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "extincao", label: "Extinção do Processo", icon: X },
    { value: "deferido", label: "Pedido Deferido", icon: CheckCircle2 },
    { value: "indeferido", label: "Pedido Indeferido", icon: X },
  ],
  "Substituição": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "acordo", label: "Acordo Homologado", icon: CheckCircle2 },
    { value: "extincao", label: "Extinção do Processo", icon: X },
  ],
  "Criminal Geral": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "acordo", label: "Acordo Homologado", icon: CheckCircle2 },
    { value: "extincao", label: "Extinção do Processo", icon: X },
  ],
  "Curadoria": [
    { value: "conclusa-memoriais", label: "Conclusão para Memoriais", icon: FileStack },
    { value: "conclusa-sentenca", label: "Conclusa para Sentença (AF em Audiência)", icon: Gavel },
    { value: "acordo", label: "Acordo Homologado", icon: CheckCircle2 },
    { value: "extincao", label: "Extinção do Processo", icon: X },
  ],
};

const motivoNaoRealizacaoOptions = [
  { value: "reu-nao-intimado", label: "Réu Não Intimado", icon: BellRing },
  { value: "ausencia-testemunha", label: "Ausência de Testemunha", icon: Users },
  { value: "ausencia-promotor", label: "Ausência do Promotor", icon: UserCircle2 },
  { value: "ausencia-juiz", label: "Ausência do Juiz", icon: Gavel },
  { value: "problemas-tecnicos", label: "Problemas Técnicos", icon: AlertTriangle },
  { value: "outros", label: "Outros", icon: FileText },
];

// Gerar horários de 30 em 30 minutos
const gerarHorarios = () => {
  const horarios = [];
  for (let h = 6; h < 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hora = String(h).padStart(2, '0');
      const minuto = String(m).padStart(2, '0');
      horarios.push(`${hora}:${minuto}`);
    }
  }
  return horarios;
};

const horariosDisponiveis = gerarHorarios();

const tipoDepoenteOptions = [
  { 
    value: "testemunha", 
    label: "Testemunha", 
    color: "blue",
    bg: "bg-blue-50/40 dark:bg-blue-950/10",
    border: "border-blue-400 dark:border-blue-700",
    text: "text-blue-700 dark:text-blue-400",
    icon: "text-blue-600 dark:text-blue-500",
    borderCard: "border-l-blue-400 dark:border-l-blue-600"
  },
  { 
    value: "vitima", 
    label: "Vítima", 
    color: "red",
    bg: "bg-red-50/40 dark:bg-red-950/10",
    border: "border-red-400 dark:border-red-700",
    text: "text-red-700 dark:text-red-400",
    icon: "text-red-600 dark:text-red-500",
    borderCard: "border-l-red-400 dark:border-l-red-600"
  },
  { 
    value: "reu", 
    label: "Réu/Acusado", 
    color: "green",
    bg: "bg-green-50/40 dark:bg-green-950/10",
    border: "border-green-600 dark:border-green-800",
    text: "text-green-800 dark:text-green-400",
    icon: "text-green-700 dark:text-green-500",
    borderCard: "border-l-green-600 dark:border-l-green-700"
  },
  { 
    value: "perito", 
    label: "Perito/Técnico", 
    color: "orange",
    bg: "bg-orange-50/40 dark:bg-orange-950/10",
    border: "border-orange-400 dark:border-orange-700",
    text: "text-orange-700 dark:text-orange-400",
    icon: "text-orange-600 dark:text-orange-500",
    borderCard: "border-l-orange-400 dark:border-l-orange-600"
  },
  { 
    value: "informante", 
    label: "Informante", 
    color: "slate",
    bg: "bg-slate-50/40 dark:bg-slate-950/10",
    border: "border-slate-400 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-400",
    icon: "text-slate-600 dark:text-slate-500",
    borderCard: "border-l-slate-400 dark:border-l-slate-600"
  },
  { 
    value: "policial", 
    label: "Policial", 
    color: "yellow",
    bg: "bg-yellow-50/40 dark:bg-yellow-950/10",
    border: "border-yellow-400 dark:border-yellow-700",
    text: "text-yellow-700 dark:text-yellow-400",
    icon: "text-yellow-600 dark:text-yellow-500",
    borderCard: "border-l-yellow-400 dark:border-l-yellow-600"
  },
];

export function RegistroAudienciaModal({ isOpen, onClose, onSave, evento, onCriarNovoEvento }: RegistroAudienciaModalProps) {
  const [registro, setRegistro] = useState<RegistroAudienciaData>({
    eventoId: evento.id,
    dataRealizacao: new Date().toISOString().split("T")[0],
    realizada: true,
    assistidoCompareceu: true,
    resultado: "",
    depoentes: [],
    atendimentoReuAntes: "",
    estrategiasDefesa: "",
    manifestacaoMP: "",
    manifestacaoDefesa: "",
    decisaoJuiz: "",
    encaminhamentos: "",
    anotacoesGerais: "",
    registradoPor: "Defensor Responsável",
    dataRegistro: new Date().toISOString(),
  });

  const [activeTab, setActiveTab] = useState<"geral" | "depoentes" | "manifestacoes" | "anotacoes" | "historico">("geral");
  const [editandoDepoente, setEditandoDepoente] = useState<Depoente | null>(null);
  const [novoDepoenteNome, setNovoDepoenteNome] = useState("");
  const [novoDepoenteTipo, setNovoDepoenteTipo] = useState<Depoente["tipo"]>("testemunha");
  const [showAddDepoenteModal, setShowAddDepoenteModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    estrategia: true,
    perguntas: false,
    depoimento: false,
    analise: false,
  });
  const [expandedDepoenteDetails, setExpandedDepoenteDetails] = useState<Record<string, boolean>>({});
  const [registrosAnteriores, setRegistrosAnteriores] = useState<any[]>([]);
  
  // Estados para detalhes de ausência de testemunha
  const [testemunhaIntimada, setTestemunhaIntimada] = useState<string>("");
  const [parteInsistiu, setParteInsistiu] = useState<string>("");
  const [depoentesRedesignacao, setDepoentesRedesignacao] = useState<string[]>([]);
  
  // Estados para controlar popovers
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [timePopoverOpen, setTimePopoverOpen] = useState(false);
  const [novaDataPopoverOpen, setNovaDataPopoverOpen] = useState(false);
  const [novoHorarioPopoverOpen, setNovoHorarioPopoverOpen] = useState(false);
  
  // Estado para controlar status: "concluida" | "redesignada" | "suspensa"
  const [statusAudiencia, setStatusAudiencia] = useState<"concluida" | "redesignada" | "suspensa">("concluida");
  
  // Estado para revelia
  const [decretoRevelia, setDecretoRevelia] = useState<boolean | null>(null);
  
  // Estado para controlar se foi salvo
  const [registroSalvo, setRegistroSalvo] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<string | null>(null);

  // Carregar registros anteriores quando o modal abrir
  useEffect(() => {
    if (isOpen && evento.id) {
      // Buscar por evento E por processo/assistido/caso para capturar audiências redesignadas
      let historico = buscarHistoricoPorEvento(evento.id);
      
      // Se não encontrou pelo evento, buscar por processo
      if (historico.length === 0 && (evento.processo?.id || evento.processoId)) {
        const processoId = evento.processo?.id || evento.processoId;
        historico = buscarHistoricoPorProcesso(processoId || "");
      }
      
      // Se ainda não encontrou, buscar por assistido
      if (historico.length === 0 && (evento.assistido?.id || evento.assistidoId)) {
        const assistidoId = evento.assistido?.id || evento.assistidoId;
        historico = buscarHistoricoPorAssistido(assistidoId || "");
      }
      
      setRegistrosAnteriores(historico);
      
      if (historico.length > 0) {
        console.log(`📚 Encontrados ${historico.length} registro(s) anterior(es) para este evento`);
      }
    } else if (!isOpen) {
      // Resetar estado de salvamento quando fechar o modal
      setRegistroSalvo(false);
      setUltimoSalvamento(null);
    }
  }, [isOpen, evento.id]);

  const atribuicaoColor = atribuicaoColors[evento.atribuicao] || atribuicaoColors["Criminal Geral"];
  const resultadosDisponiveis = resultadoOptionsPorAtribuicao[evento.atribuicao] || resultadoOptionsPorAtribuicao["Criminal Geral"];

  const handleSubmit = () => {
    console.log("🔍 Iniciando salvamento...", registro);
    
    if (!registro.dataRealizacao) {
      toast.error("Data de realização é obrigatória");
      return;
    }
    if (statusAudiencia === "concluida" && !registro.resultado) {
      toast.error("Resultado da audiência é obrigatório");
      return;
    }
    if (statusAudiencia === "redesignada" && !registro.motivoNaoRealizacao) {
      toast.error("Motivo da redesignação é obrigat��rio");
      return;
    }

    console.log("✅ Validações passaram. Salvando registro...");

    // Adicionar IDs de vinculação para histórico
    const registroComVinculo: RegistroAudienciaData = {
      ...registro,
      historicoId: `HIST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      processoId: evento.processo?.id || evento.processoId,
      casoId: evento.caso?.id || evento.casoId,
      assistidoId: evento.assistido?.id || evento.assistidoId,
    };

    console.log("💾 Salvando registro com vinculação:", registroComVinculo);
    
    // Adicionar ao histórico
    const historicoSalvo = adicionarRegistroHistorico(registroComVinculo);

    // Se foi redesignada e tem nova data, criar novo evento
    if (!registro.realizada && registro.dataRedesignacao && onCriarNovoEvento) {
      const novoEventoId = `EVT-${Date.now()}`;
      const novoEvento = {
        id: novoEventoId,
        titulo: evento.titulo,
        assistido: evento.assistido,
        processo: evento.processo,
        atribuicao: evento.atribuicao,
        data: registro.dataRedesignacao,
        horarioInicio: registro.horarioRedesignacao || evento.horarioInicio || "09:00",
        horarioFim: evento.horarioFim || "10:00",
        local: evento.local,
        tipo: evento.tipo || "audiencia",
        status: "agendado",
        descricao: `Audiência redesignada. Motivo: ${registro.motivoRedesignacao || 'Não informado'}`,
        prioridade: evento.prioridade || "media",
        recorrencia: "nenhuma",
        lembretes: ["1d"],
        tags: ["Redesignada"],
        participantes: evento.participantes || [],
        observacoes: `Audiência redesignada. Motivo: ${registro.motivoRedesignacao || 'Não informado'}`,
        documentos: [],
        dataInclusao: new Date().toISOString(),
        responsavel: evento.responsavel || "def-1",
      };
      
      console.log("📅 Criando novo evento:", novoEvento);
      onCriarNovoEvento(novoEvento);
      
      // Vincular novo evento ao histórico
      vincularEventoRedesignado(historicoSalvo.historicoId, novoEventoId);
      console.log("🔗 Evento redesignado vinculado ao histórico:", {
        historicoId: historicoSalvo.historicoId,
        novoEventoId
      });
      
      toast.success("Novo evento criado para a data redesignada!");
    }
    
    onSave(registroComVinculo);
    
    // Marcar como salvo e atualizar timestamp
    const isAtualizacao = registroSalvo;
    setRegistroSalvo(true);
    setUltimoSalvamento(new Date().toLocaleString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }));
    
    toast.success(isAtualizacao ? "Registro atualizado com sucesso!" : "Registro salvo com sucesso!", {
      description: isAtualizacao 
        ? "As alterações foram salvas no histórico" 
        : "Você pode continuar editando ou fechar o modal",
    });
    
    // Não fechar o modal automaticamente - permitir continuar editando
    // onClose();
  };

  const handleAddDepoente = () => {
    if (!novoDepoenteNome.trim()) {
      toast.error("Nome do depoente é obrigatório");
      return;
    }
    const novoDepoente: Depoente = {
      id: `dep-${Date.now()}`,
      nome: novoDepoenteNome.trim(),
      tipo: novoDepoenteTipo,
      intimado: false,
      presente: true,
      estrategiaInquiricao: "",
      perguntasDefesa: "",
      depoimentoLiteral: "",
      analisePercepcoes: "",
    };
    setRegistro({ ...registro, depoentes: [...registro.depoentes, novoDepoente] });
    setNovoDepoenteNome("");
    setNovoDepoenteTipo("testemunha");
    setEditandoDepoente(novoDepoente);
    toast.success("Depoente adicionado");
  };

  const handleRemoveDepoente = (id: string) => {
    setRegistro({ ...registro, depoentes: registro.depoentes.filter((d) => d.id !== id) });
    if (editandoDepoente?.id === id) setEditandoDepoente(null);
    toast.success("Depoente removido");
  };

  const handleUpdateDepoente = (depoente: Depoente) => {
    setRegistro({
      ...registro,
      depoentes: registro.depoentes.map((d) => (d.id === depoente.id ? depoente : d)),
    });
    setEditandoDepoente(depoente);
  };

  const getDepoenteStyle = (tipo: Depoente["tipo"]) => {
    return tipoDepoenteOptions.find((opt) => opt.value === tipo) || tipoDepoenteOptions[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-none w-[98vw] md:w-[98vw] h-[98vh] flex flex-col overflow-hidden bg-white dark:bg-zinc-950 p-0 gap-0" hideClose>
        <DialogTitle className="sr-only">Registro de Audiência Judicial</DialogTitle>
        <DialogDescription className="sr-only">
          Sistema simplificado para registro de audiências com gestão de depoentes.
        </DialogDescription>

        {/* Header */}
        <div className={`${atribuicaoColor.bg} ${atribuicaoColor.border} border-l-4 px-3 py-2.5 md:px-4 md:py-3 flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl ${atribuicaoColor.bg} border-2 ${atribuicaoColor.border} flex items-center justify-center flex-shrink-0`}>
              <Gavel className={`w-4 h-4 md:w-5 md:h-5 ${atribuicaoColor.icon}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate">{evento.titulo}</h2>
                {registroSalvo && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Salvo
                  </Badge>
                )}
              </div>
              <p className="text-xs md:text-sm font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                {evento.assistido}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[10px] md:text-xs text-zinc-600 dark:text-zinc-400 truncate">
                  {new Date(evento.data).toLocaleDateString("pt-BR")} • {evento.horarioInicio}
                  {evento.processo && ` • ${evento.processo}`}
                </p>
                {registroSalvo && ultimoSalvamento && (
                  <span className="text-[9px] text-zinc-500 dark:text-zinc-500">
                    • Último salvamento: {ultimoSalvamento}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {registroSalvo && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSubmit}
                className="hidden md:flex items-center gap-1.5 h-8 text-xs bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-900"
              >
                <Save className="w-3.5 h-3.5" />
                Atualizar
              </Button>
            )}
            <button onClick={onClose} className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/50 dark:bg-zinc-900/50 flex items-center justify-center hover:bg-white/80 transition-all">
            <X className="w-4 h-4 md:w-5 md:h-5 text-zinc-700 dark:text-zinc-300" />
          </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-0 px-2 md:px-4">
            {[
              { key: "geral", label: "Geral", icon: FileText },
              { key: "depoentes", label: "Depoentes", icon: Users, count: registro.depoentes.length },
              { key: "anotacoes", label: "Anotações", icon: Notebook },
              { key: "manifestacoes", label: "Manifestações", icon: MessageSquare },
              { key: "registro", label: "Registro", icon: Eye },
              ...(registrosAnteriores.length > 0 ? [{ key: "historico", label: "Histórico", icon: BookOpen, count: registrosAnteriores.length }] : []),
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-semibold transition-all border-b-2 flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${
                    activeTab === tab.key
                      ? `${atribuicaoColor.tabActive} bg-white dark:bg-zinc-950`
                      : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <Badge className={`${activeTab === tab.key ? atribuicaoColor.bg : "bg-zinc-100 dark:bg-zinc-800"} ${atribuicaoColor.text}`}>
                      {tab.count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="p-4">
            <AnimatePresence mode="wait">
              {activeTab === "geral" && (
                <motion.div key="geral" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4 max-w-5xl mx-auto">
                  {/* Status + Resultado - Compactos lado a lado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Status da Audiência */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
                      <Label className="text-sm font-bold mb-3 block flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                        Status da Audiência
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        <button 
                          type="button" 
                          onClick={() => {
                            setStatusAudiencia("concluida");
                            setRegistro({ ...registro, realizada: true, motivoNaoRealizacao: undefined });
                          }} 
                          className={`p-2.5 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                            statusAudiencia === "concluida" 
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm" 
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-200"
                          }`}
                        >
                          <CheckCircle2 className={`w-5 h-5 mx-auto mb-0.5 ${statusAudiencia === "concluida" ? "text-emerald-600" : "text-zinc-400"}`} />
                          <p className="font-semibold text-xs text-center">Concluída</p>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setStatusAudiencia("redesignada");
                            setRegistro({ ...registro, realizada: false, resultado: "", motivoRedesignacao: undefined });
                          }} 
                          className={`p-2.5 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                            statusAudiencia === "redesignada" 
                              ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 shadow-sm" 
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-200"
                          }`}
                        >
                          <AlertTriangle className={`w-5 h-5 mx-auto mb-0.5 ${statusAudiencia === "redesignada" ? "text-orange-600" : "text-zinc-400"}`} />
                          <p className="font-semibold text-xs text-center">Redesignada</p>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setStatusAudiencia("suspensa");
                            setRegistro({ ...registro, realizada: true, resultado: "suspensa" });
                          }} 
                          className={`p-2.5 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                            statusAudiencia === "suspensa" 
                              ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 shadow-sm" 
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-yellow-200"
                          }`}
                        >
                          <Clock className={`w-5 h-5 mx-auto mb-0.5 ${statusAudiencia === "suspensa" ? "text-yellow-600" : "text-zinc-400"}`} />
                          <p className="font-semibold text-xs text-center">Suspensa</p>
                        </button>
                      </div>
                    </div>

                    {/* Comparecimento */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
                      <Label className="text-sm font-bold mb-3 block flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                        <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                        Comparecimento do Assistido
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button" 
                          onClick={() => {
                            setRegistro({ ...registro, assistidoCompareceu: true });
                            setDecretoRevelia(null);
                          }} 
                          className={`p-3 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                            registro.assistidoCompareceu 
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm" 
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-200"
                          }`}
                        >
                          <UserCheck className={`w-6 h-6 mx-auto mb-1 ${registro.assistidoCompareceu ? "text-emerald-600" : "text-zinc-400"}`} />
                          <p className="font-semibold text-sm text-center">Presente</p>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setRegistro({ ...registro, assistidoCompareceu: false });
                            setDecretoRevelia(null);
                          }} 
                          className={`p-3 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                            !registro.assistidoCompareceu 
                              ? "border-red-500 bg-red-50 dark:bg-red-950/30 shadow-sm" 
                              : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-red-200"
                          }`}
                        >
                          <UserX className={`w-6 h-6 mx-auto mb-1 ${!registro.assistidoCompareceu ? "text-red-600" : "text-zinc-400"}`} />
                          <p className="font-semibold text-sm text-center">Ausente</p>
                        </button>
                      </div>
                      
                      {/* Decreto de Revelia - aparece quando assistido está ausente */}
                      {!registro.assistidoCompareceu && (
                        <div className="mt-3 pt-3 border-t-2 border-zinc-200 dark:border-zinc-800 animate-in fade-in-50 slide-in-from-top-2">
                          <Label className="text-xs font-semibold mb-2 block text-zinc-700 dark:text-zinc-300">
                            Foi decretada revelia?
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setDecretoRevelia(true)}
                              className={`p-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                                decretoRevelia === true
                                  ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              <Gavel className="inline w-3 h-3 mr-1" />
                              Sim, decretou revelia
                            </button>
                            <button
                              type="button"
                              onClick={() => setDecretoRevelia(false)}
                              className={`p-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                                decretoRevelia === false
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                              }`}
                            >
                              <X className="inline w-3 h-3 mr-1" />
                              Não decretou revelia
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações de Redesignação */}
                  {statusAudiencia === "redesignada" && (
                    <div className="space-y-4 animate-in fade-in-50 slide-in-from-top-2">
                      {/* Motivo da Redesignação */}
                      <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                        <div className="border-l-4 border-amber-500 dark:border-amber-400 pl-3 -ml-2 mb-3">
                          <Label className="text-base font-bold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                            Motivo da Redesignação
                            <span className="ml-auto text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/30 px-2 py-0.5 rounded">
                              Obrigatório
                            </span>
                          </Label>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Selecione ou descreva o motivo da redesignação</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-3">
                          {motivoNaoRealizacaoOptions.map((opt) => {
                            const Icon = opt.icon;
                            return (
                              <button 
                                key={opt.value} 
                                type="button" 
                                onClick={() => setRegistro({ ...registro, motivoNaoRealizacao: opt.value })} 
                                className={`p-2.5 rounded-lg border-2 text-left transition-all hover:scale-[1.02] ${
                                  registro.motivoNaoRealizacao === opt.value 
                                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 shadow-sm" 
                                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-300"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-4 h-4 flex-shrink-0 ${registro.motivoNaoRealizacao === opt.value ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"}`} />
                                  <span className="text-xs font-semibold">{opt.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <Textarea 
                          value={registro.motivoRedesignacao || ""} 
                          onChange={(e) => setRegistro({ ...registro, motivoRedesignacao: e.target.value })} 
                          placeholder="Detalhe o motivo da redesignação (opcional)"
                          rows={3}
                          className="text-sm bg-white dark:bg-zinc-950"
                        />
                        
                        {/* Detalhes específicos para ausência de testemunha */}
                        {registro.motivoNaoRealizacao === "ausencia-testemunha" && (
                          <div className="mt-4 space-y-3 pt-4 border-t-2 border-zinc-200 dark:border-zinc-800">
                            <Label className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Detalhes sobre a Testemunha</Label>
                            
                            {/* Quais depoentes? */}
                            {registro.depoentes && registro.depoentes.length > 0 && (
                              <div>
                                <Label className="text-xs font-semibold mb-2 block text-zinc-700 dark:text-zinc-300">
                                  Quais depoentes motivaram a redesignação? <span className="text-zinc-500 dark:text-zinc-400 font-normal">(Selecione um ou mais)</span>
                                </Label>
                                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                  {registro.depoentes.map((depoente, idx) => {
                                    const isSelected = depoentesRedesignacao.includes(depoente.nome);
                                    const depoenteStyle = getDepoenteStyle(depoente.tipo);
                                    
                                    return (
                                      <label
                                        key={idx}
                                        className={`p-3 rounded-lg border-2 text-xs font-semibold text-left transition-all cursor-pointer flex items-center gap-3 ${
                                          isSelected
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm"
                                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700"
                                        }`}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={(checked) => {
                                            if (checked) {
                                              setDepoentesRedesignacao([...depoentesRedesignacao, depoente.nome]);
                                            } else {
                                              setDepoentesRedesignacao(depoentesRedesignacao.filter(n => n !== depoente.nome));
                                            }
                                          }}
                                        />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className={`${isSelected ? "text-blue-700 dark:text-blue-300" : "text-zinc-700 dark:text-zinc-300"}`}>
                                              {depoente.nome}
                                            </span>
                                            <Badge className={`${depoenteStyle.bg} ${depoenteStyle.text} text-[10px] px-1.5 py-0`}>
                                              {depoenteStyle.label}
                                            </Badge>
                                          </div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                                {depoentesRedesignacao.length > 0 && (
                                  <div className="mt-2 flex items-center gap-2 text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                      {depoentesRedesignacao.length} depoente(s) selecionado(s)
                                    </span>
                                  </div>
                                )}
                                {registro.depoentes.length === 0 && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                                    Nenhum depoente cadastrado. Adicione na aba &ldquo;Depoentes&rdquo;.
                                  </p>
                                )}
                              </div>
                            )}
                            
                            {/* Testemunha intimada? */}
                            <div>
                              <Label className="text-xs font-semibold mb-2 block text-zinc-700 dark:text-zinc-300">
                                A testemunha foi intimada?
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setTestemunhaIntimada("nao-intimada")}
                                  className={`p-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                                    testemunhaIntimada === "nao-intimada"
                                      ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                                  }`}
                                >
                                  Não foi intimada
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTestemunhaIntimada("nao-compareceu")}
                                  className={`p-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                                    testemunhaIntimada === "nao-compareceu"
                                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                                  }`}
                                >
                                  Foi intimada e não compareceu
                                </button>
                              </div>
                            </div>
                            
                            {/* Quem insistiu? */}
                            <div>
                              <Label className="text-xs font-semibold mb-2 block text-zinc-700 dark:text-zinc-300">
                                Qual parte insistiu no depoimento?
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setParteInsistiu("mp")}
                                  className={`p-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                                    parteInsistiu === "mp"
                                      ? "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                                  }`}
                                >
                                  Ministério Público
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setParteInsistiu("defesa")}
                                  className={`p-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                                    parteInsistiu === "defesa"
                                      ? "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                                  }`}
                                >
                                  Defesa
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Nova Data e Horário */}
                      <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                        <div className="border-l-4 border-blue-500 dark:border-blue-400 pl-3 -ml-2 mb-3">
                          <Label className="text-base font-bold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                            Nova Data e Horário da Audiência
                            <span className="ml-auto text-xs font-normal text-zinc-500 dark:text-zinc-400">
                              (Opcional)
                            </span>
                          </Label>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Informe quando a audiência foi reagendada</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300">Nova Data</Label>
                            <Popover open={novaDataPopoverOpen} onOpenChange={setNovaDataPopoverOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`w-full justify-start text-left font-normal text-sm bg-white dark:bg-zinc-950 ${
                                    !registro.dataRedesignacao && "text-zinc-500 dark:text-zinc-400"
                                  }`}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  {registro.dataRedesignacao ? (
                                    format(new Date(registro.dataRedesignacao + "T12:00:00"), "PPP", { locale: ptBR })
                                  ) : (
                                    <span>Selecione uma data</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={registro.dataRedesignacao ? new Date(registro.dataRedesignacao + "T12:00:00") : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      const year = date.getFullYear();
                                      const month = String(date.getMonth() + 1).padStart(2, '0');
                                      const day = String(date.getDate()).padStart(2, '0');
                                      setRegistro({ ...registro, dataRedesignacao: `${year}-${month}-${day}` });
                                      setNovaDataPopoverOpen(false);
                                    }
                                  }}
                                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold mb-1.5 block text-zinc-700 dark:text-zinc-300">Novo Horário</Label>
                            <Popover open={novoHorarioPopoverOpen} onOpenChange={setNovoHorarioPopoverOpen}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={`w-full justify-start text-left font-normal text-sm bg-white dark:bg-zinc-950 ${
                                    !registro.horarioRedesignacao && "text-zinc-500 dark:text-zinc-400"
                                  }`}
                                >
                                  <Clock className="mr-2 h-4 w-4" />
                                  {registro.horarioRedesignacao || "Selecione um horário"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 shadow-lg" align="start">
                                <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                                  <Clock className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                                  <div className="flex items-center gap-0.5">
                                    <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums">
                                      {registro.horarioRedesignacao?.split(':')[0] || '--'}
                                    </span>
                                    <span className="text-base font-semibold text-zinc-500 dark:text-zinc-400">:</span>
                                    <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums">
                                      {registro.horarioRedesignacao?.split(':')[1] || '--'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex border-b border-zinc-200 dark:border-zinc-800">
                                  <div className="flex-1 border-r border-zinc-200 dark:border-zinc-800">
                                    <div className="px-2 py-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
                                      <p className="text-[11px] font-bold text-center text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">Hora</p>
                                    </div>
                                    <ScrollArea className="h-44 bg-white dark:bg-zinc-950">
                                      <div className="p-1 space-y-0.5 pr-2">
                                        {Array.from({ length: 24 }, (_, i) => i).map((hora) => {
                                          const horaStr = String(hora).padStart(2, '0');
                                          const horaAtual = registro.horarioRedesignacao?.split(':')[0] || '';
                                          const isSelected = horaStr === horaAtual;
                                          const showDivider = hora > 0 && hora % 6 === 0;
                                          
                                          return (
                                            <div key={hora}>
                                              {showDivider && (
                                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const minutos = registro.horarioRedesignacao?.split(':')[1] || '00';
                                                  setRegistro({ ...registro, horarioRedesignacao: `${horaStr}:${minutos}` });
                                                }}
                                                className={`w-full text-center px-2 py-1.5 text-sm rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors duration-150 font-semibold flex items-center justify-center gap-1 font-mono ${
                                                  isSelected
                                                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                                    : "text-zinc-700 dark:text-zinc-300"
                                                }`}
                                              >
                                                {isSelected && <Check className="w-3 h-3" />}
                                                {horaStr}
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </ScrollArea>
                                  </div>
                                  <div className="flex-1">
                                    <div className="px-2 py-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
                                      <p className="text-[11px] font-bold text-center text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">Minuto</p>
                                    </div>
                                    <ScrollArea className="h-44 bg-white dark:bg-zinc-950">
                                      <div className="p-1 space-y-0.5 pr-2">
                                        {Array.from({ length: 60 }, (_, i) => i).map((minuto) => {
                                          const minutoStr = String(minuto).padStart(2, '0');
                                          const minutoAtual = registro.horarioRedesignacao?.split(':')[1] || '';
                                          const isSelected = minutoStr === minutoAtual;
                                          const showDivider = minuto > 0 && minuto % 15 === 0;
                                          
                                          return (
                                            <div key={minuto}>
                                              {showDivider && (
                                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const hora = registro.horarioRedesignacao?.split(':')[0] || '00';
                                                  setRegistro({ ...registro, horarioRedesignacao: `${hora}:${minutoStr}` });
                                                }}
                                                className={`w-full text-center px-2 py-1.5 text-sm rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors duration-150 font-semibold flex items-center justify-center gap-1 font-mono ${
                                                  isSelected
                                                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                                                    : "text-zinc-700 dark:text-zinc-300"
                                                }`}
                                              >
                                                {isSelected && <Check className="w-3 h-3" />}
                                                {minutoStr}
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </ScrollArea>
                                  </div>
                                </div>
                                <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 space-y-2">
                                  <div>
                                    <p className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1 uppercase tracking-wide">Atalhos Rápidos</p>
                                    <div className="grid grid-cols-4 gap-1 mb-1.5">
                                      {['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map((horario) => (
                                        <button
                                          key={horario}
                                          type="button"
                                          onClick={() => {
                                            setRegistro({ ...registro, horarioRedesignacao: horario });
                                          }}
                                          className="px-2 py-1 text-[11px] font-semibold rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-500 dark:hover:border-blue-600 transition-all text-zinc-700 dark:text-zinc-300"
                                        >
                                          {horario}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const agora = new Date();
                                        const hora = String(agora.getHours()).padStart(2, '0');
                                        const minuto = String(agora.getMinutes()).padStart(2, '0');
                                        setRegistro({ ...registro, horarioRedesignacao: `${hora}:${minuto}` });
                                      }}
                                      className="w-full px-2 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-1"
                                    >
                                      <Clock className="w-3 h-3" />
                                      Usar Horário Atual
                                    </button>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        setRegistro({ ...registro, horarioRedesignacao: '' });
                                      }}
                                      className="flex-1 h-7 text-[11px]"
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Limpar
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => setNovoHorarioPopoverOpen(false)}
                                      className="flex-1 h-7 text-[11px] bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Confirmar
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resultado */}
                  {statusAudiencia === "concluida" && (
                    <>
                      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 shadow-sm p-4">
                        <Label className="text-sm font-bold mb-3 block flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                          <Scale className="w-4 h-4 text-indigo-600 dark:text-indigo-500" />
                          Resultado da Audiência *
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                          {resultadosDisponiveis.map((opt) => {
                            const Icon = opt.icon;
                            return (
                              <button 
                                key={opt.value} 
                                type="button" 
                                onClick={() => {
                                  setRegistro({ ...registro, resultado: opt.value });
                                  if (opt.value !== "redesignada") {
                                    setRegistro({ ...registro, resultado: opt.value, motivoRedesignacao: undefined });
                                  }
                                }}
                                className={`p-2.5 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                                  registro.resultado === opt.value 
                                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-sm" 
                                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-indigo-200"
                                }`}
                              >
                                <Icon className={`w-5 h-5 mx-auto mb-1 ${registro.resultado === opt.value ? "text-indigo-600" : "text-zinc-400"}`} />
                                <p className="text-xs font-semibold text-center leading-tight">{opt.label}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>



                      {/* Tipo de Extinção */}
                      {registro.resultado === "extincao" && (
                        <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                          <div className="border-l-4 border-purple-500 dark:border-purple-400 pl-3 -ml-2 mb-3">
                            <Label className="text-base font-bold mb-0.5 block text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                              <X className="w-4 h-4 text-purple-600 dark:text-purple-500" />
                              Tipo de Extinção
                            </Label>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Especifique qual foi o tipo de extinção</p>
                          </div>
                          <Textarea 
                            value={registro.tipoExtincao || ""} 
                            onChange={(e) => setRegistro({ ...registro, tipoExtincao: e.target.value })} 
                            placeholder=""
                            rows={5}
                            className="text-sm bg-white dark:bg-zinc-950"
                          />
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "depoentes" && (
                <motion.div key="depoentes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col md:flex-row gap-3 md:gap-3 h-auto md:h-[calc(98vh-165px)] overflow-hidden">
                  {/* Lista de Depoentes - Responsiva */}
                  <div className="w-full md:w-[220px] flex flex-col gap-2 flex-shrink-0 md:max-h-full max-h-[40vh]">
                    {/* Form Adicionar - Premium Design */}
                    <div className="relative bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow p-3 space-y-2.5">
                      {/* Título com ícone - Compacto */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          <Plus className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Novo Depoente</h3>
                          <p className="text-[9px] text-zinc-500">Adicione participantes</p>
                        </div>
                      </div>
                      
                      {/* Input Nome */}
                      <div>
                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">Nome completo</Label>
                        <Input 
                          value={novoDepoenteNome} 
                          onChange={(e) => setNovoDepoenteNome(e.target.value)} 
                          placeholder="Digite o nome..." 
                          className="text-sm h-8 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 focus:border-zinc-500 focus:ring-zinc-500" 
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddDepoente();
                            }
                          }}
                        />
                      </div>
                      
                      {/* Tipo + Botão */}
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 block">Tipo</Label>
                          <select 
                            value={novoDepoenteTipo} 
                            onChange={(e) => setNovoDepoenteTipo(e.target.value as Depoente["tipo"])} 
                            className="w-full px-2.5 py-1.5 text-sm border-2 border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:border-zinc-500 focus:ring-zinc-500 font-medium h-8"
                          >
                            {tipoDepoenteOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Button 
                          type="button" 
                          onClick={handleAddDepoente} 
                          className="h-8 w-8 p-0 bg-zinc-700 hover:bg-zinc-800 dark:bg-zinc-600 dark:hover:bg-zinc-700 shadow-sm flex items-center justify-center"
                          size="sm"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Lista Ultra Compacta */}
                    <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-0.5">
                      {registro.depoentes.map((depoente) => {
                        const isActive = editandoDepoente?.id === depoente.id;
                        
                        // Classes de cor por tipo - DIRETAS
                        let borderLeftClass = "";
                        let bgActiveClass = "";
                        
                        if (depoente.tipo === "testemunha") {
                          borderLeftClass = "border-l-blue-400 dark:border-l-blue-600";
                          bgActiveClass = "bg-blue-50/40 dark:bg-blue-950/10";
                        } else if (depoente.tipo === "vitima") {
                          borderLeftClass = "border-l-red-400 dark:border-l-red-600";
                          bgActiveClass = "bg-red-50/40 dark:bg-red-950/10";
                        } else if (depoente.tipo === "reu") {
                          borderLeftClass = "border-l-green-600 dark:border-l-green-700";
                          bgActiveClass = "bg-green-50/40 dark:bg-green-950/10";
                        } else if (depoente.tipo === "perito") {
                          borderLeftClass = "border-l-orange-400 dark:border-l-orange-600";
                          bgActiveClass = "bg-orange-50/40 dark:bg-orange-950/10";
                        } else if (depoente.tipo === "policial") {
                          borderLeftClass = "border-l-yellow-400 dark:border-l-yellow-600";
                          bgActiveClass = "bg-yellow-50/40 dark:bg-yellow-950/10";
                        } else if (depoente.tipo === "informante") {
                          borderLeftClass = "border-l-slate-400 dark:border-l-slate-600";
                          bgActiveClass = "bg-slate-50/40 dark:bg-slate-950/10";
                        } else {
                          borderLeftClass = "border-l-gray-400 dark:border-l-gray-600";
                          bgActiveClass = "bg-gray-50/40 dark:bg-gray-950/10";
                        }
                        
                        return (
                          <div
                            key={depoente.id} 
                            className={`relative group rounded-lg border-l-4 border border-zinc-200 dark:border-zinc-800 p-2 cursor-pointer transition-all ${borderLeftClass} ${
                              isActive 
                                ? `shadow-sm ${bgActiveClass}` 
                                : "hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            }`} 
                            onClick={() => setEditandoDepoente(depoente)}
                          >
                            {/* Badge de Status - Mini */}
                            <div className="absolute -top-1 -right-1 flex gap-0.5">
                              {depoente.presente ? (
                                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                                  <UserCheck className="w-2.5 h-2.5 text-white" />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                                  <UserX className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                              {depoente.intimado && (
                                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center">
                                  <Mail className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>

                            <div className="pr-5">
                              <p className="font-semibold text-xs truncate leading-tight">{depoente.nome}</p>
                              <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{tipoDepoenteOptions.find((t) => t.value === depoente.tipo)?.label}</p>
                            </div>
                            
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); handleRemoveDepoente(depoente.id); }} 
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                      {registro.depoentes.length === 0 && (
                        <div className="text-center py-8 md:py-16 px-2">
                          <Users className="w-8 md:w-10 h-8 md:h-10 text-zinc-300 mx-auto mb-2" />
                          <p className="text-[10px] text-zinc-400 leading-tight">Nenhum depoente</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detalhes do Depoente - Responsivo */}
                  <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-[50vh] md:min-h-0">
                    {editandoDepoente ? (
                      <div className="flex flex-col h-full overflow-hidden">
                        {/* Header Compacto - Responsivo com cores por tipo */}
                        {(() => {
                          const depoenteStyle = getDepoenteStyle(editandoDepoente.tipo);
                          const getDotColor = () => {
                            switch (editandoDepoente.tipo) {
                              case "testemunha": return "bg-blue-500";
                              case "vitima": return "bg-red-500";
                              case "reu": return "bg-green-500";
                              case "perito": return "bg-orange-500";
                              case "informante": return "bg-slate-500";
                              case "policial": return "bg-yellow-500";
                              default: return "bg-gray-500";
                            }
                          };
                          return (
                            <div className={`flex-shrink-0 ${depoenteStyle.bg} rounded-lg border-l-4 ${depoenteStyle.border} border-2 ${depoenteStyle.border} shadow-sm px-3 md:px-4 py-2.5 mb-2 space-y-2`}>
                              {/* Linha 1: Nome e Tipo */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${getDotColor()}`} />
                                  <span className="font-bold text-sm md:text-base text-zinc-900 dark:text-zinc-50">{editandoDepoente.nome}</span>
                                  <span className="text-xs md:text-sm text-zinc-500">• {depoenteStyle.label}</span>
                                </div>
                                
                                {/* Toggles Compactos - Empilhados em mobile */}
                          <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateDepoente({ ...editandoDepoente, intimado: true })}
                                className={`px-2.5 md:px-3 py-1 rounded text-[10px] md:text-xs font-bold transition-all ${
                                  editandoDepoente.intimado
                                    ? "bg-blue-500 text-white"
                                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 hover:bg-blue-200"
                                }`}
                              >
                                Intimado
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateDepoente({ ...editandoDepoente, intimado: false })}
                                className={`px-2.5 md:px-3 py-1 rounded text-[10px] md:text-xs font-bold transition-all ${
                                  !editandoDepoente.intimado
                                    ? "bg-zinc-600 text-white"
                                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 hover:bg-zinc-300"
                                }`}
                              >
                                Não intimado
                              </button>
                            </div>

                            <div className="hidden md:block w-px h-5 bg-zinc-300 dark:bg-zinc-700" />

                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateDepoente({ ...editandoDepoente, presente: true })}
                                className={`px-2.5 md:px-3 py-1 rounded text-[10px] md:text-xs font-bold transition-all ${
                                  editandoDepoente.presente
                                    ? "bg-green-500 text-white"
                                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 hover:bg-green-200"
                                }`}
                              >
                                Presente
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateDepoente({ ...editandoDepoente, presente: false })}
                                className={`px-2.5 md:px-3 py-1 rounded text-[10px] md:text-xs font-bold transition-all ${
                                  !editandoDepoente.presente
                                    ? "bg-red-500 text-white"
                                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 hover:bg-red-200"
                                }`}
                              >
                                Ausente
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Campos específicos por tipo */}

                        {editandoDepoente.tipo === "testemunha" && (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedDepoenteDetails(prev => ({
                                ...prev,
                                [editandoDepoente.id]: !prev[editandoDepoente.id]
                              }))}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Detalhes da Testemunha</span>
                              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expandedDepoenteDetails[editandoDepoente.id] ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {expandedDepoenteDetails[editandoDepoente.id] && (
                              <div className="space-y-1.5 pl-2 border-l-2 border-zinc-200 dark:border-zinc-800">
                                <div className="flex gap-2 flex-wrap">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Tipo de testemunha:</Label>
                              <div className="flex gap-1">
                                {[
                                  { value: "ocular", label: "Ocular" },
                                  { value: "ouvir-dizer", label: "Ouvir dizer" },
                                  { value: "conduta", label: "Conduta" },
                                ].map((tipo) => (
                                  <button
                                    key={tipo.value}
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, tipoTestemunha: tipo.value as any })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.tipoTestemunha === tipo.value
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    {tipo.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {editandoDepoente.tipoTestemunha === "ocular" && (
                              <div className="flex gap-2 flex-wrap items-center">
                                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Testemunha viu:</Label>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOcularViu: "fato-objeto" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.testemunhaOcularViu === "fato-objeto"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Fato
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOcularViu: "indicios" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.testemunhaOcularViu === "indicios"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Indícios
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {editandoDepoente.tipoTestemunha === "ouvir-dizer" && (
                              <>
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Origem da informação:</Label>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOuvirDizerFonte: "fonte-direta" })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.testemunhaOuvirDizerFonte === "fonte-direta"
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      De quem presenciou
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOuvirDizerFonte: "rumores" })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.testemunhaOuvirDizerFonte === "rumores"
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Rumores/boatos
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Informaram autoria:</Label>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOuvirDizerInformaramAutoria: true })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.testemunhaOuvirDizerInformaramAutoria === true
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOuvirDizerInformaramAutoria: false })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.testemunhaOuvirDizerInformaramAutoria === false
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                            
                            {editandoDepoente.tipoTestemunha === "conduta" && (
                              <div className="flex gap-2 flex-wrap items-center">
                                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Caráter relatado:</Label>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaCondutaCarater: "favoravel" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.testemunhaCondutaCarater === "favoravel"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Boa reputação
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaCondutaCarater: "desfavoravel" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.testemunhaCondutaCarater === "desfavoravel"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Má reputação
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {editandoDepoente.tipoTestemunha === "ocular" && (
                              <div className="flex gap-2 flex-wrap items-center">
                                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Reconhecimento do assistido:</Label>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, reconheceuAssistido: true })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.reconheceuAssistido === true
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, reconheceuAssistido: false })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.reconheceuAssistido === false
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Não
                                  </button>
                                </div>
                              </div>
                            )}
                              </div>
                            )}
                          </div>
                        )}

                        {editandoDepoente.tipo === "vitima" && (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedDepoenteDetails(prev => ({
                                ...prev,
                                [editandoDepoente.id]: !prev[editandoDepoente.id]
                              }))}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Detalhes da Vítima</span>
                              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expandedDepoenteDetails[editandoDepoente.id] ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {expandedDepoenteDetails[editandoDepoente.id] && (
                              <div className="space-y-1.5 pl-2 border-l-2 border-zinc-200 dark:border-zinc-800">
                                {evento.atribuicao !== "Violência Doméstica" && (
                              <>
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Viu o autor:</Label>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, vitimaViuAutor: true })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.vitimaViuAutor === true
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, vitimaViuAutor: false })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.vitimaViuAutor === false
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                                
                                {editandoDepoente.vitimaViuAutor === true && (
                                  <div className="flex gap-2 flex-wrap items-center">
                                    <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Reconheceu:</Label>
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateDepoente({ ...editandoDepoente, vitimaReconheceuAutor: true })}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                          editandoDepoente.vitimaReconheceuAutor === true
                                            ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                            : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                        }`}
                                      >
                                        Sim
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateDepoente({ ...editandoDepoente, vitimaReconheceuAutor: false })}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                          editandoDepoente.vitimaReconheceuAutor === false
                                            ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                            : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                        }`}
                                      >
                                        Não
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {evento.atribuicao === "Violência Doméstica" && (
                              <>
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Reconciliação:</Label>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, vitimaReconciliada: true })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.vitimaReconciliada === true
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Voltaram
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, vitimaReconciliada: false })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.vitimaReconciliada === false
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Não voltaram
                                    </button>
                                  </div>
                                </div>

                                {editandoDepoente.vitimaReconciliada === false && (
                                  <div className="flex gap-2 flex-wrap items-center">
                                    <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Estado emocional:</Label>
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateDepoente({ ...editandoDepoente, vitimaEstadoEmocional: "em-paz" })}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                          editandoDepoente.vitimaEstadoEmocional === "em-paz"
                                            ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800"
                                            : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800"
                                        }`}
                                      >
                                        Em paz
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateDepoente({ ...editandoDepoente, vitimaEstadoEmocional: "com-raiva" })}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                          editandoDepoente.vitimaEstadoEmocional === "com-raiva"
                                            ? "bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800"
                                            : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800"
                                        }`}
                                      >
                                        Com raiva
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                              </div>
                            )}
                          </div>
                        )}

                        {editandoDepoente.tipo === "reu" && (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedDepoenteDetails(prev => ({
                                ...prev,
                                [editandoDepoente.id]: !prev[editandoDepoente.id]
                              }))}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Detalhes do Réu</span>
                              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expandedDepoenteDetails[editandoDepoente.id] ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {expandedDepoenteDetails[editandoDepoente.id] && (
                              <div className="space-y-1.5 pl-2 border-l-2 border-zinc-200 dark:border-zinc-800">
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Silêncio na audiência:</Label>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuSilencio: true })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.reuSilencio === true
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuSilencio: false })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                    editandoDepoente.reuSilencio === false
                                      ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                      : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                  }`}
                                >
                                  Não
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 flex-wrap items-center">
                              <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Confessou na delegacia:</Label>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuConfessouDelegacia: "sim" })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                    editandoDepoente.reuConfessouDelegacia === "sim"
                                      ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                      : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                  }`}
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuConfessouDelegacia: "nao" })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                    editandoDepoente.reuConfessouDelegacia === "nao"
                                      ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                      : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                  }`}
                                >
                                  Não
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuConfessouDelegacia: "em-parte" })}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                    editandoDepoente.reuConfessouDelegacia === "em-parte"
                                      ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                      : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                  }`}
                                >
                                  Em parte
                                </button>
                              </div>
                            </div>
                            
                            {(editandoDepoente.reuConfessouDelegacia === "sim" || editandoDepoente.reuConfessouDelegacia === "em-parte") && (
                              <div className="flex gap-2 flex-wrap items-center">
                                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Retratou:</Label>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuRetratou: true })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.reuRetratou === true
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuRetratou: false })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.reuRetratou === false
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Não
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {(editandoDepoente.reuConfessouDelegacia === "sim" || editandoDepoente.reuConfessouDelegacia === "em-parte") && editandoDepoente.reuRetratou === true && (
                              <div className="flex gap-2 flex-wrap items-center">
                                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Motivo da retratação:</Label>
                                <div className="flex gap-1 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuMotivoRetracao: "tortura" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.reuMotivoRetracao === "tortura"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Tortura
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuMotivoRetracao: "falsidade-relato" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.reuMotivoRetracao === "falsidade-relato"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Assinou sem ler
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuMotivoRetracao: "inducao" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.reuMotivoRetracao === "inducao"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Indução
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {(editandoDepoente.reuConfessouDelegacia === "nao" || (editandoDepoente.reuRetratou === true)) && (
                              <>
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Informou álibi:</Label>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuInformouAlibi: true })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.reuInformouAlibi === true
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuInformouAlibi: false })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.reuInformouAlibi === false
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Sabe algo do fato:</Label>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuSabeAlgoFato: true })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.reuSabeAlgoFato === true
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuSabeAlgoFato: false })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.reuSabeAlgoFato === false
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Sabe o que pode tê-lo incriminado:</Label>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuSabeOQueIncriminou: true })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.reuSabeOQueIncriminou === true
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, reuSabeOQueIncriminou: false })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.reuSabeOQueIncriminou === false
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                              </div>
                            )}
                          </div>
                        )}

                        {editandoDepoente.tipo === "informante" && (
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedDepoenteDetails(prev => ({
                                ...prev,
                                [editandoDepoente.id]: !prev[editandoDepoente.id]
                              }))}
                              className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Detalhes do Informante</span>
                              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${expandedDepoenteDetails[editandoDepoente.id] ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {expandedDepoenteDetails[editandoDepoente.id] && (
                              <div className="space-y-1.5 pl-2 border-l-2 border-zinc-200 dark:border-zinc-800">
                                <div className="flex gap-2 flex-wrap">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Tipo de informante:</Label>
                              <div className="flex gap-1">
                                {[
                                  { value: "ocular", label: "Ocular" },
                                  { value: "ouvir-dizer", label: "Ouvir dizer" },
                                  { value: "conduta", label: "Conduta" },
                                ].map((tipo) => (
                                  <button
                                    key={tipo.value}
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, tipoTestemunha: tipo.value as any })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.tipoTestemunha === tipo.value
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    {tipo.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            
                            {editandoDepoente.tipoTestemunha === "ocular" && (
                              <div className="flex gap-2 flex-wrap items-center">
                                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Informante viu:</Label>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOcularViu: "fato-objeto" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.testemunhaOcularViu === "fato-objeto"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Fato
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOcularViu: "indicios" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.testemunhaOcularViu === "indicios"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Indícios
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {editandoDepoente.tipoTestemunha === "ouvir-dizer" && (
                              <>
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Origem da informação:</Label>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOuvirDizerFonte: "fonte-direta" })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.testemunhaOuvirDizerFonte === "fonte-direta"
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      De quem presenciou
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOuvirDizerFonte: "rumores" })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.testemunhaOuvirDizerFonte === "rumores"
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Rumores/boatos
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="flex gap-2 flex-wrap items-center">
                                  <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Informaram autoria:</Label>
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOuvirDizerInformaramAutoria: true })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.testemunhaOuvirDizerInformaramAutoria === true
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaOuvirDizerInformaramAutoria: false })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                        editandoDepoente.testemunhaOuvirDizerInformaramAutoria === false
                                          ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                          : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                      }`}
                                    >
                                      Não
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                            
                            {editandoDepoente.tipoTestemunha === "conduta" && (
                              <div className="flex gap-2 flex-wrap items-center">
                                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Caráter relatado:</Label>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaCondutaCarater: "favoravel" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.testemunhaCondutaCarater === "favoravel"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Boa reputação
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, testemunhaCondutaCarater: "desfavoravel" })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.testemunhaCondutaCarater === "desfavoravel"
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Má reputação
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {editandoDepoente.tipoTestemunha === "ocular" && (
                              <div className="flex gap-2 flex-wrap items-center">
                                <Label className="text-[10px] text-zinc-600 dark:text-zinc-400">Reconhecimento do assistido:</Label>
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, reconheceuAssistido: true })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.reconheceuAssistido === true
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDepoente({ ...editandoDepoente, reconheceuAssistido: false })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                      editandoDepoente.reconheceuAssistido === false
                                        ? `${depoenteStyle.bg} ${depoenteStyle.text} border ${depoenteStyle.border}`
                                        : "bg-white dark:bg-zinc-900 text-zinc-500 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                                    }`}
                                  >
                                    Não
                                  </button>
                                </div>
                              </div>
                            )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                        {/* Seções de Registro */}
                        {(() => {
                          const depoenteStyle = getDepoenteStyle(editandoDepoente.tipo);
                          return (
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                              {/* 1. Estratégia de Inquirição - SEMPRE VISÍVEL */}
                              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => setExpandedSections({ ...expandedSections, estrategia: !expandedSections.estrategia })}
                                  className="w-full px-3 py-2 flex items-center justify-between bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <Target className={`w-3.5 h-3.5 ${depoenteStyle.icon}`} />
                                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Estratégia de Inquirição</span>
                                    {editandoDepoente.estrategiaInquiricao && <div className={`w-1.5 h-1.5 rounded-full ${
                                      editandoDepoente.tipo === "testemunha" ? "bg-blue-500" :
                                      editandoDepoente.tipo === "vitima" ? "bg-red-500" :
                                      editandoDepoente.tipo === "reu" ? "bg-green-500" :
                                      editandoDepoente.tipo === "perito" ? "bg-orange-500" :
                                      editandoDepoente.tipo === "informante" ? "bg-slate-500" :
                                      editandoDepoente.tipo === "policial" ? "bg-yellow-500" : "bg-gray-500"
                                    }`} />}
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expandedSections.estrategia ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                  {expandedSections.estrategia && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                      <div className="p-3 bg-white dark:bg-zinc-950">
                                        {!editandoDepoente.presente && (
                                          <div className="mb-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                            <AlertTriangle className="w-3 h-3" />
                                            Planejamento para próxima audiência
                                          </div>
                                        )}
                                        <Textarea
                                          value={editandoDepoente.estrategiaInquiricao}
                                          onChange={(e) => handleUpdateDepoente({ ...editandoDepoente, estrategiaInquiricao: e.target.value })}
                                          placeholder="Estratégia e linha de questionamento..."
                                          rows={8}
                                          className="text-sm font-mono border-zinc-200 dark:border-zinc-800"
                                        />
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>

                              {/* Demais seções - Apenas se PRESENTE */}
                              {editandoDepoente.presente && (
                                <>
                                  {/* 2. Perguntas da Defesa */}
                                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedSections({ ...expandedSections, perguntas: !expandedSections.perguntas })}
                                      className="w-full px-3 py-2 flex items-center justify-between bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Shield className={`w-3.5 h-3.5 ${depoenteStyle.icon}`} />
                                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Perguntas da Defesa</span>
                                        {editandoDepoente.perguntasDefesa && <div className={`w-1.5 h-1.5 rounded-full ${
                                          editandoDepoente.tipo === "testemunha" ? "bg-blue-500" :
                                          editandoDepoente.tipo === "vitima" ? "bg-red-500" :
                                          editandoDepoente.tipo === "reu" ? "bg-green-500" :
                                          editandoDepoente.tipo === "perito" ? "bg-orange-500" :
                                          editandoDepoente.tipo === "informante" ? "bg-slate-500" :
                                          editandoDepoente.tipo === "policial" ? "bg-yellow-500" : "bg-gray-500"
                                        }`} />}
                                      </div>
                                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expandedSections.perguntas ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                      {expandedSections.perguntas && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                          <div className="p-3 bg-white dark:bg-zinc-950">
                                            <Textarea
                                              value={editandoDepoente.perguntasDefesa}
                                              onChange={(e) => handleUpdateDepoente({ ...editandoDepoente, perguntasDefesa: e.target.value })}
                                              placeholder="Perguntas realizadas..."
                                              rows={8}
                                              className="text-sm font-mono border-zinc-200 dark:border-zinc-800"
                                            />
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>

                                  {/* 3. Depoimento e Trechos Literais */}
                                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedSections({ ...expandedSections, depoimento: !expandedSections.depoimento })}
                                      className="w-full px-3 py-2 flex items-center justify-between bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Quote className={`w-3.5 h-3.5 ${depoenteStyle.icon}`} />
                                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Depoimento e Trechos Literais</span>
                                        {editandoDepoente.depoimentoLiteral && <div className={`w-1.5 h-1.5 rounded-full ${
                                          editandoDepoente.tipo === "testemunha" ? "bg-blue-500" :
                                          editandoDepoente.tipo === "vitima" ? "bg-red-500" :
                                          editandoDepoente.tipo === "reu" ? "bg-green-500" :
                                          editandoDepoente.tipo === "perito" ? "bg-orange-500" :
                                          editandoDepoente.tipo === "informante" ? "bg-slate-500" :
                                          editandoDepoente.tipo === "policial" ? "bg-yellow-500" : "bg-gray-500"
                                        }`} />}
                                      </div>
                                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expandedSections.depoimento ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                      {expandedSections.depoimento && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                          <div className="p-3 bg-white dark:bg-zinc-950">
                                            {editandoDepoente.tipo === "vitima" && (
                                              <div className="mb-2">
                                                <Label className="text-xs mb-1 block text-zinc-700 dark:text-zinc-300">Contradições / Relatos que desmintam</Label>
                                                <Textarea
                                                  value={editandoDepoente.vitimaContradicoes || ""}
                                                  onChange={(e) => handleUpdateDepoente({ ...editandoDepoente, vitimaContradicoes: e.target.value })}
                                                  placeholder="Contradições identificadas..."
                                                  rows={3}
                                                  className="text-sm font-mono border-zinc-200 dark:border-zinc-800 mb-2"
                                                />
                                              </div>
                                            )}
                                            <Textarea
                                              value={editandoDepoente.depoimentoLiteral}
                                              onChange={(e) => handleUpdateDepoente({ ...editandoDepoente, depoimentoLiteral: e.target.value })}
                                              placeholder="Trechos importantes..."
                                              rows={8}
                                              className="text-sm font-mono border-zinc-200 dark:border-zinc-800"
                                            />
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>

                                  {/* 4. Análise e Percepções */}
                                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedSections({ ...expandedSections, analise: !expandedSections.analise })}
                                      className="w-full px-3 py-2 flex items-center justify-between bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Eye className={`w-3.5 h-3.5 ${depoenteStyle.icon}`} />
                                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Análise e Percepções</span>
                                        {editandoDepoente.analisePercepcoes && <div className={`w-1.5 h-1.5 rounded-full ${
                                          editandoDepoente.tipo === "testemunha" ? "bg-blue-500" :
                                          editandoDepoente.tipo === "vitima" ? "bg-red-500" :
                                          editandoDepoente.tipo === "reu" ? "bg-green-500" :
                                          editandoDepoente.tipo === "perito" ? "bg-orange-500" :
                                          editandoDepoente.tipo === "informante" ? "bg-slate-500" :
                                          editandoDepoente.tipo === "policial" ? "bg-yellow-500" : "bg-gray-500"
                                        }`} />}
                                      </div>
                                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expandedSections.analise ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                      {expandedSections.analise && (
                                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                          <div className="p-3 bg-white dark:bg-zinc-950">
                                            <Textarea
                                              value={editandoDepoente.analisePercepcoes}
                                              onChange={(e) => handleUpdateDepoente({ ...editandoDepoente, analisePercepcoes: e.target.value })}
                                              placeholder="Credibilidade e pontos relevantes..."
                                              rows={8}
                                              className="text-sm font-mono border-zinc-200 dark:border-zinc-800"
                                            />
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mx-auto mb-3 md:mb-4">
                            <Users className="w-8 h-8 md:w-12 md:h-12 text-zinc-400" />
                          </div>
                          <p className="text-base md:text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Selecione um depoente</p>
                          <p className="text-xs md:text-sm text-zinc-500">Clique em um depoente à esquerda</p>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "manifestacoes" && (
                <motion.div key="manifestacoes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4 max-w-4xl mx-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                      <div className="border-l-4 border-rose-500 dark:border-rose-400 pl-3 -ml-2 mb-3">
                        <Label className="text-base font-bold mb-0.5 block text-zinc-900 dark:text-zinc-100">
                          Manifestação do MP
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Posicionamento do Ministério Público</p>
                      </div>
                      <Textarea value={registro.manifestacaoMP} onChange={(e) => setRegistro({ ...registro, manifestacaoMP: e.target.value })} placeholder="Digite o conteúdo..." rows={8} className="text-sm bg-white dark:bg-zinc-950" />
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                      <div className="border-l-4 border-green-500 dark:border-green-400 pl-3 -ml-2 mb-3">
                        <Label className="text-base font-bold mb-0.5 block text-zinc-900 dark:text-zinc-100">
                          Manifestação da Defesa
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Manifestação apresentada</p>
                      </div>
                      <Textarea value={registro.manifestacaoDefesa} onChange={(e) => setRegistro({ ...registro, manifestacaoDefesa: e.target.value })} placeholder="Digite o conteúdo..." rows={8} className="text-sm bg-white dark:bg-zinc-950" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                      <div className="border-l-4 border-blue-500 dark:border-blue-400 pl-3 -ml-2 mb-3">
                        <Label className="text-base font-bold mb-0.5 block text-zinc-900 dark:text-zinc-100">
                          Decisões do Juiz
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Decisões proferidas</p>
                      </div>
                      <Textarea value={registro.decisaoJuiz} onChange={(e) => setRegistro({ ...registro, decisaoJuiz: e.target.value })} placeholder="Digite o conteúdo..." rows={8} className="text-sm bg-white dark:bg-zinc-950" />
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                      <div className="border-l-4 border-zinc-400 dark:border-zinc-500 pl-3 -ml-2 mb-3">
                        <Label className="text-base font-bold mb-0.5 block text-zinc-900 dark:text-zinc-100">
                          Encaminhamentos
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Próximos passos</p>
                      </div>
                      <Textarea value={registro.encaminhamentos} onChange={(e) => setRegistro({ ...registro, encaminhamentos: e.target.value })} placeholder="Digite o conteúdo..." rows={8} className="text-sm bg-white dark:bg-zinc-950" />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "anotacoes" && (
                <motion.div key="anotacoes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4 max-w-4xl mx-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                      <div className="border-l-4 border-green-500 dark:border-green-400 pl-3 -ml-2 mb-3">
                        <Label className="text-base font-bold mb-0.5 block text-zinc-900 dark:text-zinc-100">
                          Atendimento Prévio
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Pontos abordados</p>
                      </div>
                      <Textarea value={registro.atendimentoReuAntes} onChange={(e) => setRegistro({ ...registro, atendimentoReuAntes: e.target.value })} placeholder="Digite o conteúdo..." rows={8} className="text-sm bg-white dark:bg-zinc-950" />
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                      <div className="border-l-4 border-green-500 dark:border-green-400 pl-3 -ml-2 mb-3">
                        <Label className="text-base font-bold mb-0.5 block text-zinc-900 dark:text-zinc-100">
                          Estratégias de Defesa
                        </Label>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Linhas adotadas</p>
                      </div>
                      <Textarea value={registro.estrategiasDefesa} onChange={(e) => setRegistro({ ...registro, estrategiasDefesa: e.target.value })} placeholder="Digite o conteúdo..." rows={8} className="text-sm bg-white dark:bg-zinc-950" />
                    </div>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                    <div className="border-l-4 border-zinc-400 dark:border-zinc-500 pl-3 -ml-2 mb-3">
                      <Label className="text-base font-bold mb-0.5 block text-zinc-900 dark:text-zinc-100">
                        Anotações Gerais da Audiência
                      </Label>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Observações e pontos de atenção</p>
                    </div>
                    <Textarea value={registro.anotacoesGerais} onChange={(e) => setRegistro({ ...registro, anotacoesGerais: e.target.value })} placeholder="Digite o conteúdo..." rows={10} className="text-sm bg-white dark:bg-zinc-950" />
                  </div>
                </motion.div>
              )}

              {activeTab === "registro" && (
                <motion.div key="registro" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4 max-w-5xl mx-auto">
                  {/* Header */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-600 flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            Visualização do Registro
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Resumo de tudo que será salvo neste registro de audiência
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Completude:</span>
                          <Badge className={`${
                            (() => {
                              const camposPreenchidos = [
                                registro.resultado,
                                registro.depoentes.length > 0,
                                registro.manifestacaoMP,
                                registro.manifestacaoDefesa,
                                registro.decisaoJuiz,
                                registro.anotacoesGerais,
                                statusAudiencia === "redesignada" ? registro.motivoNaoRealizacao : true,
                              ].filter(Boolean).length;
                              const percentual = Math.round((camposPreenchidos / 7) * 100);
                              return percentual >= 80 
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : percentual >= 50
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
                            })()
                          }`}>
                            {(() => {
                              const camposPreenchidos = [
                                registro.resultado,
                                registro.depoentes.length > 0,
                                registro.manifestacaoMP,
                                registro.manifestacaoDefesa,
                                registro.decisaoJuiz,
                                registro.anotacoesGerais,
                                statusAudiencia === "redesignada" ? registro.motivoNaoRealizacao : true,
                              ].filter(Boolean).length;
                              return Math.round((camposPreenchidos / 7) * 100);
                            })()}%
                          </Badge>
                        </div>
                        <div className="w-32 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
                            style={{ 
                              width: `${(() => {
                                const camposPreenchidos = [
                                  registro.resultado,
                                  registro.depoentes.length > 0,
                                  registro.manifestacaoMP,
                                  registro.manifestacaoDefesa,
                                  registro.decisaoJuiz,
                                  registro.anotacoesGerais,
                                  statusAudiencia === "redesignada" ? registro.motivoNaoRealizacao : true,
                                ].filter(Boolean).length;
                                return Math.round((camposPreenchidos / 7) * 100);
                              })()}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Geral */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className={`p-3 rounded-lg border ${
                      statusAudiencia === "concluida" 
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                        : statusAudiencia === "redesignada"
                        ? "bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800"
                        : "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className={`w-4 h-4 ${
                          statusAudiencia === "concluida" 
                            ? "text-emerald-600 dark:text-emerald-400"
                            : statusAudiencia === "redesignada"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`} />
                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Status</Label>
                      </div>
                      <p className={`text-sm font-semibold ${
                        statusAudiencia === "concluida" 
                          ? "text-emerald-700 dark:text-emerald-300"
                          : statusAudiencia === "redesignada"
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-amber-700 dark:text-amber-300"
                      }`}>
                        {statusAudiencia === "concluida" ? "Concluída" : statusAudiencia === "redesignada" ? "Redesignada" : "Suspensa"}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Depoentes</Label>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {registro.depoentes.length} cadastrado(s)
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                        <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Data/Hora</Label>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {new Date(evento.data).toLocaleDateString("pt-BR")} • {evento.horarioInicio}
                      </p>
                    </div>
                  </div>

                  {/* Resultado da Audiência */}
                  {registro.resultado && (
                    <div className="bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                      <Label className="text-sm font-semibold mb-2 block text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        Resultado da Audiência
                      </Label>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {registro.resultado}
                      </p>
                    </div>
                  )}

                  {/* Depoentes */}
                  {registro.depoentes.length > 0 && (
                    <div className="bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                      <Label className="text-sm font-semibold mb-3 block text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        <Users className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        Depoentes ({registro.depoentes.length})
                      </Label>
                      <div className="space-y-3">
                        {registro.depoentes.map((dep, idx) => {
                          const style = getDepoenteStyle(dep.tipo);
                          return (
                            <div key={idx} className={`rounded-lg border ${style.border} ${style.bg} overflow-hidden`}>
                              <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center gap-2">
                                  <Badge className={`${style.bg} ${style.text} text-[10px]`}>
                                    {style.label}
                                  </Badge>
                                  <span className={`text-sm font-semibold ${style.text}`}>
                                    {dep.nome}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="p-3 space-y-3 bg-white dark:bg-zinc-950">
                                {dep.estrategiaInquiricao && (
                                  <div>
                                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                                      <Target className="w-3 h-3" />
                                      Estratégia de Inquirição
                                    </Label>
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                      {dep.estrategiaInquiricao}
                                    </p>
                                  </div>
                                )}
                                
                                {dep.perguntasDefesa && (
                                  <div>
                                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                                      <BookOpen className="w-3 h-3" />
                                      Perguntas da Defesa
                                    </Label>
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                      {dep.perguntasDefesa}
                                    </p>
                                  </div>
                                )}
                                
                                {dep.depoimentoLiteral && (
                                  <div>
                                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                                      <Quote className="w-3 h-3" />
                                      Depoimento Literal
                                    </Label>
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                                      &ldquo;{dep.depoimentoLiteral}&rdquo;
                                    </p>
                                  </div>
                                )}
                                
                                {dep.analisePercepcoes && (
                                  <div>
                                    <Label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 mb-1">
                                      <Eye className="w-3 h-3" />
                                      Análise e Percepções
                                    </Label>
                                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                      {dep.analisePercepcoes}
                                    </p>
                                  </div>
                                )}

                                <div className="flex items-center gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="w-3 h-3 text-zinc-400" />
                                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                                      Intimado: {dep.intimado ? "Sim" : "Não"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Check className="w-3 h-3 text-zinc-400" />
                                    <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                                      Presente: {dep.presente ? "Sim" : "Não"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Redesignação */}
                  {statusAudiencia === "redesignada" && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                      <Label className="text-sm font-semibold mb-3 block text-blue-800 dark:text-blue-200 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Informações de Redesignação
                      </Label>
                      <div className="space-y-2">
                        {registro.motivoNaoRealizacao && (
                          <div>
                            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Motivo:</Label>
                            <p className="text-sm text-zinc-900 dark:text-zinc-100">{registro.motivoNaoRealizacao}</p>
                          </div>
                        )}
                        {depoentesRedesignacao.length > 0 ? (
                          <div>
                            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Depoentes que motivaram:</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {depoentesRedesignacao.map((nome, idx) => (
                                <Badge key={idx} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs border-blue-200 dark:border-blue-800">
                                  {nome}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                            <p className="text-xs text-amber-700 dark:text-amber-300 italic flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3" />
                              Nenhum depoente selecionado como motivo da redesignação
                            </p>
                          </div>
                        )}
                        {registro.dataRedesignacao && (
                          <div>
                            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Nova Data:</Label>
                            <p className="text-sm text-zinc-900 dark:text-zinc-100">
                              {new Date(registro.dataRedesignacao).toLocaleDateString("pt-BR")}
                              {registro.horarioRedesignacao && ` às ${registro.horarioRedesignacao}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manifestações */}
                  {(registro.manifestacaoMP || registro.manifestacaoDefesa || registro.decisaoJuiz) && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Manifestações e Decisões
                      </Label>
                      <div className="grid grid-cols-1 gap-2">
                        {registro.manifestacaoMP && (
                          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800 p-3">
                            <Label className="text-xs font-semibold mb-1.5 block text-red-700 dark:text-red-300 flex items-center gap-1.5">
                              <Scale className="w-3.5 h-3.5" />
                              Ministério Público
                            </Label>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                              {registro.manifestacaoMP}
                            </p>
                          </div>
                        )}
                        {registro.manifestacaoDefesa && (
                          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800 p-3">
                            <Label className="text-xs font-semibold mb-1.5 block text-green-700 dark:text-green-300 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5" />
                              Defesa
                            </Label>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                              {registro.manifestacaoDefesa}
                            </p>
                          </div>
                        )}
                        {registro.decisaoJuiz && (
                          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 p-3">
                            <Label className="text-xs font-semibold mb-1.5 block text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                              <Gavel className="w-3.5 h-3.5" />
                              Decisão do Juiz
                            </Label>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                              {registro.decisaoJuiz}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Anotações */}
                  {registro.anotacoesGerais && (
                    <div className="bg-white dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                      <Label className="text-sm font-semibold mb-2 block text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                        <Notebook className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        Anotações Gerais
                      </Label>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                        {registro.anotacoesGerais}
                      </p>
                    </div>
                  )}

                  {/* Campos Pendentes */}
                  {(() => {
                    const camposPendentes = [];
                    if (!registro.resultado) camposPendentes.push({ label: "Resultado da Audiência", tab: "geral" });
                    if (registro.depoentes.length === 0) camposPendentes.push({ label: "Adicionar Depoentes", tab: "depoentes" });
                    if (!registro.manifestacaoMP) camposPendentes.push({ label: "Manifestação do MP", tab: "manifestacoes" });
                    if (!registro.manifestacaoDefesa) camposPendentes.push({ label: "Manifestação da Defesa", tab: "manifestacoes" });
                    if (!registro.decisaoJuiz) camposPendentes.push({ label: "Decisão do Juiz", tab: "manifestacoes" });
                    if (!registro.anotacoesGerais) camposPendentes.push({ label: "Anotações Gerais", tab: "anotacoes" });
                    if (statusAudiencia === "redesignada" && !registro.motivoNaoRealizacao) camposPendentes.push({ label: "Motivo da Redesignação", tab: "geral" });
                    
                    return camposPendentes.length > 0 ? (
                      <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                        <Label className="text-xs font-semibold mb-2 block text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Campos Recomendados ({camposPendentes.length})
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                          {camposPendentes.map((campo, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveTab(campo.tab as any)}
                              className="px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-left group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-zinc-700 dark:text-zinc-300">
                                  {campo.label}
                                </span>
                                <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Footer Info */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Registro será salvo automaticamente</span>
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-500">
                        {new Date().toLocaleDateString("pt-BR")} • {new Date().toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "historico" && (
                <motion.div key="historico" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4 max-w-4xl mx-auto">
                  {/* Header com contagem */}
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                        <BookOpen className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          Histórico de Audiências
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {registrosAnteriores.length} registro{registrosAnteriores.length !== 1 ? "s" : ""} encontrado{registrosAnteriores.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Timeline de Registros */}
                  <div className="space-y-4 relative">
                    {/* Linha vertical da timeline */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-800" />

                    {registrosAnteriores.map((reg, idx) => (
                      <div key={reg.historicoId} className="relative pl-16">
                        {/* Indicador da timeline */}
                        <div className="absolute left-3 top-6 w-6 h-6 rounded-full bg-zinc-600 dark:bg-zinc-400 border-4 border-white dark:border-zinc-950 shadow-md flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white dark:text-zinc-900">{idx + 1}</span>
                        </div>

                        {/* Card do registro */}
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
                          {/* Header do Card */}
                          <div className="bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-900 p-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                  {new Date(reg.dataRealizacao).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                    weekday: 'long'
                                  })}
                                </span>
                                {reg.horarioInicio && (
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    às {reg.horarioInicio}
                                  </span>
                                )}
                              </div>
                              <Badge className={reg.realizada ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}>
                                {reg.realizada ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Concluída
                                  </>
                                ) : (
                                  <>
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Redesignada
                                  </>
                                )}
                              </Badge>
                            </div>
                            
                            {reg.local && (
                              <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                                <MapPin className="w-3.5 h-3.5" />
                                {reg.local}
                              </div>
                            )}
                          </div>

                          {/* Conteúdo do Card */}
                          <div className="p-4 space-y-4">
                            {/* Informações Principais */}
                            <div className="grid grid-cols-1 gap-3">
                              {/* Resultado */}
                              {reg.realizada && reg.resultado && (
                                <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                  <div className="border-l-4 border-blue-500 dark:border-blue-400 pl-3 -ml-2">
                                    <Label className="text-xs font-bold mb-0.5 block text-zinc-700 dark:text-zinc-300">
                                      Resultado da Audiência
                                    </Label>
                                    <Badge variant="outline" className="text-xs capitalize mt-1">
                                      {reg.resultado}
                                    </Badge>
                                  </div>
                                </div>
                              )}

                              {/* Motivo de não realização */}
                              {!reg.realizada && reg.motivoNaoRealizacao && (
                                <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                  <div className="border-l-4 border-amber-500 dark:border-amber-400 pl-3 -ml-2">
                                    <Label className="text-xs font-bold mb-0.5 block text-zinc-700 dark:text-zinc-300">
                                      Motivo da Não Realização
                                    </Label>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                      {reg.motivoNaoRealizacao}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Redesignação */}
                              {reg.resultado === "redesignada" && (
                                <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                  <div className="border-l-4 border-amber-500 dark:border-amber-400 pl-3 -ml-2">
                                    <Label className="text-xs font-bold mb-1 block text-zinc-700 dark:text-zinc-300">
                                      Audiência Redesignada
                                    </Label>
                                    {reg.motivoRedesignacao && (
                                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                                        <span className="font-semibold">Motivo:</span> {reg.motivoRedesignacao}
                                      </p>
                                    )}
                                    {reg.dataRedesignacao && (
                                      <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span className="font-semibold">Nova data:</span>
                                        {new Date(reg.dataRedesignacao).toLocaleDateString('pt-BR')}
                                        {reg.horarioRedesignacao && ` às ${reg.horarioRedesignacao}`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Extinção */}
                              {reg.resultado === "extincao" && reg.tipoExtincao && (
                                <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                  <div className="border-l-4 border-red-500 dark:border-red-400 pl-3 -ml-2">
                                    <Label className="text-xs font-bold mb-0.5 block text-zinc-700 dark:text-zinc-300">
                                      Tipo de Extinção
                                    </Label>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 capitalize">
                                      {reg.tipoExtincao}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Presença do Assistido */}
                              <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                <div className="border-l-4 border-zinc-400 dark:border-zinc-500 pl-3 -ml-2">
                                  <Label className="text-xs font-bold mb-0.5 block text-zinc-700 dark:text-zinc-300">
                                    Presença do Assistido
                                  </Label>
                                  <Badge className={reg.assistidoPresente ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mt-1" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 mt-1"}>
                                    {reg.assistidoPresente ? (
                                      <>
                                        <UserCheck className="w-3 h-3 mr-1" />
                                        Presente
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="w-3 h-3 mr-1" />
                                        Ausente
                                      </>
                                    )}
                                  </Badge>
                                </div>
                              </div>

                              {/* Acordo */}
                              {reg.acordo && (
                                <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                  <div className="border-l-4 border-emerald-500 dark:border-emerald-400 pl-3 -ml-2">
                                    <Label className="text-xs font-bold mb-0.5 block text-zinc-700 dark:text-zinc-300">
                                      Acordo Firmado
                                    </Label>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                      {reg.acordo}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Depoentes */}
                            {reg.depoentes && reg.depoentes.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                                  Depoentes e Depoimentos ({reg.depoentes.length})
                                </Label>
                                <div className="space-y-2.5">
                                  {reg.depoentes.map((dep: any, depIdx: number) => {
                                    const style = getDepoenteStyle(dep.tipo);
                                    const temConteudo = dep.estrategiaInquiricao || dep.perguntasDefesa || dep.depoimentoLiteral || dep.analisePercepcoes;
                                    
                                    return (
                                      <div key={dep.id} className={`rounded-lg border ${style.border} overflow-hidden`}>
                                        {/* Header do Depoente */}
                                        <div className={`p-2.5 border-b border-zinc-200 dark:border-zinc-800 ${style.bg}`}>
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <Badge className={`${style.bg} ${style.text} text-[10px] px-1.5 py-0.5`}>
                                                {style.label}
                                              </Badge>
                                              <span className={`text-sm font-semibold ${style.text}`}>{dep.nome}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                              {dep.intimado !== undefined && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                                  <Mail className="w-2.5 h-2.5 mr-0.5" />
                                                  {dep.intimado ? "Intimado" : "Não Intimado"}
                                                </Badge>
                                              )}
                                              {dep.presente !== undefined && (
                                                <Badge className={dep.presente ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[9px] px-1.5 py-0" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[9px] px-1.5 py-0"}>
                                                  {dep.presente ? (
                                                    <>
                                                      <Check className="w-2.5 h-2.5 mr-0.5" />
                                                      Presente
                                                    </>
                                                  ) : (
                                                    <>
                                                      <XCircle className="w-2.5 h-2.5 mr-0.5" />
                                                      Ausente
                                                    </>
                                                  )}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Conteúdo do Depoente */}
                                        {temConteudo && (
                                          <div className="p-3 space-y-2.5 bg-white dark:bg-zinc-950">
                                            {/* Estratégia de Inquirição */}
                                            {dep.estrategiaInquiricao && (
                                              <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 p-2">
                                                <Label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1 mb-1">
                                                  <Target className="w-2.5 h-2.5" />
                                                  Estratégia de Inquirição
                                                </Label>
                                                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                                  {dep.estrategiaInquiricao}
                                                </p>
                                              </div>
                                            )}

                                            {/* Perguntas da Defesa */}
                                            {dep.perguntasDefesa && (
                                              <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 p-2">
                                                <Label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1 mb-1">
                                                  <BookOpen className="w-2.5 h-2.5" />
                                                  Perguntas da Defesa
                                                </Label>
                                                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                                  {dep.perguntasDefesa}
                                                </p>
                                              </div>
                                            )}

                                            {/* Depoimento Literal */}
                                            {dep.depoimentoLiteral && (
                                              <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50 p-2">
                                                <Label className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-1">
                                                  <Quote className="w-2.5 h-2.5" />
                                                  Depoimento Literal
                                                </Label>
                                                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                                                  &ldquo;{dep.depoimentoLiteral}&rdquo;
                                                </p>
                                              </div>
                                            )}

                                            {/* Análise e Percepções */}
                                            {dep.analisePercepcoes && (
                                              <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-lg border border-zinc-200/80 dark:border-zinc-800/80 p-2">
                                                <Label className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1 mb-1">
                                                  <Eye className="w-2.5 h-2.5" />
                                                  Análise e Percepções
                                                </Label>
                                                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                                  {dep.analisePercepcoes}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Manifestações */}
                            {(reg.manifestacaoMP || reg.manifestacaoDefesa || reg.decisaoJuiz) && (
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                  Manifestações e Decisões
                                </Label>
                                
                                {reg.manifestacaoMP && (
                                  <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                    <div className="border-l-4 border-rose-500 dark:border-rose-400 pl-3 -ml-2">
                                      <Label className="text-xs font-bold mb-1 block text-zinc-700 dark:text-zinc-300">
                                        Ministério Público
                                      </Label>
                                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                        {reg.manifestacaoMP}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {reg.manifestacaoDefesa && (
                                  <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                    <div className="border-l-4 border-emerald-500 dark:border-emerald-400 pl-3 -ml-2">
                                      <Label className="text-xs font-bold mb-1 block text-zinc-700 dark:text-zinc-300">
                                        Defesa
                                      </Label>
                                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                        {reg.manifestacaoDefesa}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {reg.decisaoJuiz && (
                                  <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                    <div className="border-l-4 border-blue-500 dark:border-blue-400 pl-3 -ml-2">
                                      <Label className="text-xs font-bold mb-1 block text-zinc-700 dark:text-zinc-300">
                                        Decisão Judicial
                                      </Label>
                                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                        {reg.decisaoJuiz}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Decisões Proferidas */}
                            {reg.decisoesProferidas && (
                              <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                <div className="border-l-4 border-blue-500 dark:border-blue-400 pl-3 -ml-2">
                                  <Label className="text-xs font-bold mb-1 block text-zinc-700 dark:text-zinc-300">
                                    Decisões Proferidas
                                  </Label>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                    {reg.decisoesProferidas}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Encaminhamentos */}
                            {reg.encaminhamentos && (
                              <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                <div className="border-l-4 border-zinc-400 dark:border-zinc-500 pl-3 -ml-2">
                                  <Label className="text-xs font-bold mb-1 block text-zinc-700 dark:text-zinc-300">
                                    Encaminhamentos
                                  </Label>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                    {reg.encaminhamentos}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Anotações Estratégicas */}
                            {(reg.atendimentoReuAntes || reg.estrategiasDefesa) && (
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                  Anotações Estratégicas
                                </Label>
                                
                                {reg.atendimentoReuAntes && (
                                  <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                    <div className="border-l-4 border-blue-500 dark:border-blue-400 pl-3 -ml-2">
                                      <Label className="text-xs font-bold mb-1 block text-zinc-700 dark:text-zinc-300">
                                        Atendimento Prévio
                                      </Label>
                                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                        {reg.atendimentoReuAntes}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {reg.estrategiasDefesa && (
                                  <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                    <div className="border-l-4 border-indigo-500 dark:border-indigo-400 pl-3 -ml-2">
                                      <Label className="text-xs font-bold mb-1 block text-zinc-700 dark:text-zinc-300">
                                        Estratégias de Defesa
                                      </Label>
                                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                        {reg.estrategiasDefesa}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Anotações Gerais */}
                            {reg.anotacoesGerais && (
                              <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 p-3">
                                <div className="border-l-4 border-zinc-400 dark:border-zinc-500 pl-3 -ml-2">
                                  <Label className="text-xs font-bold mb-1 block text-zinc-700 dark:text-zinc-300">
                                    Anotações Gerais
                                  </Label>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                    {reg.anotacoesGerais}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Footer do Card */}
                          <div className="bg-zinc-50 dark:bg-zinc-900/50 p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Registrado em {new Date(reg.dataRegistro).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded">
                              #{reg.historicoId.slice(-8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 md:p-3 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-2 flex-shrink-0">
          <div className="text-xs text-zinc-500">
            {registro.depoentes.length} depoente{registro.depoentes.length !== 1 ? "s" : ""}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none text-xs md:text-sm h-8 md:h-9">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} className={`${atribuicaoColor.btnPrimary} flex-1 sm:flex-none text-xs md:text-sm h-8 md:h-9`}>
              <Save className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              {registroSalvo ? "Atualizar Registro" : "Salvar Registro"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}