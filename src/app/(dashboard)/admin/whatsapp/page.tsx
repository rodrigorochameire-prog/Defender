"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Wifi, 
  WifiOff,
  Settings,
  FileText,
  Phone,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
  Smartphone,
  Zap,
  Shield,
  Star,
  Info,
  Key,
  History,
  Save,
  Power,
  PowerOff,
  Bell,
} from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState("status");
  const [testPhone, setTestPhone] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  
  // Form de configuração
  const [configForm, setConfigForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    businessAccountId: "",
  });

  // Queries
  const { data: isConfigured, isLoading: checkingConfig } = trpc.whatsapp.isConfigured.useQuery();
  const { data: myConfig, refetch: refetchConfig } = trpc.whatsapp.getMyConfig.useQuery();
  const { data: connectionStatus, refetch: refetchStatus, isLoading: checkingStatus } = trpc.whatsapp.getConnectionStatus.useQuery(
    undefined,
    { enabled: isConfigured === true, retry: false }
  );
  const { data: templates } = trpc.whatsapp.getTemplates.useQuery();
  const { data: configInfo } = trpc.whatsapp.getConfigInfo.useQuery();
  const { data: approvedTemplates } = trpc.whatsapp.listApprovedTemplates.useQuery(
    undefined,
    { enabled: isConfigured === true }
  );
  const { data: messageHistory } = trpc.whatsapp.getMessageHistory.useQuery(
    { limit: 20 },
    { enabled: myConfig?.hasConfig }
  );

  // Mutations
  const saveConfigMutation = trpc.whatsapp.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva!");
      refetchConfig();
      setConfigForm({ accessToken: "", phoneNumberId: "", businessAccountId: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const testAndActivateMutation = trpc.whatsapp.testAndActivate.useMutation({
    onSuccess: (data) => {
      toast.success(`Conectado! Número: ${data.profile?.phone}`);
      refetchConfig();
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deactivateMutation = trpc.whatsapp.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Configuração desativada");
      refetchConfig();
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendTestMutation = trpc.whatsapp.sendTestMessage.useMutation({
    onSuccess: () => {
      toast.success("Mensagem de teste enviada!");
      setTestPhone("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendTextMutation = trpc.whatsapp.sendText.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada!");
      setCustomMessage("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const formatNumber = trpc.whatsapp.formatNumber.useQuery(
    { phone: testPhone },
    { enabled: testPhone.length >= 10 }
  );

  const handleSaveConfig = () => {
    if (!configForm.accessToken && !configForm.phoneNumberId) {
      toast.error("Preencha pelo menos o Access Token e Phone Number ID");
      return;
    }
    
    const data: Record<string, string> = {};
    if (configForm.accessToken) data.accessToken = configForm.accessToken;
    if (configForm.phoneNumberId) data.phoneNumberId = configForm.phoneNumberId;
    if (configForm.businessAccountId) data.businessAccountId = configForm.businessAccountId;
    
    saveConfigMutation.mutate(data);
  };

  const handleSendTest = () => {
    if (!testPhone) {
      toast.error("Digite um número de telefone");
      return;
    }
    sendTestMutation.mutate({ phone: testPhone });
  };

  const handleSendCustom = () => {
    if (!testPhone || !customMessage) {
      toast.error("Preencha o número e a mensagem");
      return;
    }
    sendTextMutation.mutate({ phone: testPhone, message: customMessage });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  // Loading state
  if (checkingConfig) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <MessageCircle />
          </div>
          <div className="page-header-info">
            <h1>WhatsApp Business</h1>
            <p>Configuração da sua conta</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              refetchStatus();
              refetchConfig();
            }}
            disabled={checkingStatus}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checkingStatus ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Status</span>
            {connectionStatus?.connected ? (
              <Wifi className="stat-card-icon green" />
            ) : (
              <WifiOff className="stat-card-icon amber" />
            )}
          </div>
          <div className="stat-card-value">
            <Badge variant={connectionStatus?.connected ? "default" : "secondary"}>
              {connectionStatus?.connected ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Fonte</span>
            <Key className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">
            <Badge variant="outline">
              {connectionStatus?.source === "admin" ? "Sua Config" : 
               connectionStatus?.source === "env" ? "Global" : "—"}
            </Badge>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Número</span>
            <Smartphone className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value text-sm font-medium">
            {connectionStatus?.profile?.phone || myConfig?.config?.displayPhoneNumber || "—"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Qualidade</span>
            <Star className="stat-card-icon amber" />
          </div>
          <div className="stat-card-value">
            <Badge variant="outline" className={
              connectionStatus?.profile?.quality === "GREEN" ? "text-green-600" :
              connectionStatus?.profile?.quality === "YELLOW" ? "text-amber-600" : ""
            }>
              {connectionStatus?.profile?.quality || "—"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="status" className="gap-2">
            <Wifi className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Key className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            Enviar
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Tab: Status */}
        <TabsContent value="status" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Perfil do Número */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {connectionStatus?.connected ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-amber-500" />
                  )}
                  Perfil do Número
                </CardTitle>
                <CardDescription>
                  Informações do número WhatsApp Business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectionStatus?.profile ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Nome Verificado</p>
                      <p className="font-semibold">{connectionStatus.profile.name}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Telefone</p>
                      <p className="font-semibold">{connectionStatus.profile.phone}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Qualidade</p>
                      <p className="font-semibold">{connectionStatus.profile.quality}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <p className="font-semibold">{connectionStatus.profile.status}</p>
                    </div>
                  </div>
                ) : connectionStatus?.error ? (
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                    <p className="font-medium">Erro de conexão:</p>
                    <p className="text-sm">{connectionStatus.error}</p>
                  </div>
                ) : !isConfigured ? (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600">
                    <p>Configure suas credenciais na aba &quot;Configuração&quot;</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Teste Rápido */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Teste Rápido
                </CardTitle>
                <CardDescription>
                  Envie uma mensagem de teste
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isConfigured && (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <p>Configure suas credenciais primeiro na aba &quot;Configuração&quot;</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Número de Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="(11) 98888-7777"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="pl-10"
                      disabled={!isConfigured}
                    />
                  </div>
                  {formatNumber.data && testPhone.length >= 10 && (
                    <p className="text-xs text-muted-foreground">
                      Será enviado para: <span className="font-mono">{formatNumber.data.formatted}</span>
                      {formatNumber.data.valid ? (
                        <CheckCircle2 className="inline h-3 w-3 ml-1 text-green-500" />
                      ) : (
                        <span className="text-red-500 ml-1">({formatNumber.data.reason})</span>
                      )}
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleSendTest} 
                  disabled={!testPhone || sendTestMutation.isPending || !isConfigured}
                  className="w-full"
                >
                  {sendTestMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar Mensagem de Teste
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Configuração */}
        <TabsContent value="config" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Configuração Atual */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Sua Configuração
                </CardTitle>
                <CardDescription>
                  Configure suas próprias credenciais do WhatsApp Business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {myConfig?.config ? (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">Status</p>
                        <p className="text-sm text-muted-foreground">
                          {myConfig.config.isActive ? "Ativa" : "Inativa"}
                        </p>
                      </div>
                      <Badge variant={myConfig.config.isActive ? "default" : "secondary"}>
                        {myConfig.config.isActive ? (
                          <><Power className="h-3 w-3 mr-1" /> Ativa</>
                        ) : (
                          <><PowerOff className="h-3 w-3 mr-1" /> Inativa</>
                        )}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Phone Number ID:</span>
                        <span className="font-mono">{myConfig.config.phoneNumberId || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Business Account ID:</span>
                        <span className="font-mono">{myConfig.config.businessAccountId || "—"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Access Token:</span>
                        <span className="font-mono">
                          {myConfig.config.hasAccessToken ? "••••••••" : "Não configurado"}
                        </span>
                      </div>
                      {myConfig.config.verifiedName && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Nome Verificado:</span>
                          <span>{myConfig.config.verifiedName}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {myConfig.config.isActive ? (
                        <Button 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => deactivateMutation.mutate()}
                          disabled={deactivateMutation.isPending}
                        >
                          {deactivateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <PowerOff className="h-4 w-4 mr-2" />
                          )}
                          Desativar
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1"
                          onClick={() => testAndActivateMutation.mutate()}
                          disabled={testAndActivateMutation.isPending}
                        >
                          {testAndActivateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Power className="h-4 w-4 mr-2" />
                          )}
                          Testar e Ativar
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Você ainda não configurou suas credenciais
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Preencha o formulário ao lado para começar
                    </p>
                  </div>
                )}

                {myConfig?.hasEnvFallback && !myConfig?.config?.isActive && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm">
                    <Info className="inline h-4 w-4 mr-1" />
                    Usando configuração global como fallback
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Formulário de Configuração */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {myConfig?.config ? "Atualizar Credenciais" : "Configurar Credenciais"}
                </CardTitle>
                <CardDescription>
                  Obtenha as credenciais no Meta for Developers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Access Token *</Label>
                  <Input
                    type="password"
                    placeholder="EAAxxxxx..."
                    value={configForm.accessToken}
                    onChange={(e) => setConfigForm(f => ({ ...f, accessToken: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Encontre em: App Dashboard → WhatsApp → API Setup
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number ID *</Label>
                  <Input
                    placeholder="123456789012345"
                    value={configForm.phoneNumberId}
                    onChange={(e) => setConfigForm(f => ({ ...f, phoneNumberId: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Business Account ID (opcional)</Label>
                  <Input
                    placeholder="123456789012345"
                    value={configForm.businessAccountId}
                    onChange={(e) => setConfigForm(f => ({ ...f, businessAccountId: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Necessário apenas para listar templates aprovados
                  </p>
                </div>

                <Button 
                  className="w-full"
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending || (!configForm.accessToken && !configForm.phoneNumberId)}
                >
                  {saveConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configuração
                </Button>

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full" asChild>
                    <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Meta for Developers
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notificações Automáticas */}
          {myConfig?.config && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificações Automáticas
                </CardTitle>
                <CardDescription>
                  Configure quais eventos enviam notificações automáticas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Check-in</p>
                      <p className="text-xs text-muted-foreground">Quando pet faz check-in</p>
                    </div>
                    <Switch checked={myConfig.config.autoNotifyCheckin} disabled />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Check-out</p>
                      <p className="text-xs text-muted-foreground">Quando pet está pronto</p>
                    </div>
                    <Switch checked={myConfig.config.autoNotifyCheckout} disabled />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Mural</p>
                      <p className="text-xs text-muted-foreground">Nova postagem no mural</p>
                    </div>
                    <Switch checked={myConfig.config.autoNotifyDailyLog} disabled />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">Reservas</p>
                      <p className="text-xs text-muted-foreground">Confirmação de reserva</p>
                    </div>
                    <Switch checked={myConfig.config.autoNotifyBooking} disabled />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Em breve: Configure as notificações automáticas para cada evento
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Enviar Mensagem */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar Mensagem
              </CardTitle>
              <CardDescription>
                Envie uma mensagem personalizada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConfigured && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>Configure suas credenciais na aba &quot;Configuração&quot; para enviar mensagens</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Número de Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="(11) 98888-7777"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="pl-10"
                      disabled={!isConfigured}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Usar Template de Exemplo</Label>
                  <Select 
                    value={selectedTemplate} 
                    onValueChange={(value) => {
                      setSelectedTemplate(value);
                      if (templates && value && templates[value as keyof typeof templates]) {
                        setCustomMessage(templates[value as keyof typeof templates].example);
                      }
                    }}
                    disabled={!isConfigured}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates && Object.entries(templates).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={5}
                  disabled={!isConfigured}
                />
                <p className="text-xs text-muted-foreground">
                  {customMessage.length}/4096 caracteres
                </p>
              </div>

              <Button 
                onClick={handleSendCustom} 
                disabled={!testPhone || !customMessage || sendTextMutation.isPending || !isConfigured}
                className="w-full"
              >
                {sendTextMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Mensagem
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Templates */}
        <TabsContent value="templates" className="space-y-4">
          {/* Templates aprovados */}
          {approvedTemplates && approvedTemplates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Templates Aprovados
                </CardTitle>
                <CardDescription>
                  Templates aprovados pela Meta na sua conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {approvedTemplates.map((template, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge variant={template.status === "APPROVED" ? "default" : "secondary"}>
                          {template.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {template.category} • {template.language}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Templates de exemplo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Templates de Exemplo
              </CardTitle>
              <CardDescription>
                Use estes modelos para criar seus templates no Meta Business Manager
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(templates).map(([key, template]) => (
                    <div 
                      key={key} 
                      className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{template.name}</h4>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                          <p className="text-xs text-primary mt-1 font-mono">{template.metaTemplateName}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(template.example)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">
                        {template.example}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando templates...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Mensagens
              </CardTitle>
              <CardDescription>
                Últimas mensagens enviadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!myConfig?.hasConfig ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Configure suas credenciais para ver o histórico</p>
                </div>
              ) : messageHistory?.messages && messageHistory.messages.length > 0 ? (
                <div className="space-y-3">
                  {messageHistory.messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className={`p-2 rounded-full ${
                        msg.status === "sent" ? "bg-green-100 text-green-600" :
                        msg.status === "failed" ? "bg-red-100 text-red-600" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {msg.status === "sent" ? <CheckCircle2 className="h-4 w-4" /> :
                         msg.status === "failed" ? <XCircle className="h-4 w-4" /> :
                         <Loader2 className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{msg.toPhone}</span>
                          {msg.context && (
                            <Badge variant="outline" className="text-xs">{msg.context}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {msg.content || msg.templateName || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {msg.sentAt ? new Date(msg.sentAt).toLocaleString("pt-BR") : 
                           new Date(msg.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma mensagem enviada ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
