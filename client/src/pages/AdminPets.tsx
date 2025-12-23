import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dog, Plus, Edit, Trash2, CheckCircle2, XCircle, Download, Eye } from "lucide-react";
import { Link } from "wouter";
import { downloadCSV, formatPetsForExport } from "@/lib/exportUtils";
import { SearchAndFilter } from "@/components/SearchAndFilter";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";

export default function AdminPets() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any>(null);

  const { data: pets, isLoading, refetch } = trpc.pets.list.useQuery();
  const utils = trpc.useUtils();

  const createPet = trpc.pets.create.useMutation({
    onSuccess: () => {
      toast.success("Pet cadastrado com sucesso!");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar pet: " + error.message);
    },
  });

  const updatePet = trpc.pets.updateAdmin.useMutation({
    onSuccess: () => {
      toast.success("Pet atualizado com sucesso!");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar pet: " + error.message);
    },
  });

  const deletePet = trpc.pets.delete.useMutation({
    onSuccess: () => {
      toast.success("Pet removido com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao remover pet: " + error.message);
    },
  });

  const checkIn = trpc.pets.checkIn.useMutation({
    onSuccess: () => {
      toast.success("Check-in realizado!");
      refetch();
    },
  });

  const checkOut = trpc.pets.checkOut.useMutation({
    onSuccess: () => {
      toast.success("Check-out realizado!");
      refetch();
    },
  });

  const filteredPets = pets?.filter((pet) => {
    const matchesSearch = pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.breed?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || pet.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleCreatePet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPet.mutate({
      name: formData.get("name") as string,
      breed: formData.get("breed") as string || undefined,
      age: formData.get("age") as string || undefined,
      weight: formData.get("weight") ? Number(formData.get("weight")) : undefined,
      foodBrand: formData.get("foodBrand") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleUpdatePet = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPet) return;
    const formData = new FormData(e.currentTarget);
    updatePet.mutate({
      id: selectedPet.id,
      name: formData.get("name") as string,
      breed: formData.get("breed") as string || undefined,
      age: formData.get("age") as string || undefined,
      weight: formData.get("weight") ? Number(formData.get("weight")) : undefined,
      foodBrand: formData.get("foodBrand") as string || undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleDelete = (petId: number, petName: string) => {
    if (confirm(`Tem certeza que deseja remover ${petName}?`)) {
      deletePet.mutate({ id: petId });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Pets</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os pets cadastrados na creche
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (filteredPets.length === 0) {
                toast.error("Nenhum pet para exportar");
                return;
              }
              downloadCSV(formatPetsForExport(filteredPets), `pets_${new Date().toISOString().split('T')[0]}`);
              toast.success("Lista de pets exportada com sucesso!");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Novo Pet
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <SearchAndFilter
            searchPlaceholder="Buscar por nome ou raça..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={[
              {
                label: "Status",
                value: statusFilter,
                options: [
                  { label: "Todos", value: "all" },
                  { label: "Na Creche", value: "checked-in" },
                  { label: "Fora da Creche", value: "checked-out" },
                ],
                onChange: setStatusFilter,
              },
            ]}
            onClearFilters={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          />
        </CardContent>
      </Card>

      {/* Pets Grid */}
      {filteredPets.length === 0 ? (
        <Card>
          <CardContent className="empty-state">
            <Dog className="empty-state-icon" />
            <p className="empty-state-title">Nenhum pet encontrado</p>
            <p className="empty-state-description">
              {searchQuery
                ? "Tente ajustar sua busca"
                : "Cadastre o primeiro pet para começar"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPets.map((pet) => (
            <Card key={pet.id} className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
                      {pet.photoUrl ? (
                        <img
                          src={pet.photoUrl}
                          alt={pet.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        pet.name[0]
                      )}
                    </div>
                    <div>
                      <Link href={`/admin/pets/${pet.id}`}>
                        <CardTitle className="text-lg hover:underline cursor-pointer">{pet.name}</CardTitle>
                      </Link>
                      <CardDescription>{pet.breed || "Sem raça"}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    className={
                      pet.status === "checked-in"
                        ? "badge-checked-in"
                        : "badge-checked-out"
                    }
                  >
                    {pet.status === "checked-in" ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Na creche
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Em casa
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Idade</p>
                    <p className="font-medium">{pet.age || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peso</p>
                    <p className="font-medium">
                      {pet.weight ? `${(pet.weight / 1000).toFixed(1)}kg` : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {pet.status === "checked-out" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => checkIn.mutate({ petId: pet.id })}
                      disabled={checkIn.isPending}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Check-in
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => checkOut.mutate({ petId: pet.id })}
                      disabled={checkOut.isPending}
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Check-out
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedPet(pet);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(pet.id, pet.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Pet Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreatePet}>
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Pet</DialogTitle>
              <DialogDescription>
                Preencha as informações básicas do pet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Raça</Label>
                <Input id="breed" name="breed" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Idade</Label>
                  <Input id="age" name="age" placeholder="Ex: 2a 3m" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (gramas)</Label>
                  <Input id="weight" name="weight" type="number" placeholder="Ex: 32500" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="foodBrand">Marca de Ração</Label>
                <Input id="foodBrand" name="foodBrand" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPet.isPending}>
                {createPet.isPending ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Pet Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdatePet}>
            <DialogHeader>
              <DialogTitle>Editar Pet</DialogTitle>
              <DialogDescription>
                Atualize as informações do pet
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={selectedPet?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-breed">Raça</Label>
                <Input id="edit-breed" name="breed" defaultValue={selectedPet?.breed || ""} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-age">Idade</Label>
                  <Input id="edit-age" name="age" defaultValue={selectedPet?.age || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight">Peso (gramas)</Label>
                  <Input
                    id="edit-weight"
                    name="weight"
                    type="number"
                    defaultValue={selectedPet?.weight || ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-foodBrand">Marca de Ração</Label>
                <Input
                  id="edit-foodBrand"
                  name="foodBrand"
                  defaultValue={selectedPet?.foodBrand || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Observações</Label>
                <Textarea
                  id="edit-notes"
                  name="notes"
                  rows={3}
                  defaultValue={selectedPet?.notes || ""}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updatePet.isPending}>
                {updatePet.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
}
