"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { matchSkill } from "@/lib/skills/matcher";
import { initializeSkills, getAllSkills } from "@/lib/skills/registry";
import { executeSkill, type ExecutionCallback } from "@/lib/skills/executor";
import type { MatchResult } from "@/lib/skills/types";
import { toast } from "sonner";
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
  Radio,
  Calendar,
  Download,
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
  const [skillMatches, setSkillMatches] = useState<MatchResult[]>([]);

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

  // Initialize skill engine on mount
  useEffect(() => {
    initializeSkills();
  }, []);

  // Skill matching when search changes
  useEffect(() => {
    if (search.length >= 2) {
      const match = matchSkill(search);
      setSkillMatches(match ? [match] : []);
    } else if (search.startsWith("/")) {
      const match = matchSkill(search);
      setSkillMatches(match ? [match] : []);
    } else {
      setSkillMatches([]);
    }
  }, [search]);

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

  const quickNav: CommandItemData[] = [
    { label: "Ver Radar", path: "/admin/radar", icon: <Radio className="h-4 w-4 text-cyan-500" /> },
    { label: "Abrir Agenda", path: "/admin/agenda", icon: <Calendar className="h-4 w-4 text-indigo-500" /> },
  ];

  const skillCallbacks: ExecutionCallback = {
    navigate: (url) => { router.push(url); setOpen(false); setSearch(""); },
    openPanel: (title, _component, _params) => { toast.info(`Abrindo: ${title}`); setOpen(false); },
    showToast: (msg) => toast(msg),
    openDelegate: (url, fallback) => {
      try {
        window.open(url, "_blank");
        toast.success("Enviado para Cowork");
      } catch {
        navigator.clipboard?.writeText(fallback);
        toast.info("Prompt copiado! Cole no Cowork (⌘V)");
      }
      setOpen(false);
    },
  };

  const handleImportSEEU = () => {
    setOpen(false);
    // Navega para demandas e dispara evento para abrir o modal SEEU
    router.push("/admin/demandas");
    // Aguarda a navegação antes de disparar o evento
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-seeu-import"));
    }, 400);
  };

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
        className="gap-2 text-xs bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white hover:border-emerald-500/50 dark:hover:border-emerald-500/50 h-8 px-2 sm:px-3"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Cmd + K</span>
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

          {/* Skills matches — mostrado antes dos resultados de busca */}
          {skillMatches.length > 0 && (
            <CommandGroup heading="⚡ Skills">
              {skillMatches.map((m) => (
                <CommandItem
                  key={m.skill.id}
                  value={`skill-${m.skill.id}`}
                  onSelect={async () => {
                    await executeSkill(m, skillCallbacks);
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium text-sm">{m.skill.name}</span>
                    <span className="text-xs text-muted-foreground flex-1">{m.skill.description}</span>
                    {Object.keys(m.params).length > 0 && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 rounded">
                        {Object.values(m.params).join(", ")}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Skeleton enquanto busca */}
          {isSearching && (
            <CommandGroup heading="Buscando...">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-1.5">
                  <div className="h-4 w-4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-40 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
                    <div className="h-2.5 w-24 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  </div>
                </div>
              ))}
            </CommandGroup>
          )}

          {/* Resultados de busca — assistidos */}
          {!isSearching && hasResults && searchQuery.data!.assistidos.length > 0 && (
            <CommandGroup heading="Assistidos">
              {searchQuery.data!.assistidos.map((a) => {
                const isPreso = a.statusPrisional !== null && a.statusPrisional !== "SOLTO" && a.statusPrisional !== "DOMICILIAR" && a.statusPrisional !== "MONITORADO";
                return (
                  <CommandItem
                    key={`assistido-${a.id}`}
                    value={`assistido ${a.nome} ${a.cpf || ""}`}
                    onSelect={() => handleSelect(`/admin/assistidos/${a.id}`, a.nome, "assistido")}
                    className="flex items-center gap-3"
                  >
                    <div className="relative flex-shrink-0">
                      <User className="h-4 w-4 text-emerald-500" />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white dark:border-zinc-900 ${isPreso ? "bg-red-500" : "bg-emerald-500"}`}
                        title={isPreso ? "Preso" : "Solto"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{a.nome}</span>
                      {a.cpf && (
                        <span className="ml-2 text-xs text-zinc-400 font-mono">{a.cpf}</span>
                      )}
                    </div>
                    <ArrowRight className="h-3 w-3 text-zinc-400" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Resultados de busca — processos */}
          {!isSearching && hasResults && searchQuery.data!.processos.length > 0 && (
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
          {!isSearching && hasResults && searchQuery.data!.demandas.length > 0 && (
            <CommandGroup heading="Demandas">
              {searchQuery.data!.demandas.map((d) => {
                const prazoDate = d.prazo ? new Date(d.prazo) : null;
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                const prazoVencido = prazoDate ? prazoDate < hoje : false;
                const prazoStr = prazoDate
                  ? prazoDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                  : null;
                const destPath = d.assistidoId
                  ? `/admin/assistidos/${d.assistidoId}`
                  : "/admin/demandas";
                return (
                  <CommandItem
                    key={`demanda-${d.id}`}
                    value={`demanda ${d.ato} ${d.tipoAto || ""}`}
                    onSelect={() => handleSelect(destPath, d.ato, "demanda")}
                    className="flex items-center gap-3"
                  >
                    <FileText className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {d.ato.length > 60 ? d.ato.slice(0, 60) + "..." : d.ato}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {d.status && (
                          <span className="text-xs text-zinc-400">{d.status.replace(/_/g, " ")}</span>
                        )}
                        {prazoStr && (
                          <span className={`text-xs font-mono ${prazoVencido ? "text-red-500" : "text-zinc-400"}`}>
                            · {prazoStr}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-3 w-3 text-zinc-400" />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {/* Separador entre busca e ações */}
          {!isSearching && hasResults && <CommandSeparator />}

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

          {/* Skills disponíveis — quando busca está vazia */}
          {!search && (
            <CommandGroup heading="Skills Disponíveis">
              {getAllSkills().slice(0, 6).map((s) => (
                <CommandItem
                  key={s.id}
                  value={`skill-suggest-${s.id}`}
                  onSelect={() => { setSearch(`/${s.id} `); }}
                >
                  <span className="text-sm">{s.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">/{s.id}</span>
                </CommandItem>
              ))}
            </CommandGroup>
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

          {/* Ações rápidas — Radar, Agenda, SEEU */}
          <CommandGroup heading="Ações">
            {quickNav.map((item) => (
              <CommandItem
                key={item.label}
                onSelect={() => {
                  setOpen(false);
                  if (item.path) router.push(item.path);
                }}
                className="flex items-center gap-3"
              >
                {item.icon || <ArrowRight className="h-4 w-4" />}
                <span>{item.label}</span>
              </CommandItem>
            ))}
            <CommandItem
              onSelect={handleImportSEEU}
              className="flex items-center gap-3"
            >
              <Download className="h-4 w-4 text-teal-500" />
              <span>Importar do SEEU</span>
            </CommandItem>
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

        {/* Keyboard hint */}
        <div className="flex items-center justify-center gap-3 border-t border-zinc-200 dark:border-zinc-700 px-4 py-2">
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            <kbd className="font-mono">↑↓</kbd> navegar
          </span>
          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            <kbd className="font-mono">Enter</kbd> confirmar
          </span>
          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">·</span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            <kbd className="font-mono">Esc</kbd> fechar
          </span>
        </div>
      </CommandDialog>
    </>
  );
}
