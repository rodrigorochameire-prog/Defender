import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      // Redirect to dashboard after successful login
      window.location.href = "/admin/dashboard";
    },
    onError: (err) => {
      setError(err.message || "Falha no login. Verifique suas credenciais.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Por favor, preencha todos os campos");
      return;
    }

    loginMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3">
          <div className="flex justify-center mb-4">
            <img
              src="/tetecare-logo.png"
              alt="Tetê Care"
              className="w-16 h-16 rounded-lg object-cover shadow-md"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Entrar</CardTitle>
          <CardDescription className="text-center">
            Faça login para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loginMutation.isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={() => setLocation("/forgot-password")}
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loginMutation.isPending}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <button
                type="button"
                onClick={() => setLocation("/register")}
                className="text-primary hover:underline font-medium"
              >
                Criar conta
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
