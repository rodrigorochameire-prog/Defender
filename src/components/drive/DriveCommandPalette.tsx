"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  RefreshCw,
  Upload,
  BarChart3,
  FileText,
  User,
  Scale,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useDriveContext } from "./DriveContext";
import {
  DRIVE_ATRIBUICOES,
  getFileIcon,
  getAtribuicaoByKey,
} from "./drive-constants";

// ─── Helpers ────────────────────────────────────────────────────────

function maskCpf(cpf: string | null): string {
  if (!cpf) return "";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.***.***.${digits.slice(9, 11)}`;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// Determine which atribuicao a file belongs to based on its driveFolderId
function findAtribuicaoForFile(driveFolderId: string): string | null {
  const match = DRIVE_ATRIBUICOES.find((a) => a.folderId === driveFolderId);
  return match?.key ?? null;
}

// ─── Component ──────────────────────────────────────────────────────

export function DriveCommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const hasSearch = debouncedSearch.length >= 2;

  const ctx = useDriveContext();
  const router = useRouter();
  const utils = trpc.useUtils();

  // ── Keyboard shortcut: Ctrl+K / Cmd+K ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const modifier =
        navigator.platform?.toLowerCase().includes("mac") ||
        navigator.userAgent?.toLowerCase().includes("mac")
          ? e.metaKey
          : e.ctrlKey;

      if (modifier && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Reset search when dialog closes ──
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  // ── tRPC queries: files across ALL atribuicao folders ──
  const fileQueries = DRIVE_ATRIBUICOES.map((attr) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    trpc.drive.files.useQuery(
      { folderId: attr.folderId, search: debouncedSearch },
      { enabled: open && hasSearch }
    )
  );

  const allFiles = useMemo(() => {
    if (!hasSearch) return [];
    const results: Array<{
      id: number;
      name: string;
      mimeType: string | null;
      driveFolderId: string;
      atribuicaoKey: string | null;
      atribuicaoLabel: string;
    }> = [];

    DRIVE_ATRIBUICOES.forEach((attr, idx) => {
      const data = fileQueries[idx]?.data;
      if (data?.files) {
        for (const file of data.files) {
          results.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            driveFolderId: file.driveFolderId,
            atribuicaoKey: attr.key,
            atribuicaoLabel: attr.label,
          });
        }
      }
    });

    return results.slice(0, 15); // Limit results
  }, [hasSearch, fileQueries]);

  // ── tRPC queries: assistidos and processos ──
  const { data: assistidos } = trpc.drive.searchAssistidosForLink.useQuery(
    { search: debouncedSearch },
    { enabled: open && hasSearch }
  );

  const { data: processos } = trpc.drive.searchProcessosForLink.useQuery(
    { search: debouncedSearch },
    { enabled: open && hasSearch }
  );

  // ── Mutations ──
  const syncAll = trpc.drive.syncAll.useMutation({
    onSuccess: () => {
      utils.drive.files.invalidate();
    },
  });

  // ── Handlers ──
  const close = useCallback(() => setOpen(false), []);

  const handleSelectFile = useCallback(
    (file: (typeof allFiles)[0]) => {
      // Navigate to the correct atribuicao + open detail panel
      if (file.atribuicaoKey) {
        ctx.setSelectedAtribuicao(file.atribuicaoKey);
      }
      ctx.openDetailPanel(file.id);
      close();
    },
    [ctx, close]
  );

  const handleSelectAssistido = useCallback(
    (id: number) => {
      router.push(`/admin/assistidos/${id}`);
      close();
    },
    [router, close]
  );

  const handleSelectProcesso = useCallback(
    (id: number) => {
      router.push(`/admin/processos/${id}`);
      close();
    },
    [router, close]
  );

  const handleSyncAll = useCallback(() => {
    syncAll.mutate();
    close();
  }, [syncAll, close]);

  const handleOverview = useCallback(() => {
    ctx.resetNavigation();
    ctx.setSelectedAtribuicao(null);
    close();
  }, [ctx, close]);

  // ── Detect OS for shortcut display ──
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return (
      navigator.platform?.toLowerCase().includes("mac") ||
      navigator.userAgent?.toLowerCase().includes("mac")
    );
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar arquivos, assistidos, processos..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          {hasSearch
            ? "Nenhum resultado encontrado."
            : "Digite para buscar..."}
        </CommandEmpty>

        {/* ── ARQUIVOS ── */}
        {hasSearch && allFiles.length > 0 && (
          <CommandGroup heading="ARQUIVOS">
            {allFiles.map((file) => {
              const FileIcon = getFileIcon(file.mimeType);
              return (
                <CommandItem
                  key={`file-${file.id}`}
                  value={`file-${file.name}`}
                  onSelect={() => handleSelectFile(file)}
                  className="gap-3"
                >
                  <FileIcon className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate text-sm text-zinc-200">
                      {file.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {file.atribuicaoLabel}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* ── ASSISTIDOS ── */}
        {hasSearch && assistidos && assistidos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="ASSISTIDOS">
              {assistidos.map((a) => (
                <CommandItem
                  key={`assistido-${a.id}`}
                  value={`assistido-${a.nome}-${a.cpf}`}
                  onSelect={() => handleSelectAssistido(a.id)}
                  className="gap-3"
                >
                  <User className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate text-sm text-zinc-200">
                      {a.nome}
                    </span>
                    {a.cpf && (
                      <span className="text-xs font-mono text-zinc-500">
                        {maskCpf(a.cpf)}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* ── PROCESSOS ── */}
        {hasSearch && processos && processos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="PROCESSOS">
              {processos.map((p) => (
                <CommandItem
                  key={`processo-${p.id}`}
                  value={`processo-${p.numero}-${p.assistidoNome}`}
                  onSelect={() => handleSelectProcesso(p.id)}
                  className="gap-3"
                >
                  <Scale className="h-4 w-4 shrink-0 text-zinc-400" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate text-sm font-mono text-zinc-200">
                      {p.numero}
                    </span>
                    {p.assistidoNome && (
                      <span className="text-xs text-zinc-500">
                        {p.assistidoNome}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* ── ACOES RAPIDAS ── */}
        <CommandSeparator />
        <CommandGroup heading="ACOES RAPIDAS">
          <CommandItem
            value="sincronizar-drive"
            onSelect={handleSyncAll}
            className="gap-3"
          >
            <RefreshCw
              className={`h-4 w-4 shrink-0 text-emerald-400 ${
                syncAll.isPending ? "animate-spin" : ""
              }`}
            />
            <span className="text-sm text-zinc-200">Sincronizar Drive</span>
          </CommandItem>

          <CommandItem
            value="upload-arquivo"
            onSelect={close}
            className="gap-3"
          >
            <Upload className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="text-sm text-zinc-200">Upload arquivo</span>
          </CommandItem>

          <CommandItem
            value="ver-estatisticas"
            onSelect={handleOverview}
            className="gap-3"
          >
            <BarChart3 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="text-sm text-zinc-200">Ver estatisticas</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>

      {/* ── Footer hint ── */}
      <div className="flex items-center justify-between border-t border-zinc-800 px-3 py-2">
        <span className="text-xs text-zinc-500">
          Navegue com setas, Enter para selecionar
        </span>
        <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
          {isMac ? "Cmd" : "Ctrl"}+K
        </kbd>
      </div>
    </CommandDialog>
  );
}
