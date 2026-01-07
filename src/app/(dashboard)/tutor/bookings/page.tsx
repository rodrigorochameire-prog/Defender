"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Clock, Dog, Plus, X, Check, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingPage } from "@/components/shared/loading";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const requestTypeLabels: Record<string, string> = {
  daycare: "Creche",
  hotel: "Hotel",
  grooming: "Banho e Tosa",
  vet: "Veterinário",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Aprovada", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejeitada", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-700" },
  completed: { label: "Concluída", color: "bg-blue-100 text-blue-700" },
};

export default function TutorBookingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [requestType, setRequestType] = useState<string>("daycare");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: bookings, isLoading } = trpc.bookings.myBookings.useQuery({});
  const { data: pets } = trpc.pets.myPets.useQuery();

  const createMutation = trpc.bookings.create.useMutation({
    onSuccess: () => {
      toast.success("Reserva solicitada com sucesso!");
      utils.bookings.myBookings.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelMutation = trpc.bookings.cancel.useMutation({
    onSuccess: () => {
      toast.success("Reserva cancelada");
      utils.bookings.myBookings.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setSelectedPetId("");
    setRequestType("daycare");
    setStartDate("");
    setEndDate("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPetId || !startDate || !endDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Validar datas
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      toast.error("A data de início deve ser anterior à data de término");
      return;
    }

    createMutation.mutate({
      petId: parseInt(selectedPetId),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      requestType: requestType as "daycare" | "hotel" | "grooming" | "vet",
      notes: notes || undefined,
    });
  };

  // Filtrar pets aprovados
  const approvedPets = pets?.filter(p => p.approvalStatus === "approved") || [];

  // Estatísticas
  const stats = {
    pending: bookings?.filter(b => b.booking.status === "pending").length || 0,
    approved: bookings?.filter(b => b.booking.status === "approved").length || 0,
    total: bookings?.length || 0,
  };

  // Próxima reserva aprovada
  const nextBooking = bookings
    ?.filter(b => b.booking.status === "approved" && new Date(b.booking.startDate) >= new Date())
    ?.sort((a, b) => new Date(a.booking.startDate).getTime() - new Date(b.booking.startDate).getTime())[0];

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas Reservas"
        description="Gerencie suas reservas na creche"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={approvedPets.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Reserva
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Reserva</DialogTitle>
                <DialogDescription>
                  Solicite uma nova reserva para seu pet
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="pet">Pet *</Label>
                    <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o pet" />
                      </SelectTrigger>
                      <SelectContent>
                        {approvedPets.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id.toString()}>
                            {pet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Serviço *</Label>
                    <Select value={requestType} onValueChange={setRequestType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daycare">Creche (Day Care)</SelectItem>
                        <SelectItem value="hotel">Hotel Pet</SelectItem>
                        <SelectItem value="grooming">Banho e Tosa</SelectItem>
                        <SelectItem value="vet">Veterinário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Data Início *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">Data Fim *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alguma informação adicional?"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Enviando..." : "Solicitar Reserva"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Aviso se não tem pets aprovados */}
      {approvedPets.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Nenhum pet aprovado</p>
              <p className="text-sm text-yellow-700">
                Você precisa ter pelo menos um pet aprovado para fazer reservas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próxima Reserva</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {nextBooking ? (
              <>
                <div className="text-lg font-semibold">
                  {formatDate(nextBooking.booking.startDate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {nextBooking.pet.name} - {requestTypeLabels[nextBooking.booking.requestType]}
                </p>
              </>
            ) : (
              <>
                <div className="text-lg font-semibold text-muted-foreground">-</div>
                <p className="text-xs text-muted-foreground">Nenhuma agendada</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Dog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">reservas realizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Reservas</CardTitle>
          <CardDescription>Suas reservas passadas e futuras</CardDescription>
        </CardHeader>
        <CardContent>
          {!bookings || bookings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Nenhuma reserva ainda"
              description="Você ainda não fez nenhuma reserva. Clique no botão acima para agendar."
              action={
                approvedPets.length > 0
                  ? {
                      label: "Fazer Reserva",
                      onClick: () => setIsDialogOpen(true),
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-4">
              {bookings.map(({ booking, pet }) => {
                const status = statusLabels[booking.status] || statusLabels.pending;
                const canCancel = ["pending", "approved"].includes(booking.status);

                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Dog className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{pet.name}</p>
                          <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", status.color)}>
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(booking.startDate)}
                            {booking.startDate !== booking.endDate && ` - ${formatDate(booking.endDate)}`}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {requestTypeLabels[booking.requestType]}
                          </span>
                        </div>
                        {booking.rejectionReason && (
                          <p className="text-sm text-red-600 mt-1">
                            Motivo: {booking.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelMutation.mutate({ id: booking.id })}
                        disabled={cancelMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
