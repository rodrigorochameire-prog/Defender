"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { forgotPasswordAction } from "./actions";

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const result = await forgotPasswordAction(email);
      
      if (result.success) {
        setSubmittedEmail(email);
        setIsSuccess(true);
        toast.success("Instruções enviadas!");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Erro ao enviar email. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-4 p-6 bg-green-50 dark:bg-green-950/20 rounded-lg">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
        <div>
          <h3 className="font-semibold text-green-800 dark:text-green-400">
            Email enviado!
          </h3>
          <p className="text-sm text-green-600 dark:text-green-500 mt-1">
            Se existe uma conta com o email <strong>{submittedEmail}</strong>, você receberá as instruções para redefinir sua senha.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setIsSuccess(false);
            setSubmittedEmail("");
          }}
          className="mt-4"
        >
          Tentar outro email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Enviando...
          </>
        ) : (
          "Enviar instruções"
        )}
      </Button>
    </form>
  );
}
