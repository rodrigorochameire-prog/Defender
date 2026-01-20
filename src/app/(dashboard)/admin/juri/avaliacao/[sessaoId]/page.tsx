"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ClipboardCheck,
  Users,
  MessageSquare,
  Scale,
  Gavel,
  Eye,
  Save,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Target,
  Lightbulb,
  BarChart3,
} from "lucide-react";

// Componente de escala de 1 a 10
function RatingScale({ 
  value, 
  onChange, 
  label,
  lowLabel = "Baixa",
  highLabel = "Alta"
}: { 
  value: number | null; 
  onChange: (value: number) => void; 
  label?: string;
  lowLabel?: string;
  highLabel?: string;
}) {
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground w-12">{lowLabel}</span>
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => onChange(num)}
              className={`flex-1 h-8 rounded text-xs font-medium transition-colors ${
                value === num
                  ? num <= 3
                    ? "bg-red-500 text-white"
                    : num <= 6
                    ? "bg-amber-500 text-white"
                    : "bg-emerald-500 text-white"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground w-12 text-right">{highLabel}</span>
      </div>
    </div>
  );
}

// Componente de seleção de tendência de voto
function TendenciaVotoSelect({
  tendencia,
  confianca,
  onTendenciaChange,
  onConfiancaChange,
}: {
  tendencia: string;
  confianca: string;
  onTendenciaChange: (value: string) => void;
  onConfiancaChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-xs">Tendência</Label>
        <Select value={tendencia} onValueChange={onTendenciaChange}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CONDENAR">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Condenar
              </span>
            </SelectItem>
            <SelectItem value="ABSOLVER">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Absolver
              </span>
            </SelectItem>
            <SelectItem value="INDECISO">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Indeciso
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Confiança</Label>
        <Select value={confianca} onValueChange={onConfiancaChange}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BAIXA">Baixa</SelectItem>
            <SelectItem value="MEDIA">Média</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Estado inicial dos jurados
const initialJurados = Array.from({ length: 7 }, (_, i) => ({
  posicao: i + 1,
  nome: "",
  profissao: "",
  idadeAproximada: "",
  sexo: "",
  aparenciaPrimeiraImpressao: "",
  linguagemCorporalInicial: "",
  tendenciaVoto: "",
  nivelConfianca: "",
  justificativaTendencia: "",
  anotacoesInterrogatorio: "",
  anotacoesMp: "",
  anotacoesDefesa: "",
  anotacoesGerais: "",
}));

// Estado inicial das testemunhas
const initialTestemunhas = Array.from({ length: 5 }, (_, i) => ({
  ordem: i + 1,
  nome: "",
  resumoDepoimento: "",
  reacaoJurados: "",
  expressoesFaciaisLinguagem: "",
  credibilidade: null as number | null,
  observacoesComplementares: "",
}));

// Estado inicial dos argumentos
const initialArgumentos = {
  mp: Array.from({ length: 3 }, (_, i) => ({
    ordem: i + 1,
    descricaoArgumento: "",
    reacaoJurados: "",
    nivelPersuasao: null as number | null,
  })),
  defesa: Array.from({ length: 3 }, (_, i) => ({
    ordem: i + 1,
    descricaoArgumento: "",
    reacaoJurados: "",
    nivelPersuasao: null as number | null,
  })),
};

export default function AvaliacaoJuriPage() {
  const params = useParams();
  const sessaoId = params.sessaoId;
  
  const [activeTab, setActiveTab] = useState("contexto");
  const [isSaving, setIsSaving] = useState(false);

  // Estados do formulário
  const [contexto, setContexto] = useState({
    observador: "",
    dataJulgamento: "",
    horarioInicio: "",
    duracaoEstimada: "",
    descricaoAmbiente: "",
    disposicaoFisica: "",
    climaEmocionalInicial: "",
    presencaPublicoMidia: "",
  });

  const [jurados, setJurados] = useState(initialJurados);
  const [testemunhas, setTestemunhas] = useState(initialTestemunhas);
  const [argumentos, setArgumentos] = useState(initialArgumentos);

  const [interrogatorio, setInterrogatorio] = useState({
    reacaoGeral: "",
    juradosAcreditaram: "",
    juradosCeticos: "",
    momentosImpacto: "",
    contradicoes: "",
    impressaoCredibilidade: "",
    nivelCredibilidade: null as number | null,
  });

  const [mp, setMp] = useState({
    estrategiaGeral: "",
    impactoGeral: null as number | null,
    inclinacaoCondenar: "",
  });

  const [defesa, setDefesa] = useState({
    estrategiaGeral: "",
    impactoGeral: null as number | null,
    duvidaRazoavel: "",
  });

  const [replica, setReplica] = useState({
    refutacoes: "",
    argumentosNovos: "",
    reacaoGeral: "",
    impacto: null as number | null,
    mudancaOpiniao: "",
  });

  const [treplica, setTreplica] = useState({
    refutacoes: "",
    apeloFinal: "",
    reacaoGeral: "",
    momentoImpactante: "",
    impacto: null as number | null,
    reconquistaIndecisos: "",
  });

  const [analiseFinal, setAnaliseFinal] = useState({
    ladoMaisPersuasivo: "",
    impactoAcusacao: null as number | null,
    impactoDefesa: null as number | null,
    impressaoFinalLeiga: "",
    argumentoMaisImpactante: "",
    pontosNaoExplorados: "",
    climaGeralJulgamento: "",
    momentosVirada: "",
    surpresasJulgamento: "",
    observacoesAdicionais: "",
  });

  // Calcular progresso
  const tabs = [
    { id: "contexto", label: "Contexto", icon: MapPin },
    { id: "jurados", label: "Jurados", icon: Users },
    { id: "interrogatorio", label: "Interrogatório", icon: MessageSquare },
    { id: "testemunhas", label: "Testemunhas", icon: User },
    { id: "mp", label: "Acusação", icon: Gavel },
    { id: "defesa", label: "Defesa", icon: Scale },
    { id: "replica", label: "Réplica", icon: AlertTriangle },
    { id: "treplica", label: "Tréplica", icon: Target },
    { id: "analise", label: "Análise Final", icon: BarChart3 },
  ];

  const currentTabIndex = tabs.findIndex(t => t.id === activeTab);
  const progress = ((currentTabIndex + 1) / tabs.length) * 100;

  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1].id);
    }
  };

  const handleNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1].id);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implementar salvamento via TRPC
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const updateJurado = (index: number, field: string, value: string | number | null) => {
    setJurados(prev => prev.map((j, i) => 
      i === index ? { ...j, [field]: value } : j
    ));
  };

  const updateTestemunha = (index: number, field: string, value: string | number | null) => {
    setTestemunhas(prev => prev.map((t, i) => 
      i === index ? { ...t, [field]: value } : t
    ));
  };

  const updateArgumento = (tipo: "mp" | "defesa", index: number, field: string, value: string | number | null) => {
    setArgumentos(prev => ({
      ...prev,
      [tipo]: prev[tipo].map((a, i) => 
        i === index ? { ...a, [field]: value } : a
      ),
    }));
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/juri">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <ClipboardCheck className="h-5 w-5 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">Avaliação do Júri</h1>
              <Badge variant="outline" className="border-purple-300 text-purple-700">
                Sessão #{sessaoId}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Formulário de observação comportamental dos jurados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="gap-2 bg-purple-600 hover:bg-purple-500"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar Avaliação"}
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso do preenchimento</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 bg-muted/60">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="gap-1.5 whitespace-nowrap"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab: Contexto e Ambiente */}
        <TabsContent value="contexto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-600" />
                Contexto e Ambiente do Julgamento
              </CardTitle>
              <CardDescription>
                Informações gerais sobre o ambiente e clima do plenário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="observador">Observador(a)</Label>
                  <Input 
                    id="observador"
                    value={contexto.observador}
                    onChange={(e) => setContexto(prev => ({ ...prev, observador: e.target.value }))}
                    placeholder="Nome do observador"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataJulgamento">Data do Julgamento</Label>
                  <Input 
                    id="dataJulgamento"
                    type="date"
                    value={contexto.dataJulgamento}
                    onChange={(e) => setContexto(prev => ({ ...prev, dataJulgamento: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horarioInicio">Horário de Início</Label>
                  <Input 
                    id="horarioInicio"
                    type="time"
                    value={contexto.horarioInicio}
                    onChange={(e) => setContexto(prev => ({ ...prev, horarioInicio: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duracaoEstimada">Duração Estimada</Label>
                  <Input 
                    id="duracaoEstimada"
                    value={contexto.duracaoEstimada}
                    onChange={(e) => setContexto(prev => ({ ...prev, duracaoEstimada: e.target.value }))}
                    placeholder="Ex: 6 horas"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricaoAmbiente">
                  Descrição do Ambiente (iluminação, temperatura, acústica, conforto da sala)
                </Label>
                <Textarea 
                  id="descricaoAmbiente"
                  value={contexto.descricaoAmbiente}
                  onChange={(e) => setContexto(prev => ({ ...prev, descricaoAmbiente: e.target.value }))}
                  placeholder="Descreva as condições físicas do ambiente..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="disposicaoFisica">
                  Disposição Física (posicionamento dos jurados em relação ao réu, testemunhas, advogados)
                </Label>
                <Textarea 
                  id="disposicaoFisica"
                  value={contexto.disposicaoFisica}
                  onChange={(e) => setContexto(prev => ({ ...prev, disposicaoFisica: e.target.value }))}
                  placeholder="Descreva a disposição física dos participantes..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="climaEmocionalInicial">
                  Clima Emocional Inicial (tensão, tranquilidade, expectativa observada nos jurados)
                </Label>
                <Textarea 
                  id="climaEmocionalInicial"
                  value={contexto.climaEmocionalInicial}
                  onChange={(e) => setContexto(prev => ({ ...prev, climaEmocionalInicial: e.target.value }))}
                  placeholder="Descreva o clima emocional observado..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="presencaPublicoMidia">
                  Presença de Público/Mídia (influência aparente no comportamento dos jurados)
                </Label>
                <Textarea 
                  id="presencaPublicoMidia"
                  value={contexto.presencaPublicoMidia}
                  onChange={(e) => setContexto(prev => ({ ...prev, presencaPublicoMidia: e.target.value }))}
                  placeholder="Descreva a presença de público e mídia e sua influência..."
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Identificação dos Jurados */}
        <TabsContent value="jurados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Identificação dos Jurados
              </CardTitle>
              <CardDescription>
                Perfil e primeira impressão de cada jurado do conselho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                {jurados.map((jurado, index) => (
                  <Card key={index} className="border-muted">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xs font-bold text-purple-600">
                          {jurado.posicao}
                        </div>
                        Jurado {jurado.posicao}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome</Label>
                          <Input 
                            value={jurado.nome}
                            onChange={(e) => updateJurado(index, "nome", e.target.value)}
                            placeholder="Nome do jurado"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Profissão</Label>
                          <Input 
                            value={jurado.profissao}
                            onChange={(e) => updateJurado(index, "profissao", e.target.value)}
                            placeholder="Profissão"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Idade Aproximada</Label>
                          <Input 
                            type="number"
                            value={jurado.idadeAproximada}
                            onChange={(e) => updateJurado(index, "idadeAproximada", e.target.value)}
                            placeholder="Idade"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Sexo</Label>
                          <Select 
                            value={jurado.sexo} 
                            onValueChange={(value) => updateJurado(index, "sexo", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="masculino">Masculino</SelectItem>
                              <SelectItem value="feminino">Feminino</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Aparência e Primeira Impressão</Label>
                        <Textarea 
                          value={jurado.aparenciaPrimeiraImpressao}
                          onChange={(e) => updateJurado(index, "aparenciaPrimeiraImpressao", e.target.value)}
                          placeholder="Descreva a aparência e sua primeira impressão..."
                          className="min-h-[60px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Linguagem Corporal Inicial</Label>
                        <Textarea 
                          value={jurado.linguagemCorporalInicial}
                          onChange={(e) => updateJurado(index, "linguagemCorporalInicial", e.target.value)}
                          placeholder="Descreva a linguagem corporal observada..."
                          className="min-h-[60px]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Interrogatório do Réu */}
        <TabsContent value="interrogatorio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-600" />
                Interrogatório do Réu
              </CardTitle>
              <CardDescription>
                Observação das reações dos jurados durante o interrogatório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Reação Geral dos Jurados</Label>
                <Textarea 
                  value={interrogatorio.reacaoGeral}
                  onChange={(e) => setInterrogatorio(prev => ({ ...prev, reacaoGeral: e.target.value }))}
                  placeholder="Descreva a reação geral dos jurados durante o interrogatório..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Jurados que Acreditaram no Réu</Label>
                  <Textarea 
                    value={interrogatorio.juradosAcreditaram}
                    onChange={(e) => setInterrogatorio(prev => ({ ...prev, juradosAcreditaram: e.target.value }))}
                    placeholder="Identifique quais jurados pareceram acreditar..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jurados Céticos</Label>
                  <Textarea 
                    value={interrogatorio.juradosCeticos}
                    onChange={(e) => setInterrogatorio(prev => ({ ...prev, juradosCeticos: e.target.value }))}
                    placeholder="Identifique quais jurados pareceram céticos..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Momentos de Maior Impacto</Label>
                <Textarea 
                  value={interrogatorio.momentosImpacto}
                  onChange={(e) => setInterrogatorio(prev => ({ ...prev, momentosImpacto: e.target.value }))}
                  placeholder="Descreva os momentos que causaram maior impacto nos jurados..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Contradições ou Inconsistências Percebidas pelos Jurados</Label>
                <Textarea 
                  value={interrogatorio.contradicoes}
                  onChange={(e) => setInterrogatorio(prev => ({ ...prev, contradicoes: e.target.value }))}
                  placeholder="Descreva contradições que os jurados pareceram notar..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                <h4 className="font-semibold text-sm">Avaliação de Credibilidade</h4>
                <div className="space-y-2">
                  <Label>Impressão geral sobre a credibilidade do réu perante os jurados</Label>
                  <Textarea 
                    value={interrogatorio.impressaoCredibilidade}
                    onChange={(e) => setInterrogatorio(prev => ({ ...prev, impressaoCredibilidade: e.target.value }))}
                    placeholder="Descreva a impressão geral sobre a credibilidade..."
                    className="min-h-[80px]"
                  />
                </div>
                <RatingScale 
                  value={interrogatorio.nivelCredibilidade}
                  onChange={(value) => setInterrogatorio(prev => ({ ...prev, nivelCredibilidade: value }))}
                  label="Nível de Credibilidade Aparente"
                  lowLabel="Muito Baixa"
                  highLabel="Muito Alta"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Inquirição das Testemunhas */}
        <TabsContent value="testemunhas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-purple-600" />
                Inquirição das Testemunhas
              </CardTitle>
              <CardDescription>
                Observação das reações dos jurados a cada testemunha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {testemunhas.map((testemunha, index) => (
                <Card key={index} className="border-muted">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-600">
                        {testemunha.ordem}
                      </div>
                      Testemunha {testemunha.ordem}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome da Testemunha</Label>
                      <Input 
                        value={testemunha.nome}
                        onChange={(e) => updateTestemunha(index, "nome", e.target.value)}
                        placeholder="Nome da testemunha"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Resumo do Depoimento</Label>
                      <Textarea 
                        value={testemunha.resumoDepoimento}
                        onChange={(e) => updateTestemunha(index, "resumoDepoimento", e.target.value)}
                        placeholder="Resuma os principais pontos do depoimento..."
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Reação dos Jurados</Label>
                      <Textarea 
                        value={testemunha.reacaoJurados}
                        onChange={(e) => updateTestemunha(index, "reacaoJurados", e.target.value)}
                        placeholder="Descreva as reações observadas nos jurados..."
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Expressões Faciais e Linguagem Corporal da Testemunha</Label>
                      <Textarea 
                        value={testemunha.expressoesFaciaisLinguagem}
                        onChange={(e) => updateTestemunha(index, "expressoesFaciaisLinguagem", e.target.value)}
                        placeholder="Descreva a linguagem corporal da testemunha..."
                        className="min-h-[60px]"
                      />
                    </div>
                    <RatingScale 
                      value={testemunha.credibilidade}
                      onChange={(value) => updateTestemunha(index, "credibilidade", value)}
                      label="Credibilidade da Testemunha"
                      lowLabel="Muito Baixa"
                      highLabel="Muito Alta"
                    />
                    <div className="space-y-1">
                      <Label className="text-xs">Observações Complementares</Label>
                      <Textarea 
                        value={testemunha.observacoesComplementares}
                        onChange={(e) => updateTestemunha(index, "observacoesComplementares", e.target.value)}
                        placeholder="Outras observações relevantes..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Sustentação do MP */}
        <TabsContent value="mp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gavel className="h-4 w-4 text-rose-600" />
                Sustentação do Ministério Público
              </CardTitle>
              <CardDescription>
                Análise dos argumentos da acusação e reações dos jurados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Estratégia Geral do MP</Label>
                <Textarea 
                  value={mp.estrategiaGeral}
                  onChange={(e) => setMp(prev => ({ ...prev, estrategiaGeral: e.target.value }))}
                  placeholder="Descreva a estratégia geral adotada pelo MP..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Argumentos do MP</h4>
                {argumentos.mp.map((arg, index) => (
                  <Card key={index} className="border-rose-100 dark:border-rose-900/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-rose-600">
                        Argumento {arg.ordem} do MP
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Descrição do Argumento</Label>
                        <Textarea 
                          value={arg.descricaoArgumento}
                          onChange={(e) => updateArgumento("mp", index, "descricaoArgumento", e.target.value)}
                          placeholder="Descreva o argumento apresentado..."
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Reação dos Jurados</Label>
                        <Textarea 
                          value={arg.reacaoJurados}
                          onChange={(e) => updateArgumento("mp", index, "reacaoJurados", e.target.value)}
                          placeholder="Descreva as reações observadas..."
                          className="min-h-[60px]"
                        />
                      </div>
                      <RatingScale 
                        value={arg.nivelPersuasao}
                        onChange={(value) => updateArgumento("mp", index, "nivelPersuasao", value)}
                        label="Nível de Persuasão"
                        lowLabel="Nada Persuasivo"
                        highLabel="Muito Persuasivo"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 space-y-4">
                <h4 className="font-semibold text-sm text-rose-700 dark:text-rose-300">
                  Avaliação Geral da Sustentação do MP
                </h4>
                <RatingScale 
                  value={mp.impactoGeral}
                  onChange={(value) => setMp(prev => ({ ...prev, impactoGeral: value }))}
                  label="Impacto Geral nos Jurados"
                  lowLabel="Nenhum Impacto"
                  highLabel="Impacto Decisivo"
                />
                <div className="space-y-2">
                  <Label>Os jurados parecem inclinados a condenar após o MP? Quais sinais indicam isso?</Label>
                  <Textarea 
                    value={mp.inclinacaoCondenar}
                    onChange={(e) => setMp(prev => ({ ...prev, inclinacaoCondenar: e.target.value }))}
                    placeholder="Descreva os sinais observados..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Sustentação da Defesa */}
        <TabsContent value="defesa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-600" />
                Sustentação da Defesa
              </CardTitle>
              <CardDescription>
                Análise dos argumentos da defesa e reações dos jurados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Estratégia Geral da Defesa</Label>
                <Textarea 
                  value={defesa.estrategiaGeral}
                  onChange={(e) => setDefesa(prev => ({ ...prev, estrategiaGeral: e.target.value }))}
                  placeholder="Descreva a estratégia geral adotada pela defesa..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Argumentos da Defesa</h4>
                {argumentos.defesa.map((arg, index) => (
                  <Card key={index} className="border-emerald-100 dark:border-emerald-900/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-emerald-600">
                        Argumento {arg.ordem} da Defesa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Descrição do Argumento</Label>
                        <Textarea 
                          value={arg.descricaoArgumento}
                          onChange={(e) => updateArgumento("defesa", index, "descricaoArgumento", e.target.value)}
                          placeholder="Descreva o argumento apresentado..."
                          className="min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Reação dos Jurados</Label>
                        <Textarea 
                          value={arg.reacaoJurados}
                          onChange={(e) => updateArgumento("defesa", index, "reacaoJurados", e.target.value)}
                          placeholder="Descreva as reações observadas..."
                          className="min-h-[60px]"
                        />
                      </div>
                      <RatingScale 
                        value={arg.nivelPersuasao}
                        onChange={(value) => updateArgumento("defesa", index, "nivelPersuasao", value)}
                        label="Nível de Persuasão"
                        lowLabel="Nada Persuasivo"
                        highLabel="Muito Persuasivo"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 space-y-4">
                <h4 className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
                  Avaliação Geral da Sustentação da Defesa
                </h4>
                <RatingScale 
                  value={defesa.impactoGeral}
                  onChange={(value) => setDefesa(prev => ({ ...prev, impactoGeral: value }))}
                  label="Impacto Geral nos Jurados"
                  lowLabel="Nenhum Impacto"
                  highLabel="Impacto Decisivo"
                />
                <div className="space-y-2">
                  <Label>Os argumentos da defesa geraram dúvida razoável nos jurados? Quais sinais indicam isso?</Label>
                  <Textarea 
                    value={defesa.duvidaRazoavel}
                    onChange={(e) => setDefesa(prev => ({ ...prev, duvidaRazoavel: e.target.value }))}
                    placeholder="Descreva os sinais observados..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Réplica do MP */}
        <TabsContent value="replica" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Réplica do Ministério Público
              </CardTitle>
              <CardDescription>
                Análise das refutações do MP e impacto nos jurados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Refutações aos Argumentos da Defesa</Label>
                <Textarea 
                  value={replica.refutacoes}
                  onChange={(e) => setReplica(prev => ({ ...prev, refutacoes: e.target.value }))}
                  placeholder="Descreva como o MP refutou os argumentos da defesa..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Argumentos Novos</Label>
                <Textarea 
                  value={replica.argumentosNovos}
                  onChange={(e) => setReplica(prev => ({ ...prev, argumentosNovos: e.target.value }))}
                  placeholder="Descreva novos argumentos apresentados na réplica..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Reação Geral dos Jurados</Label>
                <Textarea 
                  value={replica.reacaoGeral}
                  onChange={(e) => setReplica(prev => ({ ...prev, reacaoGeral: e.target.value }))}
                  placeholder="Descreva a reação geral dos jurados à réplica..."
                  className="min-h-[100px]"
                />
              </div>

              <RatingScale 
                value={replica.impacto}
                onChange={(value) => setReplica(prev => ({ ...prev, impacto: value }))}
                label="Impacto da Réplica nos Jurados"
                lowLabel="Nenhum Impacto"
                highLabel="Impacto Decisivo"
              />

              <div className="space-y-2">
                <Label>A réplica pareceu mudar a opinião de algum jurado? Quais sinais?</Label>
                <Textarea 
                  value={replica.mudancaOpiniao}
                  onChange={(e) => setReplica(prev => ({ ...prev, mudancaOpiniao: e.target.value }))}
                  placeholder="Descreva os sinais de mudança de opinião observados..."
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Tréplica da Defesa */}
        <TabsContent value="treplica" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" />
                Tréplica da Defesa
              </CardTitle>
              <CardDescription>
                Análise das refutações finais da defesa e impacto nos jurados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Refutações aos Argumentos da Réplica</Label>
                <Textarea 
                  value={treplica.refutacoes}
                  onChange={(e) => setTreplica(prev => ({ ...prev, refutacoes: e.target.value }))}
                  placeholder="Descreva como a defesa refutou os argumentos da réplica..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Apelo Final</Label>
                <Textarea 
                  value={treplica.apeloFinal}
                  onChange={(e) => setTreplica(prev => ({ ...prev, apeloFinal: e.target.value }))}
                  placeholder="Descreva o apelo final da defesa aos jurados..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Reação Geral dos Jurados</Label>
                <Textarea 
                  value={treplica.reacaoGeral}
                  onChange={(e) => setTreplica(prev => ({ ...prev, reacaoGeral: e.target.value }))}
                  placeholder="Descreva a reação geral dos jurados à tréplica..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Momento Mais Impactante</Label>
                <Textarea 
                  value={treplica.momentoImpactante}
                  onChange={(e) => setTreplica(prev => ({ ...prev, momentoImpactante: e.target.value }))}
                  placeholder="Descreva o momento mais impactante da tréplica..."
                  className="min-h-[80px]"
                />
              </div>

              <RatingScale 
                value={treplica.impacto}
                onChange={(value) => setTreplica(prev => ({ ...prev, impacto: value }))}
                label="Impacto da Tréplica nos Jurados"
                lowLabel="Nenhum Impacto"
                highLabel="Impacto Decisivo"
              />

              <div className="space-y-2">
                <Label>A tréplica pareceu reconquistar jurados indecisos? Quais sinais?</Label>
                <Textarea 
                  value={treplica.reconquistaIndecisos}
                  onChange={(e) => setTreplica(prev => ({ ...prev, reconquistaIndecisos: e.target.value }))}
                  placeholder="Descreva os sinais de reconquista observados..."
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Análise Final */}
        <TabsContent value="analise" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                Análise Final e Previsão
              </CardTitle>
              <CardDescription>
                Comparação de impactos e previsão de votos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Análise Comparativa */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                <h4 className="font-semibold text-sm">Análise Comparativa de Impacto</h4>
                <div className="space-y-2">
                  <Label>Qual lado pareceu mais persuasivo para os jurados? Quais reações indicam isso?</Label>
                  <Textarea 
                    value={analiseFinal.ladoMaisPersuasivo}
                    onChange={(e) => setAnaliseFinal(prev => ({ ...prev, ladoMaisPersuasivo: e.target.value }))}
                    placeholder="Descreva sua análise comparativa..."
                    className="min-h-[100px]"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <RatingScale 
                    value={analiseFinal.impactoAcusacao}
                    onChange={(value) => setAnaliseFinal(prev => ({ ...prev, impactoAcusacao: value }))}
                    label="Impacto da Acusação nos Jurados"
                    lowLabel="Muito Fraco"
                    highLabel="Muito Forte"
                  />
                  <RatingScale 
                    value={analiseFinal.impactoDefesa}
                    onChange={(value) => setAnaliseFinal(prev => ({ ...prev, impactoDefesa: value }))}
                    label="Impacto da Defesa nos Jurados"
                    lowLabel="Muito Fraco"
                    highLabel="Muito Forte"
                  />
                </div>
              </div>

              {/* Previsão de Voto dos Jurados */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Previsão de Voto dos Jurados
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {jurados.map((jurado, index) => (
                    <Card key={index} className="border-muted">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-xs font-bold text-purple-600">
                            {jurado.posicao}
                          </div>
                          <span className="font-medium text-sm">
                            {jurado.nome || `Jurado ${jurado.posicao}`}
                          </span>
                        </div>
                        <TendenciaVotoSelect 
                          tendencia={jurado.tendenciaVoto}
                          confianca={jurado.nivelConfianca}
                          onTendenciaChange={(value) => updateJurado(index, "tendenciaVoto", value)}
                          onConfiancaChange={(value) => updateJurado(index, "nivelConfianca", value)}
                        />
                        <div className="space-y-1">
                          <Label className="text-xs">Justificativa</Label>
                          <Textarea 
                            value={jurado.justificativaTendencia}
                            onChange={(e) => updateJurado(index, "justificativaTendencia", e.target.value)}
                            placeholder="Por que você acredita nessa tendência?"
                            className="min-h-[60px]"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Impressão Final */}
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 space-y-4">
                <h4 className="font-semibold text-sm text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Impressão Final como Observadora Leiga
                </h4>
                <div className="space-y-2">
                  <Label>Se você fosse uma cidadã comum no júri (sem conhecimento jurídico), qual seria sua impressão final sobre o caso?</Label>
                  <Textarea 
                    value={analiseFinal.impressaoFinalLeiga}
                    onChange={(e) => setAnaliseFinal(prev => ({ ...prev, impressaoFinalLeiga: e.target.value }))}
                    placeholder="Descreva sua impressão como pessoa leiga..."
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Qual argumento pareceu mais impactante para os jurados?</Label>
                  <Textarea 
                    value={analiseFinal.argumentoMaisImpactante}
                    onChange={(e) => setAnaliseFinal(prev => ({ ...prev, argumentoMaisImpactante: e.target.value }))}
                    placeholder="Identifique o argumento mais impactante..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pontos que poderiam ter sido mais explorados</Label>
                  <Textarea 
                    value={analiseFinal.pontosNaoExplorados}
                    onChange={(e) => setAnaliseFinal(prev => ({ ...prev, pontosNaoExplorados: e.target.value }))}
                    placeholder="Identifique oportunidades perdidas..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              {/* Observações Gerais */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Observações Gerais</h4>
                <div className="space-y-2">
                  <Label>Clima Geral do Julgamento</Label>
                  <Textarea 
                    value={analiseFinal.climaGeralJulgamento}
                    onChange={(e) => setAnaliseFinal(prev => ({ ...prev, climaGeralJulgamento: e.target.value }))}
                    placeholder="Descreva o clima geral do julgamento..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Momentos de Virada (mudanças no ânimo dos jurados)</Label>
                  <Textarea 
                    value={analiseFinal.momentosVirada}
                    onChange={(e) => setAnaliseFinal(prev => ({ ...prev, momentosVirada: e.target.value }))}
                    placeholder="Descreva os momentos de virada..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Surpresas do Julgamento</Label>
                  <Textarea 
                    value={analiseFinal.surpresasJulgamento}
                    onChange={(e) => setAnaliseFinal(prev => ({ ...prev, surpresasJulgamento: e.target.value }))}
                    placeholder="Descreva surpresas ou eventos inesperados..."
                    className="min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações adicionais sobre as reações dos jurados</Label>
                  <Textarea 
                    value={analiseFinal.observacoesAdicionais}
                    onChange={(e) => setAnaliseFinal(prev => ({ ...prev, observacoesAdicionais: e.target.value }))}
                    placeholder="Outras observações relevantes..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={handlePrevTab}
          disabled={currentTabIndex === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {currentTabIndex + 1} de {tabs.length}
          </span>
        </div>
        {currentTabIndex === tabs.length - 1 ? (
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-purple-600 hover:bg-purple-500"
          >
            <CheckCircle2 className="h-4 w-4" />
            Finalizar Avaliação
          </Button>
        ) : (
          <Button 
            onClick={handleNextTab}
            className="gap-2"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
