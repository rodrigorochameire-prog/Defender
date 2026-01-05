"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Loader2, CheckCircle, Eye, EyeOff, AlertCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  // Verificar se há uma sessão válida do Supabase (via magic link)
  useEffect(() => {
    async function checkSession() {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          setIsChecking(false);
          return;
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        // Verificar se há um token na URL (recovery flow)
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          // Supabase irá processar automaticamente o hash
          const { data, error } = await supabase.auth.getSession();
          if (data.session && !error) {
            setHasSession(true);
          }
        } else {
          // Verificar sessão existente
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setHasSession(true);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar sessão:", err);
      } finally {
        setIsChecking(false);
      }
    }

    checkSession();
  }, [searchParams]);

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
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        toast.error("Serviço não configurado");
        return;
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        toast.error("Erro ao atualizar senha: " + error.message);
        return;
      }

      setIsSuccess(true);
      toast.success("Senha atualizada com sucesso!");

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err) {
      console.error("Erro:", err);
      toast.error("Erro ao atualizar senha. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="text-center space-y-4 p-6 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
        <AlertCircle className="h-12 w-12 text-amber-600 mx-auto" />
        <div>
          <h3 className="font-semibold text-amber-800 dark:text-amber-400">
            Link inválido ou expirado
          </h3>
          <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
            O link de recuperação de senha pode ter expirado ou já foi utilizado.
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
            Sua senha foi redefinida com sucesso. Você será redirecionado para o login...
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
            placeholder="••••••••"
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
            placeholder="••••••••"
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

