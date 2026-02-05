"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  ArrowLeft,
  Copy,
  Star,
  StarOff,
  ExternalLink,
  Download,
  Sparkles,
  Edit3,
  Trash2,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  Scale,
  Building2,
  Gavel,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// ==========================================
// TIPOS
// ==========================================

type Tribunal = "STF" | "STJ" | "TJBA" | "TRF1" | "TRF3" | "OUTRO";

const TRIBUNAL_CONFIG: Record<
  Tribunal,
  { label: string; color: string; icon: typeof Scale }
> = {
  STF: {
    label: "Supremo Tribunal Federal",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    icon: Building2,
  },
  STJ: {
    label: "Superior Tribunal de Justica",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: Gavel,
  },
  TJBA: {
    label: "Tribunal de Justica da Bahia",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: Scale,
  },
  TRF1: {
    label: "TRF 1a Regiao",
    color: "text-violet-600 bg-violet-50 border-violet-200",
    icon: Scale,
  },
  TRF3: {
    label: "TRF 3a Regiao",
    color: "text-rose-600 bg-rose-50 border-rose-200",
    icon: Scale,
  },
  OUTRO: {
    label: "Outro Tribunal",
    color: "text-zinc-600 bg-zinc-50 border-zinc-200",
    icon: FileText,
  },
};

// ==========================================
// PAGINA DE DETALHES
// ==========================================

export default function JulgadoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  // Query
  const { data: julgado, isLoading, refetch } = trpc.jurisprudencia.getJulgado.useQuery(
    { id },
    { enabled: !isNaN(id) }
  );

  const { data: temas } = trpc.jurisprudencia.listTemas.useQuery({});

  // Mutations
  const toggleFavoritoMutation = trpc.jurisprudencia.toggleFavorito.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Favorito atualizado");
    },
  });

  const processarIAMutation = trpc.jurisprudencia.processarJulgadoIA.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Julgado processado com IA!");
    },
    onError: (err) => {
      toast.error("Erro: " + err.message);
    },
  });

  const updateMutation = trpc.jurisprudencia.updateJulgado.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Julgado atualizado");
    },
  });

  const deleteMutation = trpc.jurisprudencia.deleteJulgado.useMutation({
    onSuccess: () => {
      toast.success("Julgado excluido");
      router.push("/admin/jurisprudencia");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!julgado) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 p-6">
        <p>Julgado nao encontrado</p>
      </div>
    );
  }

  const config = TRIBUNAL_CONFIG[julgado.tribunal as Tribunal] || TRIBUNAL_CONFIG.OUTRO;
  const Icon = config.icon;

  const statusConfig = {
    pendente: { icon: Clock, color: "text-zinc-500", label: "Pendente de processamento" },
    processando: { icon: Loader2, color: "text-blue-500", label: "Processando com IA" },
    processado: { icon: Check, color: "text-emerald-500", label: "Processado" },
    erro: { icon: AlertCircle, color: "text-red-500", label: "Erro no processamento" },
  };

  const status = statusConfig[julgado.status as keyof typeof statusConfig] || statusConfig.pendente;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/admin" },
              { label: "Jurisprudencia", href: "/admin/jurisprudencia" },
              { label: julgado.numeroProcesso || "Julgado" },
            ]}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/jurisprudencia">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className={cn("p-2.5 rounded-lg", config.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {julgado.numeroProcesso || "Julgado"}
                  </h1>
                  <Badge variant="outline">{config.label}</Badge>
                </div>
                <p className="text-sm text-zinc-500">
                  {julgado.relator && `Rel. ${julgado.relator}`}
                  {julgado.orgaoJulgador && ` - ${julgado.orgaoJulgador}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleFavoritoMutation.mutate({ id: julgado.id })}
              >
                {julgado.isFavorito ? (
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                ) : (
                  <StarOff className="w-5 h-5" />
                )}
              </Button>

              {julgado.driveFileUrl && (
                <Button variant="outline" asChild>
                  <a href={julgado.driveFileUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Original
                  </a>
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => processarIAMutation.mutate({ id: julgado.id })}
                disabled={processarIAMutation.isPending || julgado.status === "processando"}
              >
                {processarIAMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                {julgado.processadoPorIA ? "Reprocessar" : "Processar com IA"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Citacao */}
            {julgado.citacaoFormatada && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Citacao Formatada
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(julgado.citacaoFormatada!);
                        toast.success("Citacao copiada!");
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <code className="text-sm bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg block">
                    {julgado.citacaoFormatada}
                  </code>
                </CardContent>
              </Card>
            )}

            {/* Ementa */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Ementa</CardTitle>
              </CardHeader>
              <CardContent>
                {julgado.ementaResumo && (
                  <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-600">Resumo por IA</span>
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {julgado.ementaResumo}
                    </p>
                  </div>
                )}
                <ScrollArea className="max-h-96">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                    {julgado.ementa || "Ementa nao disponivel"}
                  </p>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Analise da IA */}
            {julgado.processadoPorIA && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Analise por IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pontos-chave */}
                  {julgado.iaPontosChave && (julgado.iaPontosChave as string[]).length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-zinc-500 mb-2">Pontos-Chave</h4>
                      <ul className="space-y-1">
                        {(julgado.iaPontosChave as string[]).map((ponto, i) => (
                          <li
                            key={i}
                            className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2"
                          >
                            <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            {ponto}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Argumentos */}
                  {julgado.iaArgumentos && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-emerald-600 mb-2">
                          Favoraveis a Defesa
                        </h4>
                        <ul className="space-y-1">
                          {((julgado.iaArgumentos as any).favoraveis || []).map(
                            (arg: string, i: number) => (
                              <li
                                key={i}
                                className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2"
                              >
                                <span className="text-emerald-500">+</span>
                                {arg}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-red-600 mb-2">
                          Desfavoraveis a Defesa
                        </h4>
                        <ul className="space-y-1">
                          {((julgado.iaArgumentos as any).desfavoraveis || []).map(
                            (arg: string, i: number) => (
                              <li
                                key={i}
                                className="text-sm text-zinc-600 dark:text-zinc-400 flex items-start gap-2"
                              >
                                <span className="text-red-500">-</span>
                                {arg}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Texto Integral */}
            {julgado.textoIntegral && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Texto Integral</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                      {julgado.textoIntegral}
                    </p>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn("flex items-center gap-2", status.color)}>
                  <StatusIcon
                    className={cn("w-4 h-4", julgado.status === "processando" && "animate-spin")}
                  />
                  <span className="text-sm font-medium">{status.label}</span>
                </div>
              </CardContent>
            </Card>

            {/* Metadados */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Informacoes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-zinc-500">Tribunal</span>
                  <p className="text-sm font-medium">{config.label}</p>
                </div>
                <Separator />
                <div>
                  <span className="text-xs text-zinc-500">Tipo de Decisao</span>
                  <p className="text-sm font-medium">{julgado.tipoDecisao}</p>
                </div>
                {julgado.dataJulgamento && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-xs text-zinc-500">Data do Julgamento</span>
                      <p className="text-sm font-medium">
                        {format(new Date(julgado.dataJulgamento), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </>
                )}
                {julgado.votacao && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-xs text-zinc-500">Votacao</span>
                      <p className="text-sm font-medium">{julgado.votacao}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Categorização */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Categorizacao</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs text-zinc-500">Tema</span>
                  <Select
                    value={julgado.temaId?.toString() || ""}
                    onValueChange={(value) =>
                      updateMutation.mutate({
                        id: julgado.id,
                        temaId: value ? parseInt(value) : null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar tema" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {temas?.map((tema) => (
                        <SelectItem key={tema.id} value={tema.id.toString()}>
                          {tema.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {julgado.palavrasChave && (julgado.palavrasChave as string[]).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-xs text-zinc-500">Palavras-chave</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(julgado.palavrasChave as string[]).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Acoes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Acoes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {julgado.citacaoFormatada && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      navigator.clipboard.writeText(julgado.citacaoFormatada!);
                      toast.success("Citacao copiada!");
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Citacao
                  </Button>
                )}
                {julgado.ementa && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      navigator.clipboard.writeText(julgado.ementa!);
                      toast.success("Ementa copiada!");
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Copiar Ementa
                  </Button>
                )}
                <Separator className="my-2" />
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (confirm("Tem certeza que deseja excluir este julgado?")) {
                      deleteMutation.mutate({ id: julgado.id });
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Julgado
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
