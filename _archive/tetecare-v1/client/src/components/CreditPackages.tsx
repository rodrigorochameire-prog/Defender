import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreditPackagesProps {
  petId: number;
  onPurchaseSuccess?: () => void;
}

export function CreditPackages({ petId, onPurchaseSuccess }: CreditPackagesProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

  const { data: packages, isLoading } = trpc.credits.getPackages.useQuery();
  const purchaseMutation = trpc.credits.purchasePackage.useMutation({
    onSuccess: (data) => {
      toast.success(`Compra realizada! ${data.credits} cr\u00e9ditos adicionados com sucesso.`);
      setSelectedPackageId(null);
      onPurchaseSuccess?.();
    },
    onError: (error) => {
      toast.error(`Erro na compra: ${error.message}`);
    },
  });

  const handlePurchase = (packageId: number) => {
    purchaseMutation.mutate({
      petId,
      packageId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!packages || packages.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Nenhum pacote disponível no momento.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {packages.map((pkg: any) => {
        const priceInReais = pkg.priceInCents / 100;
        const pricePerCredit = priceInReais / pkg.credits;
        const isPopular = pkg.discountPercent >= 15;

        return (
          <Card
            key={pkg.id}
            className={`relative ${
              isPopular ? "border-primary shadow-lg" : ""
            }`}
          >
            {isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">Mais Popular</Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {pkg.name}
                {pkg.discountPercent > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    -{pkg.discountPercent}%
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{pkg.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold">
                  R$ {priceInReais.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  R$ {pricePerCredit.toFixed(2)} por crédito
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">{pkg.credits} créditos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Válido por 6 meses</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">1 crédito = 1 dia de creche</span>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                variant={isPopular ? "default" : "outline"}
                disabled={purchaseMutation.isPending && selectedPackageId === pkg.id}
                onClick={() => {
                  setSelectedPackageId(pkg.id);
                  handlePurchase(pkg.id);
                }}
              >
                {purchaseMutation.isPending && selectedPackageId === pkg.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Comprar Agora
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
