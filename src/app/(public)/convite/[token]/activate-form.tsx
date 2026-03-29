"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { activateAccountAction } from "./actions";
import { Loader2 } from "lucide-react";

interface ActivateFormProps {
  token: string;
  userEmail: string;
}

export function ActivateForm({ token, userEmail }: ActivateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    // Validacao client-side
    if (!email || !email.includes("@")) {
      setError("Email invalido");
      toast.error("Email invalido");
      setIsLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError("Senha deve ter no minimo 6 caracteres");
      toast.error("Senha deve ter no minimo 6 caracteres");
      setIsLoading(false);
      return;
    }

    if (password !== confirm) {
      setError("Senhas nao conferem");
      toast.error("Senhas nao conferem");
      setIsLoading(false);
      return;
    }

    try {
      const result = await activateAccountAction(token, formData);

      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      toast.success("Conta ativada com sucesso!");
    } catch {
      // redirect() do Next.js lanca um erro especial - isso e esperado
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 text-center">{error}</p>
        </div>
      )}

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
          type="email"
          defaultValue={userEmail}
          placeholder="seu@email.com"
          autoComplete="email"
          disabled={isLoading}
          className="h-10 text-sm bg-zinc-900 border-zinc-800/80 text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/40 focus:ring-emerald-500/10 rounded-lg transition-colors"
        />

        <p className="text-[11px] text-zinc-500 mt-1">
          Recomendamos usar seu email Google (@gmail.com) para facilitar a sincronizacao com Google Sheets.
        </p>
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
              Ativando...
            </>
          ) : (
            "Ativar minha conta"
          )}
        </Button>
      </div>
    </form>
  );
}
