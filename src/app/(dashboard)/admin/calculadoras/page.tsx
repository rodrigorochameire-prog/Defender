"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calculator,
  Clock,
  Calendar,
  ArrowRight,
  Info,
} from "lucide-react";
import { addDays, addMonths, addYears, format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CalculadorasPage() {
  const [prescricaoData, setPrescricaoData] = useState({
    penaAnos: "",
    penaMeses: "",
    penaDias: "",
    dataFato: "",
  });

  const [progressaoData, setProgressaoData] = useState({
    penaTotal: "",
    regime: "fechado",
    primario: "sim",
    hediondo: "nao",
    dataPrisao: "",
  });

  const calcularPrescricao = () => {
    const penaEmDias = 
      (parseInt(prescricaoData.penaAnos) || 0) * 365 +
      (parseInt(prescricaoData.penaMeses) || 0) * 30 +
      (parseInt(prescricaoData.penaDias) || 0);
    
    const penaEmAnos = penaEmDias / 365;
    
    let prazo = 3; // mínimo
    if (penaEmAnos > 12) prazo = 20;
    else if (penaEmAnos > 8) prazo = 16;
    else if (penaEmAnos > 4) prazo = 12;
    else if (penaEmAnos > 2) prazo = 8;
    else if (penaEmAnos > 1) prazo = 4;
    
    return prazo;
  };

  const calcularProgressao = () => {
    const penaTotal = parseInt(progressaoData.penaTotal) || 0;
    const primario = progressaoData.primario === "sim";
    const hediondo = progressaoData.hediondo === "sim";
    
    let fracao = 1/6; // padrão primário
    
    if (hediondo) {
      fracao = primario ? 2/5 : 3/5;
    } else if (!primario) {
      fracao = 1/4;
    }
    
    const diasParaProgressao = Math.ceil(penaTotal * fracao);
    
    if (progressaoData.dataPrisao) {
      const dataProgressao = addDays(new Date(progressaoData.dataPrisao), diasParaProgressao);
      return {
        dias: diasParaProgressao,
        data: format(dataProgressao, "dd/MM/yyyy", { locale: ptBR }),
      };
    }
    
    return { dias: diasParaProgressao, data: null };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calculadoras</h1>
        <p className="text-muted-foreground mt-1">
          Ferramentas de cálculo para prescrição, progressão e mais
        </p>
      </div>

      <Tabs defaultValue="prescricao" className="space-y-6">
        <TabsList>
          <TabsTrigger value="prescricao" className="gap-2">
            <Clock className="h-4 w-4" />
            Prescrição
          </TabsTrigger>
          <TabsTrigger value="progressao" className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Progressão
          </TabsTrigger>
          <TabsTrigger value="livramento" className="gap-2">
            <Calendar className="h-4 w-4" />
            Livramento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prescricao">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Cálculo de Prescrição
                </CardTitle>
                <CardDescription>
                  Calcule o prazo prescricional baseado na pena
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Pena (Anos, Meses, Dias)</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <Input
                      type="number"
                      placeholder="Anos"
                      value={prescricaoData.penaAnos}
                      onChange={(e) => setPrescricaoData({...prescricaoData, penaAnos: e.target.value})}
                    />
                    <Input
                      type="number"
                      placeholder="Meses"
                      value={prescricaoData.penaMeses}
                      onChange={(e) => setPrescricaoData({...prescricaoData, penaMeses: e.target.value})}
                    />
                    <Input
                      type="number"
                      placeholder="Dias"
                      value={prescricaoData.penaDias}
                      onChange={(e) => setPrescricaoData({...prescricaoData, penaDias: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Data do Fato</Label>
                  <Input
                    type="date"
                    value={prescricaoData.dataFato}
                    onChange={(e) => setPrescricaoData({...prescricaoData, dataFato: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardHeader>
                <CardTitle>Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                {prescricaoData.penaAnos || prescricaoData.penaMeses || prescricaoData.penaDias ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Prazo Prescricional</p>
                      <p className="text-3xl font-bold text-primary">{calcularPrescricao()} anos</p>
                    </div>
                    {prescricaoData.dataFato && (
                      <div>
                        <p className="text-sm text-muted-foreground">Data da Prescrição</p>
                        <p className="text-xl font-semibold">
                          {format(
                            addYears(new Date(prescricaoData.dataFato), calcularPrescricao()),
                            "dd/MM/yyyy",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Preencha os dados para calcular</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="progressao">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Cálculo de Progressão
                </CardTitle>
                <CardDescription>
                  Calcule a data para progressão de regime
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Pena Total (em dias)</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1825 (5 anos)"
                    value={progressaoData.penaTotal}
                    onChange={(e) => setProgressaoData({...progressaoData, penaTotal: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Regime Atual</Label>
                  <Select
                    value={progressaoData.regime}
                    onValueChange={(v) => setProgressaoData({...progressaoData, regime: v})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fechado">Fechado</SelectItem>
                      <SelectItem value="semiaberto">Semiaberto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Primário?</Label>
                  <Select
                    value={progressaoData.primario}
                    onValueChange={(v) => setProgressaoData({...progressaoData, primario: v})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Crime Hediondo?</Label>
                  <Select
                    value={progressaoData.hediondo}
                    onValueChange={(v) => setProgressaoData({...progressaoData, hediondo: v})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao">Não</SelectItem>
                      <SelectItem value="sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data da Prisão</Label>
                  <Input
                    type="date"
                    value={progressaoData.dataPrisao}
                    onChange={(e) => setProgressaoData({...progressaoData, dataPrisao: e.target.value})}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardHeader>
                <CardTitle>Resultado</CardTitle>
              </CardHeader>
              <CardContent>
                {progressaoData.penaTotal ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Dias para Progressão</p>
                      <p className="text-3xl font-bold text-primary">{calcularProgressao().dias} dias</p>
                    </div>
                    {calcularProgressao().data && (
                      <div>
                        <p className="text-sm text-muted-foreground">Data Prevista</p>
                        <p className="text-xl font-semibold">{calcularProgressao().data}</p>
                      </div>
                    )}
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex gap-2">
                      <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        Este cálculo é uma estimativa. Considere remição e outras variáveis.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Preencha os dados para calcular</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="livramento">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Calculadora de Livramento Condicional</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Em breve: calcule a data de livramento condicional considerando bom comportamento e remição.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
