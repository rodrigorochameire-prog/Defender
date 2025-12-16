import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/payment-success");

  useEffect(() => {
    // Aqui você pode adicionar lógica para atualizar créditos/plano do usuário
    // usando o session_id do Stripe que vem como query parameter
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl animate-fade-in">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
            <CardDescription className="mt-2">
              Seu pagamento foi processado com sucesso
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Seus créditos ou plano foram atualizados automaticamente.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Você receberá um email de confirmação em breve.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => setLocation("/tutor/dashboard")}
              className="w-full"
              size="lg"
            >
              Ir para Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              onClick={() => setLocation("/tutor/checkout")}
              variant="outline"
              className="w-full"
            >
              Ver Planos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
