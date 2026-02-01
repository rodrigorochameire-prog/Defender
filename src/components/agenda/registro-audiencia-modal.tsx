import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
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
  Mic,
  FileStack,
  Shield,
  Trash2,
  UserCircle2,
  ChevronRight,
  BookOpen,
  Hash,
  Notebook,
} from "lucide-react";

export interface Depoente {
  id: string;
  nome: string;
  tipo: "testemunha" | "vitima" | "reu" | "perito" | "informante";
  intimado: boolean;
  presente: boolean;
  perguntasDefesa: string;
  resumoDepoimento: string;
}

export interface RegistroAudienciaData {
  eventoId: string;
  dataRealizacao: string;
  horaInicio: string;
  horaFim: string;
  localRealizado: string;
  realizada: boolean;
  motivoNaoRealizacao?: string;
  assistidoCompareceu: boolean;
  resultado: string;
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
}

interface RegistroAudienciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (registro: RegistroAudienciaData) => void;
  evento: any;
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
    bg: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30",
    border: "border-green-500 dark:border-green-600",
    text: "text-green-700 dark:text-green-300",
    icon: "text-green-600 dark:text-green-400",
    tabActive: "border-green-500 text-green-600 dark:text-green-400",
    btnPrimary: "bg-green-600 hover:bg-green-700",
  },
  "Violência Doméstica": {
    bg: "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
    border: "border-yellow-500 dark:border-yellow-600",
    text: "text-yellow-700 dark:text-yellow-300",
    icon: "text-yellow-600 dark:text-yellow-400",
    tabActive: "border-yellow-500 text-yellow-600 dark:text-yellow-400",
    btnPrimary: "bg-yellow-600 hover:bg-yellow-700",
  },
  "Execução Penal": {
    bg: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30",
    border: "border-orange-500 dark:border-orange-600",
    text: "text-orange-700 dark:text-orange-300",
    icon: "text-orange-600 dark:text-orange-400",
    tabActive: "border-orange-500 text-orange-600 dark:text-orange-400",
    btnPrimary: "bg-orange-600 hover:bg-orange-700",
  },
  "Criminal Geral": {
    bg: "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30",
    border: "border-red-500 dark:border-red-600",
    text: "text-red-700 dark:text-red-300",
    icon: "text-red-600 dark:text-red-400",
    tabActive: "border-red-500 text-red-600 dark:text-red-400",
    btnPrimary: "bg-red-600 hover:bg-red-700",
  },
  "Substituição": {
    bg: "bg-gradient-to-br from-gray-50 to-zinc-50 dark:from-gray-950/30 dark:to-zinc-950/30",
    border: "border-gray-500 dark:border-gray-600",
    text: "text-gray-700 dark:text-gray-300",
    icon: "text-gray-600 dark:text-gray-400",
    tabActive: "border-gray-500 text-gray-600 dark:text-gray-400",
    btnPrimary: "bg-gray-600 hover:bg-gray-700",
  },
  "Curadoria": {
    bg: "bg-gradient-to-br from-slate-50 to-zinc-50 dark:from-slate-950/30 dark:to-zinc-950/30",
    border: "border-slate-500 dark:border-slate-600",
    text: "text-slate-700 dark:text-slate-300",
    icon: "text-slate-600 dark:text-slate-400",
    tabActive: "border-slate-500 text-slate-600 dark:text-slate-400",
    btnPrimary: "bg-slate-600 hover:bg-slate-700",
  },
};

const resultadoOptions = [
  { value: "conclusa", label: "Conclusa", icon: Clock },
  { value: "continuacao", label: "Continuação", icon: ChevronRight },
  { value: "adiada", label: "Adiada", icon: Calendar },
  { value: "acordo", label: "Acordo", icon: CheckCircle2 },
  { value: "absolvicao", label: "Absolvição", icon: Scale },
  { value: "condenacao", label: "Condenação", icon: Gavel },
  { value: "pronuncia", label: "Pronúncia", icon: FileStack },
  { value: "impronuncia", label: "Impronúncia", icon: Shield },
];

const motivoNaoRealizacaoOptions = [
  { value: "ausencia-reu", label: "Ausência do Réu", icon: UserX },
  { value: "ausencia-testemunha", label: "Ausência de Testemunha", icon: Users },
  { value: "ausencia-promotor", label: "Ausência do Promotor", icon: UserCircle2 },
  { value: "ausencia-juiz", label: "Ausência do Juiz", icon: Gavel },
  { value: "problemas-tecnicos", label: "Problemas Técnicos", icon: AlertTriangle },
  { value: "outros", label: "Outros", icon: FileText },
];

const tipoDepoenteOptions = [
  { value: "testemunha", label: "Testemunha", color: "red" },
  { value: "vitima", label: "Vítima", color: "purple" },
  { value: "reu", label: "Réu/Acusado", color: "orange" },
  { value: "perito", label: "Perito/Técnico", color: "cyan" },
  { value: "informante", label: "Informante", color: "gray" },
];

export function RegistroAudienciaModal({ isOpen, onClose, onSave, evento }: RegistroAudienciaModalProps) {
  const [registro, setRegistro] = useState<RegistroAudienciaData>({
    eventoId: evento.id,
    dataRealizacao: new Date().toISOString().split("T")[0],
    horaInicio: evento.horarioInicio || "",
    horaFim: "",
    localRealizado: evento.local || "",
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

  const [activeTab, setActiveTab] = useState<"geral" | "depoentes" | "manifestacoes" | "anotacoes">("geral");
  const [editandoDepoente, setEditandoDepoente] = useState<Depoente | null>(null);
  const [novoDepoenteNome, setNovoDepoenteNome] = useState("");
  const [novoDepoenteTipo, setNovoDepoenteTipo] = useState<Depoente["tipo"]>("testemunha");

  const atribuicaoColor = atribuicaoColors[evento.atribuicao] || atribuicaoColors["Criminal Geral"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registro.dataRealizacao) {
      toast.error("Data de realização é obrigatória");
      return;
    }
    if (registro.realizada && !registro.resultado) {
      toast.error("Resultado da audiência é obrigatório");
      return;
    }
    if (!registro.realizada && !registro.motivoNaoRealizacao) {
      toast.error("Motivo da não realização é obrigatório");
      return;
    }
    onSave(registro);
    toast.success("Registro salvo com sucesso!");
    onClose();
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
      perguntasDefesa: "",
      resumoDepoimento: "",
    };
    setRegistro({ ...registro, depoentes: [...registro.depoentes, novoDepoente] });
    setNovoDepoenteNome("");
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

  const handleAddPergunta = (depoenteId: string, autor: "defesa" | "acusacao" | "juiz") => {
    const depoente = registro.depoentes.find((d) => d.id === depoenteId);
    if (!depoente) return;
    const novaPergunta = { id: `prg-${Date.now()}`, texto: "", autor };
    const depoenteAtualizado = { ...depoente, perguntas: [...depoente.perguntas, novaPergunta] };
    handleUpdateDepoente(depoenteAtualizado);
    setEditandoDepoente(depoenteAtualizado);
  };

  const handleUpdatePergunta = (depoenteId: string, perguntaId: string, texto: string) => {
    const depoente = registro.depoentes.find((d) => d.id === depoenteId);
    if (!depoente) return;
    const depoenteAtualizado = {
      ...depoente,
      perguntas: depoente.perguntas.map((p) => (p.id === perguntaId ? { ...p, texto } : p)),
    };
    handleUpdateDepoente(depoenteAtualizado);
    setEditandoDepoente(depoenteAtualizado);
  };

  const handleRemovePergunta = (depoenteId: string, perguntaId: string) => {
    const depoente = registro.depoentes.find((d) => d.id === depoenteId);
    if (!depoente) return;
    const depoenteAtualizado = {
      ...depoente,
      perguntas: depoente.perguntas.filter((p) => p.id !== perguntaId),
    };
    handleUpdateDepoente(depoenteAtualizado);
    setEditandoDepoente(depoenteAtualizado);
  };

  const getDepoenteColor = (tipo: Depoente["tipo"]) => {
    return tipoDepoenteOptions.find((opt) => opt.value === tipo)?.color || "gray";
  };

  const calcularDuracao = (inicio?: string, fim?: string) => {
    if (!inicio || !fim) return null;
    const [hI, mI] = inicio.split(":").map(Number);
    const [hF, mF] = fim.split(":").map(Number);
    const minutos = (hF * 60 + mF) - (hI * 60 + mI);
    if (minutos <= 0) return null;
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h > 0 ? `${h}h${m}min` : `${m}min`;
  };

  const getResumoDepoentes = () => {
    const total = registro.depoentes.length;
    const compareceram = registro.depoentes.filter(d => d.compareceu).length;
    const favoraveis = registro.depoentes.filter(d => d.avaliacao === "favoravel").length;
    const desfavoraveis = registro.depoentes.filter(d => d.avaliacao === "desfavoravel").length;
    return { total, compareceram, favoraveis, desfavoraveis };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[98vh] flex flex-col overflow-hidden bg-white dark:bg-zinc-950 p-0 gap-0">
        <DialogTitle className="sr-only">Registro de Audiência Judicial</DialogTitle>
        <DialogDescription className="sr-only">
          Sistema completo para registro de audiências com gestão de depoentes, perguntas e manifestações.
        </DialogDescription>

        {/* Header */}
        <div className={`${atribuicaoColor.bg} ${atribuicaoColor.border} border-l-4 p-4 flex items-center justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${atribuicaoColor.bg} border-2 ${atribuicaoColor.border} flex items-center justify-center`}>
              <Gavel className={`w-5 h-5 ${atribuicaoColor.icon}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{evento.titulo}</h2>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {evento.assistido}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {new Date(evento.data).toLocaleDateString("pt-BR")} • {evento.horarioInicio}
                {evento.processo && ` • ${evento.processo}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-lg bg-white/50 dark:bg-zinc-900/50 flex items-center justify-center hover:bg-white/80 transition-all">
            <X className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex-shrink-0">
          <div className="flex gap-0 px-4">
            {[
              { key: "geral", label: "Geral", icon: FileText },
              { key: "depoentes", label: "Depoentes", icon: Users, count: registro.depoentes.length },
              { key: "anotacoes", label: "Anotações", icon: Notebook },
              { key: "manifestacoes", label: "Manifestações", icon: MessageSquare },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-3 py-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                    activeTab === tab.key
                      ? `${atribuicaoColor.tabActive} bg-white dark:bg-zinc-950`
                      : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <Badge className={`ml-1 ${activeTab === tab.key ? atribuicaoColor.bg : "bg-zinc-100 dark:bg-zinc-800"} ${atribuicaoColor.text}`}>
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
          <form onSubmit={handleSubmit} className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === "geral" && (
                <motion.div key="geral" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3 max-w-5xl mx-auto">
                  <Card className="p-3">
                    <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Status da Audiência
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setRegistro({ ...registro, realizada: true })} className={`p-3 rounded-xl border-2 transition-all ${registro.realizada ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
                        <CheckCircle2 className={`w-6 h-6 mx-auto mb-1 ${registro.realizada ? "text-emerald-600" : "text-zinc-400"}`} />
                        <p className="font-semibold text-sm text-center">Realizada</p>
                      </button>
                      <button type="button" onClick={() => setRegistro({ ...registro, realizada: false })} className={`p-3 rounded-xl border-2 transition-all ${!registro.realizada ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30" : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"}`}>
                        <AlertTriangle className={`w-6 h-6 mx-auto mb-1 ${!registro.realizada ? "text-orange-600" : "text-zinc-400"}`} />
                        <p className="font-semibold text-sm text-center">Não Realizada</p>
                      </button>
                    </div>
                  </Card>

                  <Card className="p-3">
                    <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Dados da Realização
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Início</Label>
                        <Input type="time" value={registro.horaInicio} onChange={(e) => setRegistro({ ...registro, horaInicio: e.target.value })} className="text-sm h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Término</Label>
                        <Input type="time" value={registro.horaFim} onChange={(e) => setRegistro({ ...registro, horaFim: e.target.value })} className="text-sm h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Local</Label>
                        <Input value={registro.localRealizado} onChange={(e) => setRegistro({ ...registro, localRealizado: e.target.value })} placeholder="Sala 201" className="text-sm h-9" />
                      </div>
                    </div>
                  </Card>

                  {!registro.realizada ? (
                    <Card className="p-3 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                      <Label className="text-sm font-bold mb-2 block">Motivo da Não Realização *</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {motivoNaoRealizacaoOptions.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <button key={opt.value} type="button" onClick={() => setRegistro({ ...registro, motivoNaoRealizacao: opt.value })} className={`p-2.5 rounded-lg border-2 text-left transition-all ${registro.motivoNaoRealizacao === opt.value ? "border-orange-500 bg-orange-100 dark:bg-orange-900/50" : "border-orange-200 dark:border-orange-800 bg-white dark:bg-zinc-900"}`}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                <span className="text-xs font-semibold">{opt.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  ) : (
                    <>
                      <Card className="p-3">
                        <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                          <UserCheck className="w-4 h-4" />
                          Comparecimento do Assistido
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => setRegistro({ ...registro, assistidoCompareceu: true })} className={`p-2.5 rounded-lg border-2 ${registro.assistidoCompareceu ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-zinc-200 dark:border-zinc-800"}`}>
                            <UserCheck className={`w-5 h-5 mx-auto mb-1 ${registro.assistidoCompareceu ? "text-emerald-600" : "text-zinc-400"}`} />
                            <p className="text-xs font-semibold text-center">Presente</p>
                          </button>
                          <button type="button" onClick={() => setRegistro({ ...registro, assistidoCompareceu: false })} className={`p-2.5 rounded-lg border-2 ${!registro.assistidoCompareceu ? "border-red-500 bg-red-50 dark:bg-red-950/30" : "border-zinc-200 dark:border-zinc-800"}`}>
                            <UserX className={`w-5 h-5 mx-auto mb-1 ${!registro.assistidoCompareceu ? "text-red-600" : "text-zinc-400"}`} />
                            <p className="text-xs font-semibold text-center">Ausente</p>
                          </button>
                        </div>
                      </Card>

                      <Card className="p-3">
                        <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                          <Scale className="w-4 h-4" />
                          Resultado *
                        </Label>
                        <div className="grid grid-cols-4 gap-2">
                          {resultadoOptions.map((opt) => {
                            const Icon = opt.icon;
                            return (
                              <button key={opt.value} type="button" onClick={() => setRegistro({ ...registro, resultado: opt.value })} className={`p-2.5 rounded-lg border-2 transition-all ${registro.resultado === opt.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "border-zinc-200 dark:border-zinc-800"}`}>
                                <Icon className={`w-5 h-5 mx-auto mb-1 ${registro.resultado === opt.value ? "text-indigo-600" : "text-zinc-400"}`} />
                                <p className="text-xs font-semibold text-center">{opt.label}</p>
                              </button>
                            );
                          })}
                        </div>
                      </Card>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "depoentes" && (
                <motion.div key="depoentes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-12 gap-4 h-full">
                  <div className="col-span-4 space-y-3">
                    <Card className="p-4">
                      <Label className="text-sm font-bold mb-3 block flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Adicionar Depoente
                      </Label>
                      <div className="space-y-2">
                        <Input value={novoDepoenteNome} onChange={(e) => setNovoDepoenteNome(e.target.value)} placeholder="Nome do depoente" className="text-sm" onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDepoente())} />
                        <select value={novoDepoenteTipo} onChange={(e) => setNovoDepoenteTipo(e.target.value as Depoente["tipo"])} className="w-full p-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900">
                          {tipoDepoenteOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <Button type="button" onClick={handleAddDepoente} className="w-full" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar
                        </Button>
                      </div>
                    </Card>

                    <div className="space-y-2">
                      {registro.depoentes.map((depoente) => {
                        const color = getDepoenteColor(depoente.tipo);
                        const isActive = editandoDepoente?.id === depoente.id;
                        return (
                          <Card key={depoente.id} className={`p-3 cursor-pointer transition-all ${isActive ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950/30` : "hover:bg-zinc-50 dark:hover:bg-zinc-900"}`} onClick={() => setEditandoDepoente(depoente)}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{depoente.nome}</p>
                                <p className={`text-xs text-${color}-600 dark:text-${color}-400`}>{tipoDepoenteOptions.find((t) => t.value === depoente.tipo)?.label}</p>
                                {depoente.perguntas.length > 0 && (
                                  <p className="text-xs text-zinc-500 mt-1">
                                    <Hash className="w-3 h-3 inline mr-1" />
                                    {depoente.perguntas.length} perguntas
                                  </p>
                                )}
                              </div>
                              <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveDepoente(depoente.id); }} className="text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </Card>
                        );
                      })}
                      {registro.depoentes.length === 0 && (
                        <Card className="p-8 text-center">
                          <Users className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
                          <p className="text-sm text-zinc-500">Nenhum depoente cadastrado</p>
                        </Card>
                      )}
                    </div>
                  </div>

                  <div className="col-span-8">
                    {editandoDepoente ? (
                      <div className="space-y-4">
                        <Card className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-bold text-lg">{editandoDepoente.nome}</h3>
                              <p className={`text-sm text-${getDepoenteColor(editandoDepoente.tipo)}-600`}>{tipoDepoenteOptions.find((t) => t.value === editandoDepoente.tipo)?.label}</p>
                            </div>
                            <Badge className={editandoDepoente.compareceu ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{editandoDepoente.compareceu ? "Presente" : "Ausente"}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label className="text-xs">Hora Início</Label>
                              <Input type="time" value={editandoDepoente.horaInicio || ""} onChange={(e) => handleUpdateDepoente({ ...editandoDepoente, horaInicio: e.target.value })} className="text-sm" />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Hora Fim</Label>
                              <Input type="time" value={editandoDepoente.horaFim || ""} onChange={(e) => handleUpdateDepoente({ ...editandoDepoente, horaFim: e.target.value })} className="text-sm" />
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm font-bold flex items-center gap-2">
                              <Mic className="w-4 h-4" />
                              Perguntas ({editandoDepoente.perguntas.length})
                            </Label>
                            <div className="flex gap-1">
                              <Button type="button" size="sm" variant="outline" onClick={() => handleAddPergunta(editandoDepoente.id, "defesa")} className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Defesa
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => handleAddPergunta(editandoDepoente.id, "acusacao")} className="text-xs">
                                <Gavel className="w-3 h-3 mr-1" />
                                Acusação
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => handleAddPergunta(editandoDepoente.id, "juiz")} className="text-xs">
                                <Scale className="w-3 h-3 mr-1" />
                                Juiz
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {editandoDepoente.perguntas.map((pergunta, index) => (
                              <div key={pergunta.id} className={`p-3 rounded-lg border-l-4 ${pergunta.autor === "defesa" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : pergunta.autor === "acusacao" ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-purple-500 bg-purple-50 dark:bg-purple-950/20"}`}>
                                <div className="flex items-start gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge className="text-xs">{pergunta.autor === "defesa" ? "Defesa" : pergunta.autor === "acusacao" ? "Acusação" : "Juiz"}</Badge>
                                      <span className="text-xs text-zinc-500">#{index + 1}</span>
                                    </div>
                                    <Textarea value={pergunta.texto} onChange={(e) => handleUpdatePergunta(editandoDepoente.id, pergunta.id, e.target.value)} placeholder="Digite a pergunta..." rows={2} className="text-sm" />
                                  </div>
                                  <button type="button" onClick={() => handleRemovePergunta(editandoDepoente.id, pergunta.id)} className="text-red-600 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {editandoDepoente.perguntas.length === 0 && <p className="text-sm text-zinc-500 text-center py-8">Nenhuma pergunta registrada</p>}
                          </div>
                        </Card>

                        <Card className="p-4">
                          <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Anotações do Depoimento
                          </Label>
                          <Textarea value={editandoDepoente.anotacoes} onChange={(e) => handleUpdateDepoente({ ...editandoDepoente, anotacoes: e.target.value })} placeholder="Registre pontos importantes do depoimento..." rows={4} className="text-sm" />
                        </Card>
                      </div>
                    ) : (
                      <Card className="p-12 text-center h-full flex items-center justify-center">
                        <div>
                          <Users className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
                          <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Selecione um depoente</p>
                          <p className="text-sm text-zinc-500">Clique em um depoente à esquerda para gerenciar perguntas e anotações</p>
                        </div>
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "manifestacoes" && (
                <motion.div key="manifestacoes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3 max-w-4xl mx-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-4">
                      <Label className="text-sm font-bold mb-1 block flex items-center gap-2">
                        <Scale className="w-4 h-4" />
                        Manifestação do MP
                      </Label>
                      <Textarea value={registro.manifestacaoMP} onChange={(e) => setRegistro({ ...registro, manifestacaoMP: e.target.value })} placeholder="Posicionamento do Ministério Público..." rows={9} className="text-sm" />
                    </Card>

                    <Card className="p-4">
                      <Label className="text-sm font-bold mb-1 block flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Manifestação da Defesa
                      </Label>
                      <Textarea value={registro.manifestacaoDefesa} onChange={(e) => setRegistro({ ...registro, manifestacaoDefesa: e.target.value })} placeholder="Manifestação apresentada pela defesa..." rows={9} className="text-sm" />
                    </Card>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-4">
                      <Label className="text-sm font-bold mb-1 block flex items-center gap-2">
                        <Gavel className="w-4 h-4" />
                        Decisões do Juiz
                      </Label>
                      <Textarea value={registro.decisaoJuiz} onChange={(e) => setRegistro({ ...registro, decisaoJuiz: e.target.value })} placeholder="Decisões proferidas pelo juiz..." rows={9} className="text-sm" />
                    </Card>

                    <Card className="p-4">
                      <Label className="text-sm font-bold mb-1 block flex items-center gap-2">
                        <ChevronRight className="w-4 h-4" />
                        Encaminhamentos
                      </Label>
                      <Textarea value={registro.encaminhamentos} onChange={(e) => setRegistro({ ...registro, encaminhamentos: e.target.value })} placeholder="Próximos passos e encaminhamentos..." rows={9} className="text-sm" />
                    </Card>
                  </div>
                </motion.div>
              )}

              {activeTab === "anotacoes" && (
                <motion.div key="anotacoes" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-3 max-w-4xl mx-auto">
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-4">
                      <Label className="text-sm font-bold mb-1 block flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Atendimento Prévio
                      </Label>
                      <Textarea value={registro.atendimentoReuAntes} onChange={(e) => setRegistro({ ...registro, atendimentoReuAntes: e.target.value })} placeholder="Pontos abordados no atendimento prévio..." rows={6} className="text-sm" />
                    </Card>

                    <Card className="p-4">
                      <Label className="text-sm font-bold mb-1 block flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Estratégias de Defesa
                      </Label>
                      <Textarea value={registro.estrategiasDefesa} onChange={(e) => setRegistro({ ...registro, estrategiasDefesa: e.target.value })} placeholder="Estratégias apresentadas pela defesa..." rows={6} className="text-sm" />
                    </Card>
                  </div>

                  <Card className="p-4">
                    <Label className="text-sm font-bold mb-1 block flex items-center gap-2">
                      <Notebook className="w-4 h-4" />
                      Anotações Gerais da Audiência
                    </Label>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">Registre observações importantes, estratégias, ocorrências relevantes ou qualquer informação que precise documentar sobre esta audiência.</p>
                    <Textarea value={registro.anotacoesGerais} onChange={(e) => setRegistro({ ...registro, anotacoesGerais: e.target.value })} placeholder="• Observações importantes&#10;• Estratégias a serem adotadas&#10;• Comportamento das partes&#10;• Próximos passos&#10;• Pontos de atenção...&#10;• Impressões gerais..." rows={12} className="text-sm font-mono" />
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-zinc-500">
            {registro.depoentes.length} depoente{registro.depoentes.length !== 1 ? "s" : ""} • {registro.depoentes.reduce((acc, d) => acc + d.perguntas.length, 0)} pergunta{registro.depoentes.reduce((acc, d) => acc + d.perguntas.length, 0) !== 1 ? "s" : ""}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className={atribuicaoColor.btnPrimary}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Registro
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}