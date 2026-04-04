"use client";

import { cn } from "@/lib/utils";
import {
  User,
  Shield,
  AlertTriangle,
  Search,
  BadgeCheck,
  Gavel,
  Users,
} from "lucide-react";

interface Persona {
  id: number;
  nome: string;
  tipo: string;
  status?: string | null;
  observacoes?: string | null;
  confidence?: number | null;
}

const TIPO_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  reu: { label: "Reu", icon: User, color: "text-rose-500" },
  testemunha: { label: "Testemunha", icon: Users, color: "text-blue-500" },
  vitima: { label: "Vitima", icon: AlertTriangle, color: "text-amber-500" },
  perito: { label: "Perito", icon: Search, color: "text-violet-500" },
  policial: { label: "Policial", icon: Shield, color: "text-cyan-500" },
  delegado: { label: "Delegado", icon: BadgeCheck, color: "text-teal-500" },
  juiz: { label: "Juiz", icon: Gavel, color: "text-indigo-500" },
  familiar: { label: "Familiar", icon: Users, color: "text-neutral-500" },
  jurado: { label: "Jurado", icon: Users, color: "text-neutral-500" },
  outro: { label: "Outro", icon: User, color: "text-neutral-400" },
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pendente: {
    label: "Pendente",
    className: "bg-muted text-muted-foreground",
  },
  localizada: {
    label: "Localizada",
    className: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  intimada: {
    label: "Intimada",
    className:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  },
  ouvida: {
    label: "Ouvida",
    className:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
};

interface IntelligencePersonasProps {
  personas: Persona[];
  className?: string;
}

export function IntelligencePersonas({
  personas,
  className,
}: IntelligencePersonasProps) {
  if (personas.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <Users className="h-4 w-4" />
        <span>Nenhuma pessoa identificada.</span>
      </div>
    );
  }

  // Group by tipo
  const grouped = personas.reduce(
    (acc, p) => {
      const key = p.tipo || "outro";
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {} as Record<string, Persona[]>,
  );

  // Sort groups by relevance
  const groupOrder = [
    "reu",
    "vitima",
    "testemunha",
    "policial",
    "delegado",
    "perito",
    "juiz",
    "familiar",
    "jurado",
    "outro",
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {groupOrder.map((tipo) => {
        const group = grouped[tipo];
        if (!group || group.length === 0) return null;
        const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.outro;
        const Icon = config.icon;

        return (
          <div key={tipo}>
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <Icon className={cn("h-3.5 w-3.5", config.color)} />
              {config.label}
              <span className="text-muted-foreground">({group.length})</span>
            </h4>
            <div className="space-y-1">
              {group.map((persona) => {
                const statusConfig = persona.status
                  ? STATUS_BADGE[persona.status]
                  : null;

                return (
                  <div
                    key={persona.id}
                    className="flex items-center gap-2 py-1.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                      {persona.nome}
                    </span>

                    {statusConfig && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                          statusConfig.className,
                        )}
                      >
                        {statusConfig.label}
                      </span>
                    )}

                    {persona.confidence != null && persona.confidence > 0 && (
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {Math.round(persona.confidence * 100)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Notes for group */}
            {group
              .filter((p) => p.observacoes)
              .map((p) => (
                <p
                  key={`obs-${p.id}`}
                  className="text-xs text-muted-foreground italic pl-3 mt-1"
                >
                  {p.nome}: {p.observacoes}
                </p>
              ))}
          </div>
        );
      })}
    </div>
  );
}
