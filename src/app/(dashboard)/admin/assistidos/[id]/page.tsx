"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Edit,
  Phone,
  User,
  Activity,
  History,
  Target,
  FolderOpen,
  Plus,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  Lock,
  Unlock,
  MapPin,
  Scale,
  Clock,
  Calendar,
  FileText,
  AlertTriangle,
  Camera,
  ExternalLink,
  Gavel,
  FileQuestion,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, cn } from "@/lib/utils";
import { format, differenceInYears, parseISO, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAssignment } from "@/contexts/assignment-context";
import { TeoriaDoCaso } from "@/components/casos/teoria-do-caso";
import { AudienciasHub } from "@/components/casos/audiencias-hub";
import { trpc } from "@/lib/trpc/client";

// ==========================================
// DADOS MOCK (Ampliado)
// ==========================================

const mockAssistido = {
  // ... (dados existentes)
  id: 5,
  nome: "Diego Bonfim Almeida",
  cpf: "123.456.789-00",
  rg: "12.345.678-90",
  dataNascimento: "1990-05-15",
  nomeMae: "Maria Almeida Santos",
  naturalidade: "Salvador/BA",
  nacionalidade: "Brasileira",
  statusPrisional: "CADEIA_PUBLICA",
  unidadePrisional: "Cadeia Pública de Candeias",
  dataPrisao: "2024-11-20",
  telefone: "(71) 99999-1234",
  telefoneContato: "(71) 98888-5678",
  nomeContato: "Maria (Mãe)",
  parentescoContato: "Mãe",
  endereco: "Rua das Flores, 123 - Centro, Camaçari/BA",
  defensor: "Dr. Rodrigo",
  photoUrl: null,
  observacoes: "Réu em processo de júri. Acompanhamento prioritário.",
  createdAt: "2024-06-15",
  casoId: 1,
  casoTitulo: "Homicídio Qualificado - Operação Reuso",
  
  // Novos Campos
  historiaVida: "Nasceu em Salvador, mudou-se para Camaçari aos 10 anos. Trabalhou como pedreiro antes da prisão. Possui dois filhos menores. Relata histórico de dependência química.",
  outrosProcessos: [
    { id: 10, numero: "0004444-55.2020.8.05.0039", vara: "Vara Criminal", status: "Arquivado", tipo: "Furto Simples" },
    { id: 11, numero: "0005555-66.2018.8.05.0039", vara: "Vara da Infância", status: "Extinto", tipo: "Ato Infracional (Tráfico)" }
  ],
  pedidos: [
    { id: 1, data: "2025-01-10", tipo: "Atendimento Médico", status: "Deferido", detalhe: "Solicitação de consulta ortopédica na unidade prisional." },
    { id: 2, data: "2024-12-20", tipo: "Visita Familiar", status: "Pendente", detalhe: "Autorização para entrada da companheira." }
  ]
};

// ... (Resto dos mocks existentes)
const mockProcessos = [
  { id: 1, numeroAutos: "8012906-74.2025.8.05.0039", vara: "1ª Vara do Júri", comarca: "Camaçari", area: "JURI", fase: "Instrução", situacao: "ativo", isJuri: true },
  { id: 2, numeroAutos: "0001234-56.2025.8.05.0039", vara: "VEC", comarca: "Camaçari", area: "EXECUCAO_PENAL", fase: "Execução", situacao: "ativo", isJuri: false },
];

const mockDemandas = [
  { id: 1, ato: "Resposta à Acusação", prazo: "2026-01-20", status: "2_ATENDER", processo: "8012906-74.2025.8.05.0039", urgente: true },
];

const mockAudiencias: any[] = [
  { id: 1, dataAudiencia: new Date("2026-01-25"), horario: "09:00", tipo: "INSTRUCAO", status: "DESIGNADA", sala: "3", local: "Fórum de Camaçari", juiz: "Dr. Carlos Mendes", promotor: "Dr. Fernando Costa", resumoDefesa: "Focar na nulidade da busca domiciliar", assistidoId: 5, assistidoNome: "Diego Bonfim Almeida", assistidoPreso: true, processoId: 1, numeroAutos: "8012906-74.2025.8.05.0039", defensorNome: "Dr. Rodrigo" },
];

// ... (statusConfig, timelineStyleMap etc.)
const statusConfig: Record<string, { label: string; variant: "reuPreso" | "success" | "warning" | "default" }> = {
  CADEIA_PUBLICA: { label: "Cadeia Pública", variant: "reuPreso" },
  PENITENCIARIA: { label: "Penitenciária", variant: "reuPreso" },
  COP: { label: "COP", variant: "reuPreso" },
  SOLTO: { label: "Solto", variant: "success" },
  MONITORADO: { label: "Monitorado", variant: "warning" },
};

export default function AssistidoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { config } = useAssignment();
  const [activeTab, setActiveTab] = useState("resumo");
  
  const assistidoId = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);
  const assistido = mockAssistido;
  const idade = assistido.dataNascimento
    ? differenceInYears(new Date(), parseISO(assistido.dataNascimento))
    : null;
  const status = statusConfig[assistido.statusPrisional] || statusConfig.SOLTO;
  const isPreso = !["SOLTO", "MONITORADO"].includes(assistido.statusPrisional);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className={cn(
                  "h-20 w-20 ring-4",
                  isPreso ? "ring-rose-500/20" : "ring-emerald-500/20"
                )}>
                  <AvatarImage src={assistido.photoUrl || undefined} />
                  <AvatarFallback className="text-xl font-bold">
                    {getInitials(assistido.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "absolute -bottom-1 -right-1 p-1.5 rounded-full border-2 border-background",
                  isPreso ? "bg-rose-500" : "bg-emerald-500"
                )}>
                  {isPreso ? <Lock className="w-3 h-3 text-white" /> : <Unlock className="w-3 h-3 text-white" />}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{assistido.nome}</h1>
                  <Badge variant={status.variant as any}>{status.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{idade} anos • {assistido.naturalidade}</p>
                {assistido.casoTitulo && (
                  <Link href={`/admin/casos/${assistido.casoId}`} className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                    <Target className="w-3 h-3" />
                    {assistido.casoTitulo}
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
            </Button>
            <Button size="sm">
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem><FileText className="mr-2 h-4 w-4" /> Gerar Relatório</DropdownMenuItem>
                <DropdownMenuItem><Calendar className="mr-2 h-4 w-4" /> Agendar Atendimento</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Arquivar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="resumo" className="flex items-center gap-2"><Activity className="w-4 h-4" /> Resumo</TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2"><History className="w-4 h-4" /> Histórico Criminal</TabsTrigger>
            <TabsTrigger value="vida" className="flex items-center gap-2"><ScrollText className="w-4 h-4" /> História de Vida</TabsTrigger>
            <TabsTrigger value="pedidos" className="flex items-center gap-2"><FileQuestion className="w-4 h-4" /> Pedidos</TabsTrigger>
            <TabsTrigger value="teoria" className="flex items-center gap-2"><Target className="w-4 h-4" /> Teoria do Caso</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="mt-6 space-y-6">
            <div className="grid grid-cols-3 gap-6">
              {/* Dados Pessoais e Prisionais (Simplificado para o exemplo) */}
              <Card className="p-5 col-span-1">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Dados Pessoais</h3>
                <div className="space-y-3 text-sm">
                  <p><span className="text-xs text-muted-foreground uppercase block">CPF</span> {assistido.cpf}</p>
                  <p><span className="text-xs text-muted-foreground uppercase block">Mãe</span> {assistido.nomeMae}</p>
                </div>
              </Card>
              
              <Card className="p-5 col-span-1">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Lock className="w-4 h-4" /> Situação Prisional</h3>
                <div className="space-y-3 text-sm">
                  <p><span className="text-xs text-muted-foreground uppercase block">Unidade</span> {assistido.unidadePrisional}</p>
                  <p><span className="text-xs text-muted-foreground uppercase block">Data Prisão</span> {assistido.dataPrisao}</p>
                </div>
              </Card>

              <Card className="p-5 col-span-1">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Phone className="w-4 h-4" /> Contato</h3>
                <div className="space-y-3 text-sm">
                  <p><span className="text-xs text-muted-foreground uppercase block">Telefone</span> {assistido.telefone}</p>
                  <p><span className="text-xs text-muted-foreground uppercase block">Endereço</span> {assistido.endereco}</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Atribuição Atual */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Scale className="w-4 h-4 text-primary" /> Processos Atuais</h3>
                <div className="space-y-3">
                  {mockProcessos.map(proc => (
                    <div key={proc.id} className="p-3 bg-muted/30 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-mono text-sm">{proc.numeroAutos}</p>
                        <p className="text-xs text-muted-foreground">{proc.vara}</p>
                      </div>
                      <Badge variant="outline">{proc.fase}</Badge>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Outras Atribuições / Antecedentes */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><History className="w-4 h-4 text-muted-foreground" /> Outros Processos e Antecedentes</h3>
                <div className="space-y-3">
                  {assistido.outrosProcessos.map((proc) => (
                    <div key={proc.id} className="p-3 border border-border/50 rounded-lg flex justify-between items-center opacity-80">
                      <div>
                        <p className="font-mono text-sm text-muted-foreground">{proc.numero}</p>
                        <p className="text-xs text-muted-foreground">{proc.tipo} - {proc.vara}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{proc.status}</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="vida" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">História de Vida</h3>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {assistido.historiaVida}
              </p>
              <div className="mt-6 flex justify-end">
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="w-4 h-4" /> Editar História
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="pedidos" className="mt-6">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Pedidos e Atendimentos</h3>
                <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Novo Pedido</Button>
              </div>
              <div className="space-y-4">
                {assistido.pedidos.map((pedido) => (
                  <div key={pedido.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="p-2 bg-muted rounded-full">
                      <FileQuestion className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-medium text-sm">{pedido.tipo}</h4>
                        <span className="text-xs text-muted-foreground">{pedido.data}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{pedido.detalhe}</p>
                    </div>
                    <Badge variant={pedido.status === "Deferido" ? "success" : "warning"}>
                      {pedido.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Teoria e Audiencias (Reutilizados) */}
          <TabsContent value="teoria" className="mt-6">
            <TeoriaDoCaso casoId={assistido.casoId || 0} teoriaFatos={assistido.teoriaFatos} teoriaProvas={assistido.teoriaProvas} teoriaDireito={assistido.teoriaDireito} linkDrive={assistido.linkDrive} onUpdate={async () => {}} />
          </TabsContent>
          <TabsContent value="audiencias" className="mt-6">
            <AudienciasHub audiencias={mockAudiencias} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
