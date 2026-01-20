"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SwissTable,
  SwissTableBody,
  SwissTableCell,
  SwissTableHead,
  SwissTableHeader,
  SwissTableRow,
} from "@/components/shared/swiss-table";
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
  Link as LinkIcon,
  GitBranch,
  Shield,
  Upload,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// TIPOS
// ==========================================

interface ProcessoAssociado {
  id: number;
  numero: string;
  classe: string;
  tipoRelacao: "origem" | "apenso" | "recurso" | "cautelar";
  fase: string;
}

interface AtosImportantes {
  id: number;
  data: string;
  descricao: string;
  tipo: "audiencia" | "decisao" | "peticao" | "prisao";
}

// ==========================================
// DADOS MOCK (Estendidos)
// ==========================================

const mockProcesso = {
  id: 1,
  numeroAutos: "8012906-74.2025.8.05.0039",
  assistido: {
    id: 1,
    nome: "Diego Bonfim Almeida",
    cpf: "123.456.789-00",
    statusPrisional: "preso",
  },
  comarca: "Candeias",
  vara: "1ª Vara Criminal",
  area: "JURI",
  classeProcessual: "Ação Penal de Competência do Júri",
  assunto: "Homicídio Qualificado (Art. 121, §2º, CP)",
  parteContraria: "Ministério Público do Estado da Bahia",
  fase: "conhecimento",
  situacao: "ativo",
  isJuri: true,
  dataSessaoJuri: "2025-03-15",
  resultadoJuri: null,
  observacoes: "Réu preso preventivamente. Aguardando designação de sessão do Tribunal do Júri.",
  linkDrive: "https://drive.google.com/folder/exemplo",
  defensor: {
    id: 1,
    nome: "Dr. João Silva",
  },
  createdAt: "2025-01-10",
  updatedAt: "2025-01-15",
  
  // Novos dados
  processosAssociados: [
    { id: 101, numero: "0001111-22.2024.8.05.0039", classe: "Inquérito Policial", tipoRelacao: "origem", fase: "Arquivado" },
    { id: 102, numero: "8005555-44.2025.8.05.0000", classe: "Habeas Corpus", tipoRelacao: "recurso", fase: "Julgado" },
    { id: 103, numero: "0003333-44.2024.8.05.0039", classe: "Pedido de Prisão Preventiva", tipoRelacao: "cautelar", fase: "Concluído" },
  ] as ProcessoAssociado[],
  
  atosImportantes: [
    { id: 1, data: "2024-11-20", descricao: "Prisão em Flagrante", tipo: "prisao" },
    { id: 2, data: "2024-11-21", descricao: "Conversão em Preventiva", tipo: "decisao" },
    { id: 3, data: "2025-01-10", descricao: "Recebimento da Denúncia", tipo: "decisao" },
    { id: 4, data: "2025-01-20", descricao: "Resposta à Acusação", tipo: "peticao" },
  ] as AtosImportantes[],
};

// ==========================================
// UTILS
// ==========================================

function getAreaBadge(area: string) {
  const configs: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" | "info" | "neutral" }> = {
    JURI: { label: "Júri", variant: "info" },
    EXECUCAO_PENAL: { label: "Execução Penal", variant: "warning" },
    VIOLENCIA_DOMESTICA: { label: "V. Doméstica", variant: "warning" },
    SUBSTITUICAO: { label: "Substituição", variant: "neutral" },
  };
  
  const config = configs[area] || { label: area, variant: "secondary" };
  
  // Custom styling for specific badges if needed beyond variants
  if (area === "VIOLENCIA_DOMESTICA") {
    return <Badge variant="outline" className="text-pink-700 border-pink-200 bg-pink-50 dark:text-pink-300 dark:border-pink-800 dark:bg-pink-900/20">{config.label}</Badge>;
  }
  
  return <Badge variant={config.variant as any}>{config.label}</Badge>;
}

function getRelacaoBadge(tipo: string) {
  switch (tipo) {
    case "origem": return <Badge variant="outline" className="text-[10px]">Origem</Badge>;
    case "apenso": return <Badge variant="outline" className="text-[10px]">Apenso</Badge>;
    case "recurso": return <Badge variant="info" className="text-[10px]">Recurso</Badge>;
    case "cautelar": return <Badge variant="warning" className="text-[10px]">Cautelar</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">{tipo}</Badge>;
  }
}

// ==========================================
// PÁGINA
// ==========================================

export default function ProcessoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("visao-geral");
  
  const processoId = params.id;
  const processo = mockProcesso;

  const handleDelete = () => {
    console.log("Deletando processo:", processoId);
    setShowDeleteDialog(false);
    router.push("/admin/processos");
  };

  return (
    <div className="space-y-6">
      {/* Header Clean */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href="/admin/processos">
            <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {getAreaBadge(processo.area)}
                <Badge variant="outline" className="capitalize">{processo.situacao}</Badge>
                {processo.isJuri && <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800">Tribunal do Júri</Badge>}
              </div>
              <h1 className="text-2xl font-bold tracking-tight font-mono text-foreground">
                {processo.numeroAutos}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {processo.classeProcessual} • {processo.vara} - {processo.comarca}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              Anexar Autos (PDF)
            </Button>
            {processo.linkDrive && (
              <Button variant="outline" size="sm" asChild>
                <a href={processo.linkDrive} target="_blank" rel="noopener noreferrer">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Drive
                </a>
              </Button>
            )}
            <Link href={`/admin/processos/${processoId}/editar`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Coluna Principal */}
        <div className="md:col-span-2 space-y-6">
          {/* Dados do Processo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Dados do Processo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Assunto</span>
                  <p className="font-medium mt-0.5">{processo.assunto}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Fase</span>
                  <p className="font-medium mt-0.5 capitalize">{processo.fase}</p>
                </div>
              </div>
              
              <div>
                <span className="text-muted-foreground text-xs uppercase tracking-wider">Parte Contrária</span>
                <p className="font-medium mt-0.5">{processo.parteContraria}</p>
              </div>

              {processo.observacoes && (
                <div className="bg-muted/30 p-3 rounded-md text-sm border border-border/50">
                  <p className="text-muted-foreground italic">{processo.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Árvore de Processos Associados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                Processos Associados
              </CardTitle>
              <CardDescription>
                Histórico processual completo (IP, Cautelares, Recursos)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processo.processosAssociados.length > 0 ? (
                <div className="space-y-3">
                  {/* Processo Principal (Current) */}
                  <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-primary mb-1"></div>
                      <div className="h-full w-px bg-primary/20"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-medium text-primary">{processo.numeroAutos}</span>
                        <Badge variant="default" className="text-[10px]">Atual</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{processo.classeProcessual}</p>
                    </div>
                  </div>

                  {/* Associados */}
                  {processo.processosAssociados.map((proc) => (
                    <div key={proc.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 rounded-lg transition-colors border border-transparent hover:border-border/50">
                      <div className="flex flex-col items-center pt-1">
                        <LinkIcon className="h-3 w-3 text-muted-foreground mb-1" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{proc.numero}</span>
                            {getRelacaoBadge(proc.tipoRelacao)}
                          </div>
                          <span className="text-xs text-muted-foreground">{proc.fase}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{proc.classe}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Nenhum processo associado vinculado.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linha do Tempo - Atos Importantes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Marcos Processuais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-border ml-3 pl-6 space-y-6 py-2">
                {processo.atosImportantes.map((ato, idx) => (
                  <div key={ato.id} className="relative">
                    <div className="absolute -left-[31px] mt-1.5 h-2.5 w-2.5 rounded-full border border-primary bg-background ring-4 ring-background"></div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <span className="font-medium text-sm">{ato.descricao}</span>
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                        {format(parseISO(ato.data), "dd/MM/yyyy")}
                      </span>
                    </div>
                    <Badge variant="outline" className="mt-1 text-[10px] text-muted-foreground border-border/50 uppercase tracking-wider">
                      {ato.tipo}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assistido Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Assistido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                  {processo.assistido.nome.charAt(0)}
                </div>
                <div>
                  <Link 
                    href={`/admin/assistidos/${processo.assistido.id}`}
                    className="font-medium hover:text-primary transition-colors text-sm"
                  >
                    {processo.assistido.nome}
                  </Link>
                  <p className="text-xs text-muted-foreground">{processo.assistido.cpf}</p>
                </div>
              </div>
              
              {processo.assistido.statusPrisional === "preso" && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-md flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-700 dark:text-red-400">Réu Preso</p>
                    <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mt-0.5">
                      Prioridade legal. Verifique os prazos de prisão cautelar.
                    </p>
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full h-8 text-xs" asChild>
                <Link href={`/admin/assistidos/${processo.assistido.id}`}>
                  Ver Ficha Completa
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Júri Info */}
          {processo.isJuri && (
            <Card className="border-purple-200 dark:border-purple-800/30 overflow-hidden">
              <div className="bg-purple-50 dark:bg-purple-900/10 px-4 py-2 border-b border-purple-100 dark:border-purple-800/30 flex items-center gap-2">
                <Gavel className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Painel do Júri</span>
              </div>
              <CardContent className="p-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Sessão Plenária</p>
                  <p className="font-medium">
                    {processo.dataSessaoJuri 
                      ? format(parseISO(processo.dataSessaoJuri), "dd/MM/yyyy")
                      : "Aguardando designação"}
                  </p>
                </div>
                <Button className="w-full bg-purple-600 hover:bg-purple-700 h-8 text-xs">
                  Preparar Plenário
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Metadados */}
          <div className="text-xs text-muted-foreground space-y-1 px-1">
            <p>Criado em: {format(parseISO(processo.createdAt), "dd/MM/yyyy")}</p>
            <p>Atualizado em: {format(parseISO(processo.updatedAt), "dd/MM/yyyy")}</p>
            <p>Defensor: {processo.defensor.nome}</p>
          </div>
        </div>
      </div>

      {/* Dialog de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Processo</DialogTitle>
            <DialogDescription>
              Esta ação removerá permanentemente o processo <strong>{processo.numeroAutos}</strong> e todas as suas demandas associadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
