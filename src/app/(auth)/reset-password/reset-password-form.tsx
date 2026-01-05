"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Loader2, CheckCircle, Eye, EyeOff, AlertCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Criar cliente Supabase
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  // Verificar e processar o token de recuperação
  useEffect(() => {
    async function processRecoveryToken() {
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setErrorMessage("Serviço não configurado");
          setIsChecking(false);
          return;
        }

        // Pegar o hash da URL
        const hash = window.location.hash;
        console.log("[Reset Password] Hash da URL:", hash ? "presente" : "ausente");

        if (hash && hash.includes("access_token")) {
          // Parsear os parâmetros do hash
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type");

          console.log("[Reset Password] Tipo de token:", type);

          if (accessToken && type === "recovery") {
            // Definir a sessão manualmente com o token
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

            if (error) {
              console.error("[Reset Password] Erro ao definir sessão:", error);
              setErrorMessage("Link expirado ou inválido. Solicite um novo.");
              setIsChecking(false);
              return;
            }

            if (data.session) {
              console.log("[Reset Password] Sessão estabelecida com sucesso");
              setHasSession(true);
              // Limpar o hash da URL para não ficar visível
              window.history.replaceState(null, "", window.location.pathname);
            }
          } else {
            setErrorMessage("Link de recuperação inválido.");
          }
        } else {
          // Verificar se já existe uma sessão (usuário voltou para a página)
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            console.log("[Reset Password] Sessão existente encontrada");
            setHasSession(true);
          } else {
            setErrorMessage("Nenhum link de recuperação detectado.");
          }
        }
      } catch (err) {
        console.error("[Reset Password] Erro:", err);
        setErrorMessage("Erro ao processar o link.");
      } finally {
        setIsChecking(false);
      }
    }

    processRecoveryToken();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        toast.error("Serviço não configurado");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        console.error("[Reset Password] Erro ao atualizar:", error);
        toast.error("Erro ao atualizar senha: " + error.message);
        return;
      }

      // Fazer logout para forçar novo login com a nova senha
      await supabase.auth.signOut();

      setIsSuccess(true);
      toast.success("Senha atualizada com sucesso!");

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      console.error("[Reset Password] Erro:", err);
      toast.error("Erro ao atualizar senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Validando link de recuperação...</p>
      </div>
    );
  }

  if (!hasSession || errorMessage) {
    return (
      <div className="text-center space-y-4 p-6 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
        <AlertCircle className="h-12 w-12 text-amber-600 mx-auto" />
        <div>
          <h3 className="font-semibold text-amber-800 dark:text-amber-400">
            Link inválido ou expirado
          </h3>
          <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
            {errorMessage || "O link de recuperação pode ter expirado ou já foi utilizado."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/forgot-password")}
          className="mt-4"
        >
          Solicitar novo link
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-4 p-6 bg-green-50 dark:bg-green-950/20 rounded-lg">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
        <div>
          <h3 className="font-semibold text-green-800 dark:text-green-400">
            Senha atualizada!
          </h3>
          <p className="text-sm text-green-600 dark:text-green-500 mt-1">
            Sua senha foi redefinida com sucesso. Redirecionando para o login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Nova Senha
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 6 caracteres"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            disabled={isLoading}
            className="pl-10 pr-10 h-12 text-base"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmar Nova Senha
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Digite novamente"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            disabled={isLoading}
            className="pl-10 pr-10 h-12 text-base"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Atualizando...
          </>
        ) : (
          "Redefinir Senha"
        )}
      </Button>
    </form>
  );
}
