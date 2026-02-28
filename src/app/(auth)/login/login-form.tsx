"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { loginAction } from "./actions";
import { Loader2 } from "lucide-react";

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

      // Aguardar um momento para garantir que o cookie foi setado
      await new Promise(resolve => setTimeout(resolve, 100));

      // Usar window.location para forçar reload completo em vez de navegação client-side
      // Isso garante que o servidor veja o cookie na próxima requisição
      window.location.href = "/admin";
    } catch {
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium"
        >
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="text"
          placeholder="seu@email.com"
          autoComplete="email"
          disabled={isLoading}
          className="h-10 text-sm bg-zinc-900 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-emerald-500/10 rounded-lg transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium"
        >
          Senha
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isLoading}
          className="h-10 text-sm bg-zinc-900 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-emerald-500/10 rounded-lg transition-colors"
        />
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full h-10 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors duration-200 cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </div>
    </form>
  );
}
