"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { loginAction } from "./actions";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await loginAction({ email, password });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Login realizado com sucesso!");
      
      router.push("/admin");
      
      router.refresh();
    } catch {
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
          Email
        </Label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-teal-400 transition-colors" />
          <Input
            id="email"
            name="email"
            type="text"
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={isLoading}
            className="pl-10 h-11 text-sm bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-900 focus:border-teal-500/50 focus:ring-teal-500/20 transition-all"
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
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
            className="pl-10 h-11 text-sm bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:bg-zinc-900 focus:border-teal-500/50 focus:ring-teal-500/20 transition-all"
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-11 text-sm font-medium bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-lg shadow-teal-500/20 hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          <>
            Entrar
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
