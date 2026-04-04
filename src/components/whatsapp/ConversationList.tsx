"use client";

import { useState, useEffect } from "react";
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
  Check,
  CheckCheck,
  Clock,
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
  lastMessageStatus?: string | null;
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
  return TAG_COLORS[tag] || { bg: "bg-neutral-100 dark:bg-muted", text: "text-neutral-600 dark:text-muted-foreground", dot: "bg-neutral-400" };
}

function getTagLabel(tag: string) {
  return TAG_LABELS[tag] || tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatWhatsAppTime(date: Date): string {
  const now = new Date();
  const msgDate = new Date(date);
  const diffMs = now.getTime() - msgDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return msgDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) {
    return "Ontem";
  }
  if (diffDays < 7) {
    return msgDate.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }
  return msgDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  const utils = trpc.useUtils();

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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

  // Highlight matching text in search results
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-sm">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Filtra contatos pela busca (usando debouncedSearch para performance)
  const filteredContacts = contacts.filter((contact) => {
    if (!debouncedSearch) return true;
    const searchLower = debouncedSearch.toLowerCase();
    return (
      contact.phone.includes(debouncedSearch) ||
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.pushName?.toLowerCase().includes(searchLower) ||
      contact.assistido?.nome?.toLowerCase().includes(searchLower) ||
      contact.lastMessageContent?.toLowerCase().includes(searchLower)
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
    const iconClass = "h-3 w-3 text-neutral-400 dark:text-muted-foreground shrink-0";
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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 dark:text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs rounded-xl border-neutral-200/50 dark:border-border/50 placeholder:text-neutral-400 dark:placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-emerald-500/30"
            style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-primary)' }}
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
                  : "text-neutral-500 dark:text-muted-foreground hover:text-neutral-900 dark:hover:text-foreground hover:bg-neutral-100 dark:hover:bg-muted"
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
              <p className="text-xs font-medium text-neutral-500 dark:text-muted-foreground px-2 py-1">
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
                        ? "bg-neutral-100 dark:bg-muted"
                        : "hover:bg-neutral-50 dark:hover:bg-muted/50"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full shrink-0", color.dot)} />
                    <span className="flex-1 text-left text-neutral-700 dark:text-foreground/80">
                      {getTagLabel(tag)}
                    </span>
                    {dynamicTag && (
                      <span className="text-[10px] text-neutral-400 dark:text-muted-foreground">
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
                          ? "bg-neutral-100 dark:bg-muted"
                          : "hover:bg-neutral-50 dark:hover:bg-muted/50"
                      )}
                    >
                      <span className={cn("h-2 w-2 rounded-full shrink-0", color.dot)} />
                      <span className="flex-1 text-left text-neutral-700 dark:text-foreground/80">
                        {getTagLabel(tag)}
                      </span>
                      <span className="text-[10px] text-neutral-400 dark:text-muted-foreground">
                        {count}
                      </span>
                    </button>
                  );
                })}
              {/* Clear filter */}
              {selectedTag && (
                <>
                  <div className="border-t border-neutral-100 dark:border-border my-1" />
                  <button
                    onClick={() => {
                      onTagFilterChange?.(null);
                      setTagPopoverOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-neutral-500 dark:text-muted-foreground hover:bg-neutral-50 dark:hover:bg-muted/50 transition-colors"
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
              className="h-8 w-8 shrink-0 text-neutral-500 dark:text-muted-foreground hover:text-neutral-900 dark:hover:text-foreground hover:bg-neutral-100 dark:hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-neutral-900 dark:text-foreground">
                Nova Conversa
              </DialogTitle>
              <DialogDescription className="text-neutral-500 dark:text-muted-foreground">
                Inicie uma conversa com um novo numero de WhatsApp
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label
                  htmlFor="phone"
                  className="text-neutral-700 dark:text-foreground/80"
                >
                  Telefone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="pl-10 font-mono"
                  />
                </div>
                <p className="text-[11px] text-neutral-400 dark:text-muted-foreground">
                  Digite apenas numeros ou use o formato com DDD
                </p>
              </div>
              <div className="grid gap-2">
                <Label
                  htmlFor="name"
                  className="text-neutral-700 dark:text-foreground/80"
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
                className="text-neutral-600 dark:text-muted-foreground"
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
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400 dark:text-muted-foreground" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
            <div className="h-12 w-12 rounded-full bg-neutral-100 dark:bg-muted flex items-center justify-center">
              <Search className="h-5 w-5 text-neutral-300 dark:text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-500 dark:text-muted-foreground">
                Nenhuma conversa ainda
              </p>
              <p className="text-xs text-neutral-400 dark:text-muted-foreground mt-1 leading-relaxed">
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
                  "group flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors overflow-hidden",
                  selectedContactId === contact.id
                    ? "bg-[var(--wa-selected)]"
                    : "hover:bg-[var(--wa-hover)]",
                )}
                style={{ borderBottom: '1px solid var(--wa-border)' }}
                onClick={() => onSelectContact(contact.id)}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className="h-[49px] w-[49px]">
                    <AvatarImage src={contact.profilePicUrl || undefined} />
                    <AvatarFallback
                      className="text-sm font-medium"
                      style={{ backgroundColor: 'var(--wa-bg-input)', color: 'var(--wa-text-secondary)' }}
                    >
                      {getContactInitials(contact)}
                    </AvatarFallback>
                  </Avatar>
                  {contact.lastMessageDirection === "inbound" &&
                    contact.lastMessageAt &&
                    (Date.now() - new Date(contact.lastMessageAt).getTime()) > 4 * 60 * 60 * 1000 && (
                    <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-amber-400 border-2" style={{ borderColor: 'var(--wa-bg-sidebar)' }} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: Name + Timestamp */}
                  <div className="flex items-baseline">
                    <span
                      className={cn(
                        "text-[15px] font-normal truncate",
                        isPhoneDisplayName(contact) && "font-mono text-sm"
                      )}
                      style={{ color: 'var(--wa-text-primary)', flex: '1 1 0%', minWidth: 0 }}
                    >
                      {debouncedSearch
                        ? highlightText(getContactDisplayName(contact), debouncedSearch)
                        : getContactDisplayName(contact)}
                    </span>
                    {contact.isFavorite && (
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" style={{ flexShrink: 0 }} />
                    )}
                    <span
                      className="text-[11px] whitespace-nowrap"
                      style={{ flexShrink: 0, color: contact.unreadCount > 0 ? 'var(--wa-unread-badge)' : 'var(--wa-text-secondary)' }}
                    >
                      {contact.lastMessageAt
                        ? formatWhatsAppTime(new Date(contact.lastMessageAt))
                        : ""}
                    </span>
                  </div>

                  {/* Row 2: Message preview + Unread badge */}
                  <div className="flex justify-between items-center mt-0.5 gap-2">
                    <span
                      className="text-sm truncate flex items-center gap-1"
                      style={{ color: 'var(--wa-text-secondary)' }}
                    >
                      {contact.lastMessageContent ? (
                        <>
                          {contact.lastMessageDirection === "outbound" && (
                            contact.lastMessageStatus === "read" || contact.lastMessageStatus === "played" ? (
                              <CheckCheck className="h-[16px] w-[16px] shrink-0" style={{ color: 'var(--wa-tick-read)' }} />
                            ) : contact.lastMessageStatus === "delivered" ? (
                              <CheckCheck className="h-[16px] w-[16px] shrink-0" style={{ color: 'var(--wa-tick-default)' }} />
                            ) : contact.lastMessageStatus === "sent" ? (
                              <Check className="h-[16px] w-[16px] shrink-0" style={{ color: 'var(--wa-tick-default)' }} />
                            ) : (
                              <Clock className="h-3 w-3 shrink-0" style={{ color: 'var(--wa-tick-default)' }} />
                            )
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
                              {debouncedSearch
                                ? highlightText(contact.lastMessageContent, debouncedSearch)
                                : contact.lastMessageContent}
                            </span>
                          )}
                        </>
                      ) : contact.assistido ? (
                        <span className="flex items-center gap-1">
                          <UserPlus className="h-3 w-3 shrink-0" />
                          <span className="truncate">{contact.assistido.nome}</span>
                        </span>
                      ) : (
                        <span className="font-mono">
                          {formatPhone(contact.phone)}
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {contact.tags && contact.tags.length > 0 && (
                        <span
                          className={cn(
                            "inline-flex items-center px-1 py-0 rounded text-[9px] leading-tight font-medium",
                            getTagColor(contact.tags[0]).bg,
                            getTagColor(contact.tags[0]).text
                          )}
                        >
                          {getTagLabel(contact.tags[0]).slice(0, 6)}
                        </span>
                      )}
                      {contact.unreadCount > 0 && (
                        <span
                          className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full text-white text-[11px] font-medium"
                          style={{ backgroundColor: 'var(--wa-unread-badge)' }}
                        >
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Context Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-3.5 w-3.5" style={{ color: 'var(--wa-text-secondary)' }} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleToggleFavorite(contact)} className="text-xs">
                      <Star className={cn("mr-2 h-3.5 w-3.5", contact.isFavorite && "fill-amber-400 text-amber-400")} />
                      {contact.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleArchive(contact)} className="text-xs">
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
