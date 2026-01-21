"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Clock,
  User,
  Scale,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { format, parseISO, differenceInDays, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock data - em produção viria do TRPC
const mockDemanda = {
  id: 1,
  assistido: "Jailson do Nascimento Versoza",
  assistidoId: 1,
  processo: "8015678-10.2025.8.05.0039",
  processoId: 1,
  ato: "Resposta à Acusação",
  tipoAto: "resposta_acusacao",
  prazo: "2025-12-20",
  dataEntrada: "2025-11-15",
  dataIntimacao: "2025-11-10",
  status: "2_ATENDER",
  prisao: "CADEIA_PUBLICA",
  prioridade: "REU_PRESO",
  providencias: "Elaborar resposta à acusação. Verificar possíveis diligências a requerer.",
  area: "JURI",
  comarca: "CANDEIAS",
  vara: "1ª Vara Criminal",
  reuPreso: true,
  defensor: "Dr. Rodrigo",
  observacoes: "Réu preso na Cadeia Pública de Candeias. Caso de homicídio qualificado.",
  createdAt: "2025-11-15",
  updatedAt: "2025-11-16",
};

function getStatusInfo(status: string) {
  const configs: Record<string, { label: string; color: string }> = {
    "1_URGENTE": { label: "1 - Urgente", color: "bg-red-600 text-white" },
    "2_ATENDER": { label: "2 - Atender", color: "bg-yellow-400 text-yellow-900" },
    "2_ELABORAR": { label: "2 - Elaborar", color: "bg-yellow-400 text-yellow-900" },
    "3_PROTOCOLAR": { label: "3 - Protocolar", color: "bg-orange-500 text-white" },
    "4_MONITORAR": { label: "4 - Monitorar", color: "bg-cyan-400 text-cyan-900" },
    "5_FILA": { label: "5 - Fila", color: "bg-blue-500 text-white" },
    "7_PROTOCOLADO": { label: "7 - Protocolado", color: "bg-emerald-500 text-white" },
  };
  return configs[status] || { label: status, color: "bg-slate-400 text-white" };
}

function getPrisaoInfo(prisao: string) {
  const configs: Record<string, { label: string; color: string }> = {
    "CADEIA_PUBLICA": { label: "Cadeia Pública", color: "bg-red-600 text-white" },
    "COP": { label: "COP", color: "bg-red-700 text-white" },
    "CPMS": { label: "CPMS - Simões Filho", color: "bg-red-600 text-white" },
    "SOLTO": { label: "Solto", color: "bg-green-500 text-white" },
  };
  return configs[prisao] || { label: prisao || "Não informado", color: "bg-slate-400 text-white" };
}

export default function DemandaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const demandaId = params.id;
  
  // Em produção, buscar via TRPC
  const demanda = mockDemanda;
  
  const statusInfo = getStatusInfo(demanda.status);
  const prisaoInfo = getPrisaoInfo(demanda.prisao);
  
  // Calcular dias até o prazo
  let diasRestantes = null;
  let prazoUrgente = false;
  if (demanda.prazo) {
    const prazoDate = parseISO(demanda.prazo);
    if (!isNaN(prazoDate.getTime())) {
      diasRestantes = differenceInDays(prazoDate, new Date());
      prazoUrgente = diasRestantes <= 3 || isPast(prazoDate);
    }
  }

  const handleDelete = () => {
    // Em produção, chamar TRPC para deletar
    console.log("Deletando demanda:", demandaId);
    router.push("/admin/demandas");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href="/admin/demandas">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-muted-foreground text-sm">Voltar para Demandas</span>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{demanda.ato}</h1>
                <p className="text-muted-foreground">{demanda.assistido}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              {demanda.prisao && <Badge className={prisaoInfo.color}>{prisaoInfo.label}</Badge>}
              {demanda.reuPreso && (
                <Badge className="bg-red-700 text-white">
                  <Lock className="h-3 w-3 mr-1" />
                  Réu Preso
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Link href={`/admin/demandas`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </Link>
            <Button 
              variant="danger" 
              size="sm"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      {/* Prazo destacado */}
      {demanda.prazo && (
        <Card className={prazoUrgente ? "border-red-300 bg-red-50 dark:bg-red-950/20" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {prazoUrgente ? (
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                ) : (
                  <Calendar className="h-8 w-8 text-emerald-500" />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Prazo Fatal</p>
                  <p className={`text-2xl font-bold ${prazoUrgente ? "text-red-600" : ""}`}>
                    {format(parseISO(demanda.prazo), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              {diasRestantes !== null && (
                <div className={`text-right ${prazoUrgente ? "text-red-600" : "text-muted-foreground"}`}>
                  <p className="text-3xl font-bold">
                    {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atrasado` : 
                     diasRestantes === 0 ? "HOJE" : 
                     `${diasRestantes}d`}
                  </p>
                  <p className="text-sm">restantes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações principais */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Dados do Processo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="h-5 w-5 text-emerald-600" />
              Processo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Número dos Autos</p>
              <p className="font-mono font-medium">{demanda.processo || "-"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Área</p>
                <p className="font-medium">{demanda.area}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comarca</p>
                <p className="font-medium">{demanda.comarca || "-"}</p>
              </div>
            </div>
            {demanda.processoId && (
              <Link href={`/admin/processos/${demanda.processoId}`}>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Processo Completo
                </Button>
              </Link>
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
                {demanda.assistido.charAt(0)}
              </div>
              <div>
                <p className="text-lg font-semibold">{demanda.assistido}</p>
                {demanda.reuPreso && (
                  <Badge className="mt-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <Lock className="h-3 w-3 mr-1" />
                    Preso - {prisaoInfo.label}
                  </Badge>
                )}
              </div>
            </div>
            {demanda.assistidoId && (
              <Link href={`/admin/assistidos/${demanda.assistidoId}`}>
                <Button variant="outline" className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  Ver Ficha do Assistido
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Providências */}
      {demanda.providencias && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Providências</CardTitle>
            <CardDescription>O que precisa ser feito</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{demanda.providencias}</p>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      {demanda.observacoes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{demanda.observacoes}</p>
          </CardContent>
        </Card>
      )}

      {/* Datas e Metadados */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Data de Entrada</p>
              <p className="font-medium">
                {demanda.dataEntrada ? format(parseISO(demanda.dataEntrada), "dd/MM/yyyy", { locale: ptBR }) : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Data da Intimação</p>
              <p className="font-medium">
                {demanda.dataIntimacao ? format(parseISO(demanda.dataIntimacao), "dd/MM/yyyy", { locale: ptBR }) : "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Defensor</p>
              <p className="font-medium">{demanda.defensor || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Última Atualização</p>
              <p className="font-medium">
                {demanda.updatedAt ? format(parseISO(demanda.updatedAt), "dd/MM/yyyy", { locale: ptBR }) : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
              Marcar como Protocolado
            </Button>
            <Button variant="outline" size="sm">
              <Clock className="h-4 w-4 mr-2 text-blue-500" />
              Alterar Prazo
            </Button>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2 text-purple-500" />
              Delegar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
