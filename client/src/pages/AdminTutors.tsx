import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Edit, Link as LinkIcon, Unlink, Phone, Mail, Calendar, User, Dog } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Tutor {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: "user" | "admin";
  createdAt: Date;
  lastSignedIn: Date;
}

interface TutorDetails extends Tutor {
  linkedPets: Array<{
    petId: number;
    petName: string | null;
    petBreed: string | null;
    petPhotoUrl: string | null;
    isPrimary: boolean;
    linkedAt: Date;
  }>;
}

export default function AdminTutors() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedTutor, setSelectedTutor] = useState<TutorDetails | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [linkPetDialogOpen, setLinkPetDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);

  const { data, isLoading, refetch } = trpc.tutors.list.useQuery({
    page,
    limit: 20,
    search: search || undefined,
  });

  const { data: allPets } = trpc.pets.list.useQuery();

  const tutorDetailsQuery = trpc.tutors.getById.useQuery(
    { tutorId: selectedTutor?.id || 0 },
    { enabled: !!selectedTutor && editDialogOpen }
  );

  const updateMutation = trpc.tutors.update.useMutation({
    onSuccess: () => {
      toast.success("Tutor atualizado com sucesso!");
      setEditDialogOpen(false);
      refetch();
      if (selectedTutor) {
        tutorDetailsQuery.refetch();
      }
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar tutor: ${error.message}`);
    },
  });

  const linkPetMutation = trpc.tutors.linkPet.useMutation({
    onSuccess: () => {
      toast.success("Pet vinculado com sucesso!");
      setLinkPetDialogOpen(false);
      setSelectedPetId(null);
      setIsPrimaryContact(false);
      tutorDetailsQuery.refetch();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao vincular pet: ${error.message}`);
    },
  });

  const unlinkPetMutation = trpc.tutors.unlinkPet.useMutation({
    onSuccess: () => {
      toast.success("Pet desvinculado com sucesso!");
      tutorDetailsQuery.refetch();
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao desvincular pet: ${error.message}`);
    },
  });

  const handleEditTutor = (tutor: Tutor) => {
    setEditForm({
      name: tutor.name || "",
      email: tutor.email || "",
      phone: tutor.phone || "",
    });
    setSelectedTutor(tutor as TutorDetails);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTutor) return;

    updateMutation.mutate({
      tutorId: selectedTutor.id,
      ...editForm,
    });
  };

  const handleLinkPet = () => {
    if (!selectedTutor || !selectedPetId) return;

    linkPetMutation.mutate({
      tutorId: selectedTutor.id,
      petId: selectedPetId,
      isPrimary: isPrimaryContact,
    });
  };

  const handleUnlinkPet = (petId: number) => {
    if (!selectedTutor) return;

    if (confirm("Tem certeza que deseja desvincular este pet do tutor?")) {
      unlinkPetMutation.mutate({
        tutorId: selectedTutor.id,
        petId,
      });
    }
  };

  const tutorDetails = tutorDetailsQuery.data as TutorDetails | undefined;
  const availablePets = allPets?.filter(
    (pet) => !tutorDetails?.linkedPets.some((linked) => linked.petId === pet.id)
  ) || [];

  return (
    <AdminLayout>
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Tutores</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie tutores, vincule pets e atualize informações de contato
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Tutores</p>
              <p className="text-2xl font-bold">{data?.total || 0}</p>
            </div>
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou telefone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Tutors List */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando tutores...</div>
        ) : data?.tutors.length === 0 ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum tutor encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.tutors.map((tutor) => (
              <div
                key={tutor.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                    {tutor.name?.[0] || "T"}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold">{tutor.name || "Sem nome"}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {tutor.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {tutor.email}
                        </div>
                      )}
                      {tutor.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {tutor.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Cadastrado em {format(new Date(tutor.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTutor(tutor)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Mostrando {(page - 1) * 20 + 1} a {Math.min(page * 20, data.total)} de {data.total} tutores
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 20 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Tutor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Nome do tutor"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefone (WhatsApp)</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+55 11 99999-9999"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Usado para enviar lembretes automáticos de saúde
              </p>
            </div>

            {tutorDetailsQuery.isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Carregando pets...</div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Pets Vinculados</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLinkPetDialogOpen(true)}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Vincular Pet
                  </Button>
                </div>
                <div className="mt-2 space-y-2">
                  {!tutorDetails?.linkedPets || tutorDetails.linkedPets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum pet vinculado</p>
                  ) : (
                    tutorDetails.linkedPets.map((pet) => (
                      <div
                        key={pet.petId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Dog className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{pet.petName}</p>
                            {pet.petBreed && (
                              <p className="text-xs text-muted-foreground">{pet.petBreed}</p>
                            )}
                          </div>
                          {pet.isPrimary && (
                            <Badge variant="secondary" className="text-xs">
                              Contato Principal
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnlinkPet(pet.petId)}
                          disabled={unlinkPetMutation.isPending}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Pet Dialog */}
      <Dialog open={linkPetDialogOpen} onOpenChange={setLinkPetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Pet ao Tutor</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="pet">Selecione o Pet</Label>
              <select
                id="pet"
                className="w-full p-2 border rounded-lg"
                value={selectedPetId || ""}
                onChange={(e) => setSelectedPetId(Number(e.target.value))}
              >
                <option value="">Selecione um pet...</option>
                {availablePets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} {pet.breed ? `- ${pet.breed}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimaryContact}
                onChange={(e) => setIsPrimaryContact(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Definir como contato principal do pet
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              O contato principal receberá lembretes de saúde via WhatsApp
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLinkPetDialogOpen(false);
                setSelectedPetId(null);
                setIsPrimaryContact(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLinkPet}
              disabled={!selectedPetId || linkPetMutation.isPending}
            >
              {linkPetMutation.isPending ? "Vinculando..." : "Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
