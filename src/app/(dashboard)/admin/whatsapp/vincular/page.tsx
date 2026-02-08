"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  RefreshCw,
  Loader2,
  Link2,
  Users,
  Search,
  ArrowLeft,
  CheckCircle2,
  Phone,
  User,
  X,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

// ==========================================
// COMPONENTES
// ==========================================

function ContactCard({
  contact,
  onLink,
  isLinking,
}: {
  contact: any;
  onLink: (assistidoId: number) => void;
  isLinking: boolean;
}) {
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [searchAssistido, setSearchAssistido] = useState("");

  const { data: assistidosData, isLoading: loadingAssistidos } = trpc.assistidos.list.useQuery(
    { search: searchAssistido, limit: 20 },
    { enabled: showLinkDialog }
  );

  const assistidos = assistidosData?.assistidos || [];

  // Sugerir assistidos com telefone similar
  const suggestedAssistidos = useMemo(() => {
    if (!assistidosData?.assistidos) return [];
    const contactPhone = normalizePhone(contact.phone);
    return assistidosData.assistidos.filter((a: any) => {
      const phone1 = normalizePhone(a.telefone || "");
      const phone2 = normalizePhone(a.telefoneContato || "");
      return phone1.includes(contactPhone.slice(-8)) || phone2.includes(contactPhone.slice(-8));
    });
  }, [assistidosData, contact.phone]);

  return (
    <>
      <Card className={cn(
        "transition-all hover:shadow-md",
        contact.assistidoId
          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10"
          : "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium shrink-0",
              contact.assistidoId
                ? "bg-emerald-200 dark:bg-emerald-800"
                : "bg-amber-200 dark:bg-amber-800"
            )}>
              {contact.profilePicUrl ? (
                <img
                  src={contact.profilePicUrl}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                contact.pushName?.[0]?.toUpperCase() || "?"
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {contact.pushName || contact.name || "Sem nome"}
                </h3>
                {contact.assistidoId && (
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                    <Link2 className="w-3 h-3 mr-1" />
                    Vinculado
                  </Badge>
                )}
              </div>
              <p className="text-sm text-zinc-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" />
                {formatPhone(contact.phone)}
              </p>

              {/* Assistido vinculado */}
              {contact.assistido && (
                <div className="mt-2 p-2 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Vinculado a: <strong>{contact.assistido.nome}</strong>
                  </p>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="shrink-0">
              {contact.assistidoId ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onLink(0)} // 0 = desvincular
                  disabled={isLinking}
                >
                  {isLinking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowLinkDialog(true)}
                  disabled={isLinking}
                >
                  {isLinking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-1" />
                      Vincular
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de vinculação */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Vincular Contato a Assistido
            </DialogTitle>
            <DialogDescription>
              Vincule &quot;{contact.pushName || formatPhone(contact.phone)}&quot; a um assistido cadastrado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Buscar assistido por nome ou CPF..."
                value={searchAssistido}
                onChange={(e) => setSearchAssistido(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Sugestões */}
            {suggestedAssistidos.length > 0 && !searchAssistido && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Sugestão baseada no telefone:
                </p>
                {suggestedAssistidos.map((assistido: any) => (
                  <button
                    key={assistido.id}
                    className="w-full p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors text-left"
                    onClick={() => {
                      onLink(assistido.id);
                      setShowLinkDialog(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center">
                        {assistido.nome?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {assistido.nome}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {assistido.telefone && formatPhone(assistido.telefone)}
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 ml-auto" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Lista de assistidos */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {loadingAssistidos ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : assistidos.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum assistido encontrado</p>
                </div>
              ) : (
                assistidos.map((assistido: any) => (
                  <button
                    key={assistido.id}
                    className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                    onClick={() => {
                      onLink(assistido.id);
                      setShowLinkDialog(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                        {assistido.nome?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {assistido.nome}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {assistido.cpf || assistido.telefone && formatPhone(assistido.telefone)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==========================================
// CONTEÚDO PRINCIPAL (recebe configId como prop)
// ==========================================

function VincularContent({ configId }: { configId: number }) {
  const searchParams = useSearchParams();
  const contactIdParam = searchParams.get("contactId");

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "linked" | "unlinked">("unlinked");

  const utils = trpc.useUtils();

  // Buscar contatos - usando configId diretamente como prop
  const { data: contactsData, isLoading } = trpc.whatsappChat.listContacts.useQuery({
    configId,
    limit: 100,
  });

  // Mutation para vincular
  const linkMutation = trpc.whatsappChat.updateContact.useMutation({
    onSuccess: () => {
      toast.success("Contato atualizado!");
      utils.whatsappChat.listContacts.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Filtrar contatos
  const filteredContacts = useMemo(() => {
    let contacts = contactsData?.contacts || [];

    // Filtrar por vinculação
    if (filter === "linked") {
      contacts = contacts.filter((c: any) => c.assistidoId);
    } else if (filter === "unlinked") {
      contacts = contacts.filter((c: any) => !c.assistidoId);
    }

    // Filtrar por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      contacts = contacts.filter((c: any) =>
        c.pushName?.toLowerCase().includes(query) ||
        c.name?.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        c.assistido?.nome?.toLowerCase().includes(query)
      );
    }

    return contacts;
  }, [contactsData, filter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const contacts = contactsData?.contacts || [];
    const linked = contacts.filter((c: any) => c.assistidoId).length;
    const unlinked = contacts.length - linked;
    return { total: contacts.length, linked, unlinked };
  }, [contactsData]);

  const handleLink = (contactId: number, assistidoId: number) => {
    linkMutation.mutate({
      id: contactId,
      assistidoId: assistidoId || null,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/whatsapp">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Link2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Vincular Contatos a Assistidos
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => utils.whatsappChat.listContacts.invalidate()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6 max-w-[1000px] mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-zinc-500">Total de Contatos</p>
          </Card>
          <Card className="p-4 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
            <p className="text-2xl font-bold text-emerald-600">{stats.linked}</p>
            <p className="text-xs text-zinc-500">Vinculados</p>
          </Card>
          <Card className="p-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
            <p className="text-2xl font-bold text-amber-600">{stats.unlinked}</p>
            <p className="text-xs text-zinc-500">Não Vinculados</p>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar contato por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtro de vinculação */}
          <div className="flex gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <Button
              variant={filter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Todos
            </Button>
            <Button
              variant={filter === "unlinked" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("unlinked")}
              className="text-amber-600"
            >
              Não Vinculados
            </Button>
            <Button
              variant={filter === "linked" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter("linked")}
              className="text-emerald-600"
            >
              Vinculados
            </Button>
          </div>
        </div>

        {/* Lista de contatos */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-zinc-300" />
              <h3 className="text-lg font-semibold mb-2">Nenhum contato encontrado</h3>
              <p className="text-zinc-500">
                {filter === "unlinked"
                  ? "Todos os contatos já estão vinculados!"
                  : "Ajuste os filtros ou sincronize novos contatos."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredContacts.map((contact: any) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onLink={(assistidoId) => handleLink(contact.id, assistidoId)}
                isLinking={linkMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// PÁGINA PRINCIPAL (wrapper)
// ==========================================

export default function VincularContatosPage() {
  const { data: configs, isLoading } = trpc.whatsappChat.listConfigs.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const configId = configs?.[0]?.id;

  if (!configId) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
            <h2 className="text-lg font-semibold mb-2">WhatsApp não configurado</h2>
            <p className="text-zinc-500 mb-4">
              Configure uma instância da Evolution API primeiro.
            </p>
            <Link href="/admin/whatsapp">
              <Button>Configurar WhatsApp</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <VincularContent configId={configId} />;
}
