import { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Send, Settings, Users, Zap, BarChart3, Plus, Trash2, Edit, Check, X } from "lucide-react";

export default function AdminWhatsApp() {
  const [activeTab, setActiveTab] = useState("config");
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showAutomationDialog, setShowAutomationDialog] = useState(false);

  // Queries
  const { data: config, refetch: refetchConfig } = trpc.whatsapp.getConfig.useQuery();
  const { data: templates = [], refetch: refetchTemplates } = trpc.whatsapp.listTemplates.useQuery();
  const { data: messageHistory = [], refetch: refetchMessages } = trpc.whatsapp.getMessageHistory.useQuery({ limit: 50 });
  const { data: groups = [], refetch: refetchGroups } = trpc.whatsapp.listGroups.useQuery();
  const { data: automations = [], refetch: refetchAutomations } = trpc.whatsapp.listAutomations.useQuery();
  const { data: stats } = trpc.whatsapp.getStats.useQuery();

  // Mutations
  const updateConfigMutation = trpc.whatsapp.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração atualizada");
      refetchConfig();
      setShowConfigDialog(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const createTemplateMutation = trpc.whatsapp.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template criado");
      refetchTemplates();
      setShowTemplateDialog(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const sendMessageMutation = trpc.whatsapp.sendMessage.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada");
      refetchMessages();
      setShowMessageDialog(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const sendMediaMutation = trpc.whatsapp.sendMedia.useMutation({
    onSuccess: () => {
      toast.success("Mídia enviada");
      refetchMessages();
    },
    onError: (error) => toast.error(error.message),
  });

  const createAutomationMutation = trpc.whatsapp.createAutomation.useMutation({
    onSuccess: () => {
      toast.success("Automação criada");
      refetchAutomations();
      setShowAutomationDialog(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateAutomationMutation = trpc.whatsapp.updateAutomation.useMutation({
    onSuccess: () => {
      toast.success("Automação atualizada");
      refetchAutomations();
    },
    onError: (error) => toast.error(error.message),
  });

  // Forms
  const [configForm, setConfigForm] = useState({
    apiKey: config?.apiKey || "",
    phoneNumberId: config?.phoneNumberId || "",
    businessAccountId: config?.businessAccountId || "",
    webhookSecret: config?.webhookSecret || "",
    isActive: config?.isActive || false,
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "custom" as any,
    content: "",
    variables: "",
  });

  const [messageForm, setMessageForm] = useState({
    phone: "",
    message: "",
    recipientName: "",
  });

  const [automationForm, setAutomationForm] = useState({
    name: "",
    triggerType: "photo_added" as any,
    templateId: 0,
    enabled: true,
  });

  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateConfigMutation.mutate(configForm);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    createTemplateMutation.mutate({
      ...templateForm,
      variables: templateForm.variables ? templateForm.variables.split(",").map(v => v.trim()) : [],
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageMutation.mutate(messageForm);
  };

  const handleCreateAutomation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!automationForm.templateId) {
      toast.error("Selecione um template");
      return;
    }
    createAutomationMutation.mutate(automationForm);
  };

  const toggleAutomation = (id: number, enabled: boolean) => {
    updateAutomationMutation.mutate({ id, enabled: !enabled });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-blue-500";
      case "delivered": return "bg-green-500";
      case "read": return "bg-purple-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      photo_added: "Foto Adicionada",
      vaccine_reminder_7d: "Lembrete Vacina (7 dias)",
      vaccine_reminder_1d: "Lembrete Vacina (1 dia)",
      checkin: "Check-in",
      checkout: "Check-out",
      daily_report: "Relatório Diário",
      medication_applied: "Medicamento Aplicado",
      preventive_reminder: "Lembrete Preventivo",
    };
    return labels[trigger] || trigger;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Central WhatsApp Business</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie mensagens automáticas, templates e grupos por pet
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats?.sent || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Entregues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.delivered || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats?.read || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="config">
              <Settings className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="templates">
              <MessageSquare className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="send">
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </TabsTrigger>
            <TabsTrigger value="automations">
              <Zap className="h-4 w-4 mr-2" />
              Automações
            </TabsTrigger>
            <TabsTrigger value="history">
              <BarChart3 className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações WhatsApp Business API</CardTitle>
                <CardDescription>
                  Configure as credenciais da API do WhatsApp Business
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateConfig} className="space-y-4">
                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={configForm.apiKey}
                      onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                      placeholder="Bearer token da API"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                    <Input
                      id="phoneNumberId"
                      value={configForm.phoneNumberId}
                      onChange={(e) => setConfigForm({ ...configForm, phoneNumberId: e.target.value })}
                      placeholder="ID do número de telefone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessAccountId">Business Account ID</Label>
                    <Input
                      id="businessAccountId"
                      value={configForm.businessAccountId}
                      onChange={(e) => setConfigForm({ ...configForm, businessAccountId: e.target.value })}
                      placeholder="ID da conta business"
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhookSecret">Webhook Secret (Opcional)</Label>
                    <Input
                      id="webhookSecret"
                      type="password"
                      value={configForm.webhookSecret}
                      onChange={(e) => setConfigForm({ ...configForm, webhookSecret: e.target.value })}
                      placeholder="Secret para validar webhooks"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={configForm.isActive}
                      onChange={(e) => setConfigForm({ ...configForm, isActive: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="isActive">Ativar integração WhatsApp</Label>
                  </div>
                  <Button type="submit" disabled={updateConfigMutation.isPending}>
                    {updateConfigMutation.isPending ? "Salvando..." : "Salvar Configuração"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status da Integração</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {config?.isActive ? (
                    <>
                      <Badge className="bg-green-500">Ativo</Badge>
                      <span className="text-sm text-muted-foreground">
                        Integração WhatsApp está funcionando
                      </span>
                    </>
                  ) : (
                    <>
                      <Badge className="bg-gray-500">Inativo</Badge>
                      <span className="text-sm text-muted-foreground">
                        Configure as credenciais e ative a integração
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Templates de Mensagens</h2>
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Template</DialogTitle>
                    <DialogDescription>
                      Crie um template de mensagem reutilizável
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateTemplate} className="space-y-4">
                    <div>
                      <Label htmlFor="templateName">Nome</Label>
                      <Input
                        id="templateName"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select
                        value={templateForm.category}
                        onValueChange={(value) => setTemplateForm({ ...templateForm, category: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="welcome">Boas-vindas</SelectItem>
                          <SelectItem value="booking_confirmation">Confirmação de Reserva</SelectItem>
                          <SelectItem value="vaccine_reminder">Lembrete de Vacina</SelectItem>
                          <SelectItem value="checkin">Check-in</SelectItem>
                          <SelectItem value="checkout">Check-out</SelectItem>
                          <SelectItem value="daily_report">Relatório Diário</SelectItem>
                          <SelectItem value="new_photo">Nova Foto</SelectItem>
                          <SelectItem value="medication_applied">Medicamento Aplicado</SelectItem>
                          <SelectItem value="preventive_reminder">Lembrete Preventivo</SelectItem>
                          <SelectItem value="custom">Personalizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="content">Conteúdo</Label>
                      <Textarea
                        id="content"
                        value={templateForm.content}
                        onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                        rows={4}
                        placeholder="Use {{variavel}} para variáveis dinâmicas"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="variables">Variáveis (separadas por vírgula)</Label>
                      <Input
                        id="variables"
                        value={templateForm.variables}
                        onChange={(e) => setTemplateForm({ ...templateForm, variables: e.target.value })}
                        placeholder="petName, date, time"
                      />
                    </div>
                    <Button type="submit" disabled={createTemplateMutation.isPending}>
                      {createTemplateMutation.isPending ? "Criando..." : "Criar Template"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription>{template.category}</CardDescription>
                      </div>
                      <Badge variant={template.status === "active" ? "default" : "secondary"}>
                        {template.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{template.content}</p>
                    {template.variables && Array.isArray(template.variables) && template.variables.length > 0 ? (
                      <div className="mt-2">
                        <span className="text-xs text-muted-foreground">Variáveis: </span>
                        {(template.variables as string[]).map((v: string) => (
                          <Badge key={v} variant="outline" className="mr-1">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enviar Mensagem Manual</CardTitle>
                <CardDescription>
                  Envie uma mensagem de texto para um tutor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Telefone (com código do país)</Label>
                    <Input
                      id="phone"
                      value={messageForm.phone}
                      onChange={(e) => setMessageForm({ ...messageForm, phone: e.target.value })}
                      placeholder="+5511999999999"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipientName">Nome do Destinatário (Opcional)</Label>
                    <Input
                      id="recipientName"
                      value={messageForm.recipientName}
                      onChange={(e) => setMessageForm({ ...messageForm, recipientName: e.target.value })}
                      placeholder="Nome do tutor"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea
                      id="message"
                      value={messageForm.message}
                      onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={sendMessageMutation.isPending}>
                    {sendMessageMutation.isPending ? "Enviando..." : "Enviar Mensagem"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Automations Tab */}
          <TabsContent value="automations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Automações</h2>
              <Dialog open={showAutomationDialog} onOpenChange={setShowAutomationDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Automação
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Automação</DialogTitle>
                    <DialogDescription>
                      Configure uma automação de mensagens
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateAutomation} className="space-y-4">
                    <div>
                      <Label htmlFor="automationName">Nome</Label>
                      <Input
                        id="automationName"
                        value={automationForm.name}
                        onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="triggerType">Gatilho</Label>
                      <Select
                        value={automationForm.triggerType}
                        onValueChange={(value) => setAutomationForm({ ...automationForm, triggerType: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="photo_added">Foto Adicionada</SelectItem>
                          <SelectItem value="vaccine_reminder_7d">Lembrete Vacina (7 dias)</SelectItem>
                          <SelectItem value="vaccine_reminder_1d">Lembrete Vacina (1 dia)</SelectItem>
                          <SelectItem value="checkin">Check-in</SelectItem>
                          <SelectItem value="checkout">Check-out</SelectItem>
                          <SelectItem value="daily_report">Relatório Diário</SelectItem>
                          <SelectItem value="medication_applied">Medicamento Aplicado</SelectItem>
                          <SelectItem value="preventive_reminder">Lembrete Preventivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="templateId">Template</Label>
                      <Select
                        value={automationForm.templateId.toString()}
                        onValueChange={(value) => setAutomationForm({ ...automationForm, templateId: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.filter(t => t.status === "active").map((template) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={createAutomationMutation.isPending}>
                      {createAutomationMutation.isPending ? "Criando..." : "Criar Automação"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {automations.map((automation) => (
                <Card key={automation.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{automation.name}</CardTitle>
                        <CardDescription>{getTriggerLabel(automation.triggerType)}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={automation.enabled ? "default" : "secondary"}>
                          {automation.enabled ? "Ativo" : "Inativo"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleAutomation(automation.id, automation.enabled)}
                        >
                          {automation.enabled ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Template: {automation.templateName || `ID ${automation.templateId}`}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Mensagens</CardTitle>
                <CardDescription>
                  Últimas 50 mensagens enviadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {messageHistory.map((msg) => (
                    <div key={msg.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{msg.recipientName || msg.recipientPhone}</span>
                          <Badge className={getStatusColor(msg.status)}>{msg.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{msg.messageContent}</p>
                        {msg.mediaUrl && (
                          <p className="text-xs text-muted-foreground mt-1">📎 Mídia anexada</p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {msg.sentAt ? new Date(msg.sentAt).toLocaleString("pt-BR") : "Aguardando"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
