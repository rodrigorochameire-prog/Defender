"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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
  Settings,
  Phone,
  RefreshCw,
  Loader2,
  ExternalLink,
  Key,
  History,
  Save,
  Bell,
  AlertCircle,
  Copy,
  Check,
  Eye,
  EyeOff,
  FileText,
  Calendar,
  Gavel,
  Clock,
  MessageSquare,
  Zap,
  Users,
  ArrowRight,
  CheckCircle,
  XOctagon,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ==========================================
// COMPONENTES
// ==========================================

function ConnectionStatus({ 
  isConfigured, 
  hasAccessToken, 
  isActive,
  onActivate,
  onDeactivate,
  isLoading 
}: { 
  isConfigured: boolean;
  hasAccessToken: boolean;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  isLoading: boolean;
}) {
  const getStatus = () => {
    if (!isConfigured || !hasAccessToken) {
      return { label: "Não configurado", color: "amber", icon: AlertCircle };
    }
    if (isActive) {
      return { label: "Ativo", color: "emerald", icon: CheckCircle2 };
    }
    return { label: "Inativo", color: "zinc", icon: XCircle };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={cn(
      "p-6 border-2",
      status.color === "emerald" && "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10",
      status.color === "amber" && "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10",
      status.color === "zinc" && "border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/10"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center",
            status.color === "emerald" && "bg-emerald-100 dark:bg-emerald-900/30",
            status.color === "amber" && "bg-amber-100 dark:bg-amber-900/30",
            status.color === "zinc" && "bg-zinc-100 dark:bg-zinc-800"
          )}>
            <MessageCircle className={cn(
              "w-7 h-7",
              status.color === "emerald" && "text-emerald-600 dark:text-emerald-400",
              status.color === "amber" && "text-amber-600 dark:text-amber-400",
              status.color === "zinc" && "text-zinc-500"
            )} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">WhatsApp Business</h3>
              <Badge className={cn(
                status.color === "emerald" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                status.color === "amber" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                status.color === "zinc" && "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
              )}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {isConfigured && hasAccessToken
                ? isActive 
                  ? "Integração ativa. Envie notificações para assistidos."
                  : "Integração configurada mas inativa."
                : "Configure as credenciais da API Meta para ativar."
              }
            </p>
          </div>
        </div>
        
        {isConfigured && hasAccessToken && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">
              {isActive ? "Ativo" : "Inativo"}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => checked ? onActivate() : onDeactivate()}
              disabled={isLoading}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function ConfigurationCard({ 
  configInfo,
  currentConfig,
  onSave,
  isSaving 
}: { 
  configInfo: any;
  currentConfig: any;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [showToken, setShowToken] = useState(false);
  const [formData, setFormData] = useState({
    accessToken: "",
    phoneNumberId: currentConfig?.config?.phoneNumberId || "",
    businessAccountId: currentConfig?.config?.businessAccountId || "",
  });

  const handleSave = () => {
    const data: any = {};
    if (formData.accessToken) data.accessToken = formData.accessToken;
    if (formData.phoneNumberId) data.phoneNumberId = formData.phoneNumberId;
    if (formData.businessAccountId) data.businessAccountId = formData.businessAccountId;
    
    if (Object.keys(data).length === 0) {
      toast.error("Preencha pelo menos um campo");
      return;
    }
    
    onSave(data);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Key className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Credenciais da API
          </h3>
          <p className="text-sm text-zinc-500">
            Configure as credenciais do WhatsApp Business API (Meta)
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accessToken" className="flex items-center gap-2">
            Access Token *
            {currentConfig?.config?.hasAccessToken && (
              <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                <Check className="w-3 h-3 mr-1" /> Configurado
              </Badge>
            )}
          </Label>
          <div className="flex gap-2">
            <Input
              id="accessToken"
              type={showToken ? "text" : "password"}
              value={formData.accessToken}
              onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
              placeholder={currentConfig?.config?.hasAccessToken ? "••••••••••••••••" : "EAAxxxxxxxx..."}
              className="font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-zinc-500">
            Token de acesso permanente ou de longa duração
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
          <Input
            id="phoneNumberId"
            value={formData.phoneNumberId}
            onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
            placeholder="1234567890123456"
            className="font-mono"
          />
          <p className="text-xs text-zinc-500">
            ID do número de telefone no painel Meta Business
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessAccountId">Business Account ID (opcional)</Label>
          <Input
            id="businessAccountId"
            value={formData.businessAccountId}
            onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
            placeholder="1234567890123456"
            className="font-mono"
          />
        </div>

        <div className="pt-4 flex items-center justify-between">
          <a 
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <HelpCircle className="w-4 h-4" />
            Como obter as credenciais
            <ExternalLink className="w-3 h-3" />
          </a>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Configuração
          </Button>
        </div>
      </div>
    </Card>
  );
}

function AutomationCard({ 
  config,
  onSave,
  isSaving 
}: { 
  config: any;
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [settings, setSettings] = useState({
    autoNotifyPrazo: config?.config?.autoNotifyPrazo ?? false,
    autoNotifyAudiencia: config?.config?.autoNotifyAudiencia ?? false,
    autoNotifyJuri: config?.config?.autoNotifyJuri ?? false,
    autoNotifyMovimentacao: config?.config?.autoNotifyMovimentacao ?? false,
  });

  const automations = [
    {
      id: "autoNotifyPrazo",
      icon: Clock,
      title: "Lembrete de Prazos",
      description: "Notifica assistido sobre prazos próximos ao vencimento",
      color: "amber",
    },
    {
      id: "autoNotifyAudiencia",
      icon: Calendar,
      title: "Audiências Agendadas",
      description: "Envia lembretes de audiências 24h antes",
      color: "blue",
    },
    {
      id: "autoNotifyJuri",
      icon: Gavel,
      title: "Sessões do Júri",
      description: "Notifica sobre plenários do Tribunal do Júri",
      color: "emerald",
    },
    {
      id: "autoNotifyMovimentacao",
      icon: FileText,
      title: "Movimentações",
      description: "Informa sobre novas movimentações processuais",
      color: "violet",
    },
  ];

  const handleToggle = (id: string, value: boolean) => {
    const newSettings = { ...settings, [id]: value };
    setSettings(newSettings);
    onSave(newSettings);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Notificações Automáticas
          </h3>
          <p className="text-sm text-zinc-500">
            Configure quais eventos disparam notificações
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {automations.map((automation) => {
          const Icon = automation.icon;
          const isEnabled = settings[automation.id as keyof typeof settings];
          
          return (
            <div
              key={automation.id}
              className={cn(
                "p-4 rounded-xl border transition-all",
                isEnabled 
                  ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10" 
                  : "border-zinc-200 dark:border-zinc-800"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    `bg-${automation.color}-100 dark:bg-${automation.color}-900/30`
                  )}>
                    <Icon className={cn("w-5 h-5", `text-${automation.color}-600 dark:text-${automation.color}-400`)} />
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                      {automation.title}
                    </h4>
                    <p className="text-xs text-zinc-500">{automation.description}</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(value) => handleToggle(automation.id, value)}
                  disabled={isSaving}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SendMessageCard({ 
  templates,
  onSend,
  onSendTest,
  isSending,
  isTestSending 
}: { 
  templates: any;
  onSend: (phone: string, message: string, context: string) => void;
  onSendTest: (phone: string) => void;
  isSending: boolean;
  isTestSending: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const templateList = templates ? Object.entries(templates).map(([key, value]: [string, any]) => ({
    id: key,
    ...value,
  })) : [];

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templateList.find(t => t.id === templateId);
    if (template) {
      setMessage(template.example);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <Send className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Enviar Mensagem
          </h3>
          <p className="text-sm text-zinc-500">
            Teste a integração ou envie mensagens manuais
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Número de Telefone</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(71) 99999-9999"
          />
        </div>

        <div className="space-y-2">
          <Label>Template (opcional)</Label>
          <Select value={selectedTemplate} onValueChange={handleSelectTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um template..." />
            </SelectTrigger>
            <SelectContent>
              {templateList.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Mensagem</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            rows={6}
          />
          <p className="text-xs text-zinc-500">
            Suporta formatação: *negrito*, _itálico_, ~tachado~
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onSendTest(phone)}
            disabled={!phone || isTestSending}
            className="flex-1"
          >
            {isTestSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Enviar Teste
          </Button>
          <Button
            onClick={() => onSend(phone, message, "manual")}
            disabled={!phone || !message || isSending}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar Mensagem
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MessageHistoryCard({ messages, isLoading }: { messages: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  const messageList = messages?.messages || [];

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Histórico de Mensagens
          </h3>
          <p className="text-sm text-zinc-500">
            Últimas {messageList.length} mensagens enviadas
          </p>
        </div>
      </div>

      {messageList.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-zinc-500">Nenhuma mensagem enviada ainda</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {messageList.map((msg: any) => (
            <div
              key={msg.id}
              className={cn(
                "p-4 rounded-lg border transition-all",
                msg.status === "sent" && "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10",
                msg.status === "failed" && "border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10",
                msg.status === "delivered" && "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {msg.status === "sent" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  {msg.status === "delivered" && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                  {msg.status === "failed" && <XOctagon className="w-4 h-4 text-rose-500" />}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {msg.toPhone}
                  </span>
                  {msg.assistido && (
                    <Badge variant="outline" className="text-xs">
                      {msg.assistido.nome}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-zinc-500">
                  {msg.sentAt ? formatDistanceToNow(new Date(msg.sentAt), { addSuffix: true, locale: ptBR }) : "-"}
                </span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">
                {msg.content}
              </p>
              {msg.errorMessage && (
                <p className="text-xs text-rose-600 mt-2">
                  Erro: {msg.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState("status");

  // Queries
  const { data: isConfigured, isLoading: checkingConfig, refetch: refetchConfigured } = trpc.whatsapp.isConfigured.useQuery();
  const { data: myConfig, refetch: refetchConfig, isLoading: loadingConfig } = trpc.whatsapp.getMyConfig.useQuery();
  const { data: templates } = trpc.whatsapp.getTemplates.useQuery();
  const { data: configInfo } = trpc.whatsapp.getConfigInfo.useQuery();
  const { data: messageHistory, refetch: refetchHistory, isLoading: loadingHistory } = trpc.whatsapp.getMessageHistory.useQuery(
    { limit: 20 },
    { enabled: myConfig?.hasConfig }
  );

  // Mutations
  const saveConfigMutation = trpc.whatsapp.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva!");
      refetchConfig();
      refetchConfigured();
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
      refetchHistory();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendTextMutation = trpc.whatsapp.sendText.useMutation({
    onSuccess: () => {
      toast.success("Mensagem enviada!");
      refetchHistory();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyConnectionMutation = trpc.whatsapp.verifyConnection.useMutation({
    onSuccess: (data) => {
      toast.success(`Conexão verificada! Número: ${data.phoneNumber}`);
      refetchConfig();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Loading
  if (checkingConfig || loadingConfig) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const hasAccessToken = myConfig?.config?.hasAccessToken ?? false;
  const isActive = myConfig?.config?.isActive ?? false;

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Header - Padrão Defender */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg">
            <MessageCircle className="w-5 h-5 text-white dark:text-zinc-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              WhatsApp Business
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Notificações automáticas para assistidos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a 
            href="https://business.facebook.com/settings/whatsapp-business-accounts" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Meta Business
            </Button>
          </a>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchConfig();
              refetchHistory();
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status da Conexão */}
      <ConnectionStatus
        isConfigured={myConfig?.hasConfig ?? false}
        hasAccessToken={hasAccessToken}
        isActive={isActive}
        onActivate={() => setActiveMutation.mutate({ active: true })}
        onDeactivate={() => setActiveMutation.mutate({ active: false })}
        isLoading={setActiveMutation.isPending}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <TabsTrigger 
            value="status" 
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "status" 
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md" 
                : "text-zinc-600 dark:text-zinc-400"
            )}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger 
            value="send" 
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "send" 
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md" 
                : "text-zinc-600 dark:text-zinc-400"
            )}
            disabled={!hasAccessToken || !isActive}
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar
          </TabsTrigger>
          <TabsTrigger 
            value="automation" 
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "automation" 
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md" 
                : "text-zinc-600 dark:text-zinc-400"
            )}
            disabled={!hasAccessToken}
          >
            <Zap className="w-4 h-4 mr-2" />
            Automação
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === "history" 
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-md" 
                : "text-zinc-600 dark:text-zinc-400"
            )}
            disabled={!myConfig?.hasConfig}
          >
            <History className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Tab: Configuração */}
        <TabsContent value="status" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ConfigurationCard
              configInfo={configInfo}
              currentConfig={myConfig}
              onSave={(data) => saveConfigMutation.mutate(data)}
              isSaving={saveConfigMutation.isPending}
            />
            
            {/* Instruções */}
            <Card className="p-6 bg-zinc-50 dark:bg-zinc-900/50">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Como configurar a integração
              </h3>
              <ol className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium shrink-0">1</span>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Crie uma conta no Meta Business</p>
                    <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                      business.facebook.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium shrink-0">2</span>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Configure o WhatsApp Business API</p>
                    <p className="text-xs text-zinc-500">Acesse a seção WhatsApp e adicione um número</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium shrink-0">3</span>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Gere um Access Token permanente</p>
                    <p className="text-xs text-zinc-500">Crie um app e gere um token com permissões do WhatsApp</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium shrink-0">4</span>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Copie o Phone Number ID</p>
                    <p className="text-xs text-zinc-500">Encontre na seção Configuração da API</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-xs font-medium shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Cole as credenciais aqui e ative</p>
                    <p className="text-xs text-zinc-500">Teste enviando uma mensagem para seu número</p>
                  </div>
                </li>
              </ol>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Enviar */}
        <TabsContent value="send" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SendMessageCard
              templates={templates}
              onSend={(phone, message, context) => sendTextMutation.mutate({ phone, message, context: context as any })}
              onSendTest={(phone) => sendTestMutation.mutate({ phone })}
              isSending={sendTextMutation.isPending}
              isTestSending={sendTestMutation.isPending}
            />
            
            {/* Templates */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Templates Jurídicos
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Modelos prontos para notificações
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {templates && Object.entries(templates).map(([key, template]: [string, any]) => (
                  <div
                    key={key}
                    className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                        {template.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {key}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mb-3">{template.description}</p>
                    <pre className="text-xs bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {template.example}
                    </pre>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Automação */}
        <TabsContent value="automation" className="mt-6">
          <AutomationCard
            config={myConfig}
            onSave={(data) => saveConfigMutation.mutate(data)}
            isSaving={saveConfigMutation.isPending}
          />
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="history" className="mt-6">
          <MessageHistoryCard
            messages={messageHistory}
            isLoading={loadingHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
