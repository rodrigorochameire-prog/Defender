"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  Plus,
  UserCircle2,
  Briefcase,
  MapPin,
  GraduationCap,
  Brain,
  TrendingUp,
  TrendingDown,
  Scale,
  Eye,
  ChevronRight,
  Filter,
  BarChart3,
  Users2,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  MessageCircle,
  Hash,
  Calendar,
  Award,
  AlertTriangle,
  Check,
  X,
  History,
  Target,
  Network,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TIPOS PARA PERFIL PSICOLÓGICO
// ============================================
interface JuradoPerfil {
  id: number;
  nome: string;
  genero: "M" | "F";
  idade?: number;
  profissao?: string;
  escolaridade?: string;
  bairro?: string;
  classeSocial?: string;
  estadoCivil?: string;
  filhos?: number;
  religiao?: string;
  
  // Perfil comportamental
  perfilDominante?: "empatico" | "analitico" | "autoritario" | "conciliador" | "impulsivo";
  aberturaExperiencias?: "alta" | "media" | "baixa";
  toleranciaAmbiguidade?: "alta" | "media" | "baixa";
  orientacaoValores?: "conservador" | "progressista" | "moderado";
  estiloDecisao?: "intuitivo" | "racional" | "emocional" | "misto";
  
  // Sistema de crenças (inferido)
  crencasIdentificadas: string[];
  valoresObservados: string[];
  preconceitos?: string[];
  
  // Redes sociais e pesquisa
  redesSociais?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    twitter?: string;
  };
  descobertasOnline: string[];
  
  // Observações comportamentais
  observacoesGerais: string[];
  linguagemCorporal?: string;
  expressoesFaciais?: string;
  padraoAtencao?: "focado" | "disperso" | "variavel";
  
  // Estatísticas
  totalSessoes: number;
  absolvicoes: number;
  condenacoes: number;
  taxaAbsolvicao: number;
  
  // Afinidades
  gruposAfinidade: number[]; // IDs de outros jurados
  
  // Metadados
  ultimaAtualizacao: string;
  confiabilidadePerfil: "alta" | "media" | "baixa";
  ativo: boolean;
}

// Dados mockados para demonstração
const juradosMock: JuradoPerfil[] = [
  {
    id: 1,
    nome: "Maria Helena Silva",
    genero: "F",
    idade: 52,
    profissao: "Professora Universitária",
    escolaridade: "Pós-graduação",
    bairro: "Asa Sul",
    classeSocial: "Média-alta",
    estadoCivil: "Casada",
    filhos: 2,
    religiao: "Católica",
    perfilDominante: "analitico",
    aberturaExperiencias: "alta",
    toleranciaAmbiguidade: "alta",
    orientacaoValores: "progressista",
    estiloDecisao: "racional",
    crencasIdentificadas: [
      "Valoriza educação e reabilitação",
      "Acredita em segundas chances",
      "Questiona sistema penal",
    ],
    valoresObservados: ["Justiça social", "Educação", "Família"],
    preconceitos: [],
    redesSociais: {
      instagram: "@maria.helena.prof",
      facebook: "maria.helena.silva",
      linkedin: "mariahelenasilva",
    },
    descobertasOnline: [
      "Publica sobre direitos humanos",
      "Participa de grupos de educação popular",
      "Compartilha conteúdo sobre reforma penal",
    ],
    observacoesGerais: [
      "Sempre faz anotações durante depoimentos",
      "Demonstra empatia visível com familiares do réu",
      "Questiona mentalmente evidências (expressão facial)",
    ],
    linguagemCorporal: "Aberta, inclina-se para ouvir, mantém contato visual",
    expressoesFaciais: "Expressiva, demonstra emoções claramente",
    padraoAtencao: "focado",
    totalSessoes: 8,
    absolvicoes: 6,
    condenacoes: 2,
    taxaAbsolvicao: 75,
    gruposAfinidade: [3, 7],
    ultimaAtualizacao: "2025-01-28",
    confiabilidadePerfil: "alta",
    ativo: true,
  },
  {
    id: 2,
    nome: "José Carlos Mendes",
    genero: "M",
    idade: 61,
    profissao: "Empresário",
    escolaridade: "Superior completo",
    bairro: "Lago Sul",
    classeSocial: "Alta",
    estadoCivil: "Divorciado",
    filhos: 3,
    religiao: "Evangélico",
    perfilDominante: "autoritario",
    aberturaExperiencias: "baixa",
    toleranciaAmbiguidade: "baixa",
    orientacaoValores: "conservador",
    estiloDecisao: "racional",
    crencasIdentificadas: [
      "Lei e ordem como valores supremos",
      "Punição como forma de correção",
      "Responsabilidade individual",
    ],
    valoresObservados: ["Ordem", "Trabalho", "Disciplina", "Família tradicional"],
    preconceitos: ["Possível viés contra pessoas de baixa renda"],
    redesSociais: {
      facebook: "jcmendes.empresario",
      linkedin: "josecarlosmendes",
    },
    descobertasOnline: [
      "Publica sobre empreendedorismo",
      "Compartilha conteúdo sobre segurança pública",
      "Membro de associação comercial",
    ],
    observacoesGerais: [
      "Expressão fechada durante depoimentos do réu",
      "Balança a cabeça negativamente com frequência",
      "Demonstra impaciência com argumentos emocionais",
    ],
    linguagemCorporal: "Rígida, braços cruzados frequentemente",
    expressoesFaciais: "Controlada, pouco expressiva",
    padraoAtencao: "focado",
    totalSessoes: 12,
    absolvicoes: 3,
    condenacoes: 9,
    taxaAbsolvicao: 25,
    gruposAfinidade: [6],
    ultimaAtualizacao: "2025-01-25",
    confiabilidadePerfil: "alta",
    ativo: true,
  },
  {
    id: 3,
    nome: "Ana Paula Ferreira",
    genero: "F",
    idade: 38,
    profissao: "Enfermeira",
    escolaridade: "Superior completo",
    bairro: "Taguatinga",
    classeSocial: "Média",
    estadoCivil: "Casada",
    filhos: 1,
    religiao: "Espírita",
    perfilDominante: "empatico",
    aberturaExperiencias: "alta",
    toleranciaAmbiguidade: "media",
    orientacaoValores: "progressista",
    estiloDecisao: "emocional",
    crencasIdentificadas: [
      "Acredita em recuperação",
      "Valoriza histórias de vida",
      "Considera contexto social",
    ],
    valoresObservados: ["Compaixão", "Cuidado", "Justiça restaurativa"],
    redesSociais: {
      instagram: "@ana.ferreira.enf",
    },
    descobertasOnline: [
      "Voluntária em ONG de acolhimento",
      "Compartilha sobre saúde mental",
    ],
    observacoesGerais: [
      "Demonstra emoção com depoimentos tristes",
      "Olha frequentemente para o réu",
      "Parece formar opinião pelo contexto social",
    ],
    linguagemCorporal: "Empática, inclina-se quando ouve",
    padraoAtencao: "variavel",
    totalSessoes: 5,
    absolvicoes: 4,
    condenacoes: 1,
    taxaAbsolvicao: 80,
    gruposAfinidade: [1, 7],
    ultimaAtualizacao: "2025-01-20",
    confiabilidadePerfil: "media",
    ativo: true,
  },
  {
    id: 4,
    nome: "Pedro Henrique Lima",
    genero: "M",
    idade: 45,
    profissao: "Engenheiro Civil",
    escolaridade: "Pós-graduação",
    bairro: "Águas Claras",
    classeSocial: "Média-alta",
    estadoCivil: "Casado",
    filhos: 2,
    perfilDominante: "analitico",
    aberturaExperiencias: "media",
    toleranciaAmbiguidade: "alta",
    orientacaoValores: "moderado",
    estiloDecisao: "racional",
    crencasIdentificadas: [
      "Valoriza provas técnicas",
      "Busca lógica nos argumentos",
      "Desconfia de emocionalismos",
    ],
    valoresObservados: ["Precisão", "Lógica", "Imparcialidade"],
    observacoesGerais: [
      "Faz cálculos mentais durante depoimentos",
      "Presta atenção em datas e números",
      "Expressão neutra constante",
    ],
    padraoAtencao: "focado",
    totalSessoes: 6,
    absolvicoes: 3,
    condenacoes: 3,
    taxaAbsolvicao: 50,
    gruposAfinidade: [],
    ultimaAtualizacao: "2025-01-15",
    confiabilidadePerfil: "media",
    ativo: true,
  },
  {
    id: 5,
    nome: "Fernanda Costa Santos",
    genero: "F",
    idade: 29,
    profissao: "Designer Gráfica",
    escolaridade: "Superior completo",
    bairro: "Sudoeste",
    classeSocial: "Média",
    estadoCivil: "Solteira",
    perfilDominante: "impulsivo",
    aberturaExperiencias: "alta",
    toleranciaAmbiguidade: "media",
    orientacaoValores: "progressista",
    estiloDecisao: "intuitivo",
    crencasIdentificadas: [
      "Intuição é importante",
      "Aparência transmite verdade",
      "Primeira impressão conta muito",
    ],
    valoresObservados: ["Autenticidade", "Criatividade", "Liberdade"],
    redesSociais: {
      instagram: "@fercosta.design",
      linkedin: "fernandacostasantos",
    },
    descobertasOnline: [
      "Portfolio de design social",
      "Segue muitos perfis de ativismo",
    ],
    observacoesGerais: [
      "Reage rapidamente a estímulos",
      "Expressão facial muito mutável",
      "Parece decidir nos primeiros minutos",
    ],
    padraoAtencao: "variavel",
    totalSessoes: 3,
    absolvicoes: 2,
    condenacoes: 1,
    taxaAbsolvicao: 67,
    gruposAfinidade: [7],
    ultimaAtualizacao: "2025-01-10",
    confiabilidadePerfil: "baixa",
    ativo: true,
  },
  {
    id: 6,
    nome: "Roberto Almeida Junior",
    genero: "M",
    idade: 58,
    profissao: "Militar Reformado",
    escolaridade: "Superior completo",
    bairro: "Cruzeiro",
    classeSocial: "Média",
    estadoCivil: "Casado",
    filhos: 4,
    religiao: "Católico",
    perfilDominante: "autoritario",
    aberturaExperiencias: "baixa",
    toleranciaAmbiguidade: "baixa",
    orientacaoValores: "conservador",
    estiloDecisao: "racional",
    crencasIdentificadas: [
      "Hierarquia e ordem",
      "Punição como exemplo",
      "Responsabilização rigorosa",
    ],
    valoresObservados: ["Disciplina", "Hierarquia", "Pátria", "Família"],
    preconceitos: ["Rigidez com jovens infratores"],
    observacoesGerais: [
      "Postura ereta e atenta",
      "Olha fixamente para testemunhas",
      "Expressão severa durante interrogatório",
    ],
    linguagemCorporal: "Muito rígida, mãos no colo",
    padraoAtencao: "focado",
    totalSessoes: 15,
    absolvicoes: 4,
    condenacoes: 11,
    taxaAbsolvicao: 27,
    gruposAfinidade: [2],
    ultimaAtualizacao: "2025-01-22",
    confiabilidadePerfil: "alta",
    ativo: true,
  },
  {
    id: 7,
    nome: "Juliana Ribeiro Melo",
    genero: "F",
    idade: 34,
    profissao: "Assistente Social",
    escolaridade: "Pós-graduação",
    bairro: "Ceilândia",
    classeSocial: "Média",
    estadoCivil: "União estável",
    filhos: 1,
    perfilDominante: "empatico",
    aberturaExperiencias: "alta",
    toleranciaAmbiguidade: "alta",
    orientacaoValores: "progressista",
    estiloDecisao: "emocional",
    crencasIdentificadas: [
      "Contexto social é fundamental",
      "Sistema gera desigualdades",
      "Recuperação é possível com apoio",
    ],
    valoresObservados: ["Igualdade", "Justiça social", "Empatia"],
    redesSociais: {
      instagram: "@ju.ribeiro.social",
      facebook: "juliana.ribeiro.melo",
    },
    descobertasOnline: [
      "Trabalha com população em situação de rua",
      "Ativista de direitos humanos",
    ],
    observacoesGerais: [
      "Muito atenta a contexto social do réu",
      "Demonstra incômodo com desigualdades",
      "Faz perguntas mentais (expressão)",
    ],
    padraoAtencao: "focado",
    totalSessoes: 7,
    absolvicoes: 6,
    condenacoes: 1,
    taxaAbsolvicao: 86,
    gruposAfinidade: [1, 3, 5],
    ultimaAtualizacao: "2025-01-30",
    confiabilidadePerfil: "alta",
    ativo: true,
  },
];

// ============================================
// HELPERS
// ============================================
function getPerfilColor(perfil: string | undefined) {
  const cores: Record<string, { bg: string; text: string; border: string }> = {
    empatico: { bg: "bg-pink-100 dark:bg-pink-900/30", text: "text-pink-700 dark:text-pink-400", border: "border-pink-300 dark:border-pink-700" },
    analitico: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-300 dark:border-blue-700" },
    autoritario: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", border: "border-red-300 dark:border-red-700" },
    conciliador: { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-400", border: "border-teal-300 dark:border-teal-700" },
    impulsivo: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-300 dark:border-amber-700" },
  };
  return cores[perfil || ""] || { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-700 dark:text-zinc-400", border: "border-zinc-300 dark:border-zinc-700" };
}

function getTendenciaConfig(taxa: number) {
  if (taxa >= 70) return { label: "Favorável à Defesa", color: "text-emerald-600 dark:text-emerald-400", icon: <TrendingUp className="w-4 h-4" /> };
  if (taxa >= 40) return { label: "Equilibrado", color: "text-amber-600 dark:text-amber-400", icon: <Scale className="w-4 h-4" /> };
  return { label: "Favorável à Acusação", color: "text-rose-600 dark:text-rose-400", icon: <TrendingDown className="w-4 h-4" /> };
}

function getConfiabilidadeConfig(conf: string) {
  const configs: Record<string, { label: string; color: string }> = {
    alta: { label: "Alta Confiabilidade", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    media: { label: "Média Confiabilidade", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    baixa: { label: "Baixa Confiabilidade", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  };
  return configs[conf] || configs.media;
}

// ============================================
// COMPONENTE: Card do Jurado
// ============================================
function JuradoCard({ jurado }: { jurado: JuradoPerfil }) {
  const perfilColor = getPerfilColor(jurado.perfilDominante);
  const tendencia = getTendenciaConfig(jurado.taxaAbsolvicao);
  const confiabilidade = getConfiabilidadeConfig(jurado.confiabilidadePerfil);

  return (
    <Link href={`/admin/juri/jurados/${jurado.id}`}>
      <Card className="hover:shadow-lg transition-all cursor-pointer group border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/80">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className={cn(
                "text-base font-semibold",
                jurado.genero === "F" 
                  ? "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
              )}>
                {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {jurado.nome}
              </h3>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Briefcase className="w-3 h-3" />
                <span className="truncate">{jurado.profissao || "Não informado"}</span>
              </div>
              {jurado.idade && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{jurado.idade} anos</span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-amber-500 transition-colors" />
          </div>

          {/* Perfil Psicológico */}
          {jurado.perfilDominante && (
            <div className={cn("px-2 py-1 rounded-md text-xs font-medium w-fit mb-3 border", perfilColor.bg, perfilColor.text, perfilColor.border)}>
              <Brain className="w-3 h-3 inline mr-1" />
              {jurado.perfilDominante.charAt(0).toUpperCase() + jurado.perfilDominante.slice(1)}
            </div>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
              <div className="text-lg font-bold text-zinc-700 dark:text-zinc-300">{jurado.totalSessoes}</div>
              <div className="text-[10px] text-zinc-500 dark:text-zinc-500">Sessões</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{jurado.absolvicoes}</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Absolv.</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-rose-50 dark:bg-rose-900/20">
              <div className="text-lg font-bold text-rose-600 dark:text-rose-400">{jurado.condenacoes}</div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400">Conden.</div>
            </div>
          </div>

          {/* Tendência */}
          <div className={cn("flex items-center gap-2 text-sm", tendencia.color)}>
            {tendencia.icon}
            <span className="font-medium">{jurado.taxaAbsolvicao}%</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500">absolvição</span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Badge variant="outline" className={cn("text-[10px]", confiabilidade.color)}>
              {confiabilidade.label}
            </Badge>
            {jurado.gruposAfinidade.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                <Network className="w-3 h-3" />
                <span>{jurado.gruposAfinidade.length} afinidades</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================
// COMPONENTE: Estatísticas Gerais
// ============================================
function EstatisticasGerais({ jurados }: { jurados: JuradoPerfil[] }) {
  const stats = useMemo(() => {
    const total = jurados.length;
    const favoraveisDefesa = jurados.filter(j => j.taxaAbsolvicao >= 60).length;
    const neutros = jurados.filter(j => j.taxaAbsolvicao >= 40 && j.taxaAbsolvicao < 60).length;
    const favoraveisAcusacao = jurados.filter(j => j.taxaAbsolvicao < 40).length;
    const mediaAbsolvicao = jurados.reduce((acc, j) => acc + j.taxaAbsolvicao, 0) / total;
    const totalSessoes = jurados.reduce((acc, j) => acc + j.totalSessoes, 0);

    return { total, favoraveisDefesa, neutros, favoraveisAcusacao, mediaAbsolvicao, totalSessoes };
  }, [jurados]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
        <CardContent className="p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-zinc-500" />
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-zinc-500">Total Jurados</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-emerald-900/20 dark:border-emerald-800/50">
        <CardContent className="p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.favoraveisDefesa}</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Favoráveis Defesa</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-amber-900/20 dark:border-amber-800/50">
        <CardContent className="p-4 text-center">
          <Scale className="w-6 h-6 mx-auto mb-2 text-amber-500" />
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.neutros}</div>
          <div className="text-xs text-amber-600 dark:text-amber-400">Equilibrados</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-rose-900/20 dark:border-rose-800/50">
        <CardContent className="p-4 text-center">
          <TrendingDown className="w-6 h-6 mx-auto mb-2 text-rose-500" />
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.favoraveisAcusacao}</div>
          <div className="text-xs text-rose-600 dark:text-rose-400">Favoráveis Acusação</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
        <CardContent className="p-4 text-center">
          <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-500" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.mediaAbsolvicao.toFixed(0)}%</div>
          <div className="text-xs text-zinc-500">Média Absolvição</div>
        </CardContent>
      </Card>
      <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
        <CardContent className="p-4 text-center">
          <History className="w-6 h-6 mx-auto mb-2 text-purple-500" />
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.totalSessoes}</div>
          <div className="text-xs text-zinc-500">Total Sessões</div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export default function JuradosPage() {
  const [busca, setBusca] = useState("");
  const [filtroTendencia, setFiltroTendencia] = useState<string>("todos");
  const [filtroPerfil, setFiltroPerfil] = useState<string>("todos");

  const juradosFiltrados = useMemo(() => {
    return juradosMock.filter((j) => {
      const matchBusca = j.nome.toLowerCase().includes(busca.toLowerCase()) ||
        j.profissao?.toLowerCase().includes(busca.toLowerCase()) ||
        j.bairro?.toLowerCase().includes(busca.toLowerCase());
      
      const matchTendencia = filtroTendencia === "todos" ||
        (filtroTendencia === "favoravel_defesa" && j.taxaAbsolvicao >= 60) ||
        (filtroTendencia === "equilibrado" && j.taxaAbsolvicao >= 40 && j.taxaAbsolvicao < 60) ||
        (filtroTendencia === "favoravel_acusacao" && j.taxaAbsolvicao < 40);
      
      const matchPerfil = filtroPerfil === "todos" || j.perfilDominante === filtroPerfil;

      return matchBusca && matchTendencia && matchPerfil;
    });
  }, [busca, filtroTendencia, filtroPerfil]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* SUB-HEADER - Padrão Defender */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/admin/juri">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-800">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Banco de Jurados</h1>
              <p className="text-[10px] text-zinc-500">Perfis psicológicos e análise comportamental</p>
            </div>
          </div>
          
          <Button size="sm" className="h-8 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Novo Jurado
          </Button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* Estatísticas */}
        <EstatisticasGerais jurados={juradosMock} />

        {/* Filtros */}
        <Card className="border-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/80">
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <Input
                  placeholder="Buscar por nome, profissão ou bairro..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 h-8 text-xs dark:bg-zinc-800 dark:border-zinc-700"
                />
              </div>
              <Select value={filtroTendencia} onValueChange={setFiltroTendencia}>
                <SelectTrigger className="w-full md:w-[180px] h-8 text-xs dark:bg-zinc-800 dark:border-zinc-700">
                  <SelectValue placeholder="Tendência" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                  <SelectItem value="todos">Todas tendências</SelectItem>
                  <SelectItem value="favoravel_defesa">Favorável Defesa</SelectItem>
                  <SelectItem value="equilibrado">Equilibrado</SelectItem>
                  <SelectItem value="favoravel_acusacao">Favorável Acusação</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
                <SelectTrigger className="w-full md:w-[160px] h-8 text-xs dark:bg-zinc-800 dark:border-zinc-700">
                  <SelectValue placeholder="Perfil" />
                </SelectTrigger>
                <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
                  <SelectItem value="todos">Todos perfis</SelectItem>
                  <SelectItem value="empatico">Empático</SelectItem>
                  <SelectItem value="analitico">Analítico</SelectItem>
                  <SelectItem value="autoritario">Autoritário</SelectItem>
                  <SelectItem value="conciliador">Conciliador</SelectItem>
                  <SelectItem value="impulsivo">Impulsivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grid de Jurados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {juradosFiltrados.map((jurado) => (
            <JuradoCard key={jurado.id} jurado={jurado} />
          ))}
        </div>

        {juradosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
            <p className="text-sm text-zinc-500">Nenhum jurado encontrado com os filtros aplicados</p>
          </div>
        )}
      </div>
    </div>
  );
}
