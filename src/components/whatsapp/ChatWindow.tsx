"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SendHorizontal,
  Paperclip,
  Image,
  FileText,
  MoreVertical,
  UserPlus,
  Star,
  Archive,
  Loader2,
  ArrowLeft,
  X,
  Search,
  PanelRight,
  MessageSquare,
  CheckSquare,
  BookmarkPlus,
  FolderUp,
  Sparkles,
  FileSearch,
  FolderOpen,
  Download,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TemplatePickerPopover } from "./TemplatePickerPopover";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { SelectionActionModals } from "./SelectionActionModals";
import { DriveFilePicker } from "./DriveFilePicker";
import { MessageBubble } from "./MessageBubble";
import { MessageSkeleton } from "./MessageSkeleton";
import { ScrollToBottom } from "./ScrollToBottom";
import { DisconnectBanner } from "./DisconnectBanner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: number;
  waMessageId: string | null;
  direction: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  status: string;
  createdAt: Date;
  isFavorite?: boolean | null;
}

interface Contact {
  id: number;
  phone: string;
  name: string | null;
  pushName: string | null;
  profilePicUrl: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  assistido?: {
    id: number;
    nome: string;
  } | null;
}

interface ChatWindowProps {
  contactId: number;
  configId: number;
  onContactUpdate?: () => void;
  onToggleDetails?: () => void;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatWindow({
  contactId,
  configId,
  onContactUpdate,
  onToggleDetails,
  onBack,
}: ChatWindowProps) {
  // -- State ----------------------------------------------------------------
  const [message, setMessage] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);

  // Message order — default is "newest" (newest messages first)
  const [messageOrder, setMessageOrder] = useState<"newest" | "oldest">(() => {
    if (typeof window === "undefined") return "newest";
    const saved = localStorage.getItem("whatsapp_msg_order");
    // Only use "oldest" if explicitly saved; default to "newest"
    return saved === "oldest" ? "oldest" : "newest";
  });

  // Selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(new Set());
  const [showSaveCaseModal, setShowSaveCaseModal] = useState(false);
  const [showSaveDriveModal, setShowSaveDriveModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showExtractDataModal, setShowExtractDataModal] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // -- Refs -----------------------------------------------------------------
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const utils = trpc.useUtils();

  // -- Queries --------------------------------------------------------------
  const { data: contact, isLoading: loadingContact } =
    trpc.whatsappChat.getContact.useQuery({ id: contactId });

  const {
    data: messagesData,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = trpc.whatsappChat.listMessages.useQuery({ contactId, limit: 100 });

  // -- Mutations ------------------------------------------------------------
  const sendMessageMutation = trpc.whatsappChat.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      setReplyingTo(null);
      refetchMessages();
      onContactUpdate?.();
      inputRef.current?.focus();
    },
    onError: (error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const markAsReadMutation = trpc.whatsappChat.markContactAsRead.useMutation({
    onSuccess: () => {
      onContactUpdate?.();
    },
  });

  const importHistoryMutation = trpc.whatsappChat.importContactHistory.useMutation({
    onSuccess: (result) => {
      if (result.imported > 0) {
        toast.success(`${result.imported} mensagens importadas`);
        refetchMessages();
      } else {
        toast.info("Nenhuma mensagem histórica encontrada");
      }
    },
    onError: () => {
      toast.error("Erro ao carregar histórico");
    },
  });

  const replyToMessageMutation = trpc.whatsappChat.replyToMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      setReplyingTo(null);
      refetchMessages();
      onContactUpdate?.();
      inputRef.current?.focus();
    },
    onError: (error) => {
      toast.error(`Erro ao enviar resposta: ${error.message}`);
    },
  });

  const updateContactMutation = trpc.whatsappChat.updateContact.useMutation({
    onSuccess: () => {
      utils.whatsappChat.getContact.invalidate({ id: contactId });
      onContactUpdate?.();
    },
  });

  const toggleFavoriteMutation = trpc.whatsappChat.toggleFavorite.useMutation({
    onSuccess: () => {
      refetchMessages();
    },
    onError: () => {
      toast.error("Erro ao favoritar mensagem");
    },
  });

  // Contact context (assistido + active processo) for message action modals
  const { data: contextData } = trpc.whatsappChat.getContactContext.useQuery(
    { contactId, configId },
    { enabled: !!contactId && !!configId }
  );

  // -- Effects --------------------------------------------------------------

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesData, isAtBottom]);

  // Mark as read when opening conversation
  useEffect(() => {
    markAsReadMutation.mutate({ contactId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  // Polling every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [contactId, refetchMessages]);

  // Persist message order preference
  useEffect(() => {
    localStorage.setItem("whatsapp_msg_order", messageOrder);
  }, [messageOrder]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  // Clear state when switching contacts
  useEffect(() => {
    setReplyingTo(null);
    setSearchOpen(false);
    setSearchQuery("");
    setSearchIndex(0);
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, [contactId]);

  // -- Handlers -------------------------------------------------------------

  const handleSend = () => {
    if (!message.trim()) return;

    const finalContent = message.trim();

    // If replying and the original message has a waMessageId, use the quoted reply API
    if (replyingTo && replyingTo.waMessageId) {
      replyToMessageMutation.mutate({
        contactId,
        content: finalContent,
        quotedMessageId: replyingTo.waMessageId,
      });
      return;
    }

    // Fallback: if replying but no waMessageId, prepend a visual quote
    if (replyingTo && replyingTo.content) {
      const quotedLines = replyingTo.content
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      sendMessageMutation.mutate({
        contactId,
        type: "text",
        content: `${quotedLines}\n\n${finalContent}`,
      });
      return;
    }

    sendMessageMutation.mutate({
      contactId,
      type: "text",
      content: finalContent,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && isSelectionMode) {
      e.preventDefault();
      exitSelectionMode();
      return;
    }
    if (showSlashMenu && e.key === "Escape") {
      e.preventDefault();
      setShowSlashMenu(false);
      return;
    }
    if (e.key === "Escape" && replyingTo) {
      setReplyingTo(null);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      if (showSlashMenu) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "document") => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      // Check file size (16MB limit for Evolution API)
      if (file.size > 16 * 1024 * 1024) {
        toast.error("Arquivo muito grande", {
          description: "O limite é 16MB para envio via WhatsApp.",
        });
        return;
      }

      const toastId = toast.loading(`Enviando ${type === "image" ? "imagem" : "documento"}...`);

      try {
        // Upload to our API which handles Drive + Evolution API
        const formData = new FormData();
        formData.append("file", file);
        formData.append("contactId", String(contactId));
        formData.append("configId", String(configId));
        formData.append("type", type);

        const response = await fetch("/api/whatsapp/send-media", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Erro desconhecido" }));
          throw new Error(error.error || `HTTP ${response.status}`);
        }

        toast.success(`${type === "image" ? "Imagem" : "Documento"} enviado!`, { id: toastId });
        refetchMessages();
        onContactUpdate?.();
      } catch (error) {
        toast.error(`Erro ao enviar: ${error instanceof Error ? error.message : "Erro desconhecido"}`, {
          id: toastId,
        });
      }
    },
    [contactId, configId, refetchMessages, onContactUpdate]
  );

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setIsAtBottom(isBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  };

  // All messages (used by selection + search)
  const allMessages = useMemo(
    () => messagesData?.messages || [],
    [messagesData]
  );

  // -- Selection mode handlers ------------------------------------------------
  const toggleMessageSelection = useCallback((msgId: number) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedMessageIds(new Set());
  }, []);

  const selectedMessages = useMemo(
    () => allMessages.filter((m) => selectedMessageIds.has(m.id)),
    [allMessages, selectedMessageIds]
  );

  const hasMediaInSelection = useMemo(
    () => selectedMessages.some((m) => m.type !== "text" && m.mediaUrl),
    [selectedMessages]
  );

  const handleSelectionAction = useCallback(
    (action: "case" | "drive" | "summary" | "extract") => {
      if (selectedMessageIds.size === 0) {
        toast.error("Selecione pelo menos uma mensagem");
        return;
      }
      if (!contact?.assistido) {
        toast.error("Vincule este contato a um assistido primeiro");
        return;
      }
      if (action === "case") setShowSaveCaseModal(true);
      else if (action === "drive") {
        if (!hasMediaInSelection) {
          toast.error("Nenhuma mídia nas mensagens selecionadas");
          return;
        }
        setShowSaveDriveModal(true);
      } else if (action === "summary") setShowSummaryModal(true);
      else if (action === "extract") setShowExtractDataModal(true);
    },
    [selectedMessageIds, contact, hasMediaInSelection]
  );

  const copyToClipboard = useCallback((text: string | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copiado!");
    });
  }, []);

  // -- Slash command execution ----------------------------------------------

  const handleSlashExecute = useCallback(
    async (command: string, arg?: string) => {
      setShowSlashMenu(false);
      setMessage("");

      switch (command) {
        case "nota": {
          if (!contact?.assistido) {
            toast.error("Vincule este contato a um assistido primeiro");
            return;
          }
          const noteText = arg?.trim();
          if (!noteText) {
            toast.info("Digite a anotação após /nota — ex: /nota Reunião amanhã");
            return;
          }
          // Insert note text into the input for the user to review/send
          setMessage(noteText);
          inputRef.current?.focus();
          toast.info("Texto inserido — revise e envie ou salve como anotação");
          break;
        }

        case "prazo": {
          if (!contact?.assistido) {
            toast.error("Vincule este contato a um assistido primeiro");
            return;
          }
          try {
            const result = await utils.whatsappChat.getQuickContext.fetch({
              contactId,
              tipo: "prazos",
            });
            if (!result.items.length) {
              toast.info("Nenhum prazo aberto encontrado");
              return;
            }
            const lines = result.items.map((item: Record<string, unknown>) => {
              const prazo = item.prazo as string | null;
              const ato = item.ato as string | null;
              return `• ${ato ?? "Prazo"}: ${prazo ? new Date(prazo).toLocaleDateString("pt-BR") : "—"}`;
            });
            toast.info(`Prazos abertos (${result.items.length})`, {
              description: lines.join("\n"),
              duration: 8000,
            });
          } catch {
            toast.error("Erro ao buscar prazos");
          }
          break;
        }

        case "audiencia": {
          if (!contact?.assistido) {
            toast.error("Vincule este contato a um assistido primeiro");
            return;
          }
          try {
            const result = await utils.whatsappChat.getQuickContext.fetch({
              contactId,
              tipo: "audiencias",
            });
            if (!result.items.length) {
              toast.info("Nenhuma audiência futura encontrada");
              return;
            }
            const lines = result.items.map((item: Record<string, unknown>) => {
              const data = item.dataAudiencia as string | null;
              const tipo = item.tipo as string | null;
              const local = item.local as string | null;
              const dateStr = data
                ? new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                : "—";
              return `• ${tipo ?? "Audiência"} — ${dateStr}${local ? ` @ ${local}` : ""}`;
            });
            toast.info(`Próximas audiências (${result.items.length})`, {
              description: lines.join("\n"),
              duration: 8000,
            });
          } catch {
            toast.error("Erro ao buscar audiências");
          }
          break;
        }

        case "processo": {
          if (!contact?.assistido) {
            toast.error("Vincule este contato a um assistido primeiro");
            return;
          }
          window.open(`/admin/assistidos/${contact.assistido.id}`, "_blank");
          break;
        }

        case "drive": {
          if (!contact?.assistido) {
            toast.error("Vincule este contato a um assistido primeiro");
            return;
          }
          try {
            const result = await utils.whatsappChat.getQuickContext.fetch({
              contactId,
              tipo: "drive",
            });
            if (!result.items.length) {
              toast.info("Nenhum arquivo no Drive encontrado");
              return;
            }
            const lines = result.items.map((item: Record<string, unknown>) => {
              const name = item.name as string | null;
              return `• ${name ?? "Arquivo"}`;
            });
            toast.info(`Últimos arquivos no Drive (${result.items.length})`, {
              description: lines.join("\n"),
              duration: 8000,
            });
          } catch {
            toast.error("Erro ao buscar arquivos");
          }
          break;
        }

        case "modelo": {
          setShowSlashMenu(false);
          // Template picker popover is already in the toolbar — re-use it
          toast.info("Use o botão de templates na barra de ferramentas para selecionar um modelo");
          break;
        }

        default:
          break;
      }
    },
    [contact, contactId, utils]
  );

  // -- Helpers --------------------------------------------------------------

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

  const getContactDisplayName = (c: Contact) =>
    c.name || c.pushName || formatPhone(c.phone);

  const getContactInitials = (c: Contact) => {
    const name = c.name || c.pushName;
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
    }
    return c.phone.slice(-2);
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    messages.forEach((msg) => {
      const msgDate = format(new Date(msg.createdAt), "yyyy-MM-dd");
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  };

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
      return "Hoje";
    }
    if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
      return "Ontem";
    }
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  // Highlight search matches in text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/60 rounded-sm px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Filter messages by search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return allMessages;
    const q = searchQuery.toLowerCase();
    return allMessages.filter((m) => m.content?.toLowerCase().includes(q));
  }, [allMessages, searchQuery]);

  // Reset search index when query or results change
  useEffect(() => {
    setSearchIndex(0);
  }, [searchQuery]);

  // Navigate between search results
  const navigateSearch = useCallback(
    (direction: -1 | 1) => {
      if (filteredMessages.length === 0) return;
      const orderedFiltered = messageOrder === "newest" ? [...filteredMessages].reverse() : filteredMessages;
      const nextIndex = (searchIndex + direction + orderedFiltered.length) % orderedFiltered.length;
      setSearchIndex(nextIndex);
      const targetMsg = orderedFiltered[nextIndex];
      if (targetMsg) {
        const el = messageRefs.current.get(targetMsg.id);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [filteredMessages, messageOrder, searchIndex]
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          navigateSearch(-1);
        } else {
          navigateSearch(1);
        }
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
        setSearchIndex(0);
      }
    },
    [navigateSearch]
  );

  const orderedMessages = messageOrder === "newest" ? [...filteredMessages].reverse() : filteredMessages;
  const messageGroups = groupMessagesByDate(orderedMessages);

  // -- Loading / Error states -----------------------------------------------

  if (loadingContact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500">
        Contato nao encontrado
      </div>
    );
  }

  const contactName = getContactDisplayName(contact);

  // -- Render ---------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      {/* ================================================================== */}
      {/* HEADER (normal or selection mode)                                 */}
      {/* ================================================================== */}
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-2 h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Back button — mobile only */}
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden shrink-0"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={contact.profilePicUrl || undefined} />
              <AvatarFallback className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-medium">
                {getContactInitials(contact)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                {contactName}
                {contact.isFavorite && (
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                )}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {contact.assistido ? (
                  <span className="flex items-center gap-1">
                    <UserPlus className="h-3 w-3 shrink-0" />
                    {contact.assistido.nome}
                  </span>
                ) : (
                  formatPhone(contact.phone)
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <TooltipProvider delayDuration={300}>
              {/* Search toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8",
                      searchOpen && "bg-zinc-100 dark:bg-zinc-800"
                    )}
                    onClick={() => {
                      setSearchOpen(!searchOpen);
                      if (searchOpen) setSearchQuery("");
                    }}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Buscar mensagens</TooltipContent>
              </Tooltip>

              {/* Selection mode toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsSelectionMode(true)}
                  >
                    <CheckSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Selecionar mensagens</TooltipContent>
              </Tooltip>

              {/* Message order toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8",
                      messageOrder === "newest" && "bg-zinc-100 dark:bg-zinc-800"
                    )}
                    onClick={() =>
                      setMessageOrder((prev) => (prev === "oldest" ? "newest" : "oldest"))
                    }
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {messageOrder === "oldest" ? "Mais recentes primeiro" : "Mais antigas primeiro"}
                </TooltipContent>
              </Tooltip>

              {/* Details panel toggle */}
              {onToggleDetails && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={onToggleDetails}
                    >
                      <PanelRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Detalhes do contato</TooltipContent>
                </Tooltip>
              )}

              {/* More actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() =>
                      updateContactMutation.mutate({
                        id: contact.id,
                        isFavorite: !contact.isFavorite,
                      })
                    }
                  >
                    <Star
                      className={cn(
                        "mr-2 h-4 w-4",
                        contact.isFavorite && "fill-yellow-400 text-yellow-400"
                      )}
                    />
                    {contact.isFavorite
                      ? "Remover dos favoritos"
                      : "Adicionar aos favoritos"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      updateContactMutation.mutate({
                        id: contact.id,
                        isArchived: !contact.isArchived,
                      })
                    }
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    {contact.isArchived ? "Desarquivar" : "Arquivar"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Vincular assistido
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>
        </div>

      {/* ================================================================== */}
      {/* SEARCH BAR (toggleable)                                            */}
      {/* ================================================================== */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
          <Search className="h-4 w-4 text-zinc-400 shrink-0" />
          <input
            ref={searchInputRef}
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar nesta conversa..."
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-200 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          {searchQuery.trim() && filteredMessages.length > 0 && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0 tabular-nums">
              {searchIndex + 1} de {filteredMessages.length}
            </span>
          )}
          {searchQuery.trim() && filteredMessages.length === 0 && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0">
              0 resultados
            </span>
          )}
          <button
            onClick={() => navigateSearch(-1)}
            disabled={filteredMessages.length === 0}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded disabled:opacity-40"
          >
            <ChevronUp className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </button>
          <button
            onClick={() => navigateSearch(1)}
            disabled={filteredMessages.length === 0}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded disabled:opacity-40"
          >
            <ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </button>
          <button
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
              setSearchIndex(0);
            }}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded"
          >
            <X className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* DISCONNECT BANNER                                                  */}
      {/* ================================================================== */}
      <DisconnectBanner configId={configId} />

      {/* ================================================================== */}
      {/* MESSAGES AREA                                                      */}
      {/* ================================================================== */}
      <div className="flex-1 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto px-4 py-3"
          onScroll={handleScroll}
        >
          {loadingMessages ? (
            <MessageSkeleton />
          ) : messageGroups.length === 0 ? (
            /* ---- Empty state ---- */
            <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
              <div className="h-16 w-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  {searchQuery
                    ? "Nenhuma mensagem encontrada"
                    : `Conversa com ${contactName}`}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {searchQuery
                    ? "Tente outro termo de busca"
                    : "Envie uma mensagem para iniciar a conversa"}
                </p>
              </div>
              {!searchQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 text-xs h-7 gap-1.5"
                  onClick={() => importHistoryMutation.mutate({ contactId, limit: 50 })}
                  disabled={importHistoryMutation.isPending}
                >
                  {importHistoryMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Carregar histórico
                </Button>
              )}
            </div>
          ) : (
            /* ---- Message groups ---- */
            <div>
              {messageGroups.map((group) => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="flex items-center justify-center my-3">
                    <span className="px-3 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-[11px] text-zinc-500 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50">
                      {formatDateHeader(group.date)}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="space-y-0.5">
                    {group.messages.map((msg) => (
                      <div
                        key={msg.id}
                        ref={(el) => {
                          if (el) messageRefs.current.set(msg.id, el);
                          else messageRefs.current.delete(msg.id);
                        }}
                      >
                        <MessageBubble
                          message={msg}
                          isSelectionMode={isSelectionMode}
                          isSelected={selectedMessageIds.has(msg.id)}
                          onToggleSelect={toggleMessageSelection}
                          onReply={(msg) => setReplyingTo(msg as Message)}
                          onCopy={copyToClipboard}
                          searchQuery={searchQuery}
                          highlightMatch={searchQuery ? highlightMatch : undefined}
                          isFavorite={msg.isFavorite ?? false}
                          contactId={contactId}
                          assistidoId={contextData?.assistido?.id ?? null}
                          processoId={contextData?.processoAtivo?.id ?? null}
                          onToggleFavorite={(m) => toggleFavoriteMutation.mutate({ messageId: m.id })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scroll to bottom FAB */}
        <ScrollToBottom
          show={!isAtBottom}
          onClick={scrollToBottom}
        />

        {/* Floating selection bar */}
        {isSelectionMode && selectedMessageIds.size > 0 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 animate-slide-up">
            <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={exitSelectionMode}
              >
                <X className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2 tabular-nums">
                {selectedMessageIds.size}
              </span>
              <div className="flex items-center gap-0.5 border-l border-zinc-200 dark:border-zinc-700 pl-2 ml-1">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSelectionAction("case")}
                      >
                        <BookmarkPlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Salvar no caso</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={!hasMediaInSelection}
                        onClick={() => handleSelectionAction("drive")}
                      >
                        <FolderUp className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Salvar no Drive</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSelectionAction("summary")}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Resumo IA</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={!contact?.assistido}
                        onClick={() => handleSelectionAction("extract")}
                      >
                        <FileSearch className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Extrair dados</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* SLASH COMMAND MENU                                                  */}
      {/* ================================================================== */}
      {showSlashMenu && (
        <div className="relative">
          <div className="absolute bottom-0 left-0 right-0 z-10 px-4">
            <SlashCommandMenu
              filter={slashFilter}
              contactId={contactId}
              onExecute={handleSlashExecute}
              onClose={() => {
                setShowSlashMenu(false);
              }}
            />
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* REPLY BAR                                                          */}
      {/* ================================================================== */}
      {replyingTo && (
        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {replyingTo.direction === "outbound" ? "Voce" : contactName}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {replyingTo.content || "[Midia]"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setReplyingTo(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ================================================================== */}
      {/* INPUT AREA                                                         */}
      {/* ================================================================== */}
      <div className="bg-zinc-50/80 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 p-3">
        <div className="flex items-end gap-2">
          {/* Attachment dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top">
              <DropdownMenuItem onClick={() => setShowDrivePicker(true)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                Do Drive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                <Image className="mr-2 h-4 w-4" />
                Imagem
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileText className="mr-2 h-4 w-4" />
                Documento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file inputs */}
          <input
            type="file"
            ref={imageInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => handleFileUpload(e, "image")}
          />
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            onChange={(e) => handleFileUpload(e, "document")}
          />

          {/* Textarea wrapper with rounded pill shape */}
          <div className="flex-1 flex items-end rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus-within:ring-1 focus-within:ring-emerald-500/30 focus-within:border-emerald-300 dark:focus-within:border-emerald-700 transition-shadow">
            {/* Template picker inside the wrapper */}
            <TemplatePickerPopover
              contactId={contactId}
              onInsert={(content) => {
                setMessage(content);
                inputRef.current?.focus();
              }}
              onSendDirect={(content) => {
                sendMessageMutation.mutate({
                  contactId,
                  type: "text",
                  content,
                });
              }}
            />

            {/* Message input */}
            <Textarea
              ref={inputRef}
              placeholder="Digite uma mensagem..."
              value={message}
              onChange={(e) => {
                const val = e.target.value;
                setMessage(val);
                if (val.startsWith("/")) {
                  setShowSlashMenu(true);
                  setSlashFilter(val.slice(1));
                } else {
                  setShowSlashMenu(false);
                }
              }}
              onKeyDown={handleKeyDown}
              className="min-h-[40px] max-h-[120px] resize-none flex-1 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-1 py-2.5"
              rows={1}
            />
          </div>

          {/* Send button — circular emerald */}
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending || replyToMessageMutation.isPending}
          >
            {sendMessageMutation.isPending || replyToMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SELECTION ACTION MODALS                                            */}
      {/* ================================================================== */}
      <SelectionActionModals
        contactId={contactId}
        selectedMessageIds={Array.from(selectedMessageIds)}
        selectedMessages={selectedMessages}
        contactName={contactName}
        assistidoName={contact.assistido?.nome || null}
        assistidoId={contact.assistido?.id || null}
        showSaveCase={showSaveCaseModal}
        showSaveDrive={showSaveDriveModal}
        showSummary={showSummaryModal}
        showExtractData={showExtractDataModal}
        onCloseSaveCase={() => setShowSaveCaseModal(false)}
        onCloseSaveDrive={() => setShowSaveDriveModal(false)}
        onCloseSummary={() => setShowSummaryModal(false)}
        onCloseExtractData={() => setShowExtractDataModal(false)}
        onSuccess={() => {
          exitSelectionMode();
          refetchMessages();
        }}
      />

      {/* Drive File Picker */}
      <DriveFilePicker
        open={showDrivePicker}
        onOpenChange={setShowDrivePicker}
        contactId={contactId}
        configId={configId}
        assistidoDriveFolderId={contact?.assistido?.driveFolderId}
        assistidoName={contact?.assistido?.nome}
        onSuccess={() => {
          refetchMessages();
          onContactUpdate?.();
        }}
      />
    </div>
  );
}
