"use client";

import { useState } from "react";
import { 
  Gavel, Search, Mic2, Users, FileText, Clock, 
  AlertTriangle, CheckCircle2, Shield, Target,
  Zap, Brain, ExternalLink, Calendar, MapPin
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SwissCard, SwissCardContent, SwissCardHeader, SwissCardTitle } from "@/components/ui/swiss-card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface JuriTabsViewProps {
  sessaoId: string;
  sessao: any; // Tipo completo seria definido no projeto real
}

/**
 * JuriTabsView - Hub Consolidado do Júri
 * 
 * Integra todos os módulos (Cockpit, Investigação, Jurados, Teses) em uma única interface
 * usando abas, eliminando a navegação fragmentada.
 */
export function JuriTabsView({ sessaoId, sessao }: JuriTabsViewProps) {
  const [activeTab, setActiveTab] = useState("cockpit");

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Processo - Sempre Visível */}
      <SwissCard className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
                RÉU PRESO
              </Badge>
              <span className="text-xs font-mono text-stone-400 dark:text-zinc-500">
                Autos: {sessao.reus[0]?.numeroAutos || "0004567-89.2024.8.05.0000"}
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100">
              M.P. vs. {sessao.reus[0]?.nome}
            </h1>
            <div className="flex items-center gap-4 text-sm text-stone-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Gavel className="w-4 h-4" /> 1ª Vara do Júri
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> 
                {format(sessao.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
          </div>
          
          {/* Placar Rápido (Stats) */}
          <div className="flex gap-4 border-l border-stone-100 dark:border-zinc-800 pl-6">
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Jurados</div>
              <div className="text-2xl font-bold text-stone-800 dark:text-stone-200">{sessao.jurados?.convocados || 25}</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Teses</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">3</div>
            </div>
            <div className="text-center">
              <div className="text-xs uppercase tracking-wider text-stone-400 dark:text-zinc-500 font-medium">Testemunhas</div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-500">{sessao.testemunhas?.acusacao + sessao.testemunhas?.defesa || 5}</div>
            </div>
          </div>
        </div>
      </SwissCard>

      {/* Navegação por Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start h-12 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 p-1 rounded-xl shadow-sm">
          <TabsTrigger 
            value="cockpit" 
            className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-primary flex gap-2"
          >
            <Mic2 className="w-4 h-4" /> 
            <span className="hidden sm:inline">Cockpit (Plenário)</span>
            <span className="sm:hidden">Live</span>
          </TabsTrigger>
          <TabsTrigger 
            value="investigacao" 
            className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-primary flex gap-2"
          >
            <Search className="w-4 h-4" /> 
            <span className="hidden sm:inline">Investigação Defensiva</span>
            <span className="sm:hidden">Investigação</span>
          </TabsTrigger>
          <TabsTrigger 
            value="jurados" 
            className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-primary flex gap-2"
          >
            <Users className="w-4 h-4" /> 
            <span className="hidden sm:inline">Conselho de Sentença</span>
            <span className="sm:hidden">Jurados</span>
          </TabsTrigger>
          <TabsTrigger 
            value="teses" 
            className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-primary flex gap-2"
          >
            <Shield className="w-4 h-4" /> 
            <span className="hidden sm:inline">Teses & Quesitos</span>
            <span className="sm:hidden">Teses</span>
          </TabsTrigger>
        </TabsList>

        {/* Conteúdo: Cockpit */}
        <TabsContent value="cockpit" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SwissCard className="md:col-span-2 p-6">
              <SwissCardHeader className="p-0 mb-4">
                <SwissCardTitle className="flex items-center gap-2">
                  <Mic2 className="w-5 h-5 text-primary" />
                  Roteiro de Sustentação
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-0">
                <div className="text-stone-400 dark:text-zinc-500 text-sm text-center py-10 border-2 border-dashed border-stone-200 dark:border-zinc-800 rounded-lg">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-zinc-700" />
                  <p>Módulo de Cronômetro e Roteiro</p>
                  <Button variant="outline" className="mt-4" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Cockpit Completo
                  </Button>
                </div>
              </SwissCardContent>
            </SwissCard>

            <SwissCard className="p-6">
              <SwissCardHeader className="p-0 mb-4">
                <SwissCardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Testemunhas
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-0 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500 dark:text-zinc-400">Acusação</span>
                  <span className="font-mono font-semibold">{sessao.testemunhas?.acusacao || 3}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-500 dark:text-zinc-400">Defesa</span>
                  <span className="font-mono font-semibold">{sessao.testemunhas?.defesa || 2}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-stone-500 dark:text-zinc-400">Ouvidas</span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-500">
                    {sessao.testemunhas?.ouvidas || 4}
                  </span>
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>
        </TabsContent>

        {/* Conteúdo: Investigação */}
        <TabsContent value="investigacao" className="mt-0">
          <SwissCard className="p-6 min-h-[400px]">
            <SwissCardHeader className="p-0 mb-4">
              <SwissCardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Provas Coletadas
              </SwissCardTitle>
            </SwissCardHeader>
            <SwissCardContent className="p-0">
              <div className="text-stone-400 dark:text-zinc-500 text-sm text-center py-10 border-2 border-dashed border-stone-200 dark:border-zinc-800 rounded-lg">
                <FileText className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-zinc-700" />
                <p>Módulo de Investigação Defensiva</p>
                <p className="text-xs mt-2 text-stone-500 dark:text-zinc-400">
                  Gestão de provas, depoimentos e evidências
                </p>
              </div>
            </SwissCardContent>
          </SwissCard>
        </TabsContent>

        {/* Conteúdo: Jurados */}
        <TabsContent value="jurados" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SwissCard className="p-6">
              <SwissCardHeader className="p-0 mb-4">
                <SwissCardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Convocados
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-0">
                <div className="text-center">
                  <div className="text-4xl font-bold text-stone-900 dark:text-stone-100 mb-2">
                    {sessao.jurados?.convocados || 25}
                  </div>
                  <p className="text-sm text-stone-500 dark:text-zinc-400">jurados convocados</p>
                </div>
              </SwissCardContent>
            </SwissCard>

            <SwissCard className="p-6">
              <SwissCardHeader className="p-0 mb-4">
                <SwissCardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Presentes
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-0">
                <div className="text-center">
                  <div className="text-4xl font-bold text-emerald-700 dark:text-emerald-500 mb-2">
                    {sessao.jurados?.presentes || 0}
                  </div>
                  <p className="text-sm text-stone-500 dark:text-zinc-400">jurados presentes</p>
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          <SwissCard className="p-6 mt-6">
            <div className="text-stone-400 dark:text-zinc-500 text-sm text-center py-10 border-2 border-dashed border-stone-200 dark:border-zinc-800 rounded-lg">
              <Brain className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-zinc-700" />
              <p>Perfil detalhado dos jurados será exibido aqui</p>
            </div>
          </SwissCard>
        </TabsContent>

        {/* Conteúdo: Teses */}
        <TabsContent value="teses" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SwissCard className="p-6">
              <SwissCardHeader className="p-0 mb-4">
                <SwissCardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  Tese da Defesa
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-0">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed font-serif italic">
                    &ldquo;Legítima defesa. Réu agiu para proteger sua vida após ser atacado com faca pela vítima.&rdquo;
                  </p>
                </div>
              </SwissCardContent>
            </SwissCard>

            <SwissCard className="p-6">
              <SwissCardHeader className="p-0 mb-4">
                <SwissCardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-600" />
                  Tese da Acusação
                </SwissCardTitle>
              </SwissCardHeader>
              <SwissCardContent className="p-0">
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-100 dark:border-red-900">
                  <p className="text-sm text-red-800 dark:text-red-200 leading-relaxed">
                    Homicídio qualificado por motivo fútil e meio cruel.
                  </p>
                </div>
              </SwissCardContent>
            </SwissCard>
          </div>

          <SwissCard className="p-6 mt-6">
            <SwissCardHeader className="p-0 mb-4">
              <SwissCardTitle>Quesitos</SwissCardTitle>
            </SwissCardHeader>
            <SwissCardContent className="p-0">
              <div className="text-stone-400 dark:text-zinc-500 text-sm text-center py-10 border-2 border-dashed border-stone-200 dark:border-zinc-800 rounded-lg">
                <FileText className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-zinc-700" />
                <p>Lista de quesitos será exibida aqui</p>
              </div>
            </SwissCardContent>
          </SwissCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
