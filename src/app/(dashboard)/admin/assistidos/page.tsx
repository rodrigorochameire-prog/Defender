"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
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
  Users, 
  Plus,
  Search,
  Filter,
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
  AlertTriangle,
  CheckCircle2,
  Building2,
  Briefcase,
  Timer,
  Camera,
  Upload,
  X,
  User,
  Pin,
  PinOff,
  Globe,
  Brain,
  Fingerprint,
  Shield,
  ExternalLink,
  Hash,
  CalendarDays,
  Home,
  UserX,
  Bookmark,
  BookmarkCheck,
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
import { format, differenceInDays, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Dados mockados expandidos com mais informações
const mockAssistidos = [
  { 
    id: 1, 
    nome: "Diego Bonfim Almeida",
    vulgo: "Diegão",
    cpf: "123.456.789-00",
    rg: "12.345.678-90 SSP/BA",
    dataNascimento: "1990-05-15",
    nomeMae: "Maria Almeida Santos",
    nomePai: "José Almeida",
    naturalidade: "Salvador/BA",
    nacionalidade: "Brasileira",
    estadoCivil: "Solteiro",
    profissao: "Pedreiro",
    escolaridade: "Ensino Fundamental Incompleto",
    endereco: "Rua das Flores, 123, Centro, Camaçari/BA",
    bairro: "Centro",
    cidade: "Camaçari",
    cep: "42800-000",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Candeias",
    dataPrisao: "2024-11-20",
    crimePrincipal: "Homicídio Qualificado (Art. 121, §2º, CP)",
    artigos: ["121, §2º", "14, II"],
    telefone: "(71) 99999-1234",
    telefoneContato: "(71) 98888-5678",
    nomeContato: "Maria Almeida (Mãe)",
    parentescoContato: "Mãe",
    processosAtivos: 2,
    demandasAbertas: 3,
    proximoPrazo: "2026-01-15",
    atoProximoPrazo: "Resposta à Acusação",
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    ultimoAtendimento: "2026-01-10",
    observacoes: "Réu primário. Confessou parcialmente os fatos.",
  },
  { 
    id: 2, 
    nome: "Maria Silva Santos",
    vulgo: null,
    cpf: "987.654.321-00",
    rg: "98.765.432-10 SSP/BA",
    dataNascimento: "1985-08-22",
    nomeMae: "Ana Santos Costa",
    nomePai: "Pedro Santos",
    naturalidade: "Lauro de Freitas/BA",
    nacionalidade: "Brasileira",
    estadoCivil: "Casada",
    profissao: "Doméstica",
    escolaridade: "Ensino Médio Completo",
    endereco: "Av. Principal, 456, Itinga, Lauro de Freitas/BA",
    bairro: "Itinga",
    cidade: "Lauro de Freitas",
    cep: "42700-000",
    statusPrisional: "SOLTO",
    unidadePrisional: null,
    dataPrisao: null,
    crimePrincipal: "Lesão Corporal (Art. 129, §9º, CP)",
    artigos: ["129, §9º"],
    telefone: "(71) 97777-4321",
    telefoneContato: null,
    nomeContato: null,
    parentescoContato: null,
    processosAtivos: 1,
    demandasAbertas: 1,
    proximoPrazo: "2026-01-20",
    atoProximoPrazo: "Alegações Finais",
    defensor: "Dra. Juliane",
    area: "VIOLENCIA_DOMESTICA",
    photoUrl: null,
    ultimoAtendimento: "2025-12-20",
    observacoes: "Vítima que se tornou ré por legítima defesa.",
  },
  { 
    id: 3, 
    nome: "José Carlos Oliveira",
    vulgo: "Zé do Morro",
    cpf: "456.789.123-00",
    rg: "45.678.912-30 SSP/BA",
    dataNascimento: "1978-12-03",
    nomeMae: "Francisca Oliveira",
    nomePai: "Antônio Oliveira",
    naturalidade: "Camaçari/BA",
    nacionalidade: "Brasileira",
    estadoCivil: "União Estável",
    profissao: "Motorista",
    escolaridade: "Ensino Fundamental Completo",
    endereco: "Trav. do Comércio, 78, Phoc II, Camaçari/BA",
    bairro: "Phoc II",
    cidade: "Camaçari",
    cep: "42801-000",
    statusPrisional: "PENITENCIARIA",
    unidadePrisional: "Conjunto Penal de Candeias",
    dataPrisao: "2023-06-15",
    crimePrincipal: "Tráfico de Drogas (Art. 33, Lei 11.343/06)",
    artigos: ["33, caput", "35"],
    telefone: null,
    telefoneContato: "(71) 96666-9999",
    nomeContato: "Ana Oliveira (Esposa)",
    parentescoContato: "Esposa",
    processosAtivos: 3,
    demandasAbertas: 5,
    proximoPrazo: "2026-01-14",
    atoProximoPrazo: "Agravo em Execução",
    defensor: "Dr. Rodrigo",
    area: "EXECUCAO_PENAL",
    photoUrl: null,
    ultimoAtendimento: "2026-01-05",
    observacoes: "Aguardando progressão de regime. Já cumpriu 2/5 da pena.",
  },
  { 
    id: 4, 
    nome: "Ana Paula Costa Ferreira",
    vulgo: "Paulinha",
    cpf: "321.654.987-00",
    rg: "32.165.498-70 SSP/BA",
    dataNascimento: "1995-03-28",
    nomeMae: "Teresa Costa",
    nomePai: "Marcos Ferreira",
    naturalidade: "Salvador/BA",
    nacionalidade: "Brasileira",
    estadoCivil: "Solteira",
    profissao: "Estudante",
    escolaridade: "Ensino Superior Incompleto",
    endereco: "Rua Nova, 200, Centro, Dias D'Ávila/BA",
    bairro: "Centro",
    cidade: "Dias D'Ávila",
    cep: "42850-000",
    statusPrisional: "MONITORADO",
    unidadePrisional: null,
    dataPrisao: null,
    crimePrincipal: "Ameaça (Art. 147, CP)",
    artigos: ["147"],
    telefone: "(71) 95555-1111",
    telefoneContato: "(71) 94444-2222",
    nomeContato: "Pedro Costa (Irmão)",
    parentescoContato: "Irmão",
    processosAtivos: 1,
    demandasAbertas: 2,
    proximoPrazo: "2026-01-18",
    atoProximoPrazo: "Pedido de Revogação",
    defensor: "Dra. Juliane",
    area: "VIOLENCIA_DOMESTICA",
    photoUrl: null,
    ultimoAtendimento: "2026-01-08",
    observacoes: "Monitoramento eletrônico há 3 meses.",
  },
  { 
    id: 5, 
    nome: "Roberto Ferreira Lima",
    vulgo: "Betão",
    cpf: "654.321.987-00",
    rg: "65.432.198-70 SSP/BA",
    dataNascimento: "1982-07-10",
    nomeMae: "Joana Lima",
    nomePai: "Carlos Lima",
    naturalidade: "Dias D'Ávila/BA",
    nacionalidade: "Brasileira",
    estadoCivil: "Divorciado",
    profissao: "Comerciante",
    escolaridade: "Ensino Médio Completo",
    endereco: "Av. Central, 500, Centro, Dias D'Ávila/BA",
    bairro: "Centro",
    cidade: "Dias D'Ávila",
    cep: "42850-000",
    statusPrisional: "DOMICILIAR",
    unidadePrisional: null,
    dataPrisao: null,
    crimePrincipal: "Homicídio Simples (Art. 121, CP)",
    artigos: ["121, caput"],
    telefone: "(71) 93333-3333",
    telefoneContato: null,
    nomeContato: null,
    parentescoContato: null,
    processosAtivos: 2,
    demandasAbertas: 1,
    proximoPrazo: null,
    atoProximoPrazo: null,
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    ultimoAtendimento: "2025-12-15",
    observacoes: "Prisão domiciliar por motivo de saúde.",
  },
  { 
    id: 6, 
    nome: "Carlos Eduardo Mendes",
    vulgo: "Cadu",
    cpf: "789.123.456-00",
    rg: "78.912.345-60 SSP/BA",
    dataNascimento: "1988-11-18",
    nomeMae: "Regina Mendes",
    nomePai: "Eduardo Mendes",
    naturalidade: "Simões Filho/BA",
    nacionalidade: "Brasileira",
    estadoCivil: "Solteiro",
    profissao: "Desempregado",
    escolaridade: "Ensino Fundamental Incompleto",
    endereco: "Rua do Sol, 89, Centro, Simões Filho/BA",
    bairro: "Centro",
    cidade: "Simões Filho",
    cep: "43700-000",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Simões Filho",
    dataPrisao: "2025-12-01",
    crimePrincipal: "Roubo Majorado (Art. 157, §2º, CP)",
    artigos: ["157, §2º"],
    telefone: null,
    telefoneContato: "(71) 92222-4444",
    nomeContato: "João Mendes (Pai)",
    parentescoContato: "Pai",
    processosAtivos: 1,
    demandasAbertas: 4,
    proximoPrazo: "2026-01-15",
    atoProximoPrazo: "Habeas Corpus",
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
    ultimoAtendimento: "2026-01-12",
    observacoes: "Preso em flagrante. Excesso de prazo na instrução.",
  },
  { 
    id: 7, 
    nome: "Fernanda Souza Lima",
    vulgo: null,
    cpf: "159.753.486-00",
    rg: "15.975.348-60 SSP/BA",
    dataNascimento: "1992-04-25",
    nomeMae: "Lucia Souza",
    nomePai: "Marcos Lima",
    naturalidade: "Candeias/BA",
    nacionalidade: "Brasileira",
    estadoCivil: "Casada",
    profissao: "Cabeleireira",
    escolaridade: "Ensino Médio Completo",
    endereco: "Rua das Palmeiras, 150, Centro, Candeias/BA",
    bairro: "Centro",
    cidade: "Candeias",
    cep: "43810-000",
    statusPrisional: "SOLTO",
    unidadePrisional: null,
    dataPrisao: null,
    crimePrincipal: null,
    artigos: [],
    telefone: "(71) 91111-5555",
    telefoneContato: "(71) 98765-4321",
    nomeContato: "Carlos Souza (Marido)",
    parentescoContato: "Marido",
    processosAtivos: 1,
    demandasAbertas: 0,
    proximoPrazo: null,
    atoProximoPrazo: null,
    defensor: "Dra. Juliane",
    area: "FAMILIA",
    photoUrl: null,
    ultimoAtendimento: "2025-11-30",
    observacoes: "Ação de guarda compartilhada.",
  },
  { 
    id: 8, 
    nome: "Pedro Santos Neto",
    vulgo: "Pedrão",
    cpf: "753.159.486-00",
    rg: "75.315.948-60 SSP/BA",
    dataNascimento: "1975-09-08",
    nomeMae: "Antonia Santos",
    nomePai: "José Santos",
    naturalidade: "Camaçari/BA",
    nacionalidade: "Brasileira",
    estadoCivil: "Viúvo",
    profissao: "Aposentado",
    escolaridade: "Ensino Fundamental Completo",
    endereco: "Trav. São Jorge, 45, Gleba A, Camaçari/BA",
    bairro: "Gleba A",
    cidade: "Camaçari",
    cep: "42802-000",
    statusPrisional: "COP",
    unidadePrisional: "COP - Mata Escura",
    dataPrisao: "2024-03-10",
    crimePrincipal: "Estupro de Vulnerável (Art. 217-A, CP)",
    artigos: ["217-A"],
    telefone: null,
    telefoneContato: "(71) 97777-8888",
    nomeContato: "Marcos Santos (Filho)",
    parentescoContato: "Filho",
    processosAtivos: 2,
    demandasAbertas: 3,
    proximoPrazo: "2026-01-16",
    atoProximoPrazo: "Contrarrazões",
    defensor: "Dr. Rodrigo",
    area: "EXECUCAO_PENAL",
    photoUrl: null,
    ultimoAtendimento: "2026-01-02",
    observacoes: "Condenado definitivo. Crime hediondo.",
  },
];

// Configurações - Cores suaves e premium
const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; iconBg: string; priority: number }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 1 },
  PENITENCIARIA: { label: "Penitenciária", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 2 },
  COP: { label: "COP", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 3 },
  HOSPITAL_CUSTODIA: { label: "Hosp. Custódia", color: "text-rose-700 dark:text-rose-300", bgColor: "bg-rose-50/80 dark:bg-rose-950/20", borderColor: "border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", priority: 4 },
  MONITORADO: { label: "Monitorado", color: "text-amber-700 dark:text-amber-300", bgColor: "bg-amber-50/80 dark:bg-amber-950/20", borderColor: "border-amber-200/60 dark:border-amber-800/30", iconBg: "bg-amber-100 dark:bg-amber-900/40", priority: 5 },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-50/80 dark:bg-orange-950/20", borderColor: "border-orange-200/60 dark:border-orange-800/30", iconBg: "bg-orange-100 dark:bg-orange-900/40", priority: 6 },
  SOLTO: { label: "Solto", color: "text-emerald-700 dark:text-emerald-300", bgColor: "bg-emerald-50/80 dark:bg-emerald-950/20", borderColor: "border-emerald-200/60 dark:border-emerald-800/30", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", priority: 7 },
};

const areaConfig: Record<string, { label: string; labelFull: string; color: string; bgColor: string }> = {
  JURI: { label: "Júri", labelFull: "Tribunal do Júri", color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-50 dark:bg-violet-950/30" },
  EXECUCAO_PENAL: { label: "EP", labelFull: "Execução Penal", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  VIOLENCIA_DOMESTICA: { label: "VVD", labelFull: "Violência Doméstica", color: "text-pink-600 dark:text-pink-400", bgColor: "bg-pink-50 dark:bg-pink-950/30" },
  SUBSTITUICAO: { label: "Sub", labelFull: "Substituição", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  CURADORIA: { label: "Cur", labelFull: "Curadoria", color: "text-teal-600 dark:text-teal-400", bgColor: "bg-teal-50 dark:bg-teal-950/30" },
  FAMILIA: { label: "Fam", labelFull: "Família", color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-50 dark:bg-rose-950/30" },
  CIVEL: { label: "Cív", labelFull: "Cível", color: "text-slate-600 dark:text-slate-400", bgColor: "bg-slate-50 dark:bg-slate-800/30" },
  FAZENDA_PUBLICA: { label: "Faz", labelFull: "Fazenda Pública", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-50 dark:bg-indigo-950/30" },
};

function getPrazoInfo(prazoStr: string | null) {
  if (!prazoStr) return null;
  const dias = differenceInDays(parseISO(prazoStr), new Date());
  
  if (dias < 0) return { text: "Vencido", urgent: true, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30" };
  if (dias === 0) return { text: "Hoje", urgent: true, color: "text-rose-600", bgColor: "bg-rose-50 dark:bg-rose-950/30" };
  if (dias === 1) return { text: "Amanhã", urgent: true, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" };
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

// Componente de Upload de Foto
interface PhotoUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assistidoNome: string;
  currentPhoto: string | null;
  onUpload: (file: File) => void;
}

function PhotoUploadDialog({ isOpen, onClose, assistidoNome, currentPhoto, onUpload }: PhotoUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhoto);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onUpload(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
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
              <AvatarFallback className="text-3xl bg-muted">
                {getInitials(assistidoNome)}
              </AvatarFallback>
            </Avatar>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Arraste uma imagem ou
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Selecionar Arquivo
            </Button>
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

// Card Premium Expandido do Assistido
interface AssistidoCardProps {
  assistido: typeof mockAssistidos[0];
  onPhotoClick: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function AssistidoCard({ assistido, onPhotoClick, isPinned, onTogglePin, isSelected, onToggleSelect }: AssistidoCardProps) {
  const status = statusConfig[assistido.statusPrisional] || statusConfig.SOLTO;
  const area = areaConfig[assistido.area] || { label: assistido.area, labelFull: assistido.area, color: "text-muted-foreground", bgColor: "bg-muted" };
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const idade = calcularIdade(assistido.dataNascimento);
  const tempoPreso = calcularTempoPreso(assistido.dataPrisao);
  const telefoneDisplay = assistido.telefone || assistido.telefoneContato;

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 overflow-hidden relative ${
      isPreso ? "border-l-[3px] border-l-rose-400" : "hover:border-primary/20"
    } ${isPinned ? "ring-2 ring-amber-400 ring-offset-2" : ""} ${isSelected ? "bg-primary/5" : ""}`}>
      {/* Pin indicator */}
      {isPinned && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-500" />
      )}
      
      <CardContent className="p-0">
        {/* Header com foto */}
        <div className={`relative p-4 pb-3 ${status.bgColor}`}>
          {/* Checkbox e Pin no canto */}
          <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
            <Checkbox 
              checked={isSelected}
              onCheckedChange={() => onToggleSelect()}
              className="h-5 w-5 bg-white/80 dark:bg-black/30 backdrop-blur-sm border-2"
            />
          </div>
          
          {/* Menu no canto direito */}
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
                  <DropdownMenuItem className="cursor-pointer"><Edit className="h-4 w-4 mr-2" />Editar Cadastro</DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <Link href={`/admin/inteligencia?assistido=${assistido.id}`}>
                  <DropdownMenuItem className="cursor-pointer text-violet-600"><Brain className="h-4 w-4 mr-2" />Investigação Defensiva</DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <Link href={`/admin/processos?assistido=${assistido.id}`}>
                  <DropdownMenuItem className="cursor-pointer"><Scale className="h-4 w-4 mr-2" />Ver Processos</DropdownMenuItem>
                </Link>
                <Link href={`/admin/demandas?assistido=${assistido.id}`}>
                  <DropdownMenuItem className="cursor-pointer"><FileText className="h-4 w-4 mr-2" />Ver Demandas</DropdownMenuItem>
                </Link>
                {telefoneDisplay && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="cursor-pointer text-emerald-600"
                      onClick={() => window.open(`https://wa.me/55${telefoneDisplay.replace(/\D/g, '')}`, '_blank')}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />Enviar WhatsApp
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Avatar centralizado */}
          <div className="flex flex-col items-center">
            <div className="relative mb-2">
              <Avatar 
                className={`h-20 w-20 cursor-pointer transition-all hover:scale-105 shadow-md ${
                  isPreso ? "ring-[3px] ring-rose-300 ring-offset-2" : "ring-2 ring-white/50 dark:ring-black/20"
                }`}
                onClick={onPhotoClick}
              >
                <AvatarImage src={assistido.photoUrl || undefined} className="object-cover" />
                <AvatarFallback className={`text-xl font-semibold ${status.iconBg} ${status.color}`}>
                  {getInitials(assistido.nome)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={onPhotoClick}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
              >
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Nome e vulgo */}
            <Link href={`/admin/assistidos/${assistido.id}`} className="text-center">
              <h3 className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1 px-2">
                {assistido.nome}
              </h3>
            </Link>
            {assistido.vulgo && (
              <p className="text-[10px] text-muted-foreground italic">&quot;{assistido.vulgo}&quot;</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {idade} anos • {assistido.cidade}
            </p>
          </div>
        </div>

        {/* Corpo do card */}
        <div className="p-4 pt-3 space-y-2.5">
          {/* Status e Área */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`flex-1 justify-center py-1 ${status.color} ${status.borderColor} ${status.bgColor} font-medium text-[11px]`}
            >
              {status.label}
              {tempoPreso && <span className="ml-1 opacity-70">• {tempoPreso}</span>}
            </Badge>
            <Badge 
              variant="outline" 
              className={`${area.color} ${area.bgColor} border-transparent font-medium text-[11px] px-2`}
            >
              {area.label}
            </Badge>
          </div>

          {/* Crime Principal */}
          {assistido.crimePrincipal && (
            <div className="p-2 rounded-lg bg-slate-50/80 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Crime</p>
              <p className="text-[11px] font-medium line-clamp-2">{assistido.crimePrincipal}</p>
            </div>
          )}

          {/* Unidade Prisional ou Endereço */}
          {(assistido.unidadePrisional || assistido.bairro) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {assistido.unidadePrisional ? (
                <>
                  <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{assistido.unidadePrisional}</span>
                </>
              ) : (
                <>
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{assistido.bairro}, {assistido.cidade}</span>
                </>
              )}
            </div>
          )}

          {/* Contato */}
          {telefoneDisplay && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">{telefoneDisplay}</span>
            </div>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-1.5 py-2">
            <div className="text-center p-1.5 rounded-lg bg-muted/30">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Scale className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold text-sm">{assistido.processosAtivos}</span>
              </div>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wide">Processos</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-muted/30">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className={`font-semibold text-sm ${assistido.demandasAbertas > 2 ? "text-amber-600" : ""}`}>
                  {assistido.demandasAbertas}
                </span>
              </div>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wide">Demandas</p>
            </div>
            <div className={`text-center p-1.5 rounded-lg ${prazoInfo?.bgColor || "bg-muted/30"}`}>
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Timer className={`h-3 w-3 ${prazoInfo?.color || "text-muted-foreground"}`} />
                <span className={`font-semibold text-sm ${prazoInfo?.color || "text-muted-foreground"}`}>
                  {prazoInfo?.text || "-"}
                </span>
              </div>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wide">Prazo</p>
            </div>
          </div>

          {/* Próximo Ato */}
          {assistido.atoProximoPrazo && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/20 border border-border/30">
              <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${prazoInfo?.urgent ? prazoInfo.color : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate">{assistido.atoProximoPrazo}</p>
                {assistido.proximoPrazo && (
                  <p className="text-[10px] text-muted-foreground">
                    {format(parseISO(assistido.proximoPrazo), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{assistido.defensor}</span>
            </div>
            <div className="flex items-center gap-1">
              <Link href={`/admin/inteligencia?assistido=${assistido.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-violet-100 hover:text-violet-600">
                  <Brain className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link href={`/admin/assistidos/${assistido.id}`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs px-2 hover:bg-primary/10 hover:text-primary">
                  Perfil <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Row para Lista - Visual Premium
function AssistidoRow({ assistido, onPhotoClick, isPinned, onTogglePin, isSelected, onToggleSelect }: AssistidoCardProps) {
  const status = statusConfig[assistido.statusPrisional] || statusConfig.SOLTO;
  const area = areaConfig[assistido.area] || { label: assistido.area, labelFull: assistido.area, color: "text-muted-foreground", bgColor: "bg-muted" };
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const idade = calcularIdade(assistido.dataNascimento);

  return (
    <TableRow className={`group transition-colors ${isPreso ? "border-l-2 border-l-rose-300" : ""} ${isPinned ? "bg-amber-50/50 dark:bg-amber-950/10" : ""} ${isSelected ? "bg-primary/5" : ""}`}>
      <TableCell className="py-3 w-10">
        <Checkbox 
          checked={isSelected}
          onCheckedChange={() => onToggleSelect()}
        />
      </TableCell>
      <TableCell className="py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar 
              className={`h-10 w-10 cursor-pointer transition-transform hover:scale-105 ${
                isPreso ? "ring-2 ring-rose-300 ring-offset-1" : ""
              }`}
              onClick={onPhotoClick}
            >
              <AvatarImage src={assistido.photoUrl || undefined} className="object-cover" />
              <AvatarFallback className={`text-xs font-semibold ${status.iconBg} ${status.color}`}>
                {getInitials(assistido.nome)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href={`/admin/assistidos/${assistido.id}`} className="hover:text-primary transition-colors">
                <p className="font-medium text-sm">{assistido.nome}</p>
              </Link>
              {assistido.vulgo && (
                <span className="text-[10px] text-muted-foreground italic">&quot;{assistido.vulgo}&quot;</span>
              )}
              {isPinned && <BookmarkCheck className="h-3.5 w-3.5 text-amber-500" />}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {idade} anos • {assistido.cidade}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="max-w-[200px]">
        <p className="text-xs truncate">{assistido.crimePrincipal || "-"}</p>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`${status.color} ${status.borderColor} ${status.bgColor} text-[10px] font-medium`}>
          {status.label}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={`${area.color} ${area.bgColor} border-transparent text-[10px] font-medium`}>
          {area.label}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <span className="text-sm font-medium">{assistido.processosAtivos}</span>
      </TableCell>
      <TableCell className="text-center">
        <span className={`text-sm font-medium ${assistido.demandasAbertas > 2 ? "text-amber-600" : ""}`}>
          {assistido.demandasAbertas}
        </span>
      </TableCell>
      <TableCell>
        {prazoInfo ? (
          <Badge variant="outline" className={`${prazoInfo.color} ${prazoInfo.bgColor} border-transparent text-[10px] font-medium`}>
            {prazoInfo.text}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-7 w-7 ${isPinned ? "text-amber-500" : "opacity-0 group-hover:opacity-100"}`}
            onClick={onTogglePin}
          >
            {isPinned ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </Button>
          <Link href={`/admin/inteligencia?assistido=${assistido.id}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-violet-600">
              <Brain className="h-4 w-4" />
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Link href={`/admin/assistidos/${assistido.id}`}>
                <DropdownMenuItem className="cursor-pointer"><Eye className="h-4 w-4 mr-2" />Ver Perfil</DropdownMenuItem>
              </Link>
              <Link href={`/admin/assistidos/${assistido.id}/editar`}>
                <DropdownMenuItem className="cursor-pointer"><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
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
  
  // Pinned e Selected state
  const [pinnedIds, setPinnedIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Photo upload state
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedAssistido, setSelectedAssistido] = useState<typeof mockAssistidos[0] | null>(null);

  const handlePhotoClick = (assistido: typeof mockAssistidos[0]) => {
    setSelectedAssistido(assistido);
    setPhotoDialogOpen(true);
  };

  const handlePhotoUpload = (file: File) => {
    console.log("Uploading photo for:", selectedAssistido?.nome, file);
  };

  const togglePin = useCallback((id: number) => {
    setPinnedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const filteredAssistidos = useMemo(() => {
    let result = mockAssistidos.filter((a) => {
      const matchesSearch = 
        a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.cpf.includes(searchTerm) ||
        (a.nomeMae && a.nomeMae.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.vulgo && a.vulgo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.crimePrincipal && a.crimePrincipal.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || a.statusPrisional === statusFilter;
      const matchesArea = areaFilter === "all" || a.area === areaFilter;
      const matchesPinned = !showPinnedOnly || pinnedIds.has(a.id);
      return matchesSearch && matchesStatus && matchesArea && matchesPinned;
    });

    // Pinned first
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

      {/* Selection Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""}
                </Badge>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-1" /> Limpar
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/admin/inteligencia?assistidos=${Array.from(selectedIds).join(",")}`}>
                  <Button size="sm" variant="outline" className="gap-2 text-violet-600">
                    <Brain className="h-4 w-4" />
                    Investigar Selecionados
                  </Button>
                </Link>
                <Button size="sm" variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Gerar Relatório
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-200/50 dark:border-rose-800/30 bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-rose-600">{stats.presos}</p>
                <p className="text-xs text-muted-foreground">Presos</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center">
                <AlertOctagon className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-amber-600">{stats.monitorados}</p>
                <p className="text-xs text-muted-foreground">Monitorados</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <Timer className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200/50 dark:border-emerald-800/30 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-emerald-600">{stats.soltos}</p>
                <p className="text-xs text-muted-foreground">Soltos</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${showPinnedOnly ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20" : "border-border/50 hover:border-amber-300"}`}
          onClick={() => setShowPinnedOnly(!showPinnedOnly)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-amber-600">{stats.pinned}</p>
                <p className="text-xs text-muted-foreground">Fixados</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <BookmarkCheck className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome, vulgo, CPF, crime..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="CADEIA_PUBLICA">Cadeia</SelectItem>
              <SelectItem value="PENITENCIARIA">Penitenciária</SelectItem>
              <SelectItem value="COP">COP</SelectItem>
              <SelectItem value="MONITORADO">Monitorado</SelectItem>
              <SelectItem value="DOMICILIAR">Domiciliar</SelectItem>
              <SelectItem value="SOLTO">Solto</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="JURI">Júri</SelectItem>
              <SelectItem value="EXECUCAO_PENAL">EP</SelectItem>
              <SelectItem value="VIOLENCIA_DOMESTICA">VVD</SelectItem>
              <SelectItem value="FAMILIA">Família</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={(v: "nome" | "prioridade" | "prazo") => setSortBy(v)}>
            <SelectTrigger className="w-[110px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prioridade">Prioridade</SelectItem>
              <SelectItem value="nome">Nome</SelectItem>
              <SelectItem value="prazo">Prazo</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode("list")}
            >
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
              isSelected={selectedIds.has(a.id)}
              onToggleSelect={() => toggleSelect(a.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Assistido</TableHead>
                  <TableHead>Crime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead className="text-center">Proc.</TableHead>
                  <TableHead className="text-center">Dem.</TableHead>
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
                    isSelected={selectedIds.has(a.id)}
                    onToggleSelect={() => toggleSelect(a.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Photo Upload Dialog */}
      {selectedAssistido && (
        <PhotoUploadDialog
          isOpen={photoDialogOpen}
          onClose={() => {
            setPhotoDialogOpen(false);
            setSelectedAssistido(null);
          }}
          assistidoNome={selectedAssistido.nome}
          currentPhoto={selectedAssistido.photoUrl}
          onUpload={handlePhotoUpload}
        />
      )}
    </div>
  );
}
