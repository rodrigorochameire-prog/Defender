"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Bell,
  Calendar,
  CalendarClock,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  FileText,
  Filter,
  History,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  User,
  Users,
  X,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function ProcessosVVDPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMPUAtiva, setFilterMPUAtiva] = useState<boolean | undefined>(undefined);
  const [selectedProcesso, setSelectedProcesso] = useState<number | null>(null);

  // Queries
  const { data: processosData, isLoading, refetch } = trpc.vvd.listProcessos.useQuery({
    search: searchTerm || undefined,
    mpuAtiva: filterMPUAtiva,
    limit: 100,
  });

  const { data: processoDetalhes, isLoading: isLoadingDetalhes } = trpc.vvd.getProcessoById.useQuery(
    { id: selectedProcesso! },
    { enabled: !!selectedProcesso }
  );

  const processos = processosData?.processos || [];

  // Helpers
  const getDiasRestantes = (dataVencimento: string | null) => {
    if (!dataVencimento) return null;
    const dias = differenceInDays(parseISO(dataVencimento), new Date());
    return dias;
  };

  const getStatusBadge = (diasRestantes: number | null) => {
    if (diasRestantes === null) {
      return <Badge variant="outline">Sem prazo</Badge>;
    }
    if (diasRestantes < 0) {
      return <Badge variant="destructive">Vencida ({Math.abs(diasRestantes)} dias)</Badge>;
    }
    if (diasRestantes <= 7) {
      return <Badge className="bg-red-500 text-white">Vence em {diasRestantes} dias</Badge>;
    }
    if (diasRestantes <= 30) {
      return <Badge className="bg-amber-500 text-white">Vence em {diasRestantes} dias</Badge>;
    }
    return <Badge className="bg-green-500 text-white">{diasRestantes} dias</Badge>;
  };

  const getTipoEventoBadge = (tipo: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      deferimento: { label: "Deferimento", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
      indeferimento: { label: "Indeferimento", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
      modulacao: { label: "Modulacao", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
      revogacao: { label: "Revogacao", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
      renovacao: { label: "Renovacao", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
      descumprimento: { label: "Descumprimento", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
    };
    const badge = badges[tipo] || { label: tipo, className: "" };
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/vvd">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-purple-600" />
              Processos VVD
            </h1>
            <p className="text-muted-foreground">
              Processos de Medidas Protetivas de Urgencia
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Atualizar
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-1" />
            Novo Processo
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, numero de processo ou crime..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={filterMPUAtiva === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterMPUAtiva(undefined)}
              >
                Todos
              </Button>
              <Button
                variant={filterMPUAtiva === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterMPUAtiva(true)}
                className={filterMPUAtiva === true ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <ShieldCheck className="h-4 w-4 mr-1" />
                MPU Ativa
              </Button>
              <Button
                variant={filterMPUAtiva === false ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterMPUAtiva(false)}
                className={filterMPUAtiva === false ? "bg-zinc-600 hover:bg-zinc-700" : ""}
              >
                <ShieldOff className="h-4 w-4 mr-1" />
                MPU Inativa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processos Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>
              Processos de Violencia Domestica
              <Badge variant="outline" className="ml-2">{processosData?.total || 0}</Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Autor (Assistido)</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Crime</TableHead>
                  <TableHead>MPU</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Situacao</TableHead>
                  <TableHead className="w-[100px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : processos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Nenhum processo encontrado</p>
                      <p className="text-xs mt-1">Importe intimacoes do PJe ou crie um novo processo</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  processos.map((processo) => {
                    const diasRestantes = getDiasRestantes(processo.dataVencimentoMPU);
                    return (
                      <TableRow
                        key={processo.id}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          processo.mpuAtiva && diasRestantes !== null && diasRestantes <= 7 && "bg-red-50 dark:bg-red-950/10"
                        )}
                        onClick={() => setSelectedProcesso(processo.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{processo.autor?.nome || "Sem autor"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {processo.numeroAutos}
                          </code>
                        </TableCell>
                        <TableCell>
                          {processo.crime ? (
                            <Badge variant="outline">{processo.crime}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {processo.mpuAtiva ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Ativa
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inativa
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {processo.dataVencimentoMPU ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {format(parseISO(processo.dataVencimentoMPU), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                              {getStatusBadge(diasRestantes)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{processo.situacao || "ativo"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProcesso(processo.id);
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Processo */}
      <Dialog open={!!selectedProcesso} onOpenChange={(open) => !open && setSelectedProcesso(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Detalhes do Processo
            </DialogTitle>
            <DialogDescription>
              {processoDetalhes?.numeroAutos || "Carregando..."}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetalhes ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : processoDetalhes ? (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <Tabs defaultValue="geral" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                  <TabsTrigger value="partes">Partes</TabsTrigger>
                  <TabsTrigger value="mpu">MPU</TabsTrigger>
                  <TabsTrigger value="intimacoes">
                    Intimacoes
                    {processoDetalhes.intimacoes?.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {processoDetalhes.intimacoes.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="historico">Historico</TabsTrigger>
                </TabsList>

                {/* Tab Geral */}
                <TabsContent value="geral" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Numero dos Autos
                      </label>
                      <p className="font-mono bg-muted px-3 py-2 rounded">{processoDetalhes.numeroAutos}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Tipo de Processo
                      </label>
                      <p className="font-medium">{processoDetalhes.tipoProcesso}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Comarca
                      </label>
                      <p>{processoDetalhes.comarca || "-"}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Vara
                      </label>
                      <p>{processoDetalhes.vara || "-"}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Crime
                      </label>
                      <p>{processoDetalhes.crime || "-"}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Situacao
                      </label>
                      <Badge variant="secondary">{processoDetalhes.situacao}</Badge>
                    </div>
                  </div>
                  {processoDetalhes.observacoes && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Observacoes
                      </label>
                      <p className="text-sm bg-muted p-3 rounded">{processoDetalhes.observacoes}</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab Partes */}
                <TabsContent value="partes" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Autor */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4 text-purple-600" />
                          Autor (Assistido)
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {processoDetalhes.autor ? (
                          <>
                            <p className="font-medium text-lg">{processoDetalhes.autor.nome}</p>
                            {processoDetalhes.autor.cpf && (
                              <p className="text-muted-foreground">CPF: {processoDetalhes.autor.cpf}</p>
                            )}
                            {processoDetalhes.autor.telefone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {processoDetalhes.autor.telefone}
                              </div>
                            )}
                            {processoDetalhes.autor.endereco && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {processoDetalhes.autor.endereco}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-muted-foreground">Nao cadastrado</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Vitima */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4 text-red-600" />
                          Vitima
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {processoDetalhes.vitima ? (
                          <>
                            <p className="font-medium text-lg">{processoDetalhes.vitima.nome}</p>
                            {processoDetalhes.vitima.parentesco && (
                              <Badge variant="outline">{processoDetalhes.vitima.parentesco}</Badge>
                            )}
                            {processoDetalhes.vitima.telefone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {processoDetalhes.vitima.telefone}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-muted-foreground">Nao cadastrada</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab MPU */}
                <TabsContent value="mpu" className="mt-4 space-y-4">
                  <Card className={cn(
                    "border-2",
                    processoDetalhes.mpuAtiva
                      ? "border-green-200 dark:border-green-800"
                      : "border-zinc-200 dark:border-zinc-800"
                  )}>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {processoDetalhes.mpuAtiva ? (
                            <>
                              <ShieldCheck className="h-5 w-5 text-green-600" />
                              MPU Ativa
                            </>
                          ) : (
                            <>
                              <ShieldOff className="h-5 w-5 text-zinc-500" />
                              MPU Inativa
                            </>
                          )}
                        </span>
                        {processoDetalhes.mpuAtiva && processoDetalhes.dataVencimentoMPU && (
                          getStatusBadge(getDiasRestantes(processoDetalhes.dataVencimentoMPU))
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {processoDetalhes.mpuAtiva ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Data da Decisao</label>
                            <p className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {processoDetalhes.dataDecisaoMPU
                                ? format(parseISO(processoDetalhes.dataDecisaoMPU), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Data de Vencimento</label>
                            <p className="flex items-center gap-2">
                              <CalendarClock className="h-4 w-4" />
                              {processoDetalhes.dataVencimentoMPU
                                ? format(parseISO(processoDetalhes.dataVencimentoMPU), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </p>
                          </div>
                          {processoDetalhes.distanciaMinima && (
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Distancia Minima</label>
                              <p className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {processoDetalhes.distanciaMinima} metros
                              </p>
                            </div>
                          )}
                          {processoDetalhes.tiposMPU && (
                            <div className="col-span-2 space-y-1">
                              <label className="text-xs text-muted-foreground">Medidas Aplicadas</label>
                              <p className="text-sm">{processoDetalhes.tiposMPU}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          Nenhuma medida protetiva ativa
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab Intimacoes */}
                <TabsContent value="intimacoes" className="mt-4">
                  {processoDetalhes.intimacoes && processoDetalhes.intimacoes.length > 0 ? (
                    <div className="space-y-3">
                      {processoDetalhes.intimacoes.map((intimacao: any) => (
                        <Card key={intimacao.id} className="hover:bg-muted/50 transition-colors">
                          <CardContent className="py-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Bell className="h-4 w-4 text-purple-600" />
                                  <span className="font-medium">{intimacao.ato}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  {intimacao.dataExpedicao && (
                                    <span>
                                      Expedida: {format(parseISO(intimacao.dataExpedicao), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                  )}
                                  {intimacao.prazo && (
                                    <span>
                                      Prazo: {format(parseISO(intimacao.prazo), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                  )}
                                </div>
                                {intimacao.providencias && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {intimacao.providencias}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={intimacao.tipoIntimacao === "CIENCIA" ? "secondary" : "default"}
                                >
                                  {intimacao.tipoIntimacao === "CIENCIA" ? "Ciencia" : "Peticionar"}
                                </Badge>
                                <Badge variant="outline">{intimacao.status}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma intimacao registrada</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab Historico */}
                <TabsContent value="historico" className="mt-4">
                  {processoDetalhes.historico && processoDetalhes.historico.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-4">
                        {processoDetalhes.historico.map((evento: any) => (
                          <div key={evento.id} className="relative pl-10">
                            <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-purple-600 border-2 border-background" />
                            <Card>
                              <CardContent className="py-3">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <History className="h-4 w-4 text-muted-foreground" />
                                      {getTipoEventoBadge(evento.tipoEvento)}
                                      <span className="text-sm text-muted-foreground">
                                        {format(parseISO(evento.dataEvento), "dd/MM/yyyy", { locale: ptBR })}
                                      </span>
                                    </div>
                                    {evento.descricao && (
                                      <p className="text-sm">{evento.descricao}</p>
                                    )}
                                    {evento.medidasVigentes && (
                                      <p className="text-xs text-muted-foreground">
                                        Medidas: {evento.medidasVigentes}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Nenhum historico registrado</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Processo nao encontrado</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
