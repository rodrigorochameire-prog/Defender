"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { ConversationList } from "@/components/whatsapp/ConversationList";
import { ChatWindow } from "@/components/whatsapp/ChatWindow";
import { ContactDetailsPanel } from "@/components/whatsapp/ContactDetailsPanel";
import { ConnectionStatus } from "@/components/whatsapp/ConnectionStatus";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MessageSquare,
  Settings,
  Inbox,
  Star,
  Archive,
  RefreshCw,
  Download,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function WhatsAppChatPage() {
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get("phone");
  const contactIdParam = searchParams.get("contactId");

  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "favorites" | "archived">("all");
  const [showDetails, setShowDetails] = useState(false);

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

  const { data: stats, refetch: refetchStats } = trpc.whatsappChat.getStats.useQuery(
    { configId: selectedConfigId! },
    { enabled: !!selectedConfigId }
  );

  // Mutations
  const syncContactsMutation = trpc.whatsappChat.syncContacts.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Sincronizado! ${result.inserted} novos, ${result.updated} atualizados.`
      );
      refetchContacts();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  // Auto-select first config
  useEffect(() => {
    if (configs && configs.length > 0 && !selectedConfigId) {
      setSelectedConfigId(configs[0].id);
    }
  }, [configs, selectedConfigId]);

  // Select contact from URL params
  useEffect(() => {
    if (!contactsData?.contacts) return;

    if (contactIdParam) {
      const id = parseInt(contactIdParam);
      if (!isNaN(id)) {
        setSelectedContactId(id);
        return;
      }
    }

    if (phoneParam) {
      const normalizedPhone = phoneParam.replace(/\D/g, "");
      const contact = contactsData.contacts.find((c: any) => {
        const contactPhone = c.phone.replace(/\D/g, "");
        return contactPhone === normalizedPhone ||
               contactPhone === `55${normalizedPhone}` ||
               contactPhone.endsWith(normalizedPhone.slice(-9));
      });
      if (contact) {
        setSelectedContactId(contact.id);
      } else {
        toast.info(`Contato com telefone ${phoneParam} não encontrado.`);
      }
    }
  }, [contactsData, phoneParam, contactIdParam]);

  // Handlers
  const handleSelectContact = (contactId: number) => {
    setSelectedContactId(contactId);
  };

  const handleBackToList = () => {
    setSelectedContactId(null);
    setShowDetails(false);
  };

  // Loading state
  if (loadingConfigs) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  // No configs
  if (!configs || configs.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-zinc-400" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Nenhuma instância configurada
        </h2>
        <p className="text-sm text-zinc-500">
          Configure uma instância do WhatsApp para começar.
        </p>
        <Link href="/admin/whatsapp">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
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
      {/* Compact Header — hidden on mobile when chat is open */}
      <div className={cn(
        "border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 sm:px-4 py-2",
        selectedContactId && "hidden md:block"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Instance selector (only if multiple) */}
            {configs.length > 1 ? (
              <Select
                value={selectedConfigId?.toString()}
                onValueChange={(value) => {
                  setSelectedConfigId(parseInt(value));
                  setSelectedContactId(null);
                }}
              >
                <SelectTrigger className="w-[120px] sm:w-[160px] h-8 text-xs">
                  <SelectValue placeholder="Instância" />
                </SelectTrigger>
                <SelectContent>
                  {configs.map((config) => (
                    <SelectItem key={config.id} value={config.id.toString()}>
                      {config.instanceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {/* Connection status */}
            {selectedConfig && <ConnectionStatus configId={selectedConfig.id} />}

            {/* Stats inline — hidden on small mobile */}
            {stats && (
              <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <span>{stats.totalContacts.toLocaleString()} contatos</span>
                {stats.unreadMessages > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {stats.unreadMessages} não lidas
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    onClick={() => {
                      if (selectedConfigId) {
                        syncContactsMutation.mutate({ configId: selectedConfigId });
                      }
                    }}
                    disabled={!selectedConfigId || syncContactsMutation.isPending}
                  >
                    {syncContactsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Sincronizar contatos</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    onClick={() => {
                      refetchContacts();
                      refetchStats();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Atualizar lista</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/admin/whatsapp">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">Configurações</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Conversation List */}
        {/* On mobile: hidden when a contact is selected (show chat instead) */}
        <div className={cn(
          "w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-900",
          selectedContactId ? "hidden md:flex" : "flex"
        )}>
          {/* Filters */}
          <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/50 flex gap-1">
            {[
              { key: "all" as const, icon: Inbox, label: "Todas" },
              { key: "unread" as const, icon: MessageSquare, label: "Não lidas" },
              { key: "favorites" as const, icon: Star, label: null },
              { key: "archived" as const, icon: Archive, label: null },
            ].map(({ key, icon: Icon, label }) => (
              <Button
                key={key}
                variant="ghost"
                size="sm"
                onClick={() => setFilter(key)}
                className={cn(
                  "h-7 text-xs gap-1 px-2",
                  label ? "flex-1" : "w-8 px-0",
                  filter === key
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label && <span>{label}</span>}
              </Button>
            ))}
          </div>

          {/* Conversation list */}
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

        {/* Chat area */}
        {/* On mobile: full-width when contact selected, hidden otherwise */}
        <div className={cn(
          "flex-1 flex",
          selectedContactId ? "flex" : "hidden md:flex"
        )}>
          <div className="flex-1 flex flex-col">
            {selectedContactId && selectedConfigId ? (
              <ChatWindow
                contactId={selectedContactId}
                configId={selectedConfigId}
                onContactUpdate={() => {
                  refetchContacts();
                  refetchStats();
                }}
                onToggleDetails={() => setShowDetails((prev) => !prev)}
                onBack={handleBackToList}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <MessageSquare className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 text-center">
                  Selecione uma conversa para começar
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 text-center">
                  Ou inicie uma nova conversa com o botão + na lista
                </p>
              </div>
            )}
          </div>

          {/* Contact details panel — hidden on mobile */}
          {showDetails && selectedContactId && selectedConfigId && (
            <div className="hidden md:block">
              <ContactDetailsPanel
                contactId={selectedContactId}
                configId={selectedConfigId}
                onClose={() => setShowDetails(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
