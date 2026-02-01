"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Plus,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Scale,
  ChevronRight,
  BarChart3,
  History,
  ArrowLeft,
  LayoutGrid,
  List,
  Eye,
  Upload,
  FileText,
  Check,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================
// TIPOS
// ============================================
interface JuradoPerfil {
  id: number;
  nome: string;
  genero: "M" | "F";
  idade?: number;
  profissao?: string;
  empresa?: string;
  perfilDominante?: "empatico" | "analitico" | "autoritario" | "conciliador" | "impulsivo";
  totalSessoes: number;
  absolvicoes: number;
  condenacoes: number;
  taxaAbsolvicao: number;
  confiabilidadePerfil: "alta" | "media" | "baixa";
  tipo?: "titular" | "suplente";
  reuniao?: string;
}

interface JuradoImportado {
  numero: number;
  nome: string;
  empresa: string;
  profissao: string;
  tipo: "titular" | "suplente";
  reuniao: string;
}

// Dados mockados
const juradosMock: JuradoPerfil[] = [
  { id: 1, nome: "Maria Helena Silva", genero: "F", idade: 52, profissao: "Professora Universitária", perfilDominante: "analitico", totalSessoes: 8, absolvicoes: 6, condenacoes: 2, taxaAbsolvicao: 75, confiabilidadePerfil: "alta" },
  { id: 2, nome: "José Carlos Mendes", genero: "M", idade: 61, profissao: "Empresário", perfilDominante: "autoritario", totalSessoes: 12, absolvicoes: 3, condenacoes: 9, taxaAbsolvicao: 25, confiabilidadePerfil: "alta" },
  { id: 3, nome: "Ana Paula Ferreira", genero: "F", idade: 38, profissao: "Enfermeira", perfilDominante: "empatico", totalSessoes: 5, absolvicoes: 4, condenacoes: 1, taxaAbsolvicao: 80, confiabilidadePerfil: "media" },
  { id: 4, nome: "Pedro Henrique Costa", genero: "M", idade: 45, profissao: "Engenheiro Civil", perfilDominante: "analitico", totalSessoes: 6, absolvicoes: 3, condenacoes: 3, taxaAbsolvicao: 50, confiabilidadePerfil: "media" },
  { id: 5, nome: "Lucia Menezes", genero: "F", idade: 55, profissao: "Comerciante", perfilDominante: "conciliador", totalSessoes: 10, absolvicoes: 6, condenacoes: 4, taxaAbsolvicao: 60, confiabilidadePerfil: "alta" },
  { id: 6, nome: "Roberto Almeida Junior", genero: "M", idade: 58, profissao: "Militar Reformado", perfilDominante: "autoritario", totalSessoes: 15, absolvicoes: 4, condenacoes: 11, taxaAbsolvicao: 27, confiabilidadePerfil: "alta" },
  { id: 7, nome: "Juliana Ribeiro Melo", genero: "F", idade: 34, profissao: "Assistente Social", perfilDominante: "empatico", totalSessoes: 7, absolvicoes: 6, condenacoes: 1, taxaAbsolvicao: 86, confiabilidadePerfil: "alta" },
];

// ============================================
// HELPERS
// ============================================
function getTendenciaIndicator(taxa: number) {
  if (taxa >= 60) return { icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" };
  if (taxa >= 40) return { icon: Scale, color: "text-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800" };
  return { icon: TrendingDown, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" };
}

function getPerfilLabel(perfil?: string) {
  const labels: Record<string, string> = {
    empatico: "Empático",
    analitico: "Analítico", 
    autoritario: "Autoritário",
    conciliador: "Conciliador",
    impulsivo: "Impulsivo",
  };
  return labels[perfil || ""] || "—";
}

// ============================================
// COMPONENTE: Modal de Importação Inteligente de Jurados
// ============================================
interface JuradoAgrupado {
  reuniao: string;
  reuniaoLabel: string;
  titulares: JuradoImportado[];
  suplentes: JuradoImportado[];
}

function ImportarJuradosModal({ 
  open, 
  onOpenChange, 
  onImport 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onImport: (jurados: JuradoImportado[]) => void;
}) {
  const [textoColado, setTextoColado] = useState("");
  const [juradosAgrupados, setJuradosAgrupados] = useState<JuradoAgrupado[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [tabAtiva, setTabAtiva] = useState("1");

  // Parser inteligente que identifica seções automaticamente
  const parseAtaCompleta = () => {
    if (!textoColado.trim()) {
      setErro("Cole toda a ata de sorteio de jurados");
      return;
    }

    setErro(null);
    const texto = textoColado;
    const agrupamentos: JuradoAgrupado[] = [];
    
    // Detectar reuniões periódicas
    const reuniaoRegex = /(\d)ª\s*Reunião\s*Periódica\s*\(([^)]+)\)/gi;
    const titularesRegex = /Titulares/gi;
    const suplentesRegex = /Suplentes/gi;
    
    // Dividir o texto em seções por reunião
    const partes = texto.split(/(?=\dª\s*Reunião\s*Periódica)/i);
    
    for (const parte of partes) {
      if (!parte.trim()) continue;
      
      // Identificar qual reunião
      const matchReuniao = parte.match(/(\d)ª\s*Reunião\s*Periódica\s*\(([^)]+)\)/i);
      if (!matchReuniao) continue;
      
      const numeroReuniao = matchReuniao[1];
      const periodoReuniao = matchReuniao[2];
      
      // Dividir em titulares e suplentes
      const parteTitulares = parte.split(/Suplentes/i)[0];
      const parteSuplentes = parte.split(/Suplentes/i)[1] || "";
      
      // Extrair texto após "Titulares"
      const textoTitulares = parteTitulares.split(/Titulares/i)[1] || parteTitulares;
      
      const titulares = parseLinhasJurados(textoTitulares, numeroReuniao, "titular");
      const suplentes = parseLinhasJurados(parteSuplentes, numeroReuniao, "suplente");
      
      if (titulares.length > 0 || suplentes.length > 0) {
        agrupamentos.push({
          reuniao: numeroReuniao,
          reuniaoLabel: `${numeroReuniao}ª Reunião (${periodoReuniao})`,
          titulares,
          suplentes,
        });
      }
    }
    
    if (agrupamentos.length === 0) {
      setErro("Não foi possível identificar as reuniões na ata. Verifique o formato.");
      return;
    }
    
    setJuradosAgrupados(agrupamentos);
    setTabAtiva(agrupamentos[0]?.reuniao || "1");
  };
  
  // Parser de linhas individuais de jurados
  const parseLinhasJurados = (texto: string, reuniao: string, tipo: "titular" | "suplente"): JuradoImportado[] => {
    const jurados: JuradoImportado[] = [];
    const linhas = texto.split("\n");
    
    for (const linha of linhas) {
      // Pular cabeçalhos de tabela
      if (linha.includes("n.º") || linha.includes("Nome") || linha.includes("Empresa") || linha.includes("Profissão")) continue;
      if (!linha.trim()) continue;
      
      // Tentar diferentes formatos
      // Formato tab-separado
      let partes = linha.split(/\t/).filter(p => p.trim());
      
      // Se não tem tabs, tentar por múltiplos espaços ou números no início
      if (partes.length < 2) {
        const matchNumero = linha.match(/^(\d+)\s+(.+)/);
        if (matchNumero) {
          const resto = matchNumero[2];
          // Tentar separar por tabs ou múltiplos espaços
          partes = [matchNumero[1], ...resto.split(/\t|\s{2,}/).filter(p => p.trim())];
        }
      }
      
      if (partes.length >= 2) {
        const numero = parseInt(partes[0].trim());
        if (isNaN(numero) || numero < 1 || numero > 30) continue;
        
        const nome = partes[1]?.trim() || "";
        const empresa = partes[2]?.trim() || "";
        const profissao = partes[3]?.trim() || "";
        
        // Validar que parece um nome (pelo menos 2 palavras ou nome longo)
        if (nome && (nome.includes(" ") || nome.length > 5)) {
          jurados.push({
            numero,
            nome,
            empresa: empresa === "-" ? "" : empresa,
            profissao: profissao === "-" ? "" : profissao,
            tipo,
            reuniao,
          });
        }
      }
    }
    
    return jurados;
  };

  const handleImportar = () => {
    const todosJurados: JuradoImportado[] = [];
    for (const grupo of juradosAgrupados) {
      todosJurados.push(...grupo.titulares, ...grupo.suplentes);
    }
    
    if (todosJurados.length === 0) {
      toast.error("Nenhum jurado para importar");
      return;
    }
    
    onImport(todosJurados);
    toast.success(`${todosJurados.length} jurados importados com sucesso!`);
    setTextoColado("");
    setJuradosAgrupados([]);
    onOpenChange(false);
  };

  const limpar = () => {
    setTextoColado("");
    setJuradosAgrupados([]);
    setErro(null);
  };
  
  const totalJurados = juradosAgrupados.reduce((acc, g) => acc + g.titulares.length + g.suplentes.length, 0);
  const grupoAtivo = juradosAgrupados.find(g => g.reuniao === tabAtiva);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center">
              <Upload className="w-5 h-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <span className="block">Importar Ata de Sorteio</span>
              <span className="text-xs font-normal text-zinc-500">Cole toda a ata - o sistema identifica automaticamente</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {juradosAgrupados.length === 0 ? (
            <div className="space-y-3">
              <Textarea
                placeholder={`Cole aqui toda a ata de sorteio de jurados...

O sistema identificará automaticamente:
• 1ª, 2ª e 3ª Reuniões Periódicas
• Jurados Titulares e Suplentes
• Nome, Empresa e Profissão

Exemplo de formato aceito:
1ª Reunião Periódica (01/02/2026 a 30/04/2026)
Titulares
1    Diana Mascarenhas dos Santos    Creche N. Senhora    Professora
2    Gledeson Santos de Araujo    Secretaria de Cultura    Assistente
...
Suplentes
1    Omar Cleiton de Vasconcelos    Cata    -
...`}
                value={textoColado}
                onChange={(e) => setTextoColado(e.target.value)}
                className="min-h-[280px] font-mono text-xs leading-relaxed"
              />
              {erro && (
                <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {erro}
                </div>
              )}
              <Button onClick={parseAtaCompleta} className="w-full h-11 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
                <FileText className="w-4 h-4 mr-2" />
                Processar Ata Completa
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                      {totalJurados} jurados identificados
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {juradosAgrupados.length} reuniões periódicas
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={limpar} className="text-emerald-700 hover:text-emerald-900">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Refazer
                </Button>
              </div>
              
              {/* Tabs por reunião */}
              <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                {juradosAgrupados.map((grupo) => (
                  <button
                    key={grupo.reuniao}
                    onClick={() => setTabAtiva(grupo.reuniao)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      tabAtiva === grupo.reuniao
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    {grupo.reuniao}ª Reunião
                    <Badge className="ml-2 h-5 text-[10px]" variant="secondary">
                      {grupo.titulares.length + grupo.suplentes.length}
                    </Badge>
                  </button>
                ))}
              </div>
              
              {/* Lista de jurados da reunião ativa */}
              {grupoAtivo && (
                <div className="space-y-4">
                  {/* Titulares */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Titulares ({grupoAtivo.titulares.length})
                      </Badge>
                    </div>
                    <div className="max-h-[180px] overflow-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
                          <tr className="border-b border-zinc-200 dark:border-zinc-800">
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 w-10">#</th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500">Nome</th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500">Empresa</th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500">Profissão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {grupoAtivo.titulares.map((j, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                              <td className="px-3 py-1.5 text-zinc-400 text-xs">{j.numero}</td>
                              <td className="px-3 py-1.5 font-medium text-zinc-800 dark:text-zinc-200 text-xs">{j.nome}</td>
                              <td className="px-3 py-1.5 text-zinc-500 text-xs">{j.empresa || "-"}</td>
                              <td className="px-3 py-1.5 text-zinc-500 text-xs">{j.profissao || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Suplentes */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Suplentes ({grupoAtivo.suplentes.length})
                      </Badge>
                    </div>
                    <div className="max-h-[180px] overflow-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
                          <tr className="border-b border-zinc-200 dark:border-zinc-800">
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 w-10">#</th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500">Nome</th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500">Empresa</th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500">Profissão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {grupoAtivo.suplentes.map((j, idx) => (
                            <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                              <td className="px-3 py-1.5 text-zinc-400 text-xs">{j.numero}</td>
                              <td className="px-3 py-1.5 font-medium text-zinc-800 dark:text-zinc-200 text-xs">{j.nome}</td>
                              <td className="px-3 py-1.5 text-zinc-500 text-xs">{j.empresa || "-"}</td>
                              <td className="px-3 py-1.5 text-zinc-500 text-xs">{j.profissao || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImportar}
            disabled={totalJurados === 0}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
          >
            <Upload className="w-4 h-4 mr-2" />
            Importar Todos ({totalJurados})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE: Stats Compactos
// ============================================
function StatsBar({ jurados }: { jurados: JuradoPerfil[] }) {
  const stats = useMemo(() => {
    const total = jurados.length;
    const favoraveis = jurados.filter(j => j.taxaAbsolvicao >= 60).length;
    const neutros = jurados.filter(j => j.taxaAbsolvicao >= 40 && j.taxaAbsolvicao < 60).length;
    const desfavoraveis = jurados.filter(j => j.taxaAbsolvicao < 40).length;
    const media = total > 0 ? Math.round(jurados.reduce((acc, j) => acc + j.taxaAbsolvicao, 0) / total) : 0;
    const sessoes = jurados.reduce((acc, j) => acc + j.totalSessoes, 0);
    return { total, favoraveis, neutros, desfavoraveis, media, sessoes };
  }, [jurados]);

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {[
        { label: "Total", value: stats.total, icon: Users, color: "text-zinc-600" },
        { label: "Favoráveis", value: stats.favoraveis, icon: TrendingUp, color: "text-emerald-600" },
        { label: "Neutros", value: stats.neutros, icon: Scale, color: "text-zinc-500" },
        { label: "Desfavoráveis", value: stats.desfavoraveis, icon: TrendingDown, color: "text-rose-600" },
        { label: "Média", value: `${stats.media}%`, icon: BarChart3, color: "text-blue-600" },
        { label: "Sessões", value: stats.sessoes, icon: History, color: "text-violet-600" },
      ].map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", stat.color)} />
              <div>
                <p className={cn("text-lg font-bold", stat.color)}>{stat.value}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-wide">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// COMPONENTE: Card Compacto do Jurado
// ============================================
function JuradoCardCompact({ jurado }: { jurado: JuradoPerfil }) {
  const tendencia = getTendenciaIndicator(jurado.taxaAbsolvicao);
  const TendIcon = tendencia.icon;

  return (
    <Link href={`/admin/juri/jurados/${jurado.id}`}>
      <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all group">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate group-hover:text-blue-600 transition-colors">
              {jurado.nome}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span className="truncate">{jurado.profissao}</span>
              {jurado.idade && <span>• {jurado.idade}a</span>}
            </div>
          </div>

          {/* Perfil */}
          <div className="hidden sm:block text-[10px] text-zinc-500 text-right w-20">
            {getPerfilLabel(jurado.perfilDominante)}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="text-center w-12">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">{jurado.totalSessoes}</p>
              <p className="text-[9px] text-zinc-400">sessões</p>
            </div>
            <div className="text-center w-10">
              <p className="font-semibold text-emerald-600">{jurado.absolvicoes}</p>
              <p className="text-[9px] text-zinc-400">abs</p>
            </div>
            <div className="text-center w-10">
              <p className="font-semibold text-rose-600">{jurado.condenacoes}</p>
              <p className="text-[9px] text-zinc-400">cond</p>
            </div>
          </div>

          {/* Taxa */}
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md", tendencia.bg)}>
            <TendIcon className={cn("w-3.5 h-3.5", tendencia.color)} />
            <span className={cn("text-sm font-bold", tendencia.color)}>{jurado.taxaAbsolvicao}%</span>
          </div>

          <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// ============================================
// COMPONENTE: Card Grid (mais visual)
// ============================================
function JuradoCardGrid({ jurado }: { jurado: JuradoPerfil }) {
  const tendencia = getTendenciaIndicator(jurado.taxaAbsolvicao);
  const TendIcon = tendencia.icon;

  return (
    <Link href={`/admin/juri/jurados/${jurado.id}`}>
      <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-sm transition-all group">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-sm font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {jurado.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200 group-hover:text-blue-600 transition-colors">
                {jurado.nome.split(" ").slice(0, 2).join(" ")}
              </p>
              <p className="text-[11px] text-zinc-500 truncate max-w-[140px]">{jurado.profissao}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] h-5 px-1.5 text-zinc-500 border-zinc-200">
            {getPerfilLabel(jurado.perfilDominante)}
          </Badge>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-[11px] mb-3">
          <div className="flex items-center gap-4">
            <span className="text-zinc-500">{jurado.totalSessoes} sessões</span>
            <span className="text-emerald-600">{jurado.absolvicoes} abs</span>
            <span className="text-rose-600">{jurado.condenacoes} cond</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md", tendencia.bg)}>
            <TendIcon className={cn("w-3.5 h-3.5", tendencia.color)} />
            <span className={cn("text-sm font-bold", tendencia.color)}>{jurado.taxaAbsolvicao}%</span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] text-zinc-500 hover:text-blue-600">
            <Eye className="w-3 h-3 mr-1" />
            Ver perfil
          </Button>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export default function JuradosPage() {
  const [busca, setBusca] = useState("");
  const [filtroTendencia, setFiltroTendencia] = useState<string>("todos");
  const [filtroPerfil, setFiltroPerfil] = useState<string>("todos");
  const [filtroReuniao, setFiltroReuniao] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [juradosImportados, setJuradosImportados] = useState<JuradoImportado[]>([]);

  const handleImportarJurados = (jurados: JuradoImportado[]) => {
    setJuradosImportados(prev => [...prev, ...jurados]);
    // Aqui seria feita a integração com o backend para salvar os jurados
  };

  // Jurados existentes (mock + importados)
  const juradosFiltrados = useMemo(() => {
    return juradosMock.filter((j) => {
      const matchBusca = j.nome.toLowerCase().includes(busca.toLowerCase()) ||
        j.profissao?.toLowerCase().includes(busca.toLowerCase());
      
      const matchTendencia = filtroTendencia === "todos" ||
        (filtroTendencia === "favoravel" && j.taxaAbsolvicao >= 60) ||
        (filtroTendencia === "neutro" && j.taxaAbsolvicao >= 40 && j.taxaAbsolvicao < 60) ||
        (filtroTendencia === "desfavoravel" && j.taxaAbsolvicao < 40);
      
      const matchPerfil = filtroPerfil === "todos" || j.perfilDominante === filtroPerfil;
      
      const matchReuniao = filtroReuniao === "todos" || j.reuniao === filtroReuniao;
      const matchTipo = filtroTipo === "todos" || j.tipo === filtroTipo;

      return matchBusca && matchTendencia && matchPerfil && matchReuniao && matchTipo;
    });
  }, [busca, filtroTendencia, filtroPerfil, filtroReuniao, filtroTipo]);
  
  // Jurados importados filtrados
  const importadosFiltrados = useMemo(() => {
    return juradosImportados.filter((j) => {
      const matchBusca = j.nome.toLowerCase().includes(busca.toLowerCase()) ||
        j.profissao?.toLowerCase().includes(busca.toLowerCase()) ||
        j.empresa?.toLowerCase().includes(busca.toLowerCase());
      
      const matchReuniao = filtroReuniao === "todos" || j.reuniao === filtroReuniao;
      const matchTipo = filtroTipo === "todos" || j.tipo === filtroTipo;

      return matchBusca && matchReuniao && matchTipo;
    });
  }, [juradosImportados, busca, filtroReuniao, filtroTipo]);
  
  // Agrupar importados por reunião e tipo para exibição organizada
  const importadosAgrupados = useMemo(() => {
    const grupos: Record<string, { titulares: JuradoImportado[]; suplentes: JuradoImportado[] }> = {};
    
    for (const j of importadosFiltrados) {
      if (!grupos[j.reuniao]) {
        grupos[j.reuniao] = { titulares: [], suplentes: [] };
      }
      if (j.tipo === "titular") {
        grupos[j.reuniao].titulares.push(j);
      } else {
        grupos[j.reuniao].suplentes.push(j);
      }
    }
    
    return grupos;
  }, [importadosFiltrados]);
  
  // Obter empresas únicas para estatísticas
  const estatisticasImportados = useMemo(() => {
    const empresas = new Set(juradosImportados.map(j => j.empresa).filter(Boolean));
    const profissoes = new Set(juradosImportados.map(j => j.profissao).filter(Boolean));
    return {
      total: juradosImportados.length,
      titulares: juradosImportados.filter(j => j.tipo === "titular").length,
      suplentes: juradosImportados.filter(j => j.tipo === "suplente").length,
      empresas: empresas.size,
      profissoes: profissoes.size,
    };
  }, [juradosImportados]);

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* SUB-HEADER */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/admin/juri">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Users className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Banco de Jurados</h1>
              <p className="text-[10px] text-zinc-500">Análise comportamental</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 text-xs border-zinc-300 dark:border-zinc-700"
              onClick={() => setImportModalOpen(true)}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Importar Lista
            </Button>
            <Button size="sm" className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Novo Jurado
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">
        {/* Stats */}
        <StatsBar jurados={juradosMock} />

        {/* Filtros */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <Input
                placeholder="Buscar por nome, empresa ou profissão..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
              />
            </div>
            
            {/* Filtros de Reunião e Tipo */}
            <Select value={filtroReuniao} onValueChange={setFiltroReuniao}>
              <SelectTrigger className="w-full md:w-44 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Reunião" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Reuniões</SelectItem>
                <SelectItem value="1">1ª Reunião (Fev-Abr)</SelectItem>
                <SelectItem value="2">2ª Reunião (Mai-Ago)</SelectItem>
                <SelectItem value="3">3ª Reunião (Set-Dez)</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full md:w-32 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="titular">Titulares</SelectItem>
                <SelectItem value="suplente">Suplentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2">
            <Select value={filtroTendencia} onValueChange={setFiltroTendencia}>
              <SelectTrigger className="w-full md:w-40 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Tendência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="favoravel">Favoráveis</SelectItem>
                <SelectItem value="neutro">Neutros</SelectItem>
                <SelectItem value="desfavoravel">Desfavoráveis</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroPerfil} onValueChange={setFiltroPerfil}>
              <SelectTrigger className="w-full md:w-36 h-9 text-sm bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="empatico">Empático</SelectItem>
                <SelectItem value="analitico">Analítico</SelectItem>
                <SelectItem value="autoritario">Autoritário</SelectItem>
                <SelectItem value="conciliador">Conciliador</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-lg">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2.5 py-1.5 rounded-md transition-all",
                  viewMode === "list" ? "bg-zinc-100 dark:bg-zinc-800" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2.5 py-1.5 rounded-md transition-all",
                  viewMode === "grid" ? "bg-zinc-100 dark:bg-zinc-800" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Lista/Grid */}
        {viewMode === "list" ? (
          <div className="space-y-2">
            {juradosFiltrados.map((jurado) => (
              <JuradoCardCompact key={jurado.id} jurado={jurado} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {juradosFiltrados.map((jurado) => (
              <JuradoCardGrid key={jurado.id} jurado={jurado} />
            ))}
          </div>
        )}

        {juradosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
            <p className="text-sm text-zinc-500">Nenhum jurado encontrado</p>
          </div>
        )}

        {/* Jurados Importados - Organizados por Período e Tipo */}
        {juradosImportados.length > 0 && (
          <div className="mt-8 space-y-6">
            {/* Header com estatísticas */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-md">
                  <Users className="w-6 h-6 text-white dark:text-zinc-900" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Jurados Sorteados 2026
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {estatisticasImportados.total} jurados • {estatisticasImportados.empresas} empresas • {estatisticasImportados.profissoes} profissões
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estatisticasImportados.titulares}</p>
                  <p className="text-[10px] font-medium text-blue-500 uppercase tracking-wider">Titulares</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{estatisticasImportados.suplentes}</p>
                  <p className="text-[10px] font-medium text-amber-500 uppercase tracking-wider">Suplentes</p>
                </div>
              </div>
            </div>
            
            {/* Listas por período */}
            {Object.entries(importadosAgrupados).map(([reuniao, grupo]) => (
              <Card key={reuniao} className="overflow-hidden border-zinc-200 dark:border-zinc-800">
                <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {reuniao}ª Reunião Periódica
                    <span className="ml-2 text-sm font-normal text-zinc-500">
                      ({reuniao === "1" ? "Fev-Abr" : reuniao === "2" ? "Mai-Ago" : "Set-Dez"}/2026)
                    </span>
                  </h3>
                </div>
                
                <div className="p-5 space-y-5">
                  {/* Titulares */}
                  {grupo.titulares.length > 0 && (
                    <div className="space-y-3">
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Titulares ({grupo.titulares.length})
                      </Badge>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {grupo.titulares.map((j, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                                {j.numero}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200 truncate">{j.nome}</p>
                                <p className="text-xs text-zinc-500 truncate">{j.empresa || "—"}</p>
                                <p className="text-[10px] text-zinc-400 truncate">{j.profissao || "—"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Suplentes */}
                  {grupo.suplentes.length > 0 && (
                    <div className="space-y-3">
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Suplentes ({grupo.suplentes.length})
                      </Badge>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {grupo.suplentes.map((j, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xs font-bold text-amber-600 dark:text-amber-400 flex-shrink-0">
                                {j.numero}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-zinc-800 dark:text-zinc-200 truncate">{j.nome}</p>
                                <p className="text-xs text-zinc-500 truncate">{j.empresa || "—"}</p>
                                <p className="text-[10px] text-zinc-400 truncate">{j.profissao || "—"}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Importação */}
      <ImportarJuradosModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImport={handleImportarJurados}
      />
    </div>
  );
}
