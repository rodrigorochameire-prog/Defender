"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Gavel, 
  Users, 
  Clock, 
  Calendar,
  MapPin,
  FileText,
  ArrowLeft,
  Edit,
  Zap,
  User,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock data para demonstração
const MOCK_SESSAO = {
  id: 1,
  data: new Date(2026, 0, 25, 13, 30),
  tipo: "PLENARIO" as const,
  status: "AGENDADO" as const,
  local: "Fórum de Camaçari - Sala do Júri",
  juiz: "Dr. Roberto Almeida",
  promotor: "Dr. Carlos Eduardo",
  reus: [
    { id: 1, nome: "João Silva Santos", crime: "Homicídio Qualificado", artigo: "Art. 121, §2º, I e IV" },
  ],
  testemunhas: {
    acusacao: 3,
    defesa: 2,
    ouvidas: 4,
  },
  jurados: {
    convocados: 25,
    presentes: 0,
    selecionados: 0,
  },
  observacoes: "Réu preso. Verificar documentos de transferência.",
};

export default function SessaoJuriPage() {
  const params = useParams();
  const sessaoId = params.id;
  const sessao = MOCK_SESSAO;

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/admin/juri">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 flex-shrink-0">
            <Gavel className="w-5 h-5 sm:w-6 sm:h-6 text-purple-700 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Sessão #{sessaoId}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              {format(sessao.data, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Edit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          <Link href={`/admin/juri/avaliacao/${sessaoId}`}>
            <Button variant="outline" size="sm" className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Avaliação</span>
            </Button>
          </Link>
          <Link href="/admin/juri/cockpit">
            <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600">
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Iniciar Plenário</span>
              <span className="sm:hidden">Live</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        <Badge className="bg-blue-500 text-white">
          <Calendar className="w-3 h-3 mr-1" />
          Agendado
        </Badge>
        <Badge variant="outline" className="text-purple-600 border-purple-200">
          <Gavel className="w-3 h-3 mr-1" />
          Plenário
        </Badge>
      </div>

      {/* Grid de Informações */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Réus */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-rose-500" />
              Réu(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessao.reus.map((reu) => (
              <div key={reu.id} className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold text-sm">{reu.nome}</p>
                <p className="text-xs text-muted-foreground mt-1">{reu.crime}</p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {reu.artigo}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Local e Participantes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              Local e Participantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Local</p>
              <p className="text-sm font-medium">{sessao.local}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Juiz Presidente</p>
              <p className="text-sm font-medium">{sessao.juiz}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Promotor</p>
              <p className="text-sm font-medium">{sessao.promotor}</p>
            </div>
          </CardContent>
        </Card>

        {/* Testemunhas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              Testemunhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                <p className="text-lg font-bold text-rose-600">{sessao.testemunhas.acusacao}</p>
                <p className="text-xs text-muted-foreground">Acusação</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <p className="text-lg font-bold text-emerald-600">{sessao.testemunhas.defesa}</p>
                <p className="text-xs text-muted-foreground">Defesa</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <p className="text-lg font-bold text-blue-600">{sessao.testemunhas.ouvidas}</p>
                <p className="text-xs text-muted-foreground">Ouvidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jurados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-500" />
              Jurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <p className="text-lg font-bold text-purple-600">{sessao.jurados.convocados}</p>
                <p className="text-xs text-muted-foreground">Convocados</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <p className="text-lg font-bold text-amber-600">{sessao.jurados.presentes}</p>
                <p className="text-xs text-muted-foreground">Presentes</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <p className="text-lg font-bold text-emerald-600">{sessao.jurados.selecionados}</p>
                <p className="text-xs text-muted-foreground">Conselho</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        {sessao.observacoes && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-500" />
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{sessao.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Ver Jurados Convocados
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Gerar Ata
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir Processo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
