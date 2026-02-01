"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  User,
  Briefcase,
  MapPin,
  GraduationCap,
  Brain,
  TrendingUp,
  TrendingDown,
  Scale,
  Eye,
  Heart,
  Target,
  AlertTriangle,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Calendar,
  History,
  Users,
  Network,
  MessageCircle,
  PenLine,
  Plus,
  ChevronRight,
  Lightbulb,
  Check,
  X,
  Activity,
  BarChart3,
  Shield,
  Home,
  Church,
  Baby,
  Glasses,
  Handshake,
  Flame,
  BookOpen,
  Compass,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Zap,
  Star,
  Quote,
  Camera,
  Edit,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Dados mockados do jurado (em produção viria do banco)
const juradoMock = {
  id: 1,
  nome: "Maria Helena Silva",
  genero: "F" as const,
  idade: 52,
  profissao: "Professora Universitária",
  areaAtuacao: "Sociologia",
  escolaridade: "Doutorado",
  bairro: "Asa Sul",
  cidade: "Brasília",
  classeSocial: "Média-alta",
  estadoCivil: "Casada",
  filhos: 2,
  religiao: "Católica (não praticante)",
  
  // Perfil comportamental
  perfilDominante: "analitico" as const,
  aberturaExperiencias: "alta" as const,
  toleranciaAmbiguidade: "alta" as const,
  orientacaoValores: "progressista" as const,
  estiloDecisao: "racional" as const,
  nivelEmpatia: "alto" as const,
  resistenciaPressao: "alta" as const,
  
  // Sistema de crenças
  crencasIdentificadas: [
    "Valoriza educação e reabilitação como forma de transformação",
    "Acredita em segundas chances para todos",
    "Questiona a eficácia do sistema penal punitivo",
    "Considera o contexto social nas decisões",
    "Valoriza dados e evidências sobre emoções",
  ],
  valoresObservados: ["Justiça social", "Educação", "Igualdade", "Família", "Conhecimento"],
  preconceitos: ["Nenhum identificado até o momento"],
  
  // Comportamento no júri
  comportamentoObservado: {
    duranteDepoimentos: "Faz anotações constantes, mantém expressão neutra mas demonstra atenção",
    duranteDebates: "Observa os jurados ao lado, parece processar informações racionalmente",
    interacoesOutrosJurados: "Conversa principalmente com jurados mais jovens",
    linguagemCorporal: "Aberta, inclina-se para ouvir, mantém contato visual prolongado",
    expressoesFaciais: "Expressiva mas controlada, ergue sobrancelhas em pontos importantes",
    padraoAtencao: "Muito focada, perde atenção após 2h de sessão",
    momentosReacao: [
      "Demonstrou desconforto quando MP enfatizou punição exemplar",
      "Acenou positivamente ao ouvir sobre contexto familiar do réu",
      "Expressou surpresa com contradição de testemunha",
    ],
  },
  
  // Redes sociais e pesquisa
  redesSociais: {
    instagram: "@maria.helena.prof",
    facebook: "maria.helena.silva",
    linkedin: "in/mariahelenasilva",
    twitter: "@mariahelenasoc",
  },
  descobertasOnline: [
    "Publica frequentemente sobre direitos humanos e reforma penal",
    "Participa de grupos de educação popular no Facebook",
    "Compartilha artigos acadêmicos sobre sociologia do crime",
    "Comentou em post sobre prisões lotadas: 'Precisamos repensar o sistema'",
    "Membro de grupo 'Alternativas ao Encarceramento'",
    "Trabalho publicado: 'Ressocialização e Educação Carcerária'",
  ],
  
  // Estatísticas
  historicoSessoes: [
    { id: 1, data: "2024-03-15", caso: "Homicídio qualificado - João Silva", resultado: "Absolvição", votoProprio: "absolvicao" as const },
    { id: 2, data: "2024-05-20", caso: "Tentativa de homicídio - Pedro Santos", resultado: "Condenação", votoProprio: "condenacao" as const },
    { id: 3, data: "2024-07-10", caso: "Homicídio simples - Carlos Oliveira", resultado: "Absolvição", votoProprio: "absolvicao" as const },
    { id: 4, data: "2024-08-25", caso: "Latrocínio - Maria Costa", resultado: "Absolvição", votoProprio: "absolvicao" as const },
    { id: 5, data: "2024-10-05", caso: "Homicídio qualificado - André Lima", resultado: "Condenação", votoProprio: "absolvicao" as const },
    { id: 6, data: "2024-11-18", caso: "Feminicídio - Roberto Alves", resultado: "Absolvição", votoProprio: "absolvicao" as const },
    { id: 7, data: "2025-01-08", caso: "Homicídio culposo - Fernanda Reis", resultado: "Absolvição", votoProprio: "absolvicao" as const },
    { id: 8, data: "2025-01-22", caso: "Tentativa de homicídio - Lucas Mendes", resultado: "Condenação", votoProprio: "condenacao" as const },
  ],
  totalSessoes: 8,
  absolvicoes: 6,
  condenacoes: 2,
  taxaAbsolvicao: 75,
  
  // Afinidades
  gruposAfinidade: [
    { id: 3, nome: "Ana Paula Ferreira", frequencia: "alta" as const },
    { id: 7, nome: "Juliana Ribeiro Melo", frequencia: "alta" as const },
    { id: 5, nome: "Fernanda Costa Santos", frequencia: "media" as const },
  ],
  
  // Anotações livres
  anotacoesLivres: [
    { id: 1, data: "2025-01-22", autor: "Dr. Silva", texto: "Demonstrou forte inclinação a considerar contexto social do réu durante interrogatório." },
    { id: 2, data: "2025-01-08", autor: "Dra. Santos", texto: "Conversou intensamente com Juliana (cadeira 7) antes da votação. Possível influência mútua." },
    { id: 3, data: "2024-11-18", autor: "Dr. Silva", texto: "Perguntou ao juiz sobre possibilidade de medidas alternativas. Claramente avessa à prisão." },
  ],
  
  // Metadados
  ultimaAtualizacao: "2025-01-28",
  confiabilidadePerfil: "alta" as const,
  ativo: true,
};

// ============================================
// HELPERS
// ============================================
function getPerfilConfig(perfil: string) {
  const configs: Record<string, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
    empatico: { label: "Empático", icon: <Heart className="w-4 h-4" />, color: "text-pink-600 bg-pink-100 dark:text-pink-400 dark:bg-pink-900/30", desc: "Toma decisões baseadas em conexão emocional e histórias pessoais" },
    analitico: { label: "Analítico", icon: <Glasses className="w-4 h-4" />, color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30", desc: "Processa informações de forma lógica e sistemática" },
    autoritario: { label: "Autoritário", icon: <Shield className="w-4 h-4" />, color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30", desc: "Valoriza ordem, hierarquia e punição como correção" },
    conciliador: { label: "Conciliador", icon: <Handshake className="w-4 h-4" />, color: "text-teal-600 bg-teal-100 dark:text-teal-400 dark:bg-teal-900/30", desc: "Busca equilíbrio e soluções que atendam todos" },
    impulsivo: { label: "Impulsivo", icon: <Flame className="w-4 h-4" />, color: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30", desc: "Decide rapidamente baseado em intuição e primeira impressão" },
  };
  return configs[perfil] || { label: perfil, icon: <Brain className="w-4 h-4" />, color: "text-zinc-600 bg-zinc-100", desc: "" };
}

function getNivelConfig(nivel: string) {
  const configs: Record<string, { label: string; width: string; color: string }> = {
    alta: { label: "Alta", width: "w-[85%]", color: "bg-emerald-500" },
    alto: { label: "Alto", width: "w-[85%]", color: "bg-emerald-500" },
    media: { label: "Média", width: "w-[50%]", color: "bg-amber-500" },
    medio: { label: "Médio", width: "w-[50%]", color: "bg-amber-500" },
    baixa: { label: "Baixa", width: "w-[25%]", color: "bg-rose-500" },
    baixo: { label: "Baixo", width: "w-[25%]", color: "bg-rose-500" },
  };
  return configs[nivel] || { label: nivel, width: "w-[50%]", color: "bg-zinc-400" };
}

function getOrientacaoConfig(orientacao: string) {
  const configs: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    progressista: { label: "Progressista", icon: <Compass className="w-4 h-4" />, color: "text-purple-600 dark:text-purple-400" },
    conservador: { label: "Conservador", icon: <BookOpen className="w-4 h-4" />, color: "text-orange-600 dark:text-orange-400" },
    moderado: { label: "Moderado", icon: <Scale className="w-4 h-4" />, color: "text-zinc-600 dark:text-zinc-400" },
  };
  return configs[orientacao] || { label: orientacao, icon: <Compass className="w-4 h-4" />, color: "text-zinc-600" };
}

// ============================================
// COMPONENTE: Barema Visual
// ============================================
function BaremaIndicador({ 
  label, 
  nivel, 
  explicacao 
}: { 
  label: string; 
  nivel: string; 
  explicacao?: string;
}) {
  const config = getNivelConfig(nivel);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className={cn("font-medium", 
          nivel.includes("alt") ? "text-emerald-600 dark:text-emerald-400" : 
          nivel.includes("baix") ? "text-rose-600 dark:text-rose-400" : 
          "text-amber-600 dark:text-amber-400"
        )}>
          {config.label}
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", config.width, config.color)} />
      </div>
      {explicacao && (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">{explicacao}</p>
      )}
    </div>
  );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export default function JuradoPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [novaAnotacao, setNovaAnotacao] = useState("");
  const [activeTab, setActiveTab] = useState("perfil");
  
  const jurado = juradoMock;
  const perfilConfig = getPerfilConfig(jurado.perfilDominante);
  const orientacaoConfig = getOrientacaoConfig(jurado.orientacaoValores);
  
  const tendenciaLabel = jurado.taxaAbsolvicao >= 60 
    ? { text: "Favorável à Defesa", color: "text-emerald-600 dark:text-emerald-400", icon: <TrendingUp className="w-5 h-5" /> }
    : jurado.taxaAbsolvicao >= 40 
      ? { text: "Equilibrado", color: "text-amber-600 dark:text-amber-400", icon: <Scale className="w-5 h-5" /> }
      : { text: "Favorável à Acusação", color: "text-rose-600 dark:text-rose-400", icon: <TrendingDown className="w-5 h-5" /> };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* HEADER APRIMORADO */}
      <div className="relative overflow-hidden">
        {/* Background com gradiente sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-amber-500/5" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }} />
        
        <div className="relative px-4 md:px-6 py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            {/* Lado Esquerdo - Info do Jurado */}
            <div className="flex items-start gap-4">
              <Link href="/admin/juri/jurados">
                <Button variant="ghost" size="icon" className="h-8 w-8 mt-1">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              
              {/* Avatar com indicador de tendência */}
              <div className="relative group">
                <Avatar className="h-16 w-16 ring-4 ring-white dark:ring-zinc-800 shadow-lg">
                  <AvatarFallback className={cn(
                    "text-lg font-semibold",
                    jurado.genero === "F" 
                      ? "bg-gradient-to-br from-pink-400 to-rose-500 text-white"
                      : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
                  )}>
                    {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                {/* Indicador de tendência */}
                <div className={cn(
                  "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white dark:ring-zinc-800",
                  jurado.taxaAbsolvicao >= 60 ? "bg-emerald-500" : jurado.taxaAbsolvicao >= 40 ? "bg-amber-500" : "bg-rose-500"
                )}>
                  {jurado.taxaAbsolvicao >= 60 ? <ThumbsUp className="w-3 h-3 text-white" /> : 
                   jurado.taxaAbsolvicao >= 40 ? <Minus className="w-3 h-3 text-white" /> : 
                   <ThumbsDown className="w-3 h-3 text-white" />}
                </div>
                {/* Botão de editar foto */}
                <button className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                  <Camera className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">{jurado.nome}</h1>
                  {jurado.ativo && (
                    <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Ativo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {jurado.profissao}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {jurado.bairro}, {jurado.cidade}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {jurado.idade} anos
                  </span>
                </div>
                {/* Tags rápidas */}
                <div className="flex items-center gap-1.5 pt-1">
                  <Badge variant="outline" className={cn("text-[10px] px-2 py-0", perfilConfig.color)}>
                    {perfilConfig.icon}
                    <span className="ml-1">{perfilConfig.label}</span>
                  </Badge>
                  <Badge variant="outline" className={cn("text-[10px] px-2 py-0", orientacaoConfig.color)}>
                    {orientacaoConfig.label}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-2 py-0">
                    {jurado.escolaridade}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Lado Direito - Stats e Ações */}
            <div className="flex items-start gap-4">
              {/* Mini Stats */}
              <div className="hidden md:flex items-center gap-3">
                <div className="text-center px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{jurado.totalSessoes}</div>
                  <div className="text-[9px] text-zinc-500 uppercase">Sessões</div>
                </div>
                <div className="text-center px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{jurado.absolvicoes}</div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase">Absolvições</div>
                </div>
                <div className="text-center px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                  <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{jurado.condenacoes}</div>
                  <div className="text-[9px] text-rose-600 dark:text-rose-400 uppercase">Condenações</div>
                </div>
              </div>
              
              {/* Ações */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <FileText className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Gerar Relatório</TooltipContent>
                </Tooltip>
                <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20">
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">

        {/* Painel de Insights Estratégicos com IA */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">Análise Estratégica</span>
              </div>
              <Badge className="bg-white/20 text-white text-[10px] border-0">
                Atualizado hoje
              </Badge>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Tendência Visual */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-800 dark:to-zinc-900 border border-zinc-100 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-500 uppercase">Taxa de Absolvição</span>
                  <span className={cn("text-2xl font-bold", tendenciaLabel.color)}>{jurado.taxaAbsolvicao}%</span>
                </div>
                <div className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      jurado.taxaAbsolvicao >= 60 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                      jurado.taxaAbsolvicao >= 40 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                      "bg-gradient-to-r from-rose-500 to-rose-400"
                    )}
                    style={{ width: `${jurado.taxaAbsolvicao}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-zinc-400">
                  <span>Condenação</span>
                  <span>Absolvição</span>
                </div>
              </div>

              {/* Recomendação Principal */}
              <div className="lg:col-span-2 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800/30">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                      Estratégia Recomendada
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      {jurado.taxaAbsolvicao >= 60 
                        ? `Jurada com perfil ${perfilConfig.label.toLowerCase()} e alta taxa de absolvição. Valoriza argumentos racionais e contexto social. Investir em narrativa humanizada com dados concretos. Evitar apelos puramente emocionais.`
                        : jurado.taxaAbsolvicao >= 40
                        ? `Jurada equilibrada com perfil ${perfilConfig.label.toLowerCase()}. Responde bem a argumentos bem fundamentados. Combinar lógica com elementos emocionais moderados.`
                        : `Jurada com tendência punitiva. Focar em falhas processuais e dúvidas técnicas. Evitar narrativas que minimizem a gravidade.`
                      }
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Check className="w-2.5 h-2.5 mr-1" />
                        Usar: Dados estatísticos
                      </Badge>
                      <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Check className="w-2.5 h-2.5 mr-1" />
                        Usar: Contexto social
                      </Badge>
                      <Badge className="text-[9px] bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                        <X className="w-2.5 h-2.5 mr-1" />
                        Evitar: Vitimização excessiva
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Citação do Jurado */}
            {jurado.descobertasOnline && jurado.descobertasOnline.length > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 flex items-start gap-3">
                <Quote className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 italic">
                    &quot;{jurado.descobertasOnline[3] || jurado.descobertasOnline[0]}&quot;
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">— Encontrado em redes sociais</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-1">
          <TabsTrigger value="perfil" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
            <Brain className="w-4 h-4 mr-2" />
            Perfil Psicológico
          </TabsTrigger>
          <TabsTrigger value="comportamento" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
            <Eye className="w-4 h-4 mr-2" />
            Comportamento
          </TabsTrigger>
          <TabsTrigger value="pesquisa" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
            <Globe className="w-4 h-4 mr-2" />
            Pesquisa Online
          </TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
            <History className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="afinidades" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
            <Network className="w-4 h-4 mr-2" />
            Afinidades
          </TabsTrigger>
        </TabsList>

        {/* Tab: Perfil Psicológico */}
        <TabsContent value="perfil" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dados Pessoais */}
            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-zinc-500">Gênero</Label>
                  <p className="font-medium">{jurado.genero === "F" ? "Feminino" : "Masculino"}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Idade</Label>
                  <p className="font-medium">{jurado.idade} anos</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Estado Civil</Label>
                  <p className="font-medium">{jurado.estadoCivil}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Filhos</Label>
                  <p className="font-medium">{jurado.filhos}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Escolaridade</Label>
                  <p className="font-medium">{jurado.escolaridade}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Área de Atuação</Label>
                  <p className="font-medium">{jurado.areaAtuacao}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Bairro/Cidade</Label>
                  <p className="font-medium">{jurado.bairro}, {jurado.cidade}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Religião</Label>
                  <p className="font-medium">{jurado.religiao}</p>
                </div>
              </CardContent>
            </Card>

            {/* Baremas Psicológicos */}
            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Indicadores Comportamentais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <BaremaIndicador 
                  label="Abertura a Experiências" 
                  nivel={jurado.aberturaExperiencias}
                  explicacao="Disposição para considerar argumentos novos"
                />
                <BaremaIndicador 
                  label="Tolerância à Ambiguidade" 
                  nivel={jurado.toleranciaAmbiguidade}
                  explicacao="Capacidade de lidar com incertezas"
                />
                <BaremaIndicador 
                  label="Nível de Empatia" 
                  nivel={jurado.nivelEmpatia}
                  explicacao="Conexão emocional com histórias pessoais"
                />
                <BaremaIndicador 
                  label="Resistência à Pressão" 
                  nivel={jurado.resistenciaPressao}
                  explicacao="Mantém posição mesmo sob influência"
                />
                
                <div className="pt-2 border-t dark:border-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-zinc-500">Orientação de Valores:</span>
                    <Badge variant="outline" className={orientacaoConfig.color}>
                      {orientacaoConfig.icon}
                      <span className="ml-1">{orientacaoConfig.label}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">Estilo de Decisão:</span>
                    <Badge variant="outline">
                      {jurado.estiloDecisao.charAt(0).toUpperCase() + jurado.estiloDecisao.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sistema de Crenças */}
            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Sistema de Crenças Identificado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {jurado.crencasIdentificadas.map((crenca, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <Brain className="w-4 h-4 mt-0.5 text-indigo-500" />
                    <span className="text-sm">{crenca}</span>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2">
                  <Plus className="w-3 h-3 mr-2" />
                  Adicionar Crença
                </Button>
              </CardContent>
            </Card>

            {/* Valores e Possíveis Vieses */}
            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Valores e Possíveis Vieses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-zinc-500 text-xs uppercase tracking-wide">Valores Observados</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {jurado.valoresObservados.map((valor, i) => (
                      <Badge key={i} variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                        <Check className="w-3 h-3 mr-1" />
                        {valor}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-zinc-500 text-xs uppercase tracking-wide">Possíveis Vieses/Preconceitos</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {jurado.preconceitos?.map((viés, i) => (
                      <Badge key={i} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {viés}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Comportamento */}
        <TabsContent value="comportamento" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Observações Comportamentais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <Label className="text-zinc-500">Durante Depoimentos</Label>
                  <p className="mt-1">{jurado.comportamentoObservado.duranteDepoimentos}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Durante Debates</Label>
                  <p className="mt-1">{jurado.comportamentoObservado.duranteDebates}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Interações com Outros Jurados</Label>
                  <p className="mt-1">{jurado.comportamentoObservado.interacoesOutrosJurados}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Linguagem Corporal</Label>
                  <p className="mt-1">{jurado.comportamentoObservado.linguagemCorporal}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Expressões Faciais</Label>
                  <p className="mt-1">{jurado.comportamentoObservado.expressoesFaciais}</p>
                </div>
                <div>
                  <Label className="text-zinc-500">Padrão de Atenção</Label>
                  <p className="mt-1">{jurado.comportamentoObservado.padraoAtencao}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Momentos de Reação Observados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {jurado.comportamentoObservado.momentosReacao.map((momento, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <Activity className="w-4 h-4 mt-0.5 text-amber-500" />
                    <span className="text-sm">{momento}</span>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="w-3 h-3 mr-2" />
                  Adicionar Observação
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Pesquisa Online */}
        <TabsContent value="pesquisa" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Redes Sociais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {jurado.redesSociais?.instagram && (
                  <a href={`https://instagram.com/${jurado.redesSociais.instagram.replace("@", "")}`} 
                     target="_blank" 
                     className="flex items-center gap-3 p-3 rounded-lg border dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <Instagram className="w-5 h-5 text-pink-600" />
                    <span className="text-sm">{jurado.redesSociais.instagram}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-zinc-400" />
                  </a>
                )}
                {jurado.redesSociais?.facebook && (
                  <a href={`https://facebook.com/${jurado.redesSociais.facebook}`} 
                     target="_blank"
                     className="flex items-center gap-3 p-3 rounded-lg border dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <span className="text-sm">{jurado.redesSociais.facebook}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-zinc-400" />
                  </a>
                )}
                {jurado.redesSociais?.linkedin && (
                  <a href={`https://linkedin.com/${jurado.redesSociais.linkedin}`} 
                     target="_blank"
                     className="flex items-center gap-3 p-3 rounded-lg border dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <Linkedin className="w-5 h-5 text-blue-700" />
                    <span className="text-sm">{jurado.redesSociais.linkedin}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-zinc-400" />
                  </a>
                )}
                {jurado.redesSociais?.twitter && (
                  <a href={`https://twitter.com/${jurado.redesSociais.twitter.replace("@", "")}`} 
                     target="_blank"
                     className="flex items-center gap-3 p-3 rounded-lg border dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <Twitter className="w-5 h-5 text-sky-500" />
                    <span className="text-sm">{jurado.redesSociais.twitter}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-zinc-400" />
                  </a>
                )}
              </CardContent>
            </Card>

            <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Descobertas Online
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {jurado.descobertasOnline.map((descoberta, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                    <Lightbulb className="w-4 h-4 mt-0.5 text-amber-500" />
                    <span className="text-sm">{descoberta}</span>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="w-3 h-3 mr-2" />
                  Adicionar Descoberta
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="historico" className="space-y-4">
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                Histórico de Sessões ({jurado.totalSessoes})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <div className="text-2xl font-bold text-emerald-600">{jurado.absolvicoes}</div>
                  <div className="text-xs text-emerald-600">Absolvições</div>
                </div>
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                  <div className="text-2xl font-bold text-rose-600">{jurado.condenacoes}</div>
                  <div className="text-xs text-rose-600">Condenações</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="text-2xl font-bold text-blue-600">{jurado.taxaAbsolvicao}%</div>
                  <div className="text-xs text-blue-600">Taxa Absolvição</div>
                </div>
              </div>
              
              <div className="space-y-2">
                {jurado.historicoSessoes.map((sessao) => (
                  <div key={sessao.id} className="flex items-center gap-3 p-3 rounded-lg border dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    {sessao.resultado === "Absolvição" ? (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Check className="w-5 h-5 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                        <X className="w-5 h-5 text-rose-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{sessao.caso}</p>
                      <p className="text-xs text-zinc-500">{sessao.data}</p>
                    </div>
                    <Badge variant="outline" className={sessao.resultado === "Absolvição" ? "text-emerald-600" : "text-rose-600"}>
                      {sessao.resultado}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Afinidades */}
        <TabsContent value="afinidades" className="space-y-4">
          {/* Visualização Gráfica de Rede */}
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="w-4 h-4" />
                Mapa de Afinidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 mb-4">
                Visualização das conexões e influências do jurado durante as sessões.
              </p>
              
              {/* Visualização em Rede */}
              <div className="relative h-64 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/50 dark:to-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                {/* Centro: Jurado Atual */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-white dark:ring-zinc-800">
                      {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-white dark:bg-zinc-800 rounded text-[10px] font-medium shadow whitespace-nowrap">
                      {jurado.nome.split(" ")[0]}
                    </div>
                  </div>
                </div>

                {/* Conexões em círculo */}
                {jurado.gruposAfinidade.map((afinidade, idx) => {
                  const totalAfinidades = jurado.gruposAfinidade.length;
                  const angle = (idx / totalAfinidades) * 2 * Math.PI - Math.PI / 2;
                  const radius = 90;
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  
                  const lineWidth = afinidade.frequencia === "alta" ? 3 : afinidade.frequencia === "media" ? 2 : 1;
                  const lineColor = afinidade.frequencia === "alta" ? "stroke-emerald-400" : afinidade.frequencia === "media" ? "stroke-amber-400" : "stroke-zinc-300";
                  
                  return (
                    <div key={afinidade.id}>
                      {/* Linha de conexão */}
                      <svg className="absolute left-1/2 top-1/2 w-[200px] h-[200px] -translate-x-1/2 -translate-y-1/2 z-10">
                        <line 
                          x1="100" y1="100" 
                          x2={100 + x} y2={100 + y}
                          className={lineColor}
                          strokeWidth={lineWidth}
                          strokeDasharray={afinidade.frequencia === "baixa" ? "4 4" : "0"}
                        />
                      </svg>
                      
                      {/* Nó do jurado conectado */}
                      <Link href={`/admin/juri/jurados/${afinidade.id}`}>
                        <div 
                          className="absolute z-20 cursor-pointer group"
                          style={{ 
                            left: `calc(50% + ${x}px - 22px)`, 
                            top: `calc(50% + ${y}px - 22px)` 
                          }}
                        >
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xs font-medium shadow-md transition-transform group-hover:scale-110 ${
                            afinidade.frequencia === "alta" 
                              ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white ring-2 ring-emerald-300" 
                              : afinidade.frequencia === "media"
                                ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-2 ring-amber-300"
                                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                          }`}>
                            {afinidade.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                          </div>
                          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 bg-zinc-900 text-white text-[9px] rounded whitespace-nowrap">
                            {afinidade.nome.split(" ").slice(0, 2).join(" ")}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}

                {/* Legenda */}
                <div className="absolute bottom-2 left-2 flex items-center gap-3 text-[9px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-1 bg-emerald-400 rounded" />
                    Alta
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-amber-400 rounded" />
                    Média
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-px bg-zinc-400 rounded border-dashed" />
                    Baixa
                  </span>
                </div>
              </div>
              
              {/* Lista de Afinidades com Análise */}
              <div className="mt-6 space-y-3">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Detalhamento das Conexões</h4>
                
                {jurado.gruposAfinidade.map((afinidade) => (
                  <div key={afinidade.id} className="flex items-center gap-3 p-3 rounded-lg border dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={`
                        ${afinidade.frequencia === "alta" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" : 
                          afinidade.frequencia === "media" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400" :
                          "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}
                      `}>
                        {afinidade.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{afinidade.nome}</p>
                      <p className="text-xs text-zinc-500">
                        {afinidade.frequencia === "alta" 
                          ? "Sentam juntos em 80%+ das sessões" 
                          : afinidade.frequencia === "media" 
                            ? "Interação frequente durante intervalos"
                            : "Contato ocasional"
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        afinidade.frequencia === "alta" ? "text-emerald-600 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700" :
                        afinidade.frequencia === "media" ? "text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700" :
                        "text-zinc-600 border-zinc-300"
                      }>
                        {afinidade.frequencia === "alta" ? "Alta" : afinidade.frequencia === "media" ? "Média" : "Baixa"}
                      </Badge>
                      <Link href={`/admin/juri/jurados/${afinidade.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Análise de Influência Inteligente */}
              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200 dark:border-violet-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-violet-900 dark:text-violet-300">Análise de Influência</p>
                    <p className="text-xs text-violet-700 dark:text-violet-400 mt-1 leading-relaxed">
                      <strong>{jurado.nome.split(" ")[0]}</strong> demonstra padrão de afinidade com jurados de perfil {jurado.tendenciaGeral === "favoravel" ? "empático/progressista" : jurado.tendenciaGeral === "desfavoravel" ? "conservador/punitivo" : "equilibrado"}.
                      {jurado.gruposAfinidade.filter(a => a.frequencia === "alta").length > 0 && (
                        <> Possui <strong>{jurado.gruposAfinidade.filter(a => a.frequencia === "alta").length}</strong> conexão(ões) forte(s) que podem reforçar sua tendência natural de voto.</>
                      )}
                    </p>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-violet-200 dark:border-violet-700">
                      <div className="text-center">
                        <p className="text-lg font-bold text-violet-700 dark:text-violet-400">{jurado.gruposAfinidade.length}</p>
                        <p className="text-[9px] text-violet-600 dark:text-violet-500 uppercase">Conexões</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600">{jurado.gruposAfinidade.filter(a => a.frequencia === "alta").length}</p>
                        <p className="text-[9px] text-zinc-500 uppercase">Fortes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-amber-600">{jurado.gruposAfinidade.filter(a => a.frequencia === "media").length}</p>
                        <p className="text-[9px] text-zinc-500 uppercase">Médias</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anotações */}
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PenLine className="w-4 h-4" />
                Anotações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {jurado.anotacoesLivres.map((nota) => (
                <div key={nota.id} className="p-3 rounded-lg border dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="text-sm">{nota.texto}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                    <Calendar className="w-3 h-3" />
                    <span>{nota.data}</span>
                    <span>•</span>
                    <span>{nota.autor}</span>
                  </div>
                </div>
              ))}
              
              <div className="pt-3 border-t dark:border-zinc-800">
                <Textarea
                  placeholder="Adicionar nova anotação..."
                  value={novaAnotacao}
                  onChange={(e) => setNovaAnotacao(e.target.value)}
                  className="mb-2 dark:bg-zinc-800 dark:border-zinc-700"
                />
                <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Anotação
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
    </TooltipProvider>
  );
}
