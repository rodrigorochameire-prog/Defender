"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Filter,
  Gavel,
  MessageSquare,
  Mic,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Search,
  User,
  Video,
  Mail,
  MapPin,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Atendimento {
  id: string;
  data: Date;
  tipo: "presencial" | "telefone" | "whatsapp" | "email" | "videoconferencia" | "audiencia" | "visita_carceraria";
  assunto: string;
  descricao: string;
  duracao?: number; // em minutos
  defensorId: number;
  defensorNome: string;
  assistidoId: number;
  assistidoNome: string;
  processoId?: number;
  processoNumero?: string;
  anexos?: { nome: string; url: string }[];
  gravacaoId?: string;
  status: "realizado" | "agendado" | "cancelado" | "nao_compareceu";
  observacoes?: string;
  proximosPassos?: string;
}

interface HistoricoAtendimentosProps {
  assistidoId?: number;
  processoId?: number;
  defensorId?: number;
  showAddButton?: boolean;
}

// Dados mockados para demonstração
const MOCK_ATENDIMENTOS: Atendimento[] = [
  {
    id: "1",
    data: new Date(2024, 1, 5, 14, 30),
    tipo: "presencial",
    assunto: "Orientacao sobre andamento processual",
    descricao: "Cliente compareceu para receber orientacoes sobre o andamento do processo de furto. Explicado sobre a fase atual (instrucao) e proximos passos.",
    duracao: 30,
    defensorId: 1,
    defensorNome: "Dr. Rodrigo Meire",
    assistidoId: 1,
    assistidoNome: "Joao da Silva",
    processoId: 1,
    processoNumero: "0000123-45.2024.8.13.0001",
    status: "realizado",
    proximosPassos: "Aguardar audiencia de instrucao marcada para 28/02",
  },
  {
    id: "2",
    data: new Date(2024, 1, 3, 10, 0),
    tipo: "telefone",
    assunto: "Duvidas sobre comparecimento em audiencia",
    descricao: "Ligacao do cliente com duvidas sobre documentos necessarios para audiencia.",
    duracao: 15,
    defensorId: 1,
    defensorNome: "Dr. Rodrigo Meire",
    assistidoId: 1,
    assistidoNome: "Joao da Silva",
    processoId: 1,
    processoNumero: "0000123-45.2024.8.13.0001",
    status: "realizado",
    observacoes: "Orientado a trazer RG, CPF e comprovante de residencia",
  },
  {
    id: "3",
    data: new Date(2024, 1, 1, 9, 0),
    tipo: "visita_carceraria",
    assunto: "Visita para coleta de documentos",
    descricao: "Visita ao Presdio de Ribeirao das Neves para coleta de procuracao e orientacao sobre pedido de progressao.",
    duracao: 60,
    defensorId: 1,
    defensorNome: "Dr. Rodrigo Meire",
    assistidoId: 2,
    assistidoNome: "Pedro Oliveira",
    status: "realizado",
    anexos: [{ nome: "procuracao_assinada.pdf", url: "#" }],
  },
  {
    id: "4",
    data: new Date(2024, 0, 28, 14, 0),
    tipo: "audiencia",
    assunto: "Audiencia de Instrucao",
    descricao: "Acompanhamento de audiencia de instrucao. Oitiva de 3 testemunhas de acusacao.",
    duracao: 120,
    defensorId: 1,
    defensorNome: "Dr. Rodrigo Meire",
    assistidoId: 1,
    assistidoNome: "Joao da Silva",
    processoId: 1,
    processoNumero: "0000123-45.2024.8.13.0001",
    status: "realizado",
    gravacaoId: "1",
    observacoes: "Testemunha 1 confirmou alibi do reu. Testemunha 2 apresentou contradicoes.",
  },
  {
    id: "5",
    data: new Date(2024, 0, 20, 11, 0),
    tipo: "whatsapp",
    assunto: "Envio de documentos",
    descricao: "Cliente enviou comprovantes de endereco via WhatsApp.",
    duracao: 5,
    defensorId: 1,
    defensorNome: "Dr. Rodrigo Meire",
    assistidoId: 1,
    assistidoNome: "Joao da Silva",
    status: "realizado",
    anexos: [{ nome: "comprovante_endereco.pdf", url: "#" }],
  },
];

const TIPO_ATENDIMENTO_CONFIG: Record<
  string,
  { label: string; icon: typeof User; cor: string }
> = {
  presencial: { label: "Presencial", icon: User, cor: "bg-blue-500" },
  telefone: { label: "Telefone", icon: Phone, cor: "bg-green-500" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, cor: "bg-emerald-500" },
  email: { label: "E-mail", icon: Mail, cor: "bg-amber-500" },
  videoconferencia: { label: "Videoconferencia", icon: Video, cor: "bg-purple-500" },
  audiencia: { label: "Audiencia", icon: Gavel, cor: "bg-red-500" },
  visita_carceraria: { label: "Visita Carceraria", icon: MapPin, cor: "bg-orange-500" },
};

export function HistoricoAtendimentos({
  assistidoId,
  processoId,
  defensorId,
  showAddButton = true,
}: HistoricoAtendimentosProps) {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>(MOCK_ATENDIMENTOS);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [dialogNovoAtendimento, setDialogNovoAtendimento] = useState(false);
  const [novoAtendimento, setNovoAtendimento] = useState({
    tipo: "presencial",
    assunto: "",
    descricao: "",
    duracao: 30,
  });

  // Filtrar e agrupar atendimentos
  const atendimentosFiltrados = useMemo(() => {
    let lista = [...atendimentos];

    // Filtrar por assistido ou processo se especificado
    if (assistidoId) {
      lista = lista.filter((a) => a.assistidoId === assistidoId);
    }
    if (processoId) {
      lista = lista.filter((a) => a.processoId === processoId);
    }

    // Filtro de busca
    if (busca) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (a) =>
          a.assunto.toLowerCase().includes(termo) ||
          a.descricao.toLowerCase().includes(termo) ||
          a.assistidoNome.toLowerCase().includes(termo)
      );
    }

    // Filtro de tipo
    if (filtroTipo !== "todos") {
      lista = lista.filter((a) => a.tipo === filtroTipo);
    }

    // Ordenar por data (mais recente primeiro)
    lista.sort((a, b) => b.data.getTime() - a.data.getTime());

    return lista;
  }, [atendimentos, assistidoId, processoId, busca, filtroTipo]);

  // Agrupar por período
  const atendimentosAgrupados = useMemo(() => {
    const grupos: { titulo: string; atendimentos: Atendimento[] }[] = [];
    const hoje: Atendimento[] = [];
    const ontem: Atendimento[] = [];
    const estaSemana: Atendimento[] = [];
    const esteMes: Atendimento[] = [];
    const anteriores: Atendimento[] = [];

    atendimentosFiltrados.forEach((a) => {
      if (isToday(a.data)) {
        hoje.push(a);
      } else if (isYesterday(a.data)) {
        ontem.push(a);
      } else if (isThisWeek(a.data)) {
        estaSemana.push(a);
      } else if (isThisMonth(a.data)) {
        esteMes.push(a);
      } else {
        anteriores.push(a);
      }
    });

    if (hoje.length > 0) grupos.push({ titulo: "Hoje", atendimentos: hoje });
    if (ontem.length > 0) grupos.push({ titulo: "Ontem", atendimentos: ontem });
    if (estaSemana.length > 0) grupos.push({ titulo: "Esta Semana", atendimentos: estaSemana });
    if (esteMes.length > 0) grupos.push({ titulo: "Este Mes", atendimentos: esteMes });
    if (anteriores.length > 0) grupos.push({ titulo: "Anteriores", atendimentos: anteriores });

    return grupos;
  }, [atendimentosFiltrados]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const formatarDataRelativa = (data: Date) => {
    if (isToday(data)) {
      return `Hoje as ${format(data, "HH:mm")}`;
    }
    if (isYesterday(data)) {
      return `Ontem as ${format(data, "HH:mm")}`;
    }
    return format(data, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
  };

  const handleSalvarNovoAtendimento = () => {
    const novo: Atendimento = {
      id: `new-${Date.now()}`,
      data: new Date(),
      tipo: novoAtendimento.tipo as Atendimento["tipo"],
      assunto: novoAtendimento.assunto,
      descricao: novoAtendimento.descricao,
      duracao: novoAtendimento.duracao,
      defensorId: 1,
      defensorNome: "Dr. Rodrigo Meire",
      assistidoId: assistidoId || 1,
      assistidoNome: "Assistido",
      status: "realizado",
    };
    setAtendimentos((prev) => [novo, ...prev]);
    setDialogNovoAtendimento(false);
    setNovoAtendimento({ tipo: "presencial", assunto: "", descricao: "", duracao: 30 });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Historico de Atendimentos
          </h3>
          <p className="text-sm text-muted-foreground">
            {atendimentosFiltrados.length} atendimento(s) registrado(s)
          </p>
        </div>
        {showAddButton && (
          <Dialog open={dialogNovoAtendimento} onOpenChange={setDialogNovoAtendimento}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Atendimento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Atendimento</DialogTitle>
                <DialogDescription>
                  Registre um novo atendimento realizado
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={novoAtendimento.tipo}
                      onValueChange={(v) =>
                        setNovoAtendimento((prev) => ({ ...prev, tipo: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TIPO_ATENDIMENTO_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duracao (min)</Label>
                    <Input
                      type="number"
                      value={novoAtendimento.duracao}
                      onChange={(e) =>
                        setNovoAtendimento((prev) => ({
                          ...prev,
                          duracao: parseInt(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assunto</Label>
                  <Input
                    value={novoAtendimento.assunto}
                    onChange={(e) =>
                      setNovoAtendimento((prev) => ({ ...prev, assunto: e.target.value }))
                    }
                    placeholder="Resumo do atendimento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descricao</Label>
                  <Textarea
                    value={novoAtendimento.descricao}
                    onChange={(e) =>
                      setNovoAtendimento((prev) => ({ ...prev, descricao: e.target.value }))
                    }
                    placeholder="Detalhes do atendimento..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogNovoAtendimento(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSalvarNovoAtendimento}
                  disabled={!novoAtendimento.assunto}
                >
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar atendimentos..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {Object.entries(TIPO_ATENDIMENTO_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-6 pr-4">
          {atendimentosAgrupados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhum atendimento encontrado</p>
            </div>
          ) : (
            atendimentosAgrupados.map((grupo) => (
              <div key={grupo.titulo}>
                <h4 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                  {grupo.titulo}
                </h4>
                <div className="relative">
                  {/* Linha da timeline */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-700" />

                  <div className="space-y-4">
                    {grupo.atendimentos.map((atendimento) => {
                      const tipoConfig = TIPO_ATENDIMENTO_CONFIG[atendimento.tipo];
                      const TipoIcon = tipoConfig?.icon || User;
                      const isExpanded = expandedIds.includes(atendimento.id);

                      return (
                        <div key={atendimento.id} className="relative pl-14">
                          {/* Bolinha da timeline */}
                          <div
                            className={cn(
                              "absolute left-4 w-5 h-5 rounded-full flex items-center justify-center",
                              tipoConfig?.cor || "bg-gray-500"
                            )}
                          >
                            <TipoIcon className="h-3 w-3 text-white" />
                          </div>

                          <Card
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md",
                              atendimento.tipo === "audiencia" && "border-l-4 border-l-red-500"
                            )}
                            onClick={() => toggleExpand(atendimento.id)}
                          >
                            <CardContent className="py-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="font-medium">{atendimento.assunto}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {tipoConfig?.label}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground ml-6">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatarDataRelativa(atendimento.data)}
                                    </span>
                                    {atendimento.duracao && (
                                      <span>{atendimento.duracao} min</span>
                                    )}
                                    {!assistidoId && (
                                      <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {atendimento.assistidoNome}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Conteúdo expandido */}
                              {isExpanded && (
                                <div className="mt-3 ml-6 space-y-3">
                                  <Separator />
                                  <p className="text-sm">{atendimento.descricao}</p>

                                  {atendimento.observacoes && (
                                    <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded text-sm">
                                      <span className="font-medium text-amber-700 dark:text-amber-400">
                                        Observacoes:
                                      </span>{" "}
                                      {atendimento.observacoes}
                                    </div>
                                  )}

                                  {atendimento.proximosPassos && (
                                    <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded text-sm">
                                      <span className="font-medium text-blue-700 dark:text-blue-400">
                                        Proximos passos:
                                      </span>{" "}
                                      {atendimento.proximosPassos}
                                    </div>
                                  )}

                                  {atendimento.anexos && atendimento.anexos.length > 0 && (
                                    <div className="flex gap-2">
                                      {atendimento.anexos.map((anexo, idx) => (
                                        <Button
                                          key={idx}
                                          variant="outline"
                                          size="sm"
                                          className="text-xs"
                                        >
                                          <Paperclip className="h-3 w-3 mr-1" />
                                          {anexo.nome}
                                        </Button>
                                      ))}
                                    </div>
                                  )}

                                  {atendimento.gravacaoId && (
                                    <Button variant="outline" size="sm" className="text-xs">
                                      <Mic className="h-3 w-3 mr-1" />
                                      Ver Gravacao
                                    </Button>
                                  )}

                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[8px]">
                                        {atendimento.defensorNome
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    {atendimento.defensorNome}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
