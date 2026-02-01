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
  BarChart3,
  Gavel,
  AlertTriangle,
  Target,
} from "lucide-react";
import { JuradosMonitor, type JuradoMonitor } from "@/components/juri/jurados-monitor";
import { cn } from "@/lib/utils";

// ============================================
// CONFIGURAÇÃO DAS FASES
// ============================================
const phases = [
  { id: "instrucao", label: "Instrução", minutes: 90 },
  { id: "interrogatorio", label: "Interrogatório", minutes: 30 },
  { id: "debates", label: "Debates MP", minutes: 90 },
  { id: "debates_defesa", label: "Debates Defesa", minutes: 90 },
  { id: "replica", label: "Réplica", minutes: 30 },
  { id: "treplica", label: "Tréplica", minutes: 30 },
];

// ============================================
// DADOS MOCKADOS
// ============================================
const testemunhas = [
  {
    id: "delegado",
    nome: "Delegado Silva",
    tipo: "acusacao",
    perguntas: [
      { id: "p1", texto: "Confirma a distância real entre as partes?", referencia: "Fls. 45" },
      { id: "p2", texto: "Houve reconhecimento formal? Em que condições?", referencia: "Fls. 52" },
      { id: "p3", texto: "Quem preservou o local e em que horário?", referencia: "Fls. 61" },
    ],
  },
  {
    id: "testemunha1",
    nome: "Testemunha Maria",
    tipo: "acusacao",
    perguntas: [
      { id: "p4", texto: "Qual era a iluminação no momento?", referencia: "Fls. 78" },
      { id: "p5", texto: "Havia consumo de álcool?", referencia: "Fls. 80" },
      { id: "p6", texto: "Você ouviu ameaças prévias?", referencia: "Fls. 83" },
    ],
  },
  {
    id: "testemunha2",
    nome: "José Carlos (Defesa)",
    tipo: "defesa",
    perguntas: [
      { id: "p7", texto: "Conhece o réu há quanto tempo?", referencia: "" },
      { id: "p8", texto: "Pode descrever o comportamento dele naquele dia?", referencia: "" },
    ],
  },
];

const docsRapidos = [
  { id: "denuncia", label: "Denúncia", fls: "02-15" },
  { id: "laudo", label: "Laudo de Necropsia", fls: "120-135" },
  { id: "mapa", label: "Mapa do Local", fls: "89" },
  { id: "pericia", label: "Laudo Pericial", fls: "140-155" },
  { id: "depoimento_vitima", label: "Depoimento Vítima", fls: "45-52" },
];

const tagsRapidas = ["#Mentira", "#Contradição", "#NovoFato", "#Dúvida", "#Favorável"];

// Jurados iniciais com dados mais completos
const juradosIniciais: JuradoMonitor[] = [
  { id: 1, cadeira: 1, nome: "Maria Silva", genero: "F", idade: 42, profissao: "Professora", score: 0, reacoes: [], anotacoes: [], atencao: "alta", perfilEstimado: "empatico" },
  { id: 2, cadeira: 2, nome: "João Santos", genero: "M", idade: 55, profissao: "Comerciante", score: 0, reacoes: [], anotacoes: [], atencao: "alta", perfilEstimado: "racional" },
  { id: 3, cadeira: 3, nome: "Ana Paula", genero: "F", idade: 38, profissao: "Enfermeira", score: 0, reacoes: [], anotacoes: [], atencao: "media", perfilEstimado: "empatico" },
  { id: 4, cadeira: 4, nome: "Pedro Lima", genero: "M", idade: 48, profissao: "Engenheiro", score: 0, reacoes: [], anotacoes: [], atencao: "alta", perfilEstimado: "racional" },
  { id: 5, cadeira: 5, nome: "Carla Souza", genero: "F", idade: 35, profissao: "Advogada", score: 0, reacoes: [], anotacoes: [], atencao: "alta", perfilEstimado: "racional" },
  { id: 6, cadeira: 6, nome: "José Oliveira", genero: "M", idade: 62, profissao: "Aposentado", score: 0, reacoes: [], anotacoes: [], atencao: "media", perfilEstimado: "conservador" },
  { id: 7, cadeira: 7, nome: "Fernanda Costa", genero: "F", idade: 29, profissao: "Designer", score: 0, reacoes: [], anotacoes: [], atencao: "alta", perfilEstimado: "empatico" },
];

// ============================================
// HELPERS
// ============================================
function formatTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function PlenarioCockpitPage() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [faseAtual, setFaseAtual] = useState(phases[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const [totalTime, setTotalTime] = useState(phases[0].minutes * 60);
  const [timeLeft, setTimeLeft] = useState(phases[0].minutes * 60);
  const [testemunhaId, setTestemunhaId] = useState(testemunhas[0].id);
  const [perguntasMarcadas, setPerguntasMarcadas] = useState<Record<string, boolean>>({});
  const [anotacaoRapida, setAnotacaoRapida] = useState("");
  const [tagSelecionada, setTagSelecionada] = useState(tagsRapidas[0]);
  const [ocorrencias, setOcorrencias] = useState<
    { id: string; texto: string; tag: string; horario: string; fase: string }[]
  >([]);
  const [jurados, setJurados] = useState<JuradoMonitor[]>(juradosIniciais);
  const [activeTab, setActiveTab] = useState<"monitor" | "roteiro" | "ocorrencias">("monitor");

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
    const horario = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setOcorrencias((prev) => [
      { id: String(Date.now()), texto: anotacaoRapida.trim(), tag: tagSelecionada, horario, fase: faseSelecionada.label },
      ...prev,
    ]);
    setAnotacaoRapida("");
  };

  const handleUpdateJuradoScore = (juradoId: number, delta: number) => {
    const horario = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setJurados((prev) =>
      prev.map((j) => {
        if (j.id !== juradoId) return j;
        const newScore = Math.max(-5, Math.min(5, j.score + delta));
        return {
          ...j,
          score: newScore,
          reacoes: [
            ...j.reacoes,
            {
              id: String(Date.now()),
              tipo: delta > 0 ? "positiva" : delta < 0 ? "negativa" : "neutra",
              fase: faseSelecionada.label,
              momento: horario,
            },
          ],
        };
      })
    );
  };

  const handleAddJuradoAnotacao = (juradoId: number, texto: string) => {
    const horario = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setJurados((prev) =>
      prev.map((j) => {
        if (j.id !== juradoId) return j;
        return {
          ...j,
          anotacoes: [
            ...j.anotacoes,
            {
              id: String(Date.now()),
              texto,
              momento: horario,
              fase: faseSelecionada.label,
            },
          ],
        };
      })
    );
  };

  // Classes condicionais
  const containerClass = isDarkMode
    ? "min-h-screen bg-zinc-950 text-zinc-100"
    : "min-h-screen bg-zinc-50 text-zinc-900";
  
  const cardClass = isDarkMode
    ? "rounded-xl border border-zinc-800 bg-zinc-900/80"
    : "rounded-xl border border-zinc-200 bg-white shadow-sm";
  
  const inputClass = isDarkMode
    ? "bg-zinc-900 border-zinc-800 text-zinc-100"
    : "bg-white border-zinc-200 text-zinc-900";

  return (
    <div className={containerClass}>
      {/* Header Premium */}
      <div className={cn(
        "px-4 py-4 border-b",
        isDarkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-zinc-200"
      )}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/juri">
              <Button variant="ghost" size="icon" className={isDarkMode ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Plenário Live</h1>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0">Cockpit</Badge>
              </div>
              <p className={cn("text-sm", isDarkMode ? "text-zinc-500" : "text-zinc-500")}>
                Controle em tempo real do julgamento
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/juri/avaliacao/1">
              <Button
                variant="outline"
                size="sm"
                className={isDarkMode 
                  ? "border-purple-500/50 text-purple-400 hover:text-purple-300 hover:border-purple-400" 
                  : "border-purple-300 text-purple-700 hover:text-purple-900"}
              >
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Avaliação
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={isDarkMode 
                ? "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500" 
                : "border-zinc-300 text-zinc-700 hover:text-zinc-900"}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Timer Principal */}
        <div className={cn("p-5", cardClass)}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className={cn("text-xs uppercase tracking-[0.2em]", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                Fase atual
              </p>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-2xl font-bold">{faseSelecionada.label}</h2>
                <Select value={faseAtual} onValueChange={setFaseAtual}>
                  <SelectTrigger className={cn("w-[180px] h-9", inputClass)}>
                    <SelectValue placeholder="Selecionar fase" />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? "bg-zinc-900 border-zinc-800" : ""}>
                    {phases.map((fase) => (
                      <SelectItem key={fase.id} value={fase.id}>
                        {fase.label} ({fase.minutes}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsRunning((prev) => !prev)}
                className={cn(
                  "min-w-[120px]",
                  isRunning 
                    ? "bg-amber-500 hover:bg-amber-600 text-white" 
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                )}
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
                className={isDarkMode ? "border-zinc-700 text-zinc-300" : ""}
                onClick={() => setTimeLeft(totalTime)}
              >
                <Timer className="h-4 w-4 mr-2" /> Reset
              </Button>
              <Button
                variant="outline"
                className={isDarkMode 
                  ? "border-rose-500/50 text-rose-400 hover:text-rose-300" 
                  : "border-rose-300 text-rose-600"}
              >
                <AlertTriangle className="h-4 w-4 mr-2" /> Aparte
              </Button>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className={cn(
                "text-5xl font-bold tracking-wider font-mono",
                timeLeft <= 300 ? "text-rose-500" : timeLeft <= 600 ? "text-amber-500" : isDarkMode ? "text-white" : "text-zinc-900"
              )}>
                {formatTime(timeLeft)}
              </div>
              <div className={cn("text-right", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                <p className="text-sm">{progress}% restante</p>
                <p className="text-xs">{Math.floor(timeLeft / 60)} min restantes</p>
              </div>
            </div>
            <Progress 
              value={progress} 
              className={cn("h-3", isDarkMode ? "bg-zinc-800" : "bg-zinc-200")}
            />
          </div>
        </div>

        {/* Tabs de Navegação */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button
            variant={activeTab === "monitor" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("monitor")}
            className={cn(
              activeTab === "monitor" 
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white" 
                : isDarkMode ? "border-zinc-700 text-zinc-400" : ""
            )}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Monitor Jurados
          </Button>
          <Button
            variant={activeTab === "roteiro" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("roteiro")}
            className={cn(
              activeTab === "roteiro" 
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white" 
                : isDarkMode ? "border-zinc-700 text-zinc-400" : ""
            )}
          >
            <Target className="h-4 w-4 mr-2" />
            Roteiro
          </Button>
          <Button
            variant={activeTab === "ocorrencias" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("ocorrencias")}
            className={cn(
              activeTab === "ocorrencias" 
                ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white" 
                : isDarkMode ? "border-zinc-700 text-zinc-400" : ""
            )}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Ocorrências ({ocorrencias.length})
          </Button>
        </div>

        {/* Conteúdo por Tab */}
        {activeTab === "monitor" && (
          <JuradosMonitor
            jurados={jurados}
            faseAtual={faseSelecionada.label}
            onUpdateScore={handleUpdateJuradoScore}
            onAddAnotacao={handleAddJuradoAnotacao}
            isDarkMode={isDarkMode}
          />
        )}

        {activeTab === "roteiro" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Roteiro de Perguntas */}
            <div className={cn("p-4", cardClass)}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={cn("font-semibold flex items-center gap-2", isDarkMode ? "text-zinc-200" : "text-zinc-800")}>
                  <Mic className={isDarkMode ? "text-zinc-500" : "text-zinc-400"} />
                  Roteiro de Perguntas
                </h3>
                <Select value={testemunhaId} onValueChange={setTestemunhaId}>
                  <SelectTrigger className={cn("w-[200px] h-8 text-sm", inputClass)}>
                    <SelectValue placeholder="Testemunha" />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? "bg-zinc-900 border-zinc-800" : ""}>
                    {testemunhas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {perguntasAtuais.map((pergunta) => (
                  <div
                    key={pergunta.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      perguntasMarcadas[pergunta.id]
                        ? isDarkMode ? "border-emerald-500/50 bg-emerald-500/10" : "border-emerald-300 bg-emerald-50"
                        : isDarkMode ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={!!perguntasMarcadas[pergunta.id]}
                        onCheckedChange={() => handleTogglePergunta(pergunta.id)}
                        className="mt-1 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <div className="flex-1">
                        <p className={cn(
                          "text-sm",
                          perguntasMarcadas[pergunta.id] ? "line-through opacity-60" : ""
                        )}>
                          {pergunta.texto}
                        </p>
                        {pergunta.referencia && (
                          <p className={cn("text-xs mt-1", isDarkMode ? "text-amber-400" : "text-amber-600")}>
                            📄 Se negar: ler {pergunta.referencia}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Documentos Rápidos */}
            <div className={cn("p-4", cardClass)}>
              <h3 className={cn("font-semibold flex items-center gap-2 mb-4", isDarkMode ? "text-zinc-200" : "text-zinc-800")}>
                <FileText className={isDarkMode ? "text-zinc-500" : "text-zinc-400"} />
                Referências Rápidas
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {docsRapidos.map((doc) => (
                  <Button
                    key={doc.id}
                    variant="outline"
                    className={cn(
                      "justify-start h-auto py-3",
                      isDarkMode ? "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800" : ""
                    )}
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium">{doc.label}</p>
                      <p className={cn("text-xs", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                        Fls. {doc.fls}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
              
              <div className={cn(
                "mt-4 p-3 rounded-lg",
                isDarkMode ? "bg-amber-500/10 border border-amber-500/30" : "bg-amber-50 border border-amber-200"
              )}>
                <p className={cn("text-xs", isDarkMode ? "text-amber-300" : "text-amber-700")}>
                  💡 Dica: Mantenha os documentos-chave abertos em abas fixas para acesso instantâneo.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ocorrencias" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Registrar Ocorrência */}
            <div className={cn("p-4", cardClass)}>
              <h3 className={cn("font-semibold flex items-center gap-2 mb-4 text-rose-500")}>
                <MessageCircle />
                Registrar Ocorrência
              </h3>
              <Textarea
                value={anotacaoRapida}
                onChange={(e) => setAnotacaoRapida(e.target.value)}
                placeholder="Digite um ponto do MP, contradição, novo fato ou observação..."
                className={cn("min-h-[120px]", inputClass)}
              />
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {tagsRapidas.map((tag) => (
                  <Button
                    key={tag}
                    variant={tagSelecionada === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTagSelecionada(tag)}
                    className={cn(
                      tagSelecionada === tag
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : isDarkMode ? "border-zinc-700 text-zinc-400" : ""
                    )}
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Button>
                ))}
              </div>
              <Button
                className="w-full mt-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white"
                onClick={handleAddOcorrencia}
                disabled={!anotacaoRapida.trim()}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Registrar Ocorrência
              </Button>
            </div>

            {/* Feed de Ocorrências */}
            <div className={cn("p-4", cardClass)}>
              <h3 className={cn("font-semibold flex items-center gap-2 mb-4", isDarkMode ? "text-zinc-200" : "text-zinc-800")}>
                <MessageCircle className={isDarkMode ? "text-zinc-500" : "text-zinc-400"} />
                Timeline de Ocorrências
              </h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {ocorrencias.length === 0 ? (
                  <p className={cn("text-sm text-center py-8", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                    Nenhuma ocorrência registrada ainda
                  </p>
                ) : (
                  ocorrencias.map((oc) => (
                    <div
                      key={oc.id}
                      className={cn(
                        "rounded-lg border p-3",
                        isDarkMode ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          oc.tag === "#Contradição" ? "border-rose-500 text-rose-500" :
                          oc.tag === "#Favorável" ? "border-emerald-500 text-emerald-500" :
                          oc.tag === "#Mentira" ? "border-amber-500 text-amber-500" :
                          isDarkMode ? "border-zinc-700" : ""
                        )}>
                          {oc.tag}
                        </Badge>
                        <span className={cn("text-xs", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                          {oc.horario} • {oc.fase}
                        </span>
                      </div>
                      <p className="text-sm">{oc.texto}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
