"use client";

import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Send,
  Paperclip,
  Image,
  FileText,
  Mic,
  MoreVertical,
  Phone,
  Video,
  UserPlus,
  Star,
  Archive,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Loader2,
  ArrowDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Tipos
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
}

export function ChatWindow({ contactId, configId, onContactUpdate }: ChatWindowProps) {
  const [message, setMessage] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: contact, isLoading: loadingContact } = trpc.whatsappChat.getContact.useQuery({
    id: contactId,
  });

  const {
    data: messagesData,
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = trpc.whatsappChat.listMessages.useQuery({
    contactId,
    limit: 100,
  });

  // Mutations
  const sendMessageMutation = trpc.whatsappChat.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
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

  const updateContactMutation = trpc.whatsappChat.updateContact.useMutation({
    onSuccess: () => {
      utils.whatsappChat.getContact.invalidate({ id: contactId });
      onContactUpdate?.();
    },
  });

  // Auto-scroll para baixo quando novas mensagens chegam
  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesData, isAtBottom]);

  // Marca como lido quando abre a conversa
  useEffect(() => {
    markAsReadMutation.mutate({ contactId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  // Polling para novas mensagens (a cada 5s)
  useEffect(() => {
    const interval = setInterval(() => {
      refetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [contactId, refetchMessages]);

  // Handlers
  const handleSend = () => {
    if (!message.trim()) return;

    sendMessageMutation.mutate({
      contactId,
      type: "text",
      content: message.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setIsAtBottom(isBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case "sent":
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
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

  // Agrupa mensagens por data
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

  if (loadingContact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Contato não encontrado
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messagesData?.messages || []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={contact.profilePicUrl || undefined} />
            <AvatarFallback className="bg-green-100 text-green-700">
              {getContactInitials(contact)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              {getContactDisplayName(contact)}
              {contact.isFavorite && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {contact.assistido ? (
                <span className="flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  {contact.assistido.nome}
                </span>
              ) : (
                formatPhone(contact.phone)
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled>
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chamada de voz (em breve)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" disabled>
                  <Video className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Chamada de vídeo (em breve)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
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
                {contact.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
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
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden bg-[#efeae2] dark:bg-zinc-900">
        <ScrollArea
          ref={scrollRef}
          className="h-full p-4"
          onScroll={handleScroll}
        >
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messageGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p>Nenhuma mensagem ainda</p>
              <p className="text-sm">Envie uma mensagem para começar a conversa</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messageGroups.map((group) => (
                <div key={group.date}>
                  {/* Date header */}
                  <div className="flex justify-center my-4">
                    <Badge variant="secondary" className="bg-white/80 dark:bg-zinc-800/80">
                      {formatDateHeader(group.date)}
                    </Badge>
                  </div>

                  {/* Messages */}
                  <div className="space-y-1">
                    {group.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.direction === "outbound" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
                            msg.direction === "outbound"
                              ? "bg-green-100 dark:bg-green-900"
                              : "bg-white dark:bg-zinc-800"
                          )}
                        >
                          {/* Media content */}
                          {msg.type === "image" && msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt="Imagem"
                              className="max-w-full rounded mb-1"
                            />
                          )}

                          {msg.type === "document" && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded mb-1">
                              <FileText className="h-8 w-8 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {msg.mediaFilename || "Documento"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {msg.mediaMimeType}
                                </p>
                              </div>
                            </div>
                          )}

                          {msg.type === "audio" && (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded mb-1">
                              <Mic className="h-6 w-6 text-muted-foreground" />
                              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                              <audio controls src={msg.mediaUrl || undefined} className="h-8" />
                            </div>
                          )}

                          {/* Text content */}
                          {msg.content && (
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                          )}

                          {/* Time and status */}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(msg.createdAt), "HH:mm")}
                            </span>
                            {msg.direction === "outbound" && getStatusIcon(msg.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Scroll to bottom button */}
        {!isAtBottom && (
          <Button
            size="icon"
            className="absolute bottom-4 right-4 rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-end gap-2">
          {/* Attachment menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Paperclip className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem disabled>
                <Image className="mr-2 h-4 w-4" />
                Imagem (em breve)
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <FileText className="mr-2 h-4 w-4" />
                Documento (em breve)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Message input */}
          <Textarea
            ref={inputRef}
            placeholder="Digite uma mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] max-h-[120px] resize-none"
            rows={1}
          />

          {/* Send button */}
          <Button
            size="icon"
            className="shrink-0 bg-green-500 hover:bg-green-600"
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
