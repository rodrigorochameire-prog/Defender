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
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Tag,
  X,
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
  tags?: string[] | null;
}

// Tag color mapping
const TAG_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  urgente: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  juri: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", dot: "bg-purple-500" },
  execucao: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
  aguardando_documento: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  informativo: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  diligencia: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
};

const TAG_LABELS: Record<string, string> = {
  urgente: "Urgente",
  aguardando_documento: "Aguardando Doc",
  informativo: "Informativo",
  juri: "Juri",
  execucao: "Execucao",
  diligencia: "Diligencia",
};

const PREDEFINED_TAGS = ["urgente", "aguardando_documento", "informativo", "juri", "execucao", "diligencia"];

function getTagColor(tag: string) {
  return TAG_COLORS[tag] || { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-400" };
}

function getTagLabel(tag: string) {
  return TAG_LABELS[tag] || tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface ConversationListProps {
  configId: number;
  contacts: Contact[];
  selectedContactId: number | null;
  onSelectContact: (contactId: number) => void;
  isLoading?: boolean;
  selectedTag?: string | null;
  onTagFilterChange?: (tag: string | null) => void;
}

export function ConversationList({
  configId,
  contacts,
  selectedContactId,
  onSelectContact,
  isLoading,
  selectedTag,
  onTagFilterChange,
}: ConversationListProps) {
  const [search, setSearch] = useState("");
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  const utils = trpc.useUtils();

  // Query for dynamic tags
  const { data: tagsData } = trpc.whatsappChat.listTags.useQuery(
    { configId },
    { enabled: !!configId }
  );

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
            className="pl-8 h-8 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200/50 dark:border-zinc-800/50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-emerald-500/30"
          />
        </div>

        {/* Tag filter */}
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-8 w-8 shrink-0 relative",
                selectedTag
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              )}
            >
              <Tag className="h-4 w-4" />
              {selectedTag && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-2 py-1">
                Filtrar por tag
              </p>
              {/* Predefined tags */}
              {PREDEFINED_TAGS.map((tag) => {
                const color = getTagColor(tag);
                const dynamicTag = tagsData?.find((t) => t.tag === tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      onTagFilterChange?.(selectedTag === tag ? null : tag);
                      setTagPopoverOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                      selectedTag === tag
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", color.dot)} />
                    <span className="flex-1 text-left text-zinc-700 dark:text-zinc-300">
                      {getTagLabel(tag)}
                    </span>
                    {dynamicTag && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {dynamicTag.count}
                      </span>
                    )}
                  </button>
                );
              })}
              {/* Dynamic tags not in predefined */}
              {tagsData
                ?.filter((t) => !PREDEFINED_TAGS.includes(t.tag))
                .map(({ tag, count }) => {
                  const color = getTagColor(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        onTagFilterChange?.(selectedTag === tag ? null : tag);
                        setTagPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                        selectedTag === tag
                          ? "bg-zinc-100 dark:bg-zinc-800"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full shrink-0", color.dot)} />
                      <span className="flex-1 text-left text-zinc-700 dark:text-zinc-300">
                        {getTagLabel(tag)}
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {count}
                      </span>
                    </button>
                  );
                })}
              {/* Clear filter */}
              {selectedTag && (
                <>
                  <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
                  <button
                    onClick={() => {
                      onTagFilterChange?.(null);
                      setTagPopoverOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Limpar filtro
                  </button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

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

      {/* Active tag filter indicator */}
      {selectedTag && (
        <div className="mx-3 mb-2 flex items-center gap-1.5">
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-2 py-0.5 gap-1 cursor-pointer",
              getTagColor(selectedTag).bg,
              getTagColor(selectedTag).text
            )}
            onClick={() => onTagFilterChange?.(null)}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", getTagColor(selectedTag).dot)} />
            {getTagLabel(selectedTag)}
            <X className="h-2.5 w-2.5 ml-0.5" />
          </Badge>
        </div>
      )}

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400 dark:text-zinc-500" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
            <div className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Search className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Nenhuma conversa ainda
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 leading-relaxed">
                As conversas aparecerão aqui quando mensagens forem enviadas ou recebidas pelo número do WhatsApp
              </p>
            </div>
          </div>
        ) : (
          <div>
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={cn(
                  "group flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-150",
                  "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70",
                  "border-b border-zinc-100 dark:border-zinc-800/50",
                  selectedContactId === contact.id
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-2 border-l-emerald-500"
                    : "border-l-2 border-l-transparent"
                )}
                onClick={() => onSelectContact(contact.id)}
              >
                {/* Avatar */}
                <Avatar className={cn(
                  "h-10 w-10 shrink-0",
                  contact.lastMessageDirection === "inbound" &&
                    contact.lastMessageAt &&
                    (Date.now() - new Date(contact.lastMessageAt).getTime()) > 4 * 60 * 60 * 1000 &&
                    "ring-2 ring-amber-400"
                )}>
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
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0 transition-transform duration-200 hover:scale-110" />
                      )}
                      {renderRelationIcon(contact.contactRelation)}
                      {/* Tag badges */}
                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {contact.tags.slice(0, 2).map((tag) => {
                            const color = getTagColor(tag);
                            return (
                              <span
                                key={tag}
                                className={cn(
                                  "inline-flex items-center px-1 py-0 rounded text-[9px] leading-tight font-medium",
                                  color.bg,
                                  color.text
                                )}
                              >
                                {getTagLabel(tag).slice(0, 8)}
                              </span>
                            );
                          })}
                          {contact.tags.length > 2 && (
                            <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-medium">
                              +{contact.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
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
                      <span className="h-[18px] min-w-[18px] px-1 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-medium shrink-0 animate-bounce-subtle">
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
