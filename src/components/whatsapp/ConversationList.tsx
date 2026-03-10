"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  MoreVertical,
  Star,
  Archive,
  UserPlus,
  Plus,
  Phone,
  Loader2,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  Mic2,
  Video,
  Users,
  Eye,
  User,
  Sticker,
  MapPin,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Tipos
interface Contact {
  id: number;
  phone: string;
  name: string | null;
  pushName: string | null;
  profilePicUrl: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  isArchived: boolean;
  isFavorite: boolean;
  assistido?: {
    id: number;
    nome: string;
  } | null;
  lastMessageContent?: string | null;
  lastMessageDirection?: string | null;
  lastMessageType?: string | null;
  contactRelation?: string | null;
  contactRelationDetail?: string | null;
}

interface ConversationListProps {
  configId: number;
  contacts: Contact[];
  selectedContactId: number | null;
  onSelectContact: (contactId: number) => void;
  isLoading?: boolean;
}

export function ConversationList({
  configId,
  contacts,
  selectedContactId,
  onSelectContact,
  isLoading,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactName, setNewContactName] = useState("");

  const utils = trpc.useUtils();

  // Mutations
  const updateContactMutation = trpc.whatsappChat.updateContact.useMutation({
    onSuccess: () => {
      utils.whatsappChat.listContacts.invalidate();
    },
  });

  const createContactMutation = trpc.whatsappChat.createContact.useMutation({
    onSuccess: (contact) => {
      utils.whatsappChat.listContacts.invalidate();
      setIsNewContactOpen(false);
      setNewContactPhone("");
      setNewContactName("");
      onSelectContact(contact.id);
      toast.success("Contato criado com sucesso");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Filtra contatos pela busca
  const filteredContacts = contacts.filter((contact) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      contact.phone.includes(search) ||
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.pushName?.toLowerCase().includes(searchLower) ||
      contact.assistido?.nome?.toLowerCase().includes(searchLower)
    );
  });

  // Handlers
  const handleToggleFavorite = (contact: Contact) => {
    updateContactMutation.mutate({
      id: contact.id,
      isFavorite: !contact.isFavorite,
    });
  };

  const handleToggleArchive = (contact: Contact) => {
    updateContactMutation.mutate({
      id: contact.id,
      isArchived: !contact.isArchived,
    });
    toast.success(
      contact.isArchived ? "Conversa desarquivada" : "Conversa arquivada"
    );
  };

  const handleCreateContact = () => {
    if (!newContactPhone) {
      toast.error("Informe o numero do telefone");
      return;
    }
    createContactMutation.mutate({
      configId,
      phone: newContactPhone,
      name: newContactName || undefined,
    });
  };

  const getContactDisplayName = (contact: Contact) => {
    return contact.name || contact.pushName || formatPhone(contact.phone);
  };

  const getContactInitials = (contact: Contact) => {
    const name = contact.name || contact.pushName;
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
    }
    return contact.phone.slice(-2);
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 13) {
      return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 12) {
      return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  };

  const isPhoneDisplayName = (contact: Contact) => {
    return !contact.name && !contact.pushName;
  };

  /** Renders the media type icon for non-text last messages */
  const renderMediaIcon = (type: string) => {
    const iconClass = "h-3 w-3 shrink-0";
    switch (type) {
      case "image":
        return <ImageIcon className={iconClass} />;
      case "document":
        return <FileText className={iconClass} />;
      case "audio":
        return <Mic2 className={iconClass} />;
      case "video":
        return <Video className={iconClass} />;
      case "sticker":
        return <Sticker className={iconClass} />;
      case "location":
        return <MapPin className={iconClass} />;
      default:
        return null;
    }
  };

  const getMediaLabel = (type: string) => {
    switch (type) {
      case "image":
        return "Foto";
      case "document":
        return "Documento";
      case "audio":
        return "Audio";
      case "video":
        return "Video";
      case "sticker":
        return "Sticker";
      case "location":
        return "Localizacao";
      default:
        return "Mensagem";
    }
  };

  /** Renders the contact relation icon badge */
  const renderRelationIcon = (relation: string | null | undefined) => {
    if (!relation || relation === "proprio") return null;
    const iconClass = "h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0";
    switch (relation) {
      case "familiar":
        return <Users className={iconClass} />;
      case "testemunha":
        return <Eye className={iconClass} />;
      default:
        return <User className={iconClass} />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search + New Contact */}
      <div className="mx-3 mt-3 mb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200/50 dark:border-zinc-800/50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-emerald-500/20"
          />
        </div>

        <Dialog open={isNewContactOpen} onOpenChange={setIsNewContactOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-zinc-900 dark:text-zinc-100">
                Nova Conversa
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-zinc-400">
                Inicie uma conversa com um novo numero de WhatsApp
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="phone"
                  className="text-zinc-700 dark:text-zinc-300"
                >
                  Telefone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="pl-10 font-mono"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Digite apenas numeros ou use o formato com DDD
                </p>
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="name"
                  className="text-zinc-700 dark:text-zinc-300"
                >
                  Nome (opcional)
                </Label>
                <Input
                  id="name"
                  placeholder="Nome do contato"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsNewContactOpen(false)}
                className="text-zinc-600 dark:text-zinc-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateContact}
                disabled={createContactMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createContactMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Iniciar Conversa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400 dark:text-zinc-500" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Search className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Nenhuma conversa encontrada
            </p>
          </div>
        ) : (
          <div>
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-200",
                  "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                  "border-b border-zinc-100 dark:border-zinc-800/50",
                  selectedContactId === contact.id &&
                    "bg-zinc-100 dark:bg-zinc-800"
                )}
                onClick={() => onSelectContact(contact.id)}
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={contact.profilePicUrl || undefined} />
                  <AvatarFallback className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                    {getContactInitials(contact)}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Name line: name ... time */}
                  <div className="flex justify-between items-baseline gap-2">
                    <div className="flex items-center gap-1 min-w-0 max-w-[70%]">
                      <span
                        className={cn(
                          "text-sm font-medium truncate text-zinc-900 dark:text-zinc-100",
                          isPhoneDisplayName(contact) && "font-mono text-xs"
                        )}
                      >
                        {getContactDisplayName(contact)}
                      </span>
                      {contact.isFavorite && (
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                      )}
                      {renderRelationIcon(contact.contactRelation)}
                    </div>
                    {contact.lastMessageAt && (
                      <span
                        className={cn(
                          "text-[10px] shrink-0 whitespace-nowrap",
                          contact.unreadCount > 0
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-zinc-400 dark:text-zinc-500"
                        )}
                      >
                        {formatDistanceToNow(
                          new Date(contact.lastMessageAt),
                          { addSuffix: false, locale: ptBR }
                        )}
                      </span>
                    )}
                  </div>

                  {/* Preview line: preview ... badge */}
                  <div className="flex justify-between items-center mt-0.5 gap-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
                      {contact.lastMessageContent ? (
                        <>
                          {contact.lastMessageDirection === "outbound" && (
                            <CheckCheck className="h-3 w-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
                          )}
                          {contact.lastMessageType &&
                          contact.lastMessageType !== "text" &&
                          !contact.lastMessageContent.trim() ? (
                            <span className="flex items-center gap-1">
                              {renderMediaIcon(contact.lastMessageType)}
                              <span>{getMediaLabel(contact.lastMessageType)}</span>
                            </span>
                          ) : (
                            <span className="truncate">
                              {contact.lastMessageContent}
                            </span>
                          )}
                        </>
                      ) : contact.assistido ? (
                        <span className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                          <UserPlus className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {contact.assistido.nome}
                          </span>
                        </span>
                      ) : (
                        <span className="font-mono text-zinc-400 dark:text-zinc-500">
                          {formatPhone(contact.phone)}
                        </span>
                      )}
                    </span>

                    {contact.unreadCount > 0 && (
                      <span className="h-[18px] min-w-[18px] px-1 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-medium shrink-0">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Context Menu - visible only on hover */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                        "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300",
                        "hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                      )}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => handleToggleFavorite(contact)}
                      className="text-xs"
                    >
                      <Star
                        className={cn(
                          "mr-2 h-3.5 w-3.5",
                          contact.isFavorite &&
                            "fill-amber-400 text-amber-400"
                        )}
                      />
                      {contact.isFavorite
                        ? "Remover dos favoritos"
                        : "Adicionar aos favoritos"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleArchive(contact)}
                      className="text-xs"
                    >
                      <Archive className="mr-2 h-3.5 w-3.5" />
                      {contact.isArchived ? "Desarquivar" : "Arquivar"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-xs">
                      <UserPlus className="mr-2 h-3.5 w-3.5" />
                      Vincular assistido
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
