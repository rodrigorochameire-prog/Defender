// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  Search,
  Copy,
  Check,
  Mail,
  MapPin,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────
// Área: cores e labels
// ──────────────────────────────────────────

const AREA_COLORS: Record<string, string> = {
  JURI: "bg-purple-600",
  CRIMINAL: "bg-red-600",
  EXECUCAO_PENAL: "bg-orange-600",
  VIOLENCIA_DOMESTICA: "bg-rose-600",
  INFANCIA_JUVENTUDE: "bg-amber-600",
  CIVEL: "bg-blue-600",
  FAMILIA: "bg-cyan-600",
  FAZENDA_PUBLICA: "bg-teal-600",
};

const AREA_LABELS: Record<string, string> = {
  JURI: "Júri",
  CRIMINAL: "Criminal",
  EXECUCAO_PENAL: "EP",
  VIOLENCIA_DOMESTICA: "VVD",
  INFANCIA_JUVENTUDE: "Infância",
  CIVEL: "Cível",
  FAMILIA: "Família",
  FAZENDA_PUBLICA: "Fazenda",
};

// ──────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────

function CopyInviteButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `https://ombuds.vercel.app/convite/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-1 text-xs h-7 px-2 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copiado!" : "Copiar Link"}
    </Button>
  );
}

function AreaBadges({ areas }: { areas: string[] | null | undefined }) {
  if (!areas || areas.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {areas.map((area) => (
        <span
          key={area}
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-white",
            AREA_COLORS[area] ?? "bg-zinc-600"
          )}
        >
          {AREA_LABELS[area] ?? area}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ isPending }: { isPending: boolean }) {
  return isPending ? (
    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
      Pendente
    </Badge>
  ) : (
    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
      Ativo
    </Badge>
  );
}

// ──────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  oab: string | null;
  comarca: string | null;
  funcao: string | null;
  emailVerified: boolean;
  createdAt: Date;
  inviteToken: string | null;
  mustChangePassword: boolean | null;
  areasPrincipais: string[] | null;
  comarcaId: number | null;
}

type FilterStatus = "todos" | "pendentes" | "ativos";

// ──────────────────────────────────────────
// Role label helper
// ──────────────────────────────────────────

function getRoleLabel(role: string) {
  const map: Record<string, string> = {
    admin: "admin",
    defensor: "defensor",
    servidor: "servidor",
    estagiario: "estagiário",
  };
  return map[role] ?? role;
}

// ──────────────────────────────────────────
// Linha de usuário
// ──────────────────────────────────────────

function UserRow({ user }: { user: User }) {
  const isPending = !!user.inviteToken;

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30 transition-colors">
      {/* Info principal */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {user.funcao && (
            <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">{user.funcao}</span>
          )}
          <span className="font-medium text-zinc-100 text-sm">{user.name}</span>
          <span className="text-xs text-zinc-500">{getRoleLabel(user.role)}</span>
        </div>

        {user.email && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
        )}

        <AreaBadges areas={user.areasPrincipais} />
      </div>

      {/* Status + ação */}
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge isPending={isPending} />
        {isPending && user.inviteToken && (
          <CopyInviteButton token={user.inviteToken} />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Skeleton de carregamento
// ──────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40 bg-zinc-800" />
          </CardHeader>
          <CardContent className="p-0">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 last:border-0">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36 bg-zinc-800" />
                  <Skeleton className="h-3 w-48 bg-zinc-800" />
                </div>
                <Skeleton className="h-5 w-16 bg-zinc-800 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────
// Página principal
// ──────────────────────────────────────────

export default function ConvitesPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("todos");
  const [activeComarca, setActiveComarca] = useState<string | null>(null);

  const { data: usersData, isLoading } = trpc.users.list.useQuery();

  // Agrupamento por comarca com filtros aplicados
  const { grouped, comarcas, totalPendentes, totalAtivos } = useMemo(() => {
    if (!usersData) return { grouped: {}, comarcas: [], totalPendentes: 0, totalAtivos: 0 };

    const filtered = usersData.filter((u: User) => {
      // filtro de status
      if (filterStatus === "pendentes" && !u.inviteToken) return false;
      if (filterStatus === "ativos" && u.inviteToken) return false;

      // filtro de busca
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !u.name.toLowerCase().includes(q) &&
          !u.email?.toLowerCase().includes(q)
        ) return false;
      }

      return true;
    });

    const groups: Record<string, User[]> = {};
    let pendentes = 0;
    let ativos = 0;

    for (const u of usersData as User[]) {
      if (u.inviteToken) pendentes++;
      else ativos++;
    }

    for (const u of filtered as User[]) {
      const key = u.comarca ?? "Sem Comarca";
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    }

    // Sort users within each comarca by DP number
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const dpA = a.funcao?.match(/(\d+)/)?.[1] ?? "99";
        const dpB = b.funcao?.match(/(\d+)/)?.[1] ?? "99";
        return parseInt(dpA) - parseInt(dpB);
      });
    }

    const sortedComarcas = Object.keys(groups).sort();

    return { grouped: groups, comarcas: sortedComarcas, totalPendentes: pendentes, totalAtivos: ativos };
  }, [usersData, search, filterStatus]);

  const displayComarcas = activeComarca ? [activeComarca] : comarcas;

  const filterButtons: { value: FilterStatus; label: string }[] = [
    { value: "todos", label: "Todos" },
    { value: "pendentes", label: "Pendentes" },
    { value: "ativos", label: "Ativos" },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <UserPlus className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Convites — 7ª Regional
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Gestão de links de convite para defensores da regional
            </p>
          </div>
        </div>

        {/* Counters */}
        <div className="flex gap-3">
          <div className="text-center">
            <p className="text-xl font-bold text-emerald-400">{totalAtivos}</p>
            <p className="text-xs text-zinc-500">Ativos</p>
          </div>
          <div className="w-px bg-zinc-700" />
          <div className="text-center">
            <p className="text-xl font-bold text-amber-400">{totalPendentes}</p>
            <p className="text-xs text-zinc-500">Pendentes</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Busca */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 h-8 text-sm"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-lg border border-zinc-700">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilterStatus(btn.value)}
              className={cn(
                "px-3 py-1 text-xs rounded-md font-medium transition-colors",
                filterStatus === btn.value
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comarca tabs — só se houver mais de uma */}
      {comarcas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveComarca(null)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors",
              activeComarca === null
                ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            )}
          >
            <MapPin className="h-3 w-3" />
            Todas
          </button>
          {comarcas.map((c) => (
            <button
              key={c}
              onClick={() => setActiveComarca(c === activeComarca ? null : c)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors",
                activeComarca === c
                  ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200"
              )}
            >
              <MapPin className="h-3 w-3" />
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Conteúdo */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : displayComarcas.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum usuário encontrado para os filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayComarcas.map((comarca) => {
            const users = grouped[comarca] ?? [];
            if (users.length === 0) return null;
            const pendentes = users.filter((u: User) => !!u.inviteToken).length;

            return (
              <Card key={comarca} className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2 px-4 pt-3">
                  <CardTitle className="flex items-center justify-between text-sm font-semibold text-zinc-200">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      {comarca}
                    </span>
                    <span className="text-xs font-normal text-zinc-500">
                      {users.length} usuário{users.length !== 1 ? "s" : ""}
                      {pendentes > 0 && (
                        <span className="ml-2 text-amber-400">
                          · {pendentes} pendente{pendentes !== 1 ? "s" : ""}
                        </span>
                      )}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {users.map((user: User) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
