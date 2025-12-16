import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const verifyEmailMutation = trpc.auth.verifyEmail.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setVerifying(false);
      toast.success("Email verificado com sucesso!");
      setTimeout(() => {
        setLocation("/profile");
      }, 3000);
    },
    onError: (error) => {
      setError(error.message);
      setVerifying(false);
      toast.error(error.message);
    },
  });

  useEffect(() => {
    // Extract token from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    
    if (tokenParam) {
      setToken(tokenParam);
      verifyEmailMutation.mutate({ token: tokenParam });
    } else {
      setError("Token de verificação não encontrado");
      setVerifying(false);
    }
  }, []);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">Verificando Email</CardTitle>
            <CardDescription>
              Aguarde enquanto verificamos seu email...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Email Verificado!</CardTitle>
            <CardDescription>
              Seu email foi verificado com sucesso. Redirecionando para o perfil...
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/profile">Ir para o perfil</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Erro na Verificação</CardTitle>
          <CardDescription>
            {error || "Não foi possível verificar seu email."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-muted bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="mb-2">Possíveis causas:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>O link de verificação expirou (válido por 24 horas)</li>
              <li>O link já foi utilizado anteriormente</li>
              <li>O link está incompleto ou inválido</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/profile">Ir para o perfil</Link>
          </Button>
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/login">Voltar para o login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
