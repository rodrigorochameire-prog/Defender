"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calculator,
  Calendar,
  Clock,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CalculadoraPrazoProps {
  onPrazoCalculado?: (data: string) => void;
  demandaId?: number;
  atoInicial?: string;
  areaDireitoInicial?: "CRIMINAL" | "CIVEL" | "TRABALHISTA" | "EXECUCAO_PENAL" | "JURI";
  className?: string;
  compact?: boolean;
}

export function CalculadoraPrazo({
  onPrazoCalculado,
  demandaId,
  atoInicial,
  areaDireitoInicial = "CRIMINAL",
  className,
  compact = false,
}: CalculadoraPrazoProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [tipoPrazoCodigo, setTipoPrazoCodigo] = useState<string>("");
  const [prazoManual, setPrazoManual] = useState<number>(15);
  const [dataExpedicao, setDataExpedicao] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [dataLeitura, setDataLeitura] = useState<string>("");
  const [usarDataLeitura, setUsarDataLeitura] = useState(false);
  const [aplicarDobro, setAplicarDobro] = useState(true);
  const [tempoLeitura, setTempoLeitura] = useState(10);
  const [areaDireito, setAreaDireito] = useState<string>(areaDireitoInicial);
  const [resultado, setResultado] = useState<any>(null);

  // Buscar tipos de prazo
  const { data: tiposPrazo, isLoading: loadingTipos } = trpc.prazos.listTiposPrazo.useQuery({
    areaDireito: areaDireito as any,
    apenasAtivos: true,
  });

  // Mutation para calcular
  const calcularMutation = trpc.prazos.calcularPrazo.useMutation({
    onSuccess: (data) => {
      setResultado(data);
      if (onPrazoCalculado) {
        onPrazoCalculado(data.dataTermoFinal);
      }
    },
  });

  // Atualizar área quando prop mudar
  useEffect(() => {
    if (areaDireitoInicial) {
      setAreaDireito(areaDireitoInicial);
    }
  }, [areaDireitoInicial]);

  // Auto-selecionar tipo de prazo baseado no ato
  useEffect(() => {
    if (atoInicial && tiposPrazo) {
      const atoNormalizado = atoInicial.toLowerCase();
      const tipoMatch = tiposPrazo.find(
        (t) =>
          t.nome.toLowerCase().includes(atoNormalizado) ||
          atoNormalizado.includes(t.nome.toLowerCase())
      );
      if (tipoMatch) {
        setTipoPrazoCodigo(tipoMatch.codigo);
      }
    }
  }, [atoInicial, tiposPrazo]);

  const handleCalcular = () => {
    calcularMutation.mutate({
      tipoPrazoCodigo: tipoPrazoCodigo || undefined,
      prazoBaseDias: !tipoPrazoCodigo ? prazoManual : undefined,
      dataExpedicao,
      dataLeitura: usarDataLeitura ? dataLeitura : undefined,
      areaDireito: areaDireito as any,
      aplicarDobro,
      tempoLeituraDias: tempoLeitura,
      demandaId,
      salvarHistorico: !!demandaId,
    });
  };

  const tipoSelecionado = tiposPrazo?.find((t) => t.codigo === tipoPrazoCodigo);

  // Versão compacta
  if (compact && !expanded) {
    return (
      <div className={cn("border rounded-lg p-3", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Calculadora de Prazo</span>
            {resultado && (
              <Badge variant="outline" className="ml-2">
                {resultado.dataTermoFinal}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(true)}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Prazo
          </CardTitle>
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(false)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tipo de Prazo ou Manual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Ato/Prazo</Label>
            <Select
              value={tipoPrazoCodigo}
              onValueChange={setTipoPrazoCodigo}
              disabled={loadingTipos}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione ou use prazo manual" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Prazo manual</SelectItem>
                {tiposPrazo?.map((tipo) => (
                  <SelectItem key={tipo.codigo} value={tipo.codigo}>
                    {tipo.nome} ({tipo.prazoLegalDias} dias)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!tipoPrazoCodigo && (
            <div className="space-y-2">
              <Label>Prazo Base (dias)</Label>
              <Input
                type="number"
                min={1}
                value={prazoManual}
                onChange={(e) => setPrazoManual(parseInt(e.target.value) || 1)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Área do Direito</Label>
            <Select value={areaDireito} onValueChange={setAreaDireito}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CRIMINAL">Criminal (dias corridos)</SelectItem>
                <SelectItem value="CIVEL">Cível (dias úteis)</SelectItem>
                <SelectItem value="TRABALHISTA">Trabalhista (dias úteis)</SelectItem>
                <SelectItem value="EXECUCAO_PENAL">Execução Penal (dias corridos)</SelectItem>
                <SelectItem value="JURI">Júri (dias corridos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Datas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Data da Expedição
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Data em que a intimação foi expedida pelo tribunal</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              type="date"
              value={dataExpedicao}
              onChange={(e) => setDataExpedicao(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Data da Leitura
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Se já abriu a intimação, informe a data. Senão, será calculado +{tempoLeitura} dias.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={usarDataLeitura}
                  onCheckedChange={setUsarDataLeitura}
                  id="usar-data-leitura"
                />
                <Label htmlFor="usar-data-leitura" className="text-xs text-muted-foreground">
                  Já abri
                </Label>
              </div>
            </div>
            {usarDataLeitura ? (
              <Input
                type="date"
                value={dataLeitura}
                onChange={(e) => setDataLeitura(e.target.value)}
              />
            ) : (
              <div className="h-10 px-3 py-2 border rounded-md bg-muted text-sm text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                +{tempoLeitura} dias após expedição
              </div>
            )}
          </div>
        </div>

        {/* Configurações */}
        <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Switch
              checked={aplicarDobro}
              onCheckedChange={setAplicarDobro}
              id="aplicar-dobro"
            />
            <Label htmlFor="aplicar-dobro" className="text-sm cursor-pointer">
              Prazo em dobro (Defensoria)
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">Tempo de leitura:</Label>
            <Select
              value={tempoLeitura.toString()}
              onValueChange={(v) => setTempoLeitura(parseInt(v))}
            >
              <SelectTrigger className="w-24 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 dias</SelectItem>
                <SelectItem value="5">5 dias</SelectItem>
                <SelectItem value="10">10 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Info do tipo selecionado */}
        {tipoSelecionado && (
          <div className="text-xs text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
            <strong>{tipoSelecionado.nome}</strong>: {tipoSelecionado.descricao}
            <br />
            Prazo legal: {tipoSelecionado.prazoLegalDias} dias
            {tipoSelecionado.aplicarDobroDefensoria && " (em dobro para Defensoria)"}
          </div>
        )}

        {/* Botão Calcular */}
        <Button
          onClick={handleCalcular}
          disabled={calcularMutation.isPending}
          className="w-full"
        >
          {calcularMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Calcular Prazo
            </>
          )}
        </Button>

        {/* Resultado */}
        {resultado && (
          <div className="mt-4 p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
            <div className="flex items-center gap-2 mb-3">
              <Check className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold text-green-800 dark:text-green-200">
                Prazo Calculado
              </h4>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                <div className="text-xs text-muted-foreground">Expedição</div>
                <div className="font-medium">{resultado.dataExpedicao}</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                <div className="text-xs text-muted-foreground">Leitura</div>
                <div className="font-medium">{resultado.dataLeitura}</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                <div className="text-xs text-muted-foreground">Início</div>
                <div className="font-medium">{resultado.dataTermoInicial}</div>
              </div>
              <div className="text-center p-2 bg-green-100 dark:bg-green-900 rounded border-2 border-green-500">
                <div className="text-xs text-green-700 dark:text-green-300 font-medium">PRAZO FATAL</div>
                <div className="font-bold text-lg text-green-800 dark:text-green-200">
                  {resultado.dataTermoFinal}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary">
                {resultado.prazoBaseDias} dias base
              </Badge>
              {resultado.aplicouDobro && (
                <Badge variant="default" className="bg-blue-600">
                  x2 = {resultado.prazoComDobroDias} dias (Defensoria)
                </Badge>
              )}
              <Badge variant="outline">
                {resultado.contadoEmDiasUteis ? "Dias úteis" : "Dias corridos"}
              </Badge>
              {resultado.tempoLeituraAplicado > 0 && !usarDataLeitura && (
                <Badge variant="outline">
                  +{resultado.tempoLeituraAplicado} dias leitura
                </Badge>
              )}
            </div>

            {/* Alertas */}
            {resultado.alertas && resultado.alertas.length > 0 && (
              <div className="text-xs space-y-1 text-muted-foreground border-t pt-2 mt-2">
                {resultado.alertas.map((alerta: string, i: number) => (
                  <div key={i} className="flex items-start gap-1">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{alerta}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Botão para usar o prazo */}
            {onPrazoCalculado && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => onPrazoCalculado(resultado.dataTermoFinal)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Usar este prazo
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente compacto para inline em formulários
export function CalculadoraPrazoInline({
  onPrazoCalculado,
  ato,
  areaDireito = "CRIMINAL",
}: {
  onPrazoCalculado: (data: string) => void;
  ato?: string;
  areaDireito?: "CRIMINAL" | "CIVEL" | "TRABALHISTA" | "EXECUCAO_PENAL" | "JURI";
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Calculator className="h-4 w-4" />
        Calcular prazo automaticamente
      </Button>

      {isOpen && (
        <div className="mt-3">
          <CalculadoraPrazo
            onPrazoCalculado={(data) => {
              onPrazoCalculado(data);
              setIsOpen(false);
            }}
            atoInicial={ato}
            areaDireitoInicial={areaDireito}
            compact
          />
        </div>
      )}
    </div>
  );
}
