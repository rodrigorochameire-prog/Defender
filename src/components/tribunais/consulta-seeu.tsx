"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Gavel,
  Loader2,
  MapPin,
  RefreshCw,
  Scale,
  Search,
  User,
  Timer,
  TrendingUp,
  Shield,
  BookOpen,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  consultarSEEU,
  formatarPena,
  SEEU_URLS,
  type ConsultaSEEUResult,
  type RequisitoProgressao,
  type BeneficioExecucao,
} from "@/lib/services/tribunais/seeu-integration";

interface ConsultaSEEUProps {
  numeroInicial?: string;
  onDadosCarregados?: (dados: ConsultaSEEUResult) => void;
}

export function ConsultaSEEU({ numeroInicial = "", onDadosCarregados }: ConsultaSEEUProps) {
  const [numeroExecucao, setNumeroExecucao] = useState(numeroInicial);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ConsultaSEEUResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const handleConsultar = async () => {
    if (!numeroExecucao.trim()) {
      setErro("Informe o número da execução penal");
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const result = await consultarSEEU(numeroExecucao);
      setResultado(result);
      onDadosCarregados?.(result);
    } catch (error) {
      setErro("Erro ao consultar SEEU. Verifique a conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getRegimeBadge = (regime: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      fechado: { color: "bg-red-100 text-red-700 dark:bg-red-900/30", label: "Fechado" },
      semiaberto: {
        color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30",
        label: "Semiaberto",
      },
      aberto: { color: "bg-green-100 text-green-700 dark:bg-green-900/30", label: "Aberto" },
      livramento: {
        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30",
        label: "Livramento Condicional",
      },
    };
    const config = configs[regime] || configs.fechado;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getSituacaoBadge = (situacao: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode }> = {
      ativo: { color: "text-green-600", icon: <CheckCircle2 className="h-4 w-4" /> },
      suspenso: { color: "text-amber-600", icon: <AlertTriangle className="h-4 w-4" /> },
      extinto: { color: "text-gray-500", icon: <CheckCircle2 className="h-4 w-4" /> },
      evadido: { color: "text-red-600", icon: <AlertCircle className="h-4 w-4" /> },
    };
    const config = configs[situacao] || configs.ativo;
    return (
      <div className={`flex items-center gap-1 ${config.color}`}>
        {config.icon}
        <span className="capitalize">{situacao}</span>
      </div>
    );
  };

  const getBeneficioStatusBadge = (status: BeneficioExecucao["status"]) => {
    const configs: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pendente: { variant: "outline" },
      deferido: { variant: "default" },
      indeferido: { variant: "destructive" },
      "em-analise": { variant: "secondary" },
    };
    const config = configs[status];
    return <Badge variant={config.variant}>{status.replace("-", " ")}</Badge>;
  };

  const renderRequisitoCard = (requisito: RequisitoProgressao, index: number) => {
    const diasRestantes = requisito.diasNecessarios - requisito.diasCumpridos;
    const isPreenchido = requisito.preenchido;

    return (
      <Card
        key={index}
        className={isPreenchido ? "border-green-400 bg-green-50/50 dark:bg-green-950/20" : ""}
      >
        <CardContent className="py-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant={isPreenchido ? "default" : "secondary"}>{requisito.tipo}</Badge>
              {isPreenchido && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            </div>
            <span className="text-sm font-medium">
              {requisito.percentualCumprido.toFixed(1)}%
            </span>
          </div>

          <p className="text-sm mb-2">{requisito.descricao}</p>

          <Progress value={requisito.percentualCumprido} className="h-2 mb-2" />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {formatarPena(requisito.diasCumpridos)} cumpridos
            </span>
            <span>
              {formatarPena(requisito.diasNecessarios)} necessários
            </span>
          </div>

          {!isPreenchido && diasRestantes > 0 && (
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <Timer className="h-4 w-4" />
                <span>
                  Faltam <strong>{formatarPena(diasRestantes)}</strong> para preenchimento
                </span>
              </div>
              {requisito.dataPreenchimento && (
                <p className="text-xs text-amber-600 mt-1">
                  Data prevista: {format(requisito.dataPreenchimento, "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          )}

          {requisito.observacoes && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              {requisito.observacoes}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-purple-600" />
          Consulta SEEU - Execução Penal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário de busca */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label>Número da Execução Penal</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="0000000-00.0000.0.00.0000"
                value={numeroExecucao}
                onChange={(e) => setNumeroExecucao(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handleConsultar} disabled={loading || !numeroExecucao}>
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
            <Button variant="outline" asChild>
              <a href={SEEU_URLS.login} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                SEEU
              </a>
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
        {resultado?.success && resultado.dadosExecucao && (
          <div className="space-y-4">
            {/* Dados do Apenado */}
            <Card className="bg-purple-50 dark:bg-purple-950/30">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                      <User className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{resultado.dadosExecucao.assistido.nome}</h3>
                      <p className="text-sm text-muted-foreground">
                        CPF: {resultado.dadosExecucao.assistido.cpf || "Não informado"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getRegimeBadge(resultado.dadosExecucao.regime)}
                    <div className="mt-1">{getSituacaoBadge(resultado.dadosExecucao.situacao)}</div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Processo</p>
                    <p className="font-medium">{resultado.dadosExecucao.numeroProcesso}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Execução</p>
                    <p className="font-medium">{resultado.dadosExecucao.numeroExecucao}</p>
                  </div>
                  <div className="flex items-start gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground text-xs">Estabelecimento</p>
                      <p className="font-medium">{resultado.dadosExecucao.estabelecimento}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    <Gavel className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground text-xs">Vara</p>
                      <p className="font-medium">{resultado.dadosExecucao.vara}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cálculo de Pena */}
            {resultado.calculoPena && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Cálculo de Pena
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatarPena(resultado.calculoPena.penaTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">Pena Total</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {formatarPena(resultado.calculoPena.diasCumpridos)}
                      </p>
                      <p className="text-xs text-muted-foreground">Cumpridos</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {formatarPena(resultado.calculoPena.diasRemidos)}
                      </p>
                      <p className="text-xs text-muted-foreground">Remidos</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        {formatarPena(resultado.calculoPena.penaRestante)}
                      </p>
                      <p className="text-xs text-muted-foreground">Restante</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progresso do cumprimento</span>
                      <span className="font-medium">
                        {(
                          ((resultado.calculoPena.diasCumpridos + resultado.calculoPena.diasRemidos) /
                            resultado.calculoPena.penaTotal) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        ((resultado.calculoPena.diasCumpridos + resultado.calculoPena.diasRemidos) /
                          resultado.calculoPena.penaTotal) *
                        100
                      }
                      className="h-3"
                    />
                  </div>

                  <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Início: {format(resultado.calculoPena.dataInicio, "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Fim previsto:{" "}
                      {format(resultado.calculoPena.dataFimPrevista, "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs de Benefícios e Progressão */}
            <Tabs defaultValue="progressao">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="progressao">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Progressão
                </TabsTrigger>
                <TabsTrigger value="beneficios">
                  <Shield className="h-4 w-4 mr-1" />
                  Benefícios
                </TabsTrigger>
                <TabsTrigger value="faltas">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Faltas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="progressao" className="mt-4 space-y-3">
                {resultado.requisitosProgressao?.map((req, idx) => renderRequisitoCard(req, idx))}

                <Card className="bg-blue-50 dark:bg-blue-950/30">
                  <CardContent className="py-3">
                    <div className="flex items-start gap-2">
                      <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-800 dark:text-blue-200">
                          Fundamentação Legal
                        </p>
                        <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                          Art. 112 da LEP, alterado pela Lei 13.964/2019 (Pacote Anticrime). Os
                          percentuais variam conforme a natureza do crime e a condição do apenado
                          (primário ou reincidente).
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="beneficios" className="mt-4">
                {resultado.beneficios && resultado.beneficios.length > 0 ? (
                  <div className="space-y-3">
                    {resultado.beneficios.map((beneficio) => (
                      <Card key={beneficio.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium capitalize">
                                  {beneficio.tipo.replace("-", " ")}
                                </span>
                                {getBeneficioStatusBadge(beneficio.status)}
                              </div>
                              {beneficio.dataSolicitacao && (
                                <p className="text-xs text-muted-foreground">
                                  Solicitado em:{" "}
                                  {format(beneficio.dataSolicitacao, "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              )}
                              {beneficio.dataDecisao && (
                                <p className="text-xs text-muted-foreground">
                                  Decisão em:{" "}
                                  {format(beneficio.dataDecisao, "dd/MM/yyyy", { locale: ptBR })}
                                </p>
                              )}
                              {beneficio.observacoes && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {beneficio.observacoes}
                                </p>
                              )}
                            </div>
                            {beneficio.dataPreenchimentoRequisitos && beneficio.status === "pendente" && (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  Requisitos preenchidos em:
                                </p>
                                <p className="text-sm font-medium">
                                  {format(beneficio.dataPreenchimentoRequisitos, "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Nenhum benefício registrado</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="faltas" className="mt-4">
                {resultado.faltas && resultado.faltas.length > 0 ? (
                  <div className="space-y-3">
                    {resultado.faltas.map((falta) => (
                      <Card key={falta.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant={
                                    falta.tipo === "grave"
                                      ? "destructive"
                                      : falta.tipo === "media"
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {falta.tipo}
                                </Badge>
                                <span className="text-sm">
                                  {format(falta.data, "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                              </div>
                              <p className="text-sm">{falta.descricao}</p>
                              {falta.decisao && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Decisão: {falta.decisao}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={
                                falta.statusPAD === "concluido"
                                  ? "default"
                                  : falta.statusPAD === "em-andamento"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              PAD {falta.statusPAD.replace("-", " ")}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
                    <p>Nenhuma falta disciplinar registrada</p>
                    <p className="text-xs mt-1">Bom comportamento carcerário</p>
                  </div>
                )}

                <Card className="bg-amber-50 dark:bg-amber-950/30 mt-4">
                  <CardContent className="py-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          Impacto das Faltas Graves
                        </p>
                        <ul className="text-amber-700 dark:text-amber-300 text-xs mt-1 space-y-1">
                          <li>
                            • <strong>Progressão:</strong> Interrompe contagem (Súmula 534 STJ)
                          </li>
                          <li>
                            • <strong>Indulto/Comutação:</strong> NÃO interrompe (Súmula 535 STJ)
                          </li>
                          <li>
                            • <strong>PAD:</strong> Obrigatório com defesa técnica (Súmula 533 STJ)
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Última atualização */}
            {resultado.calculoPena?.ultimaAtualizacao && (
              <div className="flex items-center justify-between pt-4 border-t text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Última atualização:{" "}
                  {format(resultado.calculoPena.ultimaAtualizacao, "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
                <Button variant="ghost" size="sm" onClick={handleConsultar}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Atualizar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Estado inicial */}
        {!resultado && !loading && !erro && (
          <div className="text-center py-8 text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Insira o número da execução penal para consultar</p>
            <p className="text-xs mt-1">
              Sistema Eletrônico de Execução Unificado (SEEU) - CNJ
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
