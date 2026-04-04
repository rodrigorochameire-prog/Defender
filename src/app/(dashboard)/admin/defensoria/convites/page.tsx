// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Search,
  Copy,
  Check,
  Mail,
  MapPin,
  Timer,
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
  JURI: "Juri",
  CRIMINAL: "Criminal",
  EXECUCAO_PENAL: "EP",
  VIOLENCIA_DOMESTICA: "VVD",
  INFANCIA_JUVENTUDE: "Infancia",
  CIVEL: "Civel",
  FAMILIA: "Familia",
  FAZENDA_PUBLICA: "Fazenda",
};

const AREA_OPTIONS = Object.entries(AREA_LABELS).map(([value, label]) => ({
  value,
  label,
}));

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
      className="gap-1 text-xs h-7 px-2 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
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
            AREA_COLORS[area] ?? "bg-neutral-600"
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
    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs">
      Pendente
    </Badge>
  ) : (
    <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs">
      Ativo
    </Badge>
  );
}

function DemoBadge({ expiresAt }: { expiresAt: Date | string }) {
  const expDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return (
      <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30 text-xs gap-1">
        <Timer className="h-3 w-3" />
        Expirado
      </Badge>
    );
  }

  return (
    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs gap-1">
      <Timer className="h-3 w-3" />
      Demo · {diffDays}d restante{diffDays !== 1 ? "s" : ""}
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
  expiresAt: Date | string | null;
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
    estagiario: "estagiario",
  };
  return map[role] ?? role;
}

// ──────────────────────────────────────────
// Linha de usuario
// ──────────────────────────────────────────

function UserRow({ user }: { user: User }) {
  const isPending = !!user.inviteToken;

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
      {/* Info principal */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {user.funcao && (
            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{user.funcao}</span>
          )}
          <span className="font-medium text-foreground text-sm">{user.name}</span>
          <span className="text-xs text-muted-foreground">{getRoleLabel(user.role)}</span>
        </div>

        {user.email && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
        )}

        <AreaBadges areas={user.areasPrincipais} />
      </div>

      {/* Status + acao */}
      <div className="flex items-center gap-2 shrink-0">
        {user.expiresAt && <DemoBadge expiresAt={user.expiresAt} />}
        {!user.expiresAt && <StatusBadge isPending={isPending} />}
        {isPending && user.inviteToken && (
          <CopyInviteButton token={user.inviteToken} />
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Dialog para gerar link demo
// ──────────────────────────────────────────

function GenerateDemoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [comarca, setComarca] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [dias, setDias] = useState(7);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedExpires, setGeneratedExpires] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: comarcasList } = trpc.comarcas.listAll.useQuery();
  const utils = trpc.useUtils();

  const generateMutation = trpc.users.generateDemoLink.useMutation({
    onSuccess: (data) => {
      setGeneratedLink(data.link);
      setGeneratedExpires(data.expiresAt);
      utils.users.list.invalidate();
    },
  });

  const handleToggleArea = (area: string) => {
    setAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || !comarca) return;
    generateMutation.mutate({
      name: name.trim(),
      comarca,
      areasPrincipais: areas,
      diasValidade: dias,
    });
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setName("");
      setComarca("");
      setAreas([]);
      setDias(7);
      setGeneratedLink(null);
      setGeneratedExpires(null);
      setCopied(false);
      generateMutation.reset();
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border text-card-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Timer className="h-5 w-5 text-emerald-500" />
            Gerar Link de Demonstracao
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Crie um link temporario para um colega experimentar o OMBUDS.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-2">
              <Label className="text-foreground/80 text-sm">Nome do colega</Label>
              <Input
                placeholder="Ex: Dr. Fulano de Tal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Comarca */}
            <div className="space-y-2">
              <Label className="text-foreground/80 text-sm">Comarca</Label>
              <Select value={comarca} onValueChange={setComarca}>
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue placeholder="Selecione a comarca" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {comarcasList?.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.nome}
                      className="text-foreground focus:bg-muted focus:text-foreground"
                    >
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Areas */}
            <div className="space-y-2">
              <Label className="text-foreground/80 text-sm">Areas principais</Label>
              <div className="flex flex-wrap gap-2">
                {AREA_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors",
                      areas.includes(opt.value)
                        ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                        : "bg-muted border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Checkbox
                      checked={areas.includes(opt.value)}
                      onCheckedChange={() => handleToggleArea(opt.value)}
                      className="h-3 w-3 border-border data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Dias de validade */}
            <div className="space-y-2">
              <Label className="text-foreground/80 text-sm">Dias de validade</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className="bg-muted border-border text-foreground w-24"
              />
            </div>

            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || !comarca || generateMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {generateMutation.isPending ? "Gerando..." : "Gerar Link Demo"}
              </Button>
            </DialogFooter>

            {generateMutation.isError && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-2">
                {generateMutation.error?.message ?? "Erro ao gerar link"}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Link gerado */}
            <div className="space-y-2">
              <Label className="text-foreground/80 text-sm">Link gerado</Label>
              <div className="flex items-center gap-2 p-3 bg-muted border border-emerald-500/40 rounded-lg">
                <code className="text-xs text-emerald-700 dark:text-emerald-400 break-all flex-1">
                  {generatedLink}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0 gap-1 text-xs h-7 px-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>

            {/* Info de expiracao */}
            {generatedExpires && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Timer className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                <span>
                  Expira em{" "}
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {new Date(generatedExpires).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </span>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                className="border-border text-foreground/80 hover:bg-muted"
              >
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────
// Skeleton de carregamento
// ──────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="bg-card border-border">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="p-0">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────
// Pagina principal
// ──────────────────────────────────────────

export default function ConvitesPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("todos");
  const [activeComarca, setActiveComarca] = useState<string | null>(null);
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);

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
      {/* Cabecalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <UserPlus className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Convites -- 7a Regional
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestao de links de convite para defensores da regional
            </p>
          </div>
        </div>

        {/* Counters + Demo button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setDemoDialogOpen(true)}
            className="gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
          >
            <Timer className="h-4 w-4 text-emerald-500" />
            Gerar Link Demo
          </Button>
          <div className="flex gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalAtivos}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{totalPendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Busca */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground/50 h-8 text-sm"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1 p-0.5 bg-card rounded-lg border border-border">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilterStatus(btn.value)}
              className={cn(
                "px-3 py-1 text-xs rounded-md font-medium transition-colors",
                filterStatus === btn.value
                  ? "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comarca tabs -- so se houver mais de uma */}
      {comarcas.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveComarca(null)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors",
              activeComarca === null
                ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
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
                  ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className="h-3 w-3" />
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Conteudo */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : displayComarcas.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <UserPlus className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum usuario encontrado para os filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayComarcas.map((comarca) => {
            const users = grouped[comarca] ?? [];
            if (users.length === 0) return null;
            const pendentes = users.filter((u: User) => !!u.inviteToken).length;

            return (
              <Card key={comarca} className="bg-card border-border">
                <CardHeader className="pb-2 px-4 pt-3">
                  <CardTitle className="flex items-center justify-between text-sm font-semibold text-card-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                      {comarca}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {users.length} usuario{users.length !== 1 ? "s" : ""}
                      {pendentes > 0 && (
                        <span className="ml-2 text-amber-600 dark:text-amber-400">
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

      {/* Demo Dialog */}
      <GenerateDemoDialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen} />
    </div>
  );
}
