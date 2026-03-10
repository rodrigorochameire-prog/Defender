"use client";

import { useEffect, useRef } from "react";
import { FileText, Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface SlashCommandMenuProps {
  filter: string;
  onSelect: (content: string) => void;
  onClose: () => void;
  contactId: number;
}

export function SlashCommandMenu({
  filter,
  onSelect,
  onClose,
  contactId,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: templates, isLoading } = trpc.whatsappChat.listTemplates.useQuery();

  // Filter templates by shortcut matching the slash command filter
  const filtered = (templates ?? []).filter((tpl) => {
    if (!filter) return true;
    const lowerFilter = filter.toLowerCase();
    // Match by shortcut (without leading /)
    const shortcutMatch = tpl.shortcut
      ? tpl.shortcut.replace(/^\//, "").toLowerCase().includes(lowerFilter)
      : false;
    // Also match by title
    const titleMatch = tpl.title.toLowerCase().includes(lowerFilter);
    return shortcutMatch || titleMatch;
  });

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSelect = async (templateId: number) => {
    try {
      const result = await utils.whatsappChat.resolveTemplateVariables.fetch({
        templateId,
        contactId,
      });
      onSelect(result.resolved);
    } catch (error) {
      toast.error("Erro ao resolver template");
      onClose();
    }
  };

  return (
    <div ref={menuRef}>
      <Command className="rounded-lg border shadow-lg bg-popover">
        <CommandList>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
                Nenhum template encontrado
              </CommandEmpty>
              <CommandGroup heading="Templates">
                {filtered.map((tpl) => (
                  <CommandItem
                    key={tpl.id}
                    value={`${tpl.shortcut || ""} ${tpl.title}`}
                    onSelect={() => handleSelect(tpl.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{tpl.title}</span>
                    {tpl.shortcut && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 shrink-0"
                      >
                        {tpl.shortcut}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </div>
  );
}
