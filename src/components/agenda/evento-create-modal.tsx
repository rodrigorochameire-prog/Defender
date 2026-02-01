import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/CustomSelect";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Bell,
  Repeat,
  Tag,
  Link,
  X,
  Plus,
  AlertTriangle,
  Gavel,
  Home,
  Lock,
  Folder,
  RefreshCw,
  Shield,
  Scale,
} from "lucide-react";

export interface EventoFormData {
  id?: string;
  titulo: string;
  tipo: string;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  local: string;
  assistido: string;
  processo: string;
  atribuicao: string;
  status: string;
  descricao: string;
  prioridade: string;
  recorrencia: string;
  lembretes: string[];
  tags: string[];
  participantes: string[];
  vinculoDemanda?: string;
  observacoes: string;
  documentos: string[];
}

interface EventoCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EventoFormData) => void;
  editData?: EventoFormData | null;
}

const tipoOptions = [
  { value: "audiencia", label: "Audiência", icon: Gavel },
  { value: "reuniao", label: "Reunião", icon: Users },
  { value: "prazo", label: "Prazo", icon: Clock },
  { value: "compromisso", label: "Compromisso", icon: Calendar },
  { value: "diligencia", label: "Diligência", icon: MapPin },
  { value: "atendimento", label: "Atendimento", icon: Users },
  { value: "plantao", label: "Plantão", icon: Clock },
];

const statusOptions = [
  { value: "confirmado", label: "Confirmado", color: "text-emerald-600" },
  { value: "pendente", label: "Pendente", color: "text-amber-600" },
  { value: "cancelado", label: "Cancelado", color: "text-red-600" },
  { value: "reagendado", label: "Reagendado", color: "text-blue-600" },
  { value: "concluido", label: "Concluído", color: "text-zinc-600" },
];

const prioridadeOptions = [
  { value: "baixa", label: "Baixa", color: "text-zinc-600" },
  { value: "media", label: "Média", color: "text-blue-600" },
  { value: "alta", label: "Alta", color: "text-amber-600" },
  { value: "urgente", label: "Urgente", color: "text-red-600" },
];

const atribuicaoOptions = [
  { value: "Tribunal do Júri", label: "Tribunal do Júri", icon: Gavel },
  { value: "Violência Doméstica", label: "Violência Doméstica", icon: Home },
  { value: "Execução Penal", label: "Execução Penal", icon: Lock },
  { value: "Criminal Geral", label: "Criminal Geral", icon: Folder },
  { value: "Substituição", label: "Substituição", icon: RefreshCw },
  { value: "Curadoria Especial", label: "Curadoria Especial", icon: Shield },
  { value: "Geral", label: "Geral", icon: Scale },
];

const recorrenciaOptions = [
  { value: "nenhuma", label: "Não repetir" },
  { value: "diaria", label: "Diariamente" },
  { value: "semanal", label: "Semanalmente" },
  { value: "quinzenal", label: "Quinzenalmente" },
  { value: "mensal", label: "Mensalmente" },
  { value: "anual", label: "Anualmente" },
];

const lembreteOptions = [
  { value: "15min", label: "15 minutos antes" },
  { value: "30min", label: "30 minutos antes" },
  { value: "1h", label: "1 hora antes" },
  { value: "1d", label: "1 dia antes" },
  { value: "3d", label: "3 dias antes" },
  { value: "1sem", label: "1 semana antes" },
];

export function EventoCreateModal({ isOpen, onClose, onSave, editData }: EventoCreateModalProps) {
  const isEditMode = !!editData;

  const [formData, setFormData] = useState<EventoFormData>({
    titulo: "",
    tipo: "audiencia",
    data: "",
    horarioInicio: "",
    horarioFim: "",
    local: "",
    assistido: "",
    processo: "",
    atribuicao: "Geral",
    status: "confirmado",
    descricao: "",
    prioridade: "media",
    recorrencia: "nenhuma",
    lembretes: [],
    tags: [],
    participantes: [],
    observacoes: "",
    documentos: [],
  });

  const [newTag, setNewTag] = useState("");
  const [newParticipante, setNewParticipante] = useState("");

  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      setFormData({
        titulo: "",
        tipo: "audiencia",
        data: "",
        horarioInicio: "",
        horarioFim: "",
        local: "",
        assistido: "",
        processo: "",
        atribuicao: "Geral",
        status: "confirmado",
        descricao: "",
        prioridade: "media",
        recorrencia: "nenhuma",
        lembretes: [],
        tags: [],
        participantes: [],
        observacoes: "",
        documentos: [],
      });
    }
  }, [editData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!formData.data) {
      toast.error("Data é obrigatória");
      return;
    }
    if (!formData.horarioInicio) {
      toast.error("Horário de início é obrigatório");
      return;
    }

    onSave(formData);
    onClose();
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const handleAddParticipante = () => {
    if (newParticipante.trim() && !formData.participantes.includes(newParticipante.trim())) {
      setFormData({ ...formData, participantes: [...formData.participantes, newParticipante.trim()] });
      setNewParticipante("");
    }
  };

  const handleRemoveParticipante = (participante: string) => {
    setFormData({ ...formData, participantes: formData.participantes.filter((p) => p !== participante) });
  };

  const handleToggleLembrete = (value: string) => {
    if (formData.lembretes.includes(value)) {
      setFormData({ ...formData, lembretes: formData.lembretes.filter((l) => l !== value) });
    } else {
      setFormData({ ...formData, lembretes: [...formData.lembretes, value] });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {isEditMode ? "Editar Evento" : "Novo Evento"}
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            {isEditMode ? "Atualize os detalhes do evento." : "Crie um novo evento."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              Informações Básicas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Título do Evento *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Audiência de Instrução"
                  className="bg-white dark:bg-zinc-900"
                />
              </div>

              <div>
                <Label>Tipo de Evento *</Label>
                <CustomSelect
                  options={tipoOptions}
                  value={formData.tipo}
                  onChange={(value) => setFormData({ ...formData, tipo: value })}
                  placeholder="Selecione o tipo"
                />
              </div>

              <div>
                <Label>Status *</Label>
                <CustomSelect
                  options={statusOptions}
                  value={formData.status}
                  onChange={(value) => setFormData({ ...formData, status: value })}
                  placeholder="Selecione o status"
                />
              </div>

              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="bg-white dark:bg-zinc-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Início *</Label>
                  <Input
                    type="time"
                    value={formData.horarioInicio}
                    onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                    className="bg-white dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input
                    type="time"
                    value={formData.horarioFim}
                    onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
                    className="bg-white dark:bg-zinc-900"
                  />
                </div>
              </div>

              <div>
                <Label>Prioridade</Label>
                <CustomSelect
                  options={prioridadeOptions}
                  value={formData.prioridade}
                  onChange={(value) => setFormData({ ...formData, prioridade: value })}
                  placeholder="Selecione a prioridade"
                />
              </div>

              <div>
                <Label>Atribuição</Label>
                <CustomSelect
                  options={atribuicaoOptions}
                  value={formData.atribuicao}
                  onChange={(value) => setFormData({ ...formData, atribuicao: value })}
                  placeholder="Selecione a atribuição"
                />
              </div>
            </div>
          </div>

          {/* Localização e Pessoas */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Localização e Participantes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Local</Label>
                <Input
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  placeholder="Ex: Vara Criminal - Sala 3"
                  className="bg-white dark:bg-zinc-900"
                />
              </div>

              <div>
                <Label>Assistido</Label>
                <Input
                  value={formData.assistido}
                  onChange={(e) => setFormData({ ...formData, assistido: e.target.value })}
                  placeholder="Nome do assistido"
                  className="bg-white dark:bg-zinc-900"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Participantes Adicionais</Label>
                <div className="flex gap-2">
                  <Input
                    value={newParticipante}
                    onChange={(e) => setNewParticipante(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddParticipante())}
                    placeholder="Nome do participante"
                    className="bg-white dark:bg-zinc-900"
                  />
                  <Button type="button" variant="outline" onClick={handleAddParticipante}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.participantes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.participantes.map((participante) => (
                      <Badge
                        key={participante}
                        variant="secondary"
                        className="cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        onClick={() => handleRemoveParticipante(participante)}
                      >
                        {participante}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Processo e Vínculo */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Processo e Vínculo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Número do Processo</Label>
                <Input
                  value={formData.processo}
                  onChange={(e) => setFormData({ ...formData, processo: e.target.value })}
                  placeholder="0000000-00.0000.0.00.0000"
                  className="bg-white dark:bg-zinc-900 font-mono"
                />
              </div>

              <div>
                <Label>Vínculo com Demanda</Label>
                <Input
                  value={formData.vinculoDemanda || ""}
                  onChange={(e) => setFormData({ ...formData, vinculoDemanda: e.target.value })}
                  placeholder="ID da demanda vinculada"
                  className="bg-white dark:bg-zinc-900"
                />
              </div>
            </div>
          </div>

          {/* Descrição e Observações */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Descrição
            </h3>

            <div>
              <Label>Descrição do Evento</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva os detalhes do evento..."
                rows={3}
                className="bg-white dark:bg-zinc-900"
              />
            </div>

            <div>
              <Label>Observações Internas</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Anotações e observações (uso interno)..."
                rows={2}
                className="bg-white dark:bg-zinc-900"
              />
            </div>
          </div>

          {/* Recorrência e Lembretes */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Repeat className="w-5 h-5 text-indigo-600" />
              Recorrência e Lembretes
            </h3>

            <div>
              <Label>Recorrência</Label>
              <CustomSelect
                options={recorrenciaOptions}
                value={formData.recorrencia}
                onChange={(value) => setFormData({ ...formData, recorrencia: value })}
                placeholder="Selecione a recorrência"
              />
            </div>

            <div>
              <Label>Lembretes</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {lembreteOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={formData.lembretes.includes(option.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleToggleLembrete(option.value)}
                  >
                    <Bell className="w-3 h-3 mr-1" />
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Tag className="w-5 h-5 text-pink-600" />
              Tags
            </h3>

            <div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                  placeholder="Adicionar tag"
                  className="bg-white dark:bg-zinc-900"
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isEditMode ? "Salvar Alterações" : "Criar Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}