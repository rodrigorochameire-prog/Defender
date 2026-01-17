"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Users, 
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  AlertOctagon,
  Phone,
  Scale,
  LayoutGrid,
  List,
  MapPin,
  FileText,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Timer,
  Camera,
  Upload,
  User,
  Brain,
  Bookmark,
  BookmarkCheck,
  Gavel,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Info,
  CircleDot,
  Circle,
  Target,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, differenceInDays, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Dados mockados expandidos com informações processuais detalhadas
const mockAssistidos = [
  { 
    id: 1, 
    nome: "Diego Bonfim Almeida",
    vulgo: "Diegão",
    cpf: "123.456.789-00",
    rg: "12.345.678-90 SSP/BA",
    dataNascimento: "1990-05-15",
    nomeMae: "Maria Almeida Santos",
    naturalidade: "Salvador/BA",
    endereco: "Rua das Flores, 123, Centro, Camaçari/BA",
    bairro: "Centro",
    cidade: "Camaçari",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Candeias",
    dataPrisao: "2024-11-20",
    crimePrincipal: "Homicídio Qualificado (Art. 121, §2º, CP)",
    artigos: ["121, §2º", "14, II"],
    telefone: "(71) 99999-1234",
    telefoneContato: "(71) 98888-5678",
    nomeContato: "Maria Almeida (Mãe)",
    processosAtivos: 2,
    demandasAbertas: 3,
    proximoPrazo: "2026-01-15",
    atoProximoPrazo: "Resposta à Acusação",
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    // Informações processuais detalhadas
    faseProcessual: "INSTRUCAO",
    numeroProcesso: "8012906-74.2025.8.05.0039",
    dataFato: "2024-11-15",
    resumoFato: "Suposto homicídio ocorrido no bairro Centro, durante discussão em bar. Vítima: João da Silva.",
    teseDaDefesa: "Legítima defesa. Réu agiu para proteger sua vida após ser atacado com faca.",
    ultimaAudiencia: "2026-01-10",
    tipoUltimaAudiencia: "Instrução e Julgamento",
    proximaAudiencia: "2026-02-20",
    tipoProximaAudiencia: "Continuação de Instrução",
    testemunhasArroladas: [
      { nome: "Maria Silva", tipo: "defesa", ouvida: true, data: "2026-01-10" },
      { nome: "Pedro Santos", tipo: "defesa", ouvida: false, data: null },
      { nome: "José Oliveira", tipo: "acusacao", ouvida: true, data: "2026-01-10" },
      { nome: "Ana Costa", tipo: "acusacao", ouvida: false, data: null },
    ],
    interrogatorioRealizado: false,
    observacoesProcesso: "Réu nega autoria. Alega que estava em legítima defesa após ser atacado primeiro.",
    estrategiaDefesaAtual: "Focar na produção de prova testemunhal que comprove a agressão prévia da vítima. Solicitar perícia nas imagens de câmera de segurança do bar. Preparar quesitação para tese de legítima defesa.",
  },
  { 
    id: 2, 
    nome: "Maria Silva Santos",
    vulgo: null,
    cpf: "987.654.321-00",
    rg: "98.765.432-10 SSP/BA",
    dataNascimento: "1985-08-22",
    nomeMae: "Ana Santos Costa",
    naturalidade: "Lauro de Freitas/BA",
    endereco: "Av. Principal, 456, Itinga, Lauro de Freitas/BA",
    bairro: "Itinga",
    cidade: "Lauro de Freitas",
    statusPrisional: "SOLTO",
    unidadePrisional: null,
    dataPrisao: null,
    crimePrincipal: "Lesão Corporal (Art. 129, §9º, CP)",
    artigos: ["129, §9º"],
    telefone: "(71) 97777-4321",
    telefoneContato: null,
    nomeContato: null,
    processosAtivos: 1,
    demandasAbertas: 1,
    proximoPrazo: "2026-01-20",
    atoProximoPrazo: "Alegações Finais",
    defensor: "Dra. Juliane",
    area: "VIOLENCIA_DOMESTICA",
    photoUrl: null,
    faseProcessual: "ALEGACOES_FINAIS",
    numeroProcesso: "0001234-56.2025.8.05.0039",
    dataFato: "2025-06-10",
    resumoFato: "Discussão com companheiro que a agrediu. Assistida reagiu causando lesões no agressor.",
    teseDaDefesa: "Legítima defesa da mulher agredida. Excludente de ilicitude.",
    ultimaAudiencia: "2025-12-15",
    tipoUltimaAudiencia: "Instrução",
    proximaAudiencia: null,
    tipoProximaAudiencia: null,
    testemunhasArroladas: [
      { nome: "Vizinha Clara", tipo: "defesa", ouvida: true, data: "2025-12-15" },
      { nome: "Filho menor", tipo: "informante", ouvida: true, data: "2025-12-15" },
    ],
    interrogatorioRealizado: true,
    observacoesProcesso: "Instrução encerrada. Aguardando prazo para alegações finais.",
    estrategiaDefesaAtual: "Alegações finais por memoriais. Enfatizar histórico de agressões sofridas pela assistida e laudo pericial que comprova lesões antigas. Requerer absolvição por legítima defesa.",
  },
  { 
    id: 3, 
    nome: "José Carlos Oliveira",
    vulgo: "Zé do Morro",
    cpf: "456.789.123-00",
    rg: "45.678.912-30 SSP/BA",
    dataNascimento: "1978-12-03",
    nomeMae: "Francisca Oliveira",
    naturalidade: "Camaçari/BA",
    endereco: "Trav. do Comércio, 78, Phoc II, Camaçari/BA",
    bairro: "Phoc II",
    cidade: "Camaçari",
    statusPrisional: "PENITENCIARIA",
    unidadePrisional: "Conjunto Penal de Candeias",
    dataPrisao: "2023-06-15",
    crimePrincipal: "Tráfico de Drogas (Art. 33, Lei 11.343/06)",
    artigos: ["33, caput", "35"],
    telefone: null,
    telefoneContato: "(71) 96666-9999",
    nomeContato: "Ana Oliveira (Esposa)",
    processosAtivos: 3,
    demandasAbertas: 5,
    proximoPrazo: "2026-01-14",
    atoProximoPrazo: "Agravo em Execução",
    defensor: "Dr. Rodrigo",
    area: "EXECUCAO_PENAL",
    photoUrl: null,
    faseProcessual: "EXECUCAO",
    numeroProcesso: "0005678-90.2024.8.05.0039",
    dataFato: "2023-06-10",
    resumoFato: "Preso em flagrante com 50g de cocaína em residência. Alega ser usuário.",
    teseDaDefesa: "Desclassificação para porte para uso pessoal. Quantidade compatível com consumo.",
    ultimaAudiencia: null,
    tipoUltimaAudiencia: null,
    proximaAudiencia: null,
    tipoProximaAudiencia: null,
    testemunhasArroladas: [],
    interrogatorioRealizado: true,
    observacoesProcesso: "Condenado em 1º grau. Cumpre pena. Aguardando progressão de regime (2/5 cumprido).",
    estrategiaDefesaAtual: "Acompanhar cálculo de pena na VEP. Preparar pedido de progressão para regime semiaberto (data prevista: Março/2026). Verificar remição por trabalho e estudo.",
  },
  { 
    id: 4, 
    nome: "Ana Paula Costa Ferreira",
    vulgo: "Paulinha",
    cpf: "321.654.987-00",
    rg: "32.165.498-70 SSP/BA",
    dataNascimento: "1995-03-28",
    nomeMae: "Teresa Costa",
    naturalidade: "Salvador/BA",
    endereco: "Rua Nova, 200, Centro, Dias D'Ávila/BA",
    bairro: "Centro",
    cidade: "Dias D'Ávila",
    statusPrisional: "MONITORADO",
    unidadePrisional: null,
    dataPrisao: null,
    crimePrincipal: "Ameaça (Art. 147, CP)",
    artigos: ["147"],
    telefone: "(71) 95555-1111",
    telefoneContato: "(71) 94444-2222",
    nomeContato: "Pedro Costa (Irmão)",
    processosAtivos: 1,
    demandasAbertas: 2,
    proximoPrazo: "2026-01-18",
    atoProximoPrazo: "Pedido de Revogação",
    defensor: "Dra. Juliane",
    area: "VIOLENCIA_DOMESTICA",
    photoUrl: null,
    faseProcessual: "INSTRUCAO",
    numeroProcesso: "0002345-67.2025.8.05.0039",
    dataFato: "2025-09-20",
    resumoFato: "Acusada de ameaçar ex-companheiro após término conturbado.",
    teseDaDefesa: "Atipicidade. Discussão verbal sem grave ameaça.",
    ultimaAudiencia: "2025-11-20",
    tipoUltimaAudiencia: "Audiência de Custódia",
    proximaAudiencia: "2026-02-10",
    tipoProximaAudiencia: "Instrução",
    testemunhasArroladas: [
      { nome: "Amiga Carla", tipo: "defesa", ouvida: false, data: null },
      { nome: "Ex-companheiro", tipo: "vitima", ouvida: false, data: null },
    ],
    interrogatorioRealizado: false,
    observacoesProcesso: "Monitoramento eletrônico há 3 meses. Pedido de revogação em andamento.",
    estrategiaDefesaAtual: "Insistir no pedido de revogação do monitoramento (bom comportamento). Na instrução, demonstrar atipicidade da conduta - discussão verbal sem ameaça grave.",
  },
  { 
    id: 5, 
    nome: "Roberto Ferreira Lima",
    vulgo: "Betão",
    cpf: "654.321.987-00",
    rg: "65.432.198-70 SSP/BA",
    dataNascimento: "1982-07-10",
    nomeMae: "Joana Lima",
    naturalidade: "Dias D'Ávila/BA",
    endereco: "Av. Central, 500, Centro, Dias D'Ávila/BA",
    bairro: "Centro",
    cidade: "Dias D'Ávila",
    statusPrisional: "DOMICILIAR",
    unidadePrisional: null,
    dataPrisao: null,
    crimePrincipal: "Homicídio Simples (Art. 121, CP)",
    artigos: ["121, caput"],
    telefone: "(71) 93333-3333",
    telefoneContato: null,
    nomeContato: null,
    processosAtivos: 2,
    demandasAbertas: 1,
    proximoPrazo: null,
    atoProximoPrazo: null,
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    faseProcessual: "SUMARIO_CULPA",
    numeroProcesso: "0003456-78.2025.8.05.0039",
    dataFato: "2025-01-05",
    resumoFato: "Acidente de trânsito com vítima fatal. Réu conduzia veículo embriagado.",
    teseDaDefesa: "Culpa consciente vs. dolo eventual. Negativa de embriaguez ao volante.",
    ultimaAudiencia: "2025-10-15",
    tipoUltimaAudiencia: "Sumário da Culpa",
    proximaAudiencia: "2026-03-10",
    tipoProximaAudiencia: "Plenário do Júri",
    testemunhasArroladas: [
      { nome: "Perito trânsito", tipo: "acusacao", ouvida: true, data: "2025-10-15" },
      { nome: "Passageiro", tipo: "defesa", ouvida: true, data: "2025-10-15" },
    ],
    interrogatorioRealizado: true,
    observacoesProcesso: "Pronúncia mantida. Plenário designado. Prisão domiciliar por saúde.",
    estrategiaDefesaAtual: "Preparar sustentação oral para plenário. Focar em culpa consciente vs. dolo eventual. Estudar perfil dos jurados. Preparar testemunha de defesa (passageiro) para depor novamente em plenário.",
  },
  { 
    id: 6, 
    nome: "Carlos Eduardo Mendes",
    vulgo: "Cadu",
    cpf: "789.123.456-00",
    rg: "78.912.345-60 SSP/BA",
    dataNascimento: "1988-11-18",
    nomeMae: "Regina Mendes",
    naturalidade: "Simões Filho/BA",
    endereco: "Rua do Sol, 89, Centro, Simões Filho/BA",
    bairro: "Centro",
    cidade: "Simões Filho",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Simões Filho",
    dataPrisao: "2025-12-01",
    crimePrincipal: "Roubo Majorado (Art. 157, §2º, CP)",
    artigos: ["157, §2º"],
    telefone: null,
    telefoneContato: "(71) 92222-4444",
    nomeContato: "João Mendes (Pai)",
    processosAtivos: 1,
    demandasAbertas: 4,
    proximoPrazo: "2026-01-15",
    atoProximoPrazo: "Habeas Corpus",
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    faseProcessual: "INQUERITO",
    numeroProcesso: "0006789-01.2025.8.05.0039",
    dataFato: "2025-11-28",
    resumoFato: "Acusado de roubo a transeunte com uso de arma branca.",
    teseDaDefesa: "Negativa de autoria. Reconhecimento fotográfico irregular.",
    ultimaAudiencia: "2025-12-02",
    tipoUltimaAudiencia: "Custódia",
    proximaAudiencia: null,
    tipoProximaAudiencia: null,
    testemunhasArroladas: [],
    interrogatorioRealizado: false,
    observacoesProcesso: "Preso em flagrante. Excesso de prazo na conclusão do IP. HC impetrado.",
    estrategiaDefesaAtual: "Prioridade: obter liberdade via HC por excesso de prazo. Subsidiariamente, questionar validade do reconhecimento fotográfico (súmula 52 SDJE). Preparar defesa para eventual denúncia.",
  },
];

// Configurações de status e fases
const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; iconBg: string; priority: number }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 1 },
  PENITENCIARIA: { label: "Penitenciária", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 2 },
  COP: { label: "COP", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 3 },
  HOSPITAL_CUSTODIA: { label: "Hosp. Custódia", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 4 },
  MONITORADO: { label: "Monitorado", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50/80 dark:bg-amber-950/20", borderColor: "border-amber-200/60 dark:border-amber-800/30", iconBg: "bg-amber-100 dark:bg-amber-900/40", priority: 5 },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-50/80 dark:bg-orange-950/20", borderColor: "border-orange-200/60 dark:border-orange-800/30", iconBg: "bg-orange-100 dark:bg-orange-900/40", priority: 6 },
  SOLTO: { label: "Solto", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50/80 dark:bg-emerald-950/20", borderColor: "border-emerald-200/60 dark:border-emerald-800/30", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", priority: 7 },
};

const faseConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  INQUERITO: { label: "Inquérito", color: "text-slate-600", bgColor: "bg-slate-100", icon: FileText },
  INSTRUCAO: { label: "Instrução", color: "text-blue-600", bgColor: "bg-blue-100", icon: Scale },
  SUMARIO_CULPA: { label: "Sumário Culpa", color: "text-violet-600", bgColor: "bg-violet-100", icon: Gavel },
  ALEGACOES_FINAIS: { label: "Alegações Finais", color: "text-amber-600", bgColor: "bg-amber-100", icon: FileText },
  SENTENCA: { label: "Sentença", color: "text-orange-600", bgColor: "bg-orange-100", icon: Gavel },
  RECURSO: { label: "Recurso", color: "text-purple-600", bgColor: "bg-purple-100", icon: Scale },
  EXECUCAO: { label: "Execução", color: "text-rose-600", bgColor: "bg-rose-100", icon: Clock },
  ARQUIVADO: { label: "Arquivado", color: "text-gray-500", bgColor: "bg-gray-100", icon: CheckCircle2 },
};

const areaConfig: Record<string, { label: string; labelFull: string; color: string; bgColor: string }> = {
  JURI: { label: "Júri", labelFull: "Tribunal do Júri", color: "text-violet-600", bgColor: "bg-violet-50" },
  EXECUCAO_PENAL: { label: "EP", labelFull: "Execução Penal", color: "text-blue-600", bgColor: "bg-blue-50" },
  VIOLENCIA_DOMESTICA: { label: "VVD", labelFull: "Violência Doméstica", color: "text-pink-600", bgColor: "bg-pink-50" },
  SUBSTITUICAO: { label: "Sub", labelFull: "Substituição", color: "text-orange-600", bgColor: "bg-orange-50" },
  FAMILIA: { label: "Fam", labelFull: "Família", color: "text-rose-600", bgColor: "bg-rose-50" },
};

function getPrazoInfo(prazoStr: string | null) {
  if (!prazoStr) return null;
  const dias = differenceInDays(parseISO(prazoStr), new Date());
  if (dias < 0) return { text: "Vencido", urgent: true, color: "text-rose-600", bgColor: "bg-rose-50" };
  if (dias === 0) return { text: "Hoje", urgent: true, color: "text-rose-600", bgColor: "bg-rose-50" };
  if (dias === 1) return { text: "Amanhã", urgent: true, color: "text-amber-600", bgColor: "bg-amber-50" };
  if (dias <= 3) return { text: `${dias}d`, urgent: true, color: "text-amber-500", bgColor: "bg-amber-50/50" };
  if (dias <= 7) return { text: `${dias}d`, urgent: false, color: "text-sky-600", bgColor: "bg-sky-50/50" };
  return { text: `${dias}d`, urgent: false, color: "text-muted-foreground", bgColor: "" };
}

function calcularIdade(dataNascimento: string) {
  return differenceInYears(new Date(), parseISO(dataNascimento));
}

function calcularTempoPreso(dataPrisao: string | null) {
  if (!dataPrisao) return null;
  const dias = differenceInDays(new Date(), parseISO(dataPrisao));
  const anos = Math.floor(dias / 365);
  const meses = Math.floor((dias % 365) / 30);
  if (anos > 0) return `${anos}a ${meses}m`;
  if (meses > 0) return `${meses}m`;
  return `${dias}d`;
}

// Upload Dialog
function PhotoUploadDialog({ isOpen, onClose, assistidoNome, currentPhoto, onUpload }: {
  isOpen: boolean;
  onClose: () => void;
  assistidoNome: string;
  currentPhoto: string | null;
  onUpload: (file: File) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhoto);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      onUpload(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Foto do Assistido</DialogTitle>
          <DialogDescription>{assistidoNome}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <Avatar className="h-32 w-32">
              <AvatarImage src={preview || undefined} />
              <AvatarFallback className="text-3xl bg-muted">{getInitials(assistidoNome)}</AvatarFallback>
            </Avatar>
          </div>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]); }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Arraste uma imagem ou</p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Selecionar Arquivo</Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onClose}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Card Expandível do Assistido
interface AssistidoCardProps {
  assistido: typeof mockAssistidos[0];
  onPhotoClick: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
}

function AssistidoCard({ assistido, onPhotoClick, isPinned, onTogglePin }: AssistidoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();
  
  const status = statusConfig[assistido.statusPrisional] || statusConfig.SOLTO;
  const fase = faseConfig[assistido.faseProcessual] || faseConfig.INSTRUCAO;
  const area = areaConfig[assistido.area] || { label: assistido.area, color: "text-muted-foreground", bgColor: "bg-muted" };
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const idade = calcularIdade(assistido.dataNascimento);
  const tempoPreso = calcularTempoPreso(assistido.dataPrisao);
  const telefoneDisplay = assistido.telefone || assistido.telefoneContato;
  
  const FaseIcon = fase.icon;
  
  // Contagem de testemunhas
  const testemunhasOuvidas = assistido.testemunhasArroladas.filter(t => t.ouvida).length;
  const testemunhasPendentes = assistido.testemunhasArroladas.filter(t => !t.ouvida).length;

  return (
    <Card className={`group transition-all duration-300 overflow-hidden relative ${
      isPreso ? "border-l-[3px] border-l-rose-400" : ""
    } ${isPinned ? "ring-2 ring-amber-400 ring-offset-1" : "hover:shadow-lg"}`}>
      {isPinned && <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-amber-400 to-amber-500" />}
      
      <CardContent className="p-0">
        {/* Header Compacto */}
        <div className={`relative p-3 ${status.bgColor}`}>
          {/* Pin Button */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-7 w-7 bg-white/80 dark:bg-black/30 backdrop-blur-sm ${isPinned ? "text-amber-500" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
                    onClick={onTogglePin}
                  >
                    {isPinned ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isPinned ? "Desfixar" : "Fixar"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/80 dark:bg-black/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <Link href={`/admin/assistidos/${assistido.id}`}>
                  <DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />Ver Perfil Completo</DropdownMenuItem>
                </Link>
                <Link href={`/admin/assistidos/${assistido.id}/editar`}>
                  <DropdownMenuItem className="cursor-pointer"><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <Link href={`/admin/inteligencia?assistido=${assistido.id}`}>
                  <DropdownMenuItem className="cursor-pointer text-violet-600"><Brain className="h-4 w-4 mr-2" />Investigação Defensiva</DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <Link href={`/admin/processos?assistido=${assistido.id}`}>
                  <DropdownMenuItem className="cursor-pointer"><Scale className="h-4 w-4 mr-2" />Ver Processos</DropdownMenuItem>
                </Link>
                {telefoneDisplay && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer text-emerald-600" onClick={() => window.open(`https://wa.me/55${telefoneDisplay.replace(/\D/g, '')}`, '_blank')}>
                      <MessageCircle className="h-4 w-4 mr-2" />WhatsApp
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Info Principal */}
          <div className="flex items-center gap-3">
            <Avatar 
              className={`h-14 w-14 cursor-pointer transition-transform hover:scale-105 shadow-md ${isPreso ? "ring-2 ring-rose-300 ring-offset-1" : ""}`}
              onClick={onPhotoClick}
            >
              <AvatarImage src={assistido.photoUrl || undefined} className="object-cover" />
              <AvatarFallback className={`text-base font-semibold ${status.iconBg} ${status.color}`}>{getInitials(assistido.nome)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <Link href={`/admin/assistidos/${assistido.id}`}>
                <h3 className="font-semibold text-sm hover:text-primary transition-colors truncate">{assistido.nome}</h3>
              </Link>
              {assistido.vulgo && <p className="text-[10px] text-muted-foreground italic">&quot;{assistido.vulgo}&quot;</p>}
              <p className="text-xs text-muted-foreground">{idade} anos • {assistido.cidade}</p>
            </div>
          </div>
        </div>

        {/* Corpo Compacto */}
        <div className="p-3 space-y-2">
          {/* Status + Fase + Área */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className={`${status.color} ${status.borderColor} ${status.bgColor} text-[10px] font-medium py-0.5`}>
              {status.label}
              {tempoPreso && <span className="ml-1 opacity-70">• {tempoPreso}</span>}
            </Badge>
            <Badge variant="outline" className={`${fase.color} ${fase.bgColor} border-transparent text-[10px] font-medium py-0.5`}>
              <FaseIcon className="h-3 w-3 mr-1" />
              {fase.label}
            </Badge>
            <Badge variant="outline" className={`${area.color} ${area.bgColor} border-transparent text-[10px] font-medium py-0.5`}>
              {area.label}
            </Badge>
          </div>

          {/* Crime */}
          {assistido.crimePrincipal && (
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              <Scale className="h-3 w-3 inline mr-1" />
              {assistido.crimePrincipal}
            </p>
          )}

          {/* Audiências Mini */}
          <div className="flex items-center gap-3 text-[10px]">
            {assistido.testemunhasArroladas.length > 0 && (
              <span className="flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600">{testemunhasOuvidas}</span>
                {testemunhasPendentes > 0 && (
                  <>
                    <span className="text-muted-foreground">/</span>
                    <UserX className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-600">{testemunhasPendentes}</span>
                  </>
                )}
              </span>
            )}
            {assistido.interrogatorioRealizado !== undefined && (
              <span className={`flex items-center gap-1 ${assistido.interrogatorioRealizado ? "text-emerald-600" : "text-amber-600"}`}>
                <User className="h-3 w-3" />
                {assistido.interrogatorioRealizado ? "Interrogado" : "Pendente"}
              </span>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-xs border-t border-border/30 pt-2 mt-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Scale className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{assistido.processosAtivos}</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                <span className={`font-medium ${assistido.demandasAbertas > 2 ? "text-amber-600" : "text-foreground"}`}>{assistido.demandasAbertas}</span>
              </span>
              {prazoInfo && (
                <span className={`flex items-center gap-1 ${prazoInfo.color}`}>
                  <Timer className="h-3.5 w-3.5" />
                  <span className="font-medium">{prazoInfo.text}</span>
                </span>
              )}
            </div>
            {/* Botão Mais/Menos apenas visível em mobile */}
            {isMobile && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[10px]"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Menos" : "Mais"}
                {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            )}
            {/* Em desktop, mostrar link direto para o perfil */}
            {!isMobile && (
              <Link href={`/admin/assistidos/${assistido.id}`}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-[10px] hover:text-primary"
                >
                  Ver <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Seção Expandida - Apenas em mobile */}
        <Collapsible open={isExpanded && isMobile}>
          <CollapsibleContent>
            <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3 bg-muted/20">
              {/* Processo */}
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Processo</p>
                <p className="text-xs font-mono">{assistido.numeroProcesso}</p>
              </div>

              {/* Resumo do Fato */}
              {assistido.resumoFato && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resumo do Fato</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{assistido.resumoFato}</p>
                </div>
              )}

              {/* Tese da Defesa */}
              {assistido.teseDaDefesa && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Gavel className="h-3 w-3" />
                    Tese da Defesa
                  </p>
                  <p className="text-[11px] text-primary/80 font-medium leading-relaxed">{assistido.teseDaDefesa}</p>
                </div>
              )}

              {/* Estratégia de Defesa Atual */}
              {assistido.estrategiaDefesaAtual && (
                <div className="space-y-1 p-2 rounded-lg bg-violet-50/80 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-800/30">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400 flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Estratégia Atual
                  </p>
                  <p className="text-[11px] text-violet-900/80 dark:text-violet-200/80 leading-relaxed">{assistido.estrategiaDefesaAtual}</p>
                </div>
              )}

              {/* Audiências */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Audiências
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {assistido.ultimaAudiencia && (
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/30">
                      <p className="text-[9px] text-muted-foreground uppercase">Última</p>
                      <p className="text-[11px] font-medium">{format(parseISO(assistido.ultimaAudiencia), "dd/MM/yy")}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{assistido.tipoUltimaAudiencia}</p>
                    </div>
                  )}
                  {assistido.proximaAudiencia && (
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50">
                      <p className="text-[9px] text-blue-600 uppercase">Próxima</p>
                      <p className="text-[11px] font-medium text-blue-700">{format(parseISO(assistido.proximaAudiencia), "dd/MM/yy")}</p>
                      <p className="text-[10px] text-blue-600/80 truncate">{assistido.tipoProximaAudiencia}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Testemunhas */}
              {assistido.testemunhasArroladas.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Testemunhas ({testemunhasOuvidas}/{assistido.testemunhasArroladas.length} ouvidas)
                  </p>
                  <div className="space-y-1">
                    {assistido.testemunhasArroladas.map((test, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        {test.ouvida ? (
                          <CircleDot className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-3 w-3 text-amber-400 flex-shrink-0" />
                        )}
                        <span className={test.ouvida ? "text-muted-foreground" : "font-medium"}>{test.nome}</span>
                        <Badge variant="outline" className="text-[8px] py-0 px-1 h-4">
                          {test.tipo}
                        </Badge>
                        {test.ouvida && test.data && (
                          <span className="text-[9px] text-muted-foreground ml-auto">
                            {format(parseISO(test.data), "dd/MM")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações */}
              {assistido.observacoesProcesso && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Observações
                  </p>
                  <p className="text-[11px] text-muted-foreground italic leading-relaxed">{assistido.observacoesProcesso}</p>
                </div>
              )}

              {/* Footer expandido */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {assistido.defensor}
                </span>
                <div className="flex items-center gap-1">
                  <Link href={`/admin/inteligencia?assistido=${assistido.id}`}>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 hover:text-violet-600">
                      <Brain className="h-3 w-3 mr-1" />
                      Investigar
                    </Button>
                  </Link>
                  <Link href={`/admin/assistidos/${assistido.id}`}>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 hover:text-primary">
                      Perfil <ChevronRight className="h-3 w-3 ml-0.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// Row para Lista
function AssistidoRow({ assistido, onPhotoClick, isPinned, onTogglePin }: AssistidoCardProps) {
  const status = statusConfig[assistido.statusPrisional] || statusConfig.SOLTO;
  const fase = faseConfig[assistido.faseProcessual] || faseConfig.INSTRUCAO;
  const area = areaConfig[assistido.area] || { label: assistido.area, color: "text-muted-foreground", bgColor: "bg-muted" };
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const idade = calcularIdade(assistido.dataNascimento);
  const testemunhasOuvidas = assistido.testemunhasArroladas.filter(t => t.ouvida).length;
  const totalTestemunhas = assistido.testemunhasArroladas.length;

  return (
    <TableRow className={`group transition-colors ${isPreso ? "border-l-2 border-l-rose-300" : ""} ${isPinned ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}>
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <Avatar className={`h-9 w-9 cursor-pointer ${isPreso ? "ring-2 ring-rose-300" : ""}`} onClick={onPhotoClick}>
            <AvatarImage src={assistido.photoUrl || undefined} />
            <AvatarFallback className={`text-xs font-semibold ${status.iconBg} ${status.color}`}>{getInitials(assistido.nome)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/assistidos/${assistido.id}`} className="hover:text-primary">
                <p className="font-medium text-sm">{assistido.nome}</p>
              </Link>
              {isPinned && <BookmarkCheck className="h-3.5 w-3.5 text-amber-500" />}
            </div>
            <p className="text-[11px] text-muted-foreground">{idade} anos • {assistido.cidade}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`${fase.color} ${fase.bgColor} border-transparent text-[10px]`}>{fase.label}</Badge>
      </TableCell>
      <TableCell className="max-w-[150px]">
        <p className="text-xs truncate">{assistido.crimePrincipal || "-"}</p>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`${status.color} ${status.borderColor} ${status.bgColor} text-[10px]`}>{status.label}</Badge>
      </TableCell>
      <TableCell className="text-center">
        {totalTestemunhas > 0 ? (
          <span className="text-xs">
            <span className="text-emerald-600 font-medium">{testemunhasOuvidas}</span>
            <span className="text-muted-foreground">/{totalTestemunhas}</span>
          </span>
        ) : "-"}
      </TableCell>
      <TableCell className="text-center">
        <span className={`text-xs ${assistido.interrogatorioRealizado ? "text-emerald-600" : "text-amber-600"}`}>
          {assistido.interrogatorioRealizado ? "✓" : "○"}
        </span>
      </TableCell>
      <TableCell>
        {prazoInfo ? (
          <Badge variant="outline" className={`${prazoInfo.color} ${prazoInfo.bgColor} border-transparent text-[10px]`}>{prazoInfo.text}</Badge>
        ) : "-"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className={`h-7 w-7 ${isPinned ? "text-amber-500" : "opacity-0 group-hover:opacity-100"}`} onClick={onTogglePin}>
            {isPinned ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </Button>
          <Link href={`/admin/assistidos/${assistido.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function AssistidosPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"nome" | "prioridade" | "prazo">("prioridade");
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedAssistido, setSelectedAssistido] = useState<typeof mockAssistidos[0] | null>(null);

  const handlePhotoClick = (assistido: typeof mockAssistidos[0]) => {
    setSelectedAssistido(assistido);
    setPhotoDialogOpen(true);
  };

  const togglePin = useCallback((id: number) => {
    setPinnedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const filteredAssistidos = useMemo(() => {
    let result = mockAssistidos.filter((a) => {
      const matchesSearch = a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || a.cpf.includes(searchTerm) || (a.vulgo?.toLowerCase().includes(searchTerm.toLowerCase())) || (a.crimePrincipal?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || a.statusPrisional === statusFilter;
      const matchesArea = areaFilter === "all" || a.area === areaFilter;
      const matchesPinned = !showPinnedOnly || pinnedIds.has(a.id);
      return matchesSearch && matchesStatus && matchesArea && matchesPinned;
    });

    result.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (sortBy === "nome") return a.nome.localeCompare(b.nome);
      if (sortBy === "prioridade") {
        const prioA = statusConfig[a.statusPrisional]?.priority || 99;
        const prioB = statusConfig[b.statusPrisional]?.priority || 99;
        if (prioA !== prioB) return prioA - prioB;
        return b.demandasAbertas - a.demandasAbertas;
      }
      if (sortBy === "prazo") {
        if (!a.proximoPrazo && !b.proximoPrazo) return 0;
        if (!a.proximoPrazo) return 1;
        if (!b.proximoPrazo) return -1;
        return new Date(a.proximoPrazo).getTime() - new Date(b.proximoPrazo).getTime();
      }
      return 0;
    });

    return result;
  }, [searchTerm, statusFilter, areaFilter, sortBy, pinnedIds, showPinnedOnly]);

  const stats = useMemo(() => ({
    total: mockAssistidos.length,
    presos: mockAssistidos.filter(a => ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional)).length,
    monitorados: mockAssistidos.filter(a => ["MONITORADO", "DOMICILIAR"].includes(a.statusPrisional)).length,
    soltos: mockAssistidos.filter(a => a.statusPrisional === "SOLTO").length,
    pinned: pinnedIds.size,
  }), [pinnedIds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assistidos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.total} cadastrados • {stats.presos} presos
            {pinnedIds.size > 0 && <span className="text-amber-600"> • {pinnedIds.size} fixados</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/inteligencia">
            <Button variant="outline" className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50">
              <Brain className="h-4 w-4" />
              Inteligência
            </Button>
          </Link>
          <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
          <Link href="/admin/assistidos/novo">
            <Button className="gap-2"><Plus className="h-4 w-4" />Novo</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <Users className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-200/50 bg-rose-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-rose-600">{stats.presos}</p>
                <p className="text-xs text-muted-foreground">Presos</p>
              </div>
              <AlertOctagon className="h-8 w-8 text-rose-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200/50 bg-amber-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-amber-600">{stats.monitorados}</p>
                <p className="text-xs text-muted-foreground">Monitorados</p>
              </div>
              <Timer className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200/50 bg-emerald-50/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-emerald-600">{stats.soltos}</p>
                <p className="text-xs text-muted-foreground">Soltos</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${showPinnedOnly ? "border-amber-400 bg-amber-50" : "border-border/50 hover:border-amber-300"}`}
          onClick={() => setShowPinnedOnly(!showPinnedOnly)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-amber-600">{stats.pinned}</p>
                <p className="text-xs text-muted-foreground">Fixados</p>
              </div>
              <BookmarkCheck className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, vulgo, CPF, crime..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="CADEIA_PUBLICA">Cadeia</SelectItem>
              <SelectItem value="PENITENCIARIA">Penitenciária</SelectItem>
              <SelectItem value="MONITORADO">Monitorado</SelectItem>
              <SelectItem value="DOMICILIAR">Domiciliar</SelectItem>
              <SelectItem value="SOLTO">Solto</SelectItem>
            </SelectContent>
          </Select>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[100px] h-9"><SelectValue placeholder="Área" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="JURI">Júri</SelectItem>
              <SelectItem value="EXECUCAO_PENAL">EP</SelectItem>
              <SelectItem value="VIOLENCIA_DOMESTICA">VVD</SelectItem>
              <SelectItem value="FAMILIA">Família</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v: "nome" | "prioridade" | "prazo") => setSortBy(v)}>
            <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prioridade">Prioridade</SelectItem>
              <SelectItem value="nome">Nome</SelectItem>
              <SelectItem value="prazo">Prazo</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-md">
            <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setViewMode("grid")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredAssistidos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-medium mb-1">Nenhum assistido encontrado</p>
            <p className="text-sm text-muted-foreground">Ajuste os filtros ou cadastre um novo</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAssistidos.map((a) => (
            <AssistidoCard 
              key={a.id} 
              assistido={a} 
              onPhotoClick={() => handlePhotoClick(a)}
              isPinned={pinnedIds.has(a.id)}
              onTogglePin={() => togglePin(a.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assistido</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Crime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Test.</TableHead>
                  <TableHead className="text-center">Interr.</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssistidos.map((a) => (
                  <AssistidoRow 
                    key={a.id} 
                    assistido={a}
                    onPhotoClick={() => handlePhotoClick(a)}
                    isPinned={pinnedIds.has(a.id)}
                    onTogglePin={() => togglePin(a.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Photo Dialog */}
      {selectedAssistido && (
        <PhotoUploadDialog
          isOpen={photoDialogOpen}
          onClose={() => { setPhotoDialogOpen(false); setSelectedAssistido(null); }}
          assistidoNome={selectedAssistido.nome}
          currentPhoto={selectedAssistido.photoUrl}
          onUpload={(file) => console.log("Upload:", file)}
        />
      )}
    </div>
  );
}
