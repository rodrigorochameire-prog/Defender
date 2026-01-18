"use client";

import { useState, useMemo } from "react";
import { AudienciasHub } from "@/components/casos/audiencias-hub";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssignment } from "@/contexts/assignment-context";
import { isToday, isTomorrow, addDays, isPast } from "date-fns";

// ==========================================
// TIPOS
// ==========================================

interface Audiencia {
  id: number;
  dataAudiencia: Date;
  horario?: string | null;
  tipo: string;
  status: "A_DESIGNAR" | "DESIGNADA" | "REALIZADA" | "AGUARDANDO_ATA" | "CONCLUIDA" | "ADIADA" | "CANCELADA";
  sala?: string | null;
  local?: string | null;
  juiz?: string | null;
  promotor?: string | null;
  anotacoes?: string | null;
  resumoDefesa?: string | null;
  googleCalendarEventId?: string | null;
  casoId?: number | null;
  casoTitulo?: string | null;
  assistidoId?: number | null;
  assistidoNome?: string | null;
  assistidoFoto?: string | null;
  assistidoPreso?: boolean;
  processoId?: number | null;
  numeroAutos?: string | null;
  vara?: string | null;
  comarca?: string | null;
  defensorNome?: string | null;
}

// ==========================================
// DADOS MOCK
// ==========================================

const MOCK_AUDIENCIAS: Audiencia[] = [
  {
    id: 1,
    dataAudiencia: new Date(),
    horario: "09:00",
    tipo: "INSTRUCAO",
    status: "DESIGNADA",
    sala: "3",
    local: "Fórum de Camaçari",
    juiz: "Dr. Carlos Mendes",
    promotor: "Dr. Fernando Costa",
    resumoDefesa: "Focar na nulidade da busca domiciliar sem mandado",
    casoId: 1,
    casoTitulo: "Homicídio Qualificado - Operação Reuso",
    assistidoId: 1,
    assistidoNome: "José Carlos Santos",
    assistidoPreso: true,
    processoId: 1,
    numeroAutos: "8002341-90.2025.8.05.0039",
    vara: "Vara do Júri",
    comarca: "Camaçari",
    defensorNome: "Dr. João Silva",
  },
  {
    id: 2,
    dataAudiencia: addDays(new Date(), 1),
    horario: "14:00",
    tipo: "CUSTODIA",
    status: "DESIGNADA",
    sala: "1",
    local: "Fórum de Camaçari",
    casoId: 2,
    casoTitulo: "Flagrante - Tráfico",
    assistidoId: 3,
    assistidoNome: "Maria Aparecida Silva",
    assistidoPreso: true,
    processoId: 3,
    numeroAutos: "8002500-10.2025.8.05.0039",
    vara: "Vara Criminal",
    comarca: "Camaçari",
    defensorNome: "Dra. Ana Paula",
  },
  {
    id: 3,
    dataAudiencia: addDays(new Date(), 3),
    horario: "10:00",
    tipo: "INSTRUCAO",
    status: "DESIGNADA",
    sala: "2",
    local: "Fórum de Camaçari",
    casoId: 1,
    casoTitulo: "Homicídio Qualificado - Operação Reuso",
    assistidoId: 2,
    assistidoNome: "Pedro Oliveira Lima",
    assistidoPreso: true,
    processoId: 2,
    numeroAutos: "8002342-75.2025.8.05.0039",
    vara: "Vara do Júri",
    comarca: "Camaçari",
    defensorNome: "Dr. João Silva",
  },
  {
    id: 4,
    dataAudiencia: addDays(new Date(), 7),
    horario: "09:30",
    tipo: "CONCILIACAO",
    status: "DESIGNADA",
    local: "CEJUSC Camaçari",
    assistidoId: 4,
    assistidoNome: "Carlos Eduardo",
    assistidoPreso: false,
    processoId: 4,
    numeroAutos: "8003100-50.2025.8.05.0039",
    vara: "Vara Cível",
    comarca: "Camaçari",
    defensorNome: "Dra. Maria Oliveira",
  },
  {
    id: 5,
    dataAudiencia: addDays(new Date(), -2),
    horario: "14:00",
    tipo: "INSTRUCAO",
    status: "REALIZADA",
    sala: "3",
    local: "Fórum de Camaçari",
    anotacoes: "Testemunha de acusação não compareceu. Juiz redesignou para nova data.",
    casoId: 3,
    casoTitulo: "Roubo Qualificado",
    assistidoId: 5,
    assistidoNome: "Roberto Silva",
    assistidoPreso: false,
    processoId: 5,
    numeroAutos: "8001200-30.2025.8.05.0039",
    vara: "Vara Criminal",
    comarca: "Camaçari",
    defensorNome: "Dr. João Silva",
  },
  {
    id: 6,
    dataAudiencia: addDays(new Date(), -1),
    horario: "10:00",
    tipo: "INSTRUCAO",
    status: "AGUARDANDO_ATA",
    sala: "2",
    local: "Fórum de Camaçari",
    assistidoId: 6,
    assistidoNome: "Antônio Pereira",
    assistidoPreso: true,
    processoId: 6,
    numeroAutos: "8001500-80.2025.8.05.0039",
    vara: "Vara do Júri",
    comarca: "Camaçari",
    defensorNome: "Dr. João Silva",
  },
  {
    id: 7,
    dataAudiencia: addDays(new Date(), 15),
    horario: "09:00",
    tipo: "PLENARIO_JURI",
    status: "DESIGNADA",
    sala: "Plenário",
    local: "Fórum de Camaçari",
    resumoDefesa: "Tese principal: legítima defesa. Quesito específico preparado.",
    casoId: 4,
    casoTitulo: "Tentativa de Homicídio - Brigas de Bar",
    assistidoId: 7,
    assistidoNome: "Fernando Costa",
    assistidoPreso: true,
    processoId: 7,
    numeroAutos: "8000800-20.2024.8.05.0039",
    vara: "Vara do Júri",
    comarca: "Camaçari",
    defensorNome: "Dr. João Silva",
  },
  {
    id: 8,
    dataAudiencia: addDays(new Date(), 10),
    horario: "14:30",
    tipo: "JUSTIFICACAO",
    status: "A_DESIGNAR",
    assistidoId: 8,
    assistidoNome: "Lucas Mendes",
    assistidoPreso: false,
    processoId: 8,
    numeroAutos: "8002800-15.2025.8.05.0039",
    vara: "Vara Criminal",
    comarca: "Camaçari",
  },
];

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function AudienciasPage() {
  const { currentAssignment } = useAssignment();
  
  // Filtrar por workspace se necessário
  const audiencias = useMemo(() => {
    // Em produção, buscar do banco via tRPC
    return MOCK_AUDIENCIAS;
  }, [currentAssignment]);

  // Estatísticas
  const stats = useMemo(() => {
    const hoje = audiencias.filter(a => isToday(a.dataAudiencia) && a.status === "DESIGNADA").length;
    const amanha = audiencias.filter(a => isTomorrow(a.dataAudiencia) && a.status === "DESIGNADA").length;
    const aguardandoAta = audiencias.filter(a => a.status === "AGUARDANDO_ATA").length;
    const reuPreso = audiencias.filter(a => a.assistidoPreso && a.status === "DESIGNADA").length;
    return { hoje, amanha, aguardandoAta, reuPreso };
  }, [audiencias]);

  const handleAudienciaUpdate = async (id: number, data: Partial<Audiencia>) => {
    console.log("Atualizando audiência", id, "com:", data);
    // Implementar via tRPC
  };

  const handleCreateTask = (audiencia: Audiencia, taskType: string) => {
    console.log("Criando tarefa", taskType, "para audiência", audiencia.id);
    // Implementar via tRPC - criar demanda
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
            <Calendar className="w-6 h-6 text-blue-700 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Agenda de Audiências
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Gestão centralizada de audiências e prazos
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className={cn(
            "p-4 border-0",
            stats.hoje > 0 
              ? "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20" 
              : "bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800"
          )}>
            <div className="flex items-center gap-3">
              <AlertCircle className={cn(
                "w-5 h-5",
                stats.hoje > 0 ? "text-rose-500" : "text-zinc-400"
              )} />
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  stats.hoje > 0 ? "text-rose-700 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300"
                )}>
                  {stats.hoje}
                </p>
                <p className={cn(
                  "text-xs",
                  stats.hoje > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
                )}>
                  Hoje
                </p>
              </div>
            </div>
          </Card>
          
          <Card className={cn(
            "p-4 border-0",
            stats.amanha > 0 
              ? "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20" 
              : "bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800"
          )}>
            <div className="flex items-center gap-3">
              <Clock className={cn(
                "w-5 h-5",
                stats.amanha > 0 ? "text-amber-500" : "text-zinc-400"
              )} />
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  stats.amanha > 0 ? "text-amber-700 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"
                )}>
                  {stats.amanha}
                </p>
                <p className={cn(
                  "text-xs",
                  stats.amanha > 0 ? "text-amber-600 dark:text-amber-400" : "text-zinc-500"
                )}>
                  Amanhã
                </p>
              </div>
            </div>
          </Card>
          
          <Card className={cn(
            "p-4 border-0",
            stats.aguardandoAta > 0 
              ? "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20" 
              : "bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800"
          )}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className={cn(
                "w-5 h-5",
                stats.aguardandoAta > 0 ? "text-orange-500" : "text-zinc-400"
              )} />
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  stats.aguardandoAta > 0 ? "text-orange-700 dark:text-orange-400" : "text-zinc-700 dark:text-zinc-300"
                )}>
                  {stats.aguardandoAta}
                </p>
                <p className={cn(
                  "text-xs",
                  stats.aguardandoAta > 0 ? "text-orange-600 dark:text-orange-400" : "text-zinc-500"
                )}>
                  Aguardando Ata
                </p>
              </div>
            </div>
          </Card>
          
          <Card className={cn(
            "p-4 border-0",
            stats.reuPreso > 0 
              ? "bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950/30 dark:to-rose-900/20" 
              : "bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800"
          )}>
            <div className="flex items-center gap-3">
              <Users className={cn(
                "w-5 h-5",
                stats.reuPreso > 0 ? "text-rose-500" : "text-zinc-400"
              )} />
              <div>
                <p className={cn(
                  "text-2xl font-bold",
                  stats.reuPreso > 0 ? "text-rose-700 dark:text-rose-400" : "text-zinc-700 dark:text-zinc-300"
                )}>
                  {stats.reuPreso}
                </p>
                <p className={cn(
                  "text-xs",
                  stats.reuPreso > 0 ? "text-rose-600 dark:text-rose-400" : "text-zinc-500"
                )}>
                  Réu Preso
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Audiências Hub */}
        <AudienciasHub
          audiencias={audiencias as any}
          onAudienciaUpdate={handleAudienciaUpdate}
          onCreateTask={handleCreateTask}
        />
      </div>
    </TooltipProvider>
  );
}
