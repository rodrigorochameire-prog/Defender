"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  Briefcase,
  UserCheck,
  Scale,
  ArrowLeft,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { DashboardPorPerfil } from "@/components/dashboard/dashboard-por-perfil";
import { RegistroRapidoAprimorado } from "@/components/dashboard/registro-rapido-aprimorado";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PreviewPerfisPage() {
  const [activeTab, setActiveTab] = useState("estagiario");

  // ==========================================
  // BUSCAR DADOS REAIS DO BANCO
  // ==========================================
  
  // Assistidos
  const { 
    data: assistidos = [], 
    isLoading: loadingAssistidos,
    refetch: refetchAssistidos 
  } = trpc.assistidos.list.useQuery({ limit: 100 });

  // Demandas
  const { 
    data: demandas = [], 
    isLoading: loadingDemandas,
    refetch: refetchDemandas 
  } = trpc.demandas.list.useQuery({ limit: 100 });

  // Processos
  const { 
    data: processos = [], 
    isLoading: loadingProcessos,
    refetch: refetchProcessos 
  } = trpc.processos.list.useQuery({ limit: 100 });

  // Delegações (para estagiários)
  const { 
    data: delegacoes = [], 
    isLoading: loadingDelegacoes,
    refetch: refetchDelegacoes 
  } = trpc.delegacao?.minhasDelegacoes?.useQuery(undefined) ?? { data: [], isLoading: false, refetch: () => {} };

  // Estados de carregamento
  const isLoading = loadingAssistidos || loadingDemandas || loadingProcessos;

  // Função para recarregar todos os dados
  const handleRefresh = async () => {
    toast.info("Atualizando dados...");
    await Promise.all([
      refetchAssistidos(),
      refetchDemandas(),
      refetchProcessos(),
      refetchDelegacoes?.(),
    ]);
    toast.success("Dados atualizados!");
  };

  // Estatísticas do banco
  const dbStats = {
    assistidos: assistidos.length,
    demandas: demandas.length,
    processos: processos.length,
    delegacoes: delegacoes.length,
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
                Preview de Dashboards por Perfil
              </h1>
              <p className="text-sm text-zinc-500">
                Visualize como cada membro da equipe verá seu dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Badge 
              variant="outline" 
              className={dbStats.assistidos > 0 
                ? "text-emerald-600 border-emerald-300 bg-emerald-50" 
                : "text-amber-600 border-amber-300 bg-amber-50"
              }
            >
              <Database className="w-3 h-3 mr-1" />
              {dbStats.assistidos > 0 ? "Dados Reais" : "Sem Dados"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats do Banco */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
        <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Dados do Banco
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                {dbStats.assistidos > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="text-zinc-600 dark:text-zinc-400">
                  {dbStats.assistidos} assistidos
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {dbStats.demandas > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="text-zinc-600 dark:text-zinc-400">
                  {dbStats.demandas} demandas
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {dbStats.processos > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className="text-zinc-600 dark:text-zinc-400">
                  {dbStats.processos} processos
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {dbStats.delegacoes > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span className="text-zinc-600 dark:text-zinc-400">
                  {dbStats.delegacoes} delegações
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs de Perfil */}
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-zinc-900 p-1 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <TabsTrigger 
              value="estagiario" 
              className="gap-2 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700"
            >
              <GraduationCap className="w-4 h-4" />
              Estagiário(a)
            </TabsTrigger>
            <TabsTrigger 
              value="servidor" 
              className="gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
            >
              <Briefcase className="w-4 h-4" />
              Servidor(a)
            </TabsTrigger>
            <TabsTrigger 
              value="triagem" 
              className="gap-2 data-[state=active]:bg-zinc-200 data-[state=active]:text-zinc-700"
            >
              <UserCheck className="w-4 h-4" />
              Triagem
            </TabsTrigger>
            <TabsTrigger 
              value="defensor-criminal" 
              className="gap-2 data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700"
            >
              <Scale className="w-4 h-4" />
              Defensor Criminal Geral
            </TabsTrigger>
          </TabsList>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <div className="grid grid-cols-4 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {/* Preview Estagiário */}
          <TabsContent value="estagiario" className="space-y-6">
            <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Visualizando como: Emilly (Estagiária)
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Vinculada ao Dr. Rodrigo • Núcleo Especializados
                    </p>
                  </div>
                </div>
                <Link href="/admin/assistidos">
                  <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                    Ir para Assistidos
                  </Button>
                </Link>
              </div>
            </Card>
            
            <DashboardPorPerfil
              userRole="estagiario"
              userName="Emilly"
              supervisorName="Dr. Rodrigo"
              delegacoes={delegacoes}
              demandas={demandas}
              assistidos={assistidos}
              processos={processos}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Preview Servidor */}
          <TabsContent value="servidor" className="space-y-6">
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      Visualizando como: Amanda (Servidora)
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Servidor Administrativo • Núcleo Especializados
                    </p>
                  </div>
                </div>
                <Link href="/admin/demandas">
                  <Button size="sm" variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-100">
                    Ir para Demandas
                  </Button>
                </Link>
              </div>
            </Card>
            
            <DashboardPorPerfil
              userRole="servidor"
              userName="Amanda"
              delegacoes={delegacoes}
              demandas={demandas}
              assistidos={assistidos}
              audiencias={[]}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Preview Triagem */}
          <TabsContent value="triagem" className="space-y-6">
            <Card className="p-4 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-zinc-600" />
                  <div>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">
                      Visualizando como: Gustavo (Triagem)
                    </p>
                    <p className="text-sm text-zinc-500">
                      Recepção e Cadastro • Núcleo Especializados
                    </p>
                  </div>
                </div>
                <Link href="/admin/assistidos/novo">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Novo Cadastro
                  </Button>
                </Link>
              </div>
            </Card>
            
            <DashboardPorPerfil
              userRole="triagem"
              userName="Gustavo"
              assistidos={assistidos}
              isLoading={isLoading}
            />
          </TabsContent>

          {/* Preview Defensor Criminal Geral */}
          <TabsContent value="defensor-criminal" className="space-y-6">
            <Card className="p-4 bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Scale className="w-5 h-5 text-violet-600" />
                  <div>
                    <p className="font-medium text-violet-800 dark:text-violet-200">
                      Visualizando como: Dr. Danilo (Defensor)
                    </p>
                    <p className="text-sm text-violet-600 dark:text-violet-400">
                      2ª Vara Criminal • Criminal Geral (sem Júri/EP/VD)
                    </p>
                  </div>
                </div>
                <Link href="/admin/agenda">
                  <Button size="sm" variant="outline" className="text-violet-700 border-violet-300 hover:bg-violet-100">
                    Ir para Agenda
                  </Button>
                </Link>
              </div>
            </Card>
            
            <DashboardPorPerfil
              userRole="defensor"
              userName="Dr. Danilo"
              demandas={demandas}
              assistidos={assistidos}
              processos={processos}
              audiencias={[]}
              isLoading={isLoading}
            />
            
            {/* Registro Rápido Aprimorado */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                Registro Rápido Aprimorado
              </h3>
              <RegistroRapidoAprimorado
                userRole="defensor"
                assistidos={assistidos}
                processos={processos}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
