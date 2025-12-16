import { useState, useMemo } from "react";
import TutorLayout from "@/components/TutorLayout";
import { trpc } from "@/lib/trpc";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isPast, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TutorBooking() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [serviceType, setServiceType] = useState<"creche" | "diaria">("creche");
  const [notes, setNotes] = useState("");

  // Queries
  const { data: pets, isLoading: petsLoading } = trpc.pets.list.useQuery();
  const { data: myRequests, isLoading: requestsLoading, refetch: refetchRequests } = trpc.bookingRequests.myRequests.useQuery();

  // Get dates for availability check
  const monthDates = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    return days.map((d) => format(d, "yyyy-MM-dd"));
  }, [currentMonth]);

  const { data: availability } = trpc.bookingRequests.getAvailability.useQuery(
    { dates: monthDates },
    { enabled: monthDates.length > 0 }
  );

  // Mutations
  const createRequestMutation = trpc.bookingRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitação enviada! Aguardando aprovação do administrador.");
      setSelectedDates([]);
      setNotes("");
      refetchRequests();
    },
    onError: (error) => {
      toast.error("Erro ao enviar solicitação: " + error.message);
    },
  });

  const cancelRequestMutation = trpc.bookingRequests.cancel.useMutation({
    onSuccess: () => {
      toast.success("Solicitação cancelada com sucesso.");
      refetchRequests();
    },
    onError: (error) => {
      toast.error("Erro ao cancelar: " + error.message);
    },
  });

  // Get selected pet
  const selectedPet = pets?.find((p) => p.id === selectedPetId);

  // Calendar rendering
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add padding days from previous month
    const firstDayOfWeek = start.getDay();
    const paddingDays = Array.from({ length: firstDayOfWeek }, (_, i) => {
      const date = addDays(start, -(firstDayOfWeek - i));
      return { date, isCurrentMonth: false };
    });

    const monthDays = days.map((date) => ({ date, isCurrentMonth: true }));

    return [...paddingDays, ...monthDays];
  }, [currentMonth]);

  const getDateAvailability = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availability?.find((a) => a.date === dateStr);
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some((d) => isSameDay(d, date));
  };

  const toggleDateSelection = (date: Date) => {
    if (isPast(startOfDay(date)) && !isSameDay(date, new Date())) {
      toast.error("Não é possível selecionar datas passadas.");
      return;
    }

    if (isDateSelected(date)) {
      setSelectedDates((prev) => prev.filter((d) => !isSameDay(d, date)));
    } else {
      setSelectedDates((prev) => [...prev, date]);
    }
  };

  const handleSubmit = () => {
    if (!selectedPetId) {
      toast.error("Por favor, selecione o pet para a reserva.");
      return;
    }

    if (selectedDates.length === 0) {
      toast.error("Por favor, selecione pelo menos uma data.");
      return;
    }

    createRequestMutation.mutate({
      petId: selectedPetId,
      requestedDates: selectedDates.map((d) => format(d, "yyyy-MM-dd")),
      notes,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Aprovada</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejeitada</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><XCircle className="w-3 h-3 mr-1" />Cancelada</Badge>;
      default:
        return null;
    }
  };

  if (petsLoading || requestsLoading) {
    return (
      <TutorLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="container py-8 space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">Agendamento Online</h1>
          <p className="text-muted-foreground mt-2">
            Selecione as datas desejadas para reservar dias de creche para seu pet
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Calendar Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selecione as Datas</CardTitle>
                <CardDescription>
                  Clique nas datas disponíveis para adicionar à sua reserva
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth((prev) => addDays(prev, -30))}
                  >
                    ← Anterior
                  </Button>
                  <h3 className="text-lg font-semibold capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentMonth((prev) => addDays(prev, 30))}
                  >
                    Próximo →
                  </Button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Weekday headers */}
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {calendarDays.map(({ date, isCurrentMonth }, index) => {
                    const avail = getDateAvailability(date);
                    const isSelected = isDateSelected(date);
                    const isPastDate = isPast(startOfDay(date)) && !isSameDay(date, new Date());

                    let bgColor = "bg-white hover:bg-gray-50";
                    let borderColor = "border-gray-200";
                    let textColor = "text-gray-900";

                    if (!isCurrentMonth) {
                      textColor = "text-gray-400";
                    }

                    if (isPastDate) {
                      bgColor = "bg-gray-100";
                      textColor = "text-gray-400";
                    } else if (isSelected) {
                      bgColor = "bg-primary text-primary-foreground";
                      borderColor = "border-primary";
                      textColor = "text-primary-foreground";
                    } else if (avail) {
                      if (avail.status === "full") {
                        bgColor = "bg-red-50 hover:bg-red-100";
                        borderColor = "border-red-200";
                        textColor = "text-red-700";
                      } else if (avail.status === "limited") {
                        bgColor = "bg-yellow-50 hover:bg-yellow-100";
                        borderColor = "border-yellow-200";
                        textColor = "text-yellow-700";
                      } else {
                        bgColor = "bg-green-50 hover:bg-green-100";
                        borderColor = "border-green-200";
                        textColor = "text-green-700";
                      }
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => isCurrentMonth && !isPastDate && avail?.status !== "full" && toggleDateSelection(date)}
                        disabled={!isCurrentMonth || isPastDate || avail?.status === "full"}
                        className={`
                          aspect-square p-2 rounded-lg border transition-all
                          ${bgColor} ${borderColor} ${textColor}
                          ${isCurrentMonth && !isPastDate && avail?.status !== "full" ? "cursor-pointer" : "cursor-not-allowed"}
                          disabled:opacity-50
                        `}
                      >
                        <div className="text-sm font-medium">{format(date, "d")}</div>
                        {avail && isCurrentMonth && !isPastDate && (
                          <div className="text-xs mt-1">
                            {avail.available}/{avail.maxCapacity}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
                    <span className="text-sm">Disponível</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200" />
                    <span className="text-sm">Vagas limitadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                    <span className="text-sm">Lotado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-primary" />
                    <span className="text-sm">Selecionado</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Service Type Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Serviço</label>
                  <Select
                    value={serviceType}
                    onValueChange={(value) => setServiceType(value as "creche" | "diaria")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creche">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Creche (R$ 60/dia)</span>
                          <span className="text-xs text-muted-foreground">Sem pernoite - 8h às 18h</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="diaria">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Diária com Pernoite (R$ 80/dia)</span>
                          <span className="text-xs text-muted-foreground">Com pernoite - 24h completas</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pet Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Pet</label>
                  <Select
                    value={selectedPetId?.toString() || ""}
                    onValueChange={(value) => setSelectedPetId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets?.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id.toString()}>
                          {pet.name} ({pet.credits} créditos)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Dates */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Datas Selecionadas</label>
                  {selectedDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma data selecionada</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map((date, index) => (
                        <div key={index} className="flex items-center justify-between text-sm bg-muted px-3 py-2 rounded">
                          <span className="capitalize">{format(date, "dd/MM/yyyy (EEEE)", { locale: ptBR })}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleDateSelection(date)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price Summary */}
                {selectedDates.length > 0 && (
                  <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Tipo de serviço:</span>
                      <span className="font-bold">{serviceType === "creche" ? "Creche" : "Diária com Pernoite"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Preço unitário:</span>
                      <span className="font-bold">R$ {serviceType === "creche" ? "60,00" : "80,00"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Quantidade de dias:</span>
                      <span className="font-bold">{selectedDates.length}</span>
                    </div>
                    <div className="h-px bg-primary/20 my-2" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-base">Valor Total:</span>
                      <span className="font-bold text-xl text-primary">
                        R$ {((serviceType === "creche" ? 60 : 80) * selectedDates.length).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                )}

                {/* Credits Info */}
                {selectedPet && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Créditos necessários:</span>
                      <span className="font-bold">{selectedDates.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="font-medium">Créditos disponíveis:</span>
                      <span className={selectedPet.credits >= selectedDates.length ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                        {selectedPet.credits}
                      </span>
                    </div>
                    {selectedPet.credits < selectedDates.length && (
                      <div className="flex items-start gap-2 mt-2 text-xs text-red-600">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>Créditos insuficientes. Adquira mais créditos antes de solicitar a reserva.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações (opcional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione observações sobre a reserva..."
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={
                    !selectedPetId ||
                    selectedDates.length === 0 ||
                    (selectedPet && selectedPet.credits < selectedDates.length) ||
                    createRequestMutation.isPending
                  }
                >
                  {createRequestMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Solicitar Reserva
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* My Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Minhas Solicitações</CardTitle>
            <CardDescription>Histórico de solicitações de reserva</CardDescription>
          </CardHeader>
          <CardContent>
            {!myRequests || myRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Você ainda não fez nenhuma solicitação de reserva
              </p>
            ) : (
              <div className="space-y-4">
                {myRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {request.petPhoto && (
                          <img
                            src={request.petPhoto}
                            alt={request.petName || "Pet"}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <h4 className="font-semibold">{request.petName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Solicitado em {format(new Date(request.createdAt), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div>
                      <p className="text-sm font-medium mb-2">Datas solicitadas:</p>
                      <div className="flex flex-wrap gap-2">
                        {(request.requestedDates as string[]).map((date, index) => (
                          <Badge key={index} variant="secondary">
                            {format(new Date(date), "dd/MM/yyyy")}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {request.notes && (
                      <div>
                        <p className="text-sm font-medium">Observações:</p>
                        <p className="text-sm text-muted-foreground">{request.notes}</p>
                      </div>
                    )}

                    {request.adminNotes && (
                      <div className="bg-muted p-3 rounded">
                        <p className="text-sm font-medium">Resposta do administrador:</p>
                        <p className="text-sm text-muted-foreground">{request.adminNotes}</p>
                      </div>
                    )}

                    {request.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelRequestMutation.mutate({ id: request.id })}
                        disabled={cancelRequestMutation.isPending}
                      >
                        {cancelRequestMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cancelando...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancelar Solicitação
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TutorLayout>
  );
}
