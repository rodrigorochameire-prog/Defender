"use client";

import { useState, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Dados mockados expandidos
const mockAssistidos = [
  { 
    id: 1, 
    nome: "Diego Bonfim Almeida", 
    cpf: "123.456.789-00",
    dataNascimento: "1990-05-15",
    nomeMae: "Maria Almeida Santos",
    naturalidade: "Salvador/BA",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Candeias",
    dataPrisao: "2024-11-20",
    telefone: "(71) 99999-1234",
    telefoneContato: "(71) 98888-5678",
    nomeContato: "Maria (Mãe)",
    processosAtivos: 2,
    demandasAbertas: 3,
    proximoPrazo: "2026-01-15",
    atoProximoPrazo: "Resposta à Acusação",
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
  },
  { 
    id: 2, 
    nome: "Maria Silva Santos", 
    cpf: "987.654.321-00",
    dataNascimento: "1985-08-22",
    nomeMae: "Ana Santos Costa",
    naturalidade: "Lauro de Freitas/BA",
    statusPrisional: "SOLTO",
    unidadePrisional: null,
    dataPrisao: null,
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
  },
  { 
    id: 3, 
    nome: "José Carlos Oliveira", 
    cpf: "456.789.123-00",
    dataNascimento: "1978-12-03",
    nomeMae: "Francisca Oliveira",
    naturalidade: "Camaçari/BA",
    statusPrisional: "PENITENCIARIA",
    unidadePrisional: "Conjunto Penal de Candeias",
    dataPrisao: "2023-06-15",
    telefone: null,
    telefoneContato: "(71) 96666-9999",
    nomeContato: "Ana (Esposa)",
    processosAtivos: 3,
    demandasAbertas: 5,
    proximoPrazo: "2026-01-14",
    atoProximoPrazo: "Agravo em Execução",
    defensor: "Dr. Rodrigo",
    area: "EXECUCAO_PENAL",
    photoUrl: null,
  },
  { 
    id: 4, 
    nome: "Ana Paula Costa Ferreira", 
    cpf: "321.654.987-00",
    dataNascimento: "1995-03-28",
    nomeMae: "Teresa Costa",
    naturalidade: "Salvador/BA",
    statusPrisional: "MONITORADO",
    unidadePrisional: null,
    dataPrisao: null,
    telefone: "(71) 95555-1111",
    telefoneContato: "(71) 94444-2222",
    nomeContato: "Pedro (Irmão)",
    processosAtivos: 1,
    demandasAbertas: 2,
    proximoPrazo: "2026-01-18",
    atoProximoPrazo: "Pedido de Revogação",
    defensor: "Dra. Juliane",
    area: "VIOLENCIA_DOMESTICA",
    photoUrl: null,
  },
  { 
    id: 5, 
    nome: "Roberto Ferreira Lima", 
    cpf: "654.321.987-00",
    dataNascimento: "1982-07-10",
    nomeMae: "Joana Lima",
    naturalidade: "Dias D'Ávila/BA",
    statusPrisional: "DOMICILIAR",
    unidadePrisional: null,
    dataPrisao: null,
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
  },
  { 
    id: 6, 
    nome: "Carlos Eduardo Mendes", 
    cpf: "789.123.456-00",
    dataNascimento: "1988-11-18",
    nomeMae: "Regina Mendes",
    naturalidade: "Simões Filho/BA",
    statusPrisional: "CADEIA_PUBLICA",
    unidadePrisional: "Cadeia Pública de Simões Filho",
    dataPrisao: "2025-12-01",
    telefone: null,
    telefoneContato: "(71) 92222-4444",
    nomeContato: "João (Pai)",
    processosAtivos: 1,
    demandasAbertas: 4,
    proximoPrazo: "2026-01-15",
    atoProximoPrazo: "Habeas Corpus",
    defensor: "Dr. Rodrigo",
    area: "JURI",
    photoUrl: null,
  },
  { 
    id: 7, 
    nome: "Fernanda Souza Lima", 
    cpf: "159.753.486-00",
    dataNascimento: "1992-04-25",
    nomeMae: "Lucia Souza",
    naturalidade: "Candeias/BA",
    statusPrisional: "SOLTO",
    unidadePrisional: null,
    dataPrisao: null,
    telefone: "(71) 91111-5555",
    telefoneContato: "(71) 98765-4321",
    nomeContato: "Carlos (Marido)",
    processosAtivos: 1,
    demandasAbertas: 0,
    proximoPrazo: null,
    atoProximoPrazo: null,
    defensor: "Dra. Juliane",
    area: "FAMILIA",
    photoUrl: null,
  },
  { 
    id: 8, 
    nome: "Pedro Santos Neto", 
    cpf: "753.159.486-00",
    dataNascimento: "1975-09-08",
    nomeMae: "Antonia Santos",
    naturalidade: "Camaçari/BA",
    statusPrisional: "COP",
    unidadePrisional: "COP - Mata Escura",
    dataPrisao: "2024-03-10",
    telefone: null,
    telefoneContato: "(71) 97777-8888",
    nomeContato: "Marcos (Filho)",
    processosAtivos: 2,
    demandasAbertas: 3,
    proximoPrazo: "2026-01-16",
    atoProximoPrazo: "Contrarrazões",
    defensor: "Dr. Rodrigo",
    area: "EXECUCAO_PENAL",
    photoUrl: null,
  },
];

// Configurações
const statusConfig: Record<string, { label: string; color: string; bgColor: string; priority: number }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30", priority: 1 },
  PENITENCIARIA: { label: "Penitenciária", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30", priority: 2 },
  COP: { label: "COP", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30", priority: 3 },
  HOSPITAL_CUSTODIA: { label: "Hosp. Custódia", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30", priority: 4 },
  MONITORADO: { label: "Monitorado", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30", priority: 5 },
  DOMICILIAR: { label: "Domiciliar", color: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-950/30", priority: 6 },
  SOLTO: { label: "Solto", color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-50 dark:bg-emerald-950/30", priority: 7 },
};

const areaConfig: Record<string, { label: string; color: string }> = {
  JURI: { label: "Júri", color: "text-purple-600" },
  EXECUCAO_PENAL: { label: "EP", color: "text-blue-600" },
  VIOLENCIA_DOMESTICA: { label: "VVD", color: "text-pink-600" },
  SUBSTITUICAO: { label: "Sub", color: "text-orange-600" },
  CURADORIA: { label: "Cur", color: "text-teal-600" },
  FAMILIA: { label: "Fam", color: "text-rose-600" },
  CIVEL: { label: "Cív", color: "text-slate-600" },
  FAZENDA_PUBLICA: { label: "Faz", color: "text-indigo-600" },
};

function getPrazoInfo(prazoStr: string | null) {
  if (!prazoStr) return null;
  const dias = differenceInDays(parseISO(prazoStr), new Date());
  
  if (dias < 0) return { text: "Vencido", urgent: true, color: "text-red-600" };
  if (dias === 0) return { text: "Hoje", urgent: true, color: "text-red-600" };
  if (dias === 1) return { text: "Amanhã", urgent: true, color: "text-orange-600" };
  if (dias <= 3) return { text: `${dias}d`, urgent: true, color: "text-orange-500" };
  if (dias <= 7) return { text: `${dias}d`, urgent: false, color: "text-amber-600" };
  return { text: `${dias}d`, urgent: false, color: "text-muted-foreground" };
}

function calcularIdade(dataNascimento: string) {
  const nascimento = parseISO(dataNascimento);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
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
          {/* Preview */}
          <div className="flex justify-center">
            <Avatar className="h-32 w-32">
              <AvatarImage src={preview || undefined} />
              <AvatarFallback className="text-3xl bg-muted">
                {getInitials(assistidoNome)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Drop Zone */}
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
            <p className="text-xs text-muted-foreground mt-2">
              JPG, PNG ou GIF. Máx 5MB.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onClose}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Card Clean do Assistido
interface AssistidoCardProps {
  assistido: typeof mockAssistidos[0];
  onPhotoClick: () => void;
}

function AssistidoCard({ assistido, onPhotoClick }: AssistidoCardProps) {
  const status = statusConfig[assistido.statusPrisional] || statusConfig.SOLTO;
  const area = areaConfig[assistido.area] || { label: assistido.area, color: "text-muted-foreground" };
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const idade = calcularIdade(assistido.dataNascimento);
  const tempoPreso = calcularTempoPreso(assistido.dataPrisao);

  return (
    <Card className={`group hover:shadow-md transition-shadow ${isPreso ? "border-l-2 border-l-red-500" : ""}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Avatar com botão de foto */}
          <div className="relative">
            <Avatar 
              className={`h-12 w-12 cursor-pointer transition-opacity hover:opacity-80 ${
                isPreso ? "ring-2 ring-red-500 ring-offset-1" : ""
              }`}
              onClick={onPhotoClick}
            >
              <AvatarImage src={assistido.photoUrl || undefined} />
              <AvatarFallback className={`font-semibold ${
                isPreso ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
              }`}>
                {getInitials(assistido.nome)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={onPhotoClick}
              className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="h-3 w-3" />
            </button>
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <Link href={`/admin/assistidos/${assistido.id}`}>
              <h3 className="font-medium text-sm hover:text-primary transition-colors truncate">
                {assistido.nome}
              </h3>
            </Link>
            <p className="text-xs text-muted-foreground">
              {idade} anos • <span className={area.color}>{area.label}</span>
            </p>
          </div>
          
          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <Link href={`/admin/assistidos/${assistido.id}`}>
                <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />Ver Perfil</DropdownMenuItem>
              </Link>
              <Link href={`/admin/assistidos/${assistido.id}/editar`}>
                <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <Link href={`/admin/processos?assistido=${assistido.id}`}>
                <DropdownMenuItem><Scale className="h-4 w-4 mr-2" />Processos</DropdownMenuItem>
              </Link>
              <Link href={`/admin/demandas?assistido=${assistido.id}`}>
                <DropdownMenuItem><FileText className="h-4 w-4 mr-2" />Demandas</DropdownMenuItem>
              </Link>
              {(assistido.telefone || assistido.telefoneContato) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => window.open(`https://wa.me/55${(assistido.telefone || assistido.telefoneContato)?.replace(/\D/g, '')}`, '_blank')}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />WhatsApp
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badge */}
        <div className={`mt-3 px-2.5 py-1.5 rounded-lg ${status.bgColor}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
            {tempoPreso && (
              <span className={`text-[10px] ${status.color} opacity-75`}>
                {tempoPreso}
              </span>
            )}
          </div>
          {assistido.unidadePrisional && (
            <p className={`text-[10px] ${status.color} opacity-75 truncate mt-0.5`}>
              {assistido.unidadePrisional}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs">
          <div className="flex items-center gap-1">
            <Scale className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{assistido.processosAtivos}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={`font-medium ${assistido.demandasAbertas > 2 ? "text-amber-600" : ""}`}>
              {assistido.demandasAbertas}
            </span>
          </div>
          {prazoInfo && (
            <div className={`flex items-center gap-1 ml-auto ${prazoInfo.color}`}>
              <Timer className="h-3.5 w-3.5" />
              <span className="font-medium">{prazoInfo.text}</span>
            </div>
          )}
        </div>

        {/* Próximo Prazo */}
        {assistido.atoProximoPrazo && (
          <p className="text-[11px] text-muted-foreground mt-2 truncate">
            {assistido.atoProximoPrazo}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">
            {assistido.defensor}
          </span>
          <Link href={`/admin/assistidos/${assistido.id}`}>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">
              Detalhes <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Row para Lista
function AssistidoRow({ assistido, onPhotoClick }: AssistidoCardProps) {
  const status = statusConfig[assistido.statusPrisional] || statusConfig.SOLTO;
  const area = areaConfig[assistido.area] || { label: assistido.area, color: "text-muted-foreground" };
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);

  return (
    <TableRow className={isPreso ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative group/avatar">
            <Avatar 
              className={`h-9 w-9 cursor-pointer ${isPreso ? "ring-2 ring-red-500" : ""}`}
              onClick={onPhotoClick}
            >
              <AvatarImage src={assistido.photoUrl || undefined} />
              <AvatarFallback className={`text-xs font-semibold ${isPreso ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"}`}>
                {getInitials(assistido.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer" onClick={onPhotoClick}>
              <Camera className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
          <div>
            <Link href={`/admin/assistidos/${assistido.id}`} className="hover:text-primary transition-colors">
              <p className="font-medium text-sm">{assistido.nome}</p>
            </Link>
            {assistido.unidadePrisional && (
              <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{assistido.unidadePrisional}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs">{assistido.cpf}</TableCell>
      <TableCell>
        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
      </TableCell>
      <TableCell>
        <span className={`text-xs font-medium ${area.color}`}>{area.label}</span>
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
          <span className={`text-xs font-medium ${prazoInfo.color}`}>{prazoInfo.text}</span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <Link href={`/admin/assistidos/${assistido.id}`}>
              <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />Ver</DropdownMenuItem>
            </Link>
            <Link href={`/admin/assistidos/${assistido.id}/editar`}>
              <DropdownMenuItem><Edit className="h-4 w-4 mr-2" />Editar</DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
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
  
  // Photo upload state
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedAssistido, setSelectedAssistido] = useState<typeof mockAssistidos[0] | null>(null);

  const handlePhotoClick = (assistido: typeof mockAssistidos[0]) => {
    setSelectedAssistido(assistido);
    setPhotoDialogOpen(true);
  };

  const handlePhotoUpload = (file: File) => {
    // TODO: Implement actual upload to Supabase Storage
    console.log("Uploading photo for:", selectedAssistido?.nome, file);
  };

  const filteredAssistidos = useMemo(() => {
    let result = mockAssistidos.filter((a) => {
      const matchesSearch = 
        a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.cpf.includes(searchTerm) ||
        (a.nomeMae && a.nomeMae.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || a.statusPrisional === statusFilter;
      const matchesArea = areaFilter === "all" || a.area === areaFilter;
      return matchesSearch && matchesStatus && matchesArea;
    });

    result.sort((a, b) => {
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
  }, [searchTerm, statusFilter, areaFilter, sortBy]);

  const stats = useMemo(() => ({
    total: mockAssistidos.length,
    presos: mockAssistidos.filter(a => ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(a.statusPrisional)).length,
    monitorados: mockAssistidos.filter(a => ["MONITORADO", "DOMICILIAR"].includes(a.statusPrisional)).length,
    soltos: mockAssistidos.filter(a => a.statusPrisional === "SOLTO").length,
  }), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assistidos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.total} cadastrados • {stats.presos} presos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon"><Download className="h-4 w-4" /></Button>
          <Link href="/admin/assistidos/novo">
            <Button className="gap-2"><Plus className="h-4 w-4" />Novo</Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
          <Users className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
          <AlertOctagon className="h-5 w-5 text-red-600" />
          <div>
            <p className="text-xl font-bold text-red-600">{stats.presos}</p>
            <p className="text-[10px] text-muted-foreground">Presos</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
          <Timer className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-xl font-bold text-amber-600">{stats.monitorados}</p>
            <p className="text-[10px] text-muted-foreground">Monitorados</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-xl font-bold text-emerald-600">{stats.soltos}</p>
            <p className="text-[10px] text-muted-foreground">Soltos</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
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
                  <TableHead>CPF</TableHead>
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
