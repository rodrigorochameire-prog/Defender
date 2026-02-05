"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
    toast.success(contact.isArchived ? "Conversa desarquivada" : "Conversa arquivada");
  };

  const handleCreateContact = () => {
    if (!newContactPhone) {
      toast.error("Informe o número do telefone");
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
    // Formata: 5511999999999 -> (11) 99999-9999
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 13) {
      return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 12) {
      return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search e New */}
      <div className="p-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Dialog open={isNewContactOpen} onOpenChange={setIsNewContactOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Conversa</DialogTitle>
              <DialogDescription>
                Inicie uma conversa com um novo número de WhatsApp
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite apenas números ou use o formato com DDD
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Nome (opcional)</Label>
                <Input
                  id="name"
                  placeholder="Nome do contato"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewContactOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateContact}
                disabled={createContactMutation.isPending}
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

      {/* Lista de conversas */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Search className="h-8 w-8 mb-2" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={cn(
                  "flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                  selectedContactId === contact.id && "bg-muted"
                )}
                onClick={() => onSelectContact(contact.id)}
              >
                {/* Avatar */}
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={contact.profilePicUrl || undefined} />
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {getContactInitials(contact)}
                    </AvatarFallback>
                  </Avatar>
                  {contact.isFavorite && (
                    <Star className="absolute -top-1 -right-1 h-3 w-3 fill-yellow-400 text-yellow-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">
                      {getContactDisplayName(contact)}
                    </span>
                    {contact.lastMessageAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(contact.lastMessageAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">
                      {contact.assistido ? (
                        <span className="flex items-center gap-1">
                          <UserPlus className="h-3 w-3" />
                          {contact.assistido.nome}
                        </span>
                      ) : (
                        formatPhone(contact.phone)
                      )}
                    </span>
                    {contact.unreadCount > 0 && (
                      <Badge
                        variant="default"
                        className="bg-green-500 hover:bg-green-600 min-w-[20px] justify-center"
                      >
                        {contact.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleToggleFavorite(contact)}>
                      <Star
                        className={cn(
                          "mr-2 h-4 w-4",
                          contact.isFavorite && "fill-yellow-400 text-yellow-400"
                        )}
                      />
                      {contact.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleArchive(contact)}>
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
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
