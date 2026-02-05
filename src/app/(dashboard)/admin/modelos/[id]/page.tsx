"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileStack,
  ArrowLeft,
  Save,
  Eye,
  Edit3,
  Trash2,
  Sparkles,
  Clock,
  Building2,
  Briefcase,
  Mail,
  Scale,
  FileText,
  History,
  ExternalLink,
  Copy,
  Check,
  Variable,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Componentes estruturais
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

// ==========================================
// TIPOS
// ==========================================

type ModeloCategoria =
  | "PROVIDENCIA_ADMINISTRATIVA"
  | "PROVIDENCIA_FUNCIONAL"
  | "PROVIDENCIA_INSTITUCIONAL"
  | "PECA_PROCESSUAL"
  | "COMUNICACAO"
  | "OUTRO";

interface VariavelModelo {
  nome: string;
  label: string;
  tipo: "texto" | "numero" | "data" | "texto_longo" | "selecao";
  obrigatoria: boolean;
  origem: "manual" | "assistido" | "processo" | "sistema";
}

// ==========================================
// CONSTANTES
// ==========================================

const CATEGORIA_CONFIG: Record<ModeloCategoria, {
  label: string;
  icon: typeof FileText;
  color: string;
}> = {
  PROVIDENCIA_ADMINISTRATIVA: {
    label: "Providência Administrativa",
    icon: Building2,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  PROVIDENCIA_FUNCIONAL: {
    label: "Providência Funcional",
    icon: Briefcase,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  PROVIDENCIA_INSTITUCIONAL: {
    label: "Providência Institucional",
    icon: Building2,
    color: "text-violet-600 bg-violet-50 border-violet-200",
  },
  PECA_PROCESSUAL: {
    label: "Peça Processual",
    icon: Scale,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  COMUNICACAO: {
    label: "Comunicação",
    icon: Mail,
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  OUTRO: {
    label: "Outro",
    icon: FileText,
    color: "text-zinc-600 bg-zinc-50 border-zinc-200",
  },
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function ModeloDetalhesPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";
  const modeloId = parseInt(params.id);

  const [isEditing, setIsEditing] = useState(isEditMode);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<ModeloCategoria | "">("");
  const [tipoPeca, setTipoPeca] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [copiedContent, setCopiedContent] = useState(false);

  // Query do modelo
  const { data: modelo, isLoading, refetch } = trpc.modelos.getById.useQuery(
    { id: modeloId },
    { enabled: !isNaN(modeloId) }
  );

  // Query de documentos gerados
  const { data: documentosGerados } = trpc.modelos.documentosGerados.useQuery(
    { modeloId },
    { enabled: !isNaN(modeloId) }
  );

  // Mutations
  const updateMutation = trpc.modelos.update.useMutation({
    onSuccess: () => {
      toast.success("Modelo atualizado com sucesso!");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const deleteMutation = trpc.modelos.delete.useMutation({
    onSuccess: () => {
      toast.success("Modelo excluído!");
      router.push("/admin/modelos");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Carregar dados do modelo
  useEffect(() => {
    if (modelo) {
      setTitulo(modelo.titulo);
      setDescricao(modelo.descricao || "");
      setCategoria(modelo.categoria as ModeloCategoria);
      setTipoPeca(modelo.tipoPeca || "");
      setConteudo(modelo.conteudo);
    }
  }, [modelo]);

  // Salvar alterações
  const handleSave = () => {
    if (!titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    updateMutation.mutate({
      id: modeloId,
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      categoria: categoria as ModeloCategoria,
      tipoPeca: tipoPeca.trim() || undefined,
      conteudo: conteudo,
    });
  };

  // Copiar conteúdo
  const copyContent = () => {
    navigator.clipboard.writeText(conteudo);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
    toast.success("Conteúdo copiado!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!modelo) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <FileStack className="w-16 h-16 mx-auto text-zinc-300 mb-4" />
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Modelo não encontrado
          </h2>
          <p className="text-zinc-500 mt-2">
            O modelo solicitado não existe ou foi removido.
          </p>
          <Link href="/admin/modelos">
            <Button className="mt-4">Voltar para Modelos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const config = CATEGORIA_CONFIG[modelo.categoria as ModeloCategoria] || CATEGORIA_CONFIG.OUTRO;
  const Icon = config.icon;
  const variaveis = modelo.variaveis as VariavelModelo[] | null;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/admin" },
              { label: "Modelos", href: "/admin/modelos" },
              { label: modelo.titulo },
            ]}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/modelos">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className={cn("p-2.5 rounded-xl border", config.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {modelo.titulo}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                  {modelo.tipoPeca && (
                    <Badge variant="secondary" className="text-xs">
                      {modelo.tipoPeca}
                    </Badge>
                  )}
                  <span className="text-xs text-zinc-500">
                    {modelo.totalUsos} usos
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Editar
                  </Button>
                  <Link href={`/admin/modelos/${modeloId}/gerar`}>
                    <Button className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Gerar Documento
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O modelo será permanentemente removido.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate({ id: modeloId })}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="conteudo" className="space-y-6">
            <TabsList>
              <TabsTrigger value="conteudo" className="gap-2">
                <FileText className="w-4 h-4" />
                Conteúdo
              </TabsTrigger>
              <TabsTrigger value="variaveis" className="gap-2">
                <Variable className="w-4 h-4" />
                Variáveis ({variaveis?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <History className="w-4 h-4" />
                Histórico ({documentosGerados?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Tab: Conteúdo */}
            <TabsContent value="conteudo" className="space-y-6">
              {isEditing ? (
                <>
                  {/* Formulário de edição */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Informações</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Título</Label>
                          <Input
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label>Tipo de Peça</Label>
                          <Input
                            value={tipoPeca}
                            onChange={(e) => setTipoPeca(e.target.value)}
                            className="mt-1.5"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={descricao}
                          onChange={(e) => setDescricao(e.target.value)}
                          rows={2}
                          className="mt-1.5"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Conteúdo do Modelo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={conteudo}
                        onChange={(e) => setConteudo(e.target.value)}
                        rows={20}
                        className="font-mono text-sm"
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  {/* Visualização */}
                  {modelo.descricao && (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-zinc-600 dark:text-zinc-400">
                          {modelo.descricao}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base">Conteúdo</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyContent}
                        className="gap-2"
                      >
                        {copiedContent ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {copiedContent ? "Copiado!" : "Copiar"}
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-zinc dark:prose-invert max-w-none p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg font-mono text-sm whitespace-pre-wrap">
                        {modelo.conteudo.split(/(\{\{[^}]+\}\})/).map((part, i) => {
                          if (part.match(/\{\{[^}]+\}\}/)) {
                            return (
                              <span
                                key={i}
                                className="px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded"
                              >
                                {part}
                              </span>
                            );
                          }
                          return <span key={i}>{part}</span>;
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Tab: Variáveis */}
            <TabsContent value="variaveis">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Variáveis do Modelo</CardTitle>
                  <CardDescription>
                    Lista de variáveis dinâmicas utilizadas neste modelo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!variaveis || variaveis.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      <Variable className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                      <p>Nenhuma variável definida</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {variaveis.map((v, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                        >
                          <code className="px-2 py-1 bg-white dark:bg-zinc-700 rounded font-mono text-sm">
                            {`{{${v.nome}}}`}
                          </code>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{v.label}</p>
                            <p className="text-xs text-zinc-500">
                              {v.tipo} • {v.origem} • {v.obrigatoria ? "obrigatória" : "opcional"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Histórico */}
            <TabsContent value="historico">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Documentos Gerados</CardTitle>
                  <CardDescription>
                    Histórico de documentos criados a partir deste modelo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!documentosGerados || documentosGerados.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      <History className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                      <p>Nenhum documento gerado ainda</p>
                      <Link href={`/admin/modelos/${modeloId}/gerar`}>
                        <Button variant="outline" className="mt-4 gap-2">
                          <Sparkles className="w-4 h-4" />
                          Gerar Primeiro Documento
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documentosGerados.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-zinc-400" />
                            <div>
                              <p className="font-medium text-sm">{doc.titulo}</p>
                              <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <Clock className="w-3 h-3" />
                                {format(new Date(doc.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                {doc.geradoPorIA && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    IA
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {doc.googleDocUrl && (
                              <a
                                href={doc.googleDocUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="ghost" size="sm" className="gap-2">
                                  <ExternalLink className="w-4 h-4" />
                                  Abrir
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Meta info */}
          <div className="mt-6 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div className="flex items-center gap-4">
              <span>
                Criado em {format(new Date(modelo.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
              {modelo.updatedAt && modelo.updatedAt !== modelo.createdAt && (
                <span>
                  • Atualizado em {format(new Date(modelo.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>
            <span>ID: {modelo.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
