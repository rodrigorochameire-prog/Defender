"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { setPasswordAction } from "./actions";
import { Loader2 } from "lucide-react";

export function SetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    // Validacao client-side
    if (!password || password.length < 6) {
      toast.error("Senha deve ter no minimo 6 caracteres");
      setIsLoading(false);
      return;
    }

    if (password !== confirm) {
      toast.error("Senhas nao conferem");
      setIsLoading(false);
      return;
    }

    try {
      const result = await setPasswordAction(formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      // Se chegou aqui sem erro, o redirect do server action ja aconteceu
      toast.success("Senha definida com sucesso!");
    } catch {
      // redirect() do Next.js lanca um erro especial - isso e esperado
      // O redirect ja aconteceu no server action
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium"
        >
          Nova Senha
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Minimo 6 caracteres"
          autoComplete="new-password"
          disabled={isLoading}
          className="h-10 text-sm bg-zinc-900 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-emerald-500/10 rounded-lg transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirm"
          className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium"
        >
          Confirmar Senha
        </label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          placeholder="Repita a senha"
          autoComplete="new-password"
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
              Salvando...
            </>
          ) : (
            "Definir Senha"
          )}
        </Button>
      </div>
    </form>
  );
}
