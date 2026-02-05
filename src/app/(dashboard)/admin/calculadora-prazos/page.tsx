"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardPrazos } from "@/components/prazos/dashboard-prazos";
import { CalculadoraPrazo } from "@/components/prazos/calculadora-prazo";
import {
  AlertTriangle,
  Calculator,
  Calendar,
  Settings,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function CalculadoraPrazosPage() {
  const [tabAtiva, setTabAtiva] = useState("calculadora");

  // Buscar tipos de prazo
  const { data: tiposPrazo, isLoading: loadingTipos, refetch } = trpc.prazos.listTiposPrazo.useQuery({});

  // Mutation para seeding
  const seedMutation = trpc.prazos.seedTiposPrazo.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7" />
            Calculadora de Prazos
          </h1>
          <p className="text-muted-foreground">
            Cálculo automático com regras da Defensoria Pública (prazo em dobro, tempo de leitura, dias corridos)
          </p>
        </div>
      </div>

      <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
        <TabsList>
          <TabsTrigger value="calculadora" className="gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora
          </TabsTrigger>
          <TabsTrigger value="criticos" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Prazos Críticos
          </TabsTrigger>
          <TabsTrigger value="configuracoes" className="gap-2">
            <Settings className="h-4 w-4" />
            Tipos de Prazo
          </TabsTrigger>
        </TabsList>

        {/* Calculadora */}
        <TabsContent value="calculadora" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CalculadoraPrazo
              onPrazoCalculado={(data) => {
                toast.success(`Prazo calculado: ${data}`);
              }}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Como funciona</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-semibold">Regras aplicadas:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      <strong>Prazo em dobro</strong> para Defensoria Pública
                      (art. 186 CPC / art. 5º LC 80/94)
                    </li>
                    <li>
                      <strong>Tempo de leitura</strong>: 10 dias após expedição
                      da intimação (configurável)
                    </li>
                    <li>
                      <strong>Criminal</strong>: prazo em dias corridos
                    </li>
                    <li>
                      <strong>Cível/Trabalhista</strong>: prazo em dias úteis
                    </li>
                    <li>
                      <strong>Prorrogação automática</strong> para primeiro dia
                      útil se vencer em feriado/fim de semana
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Feriados considerados:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Feriados nacionais fixos e móveis (Páscoa, Carnaval, etc.)</li>
                    <li>Recesso forense (20/12 a 06/01)</li>
                    <li>Feriados estaduais e municipais cadastrados</li>
                  </ul>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-blue-800 dark:text-blue-200">
                    <strong>Dica:</strong> Ao criar uma demanda, use a
                    calculadora integrada para definir o prazo automaticamente
                    baseado no tipo de ato.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dashboard de Prazos Críticos */}
        <TabsContent value="criticos" className="mt-6">
          <DashboardPrazos />
        </TabsContent>

        {/* Configurações - Tipos de Prazo */}
        <TabsContent value="configuracoes" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tipos de Prazo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Tipos de Prazo Cadastrados
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                  >
                    {seedMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Carregar Padrões
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTipos ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : !tiposPrazo?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum tipo de prazo cadastrado</p>
                    <p className="text-sm">
                      Clique em &quot;Carregar Padrões&quot; para importar os tipos comuns
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {tiposPrazo.map((tipo) => (
                      <div
                        key={tipo.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{tipo.nome}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({tipo.codigo})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                              {tipo.prazoLegalDias} dias
                            </span>
                            {tipo.aplicarDobroDefensoria && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                x2
                              </span>
                            )}
                          </div>
                        </div>
                        {tipo.descricao && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {tipo.descricao}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {tipo.areaDireito}
                          </span>
                          {tipo.categoria && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                              {tipo.categoria}
                            </span>
                          )}
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                            {tipo.contarEmDiasUteis ? "Dias úteis" : "Dias corridos"}
                          </span>
                          {tipo.tempoLeituraDias && tipo.tempoLeituraDias > 0 && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">
                              +{tipo.tempoLeituraDias}d leitura
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info sobre configurações */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sobre o Cálculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    Fluxo do Cálculo
                  </h4>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>
                      <strong>Data de Expedição</strong>: quando o tribunal expediu a intimação
                    </li>
                    <li>
                      <strong>+ Tempo de Leitura</strong>: 10 dias (ganho de tempo por não abrir)
                    </li>
                    <li>
                      <strong>= Data de Leitura</strong>: quando presume-se a ciência
                    </li>
                    <li>
                      <strong>+ Prazo Legal x 2</strong>: prazo em dobro para Defensoria
                    </li>
                    <li>
                      <strong>= Prazo Fatal</strong>: ajustado para próximo dia útil se necessário
                    </li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    Tipos de Prazo
                  </h4>
                  <p>
                    Os tipos de prazo são templates que definem automaticamente:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Quantidade de dias do prazo legal</li>
                    <li>Se aplica prazo em dobro para Defensoria</li>
                    <li>Se conta em dias úteis ou corridos</li>
                    <li>Tempo de leitura padrão</li>
                  </ul>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-800 dark:text-amber-200">
                    <strong>Importante:</strong> Os cálculos são auxiliares.
                    Sempre confira os prazos oficiais no sistema do tribunal.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
