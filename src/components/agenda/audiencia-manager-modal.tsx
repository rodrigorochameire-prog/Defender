import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Eye,
  Shield,
  UserCheck,
  UserX,
  Bell,
  BellOff,
  Play,
  Pause,
  Save,
  ChevronRight,
  Calendar,
  MapPin,
  Gavel,
  Timer,
  StickyNote,
  Hash,
} from "lucide-react";

interface Testemunha {
  id: string;
  nome: string;
  tipo: "acusacao" | "defesa";
  categoria: "ocular" | "conduta" | "tecnica" | "informante";
  intimada: boolean;
  compareceu: boolean | null;
  horarioOitiva: string;
  observacoes: string;
  documentos: string[];
}

interface AnotacaoAudiencia {
  id: string;
  timestamp: string;
  tipo: "observacao" | "alegacao" | "decisao" | "importante";
  conteudo: string;
}

interface AudienciaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  evento: any;
  onSave: (data: any) => void;
}

export function AudienciaManagerModal({
  isOpen,
  onClose,
  evento,
  onSave,
}: AudienciaManagerModalProps) {
  const [activeTab, setActiveTab] = useState("geral");
  const [testemunhas, setTestemunhas] = useState<Testemunha[]>([
    {
      id: "t1",
      nome: "Maria Silva Santos",
      tipo: "acusacao",
      categoria: "ocular",
      intimada: true,
      compareceu: true,
      horarioOitiva: "09:15",
      observacoes: "Presenciou o ocorrido. Relato consistente.",
      documentos: [],
    },
    {
      id: "t2",
      nome: "João Pedro Oliveira",
      tipo: "defesa",
      categoria: "conduta",
      intimada: true,
      compareceu: false,
      horarioOitiva: "10:00",
      observacoes: "Não compareceu. Será intimada novamente.",
      documentos: [],
    },
  ]);

  const [anotacoes, setAnotacoes] = useState<AnotacaoAudiencia[]>([
    {
      id: "a1",
      timestamp: "09:00",
      tipo: "observacao",
      conteudo: "Audiência iniciada no horário. Todas as partes presentes.",
    },
    {
      id: "a2",
      timestamp: "09:15",
      tipo: "alegacao",
      conteudo: "Promotoria requereu a oitiva de testemunha adicional.",
    },
  ]);

  const [dadosAudiencia, setDadosAudiencia] = useState({
    resultado: evento?.resultado || "",
    proximaAudiencia: evento?.proximaAudiencia || "",
    horarioInicio: evento?.horarioInicio || "",
    horarioFim: evento?.horarioFim || "",
    juizPresidente: evento?.juizPresidente || "",
    promotor: evento?.promotor || "",
    observacoesGerais: evento?.observacoesGerais || "",
    decisao: evento?.decisao || "",
  });

  const [novaTestemunha, setNovaTestemunha] = useState<Partial<Testemunha>>({
    nome: "",
    tipo: "defesa",
    categoria: "ocular",
    intimada: false,
    compareceu: null,
    horarioOitiva: "",
    observacoes: "",
  });

  const [novaAnotacao, setNovaAnotacao] = useState({
    tipo: "observacao" as const,
    conteudo: "",
  });

  const [cronometro, setCronometro] = useState({
    iniciado: false,
    tempo: 0,
  });

  const adicionarTestemunha = () => {
    if (!novaTestemunha.nome) {
      toast.error("Digite o nome da testemunha");
      return;
    }

    const testemunha: Testemunha = {
      id: `t${Date.now()}`,
      nome: novaTestemunha.nome,
      tipo: novaTestemunha.tipo || "defesa",
      categoria: novaTestemunha.categoria || "ocular",
      intimada: novaTestemunha.intimada || false,
      compareceu: null,
      horarioOitiva: novaTestemunha.horarioOitiva || "",
      observacoes: novaTestemunha.observacoes || "",
      documentos: [],
    };

    setTestemunhas([...testemunhas, testemunha]);
    setNovaTestemunha({
      nome: "",
      tipo: "defesa",
      categoria: "ocular",
      intimada: false,
      compareceu: null,
      horarioOitiva: "",
      observacoes: "",
    });
    toast.success("Testemunha adicionada!");
  };

  const removerTestemunha = (id: string) => {
    setTestemunhas(testemunhas.filter((t) => t.id !== id));
    toast.success("Testemunha removida");
  };

  const toggleComparecimento = (id: string) => {
    setTestemunhas(
      testemunhas.map((t) =>
        t.id === id
          ? { ...t, compareceu: t.compareceu === null ? true : t.compareceu ? false : null }
          : t
      )
    );
  };

  const adicionarAnotacao = () => {
    if (!novaAnotacao.conteudo) {
      toast.error("Digite o conteúdo da anotação");
      return;
    }

    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    const anotacao: AnotacaoAudiencia = {
      id: `a${Date.now()}`,
      timestamp,
      tipo: novaAnotacao.tipo,
      conteudo: novaAnotacao.conteudo,
    };

    setAnotacoes([...anotacoes, anotacao]);
    setNovaAnotacao({ tipo: "observacao", conteudo: "" });
    toast.success("Anotação adicionada!");
  };

  const handleSave = () => {
    onSave({
      ...evento,
      ...dadosAudiencia,
      testemunhas,
      anotacoes,
    });
    toast.success("Audiência salva com sucesso!");
    onClose();
  };

  const categoriasTestemunha = {
    ocular: { label: "Testemunha Ocular", icon: Eye, color: "blue" },
    conduta: { label: "Testemunha de Conduta", icon: Shield, color: "green" },
    tecnica: { label: "Testemunha Técnica", icon: FileText, color: "purple" },
    informante: { label: "Informante", icon: AlertCircle, color: "orange" },
  };

  const tiposAnotacao = {
    observacao: { label: "Observação", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" },
    alegacao: { label: "Alegação", color: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300" },
    decisao: { label: "Decisão", color: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-300" },
    importante: { label: "Importante", color: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300" },
  };

  const statsTestemunhas = {
    total: testemunhas.length,
    intimadas: testemunhas.filter((t) => t.intimada).length,
    compareceram: testemunhas.filter((t) => t.compareceu === true).length,
    naoCompareceram: testemunhas.filter((t) => t.compareceu === false).length,
    acusacao: testemunhas.filter((t) => t.tipo === "acusacao").length,
    defesa: testemunhas.filter((t) => t.tipo === "defesa").length,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 p-0">
        {/* Header Premium */}
        <div className="bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Gavel className="w-7 h-7" />
              </div>
              Gestão de Audiência
            </DialogTitle>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Data
                </div>
                <div className="font-semibold">
                  {new Date(evento?.data).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  Horário
                </div>
                <div className="font-semibold">{evento?.horarioInicio}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Local
                </div>
                <div className="font-semibold text-sm truncate">{evento?.local}</div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-4 bg-zinc-100 dark:bg-zinc-800 p-1">
              <TabsTrigger value="geral" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="testemunhas" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Testemunhas
                <Badge className="ml-1 bg-blue-600 text-white">{testemunhas.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="anotacoes" className="flex items-center gap-2">
                <StickyNote className="w-4 h-4" />
                Anotações
                <Badge className="ml-1 bg-purple-600 text-white">{anotacoes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cronologia" className="flex items-center gap-2">
                <Timer className="w-4 h-4" />
                Cronologia
              </TabsTrigger>
            </TabsList>

            {/* Tab: Geral */}
            <TabsContent value="geral" className="space-y-6 mt-6">
              <Card className="p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-lg">
                <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-yellow-600" />
                  Informações da Audiência
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Juiz(a) Presidente
                    </Label>
                    <Input
                      value={dadosAudiencia.juizPresidente}
                      onChange={(e) =>
                        setDadosAudiencia({ ...dadosAudiencia, juizPresidente: e.target.value })
                      }
                      placeholder="Nome do(a) Juiz(a)"
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Promotor(a) de Justiça
                    </Label>
                    <Input
                      value={dadosAudiencia.promotor}
                      onChange={(e) =>
                        setDadosAudiencia({ ...dadosAudiencia, promotor: e.target.value })
                      }
                      placeholder="Nome do(a) Promotor(a)"
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Horário de Início
                    </Label>
                    <Input
                      type="time"
                      value={dadosAudiencia.horarioInicio}
                      onChange={(e) =>
                        setDadosAudiencia({ ...dadosAudiencia, horarioInicio: e.target.value })
                      }
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Horário de Término
                    </Label>
                    <Input
                      type="time"
                      value={dadosAudiencia.horarioFim}
                      onChange={(e) =>
                        setDadosAudiencia({ ...dadosAudiencia, horarioFim: e.target.value })
                      }
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Resultado da Audiência
                  </Label>
                  <select
                    value={dadosAudiencia.resultado}
                    onChange={(e) =>
                      setDadosAudiencia({ ...dadosAudiencia, resultado: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                  >
                    <option value="">Selecione...</option>
                    <option value="realizada">Realizada com êxito</option>
                    <option value="adiada">Adiada</option>
                    <option value="cancelada">Cancelada</option>
                    <option value="convertida">Convertida em diligências</option>
                    <option value="parcial">Parcialmente realizada</option>
                  </select>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Decisão / Sentença
                  </Label>
                  <Textarea
                    value={dadosAudiencia.decisao}
                    onChange={(e) =>
                      setDadosAudiencia({ ...dadosAudiencia, decisao: e.target.value })
                    }
                    placeholder="Registre a decisão proferida pelo(a) Juiz(a)..."
                    rows={4}
                    className="bg-white dark:bg-zinc-900"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Observações Gerais
                  </Label>
                  <Textarea
                    value={dadosAudiencia.observacoesGerais}
                    onChange={(e) =>
                      setDadosAudiencia({
                        ...dadosAudiencia,
                        observacoesGerais: e.target.value,
                      })
                    }
                    placeholder="Observações importantes sobre a audiência..."
                    rows={4}
                    className="bg-white dark:bg-zinc-900"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Próxima Audiência
                  </Label>
                  <Input
                    type="date"
                    value={dadosAudiencia.proximaAudiencia}
                    onChange={(e) =>
                      setDadosAudiencia({
                        ...dadosAudiencia,
                        proximaAudiencia: e.target.value,
                      })
                    }
                    className="bg-white dark:bg-zinc-900"
                  />
                </div>
              </Card>
            </TabsContent>

            {/* Tab: Testemunhas */}
            <TabsContent value="testemunhas" className="space-y-6 mt-6">
              {/* Estatísticas */}
              <div className="grid grid-cols-6 gap-3">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
                  <div className="text-xs text-blue-700 dark:text-blue-300 mb-1">Total</div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {statsTestemunhas.total}
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
                  <div className="text-xs text-green-700 dark:text-green-300 mb-1">Intimadas</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {statsTestemunhas.intimadas}
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">
                    Compareceram
                  </div>
                  <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                    {statsTestemunhas.compareceram}
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border-red-200 dark:border-red-800">
                  <div className="text-xs text-red-700 dark:text-red-300 mb-1">Ausentes</div>
                  <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                    {statsTestemunhas.naoCompareceram}
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
                  <div className="text-xs text-purple-700 dark:text-purple-300 mb-1">Acusação</div>
                  <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {statsTestemunhas.acusacao}
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 border-indigo-200 dark:border-indigo-800">
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 mb-1">Defesa</div>
                  <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                    {statsTestemunhas.defesa}
                  </div>
                </Card>
              </div>

              {/* Adicionar Testemunha */}
              <Card className="p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-600" />
                  Adicionar Testemunha
                </h3>

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Nome Completo
                    </Label>
                    <Input
                      value={novaTestemunha.nome}
                      onChange={(e) =>
                        setNovaTestemunha({ ...novaTestemunha, nome: e.target.value })
                      }
                      placeholder="Digite o nome da testemunha"
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Tipo
                    </Label>
                    <select
                      value={novaTestemunha.tipo}
                      onChange={(e) =>
                        setNovaTestemunha({
                          ...novaTestemunha,
                          tipo: e.target.value as "acusacao" | "defesa",
                        })
                      }
                      className="w-full h-10 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                    >
                      <option value="defesa">Defesa</option>
                      <option value="acusacao">Acusação</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Categoria
                    </Label>
                    <select
                      value={novaTestemunha.categoria}
                      onChange={(e) =>
                        setNovaTestemunha({
                          ...novaTestemunha,
                          categoria: e.target.value as any,
                        })
                      }
                      className="w-full h-10 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                    >
                      <option value="ocular">Ocular</option>
                      <option value="conduta">Conduta</option>
                      <option value="tecnica">Técnica</option>
                      <option value="informante">Informante</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Horário Oitiva
                    </Label>
                    <Input
                      type="time"
                      value={novaTestemunha.horarioOitiva}
                      onChange={(e) =>
                        setNovaTestemunha({
                          ...novaTestemunha,
                          horarioOitiva: e.target.value,
                        })
                      }
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Observações
                    </Label>
                    <Input
                      value={novaTestemunha.observacoes}
                      onChange={(e) =>
                        setNovaTestemunha({
                          ...novaTestemunha,
                          observacoes: e.target.value,
                        })
                      }
                      placeholder="Observações sobre a testemunha"
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={novaTestemunha.intimada}
                        onChange={(e) =>
                          setNovaTestemunha({
                            ...novaTestemunha,
                            intimada: e.target.checked,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        Foi intimada
                      </span>
                    </label>
                  </div>

                  <div className="flex items-end">
                    <Button onClick={adicionarTestemunha} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Lista de Testemunhas */}
              <div className="space-y-3">
                {testemunhas.map((testemunha) => {
                  const categoria = categoriasTestemunha[testemunha.categoria];
                  const IconeCategoria = categoria.icon;

                  return (
                    <Card
                      key={testemunha.id}
                      className="p-4 border-2 border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-${categoria.color}-100 dark:bg-${categoria.color}-950/30`}
                        >
                          <IconeCategoria
                            className={`w-7 h-7 text-${categoria.color}-600 dark:text-${categoria.color}-400`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">
                                {testemunha.nome}
                              </h4>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <Badge
                                  className={
                                    testemunha.tipo === "acusacao"
                                      ? "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                                  }
                                >
                                  {testemunha.tipo === "acusacao" ? "Acusação" : "Defesa"}
                                </Badge>
                                <Badge variant="outline">{categoria.label}</Badge>
                              </div>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removerTestemunha(testemunha.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-4 gap-3 mt-3">
                            <div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                Intimação
                              </div>
                              <div className="flex items-center gap-2">
                                {testemunha.intimada ? (
                                  <>
                                    <Bell className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                                      Intimada
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <BellOff className="w-4 h-4 text-zinc-400" />
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                      Não intimada
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                Comparecimento
                              </div>
                              <button
                                onClick={() => toggleComparecimento(testemunha.id)}
                                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                              >
                                {testemunha.compareceu === true ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                      Compareceu
                                    </span>
                                  </>
                                ) : testemunha.compareceu === false ? (
                                  <>
                                    <XCircle className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                                      Ausente
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-4 h-4 text-zinc-400" />
                                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                                      Pendente
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>

                            {testemunha.horarioOitiva && (
                              <div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                  Horário Oitiva
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                    {testemunha.horarioOitiva}
                                  </span>
                                </div>
                              </div>
                            )}

                            {testemunha.observacoes && (
                              <div className="col-span-4">
                                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                  Observações
                                </div>
                                <p className="text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900 p-2 rounded">
                                  {testemunha.observacoes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Tab: Anotações */}
            <TabsContent value="anotacoes" className="space-y-6 mt-6">
              {/* Adicionar Anotação */}
              <Card className="p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-purple-600" />
                  Nova Anotação
                </h3>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Tipo
                    </Label>
                    <div className="flex gap-2">
                      {Object.entries(tiposAnotacao).map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => setNovaAnotacao({ ...novaAnotacao, tipo: key as any })}
                          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                            novaAnotacao.tipo === key
                              ? value.color
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          }`}
                        >
                          {value.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      Conteúdo
                    </Label>
                    <Textarea
                      value={novaAnotacao.conteudo}
                      onChange={(e) =>
                        setNovaAnotacao({ ...novaAnotacao, conteudo: e.target.value })
                      }
                      placeholder="Digite sua anotação..."
                      rows={3}
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <Button
                    onClick={adicionarAnotacao}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Anotação
                  </Button>
                </div>
              </Card>

              {/* Lista de Anotações */}
              <div className="space-y-3">
                {anotacoes.map((anotacao) => {
                  const tipo = tiposAnotacao[anotacao.tipo];
                  return (
                    <Card
                      key={anotacao.id}
                      className="p-4 border-l-4 border-l-purple-500 bg-white dark:bg-zinc-900"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 text-center">
                          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-950/30 rounded-lg flex flex-col items-center justify-center">
                            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-1" />
                            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                              {anotacao.timestamp}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1">
                          <Badge className={`${tipo.color} mb-2`}>{tipo.label}</Badge>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {anotacao.conteudo}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Tab: Cronologia */}
            <TabsContent value="cronologia" className="space-y-6 mt-6">
              <Card className="p-6 border-2 border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2">
                  <Timer className="w-5 h-5 text-blue-600" />
                  Linha do Tempo da Audiência
                </h3>

                <div className="space-y-4">
                  {[
                    {
                      time: dadosAudiencia.horarioInicio || "09:00",
                      event: "Início da Audiência",
                      icon: Play,
                      color: "green",
                    },
                    ...anotacoes.map((a) => ({
                      time: a.timestamp,
                      event: a.conteudo,
                      icon: FileText,
                      color: "blue",
                    })),
                    {
                      time: dadosAudiencia.horarioFim || "Pendente",
                      event: "Encerramento",
                      icon: Pause,
                      color: "red",
                    },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full bg-${item.color}-100 dark:bg-${item.color}-950/30 flex items-center justify-center`}
                        >
                          <item.icon
                            className={`w-5 h-5 text-${item.color}-600 dark:text-${item.color}-400`}
                          />
                        </div>
                        {index < anotacoes.length + 1 && (
                          <div className="w-0.5 h-12 bg-zinc-200 dark:bg-zinc-700" />
                        )}
                      </div>

                      <div className="flex-1 pb-8">
                        <div className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">
                          {item.time}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                          {item.event}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer com Ações */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-6 bg-white dark:bg-zinc-900">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 px-8">
              <Save className="w-4 h-4 mr-2" />
              Salvar Audiência
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}