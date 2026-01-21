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
  MessageCircle, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Settings,
  Phone,
  RefreshCw,
  Loader2,
  ExternalLink,
  Key,
  History,
  Save,
  Bell,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState("status");
  const [testPhone, setTestPhone] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  
  // Form de configuração
  const [configForm, setConfigForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    businessAccountId: "",
  });

  // Queries
  const { data: isConfigured, isLoading: checkingConfig, refetch: refetchConfigured } = trpc.whatsapp.isConfigured.useQuery();
  const { data: myConfig, refetch: refetchConfig } = trpc.whatsapp.getMyConfig.useQuery();
  const { data: templates } = trpc.whatsapp.getTemplates.useQuery();
  const { data: configInfo } = trpc.whatsapp.getConfigInfo.useQuery();
  const { data: messageHistory, refetch: refetchHistory } = trpc.whatsapp.getMessageHistory.useQuery(
    { limit: 20 },
    { enabled: myConfig?.hasConfig }
  );

  // Mutations
  const saveConfigMutation = trpc.whatsapp.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva!");
      refetchConfig();
      refetchConfigured();
      setConfigForm({ accessToken: "", phoneNumberId: "", businessAccountId: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setActiveMutation = trpc.whatsapp.setActive.useMutation({
    onSuccess: (_, variables) => {
      toast.success(variables.active ? "WhatsApp ativado!" : "WhatsApp desativado!");
      refetchConfig();
      refetchConfigured();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendTestMutation = trpc.whatsapp.sendTestMessage.useMutation({
    onSuccess: () => {
      toast.success("Mensagem de teste enviada!");
      setTestPhone("");
      refetchHistory();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendTextMutation = trpc.whatsapp.sendText.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada!");
      setCustomMessage("");
      setTestPhone("");
      refetchHistory();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSaveConfig = () => {
    const data: any = {};
    if (configForm.accessToken) data.accessToken = configForm.accessToken;
    if (configForm.phoneNumberId) data.phoneNumberId = configForm.phoneNumberId;
    if (configForm.businessAccountId) data.businessAccountId = configForm.businessAccountId;
    
    if (Object.keys(data).length === 0) {
      toast.error("Preencha pelo menos um campo");
      return;
    }
    
    saveConfigMutation.mutate(data);
  };

  const handleSendTest = () => {
    if (!testPhone) {
      toast.error("Digite um número de telefone");
      return;
    }
    sendTestMutation.mutate({ phone: testPhone });
  };

  const handleSendMessage = () => {
    if (!testPhone || !customMessage) {
      toast.error("Preencha o telefone e a mensagem");
      return;
    }
    sendTextMutation.mutate({
      phone: testPhone,
      message: customMessage,
      context: "manual",
    });
  };

  if (checkingConfig) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Business</h1>
            <p className="text-muted-foreground">Notificações automáticas para assistidos</p>
          </div>
        </div>
        <Badge variant={isConfigured ? "default" : "secondary"} className="text-sm">
          {isConfigured ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Conectado
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-1" />
              Desconectado
            </>
          )}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status" className="gap-2">
            <Phone className="h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            Enviar
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* TAB: STATUS */}
        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Status da Conexão
              </CardTitle>
              <CardDescription>
                Verifique o status da integração com WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {myConfig?.hasConfig ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      {myConfig.config?.isActive ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">
                          {myConfig.config?.isActive ? "Ativo" : "Inativo"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {myConfig.config?.displayPhoneNumber || myConfig.config?.phoneNumberId || "Número não verificado"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={myConfig.config?.isActive ? "outline" : "default"}
                      onClick={() => setActiveMutation.mutate({ active: !myConfig.config?.isActive })}
                      disabled={setActiveMutation.isPending}
                    >
                      {setActiveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : myConfig.config?.isActive ? (
                        "Desativar"
                      ) : (
                        "Ativar"
                      )}
                    </Button>
                  </div>

                  {/* Configurações de Notificação Automática */}
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-medium flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notificações Automáticas
                    </h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Prazos</span>
                        <Badge variant={myConfig.config?.autoNotifyPrazo ? "default" : "secondary"}>
                          {myConfig.config?.autoNotifyPrazo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Audiências</span>
                        <Badge variant={myConfig.config?.autoNotifyAudiencia ? "default" : "secondary"}>
                          {myConfig.config?.autoNotifyAudiencia ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Júri</span>
                        <Badge variant={myConfig.config?.autoNotifyJuri ? "default" : "secondary"}>
                          {myConfig.config?.autoNotifyJuri ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Movimentações</span>
                        <Badge variant={myConfig.config?.autoNotifyMovimentacao ? "default" : "secondary"}>
                          {myConfig.config?.autoNotifyMovimentacao ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">WhatsApp não configurado</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure as credenciais da API para começar a enviar notificações
                  </p>
                  <Button onClick={() => setActiveTab("config")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Templates Disponíveis */}
          <Card>
            <CardHeader>
              <CardTitle>Templates de Mensagem</CardTitle>
              <CardDescription>
                Modelos de mensagem para notificações jurídicas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {templates && Object.entries(templates).map(([key, template]) => (
                  <Card key={key} className="bg-muted/50">
                    <CardContent className="p-4">
                      <h4 className="font-medium mb-2">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      <pre className="text-xs bg-background p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                        {template.example}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: CONFIGURAÇÃO */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Credenciais da API
              </CardTitle>
              <CardDescription>
                Configure as credenciais do WhatsApp Business Cloud API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessToken">Access Token *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  value={configForm.accessToken}
                  onChange={(e) => setConfigForm({ ...configForm, accessToken: e.target.value })}
                  placeholder={myConfig?.config?.hasAccessToken ? "••••••••" : "Cole seu token aqui"}
                />
                <p className="text-xs text-muted-foreground">
                  Token de acesso permanente ou temporário da API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                <Input
                  id="phoneNumberId"
                  value={configForm.phoneNumberId}
                  onChange={(e) => setConfigForm({ ...configForm, phoneNumberId: e.target.value })}
                  placeholder={myConfig?.config?.phoneNumberId || "Ex: 123456789012345"}
                />
                <p className="text-xs text-muted-foreground">
                  ID do número de telefone na plataforma Meta
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAccountId">Business Account ID (opcional)</Label>
                <Input
                  id="businessAccountId"
                  value={configForm.businessAccountId}
                  onChange={(e) => setConfigForm({ ...configForm, businessAccountId: e.target.value })}
                  placeholder={myConfig?.config?.businessAccountId || "Ex: 123456789012345"}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                >
                  {saveConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Configuração
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentação
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notificações Automáticas */}
          {myConfig?.hasConfig && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificações Automáticas
                </CardTitle>
                <CardDescription>
                  Configure quais notificações devem ser enviadas automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Lembretes de Prazo</p>
                    <p className="text-sm text-muted-foreground">Notificar sobre prazos próximos ao vencimento</p>
                  </div>
                  <Switch
                    checked={myConfig.config?.autoNotifyPrazo ?? false}
                    onCheckedChange={(checked) => saveConfigMutation.mutate({ autoNotifyPrazo: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Audiências</p>
                    <p className="text-sm text-muted-foreground">Notificar sobre audiências agendadas</p>
                  </div>
                  <Switch
                    checked={myConfig.config?.autoNotifyAudiencia ?? false}
                    onCheckedChange={(checked) => saveConfigMutation.mutate({ autoNotifyAudiencia: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sessões do Júri</p>
                    <p className="text-sm text-muted-foreground">Notificar sobre plenários agendados</p>
                  </div>
                  <Switch
                    checked={myConfig.config?.autoNotifyJuri ?? false}
                    onCheckedChange={(checked) => saveConfigMutation.mutate({ autoNotifyJuri: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Movimentações</p>
                    <p className="text-sm text-muted-foreground">Notificar sobre novas movimentações processuais</p>
                  </div>
                  <Switch
                    checked={myConfig.config?.autoNotifyMovimentacao ?? false}
                    onCheckedChange={(checked) => saveConfigMutation.mutate({ autoNotifyMovimentacao: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: ENVIAR */}
        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Enviar Mensagem
              </CardTitle>
              <CardDescription>
                Envie mensagens manuais para assistidos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConfigured ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    Configure o WhatsApp primeiro para enviar mensagens
                  </p>
                  <Button onClick={() => setActiveTab("config")}>
                    Configurar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="testPhone">Telefone</Label>
                    <Input
                      id="testPhone"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="(71) 99999-9999"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customMessage">Mensagem</Label>
                    <Textarea
                      id="customMessage"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Digite sua mensagem..."
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendTextMutation.isPending || !testPhone || !customMessage}
                    >
                      {sendTextMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Enviar Mensagem
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleSendTest}
                      disabled={sendTestMutation.isPending || !testPhone}
                    >
                      {sendTestMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Enviar Teste
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: HISTÓRICO */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Mensagens
                </CardTitle>
                <CardDescription>
                  Últimas mensagens enviadas
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchHistory()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {!messageHistory?.messages?.length ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">
                    Nenhuma mensagem enviada ainda
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messageHistory.messages.map((msg: any) => (
                    <div key={msg.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {msg.toName || msg.toPhone}
                        </p>
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                          {msg.content}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {msg.context}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(msg.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <Badge variant={msg.status === "sent" ? "default" : "danger"}>
                        {msg.status === "sent" ? "Enviada" : "Erro"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
