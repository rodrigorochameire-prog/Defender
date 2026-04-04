"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Send, Info, AlertTriangle, AlertCircle, Users, Bell, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlertaTempo {
  id: string;
  texto: string;
  tipo: "info" | "urgente" | "contradicao" | "jurado";
  timestamp: string;
  lido: boolean;
  fase: string;
}

interface AlertasTempoRealProps {
  isDarkMode: boolean;
  faseSelecionada: { id: string; label: string };
  mode: "enviar" | "receber";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "defender_cockpit_alertas";

const tipoConfig = {
  info: {
    label: "Info", icon: Info,
    bg: "bg-sky-50 dark:bg-sky-950/30", text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-800", ring: "ring-sky-400/30",
    btnBg: "bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/40 dark:hover:bg-sky-900/60",
  },
  urgente: {
    label: "Urgente", icon: AlertTriangle,
    bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800", ring: "ring-rose-400/30",
    btnBg: "bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/60",
  },
  contradicao: {
    label: "Contradicao", icon: AlertCircle,
    bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800", ring: "ring-amber-400/30",
    btnBg: "bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60",
  },
  jurado: {
    label: "Jurado", icon: Users,
    bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800", ring: "ring-blue-400/30",
    btnBg: "bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60",
  },
} as const;

type TipoAlerta = keyof typeof tipoConfig;

const quickAlerts: { texto: string; tipo: TipoAlerta }[] = [
  { texto: "Jurado X bocejando", tipo: "jurado" },
  { texto: "MP contradisse perito", tipo: "contradicao" },
  { texto: "Testemunha mudou versao", tipo: "contradicao" },
  { texto: "Atencao ao jurado [N]", tipo: "jurado" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadAlertas(): AlertaTempo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AlertaTempo[]) : [];
  } catch { return []; }
}

function saveAlertas(alertas: AlertaTempo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alertas));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function AlertItem({ alerta, clickable, onMark }: {
  alerta: AlertaTempo; clickable?: boolean; onMark?: (id: string) => void;
}) {
  const cfg = tipoConfig[alerta.tipo];
  const Icon = cfg.icon;
  const isUrgent = alerta.tipo === "urgente";
  const Wrapper = clickable ? "button" : "div";

  return (
    <Wrapper
      onClick={() => clickable && !alerta.lido && onMark?.(alerta.id)}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left",
        clickable && "cursor-pointer",
        "transition-all duration-200",
        alerta.lido
          ? "border-neutral-100 bg-neutral-50/50 opacity-60 dark:border-neutral-800 dark:bg-neutral-800/30"
          : cn(cfg.bg, cfg.border),
        clickable && isUrgent && !alerta.lido && "animate-pulse border-rose-300 dark:border-rose-700",
      )}
    >
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", alerta.lido ? "text-neutral-300 dark:text-neutral-600" : cfg.text)} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[12px]", alerta.lido ? "text-neutral-400 dark:text-neutral-500" : "font-medium text-neutral-900 dark:text-neutral-100")}>
          {alerta.texto}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{formatTime(alerta.timestamp)}</span>
          {clickable && (
            <span className={cn("text-[10px] uppercase tracking-wider", alerta.lido ? "text-neutral-300 dark:text-neutral-600" : cfg.text)}>
              {cfg.label}
            </span>
          )}
        </div>
      </div>
      {alerta.lido
        ? <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400 dark:text-emerald-600" />
        : clickable && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
    </Wrapper>
  );
}

const cardClass = cn("flex flex-col gap-3 rounded-xl border p-4", "border-neutral-200/80 bg-white", "dark:border-neutral-800/80 dark:bg-neutral-900");

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AlertasTempoReal({ isDarkMode, faseSelecionada, mode }: AlertasTempoRealProps) {
  const [alertas, setAlertas] = useState<AlertaTempo[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoAlerta>("info");
  const [texto, setTexto] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAlertas(loadAlertas());
    if (mode === "receber") {
      const interval = setInterval(() => setAlertas(loadAlertas()), 1500);
      return () => clearInterval(interval);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === "receber" && listRef.current) listRef.current.scrollTop = 0;
  }, [alertas.length, mode]);

  const unreadCount = useMemo(() => alertas.filter((a) => !a.lido).length, [alertas]);
  const sortedAlertas = useMemo(() => [...alertas].sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [alertas]);

  const enviarAlerta = useCallback((textoAlerta: string, tipo: TipoAlerta) => {
    if (!textoAlerta.trim()) return;
    const novo: AlertaTempo = {
      id: crypto.randomUUID(), texto: textoAlerta.trim(), tipo,
      timestamp: new Date().toISOString(), lido: false, fase: faseSelecionada.id,
    };
    const updated = [...alertas, novo];
    setAlertas(updated);
    saveAlertas(updated);
    setTexto("");
    inputRef.current?.focus();
  }, [alertas, faseSelecionada.id]);

  const marcarComoLido = useCallback((id: string) => {
    const updated = alertas.map((a) => (a.id === id ? { ...a, lido: true } : a));
    setAlertas(updated);
    saveAlertas(updated);
  }, [alertas]);

  const marcarTodosLidos = useCallback(() => {
    const updated = alertas.map((a) => ({ ...a, lido: true }));
    setAlertas(updated);
    saveAlertas(updated);
  }, [alertas]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); enviarAlerta(texto, tipoSelecionado); }
  }, [texto, tipoSelecionado, enviarAlerta]);

  // --- Mode: Enviar (intern) ------------------------------------------------
  if (mode === "enviar") {
    return (
      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Alertas em Tempo Real</span>
          </div>
          <Badge variant="outline" className="text-[10px]">{faseSelecionada.label}</Badge>
        </div>

        {/* Tipo selector */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(tipoConfig) as TipoAlerta[]).map((tipo) => {
            const cfg = tipoConfig[tipo];
            const Icon = cfg.icon;
            const active = tipoSelecionado === tipo;
            return (
              <button key={tipo} onClick={() => setTipoSelecionado(tipo)} className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium cursor-pointer transition-all duration-200",
                active ? cn(cfg.bg, cfg.text, "ring-2", cfg.ring) : "bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700",
              )}>
                <Icon className="h-3.5 w-3.5" />{cfg.label}
              </button>
            );
          })}
        </div>

        {/* Input + Send */}
        <div className="flex gap-2">
          <Input ref={inputRef} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Digitar alerta... (Ctrl+Enter)" className="h-9 text-sm" />
          <Button onClick={() => enviarAlerta(texto, tipoSelecionado)} disabled={!texto.trim()} size="sm"
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Quick alerts */}
        <div>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Alertas rapidos</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {quickAlerts.map((qa) => {
              const cfg = tipoConfig[qa.tipo];
              const Icon = cfg.icon;
              return (
                <button key={qa.texto} onClick={() => enviarAlerta(qa.texto, qa.tipo)} className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] cursor-pointer transition-all duration-200", cfg.btnBg, cfg.text,
                )}>
                  <Icon className="h-3 w-3" />{qa.texto}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sent list */}
        {sortedAlertas.length > 0 && (
          <div className="mt-1">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Enviados ({sortedAlertas.length})</span>
            <div className="mt-1.5 flex max-h-40 flex-col gap-1 overflow-y-auto">
              {sortedAlertas.map((a) => <AlertItem key={a.id} alerta={a} />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- Mode: Receber (defender) ----------------------------------------------
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Alertas em Tempo Real</span>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={marcarTodosLidos} className={cn(
              "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] cursor-pointer transition-all duration-200",
              "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200",
            )}>
              <Check className="h-3 w-3" />Marcar todas
            </button>
          )}
          <Badge variant="outline" className="text-[10px]">{faseSelecionada.label}</Badge>
        </div>
      </div>

      <div ref={listRef} className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
        {sortedAlertas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="mb-2 h-8 w-8 text-neutral-200 dark:text-neutral-700" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500">Nenhum alerta recebido</p>
            <p className="text-[11px] text-neutral-300 dark:text-neutral-600">Alertas do estagiario aparecerao aqui</p>
          </div>
        ) : (
          sortedAlertas.map((a) => <AlertItem key={a.id} alerta={a} clickable onMark={marcarComoLido} />)
        )}
      </div>
    </div>
  );
}
