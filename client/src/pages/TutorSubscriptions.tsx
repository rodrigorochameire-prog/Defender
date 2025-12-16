import { trpc } from "@/lib/trpc";
import TutorLayout from "@/components/TutorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Check, Calendar, CreditCard } from "lucide-react";
import { toast } from "sonner";

export default function TutorSubscriptions() {
  const { data: plans, isLoading: plansLoading } = trpc.plans.list.useQuery({ activeOnly: true });
  const { data: activeSubscription } = trpc.subscriptions.getActive.useQuery();
  const utils = trpc.useUtils();

  const subscribe = trpc.subscriptions.subscribe.useMutation({
    onSuccess: () => {
      toast.success("Assinatura realizada com sucesso!");
      utils.subscriptions.getActive.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao assinar: " + error.message);
    },
  });

  const handleSubscribe = (planId: number) => {
    if (confirm("Deseja assinar este plano?")) {
      subscribe.mutate({ planId });
    }
  };

  if (plansLoading) {
    return (
      <TutorLayout>
        <div className="container py-8">
          <p>Carregando planos...</p>
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planos de Assinatura</h1>
          <p className="text-muted-foreground mt-2">
            Escolha o melhor plano para seu pet
          </p>
        </div>

        {activeSubscription && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                Assinatura Ativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Você possui uma assinatura ativa. Renova em:{" "}
                {new Date(activeSubscription.endDate).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        )}

        {!plans || plans.length === 0 ? (
          <Card>
            <CardContent className="empty-state">
              <Package className="empty-state-icon" />
              <p className="empty-state-title">Nenhum plano disponível</p>
              <p className="empty-state-description">
                Aguarde novos planos serem criados pela creche
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="shadow-card border-border/50 flex flex-col">
                <CardHeader>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    {plan.description && (
                      <CardDescription>{plan.description}</CardDescription>
                    )}
                  </div>
                  <div className="pt-4">
                    <p className="text-4xl font-bold">
                      R$ {(plan.price / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      por {plan.validityDays} dias
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="font-medium">{plan.credits} diárias incluídas</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">Válido por {plan.validityDays} dias</span>
                    </div>
                    {plan.benefits && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Benefícios:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {plan.benefits.split("\n").map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full mt-auto"
                    disabled={!!activeSubscription || subscribe.isPending}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {activeSubscription ? "Você já tem uma assinatura" : "Assinar Plano"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TutorLayout>
  );
}
