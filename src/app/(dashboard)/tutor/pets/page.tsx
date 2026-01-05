"use client";

import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dog, Plus } from "lucide-react";
import Link from "next/link";

export default function TutorPetsPage() {
  const { data: pets, isLoading } = trpc.pets.myPets.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Dog />
          </div>
          <div className="page-header-info">
            <h1>Meus Pets</h1>
            <p>Gerencie seus pets cadastrados</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button asChild size="sm" className="btn-sm btn-primary">
            <Link href="/tutor/pets/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Adicionar Pet
            </Link>
          </Button>
        </div>
      </div>

      {!pets || pets.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Dog className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Nenhum pet cadastrado</h3>
              <p className="mb-4">Comece cadastrando seu primeiro pet!</p>
              <Button asChild>
                <Link href="/tutor/pets/new">Cadastrar Pet</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pets.map((pet) => (
            <Link
              key={pet.id}
              href={`/tutor/pets/${pet.id}`}
              className="block"
            >
              <Card className="hover:border-primary hover:shadow-md transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    {pet.photoUrl ? (
                      <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={pet.photoUrl}
                          alt={pet.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Dog className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{pet.name}</CardTitle>
                      <p className="text-sm text-gray-500">
                        {pet.breed || "Sem raça definida"}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pet.approvalStatus === "approved"
                          ? "bg-green-100 text-green-700"
                          : pet.approvalStatus === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {pet.approvalStatus === "approved"
                        ? "✓ Aprovado"
                        : pet.approvalStatus === "pending"
                        ? "⏳ Pendente"
                        : "✗ Rejeitado"}
                    </span>
                    <span className="text-sm font-medium text-primary">
                      {pet.credits} créditos
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
