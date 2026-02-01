"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  AlertTriangle,
  Target,
  PenLine,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Scale,
  Shield,
  AlertCircle,
  Quote,
  ListChecks,
  Zap,
  Timer,
  Pause,
  Play,
  Moon,
  Sun,
  Users,
  Gavel,
  Mic,
  GripVertical,
  Camera,
  Upload,
  UserX,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Briefcase,
  Calendar,
  History,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowRight,
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
interface JuradoCorpo {
  id: number;
  nome: string;
  genero: "M" | "F";
  profissao?: string;
  idade?: number;
  bairro?: string;
  taxaAbsolvicao: number;
  perfilDominante?: string;
  participacoes: number;
  ultimaParticipacao?: string;
  foto?: string;
  observacoes?: string;
  recusadoPor?: "mp" | "defesa" | null;
}

interface JuradoSorteado extends JuradoCorpo {
  cadeira: number;
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

// Corpo de jurados disponíveis para sorteio
const corpoJurados: JuradoCorpo[] = [
  { id: 1, nome: "Maria Helena Silva", genero: "F", profissao: "Professora", idade: 45, bairro: "Centro", taxaAbsolvicao: 75, perfilDominante: "empatico", participacoes: 8, ultimaParticipacao: "2025-11-15", recusadoPor: null },
  { id: 2, nome: "José Carlos Mendes", genero: "M", profissao: "Empresário", idade: 52, bairro: "Pituba", taxaAbsolvicao: 25, perfilDominante: "autoritario", participacoes: 12, ultimaParticipacao: "2025-12-10", recusadoPor: null },
  { id: 3, nome: "Ana Paula Ferreira", genero: "F", profissao: "Enfermeira", idade: 38, bairro: "Brotas", taxaAbsolvicao: 80, perfilDominante: "empatico", participacoes: 5, ultimaParticipacao: "2025-10-20", recusadoPor: null },
  { id: 4, nome: "Pedro Henrique Lima", genero: "M", profissao: "Engenheiro", idade: 41, bairro: "Imbuí", taxaAbsolvicao: 50, perfilDominante: "analitico", participacoes: 7, ultimaParticipacao: "2025-12-05", recusadoPor: null },
  { id: 5, nome: "Fernanda Costa Santos", genero: "F", profissao: "Designer", idade: 34, bairro: "Paralela", taxaAbsolvicao: 67, perfilDominante: "impulsivo", participacoes: 3, ultimaParticipacao: "2025-09-18", recusadoPor: null },
  { id: 6, nome: "Roberto Almeida Junior", genero: "M", profissao: "Militar Ref.", idade: 58, bairro: "Stella Maris", taxaAbsolvicao: 27, perfilDominante: "autoritario", participacoes: 15, ultimaParticipacao: "2026-01-08", recusadoPor: null },
  { id: 7, nome: "Juliana Ribeiro Melo", genero: "F", profissao: "Assist. Social", idade: 42, bairro: "Liberdade", taxaAbsolvicao: 86, perfilDominante: "empatico", participacoes: 9, ultimaParticipacao: "2025-12-18", recusadoPor: null },
  { id: 8, nome: "Carlos Eduardo Pinto", genero: "M", profissao: "Contador", idade: 48, bairro: "Itaigara", taxaAbsolvicao: 45, perfilDominante: "analitico", participacoes: 6, ultimaParticipacao: "2025-11-25", recusadoPor: null },
  { id: 9, nome: "Patrícia Moura Lima", genero: "F", profissao: "Médica", idade: 50, bairro: "Horto", taxaAbsolvicao: 55, perfilDominante: "conciliador", participacoes: 4, ultimaParticipacao: "2025-10-30", recusadoPor: null },
  { id: 10, nome: "Marcos Antônio Silva", genero: "M", profissao: "Comerciante", idade: 55, bairro: "Cajazeiras", taxaAbsolvicao: 35, perfilDominante: "conservador", participacoes: 10, ultimaParticipacao: "2025-12-22", recusadoPor: null },
  { id: 11, nome: "Luciana Teixeira", genero: "F", profissao: "Psicóloga", idade: 39, bairro: "Graça", taxaAbsolvicao: 72, perfilDominante: "empatico", participacoes: 6, ultimaParticipacao: "2025-11-10", recusadoPor: null },
  { id: 12, nome: "Fernando Gomes", genero: "M", profissao: "Advogado", idade: 44, bairro: "Campo Grande", taxaAbsolvicao: 60, perfilDominante: "analitico", participacoes: 8, ultimaParticipacao: "2025-12-15", recusadoPor: null },
  { id: 13, nome: "Camila Soares", genero: "F", profissao: "Bancária", idade: 36, bairro: "Barra", taxaAbsolvicao: 58, perfilDominante: "conciliador", participacoes: 4, ultimaParticipacao: "2025-09-28", recusadoPor: null },
  { id: 14, nome: "Ricardo Nunes", genero: "M", profissao: "Professor", idade: 47, bairro: "Rio Vermelho", taxaAbsolvicao: 70, perfilDominante: "empatico", participacoes: 11, ultimaParticipacao: "2026-01-05", recusadoPor: null },
  { id: 15, nome: "Beatriz Campos", genero: "F", profissao: "Funcionária Pública", idade: 51, bairro: "Ondina", taxaAbsolvicao: 48, perfilDominante: "analitico", participacoes: 7, ultimaParticipacao: "2025-11-20", recusadoPor: null },
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

function getPerfilLabel(perfil: string | undefined) {
  const labels: Record<string, string> = {
    empatico: "Empático",
    analitico: "Analítico",
    autoritario: "Autoritário",
    conciliador: "Conciliador",
    impulsivo: "Impulsivo",
    conservador: "Conservador",
  };
  return labels[perfil || ""] || perfil || "";
}

function getPerfilColor(perfil: string | undefined) {
  const cores: Record<string, string> = {
    empatico: "bg-pink-100 text-pink-700 border-pink-200",
    analitico: "bg-blue-100 text-blue-700 border-blue-200",
    autoritario: "bg-red-100 text-red-700 border-red-200",
    conciliador: "bg-teal-100 text-teal-700 border-teal-200",
    impulsivo: "bg-amber-100 text-amber-700 border-amber-200",
    conservador: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return cores[perfil || ""] || "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function getTendenciaColor(taxa: number) {
  if (taxa >= 60) return { bg: "bg-emerald-500", text: "text-emerald-600", border: "border-emerald-300", ring: "ring-emerald-400" };
  if (taxa >= 40) return { bg: "bg-amber-500", text: "text-amber-600", border: "border-amber-300", ring: "ring-amber-400" };
  return { bg: "bg-rose-500", text: "text-rose-600", border: "border-rose-300", ring: "ring-rose-400" };
}

// ============================================
// COMPONENTE: Cadeira Visual Premium
// ============================================
function CadeiraVisual({
  jurado,
  cadeiraNum,
  isDarkMode,
  onRemove,
  onDrop,
  onUploadFoto,
  onAddObservacao,
}: {
  jurado: JuradoSorteado | null;
  cadeiraNum: number;
  isDarkMode: boolean;
  onRemove: () => void;
  onDrop: (juradoId: number) => void;
  onUploadFoto: (file: File) => void;
  onAddObservacao: (obs: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [novaObs, setNovaObs] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const juradoId = parseInt(e.dataTransfer.getData("juradoId"));
    if (!isNaN(juradoId)) {
      onDrop(juradoId);
    }
  };

  const tendencia = jurado ? getTendenciaColor(jurado.taxaAbsolvicao) : null;

  if (!jurado) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-4 min-h-[140px] flex flex-col items-center justify-center transition-all cursor-pointer group",
          dragOver
            ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30 scale-105"
            : isDarkMode
              ? "border-zinc-700 bg-zinc-900/30 hover:border-zinc-600"
              : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400"
        )}
      >
        <div className={cn(
          "absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg",
          isDarkMode ? "bg-zinc-800 text-zinc-400 border border-zinc-700" : "bg-white text-zinc-500 border border-zinc-200"
        )}>
          {cadeiraNum}
        </div>
        <Plus className={cn("w-6 h-6 mb-1", isDarkMode ? "text-zinc-600" : "text-zinc-400")} />
        <span className={cn("text-xs font-medium", isDarkMode ? "text-zinc-600" : "text-zinc-400")}>
          Arraste ou clique
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl p-4 min-h-[160px] transition-all group",
        isDarkMode ? "bg-zinc-900 border border-zinc-800" : "bg-white border border-zinc-200 shadow-sm",
        `ring-2 ring-offset-2 ${tendencia?.ring}`
      )}
    >
      {/* Badge da cadeira */}
      <div className={cn(
        "absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg",
        tendencia?.bg,
        "text-white"
      )}>
        {cadeiraNum}
      </div>

      {/* Botão remover */}
      <button
        onClick={onRemove}
        className={cn(
          "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg",
          "bg-rose-500 text-white hover:bg-rose-600"
        )}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Avatar com foto */}
      <div className="flex flex-col items-center pt-2">
        <div className="relative group/avatar">
          <Avatar className="h-14 w-14 ring-2 ring-offset-2 ring-zinc-200 dark:ring-zinc-700">
            {jurado.foto ? (
              <AvatarImage src={jurado.foto} alt={jurado.nome} />
            ) : null}
            <AvatarFallback className={cn(
              "text-base font-bold",
              jurado.genero === "F"
                ? "bg-gradient-to-br from-pink-100 to-rose-100 text-pink-700"
                : "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700"
            )}>
              {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </AvatarFallback>
          </Avatar>
          {/* Botão upload de foto */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-all",
              "bg-zinc-700 text-white hover:bg-zinc-600 shadow-md"
            )}
          >
            <Camera className="w-2.5 h-2.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFoto(file);
            }}
          />
        </div>

        <p className={cn("text-sm font-semibold mt-2 text-center", isDarkMode ? "text-zinc-200" : "text-zinc-800")}>
          {jurado.nome.split(" ").slice(0, 2).join(" ")}
        </p>
        <p className={cn("text-[10px]", isDarkMode ? "text-zinc-500" : "text-zinc-500")}>
          {jurado.profissao}
        </p>

        {/* Indicadores */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", getPerfilColor(jurado.perfilDominante))}>
            {getPerfilLabel(jurado.perfilDominante)}
          </span>
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
            tendencia?.bg,
            "text-white"
          )}>
            {jurado.taxaAbsolvicao}%
          </span>
        </div>

        {/* Observações rápidas */}
        {jurado.observacoesRapidas.length > 0 && (
          <div className="mt-2 w-full space-y-0.5">
            {jurado.observacoesRapidas.slice(-2).map((obs, i) => (
              <p key={i} className={cn("text-[9px] px-2 py-0.5 rounded", isDarkMode ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600")}>
                • {obs}
              </p>
            ))}
          </div>
        )}

        {/* Input observação */}
        {showInput ? (
          <div className="flex gap-1 mt-2 w-full">
            <Input
              value={novaObs}
              onChange={(e) => setNovaObs(e.target.value)}
              placeholder="Obs..."
              className={cn("h-6 text-[10px] flex-1", isDarkMode ? "bg-zinc-800 border-zinc-700" : "")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && novaObs.trim()) {
                  onAddObservacao(novaObs.trim());
                  setNovaObs("");
                  setShowInput(false);
                }
                if (e.key === "Escape") setShowInput(false);
              }}
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            className={cn(
              "mt-2 text-[9px] py-1 px-2 rounded border border-dashed transition-colors",
              isDarkMode ? "border-zinc-700 text-zinc-500 hover:text-zinc-400 hover:border-zinc-600" : "border-zinc-300 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400"
            )}
          >
            + Adicionar nota
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE: Card de Jurado na Lista
// ============================================
function JuradoListCard({
  jurado,
  isDarkMode,
  isSelected,
  onRecusar,
  onArrastar,
}: {
  jurado: JuradoCorpo;
  isDarkMode: boolean;
  isSelected: boolean;
  onRecusar: (por: "mp" | "defesa") => void;
  onArrastar: (cadeira: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tendencia = getTendenciaColor(jurado.taxaAbsolvicao);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("juradoId", String(jurado.id));
    e.dataTransfer.effectAllowed = "move";
  };

  if (jurado.recusadoPor) {
    return (
      <div className={cn(
        "p-3 rounded-xl border-2 border-dashed opacity-50",
        jurado.recusadoPor === "mp"
          ? "border-rose-300 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20"
          : "border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 grayscale">
              <AvatarFallback className="bg-zinc-200 text-zinc-500 text-xs">
                {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium line-through text-zinc-500">{jurado.nome}</p>
              <p className="text-[10px] text-zinc-400">{jurado.profissao}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn(
            "text-xs",
            jurado.recusadoPor === "mp" ? "border-rose-300 text-rose-600" : "border-blue-300 text-blue-600"
          )}>
            <XCircle className="w-3 h-3 mr-1" />
            Recusado pelo {jurado.recusadoPor === "mp" ? "MP" : "Defesa"}
          </Badge>
        </div>
      </div>
    );
  }

  if (isSelected) {
    return (
      <div className={cn(
        "p-3 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className={cn(
                "text-xs",
                jurado.genero === "F" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
              )}>
                {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{jurado.nome}</p>
              <p className="text-[10px] text-emerald-600/70">{jurado.profissao}</p>
            </div>
          </div>
          <Badge className="bg-emerald-500 text-white text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            No Conselho
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "rounded-xl border transition-all cursor-grab active:cursor-grabbing hover:shadow-md",
        isDarkMode ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700" : "bg-white border-zinc-200 hover:border-zinc-300"
      )}
    >
      {/* Header do Card */}
      <div className="p-3 flex items-center gap-3">
        <div className="flex items-center text-zinc-400">
          <GripVertical className="w-4 h-4" />
        </div>
        
        <Avatar className={cn("h-11 w-11 ring-2 ring-offset-1", tendencia.ring)}>
          {jurado.foto ? <AvatarImage src={jurado.foto} /> : null}
          <AvatarFallback className={cn(
            "text-sm font-semibold",
            jurado.genero === "F"
              ? "bg-gradient-to-br from-pink-100 to-rose-100 text-pink-700"
              : "bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700"
          )}>
            {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn("text-sm font-semibold truncate", isDarkMode ? "text-zinc-200" : "text-zinc-800")}>
              {jurado.nome}
            </p>
            <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded-full text-white", tendencia.bg)}>
              {jurado.taxaAbsolvicao}%
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn("text-[10px]", isDarkMode ? "text-zinc-500" : "text-zinc-500")}>
              {jurado.profissao}
            </span>
            <span className="text-[10px] text-zinc-400">•</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", getPerfilColor(jurado.perfilDominante))}>
              {getPerfilLabel(jurado.perfilDominante)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Botões de Ação Rápida */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  onClick={() => onRecusar("mp")}
                >
                  <Shield className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Recusar pelo MP</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                  onClick={() => onRecusar("defesa")}
                >
                  <Scale className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Recusar pela Defesa</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Detalhes Expandidos */}
      {expanded && (
        <div className={cn(
          "px-3 pb-3 pt-2 border-t",
          isDarkMode ? "border-zinc-800" : "border-zinc-100"
        )}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-zinc-400" />
              <span className="text-zinc-500">Idade:</span>
              <span className={cn("font-medium", isDarkMode ? "text-zinc-300" : "text-zinc-700")}>{jurado.idade} anos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3 h-3 text-zinc-400" />
              <span className="text-zinc-500">Bairro:</span>
              <span className={cn("font-medium", isDarkMode ? "text-zinc-300" : "text-zinc-700")}>{jurado.bairro}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <History className="w-3 h-3 text-zinc-400" />
              <span className="text-zinc-500">Participações:</span>
              <span className={cn("font-medium", isDarkMode ? "text-zinc-300" : "text-zinc-700")}>{jurado.participacoes}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="w-3 h-3 text-zinc-400" />
              <span className="text-zinc-500">Última:</span>
              <span className={cn("font-medium", isDarkMode ? "text-zinc-300" : "text-zinc-700")}>
                {jurado.ultimaParticipacao ? new Date(jurado.ultimaParticipacao).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) : "-"}
              </span>
            </div>
          </div>

          {/* Botões para selecionar cadeira */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-zinc-500 mr-1">Enviar para:</span>
            {[1, 2, 3, 4, 5, 6, 7].map((cadeira) => (
              <Button
                key={cadeira}
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0 text-[10px]"
                onClick={() => onArrastar(cadeira)}
              >
                {cadeira}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [searchJurado, setSearchJurado] = useState("");
  const [showRecusados, setShowRecusados] = useState(false);

  // Estado dos jurados
  const [corpoAtual, setCorpoAtual] = useState<JuradoCorpo[]>(corpoJurados);
  const [conselhoSentenca, setConselhoSentenca] = useState<(JuradoSorteado | null)[]>([
    null, null, null, null, null, null, null
  ]);

  // Anotações
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
    if (!isRunning || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const progress = totalTime > 0 ? Math.round((timeLeft / totalTime) * 100) : 0;

  const juradosSelecionadosIds = conselhoSentenca.filter(j => j !== null).map(j => j!.id);

  // Handlers
  const handleSelecionarJurado = useCallback((cadeira: number, juradoId: number) => {
    const jurado = corpoAtual.find(j => j.id === juradoId);
    if (!jurado || jurado.recusadoPor || juradosSelecionadosIds.includes(juradoId)) return;

    const novoJurado: JuradoSorteado = {
      ...jurado,
      cadeira,
      observacoesRapidas: [],
    };
    setConselhoSentenca(prev => {
      const novo = [...prev];
      novo[cadeira - 1] = novoJurado;
      return novo;
    });
  }, [corpoAtual, juradosSelecionadosIds]);

  const handleRemoverJurado = useCallback((cadeira: number) => {
    setConselhoSentenca(prev => {
      const novo = [...prev];
      novo[cadeira - 1] = null;
      return novo;
    });
  }, []);

  const handleRecusarJurado = useCallback((juradoId: number, por: "mp" | "defesa") => {
    setCorpoAtual(prev => prev.map(j => 
      j.id === juradoId ? { ...j, recusadoPor: por } : j
    ));
  }, []);

  const handleUploadFoto = useCallback((cadeira: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const foto = e.target?.result as string;
      setConselhoSentenca(prev => {
        const novo = [...prev];
        const jurado = novo[cadeira - 1];
        if (jurado) {
          novo[cadeira - 1] = { ...jurado, foto };
        }
        return novo;
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAddObservacaoJurado = useCallback((cadeira: number, obs: string) => {
    setConselhoSentenca(prev => {
      const novo = [...prev];
      const jurado = novo[cadeira - 1];
      if (jurado) {
        novo[cadeira - 1] = {
          ...jurado,
          observacoesRapidas: [...jurado.observacoesRapidas, obs]
        };
      }
      return novo;
    });
  }, []);

  const handleAddAnotacao = useCallback(() => {
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
  }, [novaAnotacao, categoriaAnotacao, faseSelecionada.label]);

  // Filtragem de jurados
  const juradosFiltrados = useMemo(() => {
    return corpoAtual.filter(j => {
      const matchSearch = j.nome.toLowerCase().includes(searchJurado.toLowerCase()) ||
                          j.profissao?.toLowerCase().includes(searchJurado.toLowerCase());
      const matchRecusado = showRecusados ? true : !j.recusadoPor;
      return matchSearch && matchRecusado;
    });
  }, [corpoAtual, searchJurado, showRecusados]);

  const anotacoesFiltradas = filtroCategoria === "todas"
    ? anotacoes
    : anotacoes.filter(a => a.categoria === filtroCategoria);

  // Cálculos de projeção
  const juradosAtivos = conselhoSentenca.filter(j => j !== null) as JuradoSorteado[];
  const mediaAbsolvicao = juradosAtivos.length > 0
    ? Math.round(juradosAtivos.reduce((acc, j) => acc + j.taxaAbsolvicao, 0) / juradosAtivos.length)
    : 0;
  const favoraveis = juradosAtivos.filter(j => j.taxaAbsolvicao >= 60).length;
  const neutros = juradosAtivos.filter(j => j.taxaAbsolvicao > 40 && j.taxaAbsolvicao < 60).length;
  const desfavoraveis = juradosAtivos.filter(j => j.taxaAbsolvicao <= 40).length;
  const recusadosMP = corpoAtual.filter(j => j.recusadoPor === "mp").length;
  const recusadosDefesa = corpoAtual.filter(j => j.recusadoPor === "defesa").length;

  // Classes condicionais
  const containerClass = isDarkMode
    ? "min-h-screen bg-zinc-950 text-zinc-100"
    : "min-h-screen bg-gradient-to-br from-slate-50 via-zinc-50 to-violet-50/30 text-zinc-900";

  const cardClass = isDarkMode
    ? "rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm"
    : "rounded-2xl border border-zinc-200/80 bg-white/80 backdrop-blur-sm shadow-sm";

  return (
    <TooltipProvider>
      <div className={containerClass}>
        {/* Header */}
        <div className={cn(
          "sticky top-0 z-10 px-4 py-3 border-b backdrop-blur-md",
          isDarkMode ? "bg-zinc-950/90 border-zinc-800" : "bg-white/90 border-zinc-200"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/juri">
                <Button variant="ghost" size="icon" className={isDarkMode ? "text-zinc-400 hover:text-white" : ""}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Plenário Live</h1>
                <p className={cn("text-xs", isDarkMode ? "text-zinc-500" : "text-zinc-500")}>
                  {juradosAtivos.length}/7 jurados • {recusadosMP + recusadosDefesa} recusados
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
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Timer e Fase */}
          <div className={cn("p-4", cardClass)}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
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

                <div className={cn(
                  "text-4xl font-bold tracking-wider font-mono tabular-nums",
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
            <div className={cn("p-3 flex flex-wrap items-center justify-between gap-3", cardClass)}>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm">Favoráveis: <strong className="text-emerald-600">{favoraveis}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm">Neutros: <strong className="text-amber-600">{neutros}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-sm">Desfavoráveis: <strong className="text-rose-600">{desfavoraveis}</strong></span>
                </div>
              </div>
              <Badge className={cn(
                "text-sm px-3 py-1",
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
              {/* Layout Visual Premium */}
              <div className={cn("p-6", cardClass)}>
                {/* Juiz Presidente no topo */}
                <div className="text-center mb-6">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full border",
                    isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-zinc-100 border-zinc-200"
                  )}>
                    <Gavel className="w-4 h-4 text-violet-600" />
                    <span className="text-sm font-medium">Juiz Presidente</span>
                  </div>
                </div>

                {/* Fileira de Trás (4 cadeiras) - NO TOPO */}
                <div className="mb-8">
                  <p className={cn("text-[10px] uppercase tracking-wider mb-3 text-center font-medium", isDarkMode ? "text-zinc-600" : "text-zinc-400")}>
                    Fileira de Trás
                  </p>
                  <div className="grid grid-cols-4 gap-3 max-w-4xl mx-auto">
                    {[4, 5, 6, 7].map((cadeira) => (
                      <CadeiraVisual
                        key={cadeira}
                        jurado={conselhoSentenca[cadeira - 1]}
                        cadeiraNum={cadeira}
                        isDarkMode={isDarkMode}
                        onRemove={() => handleRemoverJurado(cadeira)}
                        onDrop={(juradoId) => handleSelecionarJurado(cadeira, juradoId)}
                        onUploadFoto={(file) => handleUploadFoto(cadeira, file)}
                        onAddObservacao={(obs) => handleAddObservacaoJurado(cadeira, obs)}
                      />
                    ))}
                  </div>
                </div>

                {/* Fileira da Frente (3 cadeiras) - EMBAIXO */}
                <div>
                  <p className={cn("text-[10px] uppercase tracking-wider mb-3 text-center font-medium", isDarkMode ? "text-zinc-600" : "text-zinc-400")}>
                    Fileira da Frente
                  </p>
                  <div className="grid grid-cols-3 gap-3 max-w-3xl mx-auto">
                    {[1, 2, 3].map((cadeira) => (
                      <CadeiraVisual
                        key={cadeira}
                        jurado={conselhoSentenca[cadeira - 1]}
                        cadeiraNum={cadeira}
                        isDarkMode={isDarkMode}
                        onRemove={() => handleRemoverJurado(cadeira)}
                        onDrop={(juradoId) => handleSelecionarJurado(cadeira, juradoId)}
                        onUploadFoto={(file) => handleUploadFoto(cadeira, file)}
                        onAddObservacao={(obs) => handleAddObservacaoJurado(cadeira, obs)}
                      />
                    ))}
                  </div>
                </div>

                {/* Legenda */}
                <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Favorável (&ge;60%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Neutro (40-60%)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Desfavorável (&le;40%)</span>
                  </div>
                </div>
              </div>

              {/* Lista de Jurados do Corpo de Sentença */}
              <div className={cn("p-4", cardClass)}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-violet-600" />
                      Corpo de Jurados
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Arraste para a cadeira ou use os botões • {corpoAtual.filter(j => !j.recusadoPor && !juradosSelecionadosIds.includes(j.id)).length} disponíveis
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <Input
                        placeholder="Buscar jurado..."
                        value={searchJurado}
                        onChange={(e) => setSearchJurado(e.target.value)}
                        className={cn("pl-8 h-8 w-48 text-sm", isDarkMode ? "bg-zinc-800 border-zinc-700" : "")}
                      />
                    </div>
                    <Button
                      variant={showRecusados ? "default" : "outline"}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowRecusados(!showRecusados)}
                    >
                      <XCircle className="w-3 h-3 mr-1.5" />
                      Recusados ({recusadosMP + recusadosDefesa})
                    </Button>
                  </div>
                </div>

                {/* Stats de Recusas */}
                {(recusadosMP > 0 || recusadosDefesa > 0) && (
                  <div className="flex items-center gap-4 mb-4 text-xs">
                    <div className="flex items-center gap-1.5 text-rose-600">
                      <Shield className="w-3 h-3" />
                      <span>Recusados MP: <strong>{recusadosMP}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-600">
                      <Scale className="w-3 h-3" />
                      <span>Recusados Defesa: <strong>{recusadosDefesa}</strong></span>
                    </div>
                  </div>
                )}

                {/* Lista de Jurados */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {juradosFiltrados.map((jurado) => (
                    <JuradoListCard
                      key={jurado.id}
                      jurado={jurado}
                      isDarkMode={isDarkMode}
                      isSelected={juradosSelecionadosIds.includes(jurado.id)}
                      onRecusar={(por) => handleRecusarJurado(jurado.id, por)}
                      onArrastar={(cadeira) => handleSelecionarJurado(cadeira, jurado.id)}
                    />
                  ))}
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
    </TooltipProvider>
  );
}
