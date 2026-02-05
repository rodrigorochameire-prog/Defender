"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileAudio,
  FileText,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
  User,
  Volume2,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Gravacao {
  id: string;
  titulo: string;
  dataGravacao: Date;
  duracao: number; // em segundos
  audienciaId?: number;
  processoNumero?: string;
  assistidoNome?: string;
  tipo: "audiencia" | "atendimento" | "reuniao" | "outro";
  status: "pendente" | "transcrevendo" | "transcrito" | "revisado";
  arquivoUrl?: string;
  transcricao?: string;
  resumo?: string;
  trechosMarcados?: TrechoMarcado[];
}

interface TrechoMarcado {
  id: string;
  inicio: number; // em segundos
  fim: number;
  texto: string;
  tipo: "importante" | "contraditorio" | "confissao" | "testemunho" | "outro";
  nota?: string;
}

interface ControleGravacoesProps {
  audienciaId?: number;
  processoId?: number;
}

// Dados mockados para demonstração
const MOCK_GRAVACOES: Gravacao[] = [
  {
    id: "1",
    titulo: "Audiencia de Instrucao - Joao da Silva",
    dataGravacao: new Date(2024, 1, 5, 14, 30),
    duracao: 3600, // 1 hora
    processoNumero: "0000123-45.2024.8.13.0001",
    assistidoNome: "Joao da Silva",
    tipo: "audiencia",
    status: "transcrito",
    transcricao: "Transcrição completa da audiência...",
    resumo: "Audiência de instrução com oitiva de 3 testemunhas de acusação. Testemunha 1 confirmou álibi do réu. Testemunha 2 apresentou contradições com depoimento policial.",
    trechosMarcados: [
      {
        id: "t1",
        inicio: 1200,
        fim: 1350,
        texto: "Testemunha confirma que viu o réu em outro local",
        tipo: "importante",
        nota: "Usar nas alegações finais",
      },
      {
        id: "t2",
        inicio: 2400,
        fim: 2520,
        texto: "Contradição com depoimento policial",
        tipo: "contraditorio",
      },
    ],
  },
  {
    id: "2",
    titulo: "Atendimento - Maria Santos",
    dataGravacao: new Date(2024, 1, 3, 10, 0),
    duracao: 1800, // 30 min
    assistidoNome: "Maria Santos",
    tipo: "atendimento",
    status: "pendente",
  },
  {
    id: "3",
    titulo: "Audiencia de Custodia - Pedro Oliveira",
    dataGravacao: new Date(2024, 1, 2, 9, 0),
    duracao: 900, // 15 min
    processoNumero: "0000456-78.2024.8.13.0001",
    assistidoNome: "Pedro Oliveira",
    tipo: "audiencia",
    status: "transcrevendo",
  },
];

const TIPOS_TRECHO = [
  { value: "importante", label: "Importante", cor: "bg-yellow-500" },
  { value: "contraditorio", label: "Contraditorio", cor: "bg-red-500" },
  { value: "confissao", label: "Confissao", cor: "bg-purple-500" },
  { value: "testemunho", label: "Testemunho", cor: "bg-blue-500" },
  { value: "outro", label: "Outro", cor: "bg-gray-500" },
];

export function ControleGravacoes({ audienciaId, processoId }: ControleGravacoesProps) {
  const [gravacoes, setGravacoes] = useState<Gravacao[]>(MOCK_GRAVACOES);
  const [gravacaoSelecionada, setGravacaoSelecionada] = useState<Gravacao | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [dialogNovaGravacao, setDialogNovaGravacao] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Filtrar gravações
  const gravacoesFiltradas = gravacoes.filter((g) => {
    if (busca) {
      const termo = busca.toLowerCase();
      if (
        !g.titulo.toLowerCase().includes(termo) &&
        !g.assistidoNome?.toLowerCase().includes(termo) &&
        !g.processoNumero?.includes(termo)
      ) {
        return false;
      }
    }
    if (filtroStatus !== "todos" && g.status !== filtroStatus) return false;
    if (filtroTipo !== "todos" && g.tipo !== filtroTipo) return false;
    return true;
  });

  const formatarDuracao = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;

    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }
    return `${minutos}min ${segs}s`;
  };

  const formatarTempoTrecho = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, "0")}:${segs.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status: Gravacao["status"]) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      pendente: { label: "Pendente", variant: "outline" },
      transcrevendo: { label: "Transcrevendo...", variant: "secondary" },
      transcrito: { label: "Transcrito", variant: "default" },
      revisado: { label: "Revisado", variant: "default" },
    };
    const c = config[status];
    return (
      <Badge variant={c.variant} className={cn(status === "transcrevendo" && "animate-pulse")}>
        {status === "transcrevendo" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {c.label}
      </Badge>
    );
  };

  const handleTranscrever = async (gravacao: Gravacao) => {
    setTranscrevendo(true);
    // Simular transcrição
    await new Promise((resolve) => setTimeout(resolve, 3000));

    setGravacoes((prev) =>
      prev.map((g) =>
        g.id === gravacao.id
          ? {
              ...g,
              status: "transcrito" as const,
              transcricao: "Transcrição gerada automaticamente via IA...",
              resumo: "Resumo automático da gravação...",
            }
          : g
      )
    );
    setTranscrevendo(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mic className="h-5 w-5 text-red-600" />
            Gravacoes de Audiencias
          </h3>
          <p className="text-sm text-muted-foreground">
            Gerenciamento e transcricao de audiencias gravadas
          </p>
        </div>
        <Dialog open={dialogNovaGravacao} onOpenChange={setDialogNovaGravacao}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Gravacao
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Gravacao</DialogTitle>
              <DialogDescription>
                Faca upload de um arquivo de audio ou vincule uma gravacao do Plaud
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arraste um arquivo de audio ou clique para selecionar
                </p>
                <Button variant="outline" className="mt-2">
                  Selecionar Arquivo
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Titulo</Label>
                <Input placeholder="Ex: Audiencia de Instrucao - Joao da Silva" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="audiencia">Audiencia</SelectItem>
                      <SelectItem value="atendimento">Atendimento</SelectItem>
                      <SelectItem value="reuniao">Reuniao</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogNovaGravacao(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setDialogNovaGravacao(false)}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por titulo, assistido ou processo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="transcrevendo">Transcrevendo</SelectItem>
            <SelectItem value="transcrito">Transcrito</SelectItem>
            <SelectItem value="revisado">Revisado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="audiencia">Audiencia</SelectItem>
            <SelectItem value="atendimento">Atendimento</SelectItem>
            <SelectItem value="reuniao">Reuniao</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de gravações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Gravacoes ({gravacoesFiltradas.length})
                <Button variant="ghost" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 p-2">
                  {gravacoesFiltradas.map((gravacao) => (
                    <Card
                      key={gravacao.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        gravacaoSelecionada?.id === gravacao.id && "ring-2 ring-primary"
                      )}
                      onClick={() => setGravacaoSelecionada(gravacao)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <div
                              className={cn(
                                "p-1.5 rounded-full",
                                gravacao.tipo === "audiencia" && "bg-blue-100 dark:bg-blue-900",
                                gravacao.tipo === "atendimento" && "bg-green-100 dark:bg-green-900",
                                gravacao.tipo === "reuniao" && "bg-purple-100 dark:bg-purple-900"
                              )}
                            >
                              <FileAudio className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium line-clamp-1">{gravacao.titulo}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(gravacao.dataGravacao, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(gravacao.status)}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatarDuracao(gravacao.duracao)}
                          </span>
                          {gravacao.assistidoNome && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {gravacao.assistidoNome}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Detalhe */}
        <div className="lg:col-span-2">
          {gravacaoSelecionada ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{gravacaoSelecionada.titulo}</CardTitle>
                    <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(gravacaoSelecionada.dataGravacao, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatarDuracao(gravacaoSelecionada.duracao)}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(gravacaoSelecionada.status)}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Player simulado */}
                <Card className="bg-zinc-100 dark:bg-zinc-800">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full"
                        onClick={() =>
                          setPlayingId(playingId === gravacaoSelecionada.id ? null : gravacaoSelecionada.id)
                        }
                      >
                        {playingId === gravacaoSelecionada.id ? (
                          <Pause className="h-6 w-6" />
                        ) : (
                          <Play className="h-6 w-6" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <Progress value={30} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>18:00</span>
                          <span>{formatarDuracao(gravacaoSelecionada.duracao)}</span>
                        </div>
                      </div>
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                {/* Ações */}
                <div className="flex gap-2">
                  {gravacaoSelecionada.status === "pendente" && (
                    <Button onClick={() => handleTranscrever(gravacaoSelecionada)} disabled={transcrevendo}>
                      {transcrevendo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Transcrevendo...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Transcrever com IA
                        </>
                      )}
                    </Button>
                  )}
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Audio
                  </Button>
                  {gravacaoSelecionada.transcricao && (
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar Transcricao
                    </Button>
                  )}
                </div>

                <Separator />

                {/* Tabs de conteúdo */}
                <Tabs defaultValue="resumo">
                  <TabsList>
                    <TabsTrigger value="resumo">Resumo</TabsTrigger>
                    <TabsTrigger value="transcricao">Transcricao</TabsTrigger>
                    <TabsTrigger value="trechos">Trechos Marcados</TabsTrigger>
                  </TabsList>

                  <TabsContent value="resumo" className="mt-4">
                    {gravacaoSelecionada.resumo ? (
                      <Card className="bg-blue-50 dark:bg-blue-950/30">
                        <CardContent className="pt-4">
                          <p className="text-sm">{gravacaoSelecionada.resumo}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>Resumo sera gerado apos a transcricao</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="transcricao" className="mt-4">
                    {gravacaoSelecionada.transcricao ? (
                      <ScrollArea className="h-[300px]">
                        <div className="text-sm whitespace-pre-wrap">
                          {gravacaoSelecionada.transcricao}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Wand2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>Clique em &quot;Transcrever com IA&quot; para gerar a transcricao</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="trechos" className="mt-4">
                    {gravacaoSelecionada.trechosMarcados && gravacaoSelecionada.trechosMarcados.length > 0 ? (
                      <div className="space-y-3">
                        {gravacaoSelecionada.trechosMarcados.map((trecho) => {
                          const tipoConfig = TIPOS_TRECHO.find((t) => t.value === trecho.tipo);
                          return (
                            <Card key={trecho.id}>
                              <CardContent className="py-3">
                                <div className="flex items-start gap-3">
                                  <div className={cn("w-1 h-full rounded", tipoConfig?.cor)} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline">{tipoConfig?.label}</Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {formatarTempoTrecho(trecho.inicio)} - {formatarTempoTrecho(trecho.fim)}
                                      </span>
                                    </div>
                                    <p className="text-sm">{trecho.texto}</p>
                                    {trecho.nota && (
                                      <p className="text-xs text-muted-foreground mt-1 italic">
                                        Nota: {trecho.nota}
                                      </p>
                                    )}
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Play className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                        <Button variant="outline" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Marcar Novo Trecho
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Star className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>Nenhum trecho marcado ainda</p>
                        <Button variant="outline" className="mt-2">
                          <Plus className="h-4 w-4 mr-2" />
                          Marcar Trecho
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Mic className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground">
                  Selecione uma gravacao para ver os detalhes
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
