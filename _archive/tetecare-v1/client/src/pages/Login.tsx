import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Dog, Heart, Shield, Sparkles } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
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
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-40 h-40 rounded-full border-4 border-white" />
          <div className="absolute bottom-40 right-20 w-60 h-60 rounded-full border-4 border-white" />
          <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full border-4 border-white" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          {/* Logo */}
          <div className="mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full" />
              <img
                src="/tetecare-logo.png"
                alt="Tetê Care"
                className="w-32 h-32 rounded-3xl object-cover relative shadow-2xl border-4 border-white/30"
              />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 text-center">Tetê Care</h1>
          <p className="text-xl text-white/90 mb-12 text-center max-w-md">
            Gestão profissional de creche para pets com amor e tecnologia
          </p>
          
          {/* Features */}
          <div className="space-y-4 w-full max-w-sm">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Dog className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Gestão Completa</p>
                <p className="text-sm text-white/70">Controle total dos pets</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Saúde em Dia</p>
                <p className="text-sm text-white/70">Vacinas e medicamentos</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Seguro e Confiável</p>
                <p className="text-sm text-white/70">Dados protegidos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-6">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <img
                src="/tetecare-logo.png"
                alt="Tetê Care"
                className="w-12 h-12 rounded-xl object-cover shadow-lg"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Tetê Care
              </span>
            </div>
          </div>

          <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-xl">
            <CardHeader className="space-y-3 pb-6">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <CardTitle className="text-2xl font-bold text-center">Bem-vindo de volta!</CardTitle>
              <CardDescription className="text-center">
                Faça login para acessar sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="animate-slide-up">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={loginMutation.isPending}
                    className="h-12 bg-background/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setLocation("/forgot-password")}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={loginMutation.isPending}
                    className="h-12 bg-background/50"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  Não tem uma conta?{" "}
                  <button
                    type="button"
                    onClick={() => setLocation("/register")}
                    className="text-primary hover:underline font-semibold"
                  >
                    Criar conta grátis
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao continuar, você concorda com nossos{" "}
            <a href="#" className="text-primary hover:underline">Termos de Serviço</a>
            {" "}e{" "}
            <a href="#" className="text-primary hover:underline">Política de Privacidade</a>
          </p>
        </div>
      </div>
    </div>
  );
}
