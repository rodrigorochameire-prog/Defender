"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Calculator,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
  Scale,
  Timer,
  TrendingUp,
} from "lucide-react";
import { addDays, addMonths, addYears, differenceInDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos
interface ProgressaoResult {
  regime: string;
  fracao: string;
  diasNecessarios: number;
  diasCumpridos: number;
  diasRestantes: number;
  dataProgressao: Date;
  percentualCumprido: number;
}

interface PrescricaoResult {
  prazoAnos: number;
  dataInicio: Date;
  dataFim: Date;
  diasRestantes: number;
  prescrito: boolean;
}

interface LivramentoResult {
  fracao: string;
  diasNecessarios: number;
  diasCumpridos: number;
  diasRestantes: number;
  dataLivramento: Date;
  percentualCumprido: number;
}

// Funções de cálculo
function calcularProgressao(
  penaTotal: number, // em dias
  diasCumpridos: number,
  regimeAtual: "fechado" | "semiaberto" | "aberto",
  reincidente: boolean,
  crimeHediondo: boolean,
  primario: boolean
): ProgressaoResult | null {
  let fracao = 0;
  let fracaoLabel = "";
  let proximoRegime = "";

  if (regimeAtual === "fechado") {
    proximoRegime = "Semiaberto";
    if (crimeHediondo) {
      if (primario) {
        fracao = 0.4; // 2/5
        fracaoLabel = "2/5 (40%)";
      } else {
        fracao = 0.6; // 3/5
        fracaoLabel = "3/5 (60%)";
      }
    } else {
      if (primario) {
        fracao = 1/6;
        fracaoLabel = "1/6 (16,67%)";
      } else {
        fracao = 0.25; // 1/4
        fracaoLabel = "1/4 (25%)";
      }
    }
  } else if (regimeAtual === "semiaberto") {
    proximoRegime = "Aberto";
    if (crimeHediondo) {
      if (primario) {
        fracao = 0.4;
        fracaoLabel = "2/5 (40%)";
      } else {
        fracao = 0.6;
        fracaoLabel = "3/5 (60%)";
      }
    } else {
      if (primario) {
        fracao = 1/6;
        fracaoLabel = "1/6 (16,67%)";
      } else {
        fracao = 0.25;
        fracaoLabel = "1/4 (25%)";
      }
    }
  } else {
    return null; // Já está no aberto
  }

  const diasNecessarios = Math.ceil(penaTotal * fracao);
  const diasRestantes = Math.max(0, diasNecessarios - diasCumpridos);
  const percentualCumprido = Math.min(100, (diasCumpridos / diasNecessarios) * 100);
  const dataProgressao = addDays(new Date(), diasRestantes);

  return {
    regime: proximoRegime,
    fracao: fracaoLabel,
    diasNecessarios,
    diasCumpridos,
    diasRestantes,
    dataProgressao,
    percentualCumprido,
  };
}

function calcularPrescricao(
  penaAnos: number,
  penaMaxima: boolean,
  dataInicio: Date
): PrescricaoResult {
  // Tabela de prescrição (Art. 109 CP)
  let prazoAnos = 0;
  const pena = penaMaxima ? penaAnos : penaAnos;

  if (pena < 1) prazoAnos = 3;
  else if (pena < 2) prazoAnos = 4;
  else if (pena < 4) prazoAnos = 8;
  else if (pena < 8) prazoAnos = 12;
  else if (pena < 12) prazoAnos = 16;
  else prazoAnos = 20;

  const dataFim = addYears(dataInicio, prazoAnos);
  const diasRestantes = differenceInDays(dataFim, new Date());
  const prescrito = diasRestantes <= 0;

  return {
    prazoAnos,
    dataInicio,
    dataFim,
    diasRestantes,
    prescrito,
  };
}

function calcularLivramento(
  penaTotal: number,
  diasCumpridos: number,
  reincidente: boolean,
  crimeHediondo: boolean
): LivramentoResult {
  let fracao = 0;
  let fracaoLabel = "";

  if (crimeHediondo) {
    fracao = 2/3;
    fracaoLabel = "2/3 (66,67%)";
  } else if (reincidente) {
    fracao = 0.5;
    fracaoLabel = "1/2 (50%)";
  } else {
    fracao = 1/3;
    fracaoLabel = "1/3 (33,33%)";
  }

  const diasNecessarios = Math.ceil(penaTotal * fracao);
  const diasRestantes = Math.max(0, diasNecessarios - diasCumpridos);
  const percentualCumprido = Math.min(100, (diasCumpridos / diasNecessarios) * 100);
  const dataLivramento = addDays(new Date(), diasRestantes);

  return {
    fracao: fracaoLabel,
    diasNecessarios,
    diasCumpridos,
    diasRestantes,
    dataLivramento,
    percentualCumprido,
  };
}

// Componente de gráfico circular de progresso
function ProgressRing({ 
  percentage, 
  size = 160, 
  strokeWidth = 12,
  color = "hsl(158, 64%, 28%)"
}: { 
  percentage: number; 
  size?: number; 
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="calc-progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          className="track"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="progress"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="value">
        <span className="text-3xl font-bold">{Math.round(percentage)}%</span>
        <span className="text-xs text-muted-foreground">cumprido</span>
      </div>
    </div>
  );
}

// Componente de resultado
function ResultCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  variant = "default"
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantStyles = {
    default: "bg-muted/50",
    success: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    warning: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    danger: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-red-600",
  };

  return (
    <div className={`p-4 rounded-xl border ${variantStyles[variant]}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-background`}>
          <Icon className={`h-5 w-5 ${iconStyles[variant]}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-lg font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export default function CalculadorasPage() {
  const [activeTab, setActiveTab] = useState("progressao");

  // Estado para Progressão
  const [penaAnos, setPenaAnos] = useState(6);
  const [penaMeses, setPenaMeses] = useState(0);
  const [penaDias, setPenaDias] = useState(0);
  const [diasCumpridos, setDiasCumpridos] = useState(365);
  const [regimeAtual, setRegimeAtual] = useState<"fechado" | "semiaberto" | "aberto">("fechado");
  const [reincidente, setReincidente] = useState(false);
  const [crimeHediondo, setCrimeHediondo] = useState(false);

  // Estado para Prescrição
  const [penaMaximaAnos, setPenaMaximaAnos] = useState(12);
  const [dataFato, setDataFato] = useState(format(new Date(), "yyyy-MM-dd"));

  // Cálculos
  const penaTotalDias = useMemo(() => {
    return (penaAnos * 365) + (penaMeses * 30) + penaDias;
  }, [penaAnos, penaMeses, penaDias]);

  const progressaoResult = useMemo(() => {
    return calcularProgressao(
      penaTotalDias,
      diasCumpridos,
      regimeAtual,
      reincidente,
      crimeHediondo,
      !reincidente
    );
  }, [penaTotalDias, diasCumpridos, regimeAtual, reincidente, crimeHediondo]);

  const livramentoResult = useMemo(() => {
    return calcularLivramento(
      penaTotalDias,
      diasCumpridos,
      reincidente,
      crimeHediondo
    );
  }, [penaTotalDias, diasCumpridos, reincidente, crimeHediondo]);

  const prescricaoResult = useMemo(() => {
    return calcularPrescricao(
      penaMaximaAnos,
      true,
      parseISO(dataFato)
    );
  }, [penaMaximaAnos, dataFato]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calculadoras</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ferramentas para cálculo de prazos penais e execução
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="progressao" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Progressão de Regime
          </TabsTrigger>
          <TabsTrigger value="prescricao" className="gap-2">
            <Timer className="h-4 w-4" />
            Prescrição
          </TabsTrigger>
          <TabsTrigger value="livramento" className="gap-2">
            <Scale className="h-4 w-4" />
            Livramento Condicional
          </TabsTrigger>
        </TabsList>

        {/* Tab: Progressão de Regime */}
        <TabsContent value="progressao" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Formulário */}
            <Card className="section-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Dados da Pena
                </CardTitle>
                <CardDescription>Insira os dados para calcular a progressão</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Pena Total */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Pena Total</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Anos</Label>
                      <Input
                        type="number"
                        min={0}
                        value={penaAnos}
                        onChange={(e) => setPenaAnos(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Meses</Label>
                      <Input
                        type="number"
                        min={0}
                        max={11}
                        value={penaMeses}
                        onChange={(e) => setPenaMeses(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Dias</Label>
                      <Input
                        type="number"
                        min={0}
                        max={29}
                        value={penaDias}
                        onChange={(e) => setPenaDias(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Total: {penaTotalDias} dias
                  </p>
                </div>

                {/* Dias Cumpridos */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Tempo Cumprido (dias)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={diasCumpridos}
                    onChange={(e) => setDiasCumpridos(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor(diasCumpridos / 365)} anos, {Math.floor((diasCumpridos % 365) / 30)} meses e {diasCumpridos % 30} dias
                  </p>
                </div>

                {/* Regime Atual */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Regime Atual</Label>
                  <Select value={regimeAtual} onValueChange={(v: "fechado" | "semiaberto" | "aberto") => setRegimeAtual(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fechado">Fechado</SelectItem>
                      <SelectItem value="semiaberto">Semiaberto</SelectItem>
                      <SelectItem value="aberto">Aberto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Switches */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Reincidente</Label>
                      <p className="text-xs text-muted-foreground">Condenação anterior transitada</p>
                    </div>
                    <Switch checked={reincidente} onCheckedChange={setReincidente} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">Crime Hediondo</Label>
                      <p className="text-xs text-muted-foreground">Lei 8.072/90</p>
                    </div>
                    <Switch checked={crimeHediondo} onCheckedChange={setCrimeHediondo} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resultado */}
            <Card className="section-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-base">Resultado</CardTitle>
                <CardDescription>Cálculo da progressão de regime</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {progressaoResult ? (
                  <div className="space-y-6">
                    {/* Gráfico de Progresso */}
                    <div className="flex justify-center">
                      <ProgressRing 
                        percentage={progressaoResult.percentualCumprido}
                        color={progressaoResult.percentualCumprido >= 100 ? "hsl(158, 64%, 28%)" : "hsl(25, 85%, 50%)"}
                      />
                    </div>

                    {/* Info Cards */}
                    <div className="grid gap-3">
                      <ResultCard
                        title="Próximo Regime"
                        value={progressaoResult.regime}
                        subtitle={`Fração: ${progressaoResult.fracao}`}
                        icon={TrendingUp}
                        variant="default"
                      />
                      
                      <ResultCard
                        title="Dias Necessários"
                        value={`${progressaoResult.diasNecessarios} dias`}
                        subtitle={`${Math.floor(progressaoResult.diasNecessarios / 365)}a ${Math.floor((progressaoResult.diasNecessarios % 365) / 30)}m`}
                        icon={Clock}
                        variant="default"
                      />
                      
                      {progressaoResult.diasRestantes > 0 ? (
                        <ResultCard
                          title="Dias Restantes"
                          value={`${progressaoResult.diasRestantes} dias`}
                          subtitle={`Previsão: ${format(progressaoResult.dataProgressao, "dd/MM/yyyy", { locale: ptBR })}`}
                          icon={Timer}
                          variant="warning"
                        />
                      ) : (
                        <ResultCard
                          title="Status"
                          value="Lapso Cumprido!"
                          subtitle="Já possui direito à progressão"
                          icon={CheckCircle2}
                          variant="success"
                        />
                      )}
                    </div>

                    {/* Alerta */}
                    {progressaoResult.diasRestantes <= 30 && progressaoResult.diasRestantes > 0 && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Atenção: Lapso próximo!
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Faltam apenas {progressaoResult.diasRestantes} dias para completar o requisito objetivo.
                            Considere preparar o pedido de progressão.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Info className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground">
                      {regimeAtual === "aberto" 
                        ? "Já está no regime aberto, não há progressão disponível."
                        : "Preencha os dados para calcular a progressão."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Prescrição */}
        <TabsContent value="prescricao" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Formulário */}
            <Card className="section-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-base flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  Dados para Cálculo
                </CardTitle>
                <CardDescription>Insira os dados para calcular a prescrição</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Pena Máxima */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Pena Máxima em Abstrato (anos)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={penaMaximaAnos}
                    onChange={(e) => setPenaMaximaAnos(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Pena máxima cominada ao delito
                  </p>
                </div>

                {/* Data do Fato */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Data do Fato/Marco Inicial</Label>
                  <Input
                    type="date"
                    value={dataFato}
                    onChange={(e) => setDataFato(e.target.value)}
                  />
                </div>

                {/* Tabela de Referência */}
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs font-semibold mb-3">Tabela de Prescrição (Art. 109 CP)</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Pena &lt; 1 ano: 3 anos</p>
                    <p>Pena 1-2 anos: 4 anos</p>
                    <p>Pena 2-4 anos: 8 anos</p>
                    <p>Pena 4-8 anos: 12 anos</p>
                    <p>Pena 8-12 anos: 16 anos</p>
                    <p>Pena &gt; 12 anos: 20 anos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resultado */}
            <Card className="section-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-base">Resultado</CardTitle>
                <CardDescription>Cálculo da prescrição</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Status */}
                  {prescricaoResult.prescrito ? (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                          Prescrito!
                        </p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                          O prazo prescricional já transcorreu.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Em curso
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                          O prazo prescricional ainda não transcorreu.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Info Cards */}
                  <div className="grid gap-3">
                    <ResultCard
                      title="Prazo Prescricional"
                      value={`${prescricaoResult.prazoAnos} anos`}
                      subtitle="Conforme Art. 109 CP"
                      icon={Timer}
                      variant="default"
                    />
                    
                    <ResultCard
                      title="Data Inicial"
                      value={format(prescricaoResult.dataInicio, "dd/MM/yyyy", { locale: ptBR })}
                      subtitle="Marco inicial da contagem"
                      icon={Calendar}
                      variant="default"
                    />
                    
                    <ResultCard
                      title="Data Final"
                      value={format(prescricaoResult.dataFim, "dd/MM/yyyy", { locale: ptBR })}
                      subtitle={prescricaoResult.prescrito ? "Já transcorreu" : `Faltam ${prescricaoResult.diasRestantes} dias`}
                      icon={Calendar}
                      variant={prescricaoResult.prescrito ? "success" : "warning"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Livramento Condicional */}
        <TabsContent value="livramento" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Formulário (reutiliza os mesmos campos) */}
            <Card className="section-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Dados da Pena
                </CardTitle>
                <CardDescription>Os dados são compartilhados com a progressão</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    <strong>Pena Total:</strong> {penaAnos}a {penaMeses}m {penaDias}d ({penaTotalDias} dias)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Dias Cumpridos:</strong> {diasCumpridos} dias
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Reincidente:</strong> {reincidente ? "Sim" : "Não"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <strong>Crime Hediondo:</strong> {crimeHediondo ? "Sim" : "Não"}
                  </p>
                </div>

                {/* Requisitos */}
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-xs font-semibold mb-3">Frações para Livramento (Art. 83 CP)</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Primário: 1/3 (33,33%)</p>
                    <p>Reincidente: 1/2 (50%)</p>
                    <p>Crime Hediondo: 2/3 (66,67%)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resultado */}
            <Card className="section-card">
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-base">Resultado</CardTitle>
                <CardDescription>Cálculo do livramento condicional</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {/* Gráfico de Progresso */}
                  <div className="flex justify-center">
                    <ProgressRing 
                      percentage={livramentoResult.percentualCumprido}
                      color={livramentoResult.percentualCumprido >= 100 ? "hsl(158, 64%, 28%)" : "hsl(200, 70%, 50%)"}
                    />
                  </div>

                  {/* Info Cards */}
                  <div className="grid gap-3">
                    <ResultCard
                      title="Fração Aplicável"
                      value={livramentoResult.fracao}
                      subtitle={crimeHediondo ? "Crime hediondo" : reincidente ? "Reincidente" : "Primário"}
                      icon={Scale}
                      variant="default"
                    />
                    
                    <ResultCard
                      title="Dias Necessários"
                      value={`${livramentoResult.diasNecessarios} dias`}
                      subtitle={`${Math.floor(livramentoResult.diasNecessarios / 365)}a ${Math.floor((livramentoResult.diasNecessarios % 365) / 30)}m`}
                      icon={Clock}
                      variant="default"
                    />
                    
                    {livramentoResult.diasRestantes > 0 ? (
                      <ResultCard
                        title="Dias Restantes"
                        value={`${livramentoResult.diasRestantes} dias`}
                        subtitle={`Previsão: ${format(livramentoResult.dataLivramento, "dd/MM/yyyy", { locale: ptBR })}`}
                        icon={Timer}
                        variant="warning"
                      />
                    ) : (
                      <ResultCard
                        title="Status"
                        value="Lapso Cumprido!"
                        subtitle="Já possui direito ao livramento"
                        icon={CheckCircle2}
                        variant="success"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
