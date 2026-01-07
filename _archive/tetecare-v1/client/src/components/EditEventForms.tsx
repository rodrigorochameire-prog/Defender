import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";

type EventType = "vaccine" | "medication" | "checkin" | "payment-income" | "payment-expense";

interface EditEventFormsProps {
  open: boolean;
  onClose: () => void;
  eventType: EventType | null;
  eventData: any;
  onSuccess: () => void;
}

export function EditEventForms({ open, onClose, eventType, eventData, onSuccess }: EditEventFormsProps) {
  if (!eventType || !eventData) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {eventType === "vaccine" && (
          <EditVaccinationForm eventData={eventData} onSuccess={onSuccess} onClose={onClose} />
        )}
        {eventType === "medication" && (
          <EditMedicationForm eventData={eventData} onSuccess={onSuccess} onClose={onClose} />
        )}
        {eventType === "checkin" && (
          <EditBookingForm eventData={eventData} onSuccess={onSuccess} onClose={onClose} />
        )}
        {(eventType === "payment-income" || eventType === "payment-expense") && (
          <EditTransactionForm eventData={eventData} onSuccess={onSuccess} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Edit Vaccination Form
function EditVaccinationForm({ eventData, onSuccess, onClose }: any) {
  const [applicationDate, setApplicationDate] = useState(eventData.applicationDate || "");
  const [veterinarian, setVeterinarian] = useState(eventData.veterinarian || "");
  const [clinic, setClinic] = useState(eventData.clinic || "");
  const [nextDueDate, setNextDueDate] = useState(eventData.nextDueDate || "");
  const [notes, setNotes] = useState(eventData.notes || "");

  const updateMutation = trpc.vaccines.update.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      alert(`Erro ao atualizar vacinação: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: eventData.id,
      petId: eventData.petId,
      veterinarian,
      clinic,
      nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Vacinação</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Pet</Label>
          <Input value={eventData.petName || ""} disabled />
        </div>
        <div>
          <Label>Vacina</Label>
          <Input value={eventData.vaccineName || ""} disabled />
        </div>
        <div>
          <Label>Data de Aplicação *</Label>
          <Input
            type="date"
            value={applicationDate}
            onChange={(e) => setApplicationDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Veterinário</Label>
          <Input
            value={veterinarian}
            onChange={(e) => setVeterinarian(e.target.value)}
            placeholder="Nome do veterinário"
          />
        </div>
        <div>
          <Label>Clínica</Label>
          <Input
            value={clinic}
            onChange={(e) => setClinic(e.target.value)}
            placeholder="Nome da clínica"
          />
        </div>
        <div>
          <Label>Próxima Dose</Label>
          <Input
            type="date"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações sobre a vacinação"
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </>
  );
}

// Edit Medication Form
function EditMedicationForm({ eventData, onSuccess, onClose }: any) {
  const [dosage, setDosage] = useState(eventData.dosage || "");
  const [frequency, setFrequency] = useState(eventData.frequency || "");
  const [startDate, setStartDate] = useState(eventData.startDate || "");
  const [endDate, setEndDate] = useState(eventData.endDate || "");
  const [notes, setNotes] = useState(eventData.notes || "");

  const updateMutation = trpc.medications.update.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      alert(`Erro ao atualizar medicamento: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: eventData.id,
      petId: eventData.petId,
      endDate: endDate ? new Date(endDate) : undefined,
      notes: notes || undefined,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Medicamento</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Pet</Label>
          <Input value={eventData.petName || ""} disabled />
        </div>
        <div>
          <Label>Medicamento</Label>
          <Input value={eventData.medicationName || ""} disabled />
        </div>
        <div>
          <Label>Dosagem *</Label>
          <Input
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="Ex: 1 comprimido"
            required
          />
        </div>
        <div>
          <Label>Frequência *</Label>
          <Input
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            placeholder="Ex: 2x ao dia"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data de Início *</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Data de Término</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações sobre o tratamento"
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </>
  );
}

// Edit Booking Form
function EditBookingForm({ eventData, onSuccess, onClose }: any) {
  // Convert date objects to YYYY-MM-DD format for input fields
  const formatDateForInput = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const [checkInDate, setCheckInDate] = useState(formatDateForInput(eventData.checkInDate));
  const [checkOutDate, setCheckOutDate] = useState(formatDateForInput(eventData.checkOutDate));
  const [notes, setNotes] = useState(eventData.notes || "");

  // Update dates when eventData changes
  useEffect(() => {
    setCheckInDate(formatDateForInput(eventData.checkInDate));
    setCheckOutDate(formatDateForInput(eventData.checkOutDate));
    setNotes(eventData.notes || "");
  }, [eventData]);

  // Calculate number of days
  const numberOfDays = checkInDate && checkOutDate
    ? Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get credits for validation
  const { data: creditBalance } = trpc.credits.getBalance.useQuery(
    { petId: eventData.petId },
    { enabled: !!eventData.petId }
  );

  const totalCredits = creditBalance || 0;
  const hasEnoughCredits = totalCredits >= numberOfDays;

  const updateMutation = trpc.healthCalendar.updateBooking.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      alert(`Erro ao atualizar reserva: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEnoughCredits) {
      alert("Créditos insuficientes para este período!");
      return;
    }
    updateMutation.mutate({
      id: eventData.bookingId,
      checkInDate,
      checkOutDate,
      notes: notes || undefined,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Check-in</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Pet</Label>
          <Input value={eventData.petName || ""} disabled />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Check-in *</Label>
            <Input
              type="date"
              value={checkInDate}
              onChange={(e) => setCheckInDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Check-out *</Label>
            <Input
              type="date"
              value={checkOutDate}
              onChange={(e) => setCheckOutDate(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{numberOfDays} diárias</Badge>
          <Badge variant={hasEnoughCredits ? "default" : "destructive"}>
            {totalCredits} créditos disponíveis
          </Badge>
          {!hasEnoughCredits && (
            <Badge variant="destructive">Créditos insuficientes!</Badge>
          )}
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações sobre a estadia"
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={updateMutation.isPending || !hasEnoughCredits}>
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </>
  );
}

// Edit Transaction Form
function EditTransactionForm({ eventData, onSuccess, onClose }: any) {
  const [amount, setAmount] = useState(eventData.amount?.toString() || "");
  const [category, setCategory] = useState(eventData.category || "");
  const [description, setDescription] = useState(eventData.description || "");
  const [transactionDate, setTransactionDate] = useState(eventData.transactionDate || "");

  const updateMutation = trpc.healthCalendar.updateTransaction.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      alert(`Erro ao atualizar transação: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: eventData.id,
      amount: parseFloat(amount),
      category,
      description,
      transactionDate,
    });
  };

  const isIncome = eventData.type === "payment-income";

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar {isIncome ? "Receita" : "Despesa"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Tipo</Label>
          <Input value={isIncome ? "Receita" : "Despesa"} disabled />
        </div>
        <div>
          <Label>Data *</Label>
          <Input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Valor (R$) *</Label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <Label>Categoria *</Label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex: Diária, Alimentação, Manutenção"
            required
          />
        </div>
        <div>
          <Label>Descrição</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição da transação"
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </>
  );
}
