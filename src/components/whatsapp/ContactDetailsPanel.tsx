"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  X,
  Phone,
  Eye,
  MessageSquare,
  Calendar,
  Tag,
  Link as LinkIcon,
  ExternalLink,
  Scale,
  Loader2,
  Plus,
  Paperclip,
  StickyNote,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ContactDetailsPanelProps {
  contactId: number;
  configId: number;
  onClose: () => void;
}

// Relation types for the interlocutor dropdown
const RELATION_OPTIONS = [
  { value: "proprio", label: "Proprio assistido" },
  { value: "familiar", label: "Familiar" },
  { value: "testemunha", label: "Testemunha" },
  { value: "correu", label: "Correu" },
  { value: "outro", label: "Outro" },
] as const;

// =============================================================================
// HELPERS
// =============================================================================

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 13) {
    return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 12) {
    return `(${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }
  return phone;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return "--";
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  return cpf;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ContactDetailsPanel({
  contactId,
  configId,
  onClose,
}: ContactDetailsPanelProps) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [newTag, setNewTag] = useState("");

  const utils = trpc.useUtils();

  // ---------------------------------------------------------------------------
  // Data fetching
  // Uses getContact which already joins with assistido.
  // When getContactDetails is added to the router, swap to that for
  // processos + stats in a single round-trip.
  // ---------------------------------------------------------------------------

  const { data: contactData, isLoading } = trpc.whatsappChat.getContactDetails.useQuery({
    contactId,
  });

  const contact = contactData?.contact ?? null;
  const assistido = contactData?.assistido ?? null;
  const processosList: any[] = contactData?.processos ?? [];
  const stats = contactData?.stats ?? null;

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const updateContactMutation = trpc.whatsappChat.updateContact.useMutation({
    onSuccess: () => {
      utils.whatsappChat.getContact.invalidate({ id: contactId });
      toast.success("Contato atualizado");
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleRelationChange = useCallback(
    (value: string) => {
      updateContactMutation.mutate({
        id: contactId,
        contactRelation: value as "proprio" | "familiar" | "testemunha" | "correu" | "outro",
      });
    },
    [contactId, updateContactMutation]
  );

  const handleRelationDetailBlur = useCallback(
    (value: string) => {
      updateContactMutation.mutate({
        id: contactId,
        contactRelationDetail: value,
      });
    },
    [contactId, updateContactMutation]
  );

  const handleNotesSave = useCallback(() => {
    updateContactMutation.mutate({
      id: contactId,
      notes: notesValue,
    });
    setEditingNotes(false);
  }, [contactId, notesValue, updateContactMutation]);

  const handleAddTag = useCallback(() => {
    if (!newTag.trim()) return;
    const currentTags = contact?.tags ?? [];
    if (currentTags.includes(newTag.trim())) {
      setNewTag("");
      return;
    }
    updateContactMutation.mutate({
      id: contactId,
      tags: [...currentTags, newTag.trim()],
    });
    setNewTag("");
  }, [contactId, newTag, contact?.tags, updateContactMutation]);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      const currentTags = contact?.tags ?? [];
      updateContactMutation.mutate({
        id: contactId,
        tags: currentTags.filter((t: string) => t !== tag),
      });
    },
    [contactId, contact?.tags, updateContactMutation]
  );

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const displayName = contact?.name || contact?.pushName || (contact?.phone ? formatPhone(contact.phone) : "");
  const displayPhone = contact?.phone ? formatPhone(contact.phone) : "";

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="w-80 border-l border-border bg-white dark:bg-card flex flex-col overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="w-80 border-l border-border bg-white dark:bg-card flex flex-col overflow-hidden transition-all duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">
            Detalhes do Contato
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
          Contato nao encontrado
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div
      className={cn(
        "w-80 border-l border-border bg-white dark:bg-card flex flex-col overflow-hidden transition-all duration-200"
      )}
    >
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-50/80 dark:bg-muted/50 backdrop-blur-sm border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">
          Detalhes do Contato
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ===== SCROLLABLE BODY ===== */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-5 space-y-6">
          {/* --- 2. Profile Section --- */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-16 w-16 ring-2 ring-neutral-200 dark:ring-border ring-offset-2 ring-offset-white dark:ring-offset-card">
              <AvatarImage src={contact.profilePicUrl ?? undefined} />
              <AvatarFallback className="bg-neutral-100 dark:bg-muted text-neutral-600 dark:text-foreground/80 text-lg">
                {getInitials(contact.name || contact.pushName)}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-base font-semibold text-foreground text-center">
              {displayName}
            </h3>
            <span className="font-mono text-sm text-muted-foreground text-center">
              {displayPhone}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    asChild
                  >
                    <a
                      href={`https://wa.me/${contact.phone?.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Phone className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      Abrir no WhatsApp
                      <ExternalLink className="h-3 w-3 ml-1.5 text-muted-foreground" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Abrir conversa no WhatsApp Web</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* --- 3. Interlocutor / Relation --- */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Interlocutor
              </span>
            </div>
            <div className="bg-neutral-50 dark:bg-muted/50 rounded-lg p-3 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Tipo
                </label>
                <Select
                  value={contact.contactRelation ?? ""}
                  onValueChange={handleRelationChange}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecionar tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Detalhe
                </label>
                <Input
                  className="h-8 text-sm"
                  placeholder='Ex: "Mae do reu"'
                  defaultValue={contact.contactRelationDetail ?? ""}
                  onBlur={(e) => handleRelationDetailBlur(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* --- 4. Linked Assistido --- */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <LinkIcon className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Assistido Vinculado
              </span>
            </div>
            {assistido ? (
              <div className="bg-neutral-50 dark:bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={assistido.photoUrl ?? undefined} />
                    <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs">
                      {getInitials(assistido.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {assistido.nome}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      CPF: {formatCpf(assistido.cpf)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-emerald-600 hover:text-emerald-700 border-emerald-200 dark:border-emerald-800"
                  asChild
                >
                  <Link href={`/admin/assistidos/${assistido.id}`}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" />
                    Ver assistido
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="bg-neutral-50 dark:bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground mb-2">
                  Nenhum assistido vinculado
                </p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/admin/whatsapp/vincular?contactId=${contactId}`}>
                    <LinkIcon className="h-3.5 w-3.5 mr-1.5" />
                    Vincular Assistido
                  </Link>
                </Button>
              </div>
            )}
          </section>

          {/* --- 5. Processos (if assistido linked) --- */}
          {assistido && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Scale className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                  Processos
                </span>
              </div>
              {processosList.length > 0 ? (
                <div className="space-y-2">
                  {processosList.map((proc: any) => (
                    <Link
                      key={proc.id}
                      href={`/admin/processos/${proc.id}`}
                      className="block rounded-lg border border-border p-3 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-2">
                        <Scale className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {proc.numeroAutos}
                          </p>
                          {proc.vara && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {proc.vara}
                            </p>
                          )}
                          {proc.fase && (
                            <Badge
                              variant="secondary"
                              className="mt-1 text-[10px] px-1.5 py-0"
                            >
                              {proc.fase}
                            </Badge>
                          )}
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-neutral-50 dark:bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">
                    Nenhum processo encontrado
                  </p>
                </div>
              )}
            </section>
          )}

          {/* --- 6. Statistics --- */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Estatisticas
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-neutral-50 dark:bg-muted/50">
                <div className="text-lg font-semibold text-foreground">
                  {stats?.totalMessages ?? "--"}
                </div>
                <div className="text-[10px] text-muted-foreground">Mensagens</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-neutral-50 dark:bg-muted/50">
                <div className="text-lg font-semibold text-foreground">
                  {stats?.mediaMessages ?? "--"}
                </div>
                <div className="text-[10px] text-muted-foreground">Arquivos</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-neutral-50 dark:bg-muted/50">
                <div className="text-lg font-semibold text-foreground">
                  {stats?.firstMessageAt
                    ? format(new Date(stats.firstMessageAt), "dd/MM", {
                        locale: ptBR,
                      })
                    : contact.createdAt
                      ? format(new Date(contact.createdAt), "dd/MM", {
                          locale: ptBR,
                        })
                      : "--"}
                </div>
                <div className="text-[10px] text-muted-foreground">Desde</div>
              </div>
            </div>
          </section>

          {/* --- 7. Notes --- */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Notas
              </span>
            </div>
            <div className="bg-neutral-50 dark:bg-muted/50 rounded-lg p-3">
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    className="text-sm min-h-[80px] resize-none"
                    placeholder="Adicionar notas sobre este contato..."
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingNotes(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleNotesSave}
                      disabled={updateContactMutation.isPending}
                    >
                      {updateContactMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer group"
                  onClick={() => {
                    setNotesValue(contact.notes ?? "");
                    setEditingNotes(true);
                  }}
                >
                  {contact.notes ? (
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap group-hover:text-foreground transition-colors">
                      {contact.notes}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic group-hover:text-muted-foreground transition-colors flex items-center gap-1.5">
                      <StickyNote className="h-3.5 w-3.5" />
                      Clique para adicionar notas...
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* --- 8. Tags --- */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                Tags
              </span>
            </div>
            <div className="bg-neutral-50 dark:bg-muted/50 rounded-lg p-3">
              {/* Existing tags */}
              {(contact.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(contact.tags as string[]).map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                      <X className="h-3 w-3 ml-1 opacity-50" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add tag input */}
              <div className="flex gap-1.5">
                <Input
                  className="h-7 text-xs flex-1"
                  placeholder="Nova tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
}
