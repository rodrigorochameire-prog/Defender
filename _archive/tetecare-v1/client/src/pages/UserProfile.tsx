import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Mail, Phone, KeyRound, Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import AdminLayout from "@/components/AdminLayout";
import TutorLayout from "@/components/TutorLayout";

export default function UserProfile() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });

  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      utils.auth.me.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const requestVerificationMutation = trpc.auth.requestEmailVerification.useMutation({
    onSuccess: () => {
      toast.success("Email de verificação enviado! Verifique sua caixa de entrada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }

    changePasswordMutation.mutate({
      oldPassword: passwordData.oldPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const LayoutComponent = user?.role === "admin" ? AdminLayout : TutorLayout;

  return (
    <LayoutComponent>
      <div className="container max-w-4xl py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas informações pessoais e configurações de segurança
          </p>
        </div>

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações da Conta
                </CardTitle>
                <CardDescription>
                  Seus dados básicos e status de verificação
                </CardDescription>
              </div>
              {user?.role === "admin" && (
                <Badge variant="default" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Administrador
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              {user?.emailVerified ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Verificado
                </Badge>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Não verificado
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => requestVerificationMutation.mutate()}
                    disabled={requestVerificationMutation.isPending}
                  >
                    {requestVerificationMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Verificar email"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>
              Atualize suas informações de contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar alterações"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        {user?.loginMethod === "email" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword">Senha atual</Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    value={passwordData.oldPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                    placeholder="Digite sua senha atual"
                    required
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Digite a senha novamente"
                    required
                    minLength={6}
                  />
                  {passwordData.newPassword && passwordData.confirmPassword && 
                   passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="text-sm text-destructive">As senhas não conferem</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={
                    changePasswordMutation.isPending ||
                    passwordData.newPassword !== passwordData.confirmPassword
                  }
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    "Alterar senha"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutComponent>
  );
}
