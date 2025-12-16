import TutorLayout from "@/components/TutorLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dog, Calendar, Activity, ArrowRight, PlusCircle, Weight, CheckCircle, Clock, XCircle, Camera } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation } from "wouter";

export default function TutorPets() {
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    age: "",
    weight: "",
    birthDate: "",
    foodBrand: "",
    foodAmount: "",
    notes: "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [editingPet, setEditingPet] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: pets, isLoading } = trpc.pets.listMine.useQuery();

  const createPet = trpc.pets.create.useMutation({
    onSuccess: async (data) => {
      // Upload photo if provided
      if (photoFile && data.id) {
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result?.toString().split(",")[1];
            if (base64) {
              await uploadPhoto.mutateAsync({
                petId: data.id,
                fileName: photoFile.name,
                fileContent: base64,
                mimeType: photoFile.type,
              });
            }
          };
          reader.readAsDataURL(photoFile);
        } catch (error) {
          console.error("Erro ao fazer upload da foto:", error);
        }
      }
      
      toast.success("Pet cadastrado com sucesso! Aguardando aprova\u00e7\u00e3o da creche.");
      setIsDialogOpen(false);
      setFormData({
        name: "",
        breed: "",
        age: "",
        weight: "",
        birthDate: "",
        foodBrand: "",
        foodAmount: "",
        notes: "",
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      utils.pets.listMine.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar pet: ${error.message}`);
    },
  });

  const uploadPhoto = trpc.pets.uploadPhoto.useMutation();

  const updatePet = trpc.pets.updateMine.useMutation({
    onSuccess: () => {
      toast.success("Pet atualizado com sucesso! Aguardando nova aprova\u00e7\u00e3o.");
      setIsDialogOpen(false);
      setEditingPet(null);
      setFormData({
        name: "",
        breed: "",
        age: "",
        weight: "",
        birthDate: "",
        foodBrand: "",
        foodAmount: "",
        notes: "",
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      utils.pets.listMine.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar pet: ${error.message}`);
    },
  });

  const handleEdit = (pet: any) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      breed: pet.breed || "",
      age: pet.age || "",
      weight: pet.weight ? (pet.weight / 1000).toString() : "",
      birthDate: pet.birthDate ? new Date(pet.birthDate).toISOString().split("T")[0] : "",
      foodBrand: pet.foodBrand || "",
      foodAmount: pet.foodAmount ? pet.foodAmount.toString() : "",
      notes: pet.notes || "",
    });
    setPhotoPreview(pet.photoUrl || null);
    setIsDialogOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande. M\u00e1ximo 5MB.");
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Apenas imagens s\u00e3o permitidas.");
        return;
      }
      
      setPhotoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Nome do pet \u00e9 obrigat\u00f3rio");
      return;
    }

    if (editingPet) {
      // Update existing pet
      updatePet.mutate({
        id: editingPet.id,
        name: formData.name,
        breed: formData.breed || undefined,
        age: formData.age || undefined,
        weight: formData.weight ? parseInt(formData.weight) * 1000 : undefined,
        birthDate: formData.birthDate || undefined,
        foodBrand: formData.foodBrand || undefined,
        foodAmount: formData.foodAmount ? parseInt(formData.foodAmount) : undefined,
        notes: formData.notes || undefined,
      });
    } else {
      // Create new pet
      createPet.mutate({
        name: formData.name,
        breed: formData.breed || undefined,
        age: formData.age || undefined,
        weight: formData.weight ? parseInt(formData.weight) * 1000 : undefined,
        birthDate: formData.birthDate || undefined,
        foodBrand: formData.foodBrand || undefined,
        foodAmount: formData.foodAmount ? parseInt(formData.foodAmount) : undefined,
        notes: formData.notes || undefined,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-700 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Aguardando
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-700 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <TutorLayout>
        <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando seus pets...</p>
          </div>
        </div>
      </TutorLayout>
    );
  }

  if (!pets || pets.length === 0) {
    return (
      <TutorLayout>
        <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Meus Pets</h1>
              <p className="text-muted-foreground mt-2">Cadastre seus pets para utilizar os serviços da creche</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Cadastrar Pet
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPet ? "Editar Pet" : "Cadastrar Novo Pet"}</DialogTitle>
                  <DialogDescription>
                    {editingPet
                      ? "Atualize as informa\u00e7\u00f5es do seu pet. Ap\u00f3s a edi\u00e7\u00e3o, o pet ser\u00e1 submetido para nova aprova\u00e7\u00e3o."
                      : "Preencha as informa\u00e7\u00f5es do seu pet. Ap\u00f3s o cadastro, aguarde a aprova\u00e7\u00e3o da creche."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="photo">Foto do Pet</Label>
                    <div className="flex items-center gap-4">
                      {photoPreview ? (
                        <div className="relative">
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="h-24 w-24 rounded-full object-cover border-2 border-border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => {
                              setPhotoFile(null);
                              setPhotoPreview(null);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ) : (
                        <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <Input
                          id="photo"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          M\u00e1ximo 5MB. Formatos: JPG, PNG, WEBP
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Pet *</Label>
                      <Input id="name" placeholder="Ex: Rex" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="breed">Raça</Label>
                      <Input id="breed" placeholder="Ex: Golden Retriever" value={formData.breed} onChange={(e) => setFormData({ ...formData, breed: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age">Idade</Label>
                      <Input id="age" placeholder="Ex: 2 anos 3 meses" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Data de Nascimento</Label>
                      <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input id="weight" type="number" step="0.1" placeholder="Ex: 32.5" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="foodBrand">Marca da Ração</Label>
                      <Input id="foodBrand" placeholder="Ex: Premier Golden" value={formData.foodBrand} onChange={(e) => setFormData({ ...formData, foodBrand: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="foodAmount">Quantidade Diária (g)</Label>
                      <Input id="foodAmount" type="number" placeholder="Ex: 300" value={formData.foodAmount} onChange={(e) => setFormData({ ...formData, foodAmount: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea id="notes" placeholder="Informações adicionais sobre o pet" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createPet.isPending}>{createPet.isPending ? "Cadastrando..." : "Cadastrar Pet"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="empty-state">
              <Dog className="empty-state-icon" />
              <p className="empty-state-title">Nenhum pet cadastrado</p>
              <p className="empty-state-description">Cadastre seu primeiro pet para começar a utilizar os serviços da creche</p>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2 mt-4">
                <PlusCircle className="h-5 w-5" />
                Cadastrar Primeiro Pet
              </Button>
            </CardContent>
          </Card>
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Meus Pets</h1>
            <p className="text-muted-foreground mt-2">Gerencie e acompanhe a saúde dos seus pets</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2">
                <PlusCircle className="h-5 w-5" />
                Cadastrar Pet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Pet</DialogTitle>
                <DialogDescription>
                  Preencha as informações do seu pet. Após o cadastro, aguarde a aprovação da creche.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Pet *</Label>
                    <Input id="name" placeholder="Ex: Rex" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breed">Raça</Label>
                    <Input id="breed" placeholder="Ex: Golden Retriever" value={formData.breed} onChange={(e) => setFormData({ ...formData, breed: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Idade</Label>
                    <Input id="age" placeholder="Ex: 2 anos 3 meses" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input id="weight" type="number" step="0.1" placeholder="Ex: 32.5" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="foodBrand">Marca da Ração</Label>
                    <Input id="foodBrand" placeholder="Ex: Premier Golden" value={formData.foodBrand} onChange={(e) => setFormData({ ...formData, foodBrand: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="foodAmount">Quantidade Diária (g)</Label>
                    <Input id="foodAmount" type="number" placeholder="Ex: 300" value={formData.foodAmount} onChange={(e) => setFormData({ ...formData, foodAmount: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" placeholder="Informações adicionais sobre o pet" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={createPet.isPending}>{createPet.isPending ? "Cadastrando..." : "Cadastrar Pet"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <Card key={pet.id} className="hover-lift cursor-pointer" onClick={() => setLocation(`/tutor/pets/${pet.id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Dog className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{pet.name}</CardTitle>
                      <CardDescription>{pet.breed}</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {pet.status === 'checked-in' && (
                      <Badge variant="default" className="bg-green-500">
                        Na Creche
                      </Badge>
                    )}
                    {getStatusBadge(pet.approvalStatus)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Idade</p>
                    <p className="font-medium">{pet.age} anos</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peso</p>
                    <p className="font-medium">{pet.weight} kg</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Vacinas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      <span>Logs</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(pet.approvalStatus === "pending" || pet.approvalStatus === "rejected") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(pet);
                        }}
                      >
                        Editar
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      Ver detalhes
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </TutorLayout>
  );
}
