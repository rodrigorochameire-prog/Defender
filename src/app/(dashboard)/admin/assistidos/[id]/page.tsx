"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Edit,
  Phone,
  User,
  Lock,
  Activity,
  History,
  Target,
  FolderOpen,
  Plus,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  Calendar,
  FileText,
  ExternalLink,
  Scale,
  Clock,
  AlertTriangle,
  Briefcase,
  Gavel,
  HardDrive,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, cn } from "@/lib/utils";
import { StatusPrisionalDot } from "@/components/shared/prisoner-indicator";
import { format, differenceInYears, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const statusConfig: Record<string, { label: string; variant: "reuPreso" | "success" | "warning" | "default" }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", variant: "reuPreso" },
  PENITENCIARIA: { label: "Penitenciária", variant: "reuPreso" },
  COP: { label: "COP", variant: "reuPreso" },
  HOSPITAL_CUSTODIA: { label: "Hospital Custódia", variant: "reuPreso" },
  SOLTO: { label: "Solto", variant: "success" },
  MONITORADO: { label: "Monitorado", variant: "warning" },
  DOMICILIAR: { label: "Domiciliar", variant: "warning" },
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function AssistidoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("resumo");
  
  const assistidoId = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);

  // Buscar dados do assistido
  const { data: assistido, isLoading: loadingAssistido } = trpc.assistidos.getById.useQuery(
    { id: assistidoId },
    { enabled: !!assistidoId }
  );

  // Buscar processos do assistido
  const { data: processos, isLoading: loadingProcessos } = trpc.assistidos.getProcessos.useQuery(
    { assistidoId },
    { enabled: !!assistidoId }
  );

  // Buscar audiências do assistido
  const { data: audiencias, isLoading: loadingAudiencias } = trpc.assistidos.getAudiencias.useQuery(
    { assistidoId },
    { enabled: !!assistidoId }
  );

  // Buscar demandas do assistido
  const { data: demandas, isLoading: loadingDemandas } = trpc.assistidos.getDemandas.useQuery(
    { assistidoId },
    { enabled: !!assistidoId }
  );

  // Loading state
  if (loadingAssistido) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Not found
  if (!assistido) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
        <User className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Assistido não encontrado</h2>
        <p className="text-muted-foreground mb-4">O assistido solicitado não existe ou foi removido.</p>
        <Button onClick={() => router.push("/admin/assistidos")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Assistidos
        </Button>
      </div>
    );
  }

  const idade = assistido.dataNascimento
    ? differenceInYears(new Date(), parseISO(assistido.dataNascimento))
    : null;
  const status = statusConfig[assistido.statusPrisional || "SOLTO"] || statusConfig.SOLTO;
  const isPreso = !["SOLTO", "MONITORADO", "DOMICILIAR"].includes(assistido.statusPrisional || "SOLTO");

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className={cn(
                  "h-20 w-20 ring-4",
                  isPreso ? "ring-rose-500/20" : "ring-emerald-500/20"
                )}>
                  <AvatarImage src={assistido.photoUrl || undefined} />
                  <AvatarFallback className="text-xl font-bold">
                    {getInitials(assistido.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute -bottom-1 -right-1 p-2 rounded-full border-2 border-background",
                  isPreso ? "bg-rose-100 dark:bg-rose-900/50" : "bg-emerald-100 dark:bg-emerald-900/50"
                )}>
                  <StatusPrisionalDot preso={isPreso} size="md" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{assistido.nome}</h1>
                  <Badge variant={status.variant as any}>{status.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {idade ? `${idade} anos` : ""} 
                  {assistido.naturalidade && ` • ${assistido.naturalidade}`}
                </p>
                {assistido.cpf && (
                  <p className="text-xs text-muted-foreground mt-1">CPF: {assistido.cpf}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {assistido.telefone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`https://wa.me/55${assistido.telefone.replace(/\D/g, "")}`} target="_blank">
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </a>
              </Button>
            )}
            <Button size="sm" asChild>
              <Link href={`/admin/assistidos/${assistidoId}/editar`}>
                <Edit className="w-4 h-4 mr-2" /> Editar
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem><FileText className="mr-2 h-4 w-4" /> Gerar Relatório</DropdownMenuItem>
                <DropdownMenuItem><Calendar className="mr-2 h-4 w-4" /> Agendar Atendimento</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Arquivar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processos?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Processos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Briefcase className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{demandas?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Demandas</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{audiencias?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Audiências</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Drive</p>
                <p className="text-xs text-muted-foreground">Em breve</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="resumo" className="flex items-center gap-2">
              <Activity className="w-4 h-4" /> Resumo
            </TabsTrigger>
            <TabsTrigger value="processos" className="flex items-center gap-2">
              <Scale className="w-4 h-4" /> Processos ({processos?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="demandas" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Demandas ({demandas?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="audiencias" className="flex items-center gap-2">
              <Gavel className="w-4 h-4" /> Audiências ({audiencias?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="drive" className="flex items-center gap-2">
              <HardDrive className="w-4 h-4" /> Drive
            </TabsTrigger>
          </TabsList>

          {/* Tab: Resumo */}
          <TabsContent value="resumo" className="mt-6 space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Dados Pessoais */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Dados Pessoais
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block">CPF</span>
                    <span>{assistido.cpf || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block">RG</span>
                    <span>{assistido.rg || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block">Data Nascimento</span>
                    <span>
                      {assistido.dataNascimento 
                        ? format(parseISO(assistido.dataNascimento), "dd/MM/yyyy", { locale: ptBR })
                        : "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block">Nome da Mãe</span>
                    <span>{assistido.nomeMae || "Não informado"}</span>
                  </div>
                </div>
              </Card>
              
              {/* Situação Prisional */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> Situação Prisional
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block">Status</span>
                    <Badge variant={status.variant as any}>{status.label}</Badge>
                  </div>
                  {isPreso && (
                    <>
                      <div>
                        <span className="text-xs text-muted-foreground uppercase block">Unidade</span>
                        <span>{assistido.unidadePrisional || "Não informado"}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground uppercase block">Data Prisão</span>
                        <span>
                          {assistido.dataPrisao 
                            ? format(parseISO(assistido.dataPrisao), "dd/MM/yyyy", { locale: ptBR })
                            : "Não informado"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Contato */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Contato
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block">Telefone</span>
                    <span>{assistido.telefone || "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block">Contato Familiar</span>
                    <span>
                      {assistido.nomeContato 
                        ? `${assistido.nomeContato} - ${assistido.telefoneContato || ""}`
                        : "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase block">Endereço</span>
                    <span>{assistido.endereco || "Não informado"}</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Observações */}
            {assistido.observacoes && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-3">Observações</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {assistido.observacoes}
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Processos */}
          <TabsContent value="processos" className="mt-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Scale className="w-4 h-4" /> Processos Vinculados
                </h3>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Vincular Processo
                </Button>
              </div>
              
              {loadingProcessos ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : processos && processos.length > 0 ? (
                <div className="space-y-3">
                  {processos.map((proc) => {
                    const colors = getAtribuicaoColors(proc.area);
                    return (
                      <Link 
                        key={proc.id} 
                        href={`/admin/processos/${proc.id}`}
                        className={cn(
                          "block p-4 rounded-lg border-l-4 transition-colors",
                          colors.border,
                          "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono text-sm font-medium">{proc.numeroAutos}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {proc.vara} • {proc.classeProcessual}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-xs", colors.text)}>
                              {colors.label}
                            </Badge>
                            {proc.isJuri && (
                              <Badge variant="secondary" className="text-xs">Júri</Badge>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Scale className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum processo vinculado</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tab: Demandas */}
          <TabsContent value="demandas" className="mt-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Demandas
                </h3>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" /> Nova Demanda
                </Button>
              </div>
              
              {loadingDemandas ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : demandas && demandas.length > 0 ? (
                <div className="space-y-3">
                  {demandas.map((dem) => {
                    const isUrgente = dem.prioridade === "URGENTE" || dem.prioridade === "REU_PRESO";
                    return (
                      <Link 
                        key={dem.id} 
                        href={`/admin/demandas?id=${dem.id}`}
                        className={cn(
                          "block p-4 rounded-lg border transition-colors hover:bg-muted/50",
                          isUrgente && "border-l-4 border-l-rose-500"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{dem.ato}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {dem.processo?.numeroAutos || "Sem processo"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {dem.prazo && (
                              <Badge 
                                variant={isUrgente ? "destructive" : "outline"} 
                                className="text-xs"
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                {format(new Date(dem.prazo), "dd/MM", { locale: ptBR })}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {dem.status}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma demanda encontrada</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tab: Audiências */}
          <TabsContent value="audiencias" className="mt-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Gavel className="w-4 h-4" /> Audiências
                </h3>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/admin/agenda">
                    <Calendar className="w-4 h-4 mr-2" /> Ver Agenda
                  </Link>
                </Button>
              </div>
              
              {loadingAudiencias ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : audiencias && audiencias.length > 0 ? (
                <div className="space-y-3">
                  {audiencias.map((aud) => {
                    const isFuture = new Date(aud.dataAudiencia) >= new Date();
                    return (
                      <Link 
                        key={aud.id} 
                        href={`/admin/agenda?audiencia=${aud.id}`}
                        className={cn(
                          "block p-4 rounded-lg border transition-colors hover:bg-muted/50",
                          isFuture && "border-l-4 border-l-emerald-500"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{aud.titulo || aud.tipo}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {aud.processo?.numeroAutos || "Sem processo"} • {aud.local}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={isFuture ? "default" : "secondary"} 
                              className="text-xs"
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(aud.dataAudiencia), "dd/MM/yyyy", { locale: ptBR })}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {aud.status}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma audiência encontrada</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tab: Drive */}
          <TabsContent value="drive" className="mt-6">
            <Card className="p-8">
              <div className="text-center">
                <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full w-fit mx-auto mb-4">
                  <HardDrive className="w-12 h-12 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Integração com Google Drive</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Em breve você poderá acessar a pasta do Drive deste assistido diretamente aqui, 
                  visualizando e gerenciando todos os documentos do caso.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" disabled>
                    <FolderOpen className="w-4 h-4 mr-2" /> Configurar Pasta
                  </Button>
                  <Button disabled>
                    <ExternalLink className="w-4 h-4 mr-2" /> Abrir no Drive
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
