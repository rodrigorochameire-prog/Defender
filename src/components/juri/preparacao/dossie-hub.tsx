"use client";

import { useState } from "react";
import {
  Users,
  Gavel,
  Scale,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { DossiePersonagem } from "./dossie-personagem";

// ============================================
// TYPES
// ============================================

interface DossieHubProps {
  sessaoId: string;
  casoId: number | null;
}

interface Personagem {
  id: number;
  nome: string;
  tipo: string;
  vara?: string | null;
  comarca?: string | null;
  estiloAtuacao?: string | null;
  pontosFortes?: string | null;
  pontosFracos?: string | null;
  tendenciasObservadas?: string | null;
  estrategiasRecomendadas?: string | null;
  totalSessoes?: number | null;
  totalCondenacoes?: number | null;
  totalAbsolvicoes?: number | null;
  totalDesclassificacoes?: number | null;
  tempoMedioSustentacao?: number | null;
  argumentosPreferidos?: string[] | null;
  tesesVulneraveis?: string[] | null;
  notasEstrategicas?: string | null;
  ultimaSessaoData?: string | null;
}

// ============================================
// SUB-COMPONENTS
// ============================================

function SkeletonCard() {
  return (
    <Card className="border-l-4 border-l-border">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
        <Skeleton className="h-4 w-32 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="space-y-2 pt-3 border-t border-border">
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
          <Skeleton className="h-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function AddPersonagemCard({
  tipo,
  sessaoId,
  onSuccess,
  isSubmitting,
  onSubmit,
}: {
  tipo: "juiz" | "promotor";
  sessaoId: string;
  onSuccess?: () => void;
  isSubmitting: boolean;
  onSubmit: (data: {
    nome: string;
    tipo: string;
    vara: string;
    comarca: string;
    estiloAtuacao: string;
    sessaoId: number;
  }) => void;
}) {
  const [nome, setNome] = useState("");
  const [vara, setVara] = useState("");
  const [comarca, setComarca] = useState("");
  const [estiloAtuacao, setEstiloAtuacao] = useState("");

  const isJuiz = tipo === "juiz";
  const config = {
    juiz: {
      label: "Juiz(a)",
      icon: <Gavel className="w-5 h-5" />,
      accentBorder: "border-l-amber-300 dark:border-l-amber-700",
      iconColor: "text-amber-500 dark:text-amber-400",
      badgeClass:
        "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900",
    },
    promotor: {
      label: "Promotor(a)",
      icon: <Scale className="w-5 h-5" />,
      accentBorder: "border-l-red-300 dark:border-l-red-700",
      iconColor: "text-red-500 dark:text-red-400",
      badgeClass:
        "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
    },
  };
  const c = config[tipo];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    onSubmit({
      nome: nome.trim(),
      tipo,
      vara: vara.trim(),
      comarca: comarca.trim(),
      estiloAtuacao: estiloAtuacao.trim(),
      sessaoId: Number(sessaoId),
    });
  };

  return (
    <Card
      className={cn(
        "border-l-4 border-dashed border-border",
        c.accentBorder
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className={cn("w-5 h-5", c.iconColor)} />
          Adicionar {c.label}
        </CardTitle>
        <CardDescription>
          Cadastre o perfil para acompanhar historico e estrategias
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor={`nome-${tipo}`} className="text-xs">
              Nome completo *
            </Label>
            <Input
              id={`nome-${tipo}`}
              placeholder={
                isJuiz ? "Dr(a). Nome do(a) Juiz(a)" : "Dr(a). Nome do(a) Promotor(a)"
              }
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Vara + Comarca */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`vara-${tipo}`} className="text-xs">
                Vara
              </Label>
              <Input
                id={`vara-${tipo}`}
                placeholder="2a Vara do Juri"
                value={vara}
                onChange={(e) => setVara(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`comarca-${tipo}`} className="text-xs">
                Comarca
              </Label>
              <Input
                id={`comarca-${tipo}`}
                placeholder="Salvador/BA"
                value={comarca}
                onChange={(e) => setComarca(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Estilo de Atuacao */}
          <div className="space-y-1.5">
            <Label htmlFor={`estilo-${tipo}`} className="text-xs">
              Estilo de atuacao
            </Label>
            <Textarea
              id={`estilo-${tipo}`}
              placeholder={
                isJuiz
                  ? "Ex: Formalista, rigoroso com prazos, tende a privilegiar a acusacao em crimes dolosos..."
                  : "Ex: Agressivo em plenario, usa linguagem emocional, foca em provas tecnicas..."
              }
              value={estiloAtuacao}
              onChange={(e) => setEstiloAtuacao(e.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="sm"
            disabled={!nome.trim() || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Adicionar {c.label}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DossieHub({ sessaoId, casoId }: DossieHubProps) {
  // ---- tRPC queries ----
  const preparacaoRouter = (trpc as any).preparacao;

  const {
    data: personagens,
    isLoading,
    isError,
    error,
    refetch,
  } = preparacaoRouter
    ? preparacaoRouter.personagensBySessao.useQuery(
        { sessaoId: Number(sessaoId) },
        {
          enabled: !!sessaoId,
          retry: 1,
          staleTime: 2 * 60 * 1000,
        }
      )
    : {
        data: undefined as Personagem[] | undefined,
        isLoading: false,
        isError: true,
        error: new Error("Router preparacao nao disponivel"),
        refetch: () => {},
      };

  // ---- Mutation ----
  const createMutation = preparacaoRouter
    ? preparacaoRouter.createPersonagem.useMutation({
        onSuccess: () => {
          refetch();
        },
      })
    : {
        mutate: () => {},
        isPending: false,
      };

  // ---- Separate by type ----
  const juizes: Personagem[] =
    (personagens as Personagem[] | undefined)?.filter(
      (p) => p.tipo === "juiz"
    ) ?? [];
  const promotores: Personagem[] =
    (personagens as Personagem[] | undefined)?.filter(
      (p) => p.tipo === "promotor"
    ) ?? [];

  const handleCreatePersonagem = (data: {
    nome: string;
    tipo: string;
    vara: string;
    comarca: string;
    estiloAtuacao: string;
    sessaoId: number;
  }) => {
    createMutation.mutate(data);
  };

  const handleEdit = (id: number) => {
    // Placeholder for future edit modal integration
    console.log("Edit personagem:", id);
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <Card className="p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Dossie dos Personagens
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Error state ----
  if (isError) {
    return (
      <Card className="p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Dossie dos Personagens
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground/80">
                Erro ao carregar personagens
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {(error as any)?.message ??
                  "Nao foi possivel conectar ao servidor. O router de preparacao pode nao estar disponivel ainda."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Render ----
  return (
    <Card className="p-6">
      <CardHeader className="p-0 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Dossie dos Personagens
          </CardTitle>
          <div className="flex items-center gap-2">
            {juizes.length > 0 && (
              <Badge
                className="text-xs border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900"
              >
                <Gavel className="w-3 h-3 mr-1" />
                {juizes.length} Juiz{juizes.length > 1 ? "es" : ""}
              </Badge>
            )}
            {promotores.length > 0 && (
              <Badge
                className="text-xs border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
              >
                <Scale className="w-3 h-3 mr-1" />
                {promotores.length} Promotor{promotores.length > 1 ? "es" : ""}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ---- LEFT: Juiz column ---- */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1">
              <Gavel className="w-3.5 h-3.5 text-amber-500" />
              Juiz(a) Presidente
            </h4>
            {juizes.length > 0 ? (
              juizes.map((juiz) => (
                <DossiePersonagem
                  key={juiz.id}
                  personagem={juiz}
                  onEdit={handleEdit}
                />
              ))
            ) : (
              <AddPersonagemCard
                tipo="juiz"
                sessaoId={sessaoId}
                onSuccess={() => refetch()}
                isSubmitting={createMutation.isPending}
                onSubmit={handleCreatePersonagem}
              />
            )}
          </div>

          {/* ---- RIGHT: Promotor column ---- */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1">
              <Scale className="w-3.5 h-3.5 text-red-500" />
              Promotor(a) de Justica
            </h4>
            {promotores.length > 0 ? (
              promotores.map((promotor) => (
                <DossiePersonagem
                  key={promotor.id}
                  personagem={promotor}
                  onEdit={handleEdit}
                />
              ))
            ) : (
              <AddPersonagemCard
                tipo="promotor"
                sessaoId={sessaoId}
                onSuccess={() => refetch()}
                isSubmitting={createMutation.isPending}
                onSubmit={handleCreatePersonagem}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
