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
} from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState("status");
  const [testPhone, setTestPhone] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Queries
  const { data: isConfigured, isLoading: checkingConfig } = trpc.whatsapp.isConfigured.useQuery();
  const { data: connectionStatus, refetch: refetchStatus, isLoading: checkingStatus } = trpc.whatsapp.getConnectionStatus.useQuery(
    undefined,
    { enabled: isConfigured === true, retry: false }
  );
  const { data: templates } = trpc.whatsapp.getTemplates.useQuery();
  const { data: configInfo } = trpc.whatsapp.getConfigInfo.useQuery(
    undefined,
    { enabled: isConfigured === true }
  );
  const { data: approvedTemplates } = trpc.whatsapp.listTemplates.useQuery(
    undefined,
    { enabled: isConfigured === true }
  );

  // Mutations
  const sendTestMutation = trpc.whatsapp.sendTestMessage.useMutation({
    onSuccess: () => {
      toast.success("Mensagem de teste enviada com sucesso!");
      setTestPhone("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendTextMutation = trpc.whatsapp.sendText.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada com sucesso!");
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

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-header-icon">
              <MessageCircle />
            </div>
            <div className="page-header-info">
              <h1>WhatsApp Business</h1>
              <p>Integração com API oficial da Meta</p>
            </div>
          </div>
        </div>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle>Configuração Necessária</CardTitle>
                <CardDescription>Configure a API do WhatsApp Business para começar</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Passo a passo */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Como configurar:</h3>
              
              <div className="space-y-3">
                <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                  <div>
                    <p className="font-medium">Criar conta no Meta for Developers</p>
                    <p className="text-sm text-muted-foreground">Acesse developers.facebook.com e crie um app do tipo "Business"</p>
                  </div>
                </div>

                <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                  <div>
                    <p className="font-medium">Adicionar produto WhatsApp</p>
                    <p className="text-sm text-muted-foreground">No painel do app, adicione "WhatsApp" como produto</p>
                  </div>
                </div>

                <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">3</div>
                  <div>
                    <p className="font-medium">Obter credenciais</p>
                    <p className="text-sm text-muted-foreground">Em "API Setup", copie o Access Token e Phone Number ID</p>
                  </div>
                </div>

                <div className="flex gap-3 p-4 rounded-lg bg-muted/50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">4</div>
                  <div>
                    <p className="font-medium">Configurar no Vercel</p>
                    <p className="text-sm text-muted-foreground">Adicione as variáveis de ambiente no projeto</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Variáveis necessárias */}
            <div className="space-y-3">
              <h4 className="font-medium">Variáveis de ambiente:</h4>
              <div className="p-4 rounded-lg bg-muted/50 font-mono text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-green-600">WHATSAPP_ACCESS_TOKEN</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard("WHATSAPP_ACCESS_TOKEN")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600">WHATSAPP_PHONE_NUMBER_ID</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard("WHATSAPP_PHONE_NUMBER_ID")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">WHATSAPP_BUSINESS_ACCOUNT_ID <span className="text-xs">(opcional)</span></span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard("WHATSAPP_BUSINESS_ACCOUNT_ID")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 pt-4">
              <Button asChild>
                <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Meta for Developers
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Documentação
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
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
            <p>API oficial da Meta</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchStatus()}
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
              {connectionStatus?.connected ? "Conectado" : "Verificando..."}
            </Badge>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Número</span>
            <Smartphone className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value text-sm font-medium">
            {connectionStatus?.profile?.phone || "—"}
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

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Verificação</span>
            <Shield className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">
            <Badge variant="outline">
              {connectionStatus?.profile?.status || "—"}
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
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            Enviar
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
        </Tabs>

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
                  Envie uma mensagem de teste para verificar a conexão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
                  <div className="flex gap-2">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Importante:</strong> Mensagens de texto só podem ser enviadas para números que 
                      enviaram mensagem nas últimas 24h. Para mensagens proativas, use Templates aprovados.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Número de Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="(11) 98888-7777"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="pl-10"
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
                  disabled={!testPhone || sendTestMutation.isPending || !connectionStatus?.connected}
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

        {/* Tab: Enviar Mensagem */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar Mensagem
              </CardTitle>
              <CardDescription>
                Envie uma mensagem personalizada (requer janela de 24h ativa)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Usar Template de Exemplo</Label>
                  <Select value={selectedTemplate} onValueChange={(value) => {
                    setSelectedTemplate(value);
                    if (templates && value && templates[value as keyof typeof templates]) {
                      setCustomMessage(templates[value as keyof typeof templates].example);
                    }
                  }}>
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
                />
                <p className="text-xs text-muted-foreground">
                  {customMessage.length}/4096 caracteres
                </p>
              </div>

              <Button 
                onClick={handleSendCustom} 
                disabled={!testPhone || !customMessage || sendTextMutation.isPending || !connectionStatus?.connected}
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
          {/* Templates aprovados na conta */}
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

        {/* Tab: Configuração */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuração da API
              </CardTitle>
              <CardDescription>
                Informações sobre a configuração atual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">API Configurada</p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    As variáveis de ambiente estão configuradas corretamente
                  </p>
                </div>
              </div>

              {configInfo && (
                <>
                  <div className="space-y-3">
                    <h4 className="font-medium">Variáveis Obrigatórias</h4>
                    <div className="space-y-2">
                      {configInfo.requiredVars.map((v) => (
                        <div key={v.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <div>
                            <span className="font-mono text-sm">{v.name}</span>
                            <span className="text-muted-foreground text-sm ml-2">— {v.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Variáveis Opcionais</h4>
                    <div className="space-y-2">
                      {configInfo.optionalVars.map((v) => (
                        <div key={v.name} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          <div>
                            <span className="font-mono text-sm">{v.name}</span>
                            <span className="text-muted-foreground text-sm ml-2">— {v.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" asChild>
                      <a href={configInfo.docsUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="h-4 w-4 mr-2" />
                        Documentação
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={configInfo.setupUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Meta for Developers
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
