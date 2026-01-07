import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editEvent?: any;
  initialDate?: Date;
}

const EVENT_TYPES = [
  { value: "general", label: "Evento Geral", description: "Eventos gerais da creche" },
  { value: "holiday", label: "Feriado", description: "Feriados nacionais/locais" },
  { value: "closure", label: "Fechamento", description: "Dias de fechamento da creche" },
  { value: "medical", label: "Médico", description: "Consultas e procedimentos" },
  { value: "vaccination", label: "Vacinação", description: "Agendamento de vacinas" },
  { value: "medication", label: "Medicação", description: "Administração de medicamentos" },
];

export function EventForm({ open, onOpenChange, onSuccess, editEvent, initialDate }: EventFormProps) {
  const utils = trpc.useUtils();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<string>("general");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [petId, setPetId] = useState<string>("");

  const { data: pets = [] } = trpc.pets.list.useQuery();

  // Initialize form with edit data or initial date
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title || "");
      setDescription(editEvent.description || "");
      setEventType(editEvent.eventType || "general");
      setLocation(editEvent.location || "");
      setIsAllDay(editEvent.isAllDay ?? true);
      setPetId(editEvent.petId?.toString() || "");
      
      const startDate = new Date(editEvent.eventDate);
      setEventDate(format(startDate, "yyyy-MM-dd"));
      setEventTime(format(startDate, "HH:mm"));
      
      if (editEvent.endDate) {
        const end = new Date(editEvent.endDate);
        setEndDate(format(end, "yyyy-MM-dd"));
        setEndTime(format(end, "HH:mm"));
      }
    } else if (initialDate) {
      setEventDate(format(initialDate, "yyyy-MM-dd"));
      setEventTime(format(initialDate, "HH:mm"));
    } else {
      const now = new Date();
      setEventDate(format(now, "yyyy-MM-dd"));
      setEventTime(format(now, "HH:mm"));
    }
  }, [editEvent, initialDate]);

  const createMutation = trpc.calendar.add.useMutation({
    onSuccess: () => {
      toast.success("Evento criado com sucesso!");
      utils.calendar.getEvents.invalidate();
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar evento: ${error.message}`);
    },
  });

  const updateMutation = trpc.calendar.update.useMutation({
    onSuccess: () => {
      toast.success("Evento atualizado com sucesso!");
      utils.calendar.getEvents.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar evento: ${error.message}`);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventType("general");
    setEventDate(format(new Date(), "yyyy-MM-dd"));
    setEventTime(format(new Date(), "HH:mm"));
    setEndDate("");
    setEndTime("");
    setLocation("");
    setIsAllDay(true);
    setPetId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    // Construct full datetime
    const startDateTime = new Date(`${eventDate}T${isAllDay ? "00:00" : eventTime}`);
    let endDateTime: Date | undefined;
    
    if (endDate) {
      endDateTime = new Date(`${endDate}T${isAllDay ? "23:59" : (endTime || eventTime)}`);
    }

    const eventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      eventDate: startDateTime,
      endDate: endDateTime,
      eventType: eventType as any,
      petId: petId ? parseInt(petId) : undefined,
      location: location.trim() || undefined,
      isAllDay,
    };

    if (editEvent) {
      updateMutation.mutate({ id: editEvent.id, ...eventData });
    } else {
      createMutation.mutate(eventData);
    }
  };

  const selectedType = EVENT_TYPES.find(t => t.value === eventType);
  const requiresPet = ["vaccination", "medication", "medical"].includes(eventType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {editEvent ? "Editar" : "Novo"} Evento
          </DialogTitle>
          <DialogDescription>
            {selectedType?.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="eventType">Tipo de Evento *</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger id="eventType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Feriado Nacional, Consulta Veterinária..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Detalhes adicionais sobre o evento..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Pet Selection (conditional) */}
          {requiresPet && (
            <div className="space-y-2">
              <Label htmlFor="petId">Pet {requiresPet ? "*" : "(Opcional)"}</Label>
              <Select value={petId} onValueChange={setPetId}>
                <SelectTrigger id="petId">
                  <SelectValue placeholder="Selecione um pet..." />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((pet: any) => (
                    <SelectItem key={pet.id} value={pet.id.toString()}>
                      {pet.name} - {pet.breed || "Sem raça definida"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {requiresPet && !petId && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Este tipo de evento requer seleção de um pet
                </p>
              )}
            </div>
          )}

          {/* All Day Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isAllDay"
              checked={isAllDay}
              onCheckedChange={(checked) => setIsAllDay(checked as boolean)}
            />
            <Label htmlFor="isAllDay" className="cursor-pointer">
              Evento de dia inteiro
            </Label>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventDate">Data de Início *</Label>
              <Input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>

            {!isAllDay && (
              <div className="space-y-2">
                <Label htmlFor="eventTime">Hora de Início</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* End Date and Time (optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Término (Opcional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {!isAllDay && endDate && (
              <div className="space-y-2">
                <Label htmlFor="endTime">Hora de Término</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Local</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                placeholder="Ex: Clínica Veterinária, Sala de Treinamento..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending || (requiresPet && !petId)}
            >
              {createMutation.isPending || updateMutation.isPending 
                ? "Salvando..." 
                : editEvent ? "Atualizar" : "Criar Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
