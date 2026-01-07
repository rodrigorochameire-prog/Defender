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
      
      if (result.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/tutor");
      }
      
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
        <Label htmlFor="email" className="text-sm font-medium text-foreground/80">
          Email
        </Label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
          <Input
            id="email"
            name="email"
            type="text"
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={isLoading}
            className="pl-10 h-11 text-sm bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground/80">
          Senha
        </Label>
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
            className="pl-10 h-11 text-sm bg-muted/30 border-border/50 focus:bg-background focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
          />
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-11 text-sm font-medium bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300"
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
