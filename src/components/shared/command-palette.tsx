"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useAssignment, CONTEXT_MENU_ITEMS, UTILITIES_MENU } from "@/contexts/assignment-context";

type CommandItemData = {
  label: string;
  path?: string;
  shortcut?: string;
};

export function CommandPalette() {
  const router = useRouter();
  const { modules } = useAssignment();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigationItems = useMemo<CommandItemData[]>(() => {
    const contextItems = CONTEXT_MENU_ITEMS.map((item) => ({
      label: item.label,
      path: item.path,
    }));

    const moduleItems = modules.flatMap((section) =>
      section.items.map((item) => ({
        label: item.label,
        path: item.path,
      }))
    );

    const utilItems = UTILITIES_MENU.flatMap((section) =>
      section.items.map((item) => ({
        label: item.label,
        path: item.path,
      }))
    );

    return [...contextItems, ...moduleItems, ...utilItems];
  }, [modules]);

  const quickActions: CommandItemData[] = [
    { label: "Novo Caso", path: "/admin/casos", shortcut: "C" },
    { label: "Novo Assistido", path: "/admin/assistidos/novo", shortcut: "A" },
    { label: "Nova Demanda", path: "/admin/demandas/nova", shortcut: "D" },
    { label: "Novo Processo", path: "/admin/processos/novo", shortcut: "P" },
    { label: "Nova Sessão do Júri", path: "/admin/juri/nova", shortcut: "J" },
  ];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Cmd + K
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar ou executar comando..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Ações rápidas">
            {quickActions.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => {
                  setOpen(false);
                  if (item.path) router.push(item.path);
                }}
              >
                <span>{item.label}</span>
                {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Navegação">
            {navigationItems.map((item) => (
              <CommandItem
                key={`${item.label}-${item.path}`}
                onSelect={() => {
                  setOpen(false);
                  if (item.path) router.push(item.path);
                }}
              >
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
