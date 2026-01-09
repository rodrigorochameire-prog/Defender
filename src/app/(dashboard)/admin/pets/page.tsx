"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dog, 
  Check, 
  X, 
  Search,
  Filter,
  PawPrint,
  Clock,
  CheckCircle2,
  CreditCard,
  Calendar,
  Eye,
  MoreVertical,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Edit,
  Trash2,
  Save,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { LoadingPage } from "@/components/shared/loading";
import { BreedIcon } from "@/components/breed-icons";
import { DOG_BREEDS } from "@/lib/breeds";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";

export default function AdminPetsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: pets, isLoading } = trpc.pets.list.useQuery();
  const { data: pendingPets } = trpc.pets.pending.useQuery();
  const { data: tutors } = trpc.users.tutors.useQuery();

  const approveMutation = trpc.pets.approve.useMutation({
    onSuccess: () => {
      toast.success("Pet aprovado com sucesso!");
      utils.pets.list.invalidate();
      utils.pets.pending.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = trpc.pets.reject.useMutation({
    onSuccess: () => {
      toast.success("Pet rejeitado");
      utils.pets.list.invalidate();
      utils.pets.pending.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createPetMutation = trpc.pets.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Pet criado com sucesso!");
      setIsCreateOpen(false);
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updatePetMutation = trpc.pets.adminUpdate.useMutation({
    onSuccess: () => {
      toast.success("Pet atualizado com sucesso!");
      setIsEditOpen(false);
      setSelectedPet(null);
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deletePetMutation = trpc.pets.adminDelete.useMutation({
    onSuccess: () => {
      toast.success("Pet excluído com sucesso!");
      setIsDeleteConfirmOpen(false);
      setSelectedPet(null);
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const addCreditsMutation = trpc.pets.addCredits.useMutation({
    onSuccess: () => {
      toast.success("Créditos adicionados!");
      utils.pets.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  // Filtered pets
  const filteredPets = useMemo(() => {
    if (!pets) return [];
    return pets.filter((pet) => {
      const matchesSearch = 
        pet.name.toLowerCase().includes(search.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || pet.approvalStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pets, search, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!pets) return { total: 0, approved: 0, pending: 0, totalCredits: 0 };
    return {
      total: pets.length,
      approved: pets.filter(p => p.approvalStatus === "approved").length,
      pending: pets.filter(p => p.approvalStatus === "pending").length,
      totalCredits: pets.reduce((sum, p) => sum + (p.credits || 0), 0),
    };
  }, [pets]);

  const handleCreatePet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const tutorIdValue = formData.get("tutorId") as string;
    createPetMutation.mutate({
      name: formData.get("name") as string,
      species: "dog",
      breed: formData.get("breed") as string || undefined,
      birthDate: formData.get("birthDate") as string || undefined,
      weight: formData.get("weight") ? parseFloat(formData.get("weight") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
      tutorId: tutorIdValue && tutorIdValue !== "none" ? parseInt(tutorIdValue) : undefined,
      credits: formData.get("credits") ? parseInt(formData.get("credits") as string) : 0,
      approvalStatus: "approved",
    });
  };

  const handleUpdatePet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPet) return;
    const formData = new FormData(e.currentTarget);
    updatePetMutation.mutate({
      id: selectedPet.id,
      name: formData.get("name") as string,
      breed: formData.get("breed") as string || undefined,
      birthDate: formData.get("birthDate") as string || undefined,
      weight: formData.get("weight") ? parseFloat(formData.get("weight") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
      credits: formData.get("credits") ? parseInt(formData.get("credits") as string) : undefined,
      approvalStatus: (formData.get("approvalStatus") as "pending" | "approved" | "rejected") || undefined,
    });
  };

  const handleQuickAddCredits = (petId: number, amount: number) => {
    addCreditsMutation.mutate({ petId, credits: amount });
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <PawPrint />
          </div>
          <div className="page-header-info">
            <h1>Gestão de Pets</h1>
            <p>Gerencie todos os pets cadastrados</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="btn-sm btn-primary">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Pet
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total</span>
            <PawPrint className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{stats.total}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Aprovados</span>
            <CheckCircle2 className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{stats.approved}</div>
        </div>

        <div className={`stat-card ${stats.pending > 0 ? 'highlight' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Pendentes</span>
            <Clock className={`stat-card-icon ${stats.pending > 0 ? 'amber' : 'muted'}`} />
          </div>
          <div className="stat-card-value">{stats.pending}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Créditos Totais</span>
            <CreditCard className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{stats.totalCredits}</div>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingPets && pendingPets.length > 0 && (
        <div className="section-card border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10">
          <div className="section-card-header">
            <div className="section-card-title">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Aguardando Aprovação ({pendingPets.length})
            </div>
          </div>
          <div className="section-card-content">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pendingPets.slice(0, 6).map((pet) => (
                <div key={pet.id} className="flex items-center justify-between p-3 bg-card rounded-xl border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Dog className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{pet.name}</p>
                      <p className="text-xs text-muted-foreground">{pet.breed || "Sem raça"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ id: pet.id })}
                      className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate({ id: pet.id })}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou raça..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pets Grid */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-card-title">
            <Dog />
            Todos os Pets
            <Badge variant="secondary" className="ml-2">{filteredPets.length}</Badge>
          </div>
        </div>
        <div className="section-card-content">
          {filteredPets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Dog /></div>
              <p className="empty-state-text">Nenhum pet encontrado</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredPets.map((pet) => (
                <div key={pet.id} className="p-5 rounded-[14px] bg-card hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.06),0_2px_4px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.04)] transition-all duration-300 ease group border-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.03),0_1px_3px_0_rgba(0,0,0,0.05),0_2px_6px_0_rgba(0,0,0,0.02)] hover:translate-y-[-2px]">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <BreedIcon breed={pet.breed} className="h-14 w-14" />
                      <div className="flex-1 min-w-0">
                        <p className="pet-card-name font-bold text-base text-foreground leading-tight">{pet.name}</p>
                        <p className="pet-card-breed text-sm font-medium text-[hsl(220_13%_45%)] mt-0.5 leading-tight">{pet.breed || "Sem raça"}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedPet(pet); setIsDetailOpen(true); }}>
                          <Eye className="h-4 w-4 mr-2" /> Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedPet(pet); setIsEditOpen(true); }}>
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleQuickAddCredits(pet.id, 5)}>
                          <CreditCard className="h-4 w-4 mr-2" /> +5 Créditos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuickAddCredits(pet.id, 10)}>
                          <CreditCard className="h-4 w-4 mr-2" /> +10 Créditos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {pet.approvalStatus !== "approved" && (
                          <DropdownMenuItem onClick={() => approveMutation.mutate({ id: pet.id })}>
                            <Check className="h-4 w-4 mr-2 text-green-500" /> Aprovar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => { setSelectedPet(pet); setIsDeleteConfirmOpen(true); }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge className={
                      pet.approvalStatus === "approved" ? "badge-success" :
                      pet.approvalStatus === "pending" ? "badge-warning" : "badge-error"
                    }>
                      {pet.approvalStatus === "approved" ? "Aprovado" :
                       pet.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
                    </Badge>
                    <div className="flex items-center gap-1.5 pet-card-credits text-sm">
                      <CreditCard className="h-4 w-4 text-[hsl(220_13%_45%)]" />
                      <span className="font-semibold text-[hsl(220_16%_38%)]">{pet.credits}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Pet Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Pet</DialogTitle>
            <DialogDescription>Cadastre um pet diretamente no sistema</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePet} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Raça</Label>
                <Select name="breed">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a raça" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOG_BREEDS.map((breed) => (
                      <SelectItem key={breed.value} value={breed.value}>
                        {breed.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input id="birthDate" name="birthDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input id="weight" name="weight" type="number" step="0.1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tutorId">Tutor</Label>
                <Select name="tutorId">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar tutor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem tutor</SelectItem>
                    {tutors?.map((tutor) => (
                      <SelectItem key={tutor.id} value={tutor.id.toString()}>
                        {tutor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Créditos Iniciais</Label>
                <Input id="credits" name="credits" type="number" defaultValue="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPetMutation.isPending}>
                {createPetMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Pet Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Pet</DialogTitle>
            <DialogDescription>Atualize as informações do pet</DialogDescription>
          </DialogHeader>
          {selectedPet && (
            <form onSubmit={handleUpdatePet} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome *</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedPet.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-breed">Raça</Label>
                  <Select name="breed" defaultValue={selectedPet.breed || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a raça" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOG_BREEDS.map((breed) => (
                        <SelectItem key={breed.value} value={breed.value}>
                          {breed.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
                  <Input id="edit-birthDate" name="birthDate" type="date" defaultValue={selectedPet.birthDate ? new Date(selectedPet.birthDate).toISOString().split("T")[0] : ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">Peso (kg)</Label>
                  <Input id="edit-weight" name="weight" type="number" step="0.1" defaultValue={selectedPet.weight || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-credits">Créditos</Label>
                  <Input id="edit-credits" name="credits" type="number" defaultValue={selectedPet.credits || 0} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select name="approvalStatus" defaultValue={selectedPet.approvalStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Aprovado</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="rejected">Rejeitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Observações</Label>
                <Textarea id="edit-notes" name="notes" rows={2} defaultValue={selectedPet.notes || ""} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updatePetMutation.isPending}>
                  {updatePetMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o pet &quot;{selectedPet?.name}&quot;? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedPet && deletePetMutation.mutate({ id: selectedPet.id })}
              disabled={deletePetMutation.isPending}
            >
              {deletePetMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pet Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-primary" />
              {selectedPet?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedPet && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Raça</p>
                  <p className="font-medium">{selectedPet.breed || "Não informada"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Espécie</p>
                  <p className="font-medium">Cachorro</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Nascimento</p>
                  <p className="font-medium">{selectedPet.birthDate ? formatDate(selectedPet.birthDate) : "Não informado"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Peso</p>
                  <p className="font-medium">{selectedPet.weight ? `${selectedPet.weight} kg` : "Não informado"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Créditos</p>
                  <p className="font-medium">{selectedPet.credits}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                  <Badge className={
                    selectedPet.approvalStatus === "approved" ? "badge-green" :
                    selectedPet.approvalStatus === "pending" ? "badge-amber" : "badge-rose"
                  }>
                    {selectedPet.approvalStatus === "approved" ? "Aprovado" :
                     selectedPet.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
                  </Badge>
                </div>
              </div>
              {selectedPet.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Observações</p>
                  <p className="text-sm mt-1">{selectedPet.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setIsDetailOpen(false); setIsEditOpen(true); }}>
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button className="flex-1" onClick={() => handleQuickAddCredits(selectedPet.id, 10)}>
                  <CreditCard className="h-4 w-4 mr-2" /> +10 Créditos
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
