"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Scale,
  Clock,
  FileText,
  MessageCircle,
  User,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Gavel,
  MoreHorizontal,
  Brain,
  Globe,
  Search,
  ExternalLink,
  Facebook,
  Instagram,
  Newspaper,
  Database,
  Target,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { format, differenceInYears, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAssignment } from "@/contexts/assignment-context";

// Dados mockados para demonstração
const mockAssistido = {
  id: 5,
  nome: "Diego Bonfim Almeida",
  cpf: "123.456.789-00",
  rg: "12.345.678-90",
  dataNascimento: "1990-05-15",
  nomeMae: "Maria Almeida Santos",
  naturalidade: "Salvador/BA",
  nacionalidade: "Brasileira",
  statusPrisional: "CADEIA_PUBLICA",
  unidadePrisional: "Cadeia Pública de Candeias",
  dataPrisao: "2024-11-20",
  telefone: "(71) 99999-1234",
  telefoneContato: "(71) 98888-5678",
  nomeContato: "Maria (Mãe)",
  parentescoContato: "Mãe",
  endereco: "Rua das Flores, 123 - Centro, Camaçari/BA",
  defensor: "Dr. Rodrigo",
  area: "JURI",
  photoUrl: null,
  observacoes: "Réu em processo de júri. Acompanhamento prioritário.",
  createdAt: "2024-06-15",
};

const mockProcessos = [
  {
    id: 1,
    numeroAutos: "8012906-74.2025.8.05.0039",
    vara: "1ª Vara do Júri",
    comarca: "Camaçari",
    area: "JURI",
    fase: "Instrução",
    situacao: "ativo",
  },
  {
    id: 2,
    numeroAutos: "0001234-56.2025.8.05.0039",
    vara: "VEC",
    comarca: "Camaçari",
    area: "EXECUCAO_PENAL",
    fase: "Execução",
    situacao: "ativo",
  },
];

const mockDemandas = [
  {
    id: 1,
    ato: "Resposta à Acusação",
    prazo: "2026-01-20",
    status: "2_ATENDER",
    processo: "8012906-74.2025.8.05.0039",
  },
  {
    id: 2,
    ato: "Alegações Finais",
    prazo: "2026-02-15",
    status: "5_FILA",
    processo: "8012906-74.2025.8.05.0039",
  },
];

const mockAtendimentos = [
  {
    id: 1,
    data: "2026-01-10",
    tipo: "presencial",
    assunto: "Orientação sobre audiência",
    resumo: "Assistido orientado sobre procedimentos da audiência de instrução.",
  },
  {
    id: 2,
    data: "2025-12-15",
    tipo: "visita_carcer",
    assunto: "Entrevista prévia ao júri",
    resumo: "Entrevista realizada para preparação do plenário.",
  },
];

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", color: "text-rose-600", bgColor: "bg-rose-50" },
  PENITENCIARIA: { label: "Penitenciária", color: "text-rose-600", bgColor: "bg-rose-50" },
  COP: { label: "COP", color: "text-rose-600", bgColor: "bg-rose-50" },
  HOSPITAL_CUSTODIA: { label: "Hosp. Custódia", color: "text-rose-600", bgColor: "bg-rose-50" },
  MONITORADO: { label: "Monitorado", color: "text-amber-600", bgColor: "bg-amber-50" },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-500", bgColor: "bg-orange-50" },
  SOLTO: { label: "Solto", color: "text-emerald-600", bgColor: "bg-emerald-50" },
};

export default function AssistidoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { config } = useAssignment();
  const id = params.id;

  // Em produção, buscar dados via TRPC
  const assistido = mockAssistido;

  const idade = assistido.dataNascimento
    ? differenceInYears(new Date(), parseISO(assistido.dataNascimento))
    : null;

  const status = statusConfig[assistido.statusPrisional] || statusConfig.SOLTO;
  const isPreso = assistido.statusPrisional !== "SOLTO" && assistido.statusPrisional !== "MONITORADO";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Perfil do Assistido</h1>
            <p className="text-sm text-muted-foreground">
              Informações completas e histórico
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            className="gap-2"
            style={{ backgroundColor: config.accentColor }}
          >
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                Gerar Relatório
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Calendar className="mr-2 h-4 w-4" />
                Agendar Atendimento
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Arquivar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card Principal */}
      <Card className={isPreso ? "border-l-4 border-l-rose-400" : ""}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar e Info Básica */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
                <AvatarImage src={assistido.photoUrl || undefined} />
                <AvatarFallback
                  className="text-2xl font-bold"
                  style={{
                    background: isPreso ? "hsl(350, 55%, 95%)" : config.accentColorLight,
                    color: isPreso ? "hsl(350, 55%, 50%)" : config.accentColor,
                  }}
                >
                  {getInitials(assistido.nome)}
                </AvatarFallback>
              </Avatar>
              
              {/* Status Badge */}
              <Badge className={`${status.bgColor} ${status.color} border-0 px-3 py-1`}>
                {status.label}
              </Badge>
            </div>

            {/* Informações */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-bold">{assistido.nome}</h2>
                <p className="text-muted-foreground">
                  {idade} anos • {assistido.naturalidade}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">CPF:</span>
                  <span className="font-medium">{assistido.cpf}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">RG:</span>
                  <span className="font-medium">{assistido.rg}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Nascimento:</span>
                  <span className="font-medium">
                    {format(parseISO(assistido.dataNascimento), "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Telefone:</span>
                  <span className="font-medium">{assistido.telefone || "Não informado"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Contato:</span>
                  <span className="font-medium">
                    {assistido.nomeContato} - {assistido.telefoneContato}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Mãe:</span>
                  <span className="font-medium">{assistido.nomeMae}</span>
                </div>
              </div>

              {isPreso && (
                <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200/60">
                  <div className="flex items-center gap-2 text-rose-700">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{assistido.unidadePrisional}</span>
                  </div>
                  <p className="text-xs text-rose-600 mt-1">
                    Preso desde {format(parseISO(assistido.dataPrisao), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              )}

              {assistido.endereco && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{assistido.endereco}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs com conteúdo */}
      <Tabs defaultValue="processos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="processos" className="gap-2">
            <Scale className="h-4 w-4" />
            <span className="hidden sm:inline">Processos</span>
          </TabsTrigger>
          <TabsTrigger value="demandas" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Demandas</span>
          </TabsTrigger>
          <TabsTrigger value="inteligencia" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Inteligência</span>
          </TabsTrigger>
          <TabsTrigger value="atendimentos" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Atendimentos</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="processos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Processos ({mockProcessos.length})</CardTitle>
              <Button size="sm" variant="outline" className="gap-2">
                <Scale className="h-4 w-4" />
                Vincular Processo
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockProcessos.map((processo) => (
                  <Link
                    key={processo.id}
                    href={`/admin/processos/${processo.id}`}
                    className="flex items-center justify-between p-4 rounded-xl border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ background: config.accentColorLight }}
                      >
                        <Scale className="h-5 w-5" style={{ color: config.accentColor }} />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium">{processo.numeroAutos}</p>
                        <p className="text-xs text-muted-foreground">
                          {processo.vara} • {processo.comarca}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{processo.fase}</Badge>
                      <Badge
                        className={
                          processo.situacao === "ativo"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }
                      >
                        {processo.situacao}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demandas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Demandas Pendentes ({mockDemandas.length})</CardTitle>
              <Button size="sm" variant="outline" className="gap-2">
                <Clock className="h-4 w-4" />
                Nova Demanda
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockDemandas.map((demanda) => (
                  <Link
                    key={demanda.id}
                    href={`/admin/demandas/${demanda.id}`}
                    className="flex items-center justify-between p-4 rounded-xl border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">{demanda.ato}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {demanda.processo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Prazo: {format(parseISO(demanda.prazo), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inteligencia" className="space-y-4">
          {/* Header da Inteligência */}
          <Card className="border-violet-200 dark:border-violet-800/30 bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-950/20 dark:to-background">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Inteligência Defensiva</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ferramentas OSINT e investigação para {assistido.nome.split(' ')[0]}
                    </p>
                  </div>
                </div>
                <Link href={`/admin/inteligencia?assistido=${id}`}>
                  <Button variant="outline" className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50">
                    <Target className="h-4 w-4" />
                    Central Completa
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </Card>

          {/* Busca Rápida */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-5 w-5 text-violet-600" />
                Busca Rápida por Nome
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <a
                  href={`https://www.google.com/search?q="${encodeURIComponent(assistido.nome)}"`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border hover:bg-accent/50 transition-colors group"
                >
                  <Globe className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">Google</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href={`https://www.facebook.com/search/top?q=${encodeURIComponent(assistido.nome)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border hover:bg-accent/50 transition-colors group"
                >
                  <Facebook className="h-5 w-5 text-blue-700" />
                  <span className="text-sm font-medium">Facebook</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href={`https://www.instagram.com/${encodeURIComponent(assistido.nome.toLowerCase().replace(/ /g, ''))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border hover:bg-accent/50 transition-colors group"
                >
                  <Instagram className="h-5 w-5 text-pink-600" />
                  <span className="text-sm font-medium">Instagram</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href={`https://news.google.com/search?q=${encodeURIComponent(assistido.nome)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border hover:bg-accent/50 transition-colors group"
                >
                  <Newspaper className="h-5 w-5 text-slate-600" />
                  <span className="text-sm font-medium">Notícias</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Consultas Processuais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-5 w-5 text-violet-600" />
                Consultas Processuais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <a
                  href={`https://www.escavador.com/busca?q=${encodeURIComponent(assistido.nome)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border hover:bg-accent/50 transition-colors group"
                >
                  <Database className="h-5 w-5 text-violet-600" />
                  <span className="text-sm font-medium">Escavador</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href={`https://www.jusbrasil.com.br/busca?q=${encodeURIComponent(assistido.nome)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border hover:bg-accent/50 transition-colors group"
                >
                  <Scale className="h-5 w-5 text-slate-700" />
                  <span className="text-sm font-medium">JusBrasil</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
                <a
                  href="https://pje.tjba.jus.br/pje/ConsultaPublica/listView.seam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border hover:bg-accent/50 transition-colors group"
                >
                  <Gavel className="h-5 w-5 text-slate-700" />
                  <span className="text-sm font-medium">TJBA PJe</span>
                  <ExternalLink className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Dados para Investigação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-5 w-5 text-violet-600" />
                Dados para Investigação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/30 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identificação</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{assistido.nome}</span></p>
                    <p><span className="text-muted-foreground">CPF:</span> <span className="font-mono">{assistido.cpf}</span></p>
                    <p><span className="text-muted-foreground">RG:</span> <span className="font-mono">{assistido.rg}</span></p>
                    <p><span className="text-muted-foreground">Nascimento:</span> {assistido.dataNascimento && format(parseISO(assistido.dataNascimento), "dd/MM/yyyy")}</p>
                    <p><span className="text-muted-foreground">Mãe:</span> {assistido.nomeMae}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contato e Localização</p>
                  <div className="space-y-1 text-sm">
                    {assistido.telefone && (
                      <p><span className="text-muted-foreground">Telefone:</span> <span className="font-mono">{assistido.telefone}</span></p>
                    )}
                    {assistido.telefoneContato && (
                      <p><span className="text-muted-foreground">Contato:</span> <span className="font-mono">{assistido.telefoneContato}</span> ({assistido.nomeContato})</p>
                    )}
                    {assistido.endereco && (
                      <p><span className="text-muted-foreground">Endereço:</span> {assistido.endereco}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Link para Central Completa */}
          <div className="flex justify-center pt-4">
            <Link href={`/admin/inteligencia?assistido=${id}`}>
              <Button size="lg" className="gap-2 bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 shadow-lg">
                <Brain className="h-5 w-5" />
                Acessar Central de Inteligência Completa
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="atendimentos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Histórico de Atendimentos</CardTitle>
              <Button size="sm" variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                Registrar Atendimento
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockAtendimentos.map((atendimento) => (
                  <div
                    key={atendimento.id}
                    className="p-4 rounded-xl border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {atendimento.tipo === "presencial" ? "Presencial" : "Visita Carcerária"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {format(parseISO(atendimento.data), "dd/MM/yyyy")}
                        </span>
                      </div>
                    </div>
                    <p className="font-medium text-sm">{atendimento.assunto}</p>
                    <p className="text-sm text-muted-foreground mt-1">{atendimento.resumo}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Documentos</CardTitle>
              <Button size="sm" variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Upload
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Nenhum documento cadastrado</p>
                <Button variant="link" className="mt-2">
                  Adicionar primeiro documento
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Observações */}
      {assistido.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{assistido.observacoes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
