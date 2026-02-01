"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Building2, ChevronDown, Eye, EyeOff, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNucleoFilter, type Nucleo, NUCLEOS_CONFIG } from "@/hooks/use-nucleo-filter";

interface NucleoFilterProps {
  className?: string;
  compact?: boolean;
}

export function NucleoFilter({ className, compact = false }: NucleoFilterProps) {
  const {
    nucleoSelecionado,
    selecionarNucleo,
    nucleoUsuario,
    isAdmin,
    podeVerTodos,
    mostrarOutrosNucleos,
    setMostrarOutrosNucleos,
    mounted,
  } = useNucleoFilter();

  if (!mounted) return null;

  const configAtual = NUCLEOS_CONFIG[nucleoSelecionado];

  // Versão compacta para filtros inline
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={cn("h-8 gap-1.5", className)}>
            <Building2 className="w-3.5 h-3.5" />
            <span className="text-xs">{configAtual.label}</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {Object.entries(NUCLEOS_CONFIG).map(([key, config]) => (
            <DropdownMenuItem
              key={key}
              onClick={() => selecionarNucleo(key as Nucleo)}
              className={cn(
                "flex items-center gap-2",
                nucleoSelecionado === key && "bg-zinc-100 dark:bg-zinc-800"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", config.bgColor)} />
              <div className="flex-1">
                <span className="font-medium">{config.label}</span>
                {key !== "TODOS" && (
                  <span className="text-[10px] text-zinc-500 ml-1">({config.description})</span>
                )}
              </div>
              {nucleoSelecionado === key && (
                <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700">Ativo</Badge>
              )}
            </DropdownMenuItem>
          ))}
          
          {podeVerTodos && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 flex items-center justify-between">
                <Label htmlFor="mostrar-outros" className="text-xs text-zinc-500">
                  Mostrar outros núcleos
                </Label>
                <Switch
                  id="mostrar-outros"
                  checked={mostrarOutrosNucleos}
                  onCheckedChange={setMostrarOutrosNucleos}
                  className="scale-75"
                />
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Versão expandida para cabeçalhos
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 h-9 px-3",
            configAtual.bgColor,
            configAtual.color,
            className
          )}
        >
          <Building2 className="w-4 h-4" />
          <span className="font-medium">{configAtual.label}</span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
          <h4 className="font-semibold text-sm">Filtrar por Núcleo</h4>
          <p className="text-xs text-zinc-500 mt-0.5">
            Escolha qual núcleo deseja visualizar
          </p>
        </div>
        
        <div className="p-2 space-y-1">
          {Object.entries(NUCLEOS_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => selecionarNucleo(key as Nucleo)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                nucleoSelecionado === key
                  ? "bg-emerald-50 dark:bg-emerald-900/20"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              )}
            >
              <div className={cn("w-3 h-3 rounded-full", config.bgColor, config.color)} />
              <div className="flex-1">
                <p className={cn(
                  "text-sm font-medium",
                  nucleoSelecionado === key ? "text-emerald-700 dark:text-emerald-400" : ""
                )}>
                  {config.label}
                </p>
                <p className="text-[10px] text-zinc-500">{config.description}</p>
              </div>
              {nucleoSelecionado === key && (
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          ))}
        </div>

        {podeVerTodos && (
          <div className="p-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mostrarOutrosNucleos ? (
                  <Eye className="w-4 h-4 text-emerald-500" />
                ) : (
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                )}
                <div>
                  <p className="text-xs font-medium">Exibir outros núcleos</p>
                  <p className="text-[10px] text-zinc-500">
                    {mostrarOutrosNucleos ? "Todos visíveis" : "Apenas meu núcleo"}
                  </p>
                </div>
              </div>
              <Switch
                checked={mostrarOutrosNucleos}
                onCheckedChange={setMostrarOutrosNucleos}
              />
            </div>
          </div>
        )}

        {nucleoUsuario && nucleoSelecionado !== nucleoUsuario && (
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Você pertence ao núcleo {NUCLEOS_CONFIG[nucleoUsuario]?.label}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
