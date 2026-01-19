"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Scale, 
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Gavel,
  ExternalLink,
  User,
  MapPin,
  Calendar,
  FolderOpen,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock de dados do processo
const mockProcesso = {
  id: 1,
  numeroAutos: "8012906-74.2025.8.05.0039",
  numeroAntigo: null,
  assistido: {
    id: 1,
    nome: "Diego Bonfim Almeida",
    cpf: "123.456.789-00",
    statusPrisional: "preso",
  },
  comarca: "Candeias",
  vara: "1ª Vara Criminal",
  area: "JURI",
  classeProcessual: "Ação Penal",
  assunto: "Homicídio Qualificado (Art. 121, §2º, CP)",
  valorCausa: null,
  parteContraria: "Ministério Público do Estado da Bahia",
  advogadoContrario: null,
  fase: "conhecimento",
  situacao: "ativo",
  isJuri: true,
  dataSessaoJuri: "2025-03-15",
  resultadoJuri: null,
  observacoes: "Réu preso preventivamente. Aguardando designação de sessão do Tribunal do Júri.",
  linkDrive: "https://drive.google.com/folder/exemplo",
  driveFolderId: "abc123",
  defensorId: 1,
  defensor: {
    id: 1,
    nome: "Dr. João Silva",
    email: "joao@defensoria.ba.gov.br",
  },
  createdAt: "2025-01-10",
  updatedAt: "2025-01-15",
};

// Mock de demandas relacionadas
const mockDemandas = [
  {
    id: 1,
    ato: "Resposta à Acusação",
    status: "1_ATENDER",
    prazo: "2025-01-20",
    prioridade: "FATAL",
    reuPreso: true,
  },
  {
    id: 2,
    ato: "Alegações Finais",
    status: "5_FILA",
    prazo: "2025-02-15",
    prioridade: "NORMAL",
    reuPreso: true,
  },
];

function getAreaInfo(area: string) {
  const configs: Record<string, { label: string; className: string; description: string }> = {
    JURI: { 
      label: "Tribunal do Júri", 
      className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
      description: "Processo de competência do Tribunal do Júri" 
    },
    EXECUCAO_PENAL: { 
      label: "Execução Penal", 
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      description: "Acompanhamento de execução penal" 
    },
    VIOLENCIA_DOMESTICA: { 
      label: "Violência Doméstica", 
      className: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
      description: "Lei Maria da Penha" 
    },
    SUBSTITUICAO: { 
      label: "Substituição", 
      className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      description: "Substituição de defensor" 
    },
    CURADORIA: { 
      label: "Curadoria", 
      className: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
      description: "Curadoria especial" 
    },
    FAMILIA: { 
      label: "Família", 
      className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
      description: "Direito de Família" 
    },
    CIVEL: { 
      label: "Cível", 
      className: "bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300",
      description: "Processo Cível" 
    },
    FAZENDA_PUBLICA: { 
      label: "Fazenda Pública", 
      className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
      description: "Fazenda Pública" 
    },
  };
  return configs[area] || { label: area, className: "", description: "" };
}

function getSituacaoBadge(situacao: string) {
  const configs: Record<string, { variant: "default" | "destructive" | "secondary" | "outline"; label: string }> = {
    ativo: { variant: "default", label: "Ativo" },
    suspenso: { variant: "secondary", label: "Suspenso" },
    arquivado: { variant: "outline", label: "Arquivado" },
    baixado: { variant: "outline", label: "Baixado" },
  };
  const config = configs[situacao] || { variant: "secondary", label: situacao };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function getFaseBadge(fase: string) {
  const configs: Record<string, { className: string; label: string }> = {
    conhecimento: { className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", label: "Conhecimento" },
    recursal: { className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", label: "Recursal" },
    execucao: { className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", label: "Execução" },
    arquivado: { className: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300", label: "Arquivado" },
  };
  const config = configs[fase] || { className: "", label: fase };
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}

function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; className: string; icon: typeof AlertTriangle }> = {
    "1_ATENDER": { 
      label: "Atender", 
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      icon: AlertTriangle
    },
    "5_FILA": { 
      label: "Em Fila", 
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      icon: Clock
    },
    "9_MONITORAR": { 
      label: "Monitorar", 
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      icon: Clock
    },
    "PROTOCOLADO": { 
      label: "Protocolado", 
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      icon: CheckCircle2
    },
  };
  return configs[status] || { label: status, className: "bg-gray-100 text-gray-700", icon: Clock };
}

export default function ProcessoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const processoId = params.id;
  const processo = mockProcesso; // Em produção, buscar via TRPC
  const areaInfo = getAreaInfo(processo.area);

  const handleDelete = () => {
    // Em produção, chamar TRPC para deletar
    console.log("Deletando processo:", processoId);
    setShowDeleteDialog(false);
    router.push("/admin/processos");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href="/admin/processos">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-muted-foreground text-sm">Voltar para Processos</span>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                {processo.isJuri ? (
                  <Gavel className="h-6 w-6 text-white" />
                ) : (
                  <Scale className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight font-mono">
                  {processo.numeroAutos}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  {getSituacaoBadge(processo.situacao)}
                  {processo.fase && getFaseBadge(processo.fase)}
                  <Badge variant="outline" className={areaInfo.className}>
                    {areaInfo.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {processo.linkDrive && (
              <Button variant="outline" size="sm" asChild>
                <a href={processo.linkDrive} target="_blank" rel="noopener noreferrer">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Pasta no Drive
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a 
                href={`https://pje.tjba.jus.br/pje/ConsultaPublica/DetalheProcessoConsultaPublica/listView.seam?processo=${processo.numeroAutos}`}
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Consultar no TJ
              </a>
            </Button>
            <Link href={`/admin/processos/${processoId}/editar`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      {/* Informações principais */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Dados do Processo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="h-5 w-5 text-emerald-600" />
              Dados do Processo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Classe Processual</p>
                <p className="font-medium">{processo.classeProcessual || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Área</p>
                <p className="font-medium">{areaInfo.label}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Assunto</p>
              <p className="font-medium">{processo.assunto || "-"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Comarca</p>
                <p className="font-medium flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {processo.comarca || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vara</p>
                <p className="font-medium">{processo.vara || "-"}</p>
              </div>
            </div>

            {processo.parteContraria && (
              <div>
                <p className="text-sm text-muted-foreground">Parte Contrária</p>
                <p className="font-medium">{processo.parteContraria}</p>
              </div>
            )}

            {processo.valorCausa && (
              <div>
                <p className="text-sm text-muted-foreground">Valor da Causa</p>
                <p className="font-medium">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(processo.valorCausa / 100)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dados do Assistido */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-emerald-600" />
              Assistido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-xl font-bold">
                {processo.assistido.nome.charAt(0)}
              </div>
              <div>
                <Link 
                  href={`/admin/assistidos/${processo.assistido.id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {processo.assistido.nome}
                </Link>
                {processo.assistido.cpf && (
                  <p className="text-sm text-muted-foreground">{processo.assistido.cpf}</p>
                )}
                {processo.assistido.statusPrisional === "preso" && (
                  <Badge className="mt-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Réu Preso
                  </Badge>
                )}
              </div>
            </div>
            
            <Link href={`/admin/assistidos/${processo.assistido.id}`}>
              <Button variant="outline" className="w-full">
                <User className="h-4 w-4 mr-2" />
                Ver Ficha Completa
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Informações do Júri (se aplicável) */}
      {processo.isJuri && (
        <Card className="border-purple-200 dark:border-purple-800/50">
          <CardHeader className="bg-purple-50/50 dark:bg-purple-900/10">
            <CardTitle className="flex items-center gap-2 text-lg text-purple-700 dark:text-purple-400">
              <Gavel className="h-5 w-5" />
              Tribunal do Júri
            </CardTitle>
            <CardDescription>Informações específicas do processo do Júri</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data da Sessão</p>
                <p className="font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {processo.dataSessaoJuri 
                    ? format(parseISO(processo.dataSessaoJuri), "dd/MM/yyyy", { locale: ptBR })
                    : "Não agendada"
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resultado</p>
                <p className="font-medium">{processo.resultadoJuri || "Aguardando julgamento"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {processo.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{processo.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Demandas Relacionadas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-emerald-600" />
              Demandas
            </CardTitle>
            <CardDescription>Demandas vinculadas a este processo</CardDescription>
          </div>
          <Link href={`/admin/demandas?processo=${processoId}`}>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Demanda
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {mockDemandas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Prioridade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDemandas.map((demanda) => {
                  const statusConfig = getStatusConfig(demanda.status);
                  const StatusIcon = statusConfig.icon;
                  const diasRestantes = differenceInDays(parseISO(demanda.prazo), new Date());
                  
                  return (
                    <TableRow key={demanda.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{demanda.ato}</span>
                          {demanda.reuPreso && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                              Preso
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusConfig.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{format(parseISO(demanda.prazo), "dd/MM/yyyy")}</span>
                          {diasRestantes <= 3 && diasRestantes >= 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {diasRestantes === 0 ? "HOJE" : `${diasRestantes}d`}
                            </Badge>
                          )}
                          {diasRestantes < 0 && (
                            <Badge variant="destructive" className="text-xs">
                              Vencido
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={demanda.prioridade === "FATAL" ? "destructive" : "secondary"}
                        >
                          {demanda.prioridade}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma demanda vinculada</p>
              <Link href={`/admin/demandas?processo=${processoId}`} className="mt-2">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeira demanda
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metadados */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Criado em: </span>
              {format(parseISO(processo.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            <div>
              <span className="font-medium">Atualizado em: </span>
              {format(parseISO(processo.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
            {processo.defensor && (
              <div>
                <span className="font-medium">Defensor: </span>
                {processo.defensor.nome}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este processo? Esta ação não pode ser desfeita.
              Todas as demandas vinculadas também serão afetadas.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-mono text-sm">{processo.numeroAutos}</p>
              <p className="text-sm text-muted-foreground mt-1">{processo.assistido.nome}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir Processo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
