"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Scale,
  Search,
  BookOpen,
  Gavel,
  ExternalLink,
  FileText,
} from "lucide-react";
import { ConsultaProcesso } from "@/components/tribunais/consulta-processo";
import { ConsultaSEEU } from "@/components/tribunais/consulta-seeu";
import { AtosNormativosBrowser } from "@/components/tribunais/atos-normativos-browser";
import { TRIBUNAIS, TJBA_URLS } from "@/lib/services/tribunais/consulta-tribunal";

export default function TribunaisPage() {
  const [activeTab, setActiveTab] = useState("processos");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-7 w-7 text-blue-600" />
            Integração com Tribunais
          </h1>
          <p className="text-muted-foreground">
            Consulte processos, execuções penais e atos normativos
          </p>
        </div>

        {/* Links rápidos */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={TJBA_URLS.pje1g} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              PJe 1º Grau
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={TJBA_URLS.pje2g} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              PJe 2º Grau
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={TJBA_URLS.seeu} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-1" />
              SEEU
            </a>
          </Button>
        </div>
      </div>

      {/* Cards de informação */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Search className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">PJe TJBA</p>
                <p className="text-xs text-muted-foreground">Processo Judicial Eletrônico</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Gavel className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">SEEU</p>
                <p className="text-xs text-muted-foreground">Execução Unificado - CNJ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Atos Normativos</p>
                <p className="text-xs text-muted-foreground">Súmulas e Resoluções</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Tribunais</p>
                <p className="text-xs text-muted-foreground">
                  {Object.keys(TRIBUNAIS).length} tribunais configurados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="processos" className="gap-2">
            <Search className="h-4 w-4" />
            Consulta de Processos
          </TabsTrigger>
          <TabsTrigger value="execucao" className="gap-2">
            <Gavel className="h-4 w-4" />
            Execução Penal (SEEU)
          </TabsTrigger>
          <TabsTrigger value="normativos" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Atos Normativos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="processos" className="mt-6">
          <ConsultaProcesso />
        </TabsContent>

        <TabsContent value="execucao" className="mt-6">
          <ConsultaSEEU />
        </TabsContent>

        <TabsContent value="normativos" className="mt-6">
          <AtosNormativosBrowser />
        </TabsContent>
      </Tabs>

      {/* Tribunais disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Tribunais Configurados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.values(TRIBUNAIS).map((tribunal) => (
              <Badge
                key={tribunal.id}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => tribunal.url && window.open(tribunal.url, "_blank")}
              >
                {tribunal.sigla}
                {tribunal.url && <ExternalLink className="h-3 w-3 ml-1" />}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
