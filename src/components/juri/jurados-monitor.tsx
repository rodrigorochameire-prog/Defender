"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Target,
  Clock,
  PenLine,
  ChevronRight,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Brain,
} from "lucide-react";

// ============================================
// TIPOS
// ============================================
export interface JuradoMonitor {
  id: number;
  cadeira: number;
  nome: string;
  genero: "M" | "F";
  idade?: number;
  profissao?: string;
  score: number; // -5 a +5
  reacoes: Reacao[];
  anotacoes: Anotacao[];
  atencao: "alta" | "media" | "baixa";
  perfilEstimado?: "empatico" | "racional" | "conservador" | "neutro";
}

interface Reacao {
  id: string;
  tipo: "positiva" | "negativa" | "neutra";
  fase: string;
  momento: string;
  descricao?: string;
}

interface Anotacao {
  id: string;
  texto: string;
  momento: string;
  fase: string;
}

interface JuradosMonitorProps {
  jurados: JuradoMonitor[];
  faseAtual: string;
  onUpdateScore: (juradoId: number, delta: number) => void;
  onAddAnotacao: (juradoId: number, texto: string) => void;
  isDarkMode?: boolean;
}

// ============================================
// HELPERS
// ============================================
function getScoreColor(score: number, isDark: boolean) {
  if (score >= 3) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 1) return "text-teal-600 dark:text-teal-400";
  if (score === 0) return "text-muted-foreground";
  if (score >= -2) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function getScoreBgColor(score: number, isDark: boolean) {
  if (score >= 3) return "bg-emerald-100 border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/40";
  if (score >= 1) return "bg-teal-100 border-teal-300 dark:bg-teal-500/20 dark:border-teal-500/40";
  if (score === 0) return "bg-muted border-border";
  if (score >= -2) return "bg-amber-100 border-amber-300 dark:bg-amber-500/20 dark:border-amber-500/40";
  return "bg-rose-100 border-rose-300 dark:bg-rose-500/20 dark:border-rose-500/40";
}

function getScoreLabel(score: number) {
  if (score >= 4) return "Muito Favorável";
  if (score >= 2) return "Favorável";
  if (score >= 1) return "Inclinado +";
  if (score === 0) return "Neutro";
  if (score >= -1) return "Inclinado -";
  if (score >= -3) return "Desfavorável";
  return "Muito Desfavorável";
}

function getScoreIcon(score: number) {
  if (score >= 2) return <TrendingUp className="w-4 h-4" />;
  if (score <= -2) return <TrendingDown className="w-4 h-4" />;
  return <Minus className="w-4 h-4" />;
}

function getAtencaoConfig(atencao: string) {
  const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    alta: { label: "Atento", color: "text-emerald-500", icon: <Eye className="w-3 h-3" /> },
    media: { label: "Normal", color: "text-amber-500", icon: <Eye className="w-3 h-3" /> },
    baixa: { label: "Disperso", color: "text-rose-500", icon: <AlertTriangle className="w-3 h-3" /> },
  };
  return configs[atencao] || configs.media;
}

function getPerfilConfig(perfil: string | undefined) {
  const configs: Record<string, { label: string; color: string; bgColor: string }> = {
    empatico: { label: "Empático", color: "text-pink-600", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
    racional: { label: "Racional", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
    conservador: { label: "Conservador", color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
    neutro: { label: "Indefinido", color: "text-muted-foreground", bgColor: "bg-muted" },
  };
  return configs[perfil || "neutro"] || configs.neutro;
}

// ============================================
// COMPONENTE: Card do Jurado
// ============================================
function JuradoCard({
  jurado,
  onScoreChange,
  onViewDetails,
  isDarkMode,
}: {
  jurado: JuradoMonitor;
  onScoreChange: (delta: number) => void;
  onViewDetails: () => void;
  isDarkMode: boolean;
}) {
  const scoreColor = getScoreColor(jurado.score, isDarkMode);
  const scoreBgColor = getScoreBgColor(jurado.score, isDarkMode);
  const atencaoConfig = getAtencaoConfig(jurado.atencao);
  const perfilConfig = getPerfilConfig(jurado.perfilEstimado);

  // Calcular porcentagem do score para a barra visual
  const scorePercentage = ((jurado.score + 5) / 10) * 100;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-3 transition-all hover:shadow-lg cursor-pointer group",
        "bg-card border-border hover:border-border/80"
      )}
      onClick={onViewDetails}
    >
      {/* Indicador de cadeira */}
      <div className={cn(
        "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
        "bg-muted text-foreground border border-border"
      )}>
        {jurado.cadeira}
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 pt-1">
        <div className="flex items-center gap-2">
          <Avatar className="h-10 w-10">
            <AvatarFallback className={cn(
              "text-sm font-medium",
              jurado.genero === "F" 
                ? "bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-400"
                : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
            )}>
              {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className={cn("text-sm font-medium truncate max-w-[100px]", "text-foreground")}>
              {jurado.nome.split(" ")[0]}
            </p>
            <div className={cn("flex items-center gap-1 text-[10px]", atencaoConfig.color)}>
              {atencaoConfig.icon}
              <span>{atencaoConfig.label}</span>
            </div>
          </div>
        </div>
        
        {/* Score Badge */}
        <div className={cn("px-2 py-1 rounded-lg border text-center", scoreBgColor)}>
          <div className={cn("text-lg font-bold", scoreColor)}>
            {jurado.score > 0 ? "+" : ""}{jurado.score}
          </div>
        </div>
      </div>

      {/* Barra de Score Visual */}
      <div className="mb-3">
        <div className={cn("h-2 rounded-full overflow-hidden", "bg-muted")}>
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              jurado.score >= 2 ? "bg-gradient-to-r from-emerald-500 to-teal-500" :
              jurado.score >= 0 ? "bg-gradient-to-r from-teal-500 to-amber-500" :
              "bg-gradient-to-r from-amber-500 to-rose-500"
            )}
            style={{ width: `${scorePercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className={cn("text-[9px]", isDarkMode ? "text-rose-400" : "text-rose-600")}>-5</span>
          <span className={cn("text-[9px] font-medium", scoreColor)}>{getScoreLabel(jurado.score)}</span>
          <span className={cn("text-[9px]", isDarkMode ? "text-emerald-400" : "text-emerald-600")}>+5</span>
        </div>
      </div>

      {/* Perfil Estimado */}
      {jurado.perfilEstimado && (
        <div className={cn("text-[10px] px-2 py-0.5 rounded-full w-fit mb-2", perfilConfig.bgColor, perfilConfig.color)}>
          <Brain className="w-2.5 h-2.5 inline mr-1" />
          {perfilConfig.label}
        </div>
      )}

      {/* Contadores */}
      <div className="flex items-center justify-between text-[10px]">
        <div className={cn("flex items-center gap-1", "text-muted-foreground")}>
          <MessageSquare className="w-3 h-3" />
          <span>{jurado.anotacoes.length} notas</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-emerald-500">{jurado.reacoes.filter(r => r.tipo === "positiva").length}+</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-rose-500">{jurado.reacoes.filter(r => r.tipo === "negativa").length}-</span>
        </div>
      </div>

      {/* Botões de Ação Rápida - Aparecem no hover */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 p-2 rounded-b-xl transition-opacity",
        "opacity-0 group-hover:opacity-100",
        "bg-card/95"
      )}>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30"
          onClick={(e) => {
            e.stopPropagation();
            onScoreChange(-1);
          }}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
          onClick={(e) => {
            e.stopPropagation();
            onScoreChange(1);
          }}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={cn("h-7 w-7 p-0", "text-muted-foreground hover:text-foreground")}
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
        >
          <PenLine className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: Resumo Visual (Infográfico)
// ============================================
function ConselhoResumo({
  jurados,
  isDarkMode,
}: {
  jurados: JuradoMonitor[];
  isDarkMode: boolean;
}) {
  const totalScore = jurados.reduce((acc, j) => acc + j.score, 0);
  const avgScore = jurados.length > 0 ? totalScore / jurados.length : 0;
  
  const favoraveis = jurados.filter(j => j.score >= 2).length;
  const inclinados = jurados.filter(j => j.score >= 1 && j.score < 2).length;
  const neutros = jurados.filter(j => j.score === 0).length;
  const desfavoraveis = jurados.filter(j => j.score < 0).length;

  // Projeção de voto
  const projecaoAbsolvicao = Math.round(
    ((favoraveis * 0.95 + inclinados * 0.7 + neutros * 0.5 + desfavoraveis * 0.15) / jurados.length) * 100
  );

  // Determinar cor da projeção
  const projecaoColor = projecaoAbsolvicao >= 60 
    ? "text-emerald-500" 
    : projecaoAbsolvicao >= 40 
      ? "text-amber-500" 
      : "text-rose-500";

  const projecaoGradient = projecaoAbsolvicao >= 60
    ? "from-emerald-500 to-teal-500"
    : projecaoAbsolvicao >= 40
      ? "from-amber-500 to-orange-500"
      : "from-rose-500 to-red-600";

  return (
    <div className={cn(
      "rounded-xl border p-4",
      "bg-card border-border"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
            <PieChart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Painel do Conselho
            </h3>
            <p className="text-xs text-muted-foreground">
              {jurados.length} jurados ativos
            </p>
          </div>
        </div>
        <Badge className={cn("gap-1", projecaoAbsolvicao >= 60 ? "bg-emerald-500" : projecaoAbsolvicao >= 40 ? "bg-amber-500" : "bg-rose-500", "text-white")}>
          <Sparkles className="w-3 h-3" />
          Projeção
        </Badge>
      </div>

      {/* Projeção Principal */}
      <div className="text-center mb-4">
        <div className={cn("text-5xl font-bold mb-1", projecaoColor)}>
          {projecaoAbsolvicao}%
        </div>
        <p className="text-sm text-muted-foreground">
          Projeção de Absolvição
        </p>
        <div className="mt-2 h-3 rounded-full overflow-hidden bg-muted">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", projecaoGradient)}
            style={{ width: `${projecaoAbsolvicao}%` }}
          />
        </div>
      </div>

      {/* Distribuição Visual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className={cn(
          "text-center p-2 rounded-lg",
          isDarkMode ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-emerald-50 border border-emerald-200"
        )}>
          <div className="text-xl font-bold text-emerald-500">{favoraveis}</div>
          <div className="text-[9px] text-emerald-600">Favoráveis</div>
        </div>
        <div className={cn(
          "text-center p-2 rounded-lg",
          isDarkMode ? "bg-teal-500/10 border border-teal-500/30" : "bg-teal-50 border border-teal-200"
        )}>
          <div className="text-xl font-bold text-teal-500">{inclinados}</div>
          <div className="text-[9px] text-teal-600">Inclinados</div>
        </div>
        <div className={cn(
          "text-center p-2 rounded-lg",
          "bg-muted border border-border"
        )}>
          <div className="text-xl font-bold text-muted-foreground">{neutros}</div>
          <div className="text-[9px] text-muted-foreground">Neutros</div>
        </div>
        <div className={cn(
          "text-center p-2 rounded-lg",
          isDarkMode ? "bg-rose-500/10 border border-rose-500/30" : "bg-rose-50 border border-rose-200"
        )}>
          <div className="text-xl font-bold text-rose-500">{desfavoraveis}</div>
          <div className="text-[9px] text-rose-600">Desf.</div>
        </div>
      </div>

      {/* Score Total */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg",
        "bg-muted/50"
      )}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Score Total</span>
        </div>
        <div className={cn(
          "text-xl font-bold",
          totalScore > 0 ? "text-emerald-500" : totalScore < 0 ? "text-rose-500" : "text-muted-foreground"
        )}>
          {totalScore > 0 ? "+" : ""}{totalScore}
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: Modal de Detalhes do Jurado
// ============================================
function JuradoDetailModal({
  jurado,
  isOpen,
  onClose,
  onAddAnotacao,
  faseAtual,
  isDarkMode,
}: {
  jurado: JuradoMonitor | null;
  isOpen: boolean;
  onClose: () => void;
  onAddAnotacao: (texto: string) => void;
  faseAtual: string;
  isDarkMode: boolean;
}) {
  const [novaAnotacao, setNovaAnotacao] = useState("");

  if (!jurado) return null;

  const handleAddAnotacao = () => {
    if (novaAnotacao.trim()) {
      onAddAnotacao(novaAnotacao.trim());
      setNovaAnotacao("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-lg",
        "bg-card border-border"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className={cn(
                "text-lg font-medium",
                jurado.genero === "F" 
                  ? "bg-pink-100 text-pink-700"
                  : "bg-blue-100 text-blue-700"
              )}>
                {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <span>Cadeira {jurado.cadeira} - {jurado.nome}</span>
              <DialogDescription>
                {jurado.profissao && <span>{jurado.profissao}</span>}
                {jurado.idade && <span> • {jurado.idade} anos</span>}
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Score Atual */}
          <div className={cn(
            "p-4 rounded-xl",
            getScoreBgColor(jurado.score, isDarkMode)
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score Atual</p>
                <p className={cn("text-3xl font-bold", getScoreColor(jurado.score, isDarkMode))}>
                  {jurado.score > 0 ? "+" : ""}{jurado.score}
                </p>
              </div>
              <div className={cn("text-right", getScoreColor(jurado.score, isDarkMode))}>
                {getScoreIcon(jurado.score)}
                <p className="text-sm font-medium mt-1">{getScoreLabel(jurado.score)}</p>
              </div>
            </div>
          </div>

          {/* Histórico de Reações */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-foreground/80">
              Histórico de Reações ({jurado.reacoes.length})
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {jurado.reacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma reação registrada
                </p>
              ) : (
                jurado.reacoes.map((reacao) => (
                  <div
                    key={reacao.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg text-xs",
                      "bg-muted"
                    )}
                  >
                    {reacao.tipo === "positiva" ? (
                      <ThumbsUp className="w-3 h-3 text-emerald-500" />
                    ) : reacao.tipo === "negativa" ? (
                      <ThumbsDown className="w-3 h-3 text-rose-500" />
                    ) : (
                      <Minus className="w-3 h-3 text-neutral-400" />
                    )}
                    <span className="text-muted-foreground">{reacao.fase}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-muted-foreground">{reacao.momento}</span>
                    {reacao.descricao && (
                      <span className="text-foreground/80">{reacao.descricao}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Anotações */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-foreground/80">
              Anotações ({jurado.anotacoes.length})
            </h4>
            <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
              {jurado.anotacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma anotação
                </p>
              ) : (
                jurado.anotacoes.map((anotacao) => (
                  <div
                    key={anotacao.id}
                    className={cn(
                      "p-2 rounded-lg text-xs",
                      "bg-muted"
                    )}
                  >
                    <p className="text-foreground/80">{anotacao.texto}</p>
                    <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{anotacao.fase} • {anotacao.momento}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Nova Anotação */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Adicionar anotação..."
                value={novaAnotacao}
                onChange={(e) => setNovaAnotacao(e.target.value)}
                className={cn(
                  "min-h-[60px] text-sm",
                  "bg-muted border-border"
                )}
              />
            </div>
            <Button
              onClick={handleAddAnotacao}
              disabled={!novaAnotacao.trim()}
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              <PenLine className="w-4 h-4 mr-2" />
              Adicionar Anotação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function JuradosMonitor({
  jurados,
  faseAtual,
  onUpdateScore,
  onAddAnotacao,
  isDarkMode = false,
}: JuradosMonitorProps) {
  const [selectedJurado, setSelectedJurado] = useState<JuradoMonitor | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleViewDetails = (jurado: JuradoMonitor) => {
    setSelectedJurado(jurado);
    setIsDetailOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetailOpen(false);
    setSelectedJurado(null);
  };

  return (
    <div className="space-y-4">
      {/* Resumo do Conselho */}
      <ConselhoResumo jurados={jurados} isDarkMode={isDarkMode} />

      {/* Grid de Jurados */}
      <div className={cn(
        "rounded-xl border p-4",
        "bg-card border-border"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">
              Monitoramento Individual
            </h3>
          </div>
          <Badge variant="outline" className="border-border">
            <Activity className="w-3 h-3 mr-1" />
            Tempo Real
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {jurados.map((jurado) => (
            <JuradoCard
              key={jurado.id}
              jurado={jurado}
              onScoreChange={(delta) => onUpdateScore(jurado.id, delta)}
              onViewDetails={() => handleViewDetails(jurado)}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </div>

      {/* Modal de Detalhes */}
      <JuradoDetailModal
        jurado={selectedJurado}
        isOpen={isDetailOpen}
        onClose={handleCloseDetails}
        onAddAnotacao={(texto) => {
          if (selectedJurado) {
            onAddAnotacao(selectedJurado.id, texto);
          }
        }}
        faseAtual={faseAtual}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
