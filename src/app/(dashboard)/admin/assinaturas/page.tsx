"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  TrendingUp,
  Users,
  AlertTriangle,
  Clock,
  Shield,
  CheckCircle2,
  Loader2,
  Percent,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── TIPOS ──────────────────────────────────────────────────────
type SubscriptionStatus = "ativo" | "pendente" | "vencido" | "cancelado" | "isento";
type Plano = "essencial" | "criminal" | "completo";

const PLANO_INFO: Record<Plano, { label: string; valor: number; desc: string }> = {
  essencial: {
    label: "Essencial",
    valor: 100,
    desc: "Processos, demandas, docs, agenda, Drive",
  },
  criminal: {
    label: "Criminal",
    valor: 150,
    desc: "+ Criminal, Juri, EP, VVD, Infancia",
  },
  completo: {
    label: "Completo",
    valor: 200,
    desc: "+ Enrichment IA, Radar, Investigacao, Analise Cruzada",
  },
};

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  pendente: { label: "Pendente", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  vencido: { label: "Vencido", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  cancelado: { label: "Cancelado", color: "bg-neutral-500/15 text-neutral-400 border-neutral-500/20" },
  isento: { label: "Isento", color: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
};

// Roles isentos (nao pagam)
const EXEMPT_ROLES = ["estagiario", "servidor"];

export default function AdminAssinaturasPage() {
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterComarca, setFilterComarca] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedComarcas, setExpandedComarcas] = useState<Set<string>>(new Set(["all"]));

  // ─── QUERIES ───────────────────────────────────────────────────
  const { data: subscriptionList, isLoading, refetch } = trpc.subscriptions.list.useQuery();
  const { data: stats } = trpc.subscriptions.stats.useQuery();

  const createOrUpdate = trpc.subscriptions.createOrUpdate.useMutation({
    onSuccess: () => {
      toast.success("Assinatura atualizada!");
      refetch();
    },
    onError: (e) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const setDesconto = trpc.subscriptions.setDesconto.useMutation({
    onSuccess: () => {
      toast.success("Desconto aplicado!");
      refetch();
    },
    onError: (e) => toast.error("Erro ao aplicar desconto", { description: e.message }),
  });

  const confirmPayment = trpc.subscriptions.confirmPayment.useMutation({
    onSuccess: () => {
      toast.success("Pagamento confirmado!");
      refetch();
      refetchPending();
    },
    onError: (e) => toast.error("Erro ao confirmar pagamento", { description: e.message }),
  });

  // Pagamentos aguardando confirmacao (reportados por defensores)
  const { data: pendingPayments, refetch: refetchPending } = trpc.subscriptions.pendingPayments.useQuery();

  const confirmPaymentById = trpc.subscriptions.confirmPaymentById.useMutation({
    onSuccess: () => {
      toast.success("Pagamento confirmado!");
      refetch();
      refetchPending();
    },
    onError: (e) => toast.error("Erro ao confirmar", { description: e.message }),
  });

  const rejectPaymentById = trpc.subscriptions.rejectPaymentById.useMutation({
    onSuccess: () => {
      toast.success("Pagamento rejeitado");
      refetchPending();
    },
    onError: (e) => toast.error("Erro ao rejeitar", { description: e.message }),
  });

  // ─── DADOS PROCESSADOS ────────────────────────────────────────
  const comarcas = useMemo(() => {
    if (!subscriptionList) return [];
    const set = new Set(subscriptionList.map((r) => r.user.comarca || "Sem comarca"));
    return Array.from(set).sort();
  }, [subscriptionList]);

  const filteredData = useMemo(() => {
    if (!subscriptionList) return [];

    return subscriptionList.filter((row) => {
      // Status filter
      if (filterStatus !== "todos") {
        const isExempt = EXEMPT_ROLES.includes(row.user.role);
        const subStatus = isExempt ? "isento" : (row.subscription?.status || "sem_plano");
        if (filterStatus === "sem_plano") {
          if (subStatus !== "sem_plano") return false;
        } else if (subStatus !== filterStatus) {
          return false;
        }
      }

      // Comarca filter
      if (filterComarca !== "todas") {
        if ((row.user.comarca || "Sem comarca") !== filterComarca) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !row.user.name.toLowerCase().includes(q) &&
          !row.user.email.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [subscriptionList, filterStatus, filterComarca, searchQuery]);

  // Group by comarca
  const groupedByComarca = useMemo(() => {
    const groups: Record<string, typeof filteredData> = {};
    for (const row of filteredData) {
      const comarca = row.user.comarca || "Sem comarca";
      if (!groups[comarca]) groups[comarca] = [];
      groups[comarca].push(row);
    }
    return groups;
  }, [filteredData]);

  const toggleComarca = (comarca: string) => {
    const next = new Set(expandedComarcas);
    if (next.has(comarca)) next.delete(comarca);
    else next.add(comarca);
    setExpandedComarcas(next);
  };

  // ─── HANDLERS ─────────────────────────────────────────────────
  function handleSetPlano(userId: number, plano: Plano, currentDesconto: number = 0) {
    createOrUpdate.mutate({
      userId,
      plano,
      descontoPercentual: currentDesconto,
      status: "pendente",
    });
  }

  function handleSetDesconto(userId: number, desconto: number) {
    setDesconto.mutate({ userId, descontoPercentual: desconto });
  }

  function handleConfirmPayment(userId: number) {
    confirmPayment.mutate({ userId });
  }

  function handleSetIsento(userId: number) {
    createOrUpdate.mutate({
      userId,
      plano: "essencial",
      descontoPercentual: 100,
      status: "isento",
    });
  }

  // ─── RENDER ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Assinaturas</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Gerencie planos, descontos e pagamentos dos defensores
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatsCard
          label="MRR"
          value={`R$ ${(stats?.totalMRR ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatsCard
          label="Ativos"
          value={String(stats?.ativos ?? 0)}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatsCard
          label="Pendentes"
          value={String(stats?.pendentes ?? 0)}
          icon={Clock}
          color="amber"
        />
        <StatsCard
          label="Vencidos"
          value={String(stats?.vencidos ?? 0)}
          icon={AlertTriangle}
          color="red"
        />
        <StatsCard
          label="Isentos"
          value={String(stats?.isentos ?? 0)}
          icon={Shield}
          color="blue"
        />
      </div>

      {/* Pending Payments Section */}
      {pendingPayments && pendingPayments.length > 0 && (
        <Card className="bg-card/50 border-amber-800/40 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pagamentos aguardando confirmacao ({pendingPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingPayments.map((item) => (
                <div
                  key={item.payment.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-sm">{item.user.name}</span>
                      <span className="text-xs text-neutral-500">{item.user.comarca}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                      <span>R$ {parseFloat(item.payment.valor).toFixed(2).replace(".", ",")}</span>
                      <span>Ref: {item.payment.referenciaMes}</span>
                      <span>{item.payment.createdAt ? new Date(item.payment.createdAt).toLocaleDateString("pt-BR") : ""}</span>
                      {item.payment.nota && (
                        <span className="text-neutral-400 italic truncate max-w-[200px]">
                          &quot;{item.payment.nota}&quot;
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-emerald-800 text-emerald-400 hover:bg-emerald-900/30"
                      onClick={() => confirmPaymentById.mutate({ paymentId: item.payment.id })}
                      disabled={confirmPaymentById.isPending || rejectPaymentById.isPending}
                    >
                      {confirmPaymentById.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-red-800 text-red-400 hover:bg-red-900/30"
                      onClick={() => rejectPaymentById.mutate({ paymentId: item.payment.id })}
                      disabled={confirmPaymentById.isPending || rejectPaymentById.isPending}
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.entries(PLANO_INFO) as [Plano, typeof PLANO_INFO[Plano]][]).map(([key, info]) => (
          <Card key={key} className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-foreground">{info.label}</span>
                <span className="text-emerald-400 font-semibold">
                  R$ {info.valor}
                  <span className="text-xs text-neutral-500">/mes</span>
                </span>
              </div>
              <p className="text-xs text-neutral-500">{info.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/50 border-border text-foreground"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] bg-card/50 border-border text-foreground">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="vencido">Vencidos</SelectItem>
            <SelectItem value="isento">Isentos</SelectItem>
            <SelectItem value="sem_plano">Sem plano</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterComarca} onValueChange={setFilterComarca}>
          <SelectTrigger className="w-[180px] bg-card/50 border-border text-foreground">
            <SelectValue placeholder="Comarca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas comarcas</SelectItem>
            {comarcas.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* User List grouped by comarca */}
      <div className="space-y-4">
        {Object.entries(groupedByComarca)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([comarca, rows]) => {
            const isExpanded = expandedComarcas.has(comarca) || expandedComarcas.has("all");

            return (
              <Card key={comarca} className="bg-card/50 border-border/50 overflow-hidden">
                <button
                  onClick={() => toggleComarca(comarca)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-neutral-500" />
                    )}
                    <span className="font-medium text-foreground">{comarca}</span>
                    <Badge variant="outline" className="text-xs border-border text-neutral-500">
                      {rows.length}
                    </Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border/50">
                    {rows.map((row) => (
                      <UserSubscriptionRow
                        key={row.user.id}
                        user={row.user}
                        subscription={row.subscription}
                        onSetPlano={handleSetPlano}
                        onSetDesconto={handleSetDesconto}
                        onConfirmPayment={handleConfirmPayment}
                        onSetIsento={handleSetIsento}
                        isLoading={
                          createOrUpdate.isPending ||
                          setDesconto.isPending ||
                          confirmPayment.isPending
                        }
                      />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}

        {Object.keys(groupedByComarca).length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            Nenhum resultado encontrado
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTES AUXILIARES ──────────────────────────────────────

function StatsCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: "emerald" | "amber" | "red" | "blue";
}) {
  const colorMap = {
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    blue: "text-blue-400",
  };

  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={cn("h-5 w-5", colorMap[color])} />
        <div>
          <p className="text-xs text-neutral-500">{label}</p>
          <p className="text-lg font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function UserSubscriptionRow({
  user,
  subscription,
  onSetPlano,
  onSetDesconto,
  onConfirmPayment,
  onSetIsento,
  isLoading,
}: {
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    comarca: string | null;
    funcao: string | null;
    areasPrincipais: string[] | null;
    approvalStatus: string;
  };
  subscription: {
    id: number;
    plano: string;
    status: string;
    valorBase: string;
    descontoPercentual: number | null;
    valorFinal: string;
    dataVencimento: string | null;
    dataUltimoPagamento: string | null;
  } | null;
  onSetPlano: (userId: number, plano: Plano, desconto: number) => void;
  onSetDesconto: (userId: number, desconto: number) => void;
  onConfirmPayment: (userId: number) => void;
  onSetIsento: (userId: number) => void;
  isLoading: boolean;
}) {
  const isExempt = EXEMPT_ROLES.includes(user.role);
  const status = (isExempt ? "isento" : subscription?.status || null) as SubscriptionStatus | null;
  const statusInfo = status ? STATUS_CONFIG[status] : null;

  const [localDesconto, setLocalDesconto] = useState(
    String(subscription?.descontoPercentual ?? 0)
  );

  // Calcular valor final com desconto local
  const currentPlano = (subscription?.plano || "essencial") as Plano;
  const descontoNum = Math.min(100, Math.max(0, parseInt(localDesconto) || 0));
  const valorComDesconto = PLANO_INFO[currentPlano].valor * (1 - descontoNum / 100);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 border-b border-border/30 last:border-b-0 hover:bg-muted/20 transition-colors">
      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{user.name}</span>
          {statusInfo ? (
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusInfo.color)}>
              {statusInfo.label}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-border/30">
              Sem plano
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
          <span>{user.email}</span>
          {user.funcao && <span>| {user.funcao}</span>}
          {user.areasPrincipais && user.areasPrincipais.length > 0 && (
            <span>| {user.areasPrincipais.join(", ")}</span>
          )}
        </div>
        {subscription?.dataVencimento && (
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">
            Vencimento: {new Date(subscription.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
            {subscription.dataUltimoPagamento && (
              <> | Ultimo pagamento: {new Date(subscription.dataUltimoPagamento + "T00:00:00").toLocaleDateString("pt-BR")}</>
            )}
          </p>
        )}
      </div>

      {/* Controls (hidden for exempt users) */}
      {isExempt ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", STATUS_CONFIG.isento.color)}>
            <Shield className="h-3 w-3 mr-1" />
            Isento ({user.role})
          </Badge>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {/* Plan Selector */}
          <Select
            value={subscription?.plano || ""}
            onValueChange={(val) =>
              onSetPlano(user.id, val as Plano, subscription?.descontoPercentual ?? 0)
            }
            disabled={isLoading}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/50 border-border text-foreground/80">
              <SelectValue placeholder="Plano..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="essencial">Essencial R$100</SelectItem>
              <SelectItem value="criminal">Criminal R$150</SelectItem>
              <SelectItem value="completo">Completo R$200</SelectItem>
            </SelectContent>
          </Select>

          {/* Discount */}
          {subscription && (
            <div className="flex items-center gap-1">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={localDesconto}
                  onChange={(e) => setLocalDesconto(e.target.value)}
                  onBlur={() => {
                    const val = Math.min(100, Math.max(0, parseInt(localDesconto) || 0));
                    setLocalDesconto(String(val));
                    if (val !== (subscription.descontoPercentual ?? 0)) {
                      onSetDesconto(user.id, val);
                    }
                  }}
                  className="w-[70px] h-8 text-xs bg-muted/50 border-border text-foreground/80 pr-6"
                  disabled={isLoading}
                />
                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-500" />
              </div>
              <span className="text-xs text-emerald-400 font-medium whitespace-nowrap">
                R$ {valorComDesconto.toFixed(0)}
              </span>
            </div>
          )}

          {/* Actions */}
          {subscription && subscription.status !== "ativo" && subscription.status !== "isento" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-emerald-800 text-emerald-400 hover:bg-emerald-900/30"
              onClick={() => onConfirmPayment(user.id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              )}
              Confirmar Pgto
            </Button>
          )}

          {!subscription && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-border text-neutral-400 hover:bg-muted/50"
              onClick={() => onSetPlano(user.id, "essencial", 0)}
              disabled={isLoading}
            >
              Atribuir plano
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
