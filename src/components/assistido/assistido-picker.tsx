"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export interface AssistidoSelected {
  id: number;
  nome: string;
  statusPrisional: string | null;
}

interface AssistidoPickerProps {
  value: AssistidoSelected | null;
  onChange: (a: AssistidoSelected | null) => void;
  /** Optional preload by ID — usado quando formData só tem o id */
  preloadId?: number | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AssistidoPicker({
  value,
  onChange,
  preloadId,
  placeholder = "Buscar assistido...",
  className,
  disabled,
}: AssistidoPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: assistidos, isLoading } = trpc.assistidos.list.useQuery(
    { search: debouncedSearch || undefined },
    { enabled: open },
  );

  const { data: preloaded } = trpc.assistidos.getById.useQuery(
    { id: preloadId! },
    { enabled: !!preloadId && !value },
  );

  useEffect(() => {
    if (preloaded && !value) {
      onChange({
        id: preloaded.id,
        nome: preloaded.nome,
        statusPrisional: preloaded.statusPrisional ?? null,
      });
    }
  }, [preloaded, value, onChange]);

  const handleSelect = (a: { id: number; nome: string; statusPrisional: string | null }) => {
    onChange(a);
    setOpen(false);
    setSearch("");
  };

  const isPreso = value?.statusPrisional && value.statusPrisional !== "SOLTO";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="flex items-center gap-2 truncate">
            <User className="w-3 h-3 text-neutral-400 shrink-0" />
            {value ? (
              <>
                <span className="truncate">{value.nome}</span>
                {isPreso && (
                  <Badge variant="danger" className="text-[10px] px-1 py-0 shrink-0">
                    PRESO
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome ou CPF..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                Buscando...
              </div>
            )}
            {!isLoading && assistidos?.length === 0 && (
              <CommandEmpty>Nenhum assistido encontrado.</CommandEmpty>
            )}
            {!isLoading && !assistidos && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Digite para buscar
              </div>
            )}
            <CommandGroup>
              {assistidos?.map((a) => (
                <CommandItem
                  key={a.id}
                  value={a.id.toString()}
                  onSelect={() =>
                    handleSelect({
                      id: a.id,
                      nome: a.nome,
                      statusPrisional: a.statusPrisional ?? null,
                    })
                  }
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3 shrink-0",
                      value?.id === a.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1 truncate">{a.nome}</span>
                  {a.statusPrisional && a.statusPrisional !== "SOLTO" && (
                    <Badge variant="danger" className="ml-2 text-[10px] px-1 py-0">
                      PRESO
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
