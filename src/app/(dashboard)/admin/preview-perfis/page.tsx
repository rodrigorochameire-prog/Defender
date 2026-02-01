"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  Briefcase,
  UserCheck,
  Scale,
  Users,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { DashboardPorPerfil } from "@/components/dashboard/dashboard-por-perfil";
import { RegistroRapidoAprimorado } from "@/components/dashboard/registro-rapido-aprimorado";

// ============================================
// DADOS MOCKADOS PARA PREVIEW
// ============================================

const MOCK_DELEGACOES = [
  {
    id: 1,
    titulo: "Elaborar manifestação sobre liberdade provisória",
    instrucoes: "Verificar precedentes do STJ sobre tema de prisão preventiva",
    prazoSugerido: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pendente",
    delegadoDeNome: "Dr. Rodrigo",
    delegadoParaNome: "Emilly",
  },
  {
    id: 2,
    titulo: "Pesquisar jurisprudência sobre legítima defesa",
    instrucoes: "Buscar casos de absolvição por legítima defesa nos últimos 5 anos",
    prazoSugerido: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "em_andamento",
    delegadoDeNome: "Dr. Rodrigo",
    delegadoParaNome: "Emilly",
  },
  {
    id: 3,
    titulo: "Organizar documentos do caso 2024-003",
    instrucoes: "Digitalizar e indexar todos os documentos recebidos",
    prazoSugerido: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pendente",
    delegadoDeNome: "Dr. Rodrigo",
    delegadoParaNome: "Emilly",
  },
];

const MOCK_DEMANDAS = [
  {
    id: 1,
    ato: "Contestação - Ação Penal",
    assistido: { nome: "João da Silva" },
    prazoFinal: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "2_ATENDER",
    reuPreso: true,
  },
  {
    id: 2,
    ato: "Alegações Finais",
    assistido: { nome: "Maria Santos" },
    prazoFinal: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "4_MONITORAR",
    reuPreso: false,
  },
  {
    id: 3,
    ato: "Pedido de Liberdade",
    assistido: { nome: "Pedro Alves" },
    prazoFinal: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: "URGENTE",
    reuPreso: true,
  },
];

const MOCK_ASSISTIDOS = [
  { id: 1, nome: "João da Silva", situacaoPrisional: "PRESO", createdAt: new Date().toISOString() },
  { id: 2, nome: "Maria Santos", situacaoPrisional: "SOLTO", createdAt: new Date().toISOString() },
  { id: 3, nome: "Pedro Alves", situacaoPrisional: "PRESO", createdAt: new Date().toISOString() },
  { id: 4, nome: "Ana Oliveira", situacaoPrisional: "MONITORADO", createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 5, nome: "Carlos Lima", situacaoPrisional: "SOLTO", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
];

const MOCK_PROCESSOS = [
  { id: 1, numero: "0001234-45.2024.8.05.0038", tipo: "Ação Penal", assistidoId: 1 },
  { id: 2, numero: "0005678-90.2024.8.05.0038", tipo: "Execução Penal", assistidoId: 2 },
  { id: 3, numero: "0009012-34.2024.8.05.0038", tipo: "Habeas Corpus", assistidoId: 3 },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PreviewPerfisPage() {
  const [activeTab, setActiveTab] = useState("estagiario");

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
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            Modo Preview
          </Badge>
        </div>
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

          {/* Preview Estagiário */}
          <TabsContent value="estagiario" className="space-y-6">
            <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
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
            </Card>
            
            <DashboardPorPerfil
              userRole="estagiario"
              userName="Emilly"
              supervisorName="Dr. Rodrigo"
              delegacoes={MOCK_DELEGACOES}
              demandas={MOCK_DEMANDAS}
              assistidos={MOCK_ASSISTIDOS}
              processos={MOCK_PROCESSOS}
              isLoading={false}
            />
          </TabsContent>

          {/* Preview Servidor */}
          <TabsContent value="servidor" className="space-y-6">
            <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
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
            </Card>
            
            <DashboardPorPerfil
              userRole="servidor"
              userName="Amanda"
              delegacoes={MOCK_DELEGACOES}
              demandas={MOCK_DEMANDAS}
              assistidos={MOCK_ASSISTIDOS}
              audiencias={[]}
              isLoading={false}
            />
          </TabsContent>

          {/* Preview Triagem */}
          <TabsContent value="triagem" className="space-y-6">
            <Card className="p-4 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
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
            </Card>
            
            <DashboardPorPerfil
              userRole="triagem"
              userName="Gustavo"
              assistidos={MOCK_ASSISTIDOS}
              isLoading={false}
            />
          </TabsContent>

          {/* Preview Defensor Criminal Geral */}
          <TabsContent value="defensor-criminal" className="space-y-6">
            <Card className="p-4 bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800">
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
            </Card>
            
            <DashboardPorPerfil
              userRole="defensor"
              userName="Dr. Danilo"
              demandas={MOCK_DEMANDAS}
              assistidos={MOCK_ASSISTIDOS}
              processos={MOCK_PROCESSOS}
              audiencias={[]}
              isLoading={false}
            />
            
            {/* Registro Rápido Aprimorado */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">
                Registro Rápido Aprimorado
              </h3>
              <RegistroRapidoAprimorado
                userRole="defensor"
                assistidos={MOCK_ASSISTIDOS}
                processos={MOCK_PROCESSOS}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
