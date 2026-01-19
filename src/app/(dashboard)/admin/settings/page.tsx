"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  Bell,
  Calendar,
  Shield,
  User,
  Building,
  Loader2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("geral");
  const [isSaving, setIsSaving] = useState(false);

  // Estados locais para configurações
  const [settings, setSettings] = useState({
    // Configurações Gerais
    nomeDefensoria: "Defensoria Pública do Estado",
    comarca: "Camaçari",
    telefone: "(71) 3621-0000",
    email: "defensoria@example.com",
    
    // Notificações
    notificarPrazos: true,
    diasAntesPrazo: 3,
    notificarAudiencias: true,
    diasAntesAudiencia: 2,
    notificarJuri: true,
    diasAntesJuri: 7,
    
    // Integrações
    googleDriveEnabled: false,
    googleCalendarEnabled: false,
    whatsappEnabled: false,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Implementar salvamento real
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">Configure o sistema DefensorHub</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral" className="gap-2">
            <Building className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2">
            <Calendar className="h-4 w-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* TAB: GERAL */}
        <TabsContent value="geral" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Informações da Defensoria
              </CardTitle>
              <CardDescription>
                Dados básicos da unidade da Defensoria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nomeDefensoria">Nome da Defensoria</Label>
                  <Input
                    id="nomeDefensoria"
                    value={settings.nomeDefensoria}
                    onChange={(e) => setSettings({ ...settings, nomeDefensoria: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comarca">Comarca</Label>
                  <Input
                    id="comarca"
                    value={settings.comarca}
                    onChange={(e) => setSettings({ ...settings, comarca: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={settings.telefone}
                    onChange={(e) => setSettings({ ...settings, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: NOTIFICAÇÕES */}
        <TabsContent value="notificacoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertas de Prazos
              </CardTitle>
              <CardDescription>
                Configure quando receber alertas sobre prazos processuais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notificar sobre Prazos</p>
                  <p className="text-sm text-muted-foreground">Receber alertas antes do vencimento de prazos</p>
                </div>
                <Switch
                  checked={settings.notificarPrazos}
                  onCheckedChange={(checked) => setSettings({ ...settings, notificarPrazos: checked })}
                />
              </div>
              {settings.notificarPrazos && (
                <div className="flex items-center gap-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="diasAntesPrazo">Alertar</Label>
                  <Input
                    id="diasAntesPrazo"
                    type="number"
                    className="w-20"
                    value={settings.diasAntesPrazo}
                    onChange={(e) => setSettings({ ...settings, diasAntesPrazo: parseInt(e.target.value) })}
                  />
                  <span className="text-sm text-muted-foreground">dias antes</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Alertas de Audiências
              </CardTitle>
              <CardDescription>
                Configure quando receber alertas sobre audiências
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notificar sobre Audiências</p>
                  <p className="text-sm text-muted-foreground">Receber lembretes de audiências agendadas</p>
                </div>
                <Switch
                  checked={settings.notificarAudiencias}
                  onCheckedChange={(checked) => setSettings({ ...settings, notificarAudiencias: checked })}
                />
              </div>
              {settings.notificarAudiencias && (
                <div className="flex items-center gap-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="diasAntesAudiencia">Alertar</Label>
                  <Input
                    id="diasAntesAudiencia"
                    type="number"
                    className="w-20"
                    value={settings.diasAntesAudiencia}
                    onChange={(e) => setSettings({ ...settings, diasAntesAudiencia: parseInt(e.target.value) })}
                  />
                  <span className="text-sm text-muted-foreground">dias antes</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Alertas de Júri
              </CardTitle>
              <CardDescription>
                Configure quando receber alertas sobre sessões do Júri
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notificar sobre Júri</p>
                  <p className="text-sm text-muted-foreground">Receber lembretes de plenários agendados</p>
                </div>
                <Switch
                  checked={settings.notificarJuri}
                  onCheckedChange={(checked) => setSettings({ ...settings, notificarJuri: checked })}
                />
              </div>
              {settings.notificarJuri && (
                <div className="flex items-center gap-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="diasAntesJuri">Alertar</Label>
                  <Input
                    id="diasAntesJuri"
                    type="number"
                    className="w-20"
                    value={settings.diasAntesJuri}
                    onChange={(e) => setSettings({ ...settings, diasAntesJuri: parseInt(e.target.value) })}
                  />
                  <span className="text-sm text-muted-foreground">dias antes</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: INTEGRAÇÕES */}
        <TabsContent value="integracoes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Drive</CardTitle>
              <CardDescription>
                Armazenamento automático de documentos no Google Drive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Integração com Google Drive</p>
                  <p className="text-sm text-muted-foreground">Criar pastas automáticas para cada processo</p>
                </div>
                <Switch
                  checked={settings.googleDriveEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, googleDriveEnabled: checked })}
                />
              </div>
              {settings.googleDriveEnabled && (
                <div className="p-4 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">Configuração necessária:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Configure GOOGLE_CLIENT_ID no ambiente</li>
                    <li>Configure GOOGLE_CLIENT_SECRET no ambiente</li>
                    <li>Configure GOOGLE_REFRESH_TOKEN no ambiente</li>
                    <li>Configure GOOGLE_DRIVE_ROOT_FOLDER_ID no ambiente</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                Sincronização de prazos e audiências com Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Integração com Google Calendar</p>
                  <p className="text-sm text-muted-foreground">Criar eventos automáticos para prazos e audiências</p>
                </div>
                <Switch
                  checked={settings.googleCalendarEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, googleCalendarEnabled: checked })}
                />
              </div>
              {settings.googleCalendarEnabled && (
                <div className="p-4 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">Configuração necessária:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Configure GOOGLE_CLIENT_ID no ambiente</li>
                    <li>Configure GOOGLE_CLIENT_SECRET no ambiente</li>
                    <li>Configure GOOGLE_REFRESH_TOKEN no ambiente</li>
                    <li>Configure GOOGLE_CALENDAR_ID no ambiente</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Business</CardTitle>
              <CardDescription>
                Notificações via WhatsApp para assistidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Integração com WhatsApp</p>
                  <p className="text-sm text-muted-foreground">Enviar notificações automáticas para assistidos</p>
                </div>
                <Switch
                  checked={settings.whatsappEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, whatsappEnabled: checked })}
                />
              </div>
              {settings.whatsappEnabled && (
                <div className="p-4 bg-muted rounded-lg text-sm">
                  <p className="font-medium mb-2">Configuração necessária:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Configure sua conta no painel WhatsApp Business</li>
                    <li>Acesse Configurações &gt; WhatsApp no menu lateral</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: SEGURANÇA */}
        <TabsContent value="seguranca" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Políticas de Segurança
              </CardTitle>
              <CardDescription>
                Configurações de segurança e acesso ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">RLS (Row Level Security)</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  O sistema utiliza políticas de segurança em nível de linha no banco de dados
                  para garantir que cada usuário acesse apenas os dados permitidos.
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Administradores têm acesso completo</li>
                  <li>Defensores acessam apenas seus processos e assistidos</li>
                  <li>Estagiários têm acesso limitado de leitura</li>
                </ul>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Logs de Auditoria</h4>
                <p className="text-sm text-muted-foreground">
                  Todas as ações críticas são registradas para auditoria posterior.
                  Os logs incluem criação, edição e exclusão de processos, demandas e documentos.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Gerenciamento de Usuários
              </CardTitle>
              <CardDescription>
                Controle de acesso e permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">
                  Para gerenciar usuários, acesse a área de administração de usuários.
                </p>
                <Button variant="outline" asChild>
                  <a href="/admin/users">
                    Gerenciar Usuários
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
