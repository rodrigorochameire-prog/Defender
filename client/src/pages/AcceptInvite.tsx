import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
// Auth via tRPC
const getLoginUrl = () => {
  const origin = window.location.origin;
  return `${import.meta.env.VITE_OAUTH_PORTAL_URL}?redirect_uri=${encodeURIComponent(origin + "/api/oauth/callback")}`;
};

export default function AcceptInvite() {
  const [, params] = useRoute("/accept-invite");
  const [, setLocation] = useLocation();
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  // Get token from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const acceptInvite = trpc.adminInvites.accept.useMutation({
    onSuccess: () => {
      setStatus("success");
      setMessage("Convite aceito com sucesso! Você agora é um administrador.");
      toast.success("Bem-vindo como administrador!");
      setTimeout(() => {
        setLocation("/dashboard");
      }, 2000);
    },
    onError: (error) => {
      setStatus("error");
      setMessage(error.message);
      toast.error("Erro ao aceitar convite: " + error.message);
    },
  });

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token de convite inválido");
      return;
    }

    // Wait for auth to load
    if (authLoading) {
      return;
    }

    // If not logged in, redirect to login
    if (!user) {
      setMessage("Você precisa fazer login para aceitar o convite");
      return;
    }

    // Accept invite
    acceptInvite.mutate({ token });
  }, [token, user, authLoading]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Convite Inválido</CardTitle>
            </div>
            <CardDescription>
              O link de convite é inválido ou expirou
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Voltar para Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              <CardTitle>Convite de Administrador</CardTitle>
            </div>
            <CardDescription>
              Você foi convidado para ser administrador da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para aceitar o convite, você precisa fazer login primeiro.
            </p>
            <Button onClick={() => window.location.href = getLoginUrl()} className="w-full">
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            {status === "loading" && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
            {status === "success" && <CheckCircle2 className="h-6 w-6 text-green-500" />}
            {status === "error" && <XCircle className="h-6 w-6 text-destructive" />}
            <CardTitle>
              {status === "loading" && "Processando Convite..."}
              {status === "success" && "Convite Aceito!"}
              {status === "error" && "Erro ao Aceitar Convite"}
            </CardTitle>
          </div>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {status === "error" && (
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              Voltar para Home
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
