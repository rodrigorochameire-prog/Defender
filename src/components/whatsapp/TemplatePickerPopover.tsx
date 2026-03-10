"use client";

import { useState } from "react";
import { FileText, Send, PenLine, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface TemplatePickerPopoverProps {
  contactId: number;
  onInsert: (content: string) => void;
  onSendDirect: (content: string) => void;
}

export function TemplatePickerPopover({
  contactId,
  onInsert,
  onSendDirect,
}: TemplatePickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  const { data: templates, isLoading } = trpc.whatsappChat.listTemplates.useQuery(
    { search: search || undefined },
    { enabled: open }
  );

  const resolveTemplate = async (
    templateId: number,
    action: "insert" | "send"
  ) => {
    setResolvingId(templateId);
    try {
      const result = await utils.whatsappChat.resolveTemplateVariables.fetch({
        templateId,
        contactId,
      });
      if (action === "insert") {
        onInsert(result.resolved);
      } else {
        onSendDirect(result.resolved);
      }
      setOpen(false);
      setSearch("");
    } catch (error) {
      toast.error("Erro ao resolver template");
    } finally {
      setResolvingId(null);
    }
  };

  const utils = trpc.useUtils();

  // Group templates by category
  const grouped = (templates ?? []).reduce<Record<string, typeof templates>>(
    (acc, tpl) => {
      const cat = tpl.category || "geral";
      if (!acc[cat]) acc[cat] = [];
      acc[cat]!.push(tpl);
      return acc;
    },
    {}
  );

  const categoryOrder = Object.keys(grouped).sort();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <FileText className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Templates de mensagem</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent
        align="start"
        side="top"
        className="w-80 p-0"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="max-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : categoryOrder.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum template encontrado
            </div>
          ) : (
            <div className="py-1">
              {categoryOrder.map((category) => (
                <div key={category}>
                  <div className="px-3 py-1.5">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {category}
                    </Badge>
                  </div>
                  {grouped[category]!.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="px-3 py-2 hover:bg-accent/50 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">
                              {tpl.title}
                            </span>
                            {tpl.shortcut && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 shrink-0"
                              >
                                {tpl.shortcut}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {tpl.content.split("\n")[0]}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={resolvingId === tpl.id}
                                  onClick={() => resolveTemplate(tpl.id, "insert")}
                                >
                                  {resolvingId === tpl.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <PenLine className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Inserir</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700"
                                  disabled={resolvingId === tpl.id}
                                  onClick={() => resolveTemplate(tpl.id, "send")}
                                >
                                  {resolvingId === tpl.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Send className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Enviar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
