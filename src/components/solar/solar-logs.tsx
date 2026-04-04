"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RefreshCw,
  Upload,
  FileText,
  StickyNote,
  Database,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

type StatusLevel = "online" | "warning" | "offline" | "unknown";

const STATUS_DOT: Record<StatusLevel, string> = {
  online: "bg-emerald-500",
  warning: "bg-amber-500",
  offline: "bg-rose-500",
  unknown: "bg-neutral-400",
};

function StatusDot({ level }: { level: StatusLevel }) {
  return (
    <span
      className={cn(
        "w-2.5 h-2.5 rounded-full shrink-0",
        STATUS_DOT[level],
        level === "online" && "animate-[pulse_3s_ease-in-out_infinite]",
      )}
    />
  );
}

function formatSessionAge(seconds: number | null | undefined): string {
  if (seconds == null) return "---";
  const min = Math.floor(seconds / 60);
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? `${m}m` : ""}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  accentBg: string;
  accentText: string;
  accentBorder: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accentBg,
  accentText,
  accentBorder,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border p-4",
        "bg-card",
        accentBorder,
        "shadow-sm",
      )}
    >
      <div
        className={cn(
          "absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center",
          accentBg,
        )}
      >
        <Icon className={cn("h-4 w-4", accentText)} />
      </div>
      <p className="text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System Status Row
// ─────────────────────────────────────────────────────────────────────────────

interface SystemRowProps {
  name: string;
  level: StatusLevel;
  details: string[];
}

function SystemRow({ name, level, details }: SystemRowProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <StatusDot level={level} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">
          {name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {details.join(" · ")}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function SolarLogs() {
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = trpc.solar.stats.useQuery(undefined, {
    staleTime: 30_000,
  });

  const {
    data: status,
    isLoading: isLoadingStatus,
  } = trpc.solar.status.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  const isLoading = isLoadingStats || isLoadingStatus;

  // ── Loading state ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  // ── Derive system statuses ──────────────────────────────────────────────
  const systems: SystemRowProps[] = [];

  if (status) {
    // Solar
    const sessionAge = status.session_age_seconds ?? null;
    const sessionMin = sessionAge != null ? Math.floor(sessionAge / 60) : null;
    const solarLevel: StatusLevel = status.authenticated
      ? sessionMin != null && sessionMin > 30
        ? "warning"
        : "online"
      : "offline";

    const solarDetails: string[] = [];
    solarDetails.push(
      status.authenticated ? "Autenticado" : "Sem autenticação",
    );
    if (status.authenticated && sessionAge != null) {
      solarDetails.push(`Sessão: ${formatSessionAge(sessionAge)}`);
    }
    solarDetails.push(
      `Seletores mapeados: ${status.selectors_mapped ? "Sim" : "Não"}`,
    );
    if (
      status.unmapped_selectors &&
      status.unmapped_selectors.length > 0
    ) {
      solarDetails.push(
        `${status.unmapped_selectors.length} seletor(es) pendente(s)`,
      );
    }

    systems.push({
      name: "Solar DPEBA",
      level: solarLevel,
      details: solarDetails,
    });

    // SIGAD
    systems.push({
      name: "SIGAD",
      level: status.solar_reachable ? "online" : "offline",
      details: [
        status.configured ? "Configurado" : "Não configurado",
        status.solar_reachable ? "Acessível" : "Inacessível",
      ],
    });

    // Engine
    systems.push({
      name: "Enrichment Engine",
      level: status.configured ? "online" : "offline",
      details: [
        status.configured ? "Online" : "Offline",
        status.available
          ? "Todos endpoints disponíveis"
          : "Indisponível",
      ],
    });
  } else {
    systems.push(
      {
        name: "Solar DPEBA",
        level: "offline",
        details: ["Sem conexão"],
      },
      {
        name: "SIGAD",
        level: "unknown",
        details: ["Status desconhecido"],
      },
      {
        name: "Enrichment Engine",
        level: "unknown",
        details: ["Status desconhecido"],
      },
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground/80 mb-3">
          Estatísticas da Integração
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Processos Sincronizados"
            value={stats?.processosSincronizados ?? 0}
            icon={RefreshCw}
            accentBg="bg-emerald-50 dark:bg-emerald-900/20"
            accentText="text-emerald-600 dark:text-emerald-400"
            accentBorder="border-emerald-200 dark:border-emerald-800"
          />
          <StatCard
            label="Assistidos Exportados"
            value={stats?.assistidosExportados ?? 0}
            icon={Upload}
            accentBg="bg-blue-50 dark:bg-blue-900/20"
            accentText="text-blue-600 dark:text-blue-400"
            accentBorder="border-blue-200 dark:border-blue-800"
          />
          <StatCard
            label="Fases Criadas"
            value={stats?.fasesCriadas ?? 0}
            icon={FileText}
            accentBg="bg-violet-50 dark:bg-violet-900/20"
            accentText="text-violet-600 dark:text-violet-400"
            accentBorder="border-violet-200 dark:border-violet-800"
          />
          <StatCard
            label="Anotações Pendentes"
            value={stats?.anotacoesPendentes ?? 0}
            icon={StickyNote}
            accentBg="bg-amber-50 dark:bg-amber-900/20"
            accentText="text-amber-600 dark:text-amber-400"
            accentBorder="border-amber-200 dark:border-amber-800"
          />
          <StatCard
            label="Assistidos no SIGAD"
            value={stats?.assistidosNoSigad ?? 0}
            icon={Database}
            accentBg="bg-muted"
            accentText="text-muted-foreground"
            accentBorder="border-border"
          />
        </div>
      </div>

      {/* ── System Status Detail ───────────────────────────────────────── */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground/80">
            Status Detalhado dos Sistemas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="divide-y divide-border">
            {systems.map((sys) => (
              <SystemRow key={sys.name} {...sys} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Info Notice ─────────────────────────────────────────────────── */}
      <Card className="border-dashed border-border bg-muted/50 shadow-none">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="h-4 w-4 text-muted-foreground/50 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Logs de operação serão persistidos em versão futura com tabela
              dedicada.
            </p>
            <p className="text-xs text-muted-foreground">
              Estatísticas calculadas em tempo real a partir das tabelas
              existentes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
