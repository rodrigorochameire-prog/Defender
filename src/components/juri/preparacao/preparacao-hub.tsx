"use client";

import { useState } from "react";
import {
  CheckSquare, Users, Map, ListChecks, Brain
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChecklistPreparacaoJuri } from "./checklist-preparacao-juri";
import { DossieHub } from "./dossie-hub";
import { WarRoom } from "./war-room";
import { QuesitosEditor } from "./quesitos-editor";
import { SimulacaoJulgamento } from "./simulacao-julgamento";

interface PreparacaoHubProps {
  sessaoId: string;
  sessao: any;
}

/**
 * PreparacaoHub - Hub de Preparacao para o Juri
 *
 * Centraliza as 5 sub-features de preparacao:
 * 1. Checklist - Tarefas e prazos pre-juri
 * 2. Personagens - Dossie de todos os envolvidos
 * 3. Mapa do Caso - War room / visao estrategica
 * 4. Quesitos - Editor de quesitos da defesa
 * 5. Simulacao - Simulacao de julgamento com IA
 */
export function PreparacaoHub({ sessaoId, sessao }: PreparacaoHubProps) {
  const [activeTab, setActiveTab] = useState("checklist");

  const casoId = sessao?.casoId || sessao?.processo?.casoId || null;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start h-12 bg-white dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800 p-1 rounded-xl shadow-sm">
          <TabsTrigger
            value="checklist"
            className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-neutral-800 data-[state=active]:text-primary flex gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Checklist</span>
            <span className="sm:hidden">Check</span>
          </TabsTrigger>
          <TabsTrigger
            value="personagens"
            className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-neutral-800 data-[state=active]:text-primary flex gap-2"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Personagens</span>
            <span className="sm:hidden">Perso</span>
          </TabsTrigger>
          <TabsTrigger
            value="mapa"
            className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-neutral-800 data-[state=active]:text-primary flex gap-2"
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Mapa do Caso</span>
            <span className="sm:hidden">Mapa</span>
          </TabsTrigger>
          <TabsTrigger
            value="quesitos"
            className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-neutral-800 data-[state=active]:text-primary flex gap-2"
          >
            <ListChecks className="w-4 h-4" />
            <span className="hidden sm:inline">Quesitos</span>
            <span className="sm:hidden">Ques</span>
          </TabsTrigger>
          <TabsTrigger
            value="simulacao"
            className="data-[state=active]:bg-stone-100 dark:data-[state=active]:bg-neutral-800 data-[state=active]:text-primary flex gap-2"
          >
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Simulacao</span>
            <span className="sm:hidden">Sim</span>
          </TabsTrigger>
        </TabsList>

        {/* Conteudo: Checklist */}
        <TabsContent value="checklist" className="mt-0">
          <div>
            <ChecklistPreparacaoJuri sessaoId={sessaoId} casoId={casoId} />
          </div>
        </TabsContent>

        {/* Conteudo: Personagens (Dossie) */}
        <TabsContent value="personagens" className="mt-0">
          <div>
            <DossieHub sessaoId={sessaoId} casoId={casoId} />
          </div>
        </TabsContent>

        {/* Conteudo: Mapa do Caso (War Room) */}
        <TabsContent value="mapa" className="mt-0">
          <div>
            <WarRoom sessaoId={sessaoId} casoId={casoId} />
          </div>
        </TabsContent>

        {/* Conteudo: Quesitos */}
        <TabsContent value="quesitos" className="mt-0">
          <div>
            <QuesitosEditor sessaoId={sessaoId} casoId={casoId} />
          </div>
        </TabsContent>

        {/* Conteudo: Simulacao */}
        <TabsContent value="simulacao" className="mt-0">
          <div>
            <SimulacaoJulgamento sessaoId={sessaoId} casoId={casoId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
