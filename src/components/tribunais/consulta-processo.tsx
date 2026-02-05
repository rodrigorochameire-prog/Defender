"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Gavel,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  User,
  AlertTriangle,
  Bell,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TRIBUNAIS,
  validarNumeroProcesso,
  formatarNumeroProcesso,
  extrairTribunalDoProcesso,
  analisarMovimentacao,
  type MovimentacaoProcessual,
  type ConsultaProcessoResult,
} from "@/lib/services/tribunais/consulta-tribunal";

interface ConsultaProcessoProps {
  numeroInicial?: string;
  onMovimentacaoDetectada?: (movimentacao: MovimentacaoProcessual) => void;
}

// Dados mockados para demonstração
const MOCK_MOVIMENTACOES: MovimentacaoProcessual[] = [
  {
    id: "1",
    data: new Date(2024, 1, 5),
    descricao: "Intimacao da Defesa para apresentar alegacoes finais no prazo de 5 dias",
    tipo: "intimacao",
    urgente: true,
  },
  {
    id: "2",
    data: new Date(2024, 1, 3),
    descricao: "Juntada de documento - Laudo pericial",
    tipo: "outros",
    urgente: false,
  },
  {
    id: "3",
    data: new Date(2024, 0, 28),
    descricao: "Audiencia de instrucao realizada",
    tipo: "despacho",
    urgente: false,
  },
  {
    id: "4",
    data: new Date(2024, 0, 15),
    descricao: "Despacho: Designo audiencia de instrucao para 28/01/2024",
    tipo: "despacho",
    urgente: false,
  },
  {
    id: "5",
    data: new Date(2024, 0, 10),
    descricao: "Resposta a acusacao apresentada pela Defensoria Publica",
    tipo: "peticao",
    urgente: false,
  },
];

export function ConsultaProcesso({
  numeroInicial = "",
  onMovimentacaoDetectada,
}: ConsultaProcessoProps) {
  const [numero, setNumero] = useState(numeroInicial);
  const [tribunal, setTribunal] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ConsultaProcessoResult | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoProcessual[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Auto-detectar tribunal pelo número do processo
  const handleNumeroChange = (value: string) => {
    setNumero(value);
    setErro(null);

    // Formatar automaticamente
    if (value.replace(/\D/g, "").length === 20) {
      const formatado = formatarNumeroProcesso(value);
      setNumero(formatado);

      // Detectar tribunal
      const tribunalDetectado = extrairTribunalDoProcesso(formatado);
      if (tribunalDetectado) {
        setTribunal(tribunalDetectado);
      }
    }
  };

  const handleConsultar = async () => {
    if (!validarNumeroProcesso(numero)) {
      setErro("Numero do processo invalido. Use o formato CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO");
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      // Por enquanto, usar dados mockados para demonstração
      // Em produção, chamaria: await verificarNovasMovimentacoes(numero)
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simular delay

      // Mock resultado
      setMovimentacoes(MOCK_MOVIMENTACOES);
      setResultado({
        success: true,
        processo: {
          numero,
          classe: "Acao Penal",
          assunto: "Crimes contra o Patrimonio",
          vara: "1a Vara Criminal",
          comarca: "Belo Horizonte",
          situacao: "Em andamento",
          partes: [
            { polo: "ativo", nome: "Ministerio Publico do Estado de Minas Gerais", tipo: "Autor" },
            { polo: "passivo", nome: "Joao da Silva", tipo: "Reu" },
          ],
          movimentacoes: MOCK_MOVIMENTACOES,
          ultimaAtualizacao: new Date(),
        },
      });

      // Verificar intimações urgentes
      MOCK_MOVIMENTACOES.forEach((mov) => {
        if (mov.urgente && onMovimentacaoDetectada) {
          onMovimentacaoDetectada(mov);
        }
      });
    } catch (error) {
      setErro("Erro ao consultar processo. Verifique a conexao e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getTipoIcon = (tipo: MovimentacaoProcessual["tipo"]) => {
    switch (tipo) {
      case "intimacao":
        return <Bell className="h-4 w-4 text-red-500" />;
      case "sentenca":
        return <Gavel className="h-4 w-4 text-purple-500" />;
      case "decisao":
        return <Scale className="h-4 w-4 text-blue-500" />;
      case "despacho":
        return <FileText className="h-4 w-4 text-amber-500" />;
      case "peticao":
        return <FileText className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTipoBadge = (tipo: MovimentacaoProcessual["tipo"]) => {
    const config: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
      intimacao: { label: "Intimacao", variant: "destructive" },
      sentenca: { label: "Sentenca", variant: "default" },
      decisao: { label: "Decisao", variant: "secondary" },
      despacho: { label: "Despacho", variant: "outline" },
      peticao: { label: "Peticao", variant: "outline" },
      outros: { label: "Outros", variant: "outline" },
    };
    const c = config[tipo] || config.outros;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-blue-600" />
          Consulta de Processo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário de busca */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label>Numero do Processo (CNJ)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="0000000-00.0000.0.00.0000"
                value={numero}
                onChange={(e) => handleNumeroChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="w-full md:w-48 space-y-2">
            <Label>Tribunal</Label>
            <Select value={tribunal} onValueChange={setTribunal}>
              <SelectTrigger>
                <SelectValue placeholder="Auto-detectar" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TRIBUNAIS).map((t) => (
                  <SelectItem key={t.id} value={t.sigla}>
                    {t.sigla}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button onClick={handleConsultar} disabled={loading || !numero}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Consultar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">{erro}</p>
          </div>
        )}

        {/* Resultado */}
        {resultado?.success && resultado.processo && (
          <div className="space-y-4">
            {/* Dados do processo */}
            <Card className="bg-blue-50 dark:bg-blue-950/30">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Classe</p>
                    <p className="font-medium">{resultado.processo.classe}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Assunto</p>
                    <p className="font-medium">{resultado.processo.assunto}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Vara</p>
                    <p className="font-medium">{resultado.processo.vara}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Situacao</p>
                    <Badge variant="outline" className="bg-green-100 text-green-700">
                      {resultado.processo.situacao}
                    </Badge>
                  </div>
                </div>

                {/* Partes */}
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resultado.processo.partes.map((parte, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{parte.tipo}:</span>
                      <span className="text-sm font-medium">{parte.nome}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alerta de intimação */}
            {movimentacoes.some((m) => m.urgente) && (
              <Card className="border-red-400 bg-red-50 dark:bg-red-950/30">
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />
                    <div>
                      <p className="font-semibold text-red-800 dark:text-red-200">
                        Intimacao Pendente!
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-300">
                        Ha intimacoes que requerem atencao imediata
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Movimentações */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Movimentacoes Recentes
                </h4>
                <Button variant="ghost" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Atualizar
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {movimentacoes.map((mov) => {
                    const analise = analisarMovimentacao(mov.descricao);

                    return (
                      <Card
                        key={mov.id}
                        className={cn(
                          "transition-all",
                          mov.urgente && "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                        )}
                      >
                        <CardContent className="py-3">
                          <div className="flex items-start gap-3">
                            {getTipoIcon(mov.tipo)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getTipoBadge(mov.tipo)}
                                {mov.urgente && (
                                  <Badge variant="destructive" className="text-xs">
                                    URGENTE
                                  </Badge>
                                )}
                                {analise.prazoSugerido > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Prazo: {analise.prazoSugerido} dias
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm">{mov.descricao}</p>
                              {mov.documentoUrl && (
                                <Button variant="link" size="sm" className="h-auto p-0 mt-1">
                                  <Download className="h-3 w-3 mr-1" />
                                  Baixar documento
                                </Button>
                              )}
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {format(mov.data, "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Link externo */}
            <div className="flex justify-end">
              <Button variant="outline" asChild>
                <a
                  href={`${TRIBUNAIS[tribunal]?.url || "#"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir no {tribunal || "Tribunal"}
                </a>
              </Button>
            </div>
          </div>
        )}

        {/* Estado inicial */}
        {!resultado && !loading && !erro && (
          <div className="text-center py-8 text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Insira o numero do processo para consultar movimentacoes</p>
            <p className="text-xs mt-1">
              Formato CNJ: 0000000-00.0000.0.00.0000
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
