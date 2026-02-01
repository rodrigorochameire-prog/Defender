"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerAction } from "./actions";
import { Mail, Lock, User, Loader2, Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordChecks = {
    length: password.length >= 6,
    match: password === confirmPassword && confirmPassword.length > 0,
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    if (!passwordChecks.length) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      setIsLoading(false);
      return;
    }

    if (!passwordChecks.match) {
      toast.error("As senhas não conferem");
      setIsLoading(false);
      return;
    }

    try {
      const result = await registerAction({ name, email, password });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Conta criada com sucesso!");
      router.push("/admin");
      router.refresh();
    } catch {
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium text-zinc-300">
          Nome completo
        </Label>
        <div className="relative group">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-teal-400 transition-colors" />
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Seu nome completo"
            autoComplete="name"
            disabled={isLoading}
            className="pl-10 h-11 text-sm bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-900 focus:border-teal-500/50 focus:ring-teal-500/20 transition-all"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
          Email
        </Label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-teal-400 transition-colors" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={isLoading}
            className="pl-10 h-11 text-sm bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-900 focus:border-teal-500/50 focus:ring-teal-500/20 transition-all"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
          Senha
        </Label>
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-teal-400 transition-colors" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            disabled={isLoading}
            className="pl-10 h-11 text-sm bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-900 focus:border-teal-500/50 focus:ring-teal-500/20 transition-all"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
          Confirmar senha
        </Label>
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-teal-400 transition-colors" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Repita a senha"
            autoComplete="new-password"
            disabled={isLoading}
            className="pl-10 h-11 text-sm bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-900 focus:border-teal-500/50 focus:ring-teal-500/20 transition-all"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Password validation indicators */}
      {(password.length > 0 || confirmPassword.length > 0) && (
        <div className="space-y-2 p-3 bg-zinc-900/80 rounded-lg border border-zinc-800">
          <div className="flex items-center gap-2 text-sm">
            {passwordChecks.length ? (
              <Check className="h-4 w-4 text-teal-400" />
            ) : (
              <X className="h-4 w-4 text-red-400" />
            )}
            <span
              className={cn(
                passwordChecks.length ? "text-teal-400" : "text-zinc-500"
              )}
            >
              Mínimo de 6 caracteres
            </span>
          </div>
          {confirmPassword.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              {passwordChecks.match ? (
                <Check className="h-4 w-4 text-teal-400" />
              ) : (
                <X className="h-4 w-4 text-red-400" />
              )}
              <span
                className={cn(
                  passwordChecks.match ? "text-teal-400" : "text-zinc-500"
                )}
              >
                Senhas conferem
              </span>
            </div>
          )}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11 text-sm font-medium bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300"
        disabled={isLoading || !passwordChecks.length || !passwordChecks.match}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Criando conta...
          </>
        ) : (
          <>
            Criar Conta
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
