"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Coins, Dog, ShoppingCart, Loader2, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingPage } from "@/components/shared/loading";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export default function TutorCreditsPage() {
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  const { data: summary, isLoading: summaryLoading, refetch } = trpc.credits.mySummary.useQuery();
  const { data: packages, isLoading: packagesLoading } = trpc.credits.packages.useQuery();

  const isLoading = summaryLoading || packagesLoading;

  // Verificar parâmetros de retorno do Stripe
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const credits = searchParams.get("credits");

    if (success === "true" && credits) {
      toast.success(`🎉 Pagamento confirmado! ${credits} créditos adicionados.`);
      refetch();
      // Limpar URL
      window.history.replaceState({}, "", "/tutor/credits");
    } else if (canceled === "true") {
      toast.info("Pagamento cancelado.");
      window.history.replaceState({}, "", "/tutor/credits");
    }
  }, [searchParams, refetch]);

  const handlePurchase = async (
    packageId: number,
    packageName: string,
    credits: number,
    priceInCents: number
  ) => {
    if (!selectedPetId && summary?.petCredits && summary.petCredits.length > 0) {
      toast.warning("Selecione um pet para adicionar os créditos");
      return;
    }

    setIsProcessing(packageId);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          packageName,
          credits,
          priceInCents,
          petId: selectedPetId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao iniciar checkout");
      }

      // Redirecionar para Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Erro no checkout:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar pagamento");
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus Créditos"
        description="Gerencie seus créditos de creche"
      />

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos Disponíveis</CardTitle>
            <Coins className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-primary">{summary?.totalCredits ?? 0}</div>
            <p className="text-sm text-muted-foreground">dias de creche</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos por Pet</CardTitle>
            <Dog className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summary?.petCredits && summary.petCredits.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {summary.petCredits.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => setSelectedPetId(selectedPetId === pet.id ? null : pet.id)}
                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                      selectedPetId === pet.id
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm">
                      {selectedPetId === pet.id && <CheckCircle className="h-4 w-4 text-primary" />}
                      {pet.species === "cat" ? "🐱" : "🐶"} {pet.name}
                    </span>
                    <span className="font-bold text-primary">{pet.credits}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Dog className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nenhum pet cadastrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seleção de Pet */}
      {summary?.petCredits && summary.petCredits.length > 0 && (
        <Card className={selectedPetId ? "border-primary" : "border-orange-200 bg-orange-50"}>
          <CardContent className="flex items-start gap-3 pt-6">
            <Dog className={`h-5 w-5 mt-0.5 ${selectedPetId ? "text-primary" : "text-orange-600"}`} />
            <div className="flex-1">
              <p className={`font-medium ${selectedPetId ? "text-primary" : "text-orange-800"}`}>
                {selectedPetId 
                  ? `✓ Pet selecionado: ${summary.petCredits.find(p => p.id === selectedPetId)?.name}`
                  : "Selecione um pet acima"}
              </p>
              <p className={`text-sm mt-1 ${selectedPetId ? "text-muted-foreground" : "text-orange-700"}`}>
                {selectedPetId 
                  ? "Os créditos serão adicionados a este pet."
                  : "Clique em um pet para selecionar onde os créditos serão adicionados."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex items-start gap-3 pt-6">
          <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Como funcionam os créditos?</p>
            <p className="text-sm text-blue-700 mt-1">
              Cada crédito equivale a 1 dia de creche para seu pet. Compre pacotes com desconto 
              e use quando quiser! Os créditos são associados a cada pet individualmente.
              <br />
              <span className="font-medium">Pagamento seguro via Stripe.</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pacotes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Comprar Créditos
          </CardTitle>
          <CardDescription>Escolha um pacote para adicionar créditos</CardDescription>
        </CardHeader>
        <CardContent>
          {!packages || packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum pacote disponível no momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => {
                const pricePerCredit = Math.round(pkg.priceInCents / pkg.credits);
                const originalPrice = pkg.discountPercent > 0
                  ? Math.round(pkg.priceInCents / (1 - pkg.discountPercent / 100))
                  : null;

                return (
                  <Card key={pkg.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                    {pkg.discountPercent > 0 && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                        -{pkg.discountPercent}%
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      {pkg.description && (
                        <CardDescription className="text-xs">{pkg.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-3xl font-bold">{pkg.credits}</div>
                        <p className="text-sm text-muted-foreground">créditos</p>
                      </div>
                      <div>
                        {originalPrice && (
                          <div className="text-sm text-muted-foreground line-through">
                            {formatCurrency(originalPrice)}
                          </div>
                        )}
                        <div className="text-xl font-semibold text-primary">
                          {formatCurrency(pkg.priceInCents)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(pricePerCredit)}/crédito
                        </p>
                      </div>
                      <Button
                        className="w-full"
                        disabled={isProcessing === pkg.id}
                        onClick={() => handlePurchase(pkg.id, pkg.name, pkg.credits, pkg.priceInCents)}
                      >
                        {isProcessing === pkg.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Comprar
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
