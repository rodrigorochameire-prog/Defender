import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import TutorLayout from "@/components/TutorLayout";

const PLANS = [
  {
    key: "PLAN_BASIC",
    name: "Plano Básico",
    price: "R$ 99,90",
    period: "/mês",
    description: "Ideal para quem usa a creche ocasionalmente",
    features: [
      "10 diárias por mês",
      "Relatórios diários",
      "Galeria de fotos",
      "Suporte por email",
    ],
  },
  {
    key: "PLAN_PREMIUM",
    name: "Plano Premium",
    price: "R$ 249,90",
    period: "/mês",
    description: "Perfeito para uso frequente",
    features: [
      "Diárias ilimitadas",
      "Relatórios detalhados",
      "Galeria de fotos ilimitada",
      "Prioridade no agendamento",
      "Suporte prioritário",
      "Desconto em serviços extras",
    ],
    popular: true,
  },
];

const CREDIT_PACKAGES = [
  {
    key: "CREDITS_10",
    name: "Pacote 10 Créditos",
    price: "R$ 150,00",
    credits: 10,
    perCredit: "R$ 15,00",
    description: "1 crédito = 1 diária na creche",
  },
  {
    key: "CREDITS_20",
    name: "Pacote 20 Créditos",
    price: "R$ 280,00",
    credits: 20,
    perCredit: "R$ 14,00",
    description: "Economize R$ 20,00",
    savings: "R$ 20,00",
  },
  {
    key: "CREDITS_50",
    name: "Pacote 50 Créditos",
    price: "R$ 650,00",
    credits: 50,
    perCredit: "R$ 13,00",
    description: "Economize R$ 100,00",
    savings: "R$ 100,00",
    popular: true,
  },
];

export default function TutorCheckout() {
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);

  const createCheckout = trpc.payments.createCheckout.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error("Erro ao criar checkout: " + error.message);
      setLoadingProduct(null);
    },
  });

  const handlePurchase = (productKey: string) => {
    setLoadingProduct(productKey);
    createCheckout.mutate({ productKey });
  };

  return (
    <TutorLayout>
      <div className="container max-w-7xl py-8 space-y-12 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Planos e Créditos</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Escolha o melhor plano para você ou compre créditos avulsos
          </p>
        </div>

        {/* Monthly Plans */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Planos Mensais</h2>
            <p className="text-muted-foreground mt-2">
              Assinatura recorrente com benefícios exclusivos
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <Card
                key={plan.key}
                className={`relative ${
                  plan.popular
                    ? "border-primary shadow-lg scale-105"
                    : ""
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={() => handlePurchase(plan.key)}
                    disabled={!!loadingProduct}
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {loadingProduct === plan.key ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Assinar Agora
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Credit Packages */}
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Pacotes de Créditos</h2>
            <p className="text-muted-foreground mt-2">
              Compre créditos avulsos sem compromisso mensal
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <Card
                key={pkg.key}
                className={`relative ${
                  pkg.popular
                    ? "border-primary shadow-lg"
                    : ""
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      Melhor Valor
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle>{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">{pkg.price}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {pkg.perCredit} por crédito
                  </div>
                  {pkg.savings && (
                    <Badge variant="secondary" className="w-fit mt-2">
                      Economize {pkg.savings}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent>
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-primary">
                      {pkg.credits}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      créditos
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={() => handlePurchase(pkg.key)}
                    disabled={!!loadingProduct}
                    className="w-full"
                    variant={pkg.popular ? "default" : "outline"}
                  >
                    {loadingProduct === pkg.key ? (
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
            ))}
          </div>
        </div>

        {/* Info */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold mb-2">🔒</div>
                <div className="font-semibold">Pagamento Seguro</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Processado pelo Stripe
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold mb-2">↩️</div>
                <div className="font-semibold">Reembolso Fácil</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Até 7 dias após a compra
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold mb-2">💳</div>
                <div className="font-semibold">Cartão ou Pix</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Várias formas de pagamento
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TutorLayout>
  );
}
