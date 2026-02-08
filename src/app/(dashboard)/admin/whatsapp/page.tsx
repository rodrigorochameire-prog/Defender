"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle,
  Send,
  Settings,
  RefreshCw,
  Loader2,
  ExternalLink,
  QrCode,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  Users,
  MessageSquare,
  ArrowRight,
  Link2,
  UserPlus,
  Download,
  HelpCircle,
  Activity,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ==========================================
// COMPONENTES
// ==========================================

function StatusCard({
  config,
  onRefresh,
}: {
  config: any;
  onRefresh: () => void;
}) {
  const { data: connectionStatus, isLoading } = trpc.whatsappChat.getConnectionStatus.useQuery(
    { configId: config.id },
    { refetchInterval: 15000 }
  );

  const isConnected = connectionStatus?.state === "open";

  return (
    <Card className={cn(
      "border-2 transition-all",
      isConnected
        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
        : "border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              isConnected ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
            )}>
              {isConnected ? (
                <Wifi className="w-6 h-6 text-emerald-600" />
              ) : (
                <WifiOff className="w-6 h-6 text-amber-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {config.instanceName}
                <Badge className={cn(
                  "text-xs",
                  isConnected
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                  {isLoading ? "Verificando..." : isConnected ? "Conectado" : "Desconectado"}
                </Badge>
              </CardTitle>
              <CardDescription>
                {config.phoneNumber || "Número não vinculado"}
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Link href="/admin/whatsapp/chat" className="flex-1">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              Abrir Chat
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsCards({ configId }: { configId: number }) {
  const { data: stats, isLoading } = trpc.whatsappChat.getStats.useQuery(
    { configId },
    { refetchInterval: 30000 }
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const statsData = [
    {
      label: "Total de Contatos",
      value: stats?.totalContacts || 0,
      icon: Users,
      color: "blue",
    },
    {
      label: "Mensagens Não Lidas",
      value: stats?.unreadMessages || 0,
      icon: MessageSquare,
      color: stats?.unreadMessages ? "rose" : "zinc",
    },
    {
      label: "Mensagens Enviadas",
      value: stats?.outboundMessages || 0,
      icon: Send,
      color: "emerald",
    },
    {
      label: "Mensagens Recebidas",
      value: stats?.inboundMessages || 0,
      icon: MessageCircle,
      color: "violet",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statsData.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                stat.color === "blue" && "bg-blue-100 dark:bg-blue-900/30",
                stat.color === "rose" && "bg-rose-100 dark:bg-rose-900/30",
                stat.color === "emerald" && "bg-emerald-100 dark:bg-emerald-900/30",
                stat.color === "violet" && "bg-violet-100 dark:bg-violet-900/30",
                stat.color === "zinc" && "bg-zinc-100 dark:bg-zinc-800",
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  stat.color === "blue" && "text-blue-600",
                  stat.color === "rose" && "text-rose-600",
                  stat.color === "emerald" && "text-emerald-600",
                  stat.color === "violet" && "text-violet-600",
                  stat.color === "zinc" && "text-zinc-500",
                )} />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-zinc-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function QuickActions({ configId }: { configId: number }) {
  const utils = trpc.useUtils();

  const syncMutation = trpc.whatsappChat.syncContacts.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Sincronização concluída! ${result.inserted} novos contatos, ${result.updated} atualizados.`
      );
      utils.whatsappChat.getStats.invalidate();
      utils.whatsappChat.listContacts.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href="/admin/whatsapp/chat" className="block">
          <Button variant="outline" className="w-full justify-start">
            <MessageSquare className="w-4 h-4 mr-2" />
            Abrir Chat
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </Link>

        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => syncMutation.mutate({ configId })}
          disabled={syncMutation.isPending}
        >
          {syncMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Sincronizar Contatos
          {syncMutation.isPending && <span className="ml-auto text-xs text-zinc-500">Sincronizando...</span>}
        </Button>

        <Link href="/admin/whatsapp/vincular" className="block">
          <Button variant="outline" className="w-full justify-start">
            <Link2 className="w-4 h-4 mr-2" />
            Vincular Contatos a Assistidos
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </Link>

        <Link href="/admin/assistidos" className="block">
          <Button variant="outline" className="w-full justify-start">
            <Users className="w-4 h-4 mr-2" />
            Gerenciar Assistidos
            <ArrowRight className="w-4 h-4 ml-auto" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function RecentContacts({ configId }: { configId: number }) {
  const { data: contactsData, isLoading } = trpc.whatsappChat.listContacts.useQuery({
    configId,
    limit: 5,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contatos Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const contacts = contactsData?.contacts || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Contatos Recentes
        </CardTitle>
        <Link href="/admin/whatsapp/chat">
          <Button variant="ghost" size="sm">
            Ver todos
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum contato ainda</p>
            <p className="text-xs mt-1">Sincronize os contatos do WhatsApp</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact: any) => (
              <Link
                key={contact.id}
                href={`/admin/whatsapp/chat?contactId=${contact.id}`}
                className="block"
              >
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-medium">
                    {contact.pushName?.[0]?.toUpperCase() || contact.phone?.slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {contact.pushName || contact.name || formatPhone(contact.phone)}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {contact.assistido ? (
                        <span className="flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          {contact.assistido.nome}
                        </span>
                      ) : (
                        formatPhone(contact.phone)
                      )}
                    </p>
                  </div>
                  {contact.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {contact.unreadCount}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UnlinkedContacts({ configId }: { configId: number }) {
  const { data: contactsData, isLoading } = trpc.whatsappChat.listContacts.useQuery({
    configId,
    limit: 100,
  });

  const unlinkedContacts = useMemo(() => {
    return (contactsData?.contacts || []).filter((c: any) => !c.assistidoId).slice(0, 5);
  }, [contactsData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contatos Não Vinculados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Contatos Não Vinculados
          </CardTitle>
          <CardDescription>
            Vincule contatos a assistidos para melhor organização
          </CardDescription>
        </div>
        <Link href="/admin/whatsapp/vincular">
          <Button variant="outline" size="sm">
            Vincular
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {unlinkedContacts.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-50" />
            <p>Todos os contatos estão vinculados!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unlinkedContacts.map((contact: any) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800"
              >
                <div className="w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-sm font-medium">
                  {contact.pushName?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {contact.pushName || "Sem nome"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatPhone(contact.phone)}
                  </p>
                </div>
                <Link href={`/admin/whatsapp/vincular?contactId=${contact.id}`}>
                  <Button size="sm" variant="outline">
                    <Link2 className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InstanceConfig() {
  const utils = trpc.useUtils();
  const [showNewForm, setShowNewForm] = useState(false);
  const [newConfig, setNewConfig] = useState({
    instanceName: "",
    apiUrl: "",
    apiKey: "",
  });

  const { data: configs, isLoading } = trpc.whatsappChat.listConfigs.useQuery();

  const createMutation = trpc.whatsappChat.createConfig.useMutation({
    onSuccess: () => {
      toast.success("Instância criada com sucesso!");
      utils.whatsappChat.listConfigs.invalidate();
      setShowNewForm(false);
      setNewConfig({ instanceName: "", apiUrl: "", apiKey: "" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.whatsappChat.deleteConfig.useMutation({
    onSuccess: () => {
      toast.success("Instância removida!");
      utils.whatsappChat.listConfigs.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração da Instância
          </CardTitle>
          <CardDescription>
            Gerencie suas conexões WhatsApp via Evolution API
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNewForm(!showNewForm)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nova
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showNewForm && (
          <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 space-y-4">
            <h4 className="font-medium">Adicionar Nova Instância</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instanceName">Nome da Instância *</Label>
                <Input
                  id="instanceName"
                  value={newConfig.instanceName}
                  onChange={(e) => setNewConfig({ ...newConfig, instanceName: e.target.value })}
                  placeholder="ombuds-principal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiUrl">URL da API *</Label>
                <Input
                  id="apiUrl"
                  value={newConfig.apiUrl}
                  onChange={(e) => setNewConfig({ ...newConfig, apiUrl: e.target.value })}
                  placeholder="https://evolution-api.exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={newConfig.apiKey}
                  onChange={(e) => setNewConfig({ ...newConfig, apiKey: e.target.value })}
                  placeholder="sua-api-key"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate({
                  instanceName: newConfig.instanceName,
                  apiUrl: newConfig.apiUrl,
                  apiKey: newConfig.apiKey,
                  webhookUrl: `${window.location.origin}/api/webhooks/evolution`,
                })}
                disabled={createMutation.isPending || !newConfig.instanceName || !newConfig.apiUrl || !newConfig.apiKey}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Instância
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : configs && configs.length > 0 ? (
          <div className="space-y-3">
            {configs.map((config) => (
              <div
                key={config.id}
                className="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    config.status === "connected" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-zinc-100 dark:bg-zinc-800"
                  )}>
                    {config.status === "connected" ? (
                      <Wifi className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{config.instanceName}</p>
                    <p className="text-xs text-zinc-500">{config.apiUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "text-xs",
                    config.status === "connected"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-zinc-100 text-zinc-700"
                  )}>
                    {config.status === "connected" ? "Conectado" : "Desconectado"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:text-rose-600"
                    onClick={() => {
                      if (confirm("Tem certeza que deseja remover esta instância?")) {
                        deleteMutation.mutate({ id: config.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <QrCode className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
            <p className="text-zinc-500">Nenhuma instância configurada</p>
            <p className="text-xs text-zinc-400 mt-1">
              Clique em &quot;Nova&quot; para começar
            </p>
          </div>
        )}

        {/* Instruções */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Como configurar
          </h4>
          <ol className="text-xs text-zinc-500 space-y-2 list-decimal list-inside">
            <li>Instale a Evolution API em um servidor (Docker ou VPS)</li>
            <li>Configure a API Key de autenticação</li>
            <li>Adicione a instância aqui com a URL e API Key</li>
            <li>Escaneie o QR Code na página de Chat para conectar</li>
          </ol>
          <a
            href="https://doc.evolution-api.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Documentação da Evolution API
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// HELPERS
// ==========================================

function formatPhone(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 13) {
    return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 12) {
    return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }
  return phone;
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function WhatsAppPage() {
  const { data: configs, isLoading, refetch } = trpc.whatsappChat.listConfigs.useQuery();

  const primaryConfig = configs?.[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
        <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold">WhatsApp</span>
          </div>
        </div>
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-200 dark:border-emerald-700">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">WhatsApp</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">• Evolution API</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            {primaryConfig && (
              <Link href="/admin/whatsapp/chat">
                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Abrir Chat
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
        {/* Status da Conexão Principal */}
        {primaryConfig ? (
          <>
            <StatusCard config={primaryConfig} onRefresh={() => refetch()} />

            {/* Estatísticas */}
            <StatsCards configId={primaryConfig.id} />

            {/* Grid de Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Ações Rápidas */}
              <QuickActions configId={primaryConfig.id} />

              {/* Contatos Recentes */}
              <RecentContacts configId={primaryConfig.id} />

              {/* Contatos Não Vinculados */}
              <UnlinkedContacts configId={primaryConfig.id} />
            </div>

            {/* Configuração */}
            <InstanceConfig />
          </>
        ) : (
          /* Sem configuração */
          <div className="space-y-6">
            <Card className="border-2 border-dashed border-zinc-300 dark:border-zinc-700">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Configure o WhatsApp</h2>
                <p className="text-zinc-500 text-center max-w-md mb-6">
                  Conecte sua instância da Evolution API para começar a enviar e receber mensagens
                  dos assistidos pelo WhatsApp.
                </p>
              </CardContent>
            </Card>

            <InstanceConfig />
          </div>
        )}
      </div>
    </div>
  );
}
