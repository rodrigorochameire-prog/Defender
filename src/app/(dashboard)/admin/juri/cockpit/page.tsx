"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageCircle,
  Mic,
  Moon,
  Pause,
  Play,
  Sun,
  Tag,
  Timer,
  Users,
  Zap,
} from "lucide-react";

const phases = [
  { id: "instrucao", label: "Instrução", minutes: 90 },
  { id: "interrogatorio", label: "Interrogatório", minutes: 30 },
  { id: "debates", label: "Debates", minutes: 90 },
  { id: "treplica", label: "Tréplica", minutes: 30 },
];

const testemunhas = [
  {
    id: "delegado",
    nome: "Delegado Silva",
    perguntas: [
      { id: "p1", texto: "Confirma a distância real entre as partes?", referencia: "Fls. 45" },
      { id: "p2", texto: "Houve reconhecimento formal? Em que condições?", referencia: "Fls. 52" },
      { id: "p3", texto: "Quem preservou o local e em que horário?", referencia: "Fls. 61" },
    ],
  },
  {
    id: "testemunha1",
    nome: "Testemunha Maria",
    perguntas: [
      { id: "p4", texto: "Qual era a iluminação no momento?", referencia: "Fls. 78" },
      { id: "p5", texto: "Havia consumo de álcool?", referencia: "Fls. 80" },
      { id: "p6", texto: "Você ouviu ameaças prévias?", referencia: "Fls. 83" },
    ],
  },
];

const jurados = [
  { id: 1, nome: "Jurado 1" },
  { id: 2, nome: "Jurado 2" },
  { id: 3, nome: "Jurado 3" },
  { id: 4, nome: "Jurado 4" },
  { id: 5, nome: "Jurado 5" },
  { id: 6, nome: "Jurado 6" },
  { id: 7, nome: "Jurado 7" },
];

const docsRapidos = [
  { id: "denuncia", label: "Denúncia" },
  { id: "laudo", label: "Laudo de Necropsia" },
  { id: "mapa", label: "Mapa do Local" },
  { id: "pericia", label: "Laudo Pericial" },
];

const tagsRapidas = ["#Mentira", "#Contradição", "#NovoFato", "#Dúvida"];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getReactionStyles(value: number, isDark: boolean) {
  if (value === 1) return isDark 
    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200" 
    : "bg-emerald-100 border-emerald-300 text-emerald-700";
  if (value === -1) return isDark 
    ? "bg-red-500/20 border-red-500/40 text-red-200" 
    : "bg-red-100 border-red-300 text-red-700";
  return isDark 
    ? "bg-slate-800/60 border-slate-700 text-slate-300" 
    : "bg-slate-100 border-slate-300 text-slate-700";
}

export default function PlenarioCockpitPage() {
  const [isDarkMode, setIsDarkMode] = useState(false); // Modo claro é o padrão
  const [faseAtual, setFaseAtual] = useState(phases[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const [totalTime, setTotalTime] = useState(phases[0].minutes * 60);
  const [timeLeft, setTimeLeft] = useState(phases[0].minutes * 60);
  const [testemunhaId, setTestemunhaId] = useState(testemunhas[0].id);
  const [perguntasMarcadas, setPerguntasMarcadas] = useState<Record<string, boolean>>({});
  const [anotacaoRapida, setAnotacaoRapida] = useState("");
  const [tagSelecionada, setTagSelecionada] = useState(tagsRapidas[0]);
  const [ocorrencias, setOcorrencias] = useState<
    { id: string; texto: string; tag: string; horario: string }[]
  >([]);
  const [reacoes, setReacoes] = useState<number[]>(() => jurados.map(() => 0));

  const faseSelecionada = useMemo(
    () => phases.find((fase) => fase.id === faseAtual) ?? phases[0],
    [faseAtual]
  );

  useEffect(() => {
    setTotalTime(faseSelecionada.minutes * 60);
    setTimeLeft(faseSelecionada.minutes * 60);
    setIsRunning(false);
  }, [faseSelecionada]);

  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const progress = totalTime > 0 ? Math.round((timeLeft / totalTime) * 100) : 0;

  const perguntasAtuais =
    testemunhas.find((testemunha) => testemunha.id === testemunhaId)?.perguntas ?? [];

  const handleTogglePergunta = (perguntaId: string) => {
    setPerguntasMarcadas((prev) => ({ ...prev, [perguntaId]: !prev[perguntaId] }));
  };

  const handleAddOcorrencia = () => {
    if (!anotacaoRapida.trim()) return;
    const horario = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setOcorrencias((prev) => [
      { id: String(Date.now()), texto: anotacaoRapida.trim(), tag: tagSelecionada, horario },
      ...prev,
    ]);
    setAnotacaoRapida("");
  };

  const handleToggleReacao = (index: number) => {
    setReacoes((prev) =>
      prev.map((value, idx) => {
        if (idx !== index) return value;
        if (value === 0) return 1;
        if (value === 1) return -1;
        return 0;
      })
    );
  };

  // Classes condicionais baseadas no tema
  const containerClass = isDarkMode
    ? "min-h-screen bg-slate-950 text-slate-100 px-4 py-4 lg:px-6 lg:py-6"
    : "min-h-screen bg-slate-50 text-slate-900 px-4 py-4 lg:px-6 lg:py-6";
  
  const cardClass = isDarkMode
    ? "rounded-2xl border border-slate-800 bg-slate-900/60"
    : "rounded-2xl border border-slate-200 bg-white shadow-sm";
  
  const inputClass = isDarkMode
    ? "bg-slate-950 border-slate-800 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";
  
  const selectClass = isDarkMode
    ? "bg-slate-900 border-slate-700 text-slate-200"
    : "bg-white border-slate-200 text-slate-900";
  
  const selectContentClass = isDarkMode
    ? "bg-slate-950 border-slate-800 text-slate-100"
    : "bg-white border-slate-200 text-slate-900";
  
  const tabsClass = isDarkMode
    ? "bg-slate-900 border border-slate-800"
    : "bg-slate-100 border border-slate-200";
  
  const tabActiveClass = isDarkMode
    ? "data-[state=active]:bg-slate-800"
    : "data-[state=active]:bg-white data-[state=active]:shadow-sm";
  
  const textMutedClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const textSecondaryClass = isDarkMode ? "text-slate-500" : "text-slate-400";
  const borderClass = isDarkMode ? "border-slate-800" : "border-slate-200";
  const hoverBorderClass = isDarkMode ? "hover:border-slate-500" : "hover:border-slate-400";
  
  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/juri">
            <Button variant="ghost" size="icon" className={isDarkMode ? "text-slate-200 hover:text-white" : "text-slate-700 hover:text-slate-900"}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-amber-500/10 border border-amber-500/40" : "bg-amber-100 border border-amber-300"}`}>
            <Zap className={isDarkMode ? "h-6 w-6 text-amber-400" : "h-6 w-6 text-amber-600"} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Plenário Live</h1>
              <Badge className="bg-amber-500 text-white text-[10px]">Cockpit</Badge>
            </div>
            <p className={`text-sm ${textMutedClass}`}>Controle em tempo real do julgamento</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Link para Avaliação */}
          <Link href="/admin/juri/avaliacao/1">
            <Button
              variant="outline"
              size="sm"
              className={`gap-2 ${isDarkMode ? "border-purple-500/60 text-purple-300 hover:text-purple-200 hover:border-purple-400" : "border-purple-300 text-purple-700 hover:text-purple-900 hover:border-purple-400"}`}
            >
              <ClipboardCheck className="h-4 w-4" />
              Avaliação
            </Button>
          </Link>
          {/* Toggle de tema */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`gap-2 ${isDarkMode ? "border-slate-700 text-slate-300 hover:text-white hover:border-slate-500" : "border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400"}`}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDarkMode ? "Modo Claro" : "Modo Escuro"}
          </Button>
          <Badge variant="outline" className={isDarkMode ? "border-slate-700 text-slate-300" : "border-slate-300 text-slate-700"}>
            <Users className="h-3 w-3 mr-1" />
            Conselho: 7 jurados
          </Badge>
          <Badge variant="outline" className={isDarkMode ? "border-slate-700 text-slate-300" : "border-slate-300 text-slate-700"}>
            <Mic className="h-3 w-3 mr-1" />
            Defesa ativa
          </Badge>
        </div>
      </div>

      {/* Cronômetro */}
      <div className={`mt-6 p-5 ${cardClass}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className={`text-xs uppercase tracking-[0.2em] ${textSecondaryClass}`}>Fase atual</p>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold">{faseSelecionada.label}</h2>
              <Select value={faseAtual} onValueChange={setFaseAtual}>
                <SelectTrigger className={`w-[180px] h-9 ${selectClass}`}>
                  <SelectValue placeholder="Selecionar fase" />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {phases.map((fase) => (
                    <SelectItem key={fase.id} value={fase.id}>
                      {fase.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsRunning((prev) => !prev)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" /> Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" /> Iniciar
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className={isDarkMode ? "border-slate-700 text-slate-200 hover:text-white hover:border-slate-500" : "border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400"}
              onClick={() => setTimeLeft(totalTime)}
            >
              <Timer className="h-4 w-4 mr-2" /> Reset
            </Button>
            <Button
              variant="outline"
              className={isDarkMode ? "border-amber-500/60 text-amber-300 hover:text-amber-200 hover:border-amber-400" : "border-amber-400 text-amber-600 hover:text-amber-700 hover:border-amber-500"}
              onClick={() => setIsRunning(false)}
            >
              <MessageCircle className="h-4 w-4 mr-2" /> Aparte
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className={`text-4xl font-bold tracking-[0.1em] ${isDarkMode ? "text-white" : "text-slate-900"}`}>{formatTime(timeLeft)}</div>
          <div className="flex-1 xl:px-6">
            <Progress value={progress} className={`h-3 ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`} />
            <p className={`text-xs mt-2 ${textMutedClass}`}>
              {progress}% do tempo estimado concluído
            </p>
          </div>
        </div>
      </div>

      {/* Grid principal */}
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Coluna esquerda */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className={`p-4 ${cardClass}`}>
            <Tabs defaultValue="roteiro">
              <TabsList className={tabsClass}>
                <TabsTrigger value="roteiro" className={tabActiveClass}>
                  Roteiro
                </TabsTrigger>
                <TabsTrigger value="autos" className={tabActiveClass}>
                  Referências
                </TabsTrigger>
              </TabsList>
              <TabsContent value="roteiro" className="mt-4 space-y-4">
                <div>
                  <p className={`text-xs uppercase tracking-[0.2em] ${textSecondaryClass}`}>Testemunha</p>
                  <Select value={testemunhaId} onValueChange={setTestemunhaId}>
                    <SelectTrigger className={`mt-2 ${inputClass}`}>
                      <SelectValue placeholder="Selecionar testemunha" />
                    </SelectTrigger>
                    <SelectContent className={selectContentClass}>
                      {testemunhas.map((testemunha) => (
                        <SelectItem key={testemunha.id} value={testemunha.id}>
                          {testemunha.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  {perguntasAtuais.map((pergunta) => (
                    <div
                      key={pergunta.id}
                      className={`rounded-xl border p-3 ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-slate-50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={!!perguntasMarcadas[pergunta.id]}
                          onCheckedChange={() => handleTogglePergunta(pergunta.id)}
                          className={`mt-1 ${isDarkMode ? "border-slate-600" : "border-slate-400"} data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500`}
                        />
                        <div>
                          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{pergunta.texto}</p>
                          <p className={`text-xs mt-1 ${isDarkMode ? "text-amber-300" : "text-amber-600"}`}>
                            Se negar: ler {pergunta.referencia}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="autos" className={`mt-4 space-y-3 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                <p>Fls. 45-52: Contradição na distância.</p>
                <p>Fls. 78-83: Divergência sobre iluminação.</p>
                <p>Fls. 90: Trecho-chave para descredibilizar.</p>
              </TabsContent>
            </Tabs>
          </div>

          <div className={`p-4 ${cardClass}`}>
            <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
              <FileText className={`h-4 w-4 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} />
              Checklist do plenário
            </h3>
            <div className="mt-3 space-y-2">
              {[
                "Confirmar presença das testemunhas",
                "Separar trechos críticos das provas",
                "Atualizar tese principal e subsidiária",
              ].map((item) => (
                <div key={item} className={`flex items-start gap-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna central */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <div className={`p-4 ${cardClass}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-red-300" : "text-red-600"}`}>
                <MessageCircle className="h-4 w-4" />
                Munição para Tréplica
              </h3>
              <Badge variant="outline" className={isDarkMode ? "border-red-500/40 text-red-300" : "border-red-400 text-red-600"}>
                Live
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              <Textarea
                value={anotacaoRapida}
                onChange={(event) => setAnotacaoRapida(event.target.value)}
                placeholder="Digite um ponto do MP, contradição ou novo fato..."
                className={`min-h-[120px] ${inputClass}`}
              />
              <div className="flex flex-wrap items-center gap-2">
                {tagsRapidas.map((tag) => (
                  <Button
                    key={tag}
                    variant={tagSelecionada === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTagSelecionada(tag)}
                    className={
                      tagSelecionada === tag
                        ? "bg-amber-500 text-white hover:bg-amber-400"
                        : isDarkMode 
                          ? "border-slate-700 text-slate-300 hover:text-white"
                          : "border-slate-300 text-slate-700 hover:text-slate-900"
                    }
                  >
                    <Tag className="h-3 w-3 mr-2" />
                    {tag}
                  </Button>
                ))}
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  onClick={handleAddOcorrencia}
                >
                  Registrar
                </Button>
              </div>
            </div>
          </div>

          <div className={`p-4 ${cardClass}`}>
            <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
              <MessageCircle className={`h-4 w-4 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} />
              Feed de Ocorrências
            </h3>
            <div className="mt-4 space-y-3 max-h-[360px] overflow-y-auto pr-2">
              {ocorrencias.length === 0 ? (
                <p className={`text-sm ${textSecondaryClass}`}>Nenhuma ocorrência registrada ainda.</p>
              ) : (
                ocorrencias.map((ocorrencia) => (
                  <div
                    key={ocorrencia.id}
                    className={`rounded-xl border p-3 ${isDarkMode ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50"}`}
                  >
                    <div className={`flex items-center justify-between text-xs ${textSecondaryClass}`}>
                      <span>{ocorrencia.horario}</span>
                      <span className={isDarkMode ? "text-amber-300" : "text-amber-600"}>{ocorrencia.tag}</span>
                    </div>
                    <p className={`text-sm mt-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>{ocorrencia.texto}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div className="xl:col-span-3 flex flex-col gap-4">
          <div className={`p-4 ${cardClass}`}>
            <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
              <Users className={`h-4 w-4 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} />
              Reação dos Jurados
            </h3>
            <p className={`text-xs mt-1 ${textSecondaryClass}`}>Clique para alternar (positivo/negativo/neutro)</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {jurados.map((jurado, index) => (
                <button
                  key={jurado.id}
                  onClick={() => handleToggleReacao(index)}
                  className={`rounded-xl border px-2 py-3 text-xs font-semibold transition-colors ${getReactionStyles(
                    reacoes[index],
                    isDarkMode
                  )}`}
                >
                  {jurado.nome}
                </button>
              ))}
            </div>
          </div>

          <div className={`p-4 ${cardClass}`}>
            <h3 className={`text-sm font-semibold flex items-center gap-2 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}>
              <FileText className={`h-4 w-4 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} />
              Acesso Rápido
            </h3>
            <div className="mt-3 flex flex-col gap-2">
              {docsRapidos.map((doc) => (
                <Button
                  key={doc.id}
                  variant="outline"
                  className={isDarkMode 
                    ? "justify-start border-slate-700 text-slate-200 hover:text-white hover:border-slate-500" 
                    : "justify-start border-slate-300 text-slate-700 hover:text-slate-900 hover:border-slate-400"}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {doc.label}
                </Button>
              ))}
            </div>
            <div className={`mt-4 rounded-xl border p-3 ${isDarkMode ? "border-amber-500/40 bg-amber-500/10" : "border-amber-300 bg-amber-50"}`}>
              <p className={`text-xs ${isDarkMode ? "text-amber-200" : "text-amber-700"}`}>
                Dica: mantenha os documentos-chave abertos em abas fixas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
