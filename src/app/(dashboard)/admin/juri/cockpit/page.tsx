"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Gavel,
  AlertTriangle,
  Target,
  PenLine,
  Plus,
  User,
  X,
  ChevronRight,
  Brain,
  TrendingUp,
  TrendingDown,
  Scale,
  Trash2,
  Folder,
  BookOpen,
  Shield,
  AlertCircle,
  Quote,
  ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// CONFIGURAÇÃO DAS FASES
// ============================================
const phases = [
  { id: "instrucao", label: "Instrução", minutes: 90 },
  { id: "interrogatorio", label: "Interrogatório", minutes: 30 },
  { id: "debates_mp", label: "Debates MP", minutes: 90 },
  { id: "debates_defesa", label: "Debates Defesa", minutes: 90 },
  { id: "replica", label: "Réplica", minutes: 30 },
  { id: "treplica", label: "Tréplica", minutes: 30 },
  { id: "votacao", label: "Votação", minutes: 15 },
];

// ============================================
// TIPOS
// ============================================
interface JuradoSorteado {
  id: number;
  cadeira: number; // 1-7
  nome: string;
  genero: "M" | "F";
  profissao?: string;
  perfilDominante?: "empatico" | "analitico" | "autoritario" | "conciliador" | "impulsivo";
  tendencia?: "favoravel" | "neutro" | "desfavoravel";
  taxaAbsolvicao: number;
  observacoesRapidas: string[];
}

interface Anotacao {
  id: string;
  categoria: string;
  texto: string;
  horario: string;
  fase: string;
  importante: boolean;
}

interface JuradoCorpo {
  id: number;
  nome: string;
  genero: "M" | "F";
  profissao?: string;
  taxaAbsolvicao: number;
  perfilDominante?: string;
}

// Corpo de jurados disponíveis para sorteio
const corpoJurados: JuradoCorpo[] = [
  { id: 1, nome: "Maria Helena Silva", genero: "F", profissao: "Professora", taxaAbsolvicao: 75, perfilDominante: "analitico" },
  { id: 2, nome: "José Carlos Mendes", genero: "M", profissao: "Empresário", taxaAbsolvicao: 25, perfilDominante: "autoritario" },
  { id: 3, nome: "Ana Paula Ferreira", genero: "F", profissao: "Enfermeira", taxaAbsolvicao: 80, perfilDominante: "empatico" },
  { id: 4, nome: "Pedro Henrique Lima", genero: "M", profissao: "Engenheiro", taxaAbsolvicao: 50, perfilDominante: "analitico" },
  { id: 5, nome: "Fernanda Costa Santos", genero: "F", profissao: "Designer", taxaAbsolvicao: 67, perfilDominante: "impulsivo" },
  { id: 6, nome: "Roberto Almeida Junior", genero: "M", profissao: "Militar Ref.", taxaAbsolvicao: 27, perfilDominante: "autoritario" },
  { id: 7, nome: "Juliana Ribeiro Melo", genero: "F", profissao: "Assist. Social", taxaAbsolvicao: 86, perfilDominante: "empatico" },
  { id: 8, nome: "Carlos Eduardo Pinto", genero: "M", profissao: "Contador", taxaAbsolvicao: 45, perfilDominante: "analitico" },
  { id: 9, nome: "Patrícia Moura Lima", genero: "F", profissao: "Médica", taxaAbsolvicao: 55, perfilDominante: "conciliador" },
  { id: 10, nome: "Marcos Antônio Silva", genero: "M", profissao: "Comerciante", taxaAbsolvicao: 35, perfilDominante: "conservador" },
  { id: 11, nome: "Luciana Teixeira", genero: "F", profissao: "Psicóloga", taxaAbsolvicao: 72, perfilDominante: "empatico" },
  { id: 12, nome: "Fernando Gomes", genero: "M", profissao: "Advogado", taxaAbsolvicao: 60, perfilDominante: "analitico" },
];

// Categorias de anotações
const categoriasAnotacoes = [
  { id: "mp_argumento", label: "Argumento do MP", icon: <Shield className="w-3 h-3" />, color: "text-rose-600" },
  { id: "mp_refutar", label: "Ponto a Refutar", icon: <AlertCircle className="w-3 h-3" />, color: "text-orange-600" },
  { id: "defesa_usar", label: "Usar na Defesa", icon: <Target className="w-3 h-3" />, color: "text-emerald-600" },
  { id: "contradicao", label: "Contradição", icon: <AlertTriangle className="w-3 h-3" />, color: "text-amber-600" },
  { id: "frase_impacto", label: "Frase de Impacto", icon: <Quote className="w-3 h-3" />, color: "text-purple-600" },
  { id: "jurado_reacao", label: "Reação Jurado", icon: <Users className="w-3 h-3" />, color: "text-blue-600" },
  { id: "testemunha", label: "Testemunha", icon: <Mic className="w-3 h-3" />, color: "text-indigo-600" },
  { id: "geral", label: "Geral", icon: <PenLine className="w-3 h-3" />, color: "text-zinc-600" },
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

function getPerfilColor(perfil: string | undefined) {
  const cores: Record<string, string> = {
    empatico: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-700",
    analitico: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
    autoritario: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
    conciliador: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-700",
    impulsivo: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700",
  };
  return cores[perfil || ""] || "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
}

function getTendenciaIcon(taxa: number) {
  if (taxa >= 60) return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (taxa >= 40) return <Scale className="w-3 h-3 text-amber-500" />;
  return <TrendingDown className="w-3 h-3 text-rose-500" />;
}

// ============================================
// COMPONENTE: Cadeira do Jurado
// ============================================
function CadeiraJurado({
  jurado,
  posicao,
  isDarkMode,
  onRemove,
  onAddObservacao,
}: {
  jurado: JuradoSorteado | null;
  posicao: "frente" | "tras";
  isDarkMode: boolean;
  onRemove: () => void;
  onAddObservacao: (obs: string) => void;
}) {
  const [novaObs, setNovaObs] = useState("");
  const [showObsInput, setShowObsInput] = useState(false);

  if (!jurado) {
    return (
      <div className={cn(
        "w-full h-24 rounded-xl border-2 border-dashed flex items-center justify-center",
        isDarkMode ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-300 bg-zinc-50"
      )}>
        <span className={cn("text-sm", isDarkMode ? "text-zinc-600" : "text-zinc-400")}>
          Cadeira vazia
        </span>
      </div>
    );
  }

  const perfilColor = getPerfilColor(jurado.perfilDominante);

  return (
    <div className={cn(
      "w-full rounded-xl border p-3 transition-all relative group",
      isDarkMode ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-zinc-200 hover:border-zinc-300",
      posicao === "frente" ? "h-auto min-h-[140px]" : "h-auto min-h-[120px]"
    )}>
      {/* Badge da cadeira */}
      <div className={cn(
        "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border",
        jurado.taxaAbsolvicao >= 60 
          ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-400" 
          : jurado.taxaAbsolvicao <= 40 
            ? "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-400"
            : "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-400"
      )}>
        {jurado.cadeira}
      </div>

      {/* Botão remover */}
      <button
        onClick={onRemove}
        className={cn(
          "absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
          isDarkMode ? "bg-zinc-700 text-zinc-300 hover:bg-rose-600 hover:text-white" : "bg-zinc-200 text-zinc-600 hover:bg-rose-500 hover:text-white"
        )}
      >
        <X className="w-3 h-3" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-2 mb-2 pt-1">
        <Avatar className="h-8 w-8">
          <AvatarFallback className={cn(
            "text-xs font-medium",
            jurado.genero === "F" 
              ? "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400"
              : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
          )}>
            {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-medium truncate", isDarkMode ? "text-zinc-200" : "text-zinc-800")}>
            {jurado.nome.split(" ")[0]}
          </p>
          <p className={cn("text-[10px] truncate", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
            {jurado.profissao}
          </p>
        </div>
        {getTendenciaIcon(jurado.taxaAbsolvicao)}
      </div>

      {/* Perfil e taxa */}
      <div className="flex items-center gap-1 mb-2">
        {jurado.perfilDominante && (
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", perfilColor)}>
            {jurado.perfilDominante.charAt(0).toUpperCase() + jurado.perfilDominante.slice(1)}
          </span>
        )}
        <span className={cn(
          "text-[9px] font-medium",
          jurado.taxaAbsolvicao >= 60 ? "text-emerald-600 dark:text-emerald-400" :
          jurado.taxaAbsolvicao <= 40 ? "text-rose-600 dark:text-rose-400" :
          "text-amber-600 dark:text-amber-400"
        )}>
          {jurado.taxaAbsolvicao}%
        </span>
      </div>

      {/* Observações rápidas */}
      {jurado.observacoesRapidas.length > 0 && (
        <div className="space-y-1 mb-2">
          {jurado.observacoesRapidas.slice(-2).map((obs, i) => (
            <p key={i} className={cn("text-[9px] p-1 rounded", isDarkMode ? "bg-zinc-800 text-zinc-400" : "bg-zinc-50 text-zinc-600")}>
              • {obs}
            </p>
          ))}
        </div>
      )}

      {/* Input de observação */}
      {showObsInput ? (
        <div className="flex gap-1">
          <Input
            value={novaObs}
            onChange={(e) => setNovaObs(e.target.value)}
            placeholder="Obs..."
            className={cn("h-6 text-[10px]", isDarkMode ? "bg-zinc-800 border-zinc-700" : "")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && novaObs.trim()) {
                onAddObservacao(novaObs.trim());
                setNovaObs("");
                setShowObsInput(false);
              }
            }}
          />
          <Button size="sm" className="h-6 w-6 p-0" onClick={() => {
            if (novaObs.trim()) {
              onAddObservacao(novaObs.trim());
              setNovaObs("");
            }
            setShowObsInput(false);
          }}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setShowObsInput(true)}
          className={cn(
            "w-full text-[9px] py-1 rounded border border-dashed",
            isDarkMode ? "border-zinc-700 text-zinc-500 hover:text-zinc-400" : "border-zinc-300 text-zinc-400 hover:text-zinc-600"
          )}
        >
          + Adicionar observação
        </button>
      )}
    </div>
  );
}

// ============================================
// COMPONENTE: Modal de Seleção de Jurado
// ============================================
function SelecionarJuradoModal({
  corpoJurados,
  juradosSelecionados,
  onSelecionar,
  cadeira,
  isDarkMode,
}: {
  corpoJurados: JuradoCorpo[];
  juradosSelecionados: number[];
  onSelecionar: (jurado: JuradoCorpo) => void;
  cadeira: number;
  isDarkMode: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);

  const disponiveis = corpoJurados.filter(
    (j) => !juradosSelecionados.includes(j.id) && 
           j.nome.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={cn("w-full", isDarkMode ? "border-zinc-700" : "")}>
          <Plus className="w-3 h-3 mr-2" />
          Cadeira {cadeira}
        </Button>
      </DialogTrigger>
      <DialogContent className={isDarkMode ? "bg-zinc-900 border-zinc-800" : ""}>
        <DialogHeader>
          <DialogTitle>Selecionar Jurado - Cadeira {cadeira}</DialogTitle>
          <DialogDescription>
            Escolha um jurado do corpo de jurados para a cadeira {cadeira}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Buscar jurado..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className={isDarkMode ? "bg-zinc-800 border-zinc-700" : ""}
          />
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {disponiveis.map((jurado) => (
              <button
                key={jurado.id}
                onClick={() => {
                  onSelecionar(jurado);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                  isDarkMode 
                    ? "border-zinc-800 hover:bg-zinc-800" 
                    : "border-zinc-200 hover:bg-zinc-50"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className={cn(
                    "text-sm",
                    jurado.genero === "F" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{jurado.nome}</p>
                  <p className={cn("text-xs", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                    {jurado.profissao}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    jurado.taxaAbsolvicao >= 60 ? "text-emerald-600 border-emerald-300" :
                    jurado.taxaAbsolvicao <= 40 ? "text-rose-600 border-rose-300" :
                    "text-amber-600 border-amber-300"
                  )}>
                    {jurado.taxaAbsolvicao}%
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function PlenarioCockpitPage() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [faseAtual, setFaseAtual] = useState(phases[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const [totalTime, setTotalTime] = useState(phases[0].minutes * 60);
  const [timeLeft, setTimeLeft] = useState(phases[0].minutes * 60);
  const [activeTab, setActiveTab] = useState<"conselho" | "anotacoes">("conselho");
  
  // Estado dos jurados sorteados (7 cadeiras)
  const [conselhoSentenca, setConselhoSentenca] = useState<(JuradoSorteado | null)[]>([
    null, null, null, null, null, null, null
  ]);

  // Anotações organizadas
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [novaAnotacao, setNovaAnotacao] = useState("");
  const [categoriaAnotacao, setCategoriaAnotacao] = useState("geral");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");

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

  const juradosSelecionadosIds = conselhoSentenca.filter(j => j !== null).map(j => j!.id);

  const handleSelecionarJurado = (cadeira: number, jurado: JuradoCorpo) => {
    const novoJurado: JuradoSorteado = {
      ...jurado,
      cadeira,
      tendencia: jurado.taxaAbsolvicao >= 60 ? "favoravel" : jurado.taxaAbsolvicao <= 40 ? "desfavoravel" : "neutro",
      observacoesRapidas: [],
    };
    setConselhoSentenca(prev => {
      const novo = [...prev];
      novo[cadeira - 1] = novoJurado;
      return novo;
    });
  };

  const handleRemoverJurado = (cadeira: number) => {
    setConselhoSentenca(prev => {
      const novo = [...prev];
      novo[cadeira - 1] = null;
      return novo;
    });
  };

  const handleAddObservacaoJurado = (cadeira: number, obs: string) => {
    setConselhoSentenca(prev => {
      const novo = [...prev];
      const jurado = novo[cadeira - 1];
      if (jurado) {
        jurado.observacoesRapidas = [...jurado.observacoesRapidas, obs];
      }
      return novo;
    });
  };

  const handleAddAnotacao = () => {
    if (!novaAnotacao.trim()) return;
    const horario = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setAnotacoes(prev => [{
      id: String(Date.now()),
      categoria: categoriaAnotacao,
      texto: novaAnotacao.trim(),
      horario,
      fase: faseSelecionada.label,
      importante: false,
    }, ...prev]);
    setNovaAnotacao("");
  };

  const anotacoesFiltradas = filtroCategoria === "todas" 
    ? anotacoes 
    : anotacoes.filter(a => a.categoria === filtroCategoria);

  // Cálculo de projeção
  const juradosAtivos = conselhoSentenca.filter(j => j !== null) as JuradoSorteado[];
  const mediaAbsolvicao = juradosAtivos.length > 0 
    ? Math.round(juradosAtivos.reduce((acc, j) => acc + j.taxaAbsolvicao, 0) / juradosAtivos.length)
    : 0;
  const favoraveis = juradosAtivos.filter(j => j.taxaAbsolvicao >= 60).length;
  const neutros = juradosAtivos.filter(j => j.taxaAbsolvicao > 40 && j.taxaAbsolvicao < 60).length;
  const desfavoraveis = juradosAtivos.filter(j => j.taxaAbsolvicao <= 40).length;

  // Classes condicionais
  const containerClass = isDarkMode
    ? "min-h-screen bg-zinc-950 text-zinc-100"
    : "min-h-screen bg-zinc-50 text-zinc-900";
  
  const cardClass = isDarkMode
    ? "rounded-xl border border-zinc-800 bg-zinc-900/80"
    : "rounded-xl border border-zinc-200 bg-white shadow-sm";

  return (
    <div className={containerClass}>
      {/* Header Compacto */}
      <div className={cn(
        "px-4 py-3 border-b",
        isDarkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-zinc-200"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/juri">
              <Button variant="ghost" size="icon" className={isDarkMode ? "text-zinc-400 hover:text-white" : ""}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Plenário Live</h1>
              <p className={cn("text-xs", isDarkMode ? "text-zinc-500" : "text-zinc-500")}>
                {juradosAtivos.length}/7 jurados no conselho
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={isDarkMode ? "border-zinc-700 text-zinc-400" : ""}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link href="/admin/juri/jurados">
              <Button variant="outline" size="sm" className={isDarkMode ? "border-zinc-700 text-zinc-400" : ""}>
                <Users className="h-4 w-4 mr-2" />
                Banco de Jurados
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Timer e Fase */}
        <div className={cn("p-4", cardClass)}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <Select value={faseAtual} onValueChange={setFaseAtual}>
                  <SelectTrigger className={cn("w-[180px] h-9", isDarkMode ? "bg-zinc-800 border-zinc-700" : "")}>
                    <SelectValue placeholder="Fase" />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? "bg-zinc-900 border-zinc-800" : ""}>
                    {phases.map((fase) => (
                      <SelectItem key={fase.id} value={fase.id}>
                        {fase.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className={cn(
                "text-4xl font-bold tracking-wider font-mono",
                timeLeft <= 300 ? "text-rose-500" : timeLeft <= 600 ? "text-amber-500" : ""
              )}>
                {formatTime(timeLeft)}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsRunning((prev) => !prev)}
                className={cn(
                  "min-w-[100px]",
                  isRunning 
                    ? "bg-amber-500 hover:bg-amber-600" 
                    : "bg-gradient-to-r from-emerald-500 to-teal-600"
                )}
              >
                {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isRunning ? "Pausar" : "Iniciar"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTimeLeft(totalTime)}
                className={isDarkMode ? "border-zinc-700" : ""}
              >
                <Timer className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
          
          <div className="mt-3">
            <Progress value={progress} className={cn("h-2", isDarkMode ? "bg-zinc-800" : "bg-zinc-200")} />
          </div>
        </div>

        {/* Projeção Rápida */}
        {juradosAtivos.length > 0 && (
          <div className={cn("p-3 flex items-center justify-between", cardClass)}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm">Favoráveis: <strong className="text-emerald-500">{favoraveis}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-500" />
                <span className="text-sm">Neutros: <strong className="text-amber-500">{neutros}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-500" />
                <span className="text-sm">Desfavoráveis: <strong className="text-rose-500">{desfavoraveis}</strong></span>
              </div>
            </div>
            <Badge className={cn(
              "text-sm",
              mediaAbsolvicao >= 50 ? "bg-emerald-500" : "bg-rose-500"
            )}>
              Projeção: {mediaAbsolvicao}%
            </Badge>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <Button
            variant={activeTab === "conselho" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("conselho")}
            className={activeTab === "conselho" ? "bg-gradient-to-r from-violet-500 to-purple-600" : ""}
          >
            <Users className="w-4 h-4 mr-2" />
            Conselho de Sentença
          </Button>
          <Button
            variant={activeTab === "anotacoes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("anotacoes")}
            className={activeTab === "anotacoes" ? "bg-gradient-to-r from-indigo-500 to-purple-600" : ""}
          >
            <PenLine className="w-4 h-4 mr-2" />
            Anotações ({anotacoes.length})
          </Button>
        </div>

        {/* Tab: Conselho de Sentença */}
        {activeTab === "conselho" && (
          <div className="space-y-4">
            {/* Layout Visual 3+4 */}
            <div className={cn("p-6", cardClass)}>
              <div className="text-center mb-4">
                <Badge variant="outline" className={isDarkMode ? "border-zinc-700" : ""}>
                  <Gavel className="w-3 h-3 mr-2" />
                  Juiz Presidente
                </Badge>
              </div>

              {/* Fileira da Frente (3 cadeiras) */}
              <div className="mb-6">
                <p className={cn("text-xs uppercase tracking-wide mb-3 text-center", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                  Fileira da Frente
                </p>
                <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
                  {[1, 2, 3].map((cadeira) => (
                    <div key={cadeira}>
                      {conselhoSentenca[cadeira - 1] ? (
                        <CadeiraJurado
                          jurado={conselhoSentenca[cadeira - 1]}
                          posicao="frente"
                          isDarkMode={isDarkMode}
                          onRemove={() => handleRemoverJurado(cadeira)}
                          onAddObservacao={(obs) => handleAddObservacaoJurado(cadeira, obs)}
                        />
                      ) : (
                        <SelecionarJuradoModal
                          corpoJurados={corpoJurados}
                          juradosSelecionados={juradosSelecionadosIds}
                          onSelecionar={(j) => handleSelecionarJurado(cadeira, j)}
                          cadeira={cadeira}
                          isDarkMode={isDarkMode}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fileira de Trás (4 cadeiras) */}
              <div>
                <p className={cn("text-xs uppercase tracking-wide mb-3 text-center", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                  Fileira de Trás
                </p>
                <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto">
                  {[4, 5, 6, 7].map((cadeira) => (
                    <div key={cadeira}>
                      {conselhoSentenca[cadeira - 1] ? (
                        <CadeiraJurado
                          jurado={conselhoSentenca[cadeira - 1]}
                          posicao="tras"
                          isDarkMode={isDarkMode}
                          onRemove={() => handleRemoverJurado(cadeira)}
                          onAddObservacao={(obs) => handleAddObservacaoJurado(cadeira, obs)}
                        />
                      ) : (
                        <SelecionarJuradoModal
                          corpoJurados={corpoJurados}
                          juradosSelecionados={juradosSelecionadosIds}
                          onSelecionar={(j) => handleSelecionarJurado(cadeira, j)}
                          cadeira={cadeira}
                          isDarkMode={isDarkMode}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legenda */}
              <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span>Favorável (&ge;60%)</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>Neutro (40-60%)</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span>Desfavorável (&le;40%)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Anotações */}
        {activeTab === "anotacoes" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Input de Anotação */}
            <div className={cn("p-4 lg:col-span-1", cardClass)}>
              <h3 className={cn("font-semibold mb-3 flex items-center gap-2", isDarkMode ? "text-zinc-200" : "")}>
                <PenLine className="w-4 h-4" />
                Nova Anotação
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs mb-2 block">Categoria</Label>
                  <div className="flex flex-wrap gap-1">
                    {categoriasAnotacoes.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoriaAnotacao(cat.id)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors",
                          categoriaAnotacao === cat.id
                            ? isDarkMode ? "bg-zinc-700 border-zinc-600" : "bg-zinc-100 border-zinc-300"
                            : isDarkMode ? "border-zinc-800 hover:border-zinc-700" : "border-zinc-200 hover:border-zinc-300",
                          cat.color
                        )}
                      >
                        {cat.icon}
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <Textarea
                  value={novaAnotacao}
                  onChange={(e) => setNovaAnotacao(e.target.value)}
                  placeholder="Digite sua anotação..."
                  className={cn("min-h-[100px]", isDarkMode ? "bg-zinc-800 border-zinc-700" : "")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) {
                      handleAddAnotacao();
                    }
                  }}
                />
                
                <Button 
                  onClick={handleAddAnotacao} 
                  disabled={!novaAnotacao.trim()}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar (Ctrl+Enter)
                </Button>
              </div>
            </div>

            {/* Lista de Anotações */}
            <div className={cn("p-4 lg:col-span-2", cardClass)}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={cn("font-semibold flex items-center gap-2", isDarkMode ? "text-zinc-200" : "")}>
                  <ListChecks className="w-4 h-4" />
                  Anotações ({anotacoesFiltradas.length})
                </h3>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className={cn("w-[160px] h-8 text-xs", isDarkMode ? "bg-zinc-800 border-zinc-700" : "")}>
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent className={isDarkMode ? "bg-zinc-900 border-zinc-800" : ""}>
                    <SelectItem value="todas">Todas categorias</SelectItem>
                    {categoriasAnotacoes.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {anotacoesFiltradas.length === 0 ? (
                  <p className={cn("text-sm text-center py-8", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                    Nenhuma anotação ainda
                  </p>
                ) : (
                  anotacoesFiltradas.map((anotacao) => {
                    const catConfig = categoriasAnotacoes.find(c => c.id === anotacao.categoria);
                    return (
                      <div
                        key={anotacao.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          isDarkMode ? "border-zinc-800 bg-zinc-900/50" : "border-zinc-200"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <Badge variant="outline" className={cn("text-[10px]", catConfig?.color)}>
                            {catConfig?.icon}
                            <span className="ml-1">{catConfig?.label}</span>
                          </Badge>
                          <span className={cn("text-[10px]", isDarkMode ? "text-zinc-500" : "text-zinc-400")}>
                            {anotacao.horario} • {anotacao.fase}
                          </span>
                        </div>
                        <p className="text-sm">{anotacao.texto}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
