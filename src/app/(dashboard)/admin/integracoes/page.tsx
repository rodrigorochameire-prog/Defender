"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Zap,
  Link2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  ExternalLink,
  Play,
  Pause,
  Clock,
  FolderOpen,
  FileText,
  Calendar,
  MessageCircle,
  Bell,
  Database,
  Webhook,
  Bot,
  Sparkles,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==========================================
// TIPOS
// ==========================================

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected" | "error";
  lastSync?: string;
  features: string[];
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: "active" | "paused" | "error";
  lastRun?: string;
  runsToday: number;
}

// ==========================================
// DADOS MOCK
// ==========================================

const INTEGRATIONS: Integration[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sincronização de audiências e prazos com seu calendário",
    icon: <Calendar className="w-6 h-6" />,
    status: "disconnected",
    features: ["Criar eventos", "Atualizar eventos", "Sincronização bidirecional"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Notificações automáticas para assistidos",
    icon: <MessageCircle className="w-6 h-6" />,
    status: "disconnected",
    features: ["Notificação de audiências", "Lembrete de prazos", "Templates personalizados"],
  },
  {
    id: "n8n",
    name: "n8n Automations",
    description: "Workflows de automação e integrações avançadas",
    icon: <Zap className="w-6 h-6" />,
    status: "disconnected",
    features: ["Monitoramento de pastas", "OCR de intimações", "Resumo por IA"],
  },
];

const WORKFLOWS: Workflow[] = [
  {
    id: "pauta-parser",
    name: "Parser de Pautas",
    description: "Lê PDFs de pauta, extrai audiências e cria eventos no calendário",
    trigger: "Novo arquivo na pasta 'Pautas'",
    status: "active",
    lastRun: "Há 2 horas",
    runsToday: 3,
  },
  {
    id: "intimacao-reader",
    name: "Leitor de Intimações",
    description: "Recebe foto de intimação, faz OCR, resume com IA e cria demanda",
    trigger: "Webhook do WhatsApp",
    status: "active",
    lastRun: "Há 30 minutos",
    runsToday: 8,
  },
  {
    id: "drive-monitor",
    name: "Monitor de Drive",
    description: "Detecta novos arquivos e cria alertas no DefesaHub",
    trigger: "Novo arquivo no Drive",
    status: "active",
    lastRun: "Há 5 minutos",
    runsToday: 15,
  },
  {
    id: "prazo-notify",
    name: "Notificador de Prazos",
    description: "Envia lembretes de prazos próximos via WhatsApp e email",
    trigger: "Diariamente às 08:00",
    status: "paused",
    lastRun: "Ontem às 08:00",
    runsToday: 0,
  },
];

// ==========================================
// COMPONENTES
// ==========================================

function IntegrationCard({ integration }: { integration: Integration }) {
  const statusConfig = {
    connected: { label: "Conectado", color: "bg-emerald-500", textColor: "text-emerald-700 dark:text-emerald-400" },
    disconnected: { label: "Desconectado", color: "bg-zinc-400", textColor: "text-zinc-600 dark:text-zinc-400" },
    error: { label: "Erro", color: "bg-rose-500", textColor: "text-rose-700 dark:text-rose-400" },
  };

  const status = statusConfig[integration.status];

  return (
    <Card className="p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "p-3 rounded-xl",
          integration.status === "connected" 
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
        )}>
          {integration.icon}
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", status.color)} />
          <span className={cn("text-xs font-medium", status.textColor)}>
            {status.label}
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
        {integration.name}
      </h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        {integration.description}
      </p>

      {integration.lastSync && (
        <p className="text-xs text-zinc-400 mb-4 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Última sync: {integration.lastSync}
        </p>
      )}

      <div className="flex flex-wrap gap-1 mb-4">
        {integration.features.slice(0, 2).map((feature, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs">
            {feature}
          </Badge>
        ))}
        {integration.features.length > 2 && (
          <Badge variant="secondary" className="text-xs">
            +{integration.features.length - 2}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {integration.status === "connected" ? (
          <>
            <Button variant="outline" size="sm" className="flex-1">
              <Settings className="w-4 h-4 mr-1" />
              Configurar
            </Button>
            <Button variant="ghost" size="sm">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            <Link2 className="w-4 h-4 mr-1" />
            Conectar
          </Button>
        )}
      </div>
    </Card>
  );
}

function WorkflowCard({ workflow }: { workflow: Workflow }) {
  const [isActive, setIsActive] = useState(workflow.status === "active");

  const statusConfig = {
    active: { label: "Ativo", color: "bg-emerald-500" },
    paused: { label: "Pausado", color: "bg-amber-500" },
    error: { label: "Erro", color: "bg-rose-500" },
  };

  const status = statusConfig[workflow.status];

  return (
    <Card className={cn(
      "p-4 transition-all",
      isActive ? "border-l-[3px] border-l-emerald-500" : "border-l-[3px] border-l-zinc-300 dark:border-l-zinc-700"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {workflow.name}
          </h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {workflow.description}
          </p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={setIsActive}
          className="data-[state=checked]:bg-emerald-600"
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
        <Webhook className="w-3 h-3" />
        <span>{workflow.trigger}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className={cn("w-1.5 h-1.5 rounded-full", status.color)} />
            <span className="text-xs text-zinc-500">{status.label}</span>
          </div>
          {workflow.lastRun && (
            <span className="text-xs text-zinc-400">
              Último: {workflow.lastRun}
            </span>
          )}
        </div>
        <Badge variant="secondary" className="text-xs">
          {workflow.runsToday} hoje
        </Badge>
      </div>
    </Card>
  );
}

function WebhookSection() {
  const [showToken, setShowToken] = useState(false);
  const webhookUrl = "https://defesahub.app/api/webhooks/n8n";
  const webhookToken = "dhub_wh_sk_live_xxxxxxxxxxxxxxxxxxxx";

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
          <Webhook className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Endpoints Webhook
          </h3>
          <p className="text-sm text-zinc-500">
            Use esses endpoints para enviar dados do n8n para o DefesaHub
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs text-zinc-500">URL do Webhook</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input value={webhookUrl} readOnly className="font-mono text-sm" />
            <Button variant="outline" size="sm">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs text-zinc-500">Token de Autenticação</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              type={showToken ? "text" : "password"}
              value={webhookToken}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
            Endpoints Disponíveis
          </h4>
          <div className="space-y-2">
            {[
              { method: "POST", path: "/audiencias", desc: "Criar audiência a partir de pauta" },
              { method: "POST", path: "/demandas", desc: "Criar demanda a partir de intimação" },
              { method: "POST", path: "/documentos", desc: "Registrar novo documento do Drive" },
              { method: "POST", path: "/alertas", desc: "Criar alerta/notificação" },
            ].map((endpoint, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded bg-zinc-50 dark:bg-zinc-900">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                  {endpoint.method}
                </Badge>
                <code className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
                  {endpoint.path}
                </code>
                <span className="text-xs text-zinc-500 ml-auto">
                  {endpoint.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function AISection() {
  return (
    <Card className="p-6 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20 border-violet-200 dark:border-violet-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Inteligência Artificial
            <Badge className="bg-violet-600 text-white text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Recursos avançados com IA para automação jurídica
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-white/50 dark:bg-zinc-900/50 border border-violet-100 dark:border-violet-800">
          <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-2" />
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Resumo de Documentos
          </h4>
          <p className="text-xs text-zinc-500 mt-1">
            Extração automática de pontos-chave de intimações e decisões
          </p>
        </div>
        <div className="p-3 rounded-lg bg-white/50 dark:bg-zinc-900/50 border border-violet-100 dark:border-violet-800">
          <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-2" />
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Parser de Pautas
          </h4>
          <p className="text-xs text-zinc-500 mt-1">
            Extração de datas, réus e tipos de audiência de PDFs
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-violet-200 dark:border-violet-800">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            500 créditos/mês
          </p>
          <p className="text-xs text-zinc-500">
            Restam 342 créditos este mês
          </p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700">
          Configurar IA
        </Button>
      </div>
    </Card>
  );
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function IntegracoesPage() {
  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30">
            <Zap className="w-6 h-6 text-violet-700 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Integrações & Automação
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Conecte serviços externos e configure workflows automatizados
            </p>
          </div>
        </div>

        <Tabs defaultValue="integracoes">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800">
            <TabsTrigger value="integracoes" className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Integrações
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Workflows
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              Webhooks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="integracoes" className="mt-6 space-y-6">
            {/* Google Drive - Destacado */}
            <Card className="p-6 border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                    <FolderOpen className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Google Drive
                      </h3>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Principal
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      Armazenamento e sincronização de documentos processuais
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Upload automático
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" /> Pastas por processo
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Sincronização bidirecional
                      </span>
                    </div>
                  </div>
                </div>
                <a href="/admin/settings/drive">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar Integração
                  </Button>
                </a>
              </div>
            </Card>

            {/* Outras Integrações */}
            <div>
              <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
                Outras Integrações
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {INTEGRATIONS.map((integration) => (
                  <IntegrationCard key={integration.id} integration={integration} />
                ))}
              </div>
            </div>

            {/* AI Section */}
            <AISection />
          </TabsContent>

          <TabsContent value="workflows" className="mt-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-0">
                <div className="flex items-center gap-3">
                  <Play className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                      {WORKFLOWS.filter(w => w.status === "active").length}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Ativos</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-0">
                <div className="flex items-center gap-3">
                  <Pause className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                      {WORKFLOWS.filter(w => w.status === "paused").length}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Pausados</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-0">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {WORKFLOWS.reduce((acc, w) => acc + w.runsToday, 0)}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Execuções Hoje</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-0">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-zinc-500" />
                  <div>
                    <p className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">
                      {WORKFLOWS.length}
                    </p>
                    <p className="text-xs text-zinc-500">Total</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Workflows List */}
            <div className="space-y-3">
              {WORKFLOWS.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>

            {/* Add Workflow */}
            <Button className="w-full" variant="outline">
              <Zap className="w-4 h-4 mr-2" />
              Criar Novo Workflow
            </Button>
          </TabsContent>

          <TabsContent value="webhooks" className="mt-6">
            <WebhookSection />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
