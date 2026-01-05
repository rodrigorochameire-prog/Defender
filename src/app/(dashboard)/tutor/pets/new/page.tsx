"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoUpload } from "@/components/shared/photo-upload";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewPetPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const createPet = trpc.pets.create.useMutation({
    onSuccess: () => {
      toast.success("Pet cadastrado com sucesso! Aguarde aprovação.");
      router.push("/tutor/pets");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao cadastrar pet");
    },
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      await createPet.mutateAsync({
        name: formData.get("name") as string,
        breed: (formData.get("breed") as string) || undefined,
        species: (formData.get("species") as "dog" | "cat") || "dog",
        birthDate: (formData.get("birthDate") as string) || undefined,
        photoUrl: photoUrl || undefined,
        notes: (formData.get("notes") as string) || undefined,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/tutor/pets">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastrar Pet</h1>
          <p className="text-gray-500">Adicione as informações do seu pet</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações do Pet</CardTitle>
          <CardDescription>
            Após o cadastro, seu pet será enviado para aprovação pela creche.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Upload de Foto */}
            <div className="flex flex-col items-center gap-3 pb-4 border-b">
              <Label>Foto do Pet</Label>
              <PhotoUpload
                currentPhotoUrl={photoUrl}
                onUpload={setPhotoUrl}
                onRemove={() => setPhotoUrl(null)}
                folder="pets"
                size="lg"
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG ou WebP. Máximo 5MB.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do Pet *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Rex, Luna, Thor..."
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="species">Espécie</Label>
                <select
                  id="species"
                  name="species"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={isLoading}
                >
                  <option value="dog">Cachorro</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="breed">Raça</Label>
                <Input
                  id="breed"
                  name="breed"
                  placeholder="Ex: Golden Retriever"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Alguma informação importante sobre seu pet? (alergias, comportamento, etc.)"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Cadastrando..." : "Cadastrar Pet"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/tutor/pets">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
