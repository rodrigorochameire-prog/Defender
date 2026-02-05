"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { ConnectionStatus } from "@/components/whatsapp/ConnectionStatus";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Settings,
  Users,
  Inbox,
  Star,
  Archive,
  RefreshCw,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function WhatsAppChatPage() {
  // Estado da instância selecionada
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "favorites" | "archived">("all");

  // Queries
  const { data: configs, isLoading: loadingConfigs } = trpc.whatsappChat.listConfigs.useQuery();

  const { data: contactsData, isLoading: loadingContacts, refetch: refetchContacts } =
    trpc.whatsappChat.listContacts.useQuery(
      {
        configId: selectedConfigId!,
        isArchived: filter === "archived" ? true : filter === "all" ? undefined : false,
        isFavorite: filter === "favorites" ? true : undefined,
        hasUnread: filter === "unread" ? true : undefined,
        limit: 100,
      },
      { enabled: !!selectedConfigId }
    );

  const { data: stats } = trpc.whatsappChat.getStats.useQuery(
    { configId: selectedConfigId! },
    { enabled: !!selectedConfigId }
  );

  // Seleciona primeira configuração disponível
  useEffect(() => {
    if (configs && configs.length > 0 && !selectedConfigId) {
      setSelectedConfigId(configs[0].id);
    }
  }, [configs, selectedConfigId]);

  // Handlers
  const handleSelectContact = (contactId: number) => {
    setSelectedContactId(contactId);
  };

  const handleRefresh = () => {
    refetchContacts();
    toast.success("Lista atualizada");
  };

  // Se ainda está carregando
  if (loadingConfigs) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Se não há configurações
  if (!configs || configs.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <MessageSquare className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Nenhuma instância configurada</h2>
        <p className="text-muted-foreground">
          Configure uma instância do WhatsApp para começar a usar o chat.
        </p>
        <Link href="/admin/whatsapp">
          <Button>
            <Settings className="mr-2 h-4 w-4" />
            Configurar WhatsApp
          </Button>
        </Link>
      </div>
    );
  }

  const selectedConfig = configs.find((c) => c.id === selectedConfigId);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-green-500" />
              Chat WhatsApp
            </h1>

            {/* Seletor de instância */}
            {configs.length > 1 && (
              <Select
                value={selectedConfigId?.toString()}
                onValueChange={(value) => {
                  setSelectedConfigId(parseInt(value));
                  setSelectedContactId(null);
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione a instância" />
                </SelectTrigger>
                <SelectContent>
                  {configs.map((config) => (
                    <SelectItem key={config.id} value={config.id.toString()}>
                      {config.instanceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Status de conexão */}
            {selectedConfig && <ConnectionStatus configId={selectedConfig.id} />}
          </div>

          <div className="flex items-center gap-2">
            {/* Stats rápidas */}
            {stats && (
              <div className="flex items-center gap-4 mr-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {stats.totalContacts} contatos
                </Badge>
                {stats.unreadMessages > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Inbox className="h-3 w-3" />
                    {stats.unreadMessages} não lidas
                  </Badge>
                )}
              </div>
            )}

            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Link href="/admin/whatsapp">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Lista de conversas */}
        <div className="w-80 border-r flex flex-col">
          {/* Filtros */}
          <div className="p-2 border-b flex gap-1">
            <Button
              variant={filter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
              className="flex-1"
            >
              <Inbox className="h-4 w-4 mr-1" />
              Todas
            </Button>
            <Button
              variant={filter === "unread" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("unread")}
              className="flex-1"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Não lidas
            </Button>
            <Button
              variant={filter === "favorites" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("favorites")}
              className="flex-1"
            >
              <Star className="h-4 w-4 mr-1" />
            </Button>
            <Button
              variant={filter === "archived" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("archived")}
              className="flex-1"
            >
              <Archive className="h-4 w-4 mr-1" />
            </Button>
          </div>

          {/* Lista de conversas */}
          <div className="flex-1 overflow-hidden">
            {selectedConfigId && (
              <ConversationList
                configId={selectedConfigId}
                contacts={contactsData?.contacts || []}
                selectedContactId={selectedContactId}
                onSelectContact={handleSelectContact}
                isLoading={loadingContacts}
              />
            )}
          </div>
        </div>

        {/* Área de chat */}
        <div className="flex-1 flex flex-col">
          {selectedContactId && selectedConfigId ? (
            <ChatWindow
              contactId={selectedContactId}
              configId={selectedConfigId}
              onContactUpdate={() => refetchContacts()}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4" />
              <p className="text-lg">Selecione uma conversa para começar</p>
              <p className="text-sm">
                Ou inicie uma nova conversa clicando no botão{" "}
                <Plus className="inline h-4 w-4" /> na lista
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
