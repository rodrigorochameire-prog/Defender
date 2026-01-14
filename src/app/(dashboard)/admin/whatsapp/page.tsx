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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  QrCode,
  Settings,
  FileText,
  Image,
  Phone,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Copy,
  ExternalLink,
  Smartphone,
  Zap,
  Bell,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState("status");
  const [testPhone, setTestPhone] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);

  // Queries
  const { data: isConfigured, isLoading: checkingConfig } = trpc.whatsapp.isConfigured.useQuery();
  const { data: connectionStatus, refetch: refetchStatus, isLoading: checkingStatus } = trpc.whatsapp.getConnectionStatus.useQuery(
    undefined,
    { enabled: isConfigured === true, retry: false }
  );
  const { data: templates } = trpc.whatsapp.getTemplates.useQuery();
  const { data: qrCode, refetch: refetchQR, isLoading: loadingQR } = trpc.whatsapp.getQRCode.useQuery(
    undefined,
    { enabled: showQRDialog && isConfigured === true, retry: false }
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

  const disconnectMutation = trpc.whatsapp.disconnect.useMutation({
    onSuccess: () => {
      toast.success("WhatsApp desconectado!");
      refetchStatus();
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

  // Se não está configurado
  if (checkingConfig) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="page-header-content">
            <div className="page-header-icon">
              <MessageCircle />
            </div>
            <div className="page-header-info">
              <h1>WhatsApp</h1>
              <p>Integração com Evolution API</p>
            </div>
          </div>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle>Configuração Necessária</CardTitle>
                <CardDescription>A Evolution API não está configurada</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Para usar a integração com WhatsApp, configure as seguintes variáveis de ambiente no Vercel:
            </p>
            
            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-muted/50 font-mono text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span>EVOLUTION_API_URL</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard("EVOLUTION_API_URL")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span>EVOLUTION_API_KEY</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard("EVOLUTION_API_KEY")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span>EVOLUTION_INSTANCE_NAME</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard("EVOLUTION_INSTANCE_NAME")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <a href="https://doc.evolution-api.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Documentação
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Vercel
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
            <h1>WhatsApp</h1>
            <p>Integração com Evolution API</p>
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
              {connectionStatus?.connected ? "Conectado" : connectionStatus?.state || "Desconectado"}
            </Badge>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Instância</span>
            <Smartphone className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value text-sm font-medium">
            {connectionStatus?.instance || "—"}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">API</span>
            <Zap className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">
            <Badge variant="outline" className="text-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Configurada
            </Badge>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Templates</span>
            <FileText className="stat-card-icon muted" />
          </div>
          <div className="stat-card-value">{templates ? Object.keys(templates).length : 0}</div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="status" className="gap-2">
            <Wifi className="h-4 w-4" />
            Conexão
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            Enviar Mensagem
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Tab: Conexão */}
        <TabsContent value="status" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Status da Conexão */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {connectionStatus?.connected ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-amber-500" />
                  )}
                  Status da Conexão
                </CardTitle>
                <CardDescription>
                  Estado atual da instância WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Estado</p>
                    <p className="font-semibold capitalize">
                      {connectionStatus?.state === "open" ? "Conectado" :
                       connectionStatus?.state === "connecting" ? "Conectando..." :
                       connectionStatus?.state === "close" ? "Desconectado" : "Desconhecido"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Instância</p>
                    <p className="font-semibold">{connectionStatus?.instance || "—"}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {!connectionStatus?.connected && (
                    <Button onClick={() => setShowQRDialog(true)} className="flex-1">
                      <QrCode className="h-4 w-4 mr-2" />
                      Conectar via QR Code
                    </Button>
                  )}
                  {connectionStatus?.connected && (
                    <Button 
                      variant="destructive" 
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                      className="flex-1"
                    >
                      {disconnectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <WifiOff className="h-4 w-4 mr-2" />
                      )}
                      Desconectar
                    </Button>
                  )}
                </div>
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
                <div className="space-y-2">
                  <Label>Número de Telefone</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="(11) 98888-7777"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        className="pl-10"
                      />
                    </div>
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

                {!connectionStatus?.connected && (
                  <p className="text-xs text-amber-600 text-center">
                    Conecte o WhatsApp primeiro para enviar mensagens
                  </p>
                )}
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
                Enviar Mensagem Personalizada
              </CardTitle>
              <CardDescription>
                Envie uma mensagem customizada para qualquer número
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
                  <Label>Template (opcional)</Label>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Templates de Mensagens
              </CardTitle>
              <CardDescription>
                Mensagens pré-definidas para diferentes situações
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
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code com o WhatsApp do seu celular
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6">
            {loadingQR ? (
              <div className="w-64 h-64 flex items-center justify-center bg-muted rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : qrCode?.base64 ? (
              <img 
                src={qrCode.base64} 
                alt="QR Code" 
                className="w-64 h-64 rounded-lg border"
              />
            ) : (
              <div className="w-64 h-64 flex flex-col items-center justify-center bg-muted rounded-lg">
                <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
                <p className="text-sm text-muted-foreground text-center px-4">
                  Não foi possível gerar o QR Code. Verifique a configuração da API.
                </p>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>1. Abra o WhatsApp no seu celular</p>
            <p>2. Vá em <strong>Configurações → Aparelhos conectados</strong></p>
            <p>3. Toque em <strong>Conectar um aparelho</strong></p>
            <p>4. Escaneie o QR Code acima</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => refetchQR()} disabled={loadingQR}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingQR ? 'animate-spin' : ''}`} />
              Atualizar QR
            </Button>
            <Button variant="outline" onClick={() => setShowQRDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
