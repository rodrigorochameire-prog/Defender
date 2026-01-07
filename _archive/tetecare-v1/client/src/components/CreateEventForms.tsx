import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Syringe, Pill, LogIn, TrendingUp, TrendingDown, AlertCircle, CreditCard } from "lucide-react";

type EventType = "vaccine" | "medication" | "checkin" | "payment-income" | "payment-expense";

interface CreateEventFormsProps {
  open: boolean;
  onClose: () => void;
  eventType: EventType | null;
  selectedDate: Date | null;
  onSuccess: () => void;
}

export function CreateEventForms({ open, onClose, eventType, selectedDate, onSuccess }: CreateEventFormsProps) {
  if (!eventType) return null;

  switch (eventType) {
    case "vaccine":
      return <CreateVaccinationForm open={open} onClose={onClose} selectedDate={selectedDate} onSuccess={onSuccess} />;
    case "medication":
      return <CreateMedicationForm open={open} onClose={onClose} selectedDate={selectedDate} onSuccess={onSuccess} />;
    case "checkin":
      return <CreateBookingForm open={open} onClose={onClose} selectedDate={selectedDate} onSuccess={onSuccess} />;
    case "payment-income":
    case "payment-expense":
      return <CreateTransactionForm open={open} onClose={onClose} selectedDate={selectedDate} type={eventType === "payment-income" ? "income" : "expense"} onSuccess={onSuccess} />;
    default:
      return null;
  }
}

// ===== CREATE VACCINATION FORM =====

function CreateVaccinationForm({ open, onClose, selectedDate, onSuccess }: Omit<CreateEventFormsProps, "eventType">) {
  const [petId, setPetId] = useState<number | null>(null);
  const [vaccineId, setVaccineId] = useState<number | null>(null);
  const [applicationDate, setApplicationDate] = useState(selectedDate ? selectedDate.toISOString().split('T')[0] : "");
  const [nextDueDate, setNextDueDate] = useState("");
  const [veterinarian, setVeterinarian] = useState("");
  const [clinic, setClinic] = useState("");
  const [notes, setNotes] = useState("");

  const { data: pets } = trpc.pets.list.useQuery();
  const { data: vaccines } = trpc.vaccines.library.useQuery();

  const createMutation = trpc.healthCalendar.createVaccination.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error) => {
      alert(`Erro ao criar vacinação: ${error.message}`);
    },
  });

  const resetForm = () => {
    setPetId(null);
    setVaccineId(null);
    setApplicationDate(selectedDate ? selectedDate.toISOString().split('T')[0] : "");
    setNextDueDate("");
    setVeterinarian("");
    setClinic("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || !vaccineId || !applicationDate) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      petId,
      vaccineId,
      applicationDate: new Date(applicationDate),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
      veterinarian: veterinarian || undefined,
      clinic: clinic || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            Nova Vacinação
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pet">Pet *</Label>
            <select
              id="pet"
              className="w-full p-2 border rounded-lg mt-1"
              value={petId || ""}
              onChange={(e) => setPetId(Number(e.target.value))}
              required
            >
              <option value="">Selecione um pet</option>
              {pets?.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="vaccine">Vacina *</Label>
            <select
              id="vaccine"
              className="w-full p-2 border rounded-lg mt-1"
              value={vaccineId || ""}
              onChange={(e) => setVaccineId(Number(e.target.value))}
              required
            >
              <option value="">Selecione uma vacina</option>
              {vaccines?.map((vaccine) => (
                <option key={vaccine.id} value={vaccine.id}>
                  {vaccine.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="applicationDate">Data de Aplicação *</Label>
            <Input
              id="applicationDate"
              type="date"
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="nextDueDate">Próxima Dose</Label>
            <Input
              id="nextDueDate"
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="veterinarian">Veterinário</Label>
            <Input
              id="veterinarian"
              value={veterinarian}
              onChange={(e) => setVeterinarian(e.target.value)}
              placeholder="Nome do veterinário"
            />
          </div>

          <div>
            <Label htmlFor="clinic">Clínica</Label>
            <Input
              id="clinic"
              value={clinic}
              onChange={(e) => setClinic(e.target.value)}
              placeholder="Nome da clínica"
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Vacinação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== CREATE MEDICATION FORM =====

function CreateMedicationForm({ open, onClose, selectedDate, onSuccess }: Omit<CreateEventFormsProps, "eventType">) {
  const [petId, setPetId] = useState<number | null>(null);
  const [medicationId, setMedicationId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(selectedDate ? selectedDate.toISOString().split('T')[0] : "");
  const [endDate, setEndDate] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [notes, setNotes] = useState("");

  const { data: pets } = trpc.pets.list.useQuery();
  const { data: medications } = trpc.medications.library.useQuery();

  const createMutation = trpc.healthCalendar.createMedication.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error) => {
      alert(`Erro ao criar medicamento: ${error.message}`);
    },
  });

  const resetForm = () => {
    setPetId(null);
    setMedicationId(null);
    setStartDate(selectedDate ? selectedDate.toISOString().split('T')[0] : "");
    setEndDate("");
    setDosage("");
    setFrequency("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || !medicationId || !startDate || !dosage || !frequency) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    createMutation.mutate({
      petId,
      medicationId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      dosage,
      frequency,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Novo Medicamento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pet">Pet *</Label>
            <select
              id="pet"
              className="w-full p-2 border rounded-lg mt-1"
              value={petId || ""}
              onChange={(e) => setPetId(Number(e.target.value))}
              required
            >
              <option value="">Selecione um pet</option>
              {pets?.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="medication">Medicamento *</Label>
            <select
              id="medication"
              className="w-full p-2 border rounded-lg mt-1"
              value={medicationId || ""}
              onChange={(e) => setMedicationId(Number(e.target.value))}
              required
            >
              <option value="">Selecione um medicamento</option>
              {medications?.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Data Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dosage">Dosagem *</Label>
            <Input
              id="dosage"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="Ex: 1 comprimido"
              required
            />
          </div>

          <div>
            <Label htmlFor="frequency">Frequência *</Label>
            <Input
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="Ex: 2x ao dia"
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Medicamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== CREATE BOOKING FORM =====

function CreateBookingForm({ open, onClose, selectedDate, onSuccess }: Omit<CreateEventFormsProps, "eventType">) {
  const [petId, setPetId] = useState<number | null>(null);
  const [tutorId, setTutorId] = useState<number | null>(null);
  const [bookingDate, setBookingDate] = useState(selectedDate ? selectedDate.toISOString().split('T')[0] : "");
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [notes, setNotes] = useState("");

  const { data: pets } = trpc.pets.list.useQuery();
  const { data: tutors } = trpc.tutors.list.useQuery({ page: 1, limit: 100 });

  // Get credits for selected pet
  const { data: creditBalance } = trpc.credits.getBalance.useQuery(
    { petId: petId! },
    { enabled: !!petId }
  );

  const totalCredits = creditBalance || 0;
  const hasEnoughCredits = totalCredits >= numberOfDays;

  const createMutation = trpc.healthCalendar.createBooking.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error) => {
      alert(`Erro ao criar check-in: ${error.message}`);
    },
  });

  const resetForm = () => {
    setPetId(null);
    setTutorId(null);
    setBookingDate(selectedDate ? selectedDate.toISOString().split('T')[0] : "");
    setNumberOfDays(1);
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || !tutorId || !bookingDate) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    if (!hasEnoughCredits) {
      alert(`Créditos insuficientes! O pet tem ${totalCredits} créditos disponíveis, mas precisa de ${numberOfDays}.`);
      return;
    }

    createMutation.mutate({
      petId,
      tutorId,
      bookingDate: new Date(bookingDate),
      numberOfDays,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Novo Check-in
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pet">Pet *</Label>
            <select
              id="pet"
              className="w-full p-2 border rounded-lg mt-1"
              value={petId || ""}
              onChange={(e) => setPetId(Number(e.target.value))}
              required
            >
              <option value="">Selecione um pet</option>
              {pets?.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
          </div>

          {petId && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Créditos Disponíveis</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-600">{totalCredits}</span>
                {!hasEnoughCredits && numberOfDays > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Insuficiente
                  </Badge>
                )}
                {hasEnoughCredits && numberOfDays > 0 && (
                  <Badge className="bg-green-500">
                    Suficiente
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="tutor">Tutor *</Label>
            <select
              id="tutor"
              className="w-full p-2 border rounded-lg mt-1"
              value={tutorId || ""}
              onChange={(e) => setTutorId(Number(e.target.value))}
              required
            >
              <option value="">Selecione um tutor</option>
              {tutors?.tutors?.map((tutor: any) => (
                <option key={tutor.id} value={tutor.id}>
                  {tutor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="bookingDate">Data de Check-in *</Label>
            <Input
              id="bookingDate"
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="numberOfDays">Número de Dias *</Label>
            <Input
              id="numberOfDays"
              type="number"
              min="1"
              value={numberOfDays}
              onChange={(e) => setNumberOfDays(Number(e.target.value))}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Consumirá {numberOfDays} {numberOfDays === 1 ? "crédito" : "créditos"}
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre a estadia"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !hasEnoughCredits}>
              {createMutation.isPending ? "Criando..." : "Criar Check-in"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== CREATE TRANSACTION FORM =====

interface CreateTransactionFormProps extends Omit<CreateEventFormsProps, "eventType"> {
  type: "income" | "expense";
}

function CreateTransactionForm({ open, onClose, selectedDate, type, onSuccess }: CreateTransactionFormProps) {
  const [petId, setPetId] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(selectedDate ? selectedDate.toISOString().split('T')[0] : "");

  const { data: pets } = trpc.pets.list.useQuery();

  const createMutation = trpc.healthCalendar.createTransaction.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (error) => {
      alert(`Erro ao criar transação: ${error.message}`);
    },
  });

  const resetForm = () => {
    setPetId(null);
    setCategory("");
    setDescription("");
    setAmount("");
    setTransactionDate(selectedDate ? selectedDate.toISOString().split('T')[0] : "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !description || !amount || !transactionDate) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    const amountInCents = Math.round(parseFloat(amount) * 100);

    createMutation.mutate({
      petId: petId || undefined,
      type,
      category,
      description,
      amount: amountInCents,
      transactionDate: new Date(transactionDate),
    });
  };

  const Icon = type === "income" ? TrendingUp : TrendingDown;
  const title = type === "income" ? "Nova Receita" : "Nova Despesa";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pet">Pet (opcional)</Label>
            <select
              id="pet"
              className="w-full p-2 border rounded-lg mt-1"
              value={petId || ""}
              onChange={(e) => setPetId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Nenhum (geral)</option>
              {pets?.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="category">Categoria *</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={type === "income" ? "Ex: Mensalidade" : "Ex: Alimentação"}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da transação"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Valor (R$) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="transactionDate">Data *</Label>
            <Input
              id="transactionDate"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : `Criar ${type === "income" ? "Receita" : "Despesa"}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
