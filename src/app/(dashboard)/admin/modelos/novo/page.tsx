"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileStack,
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  Info,
  Variable,
  Sparkles,
  Building2,
  Briefcase,
  Mail,
  Scale,
  FileText,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

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
  opcoes?: string[];
  valorPadrao?: string;
}

// ==========================================
// CONSTANTES
// ==========================================

const CATEGORIA_OPTIONS: { value: ModeloCategoria; label: string; description: string; icon: typeof FileText }[] = [
  {
    value: "PROVIDENCIA_ADMINISTRATIVA",
    label: "Providência Administrativa",
    description: "Ofícios internos, comunicações administrativas",
    icon: Building2,
  },
  {
    value: "PROVIDENCIA_FUNCIONAL",
    label: "Providência Funcional",
    description: "Atendimento de presos, requerimentos",
    icon: Briefcase,
  },
  {
    value: "PROVIDENCIA_INSTITUCIONAL",
    label: "Providência Institucional",
    description: "Documentos institucionais",
    icon: Building2,
  },
  {
    value: "PECA_PROCESSUAL",
    label: "Peça Processual",
    description: "Petições, recursos, memoriais",
    icon: Scale,
  },
  {
    value: "COMUNICACAO",
    label: "Comunicação",
    description: "Emails, notificações, avisos",
    icon: Mail,
  },
  {
    value: "OUTRO",
    label: "Outro",
    description: "Outros tipos de documentos",
    icon: FileText,
  },
];

const VARIAVEIS_SISTEMA = [
  { nome: "DATA_HOJE", label: "Data de Hoje", origem: "sistema" as const },
  { nome: "DATA_EXTENSO", label: "Data por Extenso", origem: "sistema" as const },
  { nome: "NOME_DEFENSOR", label: "Nome do Defensor", origem: "sistema" as const },
  { nome: "OAB_DEFENSOR", label: "OAB do Defensor", origem: "sistema" as const },
];

const VARIAVEIS_ASSISTIDO = [
  { nome: "NOME_ASSISTIDO", label: "Nome do Assistido", origem: "assistido" as const },
  { nome: "CPF_ASSISTIDO", label: "CPF do Assistido", origem: "assistido" as const },
  { nome: "RG_ASSISTIDO", label: "RG do Assistido", origem: "assistido" as const },
  { nome: "ENDERECO_ASSISTIDO", label: "Endereço do Assistido", origem: "assistido" as const },
  { nome: "TELEFONE_ASSISTIDO", label: "Telefone do Assistido", origem: "assistido" as const },
  { nome: "NOME_MAE", label: "Nome da Mãe", origem: "assistido" as const },
  { nome: "LOCAL_PRISAO", label: "Local de Prisão", origem: "assistido" as const },
];

const VARIAVEIS_PROCESSO = [
  { nome: "NUMERO_PROCESSO", label: "Número do Processo", origem: "processo" as const },
  { nome: "COMARCA", label: "Comarca", origem: "processo" as const },
  { nome: "VARA", label: "Vara", origem: "processo" as const },
  { nome: "CLASSE_PROCESSUAL", label: "Classe Processual", origem: "processo" as const },
];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function NovoModeloPage() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<ModeloCategoria | "">("");
  const [tipoPeca, setTipoPeca] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [variaveis, setVariaveis] = useState<VariavelModelo[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const createMutation = trpc.modelos.create.useMutation({
    onSuccess: (data) => {
      toast.success("Modelo criado com sucesso!");
      router.push(`/admin/modelos/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar modelo: ${error.message}`);
    },
  });

  // Inserir variável no conteúdo
  const insertVariable = (varName: string) => {
    const textarea = document.getElementById("conteudo-textarea") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = conteudo.slice(0, start) + `{{${varName}}}` + conteudo.slice(end);
      setConteudo(newContent);
      // Focus e posicionar cursor
      setTimeout(() => {
        textarea.focus();
        const newPos = start + varName.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    } else {
      setConteudo((prev) => prev + `{{${varName}}}`);
    }
  };

  // Copiar variável
  const copyVariable = (varName: string) => {
    navigator.clipboard.writeText(`{{${varName}}}`);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  // Adicionar variável manual
  const addManualVariable = () => {
    setVariaveis((prev) => [
      ...prev,
      {
        nome: `VARIAVEL_${prev.length + 1}`,
        label: `Nova Variável ${prev.length + 1}`,
        tipo: "texto",
        obrigatoria: false,
        origem: "manual",
      },
    ]);
  };

  // Remover variável manual
  const removeVariable = (index: number) => {
    setVariaveis((prev) => prev.filter((_, i) => i !== index));
  };

  // Atualizar variável
  const updateVariable = (index: number, field: keyof VariavelModelo, value: string | boolean) => {
    setVariaveis((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  // Extrair variáveis do conteúdo
  const extractVariables = () => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = conteudo.matchAll(regex);
    const found = new Set<string>();
    for (const match of matches) {
      found.add(match[1]);
    }
    return Array.from(found);
  };

  // Salvar modelo
  const handleSave = () => {
    if (!titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    if (!categoria) {
      toast.error("Categoria é obrigatória");
      return;
    }
    if (!conteudo.trim()) {
      toast.error("Conteúdo é obrigatório");
      return;
    }

    // Combinar variáveis manuais com variáveis extraídas do conteúdo
    const extractedVars = extractVariables();
    const allVariables = [...variaveis];

    // Adicionar variáveis extraídas que ainda não estão na lista
    for (const varName of extractedVars) {
      if (!allVariables.some((v) => v.nome === varName)) {
        // Verificar se é variável do sistema/assistido/processo
        const sistemaVar = VARIAVEIS_SISTEMA.find((v) => v.nome === varName);
        const assistidoVar = VARIAVEIS_ASSISTIDO.find((v) => v.nome === varName);
        const processoVar = VARIAVEIS_PROCESSO.find((v) => v.nome === varName);

        if (sistemaVar) {
          allVariables.push({
            nome: sistemaVar.nome,
            label: sistemaVar.label,
            tipo: "texto",
            obrigatoria: false,
            origem: sistemaVar.origem,
          });
        } else if (assistidoVar) {
          allVariables.push({
            nome: assistidoVar.nome,
            label: assistidoVar.label,
            tipo: "texto",
            obrigatoria: true,
            origem: assistidoVar.origem,
          });
        } else if (processoVar) {
          allVariables.push({
            nome: processoVar.nome,
            label: processoVar.label,
            tipo: "texto",
            obrigatoria: true,
            origem: processoVar.origem,
          });
        } else {
          // Variável personalizada
          allVariables.push({
            nome: varName,
            label: varName.replace(/_/g, " "),
            tipo: "texto",
            obrigatoria: false,
            origem: "manual",
          });
        }
      }
    }

    createMutation.mutate({
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      categoria: categoria,
      tipoPeca: tipoPeca.trim() || undefined,
      conteudo: conteudo,
      variaveis: allVariables,
    });
  };

  const extractedVars = extractVariables();

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/admin" },
              { label: "Modelos", href: "/admin/modelos" },
              { label: "Novo Modelo" },
            ]}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/modelos">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-xl border border-emerald-200 dark:border-emerald-700">
                <FileStack className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Novo Modelo
                </h1>
                <p className="text-sm text-zinc-500">
                  Crie um novo modelo de documento
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "Editar" : "Preview"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {createMutation.isPending ? "Salvando..." : "Salvar Modelo"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informações Básicas</CardTitle>
                <CardDescription>
                  Defina o título, categoria e descrição do modelo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <Label htmlFor="titulo">Título *</Label>
                    <Input
                      id="titulo"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: Ofício de Requisição de Atendimento"
                      className="mt-1.5"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <Label htmlFor="tipoPeca">Tipo de Peça</Label>
                    <Input
                      id="tipoPeca"
                      value={tipoPeca}
                      onChange={(e) => setTipoPeca(e.target.value)}
                      placeholder="Ex: Ofício, Requerimento, Email"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label>Categoria *</Label>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {CATEGORIA_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCategoria(opt.value)}
                          className={cn(
                            "flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all",
                            categoria === opt.value
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                              : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                          )}
                        >
                          <Icon className={cn(
                            "w-5 h-5 mb-2",
                            categoria === opt.value
                              ? "text-emerald-600"
                              : "text-zinc-400"
                          )} />
                          <span className="font-medium text-sm">{opt.label}</span>
                          <span className="text-xs text-zinc-500 mt-0.5">
                            {opt.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva o propósito deste modelo..."
                    rows={2}
                    className="mt-1.5"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Editor de Conteúdo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Conteúdo do Modelo
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-4 h-4 text-zinc-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Use {"{{NOME_VARIAVEL}}"} para inserir variáveis dinâmicas no texto.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription>
                  Escreva o conteúdo do documento. Use variáveis dinâmicas clicando no painel lateral.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {showPreview ? (
                  <div className="prose prose-zinc dark:prose-invert max-w-none p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg min-h-[400px]">
                    {conteudo.split("\n").map((line, i) => (
                      <p key={i}>
                        {line.replace(/\{\{(\w+)\}\}/g, (_, varName) => (
                          `[${varName}]`
                        ))}
                      </p>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    id="conteudo-textarea"
                    value={conteudo}
                    onChange={(e) => setConteudo(e.target.value)}
                    placeholder={`Digite o conteúdo do documento aqui...

Exemplo:
Camaçari/BA, {{DATA_EXTENSO}}

OFÍCIO Nº ____/2024

Ao Diretor(a) do {{LOCAL_PRISAO}}

Assunto: Requisição de Atendimento de {{NOME_ASSISTIDO}}

Senhor(a) Diretor(a),

Solicito, nos termos do art. 128 da Lei 7.210/84, seja designada data e hora para atendimento de {{NOME_ASSISTIDO}}, qualificado(a) nos autos do processo nº {{NUMERO_PROCESSO}}.

Atenciosamente,

{{NOME_DEFENSOR}}
Defensor(a) Público(a)
OAB/BA {{OAB_DEFENSOR}}`}
                    rows={20}
                    className="font-mono text-sm"
                  />
                )}

                {/* Variáveis detectadas */}
                {extractedVars.length > 0 && (
                  <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                      {extractedVars.length} variáveis detectadas no conteúdo:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedVars.map((varName) => (
                        <Badge
                          key={varName}
                          variant="secondary"
                          className="text-xs bg-white dark:bg-zinc-800"
                        >
                          {varName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Variáveis Manuais */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Variáveis Personalizadas</CardTitle>
                  <CardDescription>
                    Adicione variáveis personalizadas que serão preenchidas manualmente
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addManualVariable} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent>
                {variaveis.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <Variable className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
                    <p className="text-sm">Nenhuma variável personalizada</p>
                    <p className="text-xs mt-1">
                      Clique em &quot;Adicionar&quot; para criar variáveis manuais
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {variaveis.map((v, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
                      >
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">Nome</Label>
                            <Input
                              value={v.nome}
                              onChange={(e) =>
                                updateVariable(index, "nome", e.target.value.toUpperCase().replace(/\s/g, "_"))
                              }
                              className="mt-1 h-8 text-sm font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={v.label}
                              onChange={(e) => updateVariable(index, "label", e.target.value)}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Tipo</Label>
                            <Select
                              value={v.tipo}
                              onValueChange={(value) => updateVariable(index, "tipo", value)}
                            >
                              <SelectTrigger className="mt-1 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="texto">Texto</SelectItem>
                                <SelectItem value="texto_longo">Texto Longo</SelectItem>
                                <SelectItem value="numero">Número</SelectItem>
                                <SelectItem value="data">Data</SelectItem>
                                <SelectItem value="selecao">Seleção</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => insertVariable(v.nome)}
                              className="h-8"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Inserir
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeVariable(index)}
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Variáveis */}
          <div className="space-y-4">
            {/* Variáveis do Sistema */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {VARIAVEIS_SISTEMA.map((v) => (
                  <VariableButton
                    key={v.nome}
                    nome={v.nome}
                    label={v.label}
                    onClick={() => insertVariable(v.nome)}
                    onCopy={() => copyVariable(v.nome)}
                    copied={copiedVar === v.nome}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Variáveis do Assistido */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Variable className="w-4 h-4 text-blue-500" />
                  Assistido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {VARIAVEIS_ASSISTIDO.map((v) => (
                  <VariableButton
                    key={v.nome}
                    nome={v.nome}
                    label={v.label}
                    onClick={() => insertVariable(v.nome)}
                    onCopy={() => copyVariable(v.nome)}
                    copied={copiedVar === v.nome}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Variáveis do Processo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-500" />
                  Processo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {VARIAVEIS_PROCESSO.map((v) => (
                  <VariableButton
                    key={v.nome}
                    nome={v.nome}
                    label={v.label}
                    onClick={() => insertVariable(v.nome)}
                    onCopy={() => copyVariable(v.nome)}
                    copied={copiedVar === v.nome}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Dica */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium">Dica</p>
                    <p className="mt-1 text-blue-600 dark:text-blue-400">
                      Clique em uma variável para inserir no cursor, ou copie o código para colar manualmente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE DE BOTÃO DE VARIÁVEL
// ==========================================

interface VariableButtonProps {
  nome: string;
  label: string;
  onClick: () => void;
  onCopy: () => void;
  copied: boolean;
}

function VariableButton({ nome, label, onClick, onCopy, copied }: VariableButtonProps) {
  return (
    <div className="group flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <code className="text-xs font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
          {nome}
        </code>
        <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
          {label}
        </span>
      </button>
      <button
        type="button"
        onClick={onCopy}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
      >
        {copied ? (
          <Check className="w-3 h-3 text-emerald-500" />
        ) : (
          <Copy className="w-3 h-3 text-zinc-400" />
        )}
      </button>
    </div>
  );
}
