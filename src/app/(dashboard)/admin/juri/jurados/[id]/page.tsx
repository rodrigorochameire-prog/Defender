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
} from "lucide-react";
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
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* SUB-HEADER - Padrão Defender */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/juri/jurados">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Avatar className="h-10 w-10">
              <AvatarFallback className={cn(
                "text-sm font-semibold",
                jurado.genero === "F" 
                  ? "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
              )}>
                {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{jurado.nome}</h1>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <Briefcase className="w-3 h-3" />
                <span>{jurado.profissao}</span>
                <span>•</span>
                <MapPin className="w-3 h-3" />
                <span>{jurado.bairro}</span>
                <span>•</span>
                <span>{jurado.idade} anos</span>
              </div>
            </div>
          </div>
          <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <Save className="w-3.5 h-3.5 mr-1.5" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">

        {/* Resumo rápido */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={cn("p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center gap-3", perfilConfig.color)}>
            {perfilConfig.icon}
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Perfil</div>
              <div className="font-semibold text-sm">{perfilConfig.label}</div>
            </div>
          </div>
          <div className={cn("p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center gap-3")}>
            {tendenciaLabel.icon}
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Tendência</div>
              <div className={cn("font-semibold text-sm", tendenciaLabel.color)}>{tendenciaLabel.text}</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Taxa Absolvição</div>
              <div className="font-semibold text-sm text-blue-600 dark:text-blue-400">{jurado.taxaAbsolvicao}%</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            <History className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Sessões</div>
              <div className="font-semibold text-sm text-violet-600 dark:text-violet-400">{jurado.totalSessoes} participações</div>
            </div>
          </div>
        </div>

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
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="w-4 h-4" />
                Mapa de Afinidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 mb-4">
                Jurados com quem frequentemente senta junto ou conversa durante as sessões.
              </p>
              
              <div className="space-y-3">
                {jurado.gruposAfinidade.map((afinidade) => (
                  <div key={afinidade.id} className="flex items-center gap-3 p-3 rounded-lg border dark:border-zinc-800">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400">
                        {afinidade.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{afinidade.nome}</p>
                      <p className="text-xs text-zinc-500">Frequência de interação: {afinidade.frequencia}</p>
                    </div>
                    <Badge variant="outline" className={
                      afinidade.frequencia === "alta" ? "text-emerald-600 border-emerald-300" :
                      afinidade.frequencia === "media" ? "text-amber-600 border-amber-300" :
                      "text-zinc-600"
                    }>
                      {afinidade.frequencia === "alta" ? "Alta" : afinidade.frequencia === "media" ? "Média" : "Baixa"}
                    </Badge>
                    <Link href={`/admin/juri/jurados/${afinidade.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Análise de Influência</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                      {jurado.nome} tende a sentar com jurados de perfil similar (empáticos/progressistas). 
                      Possível reforço mútuo de tendência à absolvição.
                    </p>
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
  );
}
