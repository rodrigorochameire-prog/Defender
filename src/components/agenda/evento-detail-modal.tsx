import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  X,
  Edit,
  Trash2,
  Mail,
  MoreVertical,
  Calendar,
  Clock,
  MapPin,
  FileText,
  User,
  Scale,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Gavel,
  Shield,
  Home,
  Lock,
  Folder,
  Users,
  Tag,
  Bell,
  Paperclip,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

interface EventoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  evento: any;
  onEdit?: (evento: any) => void;
  onDelete?: (id: string) => void;
}

const tipoConfig: Record<string, any> = {
  audiencia: {
    label: "Audiência",
    icon: Gavel,
    color: "#FCD34D",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  reuniao: {
    label: "Reunião",
    icon: Users,
    color: "#A78BFA",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  prazo: {
    label: "Prazo",
    icon: AlertCircle,
    color: "#F87171",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  atendimento: {
    label: "Atendimento",
    icon: User,
    color: "#60A5FA",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  plantao: {
    label: "Plantão",
    icon: Clock,
    color: "#34D399",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
};

const atribuicaoConfig: Record<string, any> = {
  "Tribunal do Júri": { icon: Gavel, color: "text-red-600 dark:text-red-400" },
  "Violência Doméstica": { icon: Shield, color: "text-purple-600 dark:text-purple-400" },
  "Execução Penal": { icon: Lock, color: "text-orange-600 dark:text-orange-400" },
  "Criminal Geral": { icon: Scale, color: "text-blue-600 dark:text-blue-400" },
  Curadoria: { icon: Home, color: "text-emerald-600 dark:text-emerald-400" },
  "Substituição Criminal": { icon: Folder, color: "text-cyan-600 dark:text-cyan-400" },
};

export function EventoDetailModal({
  isOpen,
  onClose,
  evento,
  onEdit,
  onDelete,
}: EventoDetailModalProps) {
  const [observacao, setObservacao] = useState(evento?.observacoes || "");
  const [isEditingObs, setIsEditingObs] = useState(false);

  if (!evento) return null;

  const config = tipoConfig[evento.tipo] || tipoConfig.audiencia;
  const Icon = config.icon;
  const AtribuicaoIcon = atribuicaoConfig[evento.atribuicao]?.icon || Scale;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    
    return `${dias[date.getDay()]}, ${date.getDate()} de ${meses[date.getMonth()]}`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "confirmado":
        return {
          icon: CheckCircle2,
          label: "designada",
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
        };
      case "cancelado":
        return {
          icon: XCircle,
          label: "cancelada",
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-50 dark:bg-red-950/30",
        };
      case "concluido":
        return {
          icon: CheckCircle2,
          label: "realizada",
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-950/30",
        };
      case "remarcado":
        return {
          icon: AlertCircle,
          label: "redesignada",
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-950/30",
        };
      default:
        return {
          icon: Clock,
          label: status,
          color: "text-zinc-600 dark:text-zinc-400",
          bg: "bg-zinc-50 dark:bg-zinc-950/30",
        };
    }
  };

  const statusConfig = getStatusConfig(evento.status);
  const StatusIcon = statusConfig.icon;

  const handleSaveObservacao = () => {
    // Aqui você salvaria a observação
    toast.success("Observação atualizada!");
    setIsEditingObs(false);
  };

  const handleDelete = () => {
    if (confirm("Tem certeza que deseja excluir este evento?")) {
      onDelete?.(evento.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 p-0">
        {/* Hidden title and description for accessibility */}
        <DialogTitle className="sr-only">Detalhes do Evento: {evento.titulo}</DialogTitle>
        <DialogDescription className="sr-only">
          Visualização completa das informações do evento da agenda, incluindo data, horário, local, participantes e observações.
        </DialogDescription>
        
        {/* Header com actions */}
        <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit?.(evento)}
                className="h-9 w-9"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Mail className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-6">
          {/* Título e Data */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${config.bgColor} mt-1`}
              >
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: config.color }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-normal text-zinc-900 dark:text-zinc-50 break-words">
                  {evento.titulo}
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {formatDate(evento.data)} · {evento.horarioInicio}
                  {evento.horarioFim && ` – ${evento.horarioFim}`}
                </p>
              </div>
            </div>
          </div>

          {/* Criar ata da reunião */}
          {evento.tipo === "audiencia" && evento.status !== "concluido" && (
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium text-blue-600 dark:text-blue-400">
                      Criar ata da reunião
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Inicie um novo documento para fazer anotações
                    </p>
                  </div>
                </div>
                <MoreVertical className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
          )}

          {/* Informações da Audiência */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <FileText className="w-4 h-4 text-zinc-500" />
              <h2 className="font-bold text-sm uppercase tracking-wide">
                INFORMAÇÕES DA AUDIÊNCIA
              </h2>
            </div>

            <div className="space-y-4 pl-6">
              {/* Órgão Julgador */}
              {evento.local && (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                    Órgão Julgador:
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">{evento.local}</p>
                </div>
              )}

              {/* Tipo de Audiência */}
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                  Tipo de Audiência:
                </p>
                <p className="text-zinc-700 dark:text-zinc-300">{config.label}</p>
              </div>

              {/* Processo */}
              {evento.processo && (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1">Processo:</p>
                  <p className="text-zinc-700 dark:text-zinc-300 font-mono">
                    {evento.processo}
                  </p>
                </div>
              )}

              {/* Classe Processual */}
              {evento.classeJudicial && (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                    Classe Processual:
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">{evento.classeJudicial}</p>
                </div>
              )}

              {/* Atribuição */}
              {evento.atribuicao && (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1">Atribuição:</p>
                  <div className="flex items-center gap-2">
                    <AtribuicaoIcon
                      className={`w-4 h-4 ${atribuicaoConfig[evento.atribuicao]?.color || "text-zinc-600"}`}
                    />
                    <p className="text-zinc-700 dark:text-zinc-300">{evento.atribuicao}</p>
                  </div>
                </div>
              )}

              {/* Parte(s) Assistida(s) */}
              {evento.assistido && (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Parte(s) Assistida(s):
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">{evento.assistido}</p>
                </div>
              )}

              {/* Data e Horário */}
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-600 dark:text-red-400" />
                  Data e Horário:
                </p>
                <p className="text-zinc-700 dark:text-zinc-300">
                  {new Date(evento.data).toLocaleDateString("pt-BR")} {evento.horarioInicio}
                  {evento.horarioFim && ` - ${evento.horarioFim}`}
                </p>
              </div>

              {/* Status */}
              <div>
                <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1 flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                  Status:
                </p>
                <p className={`${statusConfig.color} font-medium`}>{statusConfig.label}</p>
              </div>

              {/* Prioridade */}
              {evento.prioridade && (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1">Prioridade:</p>
                  <Badge
                    variant="secondary"
                    className={
                      evento.prioridade === "urgente"
                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : evento.prioridade === "alta"
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                        : evento.prioridade === "media"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }
                  >
                    {evento.prioridade.charAt(0).toUpperCase() + evento.prioridade.slice(1)}
                  </Badge>
                </div>
              )}

              {/* Responsável */}
              {evento.responsavel && (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-1">Responsável:</p>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    {evento.responsavel === "def-1" ? "Dr. Rodrigo" : "Dra. Juliane"}
                  </p>
                </div>
              )}

              {/* Tags */}
              {evento.tags && evento.tags.length > 0 && (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {evento.tags.map((tag: string, index: number) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Participantes */}
              {evento.participantes && evento.participantes.length > 0 && (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">Participantes:</p>
                  <div className="space-y-1">
                    {evento.participantes.map((participante: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-sm">{participante}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lembretes */}
              {evento.lembretes && evento.lembretes.length > 0 && (
                <div>
                  <p className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">Lembretes:</p>
                  <div className="flex flex-wrap gap-2">
                    {evento.lembretes.map((lembrete: string, index: number) => {
                      const labels: Record<string, string> = {
                        "5min": "5 minutos antes",
                        "15min": "15 minutos antes",
                        "30min": "30 minutos antes",
                        "1h": "1 hora antes",
                        "2h": "2 horas antes",
                        "1d": "1 dia antes",
                        "2d": "2 dias antes",
                        "3d": "3 dias antes",
                        "1sem": "1 semana antes",
                      };
                      return (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                        >
                          <Bell className="w-3 h-3 mr-1" />
                          {labels[lembrete] || lembrete}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-zinc-300 dark:border-zinc-700" />

          {/* Observação */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <MessageSquare className="w-4 h-4 text-zinc-500" />
              <h3 className="font-bold text-sm">Observação:</h3>
            </div>
            
            {isEditingObs ? (
              <div className="space-y-2 pl-6">
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="min-h-[100px] bg-white dark:bg-zinc-900"
                  placeholder="Adicione observações sobre este evento..."
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveObservacao}>
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setObservacao(evento.observacoes || "");
                      setIsEditingObs(false);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingObs(true)}
                className="pl-6 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded p-2 -ml-2 transition-colors"
              >
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {evento.observacoes ||
                    "Relatório detalhado da audiência será incluído posteriormente neste evento."}
                </p>
              </div>
            )}
          </div>

          {/* Descrição adicional */}
          {evento.descricao && (
            <div className="pl-6">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                {evento.descricao}
              </p>
            </div>
          )}

          {/* Documentos */}
          {evento.documentos && evento.documentos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Paperclip className="w-4 h-4 text-zinc-500" />
                <h3 className="font-bold text-sm">Documentos Anexados:</h3>
              </div>
              <div className="pl-6 space-y-2">
                {evento.documentos.map((doc: string, index: number) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data de inclusão */}
          <div className="pl-6 text-xs text-zinc-500 dark:text-zinc-400">
            Criado em {new Date(evento.dataInclusao).toLocaleString("pt-BR")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}