"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { registerAction } from "./actions";
import { Mail, Lock, User, Loader2, Check, X } from "lucide-react";
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
      router.push("/tutor");
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
        <Label htmlFor="name" className="text-sm font-medium">
          Nome completo
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Seu nome completo"
            autoComplete="name"
            disabled={isLoading}
            className="pl-10 h-12 text-base"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={isLoading}
            className="pl-10 h-12 text-base"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Senha
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            disabled={isLoading}
            className="pl-10 h-12 text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmar senha
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Repita a senha"
            autoComplete="new-password"
            disabled={isLoading}
            className="pl-10 h-12 text-base"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Password validation indicators */}
      {(password.length > 0 || confirmPassword.length > 0) && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            {passwordChecks.length ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <X className="h-4 w-4 text-red-500" />
            )}
            <span
              className={cn(
                passwordChecks.length ? "text-green-600" : "text-muted-foreground"
              )}
            >
              Mínimo de 6 caracteres
            </span>
          </div>
          {confirmPassword.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              {passwordChecks.match ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span
                className={cn(
                  passwordChecks.match ? "text-green-600" : "text-muted-foreground"
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
        className="w-full h-12 text-base font-semibold"
        disabled={isLoading || !passwordChecks.length || !passwordChecks.match}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Criando conta...
          </>
        ) : (
          "Criar Conta"
        )}
      </Button>
    </form>
  );
}
