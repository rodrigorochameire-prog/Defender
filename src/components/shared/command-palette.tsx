"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Search,
  Plus,
  User,
  FileText,
  Scale,
  Gavel,
  CalendarPlus,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAssignment, CONTEXT_MENU_ITEMS, UTILITIES_MENU } from "@/contexts/assignment-context";
import { trpc } from "@/lib/trpc/client";

type CommandItemData = {
  label: string;
  path?: string;
  shortcut?: string;
  icon?: React.ReactNode;
};

export function CommandPalette() {
  const router = useRouter();
  const { modules } = useAssignment();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Debounced search query — only fire when 2+ chars and dialog is open
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
      return;
    }
    if (search.length < 2) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search, open]);

  // tRPC search.local — busca assistidos e processos no banco
  const searchQuery = trpc.search.local.useQuery(
    { query: debouncedSearch, limit: 8 },
    {
      enabled: debouncedSearch.length >= 2 && open,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );

  const isSearching = debouncedSearch.length >= 2 && searchQuery.isLoading;
  const hasResults = searchQuery.data &&
    (searchQuery.data.assistidos.length > 0 || searchQuery.data.processos.length > 0 || searchQuery.data.demandas.length > 0);

  // Recentes — persistidos em localStorage
  const [recentes, setRecentes] = useState<Array<{ label: string; path: string; type: string }>>([]);

  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem("ombuds-recentes");
        if (stored) setRecentes(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, [open]);

  const addRecente = useCallback((item: { label: string; path: string; type: string }) => {
    setRecentes((prev) => {
      const filtered = prev.filter((r) => r.path !== item.path);
      const updated = [item, ...filtered].slice(0, 5);
      localStorage.setItem("ombuds-recentes", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Keyboard shortcut: Cmd+K toggle
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

  // Quick action shortcuts when dialog is open
  useEffect(() => {
    if (!open) return;
    const handleShortcut = (event: KeyboardEvent) => {
      // Only trigger if no modifier and search is empty
      if (event.metaKey || event.ctrlKey || event.altKey || search.length > 0) return;

      const shortcuts: Record<string, string> = {
        a: "/admin/assistidos/novo",
        d: "/admin/demandas/nova",
        p: "/admin/processos/novo",
        c: "/admin/casos",
        j: "/admin/juri/nova",
      };
      const path = shortcuts[event.key.toLowerCase()];
      if (path) {
        event.preventDefault();
        setOpen(false);
        router.push(path);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [open, search, router]);

  // Navigation items
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
    { label: "Novo Assistido", path: "/admin/assistidos/novo", shortcut: "A", icon: <User className="h-4 w-4 text-emerald-500" /> },
    { label: "Nova Demanda", path: "/admin/demandas/nova", shortcut: "D", icon: <FileText className="h-4 w-4 text-amber-500" /> },
    { label: "Novo Processo", path: "/admin/processos/novo", shortcut: "P", icon: <Scale className="h-4 w-4 text-blue-500" /> },
    { label: "Novo Caso", path: "/admin/casos", shortcut: "C", icon: <Gavel className="h-4 w-4 text-violet-500" /> },
    { label: "Nova Sessão do Júri", path: "/admin/juri/nova", shortcut: "J", icon: <CalendarPlus className="h-4 w-4 text-rose-500" /> },
  ];

  const handleSelect = (path: string, label: string, type: string) => {
    setOpen(false);
    addRecente({ label, path, type });
    router.push(path);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-xs bg-[#2a2a2f]/80 border-zinc-600/40 text-zinc-300 hover:bg-[#323238]/80 hover:text-white hover:border-emerald-600/50"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        Cmd + K
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar assistido, processo, demanda..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 py-2 text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando...
              </div>
            ) : search.length >= 2 ? (
              "Nenhum resultado encontrado."
            ) : (
              "Digite para buscar assistidos, processos..."
            )}
          </CommandEmpty>

          {/* Resultados de busca — assistidos */}
          {hasResults && searchQuery.data!.assistidos.length > 0 && (
            <CommandGroup heading="Assistidos">
              {searchQuery.data!.assistidos.map((a) => (
                <CommandItem
                  key={`assistido-${a.id}`}
                  value={`assistido ${a.nome} ${a.cpf || ""}`}
                  onSelect={() => handleSelect(`/admin/assistidos/${a.id}`, a.nome, "assistido")}
                  className="flex items-center gap-3"
                >
                  <User className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{a.nome}</span>
                    {a.cpf && (
                      <span className="ml-2 text-xs text-zinc-400 font-mono">{a.cpf}</span>
                    )}
                  </div>
                  <ArrowRight className="h-3 w-3 text-zinc-400" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Resultados de busca — processos */}
          {hasResults && searchQuery.data!.processos.length > 0 && (
            <CommandGroup heading="Processos">
              {searchQuery.data!.processos.map((p) => (
                <CommandItem
                  key={`processo-${p.id}`}
                  value={`processo ${p.numeroAutos} ${p.classeProcessual || ""} ${p.vara || ""}`}
                  onSelect={() => handleSelect(`/admin/processos/${p.id}`, p.numeroAutos, "processo")}
                  className="flex items-center gap-3"
                >
                  <Scale className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-mono">{p.numeroAutos}</span>
                    {p.vara && (
                      <span className="ml-2 text-xs text-zinc-400 truncate">{p.vara}</span>
                    )}
                  </div>
                  <ArrowRight className="h-3 w-3 text-zinc-400" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Resultados de busca — demandas */}
          {hasResults && searchQuery.data!.demandas.length > 0 && (
            <CommandGroup heading="Demandas">
              {searchQuery.data!.demandas.map((d) => (
                <CommandItem
                  key={`demanda-${d.id}`}
                  value={`demanda ${d.ato} ${d.tipoAto || ""}`}
                  onSelect={() => handleSelect(`/admin/demandas/${d.id}`, d.ato, "demanda")}
                  className="flex items-center gap-3"
                >
                  <FileText className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {d.ato.length > 60 ? d.ato.slice(0, 60) + "..." : d.ato}
                    </span>
                    {d.status && (
                      <span className="ml-2 text-xs text-zinc-400">{d.status}</span>
                    )}
                  </div>
                  <ArrowRight className="h-3 w-3 text-zinc-400" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Separador entre busca e ações */}
          {hasResults && <CommandSeparator />}

          {/* Recentes — quando não está buscando */}
          {!debouncedSearch && recentes.length > 0 && (
            <>
              <CommandGroup heading="Recentes">
                {recentes.map((item) => (
                  <CommandItem
                    key={`recente-${item.path}`}
                    value={`recente ${item.label}`}
                    onSelect={() => handleSelect(item.path, item.label, item.type)}
                    className="flex items-center gap-3"
                  >
                    {item.type === "assistido" ? (
                      <User className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                    ) : item.type === "demanda" ? (
                      <FileText className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                    ) : (
                      <Scale className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                    )}
                    <span className="text-sm">{item.label}</span>
                    <ArrowRight className="h-3 w-3 text-zinc-400 ml-auto" />
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Ações rápidas */}
          <CommandGroup heading="Criar">
            {quickActions.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => {
                  setOpen(false);
                  if (item.path) router.push(item.path);
                }}
                className="flex items-center gap-3"
              >
                {item.icon || <Plus className="h-4 w-4" />}
                <span>{item.label}</span>
                {item.shortcut && (
                  <CommandShortcut className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    {item.shortcut}
                  </CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Navegação */}
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
