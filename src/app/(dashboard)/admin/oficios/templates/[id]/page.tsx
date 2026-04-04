"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  LayoutTemplate,
  Save,
  Loader2,
  Copy,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ==========================================
// CONSTANTES
// ==========================================

const TIPOS_OFICIO = [
  { value: "requisitorio", label: "Requisitorio" },
  { value: "comunicacao", label: "Comunicacao" },
  { value: "encaminhamento", label: "Encaminhamento" },
  { value: "solicitacao_providencias", label: "Solicitacao de Providencias" },
  { value: "intimacao", label: "Intimacao" },
  { value: "pedido_informacao", label: "Pedido de Informacao" },
  { value: "manifestacao", label: "Manifestacao" },
  { value: "representacao", label: "Representacao" },
  { value: "parecer_tecnico", label: "Parecer Tecnico" },
  { value: "convite", label: "Convite" },
  { value: "resposta_oficio", label: "Resposta a Oficio" },
  { value: "certidao", label: "Certidao" },
];

const AREAS = [
  { value: "JURI", label: "Juri" },
  { value: "EXECUCAO_PENAL", label: "Execucao Penal" },
  { value: "VIOLENCIA_DOMESTICA", label: "VVD" },
  { value: "SUBSTITUICAO", label: "Substituicao" },
  { value: "CURADORIA", label: "Curadoria" },
  { value: "FAMILIA", label: "Familia" },
  { value: "CIVEL", label: "Civel" },
  { value: "FAZENDA_PUBLICA", label: "Fazenda Publica" },
];

const PLACEHOLDERS = [
  { key: "{{NOME_ASSISTIDO}}", label: "Nome do assistido", exemplo: "Jose da Silva" },
  { key: "{{CPF_ASSISTIDO}}", label: "CPF do assistido", exemplo: "123.456.789-00" },
  { key: "{{NUMERO_PROCESSO}}", label: "Numero do processo", exemplo: "0001234-56.2024.8.05.0001" },
  { key: "{{VARA}}", label: "Vara", exemplo: "1a Vara Criminal de Camacari" },
  { key: "{{COMARCA}}", label: "Comarca", exemplo: "Camacari" },
  { key: "{{DATA_HOJE}}", label: "Data atual", exemplo: "21/03/2026" },
  { key: "{{DATA_EXTENSO}}", label: "Data por extenso", exemplo: "21 de marco de 2026" },
  { key: "{{NOME_DEFENSOR}}", label: "Nome do defensor", exemplo: "Dr. Rodrigo Meire" },
  { key: "{{RG_ASSISTIDO}}", label: "RG do assistido", exemplo: "1234567 SSP/BA" },
  { key: "{{TELEFONE_ASSISTIDO}}", label: "Telefone", exemplo: "(71) 99999-9999" },
  { key: "{{NOME_MAE_ASSISTIDO}}", label: "Nome da mae", exemplo: "Maria da Silva" },
  { key: "{{LOCAL_PRISAO}}", label: "Unidade prisional", exemplo: "CAM - Complexo Penitenciario" },
];

function renderPreview(conteudo: string): string {
  let resultado = conteudo;
  for (const ph of PLACEHOLDERS) {
    const regex = new RegExp(ph.key.replace(/[{}]/g, "\\$&"), "gi");
    resultado = resultado.replace(regex, `[${ph.exemplo}]`);
  }
  return resultado;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function EditarTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoOficio, setTipoOficio] = useState("");
  const [area, setArea] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: template, isLoading } = trpc.oficios.getTemplate.useQuery(
    { id },
    { enabled: !!id && !isNaN(id) }
  );

  // Preencher formulario quando dados chegam
  useEffect(() => {
    if (template && !initialized) {
      setTitulo(template.titulo);
      setDescricao(template.descricao ?? "");
      setConteudo(template.conteudo);
      setArea(template.area ?? "");
      const fmt = template.formatacao as Record<string, unknown> | null;
      setTipoOficio((fmt?.tipoOficio as string) ?? "");
      setInitialized(true);
    }
  }, [template, initialized]);

  const preview = useMemo(() => renderPreview(conteudo), [conteudo]);

  const updateMutation = trpc.oficios.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template atualizado com sucesso");
    },
    onError: (err) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  const deleteMutation = trpc.oficios.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template excluido");
      router.push("/admin/oficios/templates");
    },
    onError: (err) => {
      toast.error(`Erro ao excluir: ${err.message}`);
      setShowDelete(false);
    },
  });

  const handleSalvar = () => {
    if (!titulo.trim()) {
      toast.error("Informe o titulo do template");
      return;
    }
    if (!conteudo.trim()) {
      toast.error("Informe o conteudo do template");
      return;
    }

    updateMutation.mutate({
      id,
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      descricao: descricao.trim() || undefined,
      tipoOficio: tipoOficio || undefined,
      area: area || undefined,
    });
  };

  const inserirPlaceholder = (key: string) => {
    setConteudo((prev) => prev + key);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-neutral-400 animate-spin" />
      </div>
    );
  }

  if (!template && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-neutral-500">Template nao encontrado.</p>
        <Button
          variant="link"
          className="text-emerald-600 mt-2"
          onClick={() => router.push("/admin/oficios/templates")}
        >
          Voltar para templates
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            onClick={() => router.push("/admin/oficios/templates")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <LayoutTemplate className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Editar Template
            </h1>
            <p className="text-sm text-neutral-500 truncate max-w-xs">
              {template?.titulo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSalvar}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar alteracoes
          </Button>
        </div>
      </div>

      {/* Total de usos */}
      {(template?.totalUsos ?? 0) > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/30 w-fit">
          <span className="text-xs text-neutral-500">
            Este template foi usado
          </span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {template?.totalUsos} {template?.totalUsos === 1 ? "vez" : "vezes"}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario principal */}
        <div className="lg:col-span-2 space-y-4">
          {/* Informacoes */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50 space-y-4">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Informacoes do template
            </h2>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Titulo *
              </label>
              <Input
                placeholder="Ex: Oficio requisitorio para UPA"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Descricao
              </label>
              <Input
                placeholder="Breve descricao do uso deste template"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Tipo de oficio
                </label>
                <Select value={tipoOficio} onValueChange={setTipoOficio}>
                  <SelectTrigger className="bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100">
                    <SelectValue placeholder="Selecionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OFICIO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Area juridica
                </label>
                <Select value={area} onValueChange={setArea}>
                  <SelectTrigger className="bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100">
                    <SelectValue placeholder="Selecionar area" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREAS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Editor de conteudo */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Conteudo *
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                onClick={() => setShowPreview((v) => !v)}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                {showPreview ? "Editar" : "Preview"}
              </Button>
            </div>

            {showPreview ? (
              <div className="min-h-[300px] p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-mono leading-relaxed">
                {preview || (
                  <span className="text-neutral-400 dark:text-neutral-600">
                    Nenhum conteudo para visualizar
                  </span>
                )}
              </div>
            ) : (
              <Textarea
                placeholder="Digite o conteudo do template..."
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                className="min-h-[300px] bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 font-mono text-sm resize-y"
              />
            )}

            <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
              Use os placeholders do painel lateral para inserir variaveis automaticas no texto.
            </p>
          </div>
        </div>

        {/* Painel lateral: placeholders */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50 sticky top-4">
            <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Placeholders disponiveis
            </h2>
            <p className="text-xs text-neutral-500 mb-3">
              Clique para inserir no conteudo ou copie manualmente.
            </p>
            <div className="space-y-1.5">
              {PLACEHOLDERS.map((ph) => (
                <div
                  key={ph.key}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 group cursor-pointer"
                  onClick={() => {
                    if (!showPreview) {
                      inserirPlaceholder(ph.key);
                    }
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate">
                      {ph.key}
                    </p>
                    <p className="text-[10px] text-neutral-500 truncate">{ph.label}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(ph.key);
                      toast.success("Copiado!");
                    }}
                  >
                    <Copy className="w-3 h-3 text-neutral-400" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] text-neutral-400 dark:text-neutral-600">
                No preview, os placeholders sao substituidos por valores de exemplo.
                No oficio final, sao preenchidos com dados reais do assistido e processo.
              </p>
            </div>
          </div>

          {/* Badges de estado */}
          {(tipoOficio || area) && (
            <div className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/30 bg-white dark:bg-neutral-900/50">
              <p className="text-xs text-neutral-500 mb-2">Classificacao do template</p>
              <div className="flex flex-wrap gap-1.5">
                {tipoOficio && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700"
                  >
                    {TIPOS_OFICIO.find((t) => t.value === tipoOficio)?.label}
                  </Badge>
                )}
                {area && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-neutral-500 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600"
                  >
                    {AREAS.find((a) => a.value === area)?.label}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de exclusao */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template &quot;{template?.titulo}&quot; sera removido permanentemente.
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id })}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
