"use client";

import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Loader2, Scale } from "lucide-react";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Redefinir Senha
            </CardTitle>
            <CardDescription className="mt-2">
              Digite sua nova senha abaixo
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>

          <div className="text-center text-sm text-muted-foreground">
            Lembrou sua senha?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Voltar ao login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

