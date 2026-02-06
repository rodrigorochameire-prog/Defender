"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Edit,
  FileText,
  Heart,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  User,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { toast } from "sonner";

type TipoParte = "autor" | "vitima" | "todos";

export default function PartesVVDPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoParte>("todos");
  const [selectedParte, setSelectedParte] = useState<any | null>(null);
  const [isNovaParteOpen, setIsNovaParteOpen] = useState(false);
  const [novaParte, setNovaParte] = useState({
    nome: "",
    cpf: "",
    rg: "",
    dataNascimento: "",
    tipoParte: "autor" as "autor" | "vitima",
    telefone: "",
    telefoneSecundario: "",
    email: "",
    endereco: "",
    bairro: "",
    cidade: "",
    parentesco: "",
    observacoes: "",
  });

  // Queries
  const { data: partesData, isLoading, refetch } = trpc.vvd.listPartes.useQuery({
    search: searchTerm || undefined,
    tipoParte: tipoFiltro,
    limit: 100,
  });

  const { data: processosData } = trpc.vvd.listProcessos.useQuery({
    limit: 200, // Busca todos para associar
  });

  const createParteMutation = trpc.vvd.createParte.useMutation({
    onSuccess: () => {
      toast.success("Parte cadastrada com sucesso!");
      refetch();
      setIsNovaParteOpen(false);
      setNovaParte({
        nome: "",
        cpf: "",
        rg: "",
        dataNascimento: "",
        tipoParte: "autor",
        telefone: "",
        telefoneSecundario: "",
        email: "",
        endereco: "",
        bairro: "",
        cidade: "",
        parentesco: "",
        observacoes: "",
      });
    },
    onError: (error) => {
      toast.error(`Erro ao cadastrar: ${error.message}`);
    },
  });

  const partes = partesData?.partes || [];
  const processos = processosData?.processos || [];

  // Encontrar processos associados a uma parte
  const getProcessosDaParte = (parteId: number, tipoParte: string) => {
    if (tipoParte === "autor") {
      return processos.filter((p) => p.autor?.id === parteId);
    }
    return [];
  };

  // Contadores
  const contadores = {
    total: partes.length,
    autores: partes.filter((p) => p.tipoParte === "autor").length,
    vitimas: partes.filter((p) => p.tipoParte === "vitima").length,
  };

  const handleSubmitNovaParte = () => {
    if (!novaParte.nome.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }
    createParteMutation.mutate({
      ...novaParte,
      dataNascimento: novaParte.dataNascimento || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header Secundário - Padrão Defender */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/vvd">
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </Link>
            <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
              <Users className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">Partes VVD</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Autores e vítimas de processos de violência doméstica</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8">
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            <Button
              size="sm"
              className="h-8 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white"
              onClick={() => setIsNovaParteOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova Parte
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4 md:p-6 space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            tipoFiltro === "todos" && "ring-2 ring-purple-500"
          )}
          onClick={() => setTipoFiltro("todos")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contadores.total}</p>
                <p className="text-xs text-muted-foreground">Total de Partes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            tipoFiltro === "autor" && "ring-2 ring-blue-500"
          )}
          onClick={() => setTipoFiltro("autor")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{contadores.autores}</p>
                <p className="text-xs text-muted-foreground">Autores (Assistidos)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            tipoFiltro === "vitima" && "ring-2 ring-red-500"
          )}
          onClick={() => setTipoFiltro("vitima")}
        >
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Heart className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{contadores.vitimas}</p>
                <p className="text-xs text-muted-foreground">Vitimas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as TipoParte)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de parte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="autor">Autores</SelectItem>
                <SelectItem value="vitima">Vitimas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Partes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>
              {tipoFiltro === "todos" ? "Todas as Partes" : tipoFiltro === "autor" ? "Autores" : "Vitimas"}
              <Badge variant="outline" className="ml-2">{partes.length}</Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Processos</TableHead>
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
                ) : partes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Nenhuma parte encontrada</p>
                      <p className="text-xs mt-1">
                        As partes sao criadas automaticamente na importacao de intimacoes
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  partes.map((parte) => {
                    const processosAssociados = getProcessosDaParte(parte.id, parte.tipoParte);
                    return (
                      <TableRow
                        key={parte.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedParte(parte)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{parte.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={parte.tipoParte === "autor" ? "default" : "secondary"}
                            className={cn(
                              parte.tipoParte === "autor"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            )}
                          >
                            {parte.tipoParte === "autor" ? "Autor" : "Vitima"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {parte.cpf ? (
                            <code className="text-xs bg-muted px-2 py-1 rounded">{parte.cpf}</code>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {parte.telefone || <span className="text-muted-foreground text-xs">-</span>}
                        </TableCell>
                        <TableCell>
                          {parte.cidade || <span className="text-muted-foreground text-xs">-</span>}
                        </TableCell>
                        <TableCell>
                          {parte.tipoParte === "autor" && processosAssociados.length > 0 ? (
                            <div className="flex items-center gap-1">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <Badge variant="outline">{processosAssociados.length}</Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedParte(parte);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
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

      {/* Modal de Detalhes da Parte */}
      <Dialog open={!!selectedParte} onOpenChange={(open) => !open && setSelectedParte(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-purple-600" />
              Detalhes da Parte
            </DialogTitle>
            <DialogDescription>
              {selectedParte?.tipoParte === "autor" ? "Autor (Assistido)" : "Vitima"}
            </DialogDescription>
          </DialogHeader>

          {selectedParte && (
            <div className="space-y-6">
              {/* Informacoes Basicas */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informacoes Pessoais
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Nome</label>
                    <p className="font-medium">{selectedParte.nome}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Tipo</label>
                    <Badge
                      className={cn(
                        selectedParte.tipoParte === "autor"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {selectedParte.tipoParte === "autor" ? "Autor" : "Vitima"}
                    </Badge>
                  </div>
                  {selectedParte.cpf && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">CPF</label>
                      <p className="font-mono">{selectedParte.cpf}</p>
                    </div>
                  )}
                  {selectedParte.rg && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">RG</label>
                      <p className="font-mono">{selectedParte.rg}</p>
                    </div>
                  )}
                  {selectedParte.dataNascimento && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Data de Nascimento</label>
                      <p className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(selectedParte.dataNascimento), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                  {selectedParte.parentesco && (
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Parentesco</label>
                      <Badge variant="outline">{selectedParte.parentesco}</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Contato */}
              {(selectedParte.telefone || selectedParte.email || selectedParte.endereco) && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contato
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedParte.telefone && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Telefone</label>
                        <p className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedParte.telefone}
                        </p>
                      </div>
                    )}
                    {selectedParte.telefoneSecundario && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Telefone Secundario</label>
                        <p className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {selectedParte.telefoneSecundario}
                        </p>
                      </div>
                    )}
                    {selectedParte.email && (
                      <div className="space-y-1 col-span-2">
                        <label className="text-xs text-muted-foreground">Email</label>
                        <p className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {selectedParte.email}
                        </p>
                      </div>
                    )}
                    {selectedParte.endereco && (
                      <div className="space-y-1 col-span-2">
                        <label className="text-xs text-muted-foreground">Endereco</label>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedParte.endereco}
                          {selectedParte.bairro && `, ${selectedParte.bairro}`}
                          {selectedParte.cidade && ` - ${selectedParte.cidade}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Processos Associados */}
              {selectedParte.tipoParte === "autor" && (
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Processos Associados
                  </h3>
                  {(() => {
                    const processosAssociados = getProcessosDaParte(selectedParte.id, selectedParte.tipoParte);
                    if (processosAssociados.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhum processo associado
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {processosAssociados.map((processo) => (
                          <Card key={processo.id} className="hover:bg-muted/50 transition-colors">
                            <CardContent className="py-3">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {processo.numeroAutos}
                                  </code>
                                  {processo.crime && (
                                    <p className="text-sm text-muted-foreground">{processo.crime}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {processo.mpuAtiva ? (
                                    <Badge className="bg-green-100 text-green-700">
                                      <ShieldCheck className="h-3 w-3 mr-1" />
                                      MPU Ativa
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline">MPU Inativa</Badge>
                                  )}
                                  <Link href={`/admin/vvd/processos`}>
                                    <Button variant="ghost" size="sm">
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Observacoes */}
              {selectedParte.observacoes && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Observacoes</h3>
                  <p className="text-sm bg-muted p-3 rounded">{selectedParte.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Nova Parte */}
      <Dialog open={isNovaParteOpen} onOpenChange={setIsNovaParteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-600" />
              Nova Parte
            </DialogTitle>
            <DialogDescription>
              Cadastrar nova parte (autor ou vitima) para processos VVD
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo de Parte *</Label>
                <Select
                  value={novaParte.tipoParte}
                  onValueChange={(v) => setNovaParte({ ...novaParte, tipoParte: v as "autor" | "vitima" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="autor">Autor (Assistido)</SelectItem>
                    <SelectItem value="vitima">Vitima</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dados Pessoais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    placeholder="Nome completo"
                    value={novaParte.nome}
                    onChange={(e) => setNovaParte({ ...novaParte, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={novaParte.cpf}
                    onChange={(e) => setNovaParte({ ...novaParte, cpf: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>RG</Label>
                  <Input
                    placeholder="RG"
                    value={novaParte.rg}
                    onChange={(e) => setNovaParte({ ...novaParte, rg: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={novaParte.dataNascimento}
                    onChange={(e) => setNovaParte({ ...novaParte, dataNascimento: e.target.value })}
                  />
                </div>
                {novaParte.tipoParte === "vitima" && (
                  <div className="space-y-2">
                    <Label>Parentesco com o Autor</Label>
                    <Input
                      placeholder="Ex: ex-companheira, mae, filha"
                      value={novaParte.parentesco}
                      onChange={(e) => setNovaParte({ ...novaParte, parentesco: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Contato */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={novaParte.telefone}
                    onChange={(e) => setNovaParte({ ...novaParte, telefone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone Secundario</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={novaParte.telefoneSecundario}
                    onChange={(e) => setNovaParte({ ...novaParte, telefoneSecundario: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={novaParte.email}
                    onChange={(e) => setNovaParte({ ...novaParte, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Endereco */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Endereco</Label>
                  <Input
                    placeholder="Rua, numero, complemento"
                    value={novaParte.endereco}
                    onChange={(e) => setNovaParte({ ...novaParte, endereco: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input
                    placeholder="Bairro"
                    value={novaParte.bairro}
                    onChange={(e) => setNovaParte({ ...novaParte, bairro: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    placeholder="Cidade"
                    value={novaParte.cidade}
                    onChange={(e) => setNovaParte({ ...novaParte, cidade: e.target.value })}
                  />
                </div>
              </div>

              {/* Observacoes */}
              <div className="space-y-2">
                <Label>Observacoes</Label>
                <Textarea
                  placeholder="Observacoes adicionais..."
                  value={novaParte.observacoes}
                  onChange={(e) => setNovaParte({ ...novaParte, observacoes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNovaParteOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitNovaParte}
              disabled={createParteMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createParteMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
