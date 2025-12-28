"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Coins } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/utils";

export default function TutorCreditsPage() {
  const { data: pets } = trpc.pets.myPets.useQuery();

  const totalCredits = pets?.reduce((sum, pet) => sum + pet.credits, 0) || 0;

  // TODO: Buscar pacotes disponíveis do backend

  const packages = [
    { id: 1, name: "Pacote Básico", credits: 5, price: 25000, discount: 0 },
    { id: 2, name: "Pacote Mensal", credits: 10, price: 45000, discount: 10 },
    { id: 3, name: "Pacote Trimestral", credits: 30, price: 120000, discount: 20 },
    { id: 4, name: "Pacote Semestral", credits: 60, price: 210000, discount: 30 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus Créditos"
        description="Gerencie seus créditos de creche"
      />

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos Disponíveis</CardTitle>
            <Coins className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{totalCredits}</div>
            <p className="text-sm text-muted-foreground">dias de creche</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos por Pet</CardTitle>
            <CreditCard className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {pets && pets.length > 0 ? (
              <div className="space-y-2">
                {pets.map((pet) => (
                  <div key={pet.id} className="flex items-center justify-between">
                    <span className="text-sm">
                      {pet.species === "cat" ? "🐱" : "🐶"} {pet.name}
                    </span>
                    <span className="font-medium">{pet.credits} créditos</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum pet cadastrado</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pacotes */}
      <Card>
        <CardHeader>
          <CardTitle>Comprar Créditos</CardTitle>
          <CardDescription>Escolha um pacote para adicionar créditos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="relative overflow-hidden">
                {pkg.discount > 0 && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    -{pkg.discount}%
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold">{pkg.credits}</div>
                    <p className="text-sm text-muted-foreground">créditos</p>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-primary">
                      {formatCurrency(pkg.price)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Math.round(pkg.price / pkg.credits))}/crédito
                    </p>
                  </div>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Comprar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
