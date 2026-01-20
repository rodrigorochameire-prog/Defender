"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LoadingPage } from "@/components/shared/loading";
import { PageHeader } from "@/components/shared/page-header";
import { PhotoUpload } from "@/components/shared/photo-upload";
import { notFound } from "next/navigation";

interface EditPetPageProps {
  params: Promise<{ id: string }>;
}

export default function TutorEditPetPage(props: EditPetPageProps) {
  const params = use(props.params);
  const petId = parseInt(params.id);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    species: "dog" as "dog" | "cat",
    birthDate: "",
    weight: "",
    photoUrl: "" as string | null,
    foodBrand: "",
    foodAmount: "",
    notes: "",
  });

  const { data: pet, isLoading, error } = trpc.pets.byId.useQuery({ id: petId });

  // Atualizar formData quando os dados chegarem
  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name,
        breed: pet.breed || "",
        species: pet.species as "dog" | "cat",
        birthDate: pet.birthDate ? new Date(pet.birthDate).toISOString().split("T")[0] : "",
        weight: pet.weight ? String(pet.weight / 1000) : "",
        photoUrl: pet.photoUrl || null,
        foodBrand: pet.foodBrand || "",
        foodAmount: pet.foodAmount ? String(pet.foodAmount) : "",
        notes: pet.notes || "",
      });
    }
  }, [pet]);

  const utils = trpc.useUtils();

  const updateMutation = trpc.pets.update.useMutation({
    onSuccess: () => {
      toast.success("Pet atualizado com sucesso!");
      utils.pets.byId.invalidate({ id: petId });
      utils.pets.myPets.invalidate();
      router.push(`/tutor/pets/${petId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !pet) {
    notFound();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateMutation.mutate({
      id: petId,
      name: formData.name,
      breed: formData.breed || undefined,
      species: formData.species,
      birthDate: formData.birthDate || undefined,
      weight: formData.weight ? Math.round(parseFloat(formData.weight) * 1000) : undefined,
      photoUrl: formData.photoUrl || undefined,
      foodBrand: formData.foodBrand || undefined,
      foodAmount: formData.foodAmount ? parseInt(formData.foodAmount) : undefined,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar ${pet.name}`}
        description="Atualize as informações do seu pet"
        backHref={`/tutor/pets/${petId}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Informações do Pet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Foto do Pet */}
            <div className="flex flex-col items-center gap-4 pb-6 border-b">
              <Label className="text-center">Foto do Pet</Label>
              <PhotoUpload
                currentPhotoUrl={formData.photoUrl}
                onUpload={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, photoUrl: null }))}
                folder="pets"
                size="lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              {/* Espécie */}
              <div className="space-y-2">
                <Label htmlFor="species">Espécie *</Label>
                <select
                  id="species"
                  value={formData.species}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      species: e.target.value as "dog" | "cat",
                    }))
                  }
                  className="w-full h-10 px-3 border border-input rounded-md bg-background"
                >
                  <option value="dog">Cachorro</option>
                  <option value="cat">Gato</option>
                </select>
              </div>

              {/* Raça */}
              <div className="space-y-2">
                <Label htmlFor="breed">Raça</Label>
                <Input
                  id="breed"
                  value={formData.breed}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, breed: e.target.value }))
                  }
                  placeholder="Ex: Golden Retriever"
                />
              </div>

              {/* Data de Nascimento */}
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, birthDate: e.target.value }))
                  }
                />
              </div>

              {/* Peso */}
              <div className="space-y-2">
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, weight: e.target.value }))
                  }
                  placeholder="Ex: 15.5"
                />
              </div>

              {/* Marca da Ração */}
              <div className="space-y-2">
                <Label htmlFor="foodBrand">Marca da Ração</Label>
                <Input
                  id="foodBrand"
                  value={formData.foodBrand}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, foodBrand: e.target.value }))
                  }
                  placeholder="Ex: Royal Canin"
                />
              </div>

              {/* Quantidade de Ração */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="foodAmount">Quantidade diária de ração (gramas)</Label>
                <Input
                  id="foodAmount"
                  type="number"
                  min="0"
                  value={formData.foodAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, foodAmount: e.target.value }))
                  }
                  placeholder="Ex: 300"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Informações adicionais sobre o pet..."
                className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md bg-background resize-y"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
